import { constants, fstatSync, openSync, readSync, closeSync } from 'node:fs';
import path from 'node:path';
import { logEvent } from '../observability/log.js';
import { assertSafeNetworkEnvironment, ConfigValidationError, assertReleaseProfiles, parseConfig, type Config, type ConfigSource } from './schema.js';

type RawConfig = Record<string, unknown>;
const TOKEN_FILE_MAX_BYTES = 4_096;
const CONFIG_FILE_MAX_BYTES = 65_536;
const FORBIDDEN_ENV = [
  'DARKTRACE_TLS_INSECURE', 'DARKTRACE_TLS_REJECT_UNAUTHORIZED', 'DARKTRACE_CA_FILE',
  'DARKTRACE_ASSUME_VERSION', 'DARKTRACE_EXPORT_DIR', 'DARKTRACE_ENABLE_HTTP',
  'DARKTRACE_HTTP', 'DARKTRACE_BEARER_TOKENS', 'DARKTRACE_EMAIL',
];
const KNOWN_DARKTRACE_ENV = new Set([
  'DARKTRACE_CONFIG_FILE', 'DARKTRACE_URL', 'DARKTRACE_BASE_URL', 'DARKTRACE_PUBLIC_TOKEN',
  'DARKTRACE_PUBLIC_TOKEN_FILE', 'DARKTRACE_PRIVATE_TOKEN', 'DARKTRACE_PRIVATE_TOKEN_FILE',
  'DARKTRACE_TIMEOUT_MS', 'DARKTRACE_DESTINATION_ALLOWLIST', 'DARKTRACE_DATE_FORMAT',
  'DARKTRACE_QUERY_SIGNATURE_ENCODING', 'DARKTRACE_PROFILES', 'DARKTRACE_WRITE_CRITICAL',
  'DARKTRACE_SENSITIVE_READ', 'DARKTRACE_CRITICAL_APPROVAL', 'DARKTRACE_WRITE_APPROVAL', 'DARKTRACE_MAX_RESPONSE_BYTES', 'DARKTRACE_MAX_TOOL_INPUT_BYTES',
  'DARKTRACE_MAX_TOOL_INPUT_DEPTH', 'DARKTRACE_MAX_TOOL_INPUT_ELEMENTS', 'DARKTRACE_MAX_TOOL_OUTPUT_CHARS',
  'DARKTRACE_MAX_CONCURRENT_REQUESTS', 'DARKTRACE_MAX_QUEUED_REQUESTS', 'DARKTRACE_MAX_PAGES',
  'DARKTRACE_RATE_LIMIT_PER_MINUTE', 'DARKTRACE_MAX_GET_RETRIES', 'DARKTRACE_MAX_RETRY_AFTER_MS', 'DARKTRACE_MAX_WRITES_PER_MINUTE',
  'DARKTRACE_TOKEN_FILE_OWNER', 'DARKTRACE_PROTECTED_TARGETS',
  'DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE', 'DARKTRACE_ACKNOWLEDGE_HOST_APPROVAL',
  ...FORBIDDEN_ENV,
]);

/**
 * Who may own a token file. `current` (default) requires the process uid. `root-or-current` also accepts uid 0,
 * for Docker Desktop (macOS/Windows) bind mounts, which surface as root-owned inside the container. It is an
 * operator-only setting (environment or config file) and never relaxes the mode, file-type, symlink or size checks.
 */
export type TokenFileOwner = 'current' | 'root-or-current';

function parseTokenFileOwner(value: unknown, label: string): TokenFileOwner | undefined {
  if (value === undefined) return undefined;
  if (value === 'current' || value === 'root-or-current') return value;
  throw new ConfigValidationError(`${label} must be current or root-or-current`);
}

export function assertPrivateFile(mode: number, uid: number, label: string, owner: TokenFileOwner = 'current'): void {
  if (process.platform === 'win32') throw new ConfigValidationError(`${label} secure ownership checks are unsupported on this platform`);
  const permissions = mode & 0o7777;
  if ((permissions & (0o077 | 0o111 | 0o7000)) !== 0 || (permissions & 0o400) === 0) {
    throw new ConfigValidationError(`${label} permissions must be owner-only with no execute or special bits`);
  }
  if (typeof process.getuid !== 'function') throw new ConfigValidationError(`${label} must be owned by the current user`);
  if (uid === process.getuid() || (owner === 'root-or-current' && uid === 0)) return;
  throw new ConfigValidationError(owner === 'current' ? `${label} must be owned by the current user` : `${label} must be owned by the current user or root`);
}

function secureOpenFlags(): number {
  if (!Object.hasOwn(constants, 'O_NOFOLLOW') || !Object.hasOwn(constants, 'O_NONBLOCK')) {
    throw new ConfigValidationError('secure no-follow file opening is unsupported on this platform');
  }
  return constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK;
}

function readCapped(fd: number, maxBytes: number): Buffer {
  const chunks: Buffer[] = [];
  let total = 0;
  let position = 0;
  while (total <= maxBytes) {
    const chunk = Buffer.alloc(Math.min(1024, maxBytes + 1 - total));
    const bytesRead = readSync(fd, chunk, 0, chunk.length, position);
    if (bytesRead === 0) break;
    chunks.push(chunk.subarray(0, bytesRead));
    total += bytesRead;
    position += bytesRead;
  }
  if (total > maxBytes) throw new Error('file exceeds size limit');
  return Buffer.concat(chunks, total);
}

function parseConfigFile(configPath: string): RawConfig {
  if (!path.isAbsolute(configPath)) throw new ConfigValidationError('config file path must be absolute');
  let text: string;
  try {
    const fd = openSync(configPath, secureOpenFlags());
    try {
      const stat = fstatSync(fd);
      if (!stat.isFile() || stat.size > CONFIG_FILE_MAX_BYTES) throw new Error('invalid config file');
      assertPrivateFile(stat.mode, stat.uid, 'config file');
      const bytes = readCapped(fd, CONFIG_FILE_MAX_BYTES);
      if (fstatSync(fd).size > CONFIG_FILE_MAX_BYTES) throw new Error('config file grew while reading');
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } finally {
      closeSync(fd);
    }
  } catch {
    throw new ConfigValidationError('could not read config file');
  }
  try {
    const value: unknown = JSON.parse(text);
    if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid root');
    return value as RawConfig;
  } catch {
    throw new ConfigValidationError('config file must contain a JSON object');
  }
}

function readTokenFile(filePath: string | undefined, label: string, owner: TokenFileOwner): string | undefined {
  if (filePath === undefined) return undefined;
  if (typeof filePath !== 'string' || !path.isAbsolute(filePath)) throw new ConfigValidationError(`${label} must be an absolute path`);
  let fd: number | undefined;
  try {
    fd = openSync(filePath, secureOpenFlags());
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.size > TOKEN_FILE_MAX_BYTES) throw new Error('invalid token file');
    assertPrivateFile(stat.mode, stat.uid, label, owner);
    const bytes = readCapped(fd, TOKEN_FILE_MAX_BYTES);
    if (fstatSync(fd).size > TOKEN_FILE_MAX_BYTES) throw new Error('token file grew while reading');
    let text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (text.endsWith('\n')) text = text.slice(0, -1);
    if (text.length === 0 || /[\r\n]/.test(text)) throw new Error('invalid token file');
    return text;
  } catch {
    throw new ConfigValidationError(`could not read ${label}`);
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

function envBoolean(value: string | undefined, label: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (/^true$/i.test(value)) return true;
  if (/^false$/i.test(value)) return false;
  throw new ConfigValidationError(`${label} must be true or false`);
}

function envInteger(value: string | undefined, label: string): number | undefined {
  if (value === undefined) return undefined;
  if (!/^\d+$/.test(value)) throw new ConfigValidationError(`${label} must be an integer`);
  const number = Number(value);
  if (!Number.isSafeInteger(number)) throw new ConfigValidationError(`${label} must be a safe integer`);
  return number;
}

function asObject(value: unknown): RawConfig {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as RawConfig : {};
}

function setNested(base: RawConfig, key: string, value: unknown): void {
  const [section, field] = key.split('.');
  const sectionValue = asObject(base[section]);
  sectionValue[field] = value;
  base[section] = sectionValue;
}

/**
 * DARKTRACE_PROFILES: comma list of read, sensitive, write, critical, or the shortcut all
 * (= read,sensitive,write,critical). When set it replaces the file's profile flags; read is always on.
 */
export function parseProfilesVariable(value: string): { read: true; sensitiveRead: boolean; write: boolean; writeCritical: boolean } {
  const requested = value.split(',').map((name) => name.trim()).filter(Boolean);
  const allowed = new Set(['read', 'sensitive', 'write', 'critical', 'all']);
  if (requested.length === 0 || requested.some((name) => !allowed.has(name)) || new Set(requested).size !== requested.length ||
    (requested.includes('all') && requested.length !== 1)) {
    throw new ConfigValidationError('DARKTRACE_PROFILES must be a comma list of read, sensitive, write, critical (each once) or all');
  }
  const has = (name: string) => requested.includes('all') || requested.includes(name);
  return { read: true, sensitiveRead: has('sensitive'), write: has('write'), writeCritical: has('critical') };
}

function applyProfiles(raw: RawConfig, value: string | undefined): void {
  if (value === undefined) return;
  raw.profiles = { ...asObject(raw.profiles), ...parseProfilesVariable(value) };
}

function parseDestinationAllowlist(value: string | undefined): readonly string[] | undefined {
  if (value === undefined) return undefined;
  if (value.trim() === '') throw new ConfigValidationError('DARKTRACE_DESTINATION_ALLOWLIST must contain canonical IP addresses');
  return value.split(',').map((item) => item.trim());
}

/** Load a strict operator configuration. Secret values never appear in errors. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env, fileOverride?: string): Config {
  assertSafeNetworkEnvironment(env);
  const unknownDarktraceEnvironment = Object.keys(env).find((name) => name.startsWith('DARKTRACE_') && !KNOWN_DARKTRACE_ENV.has(name));
  if (unknownDarktraceEnvironment !== undefined) throw new ConfigValidationError(`${unknownDarktraceEnvironment} is not a supported configuration field`);
  const forbiddenEnvironment = FORBIDDEN_ENV.find((name) => env[name] !== undefined) ??
    Object.keys(env).find((name) => /^DARKTRACE_(?:HTTP|EXPORT|EMAIL)_/i.test(name));
  if (forbiddenEnvironment !== undefined) {
    throw new ConfigValidationError(`${forbiddenEnvironment} is unsupported HTTP, email, export, version override, private CA, or TLS configuration`);
  }

  if (env.DARKTRACE_URL !== undefined && env.DARKTRACE_BASE_URL !== undefined && env.DARKTRACE_URL !== env.DARKTRACE_BASE_URL) {
    throw new ConfigValidationError('DARKTRACE_URL and DARKTRACE_BASE_URL conflict');
  }

  const configPath = fileOverride ?? env.DARKTRACE_CONFIG_FILE;
  const raw: RawConfig = configPath === undefined ? {} : parseConfigFile(configPath);
  assertReleaseProfiles(raw.profiles);
  const instance = asObject(raw.instance);
  const auth = asObject(raw.auth);
  const profiles = asObject(raw.profiles);
  const limits = asObject(raw.limits);
  const { publicTokenFile: publicFileInConfig, privateTokenFile: privateFileInConfig, tokenFileOwner: ownerInConfig, ...runtimeAuth } = auth;
  const ownerFromEnvironment = parseTokenFileOwner(env.DARKTRACE_TOKEN_FILE_OWNER, 'DARKTRACE_TOKEN_FILE_OWNER');
  const ownerFromFile = parseTokenFileOwner(ownerInConfig, 'auth.tokenFileOwner');
  if (ownerFromEnvironment !== undefined && ownerFromFile !== undefined && ownerFromEnvironment !== ownerFromFile) {
    throw new ConfigValidationError('DARKTRACE_TOKEN_FILE_OWNER conflicts with auth.tokenFileOwner');
  }
  const tokenFileOwner: TokenFileOwner = ownerFromEnvironment ?? ownerFromFile ?? 'current';

  const publicFile = env.DARKTRACE_PUBLIC_TOKEN_FILE ?? publicFileInConfig as string | undefined;
  const privateFile = env.DARKTRACE_PRIVATE_TOKEN_FILE ?? privateFileInConfig as string | undefined;
  if (env.DARKTRACE_PUBLIC_TOKEN_FILE !== undefined && publicFileInConfig !== undefined && env.DARKTRACE_PUBLIC_TOKEN_FILE !== publicFileInConfig) {
    throw new ConfigValidationError('DARKTRACE_PUBLIC_TOKEN_FILE conflicts with auth.publicTokenFile');
  }
  if (env.DARKTRACE_PRIVATE_TOKEN_FILE !== undefined && privateFileInConfig !== undefined && env.DARKTRACE_PRIVATE_TOKEN_FILE !== privateFileInConfig) {
    throw new ConfigValidationError('DARKTRACE_PRIVATE_TOKEN_FILE conflicts with auth.privateTokenFile');
  }
  if ((env.DARKTRACE_PUBLIC_TOKEN !== undefined || auth.publicToken !== undefined) && publicFile !== undefined) {
    throw new ConfigValidationError('set either DARKTRACE_PUBLIC_TOKEN or its token file, not both');
  }
  if ((env.DARKTRACE_PRIVATE_TOKEN !== undefined || auth.privateToken !== undefined) && privateFile !== undefined) {
    throw new ConfigValidationError('set either DARKTRACE_PRIVATE_TOKEN or its token file, not both');
  }
  // Fixed, secret-free warning so the relaxed owner rule is always visible in the operator's logs.
  if (tokenFileOwner === 'root-or-current') logEvent('token_file_owner_relaxed');
  const publicTokenFromFile = readTokenFile(publicFile as string | undefined, 'public token file', tokenFileOwner);
  const privateTokenFromFile = readTokenFile(privateFile as string | undefined, 'private token file', tokenFileOwner);
  if (env.DARKTRACE_EXPORT_DIR !== undefined) throw new ConfigValidationError('export configuration is unsupported');

  const merged: RawConfig = {
    ...raw,
    instance: {
      ...instance,
      ...((env.DARKTRACE_URL ?? env.DARKTRACE_BASE_URL) === undefined ? {} : { baseUrl: env.DARKTRACE_URL ?? env.DARKTRACE_BASE_URL }),
      ...(env.DARKTRACE_TIMEOUT_MS === undefined ? {} : { timeoutMs: envInteger(env.DARKTRACE_TIMEOUT_MS, 'DARKTRACE_TIMEOUT_MS') }),
      ...(env.DARKTRACE_DESTINATION_ALLOWLIST === undefined ? {} : { destinationAllowlist: parseDestinationAllowlist(env.DARKTRACE_DESTINATION_ALLOWLIST) }),
    },
    auth: {
      ...runtimeAuth,
      ...(env.DARKTRACE_PUBLIC_TOKEN === undefined && publicTokenFromFile === undefined ? {} : { publicToken: env.DARKTRACE_PUBLIC_TOKEN ?? publicTokenFromFile }),
      ...(env.DARKTRACE_PRIVATE_TOKEN === undefined && privateTokenFromFile === undefined ? {} : { privateToken: env.DARKTRACE_PRIVATE_TOKEN ?? privateTokenFromFile }),
      ...(env.DARKTRACE_DATE_FORMAT === undefined ? {} : { dateFormat: env.DARKTRACE_DATE_FORMAT }),
      ...(env.DARKTRACE_QUERY_SIGNATURE_ENCODING === undefined ? {} : { querySignatureEncoding: env.DARKTRACE_QUERY_SIGNATURE_ENCODING }),
    },
    profiles,
    limits,
  };

  applyProfiles(merged, env.DARKTRACE_PROFILES);
  // DR-W-16: once DARKTRACE_PROFILES is set, the legacy booleans may only agree or narrow; widening is a startup error.
  const listed = env.DARKTRACE_PROFILES === undefined ? undefined : parseProfilesVariable(env.DARKTRACE_PROFILES);
  for (const [variable, key] of [['DARKTRACE_SENSITIVE_READ', 'sensitiveRead'], ['DARKTRACE_WRITE_CRITICAL', 'writeCritical']] as const) {
    const value = envBoolean(env[variable], variable);
    if (value === undefined) continue;
    if (listed !== undefined && value && !listed[key]) throw new ConfigValidationError(`${variable}=true conflicts with DARKTRACE_PROFILES`);
    merged.profiles = { ...asObject(merged.profiles), [key]: value };
  }
  for (const [variable, key] of [['DARKTRACE_CRITICAL_APPROVAL', 'criticalApproval'], ['DARKTRACE_WRITE_APPROVAL', 'writeApproval']] as const) {
    const value = env[variable];
    if (value === undefined) continue;
    if (value !== 'elicitation' && value !== 'host') throw new ConfigValidationError(`${variable} must be elicitation or host`);
    merged.profiles = { ...asObject(merged.profiles), [key]: value };
  }

  for (const [variable, key] of [['DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE', 'acknowledgeSensitiveWrite'], ['DARKTRACE_ACKNOWLEDGE_HOST_APPROVAL', 'acknowledgeHostApproval']] as const) {
    const value = envBoolean(env[variable], variable);
    if (value !== undefined) merged.profiles = { ...asObject(merged.profiles), [key]: value };
  }
  if (env.DARKTRACE_PROTECTED_TARGETS !== undefined) {
    const targets = env.DARKTRACE_PROTECTED_TARGETS.split(',').map((item) => item.trim()).filter(Boolean);
    if (targets.length === 0) throw new ConfigValidationError('DARKTRACE_PROTECTED_TARGETS must contain at least one identifier');
    merged.policy = { ...asObject(merged.policy), protectedTargets: targets };
  }

  const environmentLimits: ReadonlyArray<readonly [string, string]> = [
    ['DARKTRACE_MAX_RESPONSE_BYTES', 'limits.maxResponseBytes'],
    ['DARKTRACE_MAX_TOOL_INPUT_BYTES', 'limits.maxToolInputBytes'],
    ['DARKTRACE_MAX_TOOL_INPUT_DEPTH', 'limits.maxToolInputDepth'],
    ['DARKTRACE_MAX_TOOL_INPUT_ELEMENTS', 'limits.maxToolInputElements'],
    ['DARKTRACE_MAX_TOOL_OUTPUT_CHARS', 'limits.maxToolOutputChars'],
    ['DARKTRACE_MAX_CONCURRENT_REQUESTS', 'limits.maxConcurrentRequests'],
    ['DARKTRACE_MAX_QUEUED_REQUESTS', 'limits.maxQueuedRequests'],
    ['DARKTRACE_MAX_PAGES', 'limits.maxPages'],
    ['DARKTRACE_RATE_LIMIT_PER_MINUTE', 'limits.rateLimitPerMinute'],
    ['DARKTRACE_MAX_GET_RETRIES', 'limits.maxGetRetries'],
    ['DARKTRACE_MAX_RETRY_AFTER_MS', 'limits.maxRetryAfterMs'],
    ['DARKTRACE_MAX_WRITES_PER_MINUTE', 'limits.maxWritesPerMinute'],
  ];
  for (const [variable, key] of environmentLimits) {
    const parsed = envInteger(env[variable], variable);
    if (parsed !== undefined) setNested(merged, key, parsed);
  }

  const config = parseConfig(merged as ConfigSource);
  assertOperatorAcknowledgements(config);
  return config;
}

/**
 * Startup-only gates (DR-W-03/16, MR-06, CR-11): the sensitive-read + write union lets untrusted sensitive content
 * flow into free-text writes, and host approval delegates critical consent to the MCP host. Both need an explicit
 * operator acknowledgement; a fixed, value-free notice is logged when they are in effect.
 */
export function assertOperatorAcknowledgements(config: Config): void {
  const union = config.profiles.sensitiveRead && config.profiles.write;
  if (union && !config.acknowledgements.sensitiveWrite) {
    throw new ConfigValidationError('DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE=true is required when sensitive reads and writes are both enabled (profile all); results may carry untrusted content into write free-text fields');
  }
  const hostCritical = config.profiles.writeCritical && config.approval.critical === 'host';
  if (hostCritical && !config.acknowledgements.hostApproval) {
    throw new ConfigValidationError('DARKTRACE_ACKNOWLEDGE_HOST_APPROVAL=true is required with DARKTRACE_CRITICAL_APPROVAL=host; critical consent is then delegated to the MCP host');
  }
  if (union) logEvent('sensitive_write_acknowledged');
  if (hostCritical) logEvent('host_approval_acknowledged');
}
