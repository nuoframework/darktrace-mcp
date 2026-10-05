import test from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { Client } from '@modelcontextprotocol/client';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import { parseConfig } from '../../src/config/schema.js';
import { operations, type Operation } from '../../src/api/operations.js';
import { RELEASE_CAPABILITY, RELEASE_CONSULTATION_OPERATIONS, releaseAllowsOperation } from '../../src/policy/release-capability.js';
import { authorize } from '../../src/policy/guard.js';
import { allTools, eligibleTools, callTool } from '../../src/tools/index.js';
import { productionOperationDescriptors } from '../../src/server/stdio.js';
import { createServer } from '../../src/server/createServer.js';
import { generateCoverage } from '../../src/coverage/report.js';

// Independent user-approved oracle, not derived from catalogue eligibility.
const allowed=[
  'get_status','get_devices','get_subnets','get_aianalyst_stats','get_intelfeed','get_modelbreaches',
  'get_devicesearch','get_similardevices','get_aianalyst_groups','get_aianalyst_incidentevents',
  'get_aianalyst_investigations','get_mbcomments','get_details','get_tags_entities','get_tags_tid',
  'get_tags_tid_entities','get_endpointdetails','get_antigena','get_antigena_summary',
];
const allowedSet=new Set(allowed);
const allowedTools=[
  'darktrace_get_status','darktrace_get_devices','darktrace_list_subnets','darktrace_get_ai_analyst_stats',
  'darktrace_get_intel_feed','darktrace_list_model_breaches','darktrace_search_devices','darktrace_get_similar_devices',
  'darktrace_list_ai_analyst_incidents','darktrace_list_ai_analyst_investigations','darktrace_get_model_breach_comments',
  'darktrace_get_connection_details','darktrace_list_tags','darktrace_get_endpoint_details','darktrace_list_antigena_actions',
];
const config=(sensitiveRead=false)=>parseConfig({instance:{baseUrl:'https://appliance.example'},auth:{publicToken:'PUBLIC_CANARY',privateToken:'PRIVATE_CANARY'},profiles:{sensitiveRead}});
const sorted=(ids:readonly string[])=>[...ids].sort();
function selectors(schema:any):string[] {
  const values:string[]=[];
  function walk(node:any):void {if(!node||typeof node!=='object')return;const op=node.properties?.operation;if(op?.const)values.push(op.const);if(op?.enum)values.push(...op.enum);for(const key of ['anyOf','oneOf','allOf'])for(const child of node[key]??[])walk(child);}
  walk(schema);return values;
}

test('immutable primitive release ceiling is exactly the approved 19 GET selectors and fixed routes',()=>{
  assert.deepEqual(RELEASE_CAPABILITY,{write:false,writeCritical:false});assert(Object.isFrozen(RELEASE_CAPABILITY));
  assert(Object.isFrozen(RELEASE_CONSULTATION_OPERATIONS));assert.deepEqual(sorted(RELEASE_CONSULTATION_OPERATIONS),sorted(allowed));
  assert.equal(Reflect.set(RELEASE_CONSULTATION_OPERATIONS,'0','get_metricdata'),false);
  assert.deepEqual(sorted(Object.values(operations).filter(releaseAllowsOperation).map(o=>o.operationId)),sorted(allowed));
  assert.deepEqual(sorted(productionOperationDescriptors.map(o=>o.operationId)),sorted(allowed));
  assert(Object.isFrozen(productionOperationDescriptors));assert(productionOperationDescriptors.every(o=>Object.isFrozen(o)&&o.method==='GET'));
  for(const id of allowed){const op=operations[id];assert.doesNotThrow(()=>authorize(op,config()));for(const mutation of [{method:'POST'},{method:'DELETE'},{tier:'medium'},{status:'blocked'},{operationId:'get_metricdata'},{pathTemplate:'/admin'},{pathTemplate:op.pathTemplate+'?bypass=1'}]){
    const forged={...op,...mutation} as Operation;assert.equal(releaseAllowsOperation(forged),false);assert.throws(()=>authorize(forged,config()));
  }}
  assert.deepEqual(sorted(generateCoverage().operations.filter(o=>o.releaseEligible).map(o=>o.operationId)),sorted(allowed));
});

test('15 tool descriptions and input variants advertise exactly their allowed operations in both profiles',()=>{
  const normal=eligibleTools(config()),sensitive=eligibleTools(config(true));assert.equal(normal.length,15);assert.deepEqual(normal.map(t=>t.name),sensitive.map(t=>t.name));
  assert.deepEqual(sorted(normal.map(t=>t.name)),sorted(allowedTools));
  assert.deepEqual(sorted(normal.flatMap(t=>t.operations.map(o=>o.operationId))),sorted(allowed));
  for(const tools of [allTools(),normal,sensitive])for(const tool of tools){
    const ids=tool.operations.map(o=>o.operationId),schema=z.toJSONSchema(tool.inputSchema,{io:'input'});
    assert.deepEqual(sorted(selectors(schema)),sorted(ids));
    assert.deepEqual(sorted(tool.description.match(/\b(?:get|post|delete)_[a-zA-Z0-9_]+\b/g)??[]),sorted(ids));
    assert.match(tool.description,/other parameter combinations are not validated/);
    assert.doesNotMatch(tool.description,/Critical actions are preview-only|path\/query\/body/);
    assert.deepEqual(tool.annotations,{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false});
    for(const op of Object.values(operations).filter(o=>o.tool===tool.name&&!allowedSet.has(o.operationId)))assert.equal(tool.inputSchema.safeParse({operation:op.operationId}).success,false);
  }
  assert.equal(normal.find(t=>t.name==='darktrace_list_model_breaches')?.operations.length,1);
  assert.equal(normal.find(t=>t.name==='darktrace_get_model_breach_comments')?.operations.length,1);
  assert.equal(normal.find(t=>t.name==='darktrace_list_tags')?.operations.length,3);
  assert.equal(normal.find(t=>t.name==='darktrace_list_antigena_actions')?.operations.length,2);
});

test('all 60 excluded operations deny direct calls and forged profiles before preview, audit or request',async()=>{
  const excluded=Object.values(operations).filter(o=>!allowedSet.has(o.operationId));assert.equal(excluded.length,60);
  let requests=0,audits=0,shapes=0;
  for(const sensitiveRead of [false,true]){
    const base=config(sensitiveRead),cfg={...base,profiles:{...base.profiles,write:true,writeCritical:true,sensitiveRead}};
    const ctx={cfg,client:{async request(){requests++;throw Error('REQUEST_CANARY');}},audit:{async record(){audits++;throw Error('AUDIT_CANARY');}},shape(){shapes++;throw Error('SHAPE_CANARY');}};
    assert.deepEqual(sorted(eligibleTools(cfg).flatMap(t=>t.operations.map(o=>o.operationId))),sorted(allowed));
    for(const op of excluded){assert.throws(()=>authorize(op,cfg));for(const dryRun of [undefined,true,false]){
      const result=await callTool(op.tool??'unknown_tool',{operation:op.operationId,path:{tid:1},query:{did:1},body:{did:1,label:'INPUT_CANARY'},...(dryRun===undefined?{}:{dryRun})},ctx);
      assert.equal(result.isError,true,op.operationId);assert.equal(result.structuredContent?.dryRun,undefined);assert.equal(result.structuredContent?.outcome,undefined);assert.doesNotMatch(JSON.stringify(result),/CANARY/);
    }}
  }
  assert.deepEqual([requests,audits,shapes],[0,0,0]);
});

test('newly single-operation tools accept their advertised omitted selector and reject historical variants',async()=>{
  const seen:string[]=[];const ctx={cfg:config(),client:{async request(request:{operationId:string}){seen.push(request.operationId);return {json:[]};}}};
  assert.equal((await callTool('darktrace_list_model_breaches',{},ctx)).isError,undefined);
  assert.equal((await callTool('darktrace_get_model_breach_comments',{query:{pbid:1}},ctx)).isError,undefined);
  assert.deepEqual(seen,['get_modelbreaches','get_mbcomments']);
  assert.equal((await callTool('darktrace_list_model_breaches',{operation:'get_modelbreaches_pbid',path:{pbid:1}},ctx)).isError,true);
  assert.equal((await callTool('darktrace_get_model_breach_comments',{operation:'get_modelbreaches_pbid_comments',path:{pbid:1}},ctx)).isError,true);
  assert.equal(seen.length,2);
});

test('actual SDK tools/list returns identical full 15-tool contracts with sensitive opt-in',async()=>{
  const requests:string[]=[];const contracts=[];
  for(const sensitiveRead of [false,true]){
    const server=createServer({cfg:config(sensitiveRead),client:{async request(request:{operationId:string}){requests.push(request.operationId);return {json:[]};}}});
    const client=new Client({name:'validated-consultation-contract',version:'1'}),[a,b]=InMemoryTransport.createLinkedPair();
    try{await server.connect(b);await client.connect(a);const before=requests.length;const {tools}=await client.listTools();assert.equal(requests.length,before);assert.equal(tools.length,15);assert.deepEqual(sorted(tools.flatMap(t=>selectors(t.inputSchema))),sorted(allowed));contracts.push(tools);
      assert.equal((await client.callTool({name:'darktrace_list_model_breaches',arguments:{}})).isError,undefined);
      assert.equal((await client.callTool({name:'darktrace_list_model_breaches',arguments:{operation:'get_modelbreaches_pbid',path:{pbid:1}}})).isError,true);
      assert.equal((await client.callTool({name:'darktrace_advanced_search',arguments:{operation:'post_advancedsearch_api_search'}})).isError,true);
      assert.equal(requests.length,before+1);
    }finally{await client.close();await server.close();}
  }
  assert.deepEqual(contracts[0],contracts[1]);assert.deepEqual(requests,['get_modelbreaches','get_modelbreaches']);
});
