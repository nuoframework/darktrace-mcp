import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runSetup, type SetupArgs } from '../../src/cli/setup.js';
import { runCli } from '../../src/cli/main.js';
import { explicitDateFormatSource, probeDateFormat, probeStatus, runOnlineTest } from '../../src/cli/online.js';
import { readSavedSetup } from '../../src/cli/state.js';
import { buildServerEntry, cursorInstallLink, vscodeInstallPayload, type InstallSettings } from '../../src/cli/entry.js';
import { sandbox, collector, stdinFrom, allFiles, readJson, fakeProber, PUBLIC, PRIVATE, type FakeAppliance } from './helpers.js';

const ENTRY = '/opt/darktrace-mcp/dist/src/index.js';
const URL_ = 'https://dt.example.com';
const COMPACT_400: FakeAppliance = { compact: 'bad_request', spaced: 'ok' };
const BOTH_400: FakeAppliance = { compact: 'bad_request', spaced: 'bad_request' };

function io(box: ReturnType<typeof sandbox>, stdin = stdinFrom(`${PUBLIC}\n${PRIVATE}\n`)) {
  const out = collector();
  const err = collector();
  return { out, err, io: { ctx: box.ctx, stdin, stdout: out.stream, stderr: err.stream, execPath: '/opt/node/bin/node', entryPath: ENTRY, uid: 501, gid: 20 } };
}
const args = (extra: Partial<SetupArgs> = {}): SetupArgs =>
  ({ dryRun: false, yes: true, url: URL_, tokensFromStdin: true, inlineTokens: false, clients: ['gemini'], ...extra });
const gemini = (home: string) => readJson(join(home, '.gemini/settings.json')).mcpServers.darktrace;
const noSecrets = (text: string): void => assert.equal(text.includes(PUBLIC) || text.includes(PRIVATE), false, 'token value leaked');

test('setup: compact accepted -> one signed probe, compact recorded in setup.json and the client entry', async () => {
  const box = sandbox('linux');
  const { out, io: setupIo } = io(box);
  assert.equal(await runSetup(args(), setupIo), 0, out.text());
  assert.equal(box.probes.length, 1);
  assert.equal(box.probes[0].DARKTRACE_DATE_FORMAT, 'compact');
  assert.equal(box.probes[0].DARKTRACE_URL, URL_);
  assert.equal(box.probes[0].DARKTRACE_PROFILES, 'read');
  assert.equal(readSavedSetup(box.ctx)?.dateFormat, 'compact');
  assert.equal(gemini(box.home).env.DARKTRACE_DATE_FORMAT, 'compact');
  assert.match(out.text(), /work with date format compact/);
  noSecrets(out.text());

  // Rerun with stored tokens probes through the token files, never through values.
  const rerun = io(box, stdinFrom(''));
  assert.equal(await runSetup(args({ tokensFromStdin: false }), rerun.io), 0, rerun.out.text());
  assert.equal(box.probes.length, 2);
  assert.equal(box.probes[1].DARKTRACE_PUBLIC_TOKEN, undefined);
  assert.equal(box.probes[1].DARKTRACE_PUBLIC_TOKEN_FILE, join(box.home, '.config/darktrace-mcp/public-token'));
});

test('setup: compact 400 -> spaced accepted; spaced lands in every emitted entry shape and in setup.json', async () => {
  const box = sandbox('linux', ['claude', 'codex', 'docker'], COMPACT_400);
  const { out, io: setupIo } = io(box);
  assert.equal(await runSetup(args({ clients: ['gemini', 'claude-code', 'codex'] }), setupIo), 0, out.text());
  assert.deepEqual(box.probes.map((p) => p.DARKTRACE_DATE_FORMAT), ['compact', 'spaced']);
  assert.match(out.text(), /rejected date format compact \(HTTP 400\) and accepted spaced/);
  assert.equal(readSavedSetup(box.ctx)?.dateFormat, 'spaced');
  // node env
  assert.equal(gemini(box.home).env.DARKTRACE_DATE_FORMAT, 'spaced');
  // claude / codex --env arguments
  const adds = box.calls.filter((c) => c.args.includes('add'));
  assert.equal(adds.length, 2);
  for (const call of adds) assert.ok(call.args.includes('DARKTRACE_DATE_FORMAT=spaced'), JSON.stringify(call.args));
  noSecrets(out.text() + JSON.stringify(box.calls));

  // config reuses the saved format: VS Code link payload and Cursor deeplink.
  const vscode = io(box, stdinFrom(''));
  assert.equal(await runCli(['config', 'vscode'], vscode.io), 0, vscode.err.text());
  const link = vscode.out.text().split('\n').find((l) => l.startsWith('vscode:mcp/install?')) as string;
  assert.equal(JSON.parse(decodeURIComponent(link.slice('vscode:mcp/install?'.length))).env.DARKTRACE_DATE_FORMAT, 'spaced');
  const cursor = io(box, stdinFrom(''));
  assert.equal(await runCli(['config', 'cursor'], cursor.io), 0, cursor.err.text());
  const deeplink = new URL(cursor.out.text().split('\n').find((l) => l.startsWith('cursor://')) as string);
  assert.equal(JSON.parse(Buffer.from(deeplink.searchParams.get('config') as string, 'base64').toString('utf8')).env.DARKTRACE_DATE_FORMAT, 'spaced');
  assert.match(cursor.out.text(), /"DARKTRACE_DATE_FORMAT": "spaced"/);
  // An explicit flag overrides the saved format; invalid values are usage errors.
  const override = io(box, stdinFrom(''));
  assert.equal(await runCli(['config', 'gemini', '--date-format', 'compact'], override.io), 0);
  assert.match(override.out.text(), /"DARKTRACE_DATE_FORMAT": "compact"/);
  const bad = io(box, stdinFrom(''));
  assert.equal(await runCli(['config', 'gemini', '--date-format', 'iso'], bad.io), 2);

  // docker -e argument
  const docker = sandbox('linux', ['docker'], COMPACT_400);
  const d = io(docker);
  const image = 'sha256:' + 'b'.repeat(64);
  docker.docker.local.push({ id: image, tags: [], repoDigests: [] });
  assert.equal(await runSetup(args({ runtime: 'docker', image }), d.io), 0, d.out.text());
  const dargs: string[] = gemini(docker.home).args;
  assert.equal(dargs[dargs.indexOf('DARKTRACE_DATE_FORMAT=spaced') - 1], '-e');
  assert.equal(dargs.at(-1), image);
});

test('setup: both formats rejected (400) or tokens refused (401) -> clear error, nothing written', async () => {
  const both = sandbox('linux', [], BOTH_400);
  const b = io(both);
  await assert.rejects(runSetup(args(), b.io), (error: Error) =>
    /both signature date formats \(HTTP 400 for compact and for spaced\)/.test(error.message) && /No settings, tokens or client entries were written/.test(error.message));
  assert.equal(both.probes.length, 2);
  assert.deepEqual(allFiles(both.home), []);
  assert.equal(existsSync(join(both.home, '.config/darktrace-mcp')), false);

  const denied = sandbox('linux', [], { compact: 'auth', spaced: 'ok' });
  const d = io(denied);
  await assert.rejects(runSetup(args(), d.io), /auth: Authentication failed \(HTTP 401\)/);
  assert.equal(denied.probes.length, 1, '401 is not a format problem: no second request');
  assert.deepEqual(allFiles(denied.home), []);

  // Through runCli the error is printed, exit 1, and no token value is echoed.
  const cli = sandbox('linux', [], BOTH_400);
  const c = io(cli);
  assert.equal(await runCli(['setup', '--yes', '--url', URL_, '--client', 'gemini', '--tokens-from-stdin'], c.io), 1);
  assert.match(c.err.text(), /Setup error: the appliance rejected signed GET \/status with both/);
  noSecrets(c.out.text() + c.err.text());
});

test('setup: --date-format skips the probe; --dry-run and --offline skip it and default to compact', async () => {
  const box = sandbox('linux', [], BOTH_400);
  const flagged = io(box);
  assert.equal(await runCli(['setup', '--yes', '--url', URL_, '--client', 'gemini', '--tokens-from-stdin', '--date-format', 'spaced'], flagged.io), 0, flagged.err.text());
  assert.equal(box.probes.length, 0);
  assert.equal(gemini(box.home).env.DARKTRACE_DATE_FORMAT, 'spaced');
  assert.equal(readSavedSetup(box.ctx)?.dateFormat, 'spaced');
  assert.match(flagged.out.text(), /from --date-format; the appliance was not probed/);
  assert.equal(await runCli(['setup', '--yes', '--url', URL_, '--date-format', 'iso'], io(box).io), 2);

  const dry = sandbox('linux', [], BOTH_400);
  const d = io(dry);
  assert.equal(await runSetup(args({ dryRun: true }), d.io), 0, d.out.text());
  assert.equal(dry.probes.length, 0);
  assert.match(d.out.text(), /Date format: compact \(not probed in a dry run/);
  assert.deepEqual(allFiles(dry.home), []);

  const offline = sandbox('linux', [], BOTH_400);
  const o = io(offline);
  assert.equal(await runCli(['setup', '--yes', '--url', URL_, '--client', 'gemini', '--tokens-from-stdin', '--offline'], o.io), 0, o.err.text());
  assert.equal(offline.probes.length, 0);
  assert.match(o.out.text(), /not probed with --offline/);
  assert.equal(gemini(offline.home).env.DARKTRACE_DATE_FORMAT, 'compact');
});

test('test / doctor --online: retries once with the other format only when the format was not chosen', async () => {
  // Not explicit, compact OK: one request.
  const ok = sandbox('linux');
  const okOut = collector();
  assert.equal(await runOnlineTest({ ...ok.ctx, env: { DARKTRACE_URL: URL_ } }, okOut.stream), 0);
  assert.equal(ok.probes.length, 1);
  assert.match(okOut.text(), /^OK https:\/\/dt\.example\.com answered signed GET \/status/);

  // Not explicit, compact 400 -> spaced OK: exit 0 and a recommendation.
  const lab = sandbox('linux', [], COMPACT_400);
  const labIo = io(lab, stdinFrom(''));
  const ctx = { ...lab.ctx, env: { DARKTRACE_URL: URL_ } };
  assert.equal(await runCli(['doctor', '--online'], { ...labIo.io, ctx }), 0, labIo.out.text());
  assert.deepEqual(lab.probes.map((p) => p.DARKTRACE_DATE_FORMAT), [undefined, 'spaced']);
  assert.match(labIo.out.text(), /OK .* using date format spaced; set DARKTRACE_DATE_FORMAT=spaced in your client configuration/);

  // Explicit in the environment: no retry, hint to try the other format.
  const explicit = sandbox('linux', [], COMPACT_400);
  const e = collector();
  assert.equal(await runOnlineTest({ ...explicit.ctx, env: { DARKTRACE_URL: URL_, DARKTRACE_DATE_FORMAT: 'compact' } }, e.stream), 1);
  assert.equal(explicit.probes.length, 1);
  assert.match(e.text(), /FAIL bad_request/);
  assert.match(e.text(), /set by DARKTRACE_DATE_FORMAT\)\. Try DARKTRACE_DATE_FORMAT=spaced/);

  // Saved by setup: explicit too; the hint points at setup --date-format.
  const saved = sandbox('linux', [], { compact: 'ok', spaced: 'bad_request' });
  mkdirSync(join(saved.home, '.config/darktrace-mcp'), { recursive: true });
  writeFileSync(join(saved.home, '.config/darktrace-mcp/setup.json'),
    JSON.stringify({ version: 1, url: URL_, profiles: 'read', runtime: 'node', tokenMode: 'file', dateFormat: 'spaced' }));
  const s = collector();
  assert.equal(await runOnlineTest(saved.ctx, s.stream), 1);
  assert.equal(saved.probes.length, 1);
  assert.equal(saved.probes[0].DARKTRACE_DATE_FORMAT, 'spaced');
  assert.match(s.text(), /rerun `darktrace-mcp setup --date-format compact`/);

  // Not explicit, both rejected: two requests, exit 1.
  const both = sandbox('linux', [], BOTH_400);
  const b = collector();
  assert.equal(await runOnlineTest({ ...both.ctx, env: { DARKTRACE_URL: URL_ } }, b.stream), 1);
  assert.equal(both.probes.length, 2);
  assert.match(b.text(), /Both signature date formats \(compact and spaced\) were rejected/);

  // Other failures never trigger a retry.
  const auth = sandbox('linux', [], { compact: 'auth', spaced: 'ok' });
  const a = collector();
  assert.equal(await runOnlineTest({ ...auth.ctx, env: { DARKTRACE_URL: URL_ } }, a.stream), 1);
  assert.equal(auth.probes.length, 1);
  assert.match(a.text(), /FAIL auth/);
});

test('probe helpers: at most two requests, explicit-source detection, real prober fails closed on bad config', async () => {
  const probes: NodeJS.ProcessEnv[] = [];
  const result = await probeDateFormat({ DARKTRACE_URL: URL_ }, fakeProber({ compact: 'bad_request', spaced: 'bad_request' }, probes), 'compact');
  assert.equal(result.chosen, undefined);
  assert.equal(probes.length, 2);

  const box = sandbox('linux');
  const dir = join(box.home, 'cfg');
  mkdirSync(dir);
  writeFileSync(join(dir, 'with.json'), JSON.stringify({ auth: { dateFormat: 'spaced' } }));
  writeFileSync(join(dir, 'without.json'), JSON.stringify({ instance: { baseUrl: URL_ } }));
  assert.equal(explicitDateFormatSource({ env: {} }, { DARKTRACE_CONFIG_FILE: join(dir, 'with.json') }), 'auth.dateFormat in the config file');
  assert.equal(explicitDateFormatSource({ env: {} }, { DARKTRACE_CONFIG_FILE: join(dir, 'without.json') }), undefined);
  assert.equal(explicitDateFormatSource({ env: {} }, { DARKTRACE_CONFIG_FILE: join(dir, 'missing.json') }), 'the config file');
  assert.equal(explicitDateFormatSource({ env: {} }, {}), undefined);

  // The production prober reports configuration problems without any network request.
  const real = await probeStatus({ DARKTRACE_URL: URL_, DARKTRACE_DATE_FORMAT: 'iso', DARKTRACE_PUBLIC_TOKEN: PUBLIC, DARKTRACE_PRIVATE_TOKEN: PRIVATE });
  assert.equal(real.ok, false);
  assert.equal(!real.ok && real.kind, 'config');
  noSecrets(JSON.stringify(real));

  // Entries without a known format omit the variable (server default applies).
  const settings: InstallSettings = { url: URL_, profiles: 'read', runtime: 'node', tokenMode: 'file', publicTokenFile: '/p', privateTokenFile: '/q', nodePath: '/n', entryPath: ENTRY };
  assert.equal('DARKTRACE_DATE_FORMAT' in buildServerEntry(settings).env, false);
  const spaced = buildServerEntry({ ...settings, dateFormat: 'spaced' });
  assert.equal(vscodeInstallPayload(spaced).env && (vscodeInstallPayload(spaced).env as Record<string, string>).DARKTRACE_DATE_FORMAT, 'spaced');
  assert.ok(cursorInstallLink(spaced).length > 0);
});
