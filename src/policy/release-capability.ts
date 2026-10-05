/** Code-owned release ceiling. No config, model argument or test flag can grant writes. */
export const RELEASE_CAPABILITY=Object.freeze({write:false,writeCritical:false} as const);
/** Primitive immutable selectors; catalogue implementation status alone never grants release access. */
export const RELEASE_CONSULTATION_OPERATIONS=Object.freeze([
  'get_status','get_devices','get_subnets','get_aianalyst_stats','get_intelfeed',
  'get_modelbreaches','get_devicesearch','get_similardevices','get_aianalyst_groups',
  'get_aianalyst_incidentevents','get_aianalyst_investigations','get_mbcomments',
  'get_details','get_tags_entities','get_tags_tid','get_tags_tid_entities',
  'get_endpointdetails','get_antigena','get_antigena_summary',
] as const);
/** Bind the primitive selectors to their fixed routes, even for a forged descriptor. */
const CONSULTATION_PATHS=Object.freeze({
  get_status:'/status',get_devices:'/devices',get_subnets:'/subnets',
  get_aianalyst_stats:'/aianalyst/stats',get_intelfeed:'/intelfeed',get_modelbreaches:'/modelbreaches',
  get_devicesearch:'/devicesearch',get_similardevices:'/similardevices',
  get_aianalyst_groups:'/aianalyst/groups',get_aianalyst_incidentevents:'/aianalyst/incidentevents',
  get_aianalyst_investigations:'/aianalyst/investigations',get_mbcomments:'/mbcomments',get_details:'/details',
  get_tags_entities:'/tags/entities',get_tags_tid:'/tags/{tid}',get_tags_tid_entities:'/tags/{tid}/entities',
  get_endpointdetails:'/endpointdetails',get_antigena:'/antigena',get_antigena_summary:'/antigena/summary',
} as const);
export function releaseAllowsOperation(op:{operationId:string;method:string;pathTemplate:string;status:string;tier:string}):boolean {
  return op.status==='implemented'&&op.tier==='read'&&op.method==='GET'&&
    RELEASE_CONSULTATION_OPERATIONS.some(id=>id===op.operationId&&CONSULTATION_PATHS[id]===op.pathTemplate);
}
