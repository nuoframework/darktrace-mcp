// Build a Claude Desktop extension bundle (.mcpb, formerly .dxt) without extra dependencies.
// Layout: manifest.json, package.json, LICENSE, dist/src/**, production node_modules/**.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateRawSync } from 'node:zlib';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const SENSITIVE_ENV = ['DARKTRACE_PUBLIC_TOKEN', 'DARKTRACE_PRIVATE_TOKEN'];

/** Shape checks for the bundle manifest; returns a list of problems (empty when valid). */
export function checkManifest(manifest, pkg) {
  const problems = [];
  const need = (cond, msg) => { if (!cond) problems.push(msg); };
  need(['0.3', '0.4'].includes(manifest.manifest_version), 'manifest_version must be 0.3 or 0.4');
  for (const key of ['name', 'version', 'description']) need(typeof manifest[key] === 'string' && manifest[key].length > 0, key + ' is required');
  need(typeof manifest.author?.name === 'string', 'author.name is required');
  if (pkg) need(manifest.version === pkg.version, 'manifest version must match package.json');
  const server = manifest.server ?? {};
  need(server.type === 'node', 'server.type must be node');
  need(server.entry_point === 'dist/src/index.js', 'entry_point must be dist/src/index.js');
  need(server.mcp_config?.command === 'node', 'mcp_config.command must be node');
  need(JSON.stringify(server.mcp_config?.args) === JSON.stringify(['${__dirname}/dist/src/index.js']), 'mcp_config.args must use ${__dirname}');
  const env = server.mcp_config?.env ?? {};
  for (const name of Object.keys(env)) need(/^DARKTRACE_(URL|PUBLIC_TOKEN|PRIVATE_TOKEN|PROFILES)$/.test(name), 'unexpected env ' + name);
  for (const [name, value] of Object.entries(env)) {
    const match = /^\$\{user_config\.([a-z_]+)\}$/.exec(value);
    need(match !== null, name + ' must come from user_config');
    const option = match ? manifest.user_config?.[match[1]] : undefined;
    need(option !== undefined, name + ' references a missing user_config entry');
    if (option) {
      need(option.type === 'string' && typeof option.title === 'string' && typeof option.description === 'string', match[1] + ' needs type string, title, description');
      if (SENSITIVE_ENV.includes(name)) need(option.sensitive === true && option.required === true, name + ' must be sensitive and required');
    }
  }
  return problems;
}

/** Minimal ZIP writer (deflate, UTF-8 names, unix modes). Entries: [{ name, data: Buffer, mode }]. */
export function createZip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  // Fixed DOS timestamp (1980-01-01) keeps archives reproducible.
  const dosTime = 0, dosDate = (0 << 9) | (1 << 5) | 1;
  for (const { name, data, mode = 0o644 } of entries) {
    const nameBytes = Buffer.from(name, 'utf8');
    const compressed = deflateRawSync(data, { level: 9 });
    const useDeflate = compressed.length < data.length;
    const body = useDeflate ? compressed : data;
    const crc = crc32(data) >>> 0;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(useDeflate ? 8 : 0, 8); local.writeUInt16LE(dosTime, 10); local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(body.length, 18); local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26); local.writeUInt16LE(0, 28);
    locals.push(local, nameBytes, body);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE((3 << 8) | 20, 4); central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8); central.writeUInt16LE(useDeflate ? 8 : 0, 10); central.writeUInt16LE(dosTime, 12);
    central.writeUInt16LE(dosDate, 14); central.writeUInt32LE(crc, 16); central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(data.length, 24); central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(((0o100000 | mode) << 16) >>> 0, 38); central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBytes);
    offset += 30 + nameBytes.length + body.length;
  }
  const centralSize = centrals.reduce((n, b) => n + b.length, 0);
  if (entries.length > 0xffff || offset > 0xffffffff) throw new Error('archive too large for a non-ZIP64 writer');
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}

function listFiles(dir, base = dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full, base));
    else if (entry.isFile()) out.push(relative(base, full).split(sep).join('/'));
  }
  return out;
}

/** Top-level production packages from the lockfile (dev-only packages excluded). */
export function productionPackages(lock) {
  return Object.entries(lock.packages ?? {})
    .filter(([key, value]) => key.startsWith('node_modules/') && !key.slice('node_modules/'.length).includes('/node_modules/') && value.dev !== true)
    .map(([key]) => key);
}

function main() {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
  const problems = checkManifest(manifest, pkg);
  if (problems.length) { console.error('manifest.json problems:\n- ' + problems.join('\n- ')); process.exit(1); }
  if (!process.argv.includes('--skip-build')) {
    const build = spawnSync(process.execPath, ['scripts/build.mjs'], { cwd: root, stdio: 'inherit' });
    if (build.status !== 0) process.exit(build.status ?? 1);
  }
  const lockFile = existsSync(join(root, 'npm-shrinkwrap.json')) ? 'npm-shrinkwrap.json' : 'package-lock.json';
  const lock = JSON.parse(readFileSync(join(root, lockFile), 'utf8'));
  const stage = mkdtempSync(join(tmpdir(), 'darktrace-mcpb-'));
  try {
    cpSync(join(root, 'dist/src'), join(stage, 'dist/src'), { recursive: true, filter: (p) => !p.endsWith('.d.ts') });
    for (const key of productionPackages(lock)) {
      if (!existsSync(join(root, key))) throw new Error('missing production dependency ' + key + '; run npm ci --ignore-scripts');
      cpSync(join(root, key), join(stage, key), { recursive: true, dereference: false });
    }
    const runtimePkg = { name: pkg.name, version: pkg.version, private: true, type: pkg.type, license: pkg.license,
      engines: pkg.engines, bin: pkg.bin, dependencies: pkg.dependencies };
    writeFileSync(join(stage, 'package.json'), JSON.stringify(runtimePkg, null, 2) + '\n');
    writeFileSync(join(stage, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    cpSync(join(root, 'LICENSE'), join(stage, 'LICENSE'));
    const files = listFiles(stage);
    const entries = files.map((name) => ({ name, data: readFileSync(join(stage, name)), mode: name === 'dist/src/index.js' ? 0o755 : (statSync(join(stage, name)).mode & 0o111 ? 0o755 : 0o644) }));
    mkdirSync(join(root, 'release'), { recursive: true });
    const target = join(root, 'release', `darktrace-mcp-${pkg.version}.mcpb`);
    const zip = createZip(entries);
    writeFileSync(target, zip);
    console.log(JSON.stringify({ bundle: relative(root, target), files: files.length, bytes: zip.length,
      sha256: createHash('sha256').update(zip).digest('hex') }));
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
