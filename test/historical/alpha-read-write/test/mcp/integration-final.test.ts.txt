import test from 'node:test';
import assert from 'node:assert/strict';
import { once, EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { spawn } from 'node:child_process';
import { boundedInput } from '../../src/server/input.js';
import { runStdio } from '../../src/server/stdio.js';
import { parseConfig } from '../../src/config/schema.js';
import { checkInput } from '../../src/api/validation.js';
import { createAudit } from '../../src/observability/audit.js';
import { callTool } from '../../src/tools/index.js';
const cfg=parseConfig({instance:{baseUrl:'https://appliance.example'},auth:{publicToken:'TEST_PUBLIC',privateToken:'TEST_PRIVATE'},profiles:{write:true}});
async function decoded(args:unknown,limits:Parameters<typeof boundedInput>[0]) {
  const stream=boundedInput(limits);let text='';stream.on('data',chunk=>{text+=String(chunk);});
  stream.end(JSON.stringify({method:'tools/call',params:{arguments:args}})+'\n');await once(stream,'end');return JSON.parse(text).params.arguments;
}
test('raw byte gate includes newline, handles chunk boundaries, many frames and no partial echo',async()=>{
  const stream=boundedInput({maxToolInputBytes:32});let text='';stream.on('data',c=>{text+=c;});
  stream.write(' '.repeat(15));stream.write(' '.repeat(16));stream.end('\n{}\n{}\n');await once(stream,'end');
  assert.equal(text,' '.repeat(31)+'\n{}\n{}\n');
  for(const chunks of [[Buffer.alloc(32,120)],[Buffer.alloc(20,120),Buffer.alloc(12,120)],[Buffer.alloc(32,120),Buffer.from('\n')]]) {
    const input=boundedInput({maxToolInputBytes:32});let forwarded=0;input.on('data',()=>forwarded++);const error=once(input,'error');
    for(const chunk of chunks) input.write(chunk);await error;assert.equal(forwarded,0);assert.equal(input.destroyed,true);
  }
});
test('lowered argument depth/elements are enforced before SDK and direct tool dispatch',async()=>{
  assert.deepEqual(await decoded({a:{b:{c:true}}},{maxToolInputDepth:2}),{__rejected_input:true});
  assert.deepEqual(await decoded({a:1,b:2,c:3},{maxToolInputElements:3}),{__rejected_input:true});
  assert.deepEqual(await decoded({a:{b:true}},{maxToolInputDepth:2}),{a:{b:true}});
  assert.throws(()=>checkInput({x:'é'.repeat(10)},{maxToolInputBytes:20}));
  assert.throws(()=>checkInput({x:1},{maxToolInputElements:0}));
  let requests=0;const lower=parseConfig({instance:cfg.instance,auth:cfg.auth,limits:{maxToolInputElements:1}});
  const result=await callTool('darktrace_get_status',{query:{fast:true}},{cfg:lower,client:{async request(){requests++;return {};}}});
  assert.equal(result.isError,true);assert.equal(requests,0);
});
test('audit exact allowlist generates a correlation ID and awaits sink failure',async()=>{
  const records:any[]=[];const audit=createAudit([],line=>{records.push(JSON.parse(line));});
  await audit.record('get_status','error');await audit.record('get_status','ok','correlation_123');
  assert.deepEqual(Object.keys(records[0]).sort(),['audit','ts','requestId','operationId','outcome'].sort());
  assert.match(records[0].requestId,/^[a-f0-9-]{36}$/);assert.equal(records[1].requestId,'correlation_123');
  await assert.rejects(createAudit([],async()=>{throw new Error('sink failed');}).record('post_devices','start'));
  await assert.rejects(audit.record('post_caller_chosen','start'));
  await assert.rejects(audit.record('get_status','ok',''));
});
test('executing write uses shared audit ID; failed pre-audit prevents request; post failure is completed',async()=>{
  const records:Array<[string,string,string|undefined]>=[];let requests=0;
  const client={async request(){requests++;return {json:{ok:true}};}};
  const args={body:{did:1,label:'test'},dryRun:false};
  const audit={async record(op:string,outcome:any,id?:string){records.push([op,outcome,id]);}};
  assert.equal((await callTool('darktrace_update_device',args,{cfg,client,audit})).isError,undefined);
  assert.equal(requests,1);assert.equal(records.length,2);assert.equal(records[0][1],'start');assert.equal(records[1][1],'ok');assert.equal(records[0][2],records[1][2]);
  const denied=await callTool('darktrace_update_device',args,{cfg,client,audit:{async record(){throw new Error('fail');}}});
  assert.equal(denied.isError,true);assert.equal(requests,1);
  const completed=await callTool('darktrace_update_device',args,{cfg,client,audit:{async record(_op,outcome){if(outcome==='ok')throw new Error('fail');}}});
  assert.equal(completed.structuredContent?.outcome,'completed');assert.equal(requests,2);
});
test('EOF, both signals, transport output error, input error and explicit close release client exactly once',async()=>{
  for(const trigger of ['EOF','SIGINT','SIGTERM','output error','input error','close']) {
    const stdin=new PassThrough(),stdout=new PassThrough(),signals=new EventEmitter();let closed=0;
    const handle=runStdio(cfg,{testOnly:true,stdin,stdout,signals,client:{async request(){return {};},close(){closed++;}}});
    if(trigger==='EOF')stdin.end();else if(trigger==='close')await handle.close();else if(trigger==='output error')stdout.emit('error',new Error('private canary'));else if(trigger==='input error')stdin.emit('error',new Error('private canary'));else signals.emit(trigger);
    await new Promise(resolve=>setImmediate(resolve));await handle.close();signals.emit('SIGINT');
    assert.equal(closed,1,trigger);assert.equal(stdin.destroyed,true);assert.equal(signals.listenerCount('SIGINT'),0);assert.equal(signals.listenerCount('SIGTERM'),0);
  }
});
test('cleanup survives client.close throwing and still detaches resources',async()=>{
  const stdin=new PassThrough(),stdout=new PassThrough(),signals=new EventEmitter();let count=0;
  const handle=runStdio(cfg,{testOnly:true,stdin,stdout,signals,client:{async request(){return {};},close(){count++;throw new Error('secret');}}});
  await handle.close();await handle.close();assert.equal(count,1);assert.equal(stdin.destroyed,true);assert.equal(signals.listenerCount('SIGTERM'),0);
});
test('actual CLI overflow terminates session with sanitized stderr and no echoed partial input',{timeout:10000},async()=>{
  const child=spawn(process.execPath,['dist/src/index.js'],{env:{DARKTRACE_URL:'https://appliance.example',DARKTRACE_PUBLIC_TOKEN:'TEST_PUBLIC',DARKTRACE_PRIVATE_TOKEN:'TEST_PRIVATE',DARKTRACE_MAX_TOOL_INPUT_BYTES:'128'},stdio:['pipe','pipe','pipe']});
  let stdout='',stderr='';child.stdout.on('data',c=>{stdout+=c;});child.stderr.on('data',c=>{stderr+=c;});child.stdin.on('error',()=>{});
  const exited=once(child,'exit');child.stdin.write('CANARY'.repeat(100));await exited;
  assert.equal(stdout,'');assert.equal(stderr.includes('CANARY'),false);assert.equal(stderr.includes('TEST_PRIVATE'),false);assert.match(stderr,/protocol_error/);
});
test('EOF and signals close client while a tool request is in flight',{timeout:5000},async()=>{
  for(const trigger of ['EOF','SIGINT','SIGTERM']) {
    const stdin=new PassThrough(),stdout=new PassThrough(),signals=new EventEmitter();
    let cancel:(reason:Error)=>void=()=>{},closed=0;let admitted:()=>void=()=>{};
    const active=new Promise<void>(resolve=>{admitted=resolve;});
    const handle=runStdio(cfg,{testOnly:true,stdin,stdout,signals,client:{
      async request(){admitted();return await new Promise((_resolve,reject)=>{cancel=reject;});},
      close(){closed++;cancel(new Error('cancelled'));}
    }});
    let initialized:()=>void=()=>{};const ready=new Promise<void>(resolve=>{initialized=resolve;});
    let pending='';stdout.on('data',chunk=>{pending+=chunk;let end;while((end=pending.indexOf('\n'))>=0){const m=JSON.parse(pending.slice(0,end));pending=pending.slice(end+1);if(m.id===1)initialized();}});
    stdin.write(JSON.stringify({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'test',version:'1'}}})+'\n');
    await ready;stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');
    stdin.write(JSON.stringify({jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'darktrace_get_status',arguments:{}}})+'\n');
    await active;if(trigger==='EOF')stdin.end();else signals.emit(trigger);
    await new Promise(resolve=>setImmediate(resolve));await handle.close();assert.equal(closed,1);assert.equal(stdin.destroyed,true);
  }
});
test('oversized complete and partial frames enter no JSON parser',async()=>{
  for(const newline of [false,true]) {
    const input=boundedInput({maxToolInputBytes:64});let output=0,parses=0;
    input.on('data',()=>output++);const rejected=once(input,'error');const parse=JSON.parse;
    try {
      JSON.parse=(...args:Parameters<typeof JSON.parse>)=>{parses++;return parse(...args);};
      input.write(Buffer.from('x'.repeat(64)+(newline?'\n':'')));await rejected;
    } finally {JSON.parse=parse;}
    assert.equal(parses,0);assert.equal(output,0);
  }
});
test('actual CLI handles SIGINT/SIGTERM after handshake and exits normally',{timeout:10000},async()=>{
  for(const signal of ['SIGINT','SIGTERM'] as const) {
    const child=spawn(process.execPath,['dist/src/index.js'],{env:{DARKTRACE_URL:'https://appliance.example',DARKTRACE_PUBLIC_TOKEN:'TEST_PUBLIC',DARKTRACE_PRIVATE_TOKEN:'TEST_PRIVATE'},stdio:['pipe','pipe','pipe']});
    let ready:()=>void=()=>{};const initialized=new Promise<void>(resolve=>{ready=resolve;});let text='',stderr='';
    child.stdout.on('data',c=>{text+=c;if(text.includes('\n'))ready();});child.stderr.on('data',c=>{stderr+=c;});child.stdin.on('error',()=>{});
    const exit=once(child,'exit');
    child.stdin.write(JSON.stringify({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'test',version:'1'}}})+'\n');
    await initialized;child.kill(signal);const [code,exitSignal]=await exit;
    assert.equal(code,0);assert.equal(exitSignal,null);assert.equal(stderr.includes('TEST_PRIVATE'),false);
  }
});
