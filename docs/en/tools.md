# Tool reference

[Español](../tools.md) · **English**

[README](../../README.en.md) · [Configuration](configuration.md) · [Getting started](getting-started.md)

Reference of operations, profiles and the precise scope of lab evidence.

> Built by `npm run docs:tools` from the API catalogue, tool groups and `src/tools/descriptions.ts`. Do not edit by hand. MCP summaries below reproduce the English text seen by the client; dynamic policy notes are added at runtime. Operation descriptions are localized for readers.

**50 tools** cover **77 executable operations** out of 79 in the API inventory (Darktrace Threat Visualizer API 6.1). The other 2 are [not available](#not-available): 1 excluded (the email action) and 1 deprecated (`GET /aianalyst/incidents`).

Each tool groups variants of the same API, such as a list and detail by ID; therefore there are fewer tools than operations.

**Lab evidence.** 59 operations have evidence from 2 distinct Darktrace 7.1.0 appliances (2026-10-06): lab A for 1.1.0, lab B for the 1.1.1 gap campaign. 6 operations have partial evidence; the **Lab evidence** column states its scope. The rest are *not lab-validated*: they follow API documentation but did not pass against a live appliance, including all 13 Email reads (HTTP 403; a later service outage returned 503, see the [Email record](../security/lab-email-validation.md)). Some write evidence predates the final approval, rate-limit, breaker and audit controls, which have offline coverage. The [gap campaign](../security/lab-gap-campaign-1.1.1.md) re-ran critical flows (Antigena, manual Antigena, intel feed, subnets, tag deletion) and device, investigation, PCAP and tag writes under those controls.

## Which profile do I need?

| Profile | What it unlocks | Operations |
|---|---|---:|
| `read` (default) | Normal reads | 38 |
| `sensitive` | Reads that can return raw traffic, email content or audit data | 18 |
| `write` | Reversible or configuration changes. `dryRun:true` returns a preview | 16 |
| `critical` | Actions that can block traffic or change detection. Call with `dryRun:true` for a preview, then repeat with `confirm:true` and its `previewId`; by default you also accept a server dialog. Without `confirm:true` the call is refused (`confirmation_required`) | 5 |

Set profiles with `DARKTRACE_PROFILES`. `all`, or any list with both `sensitive` and `write`, starts only with `DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE=true`. See [Configuration](configuration.md#profiles).

Columns: **Tier** is the risk class from the API inventory. **Lab evidence** states whether, and how far, the operation passed a real-appliance test.

## Contents

- [System and reference data](#system-and-reference-data)
- [Devices](#devices)
- [Model breaches](#model-breaches)
- [Models and metrics](#models-and-metrics)
- [AI Analyst](#ai-analyst)
- [Autonomous Response (Antigena)](#autonomous-response-antigena)
- [Tags](#tags)
- [Intel feed and subnets](#intel-feed-and-subnets)
- [Packet captures](#packet-captures)
- [Advanced Search](#advanced-search)
- [Darktrace/Email](#darktraceemail)
- [Not available](#not-available)

## System and reference data

Literal MCP summaries (English):

- **`darktrace_get_cves`**: CVE / vulnerability information for devices.
- **`darktrace_get_network_stats`**: Network traffic statistics for the network, a subnet or a device.
- **`darktrace_get_reference_data`**: Reference enumerations and filter types used by other endpoints.
- **`darktrace_get_status`**: Darktrace appliance health: version, probes, traffic and licensing status.
- **`darktrace_get_summary_statistics`**: High-level summary statistics (bandwidth, device counts, patterns).

| Tool | Method and path | Tier | Profile | Lab evidence | What it does |
|---|---|---|---|---|---|
| `darktrace_get_cves` | `GET /cves` | read | `read` | — not lab-validated: the lab appliance answers HTTP 500 (Darktrace/OT only) | CVEs for OT devices (Darktrace/OT only). |
| `darktrace_get_network_stats` | `GET /network` | read | `read` | ✓ | Connectivity between devices or subnets. |
| `darktrace_get_reference_data` | `GET /enums` | read | `read` | ◐ partial: passes with `responsedata`; the full list returns `response_limit_exceeded` | Text values for numeric codes used in API responses. |
| `darktrace_get_reference_data` | `GET /filtertypes` | read | `read` | — not lab-validated: the lab appliance answers with a redirect (HTTP 302), which is never followed | Filters available in the Model Editor. |
| `darktrace_get_status` | `GET /status` | read | `read` | ✓ | System health and version of the appliance. |
| `darktrace_get_summary_statistics` | `GET /summarystatistics` | read | `read` | ✓ | Device counts, bandwidth and active response actions. |

**✓** full evidence · **◐** partial evidence · **—** not lab-validated. Read each note for the exact scope.

## Devices

Literal MCP summaries (English):

- **`darktrace_get_connection_details`**: Raw connection/event history for a device or model breach.
- **`darktrace_get_device_info`**: Detailed connection/traffic profile for one device.
- **`darktrace_get_device_summary`**: Contextual summary for one device.
- **`darktrace_get_devices`**: List or look up network devices (hosts) known to Darktrace.
- **`darktrace_get_endpoint_details`**: Information Darktrace holds about an external endpoint (IP or hostname).
- **`darktrace_get_metric_data`**: Time series for a metric (e.g. bytes) for a device or connection.
- **`darktrace_get_similar_devices`**: Devices that behave similarly to a given device.
- **`darktrace_search_devices`**: Free-text device search (hostname, IP, MAC, vendor, tag...) with paging.
- **`darktrace_update_device`**: Update device properties (label, priority, type).

| Tool | Method and path | Tier | Profile | Lab evidence | What it does |
|---|---|---|---|---|---|
| `darktrace_get_connection_details` | `GET /details` | read | `read` | ✓ | Time-sorted connections and events for a device or entity. |
| `darktrace_get_device_info` | `GET /deviceinfo` | read | `read` | ✓ | Connection data for one device. |
| `darktrace_get_device_summary` | `GET /devicesummary` | read | `read` | ✓ | Context for one device from several sources. |
| `darktrace_get_devices` | `GET /devices` | read | `read` | ✓ | List devices, or one device by `did`. |
| `darktrace_get_endpoint_details` | `GET /endpointdetails` | read | `read` | ✓ | Location and connection info for an external IP or hostname. |
| `darktrace_get_metric_data` | `GET /metricdata` | read | `read` | ✓ | Time-series metric data for a device. |
| `darktrace_get_similar_devices` | `GET /similardevices` | read | `read` | ✓ | Devices that behave like a given device. |
| `darktrace_search_devices` | `GET /devicesearch` | read | `read` | ✓ | Search devices with filters. |
| `darktrace_update_device` | `POST /devices` | high | `write` | ✓ | Change a device label, priority or type. |

**✓** full evidence · **◐** partial evidence · **—** not lab-validated. Read each note for the exact scope.

## Model breaches

Literal MCP summaries (English):

- **`darktrace_acknowledge_model_breach`**: Acknowledge or unacknowledge a model breach.
- **`darktrace_comment_model_breach`**: Add a comment to a model breach.
- **`darktrace_get_model_breach_comments`**: Read comments on model breaches.
- **`darktrace_list_model_breaches`**: List model breaches (alerts), or fetch one by pbid.

| Tool | Method and path | Tier | Profile | Lab evidence | What it does |
|---|---|---|---|---|---|
| `darktrace_acknowledge_model_breach` | `POST /modelbreaches/{pbid}/acknowledge` | medium | `write` | ✓ | Acknowledge a model breach. |
| `darktrace_acknowledge_model_breach` | `POST /modelbreaches/{pbid}/unacknowledge` | medium | `write` | ✓ | Unacknowledge a model breach. |
| `darktrace_comment_model_breach` | `POST /modelbreaches/{pbid}/comments` | medium | `write` | ✓ | Add a comment to a model breach. |
| `darktrace_get_model_breach_comments` | `GET /mbcomments` | read | `read` | ✓ | Comments across model breaches. |
| `darktrace_get_model_breach_comments` | `GET /modelbreaches/{pbid}/comments` | read | `read` | ✓ | Comments on one model breach. |
| `darktrace_list_model_breaches` | `GET /modelbreaches` | read | `read` | ✓ | List model breaches (alerts). |
| `darktrace_list_model_breaches` | `GET /modelbreaches/{pbid}` | read | `read` | ✓ | One model breach by `pbid`. |

**✓** full evidence · **◐** partial evidence · **—** not lab-validated. Read each note for the exact scope.

## Models and metrics

Literal MCP summaries (English):

- **`darktrace_list_components`**: List model components (filters/logic), or one by cid.
- **`darktrace_list_metrics`**: List available metrics, or one metric by mlid.
- **`darktrace_list_models`**: List detection models, or fetch one by pid.

| Tool | Method and path | Tier | Profile | Lab evidence | What it does |
|---|---|---|---|---|---|
| `darktrace_list_components` | `GET /components` | read | `read` | ◐ partial: passes with `responsedata`; the full list returns `response_limit_exceeded` | List model components. |
| `darktrace_list_components` | `GET /components/{cid}` | read | `read` | ✓ | One model component by `cid`. |
| `darktrace_list_metrics` | `GET /metrics` | read | `read` | ✓ | List available metrics. |
| `darktrace_list_metrics` | `GET /metrics/{mlid}` | read | `read` | ✓ | One metric by `mlid`. |
| `darktrace_list_models` | `GET /models` | read | `read` | ◐ partial: passes with `responsedata`; the full list returns `response_limit_exceeded` | List models. |
| `darktrace_list_models` | `GET /models/{pid}` | read | `read` | ✓ | One model by `pid`. |

**✓** full evidence · **◐** partial evidence · **—** not lab-validated. Read each note for the exact scope.

## AI Analyst

Literal MCP summaries (English):

- **`darktrace_acknowledge_ai_analyst_incident`**: Acknowledge or unacknowledge Cyber AI Analyst incident events.
- **`darktrace_comment_ai_analyst_incident`**: Add a comment to a Cyber AI Analyst incident.
- **`darktrace_create_ai_analyst_investigation`**: Start a Cyber AI Analyst investigation on a device.
- **`darktrace_get_ai_analyst_incident_comments`**: Read comments on a Cyber AI Analyst incident.
- **`darktrace_get_ai_analyst_stats`**: Cyber AI Analyst summary statistics.
- **`darktrace_list_ai_analyst_incidents`**: Cyber AI Analyst incidents: grouped incidents or individual incident events.
- **`darktrace_list_ai_analyst_investigations`**: List Cyber AI Analyst investigations.
- **`darktrace_pin_ai_analyst_incident`**: Pin or unpin Cyber AI Analyst incident events.

| Tool | Method and path | Tier | Profile | Lab evidence | What it does |
|---|---|---|---|---|---|
| `darktrace_acknowledge_ai_analyst_incident` | `POST /aianalyst/acknowledge` | medium | `write` | ✓ | Acknowledge AI Analyst incident events. |
| `darktrace_acknowledge_ai_analyst_incident` | `POST /aianalyst/unacknowledge` | medium | `write` | ✓ | Unacknowledge AI Analyst incident events. |
| `darktrace_comment_ai_analyst_incident` | `POST /aianalyst/incident/comments` | medium | `write` | ✓ | Add a comment to an AI Analyst incident event. |
| `darktrace_create_ai_analyst_investigation` | `POST /aianalyst/investigations` | medium | `write` | ✓ | Start a manual AI Analyst investigation. |
| `darktrace_get_ai_analyst_incident_comments` | `GET /aianalyst/incident/comments` | read | `read` | ✓ | Comments on an AI Analyst incident event. |
| `darktrace_get_ai_analyst_stats` | `GET /aianalyst/stats` | read | `read` | ✓ | AI Analyst statistics. |
| `darktrace_list_ai_analyst_incidents` | `GET /aianalyst/groups` | read | `read` | ✓ | List AI Analyst incidents (groups). |
| `darktrace_list_ai_analyst_incidents` | `GET /aianalyst/incidentevents` | read | `read` | ✓ | List AI Analyst incident events. |
| `darktrace_list_ai_analyst_investigations` | `GET /aianalyst/investigations` | read | `read` | ✓ | List manual AI Analyst investigations. |
| `darktrace_pin_ai_analyst_incident` | `POST /aianalyst/pin` | medium | `write` | ✓ | Pin AI Analyst incident events. |
| `darktrace_pin_ai_analyst_incident` | `POST /aianalyst/unpin` | medium | `write` | ✓ | Unpin AI Analyst incident events. |

**✓** full evidence · **◐** partial evidence · **—** not lab-validated. Read each note for the exact scope.

## Autonomous Response (Antigena)

Literal MCP summaries (English):

- **`darktrace_antigena_action`**: Activate, extend or clear Darktrace RESPOND (Antigena) actions.
- **`darktrace_antigena_manual_action`**: Create a manual RESPOND action (e.g. quarantine or block a device).
- **`darktrace_list_antigena_actions`**: Darktrace RESPOND (Antigena) actions: list actions or the pending/active summary.

| Tool | Method and path | Tier | Profile | Lab evidence | What it does |
|---|---|---|---|---|---|
| `darktrace_antigena_action` | `POST /antigena` | critical | `critical` | ✓ | Activate, extend, clear or reactivate a response action. |
| `darktrace_antigena_manual_action` | `POST /antigena/manual` | critical | `critical` | ◐ partial: only manual `connection` blocks ran live; `pol`, `gpol` and `quarantineOutgoing` got HTTP 400 on a client-sensor device; `quarantine` and `quarantineIncoming` were not run | Create a manual response action (for example, block a connection). |
| `darktrace_list_antigena_actions` | `GET /antigena` | read | `read` | ✓ | List Autonomous Response (Antigena) actions. |
| `darktrace_list_antigena_actions` | `GET /antigena/summary` | read | `read` | ✓ | Summary of active and pending response actions. |

**✓** full evidence · **◐** partial evidence · **—** not lab-validated. Read each note for the exact scope.

## Tags

Literal MCP summaries (English):

- **`darktrace_delete_tag`**: Delete a tag definition.
- **`darktrace_list_tags`**: Tags and tagged entities: list tags, one tag, or which devices carry which tags.
- **`darktrace_manage_tags`**: Create tags and add/remove tags on devices or entities.

| Tool | Method and path | Tier | Profile | Lab evidence | What it does |
|---|---|---|---|---|---|
| `darktrace_delete_tag` | `DELETE /tags/{tid}` | critical | `critical` | — not lab-validated: applied live (read-back confirms) but the lab gateway answers HTTP 502, reported as `write_outcome_unknown` | Delete a tag. |
| `darktrace_list_tags` | `GET /tags` | read | `read` | ✓ | List tags. |
| `darktrace_list_tags` | `GET /tags/{tid}` | read | `read` | ✓ | One tag by `tid`. |
| `darktrace_list_tags` | `GET /tags/{tid}/entities` | read | `read` | ✓ | Devices with one tag. |
| `darktrace_list_tags` | `GET /tags/entities` | read | `read` | ✓ | Tags on a device, or devices with a tag. |
| `darktrace_manage_tags` | `POST /tags` | high | `write` | ✓ | Create a tag. |
| `darktrace_manage_tags` | `POST /tags/{tid}/entities` | high | `write` | ✓ | Add a tag to a device by tag ID. |
| `darktrace_manage_tags` | `DELETE /tags/{tid}/entities/{teid}` | high | `write` | — not lab-validated: applied live (read-back confirms) but the lab gateway answers HTTP 502, reported as `write_outcome_unknown` | Remove one tag assignment. |
| `darktrace_manage_tags` | `DELETE /tags/entities` | high | `write` | — not lab-validated: applied live (read-back confirms) but the lab gateway answers HTTP 502, reported as `write_outcome_unknown` | Remove a tag from a device. |
| `darktrace_manage_tags` | `POST /tags/entities` | high | `write` | ✓ | Add a tag to a device. |

**✓** full evidence · **◐** partial evidence · **—** not lab-validated. Read each note for the exact scope.

## Intel feed and subnets

Literal MCP summaries (English):

- **`darktrace_get_intel_feed`**: Read the watched-domains / intel feed list.
- **`darktrace_list_subnets`**: List monitored subnets.
- **`darktrace_update_intel_feed`**: Add or remove watched domains in the intel feed (removeall wipes the list).
- **`darktrace_update_subnet`**: Update subnet settings (label, DHCP, exclusion from monitoring).

| Tool | Method and path | Tier | Profile | Lab evidence | What it does |
|---|---|---|---|---|---|
| `darktrace_get_intel_feed` | `GET /intelfeed` | read | `read` | ✓ | Read Watched Domains (intel feed). |
| `darktrace_list_subnets` | `GET /subnets` | read | `read` | ✓ | List subnets. |
| `darktrace_update_intel_feed` | `POST /intelfeed` | critical | `critical` | ◐ partial: `addentry`, `addlist`, `expiry` (entry expired on time) and `removeentry` ran live; `hostname:true` was accepted but not read back; `iagn` and `removeall` were not run | Add or remove Watched Domains entries. |
| `darktrace_update_subnet` | `POST /subnets` | critical | `critical` | ◐ partial: only `label` and `uniqueHostnames` changes ran live | Change subnet settings. |

**✓** full evidence · **◐** partial evidence · **—** not lab-validated. Read each note for the exact scope.

## Packet captures

Literal MCP summaries (English):

- **`darktrace_download_pcap`**: Download a finished packet capture file (base64, size-bounded, never written to disk).
- **`darktrace_list_pcaps`**: List packet captures and their status.
- **`darktrace_request_pcap`**: Request a new packet capture for a connection.

| Tool | Method and path | Tier | Profile | Lab evidence | What it does |
|---|---|---|---|---|---|
| `darktrace_download_pcap` | `GET /pcaps/{filename}` | read | `sensitive` | ✓ | Download a packet capture as Base64, whole or not at all: captures above about 45 KB are refused with `output_limit_exceeded` (size and SHA-256 only). |
| `darktrace_list_pcaps` | `GET /pcaps` | read | `read` | ✓ | List packet captures. |
| `darktrace_request_pcap` | `POST /pcaps` | high | `write` | ✓ | Request a new packet capture. |

**✓** full evidence · **◐** partial evidence · **—** not lab-validated. Read each note for the exact scope.

## Advanced Search

Literal MCP summaries (English):

- **`darktrace_advanced_search`**: Advanced Search (log/event search) plus analyze/graph. query/hash = base64 of JSON {"search":"<query>","fields":[],"timeframe":"3600"} (seconds, max 604800).

| Tool | Method and path | Tier | Profile | Lab evidence | What it does |
|---|---|---|---|---|---|
| `darktrace_advanced_search` | `GET /advancedsearch/api/analyze/{field}/{analysis}/{query}` | read | `sensitive` | ✓ | Advanced Search field analysis. |
| `darktrace_advanced_search` | `GET /advancedsearch/api/graph/{graphmode}/{interval}/{query}` | read | `sensitive` | ✓ | Advanced Search graph data. |
| `darktrace_advanced_search` | `POST /advancedsearch/api/search` | read | `sensitive` | ✓ | Advanced Search query (POST form). |
| `darktrace_advanced_search` | `GET /advancedsearch/api/search/{query}` | read | `sensitive` | ✓ | Advanced Search query (GET form). |

**✓** full evidence · **◐** partial evidence · **—** not lab-validated. Read each note for the exact scope.

## Darktrace/Email

Literal MCP summaries (English):

- **`darktrace_download_email`**: Darktrace/EMAIL: download the raw message of one email (size-bounded).
- **`darktrace_email_audit_events`**: Darktrace/EMAIL: read audit events.
- **`darktrace_email_dashboard`**: Darktrace/EMAIL dashboard statistics.
- **`darktrace_email_decode_link`**: Darktrace/EMAIL: decode a rewritten link.
- **`darktrace_email_get`**: Darktrace/EMAIL: read one email record by UUID.
- **`darktrace_email_reference_data`**: Darktrace/EMAIL reference data: tags, actions, filters, audit event types.
- **`darktrace_email_search`**: Darktrace/EMAIL: search emails with a JSON criteria body.

| Tool | Method and path | Tier | Profile | Lab evidence | What it does |
|---|---|---|---|---|---|
| `darktrace_download_email` | `GET /agemail/api/ep/api/v1.0/emails/{uuid}/download` | read | `sensitive` | — not lab-validated | Size and SHA-256 of a raw email (the content is not returned). |
| `darktrace_email_audit_events` | `GET /agemail/api/ep/api/v1.0/system/audit/events` | read | `sensitive` | — not lab-validated | Email audit events. |
| `darktrace_email_dashboard` | `GET /agemail/api/ep/api/v1.0/dash/action_summary` | read | `sensitive` | — not lab-validated | Email dashboard: action summary. |
| `darktrace_email_dashboard` | `GET /agemail/api/ep/api/v1.0/dash/dash_stats` | read | `sensitive` | — not lab-validated | Email dashboard: statistics. |
| `darktrace_email_dashboard` | `GET /agemail/api/ep/api/v1.0/dash/data_loss` | read | `sensitive` | — not lab-validated | Email dashboard: data loss. |
| `darktrace_email_dashboard` | `GET /agemail/api/ep/api/v1.0/dash/user_anomaly` | read | `sensitive` | — not lab-validated | Email dashboard: user anomaly. |
| `darktrace_email_decode_link` | `GET /agemail/api/ep/api/v1.0/admin/decode_link` | read | `sensitive` | — not lab-validated | Decode a rewritten email link. |
| `darktrace_email_get` | `GET /agemail/api/ep/api/v1.0/emails/{uuid}` | read | `sensitive` | — not lab-validated | One email, including content metadata. |
| `darktrace_email_reference_data` | `GET /agemail/api/ep/api/v1.0/resources/actions` | read | `sensitive` | — not lab-validated | Email reference data: actions. |
| `darktrace_email_reference_data` | `GET /agemail/api/ep/api/v1.0/resources/filters` | read | `sensitive` | — not lab-validated | Email reference data: filters. |
| `darktrace_email_reference_data` | `GET /agemail/api/ep/api/v1.0/resources/tags` | read | `sensitive` | — not lab-validated | Email reference data: tags. |
| `darktrace_email_reference_data` | `GET /agemail/api/ep/api/v1.0/system/audit/eventTypes` | read | `sensitive` | — not lab-validated | Email reference data: audit event types. |
| `darktrace_email_search` | `POST /agemail/api/ep/api/v1.0/emails/search` | read | `sensitive` | — not lab-validated | Search emails. |

**✓** full evidence · **◐** partial evidence · **—** not lab-validated. Read each note for the exact scope.

## Not available

| Method and path | Reason |
|---|---|
| `GET /aianalyst/incidents` | Deprecated by Darktrace. Use `darktrace_list_ai_analyst_incidents`. |
| `POST /agemail/api/ep/api/v1.0/emails/{uuid}/action` | Excluded from this release: `darktrace_email_action` is not registered in any profile. Signing and request schema are unvalidated and the lab token got HTTP 403. Re-enabling it needs a reviewed schema, a signing proof with an email-licensed token and a new design review. |
