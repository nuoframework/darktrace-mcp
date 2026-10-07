import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { CliContext, ExecOptions, RunResult } from './clients.js';
import { SetupInputError } from './entry.js';
import { findOnPath } from './fsutil.js';
import { PACKAGE_NAME, describeEntry, isPackageVersion } from './install.js';

/**
 * Registry access for `update` (installer only; the MCP server never imports this module and never contacts npm).
 *
 * Every query and download goes through the npm CLI with an argument vector against one fixed registry: the
 * `--registry` and scoped-registry flags override any `.npmrc`, so a redirected registry cannot serve a package.
 * npm checks the tarball integrity against the registry document and `npm audit signatures` then verifies the
 * registry's ECDSA signature and the Sigstore provenance attestation of every package in the downloaded tree.
 */
export const REGISTRY_URL = 'https://registry.npmjs.org/';
export const RELEASES_URL = 'https://github.com/nuoframework/darktrace-mcp/releases';
const RELEASES_API = 'https://api.github.com/repos/nuoframework/darktrace-mcp/releases/tags/';
const REGISTRY_FLAGS = [`--registry=${REGISTRY_URL}`, `--@nuoframework:registry=${REGISTRY_URL}`];

export type RegistryContext = Pick<CliContext, 'run' | 'env'> & Partial<Pick<CliContext, 'exec' | 'platform' | 'fetchText'>>;
type Exec = (command: string, args: readonly string[], options?: ExecOptions) => RunResult;
const execOf = (ctx: RegistryContext): Exec => ctx.exec ?? ((command, args) => ctx.run(command, args));

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
}

/** Resolve `latest` or an exact version on registry.npmjs.org with `npm view --json`. Never prints the raw registry answer. */
export function resolveVersion(ctx: RegistryContext, spec: string, timeoutMs = 60_000): RegistryVersion {
  if (spec !== 'latest' && !isPackageVersion(spec)) throw new SetupInputError('--version must be an exact published version such as 1.2.3');
  const result = execOf(ctx)(npmPath(ctx), ['view', `${PACKAGE_NAME}@${spec}`, 'version', 'dist.integrity', 'dist.attestations.url', '--json', ...REGISTRY_FLAGS], { timeoutMs });
  if (result.status !== 0) {
    if (/E404/.test(result.stdout + result.stderr)) throw new SetupInputError(`version ${spec} of ${PACKAGE_NAME} is not published on registry.npmjs.org. Nothing was changed`);
    throw new SetupInputError(`registry.npmjs.org could not be queried${commandDetail(result, 'npm')}. Check network access and retry. Nothing was changed`);
  }
  let parsed: unknown;
  try { parsed = JSON.parse(result.stdout); } catch { throw new SetupInputError('the registry answer could not be parsed. Nothing was changed'); }
  if (Array.isArray(parsed)) throw new SetupInputError('the version specifier matched several versions; give one exact version. Nothing was changed');
  const record = parsed as Record<string, unknown> | null;
  const version = record?.version;
  if (typeof version !== 'string' || !isPackageVersion(version)) throw new SetupInputError('the registry returned no usable version. Nothing was changed');
  const integrity = typeof record?.['dist.integrity'] === 'string' && /^sha512-[A-Za-z0-9+/=]+$/.test(record['dist.integrity'] as string) ? record['dist.integrity'] as string : undefined;
  return { version, provenance: typeof record?.['dist.attestations.url'] === 'string', ...(integrity ? { integrity } : {}) };
}

const identifierCompare = (a: string, b: string): number => {
  const na = /^\d+$/.test(a);
  const nb = /^\d+$/.test(b);
  if (na && nb) return Number(a) - Number(b);
  if (na !== nb) return na ? -1 : 1;
  return a < b ? -1 : a > b ? 1 : 0;
};

/** Semantic version order: negative when `a` is older than `b`, zero when equal. A pre-release is older than its release. */
export function compareVersions(a: string, b: string): number {
  if (!isPackageVersion(a) || !isPackageVersion(b)) throw new SetupInputError('versions must be exact (major.minor.patch)');
  const [coreA, preA] = splitPre(a);
  const [coreB, preB] = splitPre(b);
  for (let i = 0; i < 3; i++) {
    const diff = coreA[i] - coreB[i];
    if (diff !== 0) return diff < 0 ? -1 : 1;
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
function splitPre(version: string): [number[], string | undefined] {
  const dash = version.indexOf('-');
  const core = (dash === -1 ? version : version.slice(0, dash)).split('.').map(Number);
  return [core, dash === -1 ? undefined : version.slice(dash + 1)];
}

export interface Download {
  /** Throwaway install root (its `node_modules/` holds the package and its locked dependencies). */
  readonly dir: string;
  readonly entryPath: string;
  readonly version: string;
}

/**
 * `npm install` one exact version into a fresh private temporary directory: production dependencies from the
 * package's own shrinkwrap, no lifecycle scripts, no `.bin` links, registry fixed. The caller removes the directory.
 */
export function downloadPackage(ctx: RegistryContext, version: string): Download {
  if (!isPackageVersion(version)) throw new SetupInputError('an exact version is required');
  const dir = mkdtempSync(path.join(tmpdir(), 'darktrace-mcp-update-'));
  try {
    // A package.json here stops npm from adopting an unrelated project found in a parent directory.
    writeFileSync(path.join(dir, 'package.json'), '{"name":"darktrace-mcp-update","private":true}\n', { mode: 0o600 });
    const result = execOf(ctx)(npmPath(ctx), ['install', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund', '--no-bin-links', '--loglevel=error',
      ...REGISTRY_FLAGS, `${PACKAGE_NAME}@${version}`], { cwd: dir, timeoutMs: 10 * 60_000 });
    if (result.status !== 0) throw new SetupInputError(`npm install ${PACKAGE_NAME}@${version} failed${commandDetail(result, 'npm')}. Check network access to registry.npmjs.org and retry. Nothing was changed`);
    const entryPath = path.join(dir, 'node_modules', '@nuoframework', 'darktrace-mcp', 'dist', 'src', 'index.js');
    const layout = describeEntry(entryPath);
    if (layout === undefined || layout.name !== PACKAGE_NAME || layout.version !== version || layout.installRoot !== dir) {
      throw new SetupInputError(`the downloaded tree does not contain ${PACKAGE_NAME}@${version}. Nothing was changed`);
    }
    return { dir, entryPath, version };
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
  const result = execOf(ctx)(npmPath(ctx), ['audit', 'signatures', ...REGISTRY_FLAGS], { cwd: download.dir, timeoutMs: 120_000 });
  if (result.status !== 0) throw new SetupInputError(`npm audit signatures rejected the downloaded tree${commandDetail(result, 'npm')}. Nothing was installed`);
  const text = result.stdout + '\n' + result.stderr;
  const signatures = Number(/(\d+) packages? (?:have|has) verified registry signatures?/.exec(text)?.[1] ?? NaN);
  const attestations = Number(/(\d+) packages? (?:have|has) verified attestations?/.exec(text)?.[1] ?? 0);
  if (!Number.isInteger(signatures) || signatures < 1) throw new SetupInputError('npm did not report verified registry signatures (npm 9.5 or newer is required). Nothing was installed');
  if (requireProvenance && attestations < 1) throw new SetupInputError('the registry announces provenance for this version but npm verified no attestation. Nothing was installed');
  return { signatures, attestations };
}

export const removeDownload = (download: Download): void => { rmSync(download.dir, { recursive: true, force: true }); };

const NOTES_MAX_LINES = 60;
const NOTES_MAX_CHARS = 6000;

/** GitHub release body for `v<version>`, bounded and stripped of control characters; undefined when offline or absent. */
export async function releaseNotes(ctx: RegistryContext, version: string): Promise<string | undefined> {
  if (ctx.fetchText === undefined || !isPackageVersion(version)) return undefined;
  try {
    const text = await ctx.fetchText(`${RELEASES_API}v${version}`);
    if (text === undefined) return undefined;
    const body = (JSON.parse(text) as { body?: unknown }).body;
    if (typeof body !== 'string' || body.trim() === '') return undefined;
    // Strips ANSI escapes and C0/C1 controls (except newline) from untrusted text.
    const clean = body.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '').replace(/[\x00-\x09\x0b-\x1f\x7f-\x9f]/g, '').replace(/\r\n/g, '\n');
    const lines = clean.split('\n');
    const bounded = lines.slice(0, NOTES_MAX_LINES).join('\n').slice(0, NOTES_MAX_CHARS);
    return bounded + (lines.length > NOTES_MAX_LINES || clean.length > NOTES_MAX_CHARS ? '\n[...]' : '');
  } catch {
    return undefined;
  }
}

export const releaseUrl = (version: string): string => `${RELEASES_URL}/tag/v${version}`;

/** Production fetcher: HTTPS GET with a timeout, no redirects and a bounded body. Returns undefined on any failure. */
export async function fetchTextBounded(url: string, userAgent: string, maxBytes = 512 * 1024): Promise<string | undefined> {
  if (!url.startsWith('https://')) return undefined;
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
