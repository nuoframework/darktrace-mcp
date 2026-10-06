#!/usr/bin/env node
// Schema-only summary of a browser HAR capture of the Darktrace/EMAIL console.
//
// Usage: node scripts/analysis/har-email-summary.mjs <capture.har> [--all] [--json] [--max-keys=N]
//
// The HAR is confidential (session material, user names, addresses, subjects, bodies).
// This tool prints ONLY derived, non-personal shape information:
//   * method and URL path with the host stripped and identifier-like segments templated
//   * query parameter NAMES
//   * request body JSON key paths with value TYPES (never values)
//   * response status, response JSON key paths with value TYPES (never values)
//   * request/response header NAMES (never values); cookies are reported as a count only
// Object keys that look like data (addresses, identifiers, numbers, dates, free text,
// domains) are collapsed to <key> so a key can never leak a value.
//
// Objects with more than --max-keys keys (default 100) are treated as maps (field dictionaries,
// locale tables) and their keys are collapsed to <key> too, to keep the output reviewable.
// By default only Darktrace/EMAIL routes are summarised (paths containing "agemail" or
// "email-respond"); pass --all to include every request in the capture.
// Node 22+, no dependencies, read-only.

import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const harPath = args.find((a) => !a.startsWith('--'));
const includeAll = args.includes('--all');
const asJson = args.includes('--json');
if (!harPath) {
  process.stderr.write('usage: har-email-summary.mjs <capture.har> [--all] [--json] [--max-keys=N]\n');
  process.exit(2);
}

const MAX_DEPTH = 12;
const maxKeysArg = args.find((a) => a.startsWith('--max-keys='));
const MAX_KEYS = maxKeysArg ? Number(maxKeysArg.split('=')[1]) : 100;
const EMAIL_ROUTE = /agemail|email-respond/i;

// ---- templating: anything identifier-like or personal becomes a placeholder ----
function templateSegment(seg) {
  let s;
  try { s = decodeURIComponent(seg); } catch { s = seg; }
  if (s === '') return s;
  if (/[^\s]\x40[^\s]/.test(s)) return '{address}';
  // Message ids carry an instance suffix (<uuid>.<n>); strip it before matching.
  const base = s.replace(/[.:]\d+$/, '');
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(base)) return '{uuid}';
  if (/^\d+$/.test(base)) return '{n}';
  if (/^[0-9a-f]{16,}$/i.test(s)) return '{hex}';
  if (/^[A-Za-z0-9+/_=-]{20,}$/.test(s) && /\d/.test(s)) return '{token}';
  if (/\s|%/.test(s) || s.length > 40) return '{value}';
  return s;
}

function templatePath(pathname) {
  return pathname.split('/').map(templateSegment).join('/');
}

function isDataKey(k) {
  return (
    k.length === 0 ||
    k.length > 40 ||
    /\x40/.test(k) ||
    /^\d/.test(k) ||
    /^[0-9a-f]{12,}$/i.test(k) ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(k) ||
    /[^A-Za-z0-9_$-]/.test(k) // spaces, dots (domains), punctuation, non-ASCII
  );
}
const safeKey = (k) => (isDataKey(k) ? '<key>' : k);

function typeOf(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v; // string | number | boolean | object
}

/** Walk a JSON value and record path -> Set(types). Never records a value. */
function walk(v, path, out, depth) {
  const t = typeOf(v);
  const key = path || '$';
  if (!out.has(key)) out.set(key, new Set());
  out.get(key).add(t);
  if (depth >= MAX_DEPTH) return;
  if (t === 'array') {
    for (const item of v) walk(item, `${path}[]`, out, depth + 1);
  } else if (t === 'object') {
    const isMap = Object.keys(v).length > MAX_KEYS;
    for (const [k, child] of Object.entries(v)) {
      const name = isMap ? '<key>' : safeKey(k);
      walk(child, path ? `${path}.${name}` : name, out, depth + 1);
    }
  }
}

function parseJson(text) {
  if (typeof text !== 'string' || text.length === 0) return { ok: false };
  try { return { ok: true, value: JSON.parse(text) }; } catch { return { ok: false }; }
}

function bodyText(content) {
  if (!content || typeof content.text !== 'string') return undefined;
  if (content.encoding === 'base64') {
    try { return Buffer.from(content.text, 'base64').toString('utf8'); } catch { return undefined; }
  }
  return content.text;
}

const mime = (m) => String(m || '').split(';')[0].trim().toLowerCase() || 'none';

// ---- aggregate per (method, templated path) ----
const har = JSON.parse(readFileSync(harPath, 'utf8'));
const entries = har?.log?.entries ?? [];
const groups = new Map();

for (const e of entries) {
  let url;
  try { url = new URL(e.request.url); } catch { continue; }
  if (!includeAll && !EMAIL_ROUTE.test(url.pathname)) continue;
  const id = `${e.request.method} ${templatePath(url.pathname)}`;
  if (!groups.has(id)) {
    groups.set(id, {
      method: e.request.method,
      path: templatePath(url.pathname),
      count: 0,
      statuses: new Set(),
      queryNames: new Set(),
      requestHeaderNames: new Set(),
      responseHeaderNames: new Set(),
      requestCookieCount: 0,
      responseSetCookieCount: 0,
      requestMime: new Set(),
      requestBody: new Map(),
      requestBodyNonJson: false,
      responseMime: new Set(),
      responseBody: new Map(),
      responseBodyNonJson: false,
    });
  }
  const g = groups.get(id);
  g.count += 1;
  g.statuses.add(e.response?.status);
  for (const name of url.searchParams.keys()) g.queryNames.add(safeKey(name));
  for (const h of e.request.headers ?? []) g.requestHeaderNames.add(String(h.name).toLowerCase());
  for (const h of e.response?.headers ?? []) g.responseHeaderNames.add(String(h.name).toLowerCase());
  g.requestCookieCount += (e.request.cookies ?? []).length;
  g.responseSetCookieCount += (e.response?.cookies ?? []).length;

  const post = e.request.postData;
  if (post) {
    g.requestMime.add(mime(post.mimeType));
    const parsed = parseJson(post.text);
    if (parsed.ok) walk(parsed.value, '', g.requestBody, 0);
    else if (post.text || (post.params ?? []).length) {
      g.requestBodyNonJson = true;
      for (const p of post.params ?? []) g.requestBody.set(`(form) ${safeKey(String(p.name))}`, new Set(['field']));
    }
  }
  const content = e.response?.content;
  if (content) {
    g.responseMime.add(mime(content.mimeType));
    const parsed = parseJson(bodyText(content));
    if (parsed.ok) walk(parsed.value, '', g.responseBody, 0);
    else if (content.size > 0) g.responseBodyNonJson = true;
  }
}

const sorted = [...groups.values()].sort((a, b) => (a.path + a.method).localeCompare(b.path + b.method));
const shape = (m) => [...m.entries()].map(([p, t]) => `${p}: ${[...t].sort().join('|')}`);

if (asJson) {
  const out = sorted.map((g) => ({
    method: g.method,
    path: g.path,
    count: g.count,
    statuses: [...g.statuses].sort(),
    queryParameterNames: [...g.queryNames].sort(),
    requestHeaderNames: [...g.requestHeaderNames].sort(),
    responseHeaderNames: [...g.responseHeaderNames].sort(),
    requestCookieCount: g.requestCookieCount,
    responseSetCookieCount: g.responseSetCookieCount,
    requestContentTypes: [...g.requestMime].sort(),
    requestBodyKeyPaths: shape(g.requestBody),
    requestBodyNonJson: g.requestBodyNonJson,
    responseContentTypes: [...g.responseMime].sort(),
    responseKeyPaths: shape(g.responseBody),
    responseBodyNonJson: g.responseBodyNonJson,
  }));
  process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
} else {
  const lines = [`entries in capture: ${entries.length}; summarised routes: ${sorted.length}`, ''];
  for (const g of sorted) {
    lines.push(`== ${g.method} ${g.path}  (x${g.count}; status ${[...g.statuses].sort().join(',')})`);
    lines.push(`   query names: ${[...g.queryNames].sort().join(', ') || '-'}`);
    lines.push(`   request header names: ${[...g.requestHeaderNames].sort().join(', ') || '-'}`);
    lines.push(`   response header names: ${[...g.responseHeaderNames].sort().join(', ') || '-'}`);
    lines.push(`   cookies sent: ${g.requestCookieCount}; cookies set: ${g.responseSetCookieCount}`);
    if (g.requestBody.size || g.requestBodyNonJson) {
      lines.push(`   request body (${[...g.requestMime].join(',')})${g.requestBodyNonJson ? ' [non-JSON]' : ''}:`);
      for (const l of shape(g.requestBody)) lines.push(`     ${l}`);
    }
    lines.push(`   response (${[...g.responseMime].join(',')})${g.responseBodyNonJson ? ' [non-JSON body]' : ''}:`);
    for (const l of shape(g.responseBody)) lines.push(`     ${l}`);
    lines.push('');
  }
  process.stdout.write(`${lines.join('\n')}\n`);
}
