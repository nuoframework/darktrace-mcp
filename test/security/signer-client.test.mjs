import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createSigner } from '../../dist/src/client/signer.js';
import { createHttpClient } from '../../dist/src/client/httpClient.js';
import { cfg,harness,kind,PUBLIC,PRIVATE,routes } from './helpers.mjs';
const vectors=JSON.parse(readFileSync(new URL('./fixtures/hmac-vectors.json',import.meta.url))).vectors;
for(const v of vectors) test('ST-01.KAT '+v.id,()=>{
  const signer=createSigner(PUBLIC,PRIVATE,{encodeQueryInSignature:v.mode});
  const body=v.body===null?undefined:v.body.kind==='json'?{kind:'json',bytes:Buffer.from(v.body.text)}:{kind:'form',pairs:v.body.pairs};
  const input={method:v.method,path:v.path,query:structuredClone(v.query),date:v.date,...(body?{body}:{})};
  const got=signer.sign(input);
  assert.equal(got.headers['DTAPI-Signature'],v.digest);
  assert.equal(got.url,v.wire);
  assert.equal(got.bodyBytes===undefined?undefined:Buffer.from(got.bodyBytes).toString(),v.body?.kind==='json'?v.body.text:v.body?.kind==='form'?'q=a+b&q=%2B%25':undefined);
  input.query.push(['mutated','value']);if(body?.kind==='json') body.bytes.fill(0);
  assert.equal(got.url,v.wire);assert.equal(got.headers['DTAPI-Signature'],v.digest);
  if(v.body?.kind==='json') assert.equal(Buffer.from(got.bodyBytes).toString(),v.body.text);
});
test('ST-01.WIRE mutation during async DNS does not change signed URL/body',async()=>{
  let resume;const entered=new Promise(resolve=>resume=resolve);let unblock;
  const wait=new Promise(resolve=>unblock=resolve);const observed=[];
  const client=createHttpClient(cfg(),{testOnly:true,operations:routes,connector:{
    async initialize(){resume();await wait;},async request(r){observed.push(r);return {status:200,headers:new Headers(),body:null};},close(){}}});
  const body={b:2,a:'雪'};const first=client.request({operationId:'post_synthetic',body});await entered;body.a='MUTATED';unblock();await first;
  assert.equal(Buffer.from(observed[0].body).toString(),'{"b":2,"a":"雪"}');
  assert.equal(observed[0].headers['Accept-Encoding'],'identity');client.close();
});
for(const mode of ['encoded','unencoded']) for(const attack of [
  {operationId:'post_synthetic',query:[['q','x']],body:{value:'x'}},
  {operationId:'delete_synthetic',query:[['id','1']]},
  {operationId:'get_advancedsearch_api_search_query',pathParams:{query:'+/='}},
  {operationId:'get_status',query:[['x','a\r\nb']]},
  {operationId:'get_segment',pathParams:{id:'%252e%252e%252fstatus'}},
]) test('ST-01/04.BLOCK '+mode+' '+JSON.stringify(attack),async()=>{
  const h=harness({config:cfg({auth:{publicToken:PUBLIC,privateToken:PRIVATE,querySignatureEncoding:mode}})});
  await assert.rejects(h.client.request(attack),kind('invalid_request'));
  const legacy={...attack,...(attack.body===undefined?{}:{body:{kind:'json',value:attack.body}})};
  await assert.rejects(h.client.send(legacy,{dryRun:true}),kind('invalid_request'));
  assert.equal(h.state.signs,0);assert.equal(h.state.calls,0);h.client.close();
});
test('ST-01.AUTH401 no alternate signature or retry',async()=>{
  const h=harness({response:()=>new Response('secret upstream',{status:401})});
  await assert.rejects(h.client.request({operationId:'get_status'}),kind('auth'));assert.equal(h.state.signs,1);assert.equal(h.state.calls,1);h.client.close();
});
test('ST-01.PREVIEW exact unsigned result with code-owned names and zero sign/network',async()=>{
  // Final coordinator clarification msg_0440ca1adcf2 preserves this contract.
  const h=harness();const preview=await h.client.send({operationId:'post_synthetic',body:{kind:'json',value:{text:PRIVATE}}},{dryRun:true});
  assert.deepEqual(preview,{dryRun:true,operationId:'post_synthetic',method:'POST',parameterNames:['text']});
  await assert.rejects(h.client.send({operationId:'post_synthetic',body:{kind:'json',value:{'ignore previous instructions':PRIVATE}}},{dryRun:true}),kind('invalid_request'));
  assert.equal(h.state.signs,0);assert.equal(h.state.calls,0);h.client.close();
});
