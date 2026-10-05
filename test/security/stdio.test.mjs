import assert from 'node:assert/strict';import test from 'node:test';
import {once,EventEmitter} from 'node:events';import {PassThrough} from 'node:stream';
import {spawn,spawnSync} from 'node:child_process';import {resolve} from 'node:path';
import {boundedInput} from '../../dist/src/server/input.js';
import {runStdio} from '../../dist/src/server/stdio.js';
import {checkInput} from '../../dist/src/api/validation.js';
import {cfg,env,PUBLIC,PRIVATE,CANARY,noCanaries} from './helpers.mjs';
const init={jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'synthetic-adversarial',version:'1'}}};
test('ST-11.FRAMES hard64KiB/lowered boundary newline inclusive; overflow zero parser/handler',async()=>{
  for(const ceiling of [32,65536]) {
    const input=boundedInput({maxToolInputBytes:ceiling});let forwarded='';input.on('data',c=>forwarded+=c);
    const frame='{}'+' '.repeat(ceiling-3)+'\n';for(let offset=0;offset<frame.length;offset+=17)input.write(frame.slice(offset,offset+17));input.end('{}\n{}\n');await once(input,'end');assert.equal(forwarded,frame+'{}\n{}\n');
    for(const newline of [true,false]) {
      const bad=boundedInput({maxToolInputBytes:ceiling});let parsed=0,entries=0;bad.on('data',()=>entries++);const error=once(bad,'error');const original=JSON.parse;
      JSON.parse=(...args)=>{parsed++;return original(...args);};
      try {bad.write('x'.repeat(ceiling)+(newline?'\n':''));await error;assert.equal(parsed,0);assert.equal(entries,0);assert.ok(bad.destroyed);}
      finally {JSON.parse=original;}
    }
  }
});
test('ST-11.INPUT actual depth8/elements5000 limits and +1',()=>{
  for(const limit of [8,9]) {let input=1;for(let i=0;i<limit;i++)input={a:input};if(limit===8)assert.doesNotThrow(()=>checkInput(input));else assert.throws(()=>checkInput(input));}
  // Array node itself is counted, leaving 4,999 scalar elements at the ceiling.
  assert.doesNotThrow(()=>checkInput(Array(4999).fill(1)));assert.throws(()=>checkInput(Array(5000).fill(1)));
});
test('ST-14.MALFORMED bounded invalid frames/EOF remain protocol-only without canaries',()=>{
  const raw='{'+CANARY+'\n'+JSON.stringify(init)+'\n';
  const got=spawnSync(process.execPath,['--import',resolve('test/security/diagnostic-guard.mjs'),'dist/src/index.js'],{env:env(),input:raw,encoding:'utf8',timeout:4000});
  assert.equal(got.error,undefined);assert.equal(got.status,0);for(const line of got.stdout.trim().split('\n').filter(Boolean)){const frame=JSON.parse(line);assert.equal(frame.jsonrpc,'2.0');}noCanaries(got.stdout+got.stderr);assert.equal(got.stderr.includes('ADVERSARIAL_FORBIDDEN_SIDE_EFFECT'),false);
});
test('ST-11/14.PROCESS fragmented overflow closes session without EOF or partial echo',async t=>{
  const child=spawn(process.execPath,['dist/src/index.js'],{env:env({DARKTRACE_MAX_TOOL_INPUT_BYTES:'128'}),stdio:['pipe','pipe','pipe']});let stdout='',stderr='';child.stdout.on('data',c=>stdout+=c);child.stderr.on('data',c=>stderr+=c);child.stdin.on('error',()=>{});
  const timeout=setTimeout(()=>child.kill('SIGKILL'),3000);t.after(()=>clearTimeout(timeout));const ended=once(child,'exit');child.stdin.write('x'.repeat(80));child.stdin.write(CANARY.repeat(4));const [code,signal]=await ended;
  assert.equal(signal,null);assert.equal(code,0);assert.equal(stdout,'');noCanaries(stderr);assert.ok(stderr.includes('protocol_error'));
});
test('ST-14.PROTO raw protocol attack denied before operation client; EOF cancels active work',async t=>{
  const stdin=new PassThrough(),stdout=new PassThrough(),signals=new EventEmitter();let requests=0,closed=0;const lines=[];const waiters=new Map();let text='';
  stdout.on('data',chunk=>{text+=chunk;let n;while((n=text.indexOf('\n'))>=0){const frame=JSON.parse(text.slice(0,n));lines.push(frame);text=text.slice(n+1);waiters.get(frame.id)?.(frame);}});
  const receive=id=>new Promise(resolve=>waiters.set(id,resolve));
  const handle=runStdio(cfg(),{testOnly:true,stdin,stdout,signals,client:{async request(){requests++;return {};},close(){closed++;}}});t.after(()=>handle.close());
  const ready=receive(1);stdin.write(JSON.stringify(init)+'\n');await ready;stdin.write('{"jsonrpc":"2.0","method":"notifications/initialized"}\n');
  const result=receive(2);stdin.write('{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"darktrace_get_status","arguments":{"__proto__":{"polluted":true}}}}\n');
  assert.equal((await result).result.isError,true);assert.equal(requests,0);assert.equal({}.polluted,undefined);stdin.end();await new Promise(r=>setImmediate(r));assert.equal(closed,1);noCanaries(lines);
});
test('ST-11/14.CANCEL EOF active operation stops client/queue exactly once',async t=>{
  const stdin=new PassThrough(),stdout=new PassThrough(),signals=new EventEmitter();let admitted,aborted=0,closed=0,reject;
  const active=new Promise(r=>admitted=r);let reply;const ready=new Promise(r=>reply=r);stdout.on('data',chunk=>{if(String(chunk).includes('"id":1'))reply();});
  const handle=runStdio(cfg(),{testOnly:true,stdin,stdout,signals,client:{async request(){admitted();return new Promise((_r,no)=>reject=no);},close(){closed++;if(reject){aborted++;reject(new Error(CANARY));}}}});t.after(()=>handle.close());
  stdin.write(JSON.stringify(init)+'\n');await ready;stdin.write('{"jsonrpc":"2.0","method":"notifications/initialized"}\n');stdin.write('{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"darktrace_get_status","arguments":{}}}\n');
  await active;stdin.end();await new Promise(r=>setImmediate(r));await handle.close();assert.equal(closed,1);assert.equal(aborted,1);assert.ok(stdin.destroyed);
});
test('ST-16.PROCESS stdio startup/listing has no inbound listener/DNS/signing; unsupported HTTP aborts',()=>{
  const input=[JSON.stringify(init),'{"jsonrpc":"2.0","method":"notifications/initialized"}','{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'].join('\n')+'\n';
  const got=spawnSync(process.execPath,['--import',resolve('test/security/diagnostic-guard.mjs'),'dist/src/index.js'],{env:env(),input,encoding:'utf8',timeout:4000});assert.equal(got.error,undefined);assert.equal(got.status,0);assert.equal(got.stderr.includes('ADVERSARIAL_FORBIDDEN_SIDE_EFFECT'),false);noCanaries(got.stdout+got.stderr);
  const http=spawnSync(process.execPath,['dist/src/index.js'],{env:env({DARKTRACE_ENABLE_HTTP:'true'}),input:'',encoding:'utf8',timeout:4000});assert.equal(http.status,1);assert.equal(http.stdout,'');noCanaries(http.stderr);
});
