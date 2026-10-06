# First stable readiness — release hold

## Current status — 2026-10-06

Stable target `1.0.0`: 15 read-only tools / 19 validated GET selectors on the patched Alpine runtime (Node.js 24.18.1, shared OpenSSL 3.5.9). The arm64 image passed [19/19 real lab queries](security/patched-runtime-lab-checkpoint.md), the lab is closed, and 1.0.0 images differ only in the production version literal (not retested live). Grype's zlib High (library affected, vulnerable code not in the application path per independent review) and the `ada` name-collision Medium are retained; zlib is not fixed. [CI run 37423665585](https://github.com/nuoframework/darktrace-mcp/actions/runs/37423665585) passed every job on commit `2adb84b`. Publication of the private release assets is up to the owner. Details: [releases](releases.md#version-100).

The sections below are history.

## Accepted validated-consultation checkpoint — 2026-10-06 (predecessor image, history)

The current candidate enforces **19 GET selectors in 15 MCP tools** in both read profiles. `sensitiveRead` cannot expand the ceiling. All excluded operations, including 20 formerly eligible reads and all writes, are denied before preview, audit or network access. Write and critical settings still fail closed at startup.

Source SHA-256: `9e7c7070298ef592a1a10cdcb7ca481420a377e25e4a93c863ca33c31921d7f2`; independent source review: [ACCEPT](security/validated-consultations-independent-review.md). Active full fixture: `6ddda2054c9c708d0516a90b7811eb0aba565016403953dace89d47bc89d213c`; both ordered complete profile hashes: `cd4ee42249a9110182046794c39fc00f5995700b7d751bccc6628e86afbddfe3`. The exact predecessor is archived, never an active fallback.

Native and hardened Docker initialized MCP each passed **all 19 distinct permitted selectors** on lab 7.1.0. Verified TLS, expected response shapes, no truncation or safe-projection fallback, sequential bounded recipes and no retries/extra pages; this does not establish every parameter combination or nonempty resource variant. Earlier missing-identifier refusals remain preserved. The exact campaign secret volume was removed and absence independently verified. [Bound lab receipts and manifest hashes](security/validated-consultations-lab-checkpoint.md).

Docker image `sha256:eb3a7681da69f6468df0a7600af9d72560cfd8d5c4747dfa8ee57e45f09abeaf` binds this source and the native transport runtime. Its full 49-file runtime hash is `e7cbb509d54909fa10276ffeaec11cab22bb201f1f81635fa8c988abcb3653fb`; both offline SDK profiles match the full 15-tool contract. [Image and dependency binding](security/validated-consultations-docker-checkpoint.md).

**Not ready for stable publication.** OpenSSL **3.5.8 / CVE-2026-35189** remains applicable to TLS certificate/CRLDP processing (official severity Low; fixed in 3.5.9). Container restrictions and response caps do not patch it. The final image has component equality to previously scanned OS/Node/dependency bytes, not a fresh scan database result. Historical Trivy 0.74.0 reports 23 MEDIUM and 8 LOW; Grype 0.118.0 reports **11 High**, 10 Medium, 3 Low and 7 Negligible for the same 31 Debian matches, with no fixed versions indicated. No zero-CVE or universal zero-High claim. [Primary advisory](https://openssl-library.org/news/secadv/20260929.txt).

Independent helper acceptance is scoped; the [migration review](security/validated-consultations-migration-review.md) still separates final test migration/provenance follow-up. **Final candidate suite completion is not yet claimed.** Root must freeze final documentation, run full applicable suites and two reproducible package builds/install/SRI/source-runtime-security-receipt checks, obtain final independent review, and verify remote CI and deployment/provider eligibility. Versions remain alpha; no commit, tag, release or publication is authorized by this checkpoint.

## Historical predecessor readiness and campaign inventory — superseded

The complete record below is retained as historical planning/evidence. Its “current”, “pending”, 27/28-tool and broader campaign statements refer to predecessor snapshots, not the accepted 19-selector candidate. Do not execute its deferred-selector batches against this candidate.

# First stable read-only readiness — conditional, not a release approval

**Status: not ready to publish stable.** This document is a concrete gate plan and campaign inventory, not compatibility proof. The worker has not read real tokens, protected configuration or lab telemetry and has made no real appliance calls. The operator must review and execute production MCP runs, resolve every applicable failure/blocker and obtain final independent review before choosing a stable version. Existing historical audits/releases remain immutable.

## Current candidate and restored-access checkpoint — 2026-10-05

**Current source:** R1/R2 `aa08c260847c0fc206253f2de3cb1a872f89d2f9d85f5618b88ffd0f5c681e8e`. Its implementation owner reports build/typecheck and **124/124 functional PASS**, plus unchanged complete tool contracts; [R1/R2 implementation evidence](security/read-compatibility-repair-plan.md). Independent Sol review dispatch `ctx_afa82b46d409` is **pending at this checkpoint**. These corrections address only numeric device IDs in Antigena summary arrays and the explicitly documented null automatic triggerer; they do not resolve deviceinfo/summary query gaps. The separate limited native retest below supplies only its stated evidence. No stable version/tag/publication has been authorized.

The user chose **only validated consultations for the first stable release: 19 GET selectors across 15 tool groups**. Source enforcement of this whitelist and its new independent contract review are pending; the current private R1/R2 snapshot still advertises the previous 27/28-group contract. Advanced Search and all other unvalidated selectors are deferred, including under sensitiveRead. These planned counts are not a claim of current enforcement.

The exact planned selectors are: `get_status`, `get_devices`, `get_subnets`, `get_aianalyst_stats`, `get_intelfeed`, `get_modelbreaches`, `get_devicesearch`, `get_similardevices`, `get_aianalyst_groups`, `get_aianalyst_incidentevents`, `get_aianalyst_investigations`, `get_mbcomments`, `get_details`, `get_tags_entities`, `get_tags_tid`, `get_tags_tid_entities`, `get_endpointdetails`, `get_antigena`, `get_antigena_summary`.

On a clean isolated R1/R2 snapshot, the coordinator independently matched full source hash `aa08c260847c0fc206253f2de3cb1a872f89d2f9d85f5618b88ffd0f5c681e8e`, performed offline SRI-verified npm ci/build, and reports initialized production MCP minimal `get_status`, `get_antigena` and `get_antigena_summary` PASS, verified TLS, no fallback/truncation and compatibilityShapeValidated=true, exit 0. Protected schema-2 manifest: `d3fc39dc17a0a84e63bcb06c3019ce0c4d040b714927fc5922e82316dd2f4d34`. This adds two distinct selectors to the predecessor’s 17; it is not a retest of all 19 on the new whitelist or fresh complete security/package/image evidence.

The current private immutable gate still registers 27 default read groups; opt-in sensitiveRead adds the unvalidated Advanced Search POST group (28). All non-read and critical capabilities remain denied before registration/signing. Stable fixture bytes remain `ea31d70a484c0d0353cb8651edc4b6a4ab13798c096056e8cdcf68e78324707f`; unchanged read27 hash `6ce22e568592b27281d14b1fd7361f80da1e0daf7bb2888c892458cc9f532e68`, sensitive28 `def9a8db53e2fc4d000257d865a2da5c2453c30285e6fb61244ce02c57434a6b`. Contract equality is not lab compatibility.

**Access is restored:** coordinator Docker API and lab DNS now work. The old registered ephemeral volume was independently confirmed absent and its stale marker removed; this establishes present absence, not who deleted it or when. A separate newly provisioned campaign volume was removed by the coordinator after the passing Docker run, with exit 0 and inventory absence confirmed before removing its marker. Neither proof rewrites earlier permission failures or unexplained startup failures. [Restored-access record](security/restored-access-lab-checkpoint.md).

The successful executions below belong to **frozen accepted source `d4d3f78c3a8e6668fcab76b483d6ec5d13a20e34b3f08853651f2039a985fb87`**, reviewed manifest `963cbf0c36456f89d368e62c52a74262448f14873fa1165649c32789c5b97db0`, before R1/R2 and this documentation/package-list change:

| Gate | Recorded result and limit |
|---|---|
| Native initialized production MCP | Coordinator reports **17 distinct GET selectors PASS**: 16 minimal plus inventory endpointdetails; verified TLS, no truncation/fallback and compatibilityShapeValidated=true. This does not validate every variant, dependent resource or all 27 tool groups. |
| Docker initialized production MCP | Image `sha256:dc9b8f14c2c5f5b1041d0c47dbb9fc113c797a10731788f254878530e7dd3e3c`: coordinator reports `get_status`, `get_devices`, `get_subnets` PASS and exact container/volume cleanup; independent offline SDK test matches read27. |
| Functional/package preflight | Coordinator's external `release:prepare` snapshot: 118/118 functional; security **325 cases, 322 PASS, zero FAIL, three platform SKIP**, runner exit 0; two identical archive builds and artifact/install/CLI/refusal checks PASS. Security receipt `58b451d929b77b5885a1085ca3538aa67268dbf36157f59238eca2a61336bed0`; archive `31c0512dcd89f735720b0ac0c92710c28fd74d958374ad3c2054dbbda8d2734a`. |
| Fresh image security | Trivy 0.74.0: 23 MEDIUM + 8 LOW; Grype 0.118.0: **11 High**, 10 Medium, 3 Low, 7 Negligible; same 31 Debian match pairs with no fix indicated. Manually inventoried Node/bundled libraries because scanner SBOM omits them. [Full image binding, DB dates and applicability](security/docker-final-review.md). |

**Publication blocker:** bundled OpenSSL 3.5.8 is affected by **CVE-2026-35189, official severity Low**, in TLS certificate/CRLDP processing. Production uses verified HTTPS; application body/output caps and container memory limits do not remove this handshake exposure. OpenSSL 3.5.9 fixes it; freshly examined official supported Node 22.23.3/24.21.0/26.10.0 releases and images still bundle 3.5.8 on October 5. Hold stable publication until a supported official patched runtime is available and independently revalidated; neither a scanner-qualified zero High in Trivy nor successful functionality clears this issue. [Primary OpenSSL advisory](https://openssl-library.org/news/secadv/20260929.txt).

**Unresolved live compatibility:** frozen d4d3 records retain deviceinfo and Antigena shape mismatches, summarystatistics bad_request, cves server error, metrics too_large and missing modelbreach identifier; earlier filtertypes redirect and other bounded refusals remain historical evidence. R1/R2 target two of the response-view gaps, with limited native Antigena retest PASS as recorded above; unresolved selectors are deferred from the user-selected stable subset. The separate bounded coordinator diagnostic stopped at `get_deviceinfo` with BOUNDED_REQUEST_REFUSED/exit 1, produced no structural findings and made no later Antigena requests; it is not initialized-MCP compatibility PASS or evidence for guessed R3/R4 parameters. Source API contract remains 6.1; reported Model Engine 7.1.0 is component status only.

**Next gates on aa08c260 and final frozen inputs:** independent R1/R2 review; implementation and independent contract review of the 19-selector/15-tool whitelist; full functional/security receipts; reproducible package preflight after explicit FG-01 `README.es.md` inclusion and documentation changes; new image/runtime/dependency binding and fresh scans/manual upstream review; new protected schema-2 manifest and coordinator-owned bounded live retests; private candidate commit and remote Node22/24 plus Docker CI only under a new coordinator dispatch; final independent evidence/scope/risk decisions. Each deployment separately needs approved provider processing and appliance ACLs. Earlier receipts and published alpha assets stay immutable. See [candidate preparation and explicit file list](release-preparation-docker-mcp.md).

## Historical pre-restoration capability checkpoint — 2026-10-05

**Coordinator checkpoint, 2026-10-05:** consultation source `d4d3f78c…` and complete contract `ea31d70a…` are independently accepted and the separate stable fixture is pinned. The functional suite passes 118/118. The complete security runner exits 1: 325 cases, 313 passed, six TLS failures (`listen EPERM`) and six existing platform skips. See the [actual receipt](../test/security/evidence/2026-10-05T21-05-05-096Z.json) and [execution checkpoint](security/execution-permissions-checkpoint.md). These are blocked release gates, not a successful security certification. Docker API access is denied, a bounded native DNS lookup returns `ECONNREFUSED`, and Git metadata is read-only in this session. Final-source Linux/TLS, Docker rebuild/scan, appliance campaign, package verification, remote CI and publication remain pending. No stable version or tag has been created.

The implemented release gate is immutable and read-only: the default `read` surface registers 27 tool groups; explicit `sensitiveRead` adds the semantically read-only Advanced Search POST group (28 total), which has **not** been lab validated. All non-read operations, including medium/high writes and critical actions, are denied before registration/signing; no write tools or dry-run previews are available. Writes are deferred to a later release and require a new reviewed authorization gate. Historical native campaign activity across 17 selectors and three bounded Docker GET `PASS` results came from earlier source/image snapshots. Those partial results do not validate the current source or policy, and the final-source Docker build/scan/runtime gate remains pending because coordinator Docker socket access is currently denied.

The local catalogue is based on API **6.1**. Root subsequently reported numeric **Model Engine 7.1.0** from a production-MCP status retest; that identifies the reported status component only, not every Threat Visualizer bundle or API compatibility. The 6.1 source contract still requires per-operation validation on this lab. Direct signed HTTP status diagnostics do not satisfy the initialized-production-MCP gate. The coordinator reports that the fixed code-owned User-Agent patch and its unit checks are accepted; the worker has not independently rerun those suites. LH-01 source/runtime binding and LH-02 build prerequisites are addressed in the harness/docs, pending independent acceptance and operator execution.

## Scope and honest operation accounting

The pre-gate source catalogue's historical `enabled-by-profile` accounting was **54 operations = 38 GET + 15 POST + one DELETE**; those numbers do not describe current release capabilities. The proposed read-only campaign excludes `get_pcaps`, leaving **37 GET baseline entries**. Its preserved `minimal` profile has **34 schema-accepted minimum recipes and three deliberate semantic blockers**. The separately reviewed `inventory` profile now supplies bounded recipes for summary `loginput` with `hours=1`, endpoint details using an existing IP discovered and retained only in memory, and metric data using a discovered metric name; resource discovery can still block execution. See [the current harness guide](lab-validation.md) and [independent recipe review](security/read-campaign-final-review.md). Recipe acceptance is not live compatibility proof. All 15 POST operations (including `post_advancedsearch_api_search`, even though its tier is read) and the DELETE are outside this stable read-validation campaign. The opt-in Advanced Search POST remains unvalidated. PCAP, email/export, AdvancedSearch, active scanning and state-changing execution are not tested or authorized by this harness. Other catalogue blocked/excluded entries are not counted as executable.

A baseline entry is not automatically tested coverage. Each selected operation needs its own successful sanitized production-MCP record, including parameterized variants sharing an MCP tool alias. Missing IDs, unmodeled/truncated output, unsupported parameters, real response mismatches or failed authorization remain blockers. An empty discovery collection does not prove dependent-resource compatibility. The production default-read inventory and this campaign's tested subset must be reported separately; the coordinator must resolve their scope difference before claiming every applicable stable gate is closed.

All temporal pairs below are a five-minute **millisecond** window anchored once per run, not per-call polling. Count=1 and offset=0 apply only where supported. Device discovery is seensince=300 seconds (root-approved five-minute window); subnet discovery stays 60 seconds. Metadata collections/single-resource views without count/window support have one request, hard 32 KiB upstream / 8,192-character tool-output caps and no pagination; no upstream count/time guarantee is asserted. The operator reviews suitability and endpoint ACLs before selecting each batch.

## Per-operation input and coverage matrix

Every row below is GET/read, low or medium sensitivity. **Complete live coverage is pending; partial coordinator-attributed results are recorded below.** Rows beginning BLOCKED cannot be executed until the semantics are reviewed and a new reviewed harness/manifest is prepared. The harness stops at the first failed or blocked selection.

| Operation selector | MCP alias | Minimal strategy / dependency |
|---|---|---|
| `get_aianalyst_groups` | `darktrace_list_ai_analyst_incidents` | 5-minute window; no all-pinned/acknowledged override; no group URL |
| `get_aianalyst_incident_comments` | `darktrace_get_ai_analyst_incident_comments` | incident_id from earlier get_aianalyst_incidentevents; never group id |
| `get_aianalyst_incidentevents` | `darktrace_list_ai_analyst_incidents` | 5-minute window; no all-pinned/acknowledged override; no event URL; discover incident_id |
| `get_aianalyst_investigations` | `darktrace_list_ai_analyst_investigations` | 5-minute window |
| `get_aianalyst_stats` | `darktrace_get_ai_analyst_stats` | 5-minute window |
| `get_antigena` | `darktrace_list_antigena_actions` | 5-minute window; no cleared/history/connections/full-device expansions |
| `get_antigena_summary` | `darktrace_list_antigena_actions` | 5-minute window; summary only |
| `get_components` | `darktrace_list_components` | One metadata collection; discover cid; no upstream count parameter |
| `get_components_cid` | `darktrace_list_components` | One resource from discovered cid; no window injected |
| `get_cves` | `darktrace_get_cves` | Filter to discovered did; full-device expansion=false; no count/window parameter |
| `get_details` | `darktrace_get_connection_details` | Discovered did; eventtype=connection (documented); 5 minutes; count=1; deduplicate=true |
| `get_deviceinfo` | `darktrace_get_device_info` | Discovered did; full-device/show-all-graph=false; similardevices=0; no timeframe/count support |
| `get_devices` | `darktrace_get_devices` | count=1; seensince=300 seconds; no tags/cloudsecurity; discover did |
| `get_devicesearch` | `darktrace_search_devices` | count=1; offset=0; seensince=300 seconds; discover did; no free text |
| `get_devicesummary` | `darktrace_get_device_summary` | One discovered did; upstream aggregated view has no count/time parameter |
| `get_endpointdetails` | `darktrace_get_endpoint_details` | BLOCKED_ENDPOINT_IDENTITY: requires reviewed endpoint identity; no hostname/IP handles accepted |
| `get_enums` | `darktrace_get_reference_data` | One reference metadata request; no count/window parameter |
| `get_filtertypes` | `darktrace_get_reference_data` | One reference metadata request; no count/window parameter |
| `get_intelfeed` | `darktrace_get_intel_feed` | sources=true; fulldetails=false; metadata only; no indicator export |
| `get_mbcomments` | `darktrace_get_model_breach_comments` | 5 minutes; count=1; no remote comment text emitted |
| `get_metricdata` | `darktrace_get_metric_data` | BLOCKED_METRIC_CONTRACT: metric/interval semantics not yet reviewed; do not invent defaults |
| `get_metrics` | `darktrace_list_metrics` | One metric metadata collection; discover mlid; no count/window parameter |
| `get_metrics_mlid` | `darktrace_list_metrics` | One discovered mlid; no window injected |
| `get_modelbreaches` | `darktrace_list_model_breaches` | 5 minutes; minimal=true; no device-at-top/enum/URL expansion; discover pbid |
| `get_modelbreaches_pbid` | `darktrace_list_model_breaches` | One discovered pbid; minimal=true; same false expansions; no unrelated window injected |
| `get_modelbreaches_pbid_comments` | `darktrace_get_model_breach_comments` | One discovered pbid; no window injected; no comment text emitted |
| `get_models` | `darktrace_list_models` | Filter uuid from earlier modelbreaches.model.now.uuid; discover pid; no complete collection/fallback |
| `get_models_pid` | `darktrace_list_models` | One discovered pid; no window injected |
| `get_network` | `darktrace_get_network_stats` | One discovered did; 5 minutes; full-device expansion=false |
| `get_similardevices` | `darktrace_get_similar_devices` | One discovered did; count=1; full-device expansion=false; never token argument |
| `get_status` | `darktrace_get_status` | fast=true; includechildren=false; first in every run |
| `get_subnets` | `darktrace_list_subnets` | seensince=60 seconds; no count parameter; no names emitted |
| `get_summarystatistics` | `darktrace_get_summary_statistics` | BLOCKED_EVENTTYPE_CONTRACT: hours/endtime require a reviewed eventtype; no guessed category |
| `get_tags` | `darktrace_list_tags` | One tag metadata collection; discover tid; no count/window parameter |
| `get_tags_entities` | `darktrace_list_tags` | One discovered did; full-device expansion=false; no count/window parameter |
| `get_tags_tid` | `darktrace_list_tags` | One discovered tid; no window injected |
| `get_tags_tid_entities` | `darktrace_list_tags` | One discovered tid; full-device expansion=false; one request; no count parameter |

Numeric handles are taken only from explicit earlier discoveries: `get_devices` or `get_devicesearch` → did; `get_models` filtered by previously discovered model UUID → pid; `get_tags` → tid; `get_components` → cid; `get_metrics` → mlid; `get_modelbreaches` → pbid and canonical current model UUID; `get_devicesearch` tag objects or `get_tags_entities` → tid as a bounded alternative to the full tag collection. `get_aianalyst_incidentevents` → its own bounded event id used as incident_id, with source-schema validation; no group-id mapping is invented. If that semantic mapping is incompatible with the live appliance, it remains a failure requiring source-contract review. Only validated handles are retained in-memory, never serialized, persisted or emitted; synthetic fixture IDs are used solely for offline checks. A run never adds hidden discovery requests.

## Proposed explicit batches, for independent review before operator execution

These are **operation selections**, not live commands executed by the worker. No run has more than eight application calls including status and every discovery; unique selectors per run. Review and run each independently after a successful status-only pilot. A failure stops the batch; do not automatically rerun or skip it to report success. Rediscovery in another approved batch is an explicit new call, not cached telemetry.

| Batch | `--operations` selection | Calls maximum |
|---|---|---|
| A | `get_status,get_modelbreaches,get_models,get_models_pid,get_tags,get_tags_tid,get_components,get_components_cid` | 8 |
| B | `get_status,get_metrics,get_metrics_mlid,get_enums,get_filtertypes,get_intelfeed,get_subnets` | 7 |
| C | `get_status,get_devices,get_devicesummary,get_deviceinfo,get_similardevices,get_cves,get_tags_entities,get_network` | 8 |
| D | `get_status,get_aianalyst_groups,get_aianalyst_incidentevents,get_aianalyst_incident_comments,get_aianalyst_investigations,get_aianalyst_stats,get_antigena,get_antigena_summary` | 8 |
| E | `get_status,get_modelbreaches,get_modelbreaches_pbid,get_modelbreaches_pbid_comments,get_mbcomments,get_devices,get_details` | 7 |
| F | `get_status,get_devicesearch,get_tags_tid,get_tags_tid_entities` | 4 |

These selections cover all 34 runnable recipes; they do not cover the three semantic blockers. Dependencies are in-memory only, and full tag/component collections remain known size-limit blockers. Recipes passing local validation cannot guarantee small upstream results on APIs without count support. If a dependency is absent, report blocked and review another explicitly selected subset; do not use fake IDs, large historical windows, arbitrary queries or weakened limits to force a pass. Total campaign calls across separate approvals may exceed eight; the hard ceiling is per run, and root controls scheduling/rate between runs.

Use the full protected-config/manifest command and source-binding procedure in [lab-validation.md](lab-validation.md). The mandatory `--runtime-manifest` digest is included in sanitized records after successful verification. Root creates it only after cleanbuild of independently reviewed source, freezes the bound files while running and recreates it following any change. A manifest matching bytes cannot certify the correctness of its own creation or prove source-to-build correspondence.

## Applicable stable gates and required evidence

| Gate | Required observable evidence | State at handoff |
|---|---|---|
| Reviewed source/build integrity | Final source revision, clean build, complete protected source/runtime manifest, unchanged bound files; UA patch included; independent LH-01/LH-02 acceptance | Prepared harness; root execution/review pending |
| Production MCP status | SDK initializes production stdio, advertises safe tool, invokes status, validates projected shape; only sanitized metadata; lab version numeric only when available | Root-reported limited MCP status PASS; final candidate rerun pending; direct HTTP alone is insufficient |
| Per-operation read compatibility | Each applicable selector/parameterized route has its own sanitized success; missing IDs/unsupported parameters/shape failures/truncation reported blocked/failure; resolve the three semantic blockers or obtain explicit scope revision and update public claims | Pending; no blanket all-read claim |
| Offline regression/security | Root runs full applicable offline/typecheck/security suites on final source, including the immutable write-denial gate and UA checks; preserve platform-specific skips explicitly; no unresolved security findings | Historical checks do not establish final-source validation; final gate evidence pending |
| Linux Node 22/24 CI | Passing final-revision runs with exact Node/npm versions, job URLs and platform; local execution separated from CI | Prior alpha CI is historical, not final-stable proof |
| Actual Docker operation | Actual build from final source, run as reviewed runtime UID, stdio initialize/tools/status over MCP, protected secret mounts with correct UID/modes/non-symlink ownership; TLS enabled; graceful EOF/signal cleanup; retain sanitized evidence only | Pending; coordinator Docker socket access is denied. Historical image checks and three bounded GET passes do not validate final source |
| Isolated install/package | Rebuild isolated package; runtime allowlist; no tests/fixtures/secrets; bin 0755; exact locked runtime dependencies/SRI; `npm install --ignore-scripts --omit=dev`; doctor/help/version; JSON/TOML examples; two reproducible builds with identical hashes | Pending rebuilt stable artifact audit |
| Client setup and processing approval | Reviewed supported host/client config and docs; protected token paths, verified TLS/pinning and no secret disclosure; identify provider/host processing approval gaps and lab-version scope | Pending; transport success is not provider approval |
| Final independent review | Review final source, harness, docs, security state and immutable artifact digest after last change; rerun affected gates after findings | Pending |
| Private immutable GitHub Release | Root alone chooses version after all applicable gates, publishes immutable assets with SHA256SUMS/runtime SBOM, confirms private repository/release visibility and exact published digest; no public npm/container publication | Not authorized until gates close; no worker commit/push/release |

Root owns tests, real configuration, network calls, final version and publication. User authorization for eventual stable release is conditional on the gates above; an unresolved live compatibility/security failure prevents stable publication even while the user is away. This document does not approve exceptions. A deployment/build success in Docker or one successful endpoint cannot substitute for the remaining independent gates.

## Evidence format and current checks

Retain only harness JSONL fields: fixed operation/tool, success, fixed errorCode, expected-shape booleans, rounded elapsedMs, optional bounded numeric status version and reviewed runtimeManifestSha256. Never persist/log results, tool text/arguments, IDs/names, hostname/IP/appliance URL, tokens, signatures or remote error messages. Root aggregates coverage by **operation selector**, separates passed/blocked/failed/not-selected entries and records reviewed revision/build/manifest identifiers outside secret configuration. No raw telemetry is stored even temporarily. No fake attestation, stable approval or compatibility claim is generated.

Worker checks on Node **v24.14.1**, all offline:

- `node --check scripts/lab-read-smoke.mjs`: exit 0.
- `node scripts/lab-read-smoke.mjs --help`: exit 0, no config/dependency/build needed.
- `node /private/tmp/darktrace-lab-harness-offline-check.mjs`: exit 0; 37 allowlist entries matched the GET-minus-PCAP inventory, 34 synthetic recipes accepted by compiled validateOperation, three semantic blockers, 16 missing-handle branches; manifest tampered runtime/source bytes, unsafe mode (including setuid/setgid/sticky), symlink and omitted/extra inventories rejected; clean-environment CLI failures sanitized and stderr empty. Temporary check used VM-extracted pure helpers and synthetic files only; no SDK child or network.

Initial temporary fixture issues (VM parsing, realm comparisons, external fixture paths and inventory counting) were corrected before the passing run without weakening production checks. No npm suite, real config/token read, lab API call, commit, push or publication was performed by this worker. Complete final-candidate live coverage and the independent verdict remain **pending**; the partial root results below are explicitly attributed to their snapshots. Add separately reviewed sanitized evidence after further operator execution without rewriting historical evidence.

## Coordinator-reported bounded live results (pre-fix snapshot)

The following sanitized outcomes were reported by the coordinator on 2026-10-05, not executed or independently observed by this worker. Snapshot: committed source `f62d941` plus the reviewed then-frozen harness; protected manifest source/runtime inventories **41/24**, digest `6ca2e5f7558ada30dfa0ef802dd19eb73eee996aa8d13aab08dfd4c0c067d14b`. These are historical results for that snapshot, not acceptance of the subsequent union/filter/parser fixes. Real appliance version remains unknown: numericVersionAvailable=false in these runs. No raw version string is recorded.

| Operation | Coordinator-reported outcome | Meaning / remaining gate |
|---|---|---|
| get_status | Initialized production MCP PASS; initial pilot elapsedMs=758; subsequent bounded runs also passed | Limited status/MCP proof for that snapshot/configuration; not all endpoint or version proof |
| get_devicesearch | PASS, elapsedMs=73 | Bounded selected recipe only |
| get_devicesummary | PASS, elapsedMs=133 | Discovered-ID dependent resource proof for that run only |
| get_devices | OUTPUT_SHAPE_MISMATCH, elapsedMs=84 | Offline investigation reproduced object-first union selecting object for an array; corrected source now requires clean rebuild/new manifest/live retest |
| get_aianalyst_groups | PASS, elapsedMs=61 | Five-minute selected recipe only |
| get_aianalyst_incidentevents | PASS, elapsedMs=64 | Five-minute selected recipe only; dependent comments not proven |
| get_aianalyst_investigations | PASS, elapsedMs=54 | Five-minute selected recipe only |
| get_aianalyst_stats | OUTPUT_SHAPE_MISMATCH, elapsedMs=56 | Reported projected object nonempty; review typed field/fallback contract; unresolved, not covered by device union fix |
| get_models, get_tags, get_components, get_metrics, get_enums | TOOL_ERROR; production-client diagnostics HTTP200, too_large at 32 KiB | Safety size refusals; functionality unverified for the tested recipe, not an assertion of API incompatibility; do not raise caps automatically |
| get_filtertypes | TOOL_ERROR; diagnostic HTTP302, network refusal | Redirect correctly refused; do not follow Location; live compatibility remains unresolved |
| get_antigena | OUTPUT_SHAPE_MISMATCH, elapsedMs=69; missing envelope / truncated output | Safe output refusal; summary was not called in this batch |
| get_subnets | PASS, elapsedMs=43 | Bounded selected recipe only |
| get_intelfeed | PASS, elapsedMs=50 | Source metadata recipe only, not indicator export |
| get_mbcomments | PASS, elapsedMs=50 | Five-minute/count=1 recipe only |
| get_modelbreaches | PASS, elapsedMs=57 | Five-minute/minimal recipe only; dependent resource and UUID-filtered model tests pending |

Thus the coordinator reports **10 distinct selectors with limited successes** for the pre-fix snapshot; these do not close the full stable gates. Stop-on-failure left later selections uncalled. Post-fix snapshot must be bound/reviewed and retested; gates remain blocked on field mismatches, safety refusals, semantic blockers, untested dependencies, Docker and final independent security/artifact review.

The worker fixed only the authorized union selector in `src/api/response-view.ts` and added three synthetic regressions in `test/contract/response-view-union.test.ts`. Exact verification commands: `node node_modules/typescript/bin/tsc -p tsconfig.json --outDir /private/tmp/darktrace-lab-union-check --incremental false` (exit 0), then `node --test /private/tmp/darktrace-lab-union-check/test/contract/response-view-union.test.js /private/tmp/darktrace-lab-union-check/test/contract/response-view.test.js` (7 passed, 0 failed/skipped, exit 0), using temporary module metadata/dependency link outside the repository. No full npm suite was run by the worker.

## Coordinator-reported post-union retest and final handoff limits

Root copied the three union/parser checkpoint files, verified their hashes, rebuilt source `f62d941` plus those files, and used new protected manifest digest `9e99354c6b157b33fcc5137d3630910e71ef55b818df1c5844d82344d5ff662b`:

| Selection | Reported result | Scope |
|---|---|---|
| get_status | PASS266ms; numeric version7.1.0 | Model Engine status component only; revision suffix/hash never emitted |
| get_devicesearch | PASS63ms | Earlier 60-second discovery recipe; not proof that a handle was present |
| get_devices | PASS59ms; no fallback/truncation | Union selector fix verified on that bounded response |
| get_devicesummary | BLOCKED_MISSING_IDENTIFIER, 0ms | No dependent request made; not a pass; root later approved five-minute device discovery for new runs |
| get_aianalyst_stats | OUTPUT_SHAPE_MISMATCH53ms; fallbackfalse | Root metadata narrowed false-negative to four empty nested tactic maps; local OpenAPI explicitly allows absence of those keys; oracle now permits only those exact maps after compiled-contract check, live retest pending |
| get_antigena_summary | PASS54ms, safeProjectionFallback=true | Safe projected output only; **not** upstream-shape/functionality compatible. New compatibilityShapeValidated boolean makes that distinction explicit |

The final harness changes after this retest (five-minute device discovery, narrowly legitimate stats empty-map oracle, Docker mode and compatibilityShapeValidated) require their own reviewed manifest/snapshot and root execution; these retest results do not bless them automatically. The original full-collection smoke remains available with its known safety refusals. Filtered model recipe requires a current model UUID from a selected breach; missing UUID is blocked, never fallback to full collection. A responsedata=tid tag recipe is **not enabled**: input syntax is documented but scalar-vs-object output and the production projection need separate contract review before treating it as compatible. Numeric tid discovery from a single devicesearch result or filtered tag entities is available without retaining tag names.

Docker implementation/command/ownership prerequisites are detailed in [lab-validation.md](lab-validation.md). Worker synthetic checks cover builder, image mismatch before secret mount, logging disabled and exact-name cleanup fallback; root must perform the actual final image/MCP/mount/network/cleanup gate. Root reports a successful synthetic mount ownership probe using UID:GID501:20, but no live Docker success is asserted here. Metadata-only source/runtime verification and a status version are not attestations or closure of provider processing/security/version gates.

**Final handoff remains conditional:** live shape/safety refusals and untested dependencies remain unresolved; no stable version, commit/push or publication was made by the worker. Root will review and execute final frozen inputs, collect sanitized per-operation records and decide final version only after all applicable gates close. All earlier immutable audit/release evidence remains unchanged.

Final manifest-permission regression rejects special setuid/setgid/sticky bits using synthetic fstat metadata. The local filesystem did not retain a requested special chmod bit, so that unsuccessful fixture attempt is not claimed as a real special-mode filesystem test. Final synthetic metadata tests exercise all three rejected bits; ordinary unsafe mode, symlink, hash and inventory checks use real synthetic files. The manifest policy is mask0o7177, matching the protected-file requirement.

## Coordinator-reported final-source native pilot — 2026-10-05

This supplement supersedes pending native status/stats retest statements for these **five selections only**, while retaining every earlier snapshot above. The coordinator reports independent acceptance of final IR-01/02 fixes and IR-03’s 14-package dependency binding, followed by an initialized production-MCP native run on a clean reviewed pilot. Production source inventory SHA-256: `eadfe11732bd6c9bfa89cbfbbb2dc530d86e6984ad285576aab49b4dfc01d917`. Protected reviewed manifest SHA-256: `b9aabc2681019d1e64184fc077899a816e8529be94f451803a6962ca002a99fb`. The worker did not execute or independently observe the live run and did not read lab data/config/tokens.

| Operation | Coordinator-reported result | elapsedMs |
|---|---|---:|
| get_status | PASS; bounded numeric status component version 7.1.0 | 350 |
| get_aianalyst_stats | PASS | 51 |
| get_subnets | PASS | 44 |
| get_intelfeed | PASS | 44 |
| get_modelbreaches | PASS | 45 |

For all five records, envelope/type/notTruncated were true, safeProjectionFallback was false and compatibilityShapeValidated was true. Root retained only sanitized outcomes; no identifiers or raw telemetry were saved. This resolves the reported stats shape issue for that bounded final-source recipe; it does not prove all variants, ACLs or complete API-version compatibility. Complete 37-operation coverage, missing identifiers, three semantic blockers and known refusals remain open. No live Docker result follows from this native pilot.

Final-source offline evidence is separate: root reports Node 22.23.3 Linux arm64 standard 106/106 PASS and security 324/324 PASS, no skips/failures, receipt `test/security/evidence/linux-node22-2026-10-05T17-38-34-552Z.json`, standard log `/private/tmp/darktrace-mcp-linux-node22-standard-ir324-final.log`. The worker’s isolated Node 24 packaging/security execution is documented in [release-preparation-docker-mcp.md](release-preparation-docker-mcp.md), with its three macOS permission-bit skips explicitly retained. Local root/worker runs are not final GitHub CI evidence.

Project release gates concern reviewed source/security, reproducible artifact and installer, CI, actual Docker/MCP/mount operation and the explicitly advertised read scope. Each deployment additionally requires its own host/model-provider processing approval, credential provisioning and appliance ACLs. Those operator prerequisites are neither universally approved nor an impossible requirement to certify every future consumer before a private release. The owner still decides applicability, resolves project blockers, selects the version and publishes only after independent review; this supplement does not authorize a stable release or change campaign recipes.

### Same final snapshot: six further selections

On 2026-10-05, root reported a second native batch using the same production source and final-14 manifest above:

| Operation | Coordinator-reported result | elapsedMs |
|---|---|---:|
| get_status | PASS (repeat status, not additional distinct coverage) | 208 |
| get_devicesearch | PASS | 51 |
| get_devices | PASS | 50 |
| get_aianalyst_groups | PASS | 63 |
| get_aianalyst_incidentevents | PASS | 63 |
| get_aianalyst_investigations | PASS | 104 |
| get_mbcomments | PASS | 62 |

All records had envelope/type/notTruncated true, fallback false and compatibilityShapeValidated true. There are now **11 distinct selectors** with coordinator-reported limited successes on the final snapshot (five from the first batch plus six additional selections). This does not prove any discovery collection contained usable identifiers, dependent-resource compatibility, all 37 recipes or Docker operation. Root retained no values/identifiers. The worker still performed no live calls or lab-data reads; all remaining gates and earlier historical evidence remain explicit.

## Inventory profile readiness checkpoint — offline, not additional lab coverage

The new explicit `--validation-profile inventory` is described in [lab validation](lab-validation.md) and [contract review](security/lab-campaign-inventory-review.md). Default minimal remains 34 synthetic runnable recipes / three blockers. Inventory uses fixed global session caps 1 MiB upstream / 60,000 output characters, count=1 device discovery without recent/free-text filters, and the separately coordinator-approved discovered-name metric recipe: 35 synthetic runnable recipes / two blockers. This does not establish 35 live successes. No per-operation cap is claimed and no automatic cap escalation, extra page, retry, discovery or model-collection fallback is enabled.

The coordinator reports `get_devicesummary` blocked with `BLOCKED_MISSING_IDENTIFIER` after recent-300 `get_devices` on the accepted historical pilot; `get_cves` was not called. Inventory removes the recent filter only in explicitly selected discovery, hoping to obtain an existing ID without inventing one; dependent selectors stay blocked if none is returned. The earlier **11 distinct final-source native successes** remain tied to their unchanged historical c9d2 harness / b9aabc manifest. This new harness requires a new clean reviewed manifest and independent acceptance; no worker live execution or new compatibility evidence exists.

Remaining semantic findings: endpointdetails needs an approved real endpoint identity discovery path; summarystatistics has a documented loginput/hourly aggregate variant but the current validator rejects its standalone endtime and the current output view omits that variant. Production source fixes and explicit one-hour aggregate approval, or a reviewed scope decision, are required separately. `/filtertypes` HTTP302 remains a correctly refused redirect and an unresolved 6.1-contract / reported-7.1 compatibility gap; no Location is recorded or followed. All advertised applicable read variants, missing IDs, refusals, final Docker/CI/artifact/security gates and owner release decisions remain explicit. Release helpers and final packaging are outside this task and wait for the broader input freeze.
