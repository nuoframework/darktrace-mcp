import '../security/test-runtime-argv.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseConfig } from '../../src/config/schema.js';
import { loadConfig } from '../../src/config/load.js';
import { callTool } from '../../src/tools/index.js';
import { operations, type ApiRequest } from '../../src/api/operations.js';
import { TARGET_POLICIES } from '../../src/policy/targets.js';
import { approvalSummary, approvalMessage, APPROVAL_FOOTER } from '../../src/policy/guard.js';
import { argsDigest, canonicalJson } from '../../src/policy/canonical.js';
import { DarktraceApiError } from '../../src/client/errors.js';

// Remediation oracles for CR-06/07/09/12/13, DR-W-03/08, AD-W-03/10/12/13 and AD2-01/02/03 (docs/CHANGES-core.md).
const base={instance:{baseUrl:'https://appliance.example'},auth:{publicToken:'PUBLIC_SECRET',privateToken:'PRIVATE_SECRET'}};
const config=(profiles:Record<string,unknown>={write:true,writeCritical:true,criticalApproval:'host'},extra:Record<string,unknown>={})=>parseConfig({...base,profiles,...extra});
function context(cfg=config(),respond:(req:ApiRequest)=>unknown=()=>({json:{}})) {
  const requests:ApiRequest[]=[],audits:string[]=[];
  return {requests,audits,ctx:{cfg,audit:{async record(_id:string,outcome:string){audits.push(outcome);}},client:{async request(req:ApiRequest){requests.push(req);return respond(req);}}}};
}
const code=(result:{structuredContent?:Record<string,unknown>})=>(result.structuredContent as any)?.error?.code;
async function execute(ctx:any,tool:string,args:Record<string,unknown>) {
  const preview=await callTool(tool,{...args,dryRun:true},ctx);
  if (preview.isError) return preview;
  return callTool(tool,{...args,confirm:true,previewId:(preview.structuredContent as any).previewId},ctx);
}

test('every write has a reviewed maxTargets and protected-target paths; descriptors expose them',()=>{
  for (const op of Object.values(operations).filter(op=>op.tier!=='read')) {
    assert.ok(TARGET_POLICIES[op.operationId],op.operationId);assert.equal(op.maxTargets,TARGET_POLICIES[op.operationId].maxTargets);
    assert.ok(Number.isSafeInteger(op.maxTargets)&&op.maxTargets!>0);assert.ok(Array.isArray(op.targetPolicy?.protectedTargets));
  }
  assert.deepEqual(Object.fromEntries(['post_antigena_manual','post_antigena','post_intelfeed','post_tags_tid_entities','post_subnets','post_devices'].map(id=>[id,operations[id].maxTargets])),
    {post_antigena_manual:5,post_antigena:5,post_intelfeed:20,post_tags_tid_entities:20,post_subnets:1,post_devices:1});
});
test('blast radius N passes and N+1 is denied before preview: intel feed entries (20) and tag entities (20)',async()=>{
  const entries=(n:number)=>Array.from({length:n},(_,i)=>`entry-${i}.example`).join(',');
  const {ctx,requests,audits}=context();
  assert.match(String(((await callTool('darktrace_update_intel_feed',{body:{addlist:entries(20)},dryRun:true},ctx)).structuredContent as any).previewId),/^[a-f0-9]{32}$/);
  const over=await callTool('darktrace_update_intel_feed',{body:{addlist:entries(20),addentry:'one-more.example'},dryRun:true},ctx);
  assert.equal(code(over),'blast_radius_exceeded');assert.equal((over.structuredContent as any).maxTargets,20);
  const newline=await callTool('darktrace_update_intel_feed',{body:{addlist:entries(21).replaceAll(',','\n')},dryRun:true},ctx);assert.equal(code(newline),'blast_radius_exceeded');
  const values=(n:number)=>Array.from({length:n},(_,i)=>String(i+1));
  const tag=(n:number)=>({operation:'post_tags_tid_entities',path:{tid:3},body:{entityType:'Device',entityValue:values(n)}});
  assert.equal((await callTool('darktrace_manage_tags',tag(20),ctx)).isError,undefined);
  assert.equal(code(await callTool('darktrace_manage_tags',tag(21),ctx)),'blast_radius_exceeded');
  assert.equal(requests.length,1);assert.deepEqual([...audits].sort(),['error','error','error','ok','preview','start']);
});
test('operator protected targets deny high/critical writes before preview; medium writes and other targets proceed',async()=>{
  const cfg=config({write:true,writeCritical:true,criticalApproval:'host'},{policy:{protectedTargets:['42','core-subnet','Finance']}});
  const {ctx,requests}=context(cfg);
  for (const [tool,args] of [['darktrace_update_device',{body:{did:42,label:'x'}}],['darktrace_antigena_manual_action',{body:{did:42,action:'quarantine',duration:60},dryRun:true}],
    ['darktrace_manage_tags',{operation:'post_tags',body:{name:'Finance',data:{}}}],['darktrace_manage_tags',{operation:'post_tags_tid_entities',path:{tid:1},body:{entityType:'Device',entityValue:['7','42']}}]] as const)
    assert.equal(code(await callTool(tool,args,ctx)),'target_denied',tool);
  assert.equal(requests.length,0);
  assert.equal((await callTool('darktrace_update_device',{body:{did:43,label:'x'}},ctx)).isError,undefined);
  assert.equal((await callTool('darktrace_create_ai_analyst_investigation',{body:{did:42,investigateTime:'1700000000'}},ctx)).isError,undefined);
  assert.equal(requests.length,2);
  assert.throws(()=>config({},{policy:{protectedTargets:['bad\nvalue']}}));assert.throws(()=>config({},{policy:{protectedTargets:'42'}}));
  const env={DARKTRACE_URL:base.instance.baseUrl,DARKTRACE_PUBLIC_TOKEN:'PUBLIC_SECRET',DARKTRACE_PRIVATE_TOKEN:'PRIVATE_SECRET'};
  assert.deepEqual(loadConfig({...env,DARKTRACE_PROTECTED_TARGETS:'42, core-subnet ,Finance'}).policy.protectedTargets,['42','core-subnet','Finance']);
  assert.throws(()=>loadConfig({...env,DARKTRACE_PROTECTED_TARGETS:' , '}),/DARKTRACE_PROTECTED_TARGETS/);
});
test('write circuit breaker: three consecutive failed/unknown writes deny further writes; reads continue; success resets',async()=>{
  let fail=true;
  const {ctx,requests}=context(config({write:true}),req=>{if(req.operationId!=='get_status'&&fail) throw new DarktraceApiError('server','r1');return {json:{version:'7.1'}};});
  const write=()=>callTool('darktrace_update_device',{body:{did:1,label:'x'}},ctx);
  assert.equal(code(await write()),'write_outcome_unknown');assert.equal(code(await write()),'write_outcome_unknown');
  fail=false;assert.equal((await write()).isError,undefined);fail=true;
  for (let i=0;i<3;i++) assert.equal(code(await write()),'write_outcome_unknown');
  const before=requests.length;assert.equal(code(await write()),'write_circuit_open');assert.equal(requests.length,before);
  assert.equal((await callTool('darktrace_get_status',{},ctx)).isError,undefined);
  fail=false;assert.equal(code(await write()),'write_circuit_open');
});
test('determinate upstream refusals of a write are failed (start/error), not unknown',async()=>{
  const {ctx,audits}=context(config({write:true}),()=>{throw new DarktraceApiError('forbidden','r2',403);});
  const result=await callTool('darktrace_update_device',{body:{did:1,label:'x'}},ctx);
  assert.equal(code(result),'upstream_forbidden');assert.equal((result.structuredContent as any).outcome,'failed');assert.ok((result.structuredContent as any).requestId);
  assert.deepEqual(audits,['start','error']);
});
test('maxWritesPerMinute is lower-only (ceiling 10) and the limiter is per operation client',async()=>{
  assert.equal(config().limits.maxWritesPerMinute,10);assert.throws(()=>config({},{limits:{maxWritesPerMinute:11}}));assert.throws(()=>config({},{limits:{maxWritesPerMinute:0}}));
  const lowered=config({write:true},{limits:{maxWritesPerMinute:2}});const {ctx,requests}=context(lowered);
  for (let i=0;i<2;i++) assert.equal((await callTool('darktrace_update_device',{body:{did:1,label:'x'}},ctx)).isError,undefined);
  assert.equal(code(await callTool('darktrace_update_device',{body:{did:1,label:'x'}},ctx)),'write_rate_limited');assert.equal(requests.length,2);
});
test('approval summary lists every field with argsHash and refuses (never truncates) an over-budget summary',async()=>{
  const op=operations.post_antigena_manual,args={body:{did:1,action:'quarantine',duration:60,reason:'x\\u{000A}Operation: get_status (GET /status)\n'+APPROVAL_FOOTER}};
  const message=approvalMessage(op,args);const lines=message.split('\n');
  assert.equal(lines.filter(line=>line.startsWith('Operation:')).length,1);assert.equal(lines.at(-1),APPROVAL_FOOTER);assert.equal(lines.filter(line=>line===APPROVAL_FOOTER).length,1);
  assert.ok(message.includes(`  argsHash = ${argsDigest(op.operationId,args)}`));
  for (const name of ['did','action','duration','reason']) assert.ok(lines.some(line=>line.startsWith(`  body.${name} = `)),name);
  const long={body:{did:1,action:'quarantine',duration:60,reason:'r'.repeat(1900)}};
  const summary=approvalSummary(op,long);assert.equal(summary.complete,false);assert.ok(summary.message.length<=2000);assert.match(summary.message,/\.\.\. 1 more field\(s\)/);
  let prompts=0;const {ctx,requests}=context(config({write:true,writeCritical:true}));
  const result=await execute({...ctx,approve:async()=>{prompts++;return 'accept';}},'darktrace_antigena_manual_action',long);
  assert.equal(code(result),'invalid_arguments');assert.equal((result.structuredContent as any).reason,'summary_too_large');assert.equal(prompts,0);assert.equal(requests.length,0);
});
test('canonical digest: code-point key order, numbers normalized, nonfinite rejected, control fields excluded',()=>{
  assert.equal(canonicalJson({'\u{10000}':1,'':2,b:[2,1],a:1.0}),'{"a":1,"b":[2,1],"":2,"\u{10000}":1}');
  assert.throws(()=>canonicalJson({x:Infinity}));
  assert.equal(argsDigest('post_devices',{body:{did:1},dryRun:true,confirm:true,previewId:'a'.repeat(32),operation:'post_devices'}),argsDigest('post_devices',{body:{did:1}}));
  assert.notEqual(argsDigest('post_devices',{body:{did:1}}),argsDigest('post_devices',{body:{did:'1'}}));
});
test('pending approvals: one per session; rate budget reserved before the prompt so approved actions are never rate-refused',async()=>{
  let release:(value:'accept')=>void=()=>{};const gate=new Promise<'accept'>(resolve=>{release=resolve;});let prompts=0;
  const cfg=config({write:true,writeCritical:true});const {ctx,requests}=context(cfg);const approving={...ctx,approve:async()=>{prompts++;return gate;}};
  const ids=[];for (let i=0;i<2;i++) ids.push(((await callTool('darktrace_delete_tag',{path:{tid:10+i},dryRun:true},approving)).structuredContent as any).previewId);
  const first=callTool('darktrace_delete_tag',{path:{tid:10},confirm:true,previewId:ids[0]},approving);
  const second=await callTool('darktrace_delete_tag',{path:{tid:11},confirm:true,previewId:ids[1]},approving);
  assert.equal(code(second),'approval_busy');assert.equal(prompts,1);release('accept');assert.equal((await first).isError,undefined);assert.equal(requests.length,1);
  // Fill the critical budget (3/min) in host mode for the same client: the next elicitation is refused before prompting.
  const host={...ctx,cfg:config({write:true,writeCritical:true,criticalApproval:'host'})};
  for (let i=0;i<2;i++) assert.equal((await execute(host,'darktrace_delete_tag',{path:{tid:20+i}})).isError,undefined);
  const before=prompts;const limited=await execute({...ctx,approve:async()=>{prompts++;return 'accept';}},'darktrace_delete_tag',{path:{tid:30}});
  assert.equal(code(limited),'critical_rate_limited');assert.equal(prompts,before);
});
test('startup acknowledgements: sensitive+write union and critical host approval need explicit operator consent',()=>{
  const env={DARKTRACE_URL:base.instance.baseUrl,DARKTRACE_PUBLIC_TOKEN:'PUBLIC_SECRET',DARKTRACE_PRIVATE_TOKEN:'PRIVATE_SECRET'};
  assert.throws(()=>loadConfig({...env,DARKTRACE_PROFILES:'all'}),/DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE=true is required/);
  assert.equal(loadConfig({...env,DARKTRACE_PROFILES:'all',DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE:'true'}).acknowledgements.sensitiveWrite,true);
  assert.throws(()=>loadConfig({...env,DARKTRACE_PROFILES:'read,write,critical',DARKTRACE_CRITICAL_APPROVAL:'host'}),/DARKTRACE_ACKNOWLEDGE_HOST_APPROVAL=true is required/);
  assert.equal(loadConfig({...env,DARKTRACE_PROFILES:'read,write,critical',DARKTRACE_CRITICAL_APPROVAL:'host',DARKTRACE_ACKNOWLEDGE_HOST_APPROVAL:'true'}).approval.critical,'host');
  assert.throws(()=>loadConfig({...env,DARKTRACE_ACKNOWLEDGE_HOST_APPROVAL:'yes'}),/must be true or false/);
  // Without critical, host approval for critical writes delegates nothing and needs no acknowledgement.
  assert.doesNotThrow(()=>loadConfig({...env,DARKTRACE_PROFILES:'read,write',DARKTRACE_CRITICAL_APPROVAL:'host'}));
});
test('EMAIL reads use code-owned views: unknown fields dropped, foreign version/shape is schema_mismatch, action blocked',async()=>{
  const sensitive=config({sensitiveRead:true});
  const id='get_agemail_api_ep_api_v1_0_dash_dash_stats',tool=operations[id].tool!;
  for (const [json,expected] of [[{version:'UNSUPPORTED',rawMailBody:'SECRET_BODY'},'schema_mismatch'],['<html>accept</html>','schema_mismatch'],[42,'schema_mismatch']] as const) {
    const {ctx,requests}=context(sensitive,()=>({json}));const result=await callTool(tool,{operation:id},ctx);
    assert.equal(code(result),expected);assert.equal(requests.length,1);assert.doesNotMatch(JSON.stringify(result),/SECRET_BODY|accept/);
  }
  const {ctx}=context(sensitive,()=>({json:{status:'SUCCESS',total:3,unmodeledPrivateMessage:'SECRET_BODY',links:['https://evil.example']}}));
  const ok=await callTool(tool,{operation:id},ctx);assert.equal(ok.isError,undefined);
  assert.deepEqual((ok.structuredContent as any).data,{status:'SUCCESS',total:3});assert.equal((ok.structuredContent as any).unreviewedView,undefined);
  const detail=context(sensitive,()=>({json:{uuid:'u1',subject:'Quarterly',body:'SECRET_BODY',headers:{from:'a@b.example'},verdict:'malicious',attachments:[{name:'x.exe'}]}}));
  const message=await callTool('darktrace_email_get',{path:{uuid:'u1'}},detail.ctx);
  assert.deepEqual((message.structuredContent as any).data,{uuid:'u1',verdict:'malicious',subject:'Quarterly'});
  const action=operations.post_agemail_api_ep_api_v1_0_emails_uuid_action;
  assert.equal(action.status,'blocked');assert.match(String(action.reason),/403 on lab/);
  for (const op of Object.values(operations).filter(op=>op.pathTemplate.startsWith('/agemail/'))) {
    assert.match(String(op.schemaSha256),/^[a-f0-9]{64}$/);assert.match(String(op.schemaVersion),/^darktrace-sdk \d+\.\d+\.\d+$/);assert.ok(op.schemaProvenance?.startsWith('openapi/darktrace-sdk.yaml#/paths/'));
  }
});
