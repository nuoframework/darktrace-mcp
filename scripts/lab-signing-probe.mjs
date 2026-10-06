// Standalone lab signing-probe harness (operator execution only, owner-authorised non-production lab).
//
// Purpose: obtain live, INDEPENDENT evidence of which Darktrace API signing shapes a
// 7.1.0 appliance accepts for the forms this project historically blocked (S1, S4, S5,
// S6, S7, S9 and the PCAP content-type). It replicates the HMAC-SHA1 scheme used by
// src/client/signer.ts but lets each probe vary ONE facet of the canonical string so the
// appliance's own acceptance is the only variable measured.
//
// Safety contract (do not weaken):
//   * Token values are read from files inside this process only. They are NEVER printed,
//     logged, copied into output, or placed in argv. Signatures and canonical strings are
//     likewise never emitted; only a human description of the canonical FORMAT is recorded.
//   * Response BODIES are never stored. Only status, json-parseability, byte size, elapsed
//     time, and content-type are recorded.
//   * The only writes performed are: create probe tags named mcp-probe-<...>-<timestamp>,
//     assign one such tag to a device discovered read-only, then delete both. Every created
//     object is tracked and removed in a finally block, and removal is verified.
//
// Node 22+, no dependencies, read-only on the repository except the JSON evidence file it
// writes under docs/security/evidence/.

import { createHmac } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { request as httpsRequest } from 'node:https';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { homedir } from 'node:os';

const root = fileURLToPath(new URL('../', import.meta.url));
const HOME = homedir();
const DEFAULT_URL = process.env.DARKTRACE_URL; // no built-in appliance URL
const PUBLIC_TOKEN_FILE = resolve(HOME, '.config/darktrace-mcp-lab/public-token');
const PRIVATE_TOKEN_FILE = resolve(HOME, '.config/darktrace-mcp-lab/private-token');
const REQUEST_TIMEOUT_MS = 30000;
const GAP_MS = 350; // gentle spacing between upstream calls

// ---- token loading (values stay in these two consts and never leave the process) ----
function loadToken(path) {
  const raw = readFileSync(path, 'utf8');
  const value = raw.replace(/[\r\n]+$/, '').trim();
  if (value.length === 0) throw new Error(`empty token file: ${path}`);
  return value;
}

// ---- encoding helpers (mirror src/client/signer.ts) ----
function encodeRfc3986(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}
function pairsToText(pairs, encoded) {
  return pairs
    .map(([k, v]) => {
      const enc = encoded ? encodeRfc3986 : (x) => x;
      return `${enc(k)}=${enc(v)}`;
    })
    .join('&');
}
function formPairsToText(pairs) {
  return pairs.map(([k, v]) => `${encodeRfc3986(k).replace(/%20/g, '+')}=${encodeRfc3986(v).replace(/%20/g, '+')}`).join('&');
}

// ---- date formatting (mirror formatApiDate; compact is the project default) ----
function formatApiDate(date, format) {
  const iso = date.toISOString().slice(0, 19);
  return format === 'spaced' ? iso.replace('T', ' ') : iso.replace(/[-:]/g, '');
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- low-level signed request ----
// canonical: the EXACT string signed, built by the caller to isolate one variant.
// wirePath: the relative path+query actually sent on the wire (always percent-encoded).
function makeSender(origin, publicToken, privateToken) {
  const base = new URL(origin);
  return function send({ method, wirePath, canonical, date, bodyBytes, contentType, accept = 'json' }) {
    const signature = createHmac('sha1', privateToken).update(canonical, 'utf8').digest('hex');
    const headers = {
      'DTAPI-Token': publicToken,
      'DTAPI-Date': date,
      'DTAPI-Signature': signature,
      'User-Agent': 'darktrace-mcp',
      Accept: accept === 'json' ? 'application/json' : 'application/octet-stream, application/vnd.tcpdump.pcap',
      'Accept-Encoding': 'identity',
    };
    if (bodyBytes !== undefined) {
      headers['Content-Type'] = contentType;
      headers['Content-Length'] = String(bodyBytes.byteLength);
    }
    const startedAt = performance.now();
    return new Promise((resolvePromise) => {
      const req = httpsRequest(
        {
          protocol: base.protocol,
          hostname: base.hostname,
          port: base.port || 443,
          path: wirePath,
          method,
          headers,
          servername: base.hostname,
          timeout: REQUEST_TIMEOUT_MS,
        },
        (res) => {
          const chunks = [];
          let total = 0;
          res.on('data', (c) => {
            total += c.length;
            if (total <= 2_000_000) chunks.push(c); // bounded; used only for json-parse check, never stored
          });
          res.on('end', () => {
            const elapsedMs = Math.round(performance.now() - startedAt);
            const ct = res.headers['content-type'] ?? null;
            let jsonParsed = null;
            if (accept === 'json' && total > 0) {
              try {
                JSON.parse(Buffer.concat(chunks).toString('utf8'));
                jsonParsed = true;
              } catch {
                jsonParsed = false;
              }
            }
            resolvePromise({ status: res.statusCode, jsonParsed, responseBytes: total, contentType: ct, elapsedMs });
          });
        },
      );
      req.on('timeout', () => req.destroy(new Error('timeout')));
      req.on('error', (err) => {
        const elapsedMs = Math.round(performance.now() - startedAt);
        resolvePromise({ status: null, jsonParsed: null, responseBytes: 0, contentType: null, elapsedMs, error: String(err.code ?? err.message ?? 'network_error') });
      });
      if (bodyBytes !== undefined) req.write(bodyBytes);
      req.end();
    });
  };
}

// ---- helpers to extract a value from a successful JSON response WITHOUT storing the body ----
function makeJsonReader(origin, publicToken, privateToken) {
  const base = new URL(origin);
  return function readJson({ method, wirePath, canonical, date, bodyBytes, contentType }) {
    const signature = createHmac('sha1', privateToken).update(canonical, 'utf8').digest('hex');
    const headers = {
      'DTAPI-Token': publicToken,
      'DTAPI-Date': date,
      'DTAPI-Signature': signature,
      'User-Agent': 'darktrace-mcp',
      Accept: 'application/json',
      'Accept-Encoding': 'identity',
    };
    if (bodyBytes !== undefined) {
      headers['Content-Type'] = contentType;
      headers['Content-Length'] = String(bodyBytes.byteLength);
    }
    return new Promise((resolvePromise) => {
      const req = httpsRequest(
        { protocol: base.protocol, hostname: base.hostname, port: base.port || 443, path: wirePath, method, headers, servername: base.hostname, timeout: REQUEST_TIMEOUT_MS },
        (res) => {
          const chunks = [];
          let total = 0;
          res.on('data', (c) => {
            total += c.length;
            if (total <= 2_000_000) chunks.push(c);
          });
          res.on('end', () => {
            let json;
            try {
              json = JSON.parse(Buffer.concat(chunks).toString('utf8'));
            } catch {
              json = undefined;
            }
            resolvePromise({ status: res.statusCode, json });
          });
        },
      );
      req.on('timeout', () => req.destroy(new Error('timeout')));
      req.on('error', (err) => resolvePromise({ status: null, json: undefined, error: String(err.code ?? err.message) }));
      if (bodyBytes !== undefined) req.write(bodyBytes);
      req.end();
    });
  };
}

async function main() {
  if (!process.env.DARKTRACE_URL && !DEFAULT_URL) { console.error('Set DARKTRACE_URL to the appliance origin (https://...); no appliance URL is built in.'); process.exit(2); }
  const origin = (process.env.DARKTRACE_URL ?? DEFAULT_URL).replace(/\/+$/, '');
  if (!origin.startsWith('https://')) throw new Error('DARKTRACE_URL must be https');
  const publicToken = loadToken(PUBLIC_TOKEN_FILE);
  const privateToken = loadToken(PRIVATE_TOKEN_FILE);
  const send = makeSender(origin, publicToken, privateToken);
  const readJson = makeJsonReader(origin, publicToken, privateToken);
  const now = () => formatApiDate(new Date(), 'compact');
  const nowSpaced = () => formatApiDate(new Date(), 'spaced');

  const results = [];
  const createdTagTids = [];
  const stamp = Date.now();
  let record = async (r) => {
    results.push(r);
    const flag = r.error ? `ERR ${r.error}` : `HTTP ${r.status}`;
    console.log(`  [${r.shape}] ${r.label}: ${flag}  (${r.responseBytes ?? '-'}B, ${r.elapsedMs}ms)`);
    await delay(GAP_MS);
  };

  console.log(`Lab signing probe against ${origin}`);
  console.log('Canonical scheme: <path?query[appended-body]> \\n <publicToken> \\n <DTAPI-Date>, HMAC-SHA1 hex.\n');

  // ===== Baseline: does the scheme authenticate at all? (S8) =====
  {
    const date = now();
    const r = await send({ method: 'GET', wirePath: '/tags', canonical: `/tags\n${publicToken}\n${date}`, date });
    await record({ ...r, shape: 'S8/base', label: 'GET /tags (path only, compact date)', method: 'GET', endpoint: '/tags', canonicalFormat: 'path only; no query', dateFormat: 'compact' });
    if (r.status === 401) {
      console.log('\nBaseline returned HTTP 401: the base signing scheme is not authenticating. Aborting before any writes.');
      return finish(results, origin, { aborted: 'baseline_401' });
    }
    if (r.error) {
      console.log(`\nBaseline network error (${r.error}). Aborting.`);
      return finish(results, origin, { aborted: `baseline_${r.error}` });
    }
  }

  // ===== Controls: how does the appliance signal a REJECTED signature? =====
  // Request /tags but sign a canonical for a DIFFERENT path, so only the signature is wrong.
  {
    const date = now();
    const r = await send({ method: 'GET', wirePath: '/tags', canonical: `/modelbreaches?minimal=true\n${publicToken}\n${date}`, date });
    await record({ ...r, shape: 'CTRL', label: 'GET /tags with a deliberately MISMATCHED signature (control)', method: 'GET', endpoint: '/tags', canonicalFormat: 'signed canonical for a different path (guaranteed mismatch)', dateFormat: 'compact', note: 'reveals which HTTP status the appliance uses for signature rejection' });
  }

  // ===== S7: date format acceptance =====
  {
    const sp = nowSpaced();
    const r1 = await send({ method: 'GET', wirePath: '/tags', canonical: `/tags\n${publicToken}\n${sp}`, date: sp });
    await record({ ...r1, shape: 'S7', label: 'GET /tags with spaced date (YYYY-MM-DD HH:MM:SS)', method: 'GET', endpoint: '/tags', canonicalFormat: 'path only; no query', dateFormat: 'spaced' });

    const skewed = formatApiDate(new Date(Date.now() + 31 * 60 * 1000), 'compact');
    const r2 = await send({ method: 'GET', wirePath: '/tags', canonical: `/tags\n${publicToken}\n${skewed}`, date: skewed });
    await record({ ...r2, shape: 'S7', label: 'GET /tags with compact date +31min (clock-skew probe)', method: 'GET', endpoint: '/tags', canonicalFormat: 'path only; no query', dateFormat: 'compact(+31min)' });
  }

  // ===== S1: query encoded vs unencoded in the signed string =====
  // Harmless unknown param carrying a space; the appliance ignores it for filtering but the
  // signature must still cover whatever is on the wire (always percent-encoded there).
  {
    // responsedata is a recognised param (kept in the server canonical); an unknown field
    // value is ignored for filtering, and the space forces an encoding difference.
    const pairs = [['count', '1'], ['responsedata', 'a b']];
    const wireQuery = pairsToText(pairs, true); // count=1&responsedata=a%20b
    const wirePath = `/devices?${wireQuery}`;
    const dEnc = now();
    const rEnc = await send({ method: 'GET', wirePath, canonical: `/devices?${pairsToText(pairs, true)}\n${publicToken}\n${dEnc}`, date: dEnc });
    await record({ ...rEnc, shape: 'S1', label: 'GET /devices query signed ENCODED (space as %20)', method: 'GET', endpoint: '/devices', canonicalFormat: 'path?query, query percent-encoded (count=1&responsedata=a%20b)', dateFormat: 'compact' });

    const dRaw = now();
    const rRaw = await send({ method: 'GET', wirePath, canonical: `/devices?${pairsToText(pairs, false)}\n${publicToken}\n${dRaw}`, date: dRaw });
    await record({ ...rRaw, shape: 'S1', label: 'GET /devices query signed UNENCODED (raw space)', method: 'GET', endpoint: '/devices', canonicalFormat: 'path?query, query unencoded (count=1&responsedata=a b); wire still %20', dateFormat: 'compact' });
  }

  // ===== S6: Advanced Search base64-in-path =====
  // Minimal bounded query: last 60s of dns logs. Response bodies are discarded.
  {
    const searchObj = { search: '@type:dns', fields: [], offset: 0, timeframe: '60', time: { user_interval: 0 } };
    const jsonStr = JSON.stringify(searchObj);
    const b64std = Buffer.from(jsonStr, 'utf8').toString('base64'); // may contain + / =
    const b64url = Buffer.from(jsonStr, 'utf8').toString('base64url'); // -_ , no padding
    const basePath = '/advancedsearch/api/search/';

    // standard base64, wire percent-encodes + / = ; canonical signs the RAW base64
    {
      const wirePath = basePath + encodeRfc3986(b64std);
      const d = now();
      const r = await send({ method: 'GET', wirePath, canonical: `${basePath}${b64std}\n${publicToken}\n${d}`, date: d });
      await record({ ...r, shape: 'S6', label: 'AdvSearch standard base64, signed RAW (wire %-encoded)', method: 'GET', endpoint: '/advancedsearch/api/search/{b64}', canonicalFormat: 'standard base64 in path signed un-encoded; wire percent-encodes +/=', dateFormat: 'compact' });
    }
    // standard base64, canonical signs the PERCENT-ENCODED form (matches wire)
    {
      const wirePath = basePath + encodeRfc3986(b64std);
      const d = now();
      const r = await send({ method: 'GET', wirePath, canonical: `${basePath}${encodeRfc3986(b64std)}\n${publicToken}\n${d}`, date: d });
      await record({ ...r, shape: 'S6', label: 'AdvSearch standard base64, signed PERCENT-ENCODED', method: 'GET', endpoint: '/advancedsearch/api/search/{b64}', canonicalFormat: 'standard base64 in path signed percent-encoded (same as wire)', dateFormat: 'compact' });
    }
    // url-safe base64 (no +/=), raw == encoded
    {
      const wirePath = basePath + b64url;
      const d = now();
      const r = await send({ method: 'GET', wirePath, canonical: `${basePath}${b64url}\n${publicToken}\n${d}`, date: d });
      await record({ ...r, shape: 'S6', label: 'AdvSearch URL-safe base64 (no padding)', method: 'GET', endpoint: '/advancedsearch/api/search/{b64url}', canonicalFormat: 'url-safe base64 in path; raw and wire identical (all unreserved)', dateFormat: 'compact' });
    }
  }

  // ===== S9: /agemail using the same HMAC scheme =====
  for (const ep of ['/agemail/api/ep/api/v1.0/dash/dash_stats', '/agemail/api/ep/api/v1.0/resources/filters']) {
    const d = now();
    const r = await send({ method: 'GET', wirePath: ep, canonical: `${ep}\n${publicToken}\n${d}`, date: d });
    await record({ ...r, shape: 'S9', label: `GET ${ep} (same HMAC scheme)`, method: 'GET', endpoint: ep, canonicalFormat: 'path only; no query', dateFormat: 'compact' });
  }

  // ===== PCAP content-type: GET /pcaps/{filename} (do NOT create pcaps) =====
  {
    const d = now();
    const listCanonical = `/pcaps\n${publicToken}\n${d}`;
    const list = await readJson({ method: 'GET', wirePath: '/pcaps', canonical: listCanonical, date: d });
    const dList = now();
    const rList = await send({ method: 'GET', wirePath: '/pcaps', canonical: `/pcaps\n${publicToken}\n${dList}`, date: dList });
    await record({ ...rList, shape: 'PCAP', label: 'GET /pcaps (list current pcaps)', method: 'GET', endpoint: '/pcaps', canonicalFormat: 'path only; no query', dateFormat: 'compact' });

    let filename;
    if (list.status === 200 && Array.isArray(list.json) && list.json.length > 0) {
      const first = list.json[0];
      filename = typeof first === 'string' ? first : first?.filename;
    }
    if (filename && /^[A-Za-z0-9._-]+$/.test(filename)) {
      const wirePath = `/pcaps/${encodeRfc3986(filename)}`;
      const d2 = now();
      const r = await send({ method: 'GET', wirePath, canonical: `/pcaps/${filename}\n${publicToken}\n${d2}`, date: d2, accept: 'binary' });
      await record({ ...r, shape: 'PCAP', label: 'GET /pcaps/{filename} (content-type of binary pcap)', method: 'GET', endpoint: '/pcaps/{filename}', canonicalFormat: 'path only (filename in path, no /tm prefix)', dateFormat: 'compact' });
    } else {
      await record({ shape: 'PCAP', label: 'GET /pcaps/{filename} SKIPPED (no existing pcap; creation out of scope)', method: 'GET', endpoint: '/pcaps/{filename}', canonicalFormat: 'n/a', dateFormat: 'n/a', status: null, jsonParsed: null, responseBytes: null, contentType: null, elapsedMs: 0, note: 'no pcap present to fetch; probe never generates pcaps' });
    }
  }

  // ===== S4: POST with BOTH query param and JSON body =====
  // Create probe tags; the only variant whose canonical the appliance accepts will not 401.
  // A 403 still means the SIGNATURE was accepted (token merely lacks Edit Tags).
  {
    const variants = [
      {
        key: 's4q',
        label: "S4 POST query+JSON: sign 'path?query&{json}' (SDK append style)",
        canonicalFormat: "path + '?' + query + '&' + json (SDK style)",
        build: (name) => {
          const json = JSON.stringify({ name, data: {} });
          const q = pairsToText([['responsedata', 'name']], true);
          return { canonicalCore: `/tags?${q}&${json}`, wirePath: `/tags?${q}`, json };
        },
      },
      {
        key: 's4j',
        label: "S4 POST query+JSON: sign 'path?{json}' (body only, query unsigned)",
        canonicalFormat: "path + '?' + json ; query present on wire but NOT in signature",
        build: (name) => {
          const json = JSON.stringify({ name, data: {} });
          const q = pairsToText([['responsedata', 'name']], true);
          return { canonicalCore: `/tags?${json}`, wirePath: `/tags?${q}`, json };
        },
      },
      {
        key: 's4Q',
        label: "S4 POST query+JSON: sign 'path?query' (query only, body unsigned)",
        canonicalFormat: "path + '?' + query ; body present on wire but NOT in signature",
        build: (name) => {
          const json = JSON.stringify({ name, data: {} });
          const q = pairsToText([['responsedata', 'name']], true);
          return { canonicalCore: `/tags?${q}`, wirePath: `/tags?${q}`, json };
        },
      },
    ];
    for (const v of variants) {
      const name = `mcp-probe-${v.key}-${stamp}`;
      const { canonicalCore, wirePath, json } = v.build(name);
      const bodyBytes = Buffer.from(json, 'utf8');
      const d = now();
      const r = await readJson({ method: 'POST', wirePath, canonical: `${canonicalCore}\n${publicToken}\n${d}`, date: d, bodyBytes, contentType: 'application/json' });
      const tid = r.json && typeof r.json === 'object' ? (r.json.tid ?? r.json?.tag?.tid) : undefined;
      if (r.status === 200 && tid !== undefined) createdTagTids.push(tid);
      await record({ shape: 'S4', label: v.label, method: 'POST', endpoint: '/tags?responsedata=name', canonicalFormat: v.canonicalFormat, dateFormat: 'compact', status: r.status, jsonParsed: r.json !== undefined, responseBytes: null, contentType: null, elapsedMs: 0, note: r.status === 200 ? 'tag created (will be cleaned up)' : r.status === 403 ? 'signature accepted; token lacks Edit Tags' : r.status === 401 ? 'signature rejected' : r.error ? `network ${r.error}` : `status ${r.status}` });
    }
  }

  // ===== S5: DELETE /tags/entities?did=&tag= signing =====
  // Full lifecycle: create tag -> assign to a discovered device -> DELETE via each variant -> verify gone.
  const s5 = { tid: undefined, did: undefined, tagName: `mcp-probe-s5-${stamp}`, assigned: false };
  try {
    // discover a device did (read-only)
    {
      const d = now();
      const dev = await readJson({ method: 'GET', wirePath: '/devices?count=1', canonical: `/devices?count=1\n${publicToken}\n${d}`, date: d });
      if (dev.status === 200 && Array.isArray(dev.json) && dev.json.length > 0) s5.did = dev.json[0]?.did;
      else if (dev.status === 200 && dev.json && Array.isArray(dev.json.devices)) s5.did = dev.json.devices[0]?.did;
    }
    // create the probe tag
    {
      const json = JSON.stringify({ name: s5.tagName, data: {} });
      const bodyBytes = Buffer.from(json, 'utf8');
      const d = now();
      const r = await readJson({ method: 'POST', wirePath: '/tags', canonical: `/tags?${json}\n${publicToken}\n${d}`, date: d, bodyBytes, contentType: 'application/json' });
      s5.tid = r.json && typeof r.json === 'object' ? (r.json.tid ?? r.json?.tag?.tid) : undefined;
      if (r.status === 200 && s5.tid !== undefined) createdTagTids.push(s5.tid);
      await record({ shape: 'S5', label: 'POST /tags create probe tag (JSON-only, body appended with ?)', method: 'POST', endpoint: '/tags', canonicalFormat: "path + '?' + json", dateFormat: 'compact', status: r.status, jsonParsed: r.json !== undefined, responseBytes: null, contentType: null, elapsedMs: 0, note: r.status === 200 ? 'tag created' : r.status === 403 ? 'signature accepted; token lacks Edit Tags (S5 write path blocked by permission)' : r.status === 401 ? 'signature rejected' : `status ${r.status}` });
    }

    if (s5.tid !== undefined && s5.did !== undefined) {
      // assign tag to device (form body)
      {
        const form = formPairsToText([['did', String(s5.did)], ['tag', s5.tagName]]);
        const bodyBytes = Buffer.from(form, 'utf8');
        const d = now();
        const r = await readJson({ method: 'POST', wirePath: '/tags/entities', canonical: `/tags/entities?${form}\n${publicToken}\n${d}`, date: d, bodyBytes, contentType: 'application/x-www-form-urlencoded' });
        s5.assigned = r.status === 200;
        await record({ shape: 'S5', label: 'POST /tags/entities assign tag to device (form body)', method: 'POST', endpoint: '/tags/entities', canonicalFormat: "path + '?' + form-encoded body", dateFormat: 'compact', status: r.status, jsonParsed: r.json !== undefined, responseBytes: null, contentType: null, elapsedMs: 0, note: s5.assigned ? 'assigned' : `status ${r.status}` });
      }

      if (s5.assigned) {
        const q = pairsToText([['did', String(s5.did)], ['tag', s5.tagName]], true);
        const wirePath = `/tags/entities?${q}`;
        const isGone = async () => {
          const d = now();
          const chk = await readJson({ method: 'GET', wirePath: `/tags/entities?did=${encodeRfc3986(String(s5.did))}`, canonical: `/tags/entities?did=${s5.did}\n${publicToken}\n${d}`, date: d });
          if (chk.status !== 200) return null;
          const str = JSON.stringify(chk.json ?? null);
          return !str.includes(s5.tagName);
        };

        // Variant A: sign path?query (GET-style)
        {
          const d = now();
          const r = await send({ method: 'DELETE', wirePath, canonical: `${wirePath}\n${publicToken}\n${d}`, date: d });
          const gone = await isGone();
          await record({ ...r, shape: 'S5', label: 'DELETE /tags/entities signed as path?query (GET-style)', method: 'DELETE', endpoint: '/tags/entities?did=&tag=', canonicalFormat: 'path + ? + query (same as GET)', dateFormat: 'compact', note: `removed=${gone}` });
          s5.assigned = gone === false ? true : gone === true ? false : s5.assigned;
        }
        // Variant B: sign path only (query omitted from signature) — only if still assigned
        if (s5.assigned) {
          const d = now();
          const r = await send({ method: 'DELETE', wirePath, canonical: `/tags/entities\n${publicToken}\n${d}`, date: d });
          const gone = await isGone();
          await record({ ...r, shape: 'S5', label: 'DELETE /tags/entities signed as path only (query unsigned)', method: 'DELETE', endpoint: '/tags/entities?did=&tag=', canonicalFormat: 'path only; query on wire but not signed', dateFormat: 'compact', note: `removed=${gone}` });
          s5.assigned = gone === false ? true : gone === true ? false : s5.assigned;
        }
      }
    } else {
      await record({ shape: 'S5', label: 'S5 entity DELETE test SKIPPED (no tag created or no device did available)', method: 'DELETE', endpoint: '/tags/entities?did=&tag=', canonicalFormat: 'n/a', dateFormat: 'n/a', status: null, jsonParsed: null, responseBytes: null, contentType: null, elapsedMs: 0, note: `tid=${s5.tid !== undefined}, did=${s5.did !== undefined}` });
    }
  } finally {
    // ---- cleanup: delete every created tag (removes any residual entity assignment too) ----
    const cleanup = [];
    for (const tid of createdTagTids) {
      const d = now();
      const r = await readJson({ method: 'DELETE', wirePath: `/tags/${encodeRfc3986(String(tid))}`, canonical: `/tags/${tid}\n${publicToken}\n${d}`, date: d });
      cleanup.push({ tid, status: r.status });
      await delay(GAP_MS);
    }
    // verify none of our probe tags remain
    const d = now();
    const after = await readJson({ method: 'GET', wirePath: '/tags', canonical: `/tags\n${publicToken}\n${d}`, date: d });
    let remaining = null;
    if (after.status === 200) {
      const str = JSON.stringify(after.json ?? null);
      remaining = (str.match(/mcp-probe-/g) ?? []).length;
    }
    results.push({
      shape: 'CLEANUP',
      label: 'cleanup: deleted created probe tags and verified removal',
      method: 'DELETE',
      endpoint: '/tags/{tid}',
      canonicalFormat: 'path only',
      dateFormat: 'compact',
      status: after.status,
      jsonParsed: after.json !== undefined,
      responseBytes: null,
      contentType: null,
      elapsedMs: 0,
      note: `deleted=${JSON.stringify(cleanup)}; probe_tags_remaining=${remaining}`,
    });
    console.log(`\nCleanup: deleted ${cleanup.length} tag(s); probe tags remaining after = ${remaining}`);
  }

  return finish(results, origin, {});
}

function finish(results, origin, meta) {
  const iso = new Date().toISOString();
  const safeIso = iso.replace(/[:.]/g, '-');
  const outDir = resolve(root, 'docs/security/evidence');
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, `lab-signing-evidence-${safeIso}.json`);
  const doc = {
    schema: 'darktrace-lab-signing-evidence/1',
    generatedAt: iso,
    appliance: { url: origin, versionClaimed: '7.1.0', authorisation: 'owner-authorised non-production lab' },
    scheme: '<path?query[appended-body]> \\n <publicToken> \\n <DTAPI-Date>; HMAC-SHA1; hex; headers DTAPI-Token/DTAPI-Date/DTAPI-Signature',
    note: 'No token values, signatures, canonical strings or response bodies are recorded; only status/shape/size/elapsed/content-type and a description of the canonical FORMAT.',
    ...meta,
    results,
  };
  writeFileSync(outPath, JSON.stringify(doc, null, 2) + '\n', 'utf8');
  console.log(`\nMachine-readable evidence written to: ${outPath}`);
  return outPath;
}

main().catch((err) => {
  // never surface token-bearing detail; emit only a generic code
  console.error(`probe failed: ${err?.message ?? 'error'}`);
  process.exitCode = 1;
});
