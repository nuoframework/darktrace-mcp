import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cursorBadgeLink, installBadgesMarkdown, npxServerEntry, vscodeBadgeLink, vscodeBadgePayload } from '../../src/cli/entry.js';
import { isUnconfigured } from '../../src/config/load.js';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string };

test('badge launcher pins the package version through npx and carries no secret or appliance address', () => {
  const entry = npxServerEntry(version);
  assert.equal(entry.command, 'npx');
  assert.deepEqual(entry.args, ['-y', `@nuoframework/darktrace-mcp@${version}`]);
  assert.deepEqual(entry.env, { DARKTRACE_PROFILES: 'read' });
  // What the client passes to the process is exactly what starts the server in setup mode.
  assert.equal(isUnconfigured({ ...entry.env }), true);
  assert.throws(() => npxServerEntry('latest'), /exact package version/);
  assert.throws(() => npxServerEntry('^1.1.0'), /exact package version/);
});

test('Cursor badge is the documented deeplink with the npx launcher as base64 JSON', () => {
  const link = cursorBadgeLink(version);
  const url = new URL(link);
  assert.equal(link.startsWith('cursor://anysphere.cursor-deeplink/mcp/install?name=darktrace&config='), true);
  const config = JSON.parse(Buffer.from(url.searchParams.get('config') as string, 'base64').toString('utf8'));
  assert.deepEqual(config, { command: 'npx', args: ['-y', `@nuoframework/darktrace-mcp@${version}`], env: { DARKTRACE_PROFILES: 'read' } });
});

test('VS Code badges prompt for URL and both tokens through inputs; tokens are password inputs', () => {
  const payload = vscodeBadgePayload(version) as { env: Record<string, string>; inputs: Array<{ id: string; password: boolean; description: string }>; type: string; command: string; args: string[] };
  assert.equal(payload.type, 'stdio');
  assert.equal(payload.command, 'npx');
  assert.deepEqual(payload.args, ['-y', `@nuoframework/darktrace-mcp@${version}`]);
  assert.deepEqual(payload.env, { DARKTRACE_URL: '${input:darktrace-url}', DARKTRACE_PUBLIC_TOKEN: '${input:darktrace-public-token}', DARKTRACE_PRIVATE_TOKEN: '${input:darktrace-private-token}', DARKTRACE_PROFILES: 'read' });
  assert.deepEqual(payload.inputs.map((i) => [i.id, i.password]), [['darktrace-url', false], ['darktrace-public-token', true], ['darktrace-private-token', true]]);
  assert.ok(payload.inputs.every((i) => !/https?:\/\/[a-z0-9.-]+\.[a-z]/i.test(i.description)), 'no appliance address is suggested');
  const link = vscodeBadgeLink(version);
  assert.ok(link.startsWith('vscode:mcp/install?'));
  assert.deepEqual(JSON.parse(decodeURIComponent(link.slice('vscode:mcp/install?'.length))), payload);
  assert.ok(vscodeBadgeLink(version, true).startsWith('vscode-insiders:mcp/install?'));
});

test('both README languages carry the badge rows generated for the current package version', async () => {
  const { BADGE_LABELS } = await import(new URL('../../../scripts/install-badges.mjs', import.meta.url).href) as { BADGE_LABELS: Record<'en' | 'es', { cursor: string; vscode: string; insiders: string }> };
  // The English and Spanish READMEs may be named README.md / README.es.md or README.en.md / README.md; one file per language must carry its rows.
  const candidates = ['README.md', 'README.en.md', 'README.es.md'].filter((f) => existsSync(join(root, f))).map((f) => [f, readFileSync(join(root, f), 'utf8')] as const);
  for (const [lang, labels] of Object.entries(BADGE_LABELS)) {
    const rows = installBadgesMarkdown(version, labels).split('\n');
    const carrier = candidates.find(([, text]) => rows.every((line) => text.includes(line)));
    assert.ok(carrier, `no README carries the ${lang} badge rows for ${version} (run: node scripts/install-badges.mjs and paste them)`);
  }
});
