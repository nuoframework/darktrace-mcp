import { catalogueRoute, releaseAllowsOperation } from './release-capability.js';
import { requiredProfiles } from './profiles.js';
import { createHash, randomBytes } from 'node:crypto';
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
export const CONFIRMATION_HINT='Critical action NOT executed. Show the user exactly what will happen and ask for explicit approval; only after the user approves, repeat the identical call with confirm:true and this previewId (single use, expires in 5 minutes; any change to the arguments needs a new preview).';
const PREVIEW_TTL_MS=5*60_000,PREVIEW_MAX=256;
const previews=new Map<string,{binding:string;expires:number}>();
function canonical(value:unknown):string {
  if (Array.isArray(value)) return '['+value.map(canonical).join(',')+']';
  if (value&&typeof value==='object') return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical((value as Record<string,unknown>)[key])).join(',')+'}';
  return JSON.stringify(value)??'null';
}
/** Binds a preview to the exact operation and validated request values (not to confirm/dryRun/previewId). */
export function previewBinding(op:Operation,args:OperationArgs):string {
  return createHash('sha256').update(op.operationId+'\n'+canonical({path:args.path??{},query:args.query??{},body:args.body??null,contentType:args.contentType??null})).digest('hex');
}
function issuePreview(op:Operation,args:OperationArgs,now=Date.now()):string {
  for (const [id,entry] of previews) if (entry.expires<=now) previews.delete(id);
  while (previews.size>=PREVIEW_MAX) previews.delete(previews.keys().next().value!);
  const id=randomBytes(16).toString('hex');
  previews.set(id,{binding:previewBinding(op,args),expires:now+PREVIEW_TTL_MS});
  return id;
}
/** Single use: a matching, unexpired previewId is consumed; anything else is false. */
export function consumePreview(op:Operation,args:OperationArgs,now=Date.now()):boolean {
  const id=args.previewId;
  if (typeof id!=='string') return false;
  const entry=previews.get(id);
  previews.delete(id);
  return entry!==undefined&&entry.expires>now&&entry.binding===previewBinding(op,args);
}
export function preview(op:Operation,args:OperationArgs) {
  // The output vocabulary itself is code-owned. No submitted values or path templates.
  return {dryRun:true,operationId:op.operationId,method:op.method,
    parameterNames:[...new Set([...Object.keys(args.path??{}),...Object.keys(args.query??{}),
      ...(args.body&&typeof args.body==='object'?Object.keys(args.body):[])])].sort(),
    ...(op.tier==='read'?{}:{previewId:issuePreview(op,args)}),
    ...(op.tier==='critical'&&args.dryRun!==true?{confirmationRequired:true,hint:CONFIRMATION_HINT}:{})};
}
/**
 * Writes execute when profiles allow; dryRun:true previews. Critical writes also need confirm:true plus the
 * previewId of a preview of the identical arguments (consumed here when confirm:true).
 */
export function requiresPreview(op:Operation,args:OperationArgs):boolean {
  if (op.tier==='read') return false;
  if (args.dryRun===true) return true;
  if (op.tier==='critical') return args.confirm!==true||!consumePreview(op,args);
  return false;
}
/** Optional binding for medium/high writes: a supplied previewId must be valid. */
export function invalidOptionalPreview(op:Operation,args:OperationArgs):boolean {
  return op.tier!=='read'&&op.tier!=='critical'&&args.previewId!==undefined&&!consumePreview(op,args);
}
export const CRITICAL_WRITES_PER_MINUTE=3;
const writeWindows=new WeakMap<object,{all:number[];critical:number[]}>();
/** Separate rolling-minute budget for non-GET operations, per operation client (one per server process). */
export function consumeWriteSlot(owner:object,op:Operation,cfg:Config,now=Date.now()):boolean {
  if (op.method==='GET') return true;
  const window=writeWindows.get(owner)??{all:[],critical:[]};writeWindows.set(owner,window);
  const prune=(list:number[])=>{while(list.length&&now-list[0]>=60_000)list.shift();};
  prune(window.all);prune(window.critical);
  const limit=Math.min((cfg.limits as {maxWritesPerMinute?:number}).maxWritesPerMinute??10,60);
  if (window.all.length>=limit) return false;
  if (op.tier==='critical'&&window.critical.length>=CRITICAL_WRITES_PER_MINUTE) return false;
  window.all.push(now);if (op.tier==='critical') window.critical.push(now);
  return true;
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
