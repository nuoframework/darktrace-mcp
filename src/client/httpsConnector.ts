import { Resolver } from 'node:dns';
import { Agent, request as httpsRequest, type RequestOptions } from 'node:https';
import { isIP, type LookupFunction } from 'node:net';
import { checkServerIdentity, type PeerCertificate } from 'node:tls';
import { canonicalIpAddress, isForbiddenDestination } from '../config/address.js';

export interface ResolvedAddress {
  readonly address: string;
  readonly family?: 4 | 6;
}

export type AddressResolver = (hostname: string, signal: AbortSignal) => Promise<readonly ResolvedAddress[]>;

export interface ConnectorResponse {
  readonly status: number;
  readonly headers: { get(name: string): string | null };
  readonly body: (AsyncIterable<Uint8Array> & { cancel(): Promise<void> }) | null;
}

export interface ConnectorRequest {
  readonly url: URL;
  readonly method: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body?: Uint8Array;
  readonly signal: AbortSignal;
}

export interface HttpsConnector {
  initialize(signal: AbortSignal): Promise<void>;
  request(request: ConnectorRequest): Promise<ConnectorResponse>;
  close(): void;
}

export type PinnedTlsOptions = Pick<RequestOptions, 'servername' | 'rejectUnauthorized' | 'checkServerIdentity'>;

/** TLS remains bound to the configured origin name even when the socket uses a pinned IP. */
export function createPinnedTlsOptions(hostname: string): PinnedTlsOptions {
  const isLiteral = isIP(hostname) !== 0;
  return {
    rejectUnauthorized: true,
    ...(isLiteral ? {} : { servername: hostname }),
    checkServerIdentity: (_providedHostname, certificate) => checkServerIdentity(hostname, certificate as PeerCertificate),
  };
}

const NO_ADDRESS = new Set(['ENODATA', 'ENOTFOUND']);

export class DestinationPolicyError extends Error {
  constructor() {
    super('pinned destination validation failed');
    this.name = 'DestinationPolicyError';
  }
}

function abortError(): Error {
  return new Error('aborted');
}

function resolveWithNodeDns(hostname: string, signal: AbortSignal): Promise<readonly ResolvedAddress[]> {
  const literal = canonicalIpAddress(hostname);
  if (literal !== undefined) return Promise.resolve([{ address: literal, family: isIP(literal) as 4 | 6 }]);
  if (signal.aborted) return Promise.reject(abortError());
  const resolver = new Resolver();
  return new Promise((resolve, reject) => {
    let remaining = 2;
    let finished = false;
    const addresses: ResolvedAddress[] = [];
    const cleanup = () => signal.removeEventListener('abort', onAbort);
    const finish = (error?: Error) => {
      if (finished) return;
      finished = true;
      cleanup();
      if (error) reject(error);
      else resolve(addresses);
    };
    const onAbort = () => {
      resolver.cancel();
      finish(abortError());
    };
    signal.addEventListener('abort', onAbort, { once: true });
    const done = (family: 4 | 6, error: NodeJS.ErrnoException | null, values?: string[]) => {
      if (finished) return;
      if (error && !NO_ADDRESS.has(error.code ?? '')) return finish(error);
      for (const address of values ?? []) addresses.push({ address, family });
      remaining -= 1;
      if (remaining === 0) finish();
    };
    resolver.resolve4(hostname, (error, values) => done(4, error, values));
    resolver.resolve6(hostname, (error, values) => done(6, error, values));
  });
}

function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(abortError());
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      cleanup();
      reject(abortError());
    };
    const cleanup = () => signal.removeEventListener('abort', onAbort);
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then((value) => { cleanup(); resolve(value); }, (error: unknown) => { cleanup(); reject(error); });
  });
}

function validateSnapshot(
  input: readonly ResolvedAddress[],
  allowlist?: readonly string[],
): readonly ResolvedAddress[] {
  if (input.length === 0) throw new Error('DNS returned no addresses');
  const allowed = allowlist === undefined ? undefined : new Set(allowlist);
  const seen = new Set<string>();
  const normalized: ResolvedAddress[] = [];
  for (const entry of input) {
    const address = canonicalIpAddress(entry.address);
    const family = address === undefined ? 0 : isIP(address);
    const mappedV4 = entry.family === 6 && isIP(entry.address) === 6 && family === 4;
    if (address === undefined || (entry.family !== undefined && entry.family !== family && !mappedV4) || isForbiddenDestination(address)) {
      throw new Error('DNS answer rejected by destination policy');
    }
    if (allowed !== undefined && !allowed.has(address)) throw new Error('DNS answer is outside the operator allowlist');
    const key = `${family}:${address}`;
    if (!seen.has(key)) {
      seen.add(key);
      normalized.push(Object.freeze({ address, family: family as 4 | 6 }));
    }
  }
  return Object.freeze(normalized);
}

export function createPinnedLookup(expectedHostname: string, addresses: readonly ResolvedAddress[]): LookupFunction {
  let cursor = 0;
  const lookup = ((hostname: string, options: { all?: boolean; family?: number }, callback: (...args: any[]) => void) => {
    if (hostname.toLowerCase() !== expectedHostname.toLowerCase()) {
      callback(new Error('hostname is outside the pinned destination'));
      return;
    }
    const eligible = options.family === undefined || options.family === 0
      ? addresses
      : addresses.filter((entry) => entry.family === options.family);
    if (eligible.length === 0) {
      callback(new Error('no pinned address for requested family'));
      return;
    }
    if (options.all) {
      callback(null, eligible.map(({ address, family }) => ({ address, family })));
      return;
    }
    const selected = eligible[cursor++ % eligible.length];
    callback(null, selected.address, selected.family);
  }) as LookupFunction;
  return lookup;
}

function responseHeaders(headers: Readonly<Record<string, string | string[] | number | undefined>>) {
  return {
    get(name: string): string | null {
      const found = headers[name.toLowerCase()];
      if (found === undefined) return null;
      return Array.isArray(found) ? found.join(', ') : String(found);
    },
  };
}

/** Dedicated HTTPS connector; all lookups are served from one validated snapshot. */
export class NodeHttpsConnector implements HttpsConnector {
  private readonly origin: URL;
  private readonly resolver: AddressResolver;
  private readonly allowlist?: readonly string[];
  private addresses?: readonly ResolvedAddress[];
  private failure?: DestinationPolicyError;
  private initialization?: Promise<void>;
  private agent?: Agent;
  private closed = false;

  constructor(origin: URL, allowlist?: readonly string[], resolver: AddressResolver = resolveWithNodeDns) {
    this.origin = new URL(origin.origin);
    this.resolver = resolver;
    this.allowlist = allowlist;
  }

  get pinnedAddresses(): readonly ResolvedAddress[] | undefined {
    return this.addresses;
  }

  async initialize(signal: AbortSignal): Promise<void> {
    if (this.closed) throw abortError();
    if (this.addresses !== undefined) return;
    if (this.failure !== undefined) throw this.failure;
    if (this.initialization === undefined) {
      const hostname = this.origin.hostname.replace(/^\[|\]$/g, '');
      const pending = Promise.resolve()
        .then(() => this.resolver(hostname, signal))
        .then((answers) => {
          if (signal.aborted || this.closed) throw abortError();
          try {
            this.addresses = validateSnapshot(answers, this.allowlist);
          } catch {
            throw new DestinationPolicyError();
          }
          const lookup = createPinnedLookup(hostname, this.addresses);
          this.agent = new Agent({
            keepAlive: true,
            maxSockets: 4,
            maxTotalSockets: 4,
            maxFreeSockets: 4,
            lookup,
          });
        })
        .catch((error: unknown) => {
          if (error instanceof Error && error.message === 'aborted') {
            if (!this.closed) this.failure = new DestinationPolicyError();
            throw error;
          }
          this.failure = error instanceof DestinationPolicyError ? error : new DestinationPolicyError();
          throw this.failure;
        })
        .finally(() => {
          if (this.addresses === undefined) this.initialization = undefined;
        });
      this.initialization = pending;
    }
    await abortable(this.initialization, signal);
    if (this.addresses === undefined || this.agent === undefined) throw new Error('DNS initialization failed');
  }

  async request(request: ConnectorRequest): Promise<ConnectorResponse> {
    await this.initialize(request.signal);
    if (this.closed || request.signal.aborted) throw abortError();
    if (request.url.origin !== this.origin.origin) throw new Error('request origin is outside the pinned destination');
    const hostname = this.origin.hostname.replace(/^\[|\]$/g, '');
    const path = `${request.url.pathname}${request.url.search}`;
    const options: RequestOptions = {
      protocol: 'https:',
      hostname,
      port: request.url.port === '' ? 443 : Number(request.url.port),
      method: request.method,
      path,
      headers: request.headers,
      agent: this.agent,
      ...createPinnedTlsOptions(hostname),
    };
    return new Promise<ConnectorResponse>((resolve, reject) => {
      const onRequestAbort = () => req.destroy(abortError());
      const cleanupRequestAbort = () => request.signal.removeEventListener('abort', onRequestAbort);
      const req = httpsRequest(options, (res) => {
        let responseSettled = false;
        const incoming = res;
        const cleanupBodyAbort = () => {
          request.signal.removeEventListener('abort', onBodyAbort);
          incoming.removeListener('end', cleanupBodyAbort);
          incoming.removeListener('close', cleanupBodyAbort);
          incoming.removeListener('error', cleanupBodyAbort);
        };
        const onBodyAbort = () => {
          incoming.destroy(abortError());
          req.destroy(abortError());
          cleanupBodyAbort();
        };
        const body: AsyncIterable<Uint8Array> & { cancel(): Promise<void> } = {
          async *[Symbol.asyncIterator]() {
            try {
              for await (const chunk of incoming) yield new Uint8Array(chunk);
            } finally {
              cleanupBodyAbort();
            }
          },
          async cancel() {
            cleanupBodyAbort();
            incoming.destroy();
            req.destroy();
          },
        };
        request.signal.removeEventListener('abort', onRequestAbort);
        request.signal.addEventListener('abort', onBodyAbort, { once: true });
        incoming.once('end', cleanupBodyAbort);
        incoming.once('close', cleanupBodyAbort);
        incoming.once('error', cleanupBodyAbort);
        if (request.signal.aborted) onBodyAbort();
        const finishResponse = () => {
          if (responseSettled) return;
          responseSettled = true;
          resolve({
            status: incoming.statusCode ?? 0,
            headers: responseHeaders(incoming.headers),
            body,
          });
        };
        incoming.once('error', () => {
          if (!responseSettled) {
            responseSettled = true;
            cleanupRequestAbort();
            reject(abortError());
          }
        });
        finishResponse();
      });
      request.signal.addEventListener('abort', onRequestAbort, { once: true });
      req.once('error', (error) => {
        cleanupRequestAbort();
        reject(error);
      });
      req.once('response', cleanupRequestAbort);
      if (request.signal.aborted) onRequestAbort();
      req.end(request.body);
    });
  }

  close(): void {
    this.closed = true;
    this.agent?.destroy();
  }
}

export { resolveWithNodeDns };
