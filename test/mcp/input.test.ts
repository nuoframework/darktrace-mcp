import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { boundedInput } from '../../src/server/input.js';
async function frame(args:unknown) {
 const input=boundedInput(5000);let output='';input.on('data',chunk=>{output+=String(chunk);});
 input.end(JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'darktrace_get_status',arguments:args}})+'\n');
 await once(input,'end');return JSON.parse(output).params.arguments;
}
test('raw decoder rejects prototype keys, deep and oversized args before SDK',async()=>{
 assert.deepEqual(await frame(JSON.parse('{"__proto__":{"polluted":true}}')),{__rejected_input:true});
 assert.deepEqual(await frame({query:{constructor:'x'}}),{__rejected_input:true});
 let deep:unknown='x';for(let i=0;i<10;i++) deep={data:deep};
 assert.deepEqual(await frame(deep),{__rejected_input:true});
 assert.deepEqual(await frame({body:'x'.repeat(65000)}),{__rejected_input:true});
 assert.deepEqual(await frame({query:{fast:true}}),{query:{fast:true}});
});
test('unterminated raw protocol frame cannot grow beyond fixed buffer',async()=>{
 const input=boundedInput(5000);const error=once(input,'error');input.write(Buffer.alloc(150000,120));
 await error;assert.equal(input.destroyed,true);
});
test('protocol redaction preserves JSONRPC string literals and redacts tokens',async()=>{
 const {redactValue}=await import('../../src/observability/redact.js');
 const cleaned=redactValue({jsonrpc:'2.0',data:['true','0123','PRIVATE_SECRET']},['PRIVATE_SECRET']);
 assert.equal(cleaned.jsonrpc,'2.0');assert.deepEqual(cleaned.data,['true','0123','[REDACTED]']);
});
