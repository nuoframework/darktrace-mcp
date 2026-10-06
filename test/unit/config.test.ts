import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import '../security/test-runtime-argv.js';
import test from 'node:test';
import { assertPrivateFile, loadConfig } from '../../src/config/load.js';
import { assertSafeNetworkEnvironment, ConfigValidationError, parseConfig } from '../../src/config/schema.js';
import { canonicalIpAddress, isForbiddenDestination } from '../../src/config/address.js';

const config = (overrides: Record<string, unknown> = {}) => parseConfig({
  instance: { baseUrl: 'https://darktrace.example' },
  auth: { publicToken: 'public-value', privateToken: 'private-value' },
  ...overrides,
});

test('config defaults are conservative and every public limit has a hard ceiling', () => {
  const result = config();
  assert.deepEqual(result.profiles, { read: true, write: false, sensitiveRead: false, writeCritical: false });
  assert.equal(result.instance.baseUrl, 'https://darktrace.example');
  assert.equal(result.instance.timeoutMs, 30_000);
  assert.equal(result.auth.querySignatureEncoding, 'unencoded');
  assert.deepEqual(result.limits, {
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
    maxWritesPerMinute: 10,
  });
});

test('fixed HTTPS origin rejects credentials, paths, alternate numeric IPs, and invalid ports', () => {
  for (const baseUrl of [
    'http://darktrace.example',
    'https://user:pass@darktrace.example',
    'https://darktrace.example/api',
    'https://darktrace.example?x=1',
    'https://darktrace.example#fragment',
    'https://2130706433',
    'https://0x7f000001',
    'https://127.1',
    'https://darktrace.example:0',
    'https://darktrace.example:65536',
  ]) assert.throws(() => config({ instance: { baseUrl } }), ConfigValidationError, baseUrl);
  assert.equal(config({ instance: { baseUrl: 'https://[2001:db8::1]:8443/' } }).instance.baseUrl, 'https://[2001:db8::1]:8443');
  assert.throws(() => config({ instance: { baseUrl: 'https://darktrace.example', tlsRejectUnauthorized: false } }), /insecure TLS/);
});

test('destination allowlist accepts canonical IP literals only and address policy blocks unsafe ranges', () => {
  assert.deepEqual(config({ instance: { baseUrl: 'https://appliance.example', destinationAllowlist: ['10.20.30.40', 'fd12:3456::1'] } }).instance.destinationAllowlist,
    ['10.20.30.40', 'fd12:3456::1']);
  for (const allowlist of [['10.1.2.3/24'], ['10.001.2.3'], ['2001:0db8::1'], []]) {
    assert.throws(() => config({ instance: { baseUrl: 'https://appliance.example', destinationAllowlist: allowlist } }), /destinationAllowlist/);
  }
  for (const forbidden of ['127.0.0.1', '169.254.169.254', '224.0.0.1', '0.0.0.0', '::', '::1', 'fe80::1', 'ff02::1', '::ffff:127.0.0.1', 'fd00:ec2::254']) {
    assert.equal(isForbiddenDestination(forbidden), true, forbidden);
  }
  for (const allowed of ['10.1.2.3', '172.31.255.1', '192.168.1.1', 'fd12:3456::1', '2001:db8::1']) {
    assert.equal(isForbiddenDestination(allowed), false, allowed);
  }
  assert.equal(canonicalIpAddress('::ffff:10.1.2.3'), '10.1.2.3');
});

test('strict config rejects unknown keys, unsupported profiles, HTTP, export, and version overrides', () => {
  assert.throws(() => config({ unknown: true }), /unsupported field/);
  assert.throws(() => config({ instance: { baseUrl: 'https://darktrace.example', proxy: 'http://proxy' } }), /unsupported field/);
  assert.throws(() => config({ profiles: { sensitiveRead: true, export: false } }), /email and export/);
  assert.throws(() => config({ profiles: { email: false } }), /email and export/);
  assert.throws(() => config({ profiles: { writeCritical: true } }), /requires profiles.write/);
  assert.doesNotThrow(() => config({ profiles: { sensitiveRead: true, write: true, writeCritical: true } }));
  assert.throws(() => config({ transport: { kind: 'http' } }), /only stdio/);
  assert.throws(() => config({ transport: { kind: 'stdio', http: { port: 8080 } } }), /HTTP transport/);
  assert.throws(() => config({ compat: { assumeVersion: '7.1' } }), /compatibility overrides/);
  assert.throws(() => config({ export: { directory: '/tmp/out' } }), /unsupported field/);
  assert.throws(() => config({ instance: { caFile: '/tmp/ca.pem' } }), /private CAs use NODE_EXTRA_CA_CERTS/);
});

test('all configured resource limits can only lower documented ceilings', () => {
  assert.equal(config({ instance: { baseUrl: 'https://darktrace.example', timeoutMs: 200 } }).instance.timeoutMs, 200);
  assert.equal(config({ limits: { maxQueuedRequests: 0, maxGetRetries: 0, maxRetryAfterMs: 0 } }).limits.maxQueuedRequests, 0);
  const above = [
    ['timeoutMs', 30_001, { instance: { baseUrl: 'https://darktrace.example', timeoutMs: 30_001 } }],
    ['maxResponseBytes', 2_097_153, { limits: { maxResponseBytes: 2_097_153 } }],
    ['maxToolInputBytes', 65_537, { limits: { maxToolInputBytes: 65_537 } }],
    ['maxToolInputDepth', 9, { limits: { maxToolInputDepth: 9 } }],
    ['maxToolInputElements', 5_001, { limits: { maxToolInputElements: 5_001 } }],
    ['maxToolOutputChars', 60_001, { limits: { maxToolOutputChars: 60_001 } }],
    ['maxConcurrentRequests', 5, { limits: { maxConcurrentRequests: 5 } }],
    ['maxQueuedRequests', 17, { limits: { maxQueuedRequests: 17 } }],
    ['maxPages', 11, { limits: { maxPages: 11 } }],
    ['rateLimitPerMinute', 121, { limits: { rateLimitPerMinute: 121 } }],
    ['maxGetRetries', 3, { limits: { maxGetRetries: 3 } }],
    ['maxRetryAfterMs', 2_001, { limits: { maxRetryAfterMs: 2_001 } }],
  ] as const;
  for (const [name, _value, overrides] of above) assert.throws(() => config(overrides), new RegExp(name));
  assert.throws(() => config({ limits: { maxResponseBytes: 0 } }), /maxResponseBytes/);
});

test('loadConfig supports token files, the base URL alias, lower-only env limits, and sensitive-read opt-in', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'darktrace-config-'));
  try {
    const publicFile = path.join(dir, 'public-token');
    const privateFile = path.join(dir, 'private-token');
    writeFileSync(publicFile, 'public-from-file\n', { mode: 0o600 });
    writeFileSync(privateFile, 'private-from-file\n', { mode: 0o600 });
    const loaded = loadConfig({
      DARKTRACE_BASE_URL: 'https://darktrace.example:8443/',
      DARKTRACE_PUBLIC_TOKEN_FILE: publicFile,
      DARKTRACE_PRIVATE_TOKEN_FILE: privateFile,
      DARKTRACE_PROFILES: 'read',
      DARKTRACE_SENSITIVE_READ: 'true',
      DARKTRACE_QUERY_SIGNATURE_ENCODING: 'encoded',
      DARKTRACE_DESTINATION_ALLOWLIST: '10.0.0.4,fd12::1',
      DARKTRACE_MAX_CONCURRENT_REQUESTS: '3',
      DARKTRACE_MAX_RESPONSE_BYTES: '1024',
      NODE_EXTRA_CA_CERTS: '/trusted/ca.pem',
    });
    assert.equal(loaded.instance.baseUrl, 'https://darktrace.example:8443');
    assert.deepEqual(loaded.instance.destinationAllowlist, ['10.0.0.4', 'fd12::1']);
    assert.equal(loaded.auth.publicToken, 'public-from-file');
    assert.equal(loaded.auth.privateToken, 'private-from-file');
    assert.equal(loaded.auth.querySignatureEncoding, 'encoded');
    assert.deepEqual(loaded.profiles, { read: true, write: false, sensitiveRead: true, writeCritical: false });
    assert.equal(loaded.limits.maxConcurrentRequests, 3);
    assert.equal(loaded.limits.maxResponseBytes, 1024);
    assert.equal(JSON.stringify(loaded.profiles).includes('private-from-file'), false);
    assert.throws(() => loadConfig({ DARKTRACE_URL: 'https://one.example', DARKTRACE_BASE_URL: 'https://two.example' }), /conflict/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('token files reject symlinks, broad permissions, CRLF, and oversized data without disclosing token text', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'darktrace-token-'));
  try {
    const ordinary = path.join(dir, 'ordinary');
    const link = path.join(dir, 'link');
    writeFileSync(ordinary, 'token\n', { mode: 0o600 });
    symlinkSync(ordinary, link);
    const base = { DARKTRACE_URL: 'https://darktrace.example', DARKTRACE_PUBLIC_TOKEN: 'public-token' };
    assert.throws(() => loadConfig({ ...base, DARKTRACE_PRIVATE_TOKEN_FILE: link }), /could not read private token file/);

    const broad = path.join(dir, 'broad');
    writeFileSync(broad, 'secret-value', { mode: 0o600 });
    chmodSync(broad, 0o644);
    assert.throws(() => loadConfig({ ...base, DARKTRACE_PRIVATE_TOKEN_FILE: broad }), /could not read private token file/);

    const crlf = path.join(dir, 'crlf');
    writeFileSync(crlf, 'secret-value\r\n', { mode: 0o600 });
    assert.throws(() => loadConfig({ ...base, DARKTRACE_PRIVATE_TOKEN_FILE: crlf }), /could not read private token file/);

    const large = path.join(dir, 'large');
    writeFileSync(large, 'x'.repeat(4_097), { mode: 0o600 });
    assert.throws(() => loadConfig({ ...base, DARKTRACE_PRIVATE_TOKEN_FILE: large }), /could not read private token file/);

    if (process.platform !== 'win32') {
      const fifo = path.join(dir, 'token-pipe');
      const created = spawnSync('mkfifo', [fifo]);
      assert.equal(created.status, 0);
      assert.throws(() => loadConfig({ ...base, DARKTRACE_PRIVATE_TOKEN_FILE: fifo }), /could not read private token file/);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('token file owner rule: default rejects foreign owners; root-or-current accepts only uid 0 and keeps mode checks', { skip: process.platform === 'win32' }, () => {
  const uid = process.getuid!();
  const foreign = uid === 4242 ? 4243 : 4242;
  for (const owner of [undefined, 'current'] as const) {
    assert.doesNotThrow(() => assertPrivateFile(0o100600, uid, 'private token file', owner));
    assert.throws(() => assertPrivateFile(0o100600, foreign, 'private token file', owner), /must be owned by the current user$/);
    if (uid !== 0) assert.throws(() => assertPrivateFile(0o100600, 0, 'private token file', owner), /must be owned by the current user$/);
  }
  assert.doesNotThrow(() => assertPrivateFile(0o100600, 0, 'private token file', 'root-or-current'));
  assert.doesNotThrow(() => assertPrivateFile(0o100400, 0, 'private token file', 'root-or-current'));
  assert.doesNotThrow(() => assertPrivateFile(0o100600, uid, 'private token file', 'root-or-current'));
  assert.throws(() => assertPrivateFile(0o100600, foreign, 'private token file', 'root-or-current'), /must be owned by the current user or root/);
  for (const mode of [0o100644, 0o100640, 0o100700, 0o104600, 0o102600, 0o101600, 0o100200]) {
    assert.throws(() => assertPrivateFile(mode, 0, 'private token file', 'root-or-current'), /owner-only/);
  }

  const dir = mkdtempSync(path.join(os.tmpdir(), 'darktrace-owner-'));
  try {
    const token = path.join(dir, 'token');
    writeFileSync(token, 'synthetic-owner-token\n', { mode: 0o600 });
    const base = { DARKTRACE_URL: 'https://darktrace.example', DARKTRACE_PUBLIC_TOKEN: 'public-token', DARKTRACE_PRIVATE_TOKEN_FILE: token };
    for (const value of ['current', 'root-or-current']) {
      assert.equal(loadConfig({ ...base, DARKTRACE_TOKEN_FILE_OWNER: value }).auth.privateToken, 'synthetic-owner-token');
    }
    for (const value of ['root', 'any', '', 'ROOT-OR-CURRENT', 'root-or-current ']) {
      assert.throws(() => loadConfig({ ...base, DARKTRACE_TOKEN_FILE_OWNER: value }), (error: unknown) =>
        error instanceof ConfigValidationError && error.message === 'DARKTRACE_TOKEN_FILE_OWNER must be current or root-or-current');
    }
    const file = path.join(dir, 'config.json');
    writeFileSync(file, JSON.stringify({ auth: { tokenFileOwner: 'root-or-current' } }), { mode: 0o600 });
    assert.equal(loadConfig({ ...base, DARKTRACE_CONFIG_FILE: file }).auth.privateToken, 'synthetic-owner-token');
    assert.throws(() => loadConfig({ ...base, DARKTRACE_CONFIG_FILE: file, DARKTRACE_TOKEN_FILE_OWNER: 'current' }), /conflicts with auth\.tokenFileOwner/);
    writeFileSync(file, JSON.stringify({ auth: { tokenFileOwner: 'nobody' } }), { mode: 0o600 });
    assert.throws(() => loadConfig({ ...base, DARKTRACE_CONFIG_FILE: file }), /auth\.tokenFileOwner must be current or root-or-current/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('DARKTRACE_TOKEN_FILE_OWNER=root-or-current logs one fixed secret-free startup warning', { skip: process.platform === 'win32' }, () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'darktrace-owner-log-'));
  try {
    const token = path.join(dir, 'token');
    writeFileSync(token, 'synthetic-warning-token\n', { mode: 0o600 });
    const script = `import { loadConfig } from ${JSON.stringify(path.resolve('dist/src/config/load.js'))}; loadConfig(process.env);`;
    const base = { DARKTRACE_URL: 'https://darktrace.example', DARKTRACE_PUBLIC_TOKEN: 'synthetic-public', DARKTRACE_PRIVATE_TOKEN_FILE: token };
    const relaxed = spawnSync(process.execPath, ['--input-type=module', '-e', script], { env: { ...base, DARKTRACE_TOKEN_FILE_OWNER: 'root-or-current' }, encoding: 'utf8' });
    assert.equal(relaxed.status, 0, relaxed.stderr);
    const lines = relaxed.stderr.trim().split('\n');
    assert.equal(lines.length, 1);
    const warning = JSON.parse(lines[0]);
    assert.deepEqual(Object.keys(warning).sort(), ['event', 'ts']);
    assert.equal(warning.event, 'token_file_owner_relaxed');
    for (const secret of ['synthetic-warning-token', 'synthetic-public', token]) assert.equal(relaxed.stderr.includes(secret), false);
    const strict = spawnSync(process.execPath, ['--input-type=module', '-e', script], { env: base, encoding: 'utf8' });
    assert.equal(strict.status, 0, strict.stderr);
    assert.equal(strict.stderr, '');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('JSON config files use no-follow, regular-file, owner-only and 64 KiB bounded-open checks', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'darktrace-json-config-'));
  try {
    const inlineSecrets = path.join(dir, 'inline-secrets.json');
    writeFileSync(inlineSecrets, JSON.stringify({
      instance: { baseUrl: 'https://darktrace.example' },
      auth: { publicToken: 'inline-public', privateToken: 'inline-private' },
    }), { mode: 0o600 });
    const inline = loadConfig({}, inlineSecrets);
    assert.equal(inline.auth.publicToken, 'inline-public');
    assert.equal(inline.auth.privateToken, 'inline-private');

    const policyOnly = path.join(dir, 'policy-only.json');
    writeFileSync(policyOnly, JSON.stringify({ instance: { timeoutMs: 1_000 }, profiles: { write: false } }), { mode: 0o600 });
    const policy = loadConfig({
      DARKTRACE_URL: 'https://darktrace.example',
      DARKTRACE_PUBLIC_TOKEN: 'environment-public',
      DARKTRACE_PRIVATE_TOKEN: 'environment-private',
    }, policyOnly);
    assert.equal(policy.instance.timeoutMs, 1_000);
    assert.equal(policy.auth.publicToken, 'environment-public');

    const strict = path.join(dir, 'strict.json');
    writeFileSync(strict, JSON.stringify({ instance: { baseUrl: 'https://darktrace.example' }, auth: { publicToken: 'p', privateToken: 'q' } }), { mode: 0o400 });
    assert.doesNotThrow(() => loadConfig({}, strict));

    const broad = path.join(dir, 'broad.json');
    writeFileSync(broad, JSON.stringify({ auth: { privateToken: 'secret-inline-value' } }), { mode: 0o600 });
    chmodSync(broad, 0o644);
    assert.throws(() => loadConfig({}, broad), (error: unknown) => {
      assert.ok(error instanceof ConfigValidationError);
      assert.equal(error.message.includes('secret-inline-value'), false);
      return true;
    });

    const tooLarge = path.join(dir, 'large.json');
    writeFileSync(tooLarge, `{"padding":"${'x'.repeat(65_536)}"}`, { mode: 0o600 });
    assert.throws(() => loadConfig({}, tooLarge), /could not read config file/);

    const growing = path.join(dir, 'growing.json');
    writeFileSync(growing, `{"padding":"${'x'.repeat(65_000)}"}`, { mode: 0o600 });
    const grower = spawnSync(process.execPath, ['-e', 'require("node:fs").appendFileSync(process.argv[1], "x".repeat(4096))', growing]);
    assert.equal(grower.status, 0);
    assert.throws(() => loadConfig({}, growing), /could not read config file/);

    const directory = path.join(dir, 'directory.json');
    assert.throws(() => loadConfig({}, dir), /could not read config file/);

    const link = path.join(dir, 'link.json');
    symlinkSync(strict, link);
    assert.throws(() => loadConfig({}, link), /could not read config file/);

    if (process.platform !== 'win32') {
      const fifo = path.join(dir, 'config-pipe.json');
      const created = spawnSync('mkfifo', [fifo]);
      assert.equal(created.status, 0);
      assert.throws(() => loadConfig({
        DARKTRACE_URL: 'https://darktrace.example',
        DARKTRACE_PUBLIC_TOKEN: 'p',
        DARKTRACE_PRIVATE_TOKEN: 'q',
      }, fifo), /could not read config file/);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('DARKTRACE_CONFIG_FILE and diagnostic overrides reject relative paths before opening files', () => {
  assert.throws(() => loadConfig({ DARKTRACE_CONFIG_FILE: 'relative/operator.json' }), /absolute/);
  assert.throws(() => loadConfig({}, 'relative/operator.json'), /absolute/);
});

test('network environment rejects TLS, proxy, and known NODE_OPTIONS bypasses with safe diagnostics', () => {
  assert.throws(() => loadConfig({ DARKTRACE_TLS_INSECURE: 'false' }), /DARKTRACE_TLS_INSECURE/);
  assert.throws(() => loadConfig({ NODE_TLS_REJECT_UNAUTHORIZED: '0' }), /NODE_TLS_REJECT_UNAUTHORIZED/);
  assert.throws(() => loadConfig({ NODE_USE_ENV_PROXY: '0' }), /NODE_USE_ENV_PROXY/);
  for (const name of ['HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'NO_PROXY', 'http_proxy', 'https_proxy', 'all_proxy', 'no_proxy']) {
    assert.throws(() => assertSafeNetworkEnvironment({ [name]: 'http://secret-user:secret@proxy' }), new RegExp(name));
  }
  assert.throws(() => assertSafeNetworkEnvironment({}, ['--use-env-proxy']), /--use-env-proxy/);
  assert.throws(() => assertSafeNetworkEnvironment({ NODE_OPTIONS: '--tls-min-v1.0' }, []), /--tls-min-v1.0/);
  assert.throws(() => assertSafeNetworkEnvironment({ NODE_OPTIONS: '"--use-env-proxy"' }, []), /--use-env-proxy/);
  assert.throws(() => loadConfig({ DARKTRACE_HTTP_PORT: '8080' }), /DARKTRACE_HTTP_PORT/);
  assert.throws(() => loadConfig({ DARKTRACE_PROFILES: 'read,email' }), /DARKTRACE_PROFILES must be/);
  assert.doesNotThrow(() => assertSafeNetworkEnvironment({ NODE_EXTRA_CA_CERTS: '/trusted/ca.pem' }, []));
});

test('config validation errors never echo token values', () => {
  const secret = 'sensitive-private-token-value';
  assert.throws(() => parseConfig({
    instance: { baseUrl: 'https://host.example' },
    auth: { publicToken: 'public', privateToken: secret, querySignatureEncoding: 'fallback' },
  }), (error: unknown) => {
    assert.ok(error instanceof ConfigValidationError);
    assert.equal(error.message.includes(secret), false);
    return true;
  });
});
