import assert from 'node:assert/strict';
import test from 'node:test';
import fc from 'fast-check';
import { apiArgs, argsDigest, canonicalJson, sha256Hex } from '../../src/policy/canonical.js';

// Property-based tests (fast-check) for the canonical JSON used by preview binding, approval text
// and the audit chain: key order must never change a digest, and control fields must never bind.
const RUNS = { numRuns: 400 };
const CONTROL_FIELDS = ['operation', 'dryRun', 'confirm', 'previewId'];
const key = fc.string({ unit: 'grapheme', maxLength: 12 });
const finiteNumber = fc.oneof(fc.integer(), fc.double({ noNaN: true, noDefaultInfinity: true }).filter(n => !Object.is(n, -0)));
const value = fc.letrec<{ value: unknown }>(tie => ({
  value: fc.oneof({ depthSize: 'small', maxDepth: 5 },
    fc.string({ unit: 'grapheme' }), finiteNumber, fc.boolean(), fc.constant(null),
    fc.array(tie('value'), { maxLength: 5 }),
    fc.dictionary(key, tie('value'), { maxKeys: 5, noNullPrototype: true })),
})).value;
const apiRecord = fc.dictionary(key.filter(k => !CONTROL_FIELDS.includes(k)), value, { maxKeys: 6, noNullPrototype: true });

/** Same value, every object rebuilt with its keys inserted in reverse order. */
function reorder(input: unknown): unknown {
  if (Array.isArray(input)) return input.map(reorder);
  if (input !== null && typeof input === 'object') {
    return Object.fromEntries(Object.entries(input).reverse().map(([k, v]) => [k, reorder(v)]));
  }
  return input;
}

test('canonicalJson is independent of object key insertion order at every depth', () => {
  fc.assert(fc.property(value, v => {
    assert.equal(canonicalJson(reorder(v)), canonicalJson(v));
  }), RUNS);
});

test('canonicalJson is valid JSON that round-trips to the same value and to the same canonical text', () => {
  fc.assert(fc.property(value, v => {
    const text = canonicalJson(v);
    const parsed = JSON.parse(text);
    assert.deepEqual(parsed, JSON.parse(JSON.stringify(v)));
    assert.equal(canonicalJson(parsed), text);
  }), RUNS);
});

test('canonicalJson sorts sibling keys by Unicode code point, not UTF-16 code unit', () => {
  const astral = fc.constantFrom('\u{1F600}', '\u{10000}', '\u{1D11E}');
  const bmpHigh = fc.constantFrom('', '�', 'ﬁ');
  fc.assert(fc.property(astral, bmpHigh, finiteNumber, finiteNumber, (a, b, x, y) => {
    const text = canonicalJson({ [a]: x, [b]: y });
    assert.equal(text, `{${JSON.stringify(b)}:${JSON.stringify(y)},${JSON.stringify(a)}:${JSON.stringify(x)}}`);
  }), RUNS);
});

test('canonicalJson omits undefined members and refuses nonfinite numbers wherever they sit', () => {
  fc.assert(fc.property(apiRecord, key, fc.constantFrom(NaN, Infinity, -Infinity), (record, k, bad) => {
    assert.equal(canonicalJson({ ...record, [k]: undefined }), canonicalJson(Object.fromEntries(Object.entries(record).filter(([name]) => name !== k))));
    assert.throws(() => canonicalJson({ ...record, [k]: bad }), /Nonfinite canonical number/);
    assert.throws(() => canonicalJson([...Object.values(record), bad]), /Nonfinite canonical number/);
  }), RUNS);
});

test('argsDigest ignores the control fields and the key order, binds the operation id and is 64 hex characters', () => {
  const operationId = fc.constantFrom('post_tags', 'post_antigena', 'delete_tags_tid', 'post_intelfeed');
  fc.assert(fc.property(operationId, apiRecord, fc.boolean(), fc.boolean(), fc.string({ unit: fc.constantFrom(...'0123456789abcdef'), minLength: 32, maxLength: 32 }), (op, args, dryRun, confirm, previewId) => {
    const digest = argsDigest(op, args);
    assert.match(digest, /^[a-f0-9]{64}$/);
    assert.equal(argsDigest(op, { ...args, operation: op, dryRun, confirm, previewId }), digest);
    assert.equal(argsDigest(op, reorder(args) as Record<string, unknown>), digest);
    assert.equal(digest, sha256Hex(canonicalJson({ operationId: op, args })));
    assert.deepEqual(apiArgs({ ...args, operation: op, dryRun, confirm, previewId }), args);
  }), RUNS);
});

test('argsDigest changes when the operation id or any bound argument changes', () => {
  fc.assert(fc.property(apiRecord, key.filter(k => !CONTROL_FIELDS.includes(k)), value, (args, k, extra) => {
    const base = argsDigest('post_tags', args);
    assert.notEqual(argsDigest('post_antigena', args), base);
    if (canonicalJson(args[k]) !== canonicalJson(extra)) assert.notEqual(argsDigest('post_tags', { ...args, [k]: extra }), base);
  }), RUNS);
});
