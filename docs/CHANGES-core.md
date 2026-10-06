# Core changes: full Darktrace API behind operator profiles

Technical summary of the `feat/full-api` core work (branch of `feat/full-api-easy-install`). Operator-facing
documentation is maintained separately; this file records the decisions, semantics and evidence.

## 1. Surface

- Every catalogue operation except the deprecated `GET /aianalyst/incidents` is callable: **78 of 79**.
  The catalogue generator (`scripts/generate-catalogue.ts`) no longer emits `blocked`; status is
  `implemented` or `excluded`. Each row carries `requiredProfiles`.
- The code-owned ceiling in `src/policy/release-capability.ts` is now a route binding: an operation is
  callable only when its id, method, path template, tier, sensitivity and status match the generated
  catalogue row. Forged descriptors are denied.
- Darktrace/EMAIL parameters are not in the portal 6.1 spec. Names and types come from the static
  `openapi/darktrace-sdk.yaml` inventory (LegendEvent/darktrace-sdk v0.10.1). The descriptions and bounds
  are code-owned (`days` 1..365, `limit` 1..1000, `offset` 0..100000). The email search/action bodies are
  typed `object, additionalProperties:true`. They are accepted as bounded free-form JSON: keys must match
  `[A-Za-z0-9_.-]{1,128}`, strings are capped at 8192 characters and arrays at 100 items, and depth,
  element count and byte size are bounded by the tool input budget.
- Single-value time/duration fields with an undocumented format (`iptime`, `investigateTime`, `expiry`,
  `duration`, `expiryDuration`) are forwarded as opaque values. Strings must match
  `[0-9A-Za-z:.+\- ]{1,64}`; integers keep their numeric bounds. Paired range fields with unknown units
  stay blocked.
- Tool descriptions are code-owned (`src/tools/descriptions.ts`). Each one has one sentence of purpose,
  one line per operation, the profile it needs and the critical-write procedure. Operations without lab
  evidence are flagged "Not lab-validated". Read-only multi-operation tools default to their single
  listing operation (for example `darktrace_list_model_breaches` with `{}` runs `get_modelbreaches`).
- Annotations: `readOnlyHint` only for all-read tools, `destructiveHint` for high/critical,
  `idempotentHint` only for all-GET tools.

### Operations enabled by this change

Tier and the profile(s) each one needs:

| Operation | Tier | Profiles |
|---|---|---|
| get_components, get_components_cid, get_cves, get_deviceinfo, get_devicesummary, get_enums, get_filtertypes, get_metricdata, get_metrics, get_metrics_mlid, get_modelbreaches_pbid, get_modelbreaches_pbid_comments, get_models, get_models_pid, get_network, get_pcaps, get_summarystatistics, get_tags, get_aianalyst_incident_comments | read | read |
| get_advancedsearch_api_search_query, post_advancedsearch_api_search, get_advancedsearch_api_analyze_field_analysis_query, get_advancedsearch_api_graph_graphmode_interval_query | read | read + sensitive |
| 13 Darktrace/EMAIL reads (dash, resources, audit, emails/{uuid}, download, decode_link, emails/search) | read | read + sensitive |
| get_pcaps_filename | read (file) | read + sensitive |
| post_aianalyst_acknowledge/unacknowledge/pin/unpin, post_aianalyst_incident_comments, post_aianalyst_investigations, post_modelbreaches_pbid_acknowledge/unacknowledge, post_modelbreaches_pbid_comments | medium | write |
| post_devices, post_pcaps, post_tags, post_tags_entities, post_tags_tid_entities, delete_tags_entities, delete_tags_tid_entities_teid | high | write |
| post_antigena, post_antigena_manual, post_intelfeed, post_subnets, delete_tags_tid, post_agemail_api_ep_api_v1_0_emails_uuid_action | critical | write + critical |

Per profile, tools/operations listed: read 27/38, read+sensitive 36/56, read+write 36/54,
read+write+critical 42/60, all 51/78.

## 2. Profiles and configuration (operator-only)

| Setting | Values | Default |
|---|---|---|
| `DARKTRACE_PROFILES` | comma list of `read`, `sensitive`, `write`, `critical` (each at most once), or `all` alone (= all four) | unset = `read` |
| `DARKTRACE_SENSITIVE_READ` | `true`/`false` (legacy override, applied after the list) | – |
| `DARKTRACE_WRITE_CRITICAL` | `true`/`false` (legacy override, applied after the list) | – |
| `DARKTRACE_CRITICAL_APPROVAL` / `profiles.criticalApproval` | `elicitation` or `host` | `elicitation` |
| `DARKTRACE_WRITE_APPROVAL` / `profiles.writeApproval` | `elicitation` or `host` | `host` |
| `DARKTRACE_MAX_WRITES_PER_MINUTE` / `limits.maxWritesPerMinute` | 1..60 | 10 |
| config file `profiles.{read,write,sensitiveRead,writeCritical}` | booleans | read only |

- `read` is always on. When `DARKTRACE_PROFILES` is set it replaces the file's four profile flags, so an
  operator can narrow without editing the file. The legacy booleans and the approval variables then apply.
- `critical` requires `write`. `critical` without `write` is a startup error in every mode (stdio, `doctor`,
  `--check-config`). The old rejections "write unavailable in this release" and "sensitiveRead and write
  cannot be enabled together" are removed.
- `DARKTRACE_EMAIL`, `DARKTRACE_EXPORT_DIR`, `profiles.email`, `profiles.export` stay forbidden. Email
  reads count as `sensitive` and the email action as `critical`.
- Sensitive reads are Advanced Search, every Darktrace/EMAIL read, and every read classified high
  sensitivity (PCAP download, email content, audit events).
- `--check-config` / `doctor` print
  `{ok,transport,registeredTools,profiles:{read,sensitive,write,critical},approval:{critical,write},networkProbe:false,labValidated:false}`.

## 3. Execution semantics

- **Read**: executes.
- **Medium/high write**: executes directly when `write` is enabled. `dryRun:true` returns the value-free
  preview with a `previewId`. Passing a `previewId` is optional; if one is passed it must match.
- **Critical write** (`write` + `critical`):
  1. A call without `confirm:true` returns the preview plus `confirmationRequired:true`, a hint and a
     single-use `previewId`. The id expires after 5 minutes and is bound to SHA-256(operationId + canonical
     validated path/query/body/contentType).
  2. Execution requires `confirm:true` **and** the matching `previewId`. Changed arguments, an expired or
     reused id, or no id only produce a fresh preview.
  3. **Human approval** (default `criticalApproval=elicitation`): the server sends MCP `elicitation/create`
     (form mode, empty schema) with a code-owned summary. The summary shows the operation, method, path
     template and the proposed field values, each bounded to 160 characters, neutralized and token-redacted.
     The request executes only on an explicit `accept`. `decline`, `cancel`, a transport error, a 120 s
     timeout, a client without the elicitation capability, or a 2026-07-28-era session (where the SDK
     forbids push elicitation) all mean **no audit and no request**. The result then carries
     `executed:false, approval:<decision>` and an operator hint. A bare 2025-06 `elicitation: {}`
     declaration counts as form support.
  4. `criticalApproval=host` lets an operator rely on the MCP host's own per-tool approval prompt instead
     (`destructiveHint`). `confirm:true` and `previewId` are still required. The model can never set any
     approval mode: unknown arguments are rejected by the strict schemas.
- `writeApproval=elicitation` applies the same dialog to medium/high writes.
- **Rate limits**: non-GET operations have their own rolling-minute budget per server process
  (`maxWritesPerMinute`, default 10, ceiling 60), plus a fixed 3 critical writes per minute. When the
  budget is exceeded the result is `errorCode:"rate_limited"` with no audit and no network call. The
  existing global request limit still applies.
- **Audit**: every executing write is pre-audited (awaited, fail-closed) and post-audited. An upstream
  failure after the pre-audit returns `outcome:"unknown"` (with the safe `errorCode`) and "Do not
  automatically repeat this action". Audit lines now carry `seq`, `prevHash` and `hash`:
  `hash = SHA-256(canonical record without hash)`, and the chain starts at 64 zeros. The chain is
  per-process and spans every call. `verifyAuditChain()` in `src/observability/audit.ts` detects edits and
  gaps. Redaction is unchanged.

## 4. Signing choices (S4/S5/S6, email)

All follow `LegendEvent/darktrace-sdk` v0.10.1 (`darktrace/auth.py`, `dt_utils.py`,
`dt_advanced_search.py`, `dt_tags.py`), as compared in `openapi/DIFF-sdk-vs-docs.md`:

- **S4 query + JSON body**: signed as `path?query&{compact json}` (`auth.get_headers` with params and
  json_body). The JSON bytes are serialized once and sent exactly as signed. No current catalogue operation
  combines both, so this is only covered by unit tests.
- **S5 DELETE with query** (`DELETE /tags/entities?did=&tag=`): signed like a GET, `path?query`
  (`dt_utils._delete`). The query-encoding mode (`querySignatureEncoding`) applies as for GET. DELETE
  bodies are still rejected.
- **S6 Advanced Search GET**: the standard Base64 document goes **verbatim** into the path, with `/`, `+`
  and `=` literal, and is signed verbatim (`dt_advanced_search.search(post_request=False)` and `requests`
  leave these characters unencoded). Only the parameter named `query` of the three `/advancedsearch/api/...`
  GET routes takes this path. It must be strict Base64 (`[A-Za-z0-9+/]+={0,2}`, length divisible by 4, no
  leading `/`, at most 21,848 characters), and its decoded document still passes `validateSearchHash` /
  `SearchSchema`. The signer's path validation is unchanged: it rejects `.`/`..` segments, backslashes,
  `?`, `#`, whitespace and control characters. The POST `{hash}` form is still preferred in tool
  descriptions.
- **Darktrace/EMAIL**: same HMAC scheme over path + ordered query (SDK `DarktraceEmail` uses the shared
  `_get`/`_post_json`).
- **PCAP / raw email download**: requested with `accept:'binary'`. The client reads at most
  `maxResponseBytes` bytes (2 MiB hard cap). Nothing is written to disk. The tool returns `file:{name,
  mediaType, sizeBytes, sha256, encoding:'base64'|'utf8', content…}`. Content beyond the tool-output budget
  (60,000 characters, counting both result copies) is cut and marked `partial:true`. A JSON status answer
  (for example a PCAP that is not ready yet) is returned as data.

## 5. Response views

- The code-owned allowlist `src/api/response-fields.json` stays authoritative and has been widened
  explicitly per operation. Examples: devices gain os/typename/typelabel/devicelabel/time/endtime/quarantine;
  breaches gain `device`; AI Analyst, antigena, tags, subnets, status, models, pcaps, details and endpoint
  details also gain fields. Credentials, custom fields, history and Kibana internals are excluded. The
  `unsafe` key regex, the 16 KiB string cap, the 1000-item cap, `unmodeledFieldsOmitted` and the neutralizer
  are unchanged.
- Spec-untyped nested nodes inside allowlisted fields keep scalars and scalar lists. Free-form maps pass
  only where unreviewed passthrough is allowed (see below); otherwise they get the fixed summary.
- When there is no reviewed view, a bounded passthrough (key-redacted, neutralized, `unreviewedView:true`)
  is allowed **only** for low-sensitivity reads and for operations that already require the `sensitive`
  profile. The email action has a code-owned status-only view. A test asserts that every enabled operation
  has a view, is one of those two cases, or is a file download.
- For Advanced Search only, aggregation objects matching no documented key are kept, bounded.
- Oversized results no longer collapse to `{truncated:true}`. The largest arrays anywhere in the data are
  trimmed by binary search to what fits, and the result reports `truncated`, `returnedItems`/`totalItems`
  (and `truncatedField`, or `truncatedFields` for several cuts).

## 6. Live lab validation (Darktrace 7.1.0, 2026-10-06)

Run through the production stdio MCP path (`dist/src/index.js`, protocol 2025-06-18, client advertising
elicitation) against the lab appliance. No data contents are recorded here.

### Reads

| Operation | Result | Notes |
|---|---|---|
| status, devices, devicesearch, subnets, similardevices, deviceinfo, devicesummary, network, details, metricdata, summarystatistics, endpointdetails, intelfeed | PASS | devicesummary large: partial-result trimming verified |
| modelbreaches, modelbreaches/{pbid}, mbcomments, modelbreaches/{pbid}/comments | PASS | |
| metrics, metrics/{mlid}, models/{pid}, components/{cid} | PASS | |
| models, components, enums | PASS with `responsedata` | full lists exceed the 2 MiB response cap (`too_large`); use `responsedata` or the `{id}` forms |
| aianalyst groups, incidentevents, stats, investigations, incident/comments | PASS | |
| antigena, antigena/summary, tags, tags/{tid}, tags/{tid}/entities, tags/entities | PASS | |
| pcaps | PASS | |
| cves | FAIL (HTTP 500) | appliance-side error; not lab-validated |
| filtertypes | FAIL (HTTP 302) | lab returns a redirect for this token; redirects are never followed |

### Sensitive reads

| Operation | Result | Notes |
|---|---|---|
| POST advancedsearch/api/search | PASS | |
| GET advancedsearch/api/search/{base64} | PASS | including a document whose Base64 contains `+` and `/`, which confirms the S6 signing choice |
| GET advancedsearch analyze, graph | PASS | aggregations kept via the bounded fallback |
| pcaps/{filename} | PASS | 79,725-byte capture; base64 prefix + size + SHA-256 returned |
| 11 Darktrace/EMAIL routes tried (dash ×4, resources ×3, audit eventTypes/events, emails/search, decode_link) | HTTP 403 | lab token lacks the email permission (or module); signing not provable; not lab-validated. emails/{uuid}, download and action were not attempted (no test email) |

### Writes (reversible; profile write; audit chain seq 1..20 intact)

| Operation | Result | Revert |
|---|---|---|
| post_tags (`mcp-test-<ts>`) | PASS | deleted via delete_tags_tid (below) |
| post_tags_entities (form) | PASS | removed via delete_tags_entities |
| delete_tags_entities (S5) | effect applied, appliance answered **HTTP 502** → `outcome:"unknown"` | verified untagged |
| post_tags_tid_entities | PASS | removed via delete_tags_tid_entities_teid |
| delete_tags_tid_entities_teid | effect applied, non-2xx → `outcome:"unknown"` | verified empty |
| post_aianalyst_acknowledge → unacknowledge | PASS | restored |
| post_aianalyst_unpin → pin | PASS | restored (was pinned) |
| post_modelbreaches_pbid_acknowledge → unacknowledge | PASS | restored |
| post_modelbreaches_pbid_comments, post_aianalyst_incident_comments | PASS (`[mcp-test]` prefix) | comments cannot be deleted through the API |
| write rate limit | the 11th write within a minute was refused with `rate_limited` and no request | – |

Not executed (not reversible): post_devices, post_pcaps, post_aianalyst_investigations.

### Critical writes (owner-approved; profile all; elicitation accept)

| Operation | Decline check | Accept | Revert |
|---|---|---|---|
| delete_tags_tid (test tag) | decline → `executed:false`, tag still present | effect applied (tag gone), appliance non-2xx → `outcome:"unknown"` | n/a (cleanup of our tag) |
| post_antigena_manual (did 411, `connection` block to TEST-NET 203.0.113.250:9, 60 s) | decline → no request, no audit | PASS (codeid 48) | post_antigena `clear:true` PASS → `active:false, cleared:true` |
| post_intelfeed add `mcp-test-<ts>.invalid` | – | PASS | `removeentry` PASS; feed back to empty |
| post_subnets sid 12 label → `mcp-test-<ts>` | – | PASS | label restored to the exact prior value `192.168.144.0/24` (verified) |
| email action | skipped | – | email API forbidden for the lab token, no test email |

Observation: on this lab, DELETE routes apply the change but answer with a non-2xx status (502 seen for
`/tags/entities`). The MCP correctly reports `outcome:"unknown"` and tells the model to verify with a read
before any retry. DELETE operations are therefore not marked lab-validated.

`validatedOn: ["7.1"]` is recorded in the generated catalogue for 56 operations: the 19 earlier bounded
recipes plus every clean PASS above.

## 7. Risks and unvalidated assumptions

- Email signing, the email parameter names (from the SDK, not from an instance `/agemail/api/api-docs`),
  and the free-form email bodies are unproven: the lab answered 403.
- S4 (query + JSON) has no live evidence; no catalogue operation uses it.
- S6 depends on the appliance and any proxy keeping `//`, `+` and `=` in paths unchanged. It worked on the
  lab, but a proxy that normalizes `//` would break GET searches. POST search is preferred.
- Elicitation needs a 2025-era protocol session and a host that implements form elicitation. Otherwise
  critical writes are refused unless the operator chooses `criticalApproval=host`.
- Preview ids, the write-rate windows and the audit chain are in memory per process. A restart resets them,
  and the audit chain can only prove integrity within one process's stderr stream.
- The opaque time fields (`expiry`, `investigateTime`, …) are forwarded without unit knowledge.
- Large list endpoints (models, components, enums) exceed the 2 MiB response cap without `responsedata`.
- The full-API tool-contract fixture (`test/security/fixtures/mcp-tool-contracts-full-api.json`) and its
  pins in `scripts/verify-release.mjs` were generated by this change and need independent review. CI
  source/runtime hash pins must be recomputed after merging other branches.
