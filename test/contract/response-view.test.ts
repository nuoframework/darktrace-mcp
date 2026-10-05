import test from 'node:test';
import assert from 'node:assert/strict';
import { callTool } from '../../src/tools/index.js';
import { parseConfig } from '../../src/config/schema.js';
import { compileResponseView, projectResponse } from '../../src/api/response-view.js';
import { generateCoverage } from '../../src/coverage/report.js';
const cfg=parseConfig({instance:{baseUrl:'https://appliance.example'},auth:{publicToken:'PUBLIC_CANARY',privateToken:'PRIVATE_CANARY'},profiles:{sensitiveRead:true}});
test('status projection preserves known untrusted version and drops unlisted fields even after custom shaping',async()=>{
  const result=await callTool('darktrace_get_status',{}, {cfg,client:{async request(){return {json:{version:'untrusted version text',unexpectedField:'EXTRA_CANARY',rawMailBody:'BODY_CANARY',credentials:999}};}},shape:value=>({...value as object,shapeInjection:'SHAPE_CANARY'})});
  assert.equal((result.structuredContent?.data as any).version,'untrusted version text');
  for(const canary of ['EXTRA_CANARY','BODY_CANARY','SHAPE_CANARY','credentials'])assert.equal(JSON.stringify(result).includes(canary),false);
  assert.equal(result.structuredContent?.minimized,true);
});
test('approved device projection strips unknown top-level and nested fields',async()=>{
  let calls=0;
  const result=await callTool('darktrace_get_devices',{}, {cfg,client:{async request(){calls++;return {json:[{did:1,hostname:'device.example',ip:'192.0.2.1',ips:[{ip:'192.0.2.1',timems:1791198000000,time:'2026-10-05 11:00:00',sid:4,rawMailBody:'NESTED_CANARY'}],unexpectedField:'TOP_CANARY',rawMailBody:'BODY_CANARY'}]};}}});
  assert.equal(calls,1);assert.equal(result.isError,undefined);
  assert.deepEqual(JSON.parse(JSON.stringify(result.structuredContent?.data)),[{did:1,hostname:'device.example',ip:'192.0.2.1',ips:[{ip:'192.0.2.1',timems:1791198000000,time:'2026-10-05 11:00:00',sid:4}]}]);
  for(const canary of ['TOP_CANARY','BODY_CANARY','NESTED_CANARY'])assert.equal(JSON.stringify(result).includes(canary),false);
});
test('excluded Advanced Search selector is denied before preview, audit, or network effects',async()=>{
  const hash=Buffer.from(JSON.stringify({search:'x',fields:['unexpectedField','@message','rawMailBody'],timeframe:'3600'})).toString('base64');
  const effects={calls:0,audits:0};
  const result=await callTool('darktrace_advanced_search',{operation:'post_advancedsearch_api_search',body:{hash},dryRun:true,sensitiveRead:true,providerEligible:true},{cfg,client:{async request(){effects.calls++;return {json:{}};}},audit:{async record(){effects.audits++;}}});
  assert.equal(result.isError,true);assert.equal(effects.calls,0);assert.equal(effects.audits,0);
  assert.equal(result.structuredContent?.dryRun,undefined);assert.equal(result.structuredContent?.preview,undefined);assert.equal(result.structuredContent?.outcome,undefined);
  assert.equal(JSON.stringify(result).includes(hash),false);
});
test('unmodeled roots/maps and shape mismatches yield fixed summaries without values or inferred keys',()=>{
  for(const schema of [{type:'object',additionalProperties:true},{},undefined]) {
    const view=compileResponseView(schema,{});const result=projectResponse(view,{secretBody:'BODY_CANARY',rawField:'FIELD_CANARY'});
    assert.equal(result.unmodeled,true);assert.equal(JSON.stringify(result).includes('CANARY'),false);
  }
  const view=compileResponseView({type:'object',properties:{version:{type:'string'}}},{},['version']);
  assert.equal(JSON.stringify(projectResponse(view,{version:{unexpected:'TYPE_CANARY'}})).includes('TYPE_CANARY'),false);
});
test('all operation coverage rows record an explicit output projection and safe fallback',()=>{
  const report=generateCoverage();assert.equal(report.operations.length,79);
  for(const op of report.operations){assert.ok(op.outputView.fields);assert.equal(op.outputView.unknownFields,'omitted');assert.equal(op.outputView.unmodeledStructures,'fixed safe summary');}
});
