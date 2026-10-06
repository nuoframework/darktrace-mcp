import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildServerEntry, cursorInstallLink, vscodeInstallLink, normalizeProfiles, normalizeUrl } from '../../src/cli/entry.js';
import { sandbox } from './helpers.js';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const entry = buildServerEntry({
  url: 'https://dt.example.com', profiles: 'read', runtime: 'node', tokenMode: 'file',
  publicTokenFile: '/home/u/.config/darktrace-mcp/public-token', privateTokenFile: '/home/u/.config/darktrace-mcp/private-token',
  nodePath: '/usr/bin/node', entryPath: '/opt/dt/dist/src/index.js',
});

test('VS Code install link carries password inputs instead of token files or values', () => {
  const link = vscodeInstallLink(entry);
  assert.ok(link.startsWith('vscode:mcp/install?'));
  const payload = JSON.parse(decodeURIComponent(link.slice('vscode:mcp/install?'.length)));
  assert.equal(payload.name, 'darktrace');
  assert.equal(payload.type, 'stdio');
  assert.equal(payload.command, '/usr/bin/node');
  assert.deepEqual(payload.args, ['/opt/dt/dist/src/index.js']);
  assert.equal(payload.env.DARKTRACE_PUBLIC_TOKEN, '${input:darktrace-public-token}');
  assert.equal(payload.env.DARKTRACE_PRIVATE_TOKEN, '${input:darktrace-private-token}');
  assert.equal('DARKTRACE_PUBLIC_TOKEN_FILE' in payload.env, false);
  assert.deepEqual(payload.inputs.map((i: { id: string; type: string; password: boolean }) => [i.id, i.type, i.password]),
    [['darktrace-public-token', 'promptString', true], ['darktrace-private-token', 'promptString', true]]);
  assert.ok(vscodeInstallLink(entry, true).startsWith('vscode-insiders:mcp/install?'));
});

test('Cursor deeplink is base64 JSON of the server object with token-file paths', () => {
  const link = cursorInstallLink(entry);
  const url = new URL(link);
  assert.equal(url.protocol, 'cursor:');
  assert.equal(link.startsWith('cursor://anysphere.cursor-deeplink/mcp/install?'), true);
  assert.equal(url.searchParams.get('name'), 'darktrace');
  const config = JSON.parse(Buffer.from(url.searchParams.get('config') as string, 'base64').toString('utf8'));
  assert.deepEqual(config, { command: '/usr/bin/node', args: ['/opt/dt/dist/src/index.js'], env: entry.env });
  assert.equal(config.env.DARKTRACE_PRIVATE_TOKEN_FILE, '/home/u/.config/darktrace-mcp/private-token');
});

test('URL and profile normalization follow the server rules', () => {
  assert.equal(normalizeUrl(' https://Dt.Example.com/ '), 'https://dt.example.com');
  for (const bad of ['http://dt.example.com', 'https://u:p@dt.example.com', 'https://dt.example.com/api', 'https://dt.example.com/?a=1', 'not a url']) {
    assert.throws(() => normalizeUrl(bad), bad);
  }
  assert.equal(normalizeProfiles('read'), 'read');
  assert.equal(normalizeProfiles('read-write'), 'read,write');
  assert.equal(normalizeProfiles('all'), 'all');
  assert.equal(normalizeProfiles('read, sensitive'), 'read,sensitive');
  assert.equal(normalizeProfiles('read,all'), 'all');
  assert.throws(() => normalizeProfiles('read,email'));
  assert.throws(() => normalizeProfiles('read,read'));
});

test('MCPB manifest declares node server, ${__dirname} entry and sensitive required tokens', async () => {
  const mod = await import(pathToFileURL(join(root, 'scripts/build-mcpb.mjs')).href) as {
    checkManifest(m: unknown, p?: unknown): string[];
    createZip(e: Array<{ name: string; data: Buffer; mode?: number }>): Buffer;
    productionPackages(lock: unknown): string[];
  };
  const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  assert.deepEqual(mod.checkManifest(manifest, pkg), []);
  assert.equal(manifest.server.type, 'node');
  assert.equal(manifest.server.mcp_config.env.DARKTRACE_PUBLIC_TOKEN, '${user_config.public_token}');
  assert.equal(manifest.user_config.private_token.sensitive, true);
  assert.equal(manifest.user_config.profiles.default, 'read');
  const broken = structuredClone(manifest);
  broken.user_config.private_token.sensitive = false;
  broken.server.mcp_config.env.DARKTRACE_TLS_INSECURE = 'true';
  const problems = mod.checkManifest(broken, pkg).join('\n');
  assert.match(problems, /DARKTRACE_PRIVATE_TOKEN must be sensitive and required/);
  assert.match(problems, /unexpected env DARKTRACE_TLS_INSECURE/);
  const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
  const prod = mod.productionPackages(lock);
  assert.ok(prod.includes('node_modules/zod'));
  assert.equal(prod.includes('node_modules/typescript'), false, 'dev dependencies stay out of the bundle');

  // The ZIP writer output is readable by an independent implementation.
  const zip = mod.createZip([{ name: 'manifest.json', data: Buffer.from('{"a":1}'.repeat(50)) }, { name: 'dist/src/index.js', data: Buffer.from('x'), mode: 0o755 }]);
  const dir = mkdtempSync(join(tmpdir(), 'darktrace-zip-'));
  writeFileSync(join(dir, 'a.mcpb'), zip);
  const py = spawnSync('python3', ['-c', 'import zipfile,sys,json;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;print(json.dumps({i.filename:[len(z.read(i)),(i.external_attr>>16)&0o777] for i in z.infolist()}))', join(dir, 'a.mcpb')], { encoding: 'utf8' });
  if (py.error === undefined && py.status !== null) {
    assert.equal(py.status, 0, py.stderr);
    assert.deepEqual(JSON.parse(py.stdout), { 'manifest.json': [350, 0o644], 'dist/src/index.js': [1, 0o755] });
  }
});

test('compiled CLI dispatches installer commands and keeps legacy argument policy', () => {
  const cli = join(root, 'dist/src/index.js');
  const box = sandbox();
  const env = { HOME: box.home, PATH: box.bin };
  const help = spawnSync(process.execPath, [cli, '--help'], { encoding: 'utf8', env });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /setup \[--dry-run\]/);
  const config = spawnSync(process.execPath, [cli, 'config', 'cursor', '--url', 'https://dt.example.com'], { encoding: 'utf8', env });
  assert.equal(config.status, 0, config.stderr);
  assert.match(config.stdout, /cursor:\/\/anysphere\.cursor-deeplink\/mcp\/install\?name=darktrace&config=/);
  assert.match(config.stdout, /"DARKTRACE_PUBLIC_TOKEN_FILE"/);
  const unknown = spawnSync(process.execPath, [cli, 'config', 'nope'], { encoding: 'utf8', env });
  assert.equal(unknown.status, 2);
  const legacy = spawnSync(process.execPath, [cli, 'setupx'], { encoding: 'utf8', env });
  assert.equal(legacy.status, 2);
  const nothing = spawnSync(process.execPath, [cli, 'test'], { encoding: 'utf8', env });
  assert.equal(nothing.status, 1);
  assert.match(nothing.stdout, /darktrace-mcp setup/);
});
