import { createHash } from 'node:crypto';
import type { OperationArgs } from '../api/operations.js';

/** Unicode code point order (not UTF-16 code unit order, which misorders astral vs. U+E000..U+FFFF keys). */
function compareCodePoints(a:string,b:string):number {
  const x=[...a],y=[...b];
  for (let i=0;i<Math.min(x.length,y.length);i++) {
    const d=x[i].codePointAt(0)!-y[i].codePointAt(0)!;
    if (d!==0) return d;
  }
  return x.length-y.length;
}
/**
 * Normative canonical JSON (security-test-plan-writes.md): keys sorted by code point, array order kept, strings
 * not Unicode-normalized, numbers in JSON serialization, nonfinite numbers rejected. undefined members are omitted.
 */
export function canonicalJson(value:unknown):string {
  if (Array.isArray(value)) return '['+value.map(item=>item===undefined?'null':canonicalJson(item)).join(',')+']';
  if (value!==null&&typeof value==='object') {
    const entries=Object.entries(value as Record<string,unknown>).filter(([,entry])=>entry!==undefined);
    return '{'+entries.sort(([a],[b])=>compareCodePoints(a,b)).map(([key,entry])=>JSON.stringify(key)+':'+canonicalJson(entry)).join(',')+'}';
  }
  if (typeof value==='number'&&!Number.isFinite(value)) throw new Error('Nonfinite canonical number');
  if (typeof value==='bigint'||typeof value==='function'||typeof value==='symbol') throw new Error('Unsupported canonical value');
  return JSON.stringify(value)??'null';
}
export const sha256Hex=(text:string)=>createHash('sha256').update(text,'utf8').digest('hex');
/** Validated API arguments only: control fields (operation selector, dryRun, confirm, previewId) never bind. */
export function apiArgs(args:OperationArgs|Record<string,unknown>):Record<string,unknown> {
  const {operation:_operation,dryRun:_dryRun,confirm:_confirm,previewId:_previewId,...api}=args as Record<string,unknown>;
  return api;
}
/** argsHash: SHA-256 over canonical {operationId,args}; shared by preview binding, approval text and audit. */
export function argsDigest(operationId:string,args:OperationArgs|Record<string,unknown>):string {
  return sha256Hex(canonicalJson({operationId,args:apiArgs(args)}));
}
