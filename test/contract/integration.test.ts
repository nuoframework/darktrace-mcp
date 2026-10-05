import test from 'node:test';
import assert from 'node:assert/strict';
import { parseConfig } from '../../src/config/schema.js';
import { createHttpClient } from '../../src/client/httpClient.js';
import { operationDescriptors } from '../../src/api/operations.js';
import { callTool } from '../../src/tools/index.js';
import statusFixture from './fixtures/status.json' with {type:'json'};
const cfg=()=>parseConfig({instance:{baseUrl:'https://192.0.2.10'},auth:{publicToken:'PUBLIC_SECRET',privateToken:'PRIVATE_SECRET'},profiles:{write:false,writeCritical:false}});
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
test('production MCP denies form writes and critical actions before HTTP effects',async()=>{
 let calls=0;const client=createHttpClient(cfg(),{testOnly:true,operations:operationDescriptors,fetch:async()=>{calls++;return new Response('{}');}});
 const ctx={cfg:{...cfg(),profiles:{...cfg().profiles,write:true,writeCritical:true}},client,audit:{async record(){throw new Error('audit must not run');}}};
 for(const name of ['darktrace_acknowledge_ai_analyst_incident','darktrace_antigena_manual_action'])for(const dryRun of [true,false]){const result=await callTool(name,{body:{did:1,uuid:'fixture-uuid'},dryRun},ctx);assert.equal(result.isError,true);assert.equal(result.structuredContent?.dryRun,undefined);}
 assert.equal(calls,0);
});
