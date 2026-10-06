import { createHmac } from 'node:crypto';
import { Buffer } from 'node:buffer';

export type HttpMethod = 'GET' | 'POST' | 'DELETE';
export type OrderedPairs = ReadonlyArray<readonly [string, string]>;

export interface SignInput {
  readonly method: HttpMethod;
  /** Absolute-path reference only. Origin, query, and fragment are never accepted here. */
  readonly path: string;
  /** Ordered pairs. Arrays are represented as repeated keys. */
  readonly query?: OrderedPairs;
  readonly body?:
    | { readonly kind: 'json'; readonly bytes: Uint8Array }
    | { readonly kind: 'form'; readonly pairs: OrderedPairs };
  /** Already formatted DTAPI-Date, in UTC. */
  readonly date: string;
}

export interface SignedRequest {
  /** Relative, percent-encoded path and query for the configured HTTPS origin. */
  readonly url: string;
  readonly headers: {
    readonly 'DTAPI-Token': string;
    readonly 'DTAPI-Date': string;
    readonly 'DTAPI-Signature': string;
    readonly 'Content-Type'?: string;
  };
  /** Exact bytes sent by the HTTP client and covered by the signature. */
  readonly bodyBytes?: Uint8Array;
}

export interface Signer {
  sign(input: SignInput): SignedRequest;
}

export interface SignerOptions {
  /** Explicitly choose whether query pairs are percent-encoded in the HMAC text. */
  readonly encodeQueryInSignature: boolean;
}

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const MAX_PATH_DECODE_PASSES = 16;
const MAX_S6_BASE64_CHARS = 21_848;

function encodeRfc3986(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function encodeForm(value: string): string {
  return encodeRfc3986(value).replace(/%20/g, '+');
}

function pairsToText(pairs: OrderedPairs, encoded: boolean): string {
  return pairs.map(([key, value]) => {
    if (CONTROL_CHARACTERS.test(key) || CONTROL_CHARACTERS.test(value)) {
      throw new TypeError('query fields contain invalid control characters');
    }
    const encode = encoded ? encodeRfc3986 : (item: string) => item;
    return `${encode(key)}=${encode(value)}`;
  }).join('&');
}

function formPairsToText(pairs: OrderedPairs): string {
  return pairs.map(([key, value]) => {
    if (CONTROL_CHARACTERS.test(key) || CONTROL_CHARACTERS.test(value)) {
      throw new TypeError('form fields contain invalid control characters');
    }
    return `${encodeForm(key)}=${encodeForm(value)}`;
  }).join('&');
}

function strictBase64(value: string): boolean {
  if (value.length === 0 || value.length > MAX_S6_BASE64_CHARS || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return false;
  const bytes = Buffer.from(value, 'base64');
  return bytes.byteLength <= 16_384 && bytes.toString('base64') === value;
}

/** Returns the final S6 Base64 segment index, and rejects malformed or raw S6 paths. */
function s6Base64SegmentIndex(path: string): number | undefined {
  const parts = path.split('/');
  if (parts[1] !== 'advancedsearch' || parts[2] !== 'api' || !['search', 'analyze', 'graph'].includes(parts[3] ?? '')) return undefined;
  const expectedLength = parts[3] === 'search' ? 5 : 7;
  const index = expectedLength - 1;
  if (parts.length !== expectedLength || !parts[index] || !strictBase64(decodeS6Segment(parts[index]!)) ||
      encodeRfc3986(decodeS6Segment(parts[index]!)) !== parts[index]) {
    throw new TypeError('S6 path must contain one RFC3986-encoded standard-Base64 segment');
  }
  return index;
}

function decodeS6Segment(segment: string): string {
  try { return decodeURIComponent(segment); }
  catch { throw new TypeError('S6 path contains invalid percent encoding'); }
}

function validatePath(path: string): void {
  if (
    !path.startsWith('/') || path.includes('//') || path.includes('?') || path.includes('#') ||
    path.includes('\\') || CONTROL_CHARACTERS.test(path) || /\s/.test(path)
  ) {
    throw new TypeError('path must be a safe absolute-path reference');
  }
  const segments = path.split('/');
  const s6Index = s6Base64SegmentIndex(path);
  for (let index = 0; index < segments.length; index += 1) {
    if (index === s6Index) continue;
    let segment = segments[index]!;
    for (let pass = 0; pass < MAX_PATH_DECODE_PASSES; pass += 1) {
      if (segment === '.' || segment === '..' || segment.includes('/') || segment.includes('\\') || segment.includes('?') || segment.includes('#') || CONTROL_CHARACTERS.test(segment)) {
        throw new TypeError('path contains an ambiguous separator or traversal segment');
      }
      let decoded: string;
      try { decoded = decodeURIComponent(segment); }
      catch { throw new TypeError('path contains invalid percent encoding'); }
      if (decoded === segment) break;
      segment = decoded;
      if (pass === MAX_PATH_DECODE_PASSES - 1) throw new TypeError('path percent encoding is ambiguous');
    }
    if (segment === '.' || segment === '..' || segment.includes('/') || segment.includes('\\') || segment.includes('?') || segment.includes('#') || CONTROL_CHARACTERS.test(segment)) {
      throw new TypeError('path contains an ambiguous separator or traversal segment');
    }
  }
}

function validateDate(date: string): void {
  if (!/^(?:\d{8}T\d{6}|\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})$/.test(date)) {
    throw new TypeError('date must use a supported UTC DTAPI-Date format');
  }
}

function decodeJsonBody(bytes: Uint8Array): string {
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    JSON.parse(text);
  } catch {
    throw new TypeError('JSON body must be valid UTF-8 JSON');
  }
  // JSON.stringify output contains no raw line breaks; keeping the signed payload
  // on one line avoids confusing it with the newline-delimited HMAC fields.
  if (/[\r\n]/.test(text)) throw new TypeError('JSON body must use compact serialization');
  return text;
}

function appendSignaturePayload(pathAndQuery: string, bodyText: string): string {
  return `${pathAndQuery}${pathAndQuery.includes('?') ? '&' : '?'}${bodyText}`;
}

/** Format a date deterministically in UTC; local timezone settings do not affect it. */
export function formatApiDate(date: Date, format: 'compact' | 'spaced' = 'compact'): string {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) throw new TypeError('date must be valid');
  const iso = date.toISOString().slice(0, 19);
  return format === 'compact' ? iso.replace(/[-:]/g, '') : iso.replace('T', ' ');
}

/** Create a Darktrace HMAC-SHA1 signer with one explicit query encoding mode. */
export function createSigner(publicToken: string, privateToken: string, opts: SignerOptions): Signer {
  if (typeof publicToken !== 'string' || publicToken.length === 0 || CONTROL_CHARACTERS.test(publicToken)) {
    throw new TypeError('public token is invalid');
  }
  if (typeof privateToken !== 'string' || privateToken.length === 0) throw new TypeError('private token is invalid');
  if (typeof opts?.encodeQueryInSignature !== 'boolean') {
    throw new TypeError('encodeQueryInSignature must be explicitly set');
  }

  return Object.freeze({
    sign(input: SignInput): SignedRequest {
      if (!['GET', 'POST', 'DELETE'].includes(input.method)) throw new TypeError('unsupported HTTP method');
      validatePath(input.path);
      validateDate(input.date);
      if (CONTROL_CHARACTERS.test(input.date)) throw new TypeError('date contains invalid control characters');
      if (input.body !== undefined && input.method !== 'POST') {
        throw new TypeError('request bodies are supported only for POST');
      }
      if (input.body?.kind === 'json' && (input.query?.length ?? 0) > 0) {
        // S4 query+JSON is blocked: 7.1.0 accepts only path?{json}; query may ride on the wire unsigned.
        throw new TypeError('query plus JSON body is not a supported appliance request shape');
      }

      const pairs = input.query ?? [];
      const wireQuery = pairsToText(pairs, true);
      const signatureQuery = pairsToText(pairs, opts.encodeQueryInSignature);
      const url = wireQuery.length === 0 ? input.path : `${input.path}?${wireQuery}`;
      let signedPathAndQuery = signatureQuery.length === 0 ? input.path : `${input.path}?${signatureQuery}`;
      let bodyBytes: Uint8Array | undefined;
      let contentType: string | undefined;

      if (input.body?.kind === 'json') {
        const jsonText = decodeJsonBody(input.body.bytes);
        bodyBytes = new Uint8Array(input.body.bytes);
        contentType = 'application/json';
        signedPathAndQuery = appendSignaturePayload(signedPathAndQuery, jsonText);
      } else if (input.body?.kind === 'form') {
        const formText = formPairsToText(input.body.pairs);
        bodyBytes = new TextEncoder().encode(formText);
        contentType = 'application/x-www-form-urlencoded';
        if (formText.length > 0) signedPathAndQuery = appendSignaturePayload(signedPathAndQuery, formText);
      }

      const signedString = `${signedPathAndQuery}\n${publicToken}\n${input.date}`;
      const signature = createHmac('sha1', privateToken).update(signedString, 'utf8').digest('hex');
      const headers = {
        'DTAPI-Token': publicToken,
        'DTAPI-Date': input.date,
        'DTAPI-Signature': signature,
        ...(contentType === undefined ? {} : { 'Content-Type': contentType }),
      };

      return Object.freeze({
        url,
        headers: Object.freeze(headers),
        ...(bodyBytes === undefined ? {} : { bodyBytes }),
      });
    },
  });
}
