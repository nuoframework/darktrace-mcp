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
