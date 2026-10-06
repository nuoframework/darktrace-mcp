import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runSetup } from '../../src/cli/setup.js';
import { runUninstall, type UninstallArgs } from '../../src/cli/uninstall.js';
import { runCli } from '../../src/cli/main.js';
import { createLinePrompter } from '../../src/cli/prompt.js';
import type { CliContext } from '../../src/cli/clients.js';
import { sandbox, collector, stdinFrom, readJson, PUBLIC, PRIVATE, FAKE_ID } from './helpers.js';

const ENTRY = '/opt/darktrace-mcp/dist/src/index.js';
const ARGS: UninstallArgs = { dryRun: false, yes: true, keepCopies: false, docker: false };

/** Sandbox with a completed node setup into Cursor and Claude Code, two fixed copies and unrelated neighbours. */
async function installed(options: { npmGlobal?: boolean; docker?: boolean } = {}) {
  const box = sandbox('linux', ['claude', 'npm', 'docker']);
  const npmCalls: string[][] = [];
  const ctx: CliContext = {
    ...box.ctx,
    run: (command, args) => {
      if (command.endsWith('/npm')) {
        npmCalls.push([...args]);
        return { status: 0, stdout: JSON.stringify(options.npmGlobal ? { dependencies: { '@nuoframework/darktrace-mcp': { version: '1.1.1' } } } : {}), stderr: '' };
      }
      return box.ctx.run(command, args);
    },
  };
  const out = collector();
  const base = { ctx, stdin: stdinFrom(`${PUBLIC}\n${PRIVATE}\n`), stdout: out.stream, execPath: '/opt/node/bin/node', entryPath: ENTRY, uid: 501, gid: 20 };
  if (options.docker) box.docker.local.push({ id: FAKE_ID, tags: [], repoDigests: [] });
  assert.equal(await runSetup({ dryRun: false, yes: true, url: 'https://dt.example.com', clients: ['cursor', 'claude-code'], tokensFromStdin: true, inlineTokens: false,
    ...(options.docker ? { runtime: 'docker' as const, image: FAKE_ID } : {}) }, base), 0, out.text());
  // Cursor keeps another server that must survive.
  const cursorFile = join(box.home, '.cursor/mcp.json');
  const cursor = readJson(cursorFile);
  cursor.mcpServers.other = { command: '/usr/bin/other' };
  writeFileSync(cursorFile, JSON.stringify(cursor));
  const data = join(box.home, '.local/share/darktrace-mcp');
  for (const version of ['1.1.0', '1.1.1']) {
    const pkg = join(data, version, 'node_modules/@nuoframework/darktrace-mcp');
    mkdirSync(join(pkg, 'dist/src'), { recursive: true });
    writeFileSync(join(pkg, 'package.json'), JSON.stringify({ name: '@nuoframework/darktrace-mcp', version }));
    writeFileSync(join(pkg, 'dist/src/index.js'), '');
  }
  mkdirSync(join(data, 'notes'));
  const elsewhere = join(box.home, 'elsewhere');
  mkdirSync(join(elsewhere, 'node_modules/@nuoframework/darktrace-mcp'), { recursive: true });
  writeFileSync(join(elsewhere, 'node_modules/@nuoframework/darktrace-mcp/package.json'), JSON.stringify({ name: '@nuoframework/darktrace-mcp', version: '9.9.9' }));
  symlinkSync(elsewhere, join(data, '9.9.9'));
  box.calls.length = 0;
  box.docker.calls.length = 0;
  return { box, ctx, data, cursorFile, npmCalls };
}

function uio(ctx: CliContext, answers?: string[]) {
  const out = collector();
  return { out, io: { ctx, stdin: stdinFrom(''), stdout: out.stream, ...(answers ? { prompter: createLinePrompter(answers) } : {}) } };
}

test('uninstall --yes removes client entries, tokens, settings and fixed copies; keeps backups and unrelated paths', async () => {
  const { box, ctx, data, cursorFile, npmCalls } = await installed({ npmGlobal: true });
  const { out, io } = uio(ctx);
  assert.equal(await runUninstall(ARGS, io), 0, out.text());
  const cursor = readJson(cursorFile).mcpServers;
  assert.equal('darktrace' in cursor, false);
  assert.ok(cursor.other, 'other servers stay');
  assert.ok(readdirSync(join(box.home, '.cursor')).some((f) => f.startsWith('mcp.json.bak-')), 'backup kept');
  assert.ok(box.calls.some((c) => c.command.endsWith('/claude') && c.args.join(' ') === 'mcp remove --scope user darktrace'));
  assert.equal(existsSync(join(box.home, '.config/darktrace-mcp')), false);
  assert.equal(existsSync(join(data, '1.1.0')), false);
  assert.equal(existsSync(join(data, '1.1.1')), false);
  assert.ok(existsSync(join(data, 'notes')), 'unrelated directory untouched');
  assert.ok(existsSync(join(box.home, 'elsewhere/node_modules')), 'symlink target untouched');
  assert.match(out.text(), /not a darktrace-mcp fixed copy; not touched/);
  assert.match(out.text(), /Backups kept/);
  assert.deepEqual(npmCalls, [['ls', '-g', '@nuoframework/darktrace-mcp', '--depth=0', '--json']]);
  assert.match(out.text(), /npm uninstall -g @nuoframework\/darktrace-mcp/);
  assert.equal(box.calls.some((c) => c.command.endsWith('/npm') && c.args.includes('uninstall')), false);
  assert.equal(box.docker.calls.length, 0);
  assert.equal(out.text().includes(PUBLIC) || out.text().includes(PRIVATE), false);
});

test('uninstall --dry-run prints the plan and changes nothing', async () => {
  const { box, ctx, data, cursorFile } = await installed();
  const before = readFileSync(cursorFile, 'utf8');
  const { out, io } = uio(ctx);
  assert.equal(await runUninstall({ ...ARGS, dryRun: true }, io), 0);
  assert.match(out.text(), /Plan:/);
  assert.ok(out.text().includes(join(data, '1.1.0')));
  assert.equal(readFileSync(cursorFile, 'utf8'), before);
  assert.ok(existsSync(join(box.home, '.config/darktrace-mcp/private-token')));
  assert.ok(existsSync(join(data, '1.1.1')));
  assert.equal(box.calls.length, 0);
  assert.doesNotMatch(out.text(), /npm uninstall/);
});

test('uninstall --keep-copies keeps every fixed copy', async () => {
  const { box, ctx, data } = await installed();
  const { out, io } = uio(ctx);
  assert.equal(await runUninstall({ ...ARGS, keepCopies: true }, io), 0, out.text());
  assert.ok(existsSync(join(data, '1.1.0')) && existsSync(join(data, '1.1.1')));
  assert.equal(existsSync(join(box.home, '.config/darktrace-mcp')), false);
  assert.match(out.text(), /kept \(--keep-copies\)/);
});

test('uninstall asks once; a no or missing answer changes nothing', async () => {
  const { box, ctx } = await installed();
  const declined = uio(ctx, ['n']);
  assert.equal(await runUninstall({ ...ARGS, yes: false }, declined.io), 1);
  assert.match(declined.out.text(), /Cancelled/);
  assert.ok(existsSync(join(box.home, '.config/darktrace-mcp/setup.json')));
  const empty = uio(ctx, []);
  assert.equal(await runUninstall({ ...ARGS, yes: false }, empty.io), 1);
  const accepted = uio(ctx, ['y']);
  assert.equal(await runUninstall({ ...ARGS, yes: false }, accepted.io), 0, accepted.out.text());
  assert.equal(existsSync(join(box.home, '.config/darktrace-mcp')), false);
});

test('--docker removes exactly the image ID recorded by setup; without it the image is kept', async () => {
  const kept = await installed({ docker: true });
  const k = uio(kept.ctx);
  assert.equal(await runUninstall(ARGS, k.io), 0, k.out.text());
  assert.equal(kept.box.docker.calls.some((c) => c.args[0] === 'image' && c.args[1] === 'rm'), false);
  assert.match(k.out.text(), /add --docker to remove exactly this image/);

  const removed = await installed({ docker: true });
  const r = uio(removed.ctx);
  assert.equal(await runUninstall({ ...ARGS, docker: true }, r.io), 0, r.out.text());
  assert.deepEqual(removed.box.docker.calls.filter((c) => c.args[0] === 'image' && c.args[1] === 'rm').map((c) => c.args), [['image', 'rm', FAKE_ID]]);
});

test('symlinked installer directory is refused; remove --all is an alias with strict flags', async () => {
  const box = sandbox('linux');
  const real = join(box.home, 'real-config');
  mkdirSync(real);
  writeFileSync(join(real, 'setup.json'), '{}');
  mkdirSync(join(box.home, '.config'));
  symlinkSync(real, join(box.home, '.config/darktrace-mcp'));
  const { out, io } = uio(box.ctx);
  assert.equal(await runUninstall(ARGS, io), 0, out.text());
  assert.ok(existsSync(join(real, 'setup.json')));
  assert.match(out.text(), /symbolic link or not a directory; not touched/);

  const cli = collector();
  const cliIo = { ctx: box.ctx, stdin: stdinFrom(''), stdout: cli.stream, stderr: cli.stream, execPath: '/opt/node/bin/node', entryPath: ENTRY };
  assert.equal(await runCli(['remove', '--all', '--dry-run'], cliIo), 0, cli.text());
  assert.match(cli.text(), /darktrace-mcp uninstall \(dry run/);
  assert.equal(await runCli(['remove', '--all', '--client', 'cursor'], cliIo), 2);
  assert.equal(await runCli(['remove', '--docker'], cliIo), 2);
  assert.equal(await runCli(['uninstall', '--purge'], cliIo), 2);
});
