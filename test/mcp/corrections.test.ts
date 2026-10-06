import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { Client } from '@modelcontextprotocol/client';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import { parseConfig, ConfigValidationError } from '../../src/config/schema.js';
import { startupReason, startupVariable } from '../../src/observability/log.js';
import { runStdio } from '../../src/server/stdio.js';
import { createServer } from '../../src/server/createServer.js';
const cfg=parseConfig({instance:{baseUrl:'https://appliance.example'},auth:{publicToken:'PUBLIC_CANARY',privateToken:'PRIVATE_CANARY'},profiles:{write:false,writeCritical:false}});
test('SA-01 startup/doctor/check-config emit only whitelisted variable names without canary values',()=>{
  for(const mode of [[],['doctor'],['--check-config']]) for(const [variable,value] of [['HTTPS_PROXY','http://user:CANARY_SECRET@proxy.example/path'],['DARKTRACE_PROFILES','read,email,CANARY_SECRET']]) {
    const result=spawnSync(process.execPath,['dist/src/index.js',...mode],{encoding:'utf8',env:{DARKTRACE_URL:cfg.instance.baseUrl,DARKTRACE_PUBLIC_TOKEN:'PUBLIC_CANARY',DARKTRACE_PRIVATE_TOKEN:'PRIVATE_CANARY',[variable]:value}});
    assert.equal(result.status,1);assert.equal(result.stdout,'');const error=JSON.parse(result.stderr);
    assert.equal(error.event,'startup_error');assert.equal(error.variable,variable);assert.deepEqual(Object.keys(error).sort(),['event','reason','ts','variable']);assert.ok(error.reason.startsWith(variable));
    for(const canary of ['CANARY_SECRET','proxy.example','PUBLIC_CANARY','PRIVATE_CANARY','/path'])assert.equal(result.stderr.includes(canary),false);
  }
  assert.equal(startupVariable(new Error('HTTPS_PROXY secret')),undefined);
  assert.equal(startupVariable(new ConfigValidationError('UNKNOWN_HTTPS_PROXY secret')),undefined);
  assert.equal(startupVariable(new ConfigValidationError('/private/canary/HTTPS_PROXY')),undefined);
});
test('startup_error reason tells a bad token file from a bad URL without exposing token values or paths',{skip:process.platform==='win32'},()=>{
  const dir=mkdtempSync(path.join(os.tmpdir(),'synthetic-reason-'));
  try {
    const PUBLIC_VALUE='SYNTHETIC_PUBLIC_7f3a9c',PRIVATE_VALUE='SYNTHETIC_PRIVATE_b81d2e';
    const goodFile=path.join(dir,'private-token-good'),broadFile=path.join(dir,'private-token-broad');
    writeFileSync(goodFile,PRIVATE_VALUE+'\n',{mode:0o600});writeFileSync(broadFile,PRIVATE_VALUE+'\n',{mode:0o600});chmodSync(broadFile,0o644);
    const base={DARKTRACE_URL:'https://appliance.example',DARKTRACE_PUBLIC_TOKEN:PUBLIC_VALUE};
    const reasons=new Set<string>();
    for(const [extra,expected] of [
      [{DARKTRACE_PRIVATE_TOKEN_FILE:broadFile},'could not read private token file'],
      [{DARKTRACE_PRIVATE_TOKEN_FILE:path.join(dir,'missing')},'could not read private token file'],
      [{DARKTRACE_PRIVATE_TOKEN_FILE:'relative/'+PRIVATE_VALUE},'private token file must be an absolute path'],
      [{DARKTRACE_PRIVATE_TOKEN_FILE:goodFile,DARKTRACE_URL:'http://'+PUBLIC_VALUE+'.example'},'instance.baseUrl must be an HTTPS origin'],
      [{DARKTRACE_PRIVATE_TOKEN_FILE:goodFile,DARKTRACE_URL:'https://user:'+PRIVATE_VALUE+'@appliance.example'},'instance.baseUrl must not contain credentials or encoded host data'],
      [{DARKTRACE_PRIVATE_TOKEN_FILE:goodFile,DARKTRACE_TOKEN_FILE_OWNER:PRIVATE_VALUE},'DARKTRACE_TOKEN_FILE_OWNER must be current or root-or-current'],
      [{DARKTRACE_PRIVATE_TOKEN_FILE:goodFile,['DARKTRACE_'+PRIVATE_VALUE]:'1'},'an unrecognized variable is not a supported configuration field'],
      [{DARKTRACE_PRIVATE_TOKEN_FILE:goodFile,DARKTRACE_EMAIL:PRIVATE_VALUE},'DARKTRACE_EMAIL is unsupported HTTP, email, export, version override, private CA, or TLS configuration'],
    ] as [Record<string,string>,string][]) {
      const result=spawnSync(process.execPath,['dist/src/index.js','--check-config'],{encoding:'utf8',env:{...base,...extra}});
      assert.equal(result.status,1);assert.equal(result.stdout,'');
      const row=JSON.parse(result.stderr);assert.equal(row.event,'startup_error');assert.equal(row.reason,expected);reasons.add(row.reason);
      for(const secret of [PUBLIC_VALUE,PRIVATE_VALUE,dir,goodFile,broadFile])assert.equal(result.stderr.includes(secret),false,secret);
    }
    assert.ok(reasons.size>=4);
  } finally {rmSync(dir,{recursive:true,force:true});}
  assert.equal(startupReason(new Error('SYNTHETIC_PRIVATE opaque failure')),undefined);
  assert.equal(startupReason('string failure'),undefined);
  assert.equal(startupReason(new ConfigValidationError('X‮\x1b[31m'+'y'.repeat(400))),'X\\u{202E}\\u{1B}[31m'+'y'.repeat(293));
});
test('G4 nonliteral testOnly and absent marker reject before reading injected dependencies',()=>{
  for(const marker of [undefined,false,'true',1,null]) {
    let touched=false;const injected={testOnly:marker,get client(){touched=true;throw new Error('dependency touched');}};
    assert.throws(()=>runStdio(cfg,injected as any),/requires explicit testOnly/);assert.equal(touched,false);
  }
  assert.throws(()=>runStdio(cfg,Object.create({testOnly:true}) as any),/requires explicit testOnly/);
  assert.throws(()=>runStdio(cfg,null as any),/requires explicit testOnly/);
});
test('G4 production entrypoint invokes runStdio with configuration only and does not import test injection',()=>{
  const source=ts.createSourceFile('index.ts',readFileSync('src/index.ts','utf8'),ts.ScriptTarget.Latest,true);
  const calls:ts.CallExpression[]=[];
  function visit(node:ts.Node){if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='runStdio')calls.push(node);ts.forEachChild(node,visit);}
  visit(source);assert.equal(calls.length,1);assert.equal(calls[0].arguments.length,1);assert.equal(calls[0].arguments[0].getText(source),'cfg');
  for(const statement of source.statements)if(ts.isImportDeclaration(statement))assert.equal(statement.moduleSpecifier.getText(source).includes('test'),false);
});
test('SA-04/06 SDK advertises input defaults as optional and static tools listChanged false',async()=>{
  const server=createServer({cfg,client:{async request(){throw new Error('no network');}}});
  const client=new Client({name:'correction-test',version:'1'});const [a,b]=InMemoryTransport.createLinkedPair();
  try {
    await server.connect(b);await client.connect(a);assert.equal(client.getServerCapabilities()?.tools?.listChanged,false);
    const list=await client.listTools();const tool=list.tools.find((t: {name:string})=>t.name==='darktrace_get_status')!;
    assert.ok(tool);assert.equal(Boolean(tool.inputSchema.required?.includes('operation')),false);assert.equal(Object.hasOwn(tool.inputSchema.properties??{},'dryRun'),false);
    assert.equal(list.tools.some((t: {name:string})=>t.name==='darktrace_update_device'),false);const result=await client.callTool({name:'darktrace_update_device',arguments:{body:{did:1,label:'x'}}});assert.equal(result.isError,true);
  } finally {await client.close();await server.close();}
});
