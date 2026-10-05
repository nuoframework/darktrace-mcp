import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { operations, operationDescriptors, validateOperation, buildRequest } from '../../src/api/operations.js';
import report from '../../src/coverage/report.generated.json' with {type:'json'};
test('all 79 spec/inventory operations map exactly once to truthful statuses',()=>{
 const spec=parse(readFileSync('openapi/darktrace-threat-visualizer.yaml','utf8'));
 const ids=Object.values(spec.paths).flatMap((path:any)=>['get','post','delete'].flatMap(method=>path[method]?[path[method].operationId]:[])).sort();
 assert.equal(ids.length,79);assert.deepEqual(Object.keys(operations).sort(),ids);
 assert.equal(report.operations.length,79);assert.equal(new Set(report.operations.map(r=>r.operationId)).size,79);
 assert.deepEqual(report.counts,{implemented:59,blocked:19,excluded:1});
 assert.equal(report.operations.filter(r=>r.pathTemplate.startsWith('/agemail/')&&r.status==='blocked').length,14);
 assert.ok(operationDescriptors.every(op=>operations[op.operationId].status==='implemented'&&operations[op.operationId].tier!=='critical'));
 assert.equal(report.labValidated,false);assert.ok(report.operations.every(r=>r.validatedOn.length===0));
});
test('required OpenAPI fields and form-only bodies enforced',()=>{
 assert.throws(()=>validateOperation(operations.get_devicesummary,{}));
 assert.throws(()=>validateOperation(operations.post_pcaps,{body:{ip1:'10.0.0.1'}}));
 assert.throws(()=>validateOperation(operations.post_aianalyst_acknowledge,{body:{}}));
 assert.throws(()=>validateOperation(operations.post_tags,{body:{name:'name',data:{injected:true}}}));
 assert.throws(()=>validateOperation(operations.post_devices,{body:{did:1,priority:10}}));
});
test('query arrays are repeated ordered entries, default count finite',()=>{
 const op=operations.get_devices;
 const args=validateOperation(op,{query:{saasfilter:['first','second']}});
 const req=buildRequest(op,args);
 assert.deepEqual(req.query?.filter(([key])=>key==='saasfilter'),[['saasfilter','first'],['saasfilter','second']]);
 assert.ok(req.query?.some(([key,value])=>key==='count'&&value==='100'));
});
test('encoded searches validate inner budgets and reject injection and unbounded query',()=>{
 const op=operations.post_advancedsearch_api_search;
 const hash=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64');
 const valid={search:'@type:dns',fields:[],timeframe:'3600',size:100};
 assert.doesNotThrow(()=>validateOperation(op,{body:{hash:hash(valid)}}));
 for(const value of [{...valid,size:100000},{...valid,offset:100001},{...valid,timeframe:'9999999'},{...valid,origin:'https://evil.example'},JSON.parse('{"search":"x","fields":[],"timeframe":"3600","__proto__":{"x":1}}')]) assert.throws(()=>validateOperation(op,{body:{hash:hash(value)}}));
});
