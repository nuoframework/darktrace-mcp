import { readFileSync, writeFileSync } from 'node:fs';
import { parse } from 'yaml';
import { applyResponseViewOverrides, compileResponseView, type ResponseView } from '../src/api/response-view.js';

// Build-time only: shipped runtime never parses mutable YAML or documentation.
const spec = parse(readFileSync('openapi/darktrace-threat-visualizer.yaml', 'utf8'));
const inventory = JSON.parse(readFileSync('docs/operation-inventory.json', 'utf8'));
const mapping = JSON.parse(readFileSync('src/api/tool-groups.json', 'utf8')) as Record<string,string|null>;
const assignments = new Map(Object.entries(mapping));
const outputFields = JSON.parse(readFileSync('src/api/response-fields.json','utf8')) as Record<string,string[]>;
const responseViews: Record<string,ResponseView> = {};
const rows: any[] = [];
for (const [pathTemplate, item] of Object.entries(spec.paths) as [string, any][]) {
  for (const method of ['get','post','delete']) {
    const op = item[method];
    if (!op) continue;
    const risk = inventory.operations.find((r: any) => r.operationId === op.operationId);
    if (!risk || risk.path !== pathTemplate || risk.method !== method.toUpperCase()) throw new Error('Inventory mismatch');
    const email = pathTemplate.startsWith('/agemail/');
    const excluded = Boolean(op.deprecated || risk.deprecated);
    const exportBlocked = op.operationId === 'get_pcaps_filename';
    const signingBlocked = ['get_advancedsearch_api_search_query','get_advancedsearch_api_analyze_field_analysis_query','get_advancedsearch_api_graph_graphmode_interval_query','delete_tags_entities'].includes(op.operationId);
    const status = excluded ? 'excluded' : email || exportBlocked || signingBlocked ? 'blocked' : 'implemented';
    const tool = assignments.get(op.operationId);
    if (!excluded && !tool) throw new Error(`Missing curated mapping: ${op.operationId}`);
    if (!Object.hasOwn(outputFields,op.operationId)) throw new Error('Missing reviewed output field policy');
    responseViews[op.operationId] = compileResponseView(op.responses?.['200']?.content?.['application/json']?.schema,spec.components?.schemas??{},outputFields[op.operationId]);
    const bodies = Object.entries(op.requestBody?.content ?? {}).map(([contentType, entry]: [string, any]) => ({contentType,schema:entry.schema}));
    rows.push({operationId:op.operationId, method:method.toUpperCase(), pathTemplate, tool:tool ?? null,
      tier:risk.risk_tier, sensitivity:risk.data_sensitivity, status,
      reason:excluded?'Deprecated endpoint':email?'Instance email schema and authentication contract required':exportBlocked?'Independent export approval, retention and aggregate disk quota pending':signingBlocked?'Unvalidated DELETE query or base64 GET path signing shape disabled pending independent fixtures and lab evidence':null,
      execution:status!=='implemented'?'disabled':risk.risk_tier==='critical'?'preview-only':'enabled-by-profile',
      parameters:[...(item.parameters??[]),...(op.parameters??[])], bodies, bodyRequired:op.requestBody?.required??false,
      documentedIn:'6.1', validatedOn:[], requiredProfiles:status!=='implemented'?[]:[risk.risk_tier==='read'?'read':'write',...(risk.risk_tier==='critical'?['writeCritical']:[]),...(pathTemplate.startsWith('/advancedsearch/')?['sensitiveRead']:[])]});
  }
}
applyResponseViewOverrides(responseViews,spec.components?.schemas??{});
rows.sort((a,b)=>a.operationId.localeCompare(b.operationId));
if (Object.keys(mapping).length !== 79 || Object.keys(mapping).some(id=>!rows.some(row=>row.operationId===id))) throw new Error('Tool mapping must match all inventory operations');
if (rows.length !== 79 || new Set(rows.map(r=>r.operationId)).size !== 79 || inventory.operations.length !== 79) throw new Error('Coverage must contain exactly 79 unique operations');
const generated = { source:'openapi/darktrace-threat-visualizer.yaml', specVersion:'6.1', operations:rows, schemas:spec.components?.schemas??{} };
writeFileSync('src/api/catalogue.generated.json', JSON.stringify(generated,null,2)+'\n');
// Effective coverage is emitted after compiling runtime schemas by scripts/build.mjs.
writeFileSync('src/api/response-views.generated.json',JSON.stringify({source:'local OpenAPI 6.1 and code-owned response-fields.json',labValidated:false,views:responseViews},null,2)+'\n');
