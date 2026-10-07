import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runSetup } from '../../src/cli/setup.js';
import { runUpdate, currentInstall, listFixedCopies, type UpdateArgs } from '../../src/cli/update.js';
import { runCli, parseCliArgs, UsageError } from '../../src/cli/main.js';
import { runOnlineTest, updateAvailableLine } from '../../src/cli/online.js';
import { runUninstall } from '../../src/cli/uninstall.js';
import { IMAGE_REPOSITORY } from '../../src/cli/docker.js';
import { compareVersions, fetchTextBounded, resolveVersion } from '../../src/cli/registry.js';
import { readSavedSetup } from '../../src/cli/state.js';
import { createLinePrompter } from '../../src/cli/prompt.js';
import { PACKAGE_NAME } from '../../src/cli/install.js';
import type { CliContext, ExecOptions, RunResult } from '../../src/cli/clients.js';
import { sandbox, collector, stdinFrom, readJson, PUBLIC, PRIVATE, FAKE_ID, DEFAULT_REF, FAKE_DIGEST, type Sandbox } from './helpers.js';

const OLD = '1.1.0';
const NEW = '1.1.3';
const NODE = '/opt/node/bin/node';
const REGISTRY_FLAGS = ['--registry=https://registry.npmjs.org/', '--@nuoframework:registry=https://registry.npmjs.org/'];

/** Fake registry, npm CLI and `node --check-config` for one test: every call is recorded with its working directory. */
interface FakeRegistry {
  latest: string;
  versions: Record<string, { provenance: boolean; deprecated?: string }>;
  install: 'ok' | 'fail';
  signatures: 'ok' | 'invalid' | 'no-attestation';
  attestation: 'ok' | 'invalid' | 'mismatched-digest' | 'missing-rekor';
  corruptPackedTarball: boolean;
  installedTreeIntegrityMatches: boolean;
  checkConfig: 'ok' | 'fail';
  releases: Record<string, string>;
  calls: Array<{ command: string; args: string[]; cwd?: string; env?: NodeJS.ProcessEnv }>;
  fetched: string[];
}
function fakeRegistry(): FakeRegistry {
  return { latest: NEW, versions: { '1.0.0': { provenance: false }, [OLD]: { provenance: true }, [NEW]: { provenance: true } }, install: 'ok', signatures: 'ok', attestation: 'ok', corruptPackedTarball: false, installedTreeIntegrityMatches: true, checkConfig: 'ok',
    releases: { [NEW]: `# Darktrace MCP v${NEW}\n\n- **Update command.** Verified updates with rollback.\n` }, calls: [], fetched: [] };
}

const fakeReleaseFetch = (reg: FakeRegistry) => async (url: string): Promise<string | undefined> => {
  const version = /\/tags\/v([^/]+)$/.exec(url)?.[1];
  return version && reg.releases[version] !== undefined ? JSON.stringify({ tag_name: `v${version}`, body: reg.releases[version] }) : undefined;
};
const dockerReleaseBody = (version: string, digest: string): string => `### ${IMAGE_REPOSITORY}\n\n\`\`\`\n${IMAGE_REPOSITORY}:${version}\n${digest}\nlinux/amd64 sha256:${'a'.repeat(64)}\nlinux/arm64 sha256:${'b'.repeat(64)}\n\`\`\`\nPin clients to the digest: darktrace-mcp setup --runtime docker --image ${digest}\n`;

const tarballBytes = (version: string): Buffer => Buffer.from(`${PACKAGE_NAME}@${version}`);
const integrityFor = (version: string): string => `sha512-${createHash('sha512').update(tarballBytes(version)).digest('base64')}`;

/** Package tree the way npm lays it out: our package plus locked dependencies under one node_modules. */
function writeTree(root: string, version: string): string {
  const pkg = join(root, 'node_modules', '@nuoframework', 'darktrace-mcp');
  mkdirSync(join(pkg, 'dist', 'src', 'cli'), { recursive: true });
  writeFileSync(join(pkg, 'package.json'), JSON.stringify({ name: PACKAGE_NAME, version, bin: { 'darktrace-mcp': 'dist/src/index.js' } }));
  writeFileSync(join(pkg, 'dist', 'src', 'index.js'), `#!/usr/bin/env node\n// ${version}\n`, { mode: 0o755 });
  writeFileSync(join(pkg, 'dist', 'src', 'cli', 'entry.js'), '');
  for (const dep of ['zod', '@modelcontextprotocol/server', '@modelcontextprotocol/core']) {
    mkdirSync(join(root, 'node_modules', dep), { recursive: true });
    writeFileSync(join(root, 'node_modules', dep, 'package.json'), JSON.stringify({ name: dep, version: '0.0.0' }));
  }
  return join(pkg, 'dist', 'src', 'index.js');
}

function fakeExec(reg: FakeRegistry): NonNullable<CliContext['exec']> {
  return (command: string, args: readonly string[], options?: ExecOptions): RunResult => {
    reg.calls.push({ command, args: [...args], ...(options?.cwd ? { cwd: options.cwd } : {}), ...(options?.env ? { env: options.env } : {}) });
    const fail = (stderr: string): RunResult => ({ status: 1, stdout: '', stderr });
    if (command.endsWith('/npm')) {
      if (!REGISTRY_FLAGS.every((flag) => args.includes(flag))) return fail('npm error registry not fixed');
      if (options?.cwd === undefined || !existsSync(join(options.cwd, '.npmrc')) || readFileSync(join(options.cwd, '.npmrc'), 'utf8') !== '') return fail('npm error project config not isolated');
      if (args[0] === 'view') {
        const spec = String(args[1]).slice(PACKAGE_NAME.length + 1);
        const version = reg.versions[spec === 'latest' ? reg.latest : spec] ? (spec === 'latest' ? reg.latest : spec) : undefined;
        if (version === undefined) return fail(`npm error code E404\nnpm error 404 No match found for version ${spec}`);
        const record: Record<string, string> = { version, 'dist.integrity': integrityFor(version) };
        if (reg.versions[version].provenance) record['dist.attestations.url'] = `https://registry.npmjs.org/-/npm/v1/attestations/${encodeURIComponent(PACKAGE_NAME)}@${version}`;
        if (reg.versions[version].deprecated) record.deprecated = reg.versions[version].deprecated;
        return { status: 0, stdout: JSON.stringify(record, null, 2) + '\n', stderr: '' };
      }
      if (args[0] === 'pack') {
        const spec = args.find((arg) => arg.startsWith(`${PACKAGE_NAME}@`));
        const version = spec?.slice(PACKAGE_NAME.length + 1);
        const destination = args.find((arg) => arg.startsWith('--pack-destination='))?.slice('--pack-destination='.length);
        if (version === undefined || destination === undefined || reg.versions[version] === undefined) return fail('npm error invalid pack request');
        const name = `darktrace-mcp-${version}.tgz`;
        writeFileSync(join(destination, name), reg.corruptPackedTarball ? Buffer.from('wrong tarball') : tarballBytes(version));
        return { status: 0, stdout: JSON.stringify([{ filename: name }]), stderr: '' };
      }
      if (args[0] === 'install') {
        if (reg.install === 'fail' || options?.cwd === undefined) return fail('npm error network request to https://registry.npmjs.org failed');
        const spec = args.find((arg) => arg.startsWith(`${PACKAGE_NAME}@`));
        const version = spec?.slice(PACKAGE_NAME.length + 1);
        if (version === undefined) return fail('npm error package spec missing');
        if (reg.versions[version] === undefined) return fail('npm error code E404');
        assert.ok(args.includes('--ignore-scripts') && args.includes('--omit=dev') && args.includes('--no-bin-links'), 'download flags');
        writeTree(options.cwd, version);
        writeFileSync(join(options.cwd, 'package-lock.json'), JSON.stringify({ packages: { [`node_modules/${PACKAGE_NAME}`]: { integrity: reg.installedTreeIntegrityMatches ? integrityFor(version) : `sha512-${'A'.repeat(86)}==` } } }));
        return { status: 0, stdout: '\nadded 4 packages in 1s\n', stderr: '' };
      }
      if (args[0] === 'audit' && args[1] === 'signatures') {
        if (reg.signatures === 'invalid') return fail('npm error 1 package has an invalid registry signature:\nnpm error @nuoframework/darktrace-mcp@1.1.3');
        return { status: 0, stdout: `audited 4 packages in 1s\n\n4 packages have verified registry signatures\n${reg.signatures === 'ok' ? '\n1 package has a verified attestation\n' : ''}`, stderr: '' };
      }
      return fail('npm error unexpected npm call');
    }
    if (command.endsWith('/gh') && args[0] === 'attestation' && args[1] === 'verify') {
      if (!args.includes('--repo') || args[args.indexOf('--repo') + 1] !== 'nuoframework/darktrace-mcp' ||
          !args.includes('--signer-workflow') || args[args.indexOf('--signer-workflow') + 1] !== 'nuoframework/darktrace-mcp/.github/workflows/release.yml' ||
          !args.includes('--cert-oidc-issuer') || args[args.indexOf('--cert-oidc-issuer') + 1] !== 'https://token.actions.githubusercontent.com' ||
          !args.includes('--predicate-type') || args[args.indexOf('--predicate-type') + 1] !== 'https://slsa.dev/provenance/v1' ||
          !args.includes('--digest-alg') || args[args.indexOf('--digest-alg') + 1] !== 'sha256' || !args.includes('--format=json') ||
          !args.includes(`https://github.com/nuoframework/darktrace-mcp/.github/workflows/release.yml@refs/tags/v${NEW}`)) return fail('wrong provenance identity');
      if (reg.attestation === 'invalid') return fail('no matching attestations found for the artifact digest');
      const digest = createHash('sha256').update(readFileSync(String(args[2]))).digest('hex');
      const result = {
        verificationResult: {
          statement: { subject: [{ digest: { sha256: reg.attestation === 'mismatched-digest' ? '0'.repeat(64) : digest } }] },
          verifiedTimestamps: reg.attestation === 'missing-rekor' ? [{ type: 'RFC3161', uri: 'https://tsa.example.test' }]
            : [{ type: 'Tlog', uri: 'https://rekor.sigstore.dev', timestamp: '2026-10-07T00:00:00Z' }],
        },
      };
      return { status: 0, stdout: JSON.stringify([result]), stderr: '' };
    }
    if (command === NODE && args[1] === '--check-config') {
      return reg.checkConfig === 'ok' ? { status: 0, stdout: '{"ok":true,"transport":"stdio","registeredTools":15}\n', stderr: '' } : fail('{"event":"startup_error","reason":"token file unreadable"}');
    }
    return { status: 125, stdout: '', stderr: 'unexpected exec call\n' };
  };
}

interface Installed { box: Sandbox; ctx: CliContext; reg: FakeRegistry; oldEntry: string; cursorFile: string; codexFile: string; data: string; claude: () => boolean; knobs: { failClaudeAddContaining?: string } }

/**
 * A completed node setup from the npx cache at OLD (fixed copy registered) into Cursor, Codex (file) and Claude Code
 * (CLI; `claude mcp get darktrace` answers 0 once added), plus a fake registry that publishes NEW.
 */
async function installed(options: { appliance?: Parameters<typeof sandbox>[2]; dateFormat?: 'compact' } = {}): Promise<Installed> {
  const box = sandbox('linux', ['claude', 'npm', 'npx', 'gh'], options.appliance);
  const reg = fakeRegistry();
  let claudeRegistered = false;
  const knobs: Installed['knobs'] = {};
  const ctx: CliContext = {
    ...box.ctx,
    run: (command, args) => {
      if (command.endsWith('/claude') && args[0] === 'mcp') {
        if (args[1] === 'add' && knobs.failClaudeAddContaining !== undefined && args.includes(knobs.failClaudeAddContaining)) return { status: 1, stdout: '', stderr: 'claude: cannot write ~/.claude.json\n' };
        if (args[1] === 'add') claudeRegistered = true;
        if (args[1] === 'remove') claudeRegistered = false;
        if (args[1] === 'get') return { status: claudeRegistered ? 0 : 1, stdout: '', stderr: claudeRegistered ? '' : 'No MCP server found with name: darktrace\n' };
      }
      return box.ctx.run(command, args);
    },
    exec: fakeExec(reg),
    fetchText: async (url) => { reg.fetched.push(url); return fakeReleaseFetch(reg)(url); },
  };
  const npx = join(box.home, '.npm', '_npx', 'a1b2c3d4e5f60718');
  const transientEntry = writeTree(npx, OLD);
  mkdirSync(join(npx, 'node_modules', '.bin'));
  symlinkSync(transientEntry, join(npx, 'node_modules', '.bin', 'darktrace-mcp'));
  writeFileSync(join(npx, 'package.json'), '{}');
  mkdirSync(join(box.home, '.cursor'));
  const out = collector();
  const io = { ctx, stdin: stdinFrom(`${PUBLIC}\n${PRIVATE}\n`), stdout: out.stream, execPath: NODE, entryPath: transientEntry, uid: 501, gid: 20 };
  assert.equal(await runSetup({ dryRun: false, yes: true, url: 'https://dt.example.com', tokensFromStdin: true, inlineTokens: false, clients: ['cursor', 'codex', 'claude-code'],
    ...(options.dateFormat ? { dateFormat: options.dateFormat } : {}) }, io), 0, out.text());
  const data = join(box.home, '.local/share/darktrace-mcp');
  const oldEntry = join(data, OLD, 'node_modules/@nuoframework/darktrace-mcp/dist/src/index.js');
  assert.equal(readSavedSetup(ctx)?.entryPath, oldEntry);
  assert.equal(readSavedSetup(ctx)?.installedVersion, OLD);
  box.calls.length = 0;
  box.probes.length = 0;
  reg.calls.length = 0;
  return { box, ctx, reg, oldEntry, cursorFile: join(box.home, '.cursor/mcp.json'), codexFile: join(box.home, '.codex/config.toml'), data, claude: () => claudeRegistered, knobs };
}

const ARGS: UpdateArgs = { check: false, rollback: false, allowDowngrade: false, dryRun: false, yes: true, json: false };
function uio(inst: Installed, answers?: string[]) {
  const out = collector();
  return { out, io: { ctx: inst.ctx, stdin: stdinFrom(''), stdout: out.stream, execPath: NODE, entryPath: inst.oldEntry, uid: 501, gid: 20, ...(answers ? { prompter: createLinePrompter(answers) } : {}) } };
}
const cliIo = (inst: Installed) => { const out = collector(); return { out, io: { ...uio(inst).io, stdout: out.stream, stderr: out.stream } }; };
const snapshot = (inst: Installed) => ({ cursor: readFileSync(inst.cursorFile, 'utf8'), codex: readFileSync(inst.codexFile, 'utf8'), state: JSON.stringify(readSavedSetup(inst.ctx)) });

test('compareVersions orders releases and pre-releases', () => {
  assert.ok(compareVersions('1.1.3', '1.1.2') > 0);
  assert.ok(compareVersions('1.10.0', '1.9.9') > 0);
  assert.equal(compareVersions('1.1.3', '1.1.3'), 0);
  assert.ok(compareVersions('1.1.3-rc.1', '1.1.3') < 0);
  assert.ok(compareVersions('1.1.3-rc.2', '1.1.3-rc.10') < 0);
  assert.ok(compareVersions('1.1.3-alpha', '1.1.3-alpha.1') < 0);
  assert.ok(compareVersions('1.999999999999999999999999999999999.0', '1.1000000000000000000000000000000000.0') < 0);
  assert.throws(() => compareVersions('1.1', '1.1.3'), /exact/);
});

test('update --yes downloads, verifies, installs a new fixed copy, rewrites every client and keeps the previous copy', async () => {
  const inst = await installed();
  const { out, io } = uio(inst);
  const before = snapshot(inst);
  assert.equal(await runUpdate(ARGS, io), 0, out.text());
  const newEntry = join(inst.data, NEW, 'node_modules/@nuoframework/darktrace-mcp/dist/src/index.js');
  // Order: registry query, tarball, install, signatures, repository attestation, then the new copy's --check-config.
  const kinds = inst.reg.calls.map((c) => (c.command === NODE ? 'check-config' : c.command.endsWith('/gh') ? 'attestation' : c.args[0]));
  assert.deepEqual(kinds, ['view', 'pack', 'install', 'audit', 'attestation', 'check-config']);
  const download = inst.reg.calls[2].cwd as string;
  assert.equal(inst.reg.calls[3].cwd, download);
  assert.equal(existsSync(download), false, 'temporary download removed');
  assert.deepEqual(inst.reg.calls[5].args, [newEntry, '--check-config']);
  assert.equal(inst.reg.calls[5].env?.DARKTRACE_URL, 'https://dt.example.com');
  assert.equal(inst.reg.calls[5].env?.DARKTRACE_PUBLIC_TOKEN_FILE, join(inst.box.home, '.config/darktrace-mcp/public-token'));
  assert.equal(inst.box.probes.length, 1, 'one signed GET /status');
  // Fixed copies: both versions present, no .bin shims.
  assert.ok(existsSync(join(inst.data, NEW, 'node_modules/zod/package.json')));
  assert.ok(existsSync(inst.oldEntry), 'previous copy kept');
  assert.equal(existsSync(join(inst.data, NEW, 'node_modules/.bin')), false);
  assert.deepEqual(listFixedCopies(inst.ctx).map((c) => c.version), [NEW, OLD]);
  // Clients.
  const cursor = readJson(inst.cursorFile).mcpServers.darktrace;
  assert.deepEqual(cursor.args, [newEntry]);
  assert.equal(cursor.command, NODE);
  assert.equal(cursor.env.DARKTRACE_DATE_FORMAT, 'compact');
  assert.ok(readdirSync(join(inst.box.home, '.cursor')).some((f) => f.startsWith('mcp.json.bak-')), 'backup kept');
  assert.ok(readFileSync(inst.codexFile, 'utf8').includes(newEntry));
  assert.ok(!readFileSync(inst.codexFile, 'utf8').includes(inst.oldEntry));
  const claudeAdd = inst.box.calls.find((c) => c.command.endsWith('/claude') && c.args[1] === 'add');
  assert.ok(claudeAdd && claudeAdd.args.includes(newEntry), 'claude mcp add with the new entry');
  assert.ok(!JSON.stringify(readJson(inst.cursorFile)).includes('_npx'));
  // State.
  const saved = readSavedSetup(inst.ctx);
  assert.equal(saved?.installedVersion, NEW);
  assert.equal(saved?.entryPath, newEntry);
  assert.equal(saved?.previousVersion, OLD);
  assert.equal(saved?.previousEntryPath, inst.oldEntry);
  assert.notEqual(before.state, JSON.stringify(saved));
  assert.match(out.text(), /Verified: registry signatures for 4 packages, provenance attestations for 1/);
  assert.match(out.text(), /Summary/);
  assert.match(out.text(), /update --rollback/);
  assert.equal(out.text().includes(PUBLIC) || out.text().includes(PRIVATE), false);
  for (const call of inst.reg.calls.filter((c) => c.command.endsWith('/npm'))) {
    assert.ok(call.args.includes('--strict-ssl=true'));
    assert.ok(call.args.some((arg) => arg.startsWith('--userconfig=')) && call.args.some((arg) => arg.startsWith('--globalconfig=')));
    assert.equal(call.env?.NODE_TLS_REJECT_UNAUTHORIZED, undefined);
    assert.equal(call.env?.npm_config_registry, undefined);
    assert.equal(call.env?.NPM_CONFIG_STRICT_SSL, undefined);
  }

  // Running it again: already up to date, nothing downloaded.
  const again = uio(inst);
  inst.reg.calls.length = 0;
  assert.equal(await runUpdate(ARGS, again.io), 0, again.out.text());
  assert.match(again.out.text(), /Already up to date \(1\.1\.3\)/);
  assert.equal(inst.reg.calls.length, 1);
});

test('update refuses a downgrade unless --allow-downgrade, and never downloads when refusing', async () => {
  const inst = await installed();
  const before = snapshot(inst);
  const refused = cliIo(inst);
  assert.equal(await runCli(['update', '--yes', '--version', '1.0.0'], refused.io), 1);
  assert.match(refused.out.text(), /Update error: 1\.0\.0 is older than the installed 1\.1\.0; downgrades are refused/);
  assert.equal(inst.reg.calls.some((c) => c.args[0] === 'install'), false);
  assert.deepEqual(snapshot(inst), before);
  const allowed = cliIo(inst);
  assert.equal(await runCli(['update', '--yes', '--version', '1.0.0', '--allow-downgrade'], allowed.io), 0, allowed.out.text());
  assert.equal(readSavedSetup(inst.ctx)?.installedVersion, '1.0.0');
  assert.deepEqual(readJson(inst.cursorFile).mcpServers.darktrace.args, [join(inst.data, '1.0.0/node_modules/@nuoframework/darktrace-mcp/dist/src/index.js')]);
  // 1.0.0 publishes no provenance: npm's missing attestation is not an error for it.
  assert.match(allowed.out.text(), /provenance not published/);
});

test('a failed appliance probe, signature check or --check-config leaves every client entry and the state untouched', async () => {
  // Probe fails (setup skipped it with --date-format).
  const probe = await installed({ appliance: { compact: 'auth', spaced: 'auth' }, dateFormat: 'compact' });
  let before = snapshot(probe);
  let { out, io } = cliIo(probe);
  assert.equal(await runCli(['update', '--yes'], io), 1);
  assert.match(out.text(), /appliance check \(signed GET \/status\) failed: auth/);
  assert.match(out.text(), /Client entries were not changed/);
  assert.deepEqual(snapshot(probe), before);
  assert.ok(existsSync(join(probe.data, NEW)), 'verified copy kept for a rerun');
  assert.equal(probe.box.calls.some((c) => c.command.endsWith('/claude') && c.args[1] === 'add'), false);

  const provenanceStripped = await installed();
  provenanceStripped.reg.versions[NEW].provenance = false;
  ({ out, io } = cliIo(provenanceStripped));
  assert.equal(await runCli(['update', '--yes'], io), 1);
  assert.match(out.text(), /must have npm provenance metadata/);
  assert.equal(provenanceStripped.reg.calls.some((c) => c.args[0] === 'pack' || c.args[0] === 'install'), false);
  const checkWithoutProvenance = cliIo(provenanceStripped);
  assert.equal(await runCli(['update', '--check'], checkWithoutProvenance.io), 1);
  assert.match(checkWithoutProvenance.out.text(), /wait until the registry publishes provenance for this release/);
  assert.doesNotMatch(checkWithoutProvenance.out.text(), /Run: npx -y/);

  // Registry metadata integrity is checked against the downloaded tarball before npm installs it.
  const mismatch = await installed();
  mismatch.reg.corruptPackedTarball = true;
  ({ out, io } = cliIo(mismatch));
  assert.equal(await runCli(['update', '--yes'], io), 1);
  assert.match(out.text(), /downloaded tarball does not match registry metadata integrity/);
  assert.equal(mismatch.reg.calls.some((c) => c.args[0] === 'install'), false);
  assert.equal(existsSync(join(mismatch.data, NEW)), false);

  const installedIntegrityMismatch = await installed();
  installedIntegrityMismatch.reg.installedTreeIntegrityMatches = false;
  ({ out, io } = cliIo(installedIntegrityMismatch));
  assert.equal(await runCli(['update', '--yes'], io), 1);
  assert.match(out.text(), /installed package integrity does not match registry metadata/);
  assert.equal(installedIntegrityMismatch.reg.calls.some((c) => c.args[0] === 'audit'), false);
  assert.equal(existsSync(join(installedIntegrityMismatch.data, NEW)), false);

  // npm may verify an attestation signature, but the exact artifact still needs the repository/workflow identity.
  const wrongRepository = await installed();
  wrongRepository.reg.attestation = 'invalid';
  ({ out, io } = cliIo(wrongRepository));
  assert.equal(await runCli(['update', '--yes'], io), 1);
  assert.match(out.text(), /GitHub could not verify the tarball for repository nuoframework\/darktrace-mcp and workflow release.yml/);
  assert.equal(existsSync(join(wrongRepository.data, NEW)), false);
  assert.equal(existsSync(wrongRepository.reg.calls[2].cwd as string), false, 'temporary tree removed on failed provenance');

  for (const invalid of ['mismatched-digest', 'missing-rekor'] as const) {
    const tamperedAttestation = await installed();
    tamperedAttestation.reg.attestation = invalid;
    ({ out, io } = cliIo(tamperedAttestation));
    assert.equal(await runCli(['update', '--yes'], io), 1);
    assert.match(out.text(), /did not return a verified matching tarball digest and transparency-log timestamp/);
    assert.equal(existsSync(join(tamperedAttestation.data, NEW)), false);
  }

  // Invalid registry signature: nothing installed at all.
  const bad = await installed();
  bad.reg.signatures = 'invalid';
  before = snapshot(bad);
  ({ out, io } = cliIo(bad));
  assert.equal(await runCli(['update', '--yes'], io), 1);
  assert.match(out.text(), /npm audit signatures rejected the downloaded tree \(npm said: 1 package has an invalid registry signature/);
  assert.equal(existsSync(join(bad.data, NEW)), false);
  assert.deepEqual(snapshot(bad), before);
  assert.equal(bad.box.probes.length, 0);

  // Provenance announced by the registry but no attestation verified.
  const missing = await installed();
  missing.reg.signatures = 'no-attestation';
  ({ out, io } = cliIo(missing));
  assert.equal(await runCli(['update', '--yes'], io), 1);
  assert.match(out.text(), /announces provenance for this version but npm verified no attestation/);
  assert.equal(existsSync(join(missing.data, NEW)), false);

  // New copy fails its own --check-config.
  const broken = await installed();
  broken.reg.checkConfig = 'fail';
  before = snapshot(broken);
  ({ out, io } = cliIo(broken));
  assert.equal(await runCli(['update', '--yes'], io), 1);
  assert.match(out.text(), /--check-config failed \(\{"event":"startup_error"/);
  assert.deepEqual(snapshot(broken), before);
  assert.equal(broken.box.probes.length, 0, 'no appliance request after a failed local check');
});

test('update --rollback returns to the previous copy and swaps the pointers; a missing copy is refused', async () => {
  const inst = await installed();
  assert.equal(await runUpdate(ARGS, uio(inst).io), 0);
  const newEntry = readSavedSetup(inst.ctx)?.entryPath as string;
  const plan = uio(inst);
  assert.equal(await runUpdate({ ...ARGS, rollback: true, dryRun: true }, plan.io), 0, plan.out.text());
  assert.match(plan.out.text(), /Previous:\s+1\.1\.0/);
  assert.deepEqual(readJson(inst.cursorFile).mcpServers.darktrace.args, [newEntry]);
  inst.reg.calls.length = 0;
  inst.box.probes.length = 0;
  const { out, io } = uio(inst);
  assert.equal(await runUpdate({ ...ARGS, rollback: true }, io), 0, out.text());
  assert.match(out.text(), /Rollback restarts the previously recorded code, which may restore security issues fixed in newer releases/);
  assert.deepEqual(readJson(inst.cursorFile).mcpServers.darktrace.args, [inst.oldEntry]);
  assert.ok(readFileSync(inst.codexFile, 'utf8').includes(inst.oldEntry));
  assert.deepEqual(inst.reg.calls.map((c) => c.args[1]), ['--check-config'], 'offline check of the previous copy, no registry');
  assert.equal(inst.box.probes.length, 0);
  const saved = readSavedSetup(inst.ctx);
  assert.equal(saved?.installedVersion, OLD);
  assert.equal(saved?.entryPath, inst.oldEntry);
  assert.equal(saved?.previousVersion, NEW);
  assert.equal(saved?.previousEntryPath, newEntry);
  assert.ok(existsSync(newEntry), 'the newer copy stays for a second rollback');
  assert.match(out.text(), /rolled|restored/i);

  // Rolling back again returns to NEW; then delete that copy and refuse.
  assert.equal(await runUpdate({ ...ARGS, rollback: true }, uio(inst).io), 0);
  assert.equal(readSavedSetup(inst.ctx)?.installedVersion, NEW);
  rmSync(join(inst.data, OLD), { recursive: true });
  const before = snapshot(inst);
  const refused = cliIo(inst);
  assert.equal(await runCli(['update', '--rollback', '--yes'], refused.io), 1);
  assert.match(refused.out.text(), /previous copy of 1\.1\.0 is no longer present/);
  assert.deepEqual(snapshot(inst), before);
  const none = cliIo(inst);
  writeFileSync(join(inst.box.home, '.config/darktrace-mcp/setup.json'), JSON.stringify({ ...readJson(join(inst.box.home, '.config/darktrace-mcp/setup.json')), previousVersion: undefined }));
  assert.equal(await runCli(['update', '--rollback', '--yes'], none.io), 1);
  assert.match(none.out.text(), /nothing to roll back to/);
});

test('saved rollback state rejects writable files and symlinks, and rollback only accepts the recorded fixed-copy path', async () => {
  const inst = await installed();
  const stateFile = join(inst.box.home, '.config/darktrace-mcp/setup.json');
  const original = readFileSync(stateFile, 'utf8');
  chmodSync(stateFile, 0o666);
  assert.equal(readSavedSetup(inst.ctx), undefined, 'group or other writable state is not trusted');
  chmodSync(stateFile, 0o600);
  const linkedState = join(inst.box.home, 'outside-setup.json');
  writeFileSync(linkedState, original, { mode: 0o600 });
  rmSync(stateFile);
  symlinkSync(linkedState, stateFile);
  assert.equal(readSavedSetup(inst.ctx), undefined, 'setup.json symlinks are not followed');
  rmSync(stateFile);
  writeFileSync(stateFile, original, { mode: 0o600 });

  assert.equal(await runUpdate(ARGS, uio(inst).io), 0);
  const outsideEntry = writeTree(join(inst.box.home, 'untrusted-copy'), OLD);
  const tampered = readJson(stateFile);
  tampered.previousEntryPath = outsideEntry;
  writeFileSync(stateFile, JSON.stringify(tampered));
  chmodSync(stateFile, 0o600);
  const rollback = cliIo(inst);
  assert.equal(await runCli(['update', '--rollback', '--yes'], rollback.io), 1);
  assert.match(rollback.out.text(), /no longer present in the verified fixed-copy store/);
  assert.deepEqual(readJson(inst.cursorFile).mcpServers.darktrace.args, [join(inst.data, NEW, 'node_modules/@nuoframework/darktrace-mcp/dist/src/index.js')]);
});

test('update --dry-run prints the plan and downloads nothing; without --yes a "n" cancels', async () => {
  const inst = await installed();
  const before = snapshot(inst);
  const { out, io } = uio(inst);
  assert.equal(await runUpdate({ ...ARGS, dryRun: true, yes: false }, io), 0, out.text());
  assert.match(out.text(), /Plan \(update 1\.1\.0 -> 1\.1\.3\)/);
  assert.match(out.text(), /npm audit signatures: registry signatures and provenance attestation/);
  assert.match(out.text(), /rewrite the entry in: Claude Code, Codex, Cursor \(backups kept\)/);
  assert.deepEqual(inst.reg.calls.map((c) => c.args[0]), ['view']);
  assert.equal(existsSync(join(inst.data, NEW)), false);
  assert.deepEqual(snapshot(inst), before);
  const declined = uio(inst, ['n']);
  assert.equal(await runUpdate({ ...ARGS, yes: false }, declined.io), 1);
  assert.match(declined.out.text(), /Cancelled/);
  assert.deepEqual(snapshot(inst), before);
  const accepted = uio(inst, ['']);
  assert.equal(await runUpdate({ ...ARGS, yes: false }, accepted.io), 0, accepted.out.text());
  assert.equal(readSavedSetup(inst.ctx)?.installedVersion, NEW);
});

test('update --check compares versions, prints the release notes and exits 1 only when an update exists', async () => {
  const inst = await installed();
  const before = snapshot(inst);
  const { out, io } = cliIo(inst);
  assert.equal(await runCli(['update', '--check'], io), 1);
  assert.match(out.text(), /Installed: 1\.1\.0 \(fixed copy /);
  assert.match(out.text(), /Latest:\s+1\.1\.3 \(registry\.npmjs\.org; provenance published\)/);
  assert.match(out.text(), /Release notes \(https:\/\/github\.com\/nuoframework\/darktrace-mcp\/releases\/tag\/v1\.1\.3\):/);
  assert.match(out.text(), /Update command\.\*\* Verified updates with rollback/);
  assert.match(out.text(), /Update available: 1\.1\.0 -> 1\.1\.3\. Run: npx -y @nuoframework\/darktrace-mcp@1\.1\.3 update/);
  assert.deepEqual(inst.reg.fetched, ['https://api.github.com/repos/nuoframework/darktrace-mcp/releases/tags/v1.1.3']);
  assert.deepEqual(snapshot(inst), before);
  assert.equal(existsSync(join(inst.data, NEW)), false);
  // JSON output: one document, same facts.
  const json = cliIo(inst);
  assert.equal(await runCli(['update', '--check', '--json'], json.io), 1);
  const report = JSON.parse(json.out.text());
  assert.equal(report.status, 'update-available');
  assert.equal(report.current.version, OLD);
  assert.equal(report.target.version, NEW);
  assert.equal(report.target.provenance, true);
  assert.match(report.releaseNotes, /Verified updates/);
  // Up to date: exit 0, no notes fetched.
  inst.reg.latest = OLD;
  inst.reg.fetched.length = 0;
  const same = cliIo(inst);
  assert.equal(await runCli(['update', '--check'], same.io), 0);
  assert.match(same.out.text(), /Up to date/);
  assert.equal(inst.reg.fetched.length, 0);
  // Registry unreachable: exit 1 from the error path with the next step, nothing changed.
  inst.reg.versions = {};
  const offline = cliIo(inst);
  assert.equal(await runCli(['update', '--check'], offline.io), 1);
  assert.match(offline.out.text(), /is not published on registry\.npmjs\.org/);
});

test('release notes strip terminal and bidirectional controls, cap output, and deprecated versions are called out', async () => {
  const inst = await installed();
  inst.reg.releases[NEW] = `visible\u001b]0;spoofed title\u0007\u202e\n${'x'.repeat(7000)}`;
  const notes = cliIo(inst);
  assert.equal(await runCli(['update', '--check'], notes.io), 1);
  assert.equal(/[\u0000-\u0009\u000b-\u001f\u007f-\u009f\u202a-\u202e]/u.test(notes.out.text()), false);
  assert.ok(notes.out.text().length < 8000, 'release note output is capped');

  inst.reg.versions[NEW].deprecated = 'contains a retired\u001b[31m vulnerable release\u202e';
  const deprecated = cliIo(inst);
  assert.equal(await runCli(['update', '--dry-run', '--version', NEW], deprecated.io), 0, deprecated.out.text());
  assert.match(deprecated.out.text(), /This version is deprecated by its publisher: contains a retired vulnerable release/);
  assert.equal(deprecated.out.text().includes('\u202e') || deprecated.out.text().includes('\u001b'), false);
});

test('test and doctor --online print one "Update available" line only when a newer version is published', async () => {
  const inst = await installed();
  const out = collector();
  assert.equal(await runOnlineTest(inst.ctx, out.stream, { uid: 501, gid: 20 }), 0, out.text());
  assert.match(out.text(), /^OK https:\/\/dt\.example\.com answered/m);
  assert.match(out.text(), /^Update available: 1\.1\.0 -> 1\.1\.3\. Run: npx -y @nuoframework\/darktrace-mcp@1\.1\.3 update/m);
  inst.reg.latest = OLD;
  const quiet = collector();
  assert.equal(await runOnlineTest(inst.ctx, quiet.stream, { uid: 501, gid: 20 }), 0);
  assert.doesNotMatch(quiet.text(), /Update available/);
  // Without npm on PATH, or with an unreadable registry answer, the line is simply absent.
  assert.equal(updateAvailableLine({ ...inst.ctx, env: { PATH: '/nonexistent' } }), undefined);
  inst.reg.versions = {};
  assert.equal(updateAvailableLine(inst.ctx), undefined);
});

test('setup --update-mode npx-latest writes npx launchers with the same env, installs no fixed copy, and update has nothing to do', async () => {
  const box = sandbox('linux', ['npx', 'npm']);
  const reg = fakeRegistry();
  const ctx: CliContext = { ...box.ctx, exec: fakeExec(reg) };
  const npx = join(box.home, '.npm', '_npx', 'ffffffffffffffff');
  const transientEntry = writeTree(npx, OLD);
  writeFileSync(join(npx, 'package.json'), '{}');
  mkdirSync(join(box.home, '.cursor'));
  const out = collector();
  const io = { ctx, stdin: stdinFrom(`${PUBLIC}\n${PRIVATE}\n`), stdout: out.stream, stderr: out.stream, execPath: NODE, entryPath: transientEntry, uid: 501, gid: 20 };
  assert.equal(await runCli(['setup', '--yes', '--url', 'https://dt.example.com', '--tokens-from-stdin', '--client', 'cursor', '--update-mode', 'npx-latest'], io), 0, out.text());
  const cursor = readJson(join(box.home, '.cursor/mcp.json')).mcpServers.darktrace;
  assert.equal(cursor.command, join(box.bin, 'npx'));
  assert.deepEqual(cursor.args, ['-y', '@nuoframework/darktrace-mcp@latest']);
  assert.deepEqual(cursor.env, {
    DARKTRACE_URL: 'https://dt.example.com', DARKTRACE_PUBLIC_TOKEN_FILE: join(box.home, '.config/darktrace-mcp/public-token'),
    DARKTRACE_PRIVATE_TOKEN_FILE: join(box.home, '.config/darktrace-mcp/private-token'), DARKTRACE_PROFILES: 'read', DARKTRACE_DATE_FORMAT: 'compact',
  });
  assert.equal(existsSync(join(box.home, '.local/share/darktrace-mcp')), false, 'no fixed copy in npx-latest mode');
  const saved = readSavedSetup(ctx);
  assert.equal(saved?.updateMode, 'npx-latest');
  assert.equal(saved?.entryPath, undefined);
  assert.match(out.text(), /Update mode: always latest/);
  assert.deepEqual(currentInstall(saved!, ctx, transientEntry), { kind: 'npx-latest' });
  // config reprints the same launcher; update explains there is nothing to move; test prints no update line.
  const cfg = collector();
  assert.equal(await runCli(['config', 'cursor'], { ...io, stdout: cfg.stream, stderr: cfg.stream }), 0);
  assert.match(cfg.text(), /@nuoframework\/darktrace-mcp@latest/);
  assert.match(cfg.text(), /always latest/);
  const upd = collector();
  assert.equal(await runCli(['update', '--yes'], { ...io, stdout: upd.stream, stderr: upd.stream }), 0, upd.text());
  assert.match(upd.text(), /nothing to pin or move/);
  assert.equal(reg.calls.length, 0, 'no registry query in npx-latest mode');
  const check = collector();
  assert.equal(await runCli(['update', '--check'], { ...io, stdout: check.stream, stderr: check.stream }), 0, check.text());
  assert.match(check.text(), /Clients resolve @latest when they start; registry latest is 1\.1\.3, so no update command is needed/);
  assert.doesNotMatch(check.text(), /Update available:/);
  assert.deepEqual(reg.calls.map((call) => call.args[0]), ['view']);
  assert.equal(updateAvailableLine(ctx), undefined);
  const doctor = collector();
  assert.equal(await runOnlineTest(ctx, doctor.stream, { uid: 501, gid: 20 }), 0, doctor.text());
  assert.doesNotMatch(doctor.text(), /Update available/);
  const rb = collector();
  assert.equal(await runCli(['update', '--rollback', '--yes'], { ...io, stdout: rb.stream, stderr: rb.stream }), 1);
  assert.match(rb.text(), /no previous version to return to/);
  // The flag is node-only.
  const docker = collector();
  assert.equal(await runCli(['setup', '--yes', '--runtime', 'docker', '--image', FAKE_ID, '--update-mode', 'npx-latest'], { ...io, stdin: stdinFrom(''), stdout: docker.stream, stderr: docker.stream }), 1);
  assert.match(docker.text(), /npx-latest applies to the node runtime only/);
});

test('interactive setup asks for the update mode after the profile; choosing 2 switches to npx-latest, choosing 1 installs the fixed copy', async () => {
  const box = sandbox('linux', ['npx']);
  const npx = join(box.home, '.npm', '_npx', 'eeeeeeeeeeeeeeee');
  const transientEntry = writeTree(npx, OLD);
  writeFileSync(join(npx, 'package.json'), '{}');
  mkdirSync(join(box.home, '.cursor'));
  const cursorChoice = String(['claude-desktop', 'claude-code', 'codex', 'cursor'].indexOf('cursor') + 1);
  const latest = collector();
  // URL, runtime, both tokens, profile, update mode 2, client.
  const latestIo = { ctx: box.ctx, stdin: stdinFrom(''), stdout: latest.stream, execPath: NODE, entryPath: transientEntry, uid: 501, gid: 20,
    prompter: createLinePrompter(['https://dt.example.com', '1', PUBLIC, PRIVATE, '1', '2', cursorChoice]) };
  assert.equal(await runSetup({ dryRun: false, yes: false, tokensFromStdin: false, inlineTokens: false }, latestIo), 0, latest.text());
  assert.match(latest.text(), /Updates: how should new releases reach your clients\?/);
  assert.match(latest.text(), /1\) pinned: stay on 1\.1\.0 until you run `darktrace-mcp update`/);
  assert.deepEqual(readJson(join(box.home, '.cursor/mcp.json')).mcpServers.darktrace.args, ['-y', '@nuoframework/darktrace-mcp@latest']);
  assert.equal(readSavedSetup(box.ctx)?.updateMode, 'npx-latest');
  assert.equal(existsSync(join(box.home, '.local/share/darktrace-mcp')), false);
  // Rerun choosing pinned: the fixed copy is installed and the npx launcher replaced; the saved mode no longer says npx-latest.
  const pinned = collector();
  const pinnedIo = { ...latestIo, stdout: pinned.stream, prompter: createLinePrompter(['https://dt.example.com', '1', '', '1', '1', cursorChoice]) };
  assert.equal(await runSetup({ dryRun: false, yes: false, tokensFromStdin: false, inlineTokens: false }, pinnedIo), 0, pinned.text());
  const fixedEntry = join(box.home, '.local/share/darktrace-mcp', OLD, 'node_modules/@nuoframework/darktrace-mcp/dist/src/index.js');
  assert.match(pinned.text(), /Installed a fixed copy of the package in/);
  assert.deepEqual(readJson(join(box.home, '.cursor/mcp.json')).mcpServers.darktrace.args, [fixedEntry]);
  assert.equal(readSavedSetup(box.ctx)?.updateMode, undefined);
  assert.equal(readSavedSetup(box.ctx)?.entryPath, fixedEntry);
});

test('docker runtime: update pulls the release tag, checks the container, rewrites the image ID and keeps the old one for rollback and uninstall', async () => {
  const box = sandbox('linux', ['docker', 'npm']);
  const reg = fakeRegistry();
  reg.latest = '9.9.0';
  reg.versions['9.9.0'] = { provenance: true };
  reg.versions['9.8.7'] = { provenance: true };
  const NEW_ID = 'sha256:' + '3'.repeat(64);
  const NEW_DIGEST = 'ghcr.io/nuoframework/darktrace-mcp@sha256:' + '4'.repeat(64);
  box.docker.registry.push({ id: NEW_ID, tags: ['ghcr.io/nuoframework/darktrace-mcp:9.9.0'], repoDigests: [NEW_DIGEST] });
  reg.releases['9.9.0'] = dockerReleaseBody('9.9.0', NEW_DIGEST);
  const ctx: CliContext = { ...box.ctx, exec: fakeExec(reg), fetchText: fakeReleaseFetch(reg) };
  mkdirSync(join(box.home, '.cursor'));
  const out = collector();
  const io = { ctx, stdin: stdinFrom(`${PUBLIC}\n${PRIVATE}\n`), stdout: out.stream, stderr: out.stream, execPath: NODE, entryPath: '/opt/darktrace-mcp/dist/src/index.js', uid: 501, gid: 20 };
  assert.equal(await runSetup({ dryRun: false, yes: true, url: 'https://dt.example.com', tokensFromStdin: true, inlineTokens: false, clients: ['cursor'], runtime: 'docker', image: DEFAULT_REF, pull: true }, io), 0, out.text());
  let saved = readSavedSetup(ctx);
  assert.equal(saved?.image, FAKE_ID);
  assert.equal(saved?.installedVersion, '9.8.7');
  const cursorFile = join(box.home, '.cursor/mcp.json');
  assert.equal(readJson(cursorFile).mcpServers.darktrace.args.at(-1), FAKE_ID);
  box.docker.calls.length = 0;
  const STALE_TAG_ID = 'sha256:' + '6'.repeat(64);
  box.docker.local.push({ id: STALE_TAG_ID, tags: ['ghcr.io/nuoframework/darktrace-mcp:9.9.0'], repoDigests: ['ghcr.io/nuoframework/darktrace-mcp@sha256:' + '7'.repeat(64)] });

  reg.releases['9.9.0'] = dockerReleaseBody('9.9.0', 'ghcr.io/nuoframework/darktrace-mcp@sha256:' + '9'.repeat(64));
  const mismatch = collector();
  assert.equal(await runCli(['update', '--yes'], { ...io, stdin: stdinFrom(''), stdout: mismatch.stream, stderr: mismatch.stream }), 1);
  assert.match(mismatch.text(), /does not match the GitHub release record/);
  assert.equal(readJson(cursorFile).mcpServers.darktrace.args.at(-1), FAKE_ID);
  assert.equal(readSavedSetup(ctx)?.image, FAKE_ID);
  reg.releases['9.9.0'] = dockerReleaseBody('9.9.0', NEW_DIGEST);
  box.docker.calls.length = 0;
  const upd = collector();
  assert.equal(await runCli(['update', '--yes'], { ...io, stdin: stdinFrom(''), stdout: upd.stream, stderr: upd.stream }), 0, upd.text());
  const dockerCalls = box.docker.calls.map((c) => c.args.slice(0, 2).join(' '));
  assert.deepEqual(dockerCalls.filter((c) => c !== 'image inspect'), ['version --format', 'pull ghcr.io/nuoframework/darktrace-mcp:9.9.0', 'run --rm']);
  const check = box.docker.calls.find((c) => c.args[0] === 'run') as { args: readonly string[] };
  assert.ok(check.args.includes('--network=none') && check.args.at(-1) === '--check-config' && check.args.includes(NEW_ID), 'container check uses the new image offline');
  assert.equal(readJson(cursorFile).mcpServers.darktrace.args.at(-1), NEW_ID);
  saved = readSavedSetup(ctx);
  assert.equal(saved?.image, NEW_ID);
  assert.equal(saved?.imageDigest, NEW_DIGEST);
  assert.equal(saved?.installedVersion, '9.9.0');
  assert.equal(saved?.previousVersion, '9.8.7');
  assert.equal(saved?.previousImage, FAKE_ID);
  assert.equal(saved?.previousImageDigest, FAKE_DIGEST);
  assert.equal(reg.calls.some((c) => c.args[0] === 'install'), false, 'docker runtime downloads no npm package');
  assert.match(upd.text(), /digest ghcr\.io\/nuoframework\/darktrace-mcp@sha256:4+/);

  const rb = collector();
  assert.equal(await runCli(['update', '--rollback', '--yes'], { ...io, stdin: stdinFrom(''), stdout: rb.stream, stderr: rb.stream }), 0, rb.text());
  assert.equal(readJson(cursorFile).mcpServers.darktrace.args.at(-1), FAKE_ID);
  saved = readSavedSetup(ctx);
  assert.equal(saved?.image, FAKE_ID);
  assert.equal(saved?.installedVersion, '9.8.7');
  assert.equal(saved?.previousImage, NEW_ID);
  assert.equal(saved?.previousVersion, '9.9.0');

  // uninstall --docker removes the current image and the one kept for rollback, nothing else.
  box.docker.local.push({ id: 'sha256:' + '5'.repeat(64), tags: ['other:1'], repoDigests: [] });
  box.docker.calls.length = 0;
  const un = collector();
  assert.equal(await runUninstall({ dryRun: false, yes: true, keepCopies: false, docker: true }, { ctx, stdin: stdinFrom(''), stdout: un.stream }), 0, un.text());
  assert.deepEqual(box.docker.calls.filter((c) => c.args[0] === 'image' && c.args[1] === 'rm').map((c) => c.args[2]), [FAKE_ID, NEW_ID]);
  assert.deepEqual(box.docker.local.map((i) => i.id), ['sha256:' + '5'.repeat(64)]);
});

test('update refuses to proceed for setups it cannot move and explains the right path', async () => {
  // Windows inline tokens: update never reads token values back.
  const win = sandbox('win32', ['npm']);
  const reg = fakeRegistry();
  const winCtx: CliContext = { ...win.ctx, exec: fakeExec(reg) };
  mkdirSync(join(win.home, '.cursor'));
  const out = collector();
  const winIo = { ctx: winCtx, stdin: stdinFrom(`${PUBLIC}\n${PRIVATE}\n`), stdout: out.stream, stderr: out.stream, execPath: 'C:\\node\\node.exe', entryPath: 'C:\\dt\\dist\\src\\index.js', uid: 501, gid: 20 };
  assert.equal(await runSetup({ dryRun: false, yes: true, url: 'https://dt.example.com', tokensFromStdin: true, inlineTokens: true, clients: ['cursor'] }, winIo), 0, out.text());
  const inline = collector();
  assert.equal(await runCli(['update', '--yes'], { ...winIo, stdin: stdinFrom(''), stdout: inline.stream, stderr: inline.stream }), 1);
  assert.match(inline.text(), /Windows inline mode/);
  assert.equal(inline.text().includes(PUBLIC) || inline.text().includes(PRIVATE), false);

  // A checkout entry: no npm download, a git/build hint instead; --check still works.
  const box = sandbox('linux', ['npm']);
  const checkoutCtx: CliContext = { ...box.ctx, exec: fakeExec(fakeRegistry()) };
  const checkout = join(box.home, 'checkout');
  mkdirSync(join(checkout, 'dist/src'), { recursive: true });
  writeFileSync(join(checkout, 'package.json'), JSON.stringify({ name: PACKAGE_NAME, version: OLD }));
  const entry = join(checkout, 'dist/src/index.js');
  mkdirSync(join(box.home, '.cursor'));
  const setupOut = collector();
  const io = { ctx: checkoutCtx, stdin: stdinFrom(`${PUBLIC}\n${PRIVATE}\n`), stdout: setupOut.stream, stderr: setupOut.stream, execPath: NODE, entryPath: entry, uid: 501, gid: 20 };
  assert.equal(await runSetup({ dryRun: false, yes: true, url: 'https://dt.example.com', tokensFromStdin: true, inlineTokens: false, clients: ['cursor'] }, io), 0, setupOut.text());
  assert.deepEqual(currentInstall(readSavedSetup(checkoutCtx)!, checkoutCtx, entry), { kind: 'checkout', version: OLD, entryPath: entry });
  const refused = collector();
  assert.equal(await runCli(['update', '--yes'], { ...io, stdin: stdinFrom(''), stdout: refused.stream, stderr: refused.stream }), 1);
  assert.match(refused.text(), /git pull --ff-only/);
  const check = collector();
  assert.equal(await runCli(['update', '--check'], { ...io, stdin: stdinFrom(''), stdout: check.stream, stderr: check.stream }), 1);
  assert.match(check.text(), /Installed: 1\.1\.0 \(checkout /);

  // No setup at all.
  const empty = sandbox('linux', ['npm']);
  const none = collector();
  assert.equal(await runCli(['update'], { ctx: empty.ctx, stdin: stdinFrom(''), stdout: none.stream, stderr: none.stream, execPath: NODE, entryPath: entry }), 1);
  assert.match(none.text(), /no saved setup found/);
});

test('older setups without an entry path: a single fixed copy is used, several are ambiguous', async () => {
  const box = sandbox('linux', ['npm']);
  const reg = fakeRegistry();
  const ctx: CliContext = { ...box.ctx, exec: fakeExec(reg) };
  mkdirSync(join(box.home, '.config/darktrace-mcp'), { recursive: true, mode: 0o700 });
  writeFileSync(join(box.home, '.config/darktrace-mcp/setup.json'), JSON.stringify({ version: 1, url: 'https://dt.example.com', profiles: 'read', runtime: 'node', tokenMode: 'file' }));
  const data = join(box.home, '.local/share/darktrace-mcp');
  const one = writeTree(join(data, OLD), OLD);
  const saved = readSavedSetup(ctx)!;
  assert.deepEqual(currentInstall(saved, ctx, '/elsewhere/dist/src/index.js'), { kind: 'fixed-copy', version: OLD, entryPath: one, dir: join(data, OLD) });
  writeTree(join(data, '1.0.0'), '1.0.0');
  assert.deepEqual(currentInstall(saved, ctx, '/elsewhere/dist/src/index.js'), { kind: 'unknown' });
  assert.deepEqual(currentInstall(saved, ctx, one), { kind: 'fixed-copy', version: OLD, entryPath: one, dir: join(data, OLD) });
  const out = collector();
  assert.equal(await runCli(['update', '--yes'], { ctx, stdin: stdinFrom(''), stdout: out.stream, stderr: out.stream, execPath: NODE, entryPath: '/elsewhere/dist/src/index.js' }), 1);
  assert.match(out.text(), /fixed-copy directory is ambiguous/);
  assert.equal(existsSync(join(data, NEW)), false);
});

test('registry answers are validated and the registry is never configurable', () => {
  const box = sandbox('linux', ['npm']);
  const reg = fakeRegistry();
  const ctx = { ...box.ctx, exec: fakeExec(reg), env: { ...box.ctx.env, npm_config_registry: 'https://evil.example/', NPM_CONFIG_REGISTRY: 'https://evil.example/scoped',
    NPM_CONFIG_USERCONFIG: '/tmp/attacker.npmrc', npm_config_strict_ssl: 'false', NODE_TLS_REJECT_UNAUTHORIZED: '0', NODE_OPTIONS: '--require=/tmp/attacker.js' } };
  assert.deepEqual(resolveVersion(ctx, 'latest'), { version: NEW, provenance: true, integrity: integrityFor(NEW) });
  const view = reg.calls[0];
  assert.ok(view.args.includes('--registry=https://registry.npmjs.org/') && view.args.includes('--@nuoframework:registry=https://registry.npmjs.org/'));
  assert.ok(view.args.includes('--strict-ssl=true') && view.args.some((arg) => arg.startsWith('--userconfig=')) && view.args.some((arg) => arg.startsWith('--globalconfig=')));
  assert.equal(view.env?.npm_config_registry, undefined);
  assert.equal(view.env?.NPM_CONFIG_REGISTRY, undefined);
  assert.equal(view.env?.NPM_CONFIG_USERCONFIG, undefined);
  assert.equal(view.env?.npm_config_strict_ssl, undefined);
  assert.equal(view.env?.NODE_TLS_REJECT_UNAUTHORIZED, undefined);
  assert.equal(view.env?.NODE_OPTIONS, undefined);
  assert.throws(() => resolveVersion(ctx, '^1'), /exact published version/);
  assert.throws(() => resolveVersion(ctx, '9.9.9'), /is not published/);
  const garbage = { ...ctx, exec: ((): RunResult => ({ status: 0, stdout: '{"version":"../../x"}', stderr: '' })) as CliContext['exec'] };
  assert.throws(() => resolveVersion(garbage, 'latest'), /no usable version/);
  const mismatched = { ...ctx, exec: ((): RunResult => ({ status: 0, stdout: JSON.stringify({ version: '1.2.4', 'dist.integrity': integrityFor('1.2.4') }), stderr: '' })) as CliContext['exec'] };
  assert.throws(() => resolveVersion(mismatched, '1.2.3'), /different version than requested/);
  const oversized = { ...ctx, exec: ((): RunResult => ({ status: 0, stdout: 'x'.repeat(1024 * 1024 + 1), stderr: '' })) as CliContext['exec'] };
  assert.throws(() => resolveVersion(oversized, 'latest'), /exceeded the 1 MiB limit/);
  const noNpm = { ...ctx, env: { PATH: '/nonexistent' } };
  assert.throws(() => resolveVersion(noNpm, 'latest'), /npm is not on PATH/);
});

test('GitHub release fetches stop before network when the Node TLS verification bypass is inherited', async () => {
  const original = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  const originalFetch = globalThis.fetch;
  let calls = 0;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  globalThis.fetch = (async () => { calls++; throw new Error('must not open a socket'); }) as typeof fetch;
  try {
    assert.equal(await fetchTextBounded('https://api.github.com/repos/example/repo', 'test'), undefined);
    assert.equal(calls, 0);
  } finally {
    if (original === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    else process.env.NODE_TLS_REJECT_UNAUTHORIZED = original;
    globalThis.fetch = originalFetch;
  }
});

test('update flags are strict', () => {
  assert.doesNotThrow(() => parseCliArgs(['update', '--check', '--json']));
  assert.doesNotThrow(() => parseCliArgs(['update', '--rollback', '--yes', '--dry-run']));
  assert.throws(() => parseCliArgs(['update', '--version']), UsageError);
  assert.throws(() => parseCliArgs(['update', '--client', 'cursor']), UsageError);
  assert.throws(() => parseCliArgs(['update', '--token', 'x']), UsageError);
  assert.throws(() => parseCliArgs(['setup', '--update-mode']), UsageError);
});

test('update rejects exclusive or malformed combinations with a usage error', async () => {
  const box = sandbox('linux');
  const out = collector();
  const io = { ctx: box.ctx, stdin: stdinFrom(''), stdout: out.stream, stderr: out.stream, execPath: NODE, entryPath: '/opt/darktrace-mcp/dist/src/index.js' };
  assert.equal(await runCli(['update', '--check', '--rollback'], io), 2);
  assert.equal(await runCli(['update', 'now'], io), 2);
  assert.equal(await runCli(['update', '--version', '1.1'], io), 2);
  assert.equal(await runCli(['setup', '--update-mode', 'weekly'], io), 2);
  assert.match(out.text(), /--update-mode must be pinned or npx-latest/);
});

test('a client write failure restores the full launch set; the next update resumes after the bad client is fixed', async () => {
  const inst = await installed();
  writeFileSync(inst.cursorFile, '// my comment\n' + readFileSync(inst.cursorFile, 'utf8'));
  const first = cliIo(inst);
  assert.equal(await runCli(['update', '--yes'], first.io), 1);
  assert.match(first.out.text(), /Settings\s+recovery pending/);
  assert.match(first.out.text(), /Cursor: entry not rewritten/);
  const saved = readSavedSetup(inst.ctx);
  assert.equal(saved?.installedVersion, OLD, 'state still says the previous version');
  assert.equal(saved?.previousVersion, undefined);
  const newEntry = join(inst.data, NEW, 'node_modules/@nuoframework/darktrace-mcp/dist/src/index.js');
  assert.ok(readFileSync(inst.codexFile, 'utf8').includes(inst.oldEntry), 'codex was restored to the previous version');
  assert.ok(readFileSync(inst.cursorFile, 'utf8').includes(inst.oldEntry), 'cursor untouched (JSONC)');
  // Fix the file, rerun: the recovery record is cleared and the verified copy moves every client.
  writeFileSync(inst.cursorFile, readFileSync(inst.cursorFile, 'utf8').replace('// my comment\n', ''));
  const second = cliIo(inst);
  assert.equal(await runCli(['update', '--yes'], second.io), 0, second.out.text());
  assert.match(second.out.text(), /Codex\s+written/);
  assert.deepEqual(readJson(inst.cursorFile).mcpServers.darktrace.args, [newEntry]);
  assert.equal(readSavedSetup(inst.ctx)?.installedVersion, NEW);
  assert.equal(readSavedSetup(inst.ctx)?.previousVersion, OLD);
});

test('a concurrent update is refused while the first one holds the per-HOME lock', async () => {
  const inst = await installed();
  let entered!: () => void;
  let release!: () => void;
  const probeEntered = new Promise<void>((resolve) => { entered = resolve; });
  const gate = new Promise<void>((resolve) => { release = resolve; });
  inst.ctx = { ...inst.ctx, probeStatus: async () => {
    entered();
    await gate;
    return { ok: true, baseUrl: 'https://dt.example.com', dateFormat: 'compact', status: 200, elapsedMs: 1 };
  } };
  const first = cliIo(inst);
  const firstRun = runCli(['update', '--yes'], first.io);
  await probeEntered;
  const second = cliIo(inst);
  assert.equal(await runCli(['update', '--yes'], second.io), 1);
  assert.match(second.out.text(), /another update or rollback is already running/);
  release();
  assert.equal(await firstRun, 0, first.out.text());
});

test('when claude mcp add fails after the remove, the previous entry is registered again', async () => {
  const inst = await installed();
  const newEntry = join(inst.data, NEW, 'node_modules/@nuoframework/darktrace-mcp/dist/src/index.js');
  inst.knobs.failClaudeAddContaining = newEntry;
  const { out, io } = cliIo(inst);
  assert.equal(await runCli(['update', '--yes'], io), 1);
  assert.match(out.text(), /Claude Code\s+failed\s+claude exited with status 1; the previous entry was restored/);
  const adds = inst.box.calls.filter((c) => c.command.endsWith('/claude') && c.args[1] === 'add').map((c) => c.args.at(-1));
  assert.deepEqual(adds, [inst.oldEntry], 'the failing add is not recorded; the restoring add carries the previous entry');
  assert.ok(inst.claude(), 'Claude Code still has an entry');
  assert.equal(readSavedSetup(inst.ctx)?.installedVersion, OLD);
});

test('a directory already present for the target version is replaced by the verified download, never reused', async () => {
  const inst = await installed();
  const stale = join(inst.data, NEW);
  writeTree(stale, NEW);
  const staleEntry = join(stale, 'node_modules/@nuoframework/darktrace-mcp/dist/src/index.js');
  writeFileSync(staleEntry, '#!/usr/bin/env node\n// STALE, never verified\n');
  writeFileSync(join(stale, 'node_modules/extra.txt'), 'left behind');
  const { out, io } = uio(inst);
  assert.equal(await runUpdate(ARGS, io), 0, out.text());
  assert.match(out.text(), /Installed the verified copy in .*\(replaced the directory that was already there\)/);
  assert.equal(readFileSync(staleEntry, 'utf8'), `#!/usr/bin/env node\n// ${NEW}\n`);
  assert.equal(existsSync(join(stale, 'node_modules/extra.txt')), false);
});

test('a saved npx-latest mode never leaks into a docker setup', async () => {
  const box = sandbox('linux', ['npx', 'npm', 'docker']);
  const reg = fakeRegistry();
  reg.latest = '9.9.0';
  reg.versions['9.9.0'] = { provenance: true };
  reg.versions['9.8.7'] = { provenance: true };
  const ctx: CliContext = { ...box.ctx, exec: fakeExec(reg) };
  const npx = join(box.home, '.npm', '_npx', 'dddddddddddddddd');
  const transientEntry = writeTree(npx, OLD);
  writeFileSync(join(npx, 'package.json'), '{}');
  mkdirSync(join(box.home, '.cursor'));
  const out = collector();
  const io = { ctx, stdin: stdinFrom(`${PUBLIC}\n${PRIVATE}\n`), stdout: out.stream, stderr: out.stream, execPath: NODE, entryPath: transientEntry, uid: 501, gid: 20 };
  assert.equal(await runCli(['setup', '--yes', '--url', 'https://dt.example.com', '--tokens-from-stdin', '--client', 'cursor', '--update-mode', 'npx-latest'], io), 0, out.text());
  assert.equal(readSavedSetup(ctx)?.updateMode, 'npx-latest');
  const docker = collector();
  assert.equal(await runCli(['setup', '--yes', '--runtime', 'docker', '--image', DEFAULT_REF, '--pull', '--client', 'cursor'], { ...io, stdin: stdinFrom(''), stdout: docker.stream, stderr: docker.stream }), 0, docker.text());
  const saved = readSavedSetup(ctx);
  assert.equal(saved?.runtime, 'docker');
  assert.equal(saved?.updateMode, undefined, 'docker setups are always pinned');
  assert.equal(saved?.installedVersion, '9.8.7');
  const check = collector();
  assert.equal(await runCli(['update', '--check'], { ...io, stdin: stdinFrom(''), stdout: check.stream, stderr: check.stream }), 1);
  assert.match(check.text(), /Update available: 9\.8\.7 -> 9\.9\.0/);
  assert.doesNotMatch(check.text(), /nothing to pin/);
});

test('docker setups pinned by digest (unknown version) warn instead of skipping silently and still get a rollback point', async () => {
  const box = sandbox('linux', ['docker', 'npm']);
  const reg = fakeRegistry();
  reg.latest = '9.9.0';
  reg.versions['9.9.0'] = { provenance: true };
  const NEW_ID = 'sha256:' + '3'.repeat(64);
  const NEW_DIGEST = 'ghcr.io/nuoframework/darktrace-mcp@sha256:' + '8'.repeat(64);
  box.docker.registry.push({ id: NEW_ID, tags: ['ghcr.io/nuoframework/darktrace-mcp:9.9.0'], repoDigests: [NEW_DIGEST] });
  reg.releases['9.9.0'] = dockerReleaseBody('9.9.0', NEW_DIGEST);
  const ctx: CliContext = { ...box.ctx, exec: fakeExec(reg), fetchText: fakeReleaseFetch(reg) };
  mkdirSync(join(box.home, '.cursor'));
  const out = collector();
  const io = { ctx, stdin: stdinFrom(`${PUBLIC}\n${PRIVATE}\n`), stdout: out.stream, stderr: out.stream, execPath: NODE, entryPath: '/opt/darktrace-mcp/dist/src/index.js', uid: 501, gid: 20 };
  assert.equal(await runSetup({ dryRun: false, yes: true, url: 'https://dt.example.com', tokensFromStdin: true, inlineTokens: false, clients: ['cursor'], runtime: 'docker', image: FAKE_DIGEST, pull: true }, io), 0, out.text());
  assert.equal(readSavedSetup(ctx)?.installedVersion, undefined);
  const upd = collector();
  assert.equal(await runCli(['update', '--yes'], { ...io, stdin: stdinFrom(''), stdout: upd.stream, stderr: upd.stream }), 0, upd.text());
  assert.match(upd.text(), /installed version is unknown .* downgrade check is skipped/);
  let saved = readSavedSetup(ctx);
  assert.equal(saved?.image, NEW_ID);
  assert.equal(saved?.installedVersion, '9.9.0');
  assert.equal(saved?.previousImage, FAKE_ID);
  assert.equal(saved?.previousImageDigest, FAKE_DIGEST);
  assert.equal(saved?.previousVersion, undefined);
  const rb = collector();
  assert.equal(await runCli(['update', '--rollback', '--yes'], { ...io, stdin: stdinFrom(''), stdout: rb.stream, stderr: rb.stream }), 0, rb.text());
  assert.equal(readJson(join(box.home, '.cursor/mcp.json')).mcpServers.darktrace.args.at(-1), FAKE_ID);
  saved = readSavedSetup(ctx);
  assert.equal(saved?.image, FAKE_ID);
  assert.equal(saved?.imageDigest, FAKE_DIGEST);
  assert.equal(saved?.installedVersion, undefined);
  assert.equal(saved?.previousImage, NEW_ID);
  assert.equal(saved?.previousVersion, '9.9.0');
});

test('--json without --yes is refused so no prompt can reach the JSON stream', async () => {
  const inst = await installed();
  const { out, io } = cliIo(inst);
  assert.equal(await runCli(['update', '--json'], io), 2);
  assert.match(out.text(), /--json needs --yes/);
  assert.equal(await runCli(['update', '--json', '--rollback'], io), 2);
  const ok = cliIo(inst);
  assert.equal(await runCli(['update', '--json', '--dry-run'], ok.io), 0);
  assert.equal(JSON.parse(ok.out.text()).status, 'dry-run');
});
