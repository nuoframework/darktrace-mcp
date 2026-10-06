import test from 'node:test';
import { DarktraceApiError, errorHint, type ApiErrorKind } from '../../src/client/errors.js';
import assert from 'node:assert/strict';
import { operations, validateOperation, buildRequest } from '../../src/api/operations.js';
import { checkRanges } from '../../src/api/validation.js';
import { compileResponseView, selectResponseView, projectResponse, SUMMARY_LOGINPUT_VIEW, type ResponseView } from '../../src/api/response-view.js';
import { callTool } from '../../src/tools/index.js';
import { DENIAL_MESSAGES } from '../../src/policy/errors.js';
import { parseConfig } from '../../src/config/schema.js';
import { generateCoverage } from '../../src/coverage/report.js';
import catalogue from '../../src/api/catalogue.generated.json' with {type:'json'};
import views from '../../src/api/response-views.generated.json' with {type:'json'};
const op=operations.get_summarystatistics;
const endtime=1791198000000;
const cfg=parseConfig({instance:{baseUrl:'https://appliance.example'},auth:{publicToken:'PUBLIC_CANARY',privateToken:'PRIVATE_CANARY'}});
const fixture={events:true,data:[{timems:endtime,time:'2026-10-05 11:00:00',events:3}]};
test('documented loginput hourly summary permits exactly one bounded standalone anchor',()=>{
  for(const anchor of [{endtime},{to:'2026-10-05 11:00:00'}]) {
    const args=validateOperation(op,{query:{eventtype:'loginput',hours:1,...anchor}});
    assert.deepEqual(args.query,{eventtype:'loginput',hours:1,...anchor});
    const query=buildRequest(op,args).query!;assert.equal(query.length,3);assert.equal(query.some(([key])=>['starttime','from'].includes(key)),false);
  }
  assert.doesNotThrow(()=>validateOperation(op,{query:{eventtype:'loginput',hours:168,endtime:0}}));
  assert.doesNotThrow(()=>validateOperation(op,{query:{eventtype:'loginput',hours:1}}));
  assert.doesNotThrow(()=>validateOperation(op,{}));
});
test('summary exception rejects missing prerequisites, mixed modes, unreviewed variants and malformed anchors',()=>{
  for(const query of [
    {hours:1,endtime},{eventtype:'',hours:1,endtime},{eventtype:'loginput',endtime},
    {eventtype:'unknown',hours:1,endtime},{eventtype:'loginput',hours:0,endtime},
    {eventtype:'loginput',hours:169,endtime},{eventtype:'loginput',hours:1.5,endtime},
    {eventtype:'loginput',hours:1,endtime:-1},{eventtype:'loginput',hours:1,endtime:1.5},
    {eventtype:'loginput',hours:1,endtime,to:'2026-10-05 11:00:00'},
    {eventtype:'loginput',hours:1,to:'2026-02-30 11:00:00'},
    {eventtype:'loginput',hours:1,to:'2026-10-05T11:00:00+02:00'},
    {eventtype:'loginput',hours:1,endtime,csensor:false},
    {eventtype:'loginput',hours:1,endtime,mitreTactics:false},
    {csensor:false,mitreTactics:false},{hours:1},{eventtype:'loginput',hours:1,starttime:0,endtime},
  ])assert.throws(()=>validateOperation(op,{query}));
  assert.throws(()=>checkRanges({eventtype:'loginput',hours:1,endtime},{endtime:'seconds'},op.operationId));
  assert.throws(()=>checkRanges({eventtype:'loginput',hours:1,to:'2026-02-30 00:00:00'},{to:'UTC datetime'},op.operationId));
});
test('generic pairs, seven-day ceilings, calendar validation and other endpoints remain strict',()=>{
  const query={eventtype:'loginput',hours:1,endtime};
  assert.throws(()=>checkRanges(query,{endtime:'milliseconds'}));
  assert.throws(()=>checkRanges(query,{endtime:'milliseconds'},'get_modelbreaches'));
  for(const anchor of [{endtime},{to:'2026-10-05 11:00:00'}])assert.throws(()=>validateOperation(operations.get_modelbreaches,{query:anchor}));
  assert.doesNotThrow(()=>checkRanges({starttime:0,endtime:604800000},{starttime:'milliseconds'}));
  assert.throws(()=>checkRanges({starttime:0,endtime:604800001},{starttime:'milliseconds'}));
  assert.throws(()=>checkRanges({starttime:2,endtime:1},{starttime:'milliseconds'}));
  assert.throws(()=>validateOperation(operations.get_devices,{query:{iptime:'unreviewed;format'}}));
});
test('query-bound hourly projection matches the documented local schema without widening default view',()=>{
  const compiled=compileResponseView({$ref:'#/components/schemas/SummarystatisticsEventtypeLoginput'},catalogue.schemas,['events','data']);
  assert.deepEqual(SUMMARY_LOGINPUT_VIEW,compiled);
  const base=views.views.get_summarystatistics as ResponseView;
  assert.equal(selectResponseView(op.operationId,undefined,base),base);
  assert.equal(selectResponseView(op.operationId,{eventtype:'unknown'},base),base);
  assert.equal(selectResponseView('get_status',{eventtype:'loginput'},base),base);
  const projected=projectResponse(selectResponseView(op.operationId,{eventtype:'loginput'},base),{...fixture,rawMailBody:'BODY_CANARY',data:[{...fixture.data[0],payload:'RAW_CANARY',hostname:'HOST_CANARY'}]});
  assert.deepEqual(JSON.parse(JSON.stringify(projected.value)),fixture);assert.equal(projected.unmodeled,false);assert.equal(projected.omitted,true);
  for(const canary of ['BODY_CANARY','RAW_CANARY','HOST_CANARY'])assert.equal(JSON.stringify(projected).includes(canary),false);
  assert.equal(projectResponse(base,fixture).unmodeled,true);
  assert.equal(projectResponse(SUMMARY_LOGINPUT_VIEW,{events:'TYPE_CANARY',data:[{events:{payload:'NEST_CANARY'}}]}).unmodeled,true);
});
test('approved device read executes with strict projection; released summary selector uses the hourly view',async()=>{
  let calls=0;
  const upstream=[{did:7,hostname:'device.example',ip:'192.0.2.7',unknown:'UPSTREAM_CANARY',rawMailBody:'BODY_CANARY'}];
  const allowedCtx={cfg,client:{async request(){calls++;return {json:upstream};}},shape:(data:unknown)=>Array.isArray(data)?data.map(item=>({...item as object,rawMailBody:'SHAPE_CANARY'})):{...data as object,rawMailBody:'SHAPE_CANARY'}};
  const result=await callTool('darktrace_get_devices',{},allowedCtx);
  assert.equal(calls,1);assert.equal(result.isError,undefined);
  assert.deepEqual(JSON.parse(JSON.stringify(result.structuredContent!.data)),[{did:7,hostname:'device.example',ip:'192.0.2.7'}]);
  assert.equal(JSON.stringify(result).includes('CANARY'),false);
  const invalid=await callTool('darktrace_get_devices',{query:{unreviewed:'value'}},allowedCtx);
  assert.equal(invalid.isError,true);assert.equal(calls,1);

  // The summary operation is now released: the query-bound hourly view is used, with no audit for reads.
  const state={calls:0,audits:0};
  const summary=await callTool('darktrace_get_summary_statistics',{operation:'get_summarystatistics',query:{eventtype:'loginput',hours:1,endtime}}, {
    cfg,client:{async request(){state.calls++;return {json:{...fixture,unknown:'UPSTREAM_CANARY'}};}},
    audit:{async record(){state.audits++;}},
  });
  assert.equal(summary.isError,undefined);assert.equal(state.calls,1);assert.equal(state.audits,0);
  assert.deepEqual(JSON.parse(JSON.stringify(summary.structuredContent!.data)),fixture);assert.doesNotMatch(JSON.stringify(summary),/CANARY/);
});
test('effective coverage records conditional anchors and exact query-bound output variant',()=>{
  const row=generateCoverage().operations.find(r=>r.operationId===op.operationId)!;
  for(const name of ['endtime','to']){const parameter=row.parameters.find(p=>p.name===name)!;assert.equal(parameter.status,'accepted');assert.equal((parameter.conditionalRules as any[])[0].id,'summary_hourly_anchor');}
  assert.deepEqual(row.outputView.requestVariants![0].fields,SUMMARY_LOGINPUT_VIEW);
  assert.equal(row.outputView.labValidated,false);
});

test('API diagnostics return only exact code-owned enums and never remote exception properties',async()=>{
  const codes=['auth','forbidden','bad_request','not_found','rate_limited','server','network','timeout','cancelled','too_large','invalid_request','invalid_response','overloaded','clock_skew_suspected'] as const;
  // Read failures map onto the fixed denial vocabulary; the UX hint still comes from the code-owned kind.
  const denial=(kind:ApiErrorKind)=>kind==='forbidden'?'upstream_forbidden':kind==='too_large'?'response_limit_exceeded':kind==='invalid_response'?'schema_mismatch':kind==='cancelled'?'request_cancelled':'upstream_error';
  const audits:string[]=[];
  const invoke=(error:unknown)=>callTool(operations.get_status.tool!,{}, {cfg,client:{request:async()=>{throw error;}},audit:{async record(id:string,outcome:string){audits.push(id+':'+outcome);}}});
  for(const kind of codes) {
    const error=new DarktraceApiError(kind,'SECRET_REQUEST_ID',401);
    error.message='REMOTE_CANARY https://private.example';error.stack='STACK_CANARY';
    const output=await invoke(error);
    assert.equal(output.isError,true);assert.equal(output.structuredContent?.errorCode,denial(kind),kind);
    assert.deepEqual(Object.keys(output.structuredContent!).sort(),['error','errorCode','hint']);
    // The message and hint are looked up from code-owned tables, never taken from the exception.
    assert.deepEqual(output.structuredContent?.error,{code:denial(kind),message:DENIAL_MESSAGES[denial(kind)]});
    assert.equal(output.content[0].text,JSON.stringify(output.structuredContent));
    if(kind!=='too_large')assert.equal(output.structuredContent?.hint,errorHint(kind));
    assert.doesNotMatch(JSON.stringify(output),/CANARY|SECRET_REQUEST_ID|private\.example|401/);
  }
  const forged=new DarktraceApiError('REMOTE_CANARY' as ApiErrorKind,'SECRET_REQUEST_ID');
  const hostile=new DarktraceApiError('auth','SECRET_REQUEST_ID');
  Object.defineProperty(hostile,'kind',{get(){throw new Error('GETTER_CANARY');}});
  for(const error of [forged,hostile,new Error('REMOTE_CANARY'),{kind:'auth',message:'REMOTE_CANARY'},null]) {
    const output=await invoke(error);assert.equal(output.isError,true);
    assert.deepEqual(output.structuredContent,{error:{code:'upstream_error',message:DENIAL_MESSAGES.upstream_error},errorCode:'upstream_error'});
    assert.doesNotMatch(JSON.stringify(output),/CANARY|SECRET_REQUEST_ID/);
  }
  // Upstream read failures write no audit record.
  assert.deepEqual(audits,[]);
});
