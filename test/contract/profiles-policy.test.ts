import '../security/test-runtime-argv.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { z } from 'zod';
import { parseConfig, type Config } from '../../src/config/schema.js';
import { loadConfig, parseProfilesVariable } from '../../src/config/load.js';
import { RELEASE_CAPABILITY, releaseAllowsOperation } from '../../src/policy/release-capability.js';
import { authorize, isEligible } from '../../src/policy/guard.js';
import { requiredProfiles } from '../../src/policy/profiles.js';
import { operations, type Operation } from '../../src/api/operations.js';
import { allTools, callTool, eligibleTools } from '../../src/tools/index.js';
import { productionOperationDescriptors } from '../../src/server/stdio.js';
import { generateCoverage } from '../../src/coverage/report.js';

const base={instance:{baseUrl:'https://appliance.example'},auth:{publicToken:'PUBLIC_CANARY',privateToken:'PRIVATE_CANARY'}};
const config=(profiles:Record<string,boolean>={})=>parseConfig({...base,profiles});
const env={DARKTRACE_URL:base.instance.baseUrl,DARKTRACE_PUBLIC_TOKEN:base.auth.publicToken,DARKTRACE_PRIVATE_TOKEN:base.auth.privateToken};
const sorted=(ids:readonly string[])=>[...ids].sort();
const ids=(cfg:Config)=>sorted(eligibleTools(cfg).flatMap(t=>t.operations.map(o=>o.operationId)));
const all=Object.values(operations);
// Independent oracle, written from the owner request rather than derived from the policy code.
const SENSITIVE=new Set(['get_pcaps_filename',...all.filter(o=>o.tier==='read'&&/^\/(?:advancedsearch|agemail)\//.test(o.pathTemplate)).map(o=>o.operationId)]);
const READ=all.filter(o=>o.tier==='read'&&o.status!=='excluded'&&!SENSITIVE.has(o.operationId)).map(o=>o.operationId);
const SENSITIVE_READ=all.filter(o=>SENSITIVE.has(o.operationId)).map(o=>o.operationId);
const WRITE=all.filter(o=>o.tier==='medium'||o.tier==='high').map(o=>o.operationId);
const CRITICAL=all.filter(o=>o.tier==='critical').map(o=>o.operationId);

test('catalogue exposes every non-excluded operation; only the deprecated incidents endpoint stays excluded',()=>{
  assert.equal(all.length,79);assert.deepEqual(all.filter(o=>o.status!=='implemented').map(o=>o.operationId),['get_aianalyst_incidents']);
  assert.deepEqual([READ.length,SENSITIVE_READ.length,WRITE.length,CRITICAL.length],[38,18,16,6]);
  assert.deepEqual(sorted(CRITICAL),sorted(['delete_tags_tid','post_agemail_api_ep_api_v1_0_emails_uuid_action','post_antigena','post_antigena_manual','post_intelfeed','post_subnets']));
  assert.deepEqual(RELEASE_CAPABILITY,{read:true,sensitiveRead:true,write:true,writeCritical:true});assert(Object.isFrozen(RELEASE_CAPABILITY));
  assert.equal(releaseAllowsOperation(operations.get_aianalyst_incidents),false);
  assert.equal(allTools().some(t=>t.operations.some(o=>o.operationId==='get_aianalyst_incidents')),false);
  assert.deepEqual(sorted(productionOperationDescriptors.map(o=>o.operationId)),sorted([...READ,...SENSITIVE_READ,...WRITE,...CRITICAL]));
  assert(Object.isFrozen(productionOperationDescriptors)&&productionOperationDescriptors.every(Object.isFrozen));
  for(const op of all) if(op.status==='implemented') assert.deepEqual(generateCoverage().operations.find(r=>r.operationId===op.operationId)?.requiredProfiles,requiredProfiles(op));
});

test('forged descriptors cannot change route, method, tier, sensitivity or status to gain access',()=>{
  const allOn=config({sensitiveRead:true,write:true,writeCritical:true});
  for(const op of all.filter(o=>o.status==='implemented')) {
    assert.doesNotThrow(()=>authorize(op,allOn));
    for(const mutation of [{method:op.method==='GET'?'POST':'GET'},{tier:op.tier==='read'?'medium':'read'},{status:'blocked'},{pathTemplate:'/admin'},{pathTemplate:op.pathTemplate+'?x=1'},{sensitivity:op.sensitivity==='high'?'low':'high'}]) {
      const forged={...op,...mutation} as Operation;assert.equal(releaseAllowsOperation(forged),false,op.operationId);assert.throws(()=>authorize(forged,allOn));
    }
  }
  // A forged lower tier on a critical id is still bound to the code-owned catalogue row.
  const forgedRead={...operations.post_antigena,tier:'read'} as Operation;assert.equal(isEligible(forgedRead,config()),false);
});

test('profile matrix: default read is non-sensitive consultation; each profile adds only its operations',()=>{
  assert.deepEqual(ids(config()),sorted(READ));
  assert.deepEqual(ids(config({sensitiveRead:true})),sorted([...READ,...SENSITIVE_READ]));
  assert.deepEqual(ids(config({write:true})),sorted([...READ,...WRITE]));
  assert.deepEqual(ids(config({write:true,writeCritical:true})),sorted([...READ,...WRITE,...CRITICAL]));
  assert.deepEqual(ids(config({sensitiveRead:true,write:true,writeCritical:true})),sorted([...READ,...SENSITIVE_READ,...WRITE,...CRITICAL]));
  assert.throws(()=>config({writeCritical:true}),/requires profiles.write/);
  // Forged in-memory critical-without-write still cannot reach critical operations.
  const forged={...config(),profiles:{...config().profiles,writeCritical:true}};assert.deepEqual(ids(forged),sorted(READ));
});

test('annotations and descriptions follow the operation tiers',()=>{
  const tools=eligibleTools(config({sensitiveRead:true,write:true,writeCritical:true}));
  assert.equal(tools.length,51);
  for(const tool of tools){
    const ops=tool.operations;
    assert.deepEqual(tool.annotations,{readOnlyHint:ops.every(o=>o.tier==='read'),destructiveHint:ops.some(o=>o.tier==='high'||o.tier==='critical'),idempotentHint:ops.every(o=>o.method==='GET'),openWorldHint:false});
    assert.ok(tool.description.length<=600,tool.name+' '+tool.description.length);
    assert.doesNotMatch(tool.description,/this release exposes|consultation operations for this release/i);
    assert.deepEqual(sorted(tool.description.match(/\b(?:get|post|delete)_[a-zA-Z0-9_]+\b/g)?.filter((v,i,a)=>a.indexOf(v)===i)??[]),sorted(ops.map(o=>o.operationId)));
    if(ops.some(o=>o.tier==='critical')) assert.match(tool.description,/confirm:true/);
    if(ops.every(o=>o.validatedOn.length===0)) assert.match(tool.description,/Not lab-validated/);
    if(ops.every(o=>o.validatedOn.length>0)) assert.doesNotMatch(tool.description,/lab-validated/);
    const schema=JSON.stringify(z.toJSONSchema(tool.inputSchema,{io:'input'}));
    assert.equal(schema.includes('"confirm"'),ops.some(o=>o.tier==='critical'),tool.name);
    assert.equal(schema.includes('"dryRun"'),ops.some(o=>o.tier!=='read'),tool.name);
  }
});

function harness(cfg:Config,response:unknown={json:{response:'SUCCESS'}}) {
  const state={requests:[] as any[],audits:[] as string[]};
  return {state,ctx:{cfg,client:{async request(r:any){state.requests.push(r);return response;}},audit:{async record(id:string,outcome:string){state.audits.push(id+':'+outcome);}},approve:async()=>'accept' as const}};
}

test('writes are invisible and refused without write; with write they execute directly and dryRun previews',async()=>{
  const call={operation:'post_modelbreaches_pbid_acknowledge',path:{pbid:7},body:{acknowledge:true}};
  const denied=harness(config({sensitiveRead:true}));
  for(const dryRun of [undefined,true,false]){const r=await callTool('darktrace_acknowledge_model_breach',{...call,...(dryRun===undefined?{}:{dryRun})},denied.ctx);assert.equal(r.isError,true);assert.equal(r.structuredContent?.dryRun,undefined);}
  assert.deepEqual(denied.state,{requests:[],audits:[]});
  const allowed=harness(config({write:true}));
  const preview=await callTool('darktrace_acknowledge_model_breach',{...call,dryRun:true},allowed.ctx);
  assert.deepEqual(preview.structuredContent,{dryRun:true,operationId:'post_modelbreaches_pbid_acknowledge',method:'POST',parameterNames:['acknowledge','pbid']});
  assert.equal(allowed.state.requests.length,0);
  const executed=await callTool('darktrace_acknowledge_model_breach',call,allowed.ctx);
  assert.equal(executed.isError,undefined);assert.deepEqual(JSON.parse(JSON.stringify((executed.structuredContent as any).data)),{response:'SUCCESS'});
  assert.equal(allowed.state.requests.length,1);assert.deepEqual(allowed.state.audits,['post_modelbreaches_pbid_acknowledge:start','post_modelbreaches_pbid_acknowledge:ok']);
  // Upstream failure after the pre-audit: outcome unknown, never repeat.
  const failing={...allowed.ctx,client:{async request(){throw new Error('REMOTE_CANARY');}}};
  const unknown=await callTool('darktrace_acknowledge_model_breach',call,failing);
  assert.equal(unknown.isError,true);assert.equal(unknown.structuredContent?.outcome,'unknown');assert.match(String(unknown.structuredContent?.error),/Do not automatically repeat/);assert.doesNotMatch(JSON.stringify(unknown),/CANARY/);
});

test('S5 DELETE with query executes under write and reaches the client with ordered query pairs',async()=>{
  const h=harness(config({write:true}));
  const r=await callTool('darktrace_manage_tags',{operation:'delete_tags_entities',query:{did:5,tag:'Quarantined'}},h.ctx);
  assert.equal(r.isError,undefined);assert.deepEqual(h.state.requests[0].query,[['did','5'],['tag','Quarantined']]);
});

test('critical: refused without critical; preview with confirmation hint without confirm:true; executes only with confirm:true',async()=>{
  const call={path:{tid:3}};
  const noCritical=harness(config({write:true}));
  assert.equal((await callTool('darktrace_delete_tag',{...call,confirm:true},noCritical.ctx)).isError,true);
  assert.deepEqual(noCritical.state,{requests:[],audits:[]});
  const h=harness(config({write:true,writeCritical:true}));
  for(const extra of [{},{confirm:false},{confirm:true,dryRun:true}]){
    const r=await callTool('darktrace_delete_tag',{...call,...extra},h.ctx);
    assert.equal(r.isError,undefined);assert.equal(r.structuredContent?.dryRun,true);
    assert.equal(r.structuredContent?.confirmationRequired,(extra as any).dryRun?undefined:true);
  }
  assert.deepEqual(h.state,{requests:[],audits:[]});
  for(const confirm of ['true',1,'yes']) assert.equal((await callTool('darktrace_delete_tag',{...call,confirm},h.ctx)).isError,true);
  const done=await callTool('darktrace_delete_tag',{...call,confirm:true},h.ctx);
  assert.equal(done.isError,undefined);assert.equal(h.state.requests.length,1);assert.deepEqual(h.state.audits,['delete_tags_tid:start','delete_tags_tid:ok']);
});

test('model arguments never escalate: confirm/profiles/unknown keys are rejected where not in the strict schema',async()=>{
  const h=harness(config({write:true,writeCritical:true}));
  const cases:Array<[string,Record<string,unknown>]>=[
    ['darktrace_get_status',{confirm:true}],['darktrace_get_status',{dryRun:false}],['darktrace_get_status',{profiles:{write:true}}],
    ['darktrace_acknowledge_model_breach',{operation:'post_modelbreaches_pbid_acknowledge',path:{pbid:1},body:{acknowledge:true},confirm:true}],
    ['darktrace_acknowledge_model_breach',{operation:'post_modelbreaches_pbid_acknowledge',path:{pbid:1},body:{acknowledge:true},sensitiveRead:true}],
    ['darktrace_advanced_search',{operation:'post_advancedsearch_api_search',body:{hash:'e30='}}],
    ['darktrace_list_model_breaches',{operation:'get_aianalyst_incidents'}],
  ];
  for(const [name,args] of cases){const r=await callTool(name,args,h.ctx);assert.equal(r.isError,true,name+JSON.stringify(args));}
  assert.deepEqual(h.state,{requests:[],audits:[]});
});

test('sensitive reads require the sensitive profile; PCAP download returns bounded base64 with size and digest',async()=>{
  const bytes=new Uint8Array(200_000).map((_v,i)=>i%251);
  const denied=harness(config({write:true,writeCritical:true}),{bytes});
  assert.equal((await callTool('darktrace_download_pcap',{path:{filename:'capture.pcap'}},denied.ctx)).isError,true);
  assert.equal(denied.state.requests.length,0);
  const h=harness(config({sensitiveRead:true}),{bytes,contentType:'application/vnd.tcpdump.pcap'});
  const r=await callTool('darktrace_download_pcap',{path:{filename:'capture.pcap'}},h.ctx);
  assert.equal(r.isError,undefined);assert.equal(h.state.requests[0].accept,'binary');
  const file=(r.structuredContent as any).data.file;
  assert.equal(file.name,'capture.pcap');assert.equal(file.sizeBytes,200_000);assert.equal(file.encoding,'base64');assert.equal(file.partial,true);
  assert.match(file.sha256,/^[a-f0-9]{64}$/);
  const decoded=Buffer.from(file.contentBase64,'base64');assert.ok(decoded.length>1000);assert.deepEqual([...decoded],[...bytes.subarray(0,decoded.length)]);
  assert.ok(JSON.stringify(r).length<=60000);
  const small=harness(config({sensitiveRead:true}),{bytes:new Uint8Array([1,2,3])});
  const whole=(await callTool('darktrace_download_pcap',{path:{filename:'a.pcap'}},small.ctx)).structuredContent as any;
  assert.equal(whole.data.file.contentBase64,'AQID');assert.equal(whole.data.file.partial,undefined);
  for(const filename of ['../etc','a/b','%2e%2e','.']) assert.equal((await callTool('darktrace_download_pcap',{path:{filename}},small.ctx)).isError,true);
});

test('email reads pass untyped JSON through bounded, redacted and neutralized; email action is critical',async()=>{
  const h=harness(config({sensitiveRead:true}),{json:{items:[{subject:'hello‮',password:'x',n:1}]}});
  assert.equal(eligibleTools(config()).some(t=>t.name.startsWith('darktrace_email')),false);
  const r=await callTool('darktrace_email_dashboard',{operation:'get_agemail_api_ep_api_v1_0_dash_dash_stats',query:{days:7,limit:2}},h.ctx);
  assert.equal(r.isError,undefined);const out=r.structuredContent as any;
  assert.equal(out.unreviewedSchema,true);assert.equal(out.data.items[0].password,'[REDACTED]');assert.equal(out.data.items[0].n,1);assert.equal(out.controlCharsNeutralized,true);
  assert.deepEqual(h.state.requests[0].query,[['days','7'],['limit','2']]);
  for(const days of [0,366,'7']) assert.equal((await callTool('darktrace_email_dashboard',{operation:'get_agemail_api_ep_api_v1_0_dash_dash_stats',query:{days}},h.ctx)).isError,true);
  const search=await callTool('darktrace_email_search',{body:{criteriaList:[{apiFilter:'from',operator:'is',value:'a@example.com'}],mode:'and'}},h.ctx);
  assert.equal(search.isError,undefined);
  for(const body of [{__proto__:{x:1}},{'bad key':1},{k:'x'.repeat(9000)}]) assert.equal((await callTool('darktrace_email_search',{body},h.ctx)).isError,true);
  assert.equal(eligibleTools(config({sensitiveRead:true,write:true})).some(t=>t.name==='darktrace_email_action'),false);
  const c=harness(config({write:true,writeCritical:true}));
  const preview=await callTool('darktrace_email_action',{path:{uuid:'0f8fad5b-d9cb-469f-a165-70867728950e'},body:{action:'release'}},c.ctx);
  assert.equal(preview.structuredContent?.confirmationRequired,true);assert.equal(c.state.requests.length,0);
});

test('environment profiles: list, all shortcut, legacy booleans and file profiles; invalid combinations rejected',()=>{
  assert.deepEqual(parseProfilesVariable('all'),{read:true,sensitiveRead:true,write:true,writeCritical:true});
  assert.deepEqual(parseProfilesVariable('read, write'),{read:true,sensitiveRead:false,write:true,writeCritical:false});
  assert.deepEqual(parseProfilesVariable('sensitive'),{read:true,sensitiveRead:true,write:false,writeCritical:false});
  for(const bad of ['','read,read','all,read','email','export','admin','write,critical,critical']) assert.throws(()=>parseProfilesVariable(bad));
  const profiles=(extra:Record<string,string>)=>loadConfig({...env,...extra}).profiles;
  assert.deepEqual(profiles({}),{read:true,write:false,sensitiveRead:false,writeCritical:false});
  assert.deepEqual(profiles({DARKTRACE_PROFILES:'all'}),{read:true,write:true,sensitiveRead:true,writeCritical:true});
  assert.deepEqual(profiles({DARKTRACE_PROFILES:'write',DARKTRACE_WRITE_CRITICAL:'true'}),{read:true,write:true,sensitiveRead:false,writeCritical:true});
  assert.deepEqual(profiles({DARKTRACE_PROFILES:'all',DARKTRACE_SENSITIVE_READ:'false'}),{read:true,write:true,sensitiveRead:false,writeCritical:true});
  assert.deepEqual(profiles({DARKTRACE_SENSITIVE_READ:'true'}),{read:true,write:false,sensitiveRead:true,writeCritical:false});
  for(const extra of [{DARKTRACE_PROFILES:'read,critical'},{DARKTRACE_WRITE_CRITICAL:'true'},{DARKTRACE_PROFILES:'write',DARKTRACE_WRITE_CRITICAL:'maybe'},{DARKTRACE_EMAIL:'1'},{DARKTRACE_EXPORT_DIR:'/tmp'}]) assert.throws(()=>loadConfig({...env,...extra}));
  assert.doesNotThrow(()=>config({sensitiveRead:true,write:true}));
  for(const p of [{write:'true'},{writeCritical:1},{email:true},{export:false},{read:false}]) assert.throws(()=>parseConfig({...base,profiles:p}));
  const directory=mkdtempSync(join(tmpdir(),'profiles-policy-'));const file=join(directory,'policy.json');
  try{
    writeFileSync(file,JSON.stringify({profiles:{write:true,writeCritical:true}}),{mode:0o600});
    assert.deepEqual(loadConfig({...env,DARKTRACE_CONFIG_FILE:file}).profiles,{read:true,write:true,sensitiveRead:false,writeCritical:true});
    // An environment list replaces file grants (operator narrows without editing the file).
    assert.deepEqual(loadConfig({...env,DARKTRACE_CONFIG_FILE:file,DARKTRACE_PROFILES:'read'}).profiles,{read:true,write:false,sensitiveRead:false,writeCritical:false});
    writeFileSync(file,JSON.stringify({profiles:{write:'CANARY'}}),{mode:0o600});
    assert.throws(()=>loadConfig({...env,DARKTRACE_CONFIG_FILE:file,DARKTRACE_PROFILES:'read'}),(e:Error)=>!e.message.includes('CANARY'));
  } finally {rmSync(directory,{recursive:true,force:true});}
});

test('CLI check-config/doctor report effective profiles; invalid profile env exits 1 without side effects',()=>{
  const run=(args:string[],extra:Record<string,string>)=>spawnSync(process.execPath,['--import',resolve('test/security/diagnostic-guard.mjs'),'dist/src/index.js',...args],{env:{...env,...extra},encoding:'utf8',input:'',timeout:4000});
  const expectations:Array<[Record<string,string>,Record<string,boolean>]>=[
    [{},{read:true,sensitive:false,write:false,critical:false}],
    [{DARKTRACE_PROFILES:'all'},{read:true,sensitive:true,write:true,critical:true}],
    [{DARKTRACE_PROFILES:'read,write'},{read:true,sensitive:false,write:true,critical:false}],
  ];
  for(const [extra,profiles] of expectations) for(const flag of ['doctor','--check-config']){
    const got=run([flag],extra);assert.equal(got.status,0,got.stderr);const row=JSON.parse(got.stdout);
    assert.deepEqual(row.profiles,profiles);assert.equal(row.transport,'stdio');assert.equal(row.networkProbe,false);assert.ok(row.registeredTools>0);
    assert.doesNotMatch(got.stdout+got.stderr,/CANARY|FORBIDDEN_SIDE_EFFECT/);
  }
  for(const extra of [{DARKTRACE_PROFILES:'read,critical'},{DARKTRACE_PROFILES:'superuser'},{DARKTRACE_WRITE_CRITICAL:'true'}] as Record<string,string>[]) for(const args of [[],['doctor'],['--check-config']]){
    const got=run(args,extra);assert.equal(got.status,1);assert.equal(got.stdout,'');assert.doesNotMatch(got.stderr,/CANARY|FORBIDDEN_SIDE_EFFECT/);assert.equal(JSON.parse(got.stderr).event,'startup_error');
  }
  for(const args of [['--write'],['--profiles=all']]){const got=spawnSync(process.execPath,['dist/src/index.js',...args],{env,encoding:'utf8',timeout:4000});assert.equal(got.status,2);assert.equal(got.stdout,'');}
  const help=spawnSync(process.execPath,['dist/src/index.js','--help'],{env,encoding:'utf8',timeout:4000});
  assert.match(help.stdout,/DARKTRACE_PROFILES/);assert.match(help.stdout,/confirm:true/);
});
