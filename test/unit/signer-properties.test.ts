import assert from 'node:assert/strict';
import test from 'node:test';
import fc from 'fast-check';
import { createSigner, formatApiDate } from '../../src/client/signer.js';
import type { OrderedPairs } from '../../src/client/signer.js';

// Property-based tests (fast-check) for the request signer: determinism, wire encoding that
// round-trips, the explicit query-encoding modes and the Advanced Search Base64 segment rule.
const RUNS = { numRuns: 300 };
const date = '20230101T120000';
const CONTROL = /[\u0000-\u001f\u007f]/;
const UNRESERVED = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.~'];
const RESERVED = [...' !"#$%&\'()*+,/:;=?@[]'];

const printable = fc.string().filter(text => !CONTROL.test(text));
const pairs = fc.array(fc.tuple(printable, printable), { maxLength: 6 }) as fc.Arbitrary<OrderedPairs>;
const pathSegment = fc.array(fc.constantFrom(...UNRESERVED.filter(c => c !== '.')), { minLength: 1, maxLength: 12 }).map(chars => chars.join(''));
const path = fc.array(pathSegment, { minLength: 1, maxLength: 4 }).map(segments => `/${segments.join('/')}`)
  .filter(p => !p.startsWith('/advancedsearch/'));
const signer = createSigner('public', 'secret', { encodeQueryInSignature: true });

test('signing is deterministic and the signature is a 40-character hex HMAC', () => {
  fc.assert(fc.property(path, pairs, (p, query) => {
    const first = signer.sign({ method: 'GET', path: p, query, date });
    const second = signer.sign({ method: 'GET', path: p, query, date });
    assert.equal(first.headers['DTAPI-Signature'], second.headers['DTAPI-Signature']);
    assert.equal(first.url, second.url);
    assert.match(first.headers['DTAPI-Signature'], /^[0-9a-f]{40}$/);
    assert.equal(first.headers['DTAPI-Date'], date);
    assert.equal(first.headers['DTAPI-Token'], 'public');
  }), RUNS);
});

test('the wire query percent-encodes every pair so that a URL parser recovers exactly the ordered pairs', () => {
  fc.assert(fc.property(path, pairs, (p, query) => {
    const signed = signer.sign({ method: 'GET', path: p, query, date });
    assert.equal(CONTROL.test(signed.url), false);
    assert.equal(/[ "<>]/.test(signed.url), false);
    const [wirePath, ...rest] = signed.url.split('?');
    assert.equal(wirePath, p);
    const decoded = rest.length ? [...new URLSearchParams(rest.join('?'))] : [];
    assert.deepEqual(decoded, query.map(([key, value]) => [key, value]));
  }), RUNS);
});

test('encoded and unencoded signature modes agree exactly when the query needs no encoding', () => {
  const unencodedSigner = createSigner('public', 'secret', { encodeQueryInSignature: false });
  const unreservedText = fc.array(fc.constantFrom(...UNRESERVED), { maxLength: 8 }).map(chars => chars.join(''));
  const unreservedPairs = fc.array(fc.tuple(unreservedText, unreservedText), { maxLength: 5 }) as fc.Arbitrary<OrderedPairs>;
  fc.assert(fc.property(path, unreservedPairs, (p, query) => {
    const input = { method: 'GET' as const, path: p, query, date };
    assert.equal(signer.sign(input).headers['DTAPI-Signature'], unencodedSigner.sign(input).headers['DTAPI-Signature']);
  }), RUNS);
  const reservedPairs = fc.tuple(unreservedText, unreservedText, fc.constantFrom(...RESERVED), unreservedText)
    .map(([key, before, reserved, after]) => [[key, `${before}${reserved}${after}`]] as OrderedPairs);
  fc.assert(fc.property(path, reservedPairs, (p, query) => {
    const input = { method: 'GET' as const, path: p, query, date };
    assert.notEqual(signer.sign(input).headers['DTAPI-Signature'], unencodedSigner.sign(input).headers['DTAPI-Signature']);
  }), RUNS);
});

test('a control character in any query key or value is refused before signing', () => {
  const control = fc.integer({ min: 0, max: 0x1f }).map(code => String.fromCharCode(code));
  fc.assert(fc.property(path, pairs, printable, control, fc.boolean(), (p, query, text, bad, inKey) => {
    const poisoned: OrderedPairs = [...query, inKey ? [`${text}${bad}`, text] : [text, `${text}${bad}`]];
    assert.throws(() => signer.sign({ method: 'GET', path: p, query: poisoned, date }), /invalid control characters/);
  }), RUNS);
});

test('Advanced Search GET accepts exactly one RFC3986-encoded canonical Base64 segment and refuses the raw form', () => {
  const route = fc.constantFrom('/advancedsearch/api/search', '/advancedsearch/api/analyze/field/terms', '/advancedsearch/api/graph/count/3600000');
  const encodeRfc3986 = (value: string) => encodeURIComponent(value).replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  fc.assert(fc.property(route, fc.uint8Array({ minLength: 1, maxLength: 256 }), (prefix, bytes) => {
    const base64 = Buffer.from(bytes).toString('base64');
    const signed = signer.sign({ method: 'GET', path: `${prefix}/${encodeRfc3986(base64)}`, date });
    assert.equal(signed.url, `${prefix}/${encodeRfc3986(base64)}`);
    if (/[+/=]/.test(base64)) assert.throws(() => signer.sign({ method: 'GET', path: `${prefix}/${base64}`, date }), TypeError);
    assert.throws(() => signer.sign({ method: 'GET', path: `${prefix}/${encodeRfc3986(base64)}/extra`, date }), TypeError);
  }), RUNS);
});

test('a JSON body binds its exact bytes, is refused next to a query, and must be compact', () => {
  const document = fc.dictionary(fc.string().filter(k => !CONTROL.test(k) && k !== '__proto__'), fc.oneof(fc.string().filter(s => !CONTROL.test(s)), fc.integer(), fc.boolean()), { maxKeys: 4, noNullPrototype: true });
  const nonEmptyPairs = fc.array(fc.tuple(printable, printable), { minLength: 1, maxLength: 3 }) as fc.Arbitrary<OrderedPairs>;
  fc.assert(fc.property(path, document, nonEmptyPairs, (p, body, query) => {
    const bytes = new TextEncoder().encode(JSON.stringify(body));
    const signed = signer.sign({ method: 'POST', path: p, body: { kind: 'json', bytes }, date });
    assert.deepEqual(signed.bodyBytes, bytes);
    assert.equal(signed.headers['Content-Type'], 'application/json');
    assert.throws(() => signer.sign({ method: 'POST', path: p, query, body: { kind: 'json', bytes }, date }), /not a supported appliance request shape/);
    assert.throws(() => signer.sign({ method: 'GET', path: p, body: { kind: 'json', bytes }, date }), /only for POST/);
    if (Object.keys(body).length) {
      const pretty = new TextEncoder().encode(JSON.stringify(body, null, 2));
      assert.throws(() => signer.sign({ method: 'POST', path: p, body: { kind: 'json', bytes: pretty }, date }), /compact serialization/);
    }
  }), RUNS);
});

test('formatApiDate is a pure UTC rendering: compact and spaced forms agree and are accepted by the signer', () => {
  fc.assert(fc.property(fc.date({ min: new Date('1970-01-01T00:00:00Z'), max: new Date('2099-12-31T23:59:59Z'), noInvalidDate: true }), path, (when, p) => {
    const compact = formatApiDate(when, 'compact');
    const spaced = formatApiDate(when, 'spaced');
    assert.match(compact, /^\d{8}T\d{6}$/);
    assert.match(spaced, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    assert.equal(compact, spaced.replace(/[-:]/g, '').replace(' ', 'T'));
    assert.equal(spaced, when.toISOString().slice(0, 19).replace('T', ' '));
    for (const value of [compact, spaced]) assert.equal(signer.sign({ method: 'GET', path: p, date: value }).headers['DTAPI-Date'], value);
  }), RUNS);
});
