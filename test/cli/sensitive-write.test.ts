import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runSetup } from '../../src/cli/setup.js';
import { createLinePrompter } from '../../src/cli/prompt.js';
import { runCli } from '../../src/cli/main.js';
import { onlineTestEnv } from '../../src/cli/online.js';
import { readSavedSetup } from '../../src/cli/state.js';
import { CLIENT_IDS } from '../../src/cli/clients.js';
import { PROFILE_PRESETS, SENSITIVE_WRITE_NOTICE, SetupInputError, buildServerEntry, needsSensitiveWriteAck, type InstallSettings } from '../../src/cli/entry.js';
import { sandbox, collector, stdinFrom, readJson, PUBLIC, PRIVATE } from './helpers.js';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const ENTRY = '/opt/darktrace-mcp/dist/src/index.js';
const ACK = 'DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE';
const ALL = String(PROFILE_PRESETS.findIndex((p) => p.id === 'all') + 1);
const GEMINI = String(CLIENT_IDS.indexOf('gemini') + 1);

function io(box: ReturnType<typeof sandbox>, stdin = stdinFrom(''), prompter?: ReturnType<typeof createLinePrompter>) {
  const out = collector();
  const err = collector();
  return { out, err, io: { ctx: box.ctx, stdin, stdout: out.stream, stderr: err.stream, execPath: '/opt/node/bin/node', entryPath: ENTRY, uid: 501, gid: 20, ...(prompter ? { prompter } : {}) } };
}
const base = { dryRun: false, tokensFromStdin: false, inlineTokens: false } as const;

test('needsSensitiveWriteAck mirrors the server startup rule', () => {
  for (const p of ['all', 'read,sensitive,write', 'sensitive,write', 'read,sensitive,write,critical']) assert.equal(needsSensitiveWriteAck(p), true, p);
  for (const p of ['read', 'read,write', 'read,sensitive', 'read,write,critical']) assert.equal(needsSensitiveWriteAck(p), false, p);
  for (const phrase of ['Sensitive data', 'Untrusted content', 'Write channels', 'exfiltration risk', `${ACK}=true`]) assert.ok(SENSITIVE_WRITE_NOTICE.includes(phrase), phrase);
  const settings: InstallSettings = { url: 'https://dt.example.com', profiles: 'all', runtime: 'node', tokenMode: 'file', publicTokenFile: '/p', privateTokenFile: '/q', nodePath: '/n', entryPath: ENTRY };
  assert.throws(() => buildServerEntry(settings), SetupInputError);
  assert.equal(buildServerEntry({ ...settings, acknowledgeSensitiveWrite: true }).env[ACK], 'true');
  assert.equal(ACK in buildServerEntry({ ...settings, profiles: 'read,write', acknowledgeSensitiveWrite: true }).env, false, 'never emitted when not needed');
});

test('--yes with all and no --acknowledge-sensitive-write is refused before anything is written', async () => {
  const box = sandbox('linux');
  const { out, io: setupIo } = io(box, stdinFrom(`${PUBLIC}\n${PRIVATE}\n`));
  await assert.rejects(runSetup({ ...base, yes: true, url: 'https://dt.example.com', profiles: 'all', clients: ['gemini'], tokensFromStdin: true }, setupIo),
    /acknowledge-sensitive-write/);
  assert.match(out.text(), /exfiltration risk/);
  assert.equal(existsSync(join(box.home, '.config/darktrace-mcp/setup.json')), false);
  assert.equal(existsSync(join(box.home, '.gemini/settings.json')), false);
  // Same through runCli: exit 1 with a setup error, also for a custom list with sensitive and write.
  const viaCli = io(box, stdinFrom(`${PUBLIC}\n${PRIVATE}\n`));
  assert.equal(await runCli(['setup', '--yes', '--url', 'https://dt.example.com', '--profiles', 'read,sensitive,write', '--client', 'gemini', '--tokens-from-stdin'], viaCli.io), 1);
  assert.match(viaCli.err.text(), /acknowledge-sensitive-write/);
});

test('--yes --acknowledge-sensitive-write emits the acknowledgement everywhere and the generated entry starts', async () => {
  const box = sandbox('darwin', ['claude']);
  const { out, err, io: cliIo } = io(box, stdinFrom(`${PUBLIC}\n${PRIVATE}\n`));
  assert.equal(await runCli(['setup', '--yes', '--url', 'https://dt.example.com', '--profiles', 'all', '--acknowledge-sensitive-write',
    '--client', 'gemini', '--client', 'claude-code', '--tokens-from-stdin'], cliIo), 0, out.text() + err.text());
  assert.match(out.text(), /RISK NOTICE/);
  const env = readJson(join(box.home, '.gemini/settings.json')).mcpServers.darktrace.env;
  assert.equal(env.DARKTRACE_PROFILES, 'all');
  assert.equal(env[ACK], 'true');
  assert.match(JSON.stringify(box.calls), new RegExp(`"--env","${ACK}=true"`));
  assert.equal(readSavedSetup(box.ctx)?.acknowledgeSensitiveWrite, true);
  // The emitted environment passes the compiled server's own startup gate (offline --check-config).
  const check = (extra: Record<string, string | undefined>) => spawnSync(process.execPath, [join(root, 'dist/src/index.js'), '--check-config'],
    { encoding: 'utf8', timeout: 10_000, env: Object.fromEntries(Object.entries({ PATH: process.env.PATH, HOME: box.home, ...env, ...extra }).filter(([, v]) => v !== undefined)) as NodeJS.ProcessEnv });
  const started = check({});
  assert.equal(started.status, 0, started.stderr);
  assert.deepEqual(JSON.parse(started.stdout).profiles, { read: true, sensitive: true, write: true, critical: true });
  const refused = check({ [ACK]: undefined });
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE/);
  // `test` and `config` reuse the saved acknowledgement.
  assert.equal(onlineTestEnv(box.ctx)[ACK], 'true');
  const printed = io(box);
  assert.equal(await runCli(['config', 'vscode'], printed.io), 0, printed.err.text());
  assert.match(printed.out.text(), /# RISK NOTICE/);
  assert.match(printed.out.text(), new RegExp(`"${ACK}": "true"`));
  assert.ok(decodeURIComponent(printed.out.text()).includes(`"${ACK}":"true"`), 'one-click payload carries it too');
});

test('docker runtime passes the acknowledgement as a container environment variable', async () => {
  const box = sandbox('linux', ['docker']);
  const image = 'sha256:' + 'c'.repeat(64);
  const { out, io: setupIo } = io(box, stdinFrom(`${PUBLIC}\n${PRIVATE}\n`));
  assert.equal(await runSetup({ ...base, yes: true, url: 'https://dt.example.com', runtime: 'docker', image, profiles: 'all', acknowledgeSensitiveWrite: true,
    clients: ['cursor'], tokensFromStdin: true }, setupIo), 0, out.text());
  const args: string[] = readJson(join(box.home, '.cursor/mcp.json')).mcpServers.darktrace.args;
  const env = args.flatMap((value, i) => value === '-e' ? [args[i + 1]] : []);
  assert.ok(env.includes('DARKTRACE_PROFILES=all'));
  assert.ok(env.includes(`${ACK}=true`));
  assert.equal(args.at(-1), image, 'image stays last');
});

test('interactive wizard: all shows the notice and a yes emits the acknowledgement', async () => {
  const box = sandbox('linux');
  const answers = ['https://dt.example.com', '1', PUBLIC, PRIVATE, ALL, 'yes', GEMINI];
  const { out, io: setupIo } = io(box, stdinFrom(''), createLinePrompter(answers));
  assert.equal(await runSetup({ ...base, yes: false }, setupIo), 0, out.text());
  assert.ok(out.text().includes(SENSITIVE_WRITE_NOTICE));
  const env = readJson(join(box.home, '.gemini/settings.json')).mcpServers.darktrace.env;
  assert.equal(env.DARKTRACE_PROFILES, 'all');
  assert.equal(env[ACK], 'true');
});

for (const [choice, expected] of [['1', 'read,write'], ['2', 'read,sensitive'], ['', 'read,write']] as const) {
  test(`interactive wizard: declining falls back to ${expected} without the acknowledgement (answer "${choice}")`, async () => {
    const box = sandbox('linux');
    const answers = ['https://dt.example.com', '1', PUBLIC, PRIVATE, ALL, 'n', choice, GEMINI];
    const { out, io: setupIo } = io(box, stdinFrom(''), createLinePrompter(answers));
    assert.equal(await runSetup({ ...base, yes: false }, setupIo), 0, out.text());
    const env = readJson(join(box.home, '.gemini/settings.json')).mcpServers.darktrace.env;
    assert.equal(env.DARKTRACE_PROFILES, expected);
    assert.equal(ACK in env, false);
    assert.equal(readSavedSetup(box.ctx)?.acknowledgeSensitiveWrite, undefined);
  });
}

test('interactive wizard: an empty answer to the risk question is a no', async () => {
  const box = sandbox('linux');
  const answers = ['https://dt.example.com', '1', PUBLIC, PRIVATE, 'read,sensitive,write', '', '2', GEMINI];
  const { out, io: setupIo } = io(box, stdinFrom(''), createLinePrompter(answers));
  assert.equal(await runSetup({ ...base, yes: false }, setupIo), 0, out.text());
  assert.equal(readJson(join(box.home, '.gemini/settings.json')).mcpServers.darktrace.env.DARKTRACE_PROFILES, 'read,sensitive');
});

test('config <client> refuses sensitive + write without an acknowledgement and emits it with the flag', async () => {
  const box = sandbox('linux');
  const refused = io(box);
  assert.equal(await runCli(['config', 'cursor', '--profiles', 'all'], refused.io), 2);
  assert.match(refused.err.text(), /exfiltration risk/);
  assert.match(refused.err.text(), /--acknowledge-sensitive-write/);
  assert.equal(refused.out.text(), '');
  const ok = io(box);
  assert.equal(await runCli(['config', 'cursor', '--profiles', 'all', '--acknowledge-sensitive-write'], ok.io), 0, ok.err.text());
  assert.match(ok.out.text(), new RegExp(`"${ACK}": "true"`));
  const docker = io(box, stdinFrom(''));
  assert.equal(await runCli(['config', 'claude-desktop', '--runtime', 'docker', '--profiles', 'sensitive,write', '--acknowledge-sensitive-write'], docker.io), 0, docker.err.text());
  assert.match(docker.out.text(), new RegExp(`"${ACK}=true"`));
  const plain = io(box);
  assert.equal(await runCli(['config', 'cursor', '--profiles', 'read,write', '--acknowledge-sensitive-write'], plain.io), 0);
  assert.equal(plain.out.text().includes(ACK), false, 'not emitted for profiles that do not need it');
});

test('help text lists the acknowledgement flag and the read-sensitive preset', async () => {
  const { CLI_HELP } = await import('../../src/cli/help.js');
  assert.match(CLI_HELP, /--acknowledge-sensitive-write/);
  assert.match(CLI_HELP, /read-sensitive/);
  assert.match(CLI_HELP, /DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE=true/);
});
