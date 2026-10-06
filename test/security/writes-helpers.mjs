import './writes-preload.mjs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const { cfg, env, PUBLIC, PRIVATE, noCanaries } = await import('./helpers.mjs');
export { cfg, env, PUBLIC, PRIVATE, noCanaries };
export const { operations, operationDescriptors, validateOperation, buildRequest } = await import('../../dist/src/api/operations.js');
export const { callTool, eligibleTools } = await import('../../dist/src/tools/index.js');
export const { createHttpClient } = await import('../../dist/src/client/httpClient.js');
export const { createSigner } = await import('../../dist/src/client/signer.js');
export const { createAudit, verifyAuditChain } = await import('../../dist/src/observability/audit.js');
export const { previewBinding, approvalMessage } = await import('../../dist/src/policy/guard.js');
// Code point ordering, deliberately independent of the production UTF-16 sorter.
const compare = (a, b) => { const x = [...a].map(c => c.codePointAt(0)), y = [...b].map(c => c.codePointAt(0));
  for (let i = 0; i < Math.min(x.length, y.length); i++) if (x[i] !== y[i]) return x[i] - y[i]; return x.length - y.length; };
export function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort(compare).map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Nonfinite canonical number');
  return JSON.stringify(value);
}
export const sha = value => createHash('sha256').update(value).digest('hex');
export function argsHash(operationId, args) {
  const { dryRun, confirm, previewId, ...api } = args;
  return sha(canonical({ operationId, args: api }));
}
export const profiles = { read: {}, 'read+sensitive': { sensitiveRead: true }, 'read+write': { write: true },
  'read+write+critical': { write: true, writeCritical: true }, all: { sensitiveRead: true, write: true, writeCritical: true } };
export const criticalId = 'delete_tags_tid';
export const criticalArgs = { path: { tid: 7 } };
export const ordinaryId = 'post_devices';
export const ordinaryArgs = { body: { did: 7, label: 'synthetic' } };
export function response(bytes = Buffer.from('{}'), status = 200, headers = {}) {
  const chunks = Array.isArray(bytes) ? bytes : [bytes];
  const state = { cancelled: 0, chunks: 0 };
  return { state, status, headers: new Headers({ 'content-type': 'application/json', ...headers }),
    body: Object.assign((async function* () { for (const chunk of chunks) { state.chunks++; yield chunk; } })(),
      { async cancel() { state.cancelled++; } }) };
}
export function harness({ profile = profiles.all, approval = 'elicitation', approve, upstream = { status: 'SUCCESS' },
  wireResponse, auditFailure, limits = {}, clock } = {}) {
  const config = cfg({ profiles: { ...profile, criticalApproval: approval }, limits });
  const state = { calls: [], wires: [], auditAttempts: [], audits: [], lines: [], prompts: [], waits: [], events: [] };
  const realAudit = createAudit([PUBLIC, PRIVATE], async line => { state.lines.push(line); });
  const http = createHttpClient(config, { testOnly: true, operations: operationDescriptors,
    ...(clock ? { now: () => clock.now } : {}), delay: async ms => state.waits.push(ms),
    connector: { async initialize() { state.events.push('connector'); globalThis.__writeSpies.connector++; },
      async request(request) { globalThis.__writeSpies.http++; state.wires.push(request); state.events.push('http');
        return wireResponse ? await wireResponse(request, state) : response(Buffer.from(JSON.stringify(upstream))); }, close() {} } });
  const ctx = { cfg: config, state, client: { async request(request) { state.calls.push(structuredClone({ ...request, signal: undefined }));
    state.events.push('client'); return http.request(request); } },
    audit: { async record(...args) { state.auditAttempts.push(args); state.events.push('audit:' + args[1]);
      if (auditFailure) await auditFailure(...args);
      await realAudit.record(...args); state.audits.push(args); } },
    ...(approve ? { approve: async message => { state.prompts.push(message); return approve(message); } } : {}) };
  return { ctx, state, http, close: () => http.close() };
}
export const invoke = (h, id, args = {}, signal) => callTool(operations[id]?.tool ?? 'darktrace_unavailable', { operation: id, ...args }, h.ctx, signal);
export const checkpoint = h => ({ ...globalThis.__writeSpies, starts: h.state.auditAttempts.filter(a => ['start', 'ok', 'unknown'].includes(a[1])).length,
  calls: h.state.calls.length, prompts: h.state.prompts.length, audits: h.state.audits.length });
export function zero(h, before, elicitation = 0) {
  const after = checkpoint(h);
  for (const key of ['builder', 'signer', 'hmac', 'dns', 'socket', 'connector', 'http', 'starts', 'calls']) assert.equal(after[key] - before[key], 0, 'ZERO ' + key);
  assert.equal(after.prompts - before.prompts, elicitation, 'elicitation count');
}
export const messages = {
  operation_denied: 'Operation is not permitted by the active profile.', invalid_arguments: 'Invalid operation arguments.',
  target_denied: 'Target is not permitted by operator policy.', blast_radius_exceeded: 'Operation exceeds the configured target limit.',
  confirmation_required: 'Critical execution requires confirm:true.', preview_required: 'Critical execution requires a previewId.',
  preview_invalid: 'Preview is invalid for this operation and session.', preview_expired: 'Preview has expired.', preview_used: 'Preview has already been used.',
  approval_unavailable: 'Client does not support required human approval.', approval_denied: 'Human approval was not granted.',
  approval_timeout: 'Human approval deadline exceeded.', approval_busy: 'Human approval capacity exceeded.',
  audit_unavailable: 'Required write audit is unavailable.', audit_failed: 'Write completed but terminal audit failed.',
  write_outcome_unknown: 'Write outcome is unknown; do not retry automatically.', write_rate_limited: 'Write rate limit exceeded.',
  critical_rate_limited: 'Critical write rate limit exceeded.', write_circuit_open: 'Write circuit is open; operator intervention is required.',
  upstream_forbidden: 'Appliance denied this operation.', upstream_error: 'Appliance request failed.', schema_mismatch: 'Response does not match the pinned operation schema.',
  response_limit_exceeded: 'Response exceeds the configured byte limit.', output_limit_exceeded: 'Result exceeds the configured output limit.',
  unsupported_encoding: 'Response encoding is not supported.', request_cancelled: 'Request was cancelled.',
};
export function denial(result, code) {
  assert.equal(result.isError, true, code + ' is an error');
  assert.deepEqual(result.structuredContent.error, { code, message: messages[code] });
  assert.deepEqual(result.content, [{ type: 'text', text: JSON.stringify(result.structuredContent) }]);
  noCanaries(result);
}
export async function previewOf(h, id = criticalId, args = criticalArgs) {
  const before = checkpoint(h), result = await invoke(h, id, { ...args, dryRun: true });
  zero(h, before); assert.equal(result.isError, undefined); assert.match(result.structuredContent.previewId, /^[a-f0-9]{32}$/);
  return result.structuredContent.previewId;
}
export async function execute(h, id = criticalId, args = criticalArgs) {
  const previewId = await previewOf(h, id, args); return invoke(h, id, { ...args, confirm: true, previewId });
}
export function fakeClock(t) {
  const original = Date, clock = { now: Date.UTC(2026, 9, 6, 12) };
  globalThis.Date = class extends original {
    constructor(...args) { super(...(args.length ? args : [clock.now])); }
    static now() { return clock.now; }
  };
  t.after(() => { globalThis.Date = original; }); return clock;
}
export function scriptedServer(t, extra = {}) {
  const child = spawn(process.execPath, ['--import', fileURLToPath(new URL('./writes-preload.mjs', import.meta.url)), 'dist/src/index.js'],
    { env: env({ AD_W_FAKE_TRANSPORT: '1', DARKTRACE_PROFILES: 'all', ...extra }), stdio: ['pipe', 'pipe', 'pipe'] });
  let text = '', stderr = '', next = 1;
  const frames = [], waiters = new Map(), methods = new Map();
  const timer = setTimeout(() => child.kill('SIGKILL'), 8000);
  const done = new Promise(resolve => child.once('exit', (code, signal) => { clearTimeout(timer); resolve({ code, signal, stderr, frames }); }));
  child.stdin.on('error', () => {}); child.stderr.on('data', chunk => stderr += chunk);
  child.stdout.on('data', chunk => { text += chunk; let end; while ((end = text.indexOf('\n')) >= 0) {
    const frame = JSON.parse(text.slice(0, end)); text = text.slice(end + 1); frames.push(frame);
    if (frame.method) { methods.get(frame.method)?.(frame); methods.delete(frame.method); }
    else { waiters.get(frame.id)?.(frame); waiters.delete(frame.id); }
  } });
  const send = frame => child.stdin.write(JSON.stringify(frame) + '\n');
  const request = (method, params) => { const id = next++; const promise = new Promise(resolve => waiters.set(id, resolve)); send({ jsonrpc: '2.0', id, method, params }); return promise; };
  const notification = (method, params) => send({ jsonrpc: '2.0', method, ...(params ? { params } : {}) });
  const waitMethod = method => new Promise(resolve => methods.set(method, resolve));
  t.after(async () => { child.stdin.end(); child.kill('SIGTERM'); await done; });
  return { child, frames, done, request, notification, send, waitMethod, stderr: () => stderr,
    async init(capabilities = { elicitation: {} }) { await request('initialize', { protocolVersion: '2025-06-18', capabilities,
      clientInfo: { name: 'scripted-adversarial-model', version: '1' } }); notification('notifications/initialized'); } };
}
