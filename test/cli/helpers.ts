import { chmodSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable, Writable } from 'node:stream';
import type { CliContext, RunResult } from '../../src/cli/clients.js';

export const PUBLIC = 'PUBLIC_CANARY_7f3a';
export const PRIVATE = 'PRIVATE_CANARY_9c1e';

export interface Sandbox { home: string; bin: string; ctx: CliContext; calls: Array<{ command: string; args: readonly string[] }> }

/** A throwaway HOME with an empty PATH directory. Never touches the real user's home. */
export function sandbox(platform: NodeJS.Platform = 'darwin', fakeClis: readonly string[] = []): Sandbox {
  const home = mkdtempSync(join(tmpdir(), 'darktrace-cli-test-'));
  const bin = join(home, 'bin');
  mkdirSync(bin);
  for (const name of fakeClis) {
    const file = join(bin, name);
    writeFileSync(file, '#!/bin/sh\nexit 0\n');
    chmodSync(file, 0o755);
  }
  const calls: Array<{ command: string; args: readonly string[] }> = [];
  const ctx: CliContext = {
    home, platform, env: { PATH: bin }, now: () => new Date('2026-01-02T03:04:05.000Z'),
    run: (command, args): RunResult => { calls.push({ command, args: [...args] }); return { status: 0, stdout: '', stderr: '' }; },
  };
  return { home, bin, ctx, calls };
}

export function collector(): { stream: Writable; text: () => string } {
  let out = '';
  return { stream: new Writable({ write(chunk, _enc, cb) { out += String(chunk); cb(); } }), text: () => out };
}

export function stdinFrom(text: string, isTTY = false): Readable & { isTTY?: boolean } {
  const stream = Readable.from([Buffer.from(text)]) as Readable & { isTTY?: boolean };
  stream.isTTY = isTTY;
  return stream;
}

/** Every regular file under dir (recursively). */
export function allFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...allFiles(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

export const mode = (file: string): number => statSync(file).mode & 0o777;
export const readJson = (file: string): any => JSON.parse(readFileSync(file, 'utf8'));
