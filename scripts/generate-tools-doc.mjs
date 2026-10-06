#!/usr/bin/env node
// Builds docs/tools.md from src/api/catalogue.generated.json + src/api/tool-groups.json.
// Usage: node scripts/generate-tools-doc.mjs          (write docs/tools.md)
//        node scripts/generate-tools-doc.mjs --check  (exit 1 if docs/tools.md is stale)
// Offline and read-only apart from docs/tools.md. Never contacts an appliance.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const read = path => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const catalogue = read('src/api/catalogue.generated.json');
const toolGroups = read('src/api/tool-groups.json');
const target = new URL('docs/tools.md', root);

// Operations that passed real queries on a Darktrace 7.1.0 lab (2026-10-06).
// Anything else is listed as "not lab-validated" unless the catalogue records validatedOn.
const LAB_VALIDATED = new Set([
  'get_status', 'get_devices', 'get_subnets', 'get_aianalyst_stats', 'get_intelfeed',
  'get_modelbreaches', 'get_devicesearch', 'get_similardevices', 'get_aianalyst_groups',
  'get_aianalyst_incidentevents', 'get_aianalyst_investigations', 'get_mbcomments',
  'get_details', 'get_tags_entities', 'get_tags_tid', 'get_tags_tid_entities',
  'get_endpointdetails', 'get_antigena', 'get_antigena_summary',
]);

// One plain-language line per operation. Missing entries fall back to "METHOD path".
const DESCRIPTIONS = {
  get_status: 'System health and version of the appliance.',
  get_summarystatistics: 'Device counts, bandwidth and active response actions.',
  get_enums: 'Text values for numeric codes used in API responses.',
  get_filtertypes: 'Filters available in the Model Editor.',
  get_cves: 'CVEs for OT devices (Darktrace/OT only).',
  get_devices: 'List devices, or one device by `did`.',
  post_devices: 'Change a device label, priority or type.',
  get_devicesearch: 'Search devices with filters.',
  get_devicesummary: 'Context for one device from several sources.',
  get_deviceinfo: 'Connection data for one device.',
  get_similardevices: 'Devices that behave like a given device.',
  get_details: 'Time-sorted connections and events for a device or entity.',
  get_endpointdetails: 'Location and connection info for an external IP or hostname.',
  get_network: 'Connectivity between devices or subnets.',
  get_metricdata: 'Time-series metric data for a device.',
  get_modelbreaches: 'List model breaches (alerts).',
  get_modelbreaches_pbid: 'One model breach by `pbid`.',
  get_mbcomments: 'Comments across model breaches.',
  get_modelbreaches_pbid_comments: 'Comments on one model breach.',
  post_modelbreaches_pbid_comments: 'Add a comment to a model breach.',
  post_modelbreaches_pbid_acknowledge: 'Acknowledge a model breach.',
  post_modelbreaches_pbid_unacknowledge: 'Unacknowledge a model breach.',
  get_models: 'List models.',
  get_models_pid: 'One model by `pid`.',
  get_components: 'List model components.',
  get_components_cid: 'One model component by `cid`.',
  get_metrics: 'List available metrics.',
  get_metrics_mlid: 'One metric by `mlid`.',
  get_aianalyst_groups: 'List AI Analyst incidents (groups).',
  get_aianalyst_incidentevents: 'List AI Analyst incident events.',
  get_aianalyst_incidents: 'Deprecated legacy incident endpoint.',
  get_aianalyst_investigations: 'List manual AI Analyst investigations.',
  post_aianalyst_investigations: 'Start a manual AI Analyst investigation.',
  get_aianalyst_stats: 'AI Analyst statistics.',
  get_aianalyst_incident_comments: 'Comments on an AI Analyst incident event.',
  post_aianalyst_incident_comments: 'Add a comment to an AI Analyst incident event.',
  post_aianalyst_acknowledge: 'Acknowledge AI Analyst incident events.',
  post_aianalyst_unacknowledge: 'Unacknowledge AI Analyst incident events.',
  post_aianalyst_pin: 'Pin AI Analyst incident events.',
  post_aianalyst_unpin: 'Unpin AI Analyst incident events.',
  get_antigena: 'List Autonomous Response (Antigena) actions.',
  get_antigena_summary: 'Summary of active and pending response actions.',
  post_antigena: 'Activate, extend, clear or reactivate a response action.',
  post_antigena_manual: 'Create a manual response action (for example, block a connection).',
  get_tags: 'List tags.',
  get_tags_tid: 'One tag by `tid`.',
  post_tags: 'Create a tag.',
  delete_tags_tid: 'Delete a tag.',
  get_tags_entities: 'Tags on a device, or devices with a tag.',
  get_tags_tid_entities: 'Devices with one tag.',
  post_tags_entities: 'Add a tag to a device.',
  post_tags_tid_entities: 'Add a tag to a device by tag ID.',
  delete_tags_entities: 'Remove a tag from a device.',
  delete_tags_tid_entities_teid: 'Remove one tag assignment.',
  get_intelfeed: 'Read Watched Domains (intel feed).',
  post_intelfeed: 'Add or remove Watched Domains entries.',
  get_subnets: 'List subnets.',
  post_subnets: 'Change subnet settings.',
  get_pcaps: 'List packet captures.',
  post_pcaps: 'Request a new packet capture.',
  get_pcaps_filename: 'Download a packet capture file.',
  get_advancedsearch_api_search_query: 'Advanced Search query (GET form).',
  post_advancedsearch_api_search: 'Advanced Search query (POST form).',
  get_advancedsearch_api_analyze_field_analysis_query: 'Advanced Search field analysis.',
  get_advancedsearch_api_graph_graphmode_interval_query: 'Advanced Search graph data.',
  get_agemail_api_ep_api_v1_0_dash_action_summary: 'Email dashboard: action summary.',
  get_agemail_api_ep_api_v1_0_dash_dash_stats: 'Email dashboard: statistics.',
  get_agemail_api_ep_api_v1_0_dash_data_loss: 'Email dashboard: data loss.',
  get_agemail_api_ep_api_v1_0_dash_user_anomaly: 'Email dashboard: user anomaly.',
  get_agemail_api_ep_api_v1_0_emails_uuid: 'One email, including content metadata.',
  get_agemail_api_ep_api_v1_0_emails_uuid_download: 'Download a raw email.',
  post_agemail_api_ep_api_v1_0_emails_search: 'Search emails.',
  post_agemail_api_ep_api_v1_0_emails_uuid_action: 'Act on an email (for example, hold or release).',
  get_agemail_api_ep_api_v1_0_admin_decode_link: 'Decode a rewritten email link.',
  get_agemail_api_ep_api_v1_0_resources_actions: 'Email reference data: actions.',
  get_agemail_api_ep_api_v1_0_resources_filters: 'Email reference data: filters.',
  get_agemail_api_ep_api_v1_0_resources_tags: 'Email reference data: tags.',
  get_agemail_api_ep_api_v1_0_system_audit_eventTypes: 'Email reference data: audit event types.',
  get_agemail_api_ep_api_v1_0_system_audit_events: 'Email audit events.',
};

const AREAS = [
  ['System and reference data', /status|summary_statistics|reference_data|cves|network_stats/],
  ['Devices', /device|connection_details|endpoint_details|metric_data/],
  ['Model breaches', /model_breach/],
  ['Models and metrics', /models|metrics|components/],
  ['AI Analyst', /ai_analyst/],
  ['Autonomous Response (Antigena)', /antigena/],
  ['Tags', /tag/],
  ['Intel feed and subnets', /intel_feed|subnet/],
  ['Packet captures', /pcap/],
  ['Advanced Search', /advanced_search/],
  ['Darktrace/Email', /email/],
];
// Match specific areas first so, for example, email reference data is not filed under System.
const MATCH_ORDER = ['Darktrace/Email', 'Advanced Search', 'Packet captures', 'Model breaches', 'AI Analyst',
  'Autonomous Response (Antigena)', 'Tags', 'Intel feed and subnets', 'Devices', 'Models and metrics', 'System and reference data'];
const areaOf = tool => MATCH_ORDER.find(name => AREAS.find(([a]) => a === name)[1].test(tool)) ?? 'Other';

const RANK = { read: 0, sensitive: 1, write: 2, critical: 3 };
// Every Advanced Search form can return raw network records, so the whole tool needs `sensitive`.
const SENSITIVE_TOOLS = new Set(['darktrace_advanced_search']);
export function profileOf(op) {
  const req = op.requiredProfiles ?? [];
  let p = op.tier === 'critical' ? 'critical'
    : op.tier === 'medium' || op.tier === 'high' ? 'write'
    : op.sensitivity === 'high' || SENSITIVE_TOOLS.has(op.tool) ? 'sensitive' : 'read';
  const declared = req.includes('critical') || req.includes('writeCritical') ? 'critical'
    : req.includes('write') ? 'write'
    : req.includes('sensitive') || req.includes('sensitiveRead') ? 'sensitive' : 'read';
  if (RANK[declared] > RANK[p]) p = declared;
  return p;
}
const validated = op => LAB_VALIDATED.has(op.operationId) || (op.validatedOn ?? []).length > 0;

export function render() {
  const ops = catalogue.operations.map(op => ({ ...op, tool: toolGroups[op.operationId] ?? op.tool ?? null }));
  const available = ops.filter(op => op.tool && op.status !== 'excluded');
  const excluded = ops.filter(op => !op.tool || op.status === 'excluded');
  const byTool = new Map();
  for (const op of available) { if (!byTool.has(op.tool)) byTool.set(op.tool, []); byTool.get(op.tool).push(op); }
  const counts = { read: 0, sensitive: 0, write: 0, critical: 0 };
  for (const op of available) counts[profileOf(op)]++;
  const nValidated = available.filter(validated).length;

  const out = [];
  out.push('# Tool reference', '');
  out.push('[README](../README.md) · [Configuration](configuration.md) · [Getting started](getting-started.md)', '');
  out.push('> Generated by `npm run docs:tools` from `src/api/catalogue.generated.json` and `src/api/tool-groups.json`. Do not edit by hand. English only.', '');
  out.push(`**${byTool.size} tools** cover **${available.length} of ${ops.length} API operations** (Darktrace Threat Visualizer API ${catalogue.specVersion ?? '6.1'}).`);
  out.push(`${nValidated} operations passed real queries on a Darktrace 7.1.0 lab. The rest are marked *not lab-validated*: they follow the API documentation but were not tried against a real appliance.`, '');
  out.push('## Which profile do I need?', '');
  out.push('| Profile | What it unlocks | Operations |', '|---|---|---:|');
  out.push(`| \`read\` (default) | Normal reads | ${counts.read} |`);
  out.push(`| \`sensitive\` | Reads that can return raw traffic, email content or audit data | ${counts.sensitive} |`);
  out.push(`| \`write\` | Reversible or configuration changes. Supports \`dryRun:true\` | ${counts.write} |`);
  out.push(`| \`critical\` | Actions that can block traffic, act on email or change detection. Needs \`confirm:true\` | ${counts.critical} |`, '');
  out.push('Set profiles with `DARKTRACE_PROFILES`. See [Configuration](configuration.md#profiles).', '');
  out.push('Columns: **Tier** is the risk class from the API inventory. **Lab** shows whether the operation passed a real-appliance test.', '');

  const areas = new Map();
  for (const tool of [...byTool.keys()].sort()) {
    const area = areaOf(tool);
    if (!areas.has(area)) areas.set(area, []);
    areas.get(area).push(tool);
  }
  const order = [...AREAS.map(([a]) => a), 'Other'];
  out.push('## Contents', '');
  for (const area of order) if (areas.has(area)) out.push(`- [${area}](#${area.toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/ /g, '-')})`);
  out.push('- [Not available](#not-available)', '');

  for (const area of order) {
    if (!areas.has(area)) continue;
    out.push(`## ${area}`, '');
    out.push('| Tool | Method and path | Tier | Profile | Lab | What it does |', '|---|---|---|---|---|---|');
    for (const tool of areas.get(area)) {
      const list = byTool.get(tool).sort((a, b) => a.pathTemplate.localeCompare(b.pathTemplate) || a.method.localeCompare(b.method));
      for (const op of list) {
        const desc = DESCRIPTIONS[op.operationId] ?? `${op.method} ${op.pathTemplate}`;
        out.push(`| \`${tool}\` | \`${op.method} ${op.pathTemplate}\` | ${op.tier} | \`${profileOf(op)}\` | ${validated(op) ? 'yes' : 'not lab-validated'} | ${desc} |`);
      }
    }
    out.push('');
  }
  out.push('## Not available', '');
  out.push('| Method and path | Reason |', '|---|---|');
  for (const op of excluded) out.push(`| \`${op.method} ${op.pathTemplate}\` | ${op.operationId === 'get_aianalyst_incidents' ? 'Deprecated by Darktrace. Use `darktrace_list_ai_analyst_incidents`.' : 'Not exposed.'} |`);
  out.push('');
  return out.join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const text = render();
  if (process.argv.includes('--check')) {
    let current = '';
    try { current = readFileSync(target, 'utf8'); } catch { /* missing counts as stale */ }
    if (current !== text) { console.error('docs/tools.md is stale: run npm run docs:tools'); process.exit(1); }
    console.log('docs/tools.md is up to date');
  } else {
    writeFileSync(target, text);
    console.log('wrote docs/tools.md');
  }
}
