import test from 'node:test';
import assert from 'node:assert/strict';
import { parseConfig } from '../../src/config/schema.js';
import { callTool, eligibleTools } from '../../src/tools/index.js';
import { operations, validateOperation, type ApiRequest } from '../../src/api/operations.js';
import { DarktraceApiError } from '../../src/client/errors.js';
const CANARY='SUBMITTED_VALUE_CANARY';
const config=(profiles={})=>parseConfig({instance:{baseUrl:'https://appliance.example'},auth:{publicToken:'PUBLIC_SECRET',privateToken:'PRIVATE_SECRET'},profiles});
const audit={async record(){}};
function context(profiles={},answer:(req:ApiRequest)=>unknown=()=>({json:{status:'ok'}})) {
  const requests:ApiRequest[]=[];
  return {requests,ctx:{cfg:{...config(),profiles:{...config().profiles,...profiles}},audit,client:{async request(req:ApiRequest){requests.push(req);return answer(req);}}}};
}
const sc=(r:{structuredContent?:Record<string,unknown>})=>JSON.parse(JSON.stringify(r.structuredContent)) as Record<string,any>;

test('schema failures return invalid_arguments with field paths and constraints, never submitted values',async()=>{
  const {requests,ctx}=context({write:true,writeCritical:true});
  const tags=await callTool('darktrace_manage_tags',{operation:'post_tags',body:{name:CANARY}},ctx);
  assert.equal(tags.isError,true);assert.equal(sc(tags).errorCode,'invalid_arguments');assert.equal(sc(tags).operation,'post_tags');
  assert.deepEqual(sc(tags).issues,[{path:'body.data',problem:'required',expected:'object'}]);
  assert.deepEqual(sc(tags).requiredFields,['body.name','body.data']);
  const antigena=await callTool('darktrace_antigena_action',{body:{clear:true,reason:CANARY}},ctx);
  assert.deepEqual(sc(antigena).issues,[{path:'body.codeid',problem:'required',expected:'number'}]);
  const bounds=await callTool('darktrace_get_devices',{query:{count:5000,ip:CANARY,headers:{Authorization:'PRIVATE_SECRET'}}},ctx);
  const issues=sc(bounds).issues as any[];
  assert.deepEqual(issues.find(i=>i.path==='query.count'),{path:'query.count',problem:'too_big',expected:'number <= 1000'});
  assert.match(issues.find(i=>i.path==='query.ip').expected,/IPv4 or IPv6/);
  const unknown=issues.find(i=>i.problem==='unknown_parameter');
  assert.equal(unknown.path,'query');assert.match(unknown.expected,/headers/);assert.ok(unknown.allowed.includes('did'));
  const masked=await callTool('darktrace_get_status',{query:{'bad key<script>':1}},ctx);
  assert.match(JSON.stringify(sc(masked).issues),/not one of: \?/);
  for (const r of [tags,antigena,bounds,masked]) assert.doesNotMatch(JSON.stringify(r),/SUBMITTED_VALUE_CANARY|PRIVATE_SECRET|<script>/);
  assert.equal(requests.length,0);
});

test('code-owned validation errors map to invalid_arguments with guidance',async()=>{
  const {requests,ctx}=context();
  const wide=await callTool('darktrace_list_model_breaches',{query:{starttime:1,endtime:8*86400000}},ctx);
  assert.equal(sc(wide).errorCode,'invalid_arguments');assert.match(sc(wide).hint,/at most 7 days/);
  const unpaired=await callTool('darktrace_list_model_breaches',{query:{starttime:1}},ctx);
  assert.match(sc(unpaired).hint,/both starttime and endtime/);
  const search=await callTool('darktrace_advanced_search',{body:{hash:Buffer.from('{"search":"x"}').toString('base64')}},{...ctx,cfg:{...ctx.cfg,profiles:{...ctx.cfg.profiles,sensitiveRead:true}}});
  assert.equal(sc(search).errorCode,'invalid_arguments');
  assert.deepEqual((sc(search).issues as any[]).map(i=>i.path).sort(),['search.fields','search.timeframe']);
  const proto=await callTool('darktrace_get_status',{query:{constructor:'PRIVATE_SECRET'}},ctx);
  assert.equal(sc(proto).errorCode,'invalid_arguments');assert.doesNotMatch(JSON.stringify(proto),/PRIVATE_SECRET/);
  assert.equal(requests.length,0);
});

test('policy denials, missing operation and unknown tools carry a code and next step',async()=>{
  const {requests,ctx}=context();
  const denied=await callTool('darktrace_advanced_search',{body:{hash:'e30='}},ctx);
  assert.equal(sc(denied).errorCode,'policy_denied');assert.match(sc(denied).hint,/sensitive/);
  const write=await callTool('darktrace_manage_tags',{operation:'post_tags',body:{name:'x',data:{}}},ctx);
  assert.equal(sc(write).errorCode,'policy_denied');assert.match(sc(write).hint,/write/);
  const ambiguous=await callTool('darktrace_get_reference_data',{},ctx);
  assert.equal(sc(ambiguous).errorCode,'invalid_operation');assert.deepEqual(sc(ambiguous).operations,['get_enums','get_filtertypes']);
  const wrong=await callTool('darktrace_list_tags',{operation:'get_status'},ctx);
  assert.equal(sc(wrong).errorCode,'invalid_operation');
  assert.equal(sc(await callTool('darktrace_nope',{},ctx)).errorCode,'unknown_tool');
  assert.equal(requests.length,0);
});

test('api errors keep opaque code-owned text and add an operation-aware hint for too_large',async()=>{
  const {ctx}=context({},()=>{const e=new DarktraceApiError('too_large','RID');e.message='REMOTE_CANARY';throw e;});
  const big=await callTool('darktrace_list_model_breaches',{},ctx);
  assert.equal(sc(big).errorCode,'too_large');assert.match(sc(big).hint,/narrow starttime\/endtime/);assert.match(sc(big).hint,/minimal:true/);
  assert.doesNotMatch(JSON.stringify(big),/REMOTE_CANARY|RID/);
  const forbidden=context({},()=>{throw new DarktraceApiError('forbidden','RID',403);});
  const out=await callTool('darktrace_get_status',{},forbidden.ctx);
  assert.match(sc(out).hint,/lacks permission/);assert.doesNotMatch(JSON.stringify(out),/403|RID/);
});

test('cheap defaults are applied and reported; list results always carry item counts',async()=>{
  const {requests,ctx}=context({},()=>({json:[]}));
  const empty=await callTool('darktrace_list_model_breaches',{},ctx);
  assert.equal(requests[0].query?.find(([k])=>k==='minimal')?.[1],'true');
  assert.deepEqual(Object.keys(sc(empty).appliedDefaults).sort(),['endtime','minimal','starttime']);
  assert.equal(sc(empty).returnedItems,0);assert.equal(sc(empty).totalItems,0);assert.match(sc(empty).hint,/default last-hour window/);
  await callTool('darktrace_list_model_breaches',{query:{minimal:false,starttime:1,endtime:2}},ctx);
  assert.equal(requests[1].query?.find(([k])=>k==='minimal')?.[1],'false');
  await callTool('darktrace_list_tags',{},ctx);await callTool('darktrace_list_antigena_actions',{},ctx);await callTool('darktrace_list_ai_analyst_incidents',{},ctx);
  assert.deepEqual(requests.slice(2).map(r=>r.operationId),['get_tags','get_antigena','get_aianalyst_groups']);
});

test('truncation reports the upstream total, not the capped length',async()=>{
  const rows=Array.from({length:1500},(_,i)=>({name:'model-'+i,pid:i+1}));
  const {ctx}=context({},()=>({json:rows}));
  const out=await callTool('darktrace_list_models',{query:{responsedata:'name'}},ctx);
  assert.equal(sc(out).truncated,true);assert.equal(sc(out).totalItems,1500);assert.ok(sc(out).returnedItems<=1000);
  assert.match(sc(out).hint,/Partial data|partial data/);
});

test('analyst id shapes: listed pcap names, negative device filters, defaulted ack body, ms graph buckets',()=>{
  const pcap=validateOperation(operations.get_pcaps_filename,{path:{filename:'/pcaps/DCIP_1_2_m.pcap'}});
  assert.equal(pcap.path?.filename,'DCIP_1_2_m.pcap');
  for (const filename of ['/etc/passwd','/pcaps/../x','a b.pcap','/pcaps/a/b.pcap']) assert.throws(()=>validateOperation(operations.get_pcaps_filename,{path:{filename}}));
  assert.equal(validateOperation(operations.get_devices,{query:{did:-11}}).query?.did,-11);
  assert.equal(validateOperation(operations.get_subnets,{query:{sid:-11}}).query?.sid,-11);
  assert.throws(()=>validateOperation(operations.get_devices,{query:{did:0}}));
  assert.throws(()=>validateOperation(operations.post_devices,{body:{did:-11,label:'x'}}));
  assert.throws(()=>validateOperation(operations.delete_tags_entities,{query:{did:-11,tag:'x'}}));
  assert.throws(()=>validateOperation(operations.get_models_pid,{path:{pid:-1}}));
  assert.deepEqual(validateOperation(operations.post_modelbreaches_pbid_acknowledge,{path:{pbid:5}}).body,{acknowledge:true});
  assert.deepEqual(validateOperation(operations.post_modelbreaches_pbid_unacknowledge,{path:{pbid:5}}).body,{unacknowledge:true});
  const hash=Buffer.from(JSON.stringify({search:'x',fields:[],timeframe:'3600'})).toString('base64');
  const graph=operations.get_advancedsearch_api_graph_graphmode_interval_query;
  assert.equal(validateOperation(graph,{path:{graphmode:'count',interval:3600000,query:hash}}).path?.interval,3600000);
  assert.throws(()=>validateOperation(graph,{path:{graphmode:'count',interval:604800001,query:hash}}));
  assert.throws(()=>validateOperation(operations.get_metricdata,{query:{interval:604801}}));
  // In a free-form email search body "from" is a sender, not a time bound.
  assert.deepEqual(validateOperation(operations.post_agemail_api_ep_api_v1_0_emails_search,{body:{from:'a@example.com'}}).body,{from:'a@example.com'});
});

test('device summary sections are projected through the reviewed device, breach and similarity views',async()=>{
  const {ctx}=context({},()=>({json:{data:{devices:{did:7,hostname:'h',credentials:[{user:'CRED_CANARY'}],typename:'desktop'},
    similardevices:[{did:8,score:90,hostname:'s'}],modelbreaches:[{pbid:3,score:0.5,time:1}],details:[],deviceinfo:{deviceInfo:[{did:7}]}}}}));
  const out=await callTool('darktrace_get_device_summary',{query:{did:7}},ctx);
  const data=sc(out).data.data;
  assert.equal(data.devices.did,7);assert.equal(data.devices.hostname,'h');assert.equal(data.similardevices[0].score,90);assert.equal(data.modelbreaches[0].pbid,3);
  assert.doesNotMatch(JSON.stringify(out),/CRED_CANARY|credentials/);
});

test('write descriptions name the required body fields within the description budget',()=>{
  const tools=eligibleTools(config({sensitiveRead:true,write:true,writeCritical:true}));
  const tags=tools.find(t=>t.name==='darktrace_manage_tags')!;
  assert.match(tags.description,/post_tags = create tag \(body: name, data\)/);
  assert.match(tools.find(t=>t.name==='darktrace_antigena_action')!.description,/post_antigena \(body: codeid\)/);
  assert.match(tools.find(t=>t.name==='darktrace_list_model_breaches')!.description,/epoch ms/);
  assert.doesNotMatch(tools.find(t=>t.name==='darktrace_acknowledge_model_breach')!.description,/body:/);
  for (const tool of tools) assert.ok(tool.description.length<=600,tool.name);
});
