import { catalogueRoute, releaseAllowsOperation } from './release-capability.js';
import { requiredProfiles } from './profiles.js';
import type { ApprovalMode, Config } from '../config/schema.js';
import { neutralizeToolValue } from '../shape/output.js';
import { redactValue } from '../observability/redact.js';
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
/** Which human approval channel applies; reads never need one. Defaults fail closed for critical writes. */
export function approvalMode(op:Operation,cfg:Config):ApprovalMode|undefined {
  if (op.tier==='read') return undefined;
  const approval=(cfg as {approval?:Config['approval']}).approval;
  return op.tier==='critical'?approval?.critical??'elicitation':approval?.write??'host';
}
function shown(value:unknown):string {
  let text:string;
  try {text=typeof value==='string'?JSON.stringify(value):JSON.stringify(value)??String(value);} catch {text='[unserializable]';}
  return text.length>160?text.slice(0,157)+'...':text;
}
/** Code-owned approval text for the human. Values are the model-proposed request values, bounded and neutralized. */
export function approvalMessage(op:Operation,args:OperationArgs,tokens:readonly string[]=[]):string {
  const lines=[`Darktrace ${op.tier==='critical'?'CRITICAL action':'write'} requested by the AI assistant.`,
    `Operation: ${op.operationId} (${op.method} ${op.pathTemplate})`];
  const fields:Array<[string,unknown]>=[...Object.entries(args.path??{}),...Object.entries(args.query??{}),
    ...(args.body&&typeof args.body==='object'&&!Array.isArray(args.body)?Object.entries(args.body as Record<string,unknown>):args.body===undefined?[]:[['body',args.body] as [string,unknown]])];
  for (const [name,value] of fields.slice(0,20)) lines.push(`  ${name.slice(0,64)} = ${shown(value)}`);
  if (fields.length>20) lines.push(`  ... ${fields.length-20} more field(s)`);
  lines.push('Approve only if you intended this exact action. Decline to cancel; nothing is sent unless you accept.');
  const text=lines.join('\n').slice(0,2000);
  const clean=neutralizeToolValue(redactValue(text,tokens)).value;
  return typeof clean==='string'?clean.replace(/\\u\{000A\}/g,'\n'):'Darktrace action approval requested.';
}
export function approvalRefusal(op:Operation,args:OperationArgs,decision:'decline'|'cancel'|'unsupported',_cfg:Config) {
  const base={dryRun:true,operationId:op.operationId,method:op.method,executed:false,approval:decision,
    parameterNames:preview(op,{...args,dryRun:true}).parameterNames};
  if (decision==='unsupported') return {...base,hint:`Not executed: this MCP host cannot show a human confirmation dialog (MCP elicitation), which the operator requires for ${op.tier==='critical'?'critical':'write'} actions. The operator may set ${op.tier==='critical'?'DARKTRACE_CRITICAL_APPROVAL':'DARKTRACE_WRITE_APPROVAL'}=host to rely on the host's own tool approval prompt.`};
  return {...base,hint:`Not executed: the user ${decision==='decline'?'declined':'cancelled'} the confirmation. Do not retry unless the user explicitly asks again.`};
}
