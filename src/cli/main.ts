import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import type { Readable, Writable } from 'node:stream';
import {
  CLIENT_IDS, clientLabel, clientSnippet, isClientId, removeClient, type CliContext, type ClientId, type ClientResult,
} from './clients.js';
import {
  SENSITIVE_WRITE_NOTICE, SetupInputError, buildServerEntry, cursorInstallLink, kiroInstallLink, lmstudioInstallLink, needsSensitiveWriteAck, defaultEntryPath,
  normalizeProfiles, normalizeUrl, validateImage, vscodeInstallLink, vscodeInstallPayload, type InstallSettings, type Runtime,
} from './entry.js';
import { findOnPath, InstallerFileError } from './fsutil.js';
import { existingFixedCopyEntry, isTransientInstall } from './install.js';
import { PromptAbortedError } from './prompt.js';
import { printResults, runSetup } from './setup.js';
import { purgeSetup, readSavedSetup, tokenPaths } from './state.js';
import { isDateFormat, runOnlineTest } from './online.js';
import { runUninstall } from './uninstall.js';
import { createUi, detectUi, type Ui } from './ui.js';
import type { DateFormat } from '../config/schema.js';

export class UsageError extends Error {
  constructor(message: string) { super(message); this.name = 'UsageError'; }
}

interface Parsed { readonly command: string; readonly positional: string[]; readonly flags: Map<string, string[]> }

const VALUE_FLAGS = new Set(['--client', '--url', '--profiles', '--runtime', '--image', '--date-format']);
const BOOLEAN_FLAGS = new Set(['--dry-run', '--yes', '-y', '--tokens-from-stdin', '--inline-tokens-windows', '--acknowledge-sensitive-write', '--purge', '--insiders', '--online', '--offline', '--pull', '--all', '--keep-copies', '--docker']);
const ALLOWED: Readonly<Record<string, readonly string[]>> = {
  setup: ['--dry-run', '--yes', '-y', '--client', '--url', '--profiles', '--runtime', '--image', '--pull', '--tokens-from-stdin', '--inline-tokens-windows', '--acknowledge-sensitive-write',
    '--date-format', '--offline'],
  config: ['--url', '--profiles', '--runtime', '--image', '--insiders', '--acknowledge-sensitive-write', '--date-format'],
  remove: ['--client', '--dry-run', '--yes', '-y', '--purge', '--all', '--keep-copies', '--docker'],
  uninstall: ['--dry-run', '--yes', '-y', '--keep-copies', '--docker'],
  test: [],
  doctor: ['--online'],
};

/** Strict parser. Option values are never echoed in errors, so a mistyped secret cannot leak to a terminal log. */
export function parseCliArgs(argv: readonly string[]): Parsed {
  const [command, ...rest] = argv;
  const allowed = ALLOWED[command];
  if (allowed === undefined) throw new UsageError('unknown command');
  const flags = new Map<string, string[]>();
  const positional: string[] = [];
  for (let i = 0; i < rest.length; i++) {
    const raw = rest[i];
    if (!raw.startsWith('-')) { positional.push(raw); continue; }
    const eq = raw.indexOf('=');
    const name = eq > 0 ? raw.slice(0, eq) : raw;
    if (/token|secret|password|key/i.test(name) && !BOOLEAN_FLAGS.has(name)) throw new UsageError('credentials are never accepted as flags; use the hidden prompt or --tokens-from-stdin');
    if (!allowed.includes(name)) throw new UsageError(`option not supported by "${command}"`);
    if (VALUE_FLAGS.has(name)) {
      const value = eq > 0 ? raw.slice(eq + 1) : rest[++i];
      if (value === undefined || value === '') throw new UsageError(`${name} needs a value`);
      flags.set(name, [...(flags.get(name) ?? []), value]);
    } else {
      if (eq > 0) throw new UsageError(`${name} takes no value`);
      flags.set(name, ['true']);
    }
  }
  return { command, positional, flags };
}

const one = (p: Parsed, name: string): string | undefined => {
  const values = p.flags.get(name);
  if (values !== undefined && values.length > 1) throw new UsageError(`${name} may be given once`);
  return values?.[0];
};
const bool = (p: Parsed, ...names: string[]): boolean => names.some((n) => p.flags.has(n));

function clientsFlag(p: Parsed): ClientId[] | undefined {
  const values = p.flags.get('--client');
  if (values === undefined) return undefined;
  const ids = values.flatMap((v) => v.split(',')).map((v) => v.trim()).filter(Boolean);
  if (ids.length === 1 && ids[0] === 'all') return [...CLIENT_IDS];
  for (const id of ids) if (!isClientId(id)) throw new UsageError(`unknown client; choose from ${CLIENT_IDS.join(', ')}`);
  return ids as ClientId[];
}

function runtimeFlag(p: Parsed): Runtime | undefined {
  const value = one(p, '--runtime');
  if (value === undefined) return undefined;
  if (value !== 'node' && value !== 'docker') throw new UsageError('--runtime must be node or docker');
  return value;
}

function dateFormatFlag(p: Parsed): DateFormat | undefined {
  const value = one(p, '--date-format');
  if (value === undefined) return undefined;
  if (!isDateFormat(value)) throw new UsageError('--date-format must be compact or spaced');
  return value;
}

export interface CliIo {
  readonly ctx: CliContext;
  readonly stdin: Readable & { isTTY?: boolean };
  readonly stdout: Writable;
  readonly stderr: Writable;
  readonly execPath: string;
  readonly entryPath: string;
  readonly uid?: number;
  readonly gid?: number;
  /** Terminal presentation (colours, spinners); plain text when absent. */
  readonly ui?: Ui;
}

export function defaultCliIo(): CliIo {
  return {
    ctx: {
      home: homedir(), platform: process.platform, env: process.env, now: () => new Date(),
      run: (command, args) => {
        const r = spawnSync(command, [...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60_000, shell: false });
        return { status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
      },
      runDocker: (command, args, options) => {
        // docker pull streams its progress to the terminal and may take minutes on a slow link.
        const stream = options?.stream === true;
        const r = spawnSync(command, [...args], {
          encoding: 'utf8', stdio: stream ? ['ignore', 'inherit', 'inherit'] : ['ignore', 'pipe', 'pipe'], timeout: stream ? 30 * 60_000 : 60_000, shell: false,
        });
        return { status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
      },
    },
    stdin: process.stdin, stdout: process.stdout, stderr: process.stderr, execPath: process.execPath,
    entryPath: defaultEntryPath(import.meta.url),
    ui: createUi(detectUi(process.env, process.stdout, process.platform)),
    ...(typeof process.getuid === 'function' && typeof process.getgid === 'function' ? { uid: process.getuid(), gid: process.getgid() } : {}),
  };
}

function configCommand(p: Parsed, io: CliIo): number {
  const [client] = p.positional;
  if (p.positional.length !== 1 || !isClientId(client)) {
    throw new UsageError(`usage: darktrace-mcp config <client>; clients: ${CLIENT_IDS.join(', ')}`);
  }
  const saved = readSavedSetup(io.ctx);
  const runtime = runtimeFlag(p) ?? saved?.runtime ?? 'node';
  const imageFlag = one(p, '--image');
  // Through npx the running path is transient: prefer the fixed copy that `setup` installs.
  const transient = runtime === 'node' && isTransientInstall(io.entryPath, io.ctx);
  const fixedEntry = transient ? existingFixedCopyEntry(io.entryPath, io.ctx) : undefined;
  const profiles = one(p, '--profiles') !== undefined ? normalizeProfiles(one(p, '--profiles') as string) : saved?.profiles ?? 'read';
  const acknowledged = bool(p, '--acknowledge-sensitive-write') || saved?.acknowledgeSensitiveWrite === true;
  const dateFormat = dateFormatFlag(p) ?? saved?.dateFormat;
  if (needsSensitiveWriteAck(profiles) && !acknowledged) {
    io.stderr.write(`${SENSITIVE_WRITE_NOTICE}\n`);
    throw new UsageError(`profiles "${profiles}" need --acknowledge-sensitive-write after reading the notice above (or use read-write / read-sensitive)`);
  }
  const settings: InstallSettings = {
    url: one(p, '--url') !== undefined ? normalizeUrl(one(p, '--url') as string) : saved?.url ?? 'https://darktrace.example.internal',
    profiles,
    acknowledgeSensitiveWrite: acknowledged,
    // The format `setup` probed travels with every printed entry; without one the server default (compact) applies.
    ...(dateFormat === undefined ? {} : { dateFormat }),
    runtime,
    tokenMode: io.ctx.platform === 'win32' && runtime === 'node' ? 'inline' : 'file',
    ...tokenPaths(io.ctx),
    nodePath: io.execPath,
    entryPath: fixedEntry ?? io.entryPath,
    ...(runtime === 'docker' ? {
      dockerPath: findOnPath('docker', io.ctx.env, io.ctx.platform) ?? '/absolute/path/to/docker',
      image: imageFlag !== undefined ? validateImage(imageFlag) : saved?.image ?? 'REPLACE_WITH_IMAGE_ID_FROM_DARKTRACE_MCP_SETUP',
      uid: io.uid && io.uid > 0 ? io.uid : 1000, gid: io.gid && io.gid > 0 ? io.gid : 1000, hostPlatform: io.ctx.platform,
    } : {}),
  };
  const entry = buildServerEntry(settings);
  const out = io.stdout;
  out.write(`# ${clientLabel(client)} — darktrace MCP server (no secrets below)\n`);
  if (saved === undefined && one(p, '--url') === undefined) out.write('# No saved setup: replace the placeholder URL, and create the token files (see `darktrace-mcp setup`).\n');
  if (transient && fixedEntry === undefined) out.write('# Running from the npx cache: the path below is temporary. Run `darktrace-mcp setup` once to install a fixed copy.\n');
  if (needsSensitiveWriteAck(profiles)) out.write(SENSITIVE_WRITE_NOTICE.split('\n').map((line) => `# ${line}\n`).join('') + '# Acknowledged: the entry sets DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE=true.\n');
  if (runtime === 'docker') {
    if (imageFlag === undefined && saved?.image !== undefined) {
      out.write(`# Docker image ID saved by setup: ${saved.image}${saved.imageReference ? ` (from ${saved.imageReference})` : ''}\n`);
      if (saved.imageDigest) out.write(`# Registry digest: ${saved.imageDigest} (compare with the GitHub Release notes)\n`);
    } else if (imageFlag === undefined) {
      out.write('# No saved image: run `darktrace-mcp setup --runtime docker` to pull the image and record its ID, or pass --image sha256:<ID>.\n');
    }
  }
  if (settings.tokenMode === 'inline') out.write('# Windows: replace <public token>/<private token>; anyone able to read this config can use the tokens.\n');
  out.write(clientSnippet(client, entry, io.ctx));
  if (client === 'vscode' && runtime === 'node') {
    out.write('\n# One-click install (VS Code prompts for both tokens and keeps them in its secret storage):\n');
    out.write(vscodeInstallLink(entry, bool(p, '--insiders')) + '\n');
    out.write('# Equivalent command line:\n');
    out.write(`code --add-mcp '${JSON.stringify(vscodeInstallPayload(entry)).replace(/'/g, `'\\''`)}'\n`);
  }
  if (client === 'cursor') {
    out.write('\n# One-click install link (uses the token-file paths above):\n');
    out.write(cursorInstallLink(entry) + '\n');
  }
  if (client === 'lmstudio') {
    out.write('\n# One-click install link (uses the token-file paths above):\n');
    out.write(lmstudioInstallLink(entry) + '\n');
  }
  if (client === 'kiro') {
    out.write('\n# One-click install link (opens kiro.dev, which hands the entry to Kiro; it asks before writing):\n');
    out.write(kiroInstallLink(entry) + '\n');
  }
  if (client === 'jetbrains' && saved !== undefined) {
    out.write('\n# Shortcut: with Claude Desktop already configured by setup, use "Import from Claude" in the same settings page.\n');
  }
  return 0;
}

function removeCommand(p: Parsed, io: CliIo): number {
  if (p.positional.length > 0) throw new UsageError('remove takes --client <name>, not positional arguments');
  const ids = clientsFlag(p) ?? [...CLIENT_IDS];
  const dryRun = bool(p, '--dry-run');
  const results: ClientResult[] = [];
  for (const id of ids) {
    try { results.push(removeClient(id, io.ctx, { dryRun })); }
    catch (error) { results.push({ client: id, status: 'failed', detail: error instanceof Error ? error.message : 'failed' }); }
  }
  printResults(io, results.filter((r) => r.status !== 'absent' || clientsFlag(p) !== undefined), io.ui);
  if (results.every((r) => r.status === 'absent')) io.stdout.write('No darktrace entries found.\n');
  if (bool(p, '--purge')) {
    if (dryRun) io.stdout.write('Would delete stored token files and setup state.\n');
    else for (const file of purgeSetup(io.ctx)) io.stdout.write(`Deleted ${file}\n`);
  }
  return results.some((r) => r.status === 'failed') ? 1 : 0;
}

export async function runCli(argv: readonly string[], io: CliIo = defaultCliIo()): Promise<number> {
  try {
    const p = parseCliArgs(argv);
    switch (p.command) {
      case 'setup': {
        if (p.positional.length > 0) throw new UsageError('setup takes no positional arguments');
        return await runSetup({
          dryRun: bool(p, '--dry-run'), yes: bool(p, '--yes', '-y'), clients: clientsFlag(p), url: one(p, '--url'),
          profiles: one(p, '--profiles'), runtime: runtimeFlag(p), image: one(p, '--image'), pull: bool(p, '--pull'),
          tokensFromStdin: bool(p, '--tokens-from-stdin'), inlineTokens: bool(p, '--inline-tokens-windows'),
          acknowledgeSensitiveWrite: bool(p, '--acknowledge-sensitive-write'),
          dateFormat: dateFormatFlag(p), offline: bool(p, '--offline'),
        }, io);
      }
      case 'config': return configCommand(p, io);
      case 'remove':
        if (!bool(p, '--all')) {
          if (bool(p, '--keep-copies', '--docker')) throw new UsageError('--keep-copies and --docker belong to `remove --all` (or `uninstall`)');
          return removeCommand(p, io);
        }
        if (p.flags.has('--client') || bool(p, '--purge')) throw new UsageError('remove --all already covers every client and the stored tokens');
      // falls through: `remove --all` is `uninstall`
      case 'uninstall':
        if (p.positional.length > 0) throw new UsageError(`${p.command} takes no positional arguments`);
        return await runUninstall({ dryRun: bool(p, '--dry-run'), yes: bool(p, '--yes', '-y'), keepCopies: bool(p, '--keep-copies'), docker: bool(p, '--docker') }, io);
      case 'test':
      case 'doctor':
        if (p.positional.length > 0) throw new UsageError(`${p.command} takes no positional arguments`);
        return await runOnlineTest(io.ctx, io.stdout, { uid: io.uid, gid: io.gid, ui: io.ui });
      default: throw new UsageError('unknown command');
    }
  } catch (error) {
    // Every failure ends with the next action, and never with a value the operator typed.
    const ui = io.ui ?? createUi();
    const command = argv[0] ?? 'setup';
    if (error instanceof UsageError) { io.stderr.write(ui.fail(`Usage error: ${error.message}. Run --help.\n`) + `Next: darktrace-mcp --help lists every option of "${command}".\n`); return 2; }
    if (error instanceof PromptAbortedError) { io.stderr.write(ui.fail(`Setup error: ${error.message}\n`) + 'Next: rerun `darktrace-mcp setup` in an interactive terminal, or pass --yes with --url and --tokens-from-stdin.\n'); return 1; }
    if (error instanceof SetupInputError || error instanceof InstallerFileError) {
      io.stderr.write(ui.fail(`Setup error: ${error.message}\n`) + `Next: fix the item above and rerun \`darktrace-mcp ${command}\` (add --dry-run to preview without writing).\n`); return 1;
    }
    const code = typeof (error as NodeJS.ErrnoException)?.code === 'string' ? ` (${(error as NodeJS.ErrnoException).code})` : '';
    io.stderr.write(ui.fail(`Unexpected installer error${code}; no secret was printed.\n`) + `Next: rerun \`darktrace-mcp ${command} --dry-run\` to inspect the planned changes, then report the error code.\n`);
    return 1;
  }
}
