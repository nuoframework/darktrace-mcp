// Manual post-run evidence utility, not an auto-generated oracle or test suite.
// Usage: node test/security/writes-evidence.mjs <run-isolated receipt.json>
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { createHash } from 'node:crypto';
const root = resolve(new URL('../../', import.meta.url).pathname);
const path = resolve(process.argv[2]);
const bytes = readFileSync(path), receipt = JSON.parse(bytes);
assert.equal(receipt.receiptComplete, true); assert.equal(receipt.build.status, 0);
assert.deepEqual(receipt.sourceHashes, receipt.builtSourceHashes);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const files = readdirSync(join(root, 'test/security')).filter(name => /^writes.*\.(mjs|py)$/.test(name))
  .map(name => 'test/security/' + name).concat(['test/security/fixtures/writes-hmac-vectors.json']);
const harnessHashes = Object.fromEntries(files.sort().map(file => {
  const local = readFileSync(join(root, file)), built = readFileSync(join(receipt.snapshot, file));
  assert.deepEqual(local, built, 'receipt snapshot differs from final harness: ' + file); return [file, hash(local)];
}));
const counts = cases => ({ tests: cases.length, pass: cases.filter(c => c.status === 'PASSED').length,
  fail: cases.filter(c => c.status === 'FAIL').length, skip: cases.filter(c => c.status === 'BLOCKED').length });
const writes = receipt.subcases.filter(c => /^ST-(?:1[7-9]|2[0-9])\./.test(c.name));
for (const failure of writes.filter(c => c.status === 'FAIL')) assert.match(failure.name, /\[AD-W-/);
const result = { schemaVersion: 1, date: receipt.date, receipt: relative(root, path), receiptSha256: hash(bytes),
  node: receipt.node, platform: receipt.platform, arch: receipt.arch,
  commands: receipt.commands, snapshot: receipt.snapshot, buildStatus: receipt.build.status,
  sourceTreeSha256: receipt.sourceTreeSha256, runtimeTreeSha256: hash(JSON.stringify(receipt.runtimeHashes)),
  runtimeFiles: Object.keys(receipt.runtimeHashes).length, harnessHashes, fixtureHashes: receipt.fixtureHashes,
  assertionInvocations: receipt.assertionInvocations, all: counts(receipt.subcases), writes: counts(writes),
  cases: writes, findingIds: Array.from({ length: 21 }, (_, i) => 'AD-W-' + String(i + 1).padStart(2, '0')),
  externalNetwork: false, applianceAclValidated: false, humanIdentityValidated: false,
  contract: 'docs/security/security-test-plan-writes.md', threats: 'docs/security/threat-model-writes.md' };
const output = join(root, 'test/security/evidence/writes-' + receipt.date.replace(/[:.]/g, '-') + '.json');
writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output, all: result.all, writes: result.writes, assertionInvocations: result.assertionInvocations }));
