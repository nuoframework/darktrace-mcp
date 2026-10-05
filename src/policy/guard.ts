import type { Config } from '../config/schema.js';
import type { Operation, OperationArgs } from '../api/operations.js';

export class PolicyError extends Error { constructor() { super('Operation unavailable under the configured policy.'); } }
/** Reused at tool publication and immediately before dispatch. Model args never grant authority. */
export function isEligible(op:Operation,cfg:Config):boolean {
  if (op.status!=='implemented') return false;
  if (op.pathTemplate.startsWith('/advancedsearch/') && !(cfg.profiles as {sensitiveRead?:boolean}).sensitiveRead) return false;
  if (op.tier==='read') return cfg.profiles.read;
  if (!cfg.profiles.write) return false;
  if (op.tier==='critical') return cfg.profiles.writeCritical;
  return true;
}
export function authorize(op:Operation,cfg:Config):void {
  if (!isEligible(op,cfg)) throw new PolicyError();
}
export function preview(op:Operation,args:OperationArgs) {
  // The output vocabulary itself is code-owned. No submitted values or path templates.
  return {dryRun:true,operationId:op.operationId,method:op.method,
    parameterNames:[...new Set([...Object.keys(args.path??{}),...Object.keys(args.query??{}),
      ...(args.body&&typeof args.body==='object'?Object.keys(args.body):[])])].sort()};
}
export function requiresPreview(op:Operation,args:OperationArgs):boolean {
  // No independent host approval mechanism exists: all critical executions stay disabled.
  return op.tier==='critical'||(op.tier!=='read'&&args.dryRun!==false);
}
