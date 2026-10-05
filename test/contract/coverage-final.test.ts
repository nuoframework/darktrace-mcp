import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCoverage } from '../../src/coverage/report.js';
import { operations, validateOperation } from '../../src/api/operations.js';
import { schemaFromOpenApi } from '../../src/api/validation.js';
test('coverage preserves 79 operation rows, blocked S5 and every declared parameter/body property',()=>{
  const report=generateCoverage();assert.equal(report.total,79);assert.equal(new Set(report.operations.map(o=>o.operationId)).size,79);
  assert.equal(report.operations.find(o=>o.operationId==='delete_tags_entities')?.status,'blocked');
  for(const op of Object.values(operations)) {
    const row=report.operations.find(r=>r.operationId===op.operationId)!;
    assert.deepEqual(row.validatedOn,[]);
    for(const p of op.parameters) assert.ok(row.parameters.some(r=>r.name===p.name&&r.location===p.in));
    for(const b of op.bodies) for(const name of Object.keys(b.schema.properties??{})) assert.ok(row.parameters.some(r=>r.name===name&&r.contentType===b.contentType));
    for(const p of row.parameters) {assert.ok(p.bounds);assert.ok(p.units);assert.ok(p.default);assert.ok(p.enforcement);}
  }
});
test('documented millisecond ranges enforce seven days even near epoch and defaults use milliseconds',()=>{
  const op=operations.get_modelbreaches;
  assert.doesNotThrow(()=>validateOperation(op,{query:{starttime:0,endtime:604800000}}));
  assert.throws(()=>validateOperation(op,{query:{starttime:0,endtime:604800001}}));
  assert.throws(()=>validateOperation(op,{query:{from:'2026-01-01 00:00:00',to:'2026-01-09 00:00:00'}}));
  assert.throws(()=>validateOperation(op,{query:{from:'2026-02-30 00:00:00',to:'2026-03-01 00:00:00'}}));
  const args=validateOperation(op,{});assert.equal(Number(args.query!.endtime)-Number(args.query!.starttime),3600000);assert.ok(Number(args.query!.endtime)>1e12);
});
test('unknown temporal forms are explicitly blocked and cannot dispatch via generic string/numeric schema',()=>{
  assert.throws(()=>validateOperation(operations.get_devices,{query:{iptime:'unreviewed format'}}));
  assert.throws(()=>validateOperation(operations.post_intelfeed,{body:{expiry:'unreviewed units'}}));
  assert.throws(()=>validateOperation(operations.post_tags_entities,{body:{did:1,tag:'test',duration:3600}}));
  const rows=generateCoverage().operations;
  for(const [op,name] of [['get_devices','iptime'],['post_intelfeed','expiry'],['post_tags_entities','duration']]) {
    const p=rows.find(r=>r.operationId===op)!.parameters.find(r=>r.name===name)!;assert.equal(p.status,'blocked');assert.equal(p.units,'unknown');assert.match(String(p.enforcement),/rejection/);
  }
});
test('effective schemas reject count/score/coordinates/hue/list overflow and undocumented fields',()=>{
  assert.throws(()=>validateOperation(operations.get_modelbreaches,{query:{count:1001}}));
  assert.throws(()=>validateOperation(operations.get_modelbreaches,{query:{minscore:101}}));
  assert.throws(()=>validateOperation(operations.post_subnets,{body:{sid:1,latitude:91}}));
  assert.throws(()=>validateOperation(operations.post_tags,{body:{name:'test',data:{color:361}}}));
  assert.throws(()=>validateOperation(operations.post_aianalyst_acknowledge,{body:{uuid:Array(101).fill('id').join(',')}}));
  assert.throws(()=>schemaFromOpenApi({type:'string',description:'Must be under 64 characters'},'source').parse('x'.repeat(64)));
  assert.throws(()=>validateOperation(operations.get_status,{query:{unreviewed:true}}));
});
test('decoded Advanced Search coverage rejects undocumented custom timestamps',()=>{
  const hash=Buffer.from(JSON.stringify({search:'x',fields:[],timeframe:'custom',time:{starttime:1,endtime:2}})).toString('base64');
  assert.throws(()=>validateOperation(operations.post_advancedsearch_api_search,{body:{hash}}));
  const row=generateCoverage().operations.find(r=>r.operationId==='post_advancedsearch_api_search')!;
  assert.equal(row.parameters.find(p=>p.name==='hash.decoded.time.starttime')?.status,'blocked');
});
