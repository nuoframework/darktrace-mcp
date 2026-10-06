import type { CliContext, RunResult } from './clients.js';
import { SetupInputError } from './entry.js';
import { describeEntry } from './install.js';

/**
 * Docker runtime helpers for `setup`, `config` and `test`.
 *
 * The operator names an image by tag, digest or ID; setup resolves it to the local image ID, which is what every client
 * entry starts (`--pull=never`), and records the registry digest so it can be compared with the GitHub Release notes.
 * Every docker call is an argument vector (never a shell), and references are validated before they reach docker.
 */
export const IMAGE_REPOSITORY = 'ghcr.io/nuoframework/darktrace-mcp';

export type ImageReferenceKind = 'tag' | 'digest' | 'id';
export interface ImageReference {
  readonly kind: ImageReferenceKind;
  readonly value: string;
  /** Repository name without tag or digest (tag and digest references only). */
  readonly name?: string;
}

export interface ResolvedImage {
  /** Reference the operator gave (tag, digest or ID). */
  readonly reference: string;
  /** Local image ID (`sha256:<64 hex>`) written into client entries. */
  readonly id: string;
  /** Registry digest reference (`name@sha256:<64 hex>`), when the image came from a registry. */
  readonly digest?: string;
}

const HEX64 = /^[a-f0-9]{64}$/;
const MAX_REFERENCE = 255;

/** Path component: lowercase alphanumerics joined by one `.`, one `_`, `__` or a run of `-` (Docker reference grammar). */
function validComponent(part: string): boolean {
  if (part.length === 0 || !/^[a-z0-9._-]+$/.test(part) || !/^[a-z0-9]/.test(part) || !/[a-z0-9]$/.test(part)) return false;
  for (const separator of part.split(/[a-z0-9]+/).filter(Boolean)) {
    if (separator !== '.' && separator !== '_' && separator !== '__' && !/^-+$/.test(separator)) return false;
  }
  return true;
}

/** Registry host: DNS labels with an optional port. */
function validDomain(part: string): boolean {
  const colon = part.indexOf(':');
  const host = colon === -1 ? part : part.slice(0, colon);
  if (colon !== -1) {
    const port = part.slice(colon + 1);
    if (!/^[0-9]{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535) return false;
  }
  return host.length > 0 && host.split('.').every((label) => label.length > 0 && label.length <= 63 && /^[a-zA-Z0-9-]+$/.test(label) &&
    !label.startsWith('-') && !label.endsWith('-'));
}

/** Repository name: `[domain/]component[/component...]`. The first part is a domain when it has `.` or `:` or is localhost. */
function validName(name: string): boolean {
  if (name.length === 0 || name.length > MAX_REFERENCE) return false;
  const parts = name.split('/');
  const first = parts[0];
  const hasDomain = parts.length > 1 && (first.includes('.') || first.includes(':') || first === 'localhost');
  if (hasDomain && !validDomain(first)) return false;
  return (hasDomain ? parts.slice(1) : parts).every(validComponent);
}

const REFERENCE_HELP = 'Docker image must be a tag reference (for example ghcr.io/nuoframework/darktrace-mcp:1.1.2), ' +
  'a digest reference (name@sha256:<64 hex>) or a local image ID (sha256:<64 hex>)';

/** Strictly classify an image reference. Never echoes the rejected value. */
export function parseImageReference(raw: string): ImageReference {
  const value = raw.trim();
  if (value.length === 0 || value.length > MAX_REFERENCE + 72) throw new SetupInputError(REFERENCE_HELP);
  if (value.startsWith('sha256:')) {
    if (!HEX64.test(value.slice(7))) throw new SetupInputError(REFERENCE_HELP);
    return { kind: 'id', value };
  }
  const at = value.indexOf('@');
  if (at !== -1) {
    const name = value.slice(0, at);
    const digest = value.slice(at + 1);
    if (!digest.startsWith('sha256:') || !HEX64.test(digest.slice(7)) || !validName(name)) throw new SetupInputError(REFERENCE_HELP);
    return { kind: 'digest', value, name };
  }
  const slash = value.lastIndexOf('/');
  const colon = value.lastIndexOf(':');
  if (colon <= slash) throw new SetupInputError(`${REFERENCE_HELP}; a tag reference needs an explicit :tag`);
  const name = value.slice(0, colon);
  const tag = value.slice(colon + 1);
  if (!/^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$/.test(tag) || !validName(name)) throw new SetupInputError(REFERENCE_HELP);
  return { kind: 'tag', value, name };
}

export const isImageId = (value: string): boolean => value.startsWith('sha256:') && HEX64.test(value.slice(7));
export function isDigestReference(value: string): boolean {
  try { return parseImageReference(value).kind === 'digest'; } catch { return false; }
}

/** Default image reference for this package version: `ghcr.io/nuoframework/darktrace-mcp:<version>`, read from the running package.json. */
export function defaultImageReference(entryPath: string): string | undefined {
  const layout = describeEntry(entryPath);
  return layout === undefined ? undefined : `${IMAGE_REPOSITORY}:${layout.version}`;
}

/** Runs docker with an argument vector. `stream` lets docker print progress (docker pull) straight to the terminal. */
export type DockerRunner = (command: string, args: readonly string[], options?: { readonly stream?: boolean }) => RunResult;
const runner = (ctx: Pick<CliContext, 'run' | 'runDocker'>): DockerRunner => ctx.runDocker ?? ((command, args) => ctx.run(command, args));

/** First line of docker's stderr, printable ASCII only and bounded. Docker messages carry no installer secret. */
export function dockerDetail(result: RunResult): string {
  const line = (result.stderr || result.stdout).split(/\r?\n/).map((l) => l.trim()).find(Boolean) ?? '';
  const clean = line.replace(/[^\x20-\x7e]/g, '').slice(0, 200);
  return clean === '' ? '' : ` (docker said: ${clean})`;
}

/** What to install when the docker CLI is missing. */
export function dockerInstallHelp(platform: NodeJS.Platform): string {
  return platform === 'linux'
    ? 'docker is not on PATH. Install Docker Engine (for example `sudo apt install docker.io`), add your user to the docker group ' +
      '(`sudo usermod -aG docker $USER`, then log out and back in) and rerun setup. Nothing was written'
    : 'docker is not on PATH. Install Docker Desktop (https://docs.docker.com/desktop/), start it, and rerun setup. Nothing was written';
}

/** Check that the Docker daemon answers and runs Linux containers. Returns `os/arch`; throws guidance otherwise. */
export function checkDockerDaemon(ctx: Pick<CliContext, 'run' | 'runDocker' | 'platform'>, dockerPath: string): string {
  const result = runner(ctx)(dockerPath, ['version', '--format', '{{.Server.Os}}/{{.Server.Arch}}']);
  const server = result.stdout.trim();
  if (result.status !== 0 || !/^[a-z0-9]+\/[a-z0-9_]+$/.test(server)) {
    const how = ctx.platform === 'linux'
      ? 'Start it (`sudo systemctl start docker`). If the error mentions permission denied on docker.sock, add your user to the docker ' +
        'group (`sudo usermod -aG docker $USER`), log out and back in'
      : 'Start Docker Desktop and wait until it reports that it is running';
    throw new SetupInputError(`the Docker daemon did not answer${dockerDetail(result)}. ${how}, then rerun setup. Nothing was written`);
  }
  if (!server.startsWith('linux/')) {
    throw new SetupInputError(`the Docker daemon runs ${server} containers; the image needs Linux containers (Docker Desktop: switch to Linux containers). Nothing was written`);
  }
  return server;
}

/** Inspect a local image. Undefined when it is not present; the ID and any registry digest otherwise. */
export function inspectImage(ctx: Pick<CliContext, 'run' | 'runDocker'>, dockerPath: string, ref: ImageReference): ResolvedImage | undefined {
  const result = runner(ctx)(dockerPath, ['image', 'inspect', '--format', '{{.Id}} {{json .RepoDigests}}', ref.value]);
  if (result.status !== 0) return undefined;
  const text = result.stdout.trim();
  const space = text.indexOf(' ');
  const id = space === -1 ? text : text.slice(0, space);
  if (!isImageId(id)) throw new SetupInputError('docker image inspect returned an unexpected image ID. Nothing was written');
  let digests: string[] = [];
  try {
    const parsed: unknown = JSON.parse(space === -1 ? '[]' : text.slice(space + 1));
    if (Array.isArray(parsed)) digests = parsed.filter((d): d is string => typeof d === 'string' && isDigestReference(d));
  } catch { digests = []; }
  // Prefer the digest of the requested repository (the default ghcr.io one), then the reference itself, then any.
  const repository = ref.name ?? IMAGE_REPOSITORY;
  const digest = (ref.kind === 'digest' && digests.includes(ref.value) ? ref.value : undefined) ??
    digests.find((d) => d.slice(0, d.indexOf('@')) === repository) ?? digests[0];
  return { reference: ref.value, id, ...(digest === undefined ? {} : { digest }) };
}

/** `docker pull <ref>` with progress on the terminal. */
export function pullImage(ctx: Pick<CliContext, 'run' | 'runDocker'>, dockerPath: string, ref: ImageReference): void {
  if (ref.kind === 'id') throw new SetupInputError('an image ID cannot be pulled; give the tag or digest reference instead');
  const result = runner(ctx)(dockerPath, ['pull', ref.value], { stream: true });
  if (result.status !== 0) {
    throw new SetupInputError(`docker pull ${ref.value} failed${dockerDetail(result)}. Check the reference, network access to the registry and ` +
      '`docker login ghcr.io` if your network requires it. Nothing was written');
  }
}
