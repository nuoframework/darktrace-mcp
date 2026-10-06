/**
 * Code-owned blast-radius table (reviewed constants, docs/CHANGES-core.md "Target policy"). For every write:
 * - maxTargets: the most targets one call may touch;
 * - protectedTargets: argument paths whose values are matched literally against the operator's protected-target
 *   list (DARKTRACE_PROTECTED_TARGETS / policy.protectedTargets) for high and critical operations;
 * - countPaths: argument paths whose values are counted as targets (array elements and comma-list entries count
 *   individually).
 * Model arguments cannot change any of these.
 */
export interface TargetPolicy { readonly maxTargets:number; readonly protectedTargets:readonly string[]; readonly countPaths:readonly string[]; }
const policy=(maxTargets:number,protectedTargets:readonly string[],countPaths:readonly string[]=protectedTargets):TargetPolicy=>
  Object.freeze({maxTargets,protectedTargets:Object.freeze([...protectedTargets]),countPaths:Object.freeze([...countPaths])});
export const TARGET_POLICIES:Readonly<Record<string,TargetPolicy>>=Object.freeze({
  // Critical (RESPOND/Antigena, intel feed, subnets, tag deletion, email action)
  post_antigena:policy(5,['body.codeid']),
  post_antigena_manual:policy(5,['body.did','body.connections'],['body.connections']),
  post_intelfeed:policy(20,['body.addentry','body.addlist','body.removeentry']),
  post_subnets:policy(1,['body.sid','body.network']),
  delete_tags_tid:policy(1,['path.tid']),
  post_agemail_api_ep_api_v1_0_emails_uuid_action:policy(1,['path.uuid']),
  // High
  post_devices:policy(1,['body.did']),
  post_pcaps:policy(1,['body.ip1','body.ip2'],['body.ip1']),
  post_tags:policy(1,['body.name']),
  post_tags_entities:policy(20,['body.did','body.tag'],['body.did']),
  post_tags_tid_entities:policy(20,['path.tid','body.entityValue'],['body.entityValue']),
  delete_tags_entities:policy(20,['query.did','query.tag'],['query.did']),
  delete_tags_tid_entities_teid:policy(1,['path.tid','path.teid'],['path.teid']),
  // Medium (one incident/breach/device per call; no protected-target matching at this tier)
  post_aianalyst_acknowledge:policy(20,[],['body.uuid']),
  post_aianalyst_unacknowledge:policy(20,[],['body.uuid']),
  post_aianalyst_pin:policy(20,[],['body.uuid']),
  post_aianalyst_unpin:policy(20,[],['body.uuid']),
  post_aianalyst_incident_comments:policy(1,[],['body.incident_id']),
  post_aianalyst_investigations:policy(1,[],['body.did']),
  post_modelbreaches_pbid_acknowledge:policy(1,[],['path.pbid']),
  post_modelbreaches_pbid_unacknowledge:policy(1,[],['path.pbid']),
  post_modelbreaches_pbid_comments:policy(1,[],['path.pbid']),
});
function valuesAt(args:Record<string,unknown>,path:string):unknown[] {
  const [location,name]=path.split('.');
  const container=args[location];
  if (container===null||typeof container!=='object'||Array.isArray(container)) return [];
  const value=(container as Record<string,unknown>)[name];
  if (value===undefined||value===null) return [];
  return Array.isArray(value)?value:[value];
}
/** Scalars as compared/counted: comma/newline lists (e.g. intel feed addlist, uuid lists) are split into entries. */
function entries(value:unknown):string[] {
  if (typeof value==='string') return value.split(/[,\r\n]+/).map(item=>item.trim()).filter(Boolean);
  if (typeof value==='number'||typeof value==='boolean') return [String(value)];
  if (value!==null&&typeof value==='object') return Object.values(value as Record<string,unknown>).flatMap(entries);
  return [];
}
export function countTargets(operationId:string,args:Record<string,unknown>):number {
  const rule=TARGET_POLICIES[operationId];
  if (!rule) return 0;
  // Each array element is one target; a string counts its comma/newline-list entries.
  return rule.countPaths.reduce((total,path)=>total+valuesAt(args,path).reduce<number>((n,value)=>n+(typeof value==='string'?Math.max(1,entries(value).length):1),0),0);
}
/** Literal match (exact string after trimming) of any target value against the operator's protected list. */
export function touchesProtectedTarget(operationId:string,args:Record<string,unknown>,protectedTargets:ReadonlySet<string>):boolean {
  const rule=TARGET_POLICIES[operationId];
  if (!rule||protectedTargets.size===0) return false;
  return rule.protectedTargets.some(path=>valuesAt(args,path).flatMap(entries).some(value=>protectedTargets.has(value)));
}
