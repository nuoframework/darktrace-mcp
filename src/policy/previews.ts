import { randomBytes } from 'node:crypto';
import catalogue from '../api/catalogue.generated.json' with { type: 'json' };
import type { Config } from '../config/schema.js';
import type { DenialCode } from './errors.js';
import { canonicalJson, sha256Hex } from './canonical.js';

export const PREVIEW_TTL_MS=300_000;
export const PREVIEW_MAX=256;
type State='issued'|'reserved'|'used';
interface Entry { readonly operationId:string; readonly digest:string; readonly session:object; readonly epoch:string; readonly expires:number; state:State; }
/** Process-local, bounded; the oldest handle (issued or tombstone) is evicted first and then fails closed as unknown. */
const previews=new Map<string,Entry>();

/** Schema epoch: the generated operation catalogue this process serves. */
const SCHEMA_EPOCH=sha256Hex(canonicalJson((catalogue.operations as Array<Record<string,unknown>>).map(({operationId,method,pathTemplate,tier,status,parameters,bodies})=>({operationId,method,pathTemplate,tier,status,parameters,bodies}))));
const epochs=new WeakMap<Config,string>();
/** Policy/schema epoch: any change to operator policy (profiles, approval, limits, target policy) or catalogue invalidates previews. */
export function policyEpoch(cfg:Config):string {
  let epoch=epochs.get(cfg);
  if (epoch===undefined) {
    epoch=sha256Hex(canonicalJson({schema:SCHEMA_EPOCH,profiles:cfg.profiles,approval:cfg.approval,limits:cfg.limits,policy:cfg.policy??null,origin:cfg.instance.baseUrl}));
    epochs.set(cfg,epoch);
  }
  return epoch;
}
export function issuePreview(operationId:string,digest:string,session:object,epoch:string,now=Date.now()):{previewId:string;expiresAt:string} {
  while (previews.size>=PREVIEW_MAX) previews.delete(previews.keys().next().value!);
  const previewId=randomBytes(16).toString('hex'),expires=now+PREVIEW_TTL_MS;
  previews.set(previewId,{operationId,digest,session,epoch,expires,state:'issued'});
  return {previewId,expiresAt:new Date(expires).toISOString()};
}
export interface Reservation { readonly previewId:string; readonly expires:number; }
/**
 * Reserve-then-consume. Precedence: unknown or bound to another operation/arguments/session/epoch => preview_invalid
 * (the original handle is left untouched); already reserved or used => preview_used; expired => preview_expired
 * (and the handle becomes used). A reserved handle must end in consumePreview() or releasePreview().
 */
export function reservePreview(previewId:string,operationId:string,digest:string,session:object,epoch:string,now=Date.now()):Reservation|DenialCode {
  const entry=previews.get(previewId);
  if (!entry||entry.operationId!==operationId||entry.digest!==digest||entry.session!==session||entry.epoch!==epoch) return 'preview_invalid';
  if (entry.state!=='issued') return 'preview_used';
  if (now>=entry.expires) {entry.state='used';return 'preview_expired';}
  entry.state='reserved';
  return {previewId,expires:entry.expires};
}
/** Recheck immediately before audit/build/sign: still reserved, unexpired and bound to the same digest and epoch. */
export function recheckPreview(reservation:Reservation,digest:string,epoch:string,now=Date.now()):'ok'|'preview_expired'|'preview_invalid' {
  const entry=previews.get(reservation.previewId);
  if (!entry||entry.state!=='reserved'||entry.digest!==digest||entry.epoch!==epoch) return 'preview_invalid';
  return now>=entry.expires?'preview_expired':'ok';
}
export function consumePreview(reservation:Reservation):void {
  const entry=previews.get(reservation.previewId);
  if (entry) entry.state='used';
}
/** Only for a non-terminal pause (2026-07-28 input-required round trip): the handle may be presented again. */
export function releasePreview(reservation:Reservation):void {
  const entry=previews.get(reservation.previewId);
  if (entry?.state==='reserved') entry.state='issued';
}
export function previewCount():number { return previews.size; }
