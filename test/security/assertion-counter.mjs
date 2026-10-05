// Count assertion invocations, not test cases or proof of compliance.
import assert from 'node:assert/strict';
let invocations=0;
for(const name of Object.keys(assert)) {
  if(typeof assert[name]!=='function'||name==='AssertionError'||name==='CallTracker'||name==='strict')continue;
  const original=assert[name];assert[name]=function(...args){invocations++;return Reflect.apply(original,this,args);};
}
process.once('exit',()=>process.stderr.write('ADVERSARIAL_ASSERTIONS '+JSON.stringify({invocations})+'\n'));
