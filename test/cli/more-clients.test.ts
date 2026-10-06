import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CLIENT_IDS, clientConfigPath, clientMethod, clientSnippet, detectClients, installClient, removeClient, type ClientId } from '../../src/cli/clients.js';
import { buildServerEntry, kiroInstallLink, lmstudioInstallLink, type InstallSettings } from '../../src/cli/entry.js';
import { removeYamlBlock, renderContinueItem, renderGooseEntry, upsertYamlBlock, YAML_BEGIN, YAML_END } from '../../src/cli/yamlBlock.js';
import { runCli } from '../../src/cli/main.js';
import { sandbox, collector, stdinFrom, mode, readJson } from './helpers.js';

const settings = (home: string): InstallSettings => ({
  url: 'https://darktrace.example.internal', profiles: 'read', runtime: 'node', tokenMode: 'file',
  publicTokenFile: join(home, '.config/darktrace-mcp/public-token'), privateTokenFile: join(home, '.config/darktrace-mcp/private-token'),
  nodePath: '/opt/node/bin/node', entryPath: '/opt/darktrace-mcp/dist/src/index.js',
});
const opts = { dryRun: false, inlineTokens: false };
const CONTINUE_OPTIONS = { key: 'mcpServers', kind: 'list' as const, conflict: /^\s*-?\s*name:\s*["']?darktrace["']?\s*$/ };
const GOOSE_OPTIONS = { key: 'extensions', kind: 'map' as const, conflict: /^\s+darktrace:(?:\s|$)/ };

test('every new JSON client is written to its documented file with the documented shape and owner-only mode', () => {
  const { home, ctx } = sandbox('linux');
  const entry = buildServerEntry(settings(home));
  const expectFile: Record<string, string> = {
    zed: '.config/zed/settings.json',
    cline: '.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json',
    roo: '.config/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/mcp_settings.json',
    kiro: '.kiro/settings/mcp.json', amp: '.config/amp/settings.json', 'copilot-cli': '.copilot/mcp-config.json', warp: '.warp/.mcp.json',
    lmstudio: '.lmstudio/mcp.json', antigravity: '.gemini/config/mcp_config.json', junie: '.junie/mcp/mcp.json',
  };
  for (const [id, rel] of Object.entries(expectFile) as [ClientId, string][]) {
    assert.equal(clientConfigPath(id, ctx), join(home, rel), id);
    const result = installClient(id, entry, ctx, opts);
    assert.equal(result.status, 'written', `${id}: ${result.detail}`);
    assert.equal(mode(result.file as string), 0o600, id);
    assert.equal(installClient(id, entry, ctx, opts).status, 'unchanged', id);
    const text = readFileSync(result.file as string, 'utf8');
    assert.equal(text.includes('DARKTRACE_PUBLIC_TOKEN"'), false, `${id}: token values never written`);
    assert.ok(text.includes(join(home, '.config/darktrace-mcp/private-token')), `${id}: token-file path`);
  }
  const zed = readJson(join(home, expectFile.zed)).context_servers.darktrace;
  assert.deepEqual(Object.keys(zed).sort(), ['args', 'command', 'env']);
  const cline = readJson(join(home, expectFile.cline)).mcpServers.darktrace;
  assert.deepEqual([cline.disabled, cline.autoApprove], [false, []]);
  const roo = readJson(join(home, expectFile.roo)).mcpServers.darktrace;
  assert.deepEqual([roo.disabled, roo.alwaysAllow], [false, []]);
  assert.deepEqual(readJson(join(home, expectFile.kiro)).mcpServers.darktrace.autoApprove, []);
  assert.ok(readJson(join(home, expectFile.amp))['amp.mcpServers'].darktrace, 'Amp uses the amp.mcpServers key');
  const copilot = readJson(join(home, expectFile['copilot-cli'])).mcpServers.darktrace;
  assert.deepEqual([copilot.type, copilot.tools], ['local', ['*']]);
  for (const id of ['warp', 'lmstudio', 'antigravity', 'junie'] as const) assert.equal('type' in readJson(join(home, expectFile[id])).mcpServers.darktrace, false, `${id}: no type field`);
  // Removal leaves the files without the entry.
  for (const id of Object.keys(expectFile) as ClientId[]) {
    assert.equal(removeClient(id, ctx, { dryRun: false }).status, 'written', id);
    assert.equal(removeClient(id, ctx, { dryRun: false }).status, 'absent', id);
  }
});

test('platform-specific locations: Windows and macOS app dirs, COPILOT_HOME, Goose on Windows, Amp jsonc twin', () => {
  const win = sandbox('win32');
  const wctx = { ...win.ctx, env: { ...win.ctx.env, APPDATA: join(win.home, 'AppData', 'Roaming') } };
  assert.equal(clientConfigPath('cline', wctx), join(win.home, 'AppData', 'Roaming', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json'));
  assert.equal(clientConfigPath('goose', wctx), join(win.home, 'AppData', 'Roaming', 'Block', 'goose', 'config', 'config.yaml'));
  assert.equal(clientConfigPath('amp', wctx), join(win.home, '.config', 'amp', 'settings.json'), 'Amp keeps ~/.config on Windows');
  const mac = sandbox('darwin');
  assert.equal(clientConfigPath('roo', mac.ctx), join(mac.home, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'rooveterinaryinc.roo-cline', 'settings', 'mcp_settings.json'));
  assert.equal(clientConfigPath('goose', mac.ctx), join(mac.home, '.config', 'goose', 'config.yaml'));
  assert.equal(clientConfigPath('copilot-cli', { ...mac.ctx, env: { COPILOT_HOME: '/srv/copilot' } }), '/srv/copilot/mcp-config.json');
  mkdirSync(join(mac.home, '.config/amp'), { recursive: true });
  writeFileSync(join(mac.home, '.config/amp/settings.jsonc'), '{}');
  assert.equal(clientConfigPath('amp', mac.ctx), join(mac.home, '.config/amp/settings.jsonc'));
  assert.equal(clientConfigPath('jetbrains', mac.ctx), undefined);
  assert.equal(clientMethod('jetbrains'), 'paste');
  assert.equal(clientMethod('claude-code'), 'cli');
  assert.equal(clientMethod('zed'), 'file');
});

test('detection: config directories, CLIs on PATH and the JetBrains app directory', () => {
  const { home, ctx, bin } = sandbox('linux', ['goose', 'amp']);
  mkdirSync(join(home, '.kiro/settings'), { recursive: true });
  mkdirSync(join(home, '.config/JetBrains'), { recursive: true });
  mkdirSync(join(home, '.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings'), { recursive: true });
  const detected = detectClients(ctx);
  for (const id of ['goose', 'amp', 'kiro', 'jetbrains', 'cline'] as const) assert.ok(detected.includes(id), id);
  for (const id of ['roo', 'warp', 'zed', 'junie'] as const) assert.equal(detected.includes(id), false, id);
  assert.ok(existsSync(join(bin, 'goose')));
});

test('JetBrains AI Assistant is paste-only: setup prints the JSON, remove touches nothing', () => {
  const { home, ctx } = sandbox('darwin');
  const entry = buildServerEntry(settings(home));
  const result = installClient('jetbrains', entry, ctx, opts);
  assert.equal(result.status, 'manual');
  assert.match(result.detail, /Settings \| Tools \| AI Assistant/);
  assert.ok(result.snippet?.includes('"mcpServers"'));
  assert.ok(result.snippet?.includes('"DARKTRACE_PUBLIC_TOKEN_FILE"'));
  assert.equal(removeClient('jetbrains', ctx, { dryRun: false }).status, 'absent');
});

test('YAML block editor: Continue list and Goose map, idempotent, removable, conservative on unknown shapes', () => {
  const entry = { command: '/opt/node/bin/node', args: ['/opt/dt/dist/src/index.js'], env: { DARKTRACE_URL: 'https://dt.example.com', DARKTRACE_PROFILES: 'read' } };
  const item = renderContinueItem('darktrace', entry);
  assert.match(item, /^- name: "darktrace"\n  type: stdio\n  command: "\/opt\/node\/bin\/node"\n  args:\n    - "\/opt\/dt\/dist\/src\/index.js"\n  env:\n    DARKTRACE_URL: "https:\/\/dt.example.com"/);
  // New file: key appended with the managed block.
  const created = upsertYamlBlock(undefined, item, CONTINUE_OPTIONS);
  assert.ok(created.ok && created.changed);
  assert.equal(created.text, `mcpServers:\n  ${YAML_BEGIN}\n  - name: "darktrace"\n    type: stdio\n    command: "/opt/node/bin/node"\n    args:\n      - "/opt/dt/dist/src/index.js"\n    env:\n      DARKTRACE_URL: "https://dt.example.com"\n      DARKTRACE_PROFILES: "read"\n  ${YAML_END}\n`);
  // Existing file with other servers: inserted right under the key, indentation matched, everything else untouched.
  const existing = 'name: Local Config\nversion: 1.0.0\nschema: v1\nmodels:\n  - name: gpt\n    provider: openai\nmcpServers:\n  - name: other\n    command: other\ncontext:\n  - provider: code\n';
  const merged = upsertYamlBlock(existing, item, CONTINUE_OPTIONS);
  assert.ok(merged.ok && merged.changed);
  assert.ok(merged.text.startsWith('name: Local Config\nversion: 1.0.0\nschema: v1\nmodels:\n  - name: gpt\n    provider: openai\nmcpServers:\n  ' + YAML_BEGIN + '\n  - name: "darktrace"'));
  assert.ok(merged.text.endsWith(`  ${YAML_END}\n  - name: other\n    command: other\ncontext:\n  - provider: code\n`));
  const again = upsertYamlBlock(merged.text, item, CONTINUE_OPTIONS);
  assert.ok(again.ok && !again.changed, 'idempotent');
  const updated = upsertYamlBlock(merged.text, renderContinueItem('darktrace', { ...entry, env: { DARKTRACE_PROFILES: 'read,write' } }), CONTINUE_OPTIONS);
  assert.ok(updated.ok && updated.changed && updated.text.includes('"read,write"') && !updated.text.includes('"read"\n'));
  const removed = removeYamlBlock(merged.text, CONTINUE_OPTIONS);
  assert.ok(removed.ok && removed.changed);
  assert.equal(removed.text, existing);
  // Removing from a file where ours was the only entry drops the empty key too.
  const only = removeYamlBlock(created.text, CONTINUE_OPTIONS);
  assert.ok(only.ok && only.text === '');
  // Conservative refusals.
  for (const [text, reason] of [
    ['mcpServers:\n  - name: darktrace\n    command: x\n', /outside the managed block/],
    ['mcpServers: []\n', /inline value/],
    ['a: 1\n---\nb: 2\n', /several YAML documents/],
    [`mcpServers:\n  ${YAML_BEGIN}\n  - name: "darktrace"\n`, /no end marker/],
    ['mcpServers:\n  key: value\n', /not a plain list/],
  ] as [string, RegExp][]) {
    const plan = upsertYamlBlock(text, item, CONTINUE_OPTIONS);
    assert.equal(plan.ok, false, text);
    assert.match(plan.ok ? '' : plan.reason, reason);
  }
  // Goose: nested map entry under `extensions`.
  const goose = renderGooseEntry('darktrace', entry);
  assert.match(goose, /^darktrace:\n  type: stdio\n  name: "darktrace"\n  enabled: true\n  cmd: "\/opt\/node\/bin\/node"\n  args: \["\/opt\/dt\/dist\/src\/index.js"\]\n  timeout: 300\n  envs:\n    DARKTRACE_URL: "https:\/\/dt.example.com"\n    DARKTRACE_PROFILES: "read"\n  env_keys: \[\]\n$/);
  const gooseFile = 'GOOSE_PROVIDER: openai\nextensions:\n  developer:\n    enabled: true\n    name: developer\n    type: builtin\n';
  const gooseMerged = upsertYamlBlock(gooseFile, goose, GOOSE_OPTIONS);
  assert.ok(gooseMerged.ok && gooseMerged.changed);
  assert.equal(gooseMerged.text, `GOOSE_PROVIDER: openai\nextensions:\n  ${YAML_BEGIN}\n  darktrace:\n    type: stdio\n    name: "darktrace"\n    enabled: true\n    cmd: "/opt/node/bin/node"\n    args: ["/opt/dt/dist/src/index.js"]\n    timeout: 300\n    envs:\n      DARKTRACE_URL: "https://dt.example.com"\n      DARKTRACE_PROFILES: "read"\n    env_keys: []\n  ${YAML_END}\n  developer:\n    enabled: true\n    name: developer\n    type: builtin\n`);
  const gooseRemoved = removeYamlBlock(gooseMerged.text, GOOSE_OPTIONS);
  assert.ok(gooseRemoved.ok && gooseRemoved.text === gooseFile);
  assert.equal(upsertYamlBlock('extensions:\n  darktrace:\n    cmd: x\n', goose, GOOSE_OPTIONS).ok, false, 'unmanaged darktrace entry');
  assert.equal(upsertYamlBlock('extensions:\n  - a\n', goose, GOOSE_OPTIONS).ok, false, 'list under a map key');
});

test('Continue and Goose files are written with backup, preserved mode and a paste snippet on refusal', () => {
  const { home, ctx } = sandbox('linux');
  const entry = buildServerEntry(settings(home));
  mkdirSync(join(home, '.continue'));
  writeFileSync(join(home, '.continue/config.yaml'), 'name: Local\nmcpServers:\n  - name: other\n    command: other\n');
  const cont = installClient('continue', entry, ctx, opts);
  assert.equal(cont.status, 'written', cont.detail);
  assert.ok(cont.backup && existsSync(cont.backup));
  const text = readFileSync(join(home, '.continue/config.yaml'), 'utf8');
  assert.ok(text.includes(YAML_BEGIN) && text.includes('- name: other'));
  assert.equal(installClient('continue', entry, ctx, opts).status, 'unchanged');
  assert.equal(removeClient('continue', ctx, { dryRun: false }).status, 'written');
  assert.equal(readFileSync(join(home, '.continue/config.yaml'), 'utf8'), 'name: Local\nmcpServers:\n  - name: other\n    command: other\n');
  // Goose: a new file is created owner-only with the extensions key.
  const goose = installClient('goose', entry, ctx, opts);
  assert.equal(goose.status, 'written', goose.detail);
  assert.equal(mode(goose.file as string), 0o600);
  assert.match(readFileSync(goose.file as string, 'utf8'), /^extensions:\n  # >>> darktrace-mcp setup/);
  // An unmanaged darktrace entry is never rewritten; the snippet is offered instead.
  writeFileSync(join(home, '.config/goose/config.yaml'), 'extensions:\n  darktrace:\n    cmd: mine\n');
  const refused = installClient('goose', entry, ctx, opts);
  assert.equal(refused.status, 'manual');
  assert.ok(refused.snippet?.startsWith('# Merge into'));
  assert.ok(refused.snippet?.includes('extensions:\n  darktrace:'));
  assert.equal(readFileSync(join(home, '.config/goose/config.yaml'), 'utf8'), 'extensions:\n  darktrace:\n    cmd: mine\n');
});

test('config <client> works for every client id and prints the LM Studio and Kiro links', async () => {
  const box = sandbox('darwin');
  for (const id of CLIENT_IDS) {
    const out = collector();
    const code = await runCli(['config', id, '--url', 'https://dt.example.com'], { ctx: box.ctx, stdin: stdinFrom(''), stdout: out.stream, stderr: out.stream, execPath: '/opt/node/bin/node', entryPath: '/opt/dt/dist/src/index.js' });
    assert.equal(code, 0, `${id}: ${out.text()}`);
    assert.ok(out.text().includes('private-token'), id);
    assert.equal(out.text().includes('<private token>'), false, id);
  }
  const entry = buildServerEntry(settings(box.home));
  const lm = new URL(lmstudioInstallLink(entry));
  assert.equal(lm.protocol, 'lmstudio:');
  assert.equal(lm.searchParams.get('name'), 'darktrace');
  assert.deepEqual(JSON.parse(Buffer.from(lm.searchParams.get('config') as string, 'base64').toString('utf8')), { command: '/opt/node/bin/node', args: ['/opt/darktrace-mcp/dist/src/index.js'], env: entry.env });
  const kiro = new URL(kiroInstallLink(entry));
  assert.equal(kiro.origin + kiro.pathname, 'https://kiro.dev/launch/mcp/add');
  const kiroConfig = JSON.parse(kiro.searchParams.get('config') as string);
  assert.deepEqual([kiroConfig.command, kiroConfig.disabled, kiroConfig.autoApprove], ['/opt/node/bin/node', false, []]);
  const snippet = clientSnippet('continue', entry, box.ctx);
  assert.match(snippet, /^# Merge into .*\.continue\/config\.yaml under "mcpServers"/);
});
