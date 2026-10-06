import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { planJsonEntry, hasJsonComments } from '../../src/cli/jsonConfig.js';
import { removeCodexServer, renderCodexBlock, upsertCodexServer } from '../../src/cli/toml.js';
import { installClient, removeClient, clientConfigPath } from '../../src/cli/clients.js';
import { buildServerEntry, type InstallSettings } from '../../src/cli/entry.js';
import { sandbox, mode, readJson } from './helpers.js';

const settings = (home: string): InstallSettings => ({
  url: 'https://darktrace.example.internal', profiles: 'read', runtime: 'node', tokenMode: 'file',
  publicTokenFile: join(home, '.config/darktrace-mcp/public-token'), privateTokenFile: join(home, '.config/darktrace-mcp/private-token'),
  nodePath: '/opt/node/bin/node', entryPath: '/opt/darktrace-mcp/dist/src/index.js',
});
const opts = { dryRun: false, inlineTokens: false };

test('JSON merge preserves other servers and unrelated keys; removal leaves them intact', () => {
  const original = JSON.stringify({ theme: 'dark', mcpServers: { other: { command: 'x', args: ['y'] } } });
  const plan = planJsonEntry(original, 'mcpServers', 'darktrace', { command: 'node' });
  assert.ok(plan.ok && plan.changed);
  const merged = JSON.parse(plan.text);
  assert.deepEqual(merged, { theme: 'dark', mcpServers: { other: { command: 'x', args: ['y'] }, darktrace: { command: 'node' } } });
  const again = planJsonEntry(plan.text, 'mcpServers', 'darktrace', { command: 'node' });
  assert.ok(again.ok && !again.changed, 'idempotent');
  const removed = planJsonEntry(plan.text, 'mcpServers', 'darktrace', undefined);
  assert.ok(removed.ok && removed.changed);
  assert.deepEqual(JSON.parse(removed.text), { theme: 'dark', mcpServers: { other: { command: 'x', args: ['y'] } } });
});

test('JSONC, invalid JSON and non-object roots are never rewritten', () => {
  const jsonc = '{\n  // my servers\n  "servers": {}\n}\n';
  assert.equal(hasJsonComments(jsonc), true);
  assert.equal(hasJsonComments('{"url":"https://a//b"}'), false, 'slashes inside strings are not comments');
  const plan = planJsonEntry(jsonc, 'servers', 'darktrace', { command: 'node' });
  assert.equal(plan.ok, false);
  assert.match(plan.ok ? '' : plan.reason, /comments/);
  assert.equal(planJsonEntry('{oops', 'servers', 'darktrace', {}).ok, false);
  assert.equal(planJsonEntry('[]', 'servers', 'darktrace', {}).ok, false);
  assert.equal(planJsonEntry('{"servers":[]}', 'servers', 'darktrace', {}).ok, false);
  assert.ok(planJsonEntry('', 'servers', 'darktrace', {}).ok, 'empty file is treated as {}');
});

test('client JSON install backs up, keeps permissions, and never writes token values', () => {
  const { home, ctx } = sandbox();
  const file = clientConfigPath('claude-desktop', ctx) as string;
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, JSON.stringify({ mcpServers: { keep: { command: 'k' } }, preferences: { a: 1 } }));
  chmodSync(file, 0o640);
  const entry = buildServerEntry(settings(home));
  const result = installClient('claude-desktop', entry, ctx, opts);
  assert.equal(result.status, 'written');
  assert.ok(result.backup && existsSync(result.backup));
  assert.equal(mode(file), 0o640, 'original permissions kept');
  assert.equal(mode(result.backup as string), 0o640, 'backup keeps permissions');
  assert.deepEqual(readJson(result.backup as string), { mcpServers: { keep: { command: 'k' } }, preferences: { a: 1 } });
  const written = readJson(file);
  assert.deepEqual(written.mcpServers.keep, { command: 'k' });
  assert.deepEqual(written.preferences, { a: 1 });
  assert.equal(written.mcpServers.darktrace.env.DARKTRACE_PUBLIC_TOKEN_FILE, join(home, '.config/darktrace-mcp/public-token'));
  assert.equal('DARKTRACE_PUBLIC_TOKEN' in written.mcpServers.darktrace.env, false);
  assert.equal(installClient('claude-desktop', entry, ctx, opts).status, 'unchanged');
  // No stray temp files remain next to the config.
  assert.deepEqual(readdirSync(join(file, '..')).filter((n) => n.includes('.tmp-')), []);
});

test('new client config files are created owner-only; shapes match each client format', () => {
  const { home, ctx } = sandbox('linux');
  const entry = buildServerEntry(settings(home));
  for (const id of ['cursor', 'vscode', 'windsurf', 'opencode', 'gemini', 'claude-desktop'] as const) {
    const result = installClient(id, entry, ctx, opts);
    assert.equal(result.status, 'written', id);
    assert.equal(mode(result.file as string), 0o600, id);
  }
  assert.equal(readJson(join(home, '.config/Code/User/mcp.json')).servers.darktrace.type, 'stdio');
  const opencode = readJson(join(home, '.config/opencode/opencode.json')).mcp.darktrace;
  assert.deepEqual(opencode.command, ['/opt/node/bin/node', '/opt/darktrace-mcp/dist/src/index.js']);
  assert.equal(opencode.type, 'local');
  assert.equal(opencode.environment.DARKTRACE_PROFILES, 'read');
  assert.ok(readJson(join(home, '.cursor/mcp.json')).mcpServers.darktrace);
  assert.ok(readJson(join(home, '.codeium/windsurf/mcp_config.json')).mcpServers.darktrace);
  assert.ok(readJson(join(home, '.gemini/settings.json')).mcpServers.darktrace);
  assert.ok(readJson(join(home, '.config/Claude/claude_desktop_config.json')).mcpServers.darktrace);
});

test('symlinked and commented configs are left untouched and a snippet is offered', () => {
  const { home, ctx } = sandbox();
  mkdirSync(join(home, '.cursor'));
  const real = join(home, 'dotfiles-mcp.json');
  writeFileSync(real, '{}');
  symlinkSync(real, join(home, '.cursor/mcp.json'));
  const entry = buildServerEntry(settings(home));
  const linked = installClient('cursor', entry, ctx, opts);
  assert.equal(linked.status, 'manual');
  assert.match(linked.snippet ?? '', /"darktrace"/);
  assert.equal(readFileSync(real, 'utf8'), '{}');
  mkdirSync(join(home, '.gemini'));
  const jsonc = '{\n // keep me\n "mcpServers": {}\n}\n';
  writeFileSync(join(home, '.gemini/settings.json'), jsonc);
  const gemini = installClient('gemini', entry, ctx, opts);
  assert.equal(gemini.status, 'manual');
  assert.equal(readFileSync(join(home, '.gemini/settings.json'), 'utf8'), jsonc);
});

test('dry run reports but writes nothing; remove deletes only the darktrace entry', () => {
  const { home, ctx } = sandbox();
  const entry = buildServerEntry(settings(home));
  const dry = installClient('cursor', entry, ctx, { dryRun: true, inlineTokens: false });
  assert.equal(dry.status, 'dry-run');
  assert.equal(existsSync(join(home, '.cursor/mcp.json')), false);
  mkdirSync(join(home, '.cursor'));
  writeFileSync(join(home, '.cursor/mcp.json'), JSON.stringify({ mcpServers: { other: { command: 'o' } } }));
  installClient('cursor', entry, ctx, opts);
  const removed = removeClient('cursor', ctx, { dryRun: false });
  assert.equal(removed.status, 'written');
  assert.deepEqual(readJson(join(home, '.cursor/mcp.json')), { mcpServers: { other: { command: 'o' } } });
  assert.equal(removeClient('cursor', ctx, { dryRun: false }).status, 'absent');
});

test('Codex TOML block is appended idempotently, escaped, and removable', () => {
  const entry = { command: 'C:\\node\\node.exe', args: ['/opt/x "y"/index.js'], env: { DARKTRACE_URL: 'https://a.example', DARKTRACE_PROFILES: 'read' } };
  const block = renderCodexBlock('darktrace', entry);
  assert.match(block, /command = "C:\\\\node\\\\node.exe"/);
  assert.match(block, /args = \["\/opt\/x \\"y\\"\/index.js"\]/);
  const existing = 'model = "o3"\n\n[mcp_servers.other]\ncommand = "other"\n\n[profiles.fast]\nmodel = "x"\n';
  const first = upsertCodexServer(existing, 'darktrace', block);
  assert.ok(first.ok && first.changed);
  const second = upsertCodexServer(first.text, 'darktrace', block);
  assert.ok(second.ok && !second.changed, 'second run is a no-op');
  assert.equal(second.text, first.text);
  assert.ok(first.text.startsWith(existing.trimEnd()));
  const removed = removeCodexServer(first.text, 'darktrace');
  assert.ok(removed.ok && removed.changed);
  assert.equal(removed.text, existing);
  const dotted = removeCodexServer('[mcp_servers]\ndarktrace.command = "x"\n', 'darktrace');
  assert.equal(dotted.ok, false);
});

test('Codex install falls back to config.toml when the codex CLI is absent and uses the CLI when present', () => {
  const plain = sandbox();
  const entry = buildServerEntry(settings(plain.home));
  const result = installClient('codex', entry, plain.ctx, opts);
  assert.equal(result.status, 'written');
  const toml = readFileSync(join(plain.home, '.codex/config.toml'), 'utf8');
  assert.match(toml, /\[mcp_servers\.darktrace\.env\]/);
  assert.equal(mode(join(plain.home, '.codex/config.toml')), 0o600);
  assert.equal(installClient('codex', entry, plain.ctx, opts).status, 'unchanged');
  const withCli = sandbox('darwin', ['codex', 'claude']);
  const cliEntry = buildServerEntry(settings(withCli.home));
  assert.equal(installClient('codex', cliEntry, withCli.ctx, opts).status, 'command');
  assert.equal(installClient('claude-code', cliEntry, withCli.ctx, opts).status, 'command');
  const add = withCli.calls.find((c) => c.args[0] === 'mcp' && c.args[1] === 'add' && c.command.endsWith('/claude'));
  assert.ok(add);
  assert.deepEqual(add.args.slice(0, 4), ['mcp', 'add', '--scope', 'user']);
  const nameIndex = add.args.indexOf('darktrace');
  assert.equal(add.args[nameIndex - 2], '--transport', 'an option separates --env pairs from the server name');
  assert.equal(add.args[nameIndex + 1], '--');
  assert.equal(existsSync(join(withCli.home, '.claude.json')), false, 'never hand-edits ~/.claude.json');
});
