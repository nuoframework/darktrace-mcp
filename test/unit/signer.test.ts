import assert from 'node:assert/strict';
import test from 'node:test';
import { createSigner, formatApiDate } from '../../src/client/signer.js';

const date = '20230101T120000';

test('query signing mode is explicit and encoded and unencoded signatures do not fall back', () => {
  const input = { method: 'GET' as const, path: '/devices', query: [['name', 'a b'] as const], date };
  const encoded = createSigner('public', 'secret', { encodeQueryInSignature: true }).sign(input);
  const unencoded = createSigner('public', 'secret', { encodeQueryInSignature: false }).sign(input);

  assert.equal(encoded.url, '/devices?name=a%20b');
  assert.equal(unencoded.url, '/devices?name=a%20b');
  assert.equal(encoded.headers['DTAPI-Signature'], 'cc2ca8e99b9e9251b88f5f20efee827f6e6e0f0b');
  assert.equal(unencoded.headers['DTAPI-Signature'], '037036f52a750de87b99e141c98127128f86bac8');
  assert.notEqual(encoded.headers['DTAPI-Signature'], unencoded.headers['DTAPI-Signature']);
  assert.equal('signedString' in encoded, false);
});

test('query encoding handles spaces, quotes, plus signs, and repeated keys deterministically', () => {
  const signer = createSigner('public', 'secret', { encodeQueryInSignature: true });
  const quoted = signer.sign({
    method: 'GET',
    path: '/devicesearch',
    query: [['search', 'a "b"']],
    date,
  });
  const repeated = signer.sign({
    method: 'GET',
    path: '/tags',
    query: [['protocol', 'tcp'], ['protocol', 'udp']],
    date,
  });

  assert.equal(quoted.url, '/devicesearch?search=a%20%22b%22');
  assert.equal(quoted.headers['DTAPI-Signature'], '388c3609e6cb3528fb17873eb28f99618c5ca6e0');
  assert.equal(repeated.url, '/tags?protocol=tcp&protocol=udp');
  assert.equal(repeated.headers['DTAPI-Signature'], 'aa56a1eb79b0d56d6b99a3f4c1e17d572a7e5650');
});

test('JSON body bytes are signed unchanged on the path-only appliance form and copied defensively', () => {
  const source = new TextEncoder().encode('{"count":2}');
  const signed = createSigner('public', 'secret', { encodeQueryInSignature: true }).sign({
    method: 'POST',
    path: '/devices',
    body: { kind: 'json', bytes: source },
    date,
  });

  source[0] = 0;
  assert.equal(new TextDecoder().decode(signed.bodyBytes), '{"count":2}');
  assert.equal(signed.headers['Content-Type'], 'application/json');
  assert.equal(signed.headers['DTAPI-Signature'], '116e0ddda47eac8dc12409859280baef03c31148');
  assert.throws(() => createSigner('public', 'secret', { encodeQueryInSignature: true }).sign({
    method: 'POST', path: '/devices', query: [['x', '1']],
    body: { kind: 'json', bytes: new TextEncoder().encode('{"count":2}') }, date,
  }), /query plus JSON/);
});

test('form bodies use one encoded representation for transport and signing', () => {
  const signed = createSigner('public', 'secret', { encodeQueryInSignature: false }).sign({
    method: 'POST',
    path: '/tags',
    body: { kind: 'form', pairs: [['did', '4'], ['tag', 'app x']] },
    date,
  });
  assert.equal(new TextDecoder().decode(signed.bodyBytes), 'did=4&tag=app+x');
  assert.equal(signed.headers['Content-Type'], 'application/x-www-form-urlencoded');
  assert.equal(signed.headers['DTAPI-Signature'], '493040df7c5d4ea1975778fafed8ed7c62076325');
});

test('DELETE query and encoded Advanced Search Base64 path preserve the signed wire bytes', () => {
  const signer = createSigner('public', 'secret', { encodeQueryInSignature: true });
  const deleted = signer.sign({ method: 'DELETE', path: '/tags/entities', query: [['did', '4'], ['tag', 'ops']], date });
  const search = signer.sign({ method: 'GET', path: '/advancedsearch/api/search/%2B%2F8%3D', date });

  assert.equal(deleted.url, '/tags/entities?did=4&tag=ops');
  assert.equal(deleted.headers['DTAPI-Signature'], 'af076e45f77433e8edf52e2953793f40dcfe20c6');
  assert.equal(search.url, '/advancedsearch/api/search/%2B%2F8%3D');
  assert.equal(search.headers['DTAPI-Signature'], 'ca53f70e5801972fe73e92fd920813b4592ec678');
  assert.throws(() => signer.sign({ method: 'GET', path: '/advancedsearch/api/search/+/8=', date }), /S6 path/);
});

test('date formatting is stable in UTC for both supported formats', () => {
  const instant = new Date('2026-10-05T20:04:05.000Z');
  assert.equal(formatApiDate(instant, 'compact'), '20261005T200405');
  assert.equal(formatApiDate(instant, 'spaced'), '2026-10-05 20:04:05');
});

test('signer rejects unsafe paths, invalid dates, and non-compact JSON bodies', () => {
  const signer = createSigner('public', 'secret', { encodeQueryInSignature: true });
  assert.throws(() => signer.sign({ method: 'GET', path: 'https://host.example/path', date }), /safe absolute-path/);
  assert.throws(() => signer.sign({ method: 'GET', path: '/devices?x=1', date }), /safe absolute-path/);
  assert.throws(() => signer.sign({ method: 'GET', path: '/devices/../tags', date }), /traversal/);
  for (const path of ['/x//y', '/x/a%2Fb', '/x/%252F', '/x/%252e%252e/y']) {
    assert.throws(() => signer.sign({ method: 'GET', path, date }), /safe absolute|ambiguous|traversal/);
  }
  assert.throws(() => signer.sign({ method: 'GET', path: '/devices', date: 'not-a-date' }), /DTAPI-Date/);
  assert.throws(() => signer.sign({ method: 'POST', path: '/devices', body: { kind: 'json', bytes: new TextEncoder().encode('{\n"ok":true}') }, date }), /compact serialization/);
});
