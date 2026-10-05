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
test('Advanced Search strips unknown top-level/nested fields, dynamic maps and raw telemetry regardless of requested fields',async()=>{
  const hash=Buffer.from(JSON.stringify({search:'x',fields:['unexpectedField','@message','rawMailBody'],timeframe:'3600'})).toString('base64');
  const result=await callTool('darktrace_advanced_search',{operation:'post_advancedsearch_api_search',body:{hash}},{cfg,client:{async request(){return {json:{took:1,timed_out:false,unexpectedField:'TOP_CANARY',rawMailBody:'MAIL_CANARY',hits:{total:1,extra:'HITS_CANARY',hits:[{_id:'id',_source:{'@type':'dns','@timestamp':'2026-10-05','@message':'RAW_CANARY','@fields':{rawMailBody:'MAP_CANARY'},unexpectedField:'NEST_CANARY'}}]}}};}}});
  assert.equal(result.isError,undefined);for(const canary of ['TOP_CANARY','MAIL_CANARY','HITS_CANARY','RAW_CANARY','MAP_CANARY','NEST_CANARY'])assert.equal(JSON.stringify(result).includes(canary),false);
  assert.equal((result.structuredContent?.data as any).hits.hits[0]._source['@type'],'dns');
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
