import { cpSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const snapshot = mkdtempSync(join(tmpdir(), 'darktrace-mcp-defense-'));
for (const name of ['src', 'test', 'scripts', 'openapi', 'docs', 'examples']) cpSync(join(root, name), join(snapshot, name), { recursive: true, filter: path => !path.includes('/test/security/evidence') });
for (const name of ['package.json', 'tsconfig.json', 'tsconfig.generate.json', 'README.md', 'README.en.md']) cpSync(join(root, name), join(snapshot, name));
symlinkSync(join(root, 'node_modules'), join(snapshot, 'node_modules'), 'dir');
function hashes(dir, prefix = '') {
  const out = {}; for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = prefix + entry.name, path = join(dir, entry.name);
    if (entry.isDirectory()) Object.assign(out, hashes(path, relative + '/'));
    else if (entry.isFile()) out[relative] = createHash('sha256').update(readFileSync(path)).digest('hex');
  } return out;
}
const env = { PATH: process.env.PATH, NODE_EXTRA_CA_CERTS: join(snapshot, 'test/security/fixtures/ca.pem') };
const runBinary = (binary,args) => {
  const result = spawnSync(binary, args, { cwd: snapshot, env, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
  return { command: [binary, ...args], status: result.status, error: result.error?.message, stdout: result.stdout, stderr: result.stderr };
};
const run = args => runBinary(process.execPath,args);
const sourceHashes = hashes(join(snapshot, 'src'));
const report = { date: new Date().toISOString(), snapshot, node: process.version, platform: process.platform, arch: process.arch, sourceHashes, sourceTreeSha256: createHash('sha256').update(JSON.stringify(sourceHashes)).digest('hex'), build: run(['scripts/build.mjs']) };
if (report.build.status === 0) {
  report.runtimeHashes = hashes(join(snapshot, 'dist/src'));
  if (process.argv.includes('--capture-contracts')) {
    const { profiles, toolContract, digest } = await import(pathToFileURL(join(snapshot, 'test/security/mcp-contracts.mjs')));
    const contracts = {};
    for (const [name, profile] of Object.entries(profiles)) { const tools = await toolContract(profile); contracts[name] = { sha256: digest(tools), tools }; }
    // Explicit capture only. Normal test runs never update the reviewed oracle.
    writeFileSync(join(root, 'test/security/fixtures/mcp-tool-contracts.json'), JSON.stringify({ canonicalization: 'Recursive sorted object keys; preserve array order; SHA-256 UTF-8 JSON', contracts }, null, 2) + '\n');
    console.log(JSON.stringify({ snapshot, contracts: Object.fromEntries(Object.entries(contracts).map(([name, value]) => [name, value.sha256])) }));
  } else {
    report.targeted = run(['--import', './dist/test/security/test-runtime-argv.js', '--test', '--test-reporter=spec', 'test/security/mcp-defense.test.mjs']);
    report.standard = runBinary('npm',['test']);
    report.builtSourceHashes = hashes(join(snapshot,'src'));
    report.runtimeHashes = hashes(join(snapshot,'dist/src'));
    report.harnessHashes = Object.fromEntries(Object.entries(hashes(join(snapshot, 'test/security'))).filter(([name]) => !name.startsWith('evidence/')));
    const evidence = join(root, 'test/security/evidence'); mkdirSync(evidence, { recursive: true });
    const target = join(evidence, 'mcp-defense-' + report.date.replace(/[:.]/g, '-') + '.json');
    writeFileSync(target, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ snapshot, evidence: target, sourceTreeSha256: report.sourceTreeSha256, build: report.build.status, targeted: report.targeted.status, standard: report.standard.status }));
    console.log(report.targeted.stdout, report.targeted.stderr, report.standard.stdout, report.standard.stderr);
  }
} else console.log(report.build.stdout, report.build.stderr);
process.exitCode = report.build.status !== 0 ? report.build.status ?? 1 : report.targeted?.status !== undefined && report.targeted.status !== 0 ? 1 : report.standard?.status !== undefined && report.standard.status !== 0 ? 1 : 0;
