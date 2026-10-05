import { writeSync } from 'node:fs';
import { ConfigValidationError } from '../config/schema.js';
const STARTUP_VARIABLES=new Set([
  'HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','NO_PROXY','http_proxy','https_proxy','all_proxy','no_proxy',
  'NODE_USE_ENV_PROXY','NODE_TLS_REJECT_UNAUTHORIZED',
  'DARKTRACE_PROFILES','DARKTRACE_URL','DARKTRACE_BASE_URL','DARKTRACE_PUBLIC_TOKEN','DARKTRACE_PRIVATE_TOKEN',
  'DARKTRACE_PUBLIC_TOKEN_FILE','DARKTRACE_PRIVATE_TOKEN_FILE','DARKTRACE_TIMEOUT_MS',
  'DARKTRACE_DESTINATION_ALLOWLIST','DARKTRACE_SENSITIVE_READ','DARKTRACE_WRITE_CRITICAL',
  'DARKTRACE_MAX_RESPONSE_BYTES','DARKTRACE_MAX_TOOL_INPUT_BYTES','DARKTRACE_MAX_TOOL_INPUT_DEPTH',
  'DARKTRACE_MAX_TOOL_INPUT_ELEMENTS','DARKTRACE_MAX_TOOL_OUTPUT_CHARS','DARKTRACE_MAX_CONCURRENT_REQUESTS',
  'DARKTRACE_MAX_QUEUED_REQUESTS','DARKTRACE_MAX_PAGES','DARKTRACE_RATE_LIMIT_PER_MINUTE',
  'DARKTRACE_MAX_GET_RETRIES','DARKTRACE_MAX_RETRY_AFTER_MS',
  'DARKTRACE_TLS_INSECURE','DARKTRACE_TLS_REJECT_UNAUTHORIZED','DARKTRACE_CA_FILE','DARKTRACE_ASSUME_VERSION',
  'DARKTRACE_EXPORT_DIR','DARKTRACE_ENABLE_HTTP','DARKTRACE_HTTP','DARKTRACE_BEARER_TOKENS','DARKTRACE_EMAIL',
]);
/** Only an exact, known first token of a local config error may become metadata. */
export function startupVariable(error:unknown):string|undefined {
  if(!(error instanceof ConfigValidationError)) return undefined;
  const name=/^([A-Za-z_][A-Za-z0-9_]*)(?= |=)/.exec(error.message)?.[1];
  return name && STARTUP_VARIABLES.has(name)?name:undefined;
}
export function logStartupError(error:unknown):void {
  const variable=startupVariable(error);
  writeSync(2,JSON.stringify({event:'startup_error',ts:new Date().toISOString(),...(variable?{variable}:{})})+'\n');
}
// Logs take fixed event codes only, never arbitrary exceptions, arguments, config or upstream text.
export function logEvent(event:'startup_error'|'protocol_error'|'shutdown'):void {
  writeSync(2,JSON.stringify({event,ts:new Date().toISOString()})+'\n');
}
