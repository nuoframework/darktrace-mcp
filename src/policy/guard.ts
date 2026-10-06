import { catalogueRoute, releaseAllowsOperation } from './release-capability.js';
import { requiredProfiles } from './profiles.js';
import type { Config } from '../config/schema.js';
import type { Operation, OperationArgs } from '../api/operations.js';

export class PolicyError extends Error { constructor() { super('Operation unavailable under the configured policy.'); } }
/** Reused at tool publication and immediately before dispatch. Model args never grant authority. */
export function isEligible(op:Operation,cfg:Config):boolean {
  const route=catalogueRoute(op.operationId);
  if (!route||!releaseAllowsOperation(op)) return false;
  const p=cfg.profiles;
  return requiredProfiles({method:route.method,pathTemplate:route.pathTemplate,tier:route.tier,sensitivity:route.sensitivity}).every(name=>name==='read'?p.read===true:name==='sensitive'?p.sensitiveRead===true:
    name==='write'?p.write===true:p.write===true&&p.writeCritical===true);
}
export function authorize(op:Operation,cfg:Config):void {
  if (!isEligible(op,cfg)) throw new PolicyError();
}
export const CONFIRMATION_HINT='Critical action NOT executed. Show the user what will happen and ask for explicit approval; only after the user approves, repeat the same call with confirm:true.';
export function preview(op:Operation,args:OperationArgs) {
  // The output vocabulary itself is code-owned. No submitted values or path templates.
  return {dryRun:true,operationId:op.operationId,method:op.method,
    parameterNames:[...new Set([...Object.keys(args.path??{}),...Object.keys(args.query??{}),
      ...(args.body&&typeof args.body==='object'?Object.keys(args.body):[])])].sort(),
    ...(op.tier==='critical'&&args.dryRun!==true?{confirmationRequired:true,hint:CONFIRMATION_HINT}:{})};
}
/** Writes execute when profiles allow; dryRun:true previews. Critical writes also need confirm:true. */
export function requiresPreview(op:Operation,args:OperationArgs):boolean {
  if (op.tier==='read') return false;
  return args.dryRun===true||(op.tier==='critical'&&args.confirm!==true);
}
