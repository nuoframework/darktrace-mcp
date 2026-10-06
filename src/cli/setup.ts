import type { Readable, Writable } from 'node:stream';
import {
  CLIENT_IDS, clientLabel, detectClients, installClient, isClientId, type CliContext, type ClientId, type ClientResult,
} from './clients.js';
import {
  PROFILE_PRESETS, SetupInputError, buildServerEntry, normalizeProfiles, normalizeUrl, validateImage, validateToken,
  type InstallSettings, type Runtime, type TokenMode,
} from './entry.js';
import { findOnPath } from './fsutil.js';
import { installFixedCopy, isTransientInstall } from './install.js';
import { createLinePrompter, createTtyPrompter, readStdinLines, type Prompter } from './prompt.js';
import { readSavedSetup, setupDir, tokenFilesUsable, tokenPaths, writeSavedSetup, writeTokenFiles } from './state.js';

export interface SetupArgs {
  readonly dryRun: boolean;
  readonly yes: boolean;
  readonly clients?: readonly ClientId[];
  readonly url?: string;
  readonly profiles?: string;
  readonly runtime?: Runtime;
  readonly image?: string;
  readonly tokensFromStdin: boolean;
  /** Windows only: explicit consent to place token values in client configuration. */
  readonly inlineTokens: boolean;
}

export interface SetupIo {
  readonly ctx: CliContext;
  readonly stdin: Readable & { isTTY?: boolean };
  readonly stdout: Writable;
  readonly execPath: string;
  readonly entryPath: string;
  readonly uid?: number;
  readonly gid?: number;
  /** Test hook; production chooses a TTY or line prompter. */
  readonly prompter?: Prompter;
}

const write = (io: SetupIo, text: string): void => { io.stdout.write(text); };

async function askUntilValid<T>(prompter: Prompter, question: string, fallback: string | undefined, parse: (v: string) => T, io: SetupIo): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const answer = (await prompter.ask(question)).trim();
    const value = answer === '' ? fallback : answer;
    if (value === undefined || value === '') { write(io, '  A value is required.\n'); continue; }
    try { return parse(value); } catch (error) {
      write(io, `  ${error instanceof Error ? error.message : 'invalid value'}\n`);
    }
  }
  throw new SetupInputError('too many invalid answers');
}

async function askYesNo(prompter: Prompter, question: string, fallback: boolean): Promise<boolean> {
  const answer = (await prompter.ask(`${question} [${fallback ? 'Y/n' : 'y/N'}] `)).trim().toLowerCase();
  if (answer === '') return fallback;
  return answer === 'y' || answer === 'yes';
}

/** Parse "1,3", "all", "none" or client ids against a numbered list. */
export function parseSelection(answer: string, options: readonly ClientId[], fallback: readonly ClientId[]): ClientId[] {
  const text = answer.trim().toLowerCase();
  if (text === '') return [...fallback];
  if (text === 'all') return [...options];
  if (text === 'none' || text === '0') return [];
  const picked: ClientId[] = [];
  for (const part of text.split(/[\s,]+/).filter(Boolean)) {
    const n = Number(part);
    const id = Number.isInteger(n) && n >= 1 && n <= options.length ? options[n - 1] : isClientId(part) ? part : undefined;
    if (id === undefined) throw new SetupInputError(`unknown choice "${part.slice(0, 32)}"`);
    if (!picked.includes(id)) picked.push(id);
  }
  return picked;
}

async function readTokens(io: SetupIo, prompter: Prompter | undefined, stdinLines: string[] | undefined): Promise<{ publicToken: string; privateToken: string }> {
  if (stdinLines !== undefined) {
    const values = stdinLines.map((l) => l.trim()).filter(Boolean);
    if (values.length < 2) throw new SetupInputError('--tokens-from-stdin expects two lines: public token, then private token');
    return { publicToken: validateToken(values[0], 'public token'), privateToken: validateToken(values[1], 'private token') };
  }
  if (prompter === undefined) throw new SetupInputError('no terminal for hidden token entry; pipe the two tokens with --tokens-from-stdin');
  write(io, 'Create API tokens in Darktrace: System Config > Settings > API Token. Input stays hidden.\n');
  const publicToken = validateToken((await prompter.secret('Public token: ')).trim(), 'public token');
  const privateToken = validateToken((await prompter.secret('Private token (hidden): ')).trim(), 'private token');
  return { publicToken, privateToken };
}

export async function runSetup(args: SetupArgs, io: SetupIo): Promise<number> {
  const { ctx } = io;
  const saved = readSavedSetup(ctx);
  const stdinLines = args.tokensFromStdin ? await readStdinLines(io.stdin) : undefined;
  let prompter = io.prompter;
  let owned = false;
  if (prompter === undefined && !args.tokensFromStdin) {
    if (io.stdin.isTTY === true) { prompter = createTtyPrompter(io.stdin, io.stdout); owned = true; }
    else if (!args.yes) prompter = createLinePrompter(await readStdinLines(io.stdin), io.stdout);
  }
  const interactive = prompter !== undefined && !args.yes;
  try {
    write(io, `darktrace-mcp setup${args.dryRun ? ' (dry run: nothing will be written)' : ''}\n\n`);

    // 1. Appliance URL
    let url: string;
    if (args.url !== undefined) url = normalizeUrl(args.url);
    else if (interactive && prompter) url = await askUntilValid(prompter, `Darktrace appliance URL${saved ? ` [${saved.url}]` : ' (https://...)'}: `, saved?.url, normalizeUrl, io);
    else if (saved) url = saved.url;
    else throw new SetupInputError('--url is required for non-interactive setup');

    // 2. Runtime
    let runtime: Runtime = args.runtime ?? saved?.runtime ?? 'node';
    if (args.runtime === undefined && interactive && prompter) {
      write(io, '\nHow should clients start the server?\n  1) node (this checkout)  [default]\n  2) docker (reviewed image ID)\n');
      runtime = await askUntilValid(prompter, `Choice [${runtime === 'docker' ? 2 : 1}]: `, runtime === 'docker' ? '2' : '1',
        (v) => { if (v === '1' || v === 'node') return 'node' as const; if (v === '2' || v === 'docker') return 'docker' as const; throw new SetupInputError('choose 1 or 2'); }, io);
    }
    let image: string | undefined;
    let dockerPath: string | undefined;
    if (runtime === 'docker') {
      if (args.image !== undefined) image = validateImage(args.image);
      else if (interactive && prompter) image = await askUntilValid(prompter, `Image ID (docker image inspect --format '{{.Id}}' <image>)${saved?.image ? ` [${saved.image}]` : ''}: `, saved?.image, validateImage, io);
      else if (saved?.image) image = saved.image;
      else throw new SetupInputError('--image is required for the docker runtime');
      dockerPath = findOnPath('docker', ctx.env, ctx.platform);
      if (dockerPath === undefined) throw new SetupInputError('docker is not on PATH');
      if (io.uid === undefined || io.gid === undefined || io.uid === 0) throw new SetupInputError('docker runtime needs a regular (non-root) POSIX user');
    }

    // 2b. Bootstrapped through npx: register a fixed copy, never the transient cache path.
    let entryPath = io.entryPath;
    if (runtime === 'node' && isTransientInstall(io.entryPath, ctx)) {
      const copy = installFixedCopy(io.entryPath, ctx, args.dryRun);
      const verb = copy.status === 'copied' ? 'Installed a fixed copy of the package in'
        : copy.status === 'reused' ? 'Reusing the fixed copy in' : 'Would install a fixed copy of the package in';
      write(io, `\nRunning from the npx cache. ${verb} ${copy.dir}.\nClients will start the server from that absolute path, never through npx.\n`);
      entryPath = copy.entryPath;
    }

    // 3. Token storage mode
    let tokenMode: TokenMode = 'file';
    if (ctx.platform === 'win32' && runtime === 'node') {
      write(io, '\nWARNING: Windows cannot enforce owner-only token files, so the server rejects token files there.\n' +
        'Setup can instead write the token VALUES into each client configuration file. Anyone who can read those\n' +
        'files can use your API tokens. Prefer the docker runtime or WSL when possible.\n');
      const consent = args.inlineTokens || (interactive && prompter ? await askYesNo(prompter, 'Write token values into client configs?', false) : false);
      if (!consent) throw new SetupInputError('on Windows rerun with --inline-tokens-windows (explicit consent) or use docker/WSL');
      tokenMode = 'inline';
    }

    // 4. Tokens
    let tokens: { publicToken: string; privateToken: string } | undefined;
    const reuse = tokenMode === 'file' && stdinLines === undefined && tokenFilesUsable(ctx) &&
      (args.yes || prompter === undefined || await askYesNo(prompter, `\nExisting tokens found in ${setupDir(ctx)}. Keep them?`, true));
    if (!reuse) { write(io, '\n'); tokens = await readTokens(io, prompter, stdinLines); }

    // 5. Profiles
    let profiles: string;
    if (args.profiles !== undefined) profiles = normalizeProfiles(args.profiles);
    else if (interactive && prompter) {
      write(io, '\nWhich capabilities should the AI client get?\n');
      PROFILE_PRESETS.forEach((p, i) => write(io, `  ${i + 1}) ${p.label}\n`));
      const current = PROFILE_PRESETS.findIndex((p) => p.profiles === (saved?.profiles ?? 'read'));
      profiles = await askUntilValid(prompter, `Choice [${current >= 0 ? current + 1 : 1}]: `, String(current >= 0 ? current + 1 : 1), (v) => {
        const n = Number(v);
        if (Number.isInteger(n) && n >= 1 && n <= PROFILE_PRESETS.length) return PROFILE_PRESETS[n - 1].profiles;
        return normalizeProfiles(v);
      }, io);
    } else profiles = saved?.profiles ?? 'read';

    const files = tokenPaths(ctx);
    const settings: InstallSettings = {
      url, profiles, runtime, tokenMode, ...files, nodePath: io.execPath, entryPath,
      ...(runtime === 'docker' ? { dockerPath, image, uid: io.uid, gid: io.gid, hostPlatform: ctx.platform } : {}),
    };
    if (tokenMode === 'inline' && tokens === undefined) throw new SetupInputError('tokens are required');
    const entry = buildServerEntry(settings, tokenMode === 'inline' ? tokens : undefined);
    const displayEntry = buildServerEntry(settings);

    // 6. Persist tokens and choices
    if (args.dryRun) {
      write(io, `\nWould store ${tokens ? 'new tokens' : 'no new tokens'}${tokenMode === 'file' ? ` in ${files.publicTokenFile} and ${files.privateTokenFile} (0600, directory 0700)` : ''}.\n`);
    } else {
      if (tokens && tokenMode === 'file') writeTokenFiles(ctx, tokens.publicToken, tokens.privateToken);
      writeSavedSetup(ctx, { version: 1, url, profiles, runtime, tokenMode, ...(image ? { image } : {}) });
      write(io, `\nSaved settings in ${setupDir(ctx)}${tokens && tokenMode === 'file' ? ' (token files are owner-only, mode 0600)' : ''}.\n`);
    }

    // 7. Clients
    const detected = detectClients(ctx);
    let selected: ClientId[];
    if (args.clients !== undefined) selected = [...args.clients];
    else if (interactive && prompter) {
      write(io, '\nInstall into which clients? (numbers separated by commas, "all" or "none")\n');
      CLIENT_IDS.forEach((id, i) => write(io, `  ${i + 1}) ${clientLabel(id)}${detected.includes(id) ? '  [detected]' : ''}\n`));
      const fallback = detected.map((id) => String(CLIENT_IDS.indexOf(id) + 1)).join(',');
      selected = await askUntilValid(prompter, `Choice [${fallback || 'none'}]: `, fallback || 'none', (v) => parseSelection(v, CLIENT_IDS, detected), io);
    } else selected = detected;
    if (selected.length === 0) write(io, '\nNo clients selected. Print a snippet any time with: darktrace-mcp config <client>\n');

    const results: ClientResult[] = [];
    for (const id of selected) {
      try { results.push(installClient(id, entry, ctx, { dryRun: args.dryRun, inlineTokens: tokenMode === 'inline', displayEntry })); }
      catch (error) { results.push({ client: id, status: 'failed', detail: error instanceof Error ? error.message : 'failed' }); }
    }
    printResults(io, results);
    if (runtime === 'docker') {
      write(io, '\nDocker: the container runs as your UID:GID so it can read the 0600 token files.' +
        (ctx.platform === 'darwin' || ctx.platform === 'win32'
          ? ' Docker Desktop shows bind mounts as root-owned,\nso the launcher sets DARKTRACE_TOKEN_FILE_OWNER=root-or-current (mode checks still apply; see docs/docker.md).\n'
          : '\n'));
    }
    write(io, `\nNext: run \`darktrace-mcp test\` to check URL, TLS and tokens, then restart your AI clients.\n`);
    return results.some((r) => r.status === 'failed') ? 1 : 0;
  } finally {
    if (owned) prompter?.close();
  }
}

export function printResults(io: Pick<SetupIo, 'stdout'>, results: readonly ClientResult[]): void {
  if (results.length === 0) return;
  io.stdout.write('\nResults:\n');
  for (const r of results) {
    io.stdout.write(`  ${clientLabel(r.client).padEnd(15)} ${r.status.padEnd(9)} ${r.detail}\n`);
    if (r.backup) io.stdout.write(`  ${''.padEnd(15)} backup    ${r.backup}\n`);
  }
  for (const r of results) {
    if (r.snippet && (r.status === 'manual' || r.status === 'failed' || r.status === 'dry-run')) {
      io.stdout.write(`\n--- ${clientLabel(r.client)} ---\n${r.snippet}${r.snippet.endsWith('\n') ? '' : '\n'}`);
    }
  }
}
