import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { parse } from 'yaml';
import { applyResponseViewOverrides, compileResponseView, projectResponse, RESPONSE_VIEW_OVERRIDES, type ResponseView } from '../../src/api/response-view.js';
import generated from '../../src/api/response-views.generated.json' with {type:'json'};

const root=new URL('../../../',import.meta.url);
const spec=parse(readFileSync(new URL('openapi/darktrace-threat-visualizer.yaml',root),'utf8'));
const schemas=spec.components.schemas as Record<string,any>;
const fields=JSON.parse(readFileSync(new URL('src/api/response-fields.json',root),'utf8')) as Record<string,string[]>;
const views=generated.views as Record<string,ResponseView>;
const FALLBACK='Response received; fields omitted because no reviewed output view matches.';
const CANARY='SYNTHETIC_OVERRIDE_CANARY',KEY_CANARY='SYNTHETIC_KEY_CANARY';
function compiled():Record<string,ResponseView> {
  const out:Record<string,ResponseView>={};
  for(const item of Object.values(spec.paths) as any[])for(const method of ['get','post','delete'])if(item[method])
    out[item[method].operationId]=compileResponseView(item[method].responses?.['200']?.content?.['application/json']?.schema,schemas,fields[item[method].operationId]);
  return out;
}
// Harness verdict, extracted verbatim so projection and live acceptance cannot drift.
const harness=readFileSync(new URL('scripts/lab-read-smoke.mjs',root),'utf8');
const viewShape=runInNewContext(/\/\/ OpenAPI AianalystStats[\s\S]*?\nfunction viewShape[\s\S]*?\n}\n/.exec(harness)![0]+'viewShape') as (view:ResponseView,data:unknown,operation:string)=>boolean;
const fellBack=(value:unknown)=>JSON.stringify(value).includes(FALLBACK);

test('regenerated views differ from the compiled 6.1 schema only at the two evidence-bound operations',()=>{
  const base=compiled();
  assert.deepEqual(Object.keys(base).sort(),Object.keys(views).sort());
  assert.deepEqual(Object.keys(views).filter(id=>JSON.stringify(base[id])!==JSON.stringify(views[id])).sort(),['get_antigena','get_antigena_summary']);
  applyResponseViewOverrides(base,schemas);
  assert.deepEqual(base,views);
  assert.deepEqual((views.get_antigena_summary as any).fields.activeActionDevices,{kind:'array',items:{kind:'number'}});
  assert.deepEqual((views.get_antigena_summary as any).fields.pendingActionDevices,{kind:'array',items:{kind:'number'}});
  assert.deepEqual((views.get_antigena as any).items.fields.triggerer,{kind:'union',variants:[{kind:'object',fields:{username:{kind:'string'},reason:{kind:'string'}}},{kind:'null'}]});
});

test('overrides fail closed on changed quotes, missing paths or already-corrected schemas',()=>{
  const clone=(value:unknown)=>JSON.parse(JSON.stringify(value));
  const reject=(mutate:(s:any,v:any)=>void,message:RegExp)=>{const s=clone(schemas),v=compiled();mutate(s,v);assert.throws(()=>applyResponseViewOverrides(v,s),message);};
  reject(s=>{s.AntigenaSummary.properties.activeActionDevices.description='An array of device values.';},/evidence changed/);
  reject(s=>{s.AntigenaFulldevicedetailsFalse.properties.triggerer.description=s.AntigenaFulldevicedetailsFalse.properties.triggerer.description.replace('"null"','null');},/evidence changed/);
  reject(s=>{delete s.AntigenaFulldevicedetailsFalse.properties.triggerer;},/evidence changed/);
  reject(s=>{delete s.AntigenaSummary;},/evidence changed/);
  reject((_,v)=>{delete v.get_antigena;},/path missing/);
  reject((_,v)=>{delete v.get_antigena.items.fields.triggerer;},/path missing/);
  reject((_,v)=>{v.get_antigena_summary.fields.pendingActionDevices={kind:'summary'};},/path missing/);
  reject((_,v)=>{v.get_antigena_summary.fields.activeActionDevices.items={kind:'number'};},/path missing/);
  reject((_,v)=>{v.get_antigena.items.fields.triggerer={kind:'summary'};},/path missing/);
  const once=compiled();applyResponseViewOverrides(once,schemas);
  assert.throws(()=>applyResponseViewOverrides(once,schemas),/path missing/);
  assert.ok(Object.isFrozen(RESPONSE_VIEW_OVERRIDES));
  assert.equal(RESPONSE_VIEW_OVERRIDES.length,3);
});

test('documented did arrays and automatic null triggerer project without fallback',()=>{
  const summary={pendingCount:0,activeCount:2,pendingActionDevices:[],activeActionDevices:[7,-6]};
  const s=projectResponse(views.get_antigena_summary,summary);
  assert.deepEqual(JSON.parse(JSON.stringify(s.value)),summary);
  assert.deepEqual([s.omitted,s.unmodeled,s.truncated],[false,false,false]);
  assert.equal(viewShape(views.get_antigena_summary,s.value,'get_antigena_summary'),true);
  const actions=[{codeid:1,did:7,ip:'192.0.2.7',action:'quarantine',manual:false,triggerer:null,label:'x',detail:''},
    {codeid:2,did:8,action:'quarantine',manual:true,triggerer:{username:'synthetic',reason:'r'}}];
  const a=projectResponse(views.get_antigena,actions);
  assert.equal((a.value as any)[0].triggerer,null);
  assert.deepEqual({...(a.value as any)[1].triggerer},{username:'synthetic',reason:'r'});
  assert.deepEqual([a.omitted,a.unmodeled,a.truncated],[false,false,false]);
  assert.equal(fellBack(a.value),false);
  assert.equal(viewShape(views.get_antigena,a.value,'get_antigena'),true);
});

test('unknown keys stay dropped and the array cap is unchanged',()=>{
  const a=projectResponse(views.get_antigena,[{codeid:1,triggerer:null,model:CANARY,score:0.3},{codeid:2,triggerer:{username:'u',[CANARY]:1}}]);
  assert.equal(a.omitted,true);assert.equal(a.unmodeled,false);
  assert.equal(JSON.stringify(a.value).includes(CANARY),false);
  const big=projectResponse(views.get_antigena_summary,{activeActionDevices:Array.from({length:1001},(_,i)=>i)});
  assert.equal(big.truncated,true);assert.equal((big.value as any).activeActionDevices.length,1000);
});

test('wrong types still fail closed to the fixed summary without echoing values',()=>{
  for(const bad of [CANARY,'7',null,true,{did:7},[7],Number.NaN,Number.POSITIVE_INFINITY]) {
    const r=projectResponse(views.get_antigena_summary,{activeActionDevices:[7,bad]});
    assert.equal(r.unmodeled,true);assert.equal(fellBack(r.value),true);
    assert.equal(JSON.stringify(r.value).includes(CANARY),false);
    assert.equal(viewShape(views.get_antigena_summary,r.value,'get_antigena_summary'),false);
  }
  for(const bad of [CANARY,0,false,[],[null],'null',{[CANARY]:1}]) {
    const r=projectResponse(views.get_antigena,[{codeid:1,triggerer:bad}]);
    assert.equal(r.unmodeled,true);assert.equal(fellBack(r.value),true);
    assert.equal(JSON.stringify(r.value).includes(CANARY),false);
    assert.equal(viewShape(views.get_antigena,r.value,'get_antigena'),false);
  }
  // Nullability is granted only where documented.
  for(const field of ['codeid','did','ip','action','manual','label','detail']) {
    const r=projectResponse(views.get_antigena,[{codeid:1,[field]:null}]);
    assert.equal(r.unmodeled,true,field);
  }
  for(const field of ['pendingCount','activeCount','pendingActionDevices','activeActionDevices'])assert.equal(projectResponse(views.get_antigena_summary,{[field]:null}).unmodeled,true,field);
  const lone=projectResponse({kind:'null'},CANARY);
  assert.equal(lone.unmodeled,true);assert.equal(JSON.stringify(lone.value).includes(CANARY),false);
  assert.equal(projectResponse({kind:'null'},null).value,null);
});

test('seeded fuzz: projection and harness agree and only documented forms pass',()=>{
  let seed=0x2e77bff8;
  const next=()=>(seed=(Math.imul(seed,1103515245)+12345)>>>0)/2**32;
  const pick=<T>(items:readonly T[])=>items[Math.floor(next()*items.length)];
  const scalars=[null,0,-1,1.5,Number.NaN,true,false,'',CANARY,'null'] as const;
  const value=(depth:number):unknown=>depth>2||next()<0.5?pick(scalars):next()<0.5?Array.from({length:Math.floor(next()*3)},()=>value(depth+1)):
    Object.fromEntries(Array.from({length:Math.floor(next()*3)},()=>[pick(['username','reason',KEY_CANARY,'did']),value(depth+1)]));
  for(let i=0;i<2000;i++) {
    const did=value(0),triggerer=value(0);
    const s=projectResponse(views.get_antigena_summary,{activeActionDevices:[did]});
    const sOk=typeof did==='number'&&Number.isFinite(did);
    assert.equal(!fellBack(s.value),sOk);
    assert.equal(viewShape(views.get_antigena_summary,s.value,'get_antigena_summary'),sOk);
    const a=projectResponse(views.get_antigena,[{codeid:1,triggerer}]);
    const t=(a.value as any[])[0]?.triggerer;
    const objectOk=!!triggerer&&typeof triggerer==='object'&&!Array.isArray(triggerer)&&Object.keys(triggerer).length>0&&
      Object.keys(triggerer).some(k=>k==='username'||k==='reason')&&Object.entries(triggerer).every(([k,v])=>!['username','reason'].includes(k)||typeof v==='string');
    const aOk=triggerer===null||objectOk||(!!triggerer&&typeof triggerer==='object'&&!Array.isArray(triggerer)&&!Object.keys(triggerer).length);
    assert.equal(!fellBack(a.value),aOk,JSON.stringify(triggerer));
    assert.equal(viewShape(views.get_antigena,a.value,'get_antigena'),aOk&&(t===null||Object.keys(t).length>0));
    // did values are never strings; unknown key names never survive; documented string fields may echo strings.
    assert.equal(JSON.stringify(s.value).includes(CANARY),false);
    assert.equal(JSON.stringify(a.value).includes(KEY_CANARY),false);
  }
});
