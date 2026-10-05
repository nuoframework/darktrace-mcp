import { constants, fstatSync, openSync, readSync, closeSync } from 'node:fs';
import path from 'node:path';
import { assertSafeNetworkEnvironment, ConfigValidationError, parseConfig, type Config, type ConfigSource } from './schema.js';

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
  'DARKTRACE_SENSITIVE_READ', 'DARKTRACE_MAX_RESPONSE_BYTES', 'DARKTRACE_MAX_TOOL_INPUT_BYTES',
  'DARKTRACE_MAX_TOOL_INPUT_DEPTH', 'DARKTRACE_MAX_TOOL_INPUT_ELEMENTS', 'DARKTRACE_MAX_TOOL_OUTPUT_CHARS',
  'DARKTRACE_MAX_CONCURRENT_REQUESTS', 'DARKTRACE_MAX_QUEUED_REQUESTS', 'DARKTRACE_MAX_PAGES',
  'DARKTRACE_RATE_LIMIT_PER_MINUTE', 'DARKTRACE_MAX_GET_RETRIES', 'DARKTRACE_MAX_RETRY_AFTER_MS',
  ...FORBIDDEN_ENV,
]);

function assertPrivateFile(mode: number, uid: number, label: string): void {
  if (process.platform === 'win32') throw new ConfigValidationError(`${label} secure ownership checks are unsupported on this platform`);
  const permissions = mode & 0o7777;
  if ((permissions & (0o077 | 0o111 | 0o7000)) !== 0 || (permissions & 0o400) === 0) {
    throw new ConfigValidationError(`${label} permissions must be owner-only with no execute or special bits`);
  }
  if (typeof process.getuid !== 'function' || uid !== process.getuid()) {
    throw new ConfigValidationError(`${label} must be owned by the current user`);
  }
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

function readTokenFile(filePath: string | undefined, label: string): string | undefined {
  if (filePath === undefined) return undefined;
  if (typeof filePath !== 'string' || !path.isAbsolute(filePath)) throw new ConfigValidationError(`${label} must be an absolute path`);
  let fd: number | undefined;
  try {
    fd = openSync(filePath, secureOpenFlags());
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.size > TOKEN_FILE_MAX_BYTES) throw new Error('invalid token file');
    assertPrivateFile(stat.mode, stat.uid, label);
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

function applyProfiles(raw: RawConfig, value: string | undefined): void {
  if (value === undefined) return;
  const requested = value.split(',').map((name) => name.trim()).filter(Boolean);
  const allowed = new Set(['read', 'write']);
  if (requested.some((name) => !allowed.has(name)) || new Set(requested).size !== requested.length) {
    throw new ConfigValidationError('DARKTRACE_PROFILES may contain read and write once each; email/export are unsupported');
  }
  const existing = asObject(raw.profiles);
  raw.profiles = { ...existing, read: true, write: requested.includes('write') };
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
  const instance = asObject(raw.instance);
  const auth = asObject(raw.auth);
  const profiles = asObject(raw.profiles);
  const limits = asObject(raw.limits);
  const { publicTokenFile: publicFileInConfig, privateTokenFile: privateFileInConfig, ...runtimeAuth } = auth;

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
  const publicTokenFromFile = readTokenFile(publicFile as string | undefined, 'public token file');
  const privateTokenFromFile = readTokenFile(privateFile as string | undefined, 'private token file');
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
  const sensitiveRead = envBoolean(env.DARKTRACE_SENSITIVE_READ, 'DARKTRACE_SENSITIVE_READ');
  if (sensitiveRead !== undefined) merged.profiles = { ...asObject(merged.profiles), sensitiveRead };
  const critical = envBoolean(env.DARKTRACE_WRITE_CRITICAL, 'DARKTRACE_WRITE_CRITICAL');
  if (critical !== undefined) merged.profiles = { ...asObject(merged.profiles), writeCritical: critical };

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
  ];
  for (const [variable, key] of environmentLimits) {
    const parsed = envInteger(env[variable], variable);
    if (parsed !== undefined) setNested(merged, key, parsed);
  }

  return parseConfig(merged as ConfigSource);
}
