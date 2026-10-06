// Standalone Darktrace/EMAIL diagnosis probe (operator execution only, owner-authorised non-production lab).
//
// Purpose: explain why every `/agemail/api/ep/api/v1.0/...` read answers 403 while the same signing is accepted
// for Threat Visualizer reads. Each probe varies ONE facet (route, query, date format, query encoding in the
// signature, signed path prefix, Accept header, deliberately wrong signature, no credentials) so the appliance's
// answer is the only variable measured. Verdicts: 400/401 => SIGNING, 403 => PERMISSION, 404/302 => ROUTE.
//
// Safety contract (do not weaken):
//   * Token values are read from files inside this process only. They are NEVER printed, logged, written or placed
//     in argv. Signatures and canonical strings are never emitted; only a description of the variant is recorded.
//   * Only GET requests plus ONE read-via-POST (`emails/search` with an empty filter and limit 1). No email action,
//     no write of any kind.
//   * Response bodies are not stored. For non-2xx JSON or text error answers, the first 200 characters are kept
//     after a token-value scrub; 2xx bodies are reduced to status, byte size and top-level key names.
//
// Usage: node scripts/lab-email-probe.mjs [origin]
//   DARKTRACE_URL (or argv[2]) selects the lab; DARKTRACE_PUBLIC_TOKEN_FILE / DARKTRACE_PRIVATE_TOKEN_FILE select the
//   token files (default: ~/.config/darktrace-mcp-lab-c/{public,private}-token). Evidence JSON is written under
//   docs/security/evidence/.

import { createHmac } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { request as httpsRequest } from 'node:https';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { homedir } from 'node:os';

const root = fileURLToPath(new URL('../', import.meta.url));
const HOME = homedir();
const ORIGIN = process.argv[2] ?? process.env.DARKTRACE_URL;
if (!ORIGIN) { console.error('Usage: node scripts/lab-email-probe.mjs <https://appliance> (or set DARKTRACE_URL); no appliance URL is built in.'); process.exit(2); }
const PUBLIC_TOKEN_FILE = process.env.DARKTRACE_PUBLIC_TOKEN_FILE ?? resolve(HOME, '.config/darktrace-mcp-lab-c/public-token');
const PRIVATE_TOKEN_FILE = process.env.DARKTRACE_PRIVATE_TOKEN_FILE ?? resolve(HOME, '.config/darktrace-mcp-lab-c/private-token');
const REQUEST_TIMEOUT_MS = 30000;
const GAP_MS = 400;
const BODY_LIMIT = 2_000_000;

function loadToken(path) {
  const value = readFileSync(path, 'utf8').replace(/[\r\n]+$/, '').trim();
  if (value.length === 0) throw new Error(`empty token file: ${path}`);
  return value;
}
const publicToken = loadToken(PUBLIC_TOKEN_FILE);
const privateToken = loadToken(PRIVATE_TOKEN_FILE);

function scrub(text) {
  let out = text;
  for (const secret of [publicToken, privateToken]) out = out.split(secret).join('[REDACTED]');
  return out.replace(/[\r\n\t]+/g, ' ');
}
function encodeRfc3986(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}
function pairsToText(pairs, encoded) {
  const enc = encoded ? encodeRfc3986 : (x) => x;
  return pairs.map(([k, v]) => `${enc(k)}=${enc(v)}`).join('&');
}
function formatApiDate(date, format) {
  const iso = date.toISOString().slice(0, 19);
  return format === 'spaced' ? iso.replace('T', ' ') : iso.replace(/[-:]/g, '');
}
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function verdictFor(status) {
  if (status === null) return 'NETWORK';
  if (status >= 200 && status < 300) return 'OK';
  if (status === 400 || status === 401) return 'SIGNING';
  if (status === 403) return 'PERMISSION';
  if (status === 404 || (status >= 300 && status < 400)) return 'ROUTE';
  return 'OTHER';
}

/**
 * probe: {
 *   label, method, path, query (ordered pairs), body (object|undefined),
 *   dateFormat 'compact'|'spaced', encodeSig bool, signedPathOverride (string|undefined),
 *   auth 'valid'|'wrong-signature'|'none', accept string
 * }
 */
function send(p) {
  const base = new URL(ORIGIN);
  const query = p.query ?? [];
  const wireQuery = pairsToText(query, true);
  const wirePath = wireQuery ? `${p.path}?${wireQuery}` : p.path;
  const signedBase = p.signedPathOverride ?? p.path;
  const sigQuery = pairsToText(query, p.encodeSig ?? false);
  let signed = sigQuery ? `${signedBase}?${sigQuery}` : signedBase;
  let bodyBytes;
  if (p.body !== undefined) {
    const json = JSON.stringify(p.body);
    bodyBytes = Buffer.from(json, 'utf8');
    signed += (signed.includes('?') ? '&' : '?') + json;
  }
  const date = formatApiDate(new Date(), p.dateFormat ?? 'compact');
  const headers = { 'User-Agent': 'darktrace-mcp', Accept: p.accept ?? 'application/json', 'Accept-Encoding': 'identity' };
  if (p.auth !== 'none') {
    let signature = createHmac('sha1', privateToken).update(`${signed}\n${publicToken}\n${date}`, 'utf8').digest('hex');
    if (p.auth === 'wrong-signature') signature = createHmac('sha1', 'not-the-private-token').update(signed, 'utf8').digest('hex');
    headers['DTAPI-Token'] = publicToken;
    headers['DTAPI-Date'] = date;
    headers['DTAPI-Signature'] = signature;
  }
  if (bodyBytes !== undefined) {
    headers['Content-Type'] = 'application/json';
    headers['Content-Length'] = String(bodyBytes.byteLength);
  }
  const startedAt = performance.now();
  return new Promise((done) => {
    const req = httpsRequest({ protocol: base.protocol, hostname: base.hostname, port: base.port || 443, path: wirePath,
      method: p.method, headers, servername: base.hostname, timeout: REQUEST_TIMEOUT_MS }, (res) => {
      const chunks = [];
      let total = 0;
      res.on('data', (c) => { total += c.length; if (total <= BODY_LIMIT) chunks.push(c); });
      res.on('end', () => {
        const status = res.statusCode ?? null;
        const contentType = res.headers['content-type'] ?? null;
        const text = Buffer.concat(chunks).toString('utf8');
        let jsonParsed = null;
        let topLevel = null;
        let errorPreview = null;
        if (total > 0) {
          try {
            const parsed = JSON.parse(text);
            jsonParsed = true;
            topLevel = Array.isArray(parsed) ? `array(${parsed.length})` : (parsed && typeof parsed === 'object' ? Object.keys(parsed).slice(0, 20) : typeof parsed);
          } catch { jsonParsed = false; }
        }
        if (status !== null && (status < 200 || status >= 300) && total > 0) {
          const looksHtml = /^\s*</.test(text);
          errorPreview = looksHtml ? `[html ${total} bytes; title: ${scrub(text.match(/<title>([^<]{0,120})<\/title>/i)?.[1] ?? '')}]` : scrub(text.slice(0, 200));
        }
        done({ label: p.label, method: p.method, path: p.path, query: query.map(([k]) => k), variant: p.variant ?? '',
          status, verdict: verdictFor(status), contentType, responseBytes: total, jsonParsed,
          topLevel: status >= 200 && status < 300 ? topLevel : null, errorPreview,
          location: status >= 300 && status < 400 ? String(res.headers.location ?? '').replace(/\?.*$/, '?…') : null,
          elapsedMs: Math.round(performance.now() - startedAt) });
      });
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', (err) => done({ label: p.label, method: p.method, path: p.path, variant: p.variant ?? '', status: null,
      verdict: 'NETWORK', error: String(err.code ?? err.message ?? 'network_error'), elapsedMs: Math.round(performance.now() - startedAt) }));
    if (bodyBytes !== undefined) req.write(bodyBytes);
    req.end();
  });
}

const E = '/agemail/api/ep/api/v1.0';
const WEEK = [['days', '7'], ['limit', '10']];
const probes = [
  // (a) controls with the same signing
  { label: 'control', method: 'GET', path: '/status', variant: 'compact date' },
  { label: 'control', method: 'GET', path: '/status', variant: 'spaced date', dateFormat: 'spaced' },
  { label: 'control', method: 'GET', path: '/tags', variant: 'compact date' },
  { label: 'control', method: 'GET', path: '/modelbreaches', query: [['count', '1']], variant: 'query, unencoded sig' },
  { label: 'control-neg', method: 'GET', path: '/status', variant: 'wrong signature', auth: 'wrong-signature' },
  { label: 'control-neg', method: 'GET', path: '/status', variant: 'no credentials', auth: 'none' },
  // (b) the 13 reads exactly as the catalogue builds them (no optional query)
  { label: 'catalogue', method: 'GET', path: `${E}/dash/action_summary` },
  { label: 'catalogue', method: 'GET', path: `${E}/dash/dash_stats` },
  { label: 'catalogue', method: 'GET', path: `${E}/dash/data_loss` },
  { label: 'catalogue', method: 'GET', path: `${E}/dash/user_anomaly` },
  { label: 'catalogue', method: 'GET', path: `${E}/resources/tags` },
  { label: 'catalogue', method: 'GET', path: `${E}/resources/actions` },
  { label: 'catalogue', method: 'GET', path: `${E}/resources/filters` },
  { label: 'catalogue', method: 'GET', path: `${E}/system/audit/eventTypes` },
  { label: 'catalogue', method: 'GET', path: `${E}/system/audit/events`, query: [['limit', '5']] },
  { label: 'catalogue', method: 'GET', path: `${E}/admin/decode_link`, query: [['link', 'https://example.com/']], variant: 'link query' },
  { label: 'catalogue', method: 'GET', path: `${E}/emails/00000000-0000-0000-0000-000000000000`, variant: 'placeholder uuid' },
  { label: 'catalogue', method: 'GET', path: `${E}/emails/00000000-0000-0000-0000-000000000000/download`, variant: 'placeholder uuid', accept: 'application/octet-stream' },
  { label: 'catalogue', method: 'POST', path: `${E}/emails/search`, body: { limit: 1 }, variant: 'read-via-POST, minimal body' },
  // (c) variants supported by the SDK evidence
  { label: 'variant', method: 'GET', path: `${E}/dash/dash_stats`, query: WEEK, variant: 'SDK days+limit, unencoded sig' },
  { label: 'variant', method: 'GET', path: `${E}/dash/dash_stats`, query: WEEK, variant: 'SDK days+limit, encoded sig', encodeSig: true },
  { label: 'variant', method: 'GET', path: `${E}/dash/dash_stats`, query: WEEK, variant: 'SDK days+limit, spaced date', dateFormat: 'spaced' },
  { label: 'variant', method: 'GET', path: `${E}/dash/dash_stats`, variant: 'spaced date, no query', dateFormat: 'spaced' },
  { label: 'variant', method: 'GET', path: `${E}/dash/dash_stats`, variant: 'Accept */*', accept: '*/*' },
  { label: 'variant', method: 'GET', path: `${E}/admin/decode_link`, query: [['link', 'https://example.com/a b']], variant: 'link with space, encoded sig', encodeSig: true },
  { label: 'variant', method: 'GET', path: `${E}/admin/decode_link`, query: [['link', 'https://example.com/a b']], variant: 'link with space, unencoded sig' },
  { label: 'variant', method: 'GET', path: `${E}/dash/dash_stats`, variant: 'signed WITHOUT /agemail prefix', signedPathOverride: '/api/ep/api/v1.0/dash/dash_stats' },
  { label: 'variant', method: 'GET', path: `${E}/dash/dash_stats`, variant: 'wrong signature', auth: 'wrong-signature' },
  { label: 'variant', method: 'GET', path: `${E}/dash/dash_stats`, variant: 'no credentials', auth: 'none' },
  { label: 'variant', method: 'GET', path: `${E}/resources/filters`, variant: 'wrong signature', auth: 'wrong-signature' },
  // route sanity: instance-local Email OpenAPI and an unknown sibling route
  { label: 'route', method: 'GET', path: '/agemail/api/api-docs', variant: 'instance Email OpenAPI' },
  { label: 'route', method: 'GET', path: `${E}/dash/does_not_exist`, variant: 'unknown route under prefix' },
  { label: 'route', method: 'GET', path: '/agemail/', variant: 'Email UI root' },
];

const results = [];
for (const p of probes) {
  const r = await send(p);
  results.push(r);
  const extra = r.errorPreview ? ` | ${r.errorPreview}` : (r.topLevel ? ` | keys=${JSON.stringify(r.topLevel)}` : '');
  console.log(`${String(r.status).padEnd(4)} ${r.verdict.padEnd(10)} ${r.method.padEnd(4)} ${r.path}${r.query?.length ? '?' + r.query.join('&') : ''} [${r.variant}] ${r.responseBytes ?? 0}B ${r.contentType ?? ''}${r.location ? ' -> ' + r.location : ''}${extra}`);
  await delay(GAP_MS);
}

const outDir = resolve(root, 'docs/security/evidence');
mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const out = resolve(outDir, `lab-email-probe-${stamp}.json`);
writeFileSync(out, `${JSON.stringify({ origin: new URL(ORIGIN).hostname, takenAt: new Date().toISOString(), results }, null, 2)}\n`);
console.log(`evidence: ${out.slice(root.length)}`);
