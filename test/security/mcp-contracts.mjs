import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Client } from '@modelcontextprotocol/client';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import { createServer } from '../../dist/src/server/createServer.js';
import { cfg, env, noCanaries } from './helpers.mjs';
// Full-API release: every supported operator profile combination has a reviewed full contract.
export const profiles = {
  read: {},
  'read+sensitive': { sensitiveRead: true },
  'read+write': { write: true },
  'read+write+critical': { write: true, writeCritical: true },
  all: { sensitiveRead: true, write: true, writeCritical: true },
  'read+sensitive+write': { sensitiveRead: true, write: true },
};
// DR-W-08: approval-channel variants whose tool descriptions differ from the default channel (critical elicitation,
// write host). Pinned in the same fixture next to the six release profiles.
export const approvalVariants = {
  'read+write+critical/critical-host': { write: true, writeCritical: true, criticalApproval: 'host' },
  'read+write/write-elicitation': { write: true, writeApproval: 'elicitation' },
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

// The alpha and first-stable fixtures remain historical provenance; the full-API oracle covers all six profiles.
export const releaseProfiles=Object.freeze(Object.fromEntries(Object.entries(profiles).map(([name,value])=>[name,Object.freeze({...value})])));
// The only unsupported grant shape left: critical without write (startup error in every overlay and mode).
export const forbiddenReleaseProfiles=Object.freeze({
 'critical-without-write':Object.freeze({profiles:Object.freeze({writeCritical:true}),errorClass:'ConfigValidationError',beforeSdk:true,beforeNetwork:true}),
 'sensitive+critical-without-write':Object.freeze({profiles:Object.freeze({sensitiveRead:true,writeCritical:true}),errorClass:'ConfigValidationError',beforeSdk:true,beforeNetwork:true}),
});
export async function verifyRejectedReleaseProfiles(){
 const startupChecks={};
 for(const [name,row]of Object.entries(forbiddenReleaseProfiles)){
  const rejects=error=>{assert.equal(error.name,row.errorClass);assert.match(error.message,/requires profiles\.write/);noCanaries(error.message);return true;};
  assert.throws(()=>cfg({profiles:row.profiles}),rejects);
  await assert.rejects(()=>toolContract(row.profiles),rejects);
  const variables={...(row.profiles.sensitiveRead?{DARKTRACE_SENSITIVE_READ:'true'}:{}),...(row.profiles.writeCritical?{DARKTRACE_WRITE_CRITICAL:'true'}:{})};
  for(const args of [[],['doctor'],['--check-config']]){
   const got=spawnSync(process.execPath,['--import',fileURLToPath(new URL('./diagnostic-guard.mjs',import.meta.url)),fileURLToPath(new URL('../../dist/src/index.js',import.meta.url)),...args],{env:env(variables),input:'',encoding:'utf8',timeout:4000,maxBuffer:4096});
   assert.equal(got.error,undefined);assert.equal(got.status,1);assert.equal(got.stdout,'');noCanaries(got.stderr);assert(!got.stderr.includes('ADVERSARIAL_FORBIDDEN_SIDE_EFFECT'));
   const error=JSON.parse(got.stderr);assert.equal(error.event,'startup_error');assert.deepEqual(Object.keys(error).sort(),error.variable===undefined?['event','reason','ts']:['event','reason','ts','variable']);assert.match(error.reason,/requires profiles\.write/);
  }
  startupChecks[name]={objectRejected:true,contractRejectedBeforeSdk:true,productionModes:['stdio','doctor','--check-config'],exitStatus:1,stdoutEmpty:true,networkSigningGuardTriggered:false};
 }
 return {rejectedProfiles:forbiddenReleaseProfiles,startupChecks};
}

// Explicit deterministic capture uses the same SDK tools/list generator as MR-04.
// Regeneration does not constitute independent fixture review (CHANGES-core §8.11 E11).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  assert.deepEqual(process.argv.slice(2), ['--capture'], 'Usage: node test/security/mcp-contracts.mjs --capture');
  const capture = async () => {
    const contracts = {};
    for (const [name, profile] of Object.entries({ ...releaseProfiles, ...approvalVariants })) {
      const tools = await toolContract(profile);
      contracts[name] = { sha256: digest(tools), tools };
    }
    return JSON.stringify({
      alphaFixtureSha256: createHash('sha256').update(readFileSync(new URL('./fixtures/mcp-tool-contracts.json', import.meta.url))).digest('hex'),
      canonicalization: 'Recursive sorted object keys; preserve array order; SHA-256 UTF-8 JSON',
      contracts,
      rejectedProfiles: forbiddenReleaseProfiles,
      releaseCapability: { read: true, sensitiveRead: true, write: true, writeCritical: true, grantedBy: 'operator profiles only; model arguments cannot grant or escalate' },
    }, null, 2) + '\n';
  };
  const bytes = await capture();
  assert.equal(await capture(), bytes, 'Repeated tools/list capture must be byte-identical');
  writeFileSync(new URL('./fixtures/mcp-tool-contracts-full-api.json', import.meta.url), bytes);
  console.log(createHash('sha256').update(bytes).digest('hex'));
}
