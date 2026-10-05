import assert from 'node:assert/strict';
import test from 'node:test';
import { Agent,createServer } from 'node:https';
import https from 'node:https';import {syncBuiltinESMExports} from 'node:module';
import { readFileSync } from 'node:fs';
import {canonicalIpAddress} from '../../dist/src/config/address.js';
import { NodeHttpsConnector,createPinnedLookup } from '../../dist/src/client/httpsConnector.js';
import { createHttpClient } from '../../dist/src/client/httpClient.js';
import { createSigner } from '../../dist/src/client/signer.js';
import { cfg,kind,PUBLIC,PRIVATE,routes } from './helpers.mjs';
const signal=()=>new AbortController().signal;
for(const failure of ['resolver','mixed','allowlist']) test('ST-04.DNS terminal '+failure+' concurrent/recovery/new-instance',async()=>{
  let resolves=0,signs=0;let valid=false;
  const resolver=async()=>{resolves++;await new Promise(r=>setImmediate(r));if(valid)return [{address:'10.20.30.40',family:4}];if(failure==='resolver')throw new Error('SYNTHETIC DNS FAILURE');return failure==='mixed'?[{address:'10.20.30.40',family:4},{address:'169.254.169.254',family:4}]:[{address:'10.20.30.41',family:4}];};
  const connector=new NodeHttpsConnector(new URL('https://appliance.test'),['10.20.30.40'],resolver);
  const client=createHttpClient(cfg(),{testOnly:true,operations:routes,connector,signer:{sign(){signs++;throw new Error('must not sign');}}});
  await Promise.all(Array.from({length:4},()=>assert.rejects(client.request({operationId:'get_status'}),kind('network'))));
  valid=true;for(let i=0;i<3;i++)await assert.rejects(client.request({operationId:'get_status'}),kind('network'));
  assert.equal(resolves,1);assert.equal(signs,0);assert.equal(connector.pinnedAddresses,undefined);client.close();
  const restarted=new NodeHttpsConnector(new URL('https://appliance.test'),['10.20.30.40'],resolver);await restarted.initialize(signal());assert.equal(resolves,2);assert.deepEqual(restarted.pinnedAddresses,[{address:'10.20.30.40',family:4}]);restarted.close();
});
for(const address of ['127.0.0.1','::1','169.254.169.254','fe80::1','0.0.0.0','224.0.0.1','::ffff:127.0.0.1','100.100.100.200','64:ff9b::a9fe:a9fe','2002:7f00:1::','fec0::1','::7f00:1']) test('ST-04.DEST reject '+address,async()=>{
  let signs=0;const connector=new NodeHttpsConnector(new URL('https://appliance.test'),undefined,async()=>[{address}]);
  const client=createHttpClient(cfg(),{testOnly:true,operations:routes,connector,signer:{sign(){signs++;throw new Error('must not sign');}}});
  await assert.rejects(client.request({operationId:'get_status'}),kind('network'));assert.equal(signs,0);assert.equal(connector.pinnedAddresses,undefined);client.close();
});
test('ST-04.PUBLIC clarified operator origin allows global snapshot; explicit private allowlist denies it',async()=>{
  // Coordinator clarification 2026-10-05, msg_1d8e1d5b12de: public host in
  // ST-04 means other origin/outside explicit allowlist, not blanket public ban.
  for(const allowed of [undefined,['10.20.30.40']]) {
    const c=new NodeHttpsConnector(new URL('https://appliance.test'),allowed,async()=>[{address:'8.8.8.8',family:4}]);
    if(allowed)await assert.rejects(c.initialize(signal()));else {await c.initialize(signal());assert.deepEqual(c.pinnedAddresses,[{address:'8.8.8.8',family:4}]);}c.close();
  }
});
for(const address of [
  '::ffff:0:a9fe:a9fe','::ffff:0:7f00:1','::ffff:0:a14:1e28',
  '2001:0:4136:e378:8000:63bf:3fff:fdd2',
  '64:ff9b:1:a00:a9:fea9:fe00:0','64:ff9b:1:a00:7f:1:0:0','64:ff9b:1::1',
  '64:ff9b::a14:1e28','2002:a14:1e28::1','::a14:1e28',
]) for(const explicit of [false,true]) test('ST-04.FR01 translated/transition reject '+address+' allowlist='+explicit,async()=>{
  const canonical=canonicalIpAddress(address);assert.ok(canonical);
  let signs=0,sockets=0;const original=https.request;const signer=createSigner(PUBLIC,PRIVATE,{encodeQueryInSignature:false});
  // Observe the actual production HTTPS entry point, but never permit an external socket.
  https.request=()=>{sockets++;throw Object.assign(new Error('synthetic socket denied'),{code:'ECONNABORTED'});};syncBuiltinESMExports();
  const c=new NodeHttpsConnector(new URL('https://appliance.test'),explicit?[canonical]:undefined,async()=>[{address,family:6}]);
  const client=createHttpClient(cfg(),{testOnly:true,operations:routes,connector:c,delay:async()=>{},signer:{sign(input){signs++;return signer.sign(input);}}});
  try {await assert.rejects(client.request({operationId:'get_status'}),kind('network'));assert.equal(signs,0);assert.equal(sockets,0);assert.equal(c.pinnedAddresses,undefined);}
  finally {client.close();https.request=original;syncBuiltinESMExports();}
});
test('ST-04.SNAPSHOT private IPv4/ULA/mapped normalization and immutable lookup no rebind',async()=>{
  let calls=0;const answers=[{address:'10.20.30.40',family:4},{address:'fd00::1',family:6},{address:'::ffff:10.20.30.40',family:6}];
  const c=new NodeHttpsConnector(new URL('https://appliance.test'),undefined,async()=>{calls++;return answers;});
  await Promise.all([c.initialize(signal()),c.initialize(signal())]);answers[0].address='8.8.8.8';await c.initialize(signal());
  assert.equal(calls,1);assert.deepEqual(c.pinnedAddresses,[{address:'10.20.30.40',family:4},{address:'fd00::1',family:6}]);
  assert.ok(Object.isFrozen(c.pinnedAddresses));const lookup=createPinnedLookup('appliance.test',c.pinnedAddresses);
  for(let i=0;i<6;i++)await new Promise((resolve,reject)=>lookup('appliance.test',{},(error,address)=>{if(error)return reject(error);assert.ok(['10.20.30.40','fd00::1'].includes(address));resolve();}));
  await new Promise(resolve=>lookup('evil.test',{},error=>{assert.ok(error);resolve();}));c.close();
});
test('ST-04.DNS initial caller abort is terminal for concurrent waiters and later calls',async t=>{
  const keepalive=setTimeout(()=>{},1000);t.after(()=>clearTimeout(keepalive));let calls=0,started;const entry=new Promise(r=>started=r);
  const c=new NodeHttpsConnector(new URL('https://appliance.test'),undefined,async(_host,s)=>{calls++;started();return new Promise((_r,reject)=>s.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}));});
  const ctrl=new AbortController();const first=c.initialize(ctrl.signal).catch(e=>e);await entry;const concurrent=c.initialize(signal()).catch(e=>e);ctrl.abort();
  assert.ok((await first) instanceof Error);assert.ok((await concurrent) instanceof Error);await assert.rejects(c.initialize(signal()));assert.equal(calls,1);assert.equal(c.pinnedAddresses,undefined);c.close();
});
// Factory seam lives ONLY in tests. Destination validation is tested above.
// Swap the dedicated agent after approved private snapshot initialization so the
// production request method still controls HTTPS, SNI, certificate checks and headers.
async function testOnlyLoopbackConnector(origin) {
  const c=new NodeHttpsConnector(origin,undefined,async()=>[{address:'10.20.30.40',family:4}]);
  await c.initialize(signal());c.agent.destroy();
  c.agent=new Agent({keepAlive:false,lookup(host,options,callback){assert.equal(host,'appliance.test');if(options.all)callback(null,[{address:'127.0.0.1',family:4}]);else callback(null,'127.0.0.1',4);}});
  return c;
}
for(const label of ['trusted','wronghostname','untrusted','expired']) test('ST-03.TLS real '+label,async t=>{
  const pem=name=>readFileSync(new URL('./fixtures/'+name,import.meta.url));
  let requests=0;const snis=[];
  const server=createServer({cert:pem(label+'-cert.pem'),key:pem(label+'-key.pem')},(req,res)=>{requests++;assert.equal(req.headers['dtapi-token'],PUBLIC);assert.equal(req.headers['accept-encoding'],'identity');res.setHeader('content-type','application/json');res.end('{"ok":true}');});
  server.on('secureConnection',socket=>snis.push(socket.servername));server.on('tlsClientError',()=>{});
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const port=server.address().port;const c=await testOnlyLoopbackConnector(new URL('https://appliance.test:'+port));
  let signs=0;const signer=createSigner(PUBLIC,PRIVATE,{encodeQueryInSignature:false});
  const client=createHttpClient(cfg({instance:{baseUrl:'https://appliance.test:'+port,timeoutMs:1000}}),{testOnly:true,operations:routes,connector:c,signer:{sign(input){signs++;return signer.sign(input);}}});
  t.after(async()=>{client.close();server.closeAllConnections();await new Promise(r=>server.close(r));});
  if(label==='trusted') {const got=await client.request({operationId:'get_status'});assert.deepEqual(got.json,{ok:true});assert.equal(requests,1);assert.deepEqual(snis,['appliance.test']);}
  else {await assert.rejects(client.request({operationId:'get_status'}),kind('network'));assert.equal(requests,0);assert.equal(signs,1,'TLS failure must never trigger GET retry');}
});
for(const cancellation of [false,true]) test('ST-11.TLS real slow body '+(cancellation?'caller cancellation':'admission deadline'),async t=>{
  const pem=name=>readFileSync(new URL('./fixtures/'+name,import.meta.url));let finishTimer,closedEarly=false;
  const server=createServer({cert:pem('trusted-cert.pem'),key:pem('trusted-key.pem')},(req,res)=>{
    res.setHeader('content-type','application/json');res.write('{');
    res.once('close',()=>{if(!res.writableEnded)closedEarly=true;});
    finishTimer=setTimeout(()=>res.end('"ok":true}'),500);
  });server.on('tlsClientError',()=>{});
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const origin=new URL('https://appliance.test:'+server.address().port);const connector=await testOnlyLoopbackConnector(origin);
  const client=createHttpClient(cfg({instance:{baseUrl:origin.origin,timeoutMs:cancellation?1000:100}}),{testOnly:true,operations:routes,connector});
  const ctrl=new AbortController();const cancelTimer=cancellation?setTimeout(()=>ctrl.abort(),100):undefined;
  t.after(async()=>{clearTimeout(cancelTimer);clearTimeout(finishTimer);client.close();server.closeAllConnections();await new Promise(r=>server.close(r));});
  const start=performance.now();await assert.rejects(client.request({operationId:'get_status',signal:ctrl.signal}),kind(cancellation?'cancelled':'timeout'));
  assert.ok(performance.now()-start<350,'deadline must abort body stream promptly');await new Promise(r=>setTimeout(r,20));assert.equal(closedEarly,true);
});
