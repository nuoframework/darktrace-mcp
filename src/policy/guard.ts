import { catalogueRoute, releaseAllowsOperation } from './release-capability.js';
import { requiredProfiles } from './profiles.js';
import type { ApprovalMode, Config } from '../config/schema.js';
import { neutralizeToolValue } from '../shape/output.js';
import { redactValue } from '../observability/redact.js';
import type { Operation, OperationArgs } from '../api/operations.js';
import { argsDigest, sha256Hex } from './canonical.js';
export { CRITICAL_WRITES_PER_MINUTE } from './admission.js';

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
/** Binds a preview to the exact operation and validated API arguments (not to confirm/dryRun/previewId). */
export function previewBinding(op:Pick<Operation,'operationId'>,args:OperationArgs|Record<string,unknown>):string {
  return argsDigest(op.operationId,args);
}
/** Value-free preview: the sorted validated parameter names; critical previews add a bearer previewId and its expiry. */
export function previewBody(op:Operation,args:OperationArgs,handle?:{previewId:string;expiresAt:string}) {
  return {dryRun:true,operationId:op.operationId,method:op.method,
    parameterNames:[...new Set([...Object.keys(args.path??{}),...Object.keys(args.query??{}),
      ...(args.body&&typeof args.body==='object'&&!Array.isArray(args.body)?Object.keys(args.body):[])])].sort(),
    ...(handle?{previewId:handle.previewId,expiresAt:handle.expiresAt}:{})};
}
/** Which human approval channel applies; reads never need one. Defaults fail closed for critical writes. */
export function approvalMode(op:Operation,cfg:Config):ApprovalMode|undefined {
  if (op.tier==='read') return undefined;
  const approval=(cfg as {approval?:Config['approval']}).approval;
  return op.tier==='critical'?approval?.critical??'elicitation':approval?.write??'host';
}

export const APPROVAL_MESSAGE_MAX=2000;
export const APPROVAL_FOOTER='Approve only if you intended this exact action. Decline to cancel; nothing is sent unless you accept.';
const SAFE_KEY=/^[A-Za-z0-9_-]{1,48}$/;
function rendered(value:unknown,tokens:readonly string[]):string {
  let text:string;
  try {text=JSON.stringify(redactValue(value,tokens))??'null';} catch {text='"[unserializable]"';}
  // JSON escapes C0 controls (no raw newline survives); every other hidden/bidi point becomes visible \u{XXXX}.
  const clean=neutralizeToolValue(redactValue(text,tokens)).value;
  return typeof clean==='string'?clean:'"[unrenderable]"';
}
function fieldLines(args:OperationArgs,tokens:readonly string[]):string[] {
  const lines:string[]=[];
  const add=(location:string,key:string,value:unknown)=>{
    if (SAFE_KEY.test(key)&&redactValue(key,tokens)===key) lines.push(`  ${location}.${key} = ${rendered(value,tokens)}`);
    // A key that is not a plain identifier is shown inside the quoted value, never as template text.
    else lines.push(`  ${location}.field_${sha256Hex(key).slice(0,8)} = ${rendered({name:key,value},tokens)}`);
  };
  for (const location of ['path','query'] as const) for (const [key,value] of Object.entries(args[location]??{})) add(location,key,value);
  if (args.body&&typeof args.body==='object'&&!Array.isArray(args.body)) for (const [key,value] of Object.entries(args.body as Record<string,unknown>)) add('body',key,value);
  else if (args.body!==undefined) lines.push(`  body = ${rendered(args.body,tokens)}`);
  if (args.contentType!==undefined) add('request','contentType',args.contentType);
  return lines;
}
/**
 * Code-owned approval text. Every effective field is listed with its full value (escaped, quoted, on one indented
 * line with a fixed prefix) together with the canonical argsHash. When the faithful summary does not fit the
 * dialog budget, `complete` is false: the text keeps the field counter and footer, and callers must refuse rather
 * than ask the human to approve something they cannot see.
 */
export function approvalSummary(op:Operation,args:OperationArgs,tokens:readonly string[]=[]):{message:string;complete:boolean} {
  const head=[`Darktrace ${op.tier==='critical'?'CRITICAL action':'write'} requested by the AI assistant.`,
    `Operation: ${op.operationId} (${op.method} ${op.pathTemplate})`,
    `  argsHash = ${argsDigest(op.operationId,args)}`];
  const fields=fieldLines(args,tokens);
  const size=(lines:readonly string[])=>lines.reduce((n,line)=>n+line.length+1,0)+APPROVAL_FOOTER.length;
  if (size([...head,...fields])<=APPROVAL_MESSAGE_MAX) return {message:[...head,...fields,APPROVAL_FOOTER].join('\n'),complete:true};
  const shown:string[]=[];
  for (const line of fields) {
    const more=`  ... ${fields.length-shown.length-1} more field(s)`;
    if (size([...head,...shown,line,more])>APPROVAL_MESSAGE_MAX) break;
    shown.push(line);
  }
  return {message:[...head,...shown,`  ... ${fields.length-shown.length} more field(s)`,APPROVAL_FOOTER].join('\n'),complete:false};
}
export function approvalMessage(op:Operation,args:OperationArgs,tokens:readonly string[]=[]):string {
  return approvalSummary(op,args,tokens).message;
}
