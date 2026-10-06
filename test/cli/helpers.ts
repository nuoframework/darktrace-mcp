import { chmodSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable, Writable } from 'node:stream';
import type { CliContext, RunResult } from '../../src/cli/clients.js';
import type { ProbeOutcome, StatusProber } from '../../src/cli/online.js';
import type { ApiErrorKind } from '../../src/client/errors.js';

export const PUBLIC = 'PUBLIC_CANARY_7f3a';
export const PRIVATE = 'PRIVATE_CANARY_9c1e';

export interface Sandbox {
  home: string; bin: string; ctx: CliContext; calls: Array<{ command: string; args: readonly string[] }>; probes: NodeJS.ProcessEnv[];
  docker: FakeDocker;
}

/** One image known to the fake docker: its ID plus the tags and repository digests that resolve to it. */
export interface FakeImage { readonly id: string; readonly tags: readonly string[]; readonly repoDigests: readonly string[] }
/** Fake docker daemon and registry. `local` is what `docker image inspect` sees; `registry` is what `docker pull` can fetch. */
export interface FakeDocker {
  daemon: 'up' | 'down' | 'windows';
  local: FakeImage[];
  registry: FakeImage[];
  /** Result of `docker run ... --check-config`. */
  checkConfig: { status: number; stdout: string; stderr: string };
  calls: Array<{ args: readonly string[]; stream: boolean }>;
}

export const FAKE_VERSION = '9.8.7';
export const DEFAULT_REF = `ghcr.io/nuoframework/darktrace-mcp:${FAKE_VERSION}`;
export const FAKE_ID = 'sha256:' + '1'.repeat(64);
export const FAKE_DIGEST = 'ghcr.io/nuoframework/darktrace-mcp@sha256:' + '2'.repeat(64);

export function fakeDocker(): FakeDocker {
  return {
    daemon: 'up', local: [],
    registry: [{ id: FAKE_ID, tags: [DEFAULT_REF], repoDigests: [FAKE_DIGEST] }],
    checkConfig: { status: 0, stdout: '{"ok":true,"transport":"stdio"}\n', stderr: '' },
    calls: [],
  };
}

const matches = (image: FakeImage, ref: string): boolean => image.id === ref || image.tags.includes(ref) || image.repoDigests.includes(ref);

/** Docker CLI stand-in: version, image inspect, pull and run, with the exact argument shapes the installer uses. */
export function fakeDockerRunner(state: FakeDocker): NonNullable<CliContext['runDocker']> {
  return (_command, args, options) => {
    state.calls.push({ args: [...args], stream: options?.stream === true });
    if (args[0] === 'version') {
      if (state.daemon === 'down') return { status: 1, stdout: '', stderr: 'Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?\n' };
      return { status: 0, stdout: state.daemon === 'windows' ? 'windows/amd64\n' : 'linux/arm64\n', stderr: '' };
    }
    if (args[0] === 'image' && args[1] === 'inspect') {
      const image = state.local.find((i) => matches(i, String(args.at(-1))));
      if (image === undefined) return { status: 1, stdout: '', stderr: `Error: No such image: ${String(args.at(-1))}\n` };
      return { status: 0, stdout: `${image.id} ${JSON.stringify(image.repoDigests)}\n`, stderr: '' };
    }
    if (args[0] === 'pull') {
      const image = state.registry.find((i) => matches(i, String(args[1])));
      if (image === undefined) return { status: 1, stdout: '', stderr: 'Error response from daemon: manifest unknown\n' };
      if (!state.local.includes(image)) state.local.push(image);
      return { status: 0, stdout: '', stderr: '' };
    }
    if (args[0] === 'run') return { ...state.checkConfig };
    if (args[0] === 'image' && args[1] === 'rm') {
      const index = state.local.findIndex((i) => i.id === args[2]);
      if (index === -1) return { status: 1, stdout: '', stderr: `Error: No such image: ${String(args[2])}\n` };
      state.local.splice(index, 1);
      return { status: 0, stdout: `Deleted: ${String(args[2])}\n`, stderr: '' };
    }
    return { status: 125, stdout: '', stderr: 'unexpected docker call\n' };
  };
}

/** A package root with a package.json at FAKE_VERSION; returns its dist/src/index.js entry path. Outside any sandbox home. */
export function fakePackageEntry(): string {
  const root = mkdtempSync(join(tmpdir(), 'darktrace-cli-pkg-'));
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: '@nuoframework/darktrace-mcp', version: FAKE_VERSION }));
  return join(root, 'dist', 'src', 'index.js');
}

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
  const docker = fakeDocker();
  const ctx: CliContext = {
    home, platform, env: { PATH: bin }, now: () => new Date('2026-01-02T03:04:05.000Z'),
    run: (command, args): RunResult => { calls.push({ command, args: [...args] }); return { status: 0, stdout: '', stderr: '' }; },
    // Default appliance accepts both formats, so setup records compact without any network access.
    probeStatus: fakeProber(appliance, probes),
    runDocker: fakeDockerRunner(docker),
  };
  return { home, bin, ctx, calls, probes, docker };
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
