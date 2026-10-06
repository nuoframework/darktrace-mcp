#!/usr/bin/env node
// Builds bilingual tool references from the catalogue, groups and code-owned summaries.
// Usage: node scripts/generate-tools-doc.mjs [--lang es|en] [--check]
// Default: Spanish at docs/tools.md; English: docs/en/tools.md. Offline only.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = new URL('../', import.meta.url);
const read = path => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const catalogue = read('src/api/catalogue.generated.json');
const toolGroups = read('src/api/tool-groups.json');
// Read string literals through the TypeScript parser; never execute source text.
const descriptionSource = ts.createSourceFile('descriptions.ts', readFileSync(new URL('src/tools/descriptions.ts', root), 'utf8'), ts.ScriptTarget.Latest, true);
const summaries = new Map();
function collectSummaries(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(descriptionSource) === 'TOOL_SUMMARIES') {
    const object = node.initializer?.arguments?.[0];
    if (!object || !ts.isObjectLiteralExpression(object)) throw new Error('Expected literal TOOL_SUMMARIES');
    for (const entry of object.properties) {
      if (!ts.isPropertyAssignment(entry) || !ts.isStringLiteral(entry.initializer)) throw new Error('Expected literal tool summary');
      summaries.set(entry.name.getText(descriptionSource).replace(/^['"]|['"]$/g, ''), entry.initializer.text);
    }
  }
  ts.forEachChild(node, collectSummaries);
}
collectSummaries(descriptionSource);

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

export function render(lang = 'es') {
  if (!['es', 'en'].includes(lang)) throw new Error('Language must be es or en');
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
  out.push('Reference of operations, profiles and the precise scope of lab evidence.', '');
  out.push('[README](../README.md) · [Configuration](configuration.md) · [Getting started](getting-started.md)', '');
  out.push(lang === 'es' ? '**Español** · [English](en/tools.md)' : '[Español](../tools.md) · **English**', '');
  out.push('# Tool reference', '');
  out.push('> Built by `npm run docs:tools` from the API catalogue, tool groups and `src/tools/descriptions.ts`. Do not edit by hand. Tool summaries and operation descriptions remain in English; summaries reproduce the code-owned text seen by the client (dynamic policy notes are added at runtime).', '');
  out.push(`**${byTool.size} tools** cover **${available.length} executable operations** out of the ${ops.length} in the API inventory (Darktrace Threat Visualizer API ${catalogue.specVersion ?? '6.1'}). The other ${excluded.length} are [not available](#not-available): ${excluded.length - deprecated} excluded (the email action) and ${deprecated} deprecated (\`GET /aianalyst/incidents\`).`, '');
  out.push(`**Lab evidence.** ${nValidated} operations have evidence from two Darktrace 7.1.0 lab appliances (2026-10-06). For ${nPartial} of them the evidence is partial, and the **Lab** column says what was covered. The rest are marked *not lab-validated*: they follow the API documentation but did not pass against a real appliance. This includes all ${nEmail} Darktrace/Email reads (the lab token got HTTP 403). Some write evidence predates the final write controls (approval, rate limits, breaker, audit chain), which are covered by offline tests. The [gap campaign](security/lab-gap-campaign-1.1.1.md) re-ran the critical flows (Antigena, manual Antigena, intel feed, subnets, tag deletion) and the device, investigation, PCAP and tag writes under those controls.`, '');
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
    for (const tool of areas.get(area)) {
      if (!summaries.has(tool)) throw new Error(`Missing summary: ${tool}`);
      out.push(`- **\`${tool}\`**: ${summaries.get(tool)}`);
    }
    out.push('');
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
  let result = out.join('\n');
  if (lang === 'en') return result.replace('[README](../README.md)', '[README](../../README.en.md)').replaceAll('](security/', '](../security/');
  return spanish(result, nPartial, nEmail);

}

function spanish(text, partial, email) {
  const labels = {
    'System and reference data': 'Sistema y referencias', 'Devices': 'Dispositivos',
    'Model breaches': 'Model breaches', 'Models and metrics': 'Modelos y métricas',
    'AI Analyst': 'AI Analyst', 'Autonomous Response (Antigena)': 'Respuesta autónoma (Antigena)',
    'Tags': 'Etiquetas', 'Intel feed and subnets': 'Intel feed y subredes',
    'Packet captures': 'Capturas de paquetes', 'Advanced Search': 'Advanced Search',
    'Darktrace/Email': 'Darktrace/Email', 'Other': 'Otros',
  };
  const slug = label => label.toLowerCase().replace(/[^\p{L}\p{N} -]/gu, '').replaceAll(' ', '-');
  for (const [en, es] of Object.entries(labels)) {
    text = text.replace(`## ${en}\n`, `## ${es}\n`)
      .replace(`- [${en}](#${slug(en)})`, `- [${es}](#${slug(es)})`);
  }
  const replacements = [
    ['Reference of operations, profiles and the precise scope of lab evidence.', 'Referencia de operaciones, perfiles y alcance exacto de la evidencia de laboratorio.'],
    ['[Configuration]', '[Configuración]'], ['[Getting started]', '[Primeros pasos]'],
    ['# Tool reference', '# Referencia de herramientas'],
    ['> Built by `npm run docs:tools` from the API catalogue, tool groups and `src/tools/descriptions.ts`. Do not edit by hand. Tool summaries and operation descriptions remain in English; summaries reproduce the code-owned text seen by the client (dynamic policy notes are added at runtime).', '> Se genera con `npm run docs:tools` a partir del catálogo API, los grupos y `src/tools/descriptions.ts`. No edites esta página a mano. Los resúmenes y las descripciones de operaciones se conservan en inglés; los resúmenes reproducen el texto del código que ve el cliente (las notas dinámicas de política se añaden en ejecución).'],
    ['## Which profile do I need?', '## Qué perfil necesitas'],
    ['| Profile | What it unlocks | Operations |', '| Perfil | Qué permite | Operaciones |'],
    ['(default) | Normal reads', '(predeterminado) | Lecturas habituales'],
    ['Reads that can return raw traffic, email content or audit data', 'Lecturas que pueden devolver tráfico sin procesar, contenido de correo o auditoría'],
    ['Reversible or configuration changes. `dryRun:true` returns a preview', 'Cambios reversibles o de configuración. `dryRun:true` devuelve una vista previa'],
    ['Actions that can block traffic or change detection. Call with `dryRun:true` for a preview, then repeat with `confirm:true` and its `previewId`; by default you also accept a server dialog. Without `confirm:true` the call is refused (`confirmation_required`)', 'Acciones que pueden bloquear tráfico o cambiar la detección. Usa `dryRun:true` para obtener una vista previa; repite con `confirm:true` y su `previewId`. Por defecto, también debes aceptar un diálogo del servidor. Sin `confirm:true`, se rechaza la llamada (`confirmation_required`)'],
    ['Set profiles with `DARKTRACE_PROFILES`. `all`, or any list with both `sensitive` and `write`, starts only with `DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE=true`. See [Configuración](configuration.md#profiles).', 'Selecciona los perfiles con `DARKTRACE_PROFILES`. `all`, o una lista con `sensitive` y `write`, solo arranca con `DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE=true`. Consulta [Configuración](configuration.md#perfiles).'],
    ['Columns: **Tier** is the risk class from the API inventory. **Lab** shows whether, and how far, the operation passed a real-appliance test.', 'Columnas: **Riesgo** es la categoría del inventario API. **Laboratorio** indica si la operación pasó una prueba con un appliance real y hasta dónde llegó la validación.'],
    ['## Contents', '## Índice'], ['[Not available](#not-available)', '[No disponibles](#no-disponibles)'],
    ['## Not available', '## No disponibles'],
    ['| Tool | Method and path | Tier | Profile | Lab | What it does |', '| Herramienta | Método y ruta | Riesgo | Perfil | Laboratorio | Qué hace |'],
    ['| Method and path | Reason |', '| Método y ruta | Motivo |'],
    ['| yes |', '| sí |'], ['not lab-validated', 'sin validar en laboratorio'],
    [RESPONSEDATA_ONLY, 'parcial: pasa con `responsedata`; el listado completo devuelve `response_limit_exceeded`'],
    [LAB_PARTIAL.post_antigena_manual, 'parcial: solo se ejecutaron bloqueos manuales `connection`; `pol`, `gpol` y `quarantineOutgoing` devolvieron HTTP 400 en un dispositivo sensor cliente; no se ejecutaron `quarantine` ni `quarantineIncoming`'],
    [LAB_PARTIAL.post_subnets, 'parcial: solo se ejecutaron cambios de `label` y `uniqueHostnames`'],
    [LAB_PARTIAL.post_intelfeed, 'parcial: se ejecutaron `addentry`, `addlist`, `expiry` (caducó a tiempo) y `removeentry`; se aceptó `hostname:true` sin lectura posterior; no se ejecutaron `iagn` ni `removeall`'],
    [DELETE_502, 'se aplicó (lectura posterior confirmada), pero el gateway devuelve HTTP 502; se informa `write_outcome_unknown`'],
    [LAB_NOT_VALIDATED_NOTE.get_cves, 'el appliance devuelve HTTP 500 (solo Darktrace/OT)'],
    [LAB_NOT_VALIDATED_NOTE.get_filtertypes, 'el appliance redirige (HTTP 302); nunca se siguen redirecciones'],
    ['Deprecated by Darktrace. Use', 'Obsoleta en Darktrace. Usa'],
    ['Excluded from this release: `darktrace_email_action` is not registered in any profile. Signing and request schema are unvalidated and the lab token got HTTP 403. Re-enabling it needs a reviewed schema, a signing proof with an email-licensed token and a new design review.', 'Excluida de esta versión: `darktrace_email_action` no se registra en ningún perfil. La firma y el esquema de esta acción no están validados; el token de laboratorio recibió HTTP 403. Habilitarla requiere un esquema revisado, una prueba de firma con un token con licencia Email y una nueva revisión del diseño.'],
  ];
  for (const [en, es] of replacements) text = text.replaceAll(en, es);
  text = text.replace(/\*\*(\d+) tools\*\* cover \*\*(\d+) executable operations\*\* out of the (\d+) in the API inventory \(Darktrace Threat Visualizer API ([^)]+)\)\. The other (\d+) are \[not available\]\(#not-available\): (\d+) excluded \(the email action\) and (\d+) deprecated \(`GET \/aianalyst\/incidents`\)\./,
    '**$1 herramientas** cubren **$2 operaciones ejecutables** de las $3 del inventario API (Darktrace Threat Visualizer API $4). Las otras $5 [no están disponibles](#no-disponibles): $6 excluida (la acción de correo) y $7 obsoleta (`GET /aianalyst/incidents`).');
  text = text.replace(/\*\*Lab evidence\.\*\* (\d+) operations have evidence[\s\S]*?(?=\n\n)/,
    (_, count) => `**Evidencia de laboratorio.** ${count} operaciones tienen evidencia de dos appliances de laboratorio Darktrace 7.1.0 (2026-10-06). En ${partial} de ellas la evidencia es parcial; la columna **Laboratorio** indica qué se cubrió. El resto figura como *sin validar en laboratorio*: sigue la documentación API, pero no superó la prueba con un appliance real. Esto incluye las ${email} lecturas Darktrace/Email (HTTP 403). Parte de la evidencia de escritura es anterior a los controles finales de aprobación, límites, bloqueo y auditoría, cubiertos por pruebas offline. La [campaña de cobertura](security/lab-gap-campaign-1.1.1.md) repitió los flujos críticos (Antigena, Antigena manual, intel feed, subredes y borrado de etiquetas) y las escrituras de dispositivos, investigaciones, PCAP y etiquetas con esos controles.`);
  return text;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  let lang = 'es';
  let check = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--check') check = true;
    else if (args[i] === '--lang' && ['es', 'en'].includes(args[i + 1])) lang = args[++i];
    else throw new Error('Usage: generate-tools-doc.mjs [--lang es|en] [--check]');
  }
  const path = lang === 'es' ? 'docs/tools.md' : 'docs/en/tools.md';
  const target = new URL(path, root);
  const text = render(lang);
  if (check) {
    let current = '';
    try { current = readFileSync(target, 'utf8'); } catch { /* missing counts as stale */ }
    if (current !== text) { console.error(`${path} is stale: run npm run docs:tools`); process.exit(1); }
    console.log(`${path} is up to date`);
  } else {
    mkdirSync(new URL('.', target), { recursive: true });
    writeFileSync(target, text);
    console.log(`wrote ${path}`);
  }
}
