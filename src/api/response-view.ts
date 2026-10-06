/** Code-owned output projection: no dynamic property maps or caller-selected allowlists. */
export type ResponseView={kind:'string'|'number'|'boolean'|'null'|'summary'}|{kind:'object';fields:Record<string,ResponseView>}|{kind:'array';items:ResponseView}|{kind:'union';variants:ResponseView[]};
/** Exact documented hourly aggregate variant; never selected from upstream keys. */
export const SUMMARY_LOGINPUT_VIEW:ResponseView={kind:'object',fields:{events:{kind:'boolean'},data:{kind:'array',items:{kind:'object',fields:{timems:{kind:'number'},time:{kind:'string'},events:{kind:'number'}}}}}};
export function operationResponseVariants(operationId:string) {
  return operationId==='get_summarystatistics'?[{query:{eventtype:'loginput'},schema:'SummarystatisticsEventtypeLoginput',fields:SUMMARY_LOGINPUT_VIEW}]:[];
}
/** Code-owned views for operations whose spec response is untyped and that may not pass data through. */
export const CODE_OWNED_VIEWS:Readonly<Record<string,ResponseView>>=Object.freeze({
  // Email action acknowledgement: only a status-like field is returned; message content never is.
  post_agemail_api_ep_api_v1_0_emails_uuid_action:{kind:'object',fields:{response:{kind:'string'},status:{kind:'string'},success:{kind:'boolean'}}},
});
export function selectResponseView(operationId:string,query:Record<string,unknown>|undefined,base:ResponseView|undefined):ResponseView|undefined {
  if (Object.hasOwn(CODE_OWNED_VIEWS,operationId)) return CODE_OWNED_VIEWS[operationId];
  return operationId==='get_summarystatistics'&&query?.eventtype==='loginput'?SUMMARY_LOGINPUT_VIEW:base;
}
type ResponseViewOverride=Readonly<{operationId:string;path:readonly string[];compiledKind:ResponseView['kind'];schema:string;property:string;quote:string;view?:ResponseView;nullable?:true}>;
/** Build-time corrections bound to verbatim local OpenAPI 6.1 descriptions; '[]' addresses array items. */
export const RESPONSE_VIEW_OVERRIDES:readonly ResponseViewOverride[]=Object.freeze([
  {operationId:'get_antigena_summary',path:['pendingActionDevices','[]'],compiledKind:'summary',schema:'AntigenaSummary',property:'pendingActionDevices',quote:'An array of did values',view:{kind:'number'}},
  {operationId:'get_antigena_summary',path:['activeActionDevices','[]'],compiledKind:'summary',schema:'AntigenaSummary',property:'activeActionDevices',quote:'An array of did values',view:{kind:'number'}},
  {operationId:'get_antigena',path:['[]','triggerer'],compiledKind:'object',schema:'AntigenaFulldevicedetailsFalse',property:'triggerer',quote:'If triggered by Darktrace automatically, "null".',nullable:true},
] as const);
/** Fails closed when an override path is absent, already corrected upstream or its evidence quote changed. */
export function applyResponseViewOverrides(views:Record<string,ResponseView>,schemas:Record<string,any>,overrides:readonly ResponseViewOverride[]=RESPONSE_VIEW_OVERRIDES):void {
  for(const o of overrides) {
    const description=schemas[o.schema]?.properties?.[o.property]?.description;
    if(typeof description!=='string'||!description.includes(o.quote))throw new Error(`Override evidence changed: ${o.operationId}`);
    let parent:Record<string,any>|undefined,key='',node:any=views[o.operationId];
    for(const step of o.path) {
      parent=node;
      if(step==='[]'&&node?.kind==='array')key='items';
      else if(step!=='[]'&&node?.kind==='object'&&Object.hasOwn(node.fields,step)){parent=node.fields;key=step;}
      else throw new Error(`Override path missing: ${o.operationId}`);
      node=parent![key];
    }
    if(!parent||node?.kind!==o.compiledKind)throw new Error(`Override path missing: ${o.operationId}`);
    parent[key]=o.nullable?{kind:'union',variants:[node,{kind:'null'}]}:o.view;
  }
}
const unsafe=/^(?:__proto__|prototype|constructor)$|token|password|secret|signature|authorization|cookie|canonical|credential|rawMailBody|payload|^@message$/i;
export function compileResponseView(raw:Record<string,any>|undefined,schemas:Record<string,any>,fields?:readonly string[],depth=0,seen:readonly string[]=[]):ResponseView {
  if(!raw||depth>8)return {kind:'summary'};
  if(raw.$ref) {
    const prefix='#/components/schemas/',name=String(raw.$ref).slice(prefix.length);
    if(!raw.$ref.startsWith(prefix)||seen.includes(name)||!schemas[name])return {kind:'summary'};
    return compileResponseView(schemas[name],schemas,fields,depth,[...seen,name]);
  }
  if(raw.oneOf||raw.anyOf)return {kind:'union',variants:(raw.oneOf??raw.anyOf).map((s:any)=>compileResponseView(s,schemas,fields,depth+1,seen))};
  if(raw.type==='array')return {kind:'array',items:compileResponseView(raw.items,schemas,fields,depth+1,seen)};
  if(raw.type==='object'||raw.properties) {
    const children=Object.entries(raw.properties??{}).filter(([key])=>!unsafe.test(key)&&(!fields||fields.includes(key)));
    if(!children.length)return {kind:'summary'};
    return {kind:'object',fields:Object.fromEntries(children.map(([key,schema])=>[key,compileResponseView(schema as any,schemas,undefined,depth+1,seen)]))};
  }
  if(raw.type==='string')return {kind:'string'};
  if(raw.type==='integer'||raw.type==='number')return {kind:'number'};
  if(raw.type==='boolean')return {kind:'boolean'};
  return {kind:'summary'};
}
/** untypedFallback: keep bounded data for objects matching no documented key (Advanced Search aggregations). */
export function projectResponse(view:ResponseView|undefined,value:unknown,options:{untypedFallback?:boolean;untypedObjects?:boolean}={}):{value:unknown;omitted:boolean;unmodeled:boolean;truncated:boolean} {
  let omitted=false,unmodeled=false,truncated=false;
  const summary=()=>{unmodeled=true;return {summary:'Response received; fields omitted because no reviewed output view matches.'};};
  /** Untyped schema nodes: keep bounded data, dropping credential-like keys (secrets are redacted again downstream). */
  function untyped(input:unknown,depth:number):unknown {
    if(input===null||typeof input==='boolean')return input;
    if(typeof input==='number')return Number.isFinite(input)?input:null;
    if(typeof input==='string'){if(input.length>16384){truncated=true;return input.slice(0,16384);}return input;}
    if(depth>8){omitted=true;return summary();}
    if(Array.isArray(input)){if(input.length>1000)truncated=true;return input.slice(0,1000).map(item=>untyped(item,depth+1));}
    if(typeof input==='object'){
      // Untyped objects (free-form maps) pass only where the caller allows it; scalars and scalar lists always do.
      if(!options.untypedObjects&&!options.untypedFallback){omitted=true;return summary();}
      const out:Record<string,unknown>=Object.create(null);
      for(const [key,entry] of Object.entries(input as Record<string,unknown>)){if(unsafe.test(key)){omitted=true;continue;}out[key]=untyped(entry,depth+1);}
      return out;
    }
    omitted=true;return summary();
  }
  function visit(v:ResponseView|undefined,input:unknown,depth:number):unknown {
    if(v?.kind==='summary'&&depth>0)return untyped(input,depth);
    if(!v||v.kind==='summary'||depth>8){omitted=true;return summary();}
    if(v.kind==='union') {
      const fits=v.variants.filter(item=>item.kind==='array'?Array.isArray(input):item.kind==='object'?input!==null&&typeof input==='object'&&!Array.isArray(input):item.kind==='null'?input===null:(['string','number','boolean'].includes(item.kind)&&item.kind===typeof input));
      // Several object variants: prefer the one sharing the most keys with the received object.
      const overlap=(item:ResponseView)=>item.kind==='object'&&input&&typeof input==='object'?Object.keys(input).filter(key=>Object.hasOwn(item.fields,key)).length:0;
      const variant=fits.length>1?[...fits].sort((a,b)=>overlap(b)-overlap(a))[0]:fits[0];
      return visit(variant,input,depth+1);
    }
    if(v.kind==='array') {
      if(!Array.isArray(input)){omitted=true;return summary();}
      if(input.length>1000){omitted=true;truncated=true;}
      return input.slice(0,1000).map(item=>visit(v.items,item,depth+1));
    }
    if(v.kind==='object') {
      if(input===null||typeof input!=='object'||Array.isArray(input)){omitted=true;return summary();}
      const out:Record<string,unknown>=Object.create(null),data=input as Record<string,unknown>;
      if(Object.keys(data).some(key=>!Object.hasOwn(v.fields,key)))omitted=true;
      for(const [key,child] of Object.entries(v.fields))if(Object.hasOwn(data,key))out[key]=visit(child,data[key],depth+1);
      // No documented key matched (e.g. undocumented aggregation shapes): keep the bounded data rather than nothing.
      if(!Object.keys(out).length&&Object.keys(data).length)return depth>0&&options.untypedFallback?untyped(input,depth):(()=>{omitted=true;return summary();})();
      return out;
    }
    if(v.kind==='null'){if(input===null)return null;omitted=true;return summary();}
    if(typeof input!==v.kind||(typeof input==='number'&&!Number.isFinite(input))){omitted=true;return summary();}
    if(typeof input==='string'&&input.length>16384){truncated=true;return input.slice(0,16384);}
    return input;
  }
  const projected=visit(view,value,0);return {value:projected,omitted,unmodeled,truncated};
}
