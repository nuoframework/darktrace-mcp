import { cpSync, lstatSync, mkdirSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { InstallerFileError, lstatOrUndefined } from './fsutil.js';
import type { CliContext } from './clients.js';

/**
 * Fixed-copy installation for `npx` bootstraps.
 *
 * `npx -y @nuoframework/darktrace-mcp@<version> setup` runs this CLI from npm's transient cache
 * (`~/.npm/_npx/<hash>/node_modules/...`). That path can disappear at any time and depends on the
 * registry being reachable, so it must never be written into a client configuration. When the CLI
 * detects that it runs from such a location, `setup` copies the already-downloaded, integrity-checked
 * package tree (the package plus its three locked runtime dependencies) to a stable per-version
 * directory and registers that absolute path instead. No network access, no lifecycle scripts.
 */
export const PACKAGE_NAME = '@nuoframework/darktrace-mcp';

export interface PackageLayout {
  readonly name: string;
  readonly version: string;
  /** Directory holding the package's own package.json. */
  readonly packageRoot: string;
  /** Directory whose `node_modules/` contains the package and its dependencies (npm install root), if any. */
  readonly installRoot?: string;
}

/** Describe the package that owns `entryPath` (`.../dist/src/index.js`). Undefined when the layout is not ours. */
export function describeEntry(entryPath: string): PackageLayout | undefined {
  const packageRoot = path.resolve(path.dirname(entryPath), '..', '..');
  let pkg: { name?: unknown; version?: unknown };
  try { pkg = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8')) as typeof pkg; } catch { return undefined; }
  if (typeof pkg.name !== 'string' || typeof pkg.version !== 'string' || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(pkg.version)) return undefined;
  const scopeDir = path.dirname(packageRoot);
  const modulesDir = path.dirname(scopeDir);
  const installed = path.basename(packageRoot) === 'darktrace-mcp' && path.basename(scopeDir) === '@nuoframework' && path.basename(modulesDir) === 'node_modules';
  return { name: pkg.name, version: pkg.version, packageRoot, ...(installed ? { installRoot: path.dirname(modulesDir) } : {}) };
}

/** True when `entryPath` lives in npm's transient exec cache (`_npx`) or under the npm cache directory. */
export function isTransientInstall(entryPath: string, ctx: Pick<CliContext, 'home' | 'env' | 'platform'>): boolean {
  const resolved = path.resolve(entryPath);
  const segments = resolved.split(/[\\/]+/);
  if (segments.includes('_npx')) return true;
  const roots: string[] = [];
  const configured = ctx.env.npm_config_cache ?? ctx.env.NPM_CONFIG_CACHE;
  if (configured && path.isAbsolute(configured)) roots.push(configured);
  roots.push(path.join(ctx.home, '.npm'));
  if (ctx.platform === 'win32') {
    const local = ctx.env.LOCALAPPDATA;
    if (local) roots.push(path.join(local, 'npm-cache'));
  }
  const lower = (value: string): string => (ctx.platform === 'win32' ? value.toLowerCase() : value);
  return roots.some((root) => lower(resolved).startsWith(lower(path.resolve(root)) + path.sep));
}

/** Where fixed copies live: `$XDG_DATA_HOME/darktrace-mcp/<version>` (POSIX) or `%LOCALAPPDATA%\darktrace-mcp\<version>` (Windows). */
export function fixedCopyDir(ctx: Pick<CliContext, 'home' | 'env' | 'platform'>, version: string): string {
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) throw new InstallerFileError('invalid package version');
  const base = ctx.platform === 'win32'
    ? (ctx.env.LOCALAPPDATA && path.isAbsolute(ctx.env.LOCALAPPDATA) ? ctx.env.LOCALAPPDATA : path.join(ctx.home, 'AppData', 'Local'))
    : (ctx.env.XDG_DATA_HOME && path.isAbsolute(ctx.env.XDG_DATA_HOME) ? ctx.env.XDG_DATA_HOME : path.join(ctx.home, '.local', 'share'));
  return path.join(base, 'darktrace-mcp', version);
}

/** Entry point inside a fixed copy. */
export const fixedCopyEntry = (dir: string): string => path.join(dir, 'node_modules', '@nuoframework', 'darktrace-mcp', 'dist', 'src', 'index.js');

function usableFixedCopy(dir: string, version: string): boolean {
  const stat = lstatOrUndefined(dir);
  if (stat === undefined || stat.isSymbolicLink() || !stat.isDirectory()) return false;
  const entry = fixedCopyEntry(dir);
  if (lstatOrUndefined(entry)?.isFile() !== true) return false;
  const described = describeEntry(entry);
  return described !== undefined && described.name === PACKAGE_NAME && described.version === version;
}

export interface FixedCopyResult {
  readonly entryPath: string;
  readonly dir: string;
  readonly status: 'copied' | 'reused' | 'planned';
}

/**
 * Copy the running package tree to its fixed per-version directory and return the new entry path.
 * Idempotent: an existing valid copy is reused. Symbolic links and `.bin` shims are never copied.
 * With `dryRun`, nothing is written and the planned path is returned.
 */
export function installFixedCopy(entryPath: string, ctx: Pick<CliContext, 'home' | 'env' | 'platform'>, dryRun = false): FixedCopyResult {
  const layout = describeEntry(entryPath);
  if (layout === undefined || layout.name !== PACKAGE_NAME || layout.installRoot === undefined) {
    throw new InstallerFileError('cannot locate the installed package tree next to ' + entryPath);
  }
  const dir = fixedCopyDir(ctx, layout.version);
  const target = fixedCopyEntry(dir);
  if (usableFixedCopy(dir, layout.version)) return { entryPath: target, dir, status: 'reused' };
  if (dryRun) return { entryPath: target, dir, status: 'planned' };
  const parent = path.dirname(dir);
  const parentStat = lstatOrUndefined(parent);
  if (parentStat?.isSymbolicLink()) throw new InstallerFileError(`${parent} is a symbolic link; refusing to install there`);
  mkdirSync(parent, { recursive: true, mode: 0o755 });
  const temp = `${dir}.tmp-${process.pid}-${randomBytes(4).toString('hex')}`;
  try {
    cpSync(path.join(layout.installRoot, 'node_modules'), path.join(temp, 'node_modules'), {
      recursive: true,
      filter: (source) => path.basename(source) !== '.bin' && !lstatSync(source).isSymbolicLink(),
    });
    const existing = lstatOrUndefined(dir);
    if (existing !== undefined) {
      if (existing.isSymbolicLink()) throw new InstallerFileError(`${dir} is a symbolic link; refusing to replace it`);
      rmSync(dir, { recursive: true, force: true });
    }
    renameSync(temp, dir);
  } catch (error) {
    rmSync(temp, { recursive: true, force: true });
    throw error;
  }
  if (!usableFixedCopy(dir, layout.version)) throw new InstallerFileError(`fixed copy at ${dir} is incomplete`);
  return { entryPath: target, dir, status: 'copied' };
}

/** For read-only commands: the fixed copy for this version when one exists, otherwise undefined. */
export function existingFixedCopyEntry(entryPath: string, ctx: Pick<CliContext, 'home' | 'env' | 'platform'>): string | undefined {
  const layout = describeEntry(entryPath);
  if (layout === undefined || layout.name !== PACKAGE_NAME) return undefined;
  const dir = fixedCopyDir(ctx, layout.version);
  return usableFixedCopy(dir, layout.version) ? fixedCopyEntry(dir) : undefined;
}
