import test from 'node:test';
import assert from 'node:assert/strict';
import { lstatSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runSetup } from '../../src/cli/setup.js';
import { runCli } from '../../src/cli/main.js';
import { describeEntry, entryOrigin, existingFixedCopyEntry, fixedCopyDir, installFixedCopy, isTransientInstall, PACKAGE_NAME } from '../../src/cli/install.js';
import { NODE_RUNTIME_LABEL } from '../../src/cli/setup.js';
import { createLinePrompter } from '../../src/cli/prompt.js';
import { sandbox, collector, stdinFrom, readJson, PUBLIC, PRIVATE } from './helpers.js';

const VERSION = '1.1.0';

/** Build a realistic `~/.npm/_npx/<hash>/` tree: our package, its locked dependencies and a .bin shim. */
function fakeNpxTree(home: string): string {
  const root = join(home, '.npm', '_npx', 'a1b2c3d4e5f60718');
  const pkg = join(root, 'node_modules', '@nuoframework', 'darktrace-mcp');
  mkdirSync(join(pkg, 'dist', 'src', 'cli'), { recursive: true });
  writeFileSync(join(pkg, 'package.json'), JSON.stringify({ name: PACKAGE_NAME, version: VERSION, bin: { 'darktrace-mcp': 'dist/src/index.js' } }));
  writeFileSync(join(pkg, 'dist', 'src', 'index.js'), '#!/usr/bin/env node\n', { mode: 0o755 });
  writeFileSync(join(pkg, 'dist', 'src', 'cli', 'entry.js'), '');
  for (const dep of ['zod', '@modelcontextprotocol/server', '@modelcontextprotocol/core']) {
    mkdirSync(join(root, 'node_modules', dep), { recursive: true });
    writeFileSync(join(root, 'node_modules', dep, 'package.json'), JSON.stringify({ name: dep, version: '0.0.0' }));
  }
  mkdirSync(join(root, 'node_modules', '.bin'));
  symlinkSync(join(pkg, 'dist', 'src', 'index.js'), join(root, 'node_modules', '.bin', 'darktrace-mcp'));
  writeFileSync(join(root, 'package.json'), '{}');
  return join(pkg, 'dist', 'src', 'index.js');
}

test('npx cache detection: _npx trees and npm cache roots are transient, checkouts and fixed copies are not', () => {
  const box = sandbox('darwin');
  const ctx = box.ctx;
  assert.equal(isTransientInstall(join(box.home, '.npm/_npx/0123abcd/node_modules/@nuoframework/darktrace-mcp/dist/src/index.js'), ctx), true);
  assert.equal(isTransientInstall(join(box.home, '.npm/anything/dist/src/index.js'), ctx), true);
  assert.equal(isTransientInstall('/opt/darktrace-mcp/dist/src/index.js', ctx), false);
  assert.equal(isTransientInstall(join(box.home, '.local/share/darktrace-mcp/1.1.0/node_modules/@nuoframework/darktrace-mcp/dist/src/index.js'), ctx), false);
  assert.equal(isTransientInstall('/var/cache/npm/_cacache/x/dist/src/index.js', { ...ctx, env: { npm_config_cache: '/var/cache/npm' } }), true);
  assert.equal(isTransientInstall('/var/cache/npmx/dist/src/index.js', { ...ctx, env: { npm_config_cache: '/var/cache/npm' } }), false);
  const win = { home: 'C:\\Users\\me', platform: 'win32' as const, env: { LOCALAPPDATA: 'C:\\Users\\me\\AppData\\Local' } };
  assert.equal(isTransientInstall('C:\\Users\\me\\AppData\\Local\\npm-cache\\_npx\\abc\\node_modules\\@nuoframework\\darktrace-mcp\\dist\\src\\index.js', win), true);
  assert.equal(isTransientInstall('C:\\Users\\me\\AppData\\Local\\darktrace-mcp\\1.1.0\\node_modules\\@nuoframework\\darktrace-mcp\\dist\\src\\index.js', win), false);
  assert.equal(fixedCopyDir(ctx, VERSION), join(box.home, '.local/share/darktrace-mcp', VERSION));
  assert.equal(fixedCopyDir({ ...ctx, env: { XDG_DATA_HOME: '/data' } }, VERSION), '/data/darktrace-mcp/1.1.0');
  assert.throws(() => fixedCopyDir(ctx, '../escape'), /invalid package version/);
});

test('describeEntry reads our package layout and refuses foreign trees', () => {
  const box = sandbox('darwin');
  const entry = fakeNpxTree(box.home);
  const described = describeEntry(entry);
  assert.equal(described?.name, PACKAGE_NAME);
  assert.equal(described?.version, VERSION);
  assert.equal(described?.installRoot, join(box.home, '.npm/_npx/a1b2c3d4e5f60718'));
  assert.equal(describeEntry('/nonexistent/dist/src/index.js'), undefined);
  // A plain checkout has a package root but no install root.
  mkdirSync(join(box.home, 'checkout/dist/src'), { recursive: true });
  writeFileSync(join(box.home, 'checkout/package.json'), JSON.stringify({ name: PACKAGE_NAME, version: VERSION }));
  assert.equal(describeEntry(join(box.home, 'checkout/dist/src/index.js'))?.installRoot, undefined);
  assert.throws(() => installFixedCopy(join(box.home, 'checkout/dist/src/index.js'), box.ctx), /cannot locate the installed package tree/);
});

test('setup from the npx cache installs a fixed copy and registers its absolute path in clients', async () => {
  const box = sandbox('darwin');
  mkdirSync(join(box.home, '.cursor'));
  const entry = fakeNpxTree(box.home);
  const expectedDir = join(box.home, '.local/share/darktrace-mcp', VERSION);
  const expectedEntry = join(expectedDir, 'node_modules/@nuoframework/darktrace-mcp/dist/src/index.js');
  const out = collector();
  const io = { ctx: box.ctx, stdin: stdinFrom(`${PUBLIC}\n${PRIVATE}\n`), stdout: out.stream, stderr: out.stream, execPath: '/opt/node/bin/node', entryPath: entry, uid: 501, gid: 20 };

  // Dry run: plans the copy, writes nothing.
  const planned = await runSetup({ dryRun: true, yes: true, url: 'https://dt.example.com', tokensFromStdin: true, inlineTokens: false, clients: ['cursor'] }, io);
  assert.equal(planned, 0, out.text());
  assert.match(out.text(), /Would install a fixed copy/);
  assert.equal(existingFixedCopyEntry(entry, box.ctx), undefined);

  const code = await runSetup({ dryRun: false, yes: true, url: 'https://dt.example.com', tokensFromStdin: true, inlineTokens: false, clients: ['cursor'] },
    { ...io, stdin: stdinFrom(`${PUBLIC}\n${PRIVATE}\n`) });
  assert.equal(code, 0, out.text());
  assert.match(out.text(), /Installed a fixed copy of the package in/);
  const cursor = readJson(join(box.home, '.cursor/mcp.json')).mcpServers.darktrace;
  assert.deepEqual(cursor.args, [expectedEntry]);
  assert.equal(cursor.command, '/opt/node/bin/node');
  assert.ok(!JSON.stringify(cursor).includes('_npx'), 'transient path must never reach a client config');
  assert.equal(lstatSync(expectedEntry).mode & 0o111, 0o111, 'entry stays executable');
  assert.equal(readFileSync(join(expectedDir, 'node_modules/zod/package.json'), 'utf8'), JSON.stringify({ name: 'zod', version: '0.0.0' }));
  assert.throws(() => lstatSync(join(expectedDir, 'node_modules/.bin')), /ENOENT/, '.bin shims (symlinks) are not copied');
  assert.equal(existingFixedCopyEntry(entry, box.ctx), expectedEntry);

  // Second run reuses the copy; nothing in the client changes.
  const again = await runSetup({ dryRun: false, yes: true, url: 'https://dt.example.com', tokensFromStdin: false, inlineTokens: false, clients: ['cursor'] }, io);
  assert.equal(again, 0, out.text());
  assert.match(out.text(), /Reusing the fixed copy in/);
  assert.match(out.text(), /unchanged/);

  // `config` printed through npx now points at the fixed copy too.
  const cfg = collector();
  await runCli(['config', 'claude-desktop'], { ...io, stdout: cfg.stream, stderr: cfg.stream });
  assert.ok(cfg.text().includes(expectedEntry));
  assert.ok(!cfg.text().includes('_npx'));

  // From a stable checkout path nothing is copied and the given entry is used as before.
  const plain = collector();
  await runSetup({ dryRun: false, yes: true, url: 'https://dt.example.com', tokensFromStdin: false, inlineTokens: false, clients: ['cursor'] },
    { ...io, stdout: plain.stream, entryPath: '/opt/darktrace-mcp/dist/src/index.js' });
  assert.ok(!plain.text().includes('fixed copy'));
  assert.deepEqual(readJson(join(box.home, '.cursor/mcp.json')).mcpServers.darktrace.args, ['/opt/darktrace-mcp/dist/src/index.js']);
});

test('config from the npx cache without a fixed copy warns that the path is temporary', async () => {
  const box = sandbox('darwin');
  const entry = fakeNpxTree(box.home);
  const out = collector();
  const code = await runCli(['config', 'cursor'], { ctx: box.ctx, stdin: stdinFrom(''), stdout: out.stream, stderr: out.stream, execPath: '/opt/node/bin/node', entryPath: entry, uid: 501, gid: 20 });
  assert.equal(code, 0);
  assert.match(out.text(), /Running from the npx cache: the path below is temporary/);
});

test('entry origin names the running package honestly: checkout, fixed copy, npx cache or installed package', async () => {
  const box = sandbox('darwin');
  const transient = fakeNpxTree(box.home);
  assert.equal(entryOrigin(transient, box.ctx), 'transient');
  // A source checkout has package.json next to src/.
  mkdirSync(join(box.home, 'checkout/dist/src'), { recursive: true });
  mkdirSync(join(box.home, 'checkout/src'));
  writeFileSync(join(box.home, 'checkout/package.json'), JSON.stringify({ name: PACKAGE_NAME, version: VERSION }));
  assert.equal(entryOrigin(join(box.home, 'checkout/dist/src/index.js'), box.ctx), 'checkout');
  // The fixed copy that setup installs from the npx cache.
  const copy = installFixedCopy(transient, box.ctx);
  assert.equal(entryOrigin(copy.entryPath, box.ctx), 'fixed-copy');
  // Any other installed package (no src/, not the fixed-copy path) and an unknown layout.
  mkdirSync(join(box.home, 'global/node_modules/@nuoframework/darktrace-mcp/dist/src'), { recursive: true });
  writeFileSync(join(box.home, 'global/node_modules/@nuoframework/darktrace-mcp/package.json'), JSON.stringify({ name: PACKAGE_NAME, version: VERSION }));
  assert.equal(entryOrigin(join(box.home, 'global/node_modules/@nuoframework/darktrace-mcp/dist/src/index.js'), box.ctx), 'package');
  assert.equal(entryOrigin('/opt/darktrace-mcp/dist/src/index.js', box.ctx), 'package');
  for (const label of Object.values(NODE_RUNTIME_LABEL)) assert.equal(label.includes('checkout') && label !== 'this checkout', false, label);

  // The runtime question and the confirmation line use the label of the running origin, never "this checkout" from a fixed copy.
  const out = collector();
  // URL, runtime, both tokens, profile, update mode (pinned), clients.
  const prompter = createLinePrompter(['https://dt.example.com', '1', PUBLIC, PRIVATE, '1', '1', 'none']);
  const io = { ctx: box.ctx, stdin: stdinFrom(''), stdout: out.stream, stderr: out.stream, execPath: '/opt/node/bin/node', entryPath: copy.entryPath, uid: 501, gid: 20, prompter };
  assert.equal(await runSetup({ dryRun: true, yes: false, tokensFromStdin: false, inlineTokens: false }, io), 0, out.text());
  assert.match(out.text(), /1\) node \(the fixed copy installed by setup\)  \[default\]/);
  assert.match(out.text(), /Runtime: node, the fixed copy installed by setup/);
  assert.equal(out.text().includes('this checkout'), false);
});

