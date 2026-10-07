import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { CliContext, ExecOptions, RunResult } from './clients.js';
import { SetupInputError } from './entry.js';
import { findOnPath } from './fsutil.js';
import { PACKAGE_NAME, describeEntry, isPackageVersion } from './install.js';

/**
 * Registry access for `update` (installer only; the MCP server never imports this module and never contacts npm).
 *
 * Every query, tarball fetch and dependency install goes through npm with a fixed registry, isolated npm configs and
 * TLS verification forced. The exact tarball is compared with the registry's SHA-512 integrity; `npm audit signatures`
 * verifies registry signatures for the installed tree, and `gh attestation verify` pins the target release provenance.
 */
export const REGISTRY_URL = 'https://registry.npmjs.org/';
export const RELEASES_URL = 'https://github.com/nuoframework/darktrace-mcp/releases';
export const ATTESTATION_REPOSITORY = 'nuoframework/darktrace-mcp';
export const ATTESTATION_WORKFLOW = `${ATTESTATION_REPOSITORY}/.github/workflows/release.yml`;
export const ATTESTATION_ISSUER = 'https://token.actions.githubusercontent.com';
const RELEASES_API = 'https://api.github.com/repos/nuoframework/darktrace-mcp/releases/tags/';
const REGISTRY_FLAGS = [`--registry=${REGISTRY_URL}`, `--@nuoframework:registry=${REGISTRY_URL}`];
const ATTESTATION_PREDICATE = 'https://slsa.dev/provenance/v1';

export type RegistryContext = Pick<CliContext, 'run' | 'env'> & Partial<Pick<CliContext, 'exec' | 'platform' | 'fetchText'>>;
type Exec = (command: string, args: readonly string[], options?: ExecOptions) => RunResult;
const execOf = (ctx: RegistryContext): Exec => ctx.exec ?? ((command, args) => ctx.run(command, args));

const NETWORK_ENV = new Set(['path', 'home', 'userprofile', 'systemroot', 'windir', 'temp', 'tmp', 'tmpdir', 'appdata', 'localappdata',
  'comspec', 'pathext', 'http_proxy', 'https_proxy', 'all_proxy', 'no_proxy', 'node_extra_ca_certs', 'ssl_cert_file', 'ssl_cert_dir', 'lang', 'lc_all', 'tz']);

/** Pass only runtime, proxy and CA settings; shell tokens and arbitrary tool configuration stay out of child processes. */
function trustedNetworkEnv(ctx: RegistryContext): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(ctx.env)) if (value !== undefined && NETWORK_ENV.has(key.toLowerCase())) env[key] = value;
  return env;
}

/** Do not let npm read a caller's .npmrc or inherit configurable registry/TLS settings. */
const trustedNpmEnv = trustedNetworkEnv;

/** Run one npm operation with an empty config, a clean working directory and explicit TLS/registry settings. */
function runNpm(ctx: RegistryContext, args: readonly string[], options: ExecOptions = {}): RunResult {
  const configDir = mkdtempSync(path.join(tmpdir(), 'darktrace-mcp-npm-config-'));
  try {
    const config = path.join(configDir, 'empty.npmrc');
    writeFileSync(config, '', { mode: 0o600 });
    const cwd = options.cwd ?? configDir;
    writeFileSync(path.join(cwd, '.npmrc'), '', { mode: 0o600 });
    const npmArgs = [...args, ...REGISTRY_FLAGS, `--userconfig=${config}`, `--globalconfig=${config}`, `--cache=${path.join(configDir, 'cache')}`, '--strict-ssl=true'];
    const result = execOf(ctx)(npmPath(ctx), npmArgs, {
      ...options,
      cwd,
      env: trustedNpmEnv(ctx),
      maxBufferBytes: Math.min(options.maxBufferBytes ?? 1024 * 1024, 4 * 1024 * 1024),
    });
    return result;
  } finally {
    rmSync(configDir, { recursive: true, force: true });
  }
}

/** First meaningful line of a command's output, printable ASCII only and bounded. npm messages carry no installer secret. */
export function commandDetail(result: RunResult, tool: string): string {
  const line = (result.stderr || result.stdout).split(/\r?\n/).map((l) => l.replace(/^npm (?:error|ERR!|warn)\s*/i, '').trim()).find((l) => l !== '' && !/^A complete log of this run/.test(l)) ?? '';
  const clean = line.replace(/[^\x20-\x7e]/g, '').slice(0, 200);
  return clean === '' ? '' : ` (${tool} said: ${clean})`;
}

export function npmPath(ctx: RegistryContext): string {
  const npm = findOnPath('npm', ctx.env, ctx.platform ?? process.platform);
  if (npm === undefined) throw new SetupInputError('npm is not on PATH; update needs the npm CLI that ships with Node.js 22+. Nothing was changed');
  return npm;
}

export interface RegistryVersion {
  readonly version: string;
  /** The registry publishes a provenance attestation for this version (verified later by `npm audit signatures`). */
  readonly provenance: boolean;
  readonly integrity?: string;
  /** Registry deprecation text, when the operator-selected version has been deprecated. */
  readonly deprecated?: string;
}

/** Resolve `latest` or an exact version on registry.npmjs.org with `npm view --json`. Never prints the raw registry answer. */
export function resolveVersion(ctx: RegistryContext, spec: string, timeoutMs = 60_000): RegistryVersion {
  if (spec !== 'latest' && !isPackageVersion(spec)) throw new SetupInputError('--version must be an exact published version such as 1.2.3');
  const result = runNpm(ctx, ['view', `${PACKAGE_NAME}@${spec}`, 'version', 'dist.integrity', 'dist.attestations.url', 'deprecated', '--json'], { timeoutMs, maxBufferBytes: 1024 * 1024 });
  if (result.status !== 0) {
    if (/E404/.test(result.stdout + result.stderr)) throw new SetupInputError(`version ${spec} of ${PACKAGE_NAME} is not published on registry.npmjs.org. Nothing was changed`);
    throw new SetupInputError(`registry.npmjs.org could not be queried${commandDetail(result, 'npm')}. Check network access and retry. Nothing was changed`);
  }
  if (Buffer.byteLength(result.stdout, 'utf8') > 1024 * 1024) throw new SetupInputError('the registry answer exceeded the 1 MiB limit. Nothing was changed');
  let parsed: unknown;
  try { parsed = JSON.parse(result.stdout); } catch { throw new SetupInputError('the registry answer could not be parsed. Nothing was changed'); }
  if (Array.isArray(parsed)) throw new SetupInputError('the version specifier matched several versions; give one exact version. Nothing was changed');
  const record = parsed as Record<string, unknown> | null;
  const version = record?.version;
  if (typeof version !== 'string' || !isPackageVersion(version)) throw new SetupInputError('the registry returned no usable version. Nothing was changed');
  if (spec !== 'latest' && version !== spec) throw new SetupInputError('the registry returned a different version than requested. Nothing was changed');
  const rawIntegrity = record?.['dist.integrity'];
  const integrity = typeof rawIntegrity === 'string' && /^sha512-[A-Za-z0-9+/]{86}==$/.test(rawIntegrity) &&
    Buffer.from(rawIntegrity.slice(7), 'base64').toString('base64') === rawIntegrity.slice(7) ? rawIntegrity : undefined;
  const deprecated = typeof record?.deprecated === 'string' && record.deprecated.trim() !== ''
    ? record.deprecated.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '').replace(/[\p{Cc}\p{Cf}\u2028\u2029]/gu, '').slice(0, 500) : undefined;
  return { version, provenance: typeof record?.['dist.attestations.url'] === 'string', ...(integrity ? { integrity } : {}), ...(deprecated ? { deprecated } : {}) };
}

const identifierCompare = (a: string, b: string): number => {
  const na = /^\d+$/.test(a);
  const nb = /^\d+$/.test(b);
  if (na && nb) return BigInt(a) < BigInt(b) ? -1 : BigInt(a) > BigInt(b) ? 1 : 0;
  if (na !== nb) return na ? -1 : 1;
  return a < b ? -1 : a > b ? 1 : 0;
};

/** Semantic version order: negative when `a` is older than `b`, zero when equal. A pre-release is older than its release. */
export function compareVersions(a: string, b: string): number {
  if (!isPackageVersion(a) || !isPackageVersion(b)) throw new SetupInputError('versions must be exact (major.minor.patch)');
  const [coreA, preA] = splitPre(a);
  const [coreB, preB] = splitPre(b);
  for (let i = 0; i < 3; i++) {
    if (coreA[i] !== coreB[i]) return coreA[i] < coreB[i] ? -1 : 1;
  }
  if (preA === undefined || preB === undefined) return preA === preB ? 0 : preA === undefined ? 1 : -1;
  const partsA = preA.split('.');
  const partsB = preB.split('.');
  for (let i = 0; i < Math.min(partsA.length, partsB.length); i++) {
    const diff = identifierCompare(partsA[i], partsB[i]);
    if (diff !== 0) return diff < 0 ? -1 : 1;
  }
  return partsA.length === partsB.length ? 0 : partsA.length < partsB.length ? -1 : 1;
}
function splitPre(version: string): [bigint[], string | undefined] {
  const dash = version.indexOf('-');
  const core = (dash === -1 ? version : version.slice(0, dash)).split('.').map(BigInt);
  return [core, dash === -1 ? undefined : version.slice(dash + 1)];
}

export interface Download {
  /** Throwaway install root (its `node_modules/` holds the package and its locked dependencies). */
  readonly dir: string;
  readonly entryPath: string;
  readonly version: string;
  readonly tarballPath: string;
  readonly integrity: string;
}

/**
 * `npm install` one exact version into a fresh private temporary directory: production dependencies from the
 * package's own shrinkwrap, no lifecycle scripts, no `.bin` links, registry fixed. The caller removes the directory.
 */
export function downloadPackage(ctx: RegistryContext, version: string, expectedIntegrity: string): Download {
  if (!isPackageVersion(version)) throw new SetupInputError('an exact version is required');
  if (!/^sha512-[A-Za-z0-9+/]{86}==$/.test(expectedIntegrity) || Buffer.from(expectedIntegrity.slice(7), 'base64').toString('base64') !== expectedIntegrity.slice(7)) {
    throw new SetupInputError('the registry returned no usable sha512 tarball integrity. Nothing was installed');
  }
  const dir = mkdtempSync(path.join(tmpdir(), 'darktrace-mcp-update-'));
  try {
    // A package.json here stops npm from adopting an unrelated project found in a parent directory.
    writeFileSync(path.join(dir, 'package.json'), '{"name":"darktrace-mcp-update","private":true}\n', { mode: 0o600 });
    const tarballDir = path.join(dir, 'tarball');
    mkdirSync(tarballDir, { mode: 0o700 });
    const pack = runNpm(ctx, ['pack', `${PACKAGE_NAME}@${version}`, '--json', '--ignore-scripts', `--pack-destination=${tarballDir}`], { cwd: dir, timeoutMs: 10 * 60_000 });
    if (pack.status !== 0) throw new SetupInputError(`npm pack ${PACKAGE_NAME}@${version} failed${commandDetail(pack, 'npm')}. Check network access to registry.npmjs.org and retry. Nothing was changed`);
    const archives = readdirSync(tarballDir).filter((name) => name.endsWith('.tgz'));
    if (archives.length !== 1) throw new SetupInputError('npm pack did not return exactly one package tarball. Nothing was installed');
    const tarballPath = path.join(tarballDir, archives[0]);
    const actualIntegrity = `sha512-${createHash('sha512').update(readFileSync(tarballPath)).digest('base64')}`;
    if (actualIntegrity !== expectedIntegrity) throw new SetupInputError('the downloaded tarball does not match registry metadata integrity. Nothing was installed');
    const result = runNpm(ctx, ['install', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund', '--no-bin-links', '--loglevel=error',
      `${PACKAGE_NAME}@${version}`], { cwd: dir, timeoutMs: 10 * 60_000 });
    if (result.status !== 0) throw new SetupInputError(`npm install ${PACKAGE_NAME}@${version} failed${commandDetail(result, 'npm')}. Check network access to registry.npmjs.org and retry. Nothing was changed`);
    const entryPath = path.join(dir, 'node_modules', '@nuoframework', 'darktrace-mcp', 'dist', 'src', 'index.js');
    const layout = describeEntry(entryPath);
    if (layout === undefined || layout.name !== PACKAGE_NAME || layout.version !== version || layout.installRoot !== dir) {
      throw new SetupInputError(`the downloaded tree does not contain ${PACKAGE_NAME}@${version}. Nothing was changed`);
    }
    let lock: unknown;
    try { lock = JSON.parse(readFileSync(path.join(dir, 'package-lock.json'), 'utf8')); } catch { throw new SetupInputError('npm did not create a readable lockfile for the downloaded tree. Nothing was installed'); }
    const lockIntegrity = (lock as { packages?: Record<string, { integrity?: unknown }> }).packages?.[`node_modules/${PACKAGE_NAME}`]?.integrity;
    if (lockIntegrity !== expectedIntegrity) throw new SetupInputError('the installed package integrity does not match registry metadata. Nothing was installed');
    return { dir, entryPath, version, tarballPath, integrity: expectedIntegrity };
  } catch (error) {
    rmSync(dir, { recursive: true, force: true });
    throw error;
  }
}

export interface SignatureReport {
  /** Packages whose registry signature npm verified (the whole downloaded tree). */
  readonly signatures: number;
  /** Packages whose Sigstore provenance attestation npm verified. */
  readonly attestations: number;
}

/**
 * `npm audit signatures` on the downloaded tree: every package must carry a valid registry signature, and when the
 * registry announces provenance for the requested version at least one attestation must verify. Any failure
 * (invalid or missing signature, unverifiable attestation, old npm) stops the update before anything is installed.
 */
export function verifySignatures(ctx: RegistryContext, download: Download, requireProvenance: boolean): SignatureReport {
  const result = runNpm(ctx, ['audit', 'signatures'], { cwd: download.dir, timeoutMs: 120_000, maxBufferBytes: 4 * 1024 * 1024 });
  if (result.status !== 0) throw new SetupInputError(`npm audit signatures rejected the downloaded tree${commandDetail(result, 'npm')}. Nothing was installed`);
  const text = result.stdout + '\n' + result.stderr;
  const signatures = Number(/(\d+) packages? (?:have|has) (?:a )?verified registry signatures?/.exec(text)?.[1] ?? NaN);
  const attestations = Number(/(\d+) packages? (?:have|has) (?:a )?verified attestations?/.exec(text)?.[1] ?? 0);
  if (!Number.isInteger(signatures) || signatures < 1) throw new SetupInputError('npm did not report verified registry signatures (npm 9.5 or newer is required). Nothing was installed');
  if (requireProvenance && attestations < 1) throw new SetupInputError('the registry announces provenance for this version but npm verified no attestation. Nothing was installed');
  return { signatures, attestations };
}

/** Verify the exact registry tarball against the repository and tagged release workflow that published it. */
export function verifyRepositoryProvenance(ctx: RegistryContext, download: Download): void {
  const gh = findOnPath('gh', ctx.env, ctx.platform ?? process.platform);
  if (gh === undefined) throw new SetupInputError('GitHub CLI (gh) is required to verify the release repository and workflow provenance. Install gh and retry; nothing was installed');
  const configDir = mkdtempSync(path.join(tmpdir(), 'darktrace-mcp-gh-config-'));
  try {
    const env = trustedNetworkEnv(ctx);
    env.GH_CONFIG_DIR = configDir;
    env.GH_HOST = 'github.com';
    const identity = `https://github.com/${ATTESTATION_WORKFLOW}@refs/tags/v${download.version}`;
    const args = ['attestation', 'verify', download.tarballPath,
      '--repo', ATTESTATION_REPOSITORY,
      '--signer-workflow', ATTESTATION_WORKFLOW,
      '--cert-identity', identity,
      '--cert-oidc-issuer', ATTESTATION_ISSUER,
      '--predicate-type', ATTESTATION_PREDICATE,
      '--digest-alg', 'sha256', '--format=json'];
    const result = execOf(ctx)(gh, args, { cwd: download.dir, env, timeoutMs: 120_000, maxBufferBytes: 4 * 1024 * 1024 });
    if (result.status !== 0) throw new SetupInputError(`GitHub could not verify the tarball for repository ${ATTESTATION_REPOSITORY} and workflow release.yml${commandDetail(result, 'gh')}. Nothing was installed`);
    let verified: unknown;
    try { verified = JSON.parse(result.stdout); } catch { throw new SetupInputError('GitHub CLI returned no verifiable attestation result. Nothing was installed'); }
    const digest = createHash('sha256').update(readFileSync(download.tarballPath)).digest('hex');
    const subjectAndLogVerified = Array.isArray(verified) && verified.some((item) => {
      if (item === null || typeof item !== 'object') return false;
      const result = (item as { verificationResult?: unknown }).verificationResult;
      if (result === null || typeof result !== 'object') return false;
      const details = result as { statement?: { subject?: unknown }; verifiedTimestamps?: unknown };
      const subjects = details.statement?.subject;
      const matchingSubject = Array.isArray(subjects) && subjects.some((subject) => subject !== null && typeof subject === 'object' &&
        (subject as { digest?: { sha256?: unknown } }).digest?.sha256 === digest);
      const rekorEntryVerified = Array.isArray(details.verifiedTimestamps) && details.verifiedTimestamps.some((timestamp) => timestamp !== null && typeof timestamp === 'object' &&
        (timestamp as { type?: unknown; uri?: unknown }).type === 'Tlog' && typeof (timestamp as { uri?: unknown }).uri === 'string' && /rekor/i.test((timestamp as { uri: string }).uri));
      return matchingSubject && rekorEntryVerified;
    });
    if (!subjectAndLogVerified) throw new SetupInputError('GitHub CLI did not return a verified matching tarball digest and transparency-log timestamp. Nothing was installed');
  } finally {
    rmSync(configDir, { recursive: true, force: true });
  }
}

export const removeDownload = (download: Download): void => { rmSync(download.dir, { recursive: true, force: true }); };

const NOTES_MAX_LINES = 60;
const NOTES_MAX_CHARS = 6000;

/** GitHub release body for `v<version>`, bounded and stripped of control characters; undefined when offline or absent. */
export async function releaseNotes(ctx: RegistryContext, version: string): Promise<string | undefined> {
  if (ctx.fetchText === undefined || !isPackageVersion(version)) return undefined;
  try {
    const text = await ctx.fetchText(`${RELEASES_API}v${version}`);
    if (text === undefined || Buffer.byteLength(text, 'utf8') > 512 * 1024) return undefined;
    const body = (JSON.parse(text) as { body?: unknown }).body;
    if (typeof body !== 'string' || body.trim() === '') return undefined;
    // Strip terminal escapes and Unicode control/format characters, preserving only line feeds.
    const clean = body.replace(/\r\n/g, '\n').replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '').replace(/[\p{Cc}\p{Cf}\u2028\u2029]/gu, (character) => character === '\n' ? '\n' : '');
    const lines = clean.split('\n');
    const bounded = lines.slice(0, NOTES_MAX_LINES).join('\n').slice(0, NOTES_MAX_CHARS);
    return bounded + (lines.length > NOTES_MAX_LINES || clean.length > NOTES_MAX_CHARS ? '\n[...]' : '');
  } catch {
    return undefined;
  }
}

/** Read the unique top-level image digest published in the matching GitHub release body. */
export async function releaseImageDigest(ctx: RegistryContext, version: string, repository: string): Promise<string | undefined> {
  if (ctx.fetchText === undefined || !isPackageVersion(version) || !/^[a-z0-9./-]+$/.test(repository)) return undefined;
  try {
    const text = await ctx.fetchText(`${RELEASES_API}v${version}`);
    if (text === undefined || Buffer.byteLength(text, 'utf8') > 512 * 1024) return undefined;
    const release = JSON.parse(text) as { tag_name?: unknown; body?: unknown };
    if (release.tag_name !== `v${version}` || typeof release.body !== 'string') return undefined;
    const bodyLines = release.body.split(/\r?\n/);
    const headingIndex = bodyLines.findIndex((line) => line.trim() === `### ${repository}`);
    if (headingIndex < 0) return undefined;
    const fenceStart = bodyLines.findIndex((line, index) => index > headingIndex && line.trim() === '```');
    const fenceEnd = fenceStart < 0 ? -1 : bodyLines.findIndex((line, index) => index > fenceStart && line.trim() === '```');
    if (fenceStart < 0 || fenceEnd < 0) return undefined;
    const lines = bodyLines.slice(fenceStart + 1, fenceEnd).map((line) => line.trim()).filter(Boolean);
    if (!lines.includes(`${repository}:${version}`)) return undefined;
    const digestPrefix = `${repository}@sha256:`;
    const imageDigests = lines.filter((line) => line.startsWith(digestPrefix) && /^[a-f0-9]{64}$/.test(line.slice(digestPrefix.length)));
    return imageDigests.length === 1 ? imageDigests[0] : undefined;
  } catch {
    return undefined;
  }
}

export const releaseUrl = (version: string): string => `${RELEASES_URL}/tag/v${version}`;

/** Production fetcher: HTTPS GET with a timeout, no redirects and a bounded body. Returns undefined on any failure. */
export async function fetchTextBounded(url: string, userAgent: string, maxBytes = 512 * 1024): Promise<string | undefined> {
  if (!url.startsWith('https://') || process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') return undefined;
  try {
    const response = await fetch(url, { headers: { accept: 'application/vnd.github+json', 'user-agent': userAgent }, signal: AbortSignal.timeout(10_000), redirect: 'error' });
    if (!response.ok || response.body === null) return undefined;
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) { await reader.cancel(); return undefined; }
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString('utf8');
  } catch {
    return undefined;
  }
}
