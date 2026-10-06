import { lstatSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { atomicWrite, ensurePrivateDir, lstatOrUndefined, readTextIfExists } from './fsutil.js';
import { normalizeProfiles, normalizeUrl, IMAGE_PATTERN, type Runtime, type TokenMode } from './entry.js';
import type { CliContext } from './clients.js';

/** Installer state: non-secret choices remembered between `setup`, `config`, `remove` and `test`. */
export interface SavedSetup {
  readonly version: 1;
  readonly url: string;
  readonly profiles: string;
  readonly runtime: Runtime;
  readonly tokenMode: TokenMode;
  readonly image?: string;
}

export function setupDir(ctx: Pick<CliContext, 'home' | 'env'>): string {
  const base = ctx.env.XDG_CONFIG_HOME && path.isAbsolute(ctx.env.XDG_CONFIG_HOME) ? ctx.env.XDG_CONFIG_HOME : path.join(ctx.home, '.config');
  return path.join(base, 'darktrace-mcp');
}
export const tokenPaths = (ctx: Pick<CliContext, 'home' | 'env'>): { publicTokenFile: string; privateTokenFile: string } => ({
  publicTokenFile: path.join(setupDir(ctx), 'public-token'),
  privateTokenFile: path.join(setupDir(ctx), 'private-token'),
});
const setupFile = (ctx: Pick<CliContext, 'home' | 'env'>): string => path.join(setupDir(ctx), 'setup.json');

export function readSavedSetup(ctx: Pick<CliContext, 'home' | 'env'>): SavedSetup | undefined {
  const file = setupFile(ctx);
  if (lstatOrUndefined(file)?.isFile() !== true) return undefined;
  try {
    const raw = JSON.parse(readTextIfExists(file) ?? '') as Record<string, unknown>;
    if (raw.version !== 1 || typeof raw.url !== 'string' || typeof raw.profiles !== 'string') return undefined;
    const runtime: Runtime = raw.runtime === 'docker' ? 'docker' : 'node';
    const tokenMode: TokenMode = raw.tokenMode === 'inline' ? 'inline' : 'file';
    const image = typeof raw.image === 'string' && IMAGE_PATTERN.test(raw.image) ? raw.image : undefined;
    return { version: 1, url: normalizeUrl(raw.url), profiles: normalizeProfiles(raw.profiles), runtime, tokenMode, ...(image ? { image } : {}) };
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
