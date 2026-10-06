import { writeSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { operations } from '../api/operations.js';
import { redactValue } from './redact.js';
export type AuditOutcome = 'start'|'ok'|'error'|'preview'|'unknown';
export interface Audit { record(operationId:string,outcome:AuditOutcome,requestId?:string):Promise<void>; }
export interface AuditRecord {audit:true;ts:string;requestId:string;operationId:string;outcome:AuditOutcome;seq:number;prevHash:string;hash:string;}
export const AUDIT_GENESIS='0'.repeat(64);
/** hash = SHA-256 over the canonical record without its own hash; prevHash chains records so edits and gaps are detectable. */
export function auditHash(record:Omit<AuditRecord,'hash'>):string {
  const fields=['audit','ts','requestId','operationId','outcome','seq','prevHash'] as const;
  return createHash('sha256').update(JSON.stringify(fields.map(key=>[key,record[key]]))).digest('hex');
}
/** Verify a sequence of parsed audit lines (one process run). Returns the index of the first broken record, or -1. */
export function verifyAuditChain(records:readonly AuditRecord[]):number {
  let prev=AUDIT_GENESIS;
  for (const [index,record] of records.entries()) {
    const {hash,...rest}=record;
    if (record.seq!==index+1||record.prevHash!==prev||auditHash(rest)!==hash) return index;
    prev=hash;
  }
  return -1;
}
export function createAudit(tokens:readonly string[]=[], sink:(line:string)=>void|Promise<void>=line=>{writeSync(2,line);}):Audit {
  let seq=0,prevHash=AUDIT_GENESIS;
  return {async record(operationId,outcome,requestId) {
    if (!Object.hasOwn(operations,operationId) && operationId!=='unknown_operation') throw new Error('Invalid audit operation');
    if (!['start','ok','error','preview','unknown'].includes(outcome)) throw new Error('Invalid audit outcome');
    if (requestId!==undefined && (requestId.length===0 || requestId.length>128 || !/^[a-zA-Z0-9_-]+$/.test(requestId))) throw new Error('Invalid audit request ID');
    // The chain advances before the sink is awaited: a failed write leaves a detectable gap, never a reused seq.
    seq+=1;
    const unsigned=redactValue({audit:true as const,ts:new Date().toISOString(),requestId:requestId??randomUUID(),operationId,outcome,seq,prevHash},tokens);
    const record:AuditRecord={...unsigned,hash:auditHash(unsigned)};
    prevHash=record.hash;
    await sink(JSON.stringify(record)+'\n');
  }};
}
