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
  const list=await connection.client.listTools();assert.ok(list.tools.some(t=>t.name==='darktrace_get_status'));
  assert.ok(list.tools.every(t=>t.annotations?.readOnlyHint));
  assert.equal(list.tools.some(t=>t.name.includes('email')||t.name==='darktrace_download_pcap'),false);
  const result=await connection.client.callTool({name:'darktrace_get_status',arguments:{query:{fast:true}}});
  assert.equal(result.isError,undefined);assert.equal(((result.structuredContent as any)?.data as any).version,'7.1-fixture');
  assert.equal(connection.requests.length,1);
  const hidden=await connection.client.callTool({name:'darktrace_update_device',arguments:{body:{did:1,label:'x'}}});
  assert.equal(hidden.isError,true);assert.equal(connection.requests.length,1);
  const injection=await connection.client.callTool({name:'darktrace_get_status',arguments:JSON.parse('{"query":{"fast":true},"constructor":{"polluted":true}}')});
  assert.equal(injection.isError,true);assert.equal(connection.requests.length,1);
 } finally {await connection.close();}
});
test('MCP critical tool is preview only with operator writeCritical',async()=>{
 const connection=await connected({write:true,writeCritical:true});
 try {
  const list=await connection.client.listTools();assert.ok(list.tools.some(t=>t.name==='darktrace_antigena_manual_action'));
  const result=await connection.client.callTool({name:'darktrace_antigena_manual_action',arguments:{body:{did:1,action:'quarantine',duration:5,reason:'PRIVATE_SECRET'},dryRun:false}});
  assert.equal((result.structuredContent as any)?.dryRun,true);assert.equal(connection.requests.length,0);
  assert.equal(JSON.stringify(result).includes('PRIVATE_SECRET'),false);
 } finally {await connection.close();}
});
