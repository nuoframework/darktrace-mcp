/** Code-owned output projection: no dynamic property maps or caller-selected allowlists. */
export type ResponseView={kind:'string'|'number'|'boolean'|'summary'}|{kind:'object';fields:Record<string,ResponseView>}|{kind:'array';items:ResponseView}|{kind:'union';variants:ResponseView[]};
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
export function projectResponse(view:ResponseView|undefined,value:unknown):{value:unknown;omitted:boolean;unmodeled:boolean;truncated:boolean} {
  let omitted=false,unmodeled=false,truncated=false;
  const summary=()=>{unmodeled=true;return {summary:'Response received; fields omitted because no reviewed output view matches.'};};
  function visit(v:ResponseView|undefined,input:unknown,depth:number):unknown {
    if(!v||v.kind==='summary'||depth>8){omitted=true;return summary();}
    if(v.kind==='union') {
      const variant=v.variants.find(item=>(item.kind==='array'&&Array.isArray(input))||(item.kind==='object'&&input!==null&&typeof input==='object'&&!Array.isArray(input))||(item.kind===typeof input));
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
      if(!Object.keys(out).length&&Object.keys(data).length){omitted=true;return summary();}
      return out;
    }
    if(typeof input!==v.kind||(typeof input==='number'&&!Number.isFinite(input))){omitted=true;return summary();}
    if(typeof input==='string'&&input.length>16384){truncated=true;return input.slice(0,16384);}
    return input;
  }
  const projected=visit(view,value,0);return {value:projected,omitted,unmodeled,truncated};
}
