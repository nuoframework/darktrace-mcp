import { redactString } from '../shape/redact.js';
/** Preserve string types and exact protocol literals; never parse text as nested JSON. */
export function redactValue<T>(value:T,tokens:readonly string[]):T {
  const seen=new WeakMap<object,unknown>();
  function visit(item:unknown):unknown {
    if(typeof item==='string') return redactString(item,tokens);
    if(item===null||typeof item!=='object') return item;
    if(seen.has(item)) return seen.get(item);
    if(Array.isArray(item)) {const out:unknown[]=[];seen.set(item,out);for(const entry of item) out.push(visit(entry));return out;}
    const out:Record<string,unknown>=Object.create(null);seen.set(item,out);
    for(const [key,entry] of Object.entries(item)) out[redactString(key,tokens)]=visit(entry);
    return out;
  }
  return visit(value) as T;
}
