import { isIP } from 'node:net';
import { z } from 'zod';
import catalogue from './catalogue.generated.json' with { type: 'json' };

type Schema = Record<string, any>;
const schemas: Record<string, Schema> = catalogue.schemas;
const forbidden = new Set(['__proto__', 'prototype', 'constructor']);
export function inputUnit(raw:Schema,name:string):string {
  const text=String(raw.description??'');
  if (/millisecond/i.test(text)) return 'milliseconds';
  if (/seconds|segundos/i.test(text)) return 'seconds';
  if (/hours|hour intervals/i.test(text)||/^(hours|intervalhours)$/i.test(name)) return 'hours';
  if (/YYYY-MM-DD/.test(text)) return 'UTC datetime';
  if (/^(iptime|investigateTime|expiry|duration|expiryDuration|starttime|endtime|start|end|interval)$/i.test(name)) return 'unknown';
  if (/^(latitude|longitude|color)$/i.test(name)) return 'degrees';
  if (/^(count|limit|size|length|num|numResults|maxResults|similardevices|offset|page)$/i.test(name)) return 'items';
  if (/id$|^master$|^viewsubnet$/i.test(name)) return 'identifier';
  return ['number','integer'].includes(raw.type)?'dimensionless':'not applicable';
}
export function blockedInputReason(raw:Schema,name:string):string|null {
  return inputUnit(raw,name)==='unknown'?'Unknown time units or format; form blocked pending reviewed contract':null;
}
/** Reject unsafe keys before schema parsing can strip or transform them. */
export interface InputLimits { maxToolInputBytes:number; maxToolInputDepth:number; maxToolInputElements:number; }
export function inputLimits(value:number|Partial<InputLimits> = {}):InputLimits {
  const raw=typeof value==='number'?{maxToolInputElements:value}:value;
  const clamp=(v:number|undefined,cap:number)=>v===undefined?cap:Number.isSafeInteger(v)&&v>=1?Math.min(v,cap):(()=>{throw new Error('Invalid input limit');})();
  return {maxToolInputBytes:clamp(raw.maxToolInputBytes,65536),maxToolInputDepth:clamp(raw.maxToolInputDepth,8),maxToolInputElements:clamp(raw.maxToolInputElements,5000)};
}
export function checkInput(value: unknown, configured:number|Partial<InputLimits> = 5000): void {
  const limits=inputLimits(configured);
  let elements = 0;
  const seen = new Set<object>();
  function visit(v: unknown, depth: number): void {
    if (++elements > limits.maxToolInputElements || depth > limits.maxToolInputDepth) throw new Error('Input exceeds budget');
    if (typeof v === 'string' && (v.length > 16384 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v))) throw new Error('Invalid string');
    if (v === null || typeof v !== 'object') return;
    if (seen.has(v)) throw new Error('Cyclic input');
    seen.add(v);
    if (!Array.isArray(v) && Object.getPrototypeOf(v) !== Object.prototype && Object.getPrototypeOf(v) !== null) throw new Error('Invalid prototype');
    for (const [key, item] of Object.entries(v)) {
      if (forbidden.has(key)) throw new Error('Unsafe key');
      visit(item,depth+1);
    }
    seen.delete(v);
  }
  visit(value, 0);
  if (Buffer.byteLength(JSON.stringify(value) ?? '') > limits.maxToolInputBytes) throw new Error('Input exceeds byte budget');
}

export interface ValidationRule {readonly id:string;readonly description:string;}
const rulesBySchema=new WeakMap<z.ZodType,readonly ValidationRule[]>();
export function validationRules(schema:z.ZodType):readonly ValidationRule[] {return rulesBySchema.get(schema)??[];}
function registerRules<T extends z.ZodType>(schema:T,rules:readonly ValidationRule[]):T {
  rulesBySchema.set(schema,Object.freeze(rules.map(({id,description})=>Object.freeze({id,description}))));return schema;
}
interface StringRule extends ValidationRule {
  matches:(raw:Schema,name:string)=>boolean;
  apply:(schema:z.ZodString,raw:Schema)=>z.ZodString;
}
const documentedLength=(raw:Schema)=>String(raw.description??'').match(/(?:under|must be under) (\d+) characters/i);
const stringRules:readonly StringRule[]=[
  {id:'decimal_count',description:'Decimal integer string 1..1000',matches:(_s,n)=>/^(count|limit|size)$/i.test(n),
    apply:s=>s.regex(/^[1-9][0-9]{0,3}$/).refine(v=>Number(v)<=1000)},
  {id:'decimal_offset',description:'Decimal integer string 0..100000',matches:(_s,n)=>/^(offset|page)$/i.test(n),
    apply:s=>s.regex(/^\d{1,6}$/).refine(v=>Number(v)<=100000)},
  {id:'ip_literal',description:'Valid IPv4 or IPv6 literal using node:net isIP; hostnames and malformed addresses rejected',matches:(_s,n)=>/^(ip|ip1|ip2)$/i.test(n),
    apply:s=>s.refine(v=>isIP(v)!==0)},
  {id:'list_entries',description:'At most 100 comma/newline-separated entries',matches:(_s,n)=>/^(uuid|addlist)$/i.test(n),
    apply:s=>s.refine(v=>v.split(/[,\n]/).length<=100)},
  {id:'documented_text_length',description:'Length strictly below the documented character ceiling',matches:s=>Boolean(documentedLength(s)),
    apply:(s,raw)=>s.max(Number(documentedLength(raw)![1])-1)},
  {id:'utc_calendar',description:'UTC YYYY-MM-DD HH:MM:SS with a valid calendar date and exact round-trip; invalid dates such as February 30 rejected',matches:(s,n)=>inputUnit(s,n)==='UTC datetime',
    apply:s=>s.regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/).refine(v=>{
      const iso=v.replace(' ','T')+'Z',parsed=new Date(iso);
      return Number.isFinite(parsed.getTime())&&parsed.toISOString().replace('.000Z','Z')===iso;
    })},
];
const SEARCH_SECONDS_RULE:ValidationRule={id:'search_seconds',description:'Decimal relative timeframe 1..604800 seconds; custom endpoint form rejected pending documented units/format'};
export const SEARCH_HASH_RULE:ValidationRule=Object.freeze({id:'search_hash',description:'Canonical Base64; decoded bytes <=16384; fatal UTF-8 decoding, bounded strict SearchSchema, paired custom endpoints required and unknown endpoint units rejected'});

export function schemaFromOpenApi(raw: Schema, name = '', depth = 0): z.ZodType<any> {
  if (depth > 8) throw new Error('Schema depth exceeds budget');
  let s = raw;
  if (s.$ref) {
    const prefix = '#/components/schemas/';
    if (!s.$ref.startsWith(prefix) || !schemas[s.$ref.slice(prefix.length)]) throw new Error('Unsupported schema reference');
    s = schemas[s.$ref.slice(prefix.length)];
  }
  if (blockedInputReason(s,name)) return z.never();
  let result: z.ZodType<any>;
  if (Array.isArray(s.enum) && s.enum.length) result = z.union(s.enum.map((v: any) => z.literal(v)) as any);
  else if (s.oneOf || s.anyOf) result = z.union((s.oneOf ?? s.anyOf).map((v: Schema)=>schemaFromOpenApi(v,name,depth+1)) as any);
  else if (s.type === 'object' || s.properties) {
    const shape: Record<string,z.ZodType<any>> = {};
    for (const [key,v] of Object.entries(s.properties ?? {})) {
      if (forbidden.has(key)) throw new Error('Unsafe schema key');
      const field = schemaFromOpenApi(v as Schema,key,depth+1);
      shape[key] = (s.required??[]).includes(key) ? field : field.optional();
    }
    result = z.strictObject(shape);
  } else if (s.type === 'array') result = z.array(schemaFromOpenApi(s.items??{type:'string'},name,depth+1)).max(Math.min(s.maxItems??100,100)).min(s.minItems??0);
  else if (s.type === 'boolean') result = z.boolean();
  else if (s.type === 'integer' || s.type === 'number') {
    let num = z.number().finite();
    if (s.type === 'integer') num = num.int();
    num = num.min(s.minimum ?? -Number.MAX_SAFE_INTEGER).max(s.maximum ?? Number.MAX_SAFE_INTEGER);
    if (/^(count|limit|size|length|num|numResults|maxResults)$/i.test(name)) num = num.int().min(1).max(1000);
    if (name==='similardevices') num=num.int().min(0).max(100);
    if (/^(offset|page)$/i.test(name)) num = num.int().min(0).max(100000);
    if (/^(hours|intervalhours)$/i.test(name)) num = num.min(1).max(168);
    if (/^(port|port1|port2|sourceport|destinationport)$/i.test(name)) num=num.int().min(1).max(65535);
    if (/^(did|ddid|odid|excludedid|excludesid|master|viewsubnet|pbid|pid|sid|tid|teid|mlid|cid|codeid)$/i.test(name)) num=num.int().min(1);
    if (name==='priority') num=num.int().min(-5).max(5);
    if (/^(start|end|starttime|endtime)$/i.test(name)) num=num.int().min(0);
    if (name==='interval') num=num.int().min(1).max(604800);
    if (/^(duration|expiryDuration)$/i.test(name)) num=num.int().min(0).max(86400);
    if (/^(minscore|maxscore|mingroupscore|maxgroupscore)$/i.test(name)) num=num.min(0).max(100);
    if (name==='latitude') num=num.min(-90).max(90);
    if (name==='longitude') num=num.min(-180).max(180);
    if (name==='color') num=num.int().min(0).max(360);
    result = num;
  } else if (s.type === 'string' || !s.type) {
    let str = z.string().min(s.minLength??0).max(Math.min(s.maxLength??8192,8192));
    if (s.pattern) str = str.regex(new RegExp(s.pattern));
    if (s.format === 'uuid') str = str.uuid();
    if (s.format === 'date-time') str = str.datetime({offset:true});
    const active=stringRules.filter(rule=>rule.matches(s,name));
    for(const rule of active) str=rule.apply(str,s);
    result = registerRules(str,active.map(rule=>({...rule,description:rule.id==='documented_text_length'?`Length <= ${Number(documentedLength(s)![1])-1} characters (strictly below documented ceiling)`:rule.description})));

  } else throw new Error('Unsupported input schema');
  if (s.nullable) result = registerRules(result.nullable(),validationRules(result));
  return result;
}

export const SearchSchema = z.strictObject({
  search:z.string().min(1).max(8192), fields:z.array(z.string().max(128)).max(100),
  size:z.number().int().min(1).max(1000).optional(), offset:z.number().int().min(0).max(100000).optional(),
  timeframe:registerRules(z.union([z.literal('custom'),z.string().regex(/^\d{1,6}$/).refine(v=>Number(v)>0&&Number(v)<=604800)]),[SEARCH_SECONDS_RULE]),
  // Only the documented neutral user_interval example is enabled; custom endpoint
  // units/formats are not specified in the local search contract.
  time:z.strictObject({user_interval:z.literal(0).optional(),
    starttime:z.never().optional(),endtime:z.never().optional(),
    from:z.never().optional(),to:z.never().optional()}).optional(),
  graphmode:z.enum(['count','mean']).optional(), mode:z.string().max(32).optional(), analyze_field:z.string().max(128).optional(),
});
export function validateSearchHash(hash: string): void {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(hash) || hash.length%4!==0) throw new Error('Invalid search encoding');
  const bytes = Buffer.from(hash,'base64');
  if (bytes.length > 16384 || bytes.toString('base64') !== hash) throw new Error('Invalid search encoding');
  const input = JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  checkInput(input);
  const parsed = SearchSchema.parse(input);
  if (parsed.timeframe === 'custom' && !parsed.time) throw new Error('Custom search requires bounded time');
  checkRanges(parsed.time ?? {});
  if (parsed.timeframe === 'custom' && !(('starttime' in (parsed.time??{}) && 'endtime' in (parsed.time??{})) || ('from' in (parsed.time??{}) && 'to' in (parsed.time??{})))) throw new Error('Time pair required');
}
export function checkRanges(query: Record<string,unknown>, units:Record<string,string>={}): void {
  for (const [start,end] of [['starttime','endtime'],['from','to'],['start','end']]) {
    if ((query[start]===undefined)!==(query[end]===undefined)) throw new Error('Time parameters must be paired');
    if (query[start]===undefined) continue;
    const parseTime = (v: unknown) => typeof v==='number'?v:typeof v==='string'&&/^\d+$/.test(v)?Number(v):typeof v==='string'?Date.parse(v.includes('T')?v:v.replace(' ','T')+'Z'):NaN;
    const first=parseTime(query[start]), last=parseTime(query[end]);
    const window = units[start]==='milliseconds'||units[start]==='UTC datetime'?604800000:604800;
    if (!Number.isFinite(first)||!Number.isFinite(last)||last<first||last-first>window) throw new Error('Time window exceeds seven days');
  }
}
