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

// One plain-language line per operation. Missing translations fail generation.
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
const DESCRIPTIONS_ES = {
  "get_status": "Estado del sistema y versión del appliance.",
  "get_summarystatistics": "Número de dispositivos, ancho de banda y acciones de respuesta activas.",
  "get_enums": "Valores de texto para códigos numéricos de las respuestas API.",
  "get_filtertypes": "Filtros disponibles en el editor de modelos.",
  "get_cves": "CVE de dispositivos OT (solo Darktrace/OT).",
  "get_devices": "Lista dispositivos o consulta uno por `did`.",
  "post_devices": "Cambia la etiqueta, prioridad o tipo de un dispositivo.",
  "get_devicesearch": "Busca dispositivos con filtros.",
  "get_devicesummary": "Contexto de un dispositivo obtenido de varias fuentes.",
  "get_deviceinfo": "Datos de conexión de un dispositivo.",
  "get_similardevices": "Dispositivos con comportamiento similar al indicado.",
  "get_details": "Conexiones y eventos de un dispositivo o entidad, ordenados por tiempo.",
  "get_endpointdetails": "Ubicación y conexiones de una IP o nombre de host externo.",
  "get_network": "Conectividad entre dispositivos o subredes.",
  "get_metricdata": "Serie temporal de métricas de un dispositivo.",
  "get_modelbreaches": "Lista model breaches (alertas).",
  "get_modelbreaches_pbid": "Consulta una alerta por `pbid`.",
  "get_mbcomments": "Comentarios de las alertas.",
  "get_modelbreaches_pbid_comments": "Comentarios de una alerta.",
  "post_modelbreaches_pbid_comments": "Añade un comentario a una alerta.",
  "post_modelbreaches_pbid_acknowledge": "Reconoce una alerta.",
  "post_modelbreaches_pbid_unacknowledge": "Retira el reconocimiento de una alerta.",
  "get_models": "Lista modelos.",
  "get_models_pid": "Consulta un modelo por `pid`.",
  "get_components": "Lista componentes de modelos.",
  "get_components_cid": "Consulta un componente por `cid`.",
  "get_metrics": "Lista las métricas disponibles.",
  "get_metrics_mlid": "Consulta una métrica por `mlid`.",
  "get_aianalyst_groups": "Lista incidentes (grupos) de AI Analyst.",
  "get_aianalyst_incidentevents": "Lista eventos de incidentes de AI Analyst.",
  "get_aianalyst_incidents": "Ruta antigua de incidentes, obsoleta.",
  "get_aianalyst_investigations": "Lista investigaciones manuales de AI Analyst.",
  "post_aianalyst_investigations": "Inicia una investigación manual de AI Analyst.",
  "get_aianalyst_stats": "Estadísticas de AI Analyst.",
  "get_aianalyst_incident_comments": "Comentarios de un evento de incidente AI Analyst.",
  "post_aianalyst_incident_comments": "Añade un comentario a un evento de incidente AI Analyst.",
  "post_aianalyst_acknowledge": "Reconoce eventos de incidentes AI Analyst.",
  "post_aianalyst_unacknowledge": "Retira el reconocimiento de eventos de incidentes AI Analyst.",
  "post_aianalyst_pin": "Fija eventos de incidentes AI Analyst.",
  "post_aianalyst_unpin": "Desfija eventos de incidentes AI Analyst.",
  "get_antigena": "Lista acciones de respuesta autónoma (Antigena).",
  "get_antigena_summary": "Resumen de acciones de respuesta activas y pendientes.",
  "post_antigena": "Activa, amplía, anula o reactiva una acción de respuesta.",
  "post_antigena_manual": "Crea una acción de respuesta manual, por ejemplo bloquear una conexión.",
  "get_tags": "Lista etiquetas.",
  "get_tags_tid": "Consulta una etiqueta por `tid`.",
  "post_tags": "Crea una etiqueta.",
  "delete_tags_tid": "Borra una etiqueta.",
  "get_tags_entities": "Etiquetas de un dispositivo o dispositivos con una etiqueta.",
  "get_tags_tid_entities": "Dispositivos con una etiqueta concreta.",
  "post_tags_entities": "Asigna una etiqueta a un dispositivo.",
  "post_tags_tid_entities": "Asigna una etiqueta a un dispositivo mediante el ID de etiqueta.",
  "delete_tags_entities": "Retira una etiqueta de un dispositivo.",
  "delete_tags_tid_entities_teid": "Retira una asignación de etiqueta.",
  "get_intelfeed": "Consulta Watched Domains (intel feed).",
  "post_intelfeed": "Añade o retira entradas de Watched Domains.",
  "get_subnets": "Lista subredes.",
  "post_subnets": "Cambia ajustes de una subred.",
  "get_pcaps": "Lista capturas de paquetes.",
  "post_pcaps": "Solicita una captura de paquetes nueva.",
  "get_pcaps_filename": "Descarga una captura en Base64, completa o sin contenido: por encima de unos 45 KB se rechaza con `output_limit_exceeded` (solo tamaño y SHA-256).",
  "get_advancedsearch_api_search_query": "Consulta Advanced Search mediante GET.",
  "post_advancedsearch_api_search": "Consulta Advanced Search mediante POST.",
  "get_advancedsearch_api_analyze_field_analysis_query": "Análisis de campos de Advanced Search.",
  "get_advancedsearch_api_graph_graphmode_interval_query": "Datos de gráficos de Advanced Search.",
  "get_agemail_api_ep_api_v1_0_dash_action_summary": "Panel Email: resumen de acciones.",
  "get_agemail_api_ep_api_v1_0_dash_dash_stats": "Panel Email: estadísticas.",
  "get_agemail_api_ep_api_v1_0_dash_data_loss": "Panel Email: pérdida de datos.",
  "get_agemail_api_ep_api_v1_0_dash_user_anomaly": "Panel Email: anomalías de usuario.",
  "get_agemail_api_ep_api_v1_0_emails_uuid": "Consulta un correo, incluidos sus metadatos de contenido.",
  "get_agemail_api_ep_api_v1_0_emails_uuid_download": "Tamaño y SHA-256 de un correo sin procesar; no devuelve contenido.",
  "post_agemail_api_ep_api_v1_0_emails_search": "Busca correos.",
  "post_agemail_api_ep_api_v1_0_emails_uuid_action": "Actúa sobre un correo (excluida de esta versión).",
  "get_agemail_api_ep_api_v1_0_admin_decode_link": "Decodifica un enlace de correo reescrito.",
  "get_agemail_api_ep_api_v1_0_resources_actions": "Datos de referencia Email: acciones.",
  "get_agemail_api_ep_api_v1_0_resources_filters": "Datos de referencia Email: filtros.",
  "get_agemail_api_ep_api_v1_0_resources_tags": "Datos de referencia Email: etiquetas.",
  "get_agemail_api_ep_api_v1_0_system_audit_eventTypes": "Datos de referencia Email: tipos de evento de auditoría.",
  "get_agemail_api_ep_api_v1_0_system_audit_events": "Eventos de auditoría Email."
};

// Both languages render from the same keys and evidence metadata. No text replacement or fallback.
const LAB_SCOPE = Object.freeze({ appliances: 2, version: '7.1.0', date: '2026-10-06', first: '1.1.0', gap: '1.1.1' });
const MESSAGES = {
  en: {
    title: 'Tool reference', lead: 'Reference of operations, profiles and the precise scope of lab evidence.',
    nav: '[README](../../README.en.md) · [Configuration](configuration.md) · [Getting started](getting-started.md)',
    generated: '> Built by `npm run docs:tools` from the API catalogue, tool groups and `src/tools/descriptions.ts`. Do not edit by hand. MCP summaries below reproduce the English text seen by the client; dynamic policy notes are added at runtime. Operation descriptions are localized for readers.',
    inventory: ({tools, available, total, spec, excluded, deprecated}) => `**${tools} tools** cover **${available} executable operations** out of ${total} in the API inventory (Darktrace Threat Visualizer API ${spec}). The other ${excluded} are [not available](#not-available): ${excluded - deprecated} excluded (the email action) and ${deprecated} deprecated (\`GET /aianalyst/incidents\`).`,
    evidence: ({validated, partial, email}, scope) => `**Lab evidence.** ${validated} operations have evidence from ${scope.appliances} distinct Darktrace ${scope.version} appliances (${scope.date}): lab A for ${scope.first}, lab B for the ${scope.gap} gap campaign. ${partial} operations have partial evidence; the **Lab** column states its scope. The rest are *not lab-validated*: they follow API documentation but did not pass against a live appliance, including all ${email} Email reads (HTTP 403; a later service outage returned 503, see the [Email record](../security/lab-email-validation.md)). Some write evidence predates the final approval, rate-limit, breaker and audit controls, which have offline coverage. The [gap campaign](../security/lab-gap-campaign-${scope.gap}.md) re-ran critical flows (Antigena, manual Antigena, intel feed, subnets, tag deletion) and device, investigation, PCAP and tag writes under those controls.`,
    profiles: 'Which profile do I need?', profileTable: '| Profile | What it unlocks | Operations |',
    default: 'default', read: 'Normal reads', sensitive: 'Reads that can return raw traffic, email content or audit data',
    write: 'Reversible or configuration changes. `dryRun:true` returns a preview',
    critical: 'Actions that can block traffic or change detection. Call with `dryRun:true` for a preview, then repeat with `confirm:true` and its `previewId`; by default you also accept a server dialog. Without `confirm:true` the call is refused (`confirmation_required`)',
    selection: 'Set profiles with `DARKTRACE_PROFILES`. `all`, or any list with both `sensitive` and `write`, starts only with `DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE=true`. See [Configuration](configuration.md#profiles).',
    columns: 'Columns: **Tier** is the risk class from the API inventory. **Lab** states whether, and how far, the operation passed a real-appliance test.',
    contents: 'Contents', unavailable: 'Not available', summaryLabel: 'Literal MCP summaries (English):',
    table: '| Tool | Method and path | Tier | Profile | Lab | What it does |', reasonsTable: '| Method and path | Reason |',
    yes: 'yes', unvalidated: 'not lab-validated',
    areas: Object.fromEntries([...AREAS.map(([name]) => [name, name]), ['Other', 'Other']]),
    partial: LAB_PARTIAL, notes: LAB_NOT_VALIDATED_NOTE, reasons: NOT_AVAILABLE_REASON, descriptions: DESCRIPTIONS,
  },
  es: {
    title: 'Referencia de herramientas', lead: 'Referencia de operaciones, perfiles y alcance exacto de la evidencia de laboratorio.',
    nav: '[README](../README.md) · [Configuración](configuration.md) · [Primeros pasos](getting-started.md)',
    generated: '> Se genera con `npm run docs:tools` a partir del catálogo API, los grupos y `src/tools/descriptions.ts`. No edites esta página a mano. Los resúmenes MCP reproducen el texto inglés que ve el cliente; las notas dinámicas de política se añaden en ejecución. Las descripciones de operaciones se traducen para quien lee esta guía.',
    inventory: ({tools, available, total, spec, excluded, deprecated}) => `**${tools} herramientas** cubren **${available} operaciones ejecutables** de las ${total} del inventario API (Darktrace Threat Visualizer API ${spec}). Las otras ${excluded} [no están disponibles](#no-disponibles): ${excluded - deprecated} excluida (la acción de correo) y ${deprecated} obsoleta (\`GET /aianalyst/incidents\`).`,
    evidence: ({validated, partial, email}, scope) => `**Evidencia de laboratorio.** ${validated} operaciones tienen evidencia de ${scope.appliances} appliances distintos Darktrace ${scope.version} (${scope.date}): lab A para ${scope.first} y lab B para la campaña de huecos ${scope.gap}. En ${partial} operaciones es parcial; la columna **Laboratorio** indica su alcance. El resto figura *sin validar en laboratorio*: sigue la documentación API, pero no superó la prueba con un appliance real, incluidas las ${email} lecturas Email (HTTP 403; una caída posterior del servicio devolvió 503, según el [registro Email](security/lab-email-validation.md)). Parte de la evidencia de escritura es anterior a los controles finales de aprobación, límites, bloqueo y auditoría, cubiertos por pruebas offline. La [campaña de huecos](security/lab-gap-campaign-${scope.gap}.md) repitió flujos críticos (Antigena, Antigena manual, intel feed, subredes y borrado de etiquetas) y escrituras de dispositivos, investigaciones, PCAP y etiquetas con esos controles.`,
    profiles: 'Qué perfil necesitas', profileTable: '| Perfil | Qué permite | Operaciones |',
    default: 'predeterminado', read: 'Lecturas habituales', sensitive: 'Lecturas que pueden devolver tráfico sin procesar, contenido de correo o auditoría',
    write: 'Cambios reversibles o de configuración. `dryRun:true` devuelve una vista previa',
    critical: 'Acciones que pueden bloquear tráfico o cambiar la detección. Usa `dryRun:true` para obtener una vista previa; repite con `confirm:true` y su `previewId`. Por defecto, también debes aceptar un diálogo del servidor. Sin `confirm:true`, se rechaza la llamada (`confirmation_required`)',
    selection: 'Selecciona los perfiles con `DARKTRACE_PROFILES`. `all`, o una lista con `sensitive` y `write`, solo arranca con `DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE=true`. Consulta [Configuración](configuration.md#perfiles).',
    columns: 'Columnas: **Riesgo** es la categoría del inventario API. **Laboratorio** indica si la operación pasó una prueba con un appliance real y hasta dónde llegó la validación.',
    contents: 'Índice', unavailable: 'No disponibles', summaryLabel: 'Resúmenes literales MCP (inglés):',
    table: '| Herramienta | Método y ruta | Riesgo | Perfil | Laboratorio | Qué hace |', reasonsTable: '| Método y ruta | Motivo |',
    yes: 'sí', unvalidated: 'sin validar en laboratorio',
    areas: { 'System and reference data': 'Sistema y referencias', Devices: 'Dispositivos', 'Model breaches': 'Model breaches', 'Models and metrics': 'Modelos y métricas', 'AI Analyst': 'AI Analyst', 'Autonomous Response (Antigena)': 'Respuesta autónoma (Antigena)', Tags: 'Etiquetas', 'Intel feed and subnets': 'Intel feed y subredes', 'Packet captures': 'Capturas de paquetes', 'Advanced Search': 'Advanced Search', 'Darktrace/Email': 'Darktrace/Email', Other: 'Otros' },
    partial: {
      post_antigena_manual: 'parcial: solo se ejecutaron bloqueos manuales `connection`; `pol`, `gpol` y `quarantineOutgoing` devolvieron HTTP 400 en un dispositivo sensor cliente; no se ejecutaron `quarantine` ni `quarantineIncoming`',
      post_subnets: 'parcial: solo se ejecutaron cambios de `label` y `uniqueHostnames`',
      post_intelfeed: 'parcial: se ejecutaron `addentry`, `addlist`, `expiry` (caducó a tiempo) y `removeentry`; se aceptó `hostname:true` sin lectura posterior; no se ejecutaron `iagn` ni `removeall`',
      ...Object.fromEntries(['get_models', 'get_components', 'get_enums'].map(id => [id, 'parcial: pasa con `responsedata`; el listado completo devuelve `response_limit_exceeded`'])),
    },
    notes: {
      ...Object.fromEntries(['delete_tags_tid', 'delete_tags_tid_entities_teid', 'delete_tags_entities'].map(id => [id, 'se aplicó (lectura posterior confirmada), pero el gateway devuelve HTTP 502; se informa `write_outcome_unknown`'])),
      get_cves: 'el appliance devuelve HTTP 500 (solo Darktrace/OT)',
      get_filtertypes: 'el appliance redirige (HTTP 302); nunca se siguen redirecciones',
    },
    reasons: {
      get_aianalyst_incidents: 'Obsoleta en Darktrace. Usa `darktrace_list_ai_analyst_incidents`.',
      post_agemail_api_ep_api_v1_0_emails_uuid_action: 'Excluida de esta versión: `darktrace_email_action` no se registra en ningún perfil. La firma y el esquema de esta acción no están validados; el token de laboratorio recibió HTTP 403. Habilitarla requiere un esquema revisado, una prueba de firma con un token con licencia Email y una nueva revisión del diseño.',
    },
    descriptions: DESCRIPTIONS_ES,
  },
};

function sameKeys(left, right, path) {
  const a = Object.keys(left).sort(), b = Object.keys(right).sort();
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`Translation keys differ: ${path}`);
  for (const key of a) {
    if (typeof left[key] !== typeof right[key]) throw new Error(`Translation type differs: ${path}.${key}`);
    if (typeof left[key] === 'object') sameKeys(left[key], right[key], `${path}.${key}`);
    else if (typeof left[key] === 'string' && (!left[key] || !right[key])) throw new Error(`Empty translation: ${path}.${key}`);
  }
}
sameKeys(MESSAGES.en, MESSAGES.es, 'messages');
function required(object, key) {
  if (!Object.hasOwn(object, key) || !object[key]) throw new Error(`Missing documentation translation: ${key}`);
  return object[key];
}
const slug = label => label.toLowerCase().replace(/[^\p{L}\p{N} -]/gu, '').replaceAll(' ', '-');
const validated = op => (op.validatedOn ?? []).length > 0;
function labCell(op, messages) {
  if (!validated(op)) return messages.unvalidated + (Object.hasOwn(LAB_NOT_VALIDATED_NOTE, op.operationId) ? `: ${required(messages.notes, op.operationId)}` : '');
  return Object.hasOwn(LAB_PARTIAL, op.operationId) ? required(messages.partial, op.operationId) : messages.yes;
}

export function render(lang = 'es') {
  const m = required(MESSAGES, lang);
  const ops = catalogue.operations.map(op => ({ ...op, tool: toolGroups[op.operationId] ?? op.tool ?? null }));
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
  const out = [`# ${m.title}`, '', lang === 'es' ? '**Español** · [English](en/tools.md)' : '[Español](../tools.md) · **English**', '', m.nav, '', m.lead, '', m.generated, ''];
  out.push(m.inventory({ tools: byTool.size, available: available.length, total: ops.length, spec: catalogue.specVersion ?? '6.1', excluded: excluded.length, deprecated }), '');
  out.push(m.evidence({ validated: nValidated, partial: nPartial, email: nEmail }, LAB_SCOPE), '');
  out.push(`## ${m.profiles}`, '', m.profileTable, '|---|---|---:|');
  for (const profile of Object.keys(counts)) out.push(`| \`${profile}\`${profile === 'read' ? ` (${m.default})` : ''} | ${required(m, profile)} | ${counts[profile]} |`);
  out.push('', m.selection, '', m.columns, '');
  const areas = new Map();
  for (const tool of [...byTool.keys()].sort()) {
    const area = areaOf(tool);
    if (!areas.has(area)) areas.set(area, []);
    areas.get(area).push(tool);
  }
  const order = [...AREAS.map(([name]) => name), 'Other'].filter(area => areas.has(area));
  out.push(`## ${m.contents}`, '');
  for (const area of order) { const label = required(m.areas, area); out.push(`- [${label}](#${slug(label)})`); }
  out.push(`- [${m.unavailable}](#${slug(m.unavailable)})`, '');
  for (const area of order) {
    out.push(`## ${required(m.areas, area)}`, '', m.summaryLabel, '');
    for (const tool of areas.get(area)) {
      if (!summaries.has(tool)) throw new Error(`Missing summary: ${tool}`);
      out.push(`- **\`${tool}\`**: ${summaries.get(tool)}`);
    }
    out.push('', m.table, '|---|---|---|---|---|---|');
    for (const tool of areas.get(area)) {
      const list = byTool.get(tool).sort((a, b) => a.pathTemplate.localeCompare(b.pathTemplate) || a.method.localeCompare(b.method));
      for (const op of list) out.push(`| \`${tool}\` | \`${op.method} ${op.pathTemplate}\` | ${op.tier} | \`${profileOf(op)}\` | ${labCell(op, m)} | ${required(m.descriptions, op.operationId)} |`);
    }
    out.push('');
  }
  out.push(`## ${m.unavailable}`, '', m.reasonsTable, '|---|---|');
  for (const op of excluded) out.push(`| \`${op.method} ${op.pathTemplate}\` | ${required(m.reasons, op.operationId)} |`);
  out.push('');
  return out.join('\n');
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
