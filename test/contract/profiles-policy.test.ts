import '../security/test-runtime-argv.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { parseConfig, type Config } from '../../src/config/schema.js';
import { loadConfig, parseProfilesVariable } from '../../src/config/load.js';
import { RELEASE_CAPABILITY, releaseAllowsOperation } from '../../src/policy/release-capability.js';
import { authorize, isEligible } from '../../src/policy/guard.js';
import { requiredProfiles } from '../../src/policy/profiles.js';
import { operations, BINARY_OPERATIONS, type Operation } from '../../src/api/operations.js';
import { allTools, callTool, eligibleTools, unreviewedPassthroughAllowed, SENSITIVE_WRITE_NOTICE } from '../../src/tools/index.js';
import { productionOperationDescriptors } from '../../src/server/stdio.js';
import { generateCoverage } from '../../src/coverage/report.js';
import { CODE_OWNED_VIEWS, projectResponse, type ResponseView } from '../../src/api/response-view.js';

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
// The email ACTION is catalogued but blocked (signing and schema unvalidated; 403 on lab): never published.
const BLOCKED=['post_agemail_api_ep_api_v1_0_emails_uuid_action'];
const CRITICAL=all.filter(o=>o.tier==='critical'&&!BLOCKED.includes(o.operationId)).map(o=>o.operationId);

test('catalogue exposes every non-excluded operation; only the deprecated incidents endpoint stays excluded',()=>{
  assert.equal(all.length,79);assert.deepEqual(sorted(all.filter(o=>o.status!=='implemented').map(o=>o.operationId)),sorted(['get_aianalyst_incidents',...BLOCKED]));
  assert.deepEqual(all.filter(o=>o.status==='blocked').map(o=>[o.operationId,o.tier,o.reason]),[[BLOCKED[0],'critical','signing and schema unvalidated; 403 on lab']]);
  assert.deepEqual([READ.length,SENSITIVE_READ.length,WRITE.length,CRITICAL.length],[38,18,16,5]);
  assert.deepEqual(sorted(CRITICAL),sorted(['delete_tags_tid','post_antigena','post_antigena_manual','post_intelfeed','post_subnets']));
  assert.deepEqual(RELEASE_CAPABILITY,{read:true,sensitiveRead:true,write:true,writeCritical:true});assert(Object.isFrozen(RELEASE_CAPABILITY));
  assert.equal(releaseAllowsOperation(operations.get_aianalyst_incidents),false);
  assert.equal(allTools().some(t=>t.operations.some(o=>o.operationId==='get_aianalyst_incidents'||BLOCKED.includes(o.operationId))),false);
  assert.equal(releaseAllowsOperation(operations.post_agemail_api_ep_api_v1_0_emails_uuid_action),false);
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
  assert.equal(tools.length,50);
  for(const tool of tools){
    const ops=tool.operations;
    assert.deepEqual(tool.annotations,{readOnlyHint:ops.every(o=>o.tier==='read'),destructiveHint:ops.some(o=>o.tier==='high'||o.tier==='critical'),idempotentHint:ops.every(o=>o.method==='GET'),openWorldHint:false});
    // Budget for the code-owned description; the fixed sensitive+write notice is appended on top of it.
    assert.ok(tool.description.replace(' '+SENSITIVE_WRITE_NOTICE,'').length<=600,tool.name+' '+tool.description.length);
    assert.doesNotMatch(tool.description,/this release exposes|consultation operations for this release/i);
    assert.deepEqual(sorted(tool.description.match(/\b(?:get|post|delete)_[a-zA-Z0-9_]+\b/g)?.filter((v,i,a)=>a.indexOf(v)===i)??[]),sorted(ops.map(o=>o.operationId)));
    if(ops.some(o=>o.tier==='critical')) {assert.match(tool.description,/confirm:true/);assert.match(tool.description,/call with dryRun:true for a preview with previewId \(expires in 5 minutes\)/);assert.doesNotMatch(tool.description,/first call returns a preview/i);}
    if(ops.every(o=>o.validatedOn.length===0)) assert.match(tool.description,/Not lab-validated/);
    if(ops.every(o=>o.validatedOn.length>0)) assert.doesNotMatch(tool.description,/lab-validated/);
    const schema=JSON.stringify(z.toJSONSchema(tool.inputSchema,{io:'input'}));
    assert.equal(schema.includes('"confirm"'),ops.some(o=>o.tier==='critical'),tool.name);
    assert.equal(schema.includes('"dryRun"'),ops.some(o=>o.tier!=='read'),tool.name);
    // Only critical tools take a previewId; non-critical writes have no such input field at all.
    assert.equal(schema.includes('"previewId"'),ops.some(o=>o.tier==='critical'),tool.name);
    if(ops.every(o=>o.tier==='read')) assert.equal(tool.description.includes(SENSITIVE_WRITE_NOTICE),false,tool.name);
  }
  // Sensitive reads + writes: write tools with free-text body fields carry the fixed notice; never without the union.
  assert.ok(tools.some(t=>t.description.endsWith(SENSITIVE_WRITE_NOTICE)));assert.ok(tools.find(t=>t.name==='darktrace_manage_tags')?.description.endsWith(SENSITIVE_WRITE_NOTICE));
  assert.equal(eligibleTools(config({write:true,writeCritical:true})).some(t=>t.description.includes(SENSITIVE_WRITE_NOTICE)),false);
});

function harness(cfg:Config,response:unknown={json:{response:'SUCCESS'}}) {
  const state={requests:[] as any[],audits:[] as string[]};
  return {state,ctx:{cfg,client:{async request(r:any){state.requests.push(r);return response;}},audit:{async record(id:string,outcome:string){state.audits.push(id+':'+outcome);}},approve:async()=>'accept' as const}};
}

test('writes are invisible and refused without write; with write they execute directly and dryRun previews',async()=>{
  const call={operation:'post_modelbreaches_pbid_acknowledge',path:{pbid:7},body:{acknowledge:true}};
  const denied=harness(config({sensitiveRead:true}));
  for(const dryRun of [undefined,true,false]){const r=await callTool('darktrace_acknowledge_model_breach',{...call,...(dryRun===undefined?{}:{dryRun})},denied.ctx);assert.equal(r.isError,true);assert.equal(r.structuredContent?.dryRun,undefined);
    assert.deepEqual((r.structuredContent as any).error,{code:'operation_denied',message:'Operation is not permitted by the active profile.'});assert.equal(r.structuredContent?.errorCode,'operation_denied');assert.equal(r.content[0].text,JSON.stringify(r.structuredContent));}
  // Each denial: exactly one `error` audit, never a preview, start or request.
  assert.deepEqual(denied.state,{requests:[],audits:Array(3).fill('post_modelbreaches_pbid_acknowledge:error')});
  const allowed=harness(config({write:true}));
  const preview=await callTool('darktrace_acknowledge_model_breach',{...call,dryRun:true},allowed.ctx);
  assert.deepEqual(preview.structuredContent,{dryRun:true,operationId:'post_modelbreaches_pbid_acknowledge',method:'POST',parameterNames:['acknowledge','pbid']});
  // Non-critical writes have no previewId input: the strict schema rejects it before any effect.
  const bound=await callTool('darktrace_acknowledge_model_breach',{...call,previewId:'0'.repeat(32)},allowed.ctx);
  assert.equal(bound.isError,true);assert.equal(bound.structuredContent?.errorCode,'invalid_arguments');
  assert.equal(allowed.state.requests.length,0);assert.deepEqual(allowed.state.audits,['post_modelbreaches_pbid_acknowledge:preview','post_modelbreaches_pbid_acknowledge:error']);
  const executed=await callTool('darktrace_acknowledge_model_breach',call,allowed.ctx);
  assert.equal(executed.isError,undefined);assert.deepEqual(JSON.parse(JSON.stringify((executed.structuredContent as any).data)),{response:'SUCCESS'});
  assert.equal(allowed.state.requests.length,1);assert.deepEqual(allowed.state.audits.slice(2),['post_modelbreaches_pbid_acknowledge:start','post_modelbreaches_pbid_acknowledge:ok']);
  // Upstream failure after the pre-audit: outcome unknown, never repeat.
  const failingState={audits:[] as string[]};
  const failing={...allowed.ctx,client:{async request(){throw new Error('REMOTE_CANARY');}},audit:{async record(id:string,outcome:string){failingState.audits.push(id+':'+outcome);}}};
  const unknown=await callTool('darktrace_acknowledge_model_breach',call,failing);
  assert.equal(unknown.isError,true);assert.equal(unknown.structuredContent?.outcome,'unknown');assert.equal(unknown.structuredContent?.errorCode,'write_outcome_unknown');assert.match(String(unknown.structuredContent?.requestId),/^[0-9a-f-]{36}$/);
  assert.deepEqual((unknown.structuredContent as any).error,{code:'write_outcome_unknown',message:'Write outcome is unknown; do not retry automatically.'});assert.match(String(unknown.structuredContent?.hint),/Do not automatically repeat/);assert.doesNotMatch(JSON.stringify(unknown),/CANARY/);
  assert.deepEqual(failingState.audits,['post_modelbreaches_pbid_acknowledge:start','post_modelbreaches_pbid_acknowledge:unknown']);
});

test('S5 DELETE with query executes under write and reaches the client with ordered query pairs',async()=>{
  const h=harness(config({write:true}));
  const r=await callTool('darktrace_manage_tags',{operation:'delete_tags_entities',query:{did:5,tag:'Quarantined'}},h.ctx);
  assert.equal(r.isError,undefined);assert.deepEqual(h.state.requests[0].query,[['did','5'],['tag','Quarantined']]);
});

test('critical: refused without critical; confirmation_required without confirm:true; dryRun previews; executes only with confirm:true and its previewId',async()=>{
  const call={path:{tid:3}};
  const code=(r:any)=>r.structuredContent?.errorCode;
  const noCritical=harness(config({write:true}));
  assert.equal(code(await callTool('darktrace_delete_tag',{...call,confirm:true},noCritical.ctx)),'operation_denied');
  assert.deepEqual(noCritical.state,{requests:[],audits:['delete_tags_tid:error']});
  const h=harness(config({write:true,writeCritical:true}));
  // Without dryRun and without confirm:true no preview is issued any more: the call is denied.
  for(const extra of [{},{confirm:false}]){
    const r=await callTool('darktrace_delete_tag',{...call,...extra},h.ctx);
    assert.equal(r.isError,true);assert.deepEqual((r.structuredContent as any).error,{code:'confirmation_required',message:'Critical execution requires confirm:true.'});
    assert.equal(r.structuredContent?.errorCode,'confirmation_required');assert.equal(r.structuredContent?.previewId,undefined);assert.equal(r.structuredContent?.dryRun,undefined);
  }
  const both=(await callTool('darktrace_delete_tag',{...call,confirm:true,dryRun:true},h.ctx)).structuredContent as any;
  assert.deepEqual(Object.keys(both).sort(),['dryRun','expiresAt','method','operationId','parameterNames','previewId']);
  assert.equal(both.dryRun,true);assert.match(both.previewId,/^[a-f0-9]{32}$/);assert.ok(!Number.isNaN(Date.parse(both.expiresAt)));
  assert.deepEqual(h.state,{requests:[],audits:['delete_tags_tid:error','delete_tags_tid:error','delete_tags_tid:preview']});
  for(const confirm of ['true',1,'yes']) assert.equal(code(await callTool('darktrace_delete_tag',{...call,confirm},h.ctx)),'invalid_arguments');
  // confirm:true alone (no previewId) is refused; it never yields a preview.
  const missing=(await callTool('darktrace_delete_tag',{...call,confirm:true},h.ctx)).structuredContent as any;
  assert.equal(missing.errorCode,'preview_required');assert.equal(missing.previewId,undefined);assert.equal(h.state.requests.length,0);
  const first=(await callTool('darktrace_delete_tag',{...call,dryRun:true},h.ctx)).structuredContent as any;
  assert.match(first.previewId,/^[a-f0-9]{32}$/);assert.equal(h.state.requests.length,0);
  // A previewId bound to different arguments, or an unknown one, is rejected; the original handle is left intact.
  const other=(await callTool('darktrace_delete_tag',{path:{tid:4},dryRun:true},h.ctx)).structuredContent as any;
  assert.equal(code(await callTool('darktrace_delete_tag',{...call,confirm:true,previewId:other.previewId},h.ctx)),'preview_invalid');
  assert.equal(code(await callTool('darktrace_delete_tag',{...call,confirm:true,previewId:'f'.repeat(32)},h.ctx)),'preview_invalid');
  assert.equal(h.state.requests.length,0);assert.ok(h.state.audits.every(a=>a.endsWith(':error')||a.endsWith(':preview')));
  const done=await callTool('darktrace_delete_tag',{...call,confirm:true,previewId:first.previewId},h.ctx);
  assert.equal(done.isError,undefined);assert.equal(h.state.requests.length,1);assert.deepEqual(h.state.audits.slice(-2),['delete_tags_tid:start','delete_tags_tid:ok']);
  // Single use: replaying the same previewId does not execute again.
  assert.equal(code(await callTool('darktrace_delete_tag',{...call,confirm:true,previewId:first.previewId},h.ctx)),'preview_used');
  assert.equal(h.state.requests.length,1);assert.equal(h.state.audits.at(-1),'delete_tags_tid:error');
  assert.equal((await callTool('darktrace_delete_tag',{path:{tid:4},confirm:true,previewId:other.previewId},h.ctx)).isError,undefined);assert.equal(h.state.requests.length,2);
  // Default (elicitation) mode without an approver: approval_unavailable, zero requests, no start audit.
  const noApprover=harness(config({write:true,writeCritical:true}));delete (noApprover.ctx as any).approve;
  const p=(await callTool('darktrace_delete_tag',{...call,dryRun:true},noApprover.ctx)).structuredContent as any;
  const unavailable=(await callTool('darktrace_delete_tag',{...call,confirm:true,previewId:p.previewId},noApprover.ctx)).structuredContent as any;
  assert.equal(unavailable.errorCode,'approval_unavailable');assert.match(unavailable.hint,/DARKTRACE_CRITICAL_APPROVAL=host/);
  assert.deepEqual(noApprover.state,{requests:[],audits:['delete_tags_tid:preview','delete_tags_tid:error']});
  // Only the exact string 'accept' approves.
  for(const answer of ['Accept','accepted',{action:'accept'},true]){
    const odd=harness(config({write:true,writeCritical:true}));(odd.ctx as any).approve=async()=>answer;
    const q=(await callTool('darktrace_delete_tag',{...call,dryRun:true},odd.ctx)).structuredContent as any;
    assert.equal(code(await callTool('darktrace_delete_tag',{...call,confirm:true,previewId:q.previewId},odd.ctx)),'approval_denied');assert.equal(odd.state.requests.length,0);
  }
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
  const codes:string[]=[];
  for(const [name,args] of cases){const r=await callTool(name,args,h.ctx);assert.equal(r.isError,true,name+JSON.stringify(args));codes.push(String(r.structuredContent?.errorCode));}
  assert.deepEqual(codes,['invalid_arguments','invalid_arguments','invalid_arguments','invalid_arguments','invalid_arguments','operation_denied','operation_denied']);
  // Zero effects: no request and only one `error` audit per denial (never preview/start/ok/unknown).
  assert.equal(h.state.requests.length,0);assert.equal(h.state.audits.length,cases.length);assert.ok(h.state.audits.every(a=>a.endsWith(':error')));
});

test('sensitive reads require the sensitive profile; PCAP download returns bounded base64 or refuses with size and digest',async()=>{
  const bytes=new Uint8Array(200_000).map((_v,i)=>i%251);
  const denied=harness(config({write:true,writeCritical:true}),{bytes});
  assert.equal((await callTool('darktrace_download_pcap',{path:{filename:'capture.pcap'}},denied.ctx)).structuredContent?.errorCode,'operation_denied');
  assert.deepEqual(denied.state,{requests:[],audits:['get_pcaps_filename:error']});
  const h=harness(config({sensitiveRead:true}),{bytes,contentType:'application/vnd.tcpdump.pcap'});
  const r=await callTool('darktrace_download_pcap',{path:{filename:'capture.pcap'}},h.ctx);
  assert.equal(h.state.requests[0].accept,'binary');
  // Over the output budget: refused (no partial capture), with size and digest only.
  assert.equal(r.isError,true);const over=r.structuredContent as any;
  assert.deepEqual([over.errorCode,over.error.code,over.sizeBytes,over.sha256],['output_limit_exceeded','output_limit_exceeded',200_000,createHash('sha256').update(bytes).digest('hex')]);
  assert.equal(over.data,undefined);assert.ok(JSON.stringify(r).length<=60000);assert.deepEqual(h.state.audits,[]);
  const small=harness(config({sensitiveRead:true}),{bytes:new Uint8Array([1,2,3])});
  const one=await callTool('darktrace_download_pcap',{path:{filename:'a.pcap'}},small.ctx);const whole=one.structuredContent as any;
  assert.deepEqual(whole.data,{kind:'pcap',encoding:'base64',byteLength:3,data:'AQID'});assert.deepEqual(one.content,[{type:'text',text:'PCAP data is in structuredContent.'}]);
  // Client-owned byte-free marker (file did not fit): same refusal, no base64.
  const marked=harness(config({sensitiveRead:true}),{outputLimitExceeded:{errorCode:'output_limit_exceeded',size:5_000_000,sha256:'a'.repeat(64)}});
  const m=(await callTool('darktrace_download_pcap',{path:{filename:'a.pcap'}},marked.ctx)).structuredContent as any;
  assert.deepEqual([m.errorCode,m.sizeBytes,m.sha256,m.data],['output_limit_exceeded',5_000_000,'a'.repeat(64),undefined]);
  // A JSON status document is projected through the code-owned {status,state,ready,progress} view.
  const status=harness(config({sensitiveRead:true}),{json:{state:'pending',progress:40,path:'/var/captures/x',note:'UPSTREAM_CANARY'}});
  const st=(await callTool('darktrace_download_pcap',{path:{filename:'a.pcap'}},status.ctx)).structuredContent as any;
  assert.deepEqual(JSON.parse(JSON.stringify(st.data)),{state:'pending',progress:40});assert.doesNotMatch(JSON.stringify(st),/UPSTREAM_CANARY|captures/);
  for(const filename of ['../etc','a/b','%2e%2e','.']) assert.equal((await callTool('darktrace_download_pcap',{path:{filename}},small.ctx)).isError,true);
});

test('email reads are projected through code-owned allowlist views; foreign shapes are schema_mismatch; email action is blocked',async()=>{
  const h=harness(config({sensitiveRead:true}),{json:{total:3,inbound:2,subject:'SUBJECT_CANARY',password:'x',items:[{n:1}],data:[{sender_domain:'exa\u202emple.com',from:'ADDRESS_CANARY@example.com',count:1}]}});
  assert.equal(eligibleTools(config()).some(t=>t.name.startsWith('darktrace_email')),false);
  const r=await callTool('darktrace_email_dashboard',{operation:'get_agemail_api_ep_api_v1_0_dash_dash_stats',query:{days:7,limit:2}},h.ctx);
  assert.equal(r.isError,undefined);const out=r.structuredContent as any;
  // Unknown fields (subject, addresses, credentials, unlisted lists) are dropped, never passed through.
  assert.deepEqual(Object.keys(out.data).sort(),['data','inbound','total']);assert.equal(out.data.data[0].count,1);assert.equal(out.data.data[0].from,undefined);
  assert.equal(out.minimized,true);assert.equal(out.unreviewedView,undefined);assert.equal(out.controlCharsNeutralized,true);assert.doesNotMatch(JSON.stringify(r),/CANARY|\u202e/);
  assert.deepEqual(h.state.requests[0].query,[['days','7'],['limit','2']]);assert.deepEqual(h.state.audits,[]);
  for(const days of [0,366,'7']) assert.equal((await callTool('darktrace_email_dashboard',{operation:'get_agemail_api_ep_api_v1_0_dash_dash_stats',query:{days}},h.ctx)).structuredContent?.errorCode,'invalid_arguments');
  const search=await callTool('darktrace_email_search',{body:{criteriaList:[{apiFilter:'from',operator:'is',value:'a@example.com'}],mode:'and'}},h.ctx);
  assert.equal(search.isError,undefined);
  for(const body of [{__proto__:{x:1}},{'bad key':1},{k:'x'.repeat(9000)}]) assert.equal((await callTool('darktrace_email_search',{body},h.ctx)).isError,true);
  // Only the message-detail operation adds the subject.
  const detail=harness(config({sensitiveRead:true}),{json:{uuid:'u1',subject:'Quarterly report',direction:'inbound',body:'BODY_CANARY',headers:{x:'HEADER_CANARY'}}});
  const d=(await callTool('darktrace_email_get',{path:{uuid:'0f8fad5b-d9cb-469f-a165-70867728950e'}},detail.ctx)).structuredContent as any;
  assert.deepEqual(JSON.parse(JSON.stringify(d.data)),{uuid:'u1',subject:'Quarterly report',direction:'inbound'});assert.equal(d.minimized,true);assert.doesNotMatch(JSON.stringify(d),/CANARY/);
  // A top level that is not an object/array, or that announces an unpinned version, is schema_mismatch.
  for(const json of ['text',42,null,{version:'2.0',total:1}]){
    const foreign=harness(config({sensitiveRead:true}),{json});
    const f=await callTool('darktrace_email_dashboard',{operation:'get_agemail_api_ep_api_v1_0_dash_dash_stats',query:{days:7}},foreign.ctx);
    assert.equal(f.isError,true,JSON.stringify(json));assert.deepEqual((f.structuredContent as any).error,{code:'schema_mismatch',message:'Response does not match the pinned operation schema.'});
  }
  // The email download returns only size and digest.
  const file=harness(config({sensitiveRead:true}),{bytes:new Uint8Array([77,73,77,69])});
  const dl=(await callTool('darktrace_download_email',{path:{uuid:'0f8fad5b-d9cb-469f-a165-70867728950e'}},file.ctx)).structuredContent as any;
  assert.deepEqual(dl.data,{file:{mediaType:'message/rfc822',sizeBytes:4,sha256:createHash('sha256').update(new Uint8Array([77,73,77,69])).digest('hex'),contentOmitted:true}});
  // Email action: blocked, never published nor executable under any profile; the call is an unknown tool.
  assert.equal(eligibleTools(config({sensitiveRead:true,write:true,writeCritical:true})).some(t=>t.name==='darktrace_email_action'||t.operations.some(o=>BLOCKED.includes(o.operationId))),false);
  const c=harness(config({write:true,writeCritical:true}));
  for(const extra of [{dryRun:true},{confirm:true,previewId:'0'.repeat(32)}]){
    const action=await callTool('darktrace_email_action',{path:{uuid:'0f8fad5b-d9cb-469f-a165-70867728950e'},body:{action:'release'},...extra},c.ctx);
    assert.equal(action.structuredContent?.errorCode,'operation_denied');assert.equal(action.structuredContent?.previewId,undefined);
  }
  assert.deepEqual(c.state,{requests:[],audits:['unknown_operation:error','unknown_operation:error']});
});

test('environment profiles: list, all shortcut, legacy booleans and file profiles; invalid combinations rejected',()=>{
  assert.deepEqual(parseProfilesVariable('all'),{read:true,sensitiveRead:true,write:true,writeCritical:true});
  assert.deepEqual(parseProfilesVariable('read, write'),{read:true,sensitiveRead:false,write:true,writeCritical:false});
  assert.deepEqual(parseProfilesVariable('sensitive'),{read:true,sensitiveRead:true,write:false,writeCritical:false});
  for(const bad of ['','read,read','all,read','email','export','admin','write,critical,critical']) assert.throws(()=>parseProfilesVariable(bad));
  const profiles=(extra:Record<string,string>)=>loadConfig({...env,...extra}).profiles;
  assert.deepEqual(profiles({}),{read:true,write:false,sensitiveRead:false,writeCritical:false});
  assert.deepEqual(profiles({DARKTRACE_PROFILES:'all',DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE:'true'}),{read:true,write:true,sensitiveRead:true,writeCritical:true});
  // Startup refuses the sensitive+write union, and critical host delegation, without the operator acknowledgement.
  for(const extra of [{DARKTRACE_PROFILES:'all'},{DARKTRACE_PROFILES:'sensitive,write'},{DARKTRACE_PROFILES:'all',DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE:'false'}]) assert.throws(()=>loadConfig({...env,...extra}),/DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE=true is required/);
  assert.throws(()=>loadConfig({...env,DARKTRACE_PROFILES:'write,critical',DARKTRACE_CRITICAL_APPROVAL:'host'}),/DARKTRACE_ACKNOWLEDGE_HOST_APPROVAL=true is required/);
  assert.equal(loadConfig({...env,DARKTRACE_PROFILES:'write,critical',DARKTRACE_CRITICAL_APPROVAL:'host',DARKTRACE_ACKNOWLEDGE_HOST_APPROVAL:'true'}).profiles.writeCritical,true);
  assert.deepEqual(profiles({DARKTRACE_PROFILES:'write',DARKTRACE_WRITE_CRITICAL:'true'}),{read:true,write:true,sensitiveRead:false,writeCritical:true});
  assert.deepEqual(profiles({DARKTRACE_PROFILES:'all',DARKTRACE_SENSITIVE_READ:'false'}),{read:true,write:true,sensitiveRead:false,writeCritical:true});
  assert.deepEqual(profiles({DARKTRACE_SENSITIVE_READ:'true'}),{read:true,write:false,sensitiveRead:true,writeCritical:false});
  for(const extra of [{DARKTRACE_PROFILES:'read,critical'},{DARKTRACE_WRITE_CRITICAL:'true'},{DARKTRACE_PROFILES:'write',DARKTRACE_WRITE_CRITICAL:'maybe'},{DARKTRACE_EMAIL:'1'},{DARKTRACE_EXPORT_DIR:'/tmp'}]) assert.throws(()=>loadConfig({...env,...extra}));
  // parseConfig itself does not enforce the startup acknowledgements.
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
    [{DARKTRACE_PROFILES:'all',DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE:'true'},{read:true,sensitive:true,write:true,critical:true}],
    [{DARKTRACE_PROFILES:'read,write'},{read:true,sensitive:false,write:true,critical:false}],
  ];
  for(const [extra,profiles] of expectations) for(const flag of ['doctor','--check-config']){
    const got=run([flag],extra);assert.equal(got.status,0,got.stderr);const row=JSON.parse(got.stdout);
    assert.deepEqual(row.profiles,profiles);assert.equal(row.transport,'stdio');assert.equal(row.networkProbe,false);assert.ok(row.registeredTools>0);
    assert.doesNotMatch(got.stdout+got.stderr,/CANARY|FORBIDDEN_SIDE_EFFECT/);
  }
  for(const extra of [{DARKTRACE_PROFILES:'read,critical'},{DARKTRACE_PROFILES:'superuser'},{DARKTRACE_WRITE_CRITICAL:'true'},{DARKTRACE_PROFILES:'all'}] as Record<string,string>[]) for(const args of [[],['doctor'],['--check-config']]){
    const got=run(args,extra);assert.equal(got.status,1);assert.equal(got.stdout,'');assert.doesNotMatch(got.stderr,/CANARY|FORBIDDEN_SIDE_EFFECT/);assert.equal(JSON.parse(got.stderr).event,'startup_error');
    if(extra.DARKTRACE_PROFILES==='all') assert.equal(JSON.parse(got.stderr).variable,'DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE');
  }
  for(const args of [['--write'],['--profiles=all']]){const got=spawnSync(process.execPath,['dist/src/index.js',...args],{env,encoding:'utf8',timeout:4000});assert.equal(got.status,2);assert.equal(got.stdout,'');}
  const help=spawnSync(process.execPath,['dist/src/index.js','--help'],{env,encoding:'utf8',timeout:4000});
  assert.match(help.stdout,/DARKTRACE_PROFILES/);assert.match(help.stdout,/confirm:true/);
});

test('separate write rate limit: maxWritesPerMinute (default 10, ceiling 10) and 3 critical/min; excess never reaches the client',async()=>{
  const call={operation:'post_modelbreaches_pbid_acknowledge',path:{pbid:7},body:{acknowledge:true}};
  const h=harness(config({write:true}));
  for(let i=0;i<10;i++) assert.equal((await callTool('darktrace_acknowledge_model_breach',call,h.ctx)).isError,undefined);
  const limited=await callTool('darktrace_acknowledge_model_breach',call,h.ctx);
  assert.equal(limited.isError,true);assert.equal(limited.structuredContent?.errorCode,'write_rate_limited');assert.deepEqual((limited.structuredContent as any).error,{code:'write_rate_limited',message:'Write rate limit exceeded.'});assert.equal(h.state.requests.length,10);
  assert.equal(h.state.audits.at(-1),'post_modelbreaches_pbid_acknowledge:error');assert.equal(h.state.audits.filter(a=>a.endsWith(':start')).length,10);
  assert.equal((await callTool('darktrace_get_status',{},h.ctx)).isError,undefined);
  const low=harness(parseConfig({...base,profiles:{write:true},limits:{maxWritesPerMinute:2}}));
  for(let i=0;i<3;i++) await callTool('darktrace_acknowledge_model_breach',call,low.ctx);
  assert.equal(low.state.requests.length,2);
  assert.equal(config().limits.maxWritesPerMinute,10);assert.equal(parseConfig({...base,limits:{maxWritesPerMinute:10}}).limits.maxWritesPerMinute,10);
  assert.throws(()=>parseConfig({...base,limits:{maxWritesPerMinute:11}}));assert.throws(()=>parseConfig({...base,limits:{maxWritesPerMinute:61}}));
  assert.equal(loadConfig({...env,DARKTRACE_MAX_WRITES_PER_MINUTE:'5'}).limits.maxWritesPerMinute,5);
  const c=harness(config({write:true,writeCritical:true}));
  for(let i=0;i<4;i++){
    const p=(await callTool('darktrace_delete_tag',{path:{tid:i+1},dryRun:true},c.ctx)).structuredContent as any;
    const r=await callTool('darktrace_delete_tag',{path:{tid:i+1},confirm:true,previewId:p.previewId},c.ctx);
    assert.equal(r.structuredContent?.errorCode,i<3?undefined:'critical_rate_limited');
  }
  assert.equal(c.state.requests.length,3);
  // Breaker: three consecutive failed/unknown writes on one operation client deny every later write until restart; reads still work.
  const broken={requests:0};const b=harness(config({write:true}));
  b.ctx.client={async request(r:any){if(r.operationId==='get_status')return {json:{version:'x'}};broken.requests++;throw new Error('REMOTE_CANARY');}} as any;
  for(let i=0;i<3;i++) assert.equal((await callTool('darktrace_acknowledge_model_breach',call,b.ctx)).structuredContent?.errorCode,'write_outcome_unknown');
  const open=await callTool('darktrace_acknowledge_model_breach',call,b.ctx);
  assert.equal(open.structuredContent?.errorCode,'write_circuit_open');assert.equal(broken.requests,3);assert.equal(b.state.audits.at(-1),'post_modelbreaches_pbid_acknowledge:error');
  assert.equal((await callTool('darktrace_get_status',{},b.ctx)).isError,undefined);
});

test('every enabled operation has a reviewed view, or is a low-sensitivity read, a sensitive-profile read, or a bounded file',async()=>{
  const views=(await import('../../src/api/response-views.generated.json',{with:{type:'json'}})).default.views as Record<string,{kind:string}>;
  for(const op of all.filter(o=>o.status==='implemented')){
    const reviewed=Object.hasOwn(CODE_OWNED_VIEWS,op.operationId)||(views[op.operationId]!==undefined&&views[op.operationId].kind!=='summary');
    const ok=reviewed||BINARY_OPERATIONS.has(op.operationId)||unreviewedPassthroughAllowed(op);
    assert.ok(ok,op.operationId);
    if(!reviewed&&!BINARY_OPERATIONS.has(op.operationId)) assert.ok(requiredProfiles(op).includes('sensitive')||op.sensitivity==='low',op.operationId);
  }
  // Passthrough is allowed only for low-sensitivity, non-sensitive reads: never for sensitive reads (email, PCAP status) or writes.
  for(const op of all.filter(o=>o.status==='implemented')) assert.equal(unreviewedPassthroughAllowed(op),op.tier==='read'&&op.sensitivity==='low'&&!requiredProfiles(op).includes('sensitive'),op.operationId);
  assert.ok(all.filter(o=>o.pathTemplate.startsWith('/agemail/')||o.operationId==='get_pcaps_filename'||o.tier!=='read').every(o=>!unreviewedPassthroughAllowed(o)));
  for(const op of all.filter(o=>o.status==='implemented'&&o.pathTemplate.startsWith('/agemail/')&&!BINARY_OPERATIONS.has(o.operationId))) assert.ok(Object.hasOwn(CODE_OWNED_VIEWS,op.operationId),op.operationId);
  // A critical write never passes unlisted upstream data through.
  const h=harness(config({write:true,writeCritical:true}),{json:{secretish:'UPSTREAM_CANARY'}});h.ctx.approve=async()=>'accept' as const;
  const p=(await callTool('darktrace_delete_tag',{path:{tid:1},dryRun:true},h.ctx)).structuredContent as any;
  const r=await callTool('darktrace_delete_tag',{path:{tid:1},confirm:true,previewId:p.previewId},h.ctx);
  assert.equal(r.isError,undefined);assert.doesNotMatch(JSON.stringify(r),/UPSTREAM_CANARY/);assert.equal((r.structuredContent as any).unreviewedView,undefined);
});

test('untyped nested schema nodes: scalar lists always pass; free-form maps only where passthrough is allowed; credential keys never',()=>{
  const view:ResponseView={kind:'object',fields:{names:{kind:'array',items:{kind:'summary'}},meta:{kind:'summary'}}};
  const input={names:['a','b',3],meta:{label:'x',password:'p',nested:{token:'t',ok:1}},unknown:'U'};
  const strict=JSON.parse(JSON.stringify(projectResponse(view,input).value));
  assert.deepEqual(strict.names,['a','b',3]);assert.match(JSON.stringify(strict.meta),/no reviewed output view/);assert.equal(strict.unknown,undefined);
  const open=JSON.parse(JSON.stringify(projectResponse(view,input,{untypedObjects:true}).value));
  assert.deepEqual(open.meta,{label:'x',nested:{ok:1}});
  // Advanced Search: undocumented aggregation shapes under a documented key are kept bounded.
  const agg:ResponseView={kind:'object',fields:{aggregations:{kind:'object',fields:{stats:{kind:'object',fields:{count:{kind:'number'}}}}}}};
  const out=JSON.parse(JSON.stringify(projectResponse(agg,{aggregations:{terms:{buckets:[{key:'443',doc_count:5}]}}},{untypedFallback:true}).value));
  assert.deepEqual(out.aggregations,{terms:{buckets:[{key:'443',doc_count:5}]}});
});
