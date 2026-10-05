import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { operations, validateOperation, buildRequest } from '../../src/api/operations.js';
import { schemaFromOpenApi, validationRules, SearchSchema } from '../../src/api/validation.js';
import { generateCoverage } from '../../src/coverage/report.js';
test('SA-02 specific pbid preserves exact lookup; explicit ranges remain bounded; collection defaults retained',()=>{
  const op=operations.get_modelbreaches_pbid;const args=validateOperation(op,{path:{pbid:42}});
  const request=buildRequest(op,args);assert.deepEqual(request.query,[]);assert.deepEqual(request.pathParams,{pbid:42});
  assert.throws(()=>validateOperation(op,{path:{pbid:42},query:{starttime:0,endtime:604800001}}));
  assert.deepEqual(buildRequest(op,validateOperation(op,{path:{pbid:42},query:{starttime:0,endtime:604800000}})).query,[['endtime','604800000'],['starttime','0']]);
  const collection=validateOperation(operations.get_modelbreaches,{});assert.equal(Number(collection.query!.endtime)-Number(collection.query!.starttime),3600000);
  const row=generateCoverage().operations.find(o=>o.operationId===op.operationId)!;
  assert.equal(row.parameters.find(p=>p.name==='starttime')?.default,'omitted; no client default');
});
test('SA-03 every actual string refinement is registered and appears in coverage',()=>{
  const report=generateCoverage();let checked=0;
  for(const op of Object.values(operations)) {
    const rows=report.operations.find(o=>o.operationId===op.operationId)!.parameters;
    function walk(raw:any,name:string,location:string,contentType?:string) {
      if(raw.$ref)return;
      const leaf=name.split('.').at(-1)?.replace(/\[\].*$/,'')??'';
      const schema=schemaFromOpenApi(raw,leaf);const rules=validationRules(schema);
      const custom=(schema as any)._zod.def.checks?.filter((c:any)=>c._zod.def.check==='custom')??[];
      if(custom.length)assert.ok(rules.length,`${op.operationId}:${name} has unregistered refine`);
      if(rules.length) {
        const row=rows.find(r=>r.name===name&&r.location===location&&r.contentType===contentType)!;
        assert.ok(row,`${op.operationId}:${name}`);assert.deepEqual(row.additionalRules,rules);assert.ok(row.additionalRule);checked++;
      }
      for(const [key,child] of Object.entries(raw.properties??{}))walk(child,name?`${name}.${key}`:key,location,contentType);
      if(raw.items)walk(raw.items,`${name}[]`,location,contentType);
      for(const [i,child] of (raw.oneOf??raw.anyOf??[]).entries())walk(child,`${name}[variant ${i}]`,location,contentType);
    }
    for(const p of op.parameters)walk({...p.schema,description:p.description??p.schema?.description},p.name,p.in);
    for(const body of op.bodies)walk(body.schema,'','body',body.contentType);
  }
  assert.ok(checked>20);
  const search=report.operations.find(o=>o.operationId==='post_advancedsearch_api_search')!;
  assert.deepEqual(search.parameters.find(p=>p.name==='hash.decoded.timeframe')?.additionalRules,validationRules(SearchSchema.shape.timeframe));
});
test('SA-03 invalid IP, calendar, decimal count/offset and documented text ceilings are enforced',()=>{
  assert.throws(()=>validateOperation(operations.get_devices,{query:{ip:'999.1.2.3'}}));
  assert.throws(()=>validateOperation(operations.get_antigena,{query:{from:'2026-02-30 00:00:00',to:'2026-03-01 00:00:00'}}));
  for(const [name,bad,id] of [['count','1001','decimal_count'],['offset','100001','decimal_offset'],['ip','hostname.example','ip_literal'],['from','2026-02-30 00:00:00','utc_calendar'],['description','x'.repeat(64),'documented_text_length']]) {
    const schema=schemaFromOpenApi({type:'string',description:name==='from'?'YYYY-MM-DD HH:MM:SS':name==='description'?'Must be under 64 characters':''},name);
    assert.ok(validationRules(schema).some(r=>r.id===id));assert.throws(()=>schema.parse(bad));
  }
  const rows=generateCoverage().operations;
  assert.ok((rows.find(o=>o.operationId==='get_devices')!.parameters.find(p=>p.name==='ip')!.additionalRules as any[]).some(r=>r.id==='ip_literal'));
});
test('SA-05 catalogue generation succeeds without architecture Markdown and preserves code-owned mapping',()=>{
  const work=mkdtempSync(join(tmpdir(),'sa05-mapping-'));for(const name of ['openapi','docs','src/api'])mkdirSync(join(work,name),{recursive:true});
  for(const file of ['openapi/darktrace-threat-visualizer.yaml','docs/operation-inventory.json','src/api/tool-groups.json','src/api/response-fields.json'])copyFileSync(file,join(work,file));
  const result=spawnSync(process.execPath,[resolve('dist/scripts/generate-catalogue.js')],{cwd:work,encoding:'utf8'});assert.equal(result.status,0,result.stderr);
  const actual=JSON.parse(readFileSync(join(work,'src/api/catalogue.generated.json'),'utf8'));
  const mapping=JSON.parse(readFileSync('src/api/tool-groups.json','utf8'));assert.equal(actual.operations.length,79);
  for(const row of actual.operations)assert.equal(row.tool,mapping[row.operationId]);
});
