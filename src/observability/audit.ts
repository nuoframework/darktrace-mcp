import { writeSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { operations } from '../api/operations.js';
import { redactValue } from './redact.js';
import { canonicalJson, sha256Hex } from '../policy/canonical.js';
export type AuditOutcome = 'start'|'ok'|'error'|'preview'|'unknown';
export type AuditApprovalMode = 'none'|'elicitation'|'host';
export interface AuditMeta { argsHash?:string|null; approvalMode?:AuditApprovalMode; }
export interface Audit { record(operationId:string,outcome:AuditOutcome,requestId?:string,meta?:AuditMeta):Promise<void>; }
export interface AuditRecord {audit:true;ts:string;requestId:string;operationId:string;outcome:AuditOutcome;argsHash:string|null;approvalMode:AuditApprovalMode;seq:number;prevHash:string;hash:string;}
export const AUDIT_GENESIS='0'.repeat(64);
const OUTCOMES:readonly string[]=['start','ok','error','preview','unknown'];
const MODES:readonly string[]=['none','elicitation','host'];
/** hash = SHA-256 over canonical UTF-8 JSON (code-point key order) of every record field except `hash`. */
export function auditHash(record:Record<string,unknown>):string {
  const {hash:_hash,...unsigned}=record;
  return sha256Hex(canonicalJson(unsigned));
}
/** Verify a sequence of parsed audit lines (one process run). Returns the index of the first broken record, or -1. */
export function verifyAuditChain(records:readonly AuditRecord[]):number {
  let prev=AUDIT_GENESIS;
  for (const [index,record] of records.entries()) {
    if (record.seq!==index+1||record.prevHash!==prev||auditHash(record as unknown as Record<string,unknown>)!==record.hash) return index;
    prev=record.hash;
  }
  return -1;
}
/**
 * Hash-chained JSONL audit. Emission is serialized: a record is built (seq, prevHash) only when the previous sink
 * write has settled, so sequence order always equals emitted order. A failed sink write still advances the chain,
 * leaving a detectable gap rather than a reused seq.
 */
export function createAudit(tokens:readonly string[]=[], sink:(line:string)=>void|Promise<void>=line=>{writeSync(2,line);}):Audit {
  let seq=0,prevHash=AUDIT_GENESIS,tail:Promise<unknown>=Promise.resolve();
  return {record(operationId,outcome,requestId,meta={}) {
    if (!Object.hasOwn(operations,operationId) && operationId!=='unknown_operation') return Promise.reject(new Error('Invalid audit operation'));
    if (!OUTCOMES.includes(outcome)) return Promise.reject(new Error('Invalid audit outcome'));
    if (requestId!==undefined && (requestId.length===0 || requestId.length>128 || !/^[a-zA-Z0-9_-]+$/.test(requestId))) return Promise.reject(new Error('Invalid audit request ID'));
    const argsHash=meta.argsHash??null,approvalMode=meta.approvalMode??'none';
    if (argsHash!==null&&!/^[a-f0-9]{64}$/.test(argsHash)) return Promise.reject(new Error('Invalid audit args hash'));
    if (!MODES.includes(approvalMode)) return Promise.reject(new Error('Invalid audit approval mode'));
    const id=requestId??randomUUID();
    const emit=async()=>{
      seq+=1;
      const unsigned=redactValue({audit:true as const,ts:new Date().toISOString(),requestId:id,operationId,outcome,argsHash,approvalMode,seq,prevHash},tokens);
      const record:AuditRecord={...unsigned,hash:auditHash(unsigned)};
      prevHash=record.hash;
      await sink(JSON.stringify(record)+'\n');
    };
    const run=tail.then(emit,emit);
    tail=run.catch(()=>undefined);
    return run;
  }};
}
