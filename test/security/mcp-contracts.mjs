import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { Client } from '@modelcontextprotocol/client';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import { createServer } from '../../dist/src/server/createServer.js';
import { cfg, env, noCanaries } from './helpers.mjs';
export const profiles = {
  read: {},
  'read+sensitive': { sensitiveRead: true },
  'read+write': { write: true },
  'read+writeCritical': { write: true, writeCritical: true },
};
export function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  return JSON.stringify(value);
}
export const digest = value => createHash('sha256').update(canonical(value)).digest('hex');
export async function toolContract(profile) {
  const server = createServer({ cfg: cfg({ profiles: profile }), client: { async request() { throw new Error('Contract listing must never dispatch'); } } });
  const client = new Client({ name: 'synthetic-contract-review', version: '1' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(b); await client.connect(a);
    const { tools } = await client.listTools();
    // Fixed order as well as exact description, schema and annotations are reviewed.
    return tools.map(({ name, description, inputSchema, annotations }) => ({ name, description, inputSchema, annotations }));
  } finally { await client.close(); await server.close(); }
}

// The original four profiles above remain alpha provenance and active denial cases.
// First-stable release captures only supported full contracts, never empty write lists.
export const releaseProfiles=Object.freeze({read:Object.freeze({}),'read+sensitive':Object.freeze({sensitiveRead:true})});
export const forbiddenReleaseProfiles=Object.freeze({
 'read+write':Object.freeze({profiles:Object.freeze({write:true}),errorClass:'ConfigValidationError',beforeSdk:true,beforeNetwork:true}),
 'read+writeCritical':Object.freeze({profiles:Object.freeze({write:true,writeCritical:true}),errorClass:'ConfigValidationError',beforeSdk:true,beforeNetwork:true}),
 'critical-without-write':Object.freeze({profiles:Object.freeze({writeCritical:true}),errorClass:'ConfigValidationError',beforeSdk:true,beforeNetwork:true}),
});
export async function verifyRejectedReleaseProfiles(){
 const startupChecks={};
 for(const [name,row]of Object.entries(forbiddenReleaseProfiles)){
  const rejects=error=>{assert.equal(error.name,row.errorClass);assert.match(error.message,/read-only release/);noCanaries(error.message);return true;};
  assert.throws(()=>cfg({profiles:row.profiles}),rejects);
  await assert.rejects(()=>toolContract(row.profiles),rejects);
  const variables={...(row.profiles.write?{DARKTRACE_PROFILES:'read,write'}:{}),...(row.profiles.writeCritical?{DARKTRACE_WRITE_CRITICAL:'true'}:{})};
  for(const args of [[],['doctor'],['--check-config']]){
   const got=spawnSync(process.execPath,['--import',fileURLToPath(new URL('./diagnostic-guard.mjs',import.meta.url)),fileURLToPath(new URL('../../dist/src/index.js',import.meta.url)),...args],{env:env(variables),input:'',encoding:'utf8',timeout:4000,maxBuffer:4096});
   assert.equal(got.error,undefined);assert.equal(got.status,1);assert.equal(got.stdout,'');noCanaries(got.stderr);assert(!got.stderr.includes('ADVERSARIAL_FORBIDDEN_SIDE_EFFECT'));
   const error=JSON.parse(got.stderr);assert.equal(error.event,'startup_error');assert.deepEqual(Object.keys(error).sort(),error.variable===undefined?['event','ts']:['event','ts','variable']);
  }
  startupChecks[name]={objectRejected:true,contractRejectedBeforeSdk:true,productionModes:['stdio','doctor','--check-config'],exitStatus:1,stdoutEmpty:true,networkSigningGuardTriggered:false};
 }
 return {rejectedProfiles:forbiddenReleaseProfiles,startupChecks};
}
