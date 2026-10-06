export type ApiErrorKind =
  | 'auth'
  | 'forbidden'
  | 'bad_request'
  | 'not_found'
  | 'rate_limited'
  | 'server'
  | 'network'
  | 'timeout'
  | 'cancelled'
  | 'too_large'
  | 'invalid_request'
  | 'invalid_response'
  | 'overloaded'
  | 'clock_skew_suspected';

const SAFE_MESSAGES: Readonly<Record<ApiErrorKind, string>> = Object.freeze({
  auth: 'Darktrace authentication failed.',
  forbidden: 'Darktrace denied this operation.',
  bad_request: 'Darktrace rejected the request.',
  not_found: 'The requested Darktrace resource was not found.',
  rate_limited: 'Darktrace rate limited the request.',
  server: 'Darktrace returned a server error.',
  network: 'The Darktrace request could not be completed.',
  timeout: 'The Darktrace request timed out.',
  cancelled: 'The Darktrace request was cancelled.',
  too_large: 'The Darktrace response exceeded the configured byte limit.',
  invalid_request: 'The request does not match a trusted Darktrace operation.',
  invalid_response: 'Darktrace returned an invalid response.',
  overloaded: 'The Darktrace client has reached its concurrency limit.',
  clock_skew_suspected: 'Darktrace authentication failed; the local clock may be outside the accepted window.',
});

/** Code-owned message for a known kind (never the exception's own, possibly forged, message). */
export function safeErrorMessage(kind: ApiErrorKind): string {
  return SAFE_MESSAGES[kind];
}

/** Code-owned, model-facing next step per error kind. Never derived from the remote response. */
const ERROR_HINTS: Readonly<Record<ApiErrorKind, string>> = Object.freeze({
  auth: 'Authentication failed. The operator must check the public/private token pair and the appliance URL; retrying will not help.',
  forbidden: 'The API token lacks permission for this endpoint (or the module is not licensed). Do not retry; try a different operation or ask the operator to grant the permission.',
  bad_request: 'The appliance rejected the parameters. Check required filters for this operation (for example a did, pbid or time window) and the parameter formats.',
  not_found: 'No such resource. Verify the identifier with a listing operation first.',
  rate_limited: 'Request budget exhausted: the client allows a fixed number of requests per rolling minute (default 120), or the appliance throttled the call. Wait up to 60 seconds before retrying; do not loop or fan out more calls.',
  server: 'The appliance failed while handling this endpoint. Retry once later; if it persists the endpoint is unavailable on this appliance.',
  network: 'The appliance could not be reached or answered with a redirect (redirects are never followed). Retry once; if it persists the endpoint is unavailable for this token or appliance.',
  timeout: 'The appliance did not answer in time. Narrow the query (shorter time window, lower count, filters) and retry.',
  cancelled: 'The request was cancelled before completion.',
  too_large: 'The appliance response exceeded the byte limit before it could be trimmed. Request less: narrow starttime/endtime, lower count, add filters, or set minimal:true / responsedata where the operation supports them.',
  invalid_request: 'The request does not match a trusted operation route.',
  invalid_response: 'The appliance answered with data that is not valid JSON for this operation.',
  overloaded: 'Too many concurrent requests. Wait for in-flight calls to finish, then retry.',
  clock_skew_suspected: 'Authentication failed and the local clock may be skewed. The operator must sync the host clock (NTP); retrying will not help.',
});
export function errorHint(kind: ApiErrorKind): string {
  return ERROR_HINTS[kind];
}

/** A safe API error that never includes a remote response body or request secret. */
export class DarktraceApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly requestId: string;
  readonly safeDetail: string;

  constructor(kind: ApiErrorKind, requestId: string, status?: number) {
    super(SAFE_MESSAGES[kind]);
    this.name = 'DarktraceApiError';
    this.kind = kind;
    this.status = status;
    this.requestId = requestId;
    this.safeDetail = SAFE_MESSAGES[kind];
  }
}
