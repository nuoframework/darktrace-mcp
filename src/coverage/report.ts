import { z } from 'zod';
import { operations } from '../api/operations.js';
import catalogue from '../api/catalogue.generated.json' with {type:'json'};
import responseViews from '../api/response-views.generated.json' with {type:'json'};
import { schemaFromOpenApi, inputUnit, blockedInputReason, SearchSchema, validationRules, SEARCH_HASH_RULE } from '../api/validation.js';
type Schema=Record<string,any>;
export function generateCoverage() {
  const rows=Object.values(operations).map(op=>{
    const parameters:Array<Record<string,unknown>>=[];
    function walk(raw:Schema,name:string,location:string,required:boolean,contentType?:string,depth=0):void {
      if(depth>8) throw new Error('Coverage schema exceeds depth');
      const s=raw.$ref?(catalogue.schemas as Record<string,Schema>)[raw.$ref.slice('#/components/schemas/'.length)]:raw;
      const leaf=name.split('.').at(-1)?.replace(/\[\].*$/,'')??'';
      const partner:Record<string,string>={starttime:'endtime',endtime:'starttime',from:'to',to:'from',start:'end',end:'start'};
      const unpaired=location==='query'&&partner[leaf]&&!op.parameters.some(p=>p.in==='query'&&p.name===partner[leaf]);
      const reason=op.status==='implemented'?(blockedInputReason(s,leaf)??(unpaired?'Standalone time endpoint has no paired endpoint in this operation schema; form rejected':null)):op.reason;
      const validator=schemaFromOpenApi(s,leaf);
      const rules=[...validationRules(validator),...(leaf==='hash'?[SEARCH_HASH_RULE]:[])];
      const schema=z.toJSONSchema(validator,{io:'input'});
      const defaultValue=location==='query'&&name==='count'?100:
        location==='query'&&name==='starttime'&&!op.parameters.some(p=>p.in==='path'&&p.required)&&op.parameters.some(p=>p.name==='endtime')?'now - 1 hour in documented units':
        location==='query'&&name==='endtime'&&!op.parameters.some(p=>p.in==='path'&&p.required)&&op.parameters.some(p=>p.name==='starttime')?'now in documented units':
        required?'required; absence rejected':'omitted; no client default';
      parameters.push({name,location,...(contentType?{contentType}:{}),required,status:reason?'blocked':'accepted',reason,
        units:inputUnit(s,leaf),bounds:schema,default:defaultValue,
        provenance:['local OpenAPI 6.1 parameter/schema','src/api/validation.ts schemaFromOpenApi','src/api/operations.ts validateOperation'],
        enforcement:reason?(op.status==='implemented'?(unpaired?'paired range validation rejection':'schema rejection'):'runtime operation policy rejection'):'strict schema validation before request building',
        ...( /^(starttime|endtime|from|to|start|end)$/.test(leaf)?{rangeRule:'paired endpoints, ordered, at most seven days; explicit descriptor units'}:{}),
        ...(rules.length?{additionalRules:rules,additionalRule:rules.map(r=>r.description).join('; ')}:{})});
      for(const [key,child] of Object.entries(s.properties??{})) walk(child as Schema,name?`${name}.${key}`:key,location,(s.required??[]).includes(key),contentType,depth+1);
      if(s.items) walk(s.items,`${name}[]`,location,true,contentType,depth+1);
      for(const [index,branch] of (s.oneOf??s.anyOf??[]).entries()) walk(branch,`${name}[variant ${index}]`,location,required,contentType,depth+1);
    }
    for(const p of op.parameters) walk({...p.schema,description:p.description??p.schema?.description},p.name,p.in,Boolean(p.required));
    for(const body of op.bodies) walk(body.schema,'','body',op.bodyRequired,body.contentType);
    if(op.operationId==='post_advancedsearch_api_search') {
      const decoded=z.toJSONSchema(SearchSchema,{io:'input'}) as Schema;
      function searchRows(s:Schema,path:string,required:boolean):void {
        const blocked=Boolean(s.not);
        const field=path==='timeframe'?SearchSchema.shape.timeframe:undefined;
        const rules=field?validationRules(field):[];
        parameters.push({name:`hash.decoded.${path}`,location:'body',contentType:'application/json',required,
          status:blocked?'blocked':'accepted',reason:blocked?'Custom endpoint units/format unspecified in local search contract':null,
          units:blocked?'unknown':path==='timeframe'?'seconds; custom form blocked':path==='time.user_interval'?'neutral 0 only':'not applicable',
          bounds:s,default:required?'required; absence rejected':'omitted; no client default',
          provenance:['local OpenAPI search operation description','src/api/validation.ts SearchSchema and validateSearchHash'],
          enforcement:blocked?'decoded strict schema rejection':'decoded strict schema validation',
          ...(rules.length?{additionalRules:rules,additionalRule:rules.map(r=>r.description).join('; ')}:{})});
        for(const [key,v] of Object.entries(s.properties??{})) searchRows(v as Schema,path?`${path}.${key}`:key,(s.required??[]).includes(key));
        if(s.items) searchRows(s.items,`${path}[]`,true);
      }
      for(const [key,s] of Object.entries(decoded.properties??{})) searchRows(s as Schema,key,(decoded.required??[]).includes(key));
    }
    const mandatoryBlocked=parameters.some(p=>p.status==='blocked'&&p.required);
    return {operationId:op.operationId,method:op.method,pathTemplate:op.pathTemplate,tool:op.tool,tier:op.tier,
      status:op.status,reason:op.reason,discovery:op.status==='implemented'?'profile dependent':'unavailable',
      execution:op.status!=='implemented'?'blocked':mandatoryBlocked?'blocked input form':op.tier==='critical'?'preview-only':'operator profile dependent',
      documentedIn:op.documentedIn,validatedOn:op.validatedOn,
      outputView:{source:'local 6.1 response schema and code-owned response-fields.json',
        fields:(responseViews.views as Record<string,unknown>)[op.operationId],unknownFields:'omitted',unmodeledStructures:'fixed safe summary',labValidated:false},parameters};
  });
  return {specVersion:'6.1',labValidated:false,total:rows.length,
    counts:Object.fromEntries(['implemented','blocked','excluded'].map(status=>[status,rows.filter(r=>r.status===status).length])),
    inputBudgets:{bytes:65536,depth:8,elements:5000,operatorMayOnlyLower:true},
    evidence:'Static runtime-schema/policy coverage; offline tests are recorded separately; no security-test or lab validation claim',
    releaseBlockers:['Authorized per-operation appliance 7.1 compatibility and security validation remain pending','Unknown temporal formats/units remain rejected; reviewed contracts are required to enable those parameter forms'],operations:rows};
}
