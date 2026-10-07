import { constants, closeSync, fsyncSync, openSync, readFileSync, readdirSync, unlinkSync, writeSync } from 'node:fs';
import path from 'node:path';
import type { Readable, Writable } from 'node:stream';
import { CLIENT_IDS, clientLabel, hasClientEntry, installClient, isClientId, type CliContext, type ClientId, type ClientResult } from './clients.js';
import { IMAGE_REPOSITORY, checkDockerDaemon, dockerInstallHelp, inspectImage, parseImageReference, pullImage, type ResolvedImage } from './docker.js';
import { SetupInputError, buildServerEntry, type InstallSettings } from './entry.js';
import { atomicWrite, ensurePrivateDir, findOnPath, lstatOrUndefined } from './fsutil.js';
import { PACKAGE_NAME, describeEntry, fixedCopyDir, fixedCopyEntry, installFixedCopy } from './install.js';
import { containerCheckConfig, describeProbeFailure, onlineTestEnv, probeStatus, recordedVersion, type ProbeOutcome } from './online.js';
import { createLinePrompter, createTtyPrompter, readStdinLines, type Prompter } from './prompt.js';
import { compareVersions, downloadPackage, releaseImageDigest, releaseNotes, releaseUrl, removeDownload, resolveVersion, verifyRepositoryProvenance, verifySignatures, type Download, type SignatureReport } from './registry.js';
import { readSavedSetup, setupDir, tokenPaths, writeSavedSetup, type SavedSetup } from './state.js';
import { createUi, type Ui } from './ui.js';
import { VERSION } from '../server/createServer.js';

/**
 * `darktrace-mcp update`: move every client entry to a newer published release, verified end to end, keeping the
 * previous copy (or image) for `--rollback`. Installer only: the MCP server never checks for updates.
 *
 * Node runtime: query registry.npmjs.org, refuse unsafe downgrades, bind the packed tarball to registry SRI, install
 * locked dependencies without scripts, verify npm signatures and pinned GitHub provenance, then check the fixed copy
 * and appliance before a journaled client rewrite. Docker runtime: force-pull the release tag, compare its digest with
 * the matching GitHub release record, check the container and appliance, then journal the client rewrite.
 */
export interface UpdateArgs {
  readonly check: boolean;
  readonly rollback: boolean;
  readonly version?: string;
  readonly allowDowngrade: boolean;
  readonly dryRun: boolean;
  readonly yes: boolean;
  readonly json: boolean;
}

export interface UpdateIo {
  readonly ctx: CliContext;
  readonly stdin: Readable & { isTTY?: boolean };
  readonly stdout: Writable;
  readonly execPath: string;
  readonly entryPath: string;
  readonly uid?: number;
  readonly gid?: number;
  readonly prompter?: Prompter;
  readonly ui?: Ui;
}

/** What the client entries start today, derived from setup.json (and, for older setups, the fixed-copy directory). */
export type CurrentInstall =
  | { readonly kind: 'fixed-copy'; readonly version: string; readonly entryPath: string; readonly dir: string }
  | { readonly kind: 'checkout' | 'npm-global'; readonly version?: string; readonly entryPath: string }
  | { readonly kind: 'docker'; readonly version?: string; readonly image: string; readonly reference?: string; readonly digest?: string }
  | { readonly kind: 'npx-latest' }
  | { readonly kind: 'unknown'; readonly version?: string };

const fixedCopyBase = (ctx: CliContext): string => path.dirname(fixedCopyDir(ctx, '0.0.0'));
const under = (file: string, dir: string): boolean => file.startsWith(dir + path.sep);

/** Fixed copies that really hold this package, newest first. */
export function listFixedCopies(ctx: CliContext): Array<{ version: string; dir: string; entryPath: string }> {
  const base = fixedCopyBase(ctx);
  const stat = lstatOrUndefined(base);
  if (stat === undefined || stat.isSymbolicLink() || !stat.isDirectory()) return [];
  const copies: Array<{ version: string; dir: string; entryPath: string }> = [];
  for (const name of readdirSync(base)) {
    let dir: string;
    try { dir = fixedCopyDir(ctx, name); } catch { continue; }
    const s = lstatOrUndefined(dir);
    if (s === undefined || s.isSymbolicLink() || !s.isDirectory()) continue;
    const entryPath = fixedCopyEntry(dir);
    const entryStat = lstatOrUndefined(entryPath);
    if (entryStat?.isFile() !== true || entryStat.isSymbolicLink()) continue;
    const layout = describeEntry(entryPath);
    const manifest = layout === undefined ? undefined : lstatOrUndefined(path.join(layout.packageRoot, 'package.json'));
    if (manifest?.isFile() !== true || manifest.isSymbolicLink()) continue;
    if (layout?.name === PACKAGE_NAME && layout.version === name) copies.push({ version: name, dir, entryPath });
  }
  return copies.sort((a, b) => compareVersions(b.version, a.version));
}

export function currentInstall(saved: SavedSetup, ctx: CliContext, runningEntry: string): CurrentInstall {
  if (saved.updateMode === 'npx-latest') return { kind: 'npx-latest' };
  if (saved.runtime === 'docker') {
    if (saved.image === undefined) return { kind: 'unknown' };
    const version = recordedVersion(saved);
    return { kind: 'docker', image: saved.image, ...(version ? { version } : {}),
      ...(saved.imageReference ? { reference: saved.imageReference } : {}), ...(saved.imageDigest ? { digest: saved.imageDigest } : {}) };
  }
  const base = fixedCopyBase(ctx);
  let entryPath = saved.entryPath;
  if (entryPath === undefined) {
    // Setups made before `update` existed recorded no entry path: a single fixed copy, or the copy this CLI runs from, is unambiguous.
    const copies = listFixedCopies(ctx);
    if (copies.length === 1) entryPath = copies[0].entryPath;
    else if (under(runningEntry, base) && copies.some((c) => c.entryPath === runningEntry)) entryPath = runningEntry;
    else return { kind: 'unknown', ...(saved.installedVersion ? { version: saved.installedVersion } : {}) };
  }
  const layout = describeEntry(entryPath);
  const version = layout?.version ?? saved.installedVersion;
  if (under(entryPath, base) && layout?.name === PACKAGE_NAME && layout.version !== undefined) {
    return { kind: 'fixed-copy', version: layout.version, entryPath, dir: fixedCopyDir(ctx, layout.version) };
  }
  return { kind: layout?.installRoot !== undefined ? 'npm-global' : 'checkout', entryPath, ...(version ? { version } : {}) };
}

const describeCurrent = (c: CurrentInstall): string => {
  switch (c.kind) {
    case 'fixed-copy': return `${c.version} (fixed copy ${c.dir})`;
    case 'docker': return `${c.version ?? 'unknown version'} (docker image ${c.image}${c.reference ? `, from ${c.reference}` : ''})`;
    case 'checkout': return `${c.version ?? 'unknown version'} (checkout ${path.dirname(path.dirname(path.dirname(c.entryPath)))})`;
    case 'npm-global': return `${c.version ?? 'unknown version'} (npm install, ${c.entryPath})`;
    case 'npx-latest': return 'always latest (clients start npx -y @nuoframework/darktrace-mcp@latest)';
    default: return c.version ?? 'unknown';
  }
};

interface ClientRow { readonly client: ClientId; readonly status: ClientResult['status']; readonly detail: string; readonly file?: string; readonly backup?: string }
interface Report {
  command: 'update' | 'check' | 'rollback';
  runtime: SavedSetup['runtime'];
  current: { kind: CurrentInstall['kind']; version?: string; entryPath?: string; image?: string };
  target?: { version: string; provenance?: boolean; entryPath?: string; image?: string; digest?: string };
  status: 'up-to-date' | 'update-available' | 'dry-run' | 'updated' | 'partial' | 'rolled-back' | 'cancelled' | 'not-applicable';
  verification?: { registrySignatures?: number; attestations?: number; checkConfig?: boolean; appliance?: boolean };
  clients?: ClientRow[];
  releaseNotes?: string;
  next?: string;
}

/** Appliance probe with the stored settings (same environment `test` uses). */
async function probeAppliance(ctx: CliContext): Promise<ProbeOutcome> {
  return (ctx.probeStatus ?? probeStatus)(onlineTestEnv(ctx));
}

/** The new copy's own offline `--check-config` with the stored settings: proves it loads the configuration and token files. */
function nodeCheckConfig(io: UpdateIo, entryPath: string): { ok: boolean; detail: string } {
  const exec = io.ctx.exec ?? ((command: string, args: readonly string[]) => io.ctx.run(command, args));
  const result = exec(io.execPath, [entryPath, '--check-config'], { env: onlineTestEnv(io.ctx), timeoutMs: 60_000 });
  let ok: boolean;
  try { ok = result.status === 0 && (JSON.parse(result.stdout.trim()) as { ok?: unknown }).ok === true; } catch { ok = false; }
  const line = (result.stderr || result.stdout).split(/\r?\n/).map((l) => l.trim()).find(Boolean) ?? '';
  return { ok, detail: line === '' ? '' : ` (${line.replace(/[^\x20-\x7e]/g, '').slice(0, 200)})` };
}

export async function runUpdate(args: UpdateArgs, io: UpdateIo): Promise<number> {
  if (args.check || args.dryRun) return runUpdateUnlocked(args, io);
  const releaseLock = acquireUpdateLock(io.ctx);
  try {
    recoverInterruptedUpdate(io);
    return await runUpdateUnlocked(args, io);
  } finally {
    releaseLock();
  }
}

async function runUpdateUnlocked(args: UpdateArgs, io: UpdateIo): Promise<number> {
  const { ctx } = io;
  // --json keeps stdout for the one JSON document: plain UI, no spinner frames.
  const ui = args.json ? createUi() : io.ui ?? createUi();
  const say = (text: string): void => { if (!args.json) io.stdout.write(text); };
  const saved = readSavedSetup(ctx);
  if (saved === undefined) throw new SetupInputError('no saved setup found; run `darktrace-mcp setup` first. Nothing was changed');
  if (saved.tokenMode === 'inline') {
    throw new SetupInputError('this setup keeps token values inside the client files (Windows inline mode) and update never reads them back; ' +
      'rerun `npx -y @nuoframework/darktrace-mcp@<new version> setup --inline-tokens-windows` instead. Nothing was changed');
  }
  const current = currentInstall(saved, ctx, io.entryPath);
  const report: Report = {
    command: args.rollback ? 'rollback' : args.check ? 'check' : 'update', runtime: saved.runtime, status: 'not-applicable',
    current: { kind: current.kind, ...('version' in current && current.version ? { version: current.version } : {}),
      ...('entryPath' in current ? { entryPath: current.entryPath } : {}), ...('image' in current ? { image: current.image } : {}) },
  };
  const finish = (code: number): number => { if (args.json) io.stdout.write(JSON.stringify(report) + '\n'); return code; };
  const title = args.rollback ? 'update --rollback' : args.check ? 'update --check' : 'update';
  say(ui.banner(`darktrace-mcp ${title}${args.dryRun ? ' (dry run: nothing will be changed)' : ''} · v${VERSION}`,
    args.rollback ? 'Points every client entry back at the previous version kept by update.' : 'Moves every client entry to a verified newer release; the previous version stays for --rollback.'));
  say(`Installed: ${describeCurrent(current)}\n`);

  if (args.rollback) return finish(await rollback(args, io, saved, current, report, ui, say));

  if (current.kind === 'npx-latest') {
    say('Clients start the newest published release at every start (update mode 2). There is nothing to pin or move;\n' +
      'to switch to pinned updates with verification and rollback, rerun `darktrace-mcp setup --update-mode pinned`.\n');
    if (!args.check) return finish(0);
  }

  // Registry: `latest` or the exact version asked for. Only registry.npmjs.org, never a configurable registry.
  const spinner = ui.spinner(io.stdout, 'Querying registry.npmjs.org');
  let target;
  try { target = resolveVersion(ctx, args.version ?? 'latest'); } finally { spinner.stop(); }
  report.target = { version: target.version, provenance: target.provenance };
  say(`Latest:    ${target.version} (registry.npmjs.org${args.version ? `, requested with --version` : ''}; provenance ${target.provenance ? 'published' : 'not published'})\n`);
  const legacyReleaseWithoutProvenance = compareVersions(target.version, '1.1.0') < 0 && !target.provenance;
  const targetNeedsProvenance = current.kind === 'fixed-copy' && (target.provenance || !legacyReleaseWithoutProvenance || !args.allowDowngrade);
  if (targetNeedsProvenance && !target.provenance) say(ui.warn(legacyReleaseWithoutProvenance
    ? `Release ${target.version} predates provenance and needs --allow-downgrade to run unverified.\n`
    : `Release ${target.version} is expected to publish provenance; a pinned node update will be refused until registry metadata announces it.\n`));
  if (target.deprecated !== undefined) say(ui.warn(`This version is deprecated by its publisher: ${target.deprecated}\n`));
  const installed = 'version' in current ? current.version : undefined;
  const direction = installed === undefined ? undefined : compareVersions(target.version, installed);

  if (args.check && current.kind === 'npx-latest') {
    report.status = 'up-to-date';
    const notes = await releaseNotes(ctx, target.version);
    if (notes !== undefined) { report.releaseNotes = notes; say(`\nRelease notes (${releaseUrl(target.version)}):\n${notes.split('\n').map((l) => `  ${l}`).join('\n')}\n\n`); }
    else say(`Release notes: ${releaseUrl(target.version)}\n`);
    say(`Clients resolve @latest when they start; registry latest is ${target.version}, so no update command is needed.\n`);
    return finish(0);
  }

  if (args.check) {
    if (direction === 0) { say(ui.ok('Up to date.\n')); report.status = 'up-to-date'; return finish(0); }
    if (direction !== undefined && direction < 0) { say(ui.ok(`Up to date (installed ${installed} is newer than ${target.version}).\n`)); report.status = 'up-to-date'; return finish(0); }
    report.status = 'update-available';
    if (targetNeedsProvenance && !target.provenance) {
      const notes = await releaseNotes(ctx, target.version);
      if (notes !== undefined) { report.releaseNotes = notes; say(`\nRelease notes (${releaseUrl(target.version)}):\n${notes.split('\n').map((l) => `  ${l}`).join('\n')}\n\n`); }
      else say(`Release notes: ${releaseUrl(target.version)}\n`);
      report.next = legacyReleaseWithoutProvenance
        ? `npx -y ${PACKAGE_NAME}@${target.version} update --allow-downgrade`
        : 'wait until the registry publishes provenance for this release';
      say(`Update available: ${installed ?? 'unknown'} -> ${target.version}, but this pinned update cannot proceed without provenance. ${report.next}\n`);
      return finish(1);
    }
    const notes = await releaseNotes(ctx, target.version);
    if (notes !== undefined) { report.releaseNotes = notes; say(`\nRelease notes (${releaseUrl(target.version)}):\n${notes.split('\n').map((l) => `  ${l}`).join('\n')}\n\n`); }
    else say(`Release notes: ${releaseUrl(target.version)}\n`);
    report.next = `npx -y ${PACKAGE_NAME}@${target.version} update${legacyReleaseWithoutProvenance ? ' --allow-downgrade' : ''}`;
    say(`Update available: ${installed ?? 'unknown'} -> ${target.version}. Run: ${report.next}\n`);
    return finish(current.kind === 'npx-latest' ? 0 : 1);
  }

  if (direction === 0) { say(ui.ok(`Already up to date (${installed}). Nothing was changed.\n`)); report.status = 'up-to-date'; return finish(0); }
  if (direction === undefined && current.kind === 'docker') {
    say(ui.warn('The installed version is unknown (the image was pinned by digest or ID, not by a release tag), so the downgrade check is skipped; ' +
      'the current image ID is still recorded for --rollback.\n'));
  }
  if (direction !== undefined && direction < 0 && !args.allowDowngrade) {
    throw new SetupInputError(`${target.version} is older than the installed ${installed}; downgrades are refused unless you pass --allow-downgrade ` +
      '(a downgrade reintroduces fixed issues). Nothing was changed');
  }
  if (targetNeedsProvenance && !target.provenance) {
    throw new SetupInputError(legacyReleaseWithoutProvenance
      ? `release ${target.version} predates the provenance requirement and has no provenance; pass --allow-downgrade only if you accept that unverified legacy code. Nothing was changed`
      : `release ${target.version} must have npm provenance metadata; registry.npmjs.org did not announce it. Nothing was changed`);
  }
  if (current.kind === 'checkout') {
    throw new SetupInputError(`the client entries start a source checkout (${current.entryPath}); update it with \`git pull --ff-only\` and \`npm run build\` ` +
      '(or rerun scripts/install.sh) instead of `update`. Nothing was changed');
  }
  if (current.kind === 'npm-global') {
    throw new SetupInputError(`the client entries start an npm installation (${current.entryPath}); update it with ` +
      `\`npm install -g ${PACKAGE_NAME}@${target.version}\` and rerun \`darktrace-mcp setup\`. Nothing was changed`);
  }
  if (current.kind === 'unknown') {
    throw new SetupInputError('setup.json does not say which copy the client entries start (setup predates update) and the fixed-copy directory is ambiguous; ' +
      `rerun \`npx -y ${PACKAGE_NAME}@${target.version} setup\` once, which records it. Nothing was changed`);
  }

  // Clients that carry the entry today; paste-only clients cannot be detected and get a snippet in the docs.
  const clients = CLIENT_IDS.filter((id) => hasClientEntry(id, ctx));
  say(`Clients with a darktrace entry: ${clients.length === 0 ? 'none found' : clients.map(clientLabel).join(', ')}\n`);
  if (clients.length === 0) say(ui.warn('No client entry found. The new version will be installed and recorded; add clients with `darktrace-mcp setup --client <name>`.\n'));

  if (args.dryRun) {
    report.status = 'dry-run';
    say(`\nPlan (${direction !== undefined && direction < 0 ? 'downgrade' : 'update'} ${installed ?? 'unknown'} -> ${target.version}):\n` + (current.kind === 'docker'
      ? `  1) docker pull ${IMAGE_REPOSITORY}:${target.version}, resolve the image ID and registry digest\n  2) container --check-config (no network) with the stored settings\n`
      : `  1) npm install ${PACKAGE_NAME}@${target.version} into a temporary directory (locked dependencies, no scripts)\n` +
        `  2) npm audit signatures: registry signatures${target.provenance ? ' and provenance attestation' : ''}\n  3) copy to ${fixedCopyDir(ctx, target.version)}\n  4) new copy --check-config with the stored settings\n`) +
      `  ${current.kind === 'docker' ? 3 : 5}) signed GET /status from this host\n  ${current.kind === 'docker' ? 4 : 6}) rewrite the entry in: ${clients.length === 0 ? 'no client' : clients.map(clientLabel).join(', ')} (backups kept)\n` +
      `  ${current.kind === 'docker' ? 5 : 7}) record ${installed ?? 'the current version'} as previousVersion in ${setupDir(ctx)}/setup.json; the current ${current.kind === 'docker' ? 'image' : 'copy'} is kept for --rollback\n`);
    return finish(0);
  }

  if (!args.yes && !(await confirm(io, `Update ${installed ?? 'the installed version'} -> ${target.version}?`))) {
    say('Cancelled. Nothing was changed (rerun with --yes to skip this question).\n');
    report.status = 'cancelled';
    return finish(1);
  }

  // Acquire and verify the new version without touching any client entry.
  let newEntryPath: string | undefined;
  let newImage: ResolvedImage | undefined;
  let signatures: SignatureReport | undefined;
  report.verification = {};
  if (current.kind === 'docker') {
    newImage = await acquireImage(io, ui, say, target.version);
    report.target.image = newImage.id;
    if (newImage.digest) report.target.digest = newImage.digest;
    const dockerPath = findOnPath('docker', ctx.env, ctx.platform) as string;
    if (io.uid === undefined || io.gid === undefined || io.uid === 0) throw new SetupInputError('the docker runtime needs a regular (non-root) POSIX user. Nothing was changed');
    const check = containerCheckConfig(ctx, saved, newImage.id, { uid: io.uid, gid: io.gid, platform: ctx.platform, dockerPath });
    report.verification.checkConfig = check.ok;
    if (!check.ok) throw new SetupInputError(`container --check-config failed with the new image ${newImage.id}${check.detail}. Client entries were not changed; the previous image stays in use`);
    say(ui.ok(`Container --check-config passed with image ${newImage.id} (token mounts readable, no network).\n`));
  } else {
    let download: Download | undefined;
    try {
      const downloading = ui.spinner(io.stdout, `Downloading ${PACKAGE_NAME}@${target.version} with npm`);
      try {
        if (target.integrity === undefined) throw new SetupInputError('the registry did not provide a usable sha512 tarball integrity. Nothing was changed');
        download = downloadPackage(ctx, target.version, target.integrity);
      } finally { downloading.stop(); }
      say(ui.ok(`Downloaded ${PACKAGE_NAME}@${target.version} (locked dependencies, no lifecycle scripts).\n`));
      const verifying = ui.spinner(io.stdout, 'npm audit signatures');
      try { signatures = verifySignatures(ctx, download, target.provenance || targetNeedsProvenance); } finally { verifying.stop(); }
      if (target.provenance || targetNeedsProvenance) verifyRepositoryProvenance(ctx, download);
      report.verification.registrySignatures = signatures.signatures;
      report.verification.attestations = signatures.attestations;
      say(ui.ok(`Verified: registry signatures for ${signatures.signatures} package${signatures.signatures === 1 ? '' : 's'}, provenance attestations for ${signatures.attestations}.\n`));
      // Always the tree that was just verified: a directory left by an earlier run is replaced, never trusted.
      const existed = lstatOrUndefined(fixedCopyDir(ctx, target.version)) !== undefined;
      const copy = installFixedCopy(download.entryPath, ctx, false, true);
      newEntryPath = copy.entryPath;
      report.target.entryPath = newEntryPath;
      say(ui.ok(`Installed the verified copy in ${copy.dir}${existed ? ' (replaced the directory that was already there)' : ''}.\n`));
    } finally {
      if (download !== undefined) removeDownload(download);
    }
    const check = nodeCheckConfig(io, newEntryPath);
    report.verification.checkConfig = check.ok;
    if (!check.ok) throw new SetupInputError(`the new copy's --check-config failed${check.detail}. Client entries were not changed; the copy in ${fixedCopyDir(ctx, target.version)} can be deleted or kept`);
    say(ui.ok('New copy --check-config passed with the stored settings (no network).\n'));
  }

  const probing = ui.spinner(io.stdout, 'Signed GET /status');
  let outcome: ProbeOutcome;
  try { outcome = await probeAppliance(ctx); } finally { probing.stop(); }
  report.verification.appliance = outcome.ok;
  if (!outcome.ok) {
    throw new SetupInputError(`the appliance check (signed GET /status) failed: ${describeProbeFailure(outcome).replace(/\.$/, '')}. ` +
      'Client entries were not changed and the previous version stays in use; fix the problem (`darktrace-mcp test`) and rerun update');
  }
  say(ui.ok(`Appliance answered signed GET /status (HTTP ${outcome.status}); URL, TLS and tokens are valid.\n`));

  // Journal the prior launch before touching any client so a killed process can restore the full set on its next run.
  const restoreLaunch: Launch = current.kind === 'docker' ? { kind: 'docker', image: current.image }
    : { kind: 'node', entryPath: (current as Extract<CurrentInstall, { kind: 'fixed-copy' }>).entryPath };
  const targetLaunch: Launch = current.kind === 'docker' ? { kind: 'docker', image: (newImage as ResolvedImage).id }
    : { kind: 'node', entryPath: newEntryPath as string };
  const journal = beginJournal(ctx, saved, clients, restoreLaunch);
  const results = rewriteClients(io, saved, clients, targetLaunch);
  report.clients = results.map(row);
  const incomplete = results.filter((r) => !rewritten(r));
  if (incomplete.length > 0) {
    const recovered = restoreJournal(io, journal);
    const finalResults = recoveryResults(recovered.results, incomplete);
    if (finalResults.length > 0) report.clients = finalResults.map(row);
    report.status = 'partial';
    report.next = recovered.ok ? 'fix the listed client and rerun update' : 'fix the listed clients and rerun update to resume recovery';
    printSummary(io, ui, say, [[ui.marker(recovered.ok ? 'ok' : 'warn'), 'Settings', recovered.ok ? 'unchanged' : 'recovery pending', `${setupDir(ctx)}/setup.json records ${installed ?? 'the previous version'}`]], finalResults);
    say('\n' + ui.fail(`${incomplete.map((r) => clientLabel(r.client)).join(', ')}: entry not rewritten (see above). ${recovered.ok ? 'The previous launch was restored where possible.' : 'Recovery is pending; fix the listed clients and rerun `darktrace-mcp update`.'} The verified ${current.kind === 'docker' ? 'image' : 'copy'} is kept.\n`));
    return finish(1);
  }
  const previous: Partial<SavedSetup> = installed === undefined ? {} : { previousVersion: installed };
  if (current.kind === 'docker') {
    const image = newImage as ResolvedImage;
    writeSavedSetup(ctx, { ...withoutPrevious(saved), ...previous, previousImage: current.image, ...(current.digest ? { previousImageDigest: current.digest } : {}),
      image: image.id, imageReference: image.reference, ...(image.digest ? { imageDigest: image.digest } : {}), installedVersion: target.version });
  } else {
    writeSavedSetup(ctx, { ...withoutPrevious(saved), ...previous, previousEntryPath: (current as Extract<CurrentInstall, { kind: 'fixed-copy' }>).entryPath,
      entryPath: newEntryPath as string, installedVersion: target.version });
  }
  commitJournal(ctx, journal);
  report.status = 'updated';
  report.next = 'restart your AI clients';
  printSummary(io, ui, say, [
    ...(current.kind === 'docker' ? [[ui.marker('ok'), 'Image', 'pulled', `${(newImage as ResolvedImage).id}${(newImage as ResolvedImage).digest ? ` (digest ${(newImage as ResolvedImage).digest})` : ''}`]]
      : [[ui.marker('ok'), 'Package', 'verified', `signatures ${signatures?.signatures ?? 0}, attestations ${signatures?.attestations ?? 0}`], [ui.marker('ok'), 'Fixed copy', 'installed', fixedCopyDir(ctx, target.version)]]),
    [ui.marker('ok'), 'Check-config', 'passed', 'stored settings, no network'],
    [ui.marker('ok'), 'Appliance', 'passed', 'signed GET /status'],
    [ui.marker('ok'), 'Settings', 'written', `${setupDir(ctx)}/setup.json (previousVersion ${installed ?? 'unknown'}, previous ${current.kind === 'docker' ? 'image' : 'copy'} kept)`],
  ], results);
  say('\n' + ui.paint('bold', 'Next:') + ` restart your AI clients. Roll back any time with \`darktrace-mcp update --rollback\`; the previous ${current.kind === 'docker' ? 'image' : 'copy'} is kept.\n`);
  return finish(0);
}

/** Force-pull the release tag and compare its repository digest with the corresponding GitHub release record. */
async function acquireImage(io: UpdateIo, ui: Ui, say: (text: string) => void, version: string): Promise<ResolvedImage> {
  const { ctx } = io;
  const dockerPath = findOnPath('docker', ctx.env, ctx.platform);
  if (dockerPath === undefined) throw new SetupInputError(dockerInstallHelp(ctx.platform).replace(/rerun setup/, 'rerun update').replace(/Nothing was written$/, 'Nothing was changed'));
  checkDockerDaemon(ctx, dockerPath);
  const ref = parseImageReference(`${IMAGE_REPOSITORY}:${version}`);
  const expectedDigest = await releaseImageDigest(ctx, version, IMAGE_REPOSITORY);
  if (expectedDigest === undefined) throw new SetupInputError(`the GitHub release ${version} has no single usable ${IMAGE_REPOSITORY} digest. Client entries were not changed`);
  say(`Pulling ${ref.value}...\n`);
  pullImage(ctx, dockerPath, ref);
  const resolved = inspectImage(ctx, dockerPath, ref);
  if (resolved === undefined) throw new SetupInputError(`docker pull finished but ${ref.value} is still not present locally. Nothing was changed`);
  if (resolved.digest !== expectedDigest) throw new SetupInputError(`the pulled image digest for ${ref.value} does not match the GitHub release record. Client entries were not changed`);
  say(ui.ok(`Image ${ref.value}: ID ${resolved.id}${resolved.digest ? `, digest ${resolved.digest}` : ', no registry digest'}.\n`));
  return { ...resolved, reference: ref.value, digest: expectedDigest };
}

type Launch = { readonly kind: 'node'; readonly entryPath: string } | { readonly kind: 'docker'; readonly image: string };

interface UpdateJournal {
  readonly version: 1;
  readonly stage: 'switching' | 'committed';
  readonly saved: SavedSetup;
  readonly clients: readonly ClientId[];
  readonly restore: Launch;
}

const lockPath = (ctx: CliContext): string => path.join(setupDir(ctx), '.update.lock');
const journalPath = (ctx: CliContext): string => path.join(setupDir(ctx), '.update-transaction.json');

function clearStaleLock(file: string): boolean {
  const before = lstatOrUndefined(file);
  if (before === undefined || !before.isFile() || before.isSymbolicLink()) return false;
  let pid: number;
  try { pid = Number(readFileSync(file, 'utf8').trim()); } catch { return false; }
  if (!Number.isSafeInteger(pid) || pid < 1) return false;
  try { process.kill(pid, 0); return false; } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ESRCH') return false;
  }
  const after = lstatOrUndefined(file);
  if (after === undefined || after.dev !== before.dev || after.ino !== before.ino || after.isSymbolicLink()) return false;
  try { unlinkSync(file); return true; } catch { return false; }
}

/** Prevent concurrent update and rollback processes from interleaving client and state writes. */
function acquireUpdateLock(ctx: CliContext): () => void {
  ensurePrivateDir(setupDir(ctx));
  const file = lockPath(ctx);
  const flags = constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (Object.hasOwn(constants, 'O_NOFOLLOW') ? constants.O_NOFOLLOW : 0);
  for (let attempt = 0; attempt < 2; attempt++) {
    let fd: number | undefined;
    try {
      fd = openSync(file, flags, 0o600);
      writeSync(fd, `${process.pid}\n`);
      fsyncSync(fd);
      closeSync(fd);
      fd = undefined;
      const owned = lstatOrUndefined(file);
      if (owned === undefined) throw new SetupInputError('could not retain the update lock. Nothing was changed');
      return () => {
        const current = lstatOrUndefined(file);
        if (current?.dev === owned.dev && current.ino === owned.ino && current.isFile() && !current.isSymbolicLink()) unlinkSync(file);
      };
    } catch (error) {
      if (fd !== undefined) { try { closeSync(fd); } catch { /* preserve the original failure */ } }
      if (attempt === 0 && (error as NodeJS.ErrnoException).code === 'EEXIST' && clearStaleLock(file)) continue;
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new SetupInputError('another update or rollback is already running. Wait for it to finish and retry');
      throw error;
    }
  }
  throw new SetupInputError('another update or rollback is already running. Wait for it to finish and retry');
}

function persistJournal(ctx: CliContext, journal: UpdateJournal): void {
  atomicWrite(journalPath(ctx), JSON.stringify(journal) + '\n', 0o600);
}

function removeJournal(ctx: CliContext): void {
  const file = journalPath(ctx);
  const stat = lstatOrUndefined(file);
  if (stat === undefined) return;
  if (!stat.isFile() || stat.isSymbolicLink()) throw new SetupInputError('the update recovery record is not a regular file; inspect it before retrying');
  unlinkSync(file);
}

function readJournal(ctx: CliContext): UpdateJournal | undefined {
  const file = journalPath(ctx);
  const stat = lstatOrUndefined(file);
  if (stat === undefined) return undefined;
  if (!stat.isFile() || stat.isSymbolicLink()) throw new SetupInputError('the update recovery record is not a regular file; inspect it before retrying');
  if (process.platform !== 'win32' && ((stat.mode & 0o077) !== 0 || (typeof process.getuid === 'function' && stat.uid !== process.getuid()))) {
    throw new SetupInputError('the update recovery record has unsafe ownership or permissions; inspect it before retrying');
  }
  let raw: unknown;
  try { raw = JSON.parse(readFileSync(file, 'utf8')); } catch { throw new SetupInputError('the update recovery record is unreadable; inspect it before retrying'); }
  if (raw === null || typeof raw !== 'object') throw new SetupInputError('the update recovery record is invalid; inspect it before retrying');
  const value = raw as Record<string, unknown>;
  const saved = value.saved as SavedSetup | undefined;
  const clients = value.clients;
  const restore = value.restore as Launch | undefined;
  if (value.version !== 1 || (value.stage !== 'switching' && value.stage !== 'committed') || saved?.version !== 1 ||
      typeof saved.url !== 'string' || typeof saved.profiles !== 'string' || !Array.isArray(clients) || !clients.every(isClientId) ||
      restore === undefined || (restore.kind !== 'node' && restore.kind !== 'docker')) {
    throw new SetupInputError('the update recovery record is invalid; inspect it before retrying');
  }
  if (restore.kind === 'node') {
    const layout = describeEntry(restore.entryPath);
    const expected = layout === undefined ? undefined : fixedCopyEntry(fixedCopyDir(ctx, layout.version));
    if (!path.isAbsolute(restore.entryPath) || layout?.name !== PACKAGE_NAME || expected !== restore.entryPath ||
        !listFixedCopies(ctx).some((copy) => copy.entryPath === restore.entryPath && copy.version === layout.version)) {
      throw new SetupInputError('the update recovery record points outside a verified fixed copy; inspect it before retrying');
    }
  } else if (!/^sha256:[a-f0-9]{64}$/.test(restore.image)) {
    throw new SetupInputError('the update recovery record has an invalid image ID; inspect it before retrying');
  }
  return { version: 1, stage: value.stage, saved, clients, restore };
}

function restoreJournal(io: UpdateIo, journal: UpdateJournal): { readonly ok: boolean; readonly results: ClientResult[] } {
  const results: ClientResult[] = [];
  const entry = entryFor(io, journal.saved, journal.restore);
  for (const id of journal.clients) {
    try { results.push(installClient(id, entry, io.ctx, { dryRun: false, inlineTokens: false })); }
    catch (error) { results.push({ client: id, status: 'failed', detail: error instanceof Error ? error.message : 'failed' }); }
  }
  const ok = results.every(rewritten);
  // Keep setup.json conservative during recovery even if a prior process had written the target state already.
  writeSavedSetup(io.ctx, journal.saved);
  if (ok) removeJournal(io.ctx);
  return { ok, results };
}

function recoveryResults(restored: readonly ClientResult[], original: readonly ClientResult[]): ClientResult[] {
  return restored.map((result) => {
    const failed = original.find((row) => row.client === result.client && !rewritten(row));
    if (failed === undefined) return result;
    return { ...result, status: failed.status === 'manual' ? 'manual' : 'failed', detail: `${failed.detail}; ${rewritten(result) ? 'the previous entry was restored' : 'the previous entry could not be restored'}` };
  });
}

/** Recover a process interrupted while switching client entries; a committed switch only needs journal cleanup. */
function recoverInterruptedUpdate(io: UpdateIo): void {
  const journal = readJournal(io.ctx);
  if (journal === undefined) return;
  if (journal.stage === 'committed') { removeJournal(io.ctx); return; }
  const recovered = restoreJournal(io, journal);
  if (!recovered.ok) throw new SetupInputError('a previous update was interrupted and its client entries could not all be restored. Fix the listed client configurations and retry');
}

function beginJournal(ctx: CliContext, saved: SavedSetup, clients: readonly ClientId[], restore: Launch): UpdateJournal {
  const journal: UpdateJournal = { version: 1, stage: 'switching', saved, clients, restore };
  persistJournal(ctx, journal);
  return journal;
}

function commitJournal(ctx: CliContext, journal: UpdateJournal): void {
  persistJournal(ctx, { ...journal, stage: 'committed' });
  removeJournal(ctx);
}

const rewritten = (r: ClientResult): boolean => r.status === 'written' || r.status === 'unchanged' || r.status === 'command';

function entryFor(io: UpdateIo, saved: SavedSetup, launch: Launch): ReturnType<typeof buildServerEntry> {
  const { ctx } = io;
  const settings: InstallSettings = {
    url: saved.url, profiles: saved.profiles, runtime: launch.kind, tokenMode: 'file', ...tokenPaths(ctx), nodePath: io.execPath,
    entryPath: launch.kind === 'node' ? launch.entryPath : '', acknowledgeSensitiveWrite: saved.acknowledgeSensitiveWrite === true,
    ...(saved.dateFormat ? { dateFormat: saved.dateFormat } : {}),
    ...(launch.kind === 'docker' ? { dockerPath: findOnPath('docker', ctx.env, ctx.platform) ?? 'docker', image: launch.image, uid: io.uid, gid: io.gid, hostPlatform: ctx.platform } : {}),
  };
  return buildServerEntry(settings);
}

/**
 * Rewrite the darktrace entry of the listed clients with the stored settings and the new launch target. The caller's
 * recovery journal restores the previous launch if any writer fails or the process is interrupted.
 */
function rewriteClients(io: UpdateIo, saved: SavedSetup, clients: readonly ClientId[], launch: Launch): ClientResult[] {
  const { ctx } = io;
  const entry = entryFor(io, saved, launch);
  const results: ClientResult[] = [];
  for (const id of clients) {
    let result: ClientResult;
    try { result = installClient(id, entry, ctx, { dryRun: false, inlineTokens: false }); }
    catch (error) { result = { client: id, status: 'failed', detail: error instanceof Error ? error.message : 'failed' }; }
    results.push(result);
  }
  return results;
}

async function rollback(args: UpdateArgs, io: UpdateIo, saved: SavedSetup, current: CurrentInstall, report: Report, ui: Ui, say: (text: string) => void): Promise<number> {
  const { ctx } = io;
  if (args.version !== undefined || args.allowDowngrade) throw new SetupInputError('--rollback takes no --version or --allow-downgrade: it returns to the version recorded by the last update');
  if (current.kind === 'npx-latest') throw new SetupInputError('clients start the newest release at every start (update mode 2); there is no previous version to return to. Nothing was changed');
  const previous = saved.previousVersion ?? (saved.runtime === 'docker' && saved.previousImage !== undefined ? 'unknown version' : undefined);
  if (previous === undefined) throw new SetupInputError('nothing to roll back to: no previous version was recorded by update. Nothing was changed');
  report.target = { version: previous };
  let launch: Launch;
  let where: string;
  if (saved.runtime === 'docker') {
    const image = saved.previousImage;
    if (image === undefined) throw new SetupInputError('the previous image ID was not recorded. Nothing was changed');
    const dockerPath = findOnPath('docker', ctx.env, ctx.platform);
    if (dockerPath === undefined) throw new SetupInputError(dockerInstallHelp(ctx.platform).replace(/Nothing was written$/, 'Nothing was changed'));
    if (inspectImage(ctx, dockerPath, { kind: 'id', value: image }) === undefined) {
      throw new SetupInputError(`the previous image ${image} (${previous}) is no longer present locally; rerun \`darktrace-mcp setup --runtime docker --image <reference>\` to pull it again. Nothing was changed`);
    }
    launch = { kind: 'docker', image };
    where = `image ${image}`;
    report.target.image = image;
  } else {
    const entryPath = saved.previousEntryPath;
    const layout = entryPath === undefined ? undefined : describeEntry(entryPath);
    const expectedEntry = fixedCopyEntry(fixedCopyDir(ctx, previous));
    const trustedCopy = entryPath === expectedEntry && layout?.name === PACKAGE_NAME && layout.version === previous &&
      listFixedCopies(ctx).some((copy) => copy.version === previous && copy.entryPath === expectedEntry);
    if (!trustedCopy) {
      throw new SetupInputError(`the previous copy of ${previous} is no longer present in the verified fixed-copy store; ` +
        `rerun \`npx -y ${PACKAGE_NAME}@${previous} setup\` to install it again. Nothing was changed`);
    }
    launch = { kind: 'node', entryPath: expectedEntry };
    where = `fixed copy ${fixedCopyDir(ctx, previous)}`;
    report.target.entryPath = entryPath;
  }
  say(`Previous:  ${previous} (${where})\n`);
  say(ui.warn('Rollback restarts the previously recorded code, which may restore security issues fixed in newer releases. Verify the selected version before continuing.\n'));
  const clients = CLIENT_IDS.filter((id) => hasClientEntry(id, ctx));
  say(`Clients with a darktrace entry: ${clients.length === 0 ? 'none found' : clients.map(clientLabel).join(', ')}\n`);
  if (args.dryRun) {
    report.status = 'dry-run';
    say(`\nPlan:\n  1) ${launch.kind === 'docker' ? 'container' : 'previous copy'} --check-config with the stored settings (no network)\n` +
      `  2) rewrite the entry in: ${clients.length === 0 ? 'no client' : clients.map(clientLabel).join(', ')} (backups kept)\n  3) swap installedVersion and previousVersion in setup.json\n`);
    return 0;
  }
  if (!args.yes && !(await confirm(io, `Roll back ${'version' in current && current.version ? current.version : 'the current version'} -> ${previous}?`))) {
    say('Cancelled. Nothing was changed.\n');
    report.status = 'cancelled';
    return 1;
  }
  report.verification = {};
  if (launch.kind === 'docker') {
    if (io.uid === undefined || io.gid === undefined || io.uid === 0) throw new SetupInputError('the docker runtime needs a regular (non-root) POSIX user. Nothing was changed');
    const check = containerCheckConfig(ctx, saved, launch.image, { uid: io.uid, gid: io.gid, platform: ctx.platform, dockerPath: findOnPath('docker', ctx.env, ctx.platform) as string });
    report.verification.checkConfig = check.ok;
    if (!check.ok) throw new SetupInputError(`container --check-config failed with the previous image${check.detail}. Client entries were not changed`);
  } else {
    const check = nodeCheckConfig(io, launch.entryPath);
    report.verification.checkConfig = check.ok;
    if (!check.ok) throw new SetupInputError(`the previous copy's --check-config failed${check.detail}. Client entries were not changed`);
  }
  say(ui.ok('Check-config passed with the stored settings (no network).\n'));
  const nowLaunch: Launch | undefined = current.kind === 'docker' ? { kind: 'docker', image: current.image } : current.kind === 'fixed-copy' ? { kind: 'node', entryPath: current.entryPath } : undefined;
  if (nowLaunch === undefined) throw new SetupInputError('the current launch target is not a pinned copy or image, so rollback cannot be made safely. Nothing was changed');
  const journal = beginJournal(ctx, saved, clients, nowLaunch);
  const results = rewriteClients(io, saved, clients, launch);
  report.clients = results.map(row);
  const incomplete = results.filter((r) => !rewritten(r));
  if (incomplete.length > 0) {
    const recovered = restoreJournal(io, journal);
    const finalResults = recoveryResults(recovered.results, incomplete);
    if (finalResults.length > 0) report.clients = finalResults.map(row);
    report.status = 'partial';
    printSummary(io, ui, say, [[ui.marker(recovered.ok ? 'ok' : 'warn'), 'Settings', recovered.ok ? 'unchanged' : 'recovery pending', `${setupDir(ctx)}/setup.json`]], finalResults);
    say('\n' + ui.fail(`${recovered.ok ? 'Rollback was cancelled and the current launch was restored where possible.' : 'Recovery is pending.'} Fix the listed clients and rerun \`darktrace-mcp update --rollback\`.\n`));
    return 1;
  }
  const nowCurrent = 'version' in current ? current.version : undefined;
  const known = saved.previousVersion !== undefined;
  if (launch.kind === 'docker') {
    const { installedVersion: _iv, imageReference: _ir, imageDigest: _id, ...rest } = withoutPrevious(saved);
    writeSavedSetup(ctx, { ...rest, image: launch.image, ...(saved.previousImageDigest ? { imageDigest: saved.previousImageDigest } : {}),
      ...(known ? { imageReference: `${IMAGE_REPOSITORY}:${previous}`, installedVersion: previous } : {}),
      ...(current.kind === 'docker' ? { previousImage: current.image, ...(current.digest ? { previousImageDigest: current.digest } : {}), ...(nowCurrent ? { previousVersion: nowCurrent } : {}) } : {}) });
  } else {
    writeSavedSetup(ctx, { ...withoutPrevious(saved), entryPath: launch.entryPath, installedVersion: previous,
      ...(nowCurrent && current.kind === 'fixed-copy' ? { previousVersion: nowCurrent, previousEntryPath: current.entryPath } : {}) });
  }
  commitJournal(ctx, journal);
  report.status = 'rolled-back';
  report.next = 'restart your AI clients';
  printSummary(io, ui, say, [
    [ui.marker('ok'), launch.kind === 'docker' ? 'Image' : 'Fixed copy', 'restored', where],
    [ui.marker('ok'), 'Check-config', 'passed', 'stored settings, no network'],
    [ui.marker('ok'), 'Settings', 'written', `${setupDir(ctx)}/setup.json (installedVersion ${previous}${nowCurrent ? `, previousVersion ${nowCurrent}` : ''})`],
  ], results);
  say('\n' + ui.paint('bold', 'Next:') + ' restart your AI clients, then run `darktrace-mcp test`.\n');
  return results.some((r) => r.status === 'failed') ? 1 : 0;
}

/** Saved state without the rollback pointers (they are replaced by every update or rollback). */
function withoutPrevious(saved: SavedSetup): SavedSetup {
  const { previousVersion: _v, previousEntryPath: _e, previousImage: _i, previousImageDigest: _d, ...rest } = saved;
  return rest;
}

const row = (r: ClientResult): ClientRow => ({ client: r.client, status: r.status, detail: r.detail, ...(r.file ? { file: r.file } : {}), ...(r.backup ? { backup: r.backup } : {}) });

function printSummary(io: UpdateIo, ui: Ui, say: (text: string) => void, head: string[][], results: readonly ClientResult[]): void {
  const rows = [...head];
  for (const r of results) {
    const marker = r.status === 'written' || r.status === 'command' || r.status === 'unchanged' ? 'ok' : r.status === 'failed' ? 'fail' : 'warn';
    rows.push([ui.marker(marker), clientLabel(r.client), r.status, r.detail]);
    if (r.backup) rows.push(['', '', 'backup', r.backup]);
  }
  say('\n' + ui.paint('bold', 'Summary') + '\n' + ui.table(rows));
  for (const r of results) if (r.snippet && (r.status === 'manual' || r.status === 'failed')) say(`\n--- ${clientLabel(r.client)}: do this by hand ---\n${r.snippet}\n`);
}

async function confirm(io: UpdateIo, question: string): Promise<boolean> {
  let prompter = io.prompter;
  let owned = false;
  if (prompter === undefined) {
    if (io.stdin.isTTY === true) { prompter = createTtyPrompter(io.stdin, io.stdout); owned = true; }
    else prompter = createLinePrompter(await readStdinLines(io.stdin), io.stdout);
  }
  try {
    const answer = (await prompter.ask(`\n${question} [Y/n] `)).trim().toLowerCase();
    return answer === '' || answer === 'y' || answer === 'yes';
  } catch {
    return false;
  } finally {
    if (owned) prompter.close();
  }
}
