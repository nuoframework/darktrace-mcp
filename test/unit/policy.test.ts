import test from 'node:test';
import assert from 'node:assert/strict';
import { parseConfig } from '../../src/config/schema.js';
import { callTool, eligibleTools } from '../../src/tools/index.js';
import { operations, type ApiRequest } from '../../src/api/operations.js';
const config=(profiles={})=>parseConfig({instance:{baseUrl:'https://appliance.example'},auth:{publicToken:'PUBLIC_SECRET',privateToken:'PRIVATE_SECRET'},profiles});
const audit={async record(){}};
function context(profiles={}) {const requests:ApiRequest[]=[];return {requests,ctx:{cfg:config(profiles),audit,client:{async request(req:ApiRequest){requests.push(req);return {json:{status:'ok'}};}}}};}
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
test('operator write profile enables medium/high, critical remains preview-only even confirm',async()=>{
  const {requests,ctx}=context({write:true,writeCritical:true});
  const changed=await callTool('darktrace_update_device',{body:{did:42,label:'example'},dryRun:false},ctx);
  assert.equal(changed.isError,undefined);assert.equal(requests.length,1);
  const preview=await callTool('darktrace_antigena_manual_action',{body:{did:42,action:'quarantine',duration:10,reason:'PRIVATE_SECRET'},dryRun:false},ctx);
  assert.equal(preview.structuredContent?.dryRun,true);assert.equal(requests.length,1);
  assert.deepEqual(Object.keys(preview.structuredContent!).sort(),['dryRun','method','operationId','parameterNames']);
  assert.equal(JSON.stringify(preview).includes('PRIVATE_SECRET'),false);
  const rejected=await callTool('darktrace_antigena_manual_action',{body:{did:42,action:'quarantine',duration:10},confirm:true},ctx);
  assert.equal(rejected.isError,true);assert.equal(requests.length,1);
});
test('all critical operations (including blocked email) cannot execute',async()=>{
  const {requests,ctx}=context({write:true,writeCritical:true});
  for(const op of Object.values(operations).filter(op=>op.tier==='critical')) {
    const res=await callTool(op.tool!,{operation:op.operationId,confirm:true,dryRun:false},ctx);
    assert.ok(res.isError||res.structuredContent?.dryRun);
  }
  assert.equal(requests.length,0);
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
test('form-only operation respects content type and writes preview without dispatch',async()=>{
  const {requests,ctx}=context({write:true});
  assert.equal((await callTool('darktrace_acknowledge_ai_analyst_incident',{operation:'post_aianalyst_acknowledge',body:{uuid:'id'},contentType:'application/json'},ctx)).isError,true);
  const res=await callTool('darktrace_acknowledge_ai_analyst_incident',{operation:'post_aianalyst_acknowledge',body:{uuid:'id'},dryRun:true},ctx);
  assert.equal(res.structuredContent?.dryRun,true);assert.equal(requests.length,0);
});
test('writes default to preview and async preaudit fails closed before request',async()=>{
 const {ctx,requests}=context({write:true});
 const preview=await callTool('darktrace_update_device',{body:{did:1,label:'label'}},ctx);
 assert.equal(preview.structuredContent?.dryRun,true);assert.equal(requests.length,0);
 const blocked=await callTool('darktrace_update_device',{body:{did:1,label:'label'},dryRun:false},{...ctx,audit:{async record(){throw new Error('PRIVATE_SECRET audit failure');}}});
 assert.equal(blocked.isError,true);assert.equal(requests.length,0);assert.equal(JSON.stringify(blocked).includes('PRIVATE_SECRET'),false);
});
test('post-write audit failure reports completed effect and never retries',async()=>{
 const {ctx,requests}=context({write:true});const events:string[]=[];
 const response=await callTool('darktrace_update_device',{body:{did:1,label:'label'},dryRun:false},{...ctx,audit:{async record(_op,outcome){events.push(outcome);if(outcome==='ok') throw new Error('audit sink failed');}}});
 assert.equal(response.isError,true);assert.equal(response.structuredContent?.outcome,'completed');assert.equal(requests.length,1);assert.deepEqual(events,['start','ok']);
 const unknown=await callTool('darktrace_update_device',{body:{did:1,label:'label'},dryRun:false},{...ctx,client:{async request(){throw new Error('timeout');}}});
 assert.equal(unknown.structuredContent?.outcome,'unknown');
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
