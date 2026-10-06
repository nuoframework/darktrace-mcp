import test from 'node:test';
import assert from 'node:assert/strict';
import { parseConfig } from '../../src/config/schema.js';
import { callTool, eligibleTools } from '../../src/tools/index.js';
import { operations, type ApiRequest } from '../../src/api/operations.js';
const config=(profiles={})=>parseConfig({instance:{baseUrl:'https://appliance.example'},auth:{publicToken:'PUBLIC_SECRET',privateToken:'PRIVATE_SECRET'},profiles});
const audit={async record(){}};
function context(profiles={}) {const requests:ApiRequest[]=[];return {requests,ctx:{cfg:{...config(),profiles:{...config().profiles,...profiles}},audit,client:{async request(req:ApiRequest){requests.push(req);return {json:{status:'ok'}};}}}};}
test('default only publishes reads; writes/email/export/deprecated unavailable',()=>{
  const tools=eligibleTools(config());assert.ok(tools.length>0);
  assert.ok(tools.every(t=>t.operations.every(op=>op.tier==='read')));
  assert.equal(tools.some(t=>t.name==='darktrace_manage_tags'),false);
  assert.equal(tools.some(t=>t.name.includes('email')||t.name==='darktrace_download_pcap'),false);
});
test('hidden direct writes and blocked export are denied before network',async()=>{
  const {requests,ctx}=context();
  const denied=await callTool('darktrace_update_device',{body:{did:42,label:'label'}},ctx);
  assert.equal(denied.isError,true);
  const download=await callTool('darktrace_download_pcap',{path:{filename:'capture.pcap'}},{...ctx,cfg:config()});
  assert.equal(download.isError,true);assert.equal(requests.length,0);
});
test('unknown fields, prototype keys, traversal, excessive arrays and ranges denied',async()=>{
  const {requests,ctx}=context();
  const inputs=[{query:{fast:true,headers:{Authorization:'secret'}}},JSON.parse('{"__proto__":{"polluted":true}}'),{query:{constructor:'PRIVATE_SECRET'}}, {query:{fast:true},origin:'https://attacker.example'}];
  for(const args of inputs) assert.equal((await callTool('darktrace_get_status',args,ctx)).isError,true);
  assert.equal((await callTool('darktrace_list_models',{operation:'get_models_pid',path:{pid:'../status'}},ctx)).isError,true);
  assert.equal((await callTool('darktrace_get_devices',{query:{saasfilter:Array(101).fill('x')}},ctx)).isError,true);
  assert.equal((await callTool('darktrace_get_connection_details',{query:{count:100000}},ctx)).isError,true);
  assert.equal((await callTool('darktrace_get_ai_analyst_stats',{query:{starttime:1,endtime:604800002}},ctx)).isError,true);
  assert.equal(requests.length,0);
});
test('errors and successful remote JSON are redacted and bounded',async()=>{
  const cfg=config();
  const ctx={cfg,audit,client:{async request(){return {json:{secret:'PRIVATE_SECRET',nested:['PUBLIC_SECRET']}};}}};
  const res=await callTool('darktrace_get_status',{},ctx);assert.equal(JSON.stringify(res).includes('PRIVATE_SECRET'),false);assert.equal(JSON.stringify(res).includes('PUBLIC_SECRET'),false);
  const error=await callTool('darktrace_get_status',{}, {...ctx,client:{async request(){throw new Error('PRIVATE_SECRET signed request and remote error');}}});
  assert.equal(error.isError,true);assert.equal(JSON.stringify(error).includes('PRIVATE_SECRET'),false);
  const huge=await callTool('darktrace_get_status',{}, {...ctx,client:{async request(){return {json:{version:'x'.repeat(70000)}};}}});
  assert.equal(huge.structuredContent?.truncated,true);
});
test('sensitive AdvancedSearch is hidden and direct calls rejected without operator opt-in',async()=>{
 const {ctx,requests}=context();assert.equal(eligibleTools(ctx.cfg).some(t=>t.name==='darktrace_advanced_search'),false);
 const hash=Buffer.from(JSON.stringify({search:'@type:dns',fields:[],timeframe:'3600'})).toString('base64');
 const denied=await callTool('darktrace_advanced_search',{operation:'post_advancedsearch_api_search',body:{hash}},ctx);
 assert.equal(denied.isError,true);assert.equal(requests.length,0);
});
test('tool output cap counts text and structured representations together',async()=>{
 const {ctx}=context();
 const response=await callTool('darktrace_get_status',{}, {...ctx,client:{async request(){return {json:{version:'x'.repeat(35000),hostname:'y'.repeat(35000)}};}}});
 assert.equal(response.structuredContent?.truncated,true);assert.ok(JSON.stringify(response).length<=60000);
});

test('write profile executes medium/high directly with awaited pre-audit; dryRun:true previews without dispatch',async()=>{
 const {ctx,requests}=context({write:true});const audits:string[]=[];const audited={...ctx,audit:{async record(id:string,outcome:string){audits.push(outcome);}}};
 const preview=await callTool('darktrace_update_device',{body:{did:1,label:'synthetic'},dryRun:true},audited);
 assert.equal(preview.structuredContent?.dryRun,true);assert.deepEqual(preview.structuredContent?.parameterNames,['did','label']);assert.equal(requests.length,0);assert.deepEqual(audits,[]);
 const done=await callTool('darktrace_update_device',{body:{did:1,label:'synthetic'}},audited);
 assert.equal(done.isError,undefined);assert.equal(requests.length,1);assert.equal(requests[0].contentType,'application/json');assert.deepEqual(audits,['start','ok']);
});
test('form-only write keeps its documented content type',async()=>{
 const {ctx,requests}=context({write:true});
 const done=await callTool('darktrace_pin_ai_analyst_incident',{operation:'post_aianalyst_pin',body:{uuid:'abc'}},ctx);
 assert.equal(done.isError,undefined);assert.equal(requests[0].contentType,'application/x-www-form-urlencoded');
 assert.equal((await callTool('darktrace_pin_ai_analyst_incident',{operation:'post_aianalyst_pin',body:{uuid:'abc'},contentType:'application/json'},ctx)).isError,true);
});
test('pre-audit failure fails closed before request; post-write audit failure reports completed and never retries',async()=>{
 const {ctx,requests}=context({write:true});
 const pre=await callTool('darktrace_update_device',{body:{did:1,label:'synthetic'}},{...ctx,audit:{async record(){throw new Error('PRIVATE_SECRET');}}});
 assert.equal(pre.isError,true);assert.equal(requests.length,0);assert.doesNotMatch(JSON.stringify(pre),/PRIVATE_SECRET/);
 let n=0;const post=await callTool('darktrace_update_device',{body:{did:1,label:'synthetic'}},{...ctx,audit:{async record(){if(n++>0)throw new Error('PRIVATE_SECRET');}}});
 assert.equal(post.isError,true);assert.equal(post.structuredContent?.outcome,'completed');assert.equal(post.structuredContent?.auditFailed,true);assert.equal(requests.length,1);
 assert.match(String(post.structuredContent?.error),/Do not automatically repeat/);assert.doesNotMatch(JSON.stringify(post),/PRIVATE_SECRET/);
});
test('critical operations never execute without the critical profile and confirm:true',async()=>{
  const writeOnly=context({write:true});
  for(const op of Object.values(operations).filter(op=>op.tier==='critical')) {
    assert.equal(eligibleTools(writeOnly.ctx.cfg).some(t=>t.name===op.tool),false);
    assert.equal((await callTool(op.tool!,{confirm:true},writeOnly.ctx)).isError,true);
  }
  assert.equal(writeOnly.requests.length,0);
  const {requests,ctx:base}=context({write:true,writeCritical:true});const ctx={...base,approve:async()=>'accept' as const};
  const preview=await callTool('darktrace_antigena_manual_action',{body:{did:1,action:'quarantine',duration:600}},ctx);
  assert.equal(preview.structuredContent?.confirmationRequired,true);assert.match(String(preview.structuredContent?.hint),/confirm:true/);assert.equal(requests.length,0);
  const done=await callTool('darktrace_antigena_manual_action',{body:{did:1,action:'quarantine',duration:600},confirm:true,previewId:preview.structuredContent?.previewId},ctx);
  assert.equal(done.isError,undefined);assert.equal(requests.length,1);assert.equal(requests[0].operationId,'post_antigena_manual');
});

test('oversized list results keep as many leading records as fit, with returned/total counts',async()=>{
  const {ctx}=context();
  const records=Array.from({length:400},(_,i)=>({pbid:i,time:1,model:{name:'m'.repeat(300)}}));
  const res=await callTool('darktrace_list_model_breaches',{},{...ctx,client:{async request(){return {json:records};}}});
  const out=res.structuredContent as any;
  assert.equal(res.isError,undefined);assert.equal(out.truncated,true);assert.equal(out.totalItems,400);
  assert.ok(out.returnedItems>10&&out.returnedItems<400);assert.equal(out.data.length,out.returnedItems);assert.equal(out.data[0].pbid,0);
  assert.ok(JSON.stringify(res).length<=60000);
  const nested=await callTool('darktrace_search_devices',{query:{query:'x'}},{...ctx,client:{async request(){return {json:{totalCount:900,devices:Array.from({length:900},(_,i)=>({did:i,hostname:'h'.repeat(100)}))}};}}});
  const n=nested.structuredContent as any;assert.equal(n.truncatedField,'devices');assert.equal(n.data.totalCount,900);assert.equal(n.data.devices.length,n.returnedItems);assert.ok(JSON.stringify(nested).length<=60000);
});
test('read-only multi-operation tools default to their listing operation',async()=>{
  const {ctx,requests}=context();
  assert.equal((await callTool('darktrace_list_model_breaches',{},ctx)).isError,undefined);
  assert.equal((await callTool('darktrace_list_models',{},ctx)).isError,undefined);
  assert.deepEqual(requests.map(r=>r.operationId),['get_modelbreaches','get_models']);
  assert.equal((await callTool('darktrace_list_tags',{},ctx)).isError,true);
  const w=context({write:true});assert.equal((await callTool('darktrace_acknowledge_model_breach',{path:{pbid:1},body:{acknowledge:true}},w.ctx)).isError,true);assert.equal(w.requests.length,0);
});
