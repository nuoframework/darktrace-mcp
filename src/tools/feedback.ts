import { z } from 'zod';
import { validationRules } from '../api/validation.js';
import { operations, type Operation } from '../api/operations.js';

/**
 * Model-facing feedback for rejected calls. Everything here is derived from our own schemas and code-owned
 * strings: submitted values are never echoed, and upstream exceptions never reach this module.
 */
export interface ArgumentIssue { path:string; problem:string; expected?:string; allowed?:string[]; }
const MAX_ISSUES=20;
const SAFE_SEGMENT=/^[A-Za-z0-9_.-]{1,64}$/;
/** Path segments come from schema keys; a caller-chosen key that is not a plain identifier is masked. */
function segment(part:PropertyKey):string {return typeof part==='number'?String(part):typeof part==='string'&&SAFE_SEGMENT.test(part)?part:'?';}
function pathText(path:readonly PropertyKey[]):string {return path.length?path.map(segment).join('.'):'(arguments)';}
function unwrap(schema:z.ZodType|undefined):z.ZodType|undefined {
  let current:any=schema;
  for (let i=0;i<8&&current;i++) {
    const def=current._zod?.def;
    if (def&&['optional','default','nullable','prefault','readonly','nonoptional','catch'].includes(def.type)) current=def.innerType;
    else if (def?.type==='pipe') current=def.in;
    else break;
  }
  return current;
}
/** The schema node at a path (object fields, array items, union branches merged), or undefined. */
function schemasAt(root:z.ZodType,path:readonly PropertyKey[]):z.ZodType[] {
  let nodes:z.ZodType[]=[root];
  for (const part of path) {
    const next:z.ZodType[]=[];
    for (const node of nodes) {
      const s:any=unwrap(node),def=s?._zod?.def;
      if (!def) continue;
      if (def.type==='union') {for (const option of def.options) next.push(...schemasAt(option,[part]));}
      else if (def.type==='object'&&typeof part==='string'&&Object.hasOwn(def.shape,part)) next.push(def.shape[part]);
      else if (def.type==='array'&&typeof part==='number') next.push(def.element);
    }
    nodes=next;
  }
  return nodes;
}
function objectKeys(nodes:z.ZodType[]):string[] {
  const keys=new Set<string>();
  for (const node of nodes) {
    const s:any=unwrap(node),def=s?._zod?.def;
    if (def?.type==='object') for (const key of Object.keys(def.shape)) keys.add(key);
    if (def?.type==='union') for (const option of def.options) for (const key of objectKeys([option])) keys.add(key);
  }
  return [...keys].sort();
}
function requiredKeys(node:z.ZodType|undefined):string[] {
  const s:any=unwrap(node),def=s?._zod?.def;
  if (def?.type!=='object') return [];
  return Object.entries(def.shape).filter(([,v]:[string,any])=>v._zod?.optin!=='optional').map(([k])=>k);
}
function ruleText(root:z.ZodType,path:readonly PropertyKey[]):string|undefined {
  for (const node of schemasAt(root,path)) {
    const rules=validationRules(node as z.ZodType).length?validationRules(node as z.ZodType):validationRules(unwrap(node) as z.ZodType);
    if (rules.length) return rules.map(rule=>rule.description).join('; ').slice(0,300);
  }
  return undefined;
}
function bound(issue:any):string {
  const value=Number(issue.code==='too_small'?issue.minimum:issue.maximum);
  const op=issue.code==='too_small'?(issue.inclusive===false?'>':'>='):(issue.inclusive===false?'<':'<=');
  const shown=Number.isFinite(value)?String(value):'bound';
  return issue.origin==='string'?`length ${op} ${shown}`:issue.origin==='array'||issue.origin==='set'?`items ${op} ${shown}`:`${issue.origin==='bigint'?'integer':'number'} ${op} ${shown}`;
}
function literals(issue:any):string[]|undefined {
  const values=(issue.values as unknown[]|undefined)??[];
  const safe=values.filter(v=>['string','number','boolean'].includes(typeof v)).map(String).filter(v=>v.length<=64);
  return safe.length===values.length&&safe.length?safe.slice(0,20):undefined;
}
function collect(root:z.ZodType,issues:readonly any[],prefix:readonly PropertyKey[],out:ArgumentIssue[]):void {
  for (const issue of issues) {
    if (out.length>=MAX_ISSUES) return;
    const path=[...prefix,...((issue.path as PropertyKey[]|undefined)??[])];
    const at=pathText(path);
    switch (issue.code) {
      case 'invalid_type': {
        const missing=/received undefined$/.test(String(issue.message));
        out.push({path:at,problem:missing?'required':'wrong_type',expected:String(issue.expected).slice(0,32)});break;
      }
      case 'too_small': case 'too_big': out.push({path:at,problem:issue.code,expected:bound(issue)});break;
      case 'invalid_format': {
        const pattern=typeof issue.pattern==='string'&&issue.pattern.length<=120?issue.pattern:undefined;
        out.push({path:at,problem:'invalid_format',expected:issue.format==='regex'?(pattern?`match ${pattern}`:'documented pattern'):String(issue.format).slice(0,32)});break;
      }
      case 'invalid_value': {const values=literals(issue);out.push({path:at,problem:'invalid_value',...(values?{allowed:values}:{})});break;}
      case 'not_multiple_of': out.push({path:at,problem:'not_multiple_of'});break;
      case 'unrecognized_keys': {
        const unknown=((issue.keys as unknown[])??[]).map(k=>typeof k==='string'&&SAFE_SEGMENT.test(k)?k:'?').slice(0,10);
        out.push({path:at,problem:'unknown_parameter',expected:`not one of: ${unknown.join(', ')}`.slice(0,200),allowed:objectKeys(schemasAt(root,path)).slice(0,60)});break;
      }
      case 'invalid_union': {
        const branches=(issue.errors as any[][]|undefined)??[];
        if (branches.some(b=>b.some(i=>i.code==='invalid_type'&&!(i.path??[]).length&&/received undefined$/.test(String(i.message))))) {out.push({path:at,problem:'required'});break;}
        // A union of literals (enums): report the allowed values together.
        if (branches.length&&branches.every(b=>b.length===1&&b[0].code==='invalid_value'&&!(b[0].path??[]).length)) {
          const values=branches.flatMap(b=>literals(b[0])??[]);out.push({path:at,problem:'invalid_value',...(values.length?{allowed:values.slice(0,20)}:{})});break;
        }
        // Object variants: explain against the closest variant (fewest issues).
        const best=[...branches].sort((a,b)=>a.length-b.length)[0];
        if (!best) {out.push({path:at,problem:'no_matching_variant'});break;}
        if (branches.length>1&&best.every(b=>b.code==='invalid_type'&&!(b.path??[]).length)) {out.push({path:at,problem:'wrong_type',expected:String(best[0].expected).slice(0,32)});break;}
        collect(root,best,path,out);break;
      }
      default: {
        const rule=ruleText(root,path);
        out.push({path:at,problem:'constraint_failed',...(rule?{expected:rule}:{})});
      }
    }
  }
}
/** Bounded, value-free description of schema failures against the operation's own input schema. */
export function describeArgumentIssues(op:Operation,error:z.ZodError):ArgumentIssue[] {return describeSchemaIssues(op.input,error);}
/** Same, for a nested document validated by its own schema (e.g. a decoded search), under a path prefix. */
export function describeSchemaIssues(schema:z.ZodType,error:z.ZodError,prefix:readonly string[]=[]):ArgumentIssue[] {
  const out:ArgumentIssue[]=[];collect(schema,error.issues,[],out);
  return out.slice(0,MAX_ISSUES).map(issue=>prefix.length?{...issue,path:[...prefix,...(issue.path==='(arguments)'?[]:[issue.path])].join('.')}:issue);
}
/** Required parameter/body names per location, read from the operation's own schema. */
export function requiredFields(op:Operation):{path:string[];query:string[];body:string[]} {
  const shape=(op.input as any)._zod.def.shape as Record<string,z.ZodType>;
  // A body with a code-owned default (fixed flag) is not required from the caller.
  if ((shape.body as any)?._zod?.def?.type==='default') return {path:requiredKeys(shape.path),query:requiredKeys(shape.query),body:[]};
  const body=unwrap(shape.body) as any;
  const bodyRequired=body?._zod?.def?.type==='union'?[...new Set((body._zod.def.options as z.ZodType[]).map(requiredKeys).reduce((a,b)=>a.filter(k=>b.includes(k))))]:requiredKeys(shape.body);
  return {path:requiredKeys(shape.path),query:requiredKeys(shape.query),body:shape.body?bodyRequired:[]};
}
/** Code-owned validation messages thrown by src/api/validation.ts and operations.ts, mapped to guidance. */
const KNOWN_VALIDATION_ERRORS:Readonly<Record<string,string>>=Object.freeze({
  'Time window exceeds seven days':'starttime/endtime (epoch milliseconds) or from/to ("YYYY-MM-DD HH:MM:SS" UTC) must be ordered and at most 7 days apart. Split longer periods into several calls.',
  'Time parameters must be paired':'Give both starttime and endtime (or both from and to), or neither for the default last hour.',
  'Conflicting target parameters':'The same identifier was given with different values in path and query; give it once.',
  'Invalid path segment':'Path identifiers must not contain /, \\, ?, #, whitespace, encoded separators or dot segments.',
  'Unsupported body encoding':'contentType does not match a documented body encoding for this operation; omit it to use the default.',
  'Invalid search encoding':'query/hash must be canonical standard Base64 of the search JSON, e.g. {"search":"@type:conn","fields":[],"timeframe":"3600"}.',
  'Custom search requires bounded time':'timeframe "custom" is not supported here; use a relative timeframe in seconds (1..604800).',
  'Time pair required':'timeframe "custom" is not supported here; use a relative timeframe in seconds (1..604800).',
  'Summary modes are mutually exclusive':'Use only one of eventtype, csensor or mitreTactics.',
  'Summary eventtype required':'hours/endtime/to require eventtype (for example eventtype:"loginput").',
  'Summary accepts one time anchor':'Give endtime or to, not both.',
  'Unreviewed summary time anchor':'A time anchor is only supported with eventtype:"loginput" and integer hours 1..168.',
  'Invalid summary anchor':'endtime must be epoch milliseconds; to must be "YYYY-MM-DD HH:MM:SS" UTC.',
  'Invalid summary calendar':'to must be a valid UTC date "YYYY-MM-DD HH:MM:SS".',
  'Input exceeds budget':'Arguments exceed the input budget (size, depth or element count). Send fewer or smaller values.',
  'Input exceeds byte budget':'Arguments exceed the input byte budget. Send fewer or smaller values.',
  'Invalid string':'A string argument is too long (>16384) or contains control characters.',
  'Unsafe key':'Argument keys __proto__, prototype and constructor are not allowed.',
  'Cyclic input':'Arguments must be plain JSON.',
  'Invalid prototype':'Arguments must be plain JSON.',
});
export function knownValidationHint(error:unknown):string|undefined {
  if (!(error instanceof Error)||error.constructor!==Error) return undefined;
  const message=error.message;
  return Object.hasOwn(KNOWN_VALIDATION_ERRORS,message)?KNOWN_VALIDATION_ERRORS[message]:undefined;
}
/** Operation-aware advice when output or the appliance response is too large. */
export function sizeAdvice(op:Operation|undefined):string {
  if (!op) return 'Request fewer records.';
  const names=new Set(op.parameters.map(p=>p.name));
  const steps:string[]=[];
  if (names.has('starttime')&&names.has('endtime')) steps.push('narrow starttime/endtime');
  if (names.has('count')) steps.push('lower count');
  if (names.has('minimal')) steps.push('set minimal:true');
  if (names.has('responsedata')) steps.push('set responsedata to the fields you need (comma list)');
  if (names.has('fulldevicedetails')) steps.push('omit fulldevicedetails');
  const byId=Object.values(operations).some(other=>other.tool===op.tool&&other!==op&&other.tier==='read'&&other.parameters.some(p=>p.in==='path'&&p.required));
  if (!op.parameters.some(p=>p.in==='path'&&p.required)&&byId) steps.push('or fetch single records by id');
  return steps.length?`Request less: ${steps.join(', ')}.`:'Request fewer records or add filters.';
}
