import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runSetup, parseSelection } from '../../src/cli/setup.js';
import { createLinePrompter } from '../../src/cli/prompt.js';
import { runCli, parseCliArgs, UsageError } from '../../src/cli/main.js';
import { onlineTestEnv, describeApiError } from '../../src/cli/online.js';
import { readSavedSetup } from '../../src/cli/state.js';
import { CLIENT_IDS } from '../../src/cli/clients.js';
import { sandbox, collector, stdinFrom, allFiles, mode, readJson, PUBLIC, PRIVATE } from './helpers.js';

const ENTRY = '/opt/darktrace-mcp/dist/src/index.js';
function io(box: ReturnType<typeof sandbox>, stdin = stdinFrom(''), prompter?: ReturnType<typeof createLinePrompter>) {
  const out = collector();
  return { out, io: { ctx: box.ctx, stdin, stdout: out.stream, stderr: out.stream, execPath: '/opt/node/bin/node', entryPath: ENTRY, uid: 501, gid: 20, ...(prompter ? { prompter } : {}) } };
}

/** No token value may appear anywhere except the two owner-only token files. */
function assertNoLeak(home: string, extra: string): void {
  for (const file of allFiles(home)) {
    if (file.endsWith('/darktrace-mcp/public-token') || file.endsWith('/darktrace-mcp/private-token')) continue;
    const text = readFileSync(file, 'utf8');
    assert.equal(text.includes(PUBLIC) || text.includes(PRIVATE), false, file);
  }
  assert.equal(extra.includes(PUBLIC) || extra.includes(PRIVATE), false, 'output');
}

test('non-interactive setup with --tokens-from-stdin stores private token files and configures detected clients', async () => {
  const box = sandbox('darwin', ['claude', 'codex']);
  mkdirSync(join(box.home, '.cursor'));
  mkdirSync(join(box.home, 'Library/Application Support/Claude'), { recursive: true });
  const { out, io: setupIo } = io(box, stdinFrom(`${PUBLIC}\n${PRIVATE}\n`));
  const code = await runSetup({ dryRun: false, yes: true, url: 'https://darktrace.example.internal/', tokensFromStdin: true, inlineTokens: false }, setupIo);
  assert.equal(code, 0, out.text());
  const dir = join(box.home, '.config/darktrace-mcp');
  assert.equal(statSync(dir).mode & 0o777, 0o700);
  assert.equal(mode(join(dir, 'public-token')), 0o600);
  assert.equal(mode(join(dir, 'private-token')), 0o600);
  assert.equal(readFileSync(join(dir, 'public-token'), 'utf8'), PUBLIC + '\n');
  assert.equal(readFileSync(join(dir, 'private-token'), 'utf8'), PRIVATE + '\n');
  assert.equal(mode(join(dir, 'setup.json')), 0o600);
  assert.deepEqual(readSavedSetup(box.ctx), { version: 1, url: 'https://darktrace.example.internal', profiles: 'read', runtime: 'node', tokenMode: 'file', dateFormat: 'compact' });
  const desktop = readJson(join(box.home, 'Library/Application Support/Claude/claude_desktop_config.json')).mcpServers.darktrace;
  assert.deepEqual(desktop, {
    command: '/opt/node/bin/node', args: [ENTRY],
    env: { DARKTRACE_URL: 'https://darktrace.example.internal', DARKTRACE_PUBLIC_TOKEN_FILE: join(dir, 'public-token'),
      DARKTRACE_PRIVATE_TOKEN_FILE: join(dir, 'private-token'), DARKTRACE_PROFILES: 'read', DARKTRACE_DATE_FORMAT: 'compact' },
  });
  assert.ok(readJson(join(box.home, '.cursor/mcp.json')).mcpServers.darktrace);
  // Claude Code and Codex went through their CLIs; argv carries file paths, never token values.
  const argv = JSON.stringify(box.calls);
  assert.match(argv, /"mcp","add","--scope","user"/);
  assert.match(argv, /"mcp","add","darktrace"/);
  assert.equal(argv.includes(PUBLIC) || argv.includes(PRIVATE), false);
  // Only known DARKTRACE_* variables are emitted.
  for (const key of Object.keys(desktop.env)) assert.ok(['DARKTRACE_URL', 'DARKTRACE_PUBLIC_TOKEN_FILE', 'DARKTRACE_PRIVATE_TOKEN_FILE', 'DARKTRACE_PROFILES', 'DARKTRACE_DATE_FORMAT'].includes(key));
  assertNoLeak(box.home, out.text());

  // Re-running keeps the stored tokens and changes nothing.
  const rerun = io(box, stdinFrom(''));
  assert.equal(await runSetup({ dryRun: false, yes: true, tokensFromStdin: false, inlineTokens: false }, rerun.io), 0);
  assert.match(rerun.out.text(), /Claude Desktop\s+unchanged/);
  assert.equal(readFileSync(join(dir, 'private-token'), 'utf8'), PRIVATE + '\n');
});

test('interactive wizard: answers via prompter, hidden tokens, read+write preset, chosen client only', async () => {
  const box = sandbox('linux');
  const answers = ['https://dt.example.com', '1', PUBLIC, PRIVATE, '2', String(CLIENT_IDS.indexOf('gemini') + 1)];
  const { out, io: setupIo } = io(box, stdinFrom(''), createLinePrompter(answers));
  assert.equal(await runSetup({ dryRun: false, yes: false, tokensFromStdin: false, inlineTokens: false }, setupIo), 0, out.text());
  const gemini = readJson(join(box.home, '.gemini/settings.json')).mcpServers.darktrace;
  assert.equal(gemini.env.DARKTRACE_PROFILES, 'read,write');
  assert.equal(gemini.env.DARKTRACE_URL, 'https://dt.example.com');
  assertNoLeak(box.home, out.text());
});

test('setup validates URL and tokens and supports --dry-run without writing anything', async () => {
  const box = sandbox();
  const bad = io(box, stdinFrom(`${PUBLIC}\n${PRIVATE}\n`));
  await assert.rejects(runSetup({ dryRun: false, yes: true, url: 'http://insecure.example', tokensFromStdin: true, inlineTokens: false }, bad.io), /https/);
  const spaced = io(box, stdinFrom('has space\nother\n'));
  await assert.rejects(runSetup({ dryRun: false, yes: true, url: 'https://ok.example', tokensFromStdin: true, inlineTokens: false }, spaced.io), /public token/);
  const dry = io(box, stdinFrom(`${PUBLIC}\n${PRIVATE}\n`));
  assert.equal(await runSetup({ dryRun: true, yes: true, url: 'https://ok.example', clients: ['cursor'], tokensFromStdin: true, inlineTokens: false }, dry.io), 0);
  assert.match(dry.out.text(), /dry-run/);
  assert.deepEqual(allFiles(box.home), []);
});

test('docker runtime emits hardened arguments with the caller UID:GID and token-file mounts', async () => {
  const box = sandbox('linux', ['docker']);
  const image = 'sha256:' + 'a'.repeat(64);
  const { out, io: setupIo } = io(box, stdinFrom(`${PUBLIC}\n${PRIVATE}\n`));
  assert.equal(await runSetup({ dryRun: false, yes: true, url: 'https://dt.example.com', runtime: 'docker', image, clients: ['cursor'], tokensFromStdin: true, inlineTokens: false }, setupIo), 0, out.text());
  const server = readJson(join(box.home, '.cursor/mcp.json')).mcpServers.darktrace;
  assert.equal(server.command, join(box.bin, 'docker'));
  for (const flag of ['--rm', '-i', '--init', '--pull=never', '--read-only', '--cap-drop=ALL', '--security-opt=no-new-privileges']) assert.ok(server.args.includes(flag), flag);
  assert.equal(server.args[server.args.indexOf('--user') + 1], '501:20');
  assert.equal(server.args.at(-1), image);
  assert.ok(server.args.some((a: string) => a.includes('dst=/run/secrets/private-token,readonly')));
  assert.equal(server.env, undefined);
  assert.equal(server.args.some((a: string) => a.startsWith('DARKTRACE_TOKEN_FILE_OWNER=')), false, 'Linux keeps the strict owner rule');
  await assert.rejects(runSetup({ dryRun: true, yes: true, url: 'https://dt.example.com', runtime: 'docker', image: 'darktrace-mcp:latest', tokensFromStdin: false, inlineTokens: false }, io(box).io), /immutable/);
});

test('docker runtime on macOS (Docker Desktop) opts into root-or-current token-file ownership only', async () => {
  const box = sandbox('darwin', ['docker']);
  const image = 'sha256:' + 'b'.repeat(64);
  const { out, io: setupIo } = io(box, stdinFrom(`${PUBLIC}\n${PRIVATE}\n`));
  assert.equal(await runSetup({ dryRun: false, yes: true, url: 'https://dt.example.com', runtime: 'docker', image, clients: ['cursor'], tokensFromStdin: true, inlineTokens: false }, setupIo), 0, out.text());
  const args: string[] = readJson(join(box.home, '.cursor/mcp.json')).mcpServers.darktrace.args;
  const env = args.flatMap((value, i) => value === '-e' ? [args[i + 1]] : []);
  assert.deepEqual(env.filter((value) => value.startsWith('DARKTRACE_TOKEN_FILE_OWNER=')), ['DARKTRACE_TOKEN_FILE_OWNER=root-or-current']);
  assert.ok(env.includes('DARKTRACE_PROFILES=read'));
  assert.equal(args.at(-1), image);
  assert.equal(args[args.indexOf('--user') + 1], '501:20');
  assert.match(out.text(), /DARKTRACE_TOKEN_FILE_OWNER=root-or-current/);
  assertNoLeak(box.home, out.text());
  const printed = collector();
  assert.equal(await runCli(['config', 'cursor', '--runtime', 'docker', '--image', image], { ...setupIo, stdout: printed.stream, stderr: printed.stream }), 0, printed.text());
  assert.match(printed.text(), /DARKTRACE_TOKEN_FILE_OWNER=root-or-current/);
});

test('Windows node runtime requires explicit consent before inlining token values', async () => {
  const box = sandbox('win32');
  const refused = io(box, stdinFrom(`${PUBLIC}\n${PRIVATE}\n`));
  await assert.rejects(runSetup({ dryRun: false, yes: true, url: 'https://dt.example.com', clients: ['cursor'], tokensFromStdin: true, inlineTokens: false }, refused.io), /inline-tokens-windows/);
  const consent = io(box, stdinFrom(`${PUBLIC}\n${PRIVATE}\n`));
  assert.equal(await runSetup({ dryRun: false, yes: true, url: 'https://dt.example.com', clients: ['cursor'], tokensFromStdin: true, inlineTokens: true }, consent.io), 0);
  const env = readJson(join(box.home, '.cursor/mcp.json')).mcpServers.darktrace.env;
  assert.equal(env.DARKTRACE_PUBLIC_TOKEN, PUBLIC);
  assert.equal('DARKTRACE_PUBLIC_TOKEN_FILE' in env, false);
  assert.equal(consent.out.text().includes(PRIVATE), false, 'values never printed');
});

test('selection parsing and CLI argument policy', () => {
  assert.deepEqual(parseSelection('', CLIENT_IDS, ['cursor']), ['cursor']);
  assert.deepEqual(parseSelection('1, 3', CLIENT_IDS, []), ['claude-desktop', 'codex']);
  assert.deepEqual(parseSelection('none', CLIENT_IDS, ['cursor']), []);
  assert.throws(() => parseSelection('99', CLIENT_IDS, []));
  for (const argv of [['setup', '--private-token=' + PRIVATE], ['setup', '--public-token', PUBLIC], ['setup', '--api-key=' + PRIVATE], ['setup', '--bogus=' + PRIVATE], ['config', 'cursor', '--yes']]) {
    assert.throws(() => parseCliArgs(argv), (error: unknown) => error instanceof UsageError && !error.message.includes(PRIVATE) && !error.message.includes(PUBLIC));
  }
  const parsed = parseCliArgs(['setup', '--client', 'cursor', '--client=vscode', '--yes', '--url=https://a.example']);
  assert.deepEqual(parsed.flags.get('--client'), ['cursor', 'vscode']);
});

test('runCli returns 2 for unsupported flags without echoing values', async () => {
  const box = sandbox();
  const { out, io: cliIo } = io(box);
  assert.equal(await runCli(['setup', '--private-token=' + PRIVATE], cliIo), 2);
  assert.equal(out.text().includes(PRIVATE), false);
  assert.match(out.text(), /never accepted as flags/);
});

test('test command maps saved setup into the environment and explains errors', () => {
  const box = sandbox();
  mkdirSync(join(box.home, '.config/darktrace-mcp'), { recursive: true });
  writeFileSync(join(box.home, '.config/darktrace-mcp/setup.json'), JSON.stringify({ version: 1, url: 'https://dt.example.com', profiles: 'read', runtime: 'node', tokenMode: 'file' }));
  const env = onlineTestEnv(box.ctx);
  assert.equal(env.DARKTRACE_URL, 'https://dt.example.com');
  assert.equal(env.DARKTRACE_PUBLIC_TOKEN_FILE, join(box.home, '.config/darktrace-mcp/public-token'));
  assert.deepEqual(onlineTestEnv({ ...box.ctx, env: { DARKTRACE_URL: 'https://other.example' } }), { DARKTRACE_URL: 'https://other.example' });
  assert.match(describeApiError('auth'), /token/);
  assert.match(describeApiError('clock_skew_suspected'), /NTP/);
  assert.match(describeApiError('network'), /NODE_EXTRA_CA_CERTS/);
  assert.match(describeApiError('timeout'), /DARKTRACE_TIMEOUT_MS/);
});
