import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/client';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import { parseConfig } from '../../src/config/schema.js';
import { createServer } from '../../src/server/createServer.js';
import statusFixture from '../contract/fixtures/status.json' with {type:'json'};
import type { ApiRequest } from '../../src/api/operations.js';
const config=(profiles={})=>parseConfig({instance:{baseUrl:'https://appliance.example'},auth:{publicToken:'PUBLIC_SECRET',privateToken:'PRIVATE_SECRET'},profiles});
async function connected(profiles={}) {
 const requests:ApiRequest[]=[];
 const server=createServer({cfg:config(profiles),audit:{async record(){}},client:{async request(req:ApiRequest){requests.push(req);return {json:statusFixture};}}});
 const client=new Client({name:'offline-test',version:'1.0.0'});
 const [clientTransport,serverTransport]=InMemoryTransport.createLinkedPair();
 await server.connect(serverTransport);await client.connect(clientTransport);
 return {client,server,requests,async close(){await client.close();await server.close();}};
}
test('MCP tools/list default, fixture read, hidden write, untrusted args',async()=>{
 const connection=await connected();
 try {
  const list=await connection.client.listTools();assert.ok(list.tools.some((t: {name:string})=>t.name==='darktrace_get_status'));
  assert.ok(list.tools.every((t: {annotations?:{readOnlyHint?:boolean}})=>t.annotations?.readOnlyHint));
  assert.equal(list.tools.some((t: {name:string})=>t.name.includes('email')||t.name==='darktrace_download_pcap'),false);
  const result=await connection.client.callTool({name:'darktrace_get_status',arguments:{query:{fast:true}}});
  assert.equal(result.isError,undefined);assert.equal(((result.structuredContent as any)?.data as any).version,'7.1-fixture');
  assert.equal(connection.requests.length,1);
  const hidden=await connection.client.callTool({name:'darktrace_update_device',arguments:{body:{did:1,label:'x'}}});
  assert.equal(hidden.isError,true);assert.equal(connection.requests.length,1);
  const injection=await connection.client.callTool({name:'darktrace_get_status',arguments:JSON.parse('{"query":{"fast":true},"constructor":{"polluted":true}}')});
  assert.equal(injection.isError,true);assert.equal(connection.requests.length,1);
 } finally {await connection.close();}
});
test('MCP lists critical tools only with write+critical; a forged critical-without-write config still hides them',async()=>{
 assert.throws(()=>config({writeCritical:true}),/requires profiles.write/);
 const requests:ApiRequest[]=[];const base=config();const server=createServer({cfg:{...base,profiles:{...base.profiles,writeCritical:true}},client:{async request(req){requests.push(req);return {};}}});
 const client=new Client({name:'release-denial',version:'1'});const[a,b]=InMemoryTransport.createLinkedPair();
 try{await server.connect(b);await client.connect(a);const list=await client.listTools();assert.equal(list.tools.some((t: {name:string})=>t.name==='darktrace_antigena_manual_action'),false);const result=await client.callTool({name:'darktrace_antigena_manual_action',arguments:{body:{did:1,action:'quarantine',duration:60},confirm:true}});assert.equal(result.isError,true);assert.equal(requests.length,0);}finally{await client.close();await server.close();}
 const enabled=await connected({write:true,writeCritical:true});
 try{const list=await enabled.client.listTools();const tool=list.tools.find((t:{name:string})=>t.name==='darktrace_antigena_manual_action') as any;
  assert.ok(tool);assert.equal(tool.annotations.destructiveHint,true);assert.equal(tool.annotations.readOnlyHint,false);assert.ok(tool.inputSchema.properties.confirm);
  const unconfirmed=await enabled.client.callTool({name:'darktrace_antigena_manual_action',arguments:{body:{did:1,action:'quarantine',duration:60}}});
  assert.equal((unconfirmed.structuredContent as any).errorCode,'confirmation_required');assert.equal(enabled.requests.length,0);
  const preview=await enabled.client.callTool({name:'darktrace_antigena_manual_action',arguments:{body:{did:1,action:'quarantine',duration:60},dryRun:true}});
  assert.match((preview.structuredContent as any).previewId,/^[a-f0-9]{32}$/);assert.equal(enabled.requests.length,0);
 }finally{await enabled.close();}
});
