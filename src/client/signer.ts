import { createHmac } from 'node:crypto';

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

function validatePath(path: string): void {
  if (
    !path.startsWith('/') || path.startsWith('//') || path.includes('?') || path.includes('#') ||
    path.includes('\\') || CONTROL_CHARACTERS.test(path) || /\s/.test(path)
  ) {
    throw new TypeError('path must be a safe absolute-path reference');
  }
  for (const rawSegment of path.split('/')) {
    let segment: string;
    try {
      segment = decodeURIComponent(rawSegment);
    } catch {
      throw new TypeError('path contains invalid percent encoding');
    }
    if (segment === '.' || segment === '..' || segment.includes('\\') || CONTROL_CHARACTERS.test(segment)) {
      throw new TypeError('path contains a traversal segment');
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
