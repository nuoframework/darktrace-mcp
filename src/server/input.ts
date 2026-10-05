import { Transform } from 'node:stream';
import { checkInput, inputLimits, type InputLimits } from '../api/validation.js';
/** Inspect already-valid bounded JSON without recursion; escaped duplicate keys count too. */
function duplicateKeys(text:string):boolean {
  const stack:Array<Set<string>|null>=[];
  let keyExpected=false;
  for(let i=0;i<text.length;i++) {
    const point=text[i];
    if(point==='"') {
      const start=i;
      while(++i<text.length) {if(text[i]==='\\') i++;else if(text[i]==='"') break;}
      const keys=stack.at(-1);
      if(keys && keyExpected) {
        const key=JSON.parse(text.slice(start,i+1)) as string;
        if(keys.has(key)) return true;
        keys.add(key);keyExpected=false;
      }
    } else if(point==='{') {stack.push(new Set());keyExpected=true;}
    else if(point==='[') {stack.push(null);keyExpected=false;}
    else if(point==='}'||point===']') {stack.pop();keyExpected=false;}
    else if(point===',') keyExpected=stack.at(-1)!==null;
  }
  return false;
}
/** Byte admission precedes both JSON parsers; retain at most one bounded partial frame. */
export function boundedInput(configured:number|Partial<InputLimits>):Transform {
  const limits=inputLimits(configured);
  let pending=Buffer.alloc(0);
  return new Transform({readableHighWaterMark:limits.maxToolInputBytes,writableHighWaterMark:limits.maxToolInputBytes,
    transform(chunk:Buffer,_encoding,done) {
      let offset=0;
      while (offset<chunk.length) {
        const end=chunk.indexOf(10,offset);
        const stop=end<0?chunk.length:end;
        // Reserve the newline even for partial frames. Never concatenate an oversized chunk.
        if (pending.length+stop-offset+1>limits.maxToolInputBytes) {pending=Buffer.alloc(0);done(new Error('Protocol input exceeds budget'));return;}
        pending=Buffer.concat([pending,chunk.subarray(offset,stop)]);
        if (end<0) break;
        let forwarded=pending;
        try {
          const text=pending.toString('utf8');
          const message=JSON.parse(text);
          if(duplicateKeys(text)) {
            // Invalid JSON-RPC object: no operation is selected by either parser.
            forwarded=Buffer.from('{}');
          } else
          if (message?.method==='tools/call') {
            try {checkInput(message.params?.arguments??{},limits);} catch {
              message.params={...message.params,arguments:{__rejected_input:true}};
              forwarded=Buffer.from(JSON.stringify(message));
              if (forwarded.length+1>limits.maxToolInputBytes) throw new Error('Protocol input exceeds budget');
            }
          }
        } catch { /* Malformed bounded frames are rejected by the SDK. */ }
        // A replacement must never raise the raw-frame budget either.
        if(forwarded.length+1>limits.maxToolInputBytes) {pending=Buffer.alloc(0);done(new Error('Protocol input exceeds budget'));return;}
        this.push(Buffer.concat([forwarded,Buffer.from('\n')]));
        pending=Buffer.alloc(0);offset=end+1;
      }
      done();
    },flush(done){pending=Buffer.alloc(0);done();}
  });
}
