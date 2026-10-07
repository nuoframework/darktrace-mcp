import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseConfig, type DateFormat } from '../config/schema.js';

export const SERVER_NAME = 'darktrace';
export const PROFILE_PRESETS = Object.freeze([
  { id: 'read', label: 'read: consultation only, no raw content (recommended)', profiles: 'read' },
  { id: 'read-write', label: 'read + write: also acknowledge, comment, tag, label, PCAP requests', profiles: 'read,write' },
  { id: 'read-sensitive', label: 'read + sensitive: also Advanced Search, email content, PCAP download, audit events', profiles: 'read,sensitive' },
  { id: 'all', label: 'all: read, sensitive, write and critical (requires the risk acknowledgement below)', profiles: 'all' },
] as const);

/** Exact notice shown before the sensitive-read + write union is enabled (DR-W-03, MR-06). */
export const SENSITIVE_WRITE_NOTICE = [
  'RISK NOTICE: these profiles combine sensitive reads with write actions.',
  '  - Sensitive data: Advanced Search, email content, PCAP downloads and audit events enter the AI client.',
  '  - Untrusted content: that data is attacker-influenced (email bodies, hostnames, URLs) and can carry instructions.',
  '  - Write channels: comments, tag descriptions, intel feed entries and other free-text fields leave the session.',
  '  Together this is an exfiltration risk: injected content can make the model copy sensitive data into a write.',
  '  The server refuses to start this combination unless DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE=true is set.',
].join('\n');

/** True when the profile list enables both sensitive reads and writes, which the server only starts with an acknowledgement. */
export function needsSensitiveWriteAck(profiles: string): boolean {
  const list = new Set(profiles.split(',').map((v) => v.trim()));
  return list.has('all') || (list.has('sensitive') && list.has('write'));
}
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
  /** Host OS running Docker. darwin/win32 mean Docker Desktop, whose bind mounts surface as root-owned. */
  readonly hostPlatform?: NodeJS.Platform;
  /** Explicit operator acknowledgement of the sensitive-read + write risk; required when `needsSensitiveWriteAck(profiles)`. */
  readonly acknowledgeSensitiveWrite?: boolean;
  /** Signature date format the appliance accepts; emitted as DARKTRACE_DATE_FORMAT when known. */
  readonly dateFormat?: DateFormat;
  /**
   * Node runtime launcher. `node` (default) starts `nodePath entryPath`. `npx-latest` starts
   * `npx -y @nuoframework/darktrace-mcp@latest`: the newest published release at every client start, fetched from
   * the registry without the verification `update` performs. Chosen explicitly in `setup` (update mode 2).
   */
  readonly launcher?: 'node' | 'npx-latest';
  /** Absolute `npx` path for the `npx-latest` launcher; a bare `npx` when it is not on PATH at setup time. */
  readonly npxPath?: string;
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

/** Build the launcher for the running package (node, by absolute path) or a reviewed image (docker). Never contains token values in file mode. */
export function buildServerEntry(s: InstallSettings, inlineTokens?: { publicToken: string; privateToken: string }): ServerEntry {
  const ackEnv: Record<string, string> = {};
  if (needsSensitiveWriteAck(s.profiles)) {
    if (s.acknowledgeSensitiveWrite !== true) throw new SetupInputError('profiles combining sensitive and write need the explicit risk acknowledgement (--acknowledge-sensitive-write)');
    ackEnv.DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE = 'true';
  }
  if (s.dateFormat !== undefined && s.dateFormat !== 'compact' && s.dateFormat !== 'spaced') throw new SetupInputError('date format must be compact or spaced');
  const formatEnv: Record<string, string> = s.dateFormat === undefined ? {} : { DARKTRACE_DATE_FORMAT: s.dateFormat };
  if (s.runtime === 'docker') {
    if (!s.dockerPath || !s.image || s.uid === undefined || s.gid === undefined) throw new SetupInputError('docker runtime requires docker path, image and uid/gid');
    if (s.uid === 0 || s.gid === 0) throw new SetupInputError('docker runtime refuses to run the container as root; run setup as a regular user');
    const bind = (src: string, dst: string): string => `type=bind,src=${src},dst=${dst},readonly`;
    // Docker Desktop (macOS/Windows) shows bind-mounted files as uid 0 inside the container; Linux keeps the host uid.
    const dockerDesktop = s.hostPlatform === 'darwin' || s.hostPlatform === 'win32';
    return {
      command: s.dockerPath,
      args: ['run', '--rm', '-i', '--init', '--pull=never', '--log-driver=none', '--read-only', '--cap-drop=ALL',
        '--security-opt=no-new-privileges', '--pids-limit=64', '--memory=256m', '--user', `${s.uid}:${s.gid}`,
        '--network=bridge', '--mount', bind(s.publicTokenFile, CONTAINER_PUBLIC), '--mount', bind(s.privateTokenFile, CONTAINER_PRIVATE),
        '-e', `DARKTRACE_URL=${s.url}`, '-e', `DARKTRACE_PUBLIC_TOKEN_FILE=${CONTAINER_PUBLIC}`,
        '-e', `DARKTRACE_PRIVATE_TOKEN_FILE=${CONTAINER_PRIVATE}`, '-e', `DARKTRACE_PROFILES=${s.profiles}`,
        ...Object.entries(formatEnv).flatMap(([k, v]) => ['-e', `${k}=${v}`]),
        ...Object.entries(ackEnv).flatMap(([k, v]) => ['-e', `${k}=${v}`]),
        ...(dockerDesktop ? ['-e', 'DARKTRACE_TOKEN_FILE_OWNER=root-or-current'] : []), s.image],
      env: {},
    };
  }
  const tokenEnv: Record<string, string> = s.tokenMode === 'inline'
    ? (inlineTokens === undefined
      ? { DARKTRACE_PUBLIC_TOKEN: '<public token>', DARKTRACE_PRIVATE_TOKEN: '<private token>' }
      : { DARKTRACE_PUBLIC_TOKEN: inlineTokens.publicToken, DARKTRACE_PRIVATE_TOKEN: inlineTokens.privateToken })
    : { DARKTRACE_PUBLIC_TOKEN_FILE: s.publicTokenFile, DARKTRACE_PRIVATE_TOKEN_FILE: s.privateTokenFile };
  const env = { DARKTRACE_URL: s.url, ...tokenEnv, DARKTRACE_PROFILES: s.profiles, ...formatEnv, ...ackEnv };
  if (s.launcher === 'npx-latest') return { command: s.npxPath ?? 'npx', args: ['-y', `${PACKAGE_NAME}@latest`], env };
  return { command: s.nodePath, args: [s.entryPath], env };
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

/** Inner server object shared by the base64 deeplinks (Cursor, LM Studio): command/args/env, never token values. */
const serverObject = (entry: ServerEntry): Record<string, unknown> => ({ command: entry.command, args: [...entry.args], ...(Object.keys(entry.env).length ? { env: { ...entry.env } } : {}) });
const base64Config = (entry: ServerEntry): string => encodeURIComponent(Buffer.from(JSON.stringify(serverObject(entry)), 'utf8').toString('base64'));

/** Cursor deeplink (cursor.com/docs/mcp/install-links): base64 of the server object. Token-file paths only, never values. */
export function cursorInstallLink(entry: ServerEntry): string {
  return `cursor://anysphere.cursor-deeplink/mcp/install?name=${encodeURIComponent(SERVER_NAME)}&config=${base64Config(entry)}`;
}

/** LM Studio deeplink (lmstudio.ai/docs/app/mcp/deeplink): same base64 notation as Cursor. */
export function lmstudioInstallLink(entry: ServerEntry): string {
  return `lmstudio://add_mcp?name=${encodeURIComponent(SERVER_NAME)}&config=${base64Config(entry)}`;
}

/** Kiro launch link (kiro.dev/docs/mcp/servers): URL-encoded JSON; Kiro shows a confirmation dialog before writing. */
export function kiroInstallLink(entry: ServerEntry): string {
  const config = { ...serverObject(entry), disabled: false, autoApprove: [] };
  return `https://kiro.dev/launch/mcp/add?name=${encodeURIComponent(SERVER_NAME)}&config=${encodeURIComponent(JSON.stringify(config))}`;
}

// ---- README one-click badges ---------------------------------------------------------------
//
// A badge cannot know the user's absolute paths or tokens, so it installs the pinned package through npx with the
// read profile and nothing else. The server then starts in setup mode (one `darktrace_setup_status` tool) until
// `darktrace-mcp setup` writes the real entry: absolute node path, fixed copy, token files.

export const PACKAGE_NAME = '@nuoframework/darktrace-mcp';

/** The launcher a one-click badge installs: `npx -y @nuoframework/darktrace-mcp@<version>`, read profile, no secrets. */
export function npxServerEntry(version: string): ServerEntry {
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) throw new SetupInputError('badge version must be an exact package version');
  return { command: 'npx', args: ['-y', `${PACKAGE_NAME}@${version}`], env: { DARKTRACE_PROFILES: 'read' } };
}

export const VSCODE_BADGE_INPUTS = Object.freeze([
  { type: 'promptString', id: 'darktrace-url', description: 'Darktrace appliance URL (https://...)', password: false },
  ...VSCODE_INPUTS,
] as const);

/** VS Code badge payload: URL and both tokens are prompted by VS Code (tokens as password inputs kept in its secret storage). */
export function vscodeBadgePayload(version: string): Record<string, unknown> {
  const entry = npxServerEntry(version);
  return {
    name: SERVER_NAME, type: 'stdio', command: entry.command, args: [...entry.args],
    env: { DARKTRACE_URL: '${input:darktrace-url}', DARKTRACE_PUBLIC_TOKEN: '${input:darktrace-public-token}', DARKTRACE_PRIVATE_TOKEN: '${input:darktrace-private-token}', DARKTRACE_PROFILES: 'read' },
    inputs: VSCODE_BADGE_INPUTS.map((i) => ({ ...i })),
  };
}
export function vscodeBadgeLink(version: string, insiders = false): string {
  return `${insiders ? 'vscode-insiders' : 'vscode'}:mcp/install?${encodeURIComponent(JSON.stringify(vscodeBadgePayload(version)))}`;
}
export const cursorBadgeLink = (version: string): string => cursorInstallLink(npxServerEntry(version));

/** Markdown for the README badge row (both languages share it). */
export function installBadgesMarkdown(version: string, labels: { cursor: string; vscode: string; insiders: string }): string {
  return [
    `[![${labels.cursor}](https://cursor.com/deeplink/mcp-install-dark.png)](${cursorBadgeLink(version)})`,
    `[![${labels.vscode}](https://img.shields.io/badge/VS_Code-Install_darktrace-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](${vscodeBadgeLink(version)})`,
    `[![${labels.insiders}](https://img.shields.io/badge/VS_Code_Insiders-Install_darktrace-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](${vscodeBadgeLink(version, true)})`,
  ].join('\n');
}
