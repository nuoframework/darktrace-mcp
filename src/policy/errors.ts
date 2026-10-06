/**
 * Code-owned denial vocabulary (security-test-plan-writes.md, "Exact error code / Exact message"). A tool denial
 * is `{isError:true, structuredContent:{error:{code,message}, errorCode:code, ...}}`; `errorCode` is a top-level
 * alias for clients that read a flat field. Messages never contain arguments, upstream text or exception causes.
 */
export const DENIAL_MESSAGES=Object.freeze({
  operation_denied:'Operation is not permitted by the active profile.',
  invalid_arguments:'Invalid operation arguments.',
  target_denied:'Target is not permitted by operator policy.',
  blast_radius_exceeded:'Operation exceeds the configured target limit.',
  confirmation_required:'Critical execution requires confirm:true.',
  preview_required:'Critical execution requires a previewId.',
  preview_invalid:'Preview is invalid for this operation and session.',
  preview_expired:'Preview has expired.',
  preview_used:'Preview has already been used.',
  approval_unavailable:'Client does not support required human approval.',
  approval_denied:'Human approval was not granted.',
  approval_timeout:'Human approval deadline exceeded.',
  approval_busy:'Human approval capacity exceeded.',
  audit_unavailable:'Required write audit is unavailable.',
  audit_failed:'Write completed but terminal audit failed.',
  write_outcome_unknown:'Write outcome is unknown; do not retry automatically.',
  write_rate_limited:'Write rate limit exceeded.',
  critical_rate_limited:'Critical write rate limit exceeded.',
  write_circuit_open:'Write circuit is open; operator intervention is required.',
  upstream_forbidden:'Appliance denied this operation.',
  upstream_error:'Appliance request failed.',
  schema_mismatch:'Response does not match the pinned operation schema.',
  response_limit_exceeded:'Response exceeds the configured byte limit.',
  output_limit_exceeded:'Result exceeds the configured output limit.',
  unsupported_encoding:'Response encoding is not supported.',
  request_cancelled:'Request was cancelled.',
} as const);
export type DenialCode=keyof typeof DENIAL_MESSAGES;
/** Default model-facing guidance per code; call sites may give a more specific code-owned hint. */
export const DENIAL_HINTS:Readonly<Partial<Record<DenialCode,string>>>=Object.freeze({
  operation_denied:'This operation is not available in this configuration; do not retry.',
  target_denied:'The operator protects this target; do not retry with the same target.',
  blast_radius_exceeded:'Split the change into smaller calls within the per-call target limit.',
  confirmation_required:'Show the user the preview (dryRun:true) and, only after explicit approval, repeat with confirm:true and that previewId.',
  preview_required:'Call with dryRun:true first, show the preview to the user, then repeat with confirm:true and the returned previewId.',
  preview_invalid:'Request a new preview (dryRun:true) for these exact arguments.',
  preview_expired:'Request a new preview (dryRun:true); previews expire after 5 minutes.',
  preview_used:'Each previewId executes at most once; request a new preview only if the user asks again.',
  approval_unavailable:'This MCP host cannot show a human confirmation dialog, which the operator requires for this action.',
  approval_denied:'Not executed: the user did not approve. Do not retry unless the user explicitly asks again.',
  approval_timeout:'Not executed: the confirmation dialog was not answered in time.',
  approval_busy:'Another confirmation dialog is already open; wait for it to finish.',
  write_rate_limited:'Writes are limited per rolling minute. Wait about a minute before the next write.',
  critical_rate_limited:'Critical writes are limited to 3 per rolling minute. Wait before the next one.',
  write_circuit_open:'Repeated write failures opened the circuit; writes stay disabled until the operator restarts the server. Reads still work.',
  write_outcome_unknown:'The appliance may have applied this change. Verify with a read before any retry. Do not automatically repeat this action.',
  audit_failed:'The request completed but its outcome audit failed. Do not automatically repeat this action.',
  request_cancelled:'Nothing further was sent.',
});
export function denialBody(code:DenialCode,extra:Record<string,unknown>={}):Record<string,unknown> {
  const hint=DENIAL_HINTS[code];
  return {error:{code,message:DENIAL_MESSAGES[code]},errorCode:code,...(hint?{hint}:{}),...extra};
}
/** Thrown inside the policy pipeline; the tool layer turns it into a denial result. */
export class Denial extends Error {
  constructor(readonly code:DenialCode,readonly extra:Record<string,unknown>={}) { super(DENIAL_MESSAGES[code]); this.name='Denial'; }
}
