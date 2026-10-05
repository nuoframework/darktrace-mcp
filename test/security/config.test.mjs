import assert from 'node:assert/strict';import test from 'node:test';
import {mkdtempSync,writeFileSync,chmodSync,mkdirSync,symlinkSync,rmSync,statSync} from 'node:fs';
import fs from 'node:fs';import {syncBuiltinESMExports} from 'node:module';
import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';import {spawnSync} from 'node:child_process';
import {loadConfig} from '../../dist/src/config/load.js';
import {parseConfig,assertSafeNetworkEnvironment,DEFAULT_LIMITS} from '../../dist/src/config/schema.js';
import {env,PUBLIC,PRIVATE,noCanaries} from './helpers.mjs';
const directory=mkdtempSync(join(tmpdir(),'synthetic-secure-files-'));chmodSync(directory,0o700);
let n=0;function file(content,mode=0o600){const path=join(directory,'fixture-'+n++);writeFileSync(path,content,{mode});chmodSync(path,mode);return path;}
const protectedJson=()=>JSON.stringify({instance:{baseUrl:'https://appliance.test'},auth:{publicToken:PUBLIC,privateToken:PRIVATE}});
function diagnostics(e,success,pathCanary){
  for(const mode of ['--check-config','doctor','startup']) {
    const args=['--import',resolve('test/security/diagnostic-guard.mjs'),resolve('dist/src/index.js'),...(mode==='startup'?[]:[mode])];
    const got=spawnSync(process.execPath,args,{env:e,input:'',encoding:'utf8',timeout:4000});
    assert.equal(got.error,undefined,'diagnostic/startup must never hang');assert.equal(got.status,success?0:1);
    assert.equal(got.stderr.includes('ADVERSARIAL_FORBIDDEN_SIDE_EFFECT'),false);noCanaries(got.stdout+got.stderr);
    if(pathCanary)assert.equal((got.stdout+got.stderr).includes(pathCanary),false);
    if(success&&mode!=='startup') {const out=JSON.parse(got.stdout);assert.equal(out.networkProbe,false);assert.equal(out.labValidated,false);}
    else assert.equal(got.stdout,'');
  }
}
test.after(()=>rmSync(directory,{recursive:true,force:true}));
for(const which of ['PUBLIC','PRIVATE']) {
  const variable='DARKTRACE_'+which+'_TOKEN';const token=which==='PUBLIC'?PUBLIC:PRIVATE;
  for(const mode of [0o400,0o600]) test('ST-02.FILE token '+which+' valid '+mode.toString(8),()=>{
    const path=file(token+'\n',mode);const e=env({[variable]:undefined,[variable+'_FILE']:path});assert.equal(loadConfig(e).auth[which==='PUBLIC'?'publicToken':'privateToken'],token);diagnostics(e,true,path);
  });
  for(const mode of [0o640,0o604,0o700,0o1600,0o2600,0o4600]) test('ST-02.FILE token '+which+' mode reject '+mode.toString(8),t=>{
    const path=file(token,mode);if((statSync(path).mode&0o7777)!==mode){t.skip('BLOCKED: OS discarded requested special permission bits; no invalid fixture exists');return;}
    const e=env({[variable]:undefined,[variable+'_FILE']:path});assert.throws(()=>loadConfig(e));diagnostics(e,false,path);
  });
  for(const bytes of [4096,4097]) test('ST-02.BOUND token '+which+' '+bytes,()=>{
    const path=file('t'.repeat(bytes));const e=env({[variable]:undefined,[variable+'_FILE']:path});if(bytes===4096)assert.doesNotThrow(()=>loadConfig(e));else assert.throws(()=>loadConfig(e));diagnostics(e,bytes===4096,path);
  });
  for(const type of ['symlink','fifo','directory','conflict']) test('ST-02.FILE token '+which+' '+type,()=>{
    let path=join(directory,'special-'+n++);
    if(type==='symlink')symlinkSync(file(token),path);else if(type==='fifo')assert.equal(spawnSync('mkfifo',[path]).status,0);else if(type==='directory')mkdirSync(path);else path=file(token);
    const e=env({[variable]:type==='conflict'?token:undefined,[variable+'_FILE']:path});assert.throws(()=>loadConfig(e));diagnostics(e,false,path);
  });
}
for(const bytes of [65536,65537]) test('ST-02.BOUND JSON '+bytes+' protected inline auth',()=>{
  const json=protectedJson();const path=file(json+' '.repeat(bytes-Buffer.byteLength(json)));const e=env({DARKTRACE_CONFIG_FILE:path,DARKTRACE_PUBLIC_TOKEN:undefined,DARKTRACE_PRIVATE_TOKEN:undefined});
  if(bytes===65536)assert.doesNotThrow(()=>loadConfig(e));else assert.throws(()=>loadConfig(e));diagnostics(e,bytes===65536,path);
});
for(const mode of [0o640,0o604,0o620,0o700,0o1600,0o2600,0o4600]) test('ST-02.POLICY nonsecret JSON insecure mode '+mode.toString(8),t=>{
  const path=file('{"profiles":{"write":false}}',mode);if((statSync(path).mode&0o7777)!==mode){t.skip('BLOCKED: OS discarded requested special permission bits; no invalid fixture exists');return;}
  const e=env({DARKTRACE_CONFIG_FILE:path});assert.throws(()=>loadConfig(e));diagnostics(e,false,path);
});
for(const type of ['symlink','fifo','directory','malformed']) test('ST-02/14.JSON '+type,()=>{
  let path=join(directory,'json-'+n++);if(type==='symlink')symlinkSync(file('{"profiles":{"write":false}}'),path);else if(type==='fifo')assert.equal(spawnSync('mkfifo',[path]).status,0);else if(type==='directory')mkdirSync(path);else path=file('{'+PRIVATE);
  const e=env({DARKTRACE_CONFIG_FILE:path});assert.throws(()=>loadConfig(e));diagnostics(e,false,path);
});
test('ST-02.GROW JSON and token bounded read rejects before JSON.parse (instrumented fs)',()=>{
  for(const token of [false,true]) {
    const path=file(token?'x'.repeat(1024):'{"profiles":{}}');const e=env(token?{DARKTRACE_PRIVATE_TOKEN:undefined,DARKTRACE_PRIVATE_TOKEN_FILE:path}:{DARKTRACE_CONFIG_FILE:path});
    const original=fs.readSync,parser=JSON.parse;let reads=0,parses=0;
    fs.readSync=function(...args){const got=original(...args);if(++reads===1)fs.appendFileSync(path,'x'.repeat(token?4097:65537));return got;};
    JSON.parse=function(...args){parses++;return parser(...args);};syncBuiltinESMExports();
    try {assert.throws(()=>loadConfig(e));assert.equal(parses,0);assert.ok(reads<=Math.ceil((token?4097:65537)/1024)+1);}
    finally {fs.readSync=original;JSON.parse=parser;syncBuiltinESMExports();}
  }
});
test('ST-02.UID token and JSON wrong owner denied (instrumented fstat)',()=>{
  const original=fs.fstatSync;fs.fstatSync=function(...args){const stat=original(...args);stat.uid=process.getuid()+1;return stat;};syncBuiltinESMExports();
  try {for(const token of [false,true]) {const path=file(token?PRIVATE:'{}');assert.throws(()=>loadConfig(env(token?{DARKTRACE_PRIVATE_TOKEN:undefined,DARKTRACE_PRIVATE_TOKEN_FILE:path}:{DARKTRACE_CONFIG_FILE:path})));}}
  finally {fs.fstatSync=original;syncBuiltinESMExports();}
});
test('ST-02.MODE all special bits denied on open handle (instrumented fstat, distinct from OS fixture)',()=>{
  const original=fs.fstatSync;
  try {for(const bit of [0o1000,0o2000,0o4000]) {
    fs.fstatSync=function(...args){const stat=original(...args);stat.mode|=bit;return stat;};syncBuiltinESMExports();
    for(const token of [false,true]) {const path=file(token?PRIVATE:'{}');assert.throws(()=>loadConfig(env(token?{DARKTRACE_PRIVATE_TOKEN:undefined,DARKTRACE_PRIVATE_TOKEN_FILE:path}:{DARKTRACE_CONFIG_FILE:path})));}
  }}finally {fs.fstatSync=original;syncBuiltinESMExports();}
});
for(const name of ['HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','NO_PROXY','http_proxy','https_proxy','all_proxy','no_proxy','NODE_USE_ENV_PROXY','NODE_TLS_REJECT_UNAUTHORIZED']) test('ST-03/04.PROXY '+name+' value and empty refusal',()=>{
  for(const value of name==='NODE_TLS_REJECT_UNAUTHORIZED'?['0']:['https://'+PRIVATE+'@proxy.test','']) {
    const e=env({[name]:value});assert.throws(()=>loadConfig(e),error=>{assert.ok(error.message.includes(name));noCanaries(error.message);return true;});diagnostics(e,false);
  }
});
for(const flag of ['--use-env-proxy','--tls-min-v1.0','--tls-keylog='+PRIVATE]) test('ST-03/04.FLAGS '+flag.split('=')[0],()=>{
  assert.throws(()=>assertSafeNetworkEnvironment({},[flag]));assert.throws(()=>loadConfig(env({NODE_OPTIONS:flag}))); // Node itself may reject these before app, no CLI equivalence claim.
});
for(const variable of ['DARKTRACE_TLS_INSECURE','DARKTRACE_ASSUME_VERSION','DARKTRACE_EXPORT_DIR','DARKTRACE_HTTP','DARKTRACE_EMAIL']) test('ST-03/07/09/16.ENV unsupported '+variable,()=>{const e=env({[variable]:PRIVATE});assert.throws(()=>loadConfig(e));diagnostics(e,false);});
test('ST-02.ARGV tokens are never echoed/accepted',()=>{
  const got=spawnSync(process.execPath,['dist/src/index.js','--private-token='+PRIVATE],{env:env(),encoding:'utf8',timeout:4000});assert.equal(got.status,2);noCanaries(got.stdout+got.stderr);
});
test('ST-11.CONFIG every ceiling rejects increase; ST-08/16 strict critical/transport',()=>{
  const base={instance:{baseUrl:'https://appliance.test'},auth:{publicToken:PUBLIC,privateToken:PRIVATE}};
  for(const [key,max] of Object.entries(DEFAULT_LIMITS))assert.throws(()=>parseConfig({...base,...(key==='timeoutMs'?{instance:{...base.instance,timeoutMs:max+1}}:{limits:{[key]:max+1}})}));
  for(const extra of [{profiles:{writeCritical:true}},{profiles:{email:false}},{profiles:{export:false}},{transport:{kind:'http'}},{transport:{kind:'stdio',http:{}}},{bearerTokens:[]},{compat:{assumeVersion:'7.1'}},{instance:{baseUrl:'https://appliance.test',testOnlyLoopback:true}}])assert.throws(()=>parseConfig({...base,...extra}));
});
