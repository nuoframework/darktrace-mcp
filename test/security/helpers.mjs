import assert from 'node:assert/strict';
import { parseConfig } from '../../dist/src/config/schema.js';
import { createHttpClient } from '../../dist/src/client/httpClient.js';
import { createSigner } from '../../dist/src/client/signer.js';
export const PUBLIC='SYNTH_PUBLIC_CANARY_6ef9';
export const PRIVATE='SYNTH_PRIVATE_CANARY_8fa2';
export const CANARY='SYNTH_UPSTREAM_CANARY_<>&%+_9cc1';
export const routes=[
  {operationId:'get_status',method:'GET',pathTemplate:'/status'},
  {operationId:'post_synthetic',method:'POST',pathTemplate:'/synthetic',parameterNames:['text','a','b','value','q']},
  {operationId:'delete_synthetic',method:'DELETE',pathTemplate:'/synthetic'},
  {operationId:'get_segment',method:'GET',pathTemplate:'/segment/{id}'},
  {operationId:'get_advancedsearch_api_search_query',method:'GET',pathTemplate:'/advancedsearch/api/search/{query}'},
];
export function cfg(overrides={}) {return parseConfig({instance:{baseUrl:'https://appliance.test',timeoutMs:30000},auth:{publicToken:PUBLIC,privateToken:PRIVATE},...overrides});}
export function env(extra={}) {
  const clean={};
  for(const key of ['PATH','TMPDIR','SystemRoot']) if(process.env[key]) clean[key]=process.env[key];
  return {...clean,DARKTRACE_URL:'https://appliance.test',DARKTRACE_PUBLIC_TOKEN:PUBLIC,DARKTRACE_PRIVATE_TOKEN:PRIVATE,...extra};
}
export function kind(expected) {return error=>{assert.equal(error.kind,expected);assert.ok(error.requestId);return true;};}
export function noCanaries(value,canaries=[PUBLIC,PRIVATE,CANARY]) {
  const text=typeof value==='string'?value:JSON.stringify(value);
  for(const c of canaries) for(const encoded of [c,encodeURIComponent(c),Buffer.from(c).toString('base64')]) assert.equal(text.includes(encoded),false,`canary escaped in captured sink (${encoded===c?'literal':'encoded'})`);
}
export function harness({config=cfg(),response=()=>new Response('{}'),extra={}}={}) {
  const state={signs:0,calls:0,waits:[],wire:[]};
  const signer=createSigner(config.auth.publicToken,config.auth.privateToken,{encodeQueryInSignature:config.auth.querySignatureEncoding==='encoded'});
  const client=createHttpClient(config,{testOnly:true,operations:routes,
    signer:{sign(input){state.signs++;return signer.sign(input);}},
    fetchImpl:async(input,init)=>{state.calls++;state.wire.push({url:String(input),body:init?.body===undefined?undefined:Buffer.from(init.body).toString(),headers:Object.fromEntries(new Headers(init?.headers))});return response(input,init,state);},
    delay:async ms=>{state.waits.push(ms);},random:()=>0,...extra});
  return {client,state};
}
