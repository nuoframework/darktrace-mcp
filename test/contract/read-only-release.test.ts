import '../security/test-runtime-argv.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseConfig } from '../../src/config/schema.js';
import { loadConfig } from '../../src/config/load.js';
import { RELEASE_CAPABILITY, releaseAllowsOperation } from '../../src/policy/release-capability.js';
import { authorize } from '../../src/policy/guard.js';
import { operations } from '../../src/api/operations.js';
import { callTool, eligibleTools } from '../../src/tools/index.js';
import { productionOperationDescriptors } from '../../src/server/stdio.js';
import { generateCoverage } from '../../src/coverage/report.js';
const base={instance:{baseUrl:'https://appliance.example'},auth:{publicToken:'PUBLIC_CANARY',privateToken:'PRIVATE_CANARY'}};
const cfg=parseConfig(base);
const env={DARKTRACE_URL:base.instance.baseUrl,DARKTRACE_PUBLIC_TOKEN:base.auth.publicToken,DARKTRACE_PRIVATE_TOKEN:base.auth.privateToken};
test('immutable release capability rejects every configuration write grant without secret reflection',()=>{
 assert.deepEqual(RELEASE_CAPABILITY,{write:false,writeCritical:false});assert.equal(Object.isFrozen(RELEASE_CAPABILITY),true);
 for(const profiles of [{write:true},{writeCritical:true},{write:true,writeCritical:true},{write:true,sensitiveRead:true},{write:'true'},{writeCritical:1}])assert.throws(()=>parseConfig({...base,profiles}));
 for(const profiles of [{},{write:false},{writeCritical:false},{write:false,writeCritical:false},{sensitiveRead:true}])assert.doesNotThrow(()=>parseConfig({...base,profiles}));
 for(const variables of [{DARKTRACE_PROFILES:'read,write'},{DARKTRACE_WRITE_CRITICAL:'true'},{DARKTRACE_PROFILES:'write',DARKTRACE_WRITE_CRITICAL:'false'}])assert.throws(()=>loadConfig({...env,...variables}));
 assert.equal(loadConfig({...env,DARKTRACE_SENSITIVE_READ:'true'}).profiles.sensitiveRead,true);
});
test('protected policy write grant is rejected before an environment overlay can hide it',()=>{
 const directory=mkdtempSync(join(tmpdir(),'read-only-policy-'));const file=join(directory,'policy.json');
 try{for(const profiles of [{write:true},{writeCritical:true},{write:'CANARY'}]){writeFileSync(file,JSON.stringify({profiles}),{mode:0o600});assert.throws(()=>loadConfig({...env,DARKTRACE_CONFIG_FILE:file,DARKTRACE_PROFILES:'read',DARKTRACE_WRITE_CRITICAL:'false'}));}}finally{rmSync(directory,{recursive:true,force:true});}
});
test('every nonread catalogue operation is denied before preview, audit and client with forged configuration',async()=>{
 let requests=0,audits=0;const forged={...cfg,profiles:{...cfg.profiles,write:true,writeCritical:true,sensitiveRead:true}};
 const ctx={cfg:forged,client:{async request(){requests++;throw new Error('REMOTE_CANARY');}},audit:{async record(){audits++;throw new Error('AUDIT_CANARY');}}};
 const denied=Object.values(operations).filter(op=>op.tier!=='read');assert.equal(denied.length,22);
 for(const op of denied){assert.equal(releaseAllowsOperation(op),false);assert.throws(()=>authorize(op,forged));for(const dryRun of [undefined,true,false]){
  const result=await callTool(op.tool??'unknown_tool',{operation:op.operationId,path:{tid:1},body:{did:1,label:'CANARY'},...(dryRun===undefined?{}:{dryRun})},ctx);
  assert.equal(result.isError,true,op.operationId);assert.equal(result.structuredContent?.dryRun,undefined);assert.equal(result.structuredContent?.outcome,undefined);assert.doesNotMatch(JSON.stringify(result),/CANARY/);
 }}assert.equal(requests,0);assert.equal(audits,0);
 assert.ok(eligibleTools(forged).every(t=>t.operations.every(op=>op.tier==='read')));
});
test('production HTTP descriptor ceiling is frozen and contains only implemented semantic reads',()=>{
 const expected=Object.values(operations).filter(releaseAllowsOperation).map(({operationId,method,pathTemplate})=>({operationId,method,pathTemplate}));
 assert.deepEqual(productionOperationDescriptors,expected);assert.equal(Object.isFrozen(productionOperationDescriptors),true);assert.ok(productionOperationDescriptors.every(Object.isFrozen));
 assert.equal(productionOperationDescriptors.length,19);assert.equal(productionOperationDescriptors.filter(o=>o.method==='POST').length,0);
 for(const op of Object.values(operations).filter(o=>o.tier!=='read'))assert.equal(productionOperationDescriptors.some(d=>d.operationId===op.operationId),false);
 const rows=generateCoverage().operations;for(const op of Object.values(operations).filter(o=>o.tier!=='read'))assert.equal(rows.find(row=>row.operationId===op.operationId)?.releaseEligible,false);
});
test('production CLI write flags/configuration reject in stdio, doctor and check-config without MCP side effects',()=>{
 for(const args of [[],['doctor'],['--check-config']])for(const extra of [{DARKTRACE_PROFILES:'read,write'},{DARKTRACE_WRITE_CRITICAL:'true'}]){
  const got=spawnSync(process.execPath,['--import',resolve('test/security/diagnostic-guard.mjs'),'dist/src/index.js',...args],{env:{...env,...extra},encoding:'utf8',input:'',timeout:4000});
  assert.equal(got.status,1);assert.equal(got.stdout,'');assert.doesNotMatch(got.stderr,/CANARY|FORBIDDEN_SIDE_EFFECT/);const row=JSON.parse(got.stderr);assert.equal(row.event,'startup_error');
 }
 for(const args of [['--write'],['--release-capability=write']]){const got=spawnSync(process.execPath,['dist/src/index.js',...args],{env,encoding:'utf8',timeout:4000});assert.equal(got.status,2);assert.equal(got.stdout,'');}
});
