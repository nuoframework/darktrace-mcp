import {
  chmodSync, closeSync, constants, copyFileSync, fsyncSync, lstatSync, mkdirSync, openSync,
  readFileSync, renameSync, statSync, unlinkSync, writeSync, type Stats,
} from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';

/** Installer filesystem helpers. Every write is atomic and never follows a symbolic link. */
export class InstallerFileError extends Error {
  constructor(message: string) { super(message); this.name = 'InstallerFileError'; }
}

export function lstatOrUndefined(file: string): Stats | undefined {
  try { return lstatSync(file); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

export function isSymlink(file: string): boolean {
  return lstatOrUndefined(file)?.isSymbolicLink() === true;
}

/** Create (or tighten) a directory that only the current user may access. */
export function ensurePrivateDir(dir: string): void {
  if (!path.isAbsolute(dir)) throw new InstallerFileError('private directory must be absolute');
  const existing = lstatOrUndefined(dir);
  if (existing === undefined) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  } else if (existing.isSymbolicLink() || !existing.isDirectory()) {
    throw new InstallerFileError(`${dir} must be a real directory, not a symbolic link or file`);
  } else if (typeof process.getuid === 'function' && existing.uid !== process.getuid()) {
    throw new InstallerFileError(`${dir} must be owned by the current user`);
  }
  if (process.platform !== 'win32') chmodSync(dir, 0o700);
}

/** Write a file atomically: temp file in the same directory, fsync, then rename over the target. */
export function atomicWrite(file: string, data: string, mode: number): void {
  if (isSymlink(file)) throw new InstallerFileError(`${file} is a symbolic link; refusing to replace it`);
  const dir = path.dirname(file);
  const temp = path.join(dir, `.${path.basename(file)}.tmp-${process.pid}-${randomBytes(6).toString('hex')}`);
  const flags = constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL |
    (Object.hasOwn(constants, 'O_NOFOLLOW') ? constants.O_NOFOLLOW : 0);
  let fd: number | undefined;
  try {
    fd = openSync(temp, flags, mode);
    const bytes = Buffer.from(data, 'utf8');
    let offset = 0;
    while (offset < bytes.length) offset += writeSync(fd, bytes, offset, bytes.length - offset);
    fsyncSync(fd);
    closeSync(fd);
    fd = undefined;
    if (process.platform !== 'win32') chmodSync(temp, mode);
    renameSync(temp, file);
  } catch (error) {
    if (fd !== undefined) { try { closeSync(fd); } catch { /* already failing */ } }
    try { unlinkSync(temp); } catch { /* temp may not exist */ }
    throw error;
  }
}

/** Copy an existing file to `<file>.bak-<timestamp>` with the original permissions. */
export function backupFile(file: string, now: Date = new Date()): string {
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  let target = `${file}.bak-${stamp}`;
  for (let n = 1; lstatOrUndefined(target) !== undefined; n++) target = `${file}.bak-${stamp}-${n}`;
  const mode = lstatSync(file).mode & 0o777;
  copyFileSync(file, target, constants.COPYFILE_EXCL);
  if (process.platform !== 'win32') chmodSync(target, mode);
  return target;
}

export function readTextIfExists(file: string): string | undefined {
  const stat = lstatOrUndefined(file);
  if (stat === undefined) return undefined;
  if (!stat.isFile()) throw new InstallerFileError(`${file} is not a regular file`);
  return readFileSync(file, 'utf8');
}

/** Existing permission bits, or the given default for a new file. */
export function fileModeOr(file: string, fallback: number): number {
  const stat = lstatOrUndefined(file);
  return stat === undefined ? fallback : stat.mode & 0o777;
}

/** Locate an executable on PATH without invoking a shell. */
export function findOnPath(name: string, env: NodeJS.ProcessEnv, platform: NodeJS.Platform = process.platform): string | undefined {
  const dirs = (env.PATH ?? env.Path ?? '').split(platform === 'win32' ? ';' : ':').filter((d) => path.isAbsolute(d));
  const exts = platform === 'win32' ? (env.PATHEXT ?? '.EXE;.CMD;.BAT').split(';').filter(Boolean) : [''];
  for (const dir of dirs) {
    for (const ext of exts) {
      const candidate = path.join(dir, name + ext);
      let stat: Stats | undefined;
      try { stat = statSync(candidate); } catch { continue; }
      if (!stat.isFile()) continue;
      if (platform === 'win32' || (stat.mode & 0o111) !== 0) return candidate;
    }
  }
  return undefined;
}
