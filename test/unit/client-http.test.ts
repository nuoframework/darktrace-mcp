import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import test from 'node:test';
import { parseConfig } from '../../src/config/schema.js';
import { createHttpClient, type TrustedOperation } from '../../src/client/httpClient.js';
import { DarktraceApiError } from '../../src/client/errors.js';
import { createSigner, formatApiDate } from '../../src/client/signer.js';
import { redactJsonString, redactSecrets, redactString } from '../../src/shape/redact.js';
import { redactValue } from '../../src/observability/redact.js';

const operations: readonly TrustedOperation[] = [
  { operationId: 'get_status', method: 'GET', pathTemplate: '/status' },
  { operationId: 'get_tags_tid', method: 'GET', pathTemplate: '/tags/{tid}' },
  { operationId: 'post_comment', method: 'POST', pathTemplate: '/comments', parameterNames: ['comment'] },
  { operationId: 'delete_tags_entities', method: 'DELETE', pathTemplate: '/tags/entities' },
  { operationId: 'get_advancedsearch_api_search_query', method: 'GET', pathTemplate: '/advancedsearch/api/search/{query}' },
  { operationId: 'get_pcaps_filename', method: 'GET', pathTemplate: '/pcaps/{filename}' },
];

function makeConfig(overrides: Record<string, unknown> = {}) {
  return parseConfig({
    instance: { baseUrl: 'https://darktrace.example:8443', timeoutMs: 30_000 },
    auth: { publicToken: 'public-secret', privateToken: 'private-secret' },
    limits: { maxResponseBytes: 1024, maxConcurrentRequests: 2 },
    ...overrides,
  });
}

function makeClient(
  fetchImpl: typeof fetch,
  overrides: Record<string, unknown> = {},
  extra: Partial<Parameters<typeof createHttpClient>[1]> = {},
) {
  const cfg = makeConfig(overrides);
  const signer = createSigner(cfg.auth.publicToken, cfg.auth.privateToken, {
    encodeQueryInSignature: cfg.auth.querySignatureEncoding === 'encoded',
  });
  return createHttpClient(cfg, { testOnly: true, operations, signer, fetchImpl, delay: async () => undefined, ...extra });
}

function isKind(kind: DarktraceApiError['kind']) {
  return (error: unknown) => error instanceof DarktraceApiError && error.kind === kind;
}

test('only trusted operation IDs route requests; arbitrary paths and origins are rejected', async () => {
  let calls = 0;
  const client = makeClient(async () => {
    calls += 1;
    return new Response('{}');
  });
  await assert.rejects(client.send({ operationId: 'get_untrusted', query: { x: '1' } }), isKind('invalid_request'));
  await assert.rejects(client.send({ operationId: 'get_status', path: 'https://evil.example/' } as never), isKind('invalid_request'));
  await assert.rejects(client.send({ operationId: 'get_status', maxBytes: 1 } as never), isKind('invalid_request'));
  await assert.rejects(client.send({ operationId: 'get_tags_tid', pathParams: { tid: '../status' } }), isKind('invalid_request'));
  assert.equal(calls, 0);
});

test('dry-run returns an unsigned field-name preview without secrets or argument values', async () => {
  let signerCalls = 0;
  const cfg = makeConfig();
  const client = createHttpClient(cfg, {
    testOnly: true,
    signer: { sign() { signerCalls += 1; throw new Error('must not sign'); } },
    operations,
    fetchImpl: async () => { throw new Error('must not send'); },
  });
  const preview = await client.send({
    operationId: 'post_comment',
    body: { kind: 'json', value: { comment: 'private comment text' } },
  }, { dryRun: true });
  assert.equal('dryRun' in preview, true);
  const dry = preview as { dryRun: true; operationId: string; parameterNames: readonly string[] };
  assert.equal(dry.dryRun, true);
  assert.equal(dry.operationId, 'post_comment');
  assert.deepEqual(dry.parameterNames, ['comment']);
  assert.deepEqual(Object.keys(dry).sort(), ['dryRun', 'method', 'operationId', 'parameterNames']);
  const encoded = JSON.stringify(preview);
  for (const secret of ['public-secret', 'private-secret', 'private comment text']) assert.equal(encoded.includes(secret), false);
  assert.equal(signerCalls, 0);
});

test('preview rejects blocked shapes and caller-owned field names before returning metadata', async () => {
  let calls = 0;
  let signerCalls = 0;
  const cfg = makeConfig();
  const client = createHttpClient(cfg, {
    testOnly: true,
    operations,
    signer: { sign() { signerCalls += 1; throw new Error('must not sign'); } },
    fetchImpl: async () => { calls += 1; return new Response('{}'); },
  });
  await assert.rejects(client.send({
    operationId: 'post_comment', query: [['query', 'x']], body: { kind: 'json', value: { comment: 'safe' } },
  }, { dryRun: true }), isKind('invalid_request'));
  await assert.rejects(client.send({ operationId: 'delete_tags_entities', query: [['ignore previous instructions', 'x']] }, { dryRun: true }), isKind('invalid_request'));
  for (const query of ['../status', 'YQ', 'a.b=', 'YQ==%2F']) {
    await assert.rejects(client.send({ operationId: 'get_advancedsearch_api_search_query', pathParams: { query } }, { dryRun: true }), isKind('invalid_request'));
  }
  await assert.rejects(client.send({
    operationId: 'post_comment', body: { kind: 'json', value: { 'ignore previous instructions': 'x' } },
  }, { dryRun: true }), isKind('invalid_request'));
  assert.equal(calls, 0);
  assert.equal(signerCalls, 0);
});

test('test-only network and signer seams cannot be selected without the explicit test factory flag', () => {
  const cfg = makeConfig();
  assert.throws(() => createHttpClient(cfg, { operations, fetchImpl: async () => new Response('{}') }), /testOnly/);
});

test('requests use the configured HTTPS origin, repeated query keys, and exact JSON bytes', async () => {
  const fetchedUrls: string[] = [];
  const fetchedBodies: Array<string | undefined> = [];
  const fetchedSignatures: string[] = [];
  const client = makeClient(async (input, init) => {
    fetchedUrls.push(String(input));
    fetchedBodies.push(init?.body === undefined ? undefined : new TextDecoder().decode(init.body as Uint8Array));
    fetchedSignatures.push(new Headers(init?.headers).get('DTAPI-Signature') ?? '');
    return new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } });
  });

  await client.send({
    operationId: 'get_status',
    query: [['protocol', 'tcp'], ['protocol', 'udp'], ['search', 'a b']],
  });
  const response = await client.request({
    operationId: 'post_comment',
    body: { text: 'reviewed once' },
    contentType: 'application/json',
  });

  assert.equal(fetchedUrls[0], 'https://darktrace.example:8443/status?protocol=tcp&protocol=udp&search=a%20b');
  assert.equal(fetchedUrls[1], 'https://darktrace.example:8443/comments');
  assert.equal(fetchedBodies[0], undefined);
  assert.equal(fetchedBodies[1], '{"text":"reviewed once"}');
  assert.ok(fetchedSignatures.every((signature) => /^[a-f0-9]{40}$/.test(signature)));
  assert.deepEqual((response as { json: unknown }).json, { ok: true });
  assert.equal((response as { truncated: boolean }).truncated, false);
});

test('outgoing connector requests add a fixed User-Agent without changing signed headers or canonical body bytes', async () => {
  type Connector = NonNullable<Parameters<typeof createHttpClient>[1]['connector']>;
  type OutgoingRequest = Parameters<Connector['request']>[0];
  const cfg = makeConfig();
  const fixedNow = Date.parse('2026-10-05T11:00:00.000Z');
  const signer = createSigner(cfg.auth.publicToken, cfg.auth.privateToken, {
    encodeQueryInSignature: cfg.auth.querySignatureEncoding === 'encoded',
  });
  const bodyBytes = new TextEncoder().encode('{"comment":"signed bytes"}');
  const signed = signer.sign({
    method: 'POST',
    path: '/comments',
    body: { kind: 'json', bytes: bodyBytes },
    date: formatApiDate(new Date(fixedNow), cfg.auth.dateFormat),
  });
  let outgoing: OutgoingRequest | undefined;
  let connectorClosed = false;
  const connector: Connector = {
    async initialize() {},
    async request(request) {
      outgoing = request;
      return { status: 200, headers: { get() { return null; } }, body: null };
    },
    close() { connectorClosed = true; },
  };
  const client = createHttpClient(cfg, {
    testOnly: true,
    operations,
    signer,
    connector,
    now: () => fixedNow,
  });

  try {
    const response = await client.request({
      operationId: 'post_comment',
      body: { comment: 'signed bytes' },
      contentType: 'application/json',
    });
    assert.equal(response.status, 200);
    assert.ok(outgoing);
    assert.equal(outgoing.headers['User-Agent'], 'darktrace-mcp');
    const { 'User-Agent': _userAgent, ...headersWithoutUserAgent } = outgoing.headers;
    assert.deepEqual(headersWithoutUserAgent, {
      ...signed.headers,
      Accept: 'application/json',
      'Accept-Encoding': 'identity',
      'Content-Length': String(signed.bodyBytes?.byteLength),
    });
    assert.equal(outgoing.url.href, new URL(signed.url, cfg.instance.baseUrl).href);
    assert.deepEqual(outgoing.body, signed.bodyBytes);
  } finally {
    client.close();
  }
  assert.equal(connectorClosed, true);
});

test('JSON request values are serialized once before signing and transport', async () => {
  let serializations = 0;
  let wireBody = '';
  const client = makeClient(async (_input, init) => {
    wireBody = new TextDecoder().decode(init?.body as Uint8Array);
    return new Response('{}');
  });
  await client.request({
    operationId: 'post_comment',
    body: { toJSON() { serializations += 1; return { comment: 'one serialization' }; } },
    contentType: 'application/json',
  });
  assert.equal(serializations, 1);
  assert.equal(wireBody, '{"comment":"one serialization"}');
});

test('form array values serialize as repeated keys in their original order', async () => {
  let wireBody = '';
  const client = makeClient(async (_input, init) => {
    wireBody = new TextDecoder().decode(init?.body as Uint8Array);
    return new Response('{}');
  });
  await client.request({
    operationId: 'post_comment',
    body: { tag: ['one value', 'two'] },
    contentType: 'application/x-www-form-urlencoded',
  });
  assert.equal(wireBody, 'tag=one+value&tag=two');
});

test('S4 query+JSON is rejected; S5 and evidence-backed S6 signatures match their wire paths', async () => {
  const date = '20260102T030405';
  const hmac = (signed: string) => createHmac('sha1', 'private-secret').update(`${signed}\npublic-secret\n${date}`, 'utf8').digest('hex');
  for (const encoded of [false, true]) {
    const wire: Array<{ url: string; method: string; body?: string; headers: Record<string, string> }> = [];
    const client = makeClient(async (input, init) => {
      wire.push({ url: String(input), method: String(init?.method), ...(init?.body === undefined ? {} : { body: Buffer.from(init.body as Uint8Array).toString() }), headers: Object.fromEntries(new Headers(init?.headers)) });
      return new Response('{"ok":true}', { headers: { 'content-type': 'application/json' } });
    }, { auth: { publicToken: 'public-secret', privateToken: 'private-secret', querySignatureEncoding: encoded ? 'encoded' : 'unencoded' } },
    { now: () => Date.UTC(2026, 0, 2, 3, 4, 5) });
    // The 7.1.0 appliance rejects path?query&{json}; no catalogue operation needs this shape.
    await assert.rejects(client.send({ operationId: 'post_comment', query: [['responsedata', 'a b']], body: { kind: 'json', value: { comment: 'x' } } }), isKind('invalid_request'));
    // S5: DELETE with query -> path?query, exactly like GET (dt_utils._delete).
    await client.send({ operationId: 'delete_tags_entities', query: [['did', '1'], ['tag', 'Quarantined Device']] });
    // S6: standard Base64 is RFC3986-encoded identically in the signed and transmitted path.
    await client.send({ operationId: 'get_advancedsearch_api_search_query', pathParams: { query: 'eyJh+/8=' } });
    const space = encoded ? '%20' : ' ';
    assert.deepEqual(wire.map(w => [w.method, w.url]), [
      ['DELETE', 'https://darktrace.example:8443/tags/entities?did=1&tag=Quarantined%20Device'],
      ['GET', 'https://darktrace.example:8443/advancedsearch/api/search/eyJh%2B%2F8%3D'],
    ]);
    assert.equal(wire[0].headers['dtapi-signature'], hmac(`/tags/entities?did=1&tag=Quarantined${space}Device`));
    assert.equal(wire[1].headers['dtapi-signature'], hmac('/advancedsearch/api/search/eyJh%2B%2F8%3D'));
    assert.ok(wire.every(w => w.headers['dtapi-date'] === date && w.headers['dtapi-token'] === 'public-secret'));
  }
});

test('S6 standard Base64 path admits only canonical Base64; S4 and DELETE bodies reject before signing', async () => {
  let calls = 0;
  let signerCalls = 0;
  const client = createHttpClient(makeConfig(), {
    testOnly: true,
    operations,
    signer: { sign() { signerCalls += 1; throw new Error('must not sign'); } },
    fetchImpl: async () => { calls += 1; return new Response('{}'); },
  });
  for (const query of ['../../status', 'YQ==?x=1', 'YQ==#f', 'Y Q=', 'YQ', '%2e%2e/YQ', 'A===', 'Yf==', 'x'.repeat(21_852), 'YQ==\n']) {
    await assert.rejects(client.send({ operationId: 'get_advancedsearch_api_search_query', pathParams: { query } }), isKind('invalid_request'));
  }
  await assert.rejects(client.send({ operationId: 'post_comment', query: [['did', '1']], body: { kind: 'json', value: { comment: 'x' } } }), isKind('invalid_request'));
  await assert.rejects(client.send({ operationId: 'delete_tags_entities', query: [['did', '1']], body: { kind: 'json', value: { did: 1 } } }), isKind('invalid_request'));
  await assert.rejects(client.send({ operationId: 'get_tags_tid', pathParams: { tid: 'YQ==/../x' } }), isKind('invalid_request'));
  assert.equal(signerCalls, 0);
  assert.equal(calls, 0);
});

test('S6 leading Base64 slash is data and is percent-encoded as one path segment', async () => {
  let wireUrl = '';
  const client = makeClient(async input => { wireUrl = String(input); return new Response('{}'); });
  await client.send({ operationId: 'get_advancedsearch_api_search_query', pathParams: { query: '/YQ=' } });
  assert.equal(wireUrl, 'https://darktrace.example:8443/advancedsearch/api/search/%2FYQ%3D');
});

test('safe API errors never include the remote response body or a token', async () => {
  let signerCalls = 0;
  const cfg = makeConfig();
  const baseSigner = createSigner(cfg.auth.publicToken, cfg.auth.privateToken, { encodeQueryInSignature: false });
  const client = createHttpClient(cfg, {
    testOnly: true,
    operations,
    signer: { sign(input) { signerCalls += 1; return baseSigner.sign(input); } },
    fetchImpl: async () => new Response('private-secret in remote details', { status: 401 }),
  });
  await assert.rejects(client.send({ operationId: 'get_status' }), (error: unknown) => {
    assert.ok(error instanceof DarktraceApiError);
    assert.equal(error.kind, 'auth');
    assert.equal(error.message.includes('private-secret'), false);
    assert.equal(error.message.includes('remote details'), false);
    return true;
  });
  assert.equal(signerCalls, 1);
});

test('redirects are rejected without following the location', async () => {
  let calls = 0;
  const client = makeClient(async () => {
    calls += 1;
    return new Response('redirect body secret', { status: 302, headers: { location: 'https://evil.example/' } });
  });
  await assert.rejects(client.send({ operationId: 'get_status' }), (error: unknown) => {
    assert.ok(error instanceof DarktraceApiError);
    assert.equal(error.status, 302);
    assert.equal(error.message.includes('redirect body'), false);
    return true;
  });
  assert.equal(calls, 1);
});

test('streamed responses exceeding the byte cap are cancelled and rejected', async () => {
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(12));
      controller.enqueue(new Uint8Array(12));
    },
    cancel() { cancelled = true; },
  });
  const client = makeClient(async () => new Response(stream), { limits: { maxResponseBytes: 16 } });
  await assert.rejects(client.send({ operationId: 'get_status' }), isKind('too_large'));
  assert.equal(cancelled, true);
});

test('bounded binary reader retains one capped destination buffer for chunked input', async () => {
  const source = Buffer.alloc(1024, 9);
  const stream = new ReadableStream<Uint8Array>({
    start(controller) { controller.enqueue(source.subarray(0, 512)); controller.enqueue(source.subarray(512)); controller.close(); },
  });
  const client = makeClient(async () => new Response(stream, { headers: { 'content-type': 'application/vnd.tcpdump.pcap' } }), {
    limits: { maxResponseBytes: 1024, maxToolOutputChars: 4096 },
  });
  const result = await client.send({ operationId: 'get_pcaps_filename', pathParams: { filename: 'capture.pcap' }, accept: 'binary' });
  assert.ok(!('dryRun' in result));
  if ('dryRun' in result) throw new Error('unexpected dry-run result');
  assert.equal(result.bytes?.byteLength, 1024);
  assert.ok(result.bytes?.buffer.byteLength <= 1024);
  assert.deepEqual(Buffer.from(result.bytes!), source);
});

test('binary output overflow returns code-owned size and digest with no bytes', async () => {
  const raw = Buffer.alloc(512, 0x5a);
  const client = makeClient(async () => new Response(raw, { headers: { 'content-type': 'application/vnd.tcpdump.pcap' } }), {
    limits: { maxResponseBytes: 1024, maxToolOutputChars: 512 },
  });
  const result = await client.send({ operationId: 'get_pcaps_filename', pathParams: { filename: 'capture.pcap' }, accept: 'binary' });
  assert.ok(!('dryRun' in result));
  if ('dryRun' in result) throw new Error('unexpected dry-run result');
  assert.deepEqual('outputLimitExceeded' in result ? result.outputLimitExceeded : undefined, {
    errorCode: 'output_limit_exceeded', size: raw.byteLength, sha256: createHash('sha256').update(raw).digest('hex'),
  });
  assert.equal('bytes' in result, false);
  assert.equal('json' in result, false);
});

test('cumulative response cap counts discarded retry bodies and rejects compressed responses', async () => {
  let calls = 0;
  const retryClient = makeClient(async () => {
    calls += 1;
    return calls === 1 ? new Response('123456', { status: 503 }) : new Response('abcdefg');
  }, { limits: { maxResponseBytes: 10, maxGetRetries: 1, maxRetryAfterMs: 0 } });
  await assert.rejects(retryClient.send({ operationId: 'get_status' }), isKind('too_large'));
  assert.equal(calls, 2);

  let compressedCalls = 0;
  const compressedClient = makeClient(async () => {
    compressedCalls += 1;
    return new Response('opaque bytes', { headers: { 'content-encoding': 'gzip' } });
  });
  await assert.rejects(compressedClient.send({ operationId: 'get_status' }), isKind('invalid_response'));
  assert.equal(compressedCalls, 1);
});

test('only GET operations retry transient failures, with at most three attempts', async () => {
  let getCalls = 0;
  const getClient = makeClient(async () => {
    getCalls += 1;
    return getCalls < 3 ? new Response('remote secret', { status: 503 }) : new Response('{"recovered":true}');
  });
  const got = await getClient.send({ operationId: 'get_status' });
  assert.equal(getCalls, 3);
  assert.deepEqual((got as { json: unknown }).json, { recovered: true });

  let postCalls = 0;
  const postClient = makeClient(async () => {
    postCalls += 1;
    return new Response('remote secret', { status: 503 });
  });
  await assert.rejects(postClient.send({ operationId: 'post_comment', body: { kind: 'json', value: {} } }), isKind('server'));
  assert.equal(postCalls, 1);
});

test('GET retries only an explicit allowlist of pre-response network codes, never TLS or unknown errors', async () => {
  let calls = 0;
  let signCalls = 0;
  const realSigner = createSigner('public-secret', 'private-secret', { encodeQueryInSignature: false });
  const transient = makeClient(async () => {
    calls += 1;
    if (calls === 1) throw Object.assign(new Error('socket reset'), { code: 'ECONNRESET' });
    return new Response('{}');
  }, {}, { signer: { sign(input) { signCalls += 1; return realSigner.sign(input); } } });
  await transient.send({ operationId: 'get_status' });
  assert.equal(calls, 2);
  assert.equal(signCalls, 2);

  for (const code of [
    'UNABLE_TO_GET_ISSUER_CERT_LOCALLY', 'UNABLE_TO_GET_ISSUER_CERT', 'INVALID_CA',
    'CERT_HAS_EXPIRED', 'ERR_TLS_CERT_ALTNAME_INVALID', 'EAI_AGAIN', 'UNKNOWN_FAILURE',
  ]) {
    let rejectedCalls = 0;
    let rejectedSigns = 0;
    const rejectedSigner = createSigner('public-secret', 'private-secret', { encodeQueryInSignature: false });
    const client = makeClient(async () => {
      rejectedCalls += 1;
      throw Object.assign(new Error('handshake failed'), { code });
    }, {}, { signer: { sign(input) { rejectedSigns += 1; return rejectedSigner.sign(input); } } });
    await assert.rejects(client.send({ operationId: 'get_status' }), isKind('network'));
    assert.equal(rejectedCalls, 1, `${code} must not retry`);
    assert.equal(rejectedSigns, 1, `${code} must not produce another signature`);
  }
});

test('Retry-After is never shortened; delays over the ceiling or original deadline end without another attempt', async () => {
  let calls = 0;
  const client = makeClient(async () => {
    calls += 1;
    return new Response('remote details', { status: 503, headers: { 'retry-after': '60' } });
  });
  await assert.rejects(client.send({ operationId: 'get_status' }), isKind('server'));
  assert.equal(calls, 1);

  let invalidCalls = 0;
  const invalid = makeClient(async () => {
    invalidCalls += 1;
    return new Response('remote details', { status: 503, headers: { 'retry-after': 'not a date' } });
  });
  await assert.rejects(invalid.send({ operationId: 'get_status' }), isKind('server'));
  assert.equal(invalidCalls, 1);

  const waits: number[] = [];
  let dateCalls = 0;
  const dateClient = makeClient(async () => {
    dateCalls += 1;
    return dateCalls === 1
      ? new Response('', { status: 503, headers: { 'retry-after': 'Mon, 05 Oct 2026 11:00:01 GMT' } })
      : new Response('{}');
  }, {}, { now: () => Date.parse('2026-10-05T11:00:00.000Z'), delay: async (ms) => { waits.push(ms); } });
  await dateClient.send({ operationId: 'get_status' });
  assert.equal(dateCalls, 2);
  assert.deepEqual(waits, [1_000]);

  let deadlineCalls = 0;
  const deadlineClient = makeClient(async () => {
    deadlineCalls += 1;
    return new Response('{}', { status: 503, headers: { 'retry-after': '1' } });
  }, { instance: { baseUrl: 'https://darktrace.example:8443', timeoutMs: 25 } });
  await assert.rejects(deadlineClient.send({ operationId: 'get_status' }), isKind('server'));
  assert.equal(deadlineCalls, 1);
});

test('attempts are rate-limited per client, and POST/DELETE never retry', async () => {
  let getCalls = 0;
  const getClient = makeClient(async () => { getCalls += 1; return new Response('{}'); }, {
    limits: { rateLimitPerMinute: 1, maxGetRetries: 0 },
  });
  await getClient.send({ operationId: 'get_status' });
  await assert.rejects(getClient.send({ operationId: 'get_status' }), isKind('rate_limited'));
  assert.equal(getCalls, 1);

  let deleteCalls = 0;
  const deleteClient = makeClient(async () => { deleteCalls += 1; return new Response('details', { status: 503 }); });
  await assert.rejects(deleteClient.send({ operationId: 'delete_tags_entities' }), isKind('server'));
  assert.equal(deleteCalls, 1);
});

test('input byte, depth, and element limits apply before signing or transport', async () => {
  let calls = 0;
  let signs = 0;
  const cfg = makeConfig({ limits: { maxToolInputBytes: 20, maxToolInputDepth: 2, maxToolInputElements: 4 } });
  const client = createHttpClient(cfg, {
    testOnly: true,
    operations,
    signer: { sign() { signs += 1; throw new Error('should not sign'); } },
    fetchImpl: async () => { calls += 1; return new Response('{}'); },
  });
  await assert.rejects(client.send({ operationId: 'post_comment', body: { kind: 'json', value: { a: 'x'.repeat(30) } } }), isKind('invalid_request'));
  await assert.rejects(client.send({ operationId: 'post_comment', body: { kind: 'json', value: { a: { b: { c: 1 } } } } }), isKind('invalid_request'));
  await assert.rejects(client.send({ operationId: 'post_comment', body: { kind: 'json', value: { a: 1, b: 2, c: 3, d: 4 } } }), isKind('invalid_request'));
  assert.equal(signs, 0);
  assert.equal(calls, 0);
});

test('caller cancellation aborts fetch and returns a safe cancellation error', async () => {
  const controller = new AbortController();
  const observed: { signal?: AbortSignal } = {};
  let started: (() => void) | undefined;
  const fetchStarted = new Promise<void>((resolve) => { started = resolve; });
  const client = makeClient((_input, init) => new Promise((_resolve, reject) => {
    observed.signal = init?.signal ?? undefined;
    started?.();
    const signal = init?.signal;
    if (signal?.aborted) reject(new Error('cancelled'));
    else signal?.addEventListener('abort', () => reject(new Error('cancelled')), { once: true });
  }));
  const pending = client.send({ operationId: 'get_status' }, { signal: controller.signal });
  await fetchStarted;
  controller.abort();
  await assert.rejects(pending, isKind('cancelled'));
  assert.equal(observed.signal?.aborted, true);
});

test('deadline and caller cancellation remain active while response body is streaming', async () => {
  for (const callerCancellation of [false, true]) {
    let bodyObservedAbort = false;
    let responseHandleClosed = false;
    const connector: NonNullable<Parameters<typeof createHttpClient>[1]['connector']> = {
      async initialize() {},
      async request(request) {
        return {
          status: 200,
          headers: { get() { return null; } },
          body: {
            async *[Symbol.asyncIterator]() {
              yield new TextEncoder().encode('{"partial":');
              let socketWatchdog: ReturnType<typeof setTimeout> | undefined;
              let removeAbortListener = () => {};
              try {
                await new Promise<void>((_resolve, reject) => {
                  const onAbort = () => {
                    bodyObservedAbort = true;
                    reject(new Error('aborted'));
                  };
                  removeAbortListener = () => request.signal.removeEventListener('abort', onAbort);
                  // A real streaming socket keeps the event loop alive. This ref'ed local
                  // watchdog models that handle and also fails promptly if abort is broken.
                  socketWatchdog = setTimeout(() => reject(new Error('fixture response socket watchdog expired')), 2_000);
                  if (request.signal.aborted) onAbort();
                  else request.signal.addEventListener('abort', onAbort, { once: true });
                });
              } finally {
                if (socketWatchdog !== undefined) clearTimeout(socketWatchdog);
                removeAbortListener();
                responseHandleClosed = true;
              }
            },
            async cancel() { bodyObservedAbort = true; },
          },
        };
      },
      close() {},
    };
    const client = createHttpClient(makeConfig({
      instance: { baseUrl: 'https://darktrace.example:8443', timeoutMs: callerCancellation ? 1_000 : 30 },
    }), { testOnly: true, operations, connector, delay: async () => undefined });
    const controller = new AbortController();
    const cancelTimer = callerCancellation ? setTimeout(() => controller.abort(), 30) : undefined;
    try {
      const pending = client.request({ operationId: 'get_status', ...(callerCancellation ? { signal: controller.signal } : {}) });
      await assert.rejects(pending, isKind(callerCancellation ? 'cancelled' : 'timeout'));
      assert.equal(bodyObservedAbort, true);
      assert.equal(responseHandleClosed, true);
    } finally {
      if (cancelTimer !== undefined) clearTimeout(cancelTimer);
      client.close();
    }
  }
});

test('bounded concurrency rejects excess queued work', async () => {
  let releaseFirst: (() => void) | undefined;
  let firstStarted: (() => void) | undefined;
  const started = new Promise<void>((resolve) => { firstStarted = resolve; });
  let calls = 0;
  const client = makeClient(async () => {
    calls += 1;
    if (calls === 1) {
      firstStarted?.();
      await new Promise<void>((resolve) => { releaseFirst = resolve; });
    }
    return new Response('{}');
  }, { limits: { maxConcurrentRequests: 1, maxQueuedRequests: 2 } });
  const first = client.send({ operationId: 'get_status' });
  await started;
  const second = client.send({ operationId: 'get_status' });
  const third = client.send({ operationId: 'get_status' });
  const overflow = client.send({ operationId: 'get_status' });
  await assert.rejects(overflow, isKind('overloaded'));
  releaseFirst?.();
  await Promise.all([first, second, third]);
  assert.equal(calls, 3);
});

test('deadline starts at admission across queue wait and client close aborts active calls', async () => {
  let firstStarted: (() => void) | undefined;
  const started = new Promise<void>((resolve) => { firstStarted = resolve; });
  let calls = 0;
  let activeMockSockets = 0;
  const pendingOnSocket = (signal: AbortSignal | null | undefined, onStarted?: () => void): Promise<Response> => new Promise((_resolve, reject) => {
    let settled = false;
    let socketWatchdog: ReturnType<typeof setTimeout> | undefined;
    const cleanup = () => {
      if (socketWatchdog !== undefined) clearTimeout(socketWatchdog);
      signal?.removeEventListener('abort', onAbort);
      activeMockSockets -= 1;
    };
    const rejectOnce = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const onAbort = () => rejectOnce(new Error('aborted'));
    activeMockSockets += 1;
    // A pending fetch represents a live socket; keep one local, bounded handle until abort.
    socketWatchdog = setTimeout(() => rejectOnce(new Error('fixture request socket watchdog expired')), 2_000);
    onStarted?.();
    if (signal?.aborted) onAbort();
    else signal?.addEventListener('abort', onAbort, { once: true });
  });
  const client = makeClient((_input, init) => {
    calls += 1;
    return pendingOnSocket(init?.signal, calls === 1 ? () => firstStarted?.() : undefined);
  }, { instance: { baseUrl: 'https://darktrace.example', timeoutMs: 25 }, limits: { maxConcurrentRequests: 1, maxQueuedRequests: 1 } });
  try {
    const first = client.send({ operationId: 'get_status' });
    const firstTimedOut = assert.rejects(first, isKind('timeout'));
    await started;
    const queued = client.send({ operationId: 'get_status' });
    const queueTimedOut = assert.rejects(queued, isKind('timeout'));
    await Promise.all([firstTimedOut, queueTimedOut]);
    // The queued call may start its transport when the first slot releases, but its original timer is not reset.
    assert.equal(calls, 2);
    assert.equal(activeMockSockets, 0);
  } finally {
    client.close();
  }

  const closing = makeClient((_input, init) => pendingOnSocket(init?.signal));
  try {
    const active = closing.send({ operationId: 'get_status' });
    await new Promise((resolve) => setImmediate(resolve));
    closing.close();
    await assert.rejects(active, isKind('cancelled'));
    assert.equal(activeMockSockets, 0);
  } finally {
    closing.close();
  }
});

test('literal token redaction covers nested JSON and log strings', () => {
  const source = {
    nested: [{ message: 'a private-secret b' }, JSON.stringify({ token: 'private-secret' })],
    raw: 'public-secret',
    jsonLikeNumbers: '1.0',
    jsonLikeArray: '[1, 2]',
    jsonLikeBoolean: 'true ',
  };
  const redacted = redactSecrets(source, ['private-secret', 'public-secret']);
  const output = JSON.stringify(redacted);
  assert.equal(output.includes('private-secret'), false);
  assert.equal(output.includes('public-secret'), false);
  assert.equal((redacted as typeof source).jsonLikeNumbers, '1.0');
  assert.equal((redacted as typeof source).jsonLikeArray, '[1, 2]');
  assert.equal((redacted as typeof source).jsonLikeBoolean, 'true ');
  const log = redactJsonString('{"detail":"private-secret"}', ['private-secret']);
  assert.equal(log.includes('private-secret'), false);
  assert.deepEqual(JSON.parse(log), { detail: '[REDACTED]' });
  assert.deepEqual(JSON.parse(redactJsonString('{"number":1.0,"text":"[1, 2]","flag":true }', [])), {
    number: 1, text: '[1, 2]', flag: true,
  });

  const prototypeKey = Object.create(null) as Record<string, unknown>;
  Object.defineProperty(prototypeKey, '__proto__', { value: { polluted: true }, enumerable: true });
  prototypeKey.value = '1.0';
  const safe = redactSecrets(prototypeKey, []);
  assert.equal(Object.getPrototypeOf(safe), null);
  assert.equal(Object.hasOwn(safe, '__proto__'), true);
  const safePrototypeValue = (safe as Record<string, unknown>)['__proto__'] as Record<string, unknown>;
  assert.equal(Object.getPrototypeOf(safePrototypeValue), null);
  assert.equal(safePrototypeValue.polluted, true);
  assert.equal((safe as Record<string, unknown>).value, '1.0');
  assert.equal('polluted' in (safe as object), false);
});

test('known token encodings are removed from structured, text and JSON log sinks', () => {
  const privateToken = 'PRIVATE_🀃🀀_TOKEN_0123456789';
  const base64 = Buffer.from(privateToken, 'utf8').toString('base64');
  const base64Url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const uri = encodeURIComponent(privateToken);
  const uriLower = uri.replace(/%[0-9A-F]{2}/g, (part) => part.toLowerCase());
  const fullUri = [...Buffer.from(privateToken, 'utf8')].map((byte) => `%${byte.toString(16).padStart(2, '0').toUpperCase()}`).join('');
  const hex = Buffer.from(privateToken, 'utf8').toString('hex');
  const variants = [privateToken, base64, base64Url, uri, uriLower, fullUri, fullUri.toLowerCase(), hex, hex.toUpperCase()];
  assert.ok(base64.includes('+') && base64.includes('/'));
  for (const encoded of variants.slice(1)) assert.equal(redactString(`prefix:${encoded}:suffix`, [privateToken]), 'prefix:[REDACTED]:suffix');

  const sinks = redactValue({
    content: [{ type: 'text', text: `remote comment ${base64}` }],
    structuredContent: { comment: base64Url, nested: { evidence: uriLower } },
    diagnostic: `hex:${hex.toUpperCase()}`,
  }, [privateToken]);
  const rendered = JSON.stringify(sinks);
  for (const encoded of variants) assert.equal(rendered.includes(encoded), false);
  assert.equal((sinks as { content: Array<{ text: string }> }).content[0].text, 'remote comment [REDACTED]');
  const recursive = redactSecrets({ comment: `embedded:${base64Url}` }, [privateToken]);
  assert.equal((recursive as { comment: string }).comment, 'embedded:[REDACTED]');

  const log = redactJsonString(JSON.stringify({ upstream: `token=${fullUri}` }), [privateToken]);
  assert.deepEqual(JSON.parse(log), { upstream: 'token=[REDACTED]' });
  const clean = 'ordinary text 1.0 [1, 2] true ';
  assert.equal(redactString(clean, [privateToken]), clean);
});
