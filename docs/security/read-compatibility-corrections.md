# Read compatibility corrections — local-contract review

Date: 2026-10-05. Version remains `0.1.0-alpha.0`. This report records source corrections and offline verification, not appliance compatibility approval. No worker live calls, credentials, protected configuration, screenshots, telemetry, commits or publication were used.

## Summary aggregate correction

Local `openapi/darktrace-threat-visualizer.yaml` `/summarystatistics` and `SummarystatisticsEventtypeLoginput` document hourly aggregates and standalone `endtime`/`to` anchors. Generic paired-time enforcement previously rejected the legitimate anchored request, and the default object response view selected NOC fields rather than the loginput aggregate.

- `src/api/validation.ts` admits a standalone anchor only for `get_summarystatistics`, exact `eventtype=loginput`, explicit integer `hours` in `1..168`, and exactly one anchor. `endtime` must be a nonnegative safe integer in descriptor milliseconds; `to` must round-trip as a valid UTC `YYYY-MM-DD HH:MM:SS` calendar value. Mode combinations involving `eventtype`, `csensor` or `mitreTactics` are rejected. Hours/anchors require an eventtype. Other operations and body validation retain the paired, ordered, seven-day rules and unknown-unit rejection.
- `src/api/operations.ts` supplies the trusted operation ID to query-range validation. Requests preserve the validated anchor without inventing a start or expanding a range. Unknown parameters remain rejected.
- `src/api/response-view.ts` defines the exact code-owned loginput projection selected by the validated query, not upstream keys: top-level `events:boolean`, `data[]` rows containing `timems:number`, `time:string`, `events:number`. Default NOC and all other projections remain unchanged. Unknown fields, incorrect types, output truncation and redaction retain their existing behavior.
- `src/tools/index.ts` applies that selected projection after existing optional shaping. `src/coverage/report.ts` and regenerated `src/coverage/report.generated.json` describe the conditional anchor rule and request-bound output variant. `labValidated` remains false.

The runtime ceiling is seven days of explicit hourly aggregates; this is not campaign authorization. The coordinator authorized only `hours=1` aggregate validation after independent review. No detailed events, automatic retry, alternate eventtypes or wider lab windows are authorized by this correction. The harness was not edited.

## Safe API diagnostics

At the coordinator's explicit request, read failures in `src/tools/index.ts` optionally expose `errorCode` only for `instanceof DarktraceApiError` and an exact member of the code-owned frozen allowlist:

`auth`, `forbidden`, `bad_request`, `not_found`, `rate_limited`, `server`, `network`, `timeout`, `cancelled`, `too_large`, `invalid_request`, `invalid_response`, `overloaded`, `clock_skew_suspected`.

The emitted string is the constant allowlist member. Exception message, status, request ID, stack, body, URL, configuration and arguments are not reflected. Unknown kinds, ordinary exceptions, forged plain objects and throwing kind getters retain the fixed generic response. The audited write-unknown branch is unchanged. There is no `redirect` code: the production client maps HTTP 3xx to `network`, so a `network` receipt cannot uniquely establish a redirect or its cause. A future harness must separately whitelist these codes; this worker did not change it.

## Local-only endpoint investigation and proposals

`get_endpointdetails` uses `ip` or `hostname`, not a device ID. The local contract explicitly documents internal-IP variants with `name=internal_ip` as well as external-IP variants. Existing `get_devices` and `get_devicesearch` output views preserve `ip`, `ips[]` and `did`; device-search data is under `devices[]`, whereas devices has object/array variants. Thus different discovery shapes must be handled explicitly; a missing DID does not prove an empty appliance or a quiet time window.

Bounded follow-up approved by the coordinator at this checkpoint, still requiring independent source/harness review: discover at most one existing device through the already approved `get_devicesearch count=1` inventory recipe, retain only its existing IP in memory, validate it with `node:net isIP`, and issue one GET `get_endpointdetails` with `devices=false`, `additionalinfo=false`, `score=false`. No hostname substitution, invented address, scanning, IP iteration or connection expansion. Missing/invalid identity is blocked. Never emit or persist the IP, device ID or returned endpoint data. No campaign implementation or live call was performed here. A separate harness owner will implement the reviewed one-hour aggregate and existing-IP recipes after source review and new manifest binding.

`get_filtertypes` is documented as HTTP 200 JSON array, with 400/401/403 responses and no redirect contract. The existing client rejects 3xx, cancels the body and never follows or reports Location. An observed 302 requires appliance/version/permission investigation by the operator; local evidence does not justify redirect support or a new request route.

The `Devicesummary.data` child properties describe other endpoints but provide no reviewed field schemas. Current fixed safe summaries are therefore expected; a fallback is not functional compatibility proof. Resolving their referenced endpoint projections would be a separate source review, not a reason to emit unmodeled values.

`/models` and `/metrics` document `responsedata` as a top-level field/object restriction, and their object schemas contain `uuid` and `mlid`. However the reduced collection response shape is not specified as an array of scalars. A proposed `responsedata=uuid` / `responsedata=mlid` projection needs an independently accepted contract and safe fixture before implementation. No scalar shape, caller-controlled projection, larger byte cap or collection retry was added. `too_large`, fixed output truncation and shape fallback are safety outcomes, not automatically appliance incompatibility.

## Stable scope limitation

The initial stable scope is consultation only. The current runtime defaults to read policy but still contains write operation descriptors: `profiles.write=true` plus `dryRun:false` can permit eligible medium/high requests; `writeCritical` publication does not enable critical execution, which stays preview-only. AdvancedSearch POST is separately sensitive-read gated. This patch does not globally enforce a read-only release. The coordinator must decide and independently verify an enforcement change or accurate restricted deployment scope before stable publication. No write operation was executed. Partial selector success reported by the coordinator on the earlier `eadfe` source is not proof for this new source or all read variants.

## Verification and exact evidence

All final checks ran in `/private/tmp/darktrace-read-compatibility-h4074cxh`, with dependencies symlinked to existing local node_modules and an operator-free HOME. Child environment retained only PATH/HOME/TMPDIR; no operator token, proxy or configuration variables were forwarded. Security's existing runner made its own snapshot and used the synthetic local TLS fixture. Runtime: Node `v24.14.1`, macOS arm64. Linux Node22/24 and real appliance checks were not run by this worker.

| Command in isolated copy | Result |
| --- | --- |
| `npm run typecheck` | exit 0 |
| `npm run build` | exit 0 |
| `node --test dist/test/contract/read-summary-compatibility.test.js dist/test/contract/response-view.test.js dist/test/contract/response-view-union.test.js dist/test/contract/coverage-final.test.js dist/test/contract/corrections.test.js` | exit 0; 23 pass, 0 fail/skip |
| `npm test` | exit 0; 113 pass, 0 fail/skip |
| `npm run test:security` | exit 0; 324 cases, 321 pass, 0 fail, 3 platform-blocked skips; 23,738 assertion invocations; complete receipt |

New `test/contract/read-summary-compatibility.test.ts` has seven focused tests covering accepted anchors, prerequisites/mode exclusion/calendar/units/hour bounds, unchanged generic guards, exact local-schema projection, shaping/unknown-field canaries and zero dispatch on invalid input, conditional coverage, and every safe API code plus hostile/unknown exceptions. Historical tests and MR04 fixture were not edited. Security skips concern filesystem special bits that macOS discarded; instrumented open-handle mode checks passed. No claim that every security test executed is made.

An initial outer snapshot `/private/tmp/darktrace-read-compatibility-5qpih_tx` passed typecheck/build/22 targeted/112 functional cases before the diagnostic addition, but security startup failed because the snapshot lacked README.md. The final snapshot copied required tracked documentation and README inputs and reran all commands successfully. This preparation failure was not an application/security test failure and was not hidden by weakening an oracle.

The generated catalogue and base response-views bytes were unchanged by final build; only coverage was copied back from the successful isolated build. Every final workspace source byte matched security `builtSourceHashes` and `sourceHashes`.

Security receipt: `/private/tmp/darktrace-read-compatibility-h4074cxh/test/security/evidence/2026-10-05T19-30-03-868Z.json`. Receipt SHA256: `9bfadd3ca44047a07254a9a06cebd0c2ecf2f1a758511c15d5154a87c0d0363b`. Logs and `commands.json` are in that outer snapshot; the inner security snapshot is `/private/tmp/darktrace-adversarial-vTXG5v`.

Production source tree SHA256: `4f6ef96c82b8c3bff7628fbad18aea6eb694819a2e001dc0e30086d1daefd834` (recursive src paths in locale-sorted traversal, JSON mapping path to SHA256, then SHA256 of mapping; same algorithm as the security receipt).

| Changed source/test | SHA256 |
| --- | --- |
| `src/api/validation.ts` | `4137b489089884ec0a4153ad0fce315d27416eca5e8b553a096d62acf7005baa` |
| `src/api/operations.ts` | `518216d77645a86bde0b707310efa05b5ba64f9ae626b71b61ff68ae44b0fc8b` |
| `src/api/response-view.ts` | `92a5240b35cfcd8c4f899ff4dbc8529cd0bf513cf1240163ec6a8df03db87faa` |
| `src/tools/index.ts` | `837b3dde0fceeaa12b62bf965e9f9f7f4698c8500304a9418455eb57da0408c1` |
| `src/coverage/report.ts` | `7afb56252dc801e05dbd346b27df7c6fa983d54adc458dac83d6ed7ccfe50c68` |
| `src/coverage/report.generated.json` | `1ff2691c46ac7182bd3bf7fa4ce96c56c145f6accc7310b7c03e16fb6ef602ae` |
| `test/contract/read-summary-compatibility.test.ts` | `9715e5aeacfd12801d15e895c1473cee026624b6433cda83a96c9f792c84122d` |

MR04 historical fixture SHA256 remains `37b5af95de1786ecce1b8762e12d2d63e577f171511a9db4964518b13a917f72`. The task's additions do not alter published input schemas/descriptions/annotations; full security confirmed the existing contract oracle. Other workers' previously accepted source changes are included in the source-tree hash and are not attributed to this task.

Pending: independent source review; fresh clean harness manifest binding this new source; operator-only one-hour aggregate/identity validation with sanitized evidence; unresolved read variants and safety-refusal classification; Linux verification; explicit read-only stable enforcement decision; final Docker/package/version/release gates. This report does not approve stable publication.
