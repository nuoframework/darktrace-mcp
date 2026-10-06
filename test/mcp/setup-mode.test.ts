import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { CONNECTION_VARIABLES, isUnconfigured } from '../../src/config/load.js';
import { SETUP_COMMAND, SETUP_TOOL_NAME, setupStatus, setupStatusText } from '../../src/server/setupServer.js';
import { VERSION } from '../../src/server/createServer.js';

const cli='dist/src/index.js';
const guard=resolve('test/security/diagnostic-guard.mjs');
/** A shell with no Darktrace variables at all: what a one-click client entry provides before `setup` ran. */
const bare={PATH:process.env.PATH??''};
const init={jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'first-run',version:'1'}}};
const frames=(...messages:unknown[])=>messages.map(m=>JSON.stringify(m)).join('\n')+'\n';
const run=(input:string,env:Record<string,string>=bare,args:string[]=[])=>spawnSync(process.execPath,['--import',guard,cli,...args],{env,input,encoding:'utf8',timeout:8000});
const replies=(stdout:string)=>stdout.trim().split('\n').filter(Boolean).map(line=>JSON.parse(line) as {id?:number;result?:any;error?:unknown});

test('unconfigured detection: only the absence of every connection variable counts',()=>{
  assert.equal(isUnconfigured({}),true);
  assert.equal(isUnconfigured({PATH:'/bin',DARKTRACE_PROFILES:'read'}),true,'profiles alone do not configure a connection');
  for(const name of CONNECTION_VARIABLES) assert.equal(isUnconfigured({[name]:'x'}),false,name);
  // The environment policy itself is exercised in a child process below: the test runner's own execArgv carries
  // Node flags that the policy rejects by design.
});

test('setup status names the pinned setup command and every missing item, without reading anything',()=>{
  assert.equal(SETUP_COMMAND,`npx -y @nuoframework/darktrace-mcp@${VERSION} setup`);
  const status=setupStatus();
  assert.equal(status.configured,false);
  assert.deepEqual(status.missing.map(m=>m.item),['appliance URL','public API token','private API token']);
  const text=setupStatusText(status);
  assert.ok(text.includes(SETUP_COMMAND));
  assert.ok(text.includes('DARKTRACE_URL'));
  assert.ok(!/example\.internal|https:\/\/[a-z0-9.-]+:\d+/.test(text),'never suggests an appliance address');
});

test('first run without configuration serves one read-only setup tool and hides every Darktrace tool',()=>{
  const got=run(frames(init,{jsonrpc:'2.0',method:'notifications/initialized'},
    {jsonrpc:'2.0',id:2,method:'tools/list',params:{}},
    {jsonrpc:'2.0',id:3,method:'tools/call',params:{name:SETUP_TOOL_NAME,arguments:{}}},
    {jsonrpc:'2.0',id:4,method:'tools/call',params:{name:'darktrace_get_status',arguments:{}}}));
  assert.equal(got.error,undefined);
  assert.equal(got.status,0,got.stderr);
  assert.equal(got.stderr.includes('ADVERSARIAL_FORBIDDEN_SIDE_EFFECT'),false,'no DNS, socket or signing in setup mode');
  const log=JSON.parse(got.stderr.trim().split('\n')[0]);
  assert.equal(log.event,'setup_required');
  assert.deepEqual(Object.keys(log).sort(),['event','reason','ts']);
  assert.ok(log.reason.includes(SETUP_COMMAND),'the one command to run is on stderr');
  const byId=new Map(replies(got.stdout).map(r=>[r.id,r]));
  const listed=byId.get(2)?.result.tools;
  assert.equal(listed.length,1);
  assert.equal(listed[0].name,SETUP_TOOL_NAME);
  assert.equal(listed[0].annotations.readOnlyHint,true);
  assert.ok(listed[0].description.includes(SETUP_COMMAND));
  const called=byId.get(3)?.result;
  assert.equal(called.isError,undefined);
  assert.equal(called.structuredContent.configured,false);
  assert.equal(called.structuredContent.command,SETUP_COMMAND);
  assert.ok(called.content[0].text.includes(SETUP_COMMAND));
  const other=byId.get(4)?.result;
  assert.equal(other.isError,true,'real tools are not callable in setup mode');
  assert.ok(other.content[0].text.includes(SETUP_COMMAND));
});

test('setup mode keeps the client-identification rule: tools/list before initialize is rejected',()=>{
  const got=run(frames({jsonrpc:'2.0',id:1,method:'tools/list',params:{}}));
  assert.equal(got.status,0);
  const [first]=replies(got.stdout);
  assert.ok(first.error);
  assert.equal(first.result,undefined);
});

test('--check-config and doctor keep failing without configuration; partial or unsafe environments never enter setup mode',()=>{
  for(const args of [['--check-config'],['doctor']]) {
    const got=run('',bare,args);
    assert.equal(got.status,1,args.join(' '));
    assert.equal(got.stdout,'');
    assert.equal(JSON.parse(got.stderr).event,'startup_error');
  }
  // A URL without tokens is a broken configuration, not a first run: the operator gets the precise startup error.
  const partial=run('',{...bare,DARKTRACE_URL:'https://appliance.test'});
  assert.equal(partial.status,1);
  assert.equal(partial.stdout,'');
  assert.equal(JSON.parse(partial.stderr).event,'startup_error');
  // Ambient proxies and forbidden variables are refused before setup mode is considered.
  for(const extra of [{HTTPS_PROXY:'http://proxy.test'},{DARKTRACE_TLS_INSECURE:'true'},{DARKTRACE_UNKNOWN:'1'}] as Record<string,string>[]) {
    const got=run('',{...bare,...extra});
    assert.equal(got.status,1,JSON.stringify(extra));
    assert.equal(got.stdout,'');
    assert.equal(JSON.parse(got.stderr).event,'startup_error');
  }
});
