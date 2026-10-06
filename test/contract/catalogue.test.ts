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
 assert.deepEqual(report.counts,{implemented:77,blocked:1,excluded:1});
 const email=report.operations.filter(r=>r.pathTemplate.startsWith('/agemail/'));
 assert.equal(email.length,14);assert.ok(email.filter(r=>r.tier==='read').length===13&&email.filter(r=>r.tier==='read').every(r=>r.status==='implemented'));
 assert.deepEqual(email.filter(r=>r.tier==='read').map(r=>(r as any).requiredProfiles.join('+')).filter((v,i,a)=>a.indexOf(v)===i),['read+sensitive']);
 // The email ACTION is blocked (never published or executable): unvalidated signing/schema, 403 on the lab.
 const action=email.find(r=>r.tier==='critical') as any;
 assert.deepEqual([action.operationId,action.status,action.reason,action.requiredProfiles],['post_agemail_api_ep_api_v1_0_emails_uuid_action','blocked','signing and schema unvalidated; 403 on lab',[]]);
 assert.equal(operations.post_agemail_api_ep_api_v1_0_emails_uuid_action.status,'blocked');
 assert.equal(operationDescriptors.length,77);assert.ok(!operationDescriptors.some(op=>op.operationId==='post_agemail_api_ep_api_v1_0_emails_uuid_action'));assert.ok(operationDescriptors.every(op=>operations[op.operationId].status==='implemented'));
 assert.equal(report.labValidated,false);
 // Lab evidence (Darktrace 7.1): 19 bounded consultation recipes plus the 2026-10-06 live run; critical writes
 // were executed only with human approval and reverted. Email (403 for the lab token) and DELETE routes are not validated.
 assert.equal(report.operations.filter(r=>r.validatedOn.length>0).length,59);
 assert.ok(report.operations.every(r=>r.validatedOn.length===0||r.validatedOn.join()==='7.1'));
 assert.ok(report.operations.filter(r=>r.pathTemplate.startsWith('/agemail/')||r.method==='DELETE').every(r=>r.validatedOn.length===0));
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
