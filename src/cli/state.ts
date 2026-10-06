import { lstatSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { atomicWrite, ensurePrivateDir, lstatOrUndefined, readTextIfExists } from './fsutil.js';
import { needsSensitiveWriteAck, normalizeProfiles, normalizeUrl, IMAGE_PATTERN, type Runtime, type TokenMode } from './entry.js';
import type { CliContext } from './clients.js';
import { isDigestReference, parseImageReference } from './docker.js';
import { isPackageVersion } from './install.js';
import type { DateFormat } from '../config/schema.js';

/** Installer state: non-secret choices remembered between `setup`, `config`, `remove` and `test`. */
export interface SavedSetup {
  readonly version: 1;
  readonly url: string;
  readonly profiles: string;
  readonly runtime: Runtime;
  readonly tokenMode: TokenMode;
  /** Immutable image the client entries start: a local image ID (or, from older setups, name@sha256:digest). */
  readonly image?: string;
  /** Reference the operator chose in setup (tag, digest or ID), for display and reruns. */
  readonly imageReference?: string;
  /** Registry digest of the image (name@sha256:...), to compare with the GitHub Release notes. */
  readonly imageDigest?: string;
  /** Recorded only after the operator explicitly accepted the sensitive-read + write risk notice. */
  readonly acknowledgeSensitiveWrite?: true;
  /** Signature date format the appliance accepted during `setup` (or chosen with --date-format). */
  readonly dateFormat?: DateFormat;
  /** How new releases reach the clients: `pinned` (default; `update` moves the entries) or `npx-latest` launchers. */
  readonly updateMode?: UpdateMode;
  /** Package version the client entries start (node: the fixed copy or checkout; docker: the image tag), when known. */
  readonly installedVersion?: string;
  /** Node runtime: absolute `dist/src/index.js` the client entries start. `update` rewrites it. */
  readonly entryPath?: string;
  /** Version the entries started before the last `update` (or `update --rollback`); its copy or image is kept. */
  readonly previousVersion?: string;
  /** Node runtime: entry path of `previousVersion`, when its fixed copy still exists. */
  readonly previousEntryPath?: string;
  /** Docker runtime: local image ID the entries started before the last update, kept for `update --rollback` (version in `previousVersion` when known). */
  readonly previousImage?: string;
  /** Docker runtime: registry digest of `previousImage`, when known. */
  readonly previousImageDigest?: string;
}
export type UpdateMode = 'pinned' | 'npx-latest';
export const isUpdateMode = (value: unknown): value is UpdateMode => value === 'pinned' || value === 'npx-latest';
const versionOrUndefined = (value: unknown): string | undefined => (typeof value === 'string' && isPackageVersion(value) ? value : undefined);
const absoluteOrUndefined = (value: unknown): string | undefined => (typeof value === 'string' && path.isAbsolute(value) ? value : undefined);

export function setupDir(ctx: Pick<CliContext, 'home' | 'env'>): string {
  const base = ctx.env.XDG_CONFIG_HOME && path.isAbsolute(ctx.env.XDG_CONFIG_HOME) ? ctx.env.XDG_CONFIG_HOME : path.join(ctx.home, '.config');
  return path.join(base, 'darktrace-mcp');
}
export const tokenPaths = (ctx: Pick<CliContext, 'home' | 'env'>): { publicTokenFile: string; privateTokenFile: string } => ({
  publicTokenFile: path.join(setupDir(ctx), 'public-token'),
  privateTokenFile: path.join(setupDir(ctx), 'private-token'),
});
const setupFile = (ctx: Pick<CliContext, 'home' | 'env'>): string => path.join(setupDir(ctx), 'setup.json');

function validReference(value: string): boolean {
  try { parseImageReference(value); return true; } catch { return false; }
}

export function readSavedSetup(ctx: Pick<CliContext, 'home' | 'env'>): SavedSetup | undefined {
  const file = setupFile(ctx);
  if (lstatOrUndefined(file)?.isFile() !== true) return undefined;
  try {
    const raw = JSON.parse(readTextIfExists(file) ?? '') as Record<string, unknown>;
    if (raw.version !== 1 || typeof raw.url !== 'string' || typeof raw.profiles !== 'string') return undefined;
    const runtime: Runtime = raw.runtime === 'docker' ? 'docker' : 'node';
    const tokenMode: TokenMode = raw.tokenMode === 'inline' ? 'inline' : 'file';
    const image = typeof raw.image === 'string' && IMAGE_PATTERN.test(raw.image) ? raw.image : undefined;
    const imageReference = typeof raw.imageReference === 'string' && validReference(raw.imageReference) ? raw.imageReference : undefined;
    const imageDigest = typeof raw.imageDigest === 'string' && isDigestReference(raw.imageDigest) ? raw.imageDigest : undefined;
    const profiles = normalizeProfiles(raw.profiles);
    const acknowledged = raw.acknowledgeSensitiveWrite === true && needsSensitiveWriteAck(profiles);
    const dateFormat = raw.dateFormat === 'compact' || raw.dateFormat === 'spaced' ? raw.dateFormat : undefined;
    const updateMode = runtime === 'node' && isUpdateMode(raw.updateMode) && raw.updateMode !== 'pinned' ? raw.updateMode : undefined;
    const installedVersion = versionOrUndefined(raw.installedVersion);
    const entryPath = runtime === 'node' ? absoluteOrUndefined(raw.entryPath) : undefined;
    const previousVersion = versionOrUndefined(raw.previousVersion);
    const previousEntryPath = runtime === 'node' && previousVersion ? absoluteOrUndefined(raw.previousEntryPath) : undefined;
    const previousImage = runtime === 'docker' && typeof raw.previousImage === 'string' && IMAGE_PATTERN.test(raw.previousImage) ? raw.previousImage : undefined;
    const previousImageDigest = previousImage && typeof raw.previousImageDigest === 'string' && isDigestReference(raw.previousImageDigest) ? raw.previousImageDigest : undefined;
    return { version: 1, url: normalizeUrl(raw.url), profiles, runtime, tokenMode, ...(image ? { image } : {}),
      ...(image && imageReference ? { imageReference } : {}), ...(image && imageDigest ? { imageDigest } : {}), ...(acknowledged ? { acknowledgeSensitiveWrite: true as const } : {}),
      ...(dateFormat ? { dateFormat } : {}), ...(updateMode ? { updateMode } : {}), ...(installedVersion ? { installedVersion } : {}), ...(entryPath ? { entryPath } : {}),
      ...(previousVersion ? { previousVersion } : {}), ...(previousEntryPath ? { previousEntryPath } : {}), ...(previousImage ? { previousImage } : {}),
      ...(previousImageDigest ? { previousImageDigest } : {}) };
  } catch {
    return undefined;
  }
}

export function writeSavedSetup(ctx: Pick<CliContext, 'home' | 'env'>, state: SavedSetup): string {
  ensurePrivateDir(setupDir(ctx));
  const file = setupFile(ctx);
  atomicWrite(file, JSON.stringify(state, null, 2) + '\n', 0o600);
  return file;
}

/** Store both tokens as owner-only files in an owner-only directory. Values never leave these files. */
export function writeTokenFiles(ctx: Pick<CliContext, 'home' | 'env'>, publicToken: string, privateToken: string): void {
  ensurePrivateDir(setupDir(ctx));
  const { publicTokenFile, privateTokenFile } = tokenPaths(ctx);
  atomicWrite(publicTokenFile, publicToken + '\n', 0o600);
  atomicWrite(privateTokenFile, privateToken + '\n', 0o600);
}

/** True when both token files exist as private regular files the server would accept. */
export function tokenFilesUsable(ctx: Pick<CliContext, 'home' | 'env'>): boolean {
  if (process.platform === 'win32') return false;
  return Object.values(tokenPaths(ctx)).every((file) => {
    const stat = lstatOrUndefined(file);
    return stat !== undefined && stat.isFile() && (stat.mode & 0o177) === 0 && stat.size > 0 &&
      (typeof process.getuid !== 'function' || stat.uid === process.getuid());
  });
}

/** Remove token files and installer state (used by `remove --purge`). */
export function purgeSetup(ctx: Pick<CliContext, 'home' | 'env'>): string[] {
  const removed: string[] = [];
  for (const file of [...Object.values(tokenPaths(ctx)), setupFile(ctx)]) {
    try { if (!lstatSync(file).isDirectory()) { unlinkSync(file); removed.push(file); } } catch { /* absent */ }
  }
  return removed;
}
