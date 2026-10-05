import { writeSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { operations } from '../api/operations.js';
import { redactValue } from './redact.js';
export type AuditOutcome = 'start'|'ok'|'error'|'preview'|'unknown';
export interface Audit { record(operationId:string,outcome:AuditOutcome,requestId?:string):Promise<void>; }
export interface AuditRecord {audit:true;ts:string;requestId:string;operationId:string;outcome:AuditOutcome;}
export function createAudit(tokens:readonly string[]=[], sink:(line:string)=>void|Promise<void>=line=>{writeSync(2,line);}):Audit {
  return {async record(operationId,outcome,requestId) {
    if (!Object.hasOwn(operations,operationId) && operationId!=='unknown_operation') throw new Error('Invalid audit operation');
    if (!['start','ok','error','preview','unknown'].includes(outcome)) throw new Error('Invalid audit outcome');
    if (requestId!==undefined && (requestId.length===0 || requestId.length>128 || !/^[a-zA-Z0-9_-]+$/.test(requestId))) throw new Error('Invalid audit request ID');
    const record:AuditRecord={audit:true,ts:new Date().toISOString(),requestId:requestId??randomUUID(),operationId,outcome};
    await sink(JSON.stringify(redactValue(record,tokens))+'\n');
  }};
}
