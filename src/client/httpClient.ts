import { randomUUID } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { performance } from 'node:perf_hooks';
import { assertSafeNetworkEnvironment, type Config } from '../config/schema.js';
import { DarktraceApiError, type ApiErrorKind } from './errors.js';
import {
  NodeHttpsConnector,
  type AddressResolver,
  type ConnectorRequest,
  type ConnectorResponse,
  type HttpsConnector,
} from './httpsConnector.js';
import { DestinationPolicyError } from './httpsConnector.js';
import { createSigner, formatApiDate, type HttpMethod, type Signer } from './signer.js';

export type QueryValue = string | number | boolean | readonly string[] | undefined;
export type FormValue = string | number | boolean | readonly (string | number | boolean)[] | undefined;

/** A code-owned route entry. Only these operation IDs can reach the signer. */
export interface TrustedOperation {
  readonly operationId: string;
  readonly method: HttpMethod;
  readonly pathTemplate: string;
  /** Code-owned non-path input names available to the legacy preview surface. */
  readonly parameterNames?: readonly string[];
}

export type QueryInput = ReadonlyArray<readonly [string, string]> | Readonly<Record<string, QueryValue>>;

export interface ClientRequest {
  readonly operationId: string;
  readonly pathParams?: Readonly<Record<string, string | number>>;
  readonly query?: QueryInput;
  readonly body?:
    | { readonly kind: 'json'; readonly value: unknown }
    | { readonly kind: 'form'; readonly value: Readonly<Record<string, FormValue>> };
  readonly accept?: 'json' | 'binary';
}

/** Standalone structural contract used by src/api/operations and the server layer. */
export interface OperationRequest {
  readonly operationId: string;
  readonly pathParams?: Readonly<Record<string, string | number>>;
  readonly query?: ReadonlyArray<readonly [string, string]>;
  readonly body?: unknown;
  readonly contentType?: 'application/json' | 'application/x-www-form-urlencoded';
  readonly signal?: AbortSignal;
}

export interface ApiResponse<T = unknown> {
  readonly status: number;
  readonly json?: T;
  readonly bytes?: Uint8Array;
  readonly truncated: boolean;
  readonly elapsedMs: number;
  readonly requestId: string;
}

export interface DryRunResult {
  readonly dryRun: true;
  readonly operationId: string;
  readonly method: HttpMethod;
  readonly parameterNames: readonly string[];
}

export interface HttpClient {
  request(request: OperationRequest): Promise<ApiResponse>;
  /** Legacy internal preview surface; returns only operation and parameter names. */
  send<T = unknown>(req: ClientRequest, opts?: { readonly dryRun?: boolean; readonly signal?: AbortSignal }): Promise<ApiResponse<T> | DryRunResult>;
  /** Abort active and queued calls and close the dedicated HTTPS agent at EOF/shutdown. */
  close(): void;
}

export interface HttpClientOptions {
  readonly operations: readonly TrustedOperation[];
  /** All dependencies below are test-only. Production always uses node:https and config auth. */
  readonly testOnly?: true;
  readonly signer?: Signer;
  readonly fetchImpl?: typeof fetch;
  readonly fetch?: typeof fetch;
  readonly resolver?: AddressResolver;
  readonly connector?: HttpsConnector;
  readonly now?: () => number;
  readonly random?: () => number;
  readonly delay?: (ms: number, signal: AbortSignal) => Promise<void>;
}

interface RuntimeOperation {
  readonly method: HttpMethod;
  readonly pathTemplate: string;
  readonly pathParamNames: readonly string[];
  readonly parameterNames: readonly string[];
}

interface EncodedBody {
  readonly kind: 'json';
  readonly bytes: Uint8Array;
}
interface EncodedForm {
  readonly kind: 'form';
  readonly pairs: Array<readonly [string, string]>;
}

const RETRY_STATUSES = new Set([429, 502, 503, 504]);
const TRANSIENT_PRE_RESPONSE_CODES = new Set([
  'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EPIPE', 'ECONNABORTED', 'ENETUNREACH', 'EHOSTUNREACH',
]);
const UNSUPPORTED_S6 = new Set([
  'get_advancedsearch_api_search_query',
  'get_advancedsearch_api_analyze_field_analysis_query',
  'get_advancedsearch_api_graph_graphmode_interval_query',
]);
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;
const MAX_RESPONSE_HARD_CAP = 2_097_152;
const RATE_WINDOW_MS = 60_000;
const productionAttemptTimes: number[] = [];

function rfc3986(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function operationRegistry(entries: readonly TrustedOperation[]): ReadonlyMap<string, RuntimeOperation> {
  const result = new Map<string, RuntimeOperation>();
  for (const entry of entries) {
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(entry.operationId) || result.has(entry.operationId)) {
      throw new TypeError('trusted operation registry contains an invalid or duplicate id');
    }
    if (!['GET', 'POST', 'DELETE'].includes(entry.method)) throw new TypeError('trusted operation registry contains an invalid method');
    if (
      !entry.pathTemplate.startsWith('/') || entry.pathTemplate.startsWith('//') || entry.pathTemplate.includes('?') ||
      entry.pathTemplate.includes('#') || entry.pathTemplate.includes('\\') || CONTROL_CHARS.test(entry.pathTemplate)
    ) throw new TypeError('trusted operation registry contains an invalid path template');
    if (entry.pathTemplate.startsWith('/agemail/') || entry.operationId.startsWith('post_agemail_') ||
      entry.operationId === 'get_aianalyst_incidents' || UNSUPPORTED_S6.has(entry.operationId)) continue;
    const names: string[] = [];
    const checkedPath = entry.pathTemplate.replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (_match, name: string) => {
      if (names.includes(name)) throw new TypeError('trusted operation registry contains a duplicate path parameter');
      names.push(name);
      return 'route-segment';
    });
    if (/[{}]/.test(checkedPath)) throw new TypeError('trusted operation registry contains an invalid path template');
    for (const segment of checkedPath.split('/')) {
      if (segment === '.' || segment === '..') throw new TypeError('trusted operation registry contains a traversal path');
    }
    const parameterNames = entry.parameterNames ?? [];
    if (!Array.isArray(parameterNames) || parameterNames.some((name) => typeof name !== 'string' || !/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) ||
      new Set(parameterNames).size !== parameterNames.length || parameterNames.some((name) => names.includes(name))) {
      throw new TypeError('trusted operation registry contains invalid parameter names');
    }
    result.set(entry.operationId, Object.freeze({
      method: entry.method,
      pathTemplate: entry.pathTemplate,
      pathParamNames: Object.freeze(names),
      parameterNames: Object.freeze([...names, ...parameterNames]),
    }));
  }
  if (result.size === 0) throw new TypeError('trusted operation registry must not be empty');
  return result;
}

function hasPathTraversal(value: string): boolean {
  let candidate = value;
  for (let pass = 0; pass < 4; pass += 1) {
    if (/(^|[\\/])\.{1,2}(?:[\\/]|$)/.test(candidate)) return true;
    let decoded: string;
    try { decoded = decodeURIComponent(candidate); } catch { return true; }
    if (decoded === candidate) return false;
    candidate = decoded;
  }
  return /%[0-9a-f]{2}/i.test(candidate);
}

function expandPath(operation: RuntimeOperation, supplied: ClientRequest['pathParams']): string {
  const params = supplied ?? {};
  const suppliedNames = Object.keys(params);
  if (suppliedNames.length !== operation.pathParamNames.length || operation.pathParamNames.some((name) => !Object.hasOwn(params, name))) {
    throw new TypeError('path parameters do not match the trusted operation');
  }
  for (const name of suppliedNames) if (!operation.pathParamNames.includes(name)) throw new TypeError('unexpected path parameter');
  return operation.pathTemplate.replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (_match, name: string) => {
    const value = params[name];
    if ((typeof value !== 'string' && typeof value !== 'number') || (typeof value === 'number' && !Number.isFinite(value))) {
      throw new TypeError('path parameter has an invalid value');
    }
    const text = String(value);
    if (text.length === 0 || CONTROL_CHARS.test(text) || hasPathTraversal(text)) throw new TypeError('path parameter has an invalid value');
    return rfc3986(text);
  });
}

function encodeQuery(query: ClientRequest['query']): Array<readonly [string, string]> {
  if (Array.isArray(query)) {
    const pairs: Array<readonly [string, string]> = [];
    for (const pair of query) {
      if (!Array.isArray(pair) || pair.length !== 2 || typeof pair[0] !== 'string' || typeof pair[1] !== 'string') throw new TypeError('query pairs are invalid');
      if (CONTROL_CHARS.test(pair[0]) || CONTROL_CHARS.test(pair[1])) throw new TypeError('query fields are invalid');
      pairs.push([pair[0], pair[1]]);
    }
    return pairs;
  }
  const pairs: Array<readonly [string, string]> = [];
  for (const [key, value] of Object.entries(query ?? {})) {
    if (CONTROL_CHARS.test(key)) throw new TypeError('query field name is invalid');
    if (value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) {
      if (typeof item !== 'string' && typeof item !== 'number' && typeof item !== 'boolean') throw new TypeError('query field value is invalid');
      if (typeof item === 'number' && !Number.isFinite(item)) throw new TypeError('query field value is invalid');
      const text = String(item);
      if (CONTROL_CHARS.test(text)) throw new TypeError('query field value is invalid');
      pairs.push([key, text]);
    }
  }
  return pairs;
}

function encodeBody(body: ClientRequest['body']): EncodedBody | EncodedForm | undefined {
  if (body === undefined) return undefined;
  if (body.kind === 'json') {
    let json: string | undefined;
    try { json = JSON.stringify(body.value); } catch { throw new TypeError('JSON body cannot be serialized'); }
    if (json === undefined) throw new TypeError('JSON body cannot be serialized');
    return Object.freeze({ kind: 'json' as const, bytes: new TextEncoder().encode(json) });
  }
  const pairs: Array<readonly [string, string]> = [];
  for (const [key, value] of Object.entries(body.value)) {
    if (CONTROL_CHARS.test(key)) throw new TypeError('form field is invalid');
    if (value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) {
      if (typeof item !== 'string' && typeof item !== 'number' && typeof item !== 'boolean') throw new TypeError('form field is invalid');
      if (typeof item === 'number' && !Number.isFinite(item)) throw new TypeError('form field is invalid');
      const text = String(item);
      if (CONTROL_CHARS.test(text)) throw new TypeError('form field is invalid');
      pairs.push([key, text]);
    }
  }
  return Object.freeze({ kind: 'form' as const, pairs: Object.freeze(pairs) as unknown as Array<readonly [string, string]> });
}

function checkShapes(values: readonly unknown[], maxDepth: number, maxElements: number): boolean {
  const stack: Array<{ value: unknown; depth: number }> = values.map((value) => ({ value, depth: 0 }));
  let elements = 0;
  while (stack.length > 0) {
    const current = stack.pop()!;
    elements += 1;
    if (elements > maxElements || current.depth > maxDepth) return false;
    if (current.value !== null && typeof current.value === 'object') {
      if (Array.isArray(current.value)) {
        for (const child of current.value) stack.push({ value: child, depth: current.depth + 1 });
      } else {
        for (const child of Object.values(current.value)) stack.push({ value: child, depth: current.depth + 1 });
      }
    }
  }
  return true;
}

function queryWireBytes(pairs: readonly (readonly [string, string])[]): number {
  return new TextEncoder().encode(pairs.map(([key, value]) => `${rfc3986(key)}=${rfc3986(value)}`).join('&')).byteLength;
}

function bodyFieldNames(body: ClientRequest['body']): string[] {
  const value = body?.value;
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.keys(value);
}

function queryFieldNames(query: ClientRequest['query']): string[] {
  if (Array.isArray(query)) return query.flatMap((pair) => Array.isArray(pair) && typeof pair[0] === 'string' ? [pair[0]] : []);
  return Object.keys(query ?? {});
}

function responseKind(status: number): ApiErrorKind {
  if (status === 401) return 'auth';
  if (status === 403) return 'forbidden';
  if (status === 400) return 'bad_request';
  if (status === 404) return 'not_found';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'server';
  return 'server';
}

function abortableDelay(ms: number, signal: AbortSignal, delay: (ms: number, signal: AbortSignal) => Promise<void>): Promise<void> {
  if (signal.aborted) return Promise.reject(new Error('aborted'));
  return new Promise((resolve, reject) => {
    const onAbort = () => { cleanup(); reject(new Error('aborted')); };
    const cleanup = () => signal.removeEventListener('abort', onAbort);
    signal.addEventListener('abort', onAbort, { once: true });
    Promise.resolve().then(() => delay(ms, signal)).then(() => { cleanup(); resolve(); }, (error: unknown) => { cleanup(); reject(error); });
  });
}

function defaultDelay(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.reject(new Error('aborted'));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(done, ms);
    timer.unref?.();
    function cleanup(): void { clearTimeout(timer); signal.removeEventListener('abort', abort); }
    function done(): void { cleanup(); resolve(); }
    function abort(): void { cleanup(); reject(new Error('aborted')); }
    signal.addEventListener('abort', abort, { once: true });
  });
}

class Semaphore {
  private active = 0;
  private readonly limit: number;
  private readonly maxQueued: number;
  private readonly waiters: Array<{
    readonly resolve: (release: () => void) => void;
    readonly reject: (error: Error) => void;
    readonly signal: AbortSignal;
    abort?: () => void;
  }> = [];

  constructor(limit: number, maxQueued: number) { this.limit = limit; this.maxQueued = maxQueued; }

  acquire(signal: AbortSignal): Promise<() => void> {
    if (signal.aborted) return Promise.reject(new Error('aborted'));
    if (this.active < this.limit) { this.active += 1; return Promise.resolve(this.releaseFactory()); }
    if (this.waiters.length >= this.maxQueued) return Promise.reject(new Error('overloaded'));
    return new Promise((resolve, reject) => {
      const waiter: { resolve: (release: () => void) => void; reject: (error: Error) => void; signal: AbortSignal; abort?: () => void } = { resolve, reject, signal };
      waiter.abort = () => { const index = this.waiters.indexOf(waiter); if (index >= 0) this.waiters.splice(index, 1); reject(new Error('aborted')); };
      signal.addEventListener('abort', waiter.abort, { once: true });
      this.waiters.push(waiter);
    });
  }

  private releaseFactory(): () => void {
    let released = false;
    return () => {
      if (released) return;
      released = true;
      while (this.waiters.length > 0) {
        const next = this.waiters.shift()!;
        next.signal.removeEventListener('abort', next.abort!);
        if (next.signal.aborted) { next.reject(new Error('aborted')); continue; }
        next.resolve(this.releaseFactory());
        return;
      }
      this.active -= 1;
    };
  }
}

interface ByteStream extends AsyncIterable<Uint8Array> { cancel(): Promise<void> }

function fetchResponse(response: Response): ConnectorResponse {
  if (response.body === null) return { status: response.status, headers: response.headers, body: null };
  const reader = response.body.getReader();
  const body: ByteStream = {
    async *[Symbol.asyncIterator]() {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          yield value;
        }
      } finally { reader.releaseLock(); }
    },
    async cancel() { await reader.cancel().catch(() => undefined); },
  };
  return { status: response.status, headers: response.headers, body };
}

function contentLength(response: ConnectorResponse): number | undefined {
  const raw = response.headers.get('content-length');
  if (raw === null || !/^\d+$/.test(raw.trim())) return undefined;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : undefined;
}

async function readBounded(
  response: ConnectorResponse,
  cap: number,
  used: { wire: number; decoded: number },
): Promise<Uint8Array> {
  const declared = contentLength(response);
  if (declared !== undefined && (used.wire + declared > cap || used.decoded + declared > cap)) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error('too_large');
  }
  if (response.body === null) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for await (const chunk of response.body) {
      const byteLength = chunk.byteLength;
      total += byteLength;
      used.wire += byteLength;
      used.decoded += byteLength;
      if (used.wire > cap || used.decoded > cap) {
        await response.body.cancel().catch(() => undefined);
        throw new Error('too_large');
      }
      chunks.push(new Uint8Array(chunk));
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'too_large') throw error;
    throw new Error('stream_failed');
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

function retryDelay(
  response: ConnectorResponse,
  attempt: number,
  now: number,
  random: () => number,
  cap: number,
  remainingMs: number,
): number | undefined {
  const raw = response.headers.get('retry-after');
  let requested: number;
  if (raw === null) {
    const jitter = Math.floor(Math.max(0, Math.min(1, random())) * 100 * (2 ** (attempt - 1)));
    requested = Math.min(cap, 200 * (2 ** (attempt - 1)) + jitter);
  } else if (/^\d+$/.test(raw.trim())) {
    requested = Number(raw.trim()) * 1_000;
    if (!Number.isSafeInteger(requested)) return undefined;
  } else {
    const value = raw.trim();
    const isHttpDate = /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(value);
    if (!isHttpDate) return undefined;
    const parsed = Date.parse(value);
    if (!Number.isFinite(parsed)) return undefined;
    requested = Math.max(0, parsed - now);
  }
  // Never shorten a server-supplied wait: if it exceeds either bound, return this response.
  if (requested > cap || requested > remainingMs) return undefined;
  return requested;
}

function isTransientPreResponseFailure(error: unknown): boolean {
  if (error === null || typeof error !== 'object' || !('code' in error)) return false;
  const code = String((error as { code?: unknown }).code ?? '');
  return TRANSIENT_PRE_RESPONSE_CODES.has(code);
}

function safeError(requestId: string, signal: AbortSignal, kind: ApiErrorKind, status?: number, external?: AbortSignal, closed?: boolean): DarktraceApiError {
  if (external?.aborted || closed) kind = 'cancelled';
  else if (signal.aborted && kind !== 'too_large') kind = 'timeout';
  return new DarktraceApiError(kind, requestId, status);
}

/** Create a fixed-origin client with a pinned HTTPS connector and code-owned operation routes. */
export function createHttpClient(cfg: Config, options: HttpClientOptions): HttpClient {
  const hasTestDependencies = options.signer !== undefined || options.fetchImpl !== undefined || options.fetch !== undefined ||
    options.resolver !== undefined || options.connector !== undefined || options.now !== undefined || options.random !== undefined || options.delay !== undefined;
  if (hasTestDependencies && options.testOnly !== true) throw new TypeError('client test dependencies require testOnly: true');
  if (options.fetchImpl !== undefined && options.fetch !== undefined) throw new TypeError('provide only one test fetch implementation');
  if (options.connector !== undefined && (options.fetchImpl !== undefined || options.fetch !== undefined)) throw new TypeError('provide only one test connector');

  const registry = operationRegistry(options.operations);
  if (options.testOnly !== true) assertSafeNetworkEnvironment();
  let parsedOrigin: URL;
  try { parsedOrigin = new URL(cfg.instance.baseUrl); } catch { throw new TypeError('client requires a valid HTTPS origin'); }
  if (parsedOrigin.protocol !== 'https:' || parsedOrigin.username || parsedOrigin.password || parsedOrigin.pathname !== '/' ||
    parsedOrigin.search || parsedOrigin.hash || /[?#]/.test(cfg.instance.baseUrl)) {
    throw new TypeError('client requires a fixed HTTPS origin without credentials or a path');
  }
  const origin = parsedOrigin.origin;
  const signer = options.signer ?? createSigner(cfg.auth.publicToken, cfg.auth.privateToken, {
    encodeQueryInSignature: cfg.auth.querySignatureEncoding === 'encoded',
  });
  const now = options.now ?? Date.now;
  const random = options.random ?? Math.random;
  const delay = options.delay ?? defaultDelay;
  const fetchImpl = options.fetchImpl ?? options.fetch;
  const connector: HttpsConnector = options.connector ?? (fetchImpl === undefined
    ? new NodeHttpsConnector(parsedOrigin, cfg.instance.destinationAllowlist, options.resolver)
    : {
      initialize: async () => undefined,
      async request(request: ConnectorRequest): Promise<ConnectorResponse> {
        const init: RequestInit = {
          method: request.method,
          headers: { ...request.headers },
          redirect: 'error',
          signal: request.signal,
          ...(request.body === undefined ? {} : { body: Buffer.from(request.body) }),
        };
        return fetchResponse(await fetchImpl(request.url, init));
      },
      close() { /* test-only fetch adapter owns no sockets */ },
    });
  const semaphore = new Semaphore(cfg.limits.maxConcurrentRequests, cfg.limits.maxQueuedRequests);
  const shutdown = new AbortController();
  // One production client is expected per process; share its rolling window if a host creates more.
  const attemptTimes = options.testOnly === true ? [] : productionAttemptTimes;
  let closed = false;

  const client: HttpClient = {
    async request(request: OperationRequest): Promise<ApiResponse> {
      const requestRecord = request as unknown as Record<string, unknown>;
      if (Object.keys(requestRecord).some((key) => !['operationId', 'pathParams', 'query', 'body', 'contentType', 'signal'].includes(key))) {
        throw new DarktraceApiError('invalid_request', randomUUID());
      }
      let body: ClientRequest['body'];
      if (request.body !== undefined) {
        if (request.contentType === undefined || request.contentType === 'application/json') body = { kind: 'json', value: request.body };
        else if (request.contentType === 'application/x-www-form-urlencoded') body = { kind: 'form', value: request.body as Readonly<Record<string, FormValue>> };
        else throw new DarktraceApiError('invalid_request', randomUUID());
      } else if (request.contentType !== undefined) throw new DarktraceApiError('invalid_request', randomUUID());
      const response = await client.send({
        operationId: request.operationId,
        ...(request.pathParams === undefined ? {} : { pathParams: request.pathParams }),
        ...(request.query === undefined ? {} : { query: request.query }),
        ...(body === undefined ? {} : { body }),
      }, { ...(request.signal === undefined ? {} : { signal: request.signal }) });
      if ('dryRun' in response) throw new DarktraceApiError('invalid_request', randomUUID());
      return response;
    },

    async send<T = unknown>(req: ClientRequest, sendOptions: { readonly dryRun?: boolean; readonly signal?: AbortSignal } = {}): Promise<ApiResponse<T> | DryRunResult> {
      const requestId = randomUUID();
      const admittedAt = performance.now();
      const inputRecord = req as unknown as Record<string, unknown>;
      if (Object.keys(inputRecord).some((key) => !['operationId', 'pathParams', 'query', 'body', 'accept'].includes(key))) {
        throw new DarktraceApiError('invalid_request', requestId);
      }
      const operation = registry.get(req.operationId);
      if (operation === undefined) throw new DarktraceApiError('invalid_request', requestId);
      if (req.body !== undefined && operation.method !== 'POST') throw new DarktraceApiError('invalid_request', requestId);
      if (req.accept !== undefined && req.accept !== 'json' && req.accept !== 'binary') throw new DarktraceApiError('invalid_request', requestId);

      let path: string;
      let query: Array<readonly [string, string]>;
      let body: EncodedBody | EncodedForm | undefined;
      try {
        path = expandPath(operation, req.pathParams);
        query = encodeQuery(req.query);
        body = encodeBody(req.body);
      } catch { throw new DarktraceApiError('invalid_request', requestId); }
      if ((body?.kind === 'json' && query.length > 0) || (operation.method === 'DELETE' && query.length > 0) ||
        (operation.method === 'GET' && path.startsWith('/advancedsearch/api/search/'))) {
        // S4 query+JSON, S5 DELETE+query, and S6 base64 GET path remain blocked before signing.
        throw new DarktraceApiError('invalid_request', requestId);
      }
      const shaped = [req.pathParams, req.query, req.body?.value].filter((value) => value !== undefined);
      if (!checkShapes(shaped, cfg.limits.maxToolInputDepth, cfg.limits.maxToolInputElements)) {
        throw new DarktraceApiError('invalid_request', requestId);
      }
      let inputBytes = new TextEncoder().encode(path).byteLength + queryWireBytes(query);
      if (body?.kind === 'json') inputBytes += body.bytes.byteLength;
      if (body?.kind === 'form') {
        const serializedSize = new TextEncoder().encode(body.pairs.map(([key, value]) => `${rfc3986(key)}=${rfc3986(value)}`).join('&')).byteLength;
        inputBytes += serializedSize;
      }
      if (inputBytes > cfg.limits.maxToolInputBytes) throw new DarktraceApiError('invalid_request', requestId);

      if (sendOptions.dryRun === true) {
        const suppliedNames = [...queryFieldNames(req.query), ...bodyFieldNames(req.body)];
        if (suppliedNames.some((name) => !operation.parameterNames.includes(name))) {
          throw new DarktraceApiError('invalid_request', requestId);
        }
        const fields = new Set<string>([...operation.pathParamNames, ...suppliedNames]);
        return Object.freeze({
          dryRun: true as const,
          operationId: req.operationId,
          method: operation.method,
          parameterNames: Object.freeze([...fields].sort()),
        });
      }

      if (closed) throw new DarktraceApiError('cancelled', requestId);
      const startedAt = admittedAt;
      const deadline = admittedAt + cfg.instance.timeoutMs;
      const deadlineController = new AbortController();
      const deadlineTimer = setTimeout(() => deadlineController.abort(), Math.max(0, deadline - performance.now()));
      deadlineTimer.unref?.();
      const signals = [deadlineController.signal, shutdown.signal, ...(sendOptions.signal ? [sendOptions.signal] : [])];
      const signal = AbortSignal.any(signals);
      const remainingMs = () => Math.max(0, deadline - performance.now());
      const used = { wire: 0, decoded: 0 };
      const responseCap = Math.min(MAX_RESPONSE_HARD_CAP, cfg.limits.maxResponseBytes);
      const accept = req.accept ?? 'json';
      const maxAttempts = operation.method === 'GET' ? cfg.limits.maxGetRetries + 1 : 1;

      const consumeAttempt = (): boolean => {
        const timestamp = performance.now();
        while (attemptTimes.length > 0 && timestamp - attemptTimes[0] >= RATE_WINDOW_MS) attemptTimes.shift();
        if (attemptTimes.length >= cfg.limits.rateLimitPerMinute) return false;
        attemptTimes.push(timestamp);
        return true;
      };

      try {
        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
          let release: (() => void) | undefined;
          let response: ConnectorResponse | undefined;
          try {
            if (closed || signal.aborted) throw new Error('aborted');
            release = await semaphore.acquire(signal);
            // Initial A/AAAA validation and snapshot happen before signing or making an upstream request.
            await connector.initialize(signal);
            if (!consumeAttempt()) throw new DarktraceApiError('rate_limited', requestId);
            const date = formatApiDate(new Date(now()), cfg.auth.dateFormat);
            let signed: ReturnType<Signer['sign']>;
            try { signed = signer.sign({ method: operation.method, path, query, ...(body === undefined ? {} : { body }), date }); }
            catch { throw new DarktraceApiError('invalid_request', requestId); }
            const target = new URL(signed.url, origin);
            if (target.origin !== origin || target.username || target.password || target.hash || target.pathname.startsWith('//')) {
              throw new DarktraceApiError('invalid_request', requestId);
            }
            const headers: Record<string, string> = {
              ...signed.headers,
              Accept: accept === 'json' ? 'application/json' : 'application/octet-stream, application/vnd.tcpdump.pcap',
              'Accept-Encoding': 'identity',
              ...(signed.bodyBytes === undefined ? {} : { 'Content-Length': String(signed.bodyBytes.byteLength) }),
            };
            response = await connector.request({
              url: target,
              method: operation.method,
              headers,
              ...(signed.bodyBytes === undefined ? {} : { body: signed.bodyBytes }),
              signal,
            });
            if (response.status >= 300 && response.status < 400) {
              await response.body?.cancel().catch(() => undefined);
              throw new DarktraceApiError('network', requestId, response.status);
            }
            const contentEncoding = response.headers.get('content-encoding');
            if (contentEncoding !== null && contentEncoding.trim().toLowerCase() !== 'identity') {
              await response.body?.cancel().catch(() => undefined);
              throw new DarktraceApiError('invalid_response', requestId, response.status);
            }
            const bytes = await readBounded(response, responseCap, used);
            if (response.status < 200 || response.status >= 300) {
              const status = response.status;
              if (operation.method === 'GET' && RETRY_STATUSES.has(status) && attempt < maxAttempts) {
                const waitMs = retryDelay(response, attempt, now(), random, cfg.limits.maxRetryAfterMs, remainingMs());
                if (waitMs !== undefined && remainingMs() > 0) {
                  release();
                  release = undefined;
                  await abortableDelay(waitMs, signal, delay);
                  continue;
                }
              }
              throw new DarktraceApiError(responseKind(status), requestId, status);
            }
            if (accept === 'binary') {
              return Object.freeze({ status: response.status, bytes, truncated: false, elapsedMs: Math.max(0, performance.now() - startedAt), requestId });
            }
            if (bytes.byteLength === 0) {
              return Object.freeze({ status: response.status, json: undefined, truncated: false, elapsedMs: Math.max(0, performance.now() - startedAt), requestId });
            }
            let json: unknown;
            try { json = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
            catch { throw new DarktraceApiError('invalid_response', requestId, response.status); }
            return Object.freeze({ status: response.status, json: json as T, truncated: false, elapsedMs: Math.max(0, performance.now() - startedAt), requestId });
          } catch (error) {
            if (error instanceof DarktraceApiError) throw error;
            if (signal.aborted || closed) throw safeError(requestId, signal, 'timeout', undefined, sendOptions.signal, closed);
            if (error instanceof Error && error.message === 'too_large') throw new DarktraceApiError('too_large', requestId, response?.status);
            if (error instanceof Error && error.message === 'overloaded') throw new DarktraceApiError('overloaded', requestId);
            if (operation.method === 'GET' && attempt < maxAttempts && isTransientPreResponseFailure(error) &&
              !(error instanceof DestinationPolicyError) && response === undefined) {
              const waitMs = Math.min(cfg.limits.maxRetryAfterMs, 200 * (2 ** (attempt - 1)));
              if (remainingMs() > 0 && waitMs <= remainingMs()) {
                release?.();
                release = undefined;
                await abortableDelay(waitMs, signal, delay);
                continue;
              }
            }
            throw new DarktraceApiError('network', requestId);
          } finally {
            release?.();
          }
        }
        throw new DarktraceApiError('network', requestId);
      } finally {
        clearTimeout(deadlineTimer);
      }
    },

    close(): void {
      if (closed) return;
      closed = true;
      shutdown.abort();
      connector.close();
    },
  };
  return Object.freeze(client);
}
