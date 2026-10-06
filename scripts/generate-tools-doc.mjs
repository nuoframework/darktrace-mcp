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

// Lab evidence comes only from the catalogue's `validatedOn` (Darktrace 7.1.0 lab, 2026-10-06).
// `validatedOn` has no per-action scope (DR-W-12, still open), so the operations below are listed with
// the scope the lab actually covered, as recorded in docs/CHANGES-core.md §6, the 1.1.0 final gate
// review (docs/security/final-gate-review-1.1.0.md §3.1) and the gap campaign
// (docs/security/lab-gap-campaign-1.1.1.md). Keep this list in sync with those records.
const RESPONSEDATA_ONLY = 'partial: passes with `responsedata`; the full list returns `response_limit_exceeded`';
const LAB_PARTIAL = {
  post_antigena_manual: 'partial: only manual `connection` blocks ran live; `pol`, `gpol` and `quarantineOutgoing` got HTTP 400 on a client-sensor device; `quarantine` and `quarantineIncoming` were not run',
  post_subnets: 'partial: only `label` and `uniqueHostnames` changes ran live',
  post_intelfeed: 'partial: `addentry`, `addlist`, `expiry` (entry expired on time) and `removeentry` ran live; `hostname:true` was accepted but not read back; `iagn` and `removeall` were not run',
  get_models: RESPONSEDATA_ONLY,
  get_components: RESPONSEDATA_ONLY,
  get_enums: RESPONSEDATA_ONLY,
};
// Operations that ran live but do not count as validated (no clean 2xx). The cell keeps "not lab-validated".
const DELETE_502 = 'applied live (read-back confirms) but the lab gateway answers HTTP 502, reported as `write_outcome_unknown`';
const LAB_NOT_VALIDATED_NOTE = {
  delete_tags_tid: DELETE_502,
  delete_tags_tid_entities_teid: DELETE_502,
  delete_tags_entities: DELETE_502,
  get_cves: 'the lab appliance answers HTTP 500 (Darktrace/OT only)',
  get_filtertypes: 'the lab appliance answers with a redirect (HTTP 302), which is never followed',
};
// Why an operation is not callable in this release.
const NOT_AVAILABLE_REASON = {
  get_aianalyst_incidents: 'Deprecated by Darktrace. Use `darktrace_list_ai_analyst_incidents`.',
  post_agemail_api_ep_api_v1_0_emails_uuid_action: 'Excluded from this release: `darktrace_email_action` is not registered in any profile. Signing and request schema are unvalidated and the lab token got HTTP 403. Re-enabling it needs a reviewed schema, a signing proof with an email-licensed token and a new design review.',
};

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
  get_pcaps_filename: 'Download a packet capture as Base64, whole or not at all: captures above about 45 KB are refused with `output_limit_exceeded` (size and SHA-256 only).',
  get_advancedsearch_api_search_query: 'Advanced Search query (GET form).',
  post_advancedsearch_api_search: 'Advanced Search query (POST form).',
  get_advancedsearch_api_analyze_field_analysis_query: 'Advanced Search field analysis.',
  get_advancedsearch_api_graph_graphmode_interval_query: 'Advanced Search graph data.',
  get_agemail_api_ep_api_v1_0_dash_action_summary: 'Email dashboard: action summary.',
  get_agemail_api_ep_api_v1_0_dash_dash_stats: 'Email dashboard: statistics.',
  get_agemail_api_ep_api_v1_0_dash_data_loss: 'Email dashboard: data loss.',
  get_agemail_api_ep_api_v1_0_dash_user_anomaly: 'Email dashboard: user anomaly.',
  get_agemail_api_ep_api_v1_0_emails_uuid: 'One email, including content metadata.',
  get_agemail_api_ep_api_v1_0_emails_uuid_download: 'Size and SHA-256 of a raw email (the content is not returned).',
  post_agemail_api_ep_api_v1_0_emails_search: 'Search emails.',
  // The email action is excluded from this release; it appears only under "Not available".
  post_agemail_api_ep_api_v1_0_emails_uuid_action: 'Act on an email (excluded from this release).',
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
const validated = op => (op.validatedOn ?? []).length > 0;
const labCell = op => !validated(op)
  ? (LAB_NOT_VALIDATED_NOTE[op.operationId] ? `not lab-validated: ${LAB_NOT_VALIDATED_NOTE[op.operationId]}` : 'not lab-validated')
  : LAB_PARTIAL[op.operationId] ?? 'yes';

export function render() {
  const ops = catalogue.operations.map(op => ({ ...op, tool: toolGroups[op.operationId] ?? op.tool ?? null }));
  // Only `implemented` operations are callable; `blocked` (the email action) and `excluded` are not.
  const available = ops.filter(op => op.tool && op.status === 'implemented');
  const excluded = ops.filter(op => !available.includes(op));
  const byTool = new Map();
  for (const op of available) { if (!byTool.has(op.tool)) byTool.set(op.tool, []); byTool.get(op.tool).push(op); }
  const counts = { read: 0, sensitive: 0, write: 0, critical: 0 };
  for (const op of available) counts[profileOf(op)]++;
  const nValidated = available.filter(validated).length;
  const nPartial = available.filter(op => validated(op) && LAB_PARTIAL[op.operationId]).length;
  const nEmail = available.filter(op => op.pathTemplate.startsWith('/agemail/')).length;
  const deprecated = excluded.filter(op => op.status === 'excluded').length;

  const out = [];
  out.push('# Tool reference', '');
  out.push('[README](../README.md) · [Configuration](configuration.md) · [Getting started](getting-started.md)', '');
  out.push('> Generated by `npm run docs:tools` from `src/api/catalogue.generated.json` and `src/api/tool-groups.json`. Do not edit by hand. English only.', '');
  out.push(`**${byTool.size} tools** cover **${available.length} executable operations** out of the ${ops.length} in the API inventory (Darktrace Threat Visualizer API ${catalogue.specVersion ?? '6.1'}). The other ${excluded.length} are [not available](#not-available): ${excluded.length - deprecated} excluded (the email action) and ${deprecated} deprecated (\`GET /aianalyst/incidents\`).`, '');
  out.push(`**Lab evidence.** ${nValidated} operations have evidence from one Darktrace 7.1.0 lab appliance (2026-10-06). For ${nPartial} of them the evidence is partial, and the **Lab** column says what was covered. The rest are marked *not lab-validated*: they follow the API documentation but did not pass against a real appliance. This includes all ${nEmail} Darktrace/Email reads (the lab token got HTTP 403). Some write evidence predates the final write controls (approval, rate limits, breaker, audit chain), which are covered by offline tests. The [gap campaign](security/lab-gap-campaign-1.1.1.md) re-ran the critical flows (Antigena, manual Antigena, intel feed, subnets, tag deletion) and the device, investigation, PCAP and tag writes under those controls.`, '');
  out.push('## Which profile do I need?', '');
  out.push('| Profile | What it unlocks | Operations |', '|---|---|---:|');
  out.push(`| \`read\` (default) | Normal reads | ${counts.read} |`);
  out.push(`| \`sensitive\` | Reads that can return raw traffic, email content or audit data | ${counts.sensitive} |`);
  out.push(`| \`write\` | Reversible or configuration changes. \`dryRun:true\` returns a preview | ${counts.write} |`);
  out.push(`| \`critical\` | Actions that can block traffic or change detection. Call with \`dryRun:true\` for a preview, then repeat with \`confirm:true\` and its \`previewId\`; by default you also accept a server dialog. Without \`confirm:true\` the call is refused (\`confirmation_required\`) | ${counts.critical} |`, '');
  out.push('Set profiles with `DARKTRACE_PROFILES`. `all`, or any list with both `sensitive` and `write`, starts only with `DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE=true`. See [Configuration](configuration.md#profiles).', '');
  out.push('Columns: **Tier** is the risk class from the API inventory. **Lab** shows whether, and how far, the operation passed a real-appliance test.', '');

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
        out.push(`| \`${tool}\` | \`${op.method} ${op.pathTemplate}\` | ${op.tier} | \`${profileOf(op)}\` | ${labCell(op)} | ${desc} |`);
      }
    }
    out.push('');
  }
  out.push('## Not available', '');
  out.push('| Method and path | Reason |', '|---|---|');
  for (const op of excluded) out.push(`| \`${op.method} ${op.pathTemplate}\` | ${NOT_AVAILABLE_REASON[op.operationId] ?? 'Not exposed.'} |`);
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
