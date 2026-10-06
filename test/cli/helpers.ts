import { chmodSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable, Writable } from 'node:stream';
import type { CliContext, RunResult } from '../../src/cli/clients.js';
import type { ProbeOutcome, StatusProber } from '../../src/cli/online.js';
import type { ApiErrorKind } from '../../src/client/errors.js';

export const PUBLIC = 'PUBLIC_CANARY_7f3a';
export const PRIVATE = 'PRIVATE_CANARY_9c1e';

export interface Sandbox { home: string; bin: string; ctx: CliContext; calls: Array<{ command: string; args: readonly string[] }>; probes: NodeJS.ProcessEnv[] }

/** Appliance behaviour per signature date format: 'ok' answers 200, an error kind fails like the hardened client. */
export type FakeAppliance = Readonly<Record<'compact' | 'spaced', 'ok' | ApiErrorKind>>;
const STATUS: Partial<Record<ApiErrorKind, number>> = { bad_request: 400, auth: 401, forbidden: 403 };

/** Fake HTTP layer: records each probe's environment and answers by the date format it would sign with. */
export function fakeProber(appliance: FakeAppliance, probes: NodeJS.ProcessEnv[] = []): StatusProber {
  return async (env): Promise<ProbeOutcome> => {
    probes.push({ ...env });
    const raw = env.DARKTRACE_DATE_FORMAT ?? 'compact';
    if (raw !== 'compact' && raw !== 'spaced') return { ok: false, kind: 'config', message: 'auth.dateFormat must be compact or spaced' };
    const answer = appliance[raw];
    const baseUrl = env.DARKTRACE_URL ?? 'https://unset.example';
    if (answer === 'ok') return { ok: true, baseUrl, dateFormat: raw, status: 200, elapsedMs: 12, version: '7.1.0' };
    return { ok: false, kind: answer, dateFormat: raw, ...(STATUS[answer] ? { status: STATUS[answer] } : {}) };
  };
}

/** A throwaway HOME with an empty PATH directory. Never touches the real user's home. */
export function sandbox(platform: NodeJS.Platform = 'darwin', fakeClis: readonly string[] = [], appliance: FakeAppliance = { compact: 'ok', spaced: 'ok' }): Sandbox {
  const home = mkdtempSync(join(tmpdir(), 'darktrace-cli-test-'));
  const bin = join(home, 'bin');
  mkdirSync(bin);
  for (const name of fakeClis) {
    const file = join(bin, name);
    writeFileSync(file, '#!/bin/sh\nexit 0\n');
    chmodSync(file, 0o755);
  }
  const calls: Array<{ command: string; args: readonly string[] }> = [];
  const probes: NodeJS.ProcessEnv[] = [];
  const ctx: CliContext = {
    home, platform, env: { PATH: bin }, now: () => new Date('2026-01-02T03:04:05.000Z'),
    run: (command, args): RunResult => { calls.push({ command, args: [...args] }); return { status: 0, stdout: '', stderr: '' }; },
    // Default appliance accepts both formats, so setup records compact without any network access.
    probeStatus: fakeProber(appliance, probes),
  };
  return { home, bin, ctx, calls, probes };
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
