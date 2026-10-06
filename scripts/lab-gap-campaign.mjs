#!/usr/bin/env node
// Lab gap campaign driver (1.1.1). Drives the built server (dist/src/index.js) over MCP stdio against an
// owner-authorised lab appliance, exactly as a client would, and prints one line per call with the outcome only.
//
// Usage:
//   LAB_URL=https://<lab>.visualiser.labs.darktrace.com node scripts/lab-gap-campaign.mjs <calls.json>
//
// calls.json is a JSON array of steps:
//   "list"                                           list tool names
//   {"tool":"...","args":{...}}                      ordinary call (writes run directly; host approval mode)
//   {"tool":"...","critical":true,"args":{...}}      critical flow: dryRun preview -> confirm:true + previewId,
//                                                    answering the server confirmation dialog with approved:true
//   {"sleep":ms}                                     pause (bounded to 60 s)
// Optional per-step "label" is echoed. Set SHOW=<n> to print the first n characters of each result
// (default 0: outcome, HTTP-derived status and size only, never the payload).
//
// Secrets: tokens are read by the server from the 0600 token files below; this script never reads, prints or
// forwards token values. Only use against an appliance whose owner authorised the writes in the calls file.
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const TOKEN_DIR = process.env.LAB_TOKEN_DIR ?? `${os.homedir()}/.config/darktrace-mcp-lab`;
const entry = fileURLToPath(new URL('../dist/src/index.js', import.meta.url));

export async function startServer({ elicit = 'accept' } = {}) {
  if (!process.env.LAB_URL) throw new Error('LAB_URL is required');
  const env = {
    PATH: process.env.PATH, HOME: process.env.HOME,
    DARKTRACE_URL: process.env.LAB_URL,
    DARKTRACE_PUBLIC_TOKEN_FILE: `${TOKEN_DIR}/public-token`,
    DARKTRACE_PRIVATE_TOKEN_FILE: `${TOKEN_DIR}/private-token`,
    DARKTRACE_PROFILES: 'all',
    DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE: 'true',
    DARKTRACE_DATE_FORMAT: process.env.LAB_DATE_FORMAT ?? 'compact',
  };
  const tap = process.env.LAB_STATUS_TAP === '1' ? ['--import', fileURLToPath(new URL('./lab-status-tap.mjs', import.meta.url))] : [];
  const child = spawn(process.execPath, [...tap, entry], { env, stdio: ['pipe', 'pipe', 'pipe'] });
  let buf = ''; let stderr = ''; let id = 0;
  const pending = new Map();
  child.stderr.on('data', d => { stderr += d; });
  child.stdout.on('data', d => {
    buf += d; let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i); buf = buf.slice(i + 1);
      if (!line.trim()) continue;
      const m = JSON.parse(line);
      if (m.id !== undefined && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); continue; }
      if (m.method === 'elicitation/create') {
        console.log('  [confirmation dialog] ->', elicit);
        const result = elicit === 'accept' ? { action: 'accept', content: { approved: true } } : { action: elicit };
        child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: m.id, result }) + '\n');
      }
    }
  });
  const send = (method, params) => new Promise(res => {
    const mid = ++id; pending.set(mid, res);
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: mid, method, params }) + '\n');
  });
  const init = await send('initialize', { protocolVersion: '2025-06-18', capabilities: { elicitation: {} }, clientInfo: { name: 'lab-gap-campaign', version: '1' } });
  if (init.error) throw new Error(`initialize failed: ${init.error.message}`);
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
  const call = async (name, args) => {
    const r = await send('tools/call', { name, arguments: args ?? {} });
    return { ok: Boolean(r.result && !r.result.isError), sc: r.result?.structuredContent ?? r.error ?? null };
  };
  const critical = async (name, args) => {
    const p = await call(name, { ...args, dryRun: true });
    if (!p.ok || !p.sc?.previewId) return { ok: false, sc: p.sc, stage: 'preview' };
    const e = await call(name, { ...args, confirm: true, previewId: p.sc.previewId });
    return { ...e, stage: 'execute' };
  };
  // Audit lines on stderr carry outcome metadata only (no token values); expose the outcome fields for the record.
  const auditOutcomes = () => stderr.split('\n').filter(l => l.includes('"outcome"')).map(l => {
    try { const j = JSON.parse(l); return { operation: j.operation ?? j.operationId, outcome: j.outcome, status: j.status ?? j.httpStatus }; } catch { return null; }
  }).filter(Boolean);
  // With LAB_STATUS_TAP=1: the HTTP status of each appliance response (method, route prefix, status only).
  const statuses = () => stderr.split('\n').filter(l => l.startsWith('{"labTap"')).map(l => JSON.parse(l));
  const stop = () => new Promise(res => { child.stdin.end(); setTimeout(() => { child.kill(); res(); }, 300); });
  return { call, critical, send, stop, auditOutcomes, statuses, stderr: () => stderr };
}

function summarise(sc, show) {
  const txt = JSON.stringify(sc ?? null);
  const code = sc?.error?.code ?? sc?.code ?? sc?.outcome ?? '';
  return `${txt.length}b${code ? ` code=${code}` : ''}${show ? ` ${txt.slice(0, show)}` : ''}`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const steps = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  const show = Number(process.env.SHOW ?? 0);
  const s = await startServer({ elicit: process.env.ELICIT ?? 'accept' });
  for (const step of steps) {
    if (step === 'list') { const r = await s.send('tools/list', {}); console.log('TOOLS', r.result.tools.map(t => t.name).join(',')); continue; }
    if (step.sleep) { await new Promise(r => setTimeout(r, Math.min(step.sleep, 60_000))); continue; }
    const t0 = Date.now();
    const r = step.critical ? await s.critical(step.tool, step.args) : await s.call(step.tool, step.args);
    console.log(`${r.ok ? 'OK  ' : 'FAIL'} ${step.label ?? ''} ${step.tool} ${step.args?.operation ?? ''} ${Date.now() - t0}ms ${summarise(r.sc, show)}`);
  }
  await s.stop();
  if (process.env.AUDIT) for (const a of s.auditOutcomes()) console.log('AUDIT', JSON.stringify(a));
  for (const t of s.statuses()) console.log('HTTP', t.method, t.route, t.status);
}
