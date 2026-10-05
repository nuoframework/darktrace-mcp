import assert from 'node:assert/strict';import test from 'node:test';
import {setTimeout as sleep} from 'node:timers/promises';
import {cfg,harness,kind,noCanaries,CANARY} from './helpers.mjs';
for(const status of [301,302,303,307,308]) for(const destination of ['https://appliance.test/again','https://other.test/x','http://appliance.test/x','https://169.254.169.254/latest','https://10.1.2.3/x']) test('ST-05.REDIRECT '+status+' '+destination,async()=>{
  const h=harness({response:()=>new Response(CANARY,{status,headers:{location:destination}})});await assert.rejects(h.client.request({operationId:'get_status'}),error=>{noCanaries(error);return true;});assert.equal(h.state.calls,1);assert.equal(h.state.signs,1);h.client.close();
});
for(const header of ['60','-1','NaN','9999999999999999999999999','Mon, 05 Oct 2026 11:01:00 GMT']) test('ST-12.RETRY excessive/invalid '+header,async()=>{
  const h=harness({response:()=>new Response(CANARY,{status:429,headers:{'retry-after':header}}),extra:{now:()=>Date.parse('2026-10-05T11:00:00Z')}});
  await assert.rejects(h.client.request({operationId:'get_status'}),error=>{kind('rate_limited')(error);noCanaries(error);assert.equal(error.message.includes(header),false);return true;});assert.equal(h.state.calls,1);assert.deepEqual(h.state.waits,[]);h.client.close();
});
for(const status of [429,502,503,504]) test('ST-12.RETRY safeGET '+status+' at most three attempts',async()=>{
  const h=harness({response:()=>new Response('{}',{status})});await assert.rejects(h.client.request({operationId:'get_status'}));assert.equal(h.state.calls,3);assert.deepEqual(h.state.waits,[200,400]);h.client.close();
});
for(const status of [401,403]) test('ST-12.AUTH '+status+' zero retries',async()=>{
  const h=harness({response:()=>new Response(CANARY,{status})});await assert.rejects(h.client.request({operationId:'get_status'}));assert.equal(h.state.calls,1);h.client.close();
});
for(const operationId of ['post_synthetic','delete_synthetic']) for(const failure of ['status','accepted-network-failure']) test('ST-12.MUTATION '+operationId+' '+failure+' zero retries',async()=>{
  const h=harness({response:()=>{if(failure==='status')return new Response(CANARY,{status:503});throw Object.assign(new Error(CANARY),{code:'ECONNRESET'});}});
  await assert.rejects(h.client.request({operationId}),error=>{noCanaries(error);return true;});assert.equal(h.state.calls,1);assert.equal(h.state.signs,1);h.client.close();
});
for(const code of ['UNABLE_TO_GET_ISSUER_CERT_LOCALLY','UNABLE_TO_GET_ISSUER_CERT','INVALID_CA','CERT_HAS_EXPIRED','ERR_TLS_CERT_ALTNAME_INVALID']) test('ST-03/12.TLS-code '+code+' zero retries',async()=>{
  const h=harness({response:()=>{throw Object.assign(new Error(CANARY),{code});}});await assert.rejects(h.client.request({operationId:'get_status'}));assert.equal(h.state.calls,1);assert.equal(h.state.signs,1);h.client.close();
});
test('ST-12.WAIT accepted delay respected; never exceeds remaining deadline',async()=>{
  const h=harness({response:(_i,_n,state)=>state.calls===1?new Response('',{status:429,headers:{'retry-after':'1'}}):new Response('{}')});
  await h.client.request({operationId:'get_status'});assert.deepEqual(h.state.waits,[1000]);assert.equal(h.state.calls,2);h.client.close();
  const q=harness({config:cfg({instance:{baseUrl:'https://appliance.test',timeoutMs:20}}),response:()=>new Response('',{status:429,headers:{'retry-after':'1'}})});
  await assert.rejects(q.client.request({operationId:'get_status'}));assert.equal(q.state.calls,1);assert.deepEqual(q.state.waits,[]);q.client.close();
});
test('ST-11.BYTES cumulative retry bodies and lying Content-Length cancelled',async()=>{
  let cancelled=0;const h=harness({config:cfg({limits:{maxResponseBytes:10,maxRetryAfterMs:0}}),response:(_i,_n,s)=>new Response(new ReadableStream({start(c){c.enqueue(Buffer.from(s.calls===1?'123456':'1234567'));if(s.calls===1)c.close();},cancel(){cancelled++;}}),{status:s.calls===1?503:200,headers:{'content-length':'1','retry-after':'0'}})});
  await assert.rejects(h.client.request({operationId:'get_status'}),kind('too_large'));assert.equal(h.state.calls,2);assert.equal(cancelled,1);h.client.close();
});
for(const bytes of [2097152,2097153]) test('ST-11.BYTES hard boundary '+bytes,async()=>{
  let cancelled=false;const h=harness({response:()=>new Response(new ReadableStream({start(c){c.enqueue(Buffer.from('"'+'x'.repeat(bytes-2)+'"'));c.close();},cancel(){cancelled=true;}}),{headers:{'content-length':'1'}})});
  if(bytes===2097152)assert.equal((await h.client.request({operationId:'get_status'})).json.length,bytes-2);
  else await assert.rejects(h.client.request({operationId:'get_status'}),kind('too_large'));
  assert.equal(h.state.calls,1);h.client.close();
});
for(const encoding of ['gzip','br','deflate']) test('ST-11.COMPRESSION '+encoding+' rejected and cancelled',async()=>{
  let cancelled=false;const h=harness({response:()=>new Response(new ReadableStream({start(c){c.enqueue(Buffer.from('expansion'));},cancel(){cancelled=true;}}),{headers:{'content-encoding':encoding}})});
  await assert.rejects(h.client.request({operationId:'get_status'}),kind('invalid_response'));assert.equal(cancelled,true);assert.equal(h.state.calls,1);h.client.close();
});
test('ST-11/12.RATE 120 attempts permitted and attempt121 unsigned',async()=>{
  const h=harness();for(let i=0;i<120;i++)await h.client.request({operationId:'get_status'});await assert.rejects(h.client.request({operationId:'get_status'}),kind('rate_limited'));assert.equal(h.state.calls,120);assert.equal(h.state.signs,120);h.client.close();
  const r=harness({config:cfg({limits:{rateLimitPerMinute:2}}),response:()=>new Response('{}',{status:503})});await assert.rejects(r.client.request({operationId:'get_status'}),kind('rate_limited'));assert.equal(r.state.calls,2);assert.equal(r.state.signs,2);r.client.close();
});
test('ST-11.QUEUE exact 4 active/16 queued then overflow; close drains cancellation',async()=>{
  const h=harness({response:(_url,init)=>new Promise((_r,reject)=>{init.signal.addEventListener('abort',()=>reject(new Error('synthetic abort')),{once:true});})});
  const admitted=[];for(let i=0;i<20;i++)admitted.push(h.client.request({operationId:'get_status'}).then(()=>({kind:'unexpected'}),error=>error));
  await new Promise(r=>setImmediate(r));assert.equal(h.state.calls,4);await assert.rejects(h.client.request({operationId:'get_status'}),kind('overloaded'));
  h.client.close();const ended=await Promise.all(admitted);assert.ok(ended.every(e=>e.kind==='cancelled'));assert.equal(h.state.calls,4);
});
test('ST-11.DEADLINE admission includes queue and retries; cancellation removes queued job',async t=>{
  const hold=setTimeout(()=>{},1500);t.after(()=>clearTimeout(hold));const started=performance.now();
  const h=harness({config:cfg({instance:{baseUrl:'https://appliance.test',timeoutMs:100},limits:{maxConcurrentRequests:1,maxQueuedRequests:2}}),response:(_u,init)=>new Promise((_r,reject)=>{init.signal.addEventListener('abort',()=>reject(new Error('synthetic deadline')),{once:true});})});
  const first=h.client.request({operationId:'get_status'}).catch(e=>e);await sleep(10);
  const ctrl=new AbortController();const cancelled=h.client.request({operationId:'get_status',signal:ctrl.signal}).catch(e=>e);ctrl.abort();
  const queued=h.client.request({operationId:'get_status'}).catch(e=>e);const got=await Promise.all([first,queued,cancelled]);
  assert.deepEqual(got.map(e=>e.kind),['timeout','timeout','cancelled']);assert.ok(performance.now()-started<400);assert.ok(h.state.calls<=2);h.client.close();
  const r=harness({config:cfg({instance:{baseUrl:'https://appliance.test',timeoutMs:100}}),response:()=>new Response('{}',{status:503,headers:{'retry-after':'0'}}),extra:{delay:async()=>sleep(70)}});
  await assert.rejects(r.client.request({operationId:'get_status'}),kind('timeout'));assert.equal(r.state.calls,2);r.client.close();
});
test('ST-12.CANCEL during backoff prevents any extra attempt',async t=>{
  const hold=setTimeout(()=>{},1000);t.after(()=>clearTimeout(hold));let entered;const wait=new Promise(r=>entered=r);const c=new AbortController();
  const h=harness({response:()=>new Response('{}',{status:503}),extra:{delay:(ms,signal)=>{entered();return new Promise((_r,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}));}}});
  const pending=h.client.request({operationId:'get_status',signal:c.signal});await wait;c.abort();await assert.rejects(pending,kind('cancelled'));assert.equal(h.state.calls,1);h.client.close();
});
