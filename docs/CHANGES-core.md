# Core changes: full Darktrace API behind operator profiles

Technical summary of the `feat/full-api` core work (branch of `feat/full-api-easy-install`). Operator-facing
documentation is maintained separately; this file records the decisions, semantics and evidence.

## 1. Surface

- Every catalogue operation except the deprecated `GET /aianalyst/incidents` and the blocked email action is
  callable: **77 of 79** (77 `implemented`, 1 `blocked`, 1 `excluded`). The email action
  (`post_agemail_api_ep_api_v1_0_emails_uuid_action`) is `blocked` with reason "signing and schema
  unvalidated; 403 on lab" (see §8.6); it stays listed in the coverage report. Each row carries
  `requiredProfiles`; every Darktrace/EMAIL row also carries `schemaSha256`/`schemaVersion`/`schemaProvenance`.
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
| post_antigena, post_antigena_manual, post_intelfeed, post_subnets, delete_tags_tid | critical | write + critical |
| post_agemail_api_ep_api_v1_0_emails_uuid_action | blocked (§8.11 E1) | never published or executed |

Per profile, tools/operations listed: read 27/38, read+sensitive 36/56, read+write 36/54,
read+write+critical 41/59, all 50/77, read+sensitive+write 45/72. Approval-description
variants preserve their base profile's tools/operations counts.

## 2. Profiles and configuration (operator-only)

| Setting | Values | Default |
|---|---|---|
| `DARKTRACE_PROFILES` | comma list of `read`, `sensitive`, `write`, `critical` (each at most once), or `all` alone (= all four) | unset = `read` |
| `DARKTRACE_SENSITIVE_READ` | `true`/`false` (legacy; with `DARKTRACE_PROFILES` it may only agree or narrow, §8.12) | – |
| `DARKTRACE_WRITE_CRITICAL` | `true`/`false` (legacy; with `DARKTRACE_PROFILES` it may only agree or narrow, §8.12) | – |
| `DARKTRACE_CRITICAL_APPROVAL` / `profiles.criticalApproval` | `elicitation` or `host` | `elicitation` |
| `DARKTRACE_WRITE_APPROVAL` / `profiles.writeApproval` | `elicitation` or `host` | `host` |
| `DARKTRACE_MAX_WRITES_PER_MINUTE` / `limits.maxWritesPerMinute` | 1..10 (lower-only) | 10 |
| `DARKTRACE_PROTECTED_TARGETS` / `policy.protectedTargets` | comma list / array of literal identifiers | none |
| `DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE` / `profiles.acknowledgeSensitiveWrite` | `true`/`false`; required `true` when sensitive and write are both on | `false` |
| `DARKTRACE_ACKNOWLEDGE_HOST_APPROVAL` / `profiles.acknowledgeHostApproval` | `true`/`false`; required `true` with `critical` + `criticalApproval=host` | `false` |
| config file `profiles.{read,write,sensitiveRead,writeCritical}` | booleans | read only |

- `read` is always on. When `DARKTRACE_PROFILES` is set it replaces the file's four profile flags, so an
  operator can narrow without editing the file. The approval variables then apply; a legacy boolean that would
  add a capability missing from the list is a startup error (`... conflicts with DARKTRACE_PROFILES`, §8.12).
- `critical` requires `write`. `critical` without `write` is a startup error in every mode (stdio, `doctor`,
  `--check-config`). The old rejection "write unavailable in this release" is removed. The sensitive+write
  union (including `all`) starts only with `DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE=true` (§8.9).
- `DARKTRACE_EMAIL`, `DARKTRACE_EXPORT_DIR`, `profiles.email`, `profiles.export` stay forbidden. Email
  reads count as `sensitive` and the email action as `critical`.
- Sensitive reads are Advanced Search, every Darktrace/EMAIL read, and every read classified high
  sensitivity (PCAP download, email content, audit events).
- `--check-config` / `doctor` print
  `{ok,transport,registeredTools,profiles:{read,sensitive,write,critical},approval:{critical,write},networkProbe:false,labValidated:false}`.

## 3. Execution semantics

Superseded by the writes remediation; the normative description is §8. In short:

- **Read**: executes. Sensitive reads return only code-owned views (no unreviewed passthrough).
- **Medium/high write**: executes directly when `write` is enabled. `dryRun:true` returns the value-free
  preview `{dryRun,operationId,method,parameterNames}` (no handle).
- **Critical write** (`write` + `critical`): `dryRun:true` returns the preview plus a single-use `previewId`
  and `expiresAt` (5 minutes). Execution needs `confirm:true`, the matching `previewId` and, by default, a
  human `accept` with `approved:true` in an MCP elicitation dialog.
- Every refusal is a code-owned denial `{error:{code,message},errorCode,hint?}`; see §8.1.

## 4. Signing choices (S4/S5/S6, email)

> **Corrected 2026-10-06 (final gate blocker B6).** The first version of this section described the original
> SDK-derived choices: S6 Base64 sent and signed **verbatim**, S4 signed as `path?query&{json}`, and over-budget
> PCAP content cut and marked `partial:true`. CR-02, CR-03 and §8.9 replaced all three before the 1.1.0
> candidate, and the earlier text contradicted the code. The bullets below describe the reviewed `src/` tree
> (`5b1208f1…fdc503e`), with file:line evidence. The original choices are kept, marked as superseded, at the end.
> No re-test was done for this correction.

Baseline: `LegendEvent/darktrace-sdk` v0.10.1 (`darktrace/auth.py`, `dt_utils.py`, `dt_advanced_search.py`,
`dt_tags.py`), as compared in `openapi/DIFF-sdk-vs-docs.md`, adjusted where the 7.1.0 lab
([lab signing evidence](security/lab-signing-evidence.md)) showed the SDK form is rejected:

- **S4 query + JSON body: refused** (CR-03). A request that combines a query with a JSON body is rejected
  before signing and before any network access: `src/client/httpClient.ts:571-574` (`invalid_request`) and,
  as defence in depth, `src/client/signer.ts:182-185`. The 7.1.0 appliance rejected the SDK form. No catalogue
  operation combines both.
- **S5 DELETE with query** (`DELETE /tags/entities?did=&tag=`): signed like a GET, `path?query`
  (`dt_utils._delete`; `src/client/httpClient.ts:575`). The query-encoding mode (`querySignatureEncoding`)
  applies as for GET. DELETE bodies are still rejected (`src/client/signer.ts:179-181`).
- **S6 Advanced Search GET: percent-encoded** (CR-02). The standard Base64 document is RFC 3986
  percent-encoded once, and the same encoded bytes are both signed and sent (`src/client/httpClient.ts:205-208`).
  The signer accepts an S6 segment only if it decodes to strict Base64 and re-encodes to exactly the same
  bytes; a raw `+`, `/` or `=` in the path is refused (`src/client/signer.ts:89-94`, strict Base64 at `:73-77`:
  `[A-Za-z0-9+/]+={0,2}`, length divisible by 4, at most 21,848 characters, at most 16 KiB decoded). Only the
  parameter named `query` of the three `/advancedsearch/api/...` GET routes takes this path
  (`src/client/httpClient.ts:118-122`), and its decoded document still passes `validateSearchHash` /
  `SearchSchema`. Since `6b8d08d` (V-W-01) S6 classification depends on the method: the exact
  `POST /advancedsearch/api/search` route has no S6 segment, and other POST or non-GET Advanced Search paths
  are refused (`src/client/signer.ts:80-88`). The live GET PASS rows in §6 predate this encoding change; the
  current encoding has probe evidence for `=` only. The POST `{hash}` form is still preferred in tool descriptions.
- **Darktrace/EMAIL**: same HMAC scheme over path + ordered query (SDK `DarktraceEmail` uses the shared
  `_get`/`_post_json`). Not lab-validated: the lab token got 403.
- **PCAP / raw email download: whole or refused** (§8.9). Requested with `accept:'binary'`; the client reads at
  most `maxResponseBytes` bytes (2 MiB hard cap) and writes nothing to disk. If the Base64 form cannot fit the
  tool-output budget (60,000 characters), the client returns a byte-free `output_limit_exceeded` marker with
  size and SHA-256 (`src/client/httpClient.ts:688-694`), and the tool refuses before any Base64 allocation
  (`src/tools/index.ts:288-293`, `:446-448`). A PCAP that fits is returned as
  `{kind:"pcap",encoding:"base64",byteLength,data}` (`src/tools/index.ts:288-295`). A raw email returns only
  `mediaType`, `sizeBytes`, `sha256` and `contentOmitted:true` (`src/tools/index.ts:298-301`). Nothing is
  returned as `partial:true`. A JSON status answer (for example a PCAP that is not ready yet) is returned as data.

Superseded choices (history, not current behaviour): S6 Base64 inserted and signed verbatim with `/`, `+` and
`=` literal; S4 signed as `path?query&{compact json}` with the query sent alongside the body; download
content beyond the output budget cut and marked `partial:true`.

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
| GET advancedsearch/api/search/{base64} | PASS | including a document whose Base64 contains `+` and `/`. Run on the build before CR-02 changed S6 to percent-encoding (§4); the current encoding has probe evidence for `=` only |
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
- Elicitation needs a host that implements form elicitation (2025-era push request, or the 2026-07-28
  input-required round trip). Otherwise critical writes are refused unless the operator chooses
  `criticalApproval=host` (with its acknowledgement).
- Preview ids, the write-rate windows, the circuit breaker and the audit chain are in memory per process. A
  restart resets them (and is the only way to close an open breaker), and the audit chain can only prove
  integrity within one process's stderr stream.
- The EMAIL response views use field names that are not lab-confirmed (the lab answered 403); unknown fields
  are dropped, so real responses may come back sparse until a lab run widens the views.
- The opaque time fields (`expiry`, `investigateTime`, …) are forwarded without unit knowledge.
- Large list endpoints (models, components, enums) exceed the 2 MiB response cap without `responsedata`.
- The full-API tool-contract fixture (`test/security/fixtures/mcp-tool-contracts-full-api.json`) and its
  pins in `scripts/verify-release.mjs` were generated by this change and need independent review. CI
  source/runtime hash pins must be recomputed after merging other branches.

## 8. Writes remediation (2026-10-06)

Closes the policy/approval/audit/config findings of `docs/security/code-review-writes-client.md`,
`design-review-writes.md`, `adversarial-results-writes.md` and `mcp-attack-research-round2.md` against the
normative `security-test-plan-writes.md`. Where this file and the plan disagreed, the plan won; the
reasoned exceptions are listed in §8.11.

### 8.1 Denial contract

Every refusal is `isError:true` with `structuredContent = {error:{code,message}, errorCode:<code>, hint?, …}`
and `content[0].text = JSON.stringify(structuredContent)`. `errorCode` is a flat alias of `error.code`.
Messages are the exact plan strings (`src/policy/errors.ts`); the UX worker's guidance text is kept in
`hint`, and code-owned extras (`issues`, `requiredFields`, `operations`, `requestId`, `outcome`,
`maxTargets`, `reason`, `sizeBytes`, `sha256`) may follow. Vocabulary: `operation_denied`,
`invalid_arguments`, `target_denied`, `blast_radius_exceeded`, `confirmation_required`, `preview_required`,
`preview_invalid`, `preview_expired`, `preview_used`, `approval_unavailable`, `approval_denied`,
`approval_timeout`, `approval_busy`, `audit_unavailable`, `audit_failed`, `write_outcome_unknown`,
`write_rate_limited`, `critical_rate_limited`, `write_circuit_open`, `upstream_forbidden`, `upstream_error`,
`schema_mismatch`, `response_limit_exceeded`, `output_limit_exceeded`, `unsupported_encoding`,
`request_cancelled`.

### 8.2 Pipeline order (`src/tools/index.ts`)

1. tool/operation selection → `operation_denied` (unknown tool, hidden or blocked operation);
2. operator profile (before the schema, so hidden operations reveal nothing) → `operation_denied`;
3. strict schema → `invalid_arguments`; pre-cancelled call → `request_cancelled`;
4. target policy for writes → `target_denied` / `blast_radius_exceeded` (before any preview);
5. `dryRun:true` → preview (+ one `preview` audit);
6. critical: `confirm:true` → `confirmation_required`; `previewId` → `preview_required`; reservation →
   `preview_invalid` (unknown, other operation/arguments/session/epoch; the original handle is untouched),
   `preview_used`, `preview_expired`;
7. write circuit breaker → `write_circuit_open`;
8. human approval mode: approver present → `approval_unavailable`; faithful summary fits →
   `invalid_arguments` with `reason:"summary_too_large"`; pending capacity → `approval_busy`;
9. write rate slot reserved **before** any prompt → `write_rate_limited` / `critical_rate_limited`;
10. bounded approval (§8.4) → `approval_timeout` / `preview_expired` / `approval_denied` /
    `approval_unavailable` / `request_cancelled`;
11. recheck after approval: cancellation, preview expiry and binding, profile, breaker;
12. admission: commit slot, consume preview, mandatory `start` audit (`audit_unavailable` on failure);
13. build/sign/send; terminal audit `ok` / `error` (determinate refusal: auth, forbidden, bad_request,
    not_found, rate_limited, invalid_request, overloaded, clock_skew_suspected) / `unknown`.

After a preview reservation every terminal path consumes the handle. Denials before reservation do not.

### 8.3 Preview binding

`argsHash = SHA-256(canonical {operationId, args})`: keys sorted by Unicode code point, array order kept,
strings not normalized, numbers in JSON form, nonfinite rejected; `args` are the validated API arguments
without `operation`/`dryRun`/`confirm`/`previewId` (`src/policy/canonical.ts`). Only critical previews issue
a handle (`previewId`, `expiresAt` = creation + 300,000 ms). A handle is bound to the operation, the
argsHash, the approval session (one MCP server instance; `ctx.session`, default the operation client) and
the policy/schema epoch (profiles, approval, limits, target policy, origin and catalogue). The store keeps
at most 256 entries, oldest evicted first (evicted handles fail closed as `preview_invalid`); used handles
stay as tombstones so an expired used handle answers `preview_used`.

### 8.4 Human approval

- The dialog text (`approvalSummary` in `src/policy/guard.ts`) is: a fixed header, `Operation: <id>
  (<method> <path>)`, `  argsHash = <digest>`, then **every** effective field on its own line
  `  <location>.<key> = <JSON value>`, then the fixed footer as the last line. Values are JSON-encoded
  (so no raw newline survives), token-redacted, and every MR-01/IR-01/AD2-04 hidden code point is shown as
  visible `\u{XXXX}`; nothing is ever un-escaped (AD2-01). A key that is not a plain identifier is shown
  as `field_<sha8>` with the real key inside the quoted value. No per-field or per-value truncation: when
  the faithful text exceeds 2,000 characters the call is refused before any prompt (`invalid_arguments`,
  `reason:"summary_too_large"`); the rendered text keeps the footer and a `... N more field(s)` counter
  (AD2-02). The preview bearer id never appears in the prompt.
- `requestedSchema = {type:'object', properties:{approved:{type:'boolean'}}, required:['approved']}`. Only a
  correlated `action:"accept"` with `content.approved === true` is consent; anything else is
  `approval_denied` (both the push `elicitation/create` path and the 2026-07-28 input-required path).
- At most 1 pending prompt per session and 4 per process; no queue (`approval_busy`). Deadline = min(30 s,
  remaining preview lifetime): at the deadline the prompt is aborted and the call answers
  `approval_timeout` (or `preview_expired` when the preview bound is the earlier/equal one); a late answer
  is ignored. Cancellation is checked after the answer and before audit/build.
- 2026-07-28 input-required round trip: nothing is held across it. The pending result releases the preview
  reservation and the rate slot; the retry presents the same `previewId`, which is reserved and checked
  again, and the server's HMAC request state (single use, bound to the exact call, 120 s) carries the answer.
- `criticalApproval=host` delegates consent to the MCP host. It needs `DARKTRACE_ACKNOWLEDGE_HOST_APPROVAL=true`
  at startup and is recorded in every audit record as `approvalMode:"host"`.

### 8.5 Rate limits and circuit breaker

- `maxWritesPerMinute` default 10, ceiling 10 (lower-only; 0, non-integers and >10 fail startup); critical
  writes additionally 3 per rolling minute. Rolling interval `(now-60 s, now]`. Slots are reserved
  synchronously before any await, committed at admission (failed/unknown upstream outcomes and audit failures
  keep their slot) and released when the call ends earlier (declined or timed-out approval).
- After three consecutive failed or unknown write outcomes the breaker opens: every write is refused with
  `write_circuit_open` until the process restarts; reads are unaffected; a successful write resets the
  streak. No argument can reset it.
- Both are scoped to the trusted runtime context (the operation client; one per stdio process). See §8.11 E9.

### 8.6 Target policy and blast radius

`DARKTRACE_PROTECTED_TARGETS` / `policy.protectedTargets` is an operator list of literal identifiers (device
ids, subnet ids or networks, tag ids or names, entity values). A high or critical write whose validated
arguments contain a protected value at one of its reviewed target paths is refused with `target_denied`
before any preview. Every write has a code-owned `maxTargets` (`src/policy/targets.ts`, exposed as
`op.targetPolicy`/`op.maxTargets`); array elements and comma/newline list entries count individually:

| Operation | maxTargets | Protected-target paths | Counted paths |
|---|---|---|---|
| `post_antigena_manual` | 5 | body.did, body.connections | body.connections |
| `post_antigena` | 5 | body.codeid | body.codeid |
| `post_intelfeed` | 20 | body.addentry, body.addlist, body.removeentry | same |
| `post_subnets` | 1 | body.sid, body.network | same |
| `delete_tags_tid` | 1 | path.tid | path.tid |
| `post_agemail_api_ep_api_v1_0_emails_uuid_action` (blocked) | 1 | path.uuid | path.uuid |
| `post_devices` | 1 | body.did | body.did |
| `post_pcaps` | 1 | body.ip1, body.ip2 | body.ip1 |
| `post_tags` | 1 | body.name | body.name |
| `post_tags_entities` | 20 | body.did, body.tag | body.did |
| `post_tags_tid_entities` | 20 | path.tid, body.entityValue | body.entityValue |
| `delete_tags_entities` | 20 | query.did, query.tag | query.did |
| `delete_tags_tid_entities_teid` | 1 | path.tid, path.teid | path.teid |
| `post_aianalyst_{acknowledge,unacknowledge,pin,unpin}` | 20 | – (medium) | body.uuid |
| `post_aianalyst_incident_comments`, `post_aianalyst_investigations` | 1 | – (medium) | incident_id / did |
| `post_modelbreaches_pbid_{acknowledge,unacknowledge,comments}` | 1 | – (medium) | path.pbid |

### 8.7 Audit

Records are exactly `{audit,ts,requestId,operationId,outcome,argsHash,approvalMode,seq,prevHash,hash}`;
`hash` = SHA-256 of the canonical (code-point ordered) JSON of every other field. Emission is serialized so
sequence order equals emitted order; a failed sink write still advances the chain. Records are written for
previews, every denial (one `error`, `argsHash:null` when arguments did not validate, operation
`unknown_operation` for unknown tools), and execution `start` + `ok`/`error`/`unknown` sharing requestId,
argsHash and approvalMode. Upstream read failures and successful reads are not audited. Preview/denial
records are best effort: after a sink failure they are skipped until a mandatory record succeeds. A
post-success sink failure answers `audit_failed` (`outcome:"completed"`, requestId) and emits the fixed
diagnostic `{"event":"audit_sink_failed"}`.

### 8.8 Darktrace/EMAIL

- The email action is `blocked` (never published or executed) in this release.
- Every email read has a code-owned view (`src/api/email-views.ts`): ids, timestamps, direction,
  sender/recipient domains, verdict/action names and counts; the message-detail operation adds `subject`.
  No body, headers, addresses, attachments or URLs; the decode-link operation returns the domain only; the
  raw-message download returns only `{file:{mediaType,sizeBytes,sha256,contentOmitted:true}}`. Unreviewed
  passthrough remains only for low-sensitivity, non-sensitive reads.
- Each email operation pins `schemaSha256` (canonical JSON of its SDK path item), `schemaVersion`
  (`darktrace-sdk 0.10.1`) and `schemaProvenance`. A response that is not a JSON object/list, or that
  announces a `version` (none is pinned), is `schema_mismatch`.
- **Lab C diagnosis (2026-10-06, [lab Email validation](security/lab-email-validation.md)).** On a second
  7.1.0 lab, where the owner reports the Email module is enabled, all 13 email reads still answer 403
  `{"error": "403 Forbidden"}`, and so does an unknown route under the same prefix. The Email service itself
  rejects a wrong signature, or one computed without the `/agemail` prefix, with
  `400 {"agemail": "API SIGNATURE ERROR"}` and accepts ours. Date format, query encoding and `Accept` have no
  effect. Verdict: **PERMISSION**. The API token's user has no Darktrace/EMAIL access, or Email is not
  linked to the instance. The doc lists the operator steps. Nothing changed: the reads stay
  "not lab-validated", the email action stays `blocked` (the doc lists the evidence needed to enable it),
  and `src/`, the catalogue and the contract fixture are unchanged.
  Probe: `scripts/lab-email-probe.mjs`.

### 8.9 Sensitive + write union

Starting with sensitive reads and writes both enabled (including `all`) requires
`DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE=true`; the server logs `{"event":"sensitive_write_acknowledged"}`.
In that mode write tools with free-text body fields append: "Sensitive reads are also enabled: results may
contain untrusted content, and free-text fields of this write can carry copied data out of the appliance.
Write only text the user asked for." The reviewed tools/list hash for `read+sensitive+write` is committed in
`test/security/fixtures/mcp-tool-contracts-full-api.json` (AD-W-18). PCAP downloads return
`{kind:"pcap",encoding:"base64",byteLength,data}`; the README states that this Base64 data reaches the host
and its model provider (AD-W-21). An over-budget file returns `output_limit_exceeded` with size and digest
and no bytes (client marker or tool pre-check before any Base64 allocation).

### 8.10 MR2 oracle updates

Owner decision (option 3): the plan contract applies and conflicting MR2 tests were updated, never weakened
in intent. MR2-01.TOXIC-FLOW/ERROR-BODIES, MR2-08 and MR2-13 now obtain previews with `dryRun:true` and expect
the plan denial codes (`operation_denied` for unknown tools, `upstream_error`/`write_outcome_unknown` for
upstream failures, `preview_invalid` for a mismatched or evicted handle); MR2-02 expects the
`approved:boolean` schema; MR2-05/07/09/14 answer with `content.approved:true`, MR2-05 adds negative cases
for accept without `approved:true`, and they count only execution audits (plan: denials and previews are
audited); MR2-14 expects `argsHash`/`approvalMode` in audit records; MR2-06 counts the plan rate codes. The
UX key `appliedDefaults` was added to MR2's envelope allowlist.

### 8.11 Exceptions and open conflicts

- **E1 Email action blocked (decision 8).** Plan cases that execute or validate it now get
  `operation_denied`: ST-17.MANIFEST (77 implemented, not 78), ST-19.BINDING number-string/absent-null/
  empty-false/array-order, ST-23.TOXIC email, ST-26.EMAIL action, ST-26.BODY (9), ST-26.AUTHORIZED action.
- **E2 Blast radius (decision 7).** ST-27.OVERLONG's 100-entry intel list exceeds `maxTargets` 20 and is
  refused at preview (`blast_radius_exceeded`), so its `previewOf` step fails. The summary refusal it targets
  is implemented (`invalid_arguments`, `reason:"summary_too_large"`) and covered by MR2-04 and
  `test/unit/policy-remediation.test.ts`.
- **E3 Plan-internal conflict.** ST-22.LOWERED calls `previewOf` on an ordinary write and expects a
  `previewId`; the plan text and ST-17.PREVIEW (22 cases) require ordinary previews without a handle. The
  plan text wins.
- **E4 Plan-internal conflict.** ST-18.HOST_STDIO expects only `start`/`ok` audit lines in the child although
  its own flow makes a preview; the plan text, ST-17.PREVIEW and ST-21.PREVIEW_HASH require the `preview`
  record. The plan text wins.
- **E5 Test defect.** ST-26.RESPONSE (2), ST-26.UNKNOWN_FIELDS and ST-26.MALFORMED call
  `get_agemail_api_ep_api_v1_0_dash_stats`, which does not exist (the operation is `…_dash_dash_stats`), so
  they see `operation_denied` and zero requests. The required behaviour is verified with the real id in
  `test/unit/policy-remediation.test.ts`; the oracle owner should fix the id.
- **E6 ST-29 (client worker).** ST-29.BASE64 expects the legacy `data.file` shape while ST-29.ENVELOPE
  (AD-W-17) requires the exact PCAP envelope; the envelope is implemented. ST-29.ENCODING needs a client
  error kind for unexpected `Content-Encoding` (none exists yet; the tool layer maps nothing to
  `unsupported_encoding`). ST-20.NONGET `post_advancedsearch_api_search` (6) fails in the client layer after
  the S4 query+JSON rejection.
- **E7 Vocabulary (decision 10 vs plan).** Plan names are used: `write_circuit_open` (not
  `write_breaker_open`), `write_rate_limited`/`critical_rate_limited` (not `rate_limited`), `target_denied`
  (not `protected_target`), `blast_radius_exceeded` (not `too_many_targets`), `approval_denied` (not
  `approval_declined`), `preview_invalid` (not `preview_mismatch`), `operation_denied` (not
  `policy_denied`), `confirmation_required`/`preview_required` (not `approval_required`, and no fresh
  preview), `summary_too_large` as `reason` of `invalid_arguments`. `error.message` is the exact plan string;
  the UX hint text is in `hint` rather than in the message.
- **E8 Limiter scope (decision 5 / CR-12).** The plan suite needs independent budgets per server context in
  one test process (ST-22.LOWERED, ST-22.BREAKER "fresh trusted server"), so the write limiter and breaker
  are per operation client, which is one per stdio process in production. Two server contexts built in the
  same process with different clients get separate budgets; CR-12 stays partially open for embedders. The
  pending-approval cap is process-wide.
- **E9 Union acknowledgement (decision 9 vs ST-23 text).** The plan says the combined configuration starts
  without the historical MR-06 rejection; the owner requires an explicit acknowledgement. `parseConfig`
  (programmatic) accepts the union; `loadConfig` (startup) requires the acknowledgement. The scripted stdio
  harness sets it.
- **E10 Input-required deadline.** The 30 s deadline bounds each push prompt. The 2026-07-28 round trip
  holds no server slot; its HMAC state lives 120 s and the preview expiry still bounds execution.
- **E11 Contract fixture.** `mcp-tool-contracts-full-api.json` was regenerated (critical descriptions now
  say `dryRun:true`, the union notice, ordinary writes no longer take `previewId`) and needs independent
  review. The 1.1.0 candidate pins in `scripts/verify-release.mjs` and CI have been recomputed;
  [release pin evidence](security/release-pins-1.1.0.md) records their byte bindings. Pin consistency
  and deterministic capture do not constitute independent review or release approval.

### 8.12 Design-review follow-ups (DR-W-08, DR-W-09, DR-W-16; 2026-10-06)

- **DR-W-16 profile precedence.** When `DARKTRACE_PROFILES` is set, `DARKTRACE_SENSITIVE_READ=true` /
  `DARKTRACE_WRITE_CRITICAL=true` for a capability the list does not contain is a startup error
  (`DARKTRACE_SENSITIVE_READ=true conflicts with DARKTRACE_PROFILES`, likewise for critical). `true` for a listed
  capability is accepted (agree); `false` still narrows. Without `DARKTRACE_PROFILES` the legacy booleans behave
  as before. Oracles changed deliberately: `MR-06.PROFILES` and the contract profile test no longer accept
  `read,write` + `SENSITIVE_READ=true` / `write` + `WRITE_CRITICAL=true`; they now require the conflict error.
  Full combination matrix: `test/unit/config.test.ts` ("DR-W-16 ...").
- **DR-W-08 approval-channel descriptions.** The approval sentence in write tool descriptions follows the
  configured channel. Critical tools in `criticalApproval=host` mode say "it then executes after confirm:true +
  previewId, relying on the host's own tool-permission prompt; no server confirmation dialog." (elicitation
  mode keeps "the user must then also accept a confirmation dialog."). Ordinary writes in
  `writeApproval=elicitation` mode say "the user must accept a server dialog" instead of "runs immediately".
  The default channels (critical elicitation, write host) are unchanged, so these two variants are new pinned
  entries in `test/security/fixtures/mcp-tool-contracts-full-api.json`: `read+write+critical/critical-host`
  and `read+write/write-elicitation` (exported as `approvalVariants` from `test/security/mcp-contracts.mjs`,
  checked by `MR-04.CONTRACT approval-channel ...`). Only descriptions differ from the default-channel
  contract; schemas and annotations are asserted identical. The server still cannot verify that a host's
  prompt reached a human.
- **DR-W-09 irreversible medium tools.** `post_modelbreaches_pbid_comments`,
  `post_aianalyst_incident_comments` and `post_aianalyst_investigations` (code-owned
  `IRREVERSIBLE_MEDIUM_OPERATIONS` in `src/tools/index.ts`) now give their tools `destructiveHint:true` and
  the description prefix `Write (profile "write", irreversible)`. Reversible medium tools (ack/unack,
  pin/unpin) stay `destructiveHint:false`. MR2-10.ANNOTATIONS and the contract annotation test encode exactly
  this rule with an independent list of the three ids (and the six reversible ids), not a looser predicate.
- **Regenerated hashes** (`mcp-tool-contracts-full-api.json`, DR-W-09 only): `read+write` `1820b2b8...`,
  `read+write+critical` `c5372a1b...`, `all` `90c0a24a...`, `read+sensitive+write` `3ccf0ef5...`; `read` and
  `read+sensitive` unchanged. New: `read+write+critical/critical-host` `f1b54574...`,
  `read+write/write-elicitation` `cbd4ac4d...`. Release pins in `scripts/verify-release.mjs` still need
  independent fixture review (E11); their 1.1.0 candidate recomputation is recorded in the release pin evidence.
- **DR-W-12 not changed.** `validatedOn` is a version-string array with no per-action/response scope, so
  operations whose live result was partial (e.g. DELETE answered non-2xx, `clear`/`label`/`responsedata`
  qualifications in §6) cannot be distinguished without a catalogue data-model change. Left as-is.

## 9. Darktrace/EMAIL observed shapes (2026-10-06, analysis only)

- New `scripts/analysis/har-email-summary.mjs` prints a schema-only summary of a browser HAR capture of the
  email console (templated paths, parameter/header names, key paths with value types; never values).
- New `docs/security/email-api-observed.md` records the result. The console authenticates with a session
  cookie and a per-session anti-forgery header on its own hostname and never uses DTAPI HMAC headers. The
  instance documents the public prefix `/agemail/api/ep/api/v1.0/*` and requires the "Email Logs"
  permission for every endpoint, which explains the S9 403 (permission and/or separate email host). All 14
  catalogue email operations exist on the instance under the same paths; 25 more are listed there. Message
  ids are `<uuid>.<n>`. View, parameter and schema-digest changes are recommendations only; `src/` and
  `test/` are unchanged until the lab confirms them.
