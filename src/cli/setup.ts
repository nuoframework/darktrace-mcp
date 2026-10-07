import type { Readable, Writable } from 'node:stream';
import {
  CLIENT_IDS, clientLabel, detectClients, installClient, isClientId, type CliContext, type ClientId, type ClientResult,
} from './clients.js';
import {
  PROFILE_PRESETS, SENSITIVE_WRITE_NOTICE, SetupInputError, buildServerEntry, needsSensitiveWriteAck, normalizeProfiles, normalizeUrl, validateToken,
  type InstallSettings, type Runtime, type TokenMode,
} from './entry.js';
import { findOnPath, lstatOrUndefined } from './fsutil.js';
import {
  IMAGE_REPOSITORY, checkDockerDaemon, defaultImageReference, dockerInstallHelp, inspectImage, parseImageReference, pullImage, type ImageReference, type ResolvedImage,
} from './docker.js';
import { describeEntry, entryOrigin, installFixedCopy, isPackageVersion, isTransientInstall, type EntryOrigin } from './install.js';
import { createLinePrompter, createTtyPrompter, readStdinLines, type Prompter } from './prompt.js';
import { readSavedSetup, setupDir, tokenFilesUsable, tokenPaths, writeSavedSetup, writeTokenFiles, type UpdateMode } from './state.js';
import { describeProbeFailure, probeDateFormat, probeStatus, type DateFormatProbe } from './online.js';
import { createUi, modeText, type Ui } from './ui.js';
import { VERSION } from '../server/createServer.js';
import type { DateFormat } from '../config/schema.js';

export interface SetupArgs {
  readonly dryRun: boolean;
  readonly yes: boolean;
  readonly clients?: readonly ClientId[];
  readonly url?: string;
  readonly profiles?: string;
  readonly runtime?: Runtime;
  /** Docker image: tag reference, digest reference or local image ID. Defaults to ghcr.io/nuoframework/darktrace-mcp:<package version>. */
  readonly image?: string;
  /** Consent to `docker pull` the image when it is not present locally (required with --yes or piped input). */
  readonly pull?: boolean;
  readonly tokensFromStdin: boolean;
  /** Windows only: explicit consent to place token values in client configuration. */
  readonly inlineTokens: boolean;
  /** Explicit consent to the sensitive-read + write risk notice; required for such profiles without an interactive yes. */
  readonly acknowledgeSensitiveWrite?: boolean;
  /** Signature date format chosen by the operator; skips the appliance probe. */
  readonly dateFormat?: DateFormat;
  /** Skip the appliance probe (no network at install time); the date format defaults to the saved one or compact. */
  readonly offline?: boolean;
  /** How releases reach the clients: `pinned` (default, moved by `update`) or `npx-latest` launchers. Node runtime only. */
  readonly updateMode?: UpdateMode;
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
  /** Terminal presentation; defaults to plain text (what tests and piped output get). */
  readonly ui?: Ui;
}

const STEPS = 5;
/** What "node" means for the user, by where the running package comes from; never assumes a source checkout. */
export const NODE_RUNTIME_LABEL: Readonly<Record<EntryOrigin, string>> = {
  checkout: 'this checkout',
  'fixed-copy': 'the fixed copy installed by setup',
  transient: 'a fixed copy that setup installs now, outside the npx cache',
  package: 'this installed package',
};
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

/** Environment for the setup probe: the shell's non-Darktrace variables plus the values collected by the wizard. */
function probeEnv(ctx: CliContext, url: string, tokenMode: TokenMode, tokens: { publicToken: string; privateToken: string } | undefined): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(ctx.env)) if (!key.startsWith('DARKTRACE_')) env[key] = value;
  if (ctx.env.DARKTRACE_TIMEOUT_MS !== undefined) env.DARKTRACE_TIMEOUT_MS = ctx.env.DARKTRACE_TIMEOUT_MS;
  env.DARKTRACE_URL = url;
  // The probe only reads /status, so the narrowest profile is enough (and needs no acknowledgement).
  env.DARKTRACE_PROFILES = 'read';
  if (tokens !== undefined) {
    // Values stay in this in-memory object handed to the config loader; they are never printed or written here.
    env.DARKTRACE_PUBLIC_TOKEN = tokens.publicToken;
    env.DARKTRACE_PRIVATE_TOKEN = tokens.privateToken;
  } else if (tokenMode === 'file') {
    const files = tokenPaths(ctx);
    env.DARKTRACE_PUBLIC_TOKEN_FILE = files.publicTokenFile;
    env.DARKTRACE_PRIVATE_TOKEN_FILE = files.privateTokenFile;
  }
  return env;
}

/** Why no date format could be confirmed. Kinds and HTTP status only; never a token or a response body. */
export function describeFailedProbe(probe: DateFormatProbe): string {
  const failures = probe.outcomes.filter((o): o is Exclude<typeof o, { ok: true }> => !o.ok);
  const last = failures[failures.length - 1];
  const both = failures.length === 2 && failures.every((o) => o.kind === 'bad_request');
  const reason = both
    ? 'the appliance rejected signed GET /status with both signature date formats (HTTP 400 for compact and for spaced). ' +
      'Check the appliance API version and that the tokens belong to this appliance'
    : `the appliance check (signed GET /status) failed: ${last === undefined ? 'no answer' : describeProbeFailure(last).replace(/\.$/, '')}`;
  return `${reason}. No settings, tokens or client entries were written. Fix the problem and rerun setup, ` +
    'or pass --date-format compact|spaced (or --offline) to skip the check';
}

/** The prompt a user types into a client once the entry exists; the same sentence closes every successful setup. */
export const FIRST_QUESTION = 'list my Darktrace devices';

export async function runSetup(args: SetupArgs, io: SetupIo): Promise<number> {
  const { ctx } = io;
  const ui = io.ui ?? createUi();
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
    write(io, ui.banner(`darktrace-mcp setup${args.dryRun ? ' (dry run: nothing will be written)' : ''} · v${VERSION}`,
      'Connects your AI clients to one Darktrace appliance. Tokens go to owner-only files; nothing is written before the appliance check passes.'));

    // 1. Appliance URL
    write(io, ui.step(1, STEPS, 'Appliance'));
    let url: string;
    if (args.url !== undefined) url = normalizeUrl(args.url);
    // Never prefill or print a saved appliance address: the operator types it every time.
    else if (interactive && prompter) url = await askUntilValid(prompter, 'Darktrace appliance URL (https://...): ', undefined, normalizeUrl, io);
    else if (saved) url = saved.url;
    else throw new SetupInputError('--url is required for non-interactive setup');
    write(io, ui.ok(`Appliance URL accepted (HTTPS origin${args.url !== undefined ? ', from --url' : saved && !(interactive && prompter) ? ', from the saved setup' : ''}).\n`));

    // 2. Runtime
    write(io, ui.step(2, STEPS, 'Runtime'));
    let runtime: Runtime = args.runtime ?? saved?.runtime ?? 'node';
    if (args.runtime === undefined && interactive && prompter) {
      write(io, `How should clients start the server?\n  1) node (${NODE_RUNTIME_LABEL[entryOrigin(io.entryPath, ctx)]})  [default]\n  2) docker (setup pulls and pins the image)\n`);
      runtime = await askUntilValid(prompter, `Choice [${runtime === 'docker' ? 2 : 1}]: `, runtime === 'docker' ? '2' : '1',
        (v) => { if (v === '1' || v === 'node') return 'node' as const; if (v === '2' || v === 'docker') return 'docker' as const; throw new SetupInputError('choose 1 or 2'); }, io);
    }
    if (args.updateMode === 'npx-latest' && runtime === 'docker') throw new SetupInputError('--update-mode npx-latest applies to the node runtime only; docker entries are always pinned to one image ID');
    let image: string | undefined;
    let dockerPath: string | undefined;
    let resolved: ResolvedImage | undefined;
    if (runtime === 'docker') {
      // Preflight before any question about the image and before anything is written.
      if (io.uid === undefined || io.gid === undefined || io.uid === 0) throw new SetupInputError('docker runtime needs a regular (non-root) POSIX user');
      dockerPath = findOnPath('docker', ctx.env, ctx.platform);
      if (dockerPath === undefined) throw new SetupInputError(dockerInstallHelp(ctx.platform));
      const server = checkDockerDaemon(ctx, dockerPath);
      write(io, ui.ok(`Docker: ${dockerPath} (daemon answers, ${server}).\n`));
      const suggested = defaultImageReference(io.entryPath) ?? saved?.imageReference ?? saved?.image;
      let ref: ImageReference;
      if (args.image !== undefined) ref = parseImageReference(args.image);
      else if (interactive && prompter) {
        ref = await askUntilValid(prompter, `Image (tag, name@sha256:digest or sha256:ID)${suggested ? ` [${suggested}]` : ''}: `, suggested, parseImageReference, io);
      } else if (suggested !== undefined) ref = parseImageReference(suggested);
      else throw new SetupInputError('--image is required for the docker runtime (the package version could not be read)');
      resolved = inspectImage(ctx, dockerPath, ref);
      if (resolved === undefined) {
        if (ref.kind === 'id') throw new SetupInputError(`image ${ref.value} is not present locally; give its tag or digest reference so setup can pull it. Nothing was written`);
        if (args.dryRun) {
          write(io, `Image ${ref.value} is not present locally. Would run: docker pull ${ref.value}\n`);
        } else {
          const consent = args.pull === true ||
            (interactive && prompter ? await askYesNo(prompter, `Image ${ref.value} is not present locally. Pull it now?`, true) : false);
          if (!consent) {
            throw new SetupInputError(interactive
              ? `image ${ref.value} was not pulled. Run \`docker pull ${ref.value}\` or rerun setup and answer yes. Nothing was written`
              : `image ${ref.value} is not present locally; rerun with --pull to download it, or run \`docker pull ${ref.value}\` first. Nothing was written`);
          }
          write(io, `Pulling ${ref.value}...\n`);
          pullImage(ctx, dockerPath, ref);
          resolved = inspectImage(ctx, dockerPath, ref);
          if (resolved === undefined) throw new SetupInputError(`docker pull finished but ${ref.value} is still not present locally. Nothing was written`);
        }
      }
      // Client entries start the immutable local image ID with --pull=never; the digest is recorded for verification.
      image = resolved?.id ?? 'sha256:<image ID after docker pull>';
      if (resolved !== undefined) write(io, describeImage(resolved));
    } else write(io, ui.ok(`Runtime: node, ${NODE_RUNTIME_LABEL[entryOrigin(io.entryPath, ctx)]} (${io.execPath}).\n`));

    // 2b. Bootstrapped through npx: register a fixed copy, never the transient cache path (pinned mode; decided in step 4 when interactive).
    let entryPath = io.entryPath;
    let updateMode: UpdateMode = args.updateMode ?? (runtime === 'node' ? saved?.updateMode : undefined) ?? 'pinned';
    const transient = runtime === 'node' && isTransientInstall(io.entryPath, ctx);
    if (transient && updateMode === 'pinned' && (args.updateMode !== undefined || !interactive)) {
      const copy = installFixedCopy(io.entryPath, ctx, args.dryRun);
      const verb = copy.status === 'copied' ? 'Installed a fixed copy of the package in'
        : copy.status === 'reused' ? 'Reusing the fixed copy in' : 'Would install a fixed copy of the package in';
      write(io, ui.ok(`Running from the npx cache. ${verb} ${copy.dir}.\n`) + ui.note('  Clients will start the server from that absolute path, never through npx.\n'));
      entryPath = copy.entryPath;
    }

    // 3. Token storage mode
    write(io, ui.step(3, STEPS, 'API tokens'));
    let tokenMode: TokenMode = 'file';
    if (ctx.platform === 'win32' && runtime === 'node') {
      write(io, ui.warn('WARNING: Windows cannot enforce owner-only token files, so the server rejects token files there.\n') +
        'Setup can instead write the token VALUES into each client configuration file. Anyone who can read those\n' +
        'files can use your API tokens. Prefer the docker runtime or WSL when possible.\n');
      const consent = args.inlineTokens || (interactive && prompter ? await askYesNo(prompter, 'Write token values into client configs?', false) : false);
      if (!consent) throw new SetupInputError('on Windows rerun with --inline-tokens-windows (explicit consent) or use docker/WSL');
      tokenMode = 'inline';
    }

    // 4. Tokens
    let tokens: { publicToken: string; privateToken: string } | undefined;
    const reuse = tokenMode === 'file' && stdinLines === undefined && tokenFilesUsable(ctx) &&
      (args.yes || prompter === undefined || await askYesNo(prompter, `Existing tokens found in ${setupDir(ctx)}. Keep them?`, true));
    if (!reuse) tokens = await readTokens(io, prompter, stdinLines);
    write(io, ui.ok(reuse ? `Keeping the tokens already stored in ${setupDir(ctx)}.\n` : 'Both tokens received (never echoed, never written to client files).\n'));

    // 5. Profiles
    write(io, ui.step(4, STEPS, 'Permissions'));
    let profiles: string;
    if (args.profiles !== undefined) profiles = normalizeProfiles(args.profiles);
    else if (interactive && prompter) {
      write(io, 'Which capabilities should the AI client get?\n');
      PROFILE_PRESETS.forEach((p, i) => write(io, `  ${i + 1}) ${p.label}\n`));
      const current = PROFILE_PRESETS.findIndex((p) => p.profiles === (saved?.profiles ?? 'read'));
      profiles = await askUntilValid(prompter, `Choice [${current >= 0 ? current + 1 : 1}]: `, String(current >= 0 ? current + 1 : 1), (v) => {
        const n = Number(v);
        if (Number.isInteger(n) && n >= 1 && n <= PROFILE_PRESETS.length) return PROFILE_PRESETS[n - 1].profiles;
        return normalizeProfiles(v);
      }, io);
    } else profiles = saved?.profiles ?? 'read';

    // 5b. Sensitive reads + writes: show the exact risk notice and require an explicit yes (or flag).
    let acknowledgeSensitiveWrite = false;
    if (needsSensitiveWriteAck(profiles)) {
      write(io, `\n${SENSITIVE_WRITE_NOTICE}\n`);
      if (args.acknowledgeSensitiveWrite === true) {
        acknowledgeSensitiveWrite = true;
        write(io, 'Acknowledged with --acknowledge-sensitive-write: client entries will set DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE=true.\n');
      } else if (interactive && prompter) {
        if (await askYesNo(prompter, `Enable "${profiles}" and acknowledge this risk?`, false)) {
          acknowledgeSensitiveWrite = true;
          write(io, 'Acknowledged: client entries will set DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE=true.\n');
        } else {
          write(io, 'Not acknowledged. Choose one side instead:\n  1) read + write (no sensitive reads)\n  2) read + sensitive (no writes)\n');
          profiles = await askUntilValid(prompter, 'Choice [1]: ', '1', (v) => {
            if (v === '1' || v === 'read-write' || v === 'read,write') return 'read,write';
            if (v === '2' || v === 'read-sensitive' || v === 'read,sensitive') return 'read,sensitive';
            throw new SetupInputError('choose 1 or 2');
          }, io);
        }
      } else {
        throw new SetupInputError(`profiles "${profiles}" combine sensitive reads with writes; after reading the notice above, rerun with ` +
          '--acknowledge-sensitive-write, or choose --profiles read-write or --profiles read-sensitive');
      }
    }
    write(io, ui.ok(`Profiles: ${profiles}${acknowledgeSensitiveWrite ? ' (risk acknowledged)' : ''}.\n`));

    // 5d. Update mode (node runtime). Pinned entries move only through `update`; npx-latest entries fetch the newest
    // release at every client start, without the verification and rollback that `update` provides.
    if (runtime === 'node' && args.updateMode === undefined && interactive && prompter) {
      write(io, 'Updates: how should new releases reach your clients?\n' +
        `  1) pinned: stay on ${describeEntry(io.entryPath)?.version ?? 'this version'} until you run \`darktrace-mcp update\` (verified download, --check, --rollback)  [recommended]\n` +
        '  2) always latest: entries start `npx -y @nuoframework/darktrace-mcp@latest` (newest release at every start; unverified, needs network each start)\n');
      updateMode = await askUntilValid(prompter, `Choice [${updateMode === 'npx-latest' ? 2 : 1}]: `, updateMode === 'npx-latest' ? '2' : '1',
        (v) => { if (v === '1' || v === 'pinned') return 'pinned' as const; if (v === '2' || v === 'npx-latest' || v === 'latest') return 'npx-latest' as const; throw new SetupInputError('choose 1 or 2'); }, io);
      if (updateMode === 'pinned' && transient) {
        const copy = installFixedCopy(io.entryPath, ctx, args.dryRun);
        const verb = copy.status === 'copied' ? 'Installed a fixed copy of the package in' : copy.status === 'reused' ? 'Reusing the fixed copy in' : 'Would install a fixed copy of the package in';
        write(io, ui.ok(`${verb} ${copy.dir}.\n`));
        entryPath = copy.entryPath;
      }
    }
    const npxPath = runtime === 'node' && updateMode === 'npx-latest' ? findOnPath('npx', ctx.env, ctx.platform) ?? 'npx' : undefined;
    if (runtime === 'node') {
      write(io, ui.ok(updateMode === 'npx-latest'
        ? `Update mode: always latest (entries start ${npxPath} -y @nuoframework/darktrace-mcp@latest; no fixed copy; run setup again to pin).\n`
        : 'Update mode: pinned (move the entries later with `darktrace-mcp update`; `update --check` shows what is new).\n'));
    }

    if (tokenMode === 'inline' && tokens === undefined) throw new SetupInputError('tokens are required');

    // 5c. Signature date format. Appliances differ (some reject compact with HTTP 400), and the server never switches
    // formats at runtime, so setup records the one this appliance accepts. At most two signed GET /status requests.
    let dateFormat: DateFormat;
    if (args.dateFormat !== undefined) {
      dateFormat = args.dateFormat;
      write(io, `Date format: ${dateFormat} (from --date-format; the appliance was not probed).\n`);
    } else if (args.dryRun || args.offline === true) {
      dateFormat = saved?.dateFormat ?? 'compact';
      write(io, `Date format: ${dateFormat} (not probed ${args.dryRun ? 'in a dry run' : 'with --offline'}; ` +
        'if `darktrace-mcp test` reports bad_request, rerun setup with --date-format spaced).\n');
    } else {
      write(io, 'Checking the appliance with a signed GET /status...\n');
      const spinner = ui.spinner(io.stdout, 'Contacting the appliance (signed GET /status)');
      let probe: DateFormatProbe;
      try { probe = await probeDateFormat(probeEnv(ctx, url, tokenMode, tokens), ctx.probeStatus ?? probeStatus, 'compact'); } finally { spinner.stop(); }
      if (probe.chosen === undefined) throw new SetupInputError(describeFailedProbe(probe));
      dateFormat = probe.chosen;
      if (probe.outcomes.length > 1) write(io, `The appliance rejected date format ${dateFormat === 'spaced' ? 'compact' : 'spaced'} (HTTP 400) and accepted ${dateFormat}.\n`);
      write(io, ui.ok(`OK: URL, TLS and tokens work with date format ${dateFormat}. Client entries will set DARKTRACE_DATE_FORMAT=${dateFormat}.\n`));
    }

    const files = tokenPaths(ctx);
    const settings: InstallSettings = {
      url, profiles, runtime, tokenMode, ...files, nodePath: io.execPath, entryPath, acknowledgeSensitiveWrite, dateFormat,
      ...(runtime === 'docker' ? { dockerPath, image, uid: io.uid, gid: io.gid, hostPlatform: ctx.platform } : {}),
      ...(npxPath !== undefined ? { launcher: 'npx-latest' as const, npxPath } : {}),
    };
    // What `update` needs later: the version the entries start and, for node, the exact entry path.
    const installedVersion = runtime === 'docker'
      ? (resolved?.reference.startsWith(`${IMAGE_REPOSITORY}:`) ? resolved.reference.slice(IMAGE_REPOSITORY.length + 1) : undefined)
      : describeEntry(entryPath)?.version;
    const installRecord = {
      ...(runtime === 'node' && updateMode === 'npx-latest' ? { updateMode } : {}),
      ...(installedVersion !== undefined && isPackageVersion(installedVersion) ? { installedVersion } : {}),
      ...(runtime === 'node' && updateMode === 'pinned' ? { entryPath } : {}),
    };
    const entry = buildServerEntry(settings, tokenMode === 'inline' ? tokens : undefined);
    const displayEntry = buildServerEntry(settings);

    // 6. Persist tokens and choices
    const stored: ClientResult[] = [];
    if (args.dryRun) {
      write(io, `Would store ${tokens ? 'new tokens' : 'no new tokens'}${tokenMode === 'file' ? ` in ${files.publicTokenFile} and ${files.privateTokenFile} (0600, directory 0700)` : ''}.\n`);
    } else {
      if (tokens && tokenMode === 'file') writeTokenFiles(ctx, tokens.publicToken, tokens.privateToken);
      writeSavedSetup(ctx, { version: 1, url, profiles, runtime, tokenMode, ...(image ? { image } : {}),
        ...(resolved ? { imageReference: resolved.reference, ...(resolved.digest ? { imageDigest: resolved.digest } : {}) } : {}),
        ...(acknowledgeSensitiveWrite ? { acknowledgeSensitiveWrite: true as const } : {}), dateFormat, ...installRecord });
      write(io, ui.ok(`Saved settings in ${setupDir(ctx)}${tokens && tokenMode === 'file' ? ' (token files are owner-only, mode 0600)' : ''}.\n`));
    }

    // 7. Clients
    write(io, ui.step(5, STEPS, 'Clients'));
    const detected = detectClients(ctx);
    let selected: ClientId[];
    if (args.clients !== undefined) selected = [...args.clients];
    else if (interactive && prompter) {
      write(io, 'Install into which clients? (numbers separated by commas, "all" or "none")\n');
      CLIENT_IDS.forEach((id, i) => write(io, `  ${String(i + 1).padStart(2)}) ${clientLabel(id)}${detected.includes(id) ? ui.paint('green', '  [detected]') : ''}\n`));
      const fallback = detected.map((id) => String(CLIENT_IDS.indexOf(id) + 1)).join(',');
      selected = await askUntilValid(prompter, `Choice [${fallback || 'none'}]: `, fallback || 'none', (v) => parseSelection(v, CLIENT_IDS, detected), io);
    } else selected = detected;
    if (selected.length === 0) write(io, ui.warn('No clients selected. Print a snippet any time with: darktrace-mcp config <client>\n'));

    const results: ClientResult[] = [];
    for (const id of selected) {
      try { results.push(installClient(id, entry, ctx, { dryRun: args.dryRun, inlineTokens: tokenMode === 'inline', displayEntry })); }
      catch (error) { results.push({ client: id, status: 'failed', detail: error instanceof Error ? error.message : 'failed' }); }
    }
    printSummary(io, ui, [...stored, ...results], args.dryRun ? undefined : { tokenMode, tokens: tokens !== undefined || reuse, files, dir: setupDir(ctx) });
    if (runtime === 'docker') {
      write(io, '\nDocker: the container runs as your UID:GID so it can read the 0600 token files.' +
        (ctx.platform === 'darwin' || ctx.platform === 'win32'
          ? ' Docker Desktop shows bind mounts as root-owned,\nso the launcher sets DARKTRACE_TOKEN_FILE_OWNER=root-or-current (mode checks still apply; see docs/docker.md).\n'
          : '\n'));
      if (resolved !== undefined) write(io, describeImage(resolved));
    }
    const failed = results.some((r) => r.status === 'failed');
    const configured = results.filter((r) => r.status === 'written' || r.status === 'command' || r.status === 'unchanged').map((r) => clientLabel(r.client));
    write(io, '\n' + ui.paint('bold', 'Next:') + ` run \`darktrace-mcp test\` to check URL, TLS and tokens, then restart your AI clients.\n`);
    if (configured.length > 0 && !args.dryRun) write(io, `      open ${configured[0]} and ask: ${ui.paint('cyan', `"${FIRST_QUESTION}"`)}\n`);
    if (failed) write(io, ui.fail('Some clients failed (see above). Fix the problem and rerun `darktrace-mcp setup --client <name>`.\n'));
    return failed ? 1 : 0;
  } finally {
    if (owned) prompter?.close();
  }
}

/** Image summary: the ID every client entry starts and the registry digest to compare with the GitHub Release notes. */
function describeImage(image: ResolvedImage): string {
  return `Image ${image.reference}\n  image ID: ${image.id}  (client entries start this local image with --pull=never)\n` +
    (image.digest
      ? `  digest:   ${image.digest}  (compare with the digest in the GitHub Release notes)\n`
      : '  digest:   none (locally built image; no registry digest to compare)\n');
}

interface StoredFiles { tokenMode: TokenMode; tokens: boolean; files: { publicTokenFile: string; privateTokenFile: string }; dir: string }
const markerFor = (status: ClientResult['status']): 'ok' | 'fail' | 'warn' | 'info' =>
  status === 'written' || status === 'command' || status === 'unchanged' ? 'ok' : status === 'failed' ? 'fail' : status === 'manual' ? 'warn' : 'info';

/**
 * Aligned summary: what was written, where and with which permissions. Rows keep the `<label> <status> <detail>`
 * order so the text stays greppable; markers and modes are decoration around it.
 */
function printSummary(io: Pick<SetupIo, 'stdout'>, ui: Ui, results: readonly ClientResult[], stored?: StoredFiles): void {
  const rows: string[][] = [];
  if (stored && stored.tokenMode === 'file') {
    const dirMode = modeText(lstatOrUndefined(stored.dir)?.mode);
    rows.push([ui.marker('ok'), 'Public token', 'written', stored.files.publicTokenFile, modeText(lstatOrUndefined(stored.files.publicTokenFile)?.mode)]);
    rows.push([ui.marker('ok'), 'Private token', 'written', stored.files.privateTokenFile, modeText(lstatOrUndefined(stored.files.privateTokenFile)?.mode)]);
    rows.push([ui.marker('ok'), 'Settings', 'written', `${stored.dir}/setup.json`, `${modeText(lstatOrUndefined(`${stored.dir}/setup.json`)?.mode)} (dir ${dirMode})`]);
  }
  for (const r of results) {
    rows.push([ui.marker(markerFor(r.status)), clientLabel(r.client), r.status, r.detail, r.file && (r.status === 'written' || r.status === 'unchanged') ? modeText(lstatOrUndefined(r.file)?.mode) : '']);
    if (r.backup) rows.push(['', '', 'backup', r.backup, modeText(lstatOrUndefined(r.backup)?.mode)]);
  }
  if (rows.length === 0) return;
  io.stdout.write('\n' + ui.paint('bold', 'Summary') + ui.note('  (what · status · where · mode)') + '\n' + ui.table(rows));
  for (const r of results) {
    if (r.snippet && (r.status === 'manual' || r.status === 'failed' || r.status === 'dry-run')) {
      io.stdout.write(`\n--- ${clientLabel(r.client)} ---\n${r.snippet}${r.snippet.endsWith('\n') ? '' : '\n'}`);
    }
  }
}

/** Results table used by `remove` (no stored files). */
export function printResults(io: Pick<SetupIo, 'stdout'>, results: readonly ClientResult[], ui: Ui = createUi()): void {
  printSummary(io, ui, results);
}
