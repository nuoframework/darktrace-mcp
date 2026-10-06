import type { Writable } from 'node:stream';
import { loadConfig } from '../config/load.js';
import { ConfigValidationError } from '../config/schema.js';
import { createHttpClient } from '../client/httpClient.js';
import { DarktraceApiError, type ApiErrorKind } from '../client/errors.js';
import { readSavedSetup, tokenPaths } from './state.js';
import type { CliContext } from './clients.js';

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
    case 'bad_request': return 'The appliance rejected the request (HTTP 400). Check the appliance API version and signature settings.';
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
  if (saved.tokenMode === 'file' && env.DARKTRACE_PUBLIC_TOKEN === undefined && env.DARKTRACE_PRIVATE_TOKEN === undefined) {
    const files = tokenPaths(ctx);
    env.DARKTRACE_PUBLIC_TOKEN_FILE ??= files.publicTokenFile;
    env.DARKTRACE_PRIVATE_TOKEN_FILE ??= files.privateTokenFile;
  }
  return env;
}

/** One signed GET /status through the production client. Prints OK or an actionable error; never prints secrets. */
export async function runOnlineTest(ctx: Pick<CliContext, 'home' | 'env'>, out: Writable): Promise<number> {
  const env = onlineTestEnv(ctx);
  let cfg;
  try {
    cfg = loadConfig(env);
  } catch (error) {
    const message = error instanceof ConfigValidationError ? error.message : 'configuration could not be loaded';
    out.write(`FAIL configuration: ${message}\n`);
    if (env.DARKTRACE_URL === undefined && env.DARKTRACE_BASE_URL === undefined && env.DARKTRACE_CONFIG_FILE === undefined) {
      out.write('Run `darktrace-mcp setup` first, or export DARKTRACE_URL and the token-file variables.\n');
    }
    return 1;
  }
  let client;
  try {
    client = createHttpClient(cfg, { operations: [STATUS_OPERATION] });
  } catch (error) {
    out.write(`FAIL configuration: ${error instanceof Error ? error.message : 'client could not start'}\n`);
    return 1;
  }
  try {
    const response = await client.request({ operationId: STATUS_OPERATION.operationId });
    const json = response.json as Record<string, unknown> | undefined;
    const version = typeof json?.version === 'string' ? json.version.replace(/[^\x20-\x7e]/g, '').slice(0, 64) : undefined;
    out.write(`OK ${cfg.instance.baseUrl} answered signed GET /status (HTTP ${response.status}, ${Math.round(response.elapsedMs)} ms` +
      `${version ? `, version ${version}` : ''}). URL, TLS and tokens are valid.\n`);
    return 0;
  } catch (error) {
    if (error instanceof DarktraceApiError) {
      out.write(`FAIL ${error.kind}: ${describeApiError(error.kind, error.status)}\n`);
    } else {
      out.write('FAIL: the request could not be completed.\n');
    }
    return 1;
  } finally {
    client.close();
  }
}
