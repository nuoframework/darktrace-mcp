import test from 'node:test';
import assert from 'node:assert/strict';
import { compileResponseView, projectResponse } from '../../src/api/response-view.js';
import { callTool } from '../../src/tools/index.js';
import { parseConfig } from '../../src/config/schema.js';

const device={type:'object',properties:{did:{type:'integer'}}};
const view=compileResponseView({oneOf:[device,{type:'array',items:device}]},{});
test('object-first union preserves arrays of projected devices and empty arrays',()=>{
 for(const input of [[],[{did:7,unreviewed:'SYNTHETIC_EXTRA_CANARY'}]]) {
  const result=projectResponse(view,input);
  assert.ok(Array.isArray(result.value));
  assert.equal((result.value as unknown[]).length,input.length);
  assert.equal(result.unmodeled,false);
  assert.equal(JSON.stringify(result.value).includes('SYNTHETIC_EXTRA_CANARY'),false);
 }
});
test('union still selects object and scalar variants, with safe fallback on mismatches',()=>{
 const object=projectResponse(view,{did:7});
 assert.equal((object.value as {did:number}).did,7);
 assert.equal(object.unmodeled,false);
 const scalar=compileResponseView({oneOf:[device,{type:'string'},{type:'boolean'}]},{});
 assert.equal(projectResponse(scalar,'synthetic string').value,'synthetic string');
 assert.equal(projectResponse(scalar,false).value,false);
 const mismatch=projectResponse(view,'SYNTHETIC_TYPE_CANARY');
 assert.equal(mismatch.unmodeled,true);
 assert.equal(JSON.stringify(mismatch).includes('SYNTHETIC_TYPE_CANARY'),false);
});
test('production get_devices MCP result keeps the documented array variant',async()=>{
 const cfg=parseConfig({instance:{baseUrl:'https://appliance.example.invalid'},auth:{publicToken:'PUBLIC_CANARY',privateToken:'PRIVATE_CANARY'}});
 let requests=0;
 const result=await callTool('darktrace_get_devices',{operation:'get_devices',query:{count:1,seensince:'60',includetags:false,cloudsecurity:false}}, {
  cfg,client:{async request(){requests++;return {json:[{did:7,unreviewed:'SYNTHETIC_EXTRA_CANARY'}]};}},
 });
 assert.equal(requests,1);
 assert.equal(result.isError,undefined);
 assert.ok(Array.isArray(result.structuredContent?.data));
 assert.equal((result.structuredContent?.data as {did:number}[])[0].did,7);
 assert.equal(result.structuredContent?.unmodeledFieldsOmitted,undefined);
 assert.equal(result.structuredContent?.truncated,undefined);
 assert.equal(JSON.stringify(result).includes('SYNTHETIC_EXTRA_CANARY'),false);
});
