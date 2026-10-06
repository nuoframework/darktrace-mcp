import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseConfig } from '../config/schema.js';

export const SERVER_NAME = 'darktrace';
export const PROFILE_PRESETS = Object.freeze([
  { id: 'read', label: 'read-only (recommended)', profiles: 'read' },
  { id: 'read-write', label: 'read + write', profiles: 'read,write' },
  { id: 'all', label: 'everything (all: read, write, critical, sensitive)', profiles: 'all' },
] as const);
const PROFILE_NAMES = new Set(['read', 'write', 'critical', 'sensitive', 'all']);
export const IMAGE_PATTERN = /^(?:sha256:[a-f0-9]{64}|[A-Za-z0-9._/:=-]+@sha256:[a-f0-9]{64})$/;

export type Runtime = 'node' | 'docker';
/** `file`: token-file paths in client config (POSIX). `inline`: token values (Windows only, explicit opt-in). */
export type TokenMode = 'file' | 'inline';

export interface InstallSettings {
  readonly url: string;
  readonly profiles: string;
  readonly runtime: Runtime;
  readonly tokenMode: TokenMode;
  readonly publicTokenFile: string;
  readonly privateTokenFile: string;
  readonly nodePath: string;
  readonly entryPath: string;
  readonly dockerPath?: string;
  readonly image?: string;
  readonly uid?: number;
  readonly gid?: number;
}

export interface ServerEntry {
  readonly command: string;
  readonly args: readonly string[];
  readonly env: Readonly<Record<string, string>>;
}

export class SetupInputError extends Error {
  constructor(message: string) { super(message); this.name = 'SetupInputError'; }
}

/** Normalize and validate an appliance origin with the same rules the server uses at startup. */
export function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  let url: URL;
  try { url = new URL(trimmed); } catch { throw new SetupInputError('URL must be an HTTPS origin such as https://darktrace.example.internal'); }
  if (url.protocol !== 'https:') throw new SetupInputError('URL must use https://');
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new SetupInputError('URL must be an origin only: no credentials, path, query or fragment');
  }
  try {
    parseConfig({ instance: { baseUrl: url.origin }, auth: { publicToken: 'syntax-check', privateToken: 'syntax-check' } });
  } catch (error) {
    throw new SetupInputError(error instanceof Error ? error.message : 'URL is not accepted by the server configuration');
  }
  return url.origin;
}

/** Profiles accepted by the installer: comma list of read, write, critical, sensitive or all. */
export function normalizeProfiles(value: string): string {
  const preset = PROFILE_PRESETS.find((p) => p.id === value.trim());
  if (preset) return preset.profiles;
  const list = value.split(',').map((v) => v.trim()).filter(Boolean);
  if (list.length === 0 || list.some((v) => !PROFILE_NAMES.has(v)) || new Set(list).size !== list.length) {
    throw new SetupInputError('profiles must be a comma list of read, write, critical, sensitive, or all');
  }
  if (list.includes('all')) return 'all';
  return list.join(',');
}

/** Tokens use the server's header-safe rules: 1-4096 printable ASCII bytes, no spaces. */
export function validateToken(value: string, label: string): string {
  if (value.length === 0) throw new SetupInputError(`${label} is empty`);
  if (value.length > 4096 || /[^\x21-\x7e]/.test(value)) throw new SetupInputError(`${label} contains spaces, control or non-ASCII characters`);
  return value;
}

export function validateImage(value: string): string {
  if (!IMAGE_PATTERN.test(value)) throw new SetupInputError('Docker image must be an immutable image ID (sha256:...) or name@sha256:digest, never a mutable tag');
  return value;
}

const CONTAINER_PUBLIC = '/run/secrets/public-token';
const CONTAINER_PRIVATE = '/run/secrets/private-token';

/** Build the launcher for this checkout (node) or a reviewed image (docker). Never contains token values in file mode. */
export function buildServerEntry(s: InstallSettings, inlineTokens?: { publicToken: string; privateToken: string }): ServerEntry {
  if (s.runtime === 'docker') {
    if (!s.dockerPath || !s.image || s.uid === undefined || s.gid === undefined) throw new SetupInputError('docker runtime requires docker path, image and uid/gid');
    if (s.uid === 0 || s.gid === 0) throw new SetupInputError('docker runtime refuses to run the container as root; run setup as a regular user');
    const bind = (src: string, dst: string): string => `type=bind,src=${src},dst=${dst},readonly`;
    return {
      command: s.dockerPath,
      args: ['run', '--rm', '-i', '--init', '--pull=never', '--log-driver=none', '--read-only', '--cap-drop=ALL',
        '--security-opt=no-new-privileges', '--pids-limit=64', '--memory=256m', '--user', `${s.uid}:${s.gid}`,
        '--network=bridge', '--mount', bind(s.publicTokenFile, CONTAINER_PUBLIC), '--mount', bind(s.privateTokenFile, CONTAINER_PRIVATE),
        '-e', `DARKTRACE_URL=${s.url}`, '-e', `DARKTRACE_PUBLIC_TOKEN_FILE=${CONTAINER_PUBLIC}`,
        '-e', `DARKTRACE_PRIVATE_TOKEN_FILE=${CONTAINER_PRIVATE}`, '-e', `DARKTRACE_PROFILES=${s.profiles}`, s.image],
      env: {},
    };
  }
  const tokenEnv: Record<string, string> = s.tokenMode === 'inline'
    ? (inlineTokens === undefined
      ? { DARKTRACE_PUBLIC_TOKEN: '<public token>', DARKTRACE_PRIVATE_TOKEN: '<private token>' }
      : { DARKTRACE_PUBLIC_TOKEN: inlineTokens.publicToken, DARKTRACE_PRIVATE_TOKEN: inlineTokens.privateToken })
    : { DARKTRACE_PUBLIC_TOKEN_FILE: s.publicTokenFile, DARKTRACE_PRIVATE_TOKEN_FILE: s.privateTokenFile };
  return {
    command: s.nodePath,
    args: [s.entryPath],
    env: { DARKTRACE_URL: s.url, ...tokenEnv, DARKTRACE_PROFILES: s.profiles },
  };
}

/** Default entrypoint: dist/src/index.js next to this compiled module (dist/src/cli/entry.js). */
export function defaultEntryPath(moduleUrl: string): string {
  return path.resolve(path.dirname(fileURLToPath(moduleUrl)), '..', 'index.js');
}

// ---- One-click links -----------------------------------------------------------------------

export const VSCODE_INPUTS = Object.freeze([
  { type: 'promptString', id: 'darktrace-public-token', description: 'Darktrace API public token', password: true },
  { type: 'promptString', id: 'darktrace-private-token', description: 'Darktrace API private token', password: true },
] as const);

/** VS Code install payload: tokens come from password inputs that VS Code stores in its secret storage. */
export function vscodeInstallPayload(entry: ServerEntry): Record<string, unknown> {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(entry.env)) {
    if (k === 'DARKTRACE_PUBLIC_TOKEN_FILE' || k === 'DARKTRACE_PRIVATE_TOKEN_FILE' || k === 'DARKTRACE_PUBLIC_TOKEN' || k === 'DARKTRACE_PRIVATE_TOKEN') continue;
    env[k] = v;
  }
  env.DARKTRACE_PUBLIC_TOKEN = '${input:darktrace-public-token}';
  env.DARKTRACE_PRIVATE_TOKEN = '${input:darktrace-private-token}';
  return { name: SERVER_NAME, type: 'stdio', command: entry.command, args: [...entry.args], env, inputs: VSCODE_INPUTS.map((i) => ({ ...i })) };
}

export function vscodeInstallLink(entry: ServerEntry, insiders = false): string {
  return `${insiders ? 'vscode-insiders' : 'vscode'}:mcp/install?${encodeURIComponent(JSON.stringify(vscodeInstallPayload(entry)))}`;
}

/** Cursor deeplink: base64 of the server object (command/args/env). Token-file paths only, never values. */
export function cursorInstallLink(entry: ServerEntry): string {
  const config = Buffer.from(JSON.stringify({ command: entry.command, args: [...entry.args], env: { ...entry.env } }), 'utf8').toString('base64');
  return `cursor://anysphere.cursor-deeplink/mcp/install?name=${encodeURIComponent(SERVER_NAME)}&config=${encodeURIComponent(config)}`;
}
