import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { Client } from '@modelcontextprotocol/client';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import { parseConfig, ConfigValidationError } from '../../src/config/schema.js';
import { startupVariable } from '../../src/observability/log.js';
import { runStdio } from '../../src/server/stdio.js';
import { createServer } from '../../src/server/createServer.js';
const cfg=parseConfig({instance:{baseUrl:'https://appliance.example'},auth:{publicToken:'PUBLIC_CANARY',privateToken:'PRIVATE_CANARY'},profiles:{write:true,writeCritical:true}});
test('SA-01 startup/doctor/check-config emit only whitelisted variable names without canary values',()=>{
  for(const mode of [[],['doctor'],['--check-config']]) for(const [variable,value] of [['HTTPS_PROXY','http://user:CANARY_SECRET@proxy.example/path'],['DARKTRACE_PROFILES','read,email,CANARY_SECRET']]) {
    const result=spawnSync(process.execPath,['dist/src/index.js',...mode],{encoding:'utf8',env:{DARKTRACE_URL:cfg.instance.baseUrl,DARKTRACE_PUBLIC_TOKEN:'PUBLIC_CANARY',DARKTRACE_PRIVATE_TOKEN:'PRIVATE_CANARY',[variable]:value}});
    assert.equal(result.status,1);assert.equal(result.stdout,'');const error=JSON.parse(result.stderr);
    assert.equal(error.event,'startup_error');assert.equal(error.variable,variable);assert.deepEqual(Object.keys(error).sort(),['event','ts','variable']);
    for(const canary of ['CANARY_SECRET','proxy.example','PUBLIC_CANARY','PRIVATE_CANARY','/path'])assert.equal(result.stderr.includes(canary),false);
  }
  assert.equal(startupVariable(new Error('HTTPS_PROXY secret')),undefined);
  assert.equal(startupVariable(new ConfigValidationError('UNKNOWN_HTTPS_PROXY secret')),undefined);
  assert.equal(startupVariable(new ConfigValidationError('/private/canary/HTTPS_PROXY')),undefined);
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
    const list=await client.listTools();const tool=list.tools.find(t=>t.name==='darktrace_update_device')!;
    assert.ok(tool);assert.equal(tool.inputSchema.required?.includes('operation'),false);assert.equal(tool.inputSchema.required?.includes('dryRun'),false);
    const result=await client.callTool({name:tool.name,arguments:{body:{did:1,label:'x'}}});assert.equal((result.structuredContent as any).dryRun,true);
  } finally {await client.close();await server.close();}
});
