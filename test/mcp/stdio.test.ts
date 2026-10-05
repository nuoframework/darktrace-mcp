import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
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
  const list=await client.listTools();assert.ok(list.tools.length>0);assert.ok(list.tools.every(t=>t.annotations?.readOnlyHint));
  const denied=await client.callTool({name:'darktrace_antigena_action',arguments:{body:{codeid:1},confirm:true}});
  assert.equal(denied.isError,true);assert.equal(stderr.includes('SECRET'),false);
 } finally {await client.close();}
});
test('real stdio critical preview has no DNS/network and cannot leak values',{timeout:15000},async()=>{
 const transport=new StdioClientTransport({command:process.execPath,args:[cli],env:{...env,DARKTRACE_PROFILES:'read,write',DARKTRACE_WRITE_CRITICAL:'true'},stderr:'pipe'});
 let stderr='';transport.stderr?.on('data',chunk=>{stderr+=String(chunk);});
 const client=new Client({name:'preview-test',version:'1.0.0'});
 try {
  await client.connect(transport);const list=await client.listTools();assert.ok(list.tools.some(t=>t.name==='darktrace_antigena_manual_action'));
  const result=await client.callTool({name:'darktrace_antigena_manual_action',arguments:{body:{did:42,action:'quarantine',duration:5,reason:'PRIVATE_SECRET'},dryRun:false}});
  assert.equal((result.structuredContent as any)?.dryRun,true);assert.equal(JSON.stringify(result).includes('SECRET'),false);assert.equal(stderr.includes('SECRET'),false);
 } finally {await client.close();}
});
test('stdio buffer is finite and process exits on EOF',{timeout:10000},async()=>{
 const child=spawn(process.execPath,[cli],{env,stdio:['pipe','pipe','pipe']});
 let output='';child.stdout.on('data',chunk=>{output+=chunk;});
 child.stdin.on('error',error=>{assert.equal((error as NodeJS.ErrnoException).code,'EPIPE');});
 const closed=once(child,'close');child.stdin.end('x'.repeat(150000));
 await closed;assert.equal(output.includes('SECRET'),false);
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
