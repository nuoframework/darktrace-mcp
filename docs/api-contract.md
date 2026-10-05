# Darktrace Threat Visualizer API: contract analysis (Phase 1)

**Sources:** `openapi/darktrace-threat-visualizer.yaml` (OpenAPI 3.0.3, generated from Customer Portal docs, API 6.1) and `openapi/DIFF-sdk-vs-docs.md` (comparison against `LegendEvent/darktrace-sdk` v0.10.1).
**Method:** static reading only, with no live calls and no credentials. The machine-readable inventory is in [`operation-inventory.json`](operation-inventory.json). Line numbers (`L…`) are 1-based and point to the method key (`get:`/`post:`/`delete:`) of each operation in the spec.
**Status:** analysis only. The specs were not modified.

## 1. Summary

| Metric | Value |
|---|---|
| Total operations in spec | **79** (all accounted for below) |
| Read (no state change) | 57 (including 2 read-via-POST) |
| Write | 22 → medium 9, high 7, critical 6 |
| High data-sensitivity | 11 |
| Deprecated | 1 (`GET /aianalyst/incidents`) |
| In spec but not in SDK | 3 |
| Response codes per operation | exactly 200, 400, 401, 403 on all 79; no 404/429/5xx |
| Darktrace/EMAIL (`/agemail`) ops with undocumented params | 14 |

**Classification legend**
- *risk_tier*: `read` means no state change. `medium` means a reversible triage change (ack, pin, comment, investigate). `high` means a configuration change or a data-producing action (tags, device labels, pcap capture). `critical` means the call can block traffic, disable monitoring, destroy configuration or act on mail.
- *data_sensitivity*: `low` covers metadata and configuration. `medium` covers device and user identifiers, IPs and hostnames. `high` covers raw traffic, email content, logs, audit records and free-text comments.

## 2. Operation inventory

| # | Method | Path | Class | Risk | Data | Flags | Evidence |
|---|---|---|---|---|---|---|---|
| 1 | `GET` | `/advancedsearch/api/search/{query}` | read | read | high |  | L67 |
| 2 | `POST` | `/advancedsearch/api/search` | read (via POST) | read | high |  | L121 |
| 3 | `GET` | `/advancedsearch/api/analyze/{field}/{analysis}/{query}` | read | read | medium |  | L181 |
| 4 | `GET` | `/advancedsearch/api/graph/{graphmode}/{interval}/{query}` | read | read | medium |  | L251 |
| 5 | `GET` | `/aianalyst/groups` | read | read | medium |  | L324 |
| 6 | `GET` | `/aianalyst/incidentevents` | read | read | medium |  | L517 |
| 7 | `POST` | `/aianalyst/acknowledge` | write | medium | low |  | L722 |
| 8 | `POST` | `/aianalyst/unacknowledge` | write | medium | low |  | L775 |
| 9 | `POST` | `/aianalyst/pin` | write | medium | low |  | L828 |
| 10 | `POST` | `/aianalyst/unpin` | write | medium | low |  | L881 |
| 11 | `GET` | `/aianalyst/incident/comments` | read | read | medium |  | L934 |
| 12 | `POST` | `/aianalyst/incident/comments` | write | medium | medium |  | L981 |
| 13 | `GET` | `/aianalyst/stats` | read | read | low |  | L1036 |
| 14 | `GET` | `/aianalyst/investigations` | read | read | low |  | L1086 |
| 15 | `POST` | `/aianalyst/investigations` | write | medium | medium |  | L1165 |
| 16 | `GET` | `/aianalyst/incidents` | read | read | medium | dep no-SDK | L1238 |
| 17 | `GET` | `/antigena` | read | read | medium |  | L1351 |
| 18 | `POST` | `/antigena` | write | critical | high |  | L1480 |
| 19 | `POST` | `/antigena/manual` | write | critical | high |  | L1565 |
| 20 | `GET` | `/antigena/summary` | read | read | low |  | L1653 |
| 21 | `GET` | `/components` | read | read | low |  | L1719 |
| 22 | `GET` | `/components/{cid}` | read | read | low |  | L1761 |
| 23 | `GET` | `/cves` | read | read | low |  | L1808 |
| 24 | `GET` | `/details` | read | read | medium |  | L1857 |
| 25 | `GET` | `/deviceinfo` | read | read | medium |  | L2071 |
| 26 | `GET` | `/devices` | read | read | medium |  | L2176 |
| 27 | `POST` | `/devices` | write | high | medium |  | L2307 |
| 28 | `GET` | `/devicesearch` | read | read | medium |  | L2411 |
| 29 | `GET` | `/devicesummary` | read | read | medium |  | L2506 |
| 30 | `GET` | `/endpointdetails` | read | read | medium |  | L2551 |
| 31 | `GET` | `/enums` | read | read | low |  | L2637 |
| 32 | `GET` | `/filtertypes` | read | read | low |  | L2677 |
| 33 | `GET` | `/intelfeed` | read | read | low |  | L2718 |
| 34 | `POST` | `/intelfeed` | write | critical | medium |  | L2783 |
| 35 | `GET` | `/mbcomments` | read | read | medium |  | L2903 |
| 36 | `GET` | `/metricdata` | read | read | medium |  | L2974 |
| 37 | `GET` | `/metrics` | read | read | low |  | L3125 |
| 38 | `GET` | `/metrics/{mlid}` | read | read | low |  | L3170 |
| 39 | `GET` | `/models` | read | read | low |  | L3220 |
| 40 | `GET` | `/models/{pid}` | read | read | low |  no-SDK | L3272 |
| 41 | `GET` | `/modelbreaches` | read | read | medium |  | L3323 |
| 42 | `GET` | `/modelbreaches/{pbid}` | read | read | medium |  no-SDK | L3539 |
| 43 | `GET` | `/modelbreaches/{pbid}/comments` | read | read | medium |  | L3760 |
| 44 | `POST` | `/modelbreaches/{pbid}/comments` | write | medium | medium |  | L3809 |
| 45 | `POST` | `/modelbreaches/{pbid}/acknowledge` | write | medium | low |  | L3864 |
| 46 | `POST` | `/modelbreaches/{pbid}/unacknowledge` | write | medium | low |  | L3931 |
| 47 | `GET` | `/network` | read | read | medium |  | L3998 |
| 48 | `GET` | `/pcaps` | read | read | low |  | L4149 |
| 49 | `POST` | `/pcaps` | write | high | high |  | L4181 |
| 50 | `GET` | `/pcaps/{filename}` | read | read | high |  | L4248 |
| 51 | `GET` | `/similardevices` | read | read | medium |  | L4287 |
| 52 | `GET` | `/status` | read | read | low |  | L4358 |
| 53 | `GET` | `/subnets` | read | read | low |  | L4419 |
| 54 | `POST` | `/subnets` | write | critical | medium |  | L4484 |
| 55 | `GET` | `/summarystatistics` | read | read | low |  | L4614 |
| 56 | `GET` | `/tags` | read | read | low |  | L4714 |
| 57 | `POST` | `/tags` | write | high | low |  | L4768 |
| 58 | `GET` | `/tags/{tid}` | read | read | low |  | L4833 |
| 59 | `DELETE` | `/tags/{tid}` | write | critical | low |  | L4886 |
| 60 | `GET` | `/tags/entities` | read | read | low |  | L4937 |
| 61 | `POST` | `/tags/entities` | write | high | low |  | L5001 |
| 62 | `DELETE` | `/tags/entities` | write | high | low |  | L5057 |
| 63 | `GET` | `/tags/{tid}/entities` | read | read | low |  | L5106 |
| 64 | `POST` | `/tags/{tid}/entities` | write | high | low |  | L5170 |
| 65 | `DELETE` | `/tags/{tid}/entities/{teid}` | write | high | low |  | L5241 |
| 66 | `GET` | `/agemail/api/ep/api/v1.0/admin/decode_link` | read | read | medium |  | L5296 |
| 67 | `GET` | `/agemail/api/ep/api/v1.0/dash/action_summary` | read | read | low |  | L5321 |
| 68 | `GET` | `/agemail/api/ep/api/v1.0/dash/dash_stats` | read | read | low |  | L5346 |
| 69 | `GET` | `/agemail/api/ep/api/v1.0/dash/data_loss` | read | read | low |  | L5371 |
| 70 | `GET` | `/agemail/api/ep/api/v1.0/dash/user_anomaly` | read | read | low |  | L5396 |
| 71 | `POST` | `/agemail/api/ep/api/v1.0/emails/{uuid}/action` | write | critical | high |  | L5421 |
| 72 | `GET` | `/agemail/api/ep/api/v1.0/emails/{uuid}` | read | read | high |  | L5460 |
| 73 | `GET` | `/agemail/api/ep/api/v1.0/emails/{uuid}/download` | read | read | high |  | L5492 |
| 74 | `POST` | `/agemail/api/ep/api/v1.0/emails/search` | read (via POST) | read | high |  | L5524 |
| 75 | `GET` | `/agemail/api/ep/api/v1.0/resources/tags` | read | read | low |  | L5556 |
| 76 | `GET` | `/agemail/api/ep/api/v1.0/resources/actions` | read | read | low |  | L5581 |
| 77 | `GET` | `/agemail/api/ep/api/v1.0/resources/filters` | read | read | low |  | L5606 |
| 78 | `GET` | `/agemail/api/ep/api/v1.0/system/audit/eventTypes` | read | read | low |  | L5631 |
| 79 | `GET` | `/agemail/api/ep/api/v1.0/system/audit/events` | read | read | high |  | L5656 |

### Critical writes (should be disabled by default in any MCP surface)
- `POST /antigena`: activates, extends or clears RESPOND actions.
- `POST /antigena/manual`: manual quarantine or block of a device.
- `POST /intelfeed`: `removeall` wipes the watched-domains list, and `iagn` can trigger RESPOND.
- `POST /subnets`: `excluded` and `modelExcluded` can silently remove monitoring coverage.
- `POST /agemail/.../emails/{uuid}/action`: acts on mail, and the body schema is not defined.
- `DELETE /tags/{tid}`: deletes a tag definition. Tags can scope models and RESPOND.

## 3. Authentication and signing ambiguities

The spec (L15–L21) defines `DTAPI-Signature = HMAC-SHA1(private, "<path+query>\n<public>\n<date>")`, with `DTAPI-Date` allowed to drift ±30 min.

| ID | Ambiguity | Evidence | Impact |
|---|---|---|---|
| S1 | The global rule (L20) says the signed `<path+query>` is the query string "exactly as sent". The `/devicesearch` note (L2424) contradicts it: values are **signed unencoded** but **sent percent-encoded**. It is unclear which rule applies elsewhere. | spec L20, L2424; DIFF §Autenticación | Signatures will mismatch if the signer encodes. The behaviour depends on the server decoding the query before it verifies the signature. |
| S2 | Query parameter **order** must match between the signed string and the sent request. The docs do not say whether the server canonicalises the order. | spec info.description | HTTP clients that reorder params break signatures. |
| S3 | POST: the body is appended as `?a=b&c=d` (form) or `?{json}` (JSON). The **exact JSON serialisation** (key order, whitespace, separators) is unspecified. | spec L20–L21 | The signed bytes must equal the sent bytes, so the client has to serialise once and reuse those bytes. |
| S4 | POST with **both** query params and a JSON body: the SDK signs `path?a=1&{json}`. The docs do not define this format. | DIFF §Autenticación | Unknown whether the server accepts it. This affects `responsedata` on POST endpoints. |
| S5 | DELETE with query params (`DELETE /tags/entities?did=&tag=`): signing is not described. | spec L5057 (`DELETE /tags/entities`) | It is assumed to follow the GET rule. This is unverified. |
| S6 | Advanced Search: standard base64 in the **path** can contain `/`, `+` and `=`. It is unclear whether the base64 is signed before or after it is percent-encoded. | DIFF; spec L67, L181, L251 | Queries can produce intermittent 401/404 errors depending on their content. |
| S7 | Two `DTAPI-Date` formats are accepted (`20230101T120000` and `2023-01-01 12:00:00`), and the timezone is stated as UTC. The handling of other formats is unknown. | spec L15 | The client should pin one format and test clock skew at ±29 and ±31 min. |
| S8 | HMAC-SHA1 is fixed and there is no algorithm negotiation. | spec | Compatibility constraint only. No action needed. |
| S9 | `/agemail` endpoints: it is unknown whether they use the same signing scheme. The portal doc lists only the paths. | spec L5295–L5679 | Needs confirmation from the instance spec `/agemail/api/api-docs`. |

## 4. Schema gaps

1. **Error responses are only partly documented.** I checked this mechanically: all 79 operations declare exactly `200`, `400`, `401` and `403`, and none declares `404`, `429` or any `5xx`. Only `200` and `400` carry a body schema (`400` uses `ErrorResponse`). `401` ("invalid signature, token or date") and `403` ("missing permission") have a description only, with no body schema. Not-found, rate-limit and server-error behaviour is unspecified, even though `/devicesummary` returns 500 per SDK issue #37.
2. **Open or untyped 200 schemas:** `GET /devices`, `/intelfeed`, `/endpointdetails`, `/advancedsearch/api/analyze/...` and `/advancedsearch/api/graph/...` (and binary `GET /pcaps/{filename}`), plus all 14 `/agemail` operations, which are typed only as `object`. The response shape varies with flags (`minimal`, `fulldevicedetails`, `deviceattop`, `historicmodelonly`, `responsedata`). The spec models this as several named schemas but does not use `oneOf` or a discriminator.
3. **`/agemail` request parameters and bodies are empty.** Both POST bodies (`emails/{uuid}/action` and `emails/search`) have no properties.
4. **Parameters that appear only in notes or examples:** `metric1..N` on `/metricdata`, `did` as required on `/similardevices`, the path forms `/models/{pid}` and `/modelbreaches/{pbid}`, `did` on `/antigena` and `fulldevicedetails` on `/modelbreaches` (DIFF §1, §3).
5. **`responsedata` is inconsistent:** it is present on most GETs but absent on `/intelfeed` and `/pcaps*`.
6. **Units and formats are unspecified** for several fields: `duration` (seconds?) on `/antigena`, `/antigena/manual` and `/tags/entities`; `investigateTime` (epoch s or ms?); and time params, where the docs mix epoch ms with string `from`/`to`.
7. **Enums are missing** for `action` on `/antigena/manual`, `entityType` on `/tags/{tid}/entities` and the email actions.
8. **Partial-update semantics are undefined** for `POST /devices` and `POST /subnets`: it is not stated whether omitted fields are left unchanged or reset.
9. **No pagination contract.** There are no cursors or totals. Limits rely on `count`/`size`/`limit`-style params, which vary by endpoint.
10. **Binary response:** `GET /pcaps/{filename}` returns `application/vnd.tcpdump.pcap` with no size bound. The response type for the email download is unspecified.
11. **The spec describes itself as non-exhaustive:** Darktrace documents its response tables as such (info.description).

## 5. Compatibility requirements

- **Version baseline.** The spec documents 6.1. The SDK has been exercised on 6.3 and 7.0.42, where it reports two regressions: comment POST returns SUCCESS but the comment is not saved, and `summarystatistics?hours=` returns 400. The client must detect the version through `GET /status` and keep a per-version quirk table.
- **Target vs documented version (coordinator, 2026-10-05).** The lab instance is **Darktrace 7.1**. This analysis is based on the 6.1 spec only. Every operation, flag and quirk must be tracked separately as *documented in 6.1* and *validated on 7.1*. Nothing in this document has been validated on 7.1 yet, and lab write permissions are still pending.
- **Content type.** For `/devices`, `/intelfeed`, `/subnets` and `/modelbreaches/{pbid}/(un)acknowledge`, JSON is supported since 6.0 and form encoding is also accepted. JSON should be the default. `/aianalyst/(un)acknowledge`, `/aianalyst/(un)pin` and `POST /tags/entities` are documented **form-only**.
- **Case sensitivity.** The docs use `investigationId`; the SDK uses `investigationid`. Server case sensitivity is unknown, so the client should send the documented casing exactly.
- **Equivalent forms.** `/modelbreaches/{pbid}` is equivalent to `?pbid=`, and `/models/{pid}` to `?uuid=`/`?pid=`. The client should pick one canonical form per operation.
- **Array params** (`saasfilter`, `protocol`) should be sent as repeated keys. That form also has to be signed identically.
- **Deprecated endpoint.** `GET /aianalyst/incidents` should not be exposed. `/aianalyst/incidentevents` is the replacement.
- **Darktrace/EMAIL** must be generated from or validated against the instance's own OpenAPI. The portal spec is insufficient for it.
- **Known SDK bugs not to replicate:** `responsedata` in the body of `POST /subnets`, `size` dropped in Advanced Search, invented `/devicesummary` params and `tag_id=0` falling back to listing all tags (DIFF §Resumen).

## 6. Test requirements

All of the following tests can run offline. Live tests are only allowed against a designated lab instance with explicit approval.

1. **Signature vectors:** known-answer HMAC tests for GET without a query; GET with spaces and quotes (S1); repeated array keys (S2); POST form; POST JSON with fixed serialisation (S3); POST with query plus JSON (S4); DELETE with a query (S5); Advanced Search base64 containing `+/=` (S6); and both date formats (S7).
2. **Contract tests:** every request built by the client validates against the spec. For each of the 79 operations, a 200 fixture and a 400 fixture deserialise successfully. Flag variants (`minimal`, `fulldevicedetails`, …) map to the named schemas.
3. **Coverage gate:** a test asserts that the set of `(method, path)` pairs in `operation-inventory.json` equals the set in the spec. It fails on drift.
4. **Safety tests for writes:** all 22 writes need explicit opt-in and are disabled by default. The 6 critical writes also need a second policy flag and support a dry-run that returns the signed request without sending it. Tests must also cover idempotency and replay for ack/unack and pin/unpin.
5. **Redaction and size:** the 11 high-sensitivity operations need output size caps, binary handling (pcap, email download) and tests showing that no secrets or tokens appear in logs or errors.
6. **Error mapping:** tests for the documented 400 (`ErrorResponse`) and for 401 and 403, which have no body schema, so the client must tolerate an empty or unknown body. There must also be tests for the undocumented 404, 429 and 5xx responses, including the `/devicesummary` 500 and the clock-skew 401.
7. **Version quirk tests:** cover the 7.x comment no-op and the `summarystatistics?hours=` 400.

## 7. Unresolved questions

1. Which rule wins for query signing: the global "exactly as sent" (L20), or the `/devicesearch` "signed unencoded, sent encoded" (L2424) (S1)?
2. Does the server canonicalise the order of query params (S2)?
3. Which signature format is accepted for a POST with both query params and a JSON body (S4)? Does `responsedata` on a POST belong in the query or in the body?
4. How is a DELETE with a query string signed (S5)?
5. Should the Advanced Search base64 be URL-safe, and is it signed encoded or decoded (S6)?
6. Do `/agemail` endpoints use the same HMAC scheme, and what are their parameter and body schemas? (Fetch `/agemail/api/api-docs` from a lab instance.)
7. Is the server case-sensitive for query names (`investigationId` vs `investigationid`)?
8. Does `/devicesummary` work with API tokens at all (SDK #37)?
9. Is `did` required on `/similardevices`?
10. What are the units and defaults for `duration` and `investigateTime`, and what are the enums for `/antigena/manual action`, `entityType` and the email actions?
11. Does `POST /devices` or `POST /subnets` reset fields that are omitted?
12. Does `DELETE /tags/{tid}` cascade to entity assignments? Is `tag` in `DELETE /tags/entities` a name or an id?
13. What body does the API return for 401 and 403? Does it ever return 404, 429 or 5xx, and what rate limits apply?
14. (Lab is 7.1.) Are the 7.x regressions (comment persistence, `summarystatistics?hours=`) confirmed, and which target version(s) must be supported?
15. Is `POST /pcaps` asynchronous, how is completion signalled, and what are the maximum capture window and size?
