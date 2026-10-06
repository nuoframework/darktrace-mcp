import { readdirSync, rmdirSync, rmSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import type { Readable, Writable } from 'node:stream';
import { CLIENT_IDS, clientLabel, removeClient, type CliContext, type ClientResult } from './clients.js';
import { isImageId } from './docker.js';
import { findOnPath, lstatOrUndefined } from './fsutil.js';
import { PACKAGE_NAME, describeEntry, fixedCopyDir, fixedCopyEntry } from './install.js';
import { createLinePrompter, createTtyPrompter, readStdinLines, type Prompter } from './prompt.js';
import { readSavedSetup, setupDir, tokenPaths } from './state.js';
import { createUi, type Ui } from './ui.js';
import { VERSION } from '../server/createServer.js';

/**
 * `darktrace-mcp uninstall` (alias `remove --all`): undo everything `setup` created, and nothing else.
 * Known paths only: client entries named "darktrace", the installer directory, the per-version fixed copies and,
 * with --docker, the one pinned image ID recorded by setup. Symbolic links are never followed or removed.
 */
export interface UninstallArgs {
  readonly dryRun: boolean;
  readonly yes: boolean;
  readonly keepCopies: boolean;
  readonly docker: boolean;
}

export interface UninstallIo {
  readonly ctx: CliContext;
  readonly stdin: Readable & { isTTY?: boolean };
  readonly stdout: Writable;
  /** Test hook; production chooses a TTY or line prompter. */
  readonly prompter?: Prompter;
  readonly ui?: Ui;
}

/** Same version rule as the fixed-copy installer: fixedCopyDir refuses anything else. */
function isVersionDir(ctx: CliContext, base: string, name: string): boolean {
  try { return fixedCopyDir(ctx, name) === path.join(base, name); } catch { return false; }
}
const KNOWN_STATE_FILES = ['public-token', 'private-token', 'setup.json'] as const;

interface PathPlan { readonly remove: string[]; readonly skipped: string[] }

/** Installer state files that exist as regular files; anything symlinked or unexpected is reported, never removed. */
function planState(ctx: CliContext): PathPlan & { dir: string; dirUsable: boolean } {
  const dir = setupDir(ctx);
  const stat = lstatOrUndefined(dir);
  if (stat === undefined) return { dir, dirUsable: false, remove: [], skipped: [] };
  if (stat.isSymbolicLink() || !stat.isDirectory()) return { dir, dirUsable: false, remove: [], skipped: [`${dir} (symbolic link or not a directory; not touched)`] };
  const remove: string[] = [];
  const skipped: string[] = [];
  const known = new Set<string>([...Object.values(tokenPaths(ctx)), path.join(dir, 'setup.json')]);
  for (const name of KNOWN_STATE_FILES) {
    const file = path.join(dir, name);
    const s = lstatOrUndefined(file);
    if (s === undefined) continue;
    if (s.isFile() && known.has(file)) remove.push(file);
    else skipped.push(`${file} (symbolic link or not a regular file; not touched)`);
  }
  return { dir, dirUsable: true, remove, skipped };
}

/** Fixed copies `<data>/darktrace-mcp/<version>/` that really hold this package. */
function planCopies(ctx: CliContext): PathPlan & { base: string; baseUsable: boolean } {
  const base = path.dirname(fixedCopyDir(ctx, '0.0.0'));
  const stat = lstatOrUndefined(base);
  if (stat === undefined) return { base, baseUsable: false, remove: [], skipped: [] };
  if (stat.isSymbolicLink() || !stat.isDirectory()) return { base, baseUsable: false, remove: [], skipped: [`${base} (symbolic link or not a directory; not touched)`] };
  const remove: string[] = [];
  const skipped: string[] = [];
  for (const name of readdirSync(base).sort()) {
    const dir = path.join(base, name);
    const s = lstatOrUndefined(dir);
    if (s === undefined) continue;
    const ours = isVersionDir(ctx, base, name) && s.isDirectory() && !s.isSymbolicLink() && describeEntry(fixedCopyEntry(dir))?.name === PACKAGE_NAME;
    if (ours) remove.push(dir);
    else skipped.push(`${dir} (not a darktrace-mcp fixed copy; not touched)`);
  }
  return { base, baseUsable: true, remove, skipped };
}

/** `npm ls -g` reports the package: return the exact command to remove it. Never runs npm -g uninstall. */
function globalInstallHint(ctx: CliContext): string | undefined {
  const npm = findOnPath('npm', ctx.env, ctx.platform);
  if (npm === undefined) return undefined;
  try {
    const result = ctx.run(npm, ['ls', '-g', PACKAGE_NAME, '--depth=0', '--json']);
    const parsed = JSON.parse(result.stdout || '{}') as { dependencies?: Record<string, unknown> };
    return parsed.dependencies !== undefined && Object.hasOwn(parsed.dependencies, PACKAGE_NAME) ? `npm uninstall -g ${PACKAGE_NAME}` : undefined;
  } catch {
    return undefined;
  }
}

const write = (io: UninstallIo, text: string): void => { io.stdout.write(text); };
const bullet = (items: readonly string[]): string => items.map((i) => `    ${i}\n`).join('');
const removedFromDir = (dir: string): boolean => {
  try { if (readdirSync(dir).length === 0) { rmdirSync(dir); return true; } } catch { /* not empty or already gone */ }
  return false;
};

export async function runUninstall(args: UninstallArgs, io: UninstallIo): Promise<number> {
  const { ctx } = io;
  // Read the saved setup first: it names the pinned image and disappears in step 2.
  const saved = readSavedSetup(ctx);
  const image = saved?.runtime === 'docker' && saved.image !== undefined && isImageId(saved.image) ? saved.image : undefined;

  const clientPlan = CLIENT_IDS.map((id) => {
    try { return removeClient(id, ctx, { dryRun: true }); } catch (error) {
      return { client: id, status: 'failed', detail: error instanceof Error ? error.message : 'failed' } as ClientResult;
    }
  }).filter((r) => r.status !== 'absent');
  const state = planState(ctx);
  const copies = planCopies(ctx);
  const npmHint = globalInstallHint(ctx);

  const ui = io.ui ?? createUi();
  write(io, ui.banner(`darktrace-mcp uninstall${args.dryRun ? ' (dry run: nothing will be changed)' : ''} · v${VERSION}`,
    'Undoes what setup created and nothing else: client entries named "darktrace", stored tokens, settings and fixed copies.') + '\nPlan:\n');
  write(io, `  1) Client entries named "darktrace" (config files are backed up first):\n${clientPlan.length === 0 ? '    none found\n' : bullet(clientPlan.map((r) => `${clientLabel(r.client)}: ${r.detail}`))}`);
  write(io, `  2) Stored tokens and settings in ${state.dir}:\n${state.remove.length === 0 ? '    none found\n' : bullet(state.remove)}`);
  if (args.keepCopies) write(io, '  3) Fixed copies: kept (--keep-copies)\n');
  else write(io, `  3) Fixed copies in ${copies.base}:\n${copies.remove.length === 0 ? '    none found\n' : bullet(copies.remove)}`);
  if (image === undefined) write(io, '  4) Docker image: none recorded by setup\n');
  else if (args.docker) write(io, `  4) Docker image: docker image rm ${image}\n`);
  else write(io, `  4) Docker image ${image}: kept (add --docker to remove exactly this image)\n`);
  const skipped = [...state.skipped, ...copies.skipped];
  if (skipped.length > 0) write(io, `  Not touched:\n${bullet(skipped)}`);

  if (args.dryRun) {
    if (npmHint) write(io, `\nThe package is installed globally; remove it with:\n  ${npmHint}\n`);
    return 0;
  }

  if (!args.yes) {
    let prompter = io.prompter;
    let owned = false;
    if (prompter === undefined) {
      if (io.stdin.isTTY === true) { prompter = createTtyPrompter(io.stdin, io.stdout); owned = true; }
      else prompter = createLinePrompter(await readStdinLines(io.stdin), io.stdout);
    }
    let answer: string;
    try { answer = (await prompter.ask('\nProceed with the steps above? [y/N] ')).trim().toLowerCase(); } catch { answer = ''; } finally { if (owned) prompter.close(); }
    if (answer !== 'y' && answer !== 'yes') { write(io, 'Cancelled. Nothing was changed (rerun with --yes to skip this question).\n'); return 1; }
  }

  let failed = false;
  // 1. Client entries.
  const clientResults: ClientResult[] = [];
  for (const planned of clientPlan) {
    try { clientResults.push(removeClient(planned.client, ctx, { dryRun: false })); } catch (error) {
      clientResults.push({ client: planned.client, status: 'failed', detail: error instanceof Error ? error.message : 'failed' });
    }
  }
  if (clientResults.some((r) => r.status === 'failed' || r.status === 'manual')) failed = true;

  // 2. Tokens, settings and the installer directory when it is left empty.
  const removedState: string[] = [];
  for (const file of state.remove) {
    const s = lstatOrUndefined(file);
    if (s?.isFile() === true) { unlinkSync(file); removedState.push(file); }
  }
  const dirRemoved = state.dirUsable && removedFromDir(state.dir);

  // 3. Fixed copies (re-checked right before removal), then the parent directory when empty.
  const removedCopies: string[] = [];
  if (!args.keepCopies) {
    for (const dir of copies.remove) {
      const s = lstatOrUndefined(dir);
      if (s === undefined || s.isSymbolicLink() || !s.isDirectory()) continue;
      rmSync(dir, { recursive: true, force: false });
      removedCopies.push(dir);
    }
    if (copies.baseUsable) removedFromDir(copies.base);
  }

  // 4. The pinned image ID only; never tags, digests or other images.
  let imageLine = image === undefined ? 'none recorded' : `kept ${image}`;
  if (image !== undefined && args.docker) {
    const docker = findOnPath('docker', ctx.env, ctx.platform);
    if (docker === undefined) { imageLine = `not removed: docker is not on PATH (run: docker image rm ${image})`; failed = true; } else {
      const run = ctx.runDocker ?? ((command: string, argv: readonly string[]) => ctx.run(command, argv));
      const result = run(docker, ['image', 'rm', image]);
      if (result.status === 0) imageLine = `removed ${image}`;
      else { imageLine = `not removed (in use or already gone): docker image rm ${image}`; failed = true; }
    }
  }

  // 6. Summary.
  write(io, '\n' + ui.paint('bold', 'Removed') + '\n');
  const rows: string[][] = clientResults.map((r) => [ui.marker(r.status === 'failed' || r.status === 'manual' ? 'fail' : 'ok'), clientLabel(r.client), r.status, r.detail]);
  for (const file of removedState) rows.push([ui.marker('ok'), 'deleted', '', file]);
  if (dirRemoved) rows.push([ui.marker('ok'), 'deleted', '', state.dir]);
  for (const dir of removedCopies) rows.push([ui.marker('ok'), 'deleted', '', dir]);
  rows.push([ui.marker(imageLine.startsWith('not removed') ? 'fail' : 'info'), 'Docker image', '', imageLine]);
  write(io, ui.table(rows));
  const backups = clientResults.flatMap((r) => (r.backup ? [r.backup] : []));
  if (backups.length > 0) write(io, `Backups kept (delete them when no longer needed):\n${bullet(backups)}`);
  for (const r of clientResults) if (r.snippet && (r.status === 'manual' || r.status === 'failed')) write(io, `\n--- ${clientLabel(r.client)}: do this by hand ---\n${r.snippet}\n`);
  // 5. Global npm install: print the command, never run npm -g.
  if (npmHint) write(io, `\nThe package is also installed globally; remove it with:\n  ${npmHint}\n`);
  write(io, failed ? ui.fail('Some steps need your attention (see above).\n') : ui.ok('Done. Restart your AI clients so they forget the server.\n'));
  return failed ? 1 : 0;
}
