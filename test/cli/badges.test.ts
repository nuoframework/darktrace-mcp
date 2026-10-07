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
  const { BADGE_LABELS, readmeBadgesHtml } = await import(new URL('../../../scripts/install-badges.mjs', import.meta.url).href) as { BADGE_LABELS: Record<'en' | 'es', { cursor: string; vscode: string; insiders: string }>; readmeBadgesHtml: (version: string, labels: { cursor: string; vscode: string; insiders: string }) => string };
  // README.md is Spanish and README.en.md is English; both must carry their language rows.
  const candidates = ['README.md', 'README.en.md'].filter((f) => existsSync(join(root, f))).map((f) => [f, readFileSync(join(root, f), 'utf8')] as const);
  for (const [lang, labels] of Object.entries(BADGE_LABELS)) {
    const rows = readmeBadgesHtml(version, labels).split('\n');
    const carrier = candidates.find(([, text]) => rows.every((line) => text.includes(line)));
    assert.ok(carrier, `no README carries the ${lang} badge rows for ${version} (run: node scripts/install-badges.mjs and paste them)`);
    const hrefs = [...carrier[1].matchAll(/<a href="([^"]+)">/g)].map((match) => match[1].replaceAll('&amp;', '&')).filter((href) => /^https:\/\/(?:cursor\.com\/en\/install-mcp|(?:insiders\.)?vscode\.dev\/redirect\/mcp\/install)\?/.test(href));
    assert.equal(hrefs.length, 3, 'exactly three official HTTPS installation buttons');
    const encodedConfig = (href: string) => href.split('config=')[1].split('&')[0];
    assert.equal(encodedConfig(hrefs[0]), encodedConfig(cursorBadgeLink(version)), 'Cursor encoded JSON is unchanged');
    assert.equal(encodedConfig(hrefs[1]), vscodeBadgeLink(version).split('?')[1], 'VS Code encoded JSON is unchanged');
    assert.equal(encodedConfig(hrefs[2]), vscodeBadgeLink(version, true).split('?')[1], 'Insiders encoded JSON is unchanged');
    assert.equal(new URL(hrefs[2]).searchParams.get('quality'), 'insiders');
    for (const href of hrefs.slice(1)) assert.deepEqual(JSON.parse(new URL(href).searchParams.get('inputs') as string), (vscodeBadgePayload(version) as { inputs: unknown }).inputs, 'HTTPS redirect preserves all input prompts');
  }
});

test('install-badges --write replaces stale badge rows in place and keeps indentation', async () => {
  const { rewriteBadges } = await import(new URL('../../../scripts/install-badges.mjs', import.meta.url).href) as { rewriteBadges(file: string, text: string): { changed: boolean; text: string } };
  const stale = installBadgesMarkdown('0.0.1', { cursor: 'Install in Cursor', vscode: 'Install in VS Code', insiders: 'Install in VS Code Insiders' }).split('\n').map((l) => '    ' + l).join('\n');
  const before = `## Install\n\n2. Run it.\n\n${stale}\n\n3. Restart.\n`;
  const { changed, text } = rewriteBadges('README.en.md', before);
  assert.equal(changed, true);
  assert.equal(text.includes('0.0.1'), false);
  for (const line of installBadgesMarkdown(version, { cursor: 'Install in Cursor', vscode: 'Install in VS Code', insiders: 'Install in VS Code Insiders' }).split('\n')) assert.ok(text.includes('    ' + line));
  assert.equal(rewriteBadges('README.en.md', text).changed, false);
  assert.throws(() => rewriteBadges('README.en.md', '## Install\n'), /expected 3 badge rows/);
});

