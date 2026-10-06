import { canonicalIpAddress } from './address.js';

export type DateFormat = 'compact' | 'spaced';
export type QuerySignatureEncoding = 'encoded' | 'unencoded';

export interface Config {
  readonly instance: {
    readonly baseUrl: string;
    readonly timeoutMs: number;
    readonly destinationAllowlist?: readonly string[];
  };
  readonly auth: {
    readonly publicToken: string;
    readonly privateToken: string;
    readonly dateFormat: DateFormat;
    readonly querySignatureEncoding: QuerySignatureEncoding;
  };
  readonly profiles: {
    readonly read: true;
    readonly write: boolean;
    readonly sensitiveRead: boolean;
    readonly writeCritical: boolean;
  };
  readonly limits: {
    /** Applied independently to cumulative response wire and decoded bytes. */
    readonly maxResponseBytes: number;
    readonly maxToolInputBytes: number;
    readonly maxToolInputDepth: number;
    readonly maxToolInputElements: number;
    readonly maxToolOutputChars: number;
    readonly maxConcurrentRequests: number;
    readonly maxQueuedRequests: number;
    readonly maxPages: number;
    readonly rateLimitPerMinute: number;
    readonly maxGetRetries: number;
    readonly maxRetryAfterMs: number;
  };
}

export interface ConfigSource {
  readonly instance?: {
    readonly baseUrl?: unknown;
    readonly timeoutMs?: unknown;
    readonly destinationAllowlist?: unknown;
  };
  readonly auth?: {
    readonly publicToken?: unknown;
    readonly privateToken?: unknown;
    readonly dateFormat?: unknown;
    readonly querySignatureEncoding?: unknown;
  };
  readonly profiles?: {
    readonly read?: unknown;
    readonly write?: unknown;
    readonly sensitiveRead?: unknown;
    readonly writeCritical?: unknown;
    readonly export?: unknown;
    readonly email?: unknown;
  };
  readonly limits?: {
    readonly maxResponseBytes?: unknown;
    readonly maxToolInputBytes?: unknown;
    readonly maxToolInputDepth?: unknown;
    readonly maxToolInputElements?: unknown;
    readonly maxToolOutputChars?: unknown;
    readonly maxConcurrentRequests?: unknown;
    readonly maxQueuedRequests?: unknown;
    readonly maxPages?: unknown;
    readonly rateLimitPerMinute?: unknown;
    readonly maxGetRetries?: unknown;
    readonly maxRetryAfterMs?: unknown;
  };
  readonly transport?: { readonly kind?: unknown; readonly http?: unknown };
  readonly compat?: { readonly assumeVersion?: unknown };
  readonly export?: unknown;
}

export const DEFAULT_LIMITS = Object.freeze({
  timeoutMs: 30_000,
  maxResponseBytes: 2_097_152,
  maxToolInputBytes: 65_536,
  maxToolInputDepth: 8,
  maxToolInputElements: 5_000,
  maxToolOutputChars: 60_000,
  maxConcurrentRequests: 4,
  maxQueuedRequests: 16,
  maxPages: 10,
  rateLimitPerMinute: 120,
  maxGetRetries: 2,
  maxRetryAfterMs: 2_000,
});

const CEILINGS = Object.freeze({
  timeoutMs: 30_000,
  maxResponseBytes: 2_097_152,
  maxToolInputBytes: 65_536,
  maxToolInputDepth: 8,
  maxToolInputElements: 5_000,
  maxToolOutputChars: 60_000,
  maxConcurrentRequests: 4,
  maxQueuedRequests: 16,
  maxPages: 10,
  rateLimitPerMinute: 120,
  maxGetRetries: 2,
  maxRetryAfterMs: 2_000,
});

export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

/** Reject process-level switches and ambient proxy state that can redirect TLS traffic. */
export function assertSafeNetworkEnvironment(
  env: Readonly<Record<string, string | undefined>> = process.env,
  execArgs: readonly string[] = process.execArgv,
): void {
  if (env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
    throw new ConfigValidationError('NODE_TLS_REJECT_UNAUTHORIZED=0 is unsupported; TLS verification is always enabled');
  }
  const proxyNames = ['HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'NO_PROXY', 'http_proxy', 'https_proxy', 'all_proxy', 'no_proxy'];
  const ambientProxy = proxyNames.find((name) => env[name] !== undefined);
  if (ambientProxy !== undefined) throw new ConfigValidationError(`${ambientProxy} is unsupported for the fixed appliance origin`);
  const trustOverride = ['SSL_CERT_FILE', 'SSL_CERT_DIR', 'OPENSSL_CONF', 'NODE_USE_SYSTEM_CA'].find(name => env[name] !== undefined);
  if (trustOverride !== undefined) throw new ConfigValidationError(`${trustOverride} is unsupported; private CAs use NODE_EXTRA_CA_CERTS`);
  const knownBypass = new Set([
    '--use-env-proxy', '--tls-min-v1.0', '--tls-min-v1.1', '--tls-max-v1.0', '--tls-max-v1.1',
    '--tls-keylog', '--insecure-http-parser',
    '--use-openssl-ca', '--use-system-ca', '--openssl-config', '--openssl-legacy-provider',
    '--tls-cipher-list', '--tls-cipher-suites',
  ]);
  const hasBypass = (value: string) => {
    const flag = value.split('=', 1)[0];
    return knownBypass.has(flag);
  };
  const nodeOptions = (env.NODE_OPTIONS ?? '').split(/\s+/).filter(Boolean).map((item) => item.replace(/^['"]+|['"]+$/g, ''));
  if (env.NODE_USE_ENV_PROXY !== undefined) throw new ConfigValidationError('NODE_USE_ENV_PROXY is unsupported for the fixed appliance origin');
  const bypassFlag = [...execArgs, ...nodeOptions].find(hasBypass);
  if (bypassFlag !== undefined) throw new ConfigValidationError(`${bypassFlag.split('=', 1)[0]} is an unsupported TLS or proxy bypass flag`);
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (value === undefined) return {};
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new ConfigValidationError(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function assertKeys(value: Record<string, unknown>, allowed: readonly string[], label: string): void {
  const unknown = Object.keys(value).find((key) => !allowed.includes(key));
  if (unknown !== undefined) throw new ConfigValidationError(`${label} contains an unsupported field`);
}

function boundedInteger(value: unknown, fallback: number, key: keyof typeof CEILINGS, minimum = 1): number {
  const max = CEILINGS[key];
  if (value === undefined) return fallback;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum || value > max) {
    throw new ConfigValidationError(`${key} must be an integer from ${minimum} to ${max}`);
  }
  return value;
}

function boolean(value: unknown, fallback: boolean, label: string): boolean {
  if (value === undefined) return fallback;
  if (typeof value !== 'boolean') throw new ConfigValidationError(`${label} must be a boolean`);
  return value;
}

/** Also used before file/environment overlays, so malformed file grants cannot be hidden by an override. */
export function assertReleaseProfiles(value:unknown):void {
  const profiles=record(value,'profiles');
  for (const key of ['read','write','sensitiveRead','writeCritical'] as const) boolean(profiles[key],false,`profiles.${key}`);
}

function requiredToken(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value) {
    throw new ConfigValidationError(`${label} must be a non-empty token`);
  }
  if (new TextEncoder().encode(value).byteLength > 4_096 || /[^\x21-\x7e]/.test(value)) {
    throw new ConfigValidationError(`${label} contains invalid or oversized header data`);
  }
  return value;
}

function rawAuthority(value: string): { hostname: string; port?: string } {
  const match = /^https:\/\/([^/?#\\]+)(?:\/)?$/i.exec(value);
  if (!match) throw new ConfigValidationError('instance.baseUrl must be an HTTPS origin');
  const authority = match[1];
  if (authority.includes('@') || authority.includes('%')) throw new ConfigValidationError('instance.baseUrl must not contain credentials or encoded host data');
  if (authority.startsWith('[')) {
    const end = authority.indexOf(']');
    if (end < 0) throw new ConfigValidationError('instance.baseUrl must contain a valid IP literal');
    const hostname = authority.slice(1, end);
    const tail = authority.slice(end + 1);
    if (tail === '') return { hostname };
    if (!/^:\d+$/.test(tail)) throw new ConfigValidationError('instance.baseUrl has an invalid port');
    return { hostname, port: tail.slice(1) };
  }
  const colon = authority.lastIndexOf(':');
  if (colon < 0) return { hostname: authority };
  if (authority.slice(0, colon).includes(':') || !/^\d+$/.test(authority.slice(colon + 1))) {
    throw new ConfigValidationError('IPv6 origins must use a bracketed literal and ports must be valid');
  }
  return { hostname: authority.slice(0, colon), port: authority.slice(colon + 1) };
}

function httpsOrigin(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value) {
    throw new ConfigValidationError('instance.baseUrl must be an HTTPS origin');
  }
  const raw = rawAuthority(value);
  if (raw.port !== undefined) {
    const port = Number(raw.port);
    if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new ConfigValidationError('instance.baseUrl has an invalid port');
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ConfigValidationError('instance.baseUrl must be an HTTPS origin');
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash || /[?#]/.test(value)) {
    throw new ConfigValidationError('instance.baseUrl must be an HTTPS origin without credentials, path, query, or fragment');
  }
  const normalizedHostname = url.hostname.replace(/^\[|\]$/g, '');
  const normalizedIp = canonicalIpAddress(normalizedHostname);
  if (normalizedIp !== undefined) {
    if (normalizedIp !== raw.hostname) throw new ConfigValidationError('IP origins must use a canonical address literal');
  } else if (/^(?:0x[0-9a-f]+|[0-9.]+)$/i.test(raw.hostname)) {
    throw new ConfigValidationError('alternate numeric IP origins are unsupported');
  }
  return url.origin;
}

function destinationAllowlist(value: unknown): readonly string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new ConfigValidationError('instance.destinationAllowlist must be an array of canonical IP addresses');
  if (value.length === 0) throw new ConfigValidationError('instance.destinationAllowlist must not be empty');
  const seen = new Set<string>();
  for (const address of value) {
    if (typeof address !== 'string' || canonicalIpAddress(address) !== address || seen.has(address)) {
      throw new ConfigValidationError('instance.destinationAllowlist must contain unique canonical IP addresses; CIDRs are unsupported');
    }
    seen.add(address);
  }
  return Object.freeze([...seen]);
}

/** Validate an operator file/environment object without echoing supplied secret values. */
export function parseConfig(source: unknown): Config {
  const root = record(source, 'config');
  const instance = record(root.instance, 'instance');
  const auth = record(root.auth, 'auth');
  const profiles = record(root.profiles, 'profiles');
  const limits = record(root.limits, 'limits');
  const transport = record(root.transport, 'transport');
  const compat = record(root.compat, 'compat');
  assertKeys(root, ['instance', 'auth', 'profiles', 'limits', 'transport', 'compat'], 'config');
  assertKeys(instance, ['baseUrl', 'timeoutMs', 'destinationAllowlist', 'tlsRejectUnauthorized', 'tlsInsecure', 'caFile'], 'instance');
  assertKeys(auth, ['publicToken', 'privateToken', 'dateFormat', 'querySignatureEncoding'], 'auth');
  assertKeys(profiles, ['read', 'write', 'sensitiveRead', 'writeCritical', 'export', 'email'], 'profiles');
  assertKeys(limits, Object.keys(CEILINGS).filter((key) => key !== 'timeoutMs'), 'limits');
  assertKeys(transport, ['kind', 'http'], 'transport');
  assertKeys(compat, ['assumeVersion'], 'compat');

  if (Object.hasOwn(root, 'export') || Object.hasOwn(profiles, 'export') || Object.hasOwn(profiles, 'email')) {
    throw new ConfigValidationError('email and export profiles/configuration are unsupported');
  }
  if (instance.tlsRejectUnauthorized === false || instance.tlsInsecure !== undefined || instance.caFile !== undefined) {
    throw new ConfigValidationError('insecure TLS configuration is not supported; private CAs use NODE_EXTRA_CA_CERTS');
  }
  if (transport.kind !== undefined && transport.kind !== 'stdio') throw new ConfigValidationError('only stdio transport is supported');
  if (transport.http !== undefined) throw new ConfigValidationError('HTTP transport is not supported');
  if (compat.assumeVersion !== undefined) throw new ConfigValidationError('compatibility overrides are not production configuration');

  assertReleaseProfiles(profiles);
  const baseUrl = httpsOrigin(instance.baseUrl);
  const publicToken = requiredToken(auth.publicToken, 'auth.publicToken');
  const privateToken = requiredToken(auth.privateToken, 'auth.privateToken');
  const dateFormat = auth.dateFormat === undefined ? 'compact' : auth.dateFormat;
  if (dateFormat !== 'compact' && dateFormat !== 'spaced') throw new ConfigValidationError('auth.dateFormat must be compact or spaced');
  const querySignatureEncoding = auth.querySignatureEncoding === undefined ? 'unencoded' : auth.querySignatureEncoding;
  if (querySignatureEncoding !== 'encoded' && querySignatureEncoding !== 'unencoded') {
    throw new ConfigValidationError('auth.querySignatureEncoding must be encoded or unencoded');
  }

  const read = boolean(profiles.read, true, 'profiles.read');
  if (!read) throw new ConfigValidationError('profiles.read must remain enabled');
  const write = boolean(profiles.write, false, 'profiles.write');
  const sensitiveRead = boolean(profiles.sensitiveRead, false, 'profiles.sensitiveRead');
  const writeCritical = boolean(profiles.writeCritical, false, 'profiles.writeCritical');
  if (writeCritical && !write) throw new ConfigValidationError('profiles.writeCritical requires profiles.write');

  return Object.freeze({
    instance: Object.freeze({
      baseUrl,
      timeoutMs: boundedInteger(instance.timeoutMs, DEFAULT_LIMITS.timeoutMs, 'timeoutMs'),
      ...(instance.destinationAllowlist === undefined ? {} : { destinationAllowlist: destinationAllowlist(instance.destinationAllowlist) }),
    }),
    auth: Object.freeze({ publicToken, privateToken, dateFormat, querySignatureEncoding }),
    profiles: Object.freeze({ read: true as const, write, sensitiveRead, writeCritical }),
    limits: Object.freeze({
      maxResponseBytes: boundedInteger(limits.maxResponseBytes, DEFAULT_LIMITS.maxResponseBytes, 'maxResponseBytes'),
      maxToolInputBytes: boundedInteger(limits.maxToolInputBytes, DEFAULT_LIMITS.maxToolInputBytes, 'maxToolInputBytes'),
      maxToolInputDepth: boundedInteger(limits.maxToolInputDepth, DEFAULT_LIMITS.maxToolInputDepth, 'maxToolInputDepth'),
      maxToolInputElements: boundedInteger(limits.maxToolInputElements, DEFAULT_LIMITS.maxToolInputElements, 'maxToolInputElements'),
      maxToolOutputChars: boundedInteger(limits.maxToolOutputChars, DEFAULT_LIMITS.maxToolOutputChars, 'maxToolOutputChars'),
      maxConcurrentRequests: boundedInteger(limits.maxConcurrentRequests, DEFAULT_LIMITS.maxConcurrentRequests, 'maxConcurrentRequests'),
      maxQueuedRequests: boundedInteger(limits.maxQueuedRequests, DEFAULT_LIMITS.maxQueuedRequests, 'maxQueuedRequests', 0),
      maxPages: boundedInteger(limits.maxPages, DEFAULT_LIMITS.maxPages, 'maxPages'),
      rateLimitPerMinute: boundedInteger(limits.rateLimitPerMinute, DEFAULT_LIMITS.rateLimitPerMinute, 'rateLimitPerMinute'),
      maxGetRetries: boundedInteger(limits.maxGetRetries, DEFAULT_LIMITS.maxGetRetries, 'maxGetRetries', 0),
      maxRetryAfterMs: boundedInteger(limits.maxRetryAfterMs, DEFAULT_LIMITS.maxRetryAfterMs, 'maxRetryAfterMs', 0),
    }),
  });
}
