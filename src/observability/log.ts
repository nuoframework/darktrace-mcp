import { writeSync } from 'node:fs';
import { ConfigValidationError } from '../config/schema.js';
const STARTUP_VARIABLES=new Set([
  'HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','NO_PROXY','http_proxy','https_proxy','all_proxy','no_proxy',
  'NODE_USE_ENV_PROXY','NODE_TLS_REJECT_UNAUTHORIZED','NODE_USE_SYSTEM_CA',
  'SSL_CERT_FILE','SSL_CERT_DIR','OPENSSL_CONF',
  'DARKTRACE_PROFILES','DARKTRACE_URL','DARKTRACE_BASE_URL','DARKTRACE_PUBLIC_TOKEN','DARKTRACE_PRIVATE_TOKEN',
  'DARKTRACE_PUBLIC_TOKEN_FILE','DARKTRACE_PRIVATE_TOKEN_FILE','DARKTRACE_TOKEN_FILE_OWNER','DARKTRACE_TIMEOUT_MS',
  'DARKTRACE_DESTINATION_ALLOWLIST','DARKTRACE_SENSITIVE_READ','DARKTRACE_WRITE_CRITICAL','DARKTRACE_CRITICAL_APPROVAL','DARKTRACE_WRITE_APPROVAL',
  'DARKTRACE_MAX_RESPONSE_BYTES','DARKTRACE_MAX_TOOL_INPUT_BYTES','DARKTRACE_MAX_TOOL_INPUT_DEPTH',
  'DARKTRACE_MAX_TOOL_INPUT_ELEMENTS','DARKTRACE_MAX_TOOL_OUTPUT_CHARS','DARKTRACE_MAX_CONCURRENT_REQUESTS',
  'DARKTRACE_MAX_QUEUED_REQUESTS','DARKTRACE_MAX_PAGES','DARKTRACE_RATE_LIMIT_PER_MINUTE',
  'DARKTRACE_MAX_GET_RETRIES','DARKTRACE_MAX_RETRY_AFTER_MS','DARKTRACE_MAX_WRITES_PER_MINUTE',
  'DARKTRACE_TLS_INSECURE','DARKTRACE_TLS_REJECT_UNAUTHORIZED','DARKTRACE_CA_FILE','DARKTRACE_ASSUME_VERSION',
  'DARKTRACE_EXPORT_DIR','DARKTRACE_ENABLE_HTTP','DARKTRACE_HTTP','DARKTRACE_BEARER_TOKENS','DARKTRACE_EMAIL',
  'DARKTRACE_PROTECTED_TARGETS','DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE','DARKTRACE_ACKNOWLEDGE_HOST_APPROVAL',
]);
/** Only an exact, known first token of a local config error may become metadata. */
export function startupVariable(error:unknown):string|undefined {
  if(!(error instanceof ConfigValidationError)) return undefined;
  if(/^--(?:use-env-proxy|tls-min-v1\.[01]|tls-max-v1\.[01]|tls-keylog|insecure-http-parser|use-openssl-ca|use-system-ca|openssl-config|openssl-legacy-provider|tls-cipher-list|tls-cipher-suites) is an unsupported TLS or proxy bypass flag$/.test(error.message)) return 'NODE_OPTIONS';
  const name=/^([A-Za-z_][A-Za-z0-9_]*)(?= |=)/.exec(error.message)?.[1];
  return name && STARTUP_VARIABLES.has(name)?name:undefined;
}
/**
 * ConfigValidationError messages are written from fixed labels and variable names, never values, so they may be
 * shown to the operator. A leading variable name outside the code-owned list (an unknown DARKTRACE_* name the
 * operator set) is not reflected. Non-printable/non-ASCII characters are escaped and the text is bounded.
 */
export function startupReason(error:unknown):string|undefined {
  if(!(error instanceof ConfigValidationError)) return undefined;
  const message=error.message.replace(/^[A-Z][A-Za-z0-9_]*(?=[ =])/,name=>STARTUP_VARIABLES.has(name)?name:'an unrecognized variable');
  return message.slice(0,300).replace(/[^\x20-\x7e]/gu,char=>'\\u{'+char.codePointAt(0)!.toString(16).toUpperCase()+'}');
}
export function logStartupError(error:unknown):void {
  const variable=startupVariable(error), reason=startupReason(error);
  // Any other error stays opaque: its text may come from the platform or upstream and is not reviewed for secrets.
  writeSync(2,JSON.stringify({event:'startup_error',ts:new Date().toISOString(),...(variable?{variable}:{}),...(reason?{reason}:{})})+'\n');
}
// Logs take fixed event codes only, never arbitrary exceptions, arguments, config or upstream text.
export function logEvent(event:'startup_error'|'protocol_error'|'shutdown'|'token_file_owner_relaxed'|'sensitive_write_acknowledged'|'host_approval_acknowledged'):void {
  writeSync(2,JSON.stringify({event,ts:new Date().toISOString()})+'\n');
}
/** Runtime diagnostics with fixed codes; never arguments, exception text or audit content. */
export function logDiagnostic(event:'audit_sink_failed'):void {
  try {process.stderr.write(JSON.stringify({event,ts:new Date().toISOString()})+'\n');} catch { /* diagnostics never fail a call */ }
}
