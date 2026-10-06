import { readFileSync, writeFileSync } from 'node:fs';
import { parse } from 'yaml';
import { applyResponseViewOverrides, compileResponseView, type ResponseView } from '../src/api/response-view.js';
import { requiredProfiles } from '../src/policy/profiles.js';
import { canonicalJson, sha256Hex } from '../src/policy/canonical.js';

// Build-time only: shipped runtime never parses mutable YAML or documentation.
const spec = parse(readFileSync('openapi/darktrace-threat-visualizer.yaml', 'utf8'));
// The portal 6.1 spec lists Darktrace/EMAIL routes without parameters. Parameter names/types come from the
// static LegendEvent/darktrace-sdk v0.10.1 inventory; descriptions and bounds below are code-owned.
const sdk = parse(readFileSync('openapi/darktrace-sdk.yaml', 'utf8'));
const EMAIL_PARAMETER_DESCRIPTIONS: Record<string,string> = {
  link:'Encoded link to decode (Darktrace/EMAIL; parameter from darktrace-sdk v0.10.1, not in portal 6.1 docs).',
  days:'Number of days to include (Darktrace/EMAIL; parameter from darktrace-sdk v0.10.1).',
  limit:'Maximum number of results (Darktrace/EMAIL; parameter from darktrace-sdk v0.10.1).',
  offset:'Pagination offset (Darktrace/EMAIL; parameter from darktrace-sdk v0.10.1).',
  include_headers:'Include email headers in the response (Darktrace/EMAIL; parameter from darktrace-sdk v0.10.1).',
  eventType:'Filter by audit event type (Darktrace/EMAIL; parameter from darktrace-sdk v0.10.1).',
  uuid:'Email UUID',
};
function emailParameters(pathTemplate: string, method: string, documented: any[]): any[] {
  const op = sdk.paths?.[pathTemplate]?.[method];
  if (!op) throw new Error(`Missing SDK email inventory: ${method} ${pathTemplate}`);
  const names = new Set(documented.map((p: any) => `${p.in}:${p.name}`));
  const extra = [...(sdk.paths[pathTemplate].parameters ?? []), ...(op.parameters ?? [])]
    .filter((p: any) => !names.has(`${p.in}:${p.name}`))
    .map((p: any) => {
      if (!Object.hasOwn(EMAIL_PARAMETER_DESCRIPTIONS, p.name)) throw new Error(`Unreviewed email parameter: ${p.name}`);
      const type = p.schema?.type;
      if (!['string', 'integer', 'boolean'].includes(type)) throw new Error('Unsupported email parameter type');
      return { name: p.name, in: p.in, required: Boolean(p.required), description: EMAIL_PARAMETER_DESCRIPTIONS[p.name], schema: { type } };
    });
  return [...documented, ...extra];
}
// Lab evidence on Darktrace 7.1: the 19 bounded consultation recipes
// (docs/security/validated-consultations-lab-checkpoint.md) plus the 2026-10-06 full-API live run through the
// production MCP stdio path (docs/CHANGES-core.md "Live lab validation"). Only clean 2xx results with a verified
// effect count; operations that failed, were forbidden for the lab token, answered non-2xx after applying the
// change, or were not executed stay "not lab-validated".
const LAB_VALIDATED_71 = new Set(['get_status','get_devices','get_subnets','get_aianalyst_stats','get_intelfeed',
  'get_modelbreaches','get_devicesearch','get_similardevices','get_aianalyst_groups','get_aianalyst_incidentevents',
  'get_aianalyst_investigations','get_mbcomments','get_details','get_tags_entities','get_tags_tid','get_tags_tid_entities',
  'get_endpointdetails','get_antigena','get_antigena_summary',
  // 2026-10-06 live run
  'get_modelbreaches_pbid','get_modelbreaches_pbid_comments','get_metrics','get_metrics_mlid','get_models','get_models_pid',
  'get_components','get_components_cid','get_deviceinfo','get_devicesummary','get_network','get_metricdata','get_enums',
  'get_summarystatistics','get_aianalyst_incident_comments','get_tags','get_pcaps','get_pcaps_filename',
  'post_advancedsearch_api_search','get_advancedsearch_api_search_query','get_advancedsearch_api_analyze_field_analysis_query',
  'get_advancedsearch_api_graph_graphmode_interval_query',
  'post_tags','post_tags_entities','post_tags_tid_entities','post_aianalyst_acknowledge','post_aianalyst_unacknowledge',
  'post_aianalyst_pin','post_aianalyst_unpin','post_modelbreaches_pbid_acknowledge','post_modelbreaches_pbid_unacknowledge',
  'post_modelbreaches_pbid_comments','post_aianalyst_incident_comments',
  'post_antigena_manual','post_antigena','post_intelfeed','post_subnets']);
// Release decision (docs/CHANGES-core.md "Email action"): listed and covered, never executed in this release.
const BLOCKED: Record<string,string> = {
  post_agemail_api_ep_api_v1_0_emails_uuid_action: 'signing and schema unvalidated; 403 on lab',
};
const SDK_VERSION = String(sdk.info?.version ?? '').split(' ')[0];
/** Per-operation schema pin for Darktrace/EMAIL: SHA-256 of the canonical SDK path item the parameters come from. */
function emailSchemaPin(pathTemplate: string) {
  const item = sdk.paths?.[pathTemplate];
  if (!item || !/^\d+\.\d+\.\d+$/.test(SDK_VERSION)) throw new Error(`Missing SDK email schema: ${pathTemplate}`);
  return { schemaSha256: sha256Hex(canonicalJson(item)), schemaVersion: `darktrace-sdk ${SDK_VERSION}`,
    schemaProvenance: `openapi/darktrace-sdk.yaml#/paths/${pathTemplate.replaceAll('~', '~0').replaceAll('/', '~1')}` };
}
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
    const blocked = !excluded && Object.hasOwn(BLOCKED, op.operationId);
    const status = excluded ? 'excluded' : blocked ? 'blocked' : 'implemented';
    const tool = assignments.get(op.operationId);
    if (!excluded && !tool) throw new Error(`Missing curated mapping: ${op.operationId}`);
    if (!Object.hasOwn(outputFields,op.operationId)) throw new Error('Missing reviewed output field policy');
    responseViews[op.operationId] = compileResponseView(op.responses?.['200']?.content?.['application/json']?.schema,spec.components?.schemas??{},outputFields[op.operationId]);
    const bodies = Object.entries(op.requestBody?.content ?? {}).map(([contentType, entry]: [string, any]) => ({contentType,schema:entry.schema}));
    rows.push({operationId:op.operationId, method:method.toUpperCase(), pathTemplate, tool:tool ?? null,
      tier:risk.risk_tier, sensitivity:risk.data_sensitivity, status,
      reason:excluded?'Deprecated endpoint':blocked?BLOCKED[op.operationId]:null,
      execution:status!=='implemented'?'disabled':risk.risk_tier==='critical'?'confirm-required':'enabled-by-profile',
      parameters:email?emailParameters(pathTemplate,method,[...(item.parameters??[]),...(op.parameters??[])]):[...(item.parameters??[]),...(op.parameters??[])], bodies, bodyRequired:op.requestBody?.required??false,
      documentedIn:email?'6.1 (routes) + darktrace-sdk v0.10.1 (parameters)':'6.1', ...(email?emailSchemaPin(pathTemplate):{}), validatedOn:LAB_VALIDATED_71.has(op.operationId)?['7.1']:[],
      requiredProfiles:status!=='implemented'?[]:requiredProfiles({method:method.toUpperCase(),pathTemplate,tier:risk.risk_tier,sensitivity:risk.data_sensitivity})});
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
