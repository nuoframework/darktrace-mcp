import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { ENVELOPE_PROTOCOL_VERSIONS } from '../../src/server/createServer.js';
const cli='dist/src/index.js';
const env={DARKTRACE_URL:'https://appliance.example',DARKTRACE_PUBLIC_TOKEN:'PUBLIC_SECRET',DARKTRACE_PRIVATE_TOKEN:'PRIVATE_SECRET'};
test('compiled CLI help/version/doctor/config failure have safe output',()=>{
 for(const arg of ['--help','--version']) {
  const run=spawnSync(process.execPath,[cli,arg],{encoding:'utf8',env:{}});assert.equal(run.status,0);assert.ok(run.stdout.length);
 }
 const check=spawnSync(process.execPath,[cli,'--check-config'],{encoding:'utf8',env});
 assert.equal(check.status,0);assert.equal(JSON.parse(check.stdout).networkProbe,false);
 assert.equal(check.stdout.includes('SECRET'),false);
 const invalid=spawnSync(process.execPath,[cli,'--private-token=PRIVATE_SECRET'],{encoding:'utf8',env});
 assert.equal(invalid.status,2);assert.equal((invalid.stdout+invalid.stderr).includes('PRIVATE_SECRET'),false);
});
test('real stdio spawn lists read tools without contacting appliance and denies direct write', {timeout:15000},async()=>{
 const transport=new StdioClientTransport({command:process.execPath,args:[cli],env,stderr:'pipe'});
 let stderr='';transport.stderr?.on('data',chunk=>{stderr+=String(chunk);});
 const client=new Client({name:'spawn-test',version:'1.0.0'});
 try {
  await client.connect(transport);
  const list=await client.listTools();assert.ok(list.tools.length>0);assert.ok(list.tools.every((t: {annotations?:{readOnlyHint?:boolean}})=>t.annotations?.readOnlyHint));
  const denied=await client.callTool({name:'darktrace_antigena_action',arguments:{body:{codeid:1},confirm:true}});
  assert.equal(denied.isError,true);assert.equal(stderr.includes('SECRET'),false);
 } finally {await client.close();}
});
test('real stdio invalid profile grants reject before SDK, DNS, network or signing and never expose values',{timeout:15000},()=>{
 for(const extra of [{DARKTRACE_PROFILES:'read,critical'},{DARKTRACE_WRITE_CRITICAL:'true'},{DARKTRACE_PROFILES:'read,superuser'},{DARKTRACE_PROFILES:'all,write'}] as Record<string,string>[])for(const mode of [[],['doctor'],['--check-config']]){
  const run=spawnSync(process.execPath,['--import','./test/security/diagnostic-guard.mjs',cli,...mode],{env:{...env,...extra},input:'',encoding:'utf8',timeout:4000,maxBuffer:4096});
  assert.equal(run.error,undefined);assert.equal(run.status,1);assert.equal(run.stdout,'');assert.equal(run.stderr.includes('SECRET'),false);assert.equal(run.stderr.includes('ADVERSARIAL_FORBIDDEN_SIDE_EFFECT'),false);
  const error=JSON.parse(run.stderr);assert.equal(error.event,'startup_error');assert.equal(error.variable,/superuser|all,write/.test(extra.DARKTRACE_PROFILES??'')?'DARKTRACE_PROFILES':undefined);assert.deepEqual(Object.keys(error).sort(),error.variable===undefined?['event','reason','ts']:['event','reason','ts','variable']);assert.match(error.reason,/DARKTRACE_PROFILES|requires profiles\.write/);
 }
});
test('stdio buffer is finite and process exits on EOF',{timeout:10000},async()=>{
 const child=spawn(process.execPath,[cli],{env,stdio:['pipe','pipe','pipe']});
 let output='';child.stdout.on('data',chunk=>{output+=chunk;});
 child.stdin.on('error',error=>{assert.equal((error as NodeJS.ErrnoException).code,'EPIPE');});
 const closed=once(child,'close');child.stdin.end('x'.repeat(150000));
 await closed;assert.equal(output.includes('SECRET'),false);
});
test('raw stdio rejects tools before initialize and serves tools/list right after initialize without notifications/initialized',{timeout:10000},async()=>{
 const child=spawn(process.execPath,[cli],{env,stdio:['pipe','pipe','pipe']});
 let pending='';
 const replies=new Map<number,(message:any)=>void>();
 child.stdout.on('data',chunk=>{
  pending+=chunk.toString();let end;
  while((end=pending.indexOf('\n'))>=0) {const line=pending.slice(0,end);pending=pending.slice(end+1);const msg=JSON.parse(line);replies.get(msg.id)?.(msg);}
 });
 const receive=(id:number)=>new Promise<any>(resolve=>replies.set(id,resolve));
 try {
  const early=receive(1);child.stdin.write('{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}\n');
  const rejected=await early;assert.ok(rejected.error);assert.equal(rejected.result,undefined);
  const init=receive(2),list=receive(3);
  // 2025-era clients may pipeline tools/list directly behind initialize, before their initialized notification.
  child.stdin.write(JSON.stringify({jsonrpc:'2.0',id:2,method:'initialize',params:{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'claude-code',version:'2'}}})+'\n');
  assert.ok((await init).result.serverInfo);
  child.stdin.write('{"jsonrpc":"2.0","id":3,"method":"tools/list","params":{}}\n');
  const listed=await list;assert.equal(listed.error,undefined);assert.ok(listed.result.tools.length>0);
 } finally {const closed=once(child,'close');child.stdin.end();await closed;}
});
test('raw stdio 2026-07-28 client (Claude Code): server/discover then enveloped tools/list, no initialize; bad envelopes rejected',{timeout:10000},async()=>{
 const child=spawn(process.execPath,[cli],{env,stdio:['pipe','pipe','pipe']});
 let pending='';
 const replies=new Map<number|string,(message:any)=>void>();
 child.stdout.on('data',chunk=>{
  pending+=chunk.toString();let end;
  while((end=pending.indexOf('\n'))>=0) {const line=pending.slice(0,end);pending=pending.slice(end+1);const msg=JSON.parse(line);replies.get(msg.id)?.(msg);}
 });
 const request=(id:number|string,method:string,meta?:Record<string,unknown>)=>{const reply=new Promise<any>(resolve=>replies.set(id,resolve));
  child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params:meta===undefined?{}:{_meta:meta}})+'\n');return reply;};
 const PV='io.modelcontextprotocol/protocolVersion',CAPS='io.modelcontextprotocol/clientCapabilities',INFO='io.modelcontextprotocol/clientInfo';
 const good={[PV]:'2026-07-28',[INFO]:{name:'claude-code',version:'2'},[CAPS]:{elicitation:{}}};
 try {
  const discovered=await request('discover','server/discover',good);
  assert.deepEqual(discovered.result.supportedVersions,[...ENVELOPE_PROTOCOL_VERSIONS],'ENVELOPE_PROTOCOL_VERSIONS must match what the SDK advertises');
  for(const [id,meta] of [[1,undefined],[2,{[PV]:'2026-07-28'}],[3,{[PV]:'2026-07-28',[CAPS]:[]}],[4,{[PV]:'2025-11-25',[CAPS]:{}}],[5,{[PV]:'1999-01-01',[CAPS]:{}}],[6,{...good,[INFO]:'claude'}]] as [number,Record<string,unknown>|undefined][]) {
   const reply=await request(id,'tools/list',meta);assert.ok(reply.error,String(id));assert.equal(reply.result,undefined);
  }
  const listed=await request(7,'tools/list',good);assert.equal(listed.error,undefined);assert.ok(listed.result.tools.length>0);
  const {[INFO]:_omitted,...withoutInfo}=good;
  const noInfo=await request(8,'tools/list',withoutInfo);assert.equal(noInfo.error,undefined);assert.ok(noInfo.result.tools.length>0);
  const missing=await request(9,'tools/list');assert.ok(missing.error);assert.equal(missing.result,undefined);
 } finally {const closed=once(child,'close');child.stdin.end();await closed;}
});
test('raw stdio prototype key rejected before SDK normalization',{timeout:10000},async()=>{
 const child=spawn(process.execPath,[cli],{env,stdio:['pipe','pipe','pipe']});
 let pending='';
 const replies=new Map<number,(message:any)=>void>();
 child.stdout.on('data',chunk=>{
  pending+=chunk.toString();let end;
  while((end=pending.indexOf('\n'))>=0) {const line=pending.slice(0,end);pending=pending.slice(end+1);const msg=JSON.parse(line);replies.get(msg.id)?.(msg);}
 });
 const receive=(id:number)=>new Promise<any>(resolve=>replies.set(id,resolve));
 try {
  const init=receive(1);
  child.stdin.write(JSON.stringify({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'raw',version:'1'}}})+'\n');
  await init;child.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');
  const reply=receive(2);
  child.stdin.write('{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"darktrace_get_status","arguments":{"__proto__":{"polluted":true}}}}\n');
  const response=await reply;assert.equal(response.result.isError,true);
 } finally {const closed=once(child,'close');child.stdin.end();await closed;}
});
