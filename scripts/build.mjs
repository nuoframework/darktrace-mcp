import { spawnSync } from 'node:child_process';
import { chmodSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
function run(args) {
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
// Only generated output is removed; a failed build must not leave stale runtime files.
rmSync(new URL('../dist/', import.meta.url), { recursive: true, force: true });
run(['node_modules/typescript/bin/tsc', '-p', 'tsconfig.generate.json']);
run(['dist/scripts/generate-catalogue.js']);
run(['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json']);
const { generateCoverage } = await import('../dist/src/coverage/report.js');
const coverage = JSON.stringify(generateCoverage(), null, 2) + '\n';
writeFileSync(new URL('../src/coverage/report.generated.json', import.meta.url), coverage);
writeFileSync(new URL('../dist/src/coverage/report.generated.json', import.meta.url), coverage);
chmodSync(new URL('../dist/src/index.js', import.meta.url), 0o755);
