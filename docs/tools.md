Referencia de operaciones, perfiles y alcance exacto de la evidencia de laboratorio.

[README](../README.md) · [Configuración](configuration.md) · [Primeros pasos](getting-started.md)

**Español** · [English](en/tools.md)

# Referencia de herramientas

> Se genera con `npm run docs:tools` a partir del catálogo API, los grupos y `src/tools/descriptions.ts`. No edites esta página a mano. Los resúmenes y las descripciones de operaciones se conservan en inglés; los resúmenes reproducen el texto del código que ve el cliente (las notas dinámicas de política se añaden en ejecución).

**50 herramientas** cubren **77 operaciones ejecutables** de las 79 del inventario API (Darktrace Threat Visualizer API 6.1). Las otras 2 [no están disponibles](#no-disponibles): 1 excluida (la acción de correo) y 1 obsoleta (`GET /aianalyst/incidents`).

**Evidencia de laboratorio.** 59 operaciones tienen evidencia de dos appliances de laboratorio Darktrace 7.1.0 (2026-10-06). En 6 de ellas la evidencia es parcial; la columna **Laboratorio** indica qué se cubrió. El resto figura como *sin validar en laboratorio*: sigue la documentación API, pero no superó la prueba con un appliance real. Esto incluye las 13 lecturas Darktrace/Email (HTTP 403). Parte de la evidencia de escritura es anterior a los controles finales de aprobación, límites, bloqueo y auditoría, cubiertos por pruebas offline. La [campaña de cobertura](security/lab-gap-campaign-1.1.1.md) repitió los flujos críticos (Antigena, Antigena manual, intel feed, subredes y borrado de etiquetas) y las escrituras de dispositivos, investigaciones, PCAP y etiquetas con esos controles.

## Qué perfil necesitas

| Perfil | Qué permite | Operaciones |
|---|---|---:|
| `read` (predeterminado) | Lecturas habituales | 38 |
| `sensitive` | Lecturas que pueden devolver tráfico sin procesar, contenido de correo o auditoría | 18 |
| `write` | Cambios reversibles o de configuración. `dryRun:true` devuelve una vista previa | 16 |
| `critical` | Acciones que pueden bloquear tráfico o cambiar la detección. Usa `dryRun:true` para obtener una vista previa; repite con `confirm:true` y su `previewId`. Por defecto, también debes aceptar un diálogo del servidor. Sin `confirm:true`, se rechaza la llamada (`confirmation_required`) | 5 |

Selecciona los perfiles con `DARKTRACE_PROFILES`. `all`, o una lista con `sensitive` y `write`, solo arranca con `DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE=true`. Consulta [Configuración](configuration.md#perfiles).

Columnas: **Riesgo** es la categoría del inventario API. **Laboratorio** indica si la operación pasó una prueba con un appliance real y hasta dónde llegó la validación.

## Índice

- [Sistema y referencias](#sistema-y-referencias)
- [Dispositivos](#dispositivos)
- [Model breaches](#model-breaches)
- [Modelos y métricas](#modelos-y-métricas)
- [AI Analyst](#ai-analyst)
- [Respuesta autónoma (Antigena)](#respuesta-autónoma-antigena)
- [Etiquetas](#etiquetas)
- [Intel feed y subredes](#intel-feed-y-subredes)
- [Capturas de paquetes](#capturas-de-paquetes)
- [Advanced Search](#advanced-search)
- [Darktrace/Email](#darktraceemail)
- [No disponibles](#no-disponibles)

## Sistema y referencias

- **`darktrace_get_cves`**: CVE / vulnerability information for devices.
- **`darktrace_get_network_stats`**: Network traffic statistics for the network, a subnet or a device.
- **`darktrace_get_reference_data`**: Reference enumerations and filter types used by other endpoints.
- **`darktrace_get_status`**: Darktrace appliance health: version, probes, traffic and licensing status.
- **`darktrace_get_summary_statistics`**: High-level summary statistics (bandwidth, device counts, patterns).

| Herramienta | Método y ruta | Riesgo | Perfil | Laboratorio | Qué hace |
|---|---|---|---|---|---|
| `darktrace_get_cves` | `GET /cves` | read | `read` | sin validar en laboratorio: el appliance devuelve HTTP 500 (solo Darktrace/OT) | CVEs for OT devices (Darktrace/OT only). |
| `darktrace_get_network_stats` | `GET /network` | read | `read` | sí | Connectivity between devices or subnets. |
| `darktrace_get_reference_data` | `GET /enums` | read | `read` | parcial: pasa con `responsedata`; el listado completo devuelve `response_limit_exceeded` | Text values for numeric codes used in API responses. |
| `darktrace_get_reference_data` | `GET /filtertypes` | read | `read` | sin validar en laboratorio: el appliance redirige (HTTP 302); nunca se siguen redirecciones | Filters available in the Model Editor. |
| `darktrace_get_status` | `GET /status` | read | `read` | sí | System health and version of the appliance. |
| `darktrace_get_summary_statistics` | `GET /summarystatistics` | read | `read` | sí | Device counts, bandwidth and active response actions. |

## Dispositivos

- **`darktrace_get_connection_details`**: Raw connection/event history for a device or model breach.
- **`darktrace_get_device_info`**: Detailed connection/traffic profile for one device.
- **`darktrace_get_device_summary`**: Contextual summary for one device.
- **`darktrace_get_devices`**: List or look up network devices (hosts) known to Darktrace.
- **`darktrace_get_endpoint_details`**: Information Darktrace holds about an external endpoint (IP or hostname).
- **`darktrace_get_metric_data`**: Time series for a metric (e.g. bytes) for a device or connection.
- **`darktrace_get_similar_devices`**: Devices that behave similarly to a given device.
- **`darktrace_search_devices`**: Free-text device search (hostname, IP, MAC, vendor, tag...) with paging.
- **`darktrace_update_device`**: Update device properties (label, priority, type).

| Herramienta | Método y ruta | Riesgo | Perfil | Laboratorio | Qué hace |
|---|---|---|---|---|---|
| `darktrace_get_connection_details` | `GET /details` | read | `read` | sí | Time-sorted connections and events for a device or entity. |
| `darktrace_get_device_info` | `GET /deviceinfo` | read | `read` | sí | Connection data for one device. |
| `darktrace_get_device_summary` | `GET /devicesummary` | read | `read` | sí | Context for one device from several sources. |
| `darktrace_get_devices` | `GET /devices` | read | `read` | sí | List devices, or one device by `did`. |
| `darktrace_get_endpoint_details` | `GET /endpointdetails` | read | `read` | sí | Location and connection info for an external IP or hostname. |
| `darktrace_get_metric_data` | `GET /metricdata` | read | `read` | sí | Time-series metric data for a device. |
| `darktrace_get_similar_devices` | `GET /similardevices` | read | `read` | sí | Devices that behave like a given device. |
| `darktrace_search_devices` | `GET /devicesearch` | read | `read` | sí | Search devices with filters. |
| `darktrace_update_device` | `POST /devices` | high | `write` | sí | Change a device label, priority or type. |

## Model breaches

- **`darktrace_acknowledge_model_breach`**: Acknowledge or unacknowledge a model breach.
- **`darktrace_comment_model_breach`**: Add a comment to a model breach.
- **`darktrace_get_model_breach_comments`**: Read comments on model breaches.
- **`darktrace_list_model_breaches`**: List model breaches (alerts), or fetch one by pbid.

| Herramienta | Método y ruta | Riesgo | Perfil | Laboratorio | Qué hace |
|---|---|---|---|---|---|
| `darktrace_acknowledge_model_breach` | `POST /modelbreaches/{pbid}/acknowledge` | medium | `write` | sí | Acknowledge a model breach. |
| `darktrace_acknowledge_model_breach` | `POST /modelbreaches/{pbid}/unacknowledge` | medium | `write` | sí | Unacknowledge a model breach. |
| `darktrace_comment_model_breach` | `POST /modelbreaches/{pbid}/comments` | medium | `write` | sí | Add a comment to a model breach. |
| `darktrace_get_model_breach_comments` | `GET /mbcomments` | read | `read` | sí | Comments across model breaches. |
| `darktrace_get_model_breach_comments` | `GET /modelbreaches/{pbid}/comments` | read | `read` | sí | Comments on one model breach. |
| `darktrace_list_model_breaches` | `GET /modelbreaches` | read | `read` | sí | List model breaches (alerts). |
| `darktrace_list_model_breaches` | `GET /modelbreaches/{pbid}` | read | `read` | sí | One model breach by `pbid`. |

## Modelos y métricas

- **`darktrace_list_components`**: List model components (filters/logic), or one by cid.
- **`darktrace_list_metrics`**: List available metrics, or one metric by mlid.
- **`darktrace_list_models`**: List detection models, or fetch one by pid.

| Herramienta | Método y ruta | Riesgo | Perfil | Laboratorio | Qué hace |
|---|---|---|---|---|---|
| `darktrace_list_components` | `GET /components` | read | `read` | parcial: pasa con `responsedata`; el listado completo devuelve `response_limit_exceeded` | List model components. |
| `darktrace_list_components` | `GET /components/{cid}` | read | `read` | sí | One model component by `cid`. |
| `darktrace_list_metrics` | `GET /metrics` | read | `read` | sí | List available metrics. |
| `darktrace_list_metrics` | `GET /metrics/{mlid}` | read | `read` | sí | One metric by `mlid`. |
| `darktrace_list_models` | `GET /models` | read | `read` | parcial: pasa con `responsedata`; el listado completo devuelve `response_limit_exceeded` | List models. |
| `darktrace_list_models` | `GET /models/{pid}` | read | `read` | sí | One model by `pid`. |

## AI Analyst

- **`darktrace_acknowledge_ai_analyst_incident`**: Acknowledge or unacknowledge Cyber AI Analyst incident events.
- **`darktrace_comment_ai_analyst_incident`**: Add a comment to a Cyber AI Analyst incident.
- **`darktrace_create_ai_analyst_investigation`**: Start a Cyber AI Analyst investigation on a device.
- **`darktrace_get_ai_analyst_incident_comments`**: Read comments on a Cyber AI Analyst incident.
- **`darktrace_get_ai_analyst_stats`**: Cyber AI Analyst summary statistics.
- **`darktrace_list_ai_analyst_incidents`**: Cyber AI Analyst incidents: grouped incidents or individual incident events.
- **`darktrace_list_ai_analyst_investigations`**: List Cyber AI Analyst investigations.
- **`darktrace_pin_ai_analyst_incident`**: Pin or unpin Cyber AI Analyst incident events.

| Herramienta | Método y ruta | Riesgo | Perfil | Laboratorio | Qué hace |
|---|---|---|---|---|---|
| `darktrace_acknowledge_ai_analyst_incident` | `POST /aianalyst/acknowledge` | medium | `write` | sí | Acknowledge AI Analyst incident events. |
| `darktrace_acknowledge_ai_analyst_incident` | `POST /aianalyst/unacknowledge` | medium | `write` | sí | Unacknowledge AI Analyst incident events. |
| `darktrace_comment_ai_analyst_incident` | `POST /aianalyst/incident/comments` | medium | `write` | sí | Add a comment to an AI Analyst incident event. |
| `darktrace_create_ai_analyst_investigation` | `POST /aianalyst/investigations` | medium | `write` | sí | Start a manual AI Analyst investigation. |
| `darktrace_get_ai_analyst_incident_comments` | `GET /aianalyst/incident/comments` | read | `read` | sí | Comments on an AI Analyst incident event. |
| `darktrace_get_ai_analyst_stats` | `GET /aianalyst/stats` | read | `read` | sí | AI Analyst statistics. |
| `darktrace_list_ai_analyst_incidents` | `GET /aianalyst/groups` | read | `read` | sí | List AI Analyst incidents (groups). |
| `darktrace_list_ai_analyst_incidents` | `GET /aianalyst/incidentevents` | read | `read` | sí | List AI Analyst incident events. |
| `darktrace_list_ai_analyst_investigations` | `GET /aianalyst/investigations` | read | `read` | sí | List manual AI Analyst investigations. |
| `darktrace_pin_ai_analyst_incident` | `POST /aianalyst/pin` | medium | `write` | sí | Pin AI Analyst incident events. |
| `darktrace_pin_ai_analyst_incident` | `POST /aianalyst/unpin` | medium | `write` | sí | Unpin AI Analyst incident events. |

## Respuesta autónoma (Antigena)

- **`darktrace_antigena_action`**: Activate, extend or clear Darktrace RESPOND (Antigena) actions.
- **`darktrace_antigena_manual_action`**: Create a manual RESPOND action (e.g. quarantine or block a device).
- **`darktrace_list_antigena_actions`**: Darktrace RESPOND (Antigena) actions: list actions or the pending/active summary.

| Herramienta | Método y ruta | Riesgo | Perfil | Laboratorio | Qué hace |
|---|---|---|---|---|---|
| `darktrace_antigena_action` | `POST /antigena` | critical | `critical` | sí | Activate, extend, clear or reactivate a response action. |
| `darktrace_antigena_manual_action` | `POST /antigena/manual` | critical | `critical` | parcial: solo se ejecutaron bloqueos manuales `connection`; `pol`, `gpol` y `quarantineOutgoing` devolvieron HTTP 400 en un dispositivo sensor cliente; no se ejecutaron `quarantine` ni `quarantineIncoming` | Create a manual response action (for example, block a connection). |
| `darktrace_list_antigena_actions` | `GET /antigena` | read | `read` | sí | List Autonomous Response (Antigena) actions. |
| `darktrace_list_antigena_actions` | `GET /antigena/summary` | read | `read` | sí | Summary of active and pending response actions. |

## Etiquetas

- **`darktrace_delete_tag`**: Delete a tag definition.
- **`darktrace_list_tags`**: Tags and tagged entities: list tags, one tag, or which devices carry which tags.
- **`darktrace_manage_tags`**: Create tags and add/remove tags on devices or entities.

| Herramienta | Método y ruta | Riesgo | Perfil | Laboratorio | Qué hace |
|---|---|---|---|---|---|
| `darktrace_delete_tag` | `DELETE /tags/{tid}` | critical | `critical` | sin validar en laboratorio: se aplicó (lectura posterior confirmada), pero el gateway devuelve HTTP 502; se informa `write_outcome_unknown` | Delete a tag. |
| `darktrace_list_tags` | `GET /tags` | read | `read` | sí | List tags. |
| `darktrace_list_tags` | `GET /tags/{tid}` | read | `read` | sí | One tag by `tid`. |
| `darktrace_list_tags` | `GET /tags/{tid}/entities` | read | `read` | sí | Devices with one tag. |
| `darktrace_list_tags` | `GET /tags/entities` | read | `read` | sí | Tags on a device, or devices with a tag. |
| `darktrace_manage_tags` | `POST /tags` | high | `write` | sí | Create a tag. |
| `darktrace_manage_tags` | `POST /tags/{tid}/entities` | high | `write` | sí | Add a tag to a device by tag ID. |
| `darktrace_manage_tags` | `DELETE /tags/{tid}/entities/{teid}` | high | `write` | sin validar en laboratorio: se aplicó (lectura posterior confirmada), pero el gateway devuelve HTTP 502; se informa `write_outcome_unknown` | Remove one tag assignment. |
| `darktrace_manage_tags` | `DELETE /tags/entities` | high | `write` | sin validar en laboratorio: se aplicó (lectura posterior confirmada), pero el gateway devuelve HTTP 502; se informa `write_outcome_unknown` | Remove a tag from a device. |
| `darktrace_manage_tags` | `POST /tags/entities` | high | `write` | sí | Add a tag to a device. |

## Intel feed y subredes

- **`darktrace_get_intel_feed`**: Read the watched-domains / intel feed list.
- **`darktrace_list_subnets`**: List monitored subnets.
- **`darktrace_update_intel_feed`**: Add or remove watched domains in the intel feed (removeall wipes the list).
- **`darktrace_update_subnet`**: Update subnet settings (label, DHCP, exclusion from monitoring).

| Herramienta | Método y ruta | Riesgo | Perfil | Laboratorio | Qué hace |
|---|---|---|---|---|---|
| `darktrace_get_intel_feed` | `GET /intelfeed` | read | `read` | sí | Read Watched Domains (intel feed). |
| `darktrace_list_subnets` | `GET /subnets` | read | `read` | sí | List subnets. |
| `darktrace_update_intel_feed` | `POST /intelfeed` | critical | `critical` | parcial: se ejecutaron `addentry`, `addlist`, `expiry` (caducó a tiempo) y `removeentry`; se aceptó `hostname:true` sin lectura posterior; no se ejecutaron `iagn` ni `removeall` | Add or remove Watched Domains entries. |
| `darktrace_update_subnet` | `POST /subnets` | critical | `critical` | parcial: solo se ejecutaron cambios de `label` y `uniqueHostnames` | Change subnet settings. |

## Capturas de paquetes

- **`darktrace_download_pcap`**: Download a finished packet capture file (base64, size-bounded, never written to disk).
- **`darktrace_list_pcaps`**: List packet captures and their status.
- **`darktrace_request_pcap`**: Request a new packet capture for a connection.

| Herramienta | Método y ruta | Riesgo | Perfil | Laboratorio | Qué hace |
|---|---|---|---|---|---|
| `darktrace_download_pcap` | `GET /pcaps/{filename}` | read | `sensitive` | sí | Download a packet capture as Base64, whole or not at all: captures above about 45 KB are refused with `output_limit_exceeded` (size and SHA-256 only). |
| `darktrace_list_pcaps` | `GET /pcaps` | read | `read` | sí | List packet captures. |
| `darktrace_request_pcap` | `POST /pcaps` | high | `write` | sí | Request a new packet capture. |

## Advanced Search

- **`darktrace_advanced_search`**: Advanced Search (log/event search) plus analyze/graph. query/hash = base64 of JSON {"search":"<query>","fields":[],"timeframe":"3600"} (seconds, max 604800).

| Herramienta | Método y ruta | Riesgo | Perfil | Laboratorio | Qué hace |
|---|---|---|---|---|---|
| `darktrace_advanced_search` | `GET /advancedsearch/api/analyze/{field}/{analysis}/{query}` | read | `sensitive` | sí | Advanced Search field analysis. |
| `darktrace_advanced_search` | `GET /advancedsearch/api/graph/{graphmode}/{interval}/{query}` | read | `sensitive` | sí | Advanced Search graph data. |
| `darktrace_advanced_search` | `POST /advancedsearch/api/search` | read | `sensitive` | sí | Advanced Search query (POST form). |
| `darktrace_advanced_search` | `GET /advancedsearch/api/search/{query}` | read | `sensitive` | sí | Advanced Search query (GET form). |

## Darktrace/Email

- **`darktrace_download_email`**: Darktrace/EMAIL: download the raw message of one email (size-bounded).
- **`darktrace_email_audit_events`**: Darktrace/EMAIL: read audit events.
- **`darktrace_email_dashboard`**: Darktrace/EMAIL dashboard statistics.
- **`darktrace_email_decode_link`**: Darktrace/EMAIL: decode a rewritten link.
- **`darktrace_email_get`**: Darktrace/EMAIL: read one email record by UUID.
- **`darktrace_email_reference_data`**: Darktrace/EMAIL reference data: tags, actions, filters, audit event types.
- **`darktrace_email_search`**: Darktrace/EMAIL: search emails with a JSON criteria body.

| Herramienta | Método y ruta | Riesgo | Perfil | Laboratorio | Qué hace |
|---|---|---|---|---|---|
| `darktrace_download_email` | `GET /agemail/api/ep/api/v1.0/emails/{uuid}/download` | read | `sensitive` | sin validar en laboratorio | Size and SHA-256 of a raw email (the content is not returned). |
| `darktrace_email_audit_events` | `GET /agemail/api/ep/api/v1.0/system/audit/events` | read | `sensitive` | sin validar en laboratorio | Email audit events. |
| `darktrace_email_dashboard` | `GET /agemail/api/ep/api/v1.0/dash/action_summary` | read | `sensitive` | sin validar en laboratorio | Email dashboard: action summary. |
| `darktrace_email_dashboard` | `GET /agemail/api/ep/api/v1.0/dash/dash_stats` | read | `sensitive` | sin validar en laboratorio | Email dashboard: statistics. |
| `darktrace_email_dashboard` | `GET /agemail/api/ep/api/v1.0/dash/data_loss` | read | `sensitive` | sin validar en laboratorio | Email dashboard: data loss. |
| `darktrace_email_dashboard` | `GET /agemail/api/ep/api/v1.0/dash/user_anomaly` | read | `sensitive` | sin validar en laboratorio | Email dashboard: user anomaly. |
| `darktrace_email_decode_link` | `GET /agemail/api/ep/api/v1.0/admin/decode_link` | read | `sensitive` | sin validar en laboratorio | Decode a rewritten email link. |
| `darktrace_email_get` | `GET /agemail/api/ep/api/v1.0/emails/{uuid}` | read | `sensitive` | sin validar en laboratorio | One email, including content metadata. |
| `darktrace_email_reference_data` | `GET /agemail/api/ep/api/v1.0/resources/actions` | read | `sensitive` | sin validar en laboratorio | Email reference data: actions. |
| `darktrace_email_reference_data` | `GET /agemail/api/ep/api/v1.0/resources/filters` | read | `sensitive` | sin validar en laboratorio | Email reference data: filters. |
| `darktrace_email_reference_data` | `GET /agemail/api/ep/api/v1.0/resources/tags` | read | `sensitive` | sin validar en laboratorio | Email reference data: tags. |
| `darktrace_email_reference_data` | `GET /agemail/api/ep/api/v1.0/system/audit/eventTypes` | read | `sensitive` | sin validar en laboratorio | Email reference data: audit event types. |
| `darktrace_email_search` | `POST /agemail/api/ep/api/v1.0/emails/search` | read | `sensitive` | sin validar en laboratorio | Search emails. |

## No disponibles

| Método y ruta | Motivo |
|---|---|
| `GET /aianalyst/incidents` | Obsoleta en Darktrace. Usa `darktrace_list_ai_analyst_incidents`. |
| `POST /agemail/api/ep/api/v1.0/emails/{uuid}/action` | Excluida de esta versión: `darktrace_email_action` no se registra en ningún perfil. La firma y el esquema de esta acción no están validados; el token de laboratorio recibió HTTP 403. Habilitarla requiere un esquema revisado, una prueba de firma con un token con licencia Email y una nueva revisión del diseño. |
