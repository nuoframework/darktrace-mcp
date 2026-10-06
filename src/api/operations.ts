import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { DarktraceApiError } from '../client/errors.js';
import catalogue from './catalogue.generated.json' with { type: 'json' };
import { TARGET_POLICIES, type TargetPolicy } from '../policy/targets.js';
import { schemaFromOpenApi, checkInput, checkRanges, validatePathSegment, validateSearchHash, inputUnit, QUERY_DEFAULTS, BODY_DEFAULTS, type InputLimits } from './validation.js';
export type Tier = 'read'|'medium'|'high'|'critical';
export interface OperationDescriptor {
  operationId:string; method:'GET'|'POST'|'DELETE'; pathTemplate:string; tool:string|null;
  tier:Tier; sensitivity:string; status:'implemented'|'blocked'|'excluded'; reason:string|null;
  execution:string; parameters:any[]; bodies:any[]; bodyRequired:boolean; documentedIn:string; validatedOn:string[];
  /** Darktrace/EMAIL only: pinned SDK schema digest, version and provenance (generated). */
  schemaSha256?:string; schemaVersion?:string; schemaProvenance?:string;
}
export interface Operation extends OperationDescriptor { input:z.ZodObject<any>;
  /** Writes only: code-owned blast-radius policy (src/policy/targets.ts). */
  targetPolicy?:TargetPolicy; maxTargets?:number; }
export interface OperationArgs { operation?:string; path?:Record<string,unknown>; query?:Record<string,unknown>; body?:unknown; contentType?:string; dryRun?:boolean; confirm?:boolean; previewId?:string; }
export interface ApiRequest {
  operationId:string; pathParams?:Record<string,string|number>; query?:ReadonlyArray<readonly [string,string]>;
  body?:unknown; contentType?:'application/json'|'application/x-www-form-urlencoded'; signal?:AbortSignal;
  /** Code-owned per operation (see BINARY_OPERATIONS); never taken from model arguments. */
  accept?:'binary';
}
/** Operations whose success body is a file (PCAP, raw MIME email), read as bounded bytes. */
export const BINARY_OPERATIONS:ReadonlySet<string>=Object.freeze(new Set(['get_pcaps_filename','get_agemail_api_ep_api_v1_0_emails_uuid_download']));
export interface OperationClient { request(request:ApiRequest):Promise<unknown>; }
function parameterObject(params:any[], location:string, tier:Tier='read') {
  const fields:Record<string,z.ZodType<any>> = {};
  for (const p of params.filter(p=>p.in===location)) {
    const field = schemaFromOpenApi({...p.schema,description:p.description??p.schema?.description},p.name,0,location==='query'&&tier==='read');
    fields[p.name] = p.required ? field : field.optional();
  }
  return z.strictObject(fields);
}
export const operations:Readonly<Record<string,Operation>> = Object.freeze(Object.fromEntries((catalogue.operations as OperationDescriptor[]).map(row=>{
  const fields:Record<string,z.ZodType<any>> = {operation:z.literal(row.operationId).default(row.operationId)};
  for (const location of ['path','query']) {
    const params = row.parameters.filter(p=>p.in===location);
    const object = parameterObject(params,location,row.tier);
    fields[location] = params.some(p=>p.required) ? object : object.optional();
  }
  if (row.bodies.length) {
    const bodySchemas = row.bodies.map(b=>schemaFromOpenApi(b.schema));
    const body = bodySchemas.length===1?bodySchemas[0]:z.union(bodySchemas as any);
    fields.body = Object.hasOwn(BODY_DEFAULTS,row.operationId) ? body.default({...BODY_DEFAULTS[row.operationId]}) : row.bodyRequired ? body : body.optional();
    fields.contentType = z.enum(row.bodies.map(b=>b.contentType) as [string,...string[]]).optional();
  }
  // Writes execute by default when the operator profile allows; dryRun:true returns a value-free preview.
  if (row.tier!=='read') {
    fields.dryRun=z.boolean().default(false).describe('true = preview only; nothing is sent.');
    if (row.tier==='critical') fields.previewId=z.string().regex(/^[a-f0-9]{32}$/).optional().describe('Required with confirm:true: the previewId returned by the dryRun:true preview of these exact arguments.');
  }
  // Critical writes additionally need explicit user approval expressed as confirm:true.
  if (row.tier==='critical') fields.confirm=z.boolean().default(false).describe('Must be true, after explicit user approval, to execute this critical action.');
  const targetPolicy=row.tier==='read'?undefined:TARGET_POLICIES[row.operationId];
  if (row.tier!=='read'&&!targetPolicy) throw new Error(`Missing reviewed target policy: ${row.operationId}`);
  return [row.operationId,Object.freeze({...row,input:z.strictObject(fields),...(targetPolicy?{targetPolicy,maxTargets:targetPolicy.maxTargets}:{})})];
})));
export const operationDescriptors = Object.values(operations).filter(op=>op.status==='implemented').map(({operationId,method,pathTemplate})=>({operationId,method,pathTemplate}));
export function validateOperation(op:Operation, raw:unknown, limits:number|Partial<InputLimits>=5000): OperationArgs {
  checkInput(raw,limits);
  const args=op.input.parse(raw) as OperationArgs;
  const queryParams=op.parameters.filter(p=>p.in==='query');
  const queryNames=new Set(queryParams.map(p=>p.name));
  const boundedQuery={...(args.query??{})};
  if (queryNames.has('count') && boundedQuery.count===undefined) boundedQuery.count=100;
  for (const [name,value] of Object.entries(QUERY_DEFAULTS[op.operationId]??{})) if (queryNames.has(name)&&boundedQuery[name]===undefined) boundedQuery[name]=value;
  if (!op.parameters.some(p=>p.in==='path'&&p.required) && queryNames.has('starttime')&&queryNames.has('endtime')&&boundedQuery.starttime===undefined&&boundedQuery.endtime===undefined&&boundedQuery.from===undefined&&boundedQuery.to===undefined) {
    const scale=inputUnit({...queryParams.find(p=>p.name==='starttime')?.schema,description:queryParams.find(p=>p.name==='starttime')?.description},'starttime')==='milliseconds'?1000:1;
    boundedQuery.endtime=Math.floor(Date.now()/1000)*scale;boundedQuery.starttime=Number(boundedQuery.endtime)-3600*scale;
  }
  if (Object.keys(boundedQuery).length) args.query=parameterObject(op.parameters,'query',op.tier).parse(boundedQuery);
  if (args.body!==undefined) {
    const chosen=op.bodies.find(b=>b.contentType===(args.contentType??op.bodies[0]?.contentType));
    if (!chosen) throw new Error('Unsupported body encoding');
    args.body=schemaFromOpenApi(chosen.schema).parse(args.body);
  }
  for (const [name,value] of Object.entries(args.path??{})) {if(args.query?.[name]!==undefined&&String(args.query[name])!==String(value)) throw new Error('Conflicting target parameters');}
  checkRanges(args.query??{},Object.fromEntries(queryParams.map(p=>[p.name,inputUnit({...p.schema,description:p.description},p.name)])),op.operationId);
  const bodyProperties=op.bodies.find(b=>b.contentType===(args.contentType??op.bodies[0]?.contentType))?.schema.properties??{};
  // Free-form bodies (Darktrace/EMAIL search) have no documented time fields: there "from" is a sender, not a time.
  const bodySchema=op.bodies.find(b=>b.contentType===(args.contentType??op.bodies[0]?.contentType))?.schema;
  const freeform=bodySchema?.type==='object'&&!bodySchema.properties&&bodySchema.additionalProperties===true;
  if (!freeform) checkRanges((args.body&&typeof args.body==='object'?args.body:{}) as Record<string,unknown>,Object.fromEntries(Object.entries(bodyProperties).map(([name,schema])=>[name,inputUnit(schema as any,name)])));
  // The capture listing reports filename as "/pcaps/<name>"; the download route takes the bare name.
  if (op.operationId==='get_pcaps_filename'&&typeof args.path?.filename==='string') {
    const listed=/^\/pcaps\/([^/\\]+)$/.exec(args.path.filename);
    if (listed) args.path={...args.path,filename:listed[1]};
  }
  for (const [key,value] of Object.entries(args.path??{})) {
    if (key==='query' && op.pathTemplate.startsWith('/advancedsearch/')) validateSearchHash(String(value));
    else if (typeof value==='string') validatePathSegment(value);
  }
  if (op.operationId==='post_advancedsearch_api_search') validateSearchHash(String((args.body as any)?.hash));
  return args;
}
export function buildRequest(op:Operation,args:OperationArgs,signal?:AbortSignal):ApiRequest {
  const query:Array<readonly[string,string]> = [];
  for (const p of op.parameters.filter(p=>p.in==='query')) {
    const value=args.query?.[p.name];
    if (value===undefined) continue;
    if (Array.isArray(value)) {
      if (p.style && p.style!=='form') throw new Error('Unsupported query serialization');
      if (p.explode===false) query.push([p.name,value.map(String).join(',')]);
      else for (const v of value) query.push([p.name,String(v)]);
    } else query.push([p.name,String(value)]);
  }
  const contentType = args.contentType??op.bodies[0]?.contentType;
  if (args.body!==undefined && contentType==='application/json' && query.length>0) {
    // S4 is blocked: if a future appliance route needs it, 7.1.0 accepts path?{json} only.
    throw new DarktraceApiError('invalid_request',randomUUID());
  }
  return {operationId:op.operationId,pathParams:args.path as Record<string,string|number>|undefined,query,
    ...(args.body===undefined?{}:{body:args.body,contentType}),...(signal?{signal}:{}),
    ...(BINARY_OPERATIONS.has(op.operationId)?{accept:'binary' as const}:{})};
}
