import test from 'node:test';
import assert from 'node:assert/strict';
import { parseConfig } from '../../src/config/schema.js';
import { createHttpClient } from '../../src/client/httpClient.js';
import { operationDescriptors } from '../../src/api/operations.js';
import { callTool } from '../../src/tools/index.js';
import statusFixture from './fixtures/status.json' with {type:'json'};
const cfg=()=>parseConfig({instance:{baseUrl:'https://192.0.2.10'},auth:{publicToken:'PUBLIC_SECRET',privateToken:'PRIVATE_SECRET'},profiles:{write:true,writeCritical:true}});
test('operation-to-HTTP integration uses fixture fetch, signing and fixed route',async()=>{
 const calls:Array<{url:string;init?:RequestInit}>=[];
 const client=createHttpClient(cfg(),{testOnly:true,operations:operationDescriptors,fetch:async(input,init)=>{
  calls.push({url:String(input),init});return new Response(JSON.stringify(statusFixture),{headers:{'Content-Type':'application/json'}});
 }});
 const result=await callTool('darktrace_get_status',{query:{fast:true}},{cfg:cfg(),client,audit:{async record(){}}});
 assert.equal(result.isError,undefined);assert.equal(calls.length,1);
 assert.equal(calls[0].url,'https://192.0.2.10/status?fast=true');
 assert.equal(calls[0].init?.redirect,'error');
 const headers=new Headers(calls[0].init?.headers);assert.equal(headers.get('DTAPI-Token'),'PUBLIC_SECRET');assert.ok(headers.get('DTAPI-Signature'));
 assert.equal((result.structuredContent?.data as any).version,'7.1-fixture');
 assert.equal(JSON.stringify(result).includes('SECRET'),false);
});
test('form-only writes preserve content type; critical preview makes zero fetch calls',async()=>{
 const calls:RequestInit[]=[];
 const client=createHttpClient(cfg(),{testOnly:true,operations:operationDescriptors,fetch:async(_url,init)=>{
  calls.push(init!);return new Response('{"response":"SUCCESS"}',{headers:{'Content-Type':'application/json'}});
 }});
 const ctx={cfg:cfg(),client,audit:{async record(){}}};
 const ack=await callTool('darktrace_acknowledge_ai_analyst_incident',{operation:'post_aianalyst_acknowledge',body:{uuid:'fixture-uuid'},dryRun:false},ctx);
 assert.equal(ack.isError,undefined);assert.equal(calls.length,1);
 assert.equal(new Headers(calls[0].headers).get('Content-Type'),'application/x-www-form-urlencoded');
 assert.equal(Buffer.from(calls[0].body as Uint8Array).toString(),'uuid=fixture-uuid');
 const preview=await callTool('darktrace_antigena_manual_action',{body:{did:1,action:'quarantine',duration:5},dryRun:false},ctx);
 assert.equal(preview.structuredContent?.dryRun,true);assert.equal(calls.length,1);
});
