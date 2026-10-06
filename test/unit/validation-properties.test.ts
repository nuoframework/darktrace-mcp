import assert from 'node:assert/strict';
import test from 'node:test';
import fc from 'fast-check';
import { checkInput, validatePathSegment, validateSearchHash } from '../../src/api/validation.js';

// Property-based tests (fast-check): every run draws fresh inputs; a failing case is printed with
// its seed and the minimal counterexample.
const RUNS = { numRuns: 300 };

/** Characters validatePathSegment must never let through, at any decoding layer. */
const FORBIDDEN_IN_SEGMENT = ['/', '\\', '?', '#', ' ', '\t', '\n', '\r', '\u000b', '\u000c', ' ', ' ', ' ', '　', '﻿', '\u0000', '\u0001', '\u001f', '\u007f'];
/** Unreserved and sub-delimiter characters that are legitimate inside one URL segment. */
const SAFE_SEGMENT_CHARS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_~!$&\'()*+,;=:@'];
const safeSegment = fc.array(fc.constantFrom(...SAFE_SEGMENT_CHARS), { minLength: 1, maxLength: 64 }).map(chars => chars.join(''));
const asciiText = fc.array(fc.constantFrom(...SAFE_SEGMENT_CHARS, '.', '%'), { maxLength: 16 }).map(chars => chars.join(''));

test('validatePathSegment accepts every safe segment, raw or percent-encoded', () => {
  fc.assert(fc.property(safeSegment, segment => {
    validatePathSegment(segment);
    validatePathSegment(encodeURIComponent(segment));
  }), RUNS);
});

test('validatePathSegment rejects whitespace, control characters and separators wherever they appear', () => {
  fc.assert(fc.property(asciiText, fc.constantFrom(...FORBIDDEN_IN_SEGMENT), asciiText, (prefix, bad, suffix) => {
    assert.throws(() => validatePathSegment(`${prefix}${bad}${suffix}`), /Invalid path segment/);
  }), RUNS);
});

test('validatePathSegment rejects forbidden characters hidden under one to three percent-encoding layers', () => {
  fc.assert(fc.property(safeSegment, fc.constantFrom(...FORBIDDEN_IN_SEGMENT), fc.integer({ min: 1, max: 3 }), (prefix, bad, layers) => {
    let candidate = `${prefix}${bad}`;
    for (let i = 0; i < layers; i++) candidate = encodeURIComponent(candidate);
    assert.throws(() => validatePathSegment(candidate), /Invalid path segment/);
  }), RUNS);
});

test('validatePathSegment rejects dot and dot-dot traversal segments under any encoding depth', () => {
  fc.assert(fc.property(fc.constantFrom('.', '..'), fc.integer({ min: 0, max: 3 }), (dots, layers) => {
    let candidate: string = dots;
    for (let i = 0; i < layers; i++) candidate = encodeURIComponent(candidate).replace(/\./g, '%2E');
    assert.throws(() => validatePathSegment(candidate), /Invalid path segment/);
  }), RUNS);
});

const CONTROL_IN_INPUT = ['\u0000', '\u0001', '\u0007', '\u0008', '\u000b', '\u000c', '\u000e', '\u001b', '\u001f'];
const safeKey = fc.array(fc.constantFrom(...SAFE_SEGMENT_CHARS, ' ', '.'), { minLength: 1, maxLength: 12 }).map(chars => chars.join(''))
  .filter(key => !['__proto__', 'prototype', 'constructor'].includes(key));
const plainValue = fc.letrec<{ value: unknown }>(tie => ({
  value: fc.oneof({ depthSize: 'small', maxDepth: 4 },
    fc.array(fc.constantFrom(...SAFE_SEGMENT_CHARS, ' ', '\t', '\n', '\r'), { maxLength: 24 }).map(chars => chars.join('')),
    fc.integer(), fc.boolean(), fc.constant(null),
    fc.array(tie('value'), { maxLength: 4 }),
    fc.dictionary(safeKey, tie('value'), { maxKeys: 4, noNullPrototype: true })),
})).value;

/** Rebuild `value` with `replacement` placed at `path` (a sequence of key/index choices). */
function plant(value: unknown, path: readonly number[], replacement: unknown): unknown {
  if (path.length === 0) return replacement;
  const [head, ...rest] = path;
  if (Array.isArray(value) && value.length) {
    const index = head! % value.length;
    return value.map((item, i) => i === index ? plant(item, rest, replacement) : item);
  }
  if (value && typeof value === 'object' && Object.keys(value).length) {
    const keys = Object.keys(value);
    const key = keys[head! % keys.length]!;
    return { ...(value as Record<string, unknown>), [key]: plant((value as Record<string, unknown>)[key], rest, replacement) };
  }
  return replacement;
}

test('checkInput accepts plain JSON values built from printable text within the default budget', () => {
  fc.assert(fc.property(plainValue, value => { checkInput(value); }), RUNS);
});

test('checkInput rejects a string with a control character (other than tab, LF and CR) at any depth', () => {
  fc.assert(fc.property(plainValue, fc.array(fc.nat(), { maxLength: 4 }), fc.constantFrom(...CONTROL_IN_INPUT), safeKey, (value, path, control, text) => {
    assert.throws(() => checkInput(plant(value, path, `${text}${control}`)), /Invalid string/);
  }), RUNS);
});

test('checkInput rejects prototype-polluting keys at any depth', () => {
  fc.assert(fc.property(plainValue, fc.array(fc.nat(), { maxLength: 4 }), fc.constantFrom('__proto__', 'prototype', 'constructor'), (value, path, key) => {
    const poisoned = Object.fromEntries([[key, 1]]);
    assert.throws(() => checkInput(plant(value, path, poisoned)), /Unsafe key/);
  }), RUNS);
});

const searchDocument = fc.record({
  search: fc.array(fc.constantFrom(...SAFE_SEGMENT_CHARS, ' ', '"'), { minLength: 1, maxLength: 64 }).map(chars => chars.join('')),
  fields: fc.array(safeKey, { maxLength: 8 }),
  timeframe: fc.integer({ min: 1, max: 604800 }).map(String),
  size: fc.option(fc.integer({ min: 1, max: 1000 }), { nil: undefined }),
  offset: fc.option(fc.integer({ min: 0, max: 100000 }), { nil: undefined }),
}, { noNullPrototype: true });

test('validateSearchHash accepts the canonical Base64 of every bounded search document', () => {
  fc.assert(fc.property(searchDocument, document => {
    const compact = JSON.parse(JSON.stringify(document));
    validateSearchHash(Buffer.from(JSON.stringify(compact), 'utf8').toString('base64'));
  }), RUNS);
});

test('validateSearchHash rejects non-canonical Base64 (wrong padding, stray characters, unpadded length)', () => {
  fc.assert(fc.property(searchDocument, fc.constantFrom('pad', 'char', 'length'), (document, mutation) => {
    const canonical = Buffer.from(JSON.stringify(document), 'utf8').toString('base64');
    const mutated = mutation === 'pad' ? `${canonical}=` : mutation === 'char' ? `${canonical.slice(0, -1)}-` : canonical.slice(1);
    assert.throws(() => validateSearchHash(mutated), /Invalid search encoding/);
  }), RUNS);
});
