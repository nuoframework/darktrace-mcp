import { readFileSync } from 'node:fs';
import type { Writable } from 'node:stream';
import { loadConfig } from '../config/load.js';
import { ConfigValidationError, type DateFormat } from '../config/schema.js';
import { createHttpClient } from '../client/httpClient.js';
import { DarktraceApiError, type ApiErrorKind } from '../client/errors.js';
import { readSavedSetup, tokenPaths } from './state.js';
import type { CliContext } from './clients.js';
import { buildServerEntry } from './entry.js';
import { findOnPath } from './fsutil.js';
import { dockerDetail, dockerInstallHelp } from './docker.js';
import { createUi, type Ui } from './ui.js';

const STATUS_OPERATION = Object.freeze({ operationId: 'get_status', method: 'GET', pathTemplate: '/status' } as const);

/** Actionable, secret-free guidance for each safe client error kind. */
export function describeApiError(kind: ApiErrorKind, status?: number): string {
  switch (kind) {
    case 'auth': return 'Authentication failed (HTTP 401). Check that the public/private token pair is correct, not revoked, and created on this appliance.';
    case 'clock_skew_suspected': return 'Authentication failed and the local clock may be off. Darktrace signatures are time-based: sync this machine with NTP and retry.';
    case 'forbidden': return 'The appliance denied GET /status (HTTP 403). The token may lack API permissions; review the token in System Config.';
    case 'network': return 'Could not complete the HTTPS request. Check the URL, DNS, firewall/VPN and TLS: the certificate must be valid for this host name ' +
      '(for a private CA set NODE_EXTRA_CA_CERTS to its PEM file). Proxies and TLS bypass flags are not supported.';
    case 'timeout': return 'The appliance did not answer in time. Check reachability (VPN/firewall) or raise DARKTRACE_TIMEOUT_MS.';
    case 'not_found': return 'GET /status was not found (HTTP 404). Check that the URL points at the Threat Visualizer appliance itself.';
    case 'rate_limited': return 'The appliance rate limited the request (HTTP 429). Wait a minute and retry.';
    case 'server': return `The appliance returned a server error${status ? ` (HTTP ${status})` : ''}. Retry later or check appliance health.`;
    case 'invalid_response': return 'The appliance answered with something that is not Darktrace JSON. Check that the URL is the appliance and not a login portal.';
    case 'too_large': return 'The /status response exceeded the configured byte limit (DARKTRACE_MAX_RESPONSE_BYTES).';
    case 'bad_request': return 'The appliance rejected the request (HTTP 400). Some appliances accept only one signature date format ' +
      '(DARKTRACE_DATE_FORMAT=compact or spaced); also check the appliance API version.';
    default: return 'The request could not be completed.';
  }
}

/** Environment for the check: explicit DARKTRACE_* variables win; otherwise the saved setup is used. */
export function onlineTestEnv(ctx: Pick<CliContext, 'home' | 'env'>): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...ctx.env };
  const configured = ['DARKTRACE_URL', 'DARKTRACE_BASE_URL', 'DARKTRACE_CONFIG_FILE'].some((k) => env[k] !== undefined);
  if (configured) return env;
  const saved = readSavedSetup(ctx);
  if (saved === undefined) return env;
  env.DARKTRACE_URL = saved.url;
  env.DARKTRACE_PROFILES ??= saved.profiles;
  // The date format probed by `setup` is the one every client entry carries.
  if (saved.dateFormat !== undefined) env.DARKTRACE_DATE_FORMAT ??= saved.dateFormat;
  // The acknowledgement recorded by `setup` travels with the saved profiles, exactly as in the client entries.
  if (saved.acknowledgeSensitiveWrite === true && env.DARKTRACE_PROFILES === saved.profiles) env.DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE ??= 'true';
  if (saved.tokenMode === 'file' && env.DARKTRACE_PUBLIC_TOKEN === undefined && env.DARKTRACE_PRIVATE_TOKEN === undefined) {
    const files = tokenPaths(ctx);
    env.DARKTRACE_PUBLIC_TOKEN_FILE ??= files.publicTokenFile;
    env.DARKTRACE_PRIVATE_TOKEN_FILE ??= files.privateTokenFile;
  }
  return env;
}

export const DATE_FORMATS: readonly DateFormat[] = Object.freeze(['compact', 'spaced']);
export const otherDateFormat = (format: DateFormat): DateFormat => (format === 'compact' ? 'spaced' : 'compact');
export function isDateFormat(value: unknown): value is DateFormat { return value === 'compact' || value === 'spaced'; }

/** Result of one signed GET /status. Carries no secret: kinds, HTTP status and the date format used. */
export type ProbeOutcome =
  | { readonly ok: true; readonly baseUrl: string; readonly dateFormat: DateFormat; readonly status: number; readonly elapsedMs: number; readonly version?: string }
  | { readonly ok: false; readonly kind: 'config'; readonly message: string }
  | { readonly ok: false; readonly kind: ApiErrorKind | 'unknown'; readonly dateFormat: DateFormat; readonly status?: number };

/** Performs one signed GET /status with the configuration loaded from `env`. Injectable for tests. */
export type StatusProber = (env: NodeJS.ProcessEnv) => Promise<ProbeOutcome>;

/** Production prober: strict config loader plus the hardened HTTP client (no retries on 4xx, no secrets in errors). */
export const probeStatus: StatusProber = async (env) => {
  let cfg;
  try {
    cfg = loadConfig(env);
  } catch (error) {
    return { ok: false, kind: 'config', message: error instanceof ConfigValidationError ? error.message : 'configuration could not be loaded' };
  }
  let client;
  try {
    client = createHttpClient(cfg, { operations: [STATUS_OPERATION] });
  } catch (error) {
    return { ok: false, kind: 'config', message: error instanceof Error ? error.message : 'client could not start' };
  }
  const dateFormat = cfg.auth.dateFormat;
  try {
    const response = await client.request({ operationId: STATUS_OPERATION.operationId });
    const json = response.json as Record<string, unknown> | undefined;
    const version = typeof json?.version === 'string' ? json.version.replace(/[^\x20-\x7e]/g, '').slice(0, 64) : undefined;
    return { ok: true, baseUrl: cfg.instance.baseUrl, dateFormat, status: response.status, elapsedMs: response.elapsedMs, ...(version ? { version } : {}) };
  } catch (error) {
    if (error instanceof DarktraceApiError) return { ok: false, kind: error.kind, dateFormat, ...(error.status === undefined ? {} : { status: error.status }) };
    return { ok: false, kind: 'unknown', dateFormat };
  } finally {
    client.close();
  }
};

/** Outcome of the date-format probe: `chosen` is the working format; `outcomes` lists every attempt (at most two). */
export interface DateFormatProbe {
  readonly chosen?: DateFormat;
  readonly outcomes: readonly ProbeOutcome[];
}

/**
 * Signed GET /status with `first`; only when the appliance answers HTTP 400 (bad_request) is the other date format
 * tried, once. Any other failure (401, TLS, network, ...) is not a format problem and stops the probe.
 * This runs only at install/test time: the server itself never switches signing modes at runtime.
 */
export async function probeDateFormat(env: NodeJS.ProcessEnv, prober: StatusProber, first?: DateFormat): Promise<DateFormatProbe> {
  const initial = await prober(first === undefined ? env : { ...env, DARKTRACE_DATE_FORMAT: first });
  if (initial.ok) return { chosen: initial.dateFormat, outcomes: [initial] };
  if (initial.kind !== 'bad_request') return { outcomes: [initial] };
  const retry = await prober({ ...env, DARKTRACE_DATE_FORMAT: otherDateFormat(initial.dateFormat) });
  return retry.ok ? { chosen: retry.dateFormat, outcomes: [initial, retry] } : { outcomes: [initial, retry] };
}

/** Where an operator-chosen date format comes from, or undefined when the server default (compact) applies. */
export function explicitDateFormatSource(ctx: Pick<CliContext, 'env'>, env: NodeJS.ProcessEnv): string | undefined {
  if (ctx.env.DARKTRACE_DATE_FORMAT !== undefined) return 'DARKTRACE_DATE_FORMAT';
  if (env.DARKTRACE_DATE_FORMAT !== undefined) return 'the saved setup';
  const file = env.DARKTRACE_CONFIG_FILE;
  if (file === undefined) return undefined;
  // Best effort: only auth.dateFormat is inspected and nothing from the file is printed. Unreadable means "assume explicit".
  try {
    const raw = JSON.parse(readFileSync(file, 'utf8')) as { auth?: { dateFormat?: unknown } };
    return raw?.auth?.dateFormat === undefined ? undefined : 'auth.dateFormat in the config file';
  } catch {
    return 'the config file';
  }
}

const okLine = (o: Extract<ProbeOutcome, { ok: true }>): string =>
  `OK ${o.baseUrl} answered signed GET /status (HTTP ${o.status}, ${Math.round(o.elapsedMs)} ms${o.version ? `, version ${o.version}` : ''})`;
/** Secret-free explanation of a failed probe, without the FAIL prefix. */
export function describeProbeFailure(o: Exclude<ProbeOutcome, { ok: true }>): string {
  if (o.kind === 'config') return `configuration: ${o.message}`;
  if (o.kind === 'unknown') return 'the request could not be completed.';
  return `${o.kind}: ${describeApiError(o.kind, o.status)}`;
}
const failLine = (o: Exclude<ProbeOutcome, { ok: true }>): string => (o.kind === 'unknown' ? 'FAIL: the request could not be completed.' : `FAIL ${describeProbeFailure(o)}`);

export interface OnlineTestOptions { readonly uid?: number; readonly gid?: number; readonly ui?: Ui }
type OnlineContext = Pick<CliContext, 'home' | 'env' | 'probeStatus'> & Partial<Pick<CliContext, 'run' | 'runDocker' | 'platform'>>;

/**
 * Docker runtime saved by setup: run the image's offline `--check-config` with exactly the client entry's mounts, user and
 * hardening flags, but `--network=none`. This proves the container can read the token files. Returns an exit code on
 * failure, undefined when it passed or does not apply. The signed GET /status that follows runs from this host.
 */
function containerCheck(ctx: OnlineContext, out: Writable, options: OnlineTestOptions): number | undefined {
  if (['DARKTRACE_URL', 'DARKTRACE_BASE_URL', 'DARKTRACE_CONFIG_FILE'].some((k) => ctx.env[k] !== undefined)) return undefined;
  const saved = readSavedSetup(ctx);
  if (saved?.runtime !== 'docker' || saved.image === undefined || saved.tokenMode !== 'file' || ctx.run === undefined) return undefined;
  const platform = ctx.platform ?? process.platform;
  const dockerPath = findOnPath('docker', ctx.env, platform);
  if (dockerPath === undefined) { out.write(`FAIL ${dockerInstallHelp(platform).replace(/\. Nothing was written$/, '')}.\n`); return 1; }
  if (options.uid === undefined || options.gid === undefined || options.uid === 0) {
    out.write('FAIL the docker runtime needs a regular (non-root) POSIX user.\n');
    return 1;
  }
  const entry = buildServerEntry({
    url: saved.url, profiles: saved.profiles, runtime: 'docker', tokenMode: 'file', ...tokenPaths(ctx), nodePath: '', entryPath: '',
    dockerPath, image: saved.image, uid: options.uid, gid: options.gid, hostPlatform: platform,
    acknowledgeSensitiveWrite: saved.acknowledgeSensitiveWrite === true, ...(saved.dateFormat ? { dateFormat: saved.dateFormat } : {}),
  });
  const args = entry.args.map((a) => (a === '--network=bridge' ? '--network=none' : a));
  const run = ctx.runDocker ?? ((command: string, argv: readonly string[]) => (ctx.run as CliContext['run'])(command, argv));
  const result = run(entry.command, [...args, '--check-config']);
  let ok: boolean;
  try { ok = result.status === 0 && (JSON.parse(result.stdout.trim()) as { ok?: unknown }).ok === true; } catch { ok = false; }
  if (!ok) {
    out.write(`FAIL container --check-config with image ${saved.image}${dockerDetail(result)}. ` +
      'Check that the image is present (`docker image inspect`), that the token files are owner-only (0600) and rerun `darktrace-mcp setup`.\n');
    return 1;
  }
  out.write(`OK container --check-config (image ${saved.image}, token mounts readable, no network).\n` +
    'The signed GET /status below runs from this host with the same URL and token files.\n');
  return undefined;
}

/**
 * One signed GET /status through the production client. When the appliance answers HTTP 400 and no date format was
 * chosen explicitly, the other format is tried once and recommended. Prints OK or an actionable error; never prints secrets.
 */
export async function runOnlineTest(ctx: OnlineContext, out: Writable, options: OnlineTestOptions = {}): Promise<number> {
  const ui = options.ui ?? createUi();
  // Markers only on a terminal: piped output keeps the bare OK/FAIL lines scripts grep for.
  const good = (text: string): string => (ui.options.tty ? ui.ok(text) : text);
  const bad = (text: string): string => (ui.options.tty ? ui.fail(text) : text);
  const container = containerCheck(ctx, out, options);
  if (container !== undefined) return container;
  const env = onlineTestEnv(ctx);
  const prober = ctx.probeStatus ?? probeStatus;
  const spinner = ui.spinner(out, 'Signed GET /status');
  let first: ProbeOutcome;
  try { first = await prober(env); } finally { spinner.stop(); }
  if (first.ok) {
    out.write(good(`${okLine(first)}. URL, TLS and tokens are valid.\n`));
    out.write(`Next: restart your AI client and ask: "list my Darktrace devices".\n`);
    return 0;
  }
  if (first.kind === 'config') {
    out.write(bad(`${failLine(first)}\n`));
    if (env.DARKTRACE_URL === undefined && env.DARKTRACE_BASE_URL === undefined && env.DARKTRACE_CONFIG_FILE === undefined) {
      out.write('Next: run `darktrace-mcp setup` first, or export DARKTRACE_URL and the token-file variables.\n');
    } else out.write('Next: fix the configuration item above and rerun `darktrace-mcp test`.\n');
    return 1;
  }
  if (first.kind !== 'bad_request') {
    out.write(bad(`${failLine(first)}\n`));
    out.write('Next: fix the cause above and rerun `darktrace-mcp test`.\n');
    return 1;
  }
  const other = otherDateFormat(first.dateFormat);
  const source = explicitDateFormatSource(ctx, env);
  if (source !== undefined) {
    out.write(bad(`${failLine(first)}\n`));
    out.write(`The request was signed with date format ${first.dateFormat} (set by ${source}). Try DARKTRACE_DATE_FORMAT=${other}` +
      (source === 'the saved setup' ? `: rerun \`darktrace-mcp setup --date-format ${other}\` to update every client entry.\n` : '.\n'));
    return 1;
  }
  out.write(`The appliance rejected date format ${first.dateFormat} (HTTP 400); retrying once with ${other}.\n`);
  const retrying = ui.spinner(out, `Signed GET /status (date format ${other})`);
  let retry: ProbeOutcome;
  try { retry = await prober({ ...env, DARKTRACE_DATE_FORMAT: other }); } finally { retrying.stop(); }
  if (retry.ok) {
    out.write(good(`${okLine(retry)} using date format ${other}; set DARKTRACE_DATE_FORMAT=${other} in your client configuration ` +
      '(`darktrace-mcp setup` records it for you). URL, TLS and tokens are valid.\n'));
    return 0;
  }
  out.write(bad(`${failLine(retry)}\n`));
  if (!retry.ok && retry.kind === 'bad_request') out.write('Both signature date formats (compact and spaced) were rejected with HTTP 400.\n');
  out.write('Next: check the appliance API version and the token pair, then rerun `darktrace-mcp test`.\n');
  return 1;
}
