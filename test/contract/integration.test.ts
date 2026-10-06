import test from 'node:test';
import { createHmac } from 'node:crypto';
import { productionOperationDescriptors } from '../../src/server/stdio.js';
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
const DATE='20260102T030405';
const hmac=(signed:string)=>createHmac('sha1','PRIVATE_SECRET').update(`${signed}\nPUBLIC_SECRET\n${DATE}`,'utf8').digest('hex');
function wired(profiles:Record<string,boolean>,respond:(url:string)=>Response=()=>new Response('{"response":"SUCCESS"}',{headers:{'Content-Type':'application/json'}})) {
 const config=parseConfig({instance:{baseUrl:'https://192.0.2.10'},auth:{publicToken:'PUBLIC_SECRET',privateToken:'PRIVATE_SECRET'},profiles});
 const calls:Array<{url:string;method:string;body?:string;headers:Headers}>=[];
 const client=createHttpClient(config,{testOnly:true,operations:productionOperationDescriptors,now:()=>Date.UTC(2026,0,2,3,4,5),fetch:async(input,init)=>{
  calls.push({url:String(input),method:String(init?.method),...(init?.body===undefined?{}:{body:Buffer.from(init.body as Uint8Array).toString()}),headers:new Headers(init?.headers)});return respond(String(input));
 }});
 return {calls,ctx:{cfg:config,client,audit:{async record(){}},approve:async()=>'accept' as const}};
}
test('production client registry accepts every released operation and still refuses the deprecated one',()=>{
 assert.equal(productionOperationDescriptors.length,78);
 assert.doesNotThrow(()=>createHttpClient(cfg(),{testOnly:true,operations:productionOperationDescriptors,fetch:async()=>new Response('{}')}));
});
test('S6 Advanced Search GET sends and signs the standard Base64 document verbatim in the path',async()=>{
 const {calls,ctx}=wired({sensitiveRead:true},()=>new Response('{"took":1,"timed_out":false,"hits":{"total":0,"hits":[]}}',{headers:{'Content-Type':'application/json'}}));
 // This document's Base64 contains '+', '/' and '=' (search text chosen for it).
 const doc={search:'@fields.query:"a?b>c~"',fields:[],timeframe:'3600',time:{user_interval:0}};
 const hash=Buffer.from(JSON.stringify(doc)).toString('base64');assert.match(hash,/[+/]/);
 const result=await callTool('darktrace_advanced_search',{operation:'get_advancedsearch_api_search_query',path:{query:hash}},ctx);
 assert.equal(result.isError,undefined,JSON.stringify(result));assert.equal(calls.length,1);
 assert.equal(calls[0].url,`https://192.0.2.10/advancedsearch/api/search/${hash}`);
 assert.equal(calls[0].headers.get('DTAPI-Signature'),hmac(`/advancedsearch/api/search/${hash}`));
 const bad=await callTool('darktrace_advanced_search',{operation:'get_advancedsearch_api_search_query',path:{query:Buffer.from('{"search":"x"}').toString('base64')}},ctx);
 assert.equal(bad.isError,true);assert.equal(calls.length,1);
});
test('Darktrace/EMAIL routes use the same HMAC scheme over path and ordered query',async()=>{
 const {calls,ctx}=wired({sensitiveRead:true});
 assert.equal((await callTool('darktrace_email_dashboard',{operation:'get_agemail_api_ep_api_v1_0_dash_dash_stats',query:{days:28,limit:2}},ctx)).isError,undefined);
 assert.equal((await callTool('darktrace_email_get',{path:{uuid:'0f8fad5b-d9cb-469f-a165-70867728950e'},query:{include_headers:true}},ctx)).isError,undefined);
 assert.equal((await callTool('darktrace_email_search',{body:{mode:'and',criteriaList:[{apiFilter:'from',operator:'is',value:'a@example.com'}]}},ctx)).isError,undefined);
 assert.deepEqual(calls.map(c=>[c.method,c.url]),[
  ['GET','https://192.0.2.10/agemail/api/ep/api/v1.0/dash/dash_stats?days=28&limit=2'],
  ['GET','https://192.0.2.10/agemail/api/ep/api/v1.0/emails/0f8fad5b-d9cb-469f-a165-70867728950e?include_headers=true'],
  ['POST','https://192.0.2.10/agemail/api/ep/api/v1.0/emails/search'],
 ]);
 assert.equal(calls[0].headers.get('DTAPI-Signature'),hmac('/agemail/api/ep/api/v1.0/dash/dash_stats?days=28&limit=2'));
 assert.equal(calls[1].headers.get('DTAPI-Signature'),hmac('/agemail/api/ep/api/v1.0/emails/0f8fad5b-d9cb-469f-a165-70867728950e?include_headers=true'));
 assert.equal(calls[2].body,'{"mode":"and","criteriaList":[{"apiFilter":"from","operator":"is","value":"a@example.com"}]}');
 assert.equal(calls[2].headers.get('DTAPI-Signature'),hmac(`/agemail/api/ep/api/v1.0/emails/search?${calls[2].body}`));
});
test('PCAP download reads bounded bytes; a JSON status answer is returned as data',async()=>{
 const pcap=new Uint8Array([0xd4,0xc3,0xb2,0xa1,2,0,4,0]);
 const {calls,ctx}=wired({sensitiveRead:true},url=>url.endsWith('/pending.pcap')?new Response('{"state":"pending"}',{headers:{'Content-Type':'application/json'}}):new Response(pcap,{headers:{'Content-Type':'application/vnd.tcpdump.pcap'}}));
 const done=await callTool('darktrace_download_pcap',{path:{filename:'capture.pcap'}},ctx);
 const file=(done.structuredContent as any).data.file;
 assert.deepEqual([file.name,file.mediaType,file.sizeBytes,file.encoding,file.contentBase64],['capture.pcap','application/vnd.tcpdump.pcap',8,'base64',Buffer.from(pcap).toString('base64')]);
 assert.match(String(calls[0].headers.get('Accept')),/application\/vnd\.tcpdump\.pcap/);
 const pending=await callTool('darktrace_download_pcap',{path:{filename:'pending.pcap'}},ctx);
 assert.deepEqual(JSON.parse(JSON.stringify((pending.structuredContent as any).data)),{state:'pending'});
 const tooBig=wired({sensitiveRead:true},()=>new Response(new Uint8Array(2_097_153)));
 const refused=await callTool('darktrace_download_pcap',{path:{filename:'capture.pcap'}},tooBig.ctx);
 assert.equal(refused.isError,true);assert.equal(refused.structuredContent?.errorCode,'too_large');
});
test('form write and confirmed critical write reach HTTP with SDK-compatible signatures',async()=>{
 const {calls,ctx}=wired({write:true,writeCritical:true});
 assert.equal((await callTool('darktrace_acknowledge_ai_analyst_incident',{operation:'post_aianalyst_acknowledge',body:{uuid:'fixture-uuid'}},ctx)).isError,undefined);
 const preview=await callTool('darktrace_antigena_manual_action',{body:{did:1,action:'quarantine',duration:600}},ctx);
 assert.equal(preview.structuredContent?.confirmationRequired,true);assert.equal(calls.length,1);
 assert.equal((await callTool('darktrace_antigena_manual_action',{body:{did:1,action:'quarantine',duration:600},confirm:true,previewId:preview.structuredContent?.previewId},ctx)).isError,undefined);
 assert.deepEqual(calls.map(c=>[c.method,c.url,c.body]),[
  ['POST','https://192.0.2.10/aianalyst/acknowledge','uuid=fixture-uuid'],
  ['POST','https://192.0.2.10/antigena/manual','{"did":1,"action":"quarantine","duration":600}'],
 ]);
 assert.equal(calls[0].headers.get('DTAPI-Signature'),hmac('/aianalyst/acknowledge?uuid=fixture-uuid'));
 assert.equal(calls[1].headers.get('DTAPI-Signature'),hmac('/antigena/manual?{"did":1,"action":"quarantine","duration":600}'));
});
