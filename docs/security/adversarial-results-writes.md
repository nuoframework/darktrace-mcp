# Adversarial write results — 2026-10-06

Owner: adversarial test engineer. Only new `test/security/**` files, this requested
finding report and the two enumerated CI security counts were changed. No `src/`
changes, weakened historical oracle, network appliance test, push or publication.

The normative acceptance contract is `security-test-plan-writes.md` ST-17–29,
mapped to `threat-model-writes.md` TM-18–31. `CHANGES-core.md` explicitly describes
different behavior for several contracts. Those discrepancies remain failing
acceptance tests; they require a source-owner/design decision, not oracle relaxation.
`[AD-W-xx]` in a test name identifies an open finding. These are ordinary failing
tests, never `todo`, expected-failure, or skipped tests.

## Reproduction and scope

Run `npm run test:security`. Its existing automatic `*.test.mjs` discovery includes
`writes.test.mjs`, so `run-isolated.mjs` needed no registration change. It creates a
fresh snapshot and builds it using the same `scripts/build.mjs` as `npm run build`.
After a build, individual reproductions use
`node --import ./dist/test/security/test-runtime-argv.js --test --test-name-pattern='ST-19.SESSION' test/security/writes.test.mjs`
inside the snapshot. Replace the pattern with any case listed below.

The test-only loader instruments the **real** request builder, signer and retained
response buffers without editing source. A builtin crypto spy counts actual HMACs
and captures synthetic signing inputs. Native DNS, socket/listener and TLS APIs
throw on use. Each denial checks separate builder, signer, HMAC, DNS, socket,
connector, HTTP, OperationClient and execution-audit counters before checking the
exact error contract. Audit-start sink rejection necessarily attempts a start;
its separate oracle checks zero acknowledged start and zero build/sign/HTTP.
HTTP failures and post-audit failures necessarily have one admitted request.

The fake OperationClient records validated requests and delegates to the real
HTTP client with a synthetic streaming connector. The real stdio child launches
`dist/src/index.js` with synthetic tokens and the test-only connector replacement;
production SDK correlation, builder, signer, response reader and audit stay active.
`ST-18.STDIO_MODEL` proves no execution before the correlated human response,
then exactly one builder/HMAC/HTTP and zero DNS/socket effects after accept.
This establishes protocol behavior, not the identity or independence of a human.

Clock tests replace both `Date.now()` and zero-argument `Date` for deterministic
monotonic advancement and UTC records. The real SDK timeout test advances fake
timers, including cleanup at the implementation's deadline. No 120-second wall
clock wait is needed. Filesystem spies block writable open, write, append, temp,
mkdir, rename and stream-creation APIs during binary tests. Buffer probes measure
the live chunk references plus consolidated buffer at the allocation boundary;
Base64 conversion spies measure allocations against the output budget.

The six new frozen HMAC vectors were independently calculated with Python stdlib,
using the published `LegendEvent/darktrace-sdk` v0.10.1 `auth.py` get_headers /
generate_signature, `dt_utils.py` _delete and `dt_advanced_search.py` search trace.
`writes-vectors.py` is an offline reviewer aid, never executed by a test. Encoded
query mode is an operator variant, not SDK behavior. Fixtures cover ordered/repeated
query keys, empty values, spaces, Unicode, quotes, immutable JSON bytes and literal
`+`, `/`, `=` in the S6 path. The signer KAT compares the exact HMAC input, digest,
wire path and input body bytes. Client tests additionally prove the transmitted
body is exactly self-bound; JS UTF-8 and Python ensure_ascii serialization can differ.
New vector review remains required; offline vectors do not establish appliance or
proxy compatibility. Existing reviewed tools/list fixtures are read-only and never
auto-refreshed. All five fixture profile hashes pass, including the four requested
read, read+sensitive, read+write and all profiles.

The retrieved SDK source bytes are bound by SHA-256: auth.py
`5c84621fa83d6400a14a4d3254bfc7fda0f831d2519dd084fcae21f48404304e`,
dt_utils.py `e99ea0638d271981bb7070ebd342bec756d7975cbd3174ee6f9f2ee66bce992f`,
and dt_advanced_search.py
`9ceb92044230633605a0cd30f8a4a74889ba05689be20d53edc02c0f63c14235`.
Retrieval used the raw files under the [v0.10.1 SDK source](https://github.com/LegendEvent/darktrace-sdk/tree/v0.10.1/darktrace).

## Open findings

| ID | Severity | Reproduction / observation | Required reconciliation |
|---|---|---|---|
| AD-W-01 | Medium | `ST-18.FORGED`, `ST-17.MATRIX`, `ST-26.EMAIL`, `ST-22.BUDGET`, `ST-29.TOOL_CAP`: denials use string errors / coarse errorCode or non-error approval refusals instead of the exact `{code,message}` contract. Zero execution effects generally hold for these cases. | Implement the acceptance error vocabulary and correlated, identical text/structured result; keep zero-effect checks. |
| AD-W-02 | Medium | `ST-18.GATES`, `ST-19.EXPIRY`, `ST-20.REPLAY`: missing confirm/preview, unknown, used or expired critical handles return a new unsigned preview instead of the specified denial. Critical preview lacks expiresAt; ordinary preview includes an extra handle. | Resolve the preview/refusal semantics with the plan. No implicit execution was observed on these specific paths. CHANGES-core intentionally documents the current behavior. |
| AD-W-03 | High, release evidence blocked | `ST-17.TARGET`, `ST-17.BULK`: no reviewed descriptor target policy or numeric maxTargets exists. | Supply operator target policy and reviewed per-operation N before behavioral protected-target and N/N+1 fixtures can be run. Do not invent N from a caller field or generic array bound. |
| AD-W-04 | Medium | `ST-19.HASH`, `ST-19.QUERY_ORDER`: binding hashes operationId plus request-shape JSON rather than canonical `{operationId,args}`; `ST-19.INVALID_BEFORE_RESERVATION`: a mismatched execution deletes the original handle, so the original valid call cannot execute. | Implement the specified validated-argument canonicalization / digest and consume only after successful reservation. Code-point versus UTF-16 ordering is separately encoded in the oracle. |
| AD-W-05 | High | `ST-19.SESSION`: preview issued by context A executes in independent context B in host mode. `ST-19.POLICY_EPOCH`: replacement operator config accepts the old handle. Both reach real builder/HMAC and one synthetic HTTP request. | Bind handles to session, policy and schema epoch. Process restart is separately tested and does reject the old handle, with the wrong error contract. |
| AD-W-06 | High | `ST-19.APPROVAL_EXPIRY`: advance the fake clock by 300,000 ms inside approval then accept; the action still signs and executes. | Recheck expiry and immutable binding after approval, before audit/build/sign. |
| AD-W-07 | High | `ST-21.CHAIN`, `ST-21.DENIAL_AUDIT`, `ST-21.PREVIEW_HASH`, `ST-18.HOST`: no preview/denial records or argsHash/approvalMode; record hashes use an array of selected fields instead of canonical unsigned record JSON. `ST-21.CONCURRENT`: delaying seq=1 writes seq=2 first, breaking emitted chain order. | Serialize sink emissions; emit required fields and all outcomes with shared correlation/digest. Existing tamper/gap checks pass under the current algorithm; recomputed chains and tail loss remain undetectable without an external anchor. |
| AD-W-08 | Medium | `ST-17.ACL`, `ST-25.401`: determinate 403/401 becomes unknown write outcome instead of the planned determinate refusal. `ST-20.UNKNOWN` and `ST-21.SINK` miss the exact error contract; `ST-21.DIAGNOSTIC` finds no fixed audit_sink_failed event on post-success sink failure. | Distinguish determinate errors, ambiguous effects and failed terminal audits while preserving one attempt and do-not-retry guidance. CHANGES-core documents conservative unknown outcomes. |
| AD-W-09 | Medium, specification conflict | `ST-22.CEILING`: config value 11 starts; the plan requires lower-only ceiling 10, while CHANGES-core explicitly permits 60. Invalid 0/noninteger/61 startup cases pass. | Source owner must reconcile the ceiling. Test retains the normative 10 oracle. |
| AD-W-10 | High | `ST-22.BREAKER`, `ST-22.RESET`: after three unknown mutation outcomes another action still builds/signs/requests. | Implement the write circuit breaker, streak reset, trusted restart and read-while-open contracts. |
| AD-W-11 | Low | `ST-24.LIFECYCLE`: premature initialized remains denied with -32600, but its message differs from the exact `Invalid Request` contract. | Fix the protocol error message without weakening the initialization gate. No early request was observed. |
| AD-W-12 | High, schema evidence blocked | `ST-26.EMAIL_PIN`: all 14 descriptors lack pinned per-version schema digest/provenance. `ST-26.RESPONSE`, `ST-26.MALFORMED`, `ST-26.UNKNOWN_FIELDS`: unsupported essential shape/version is not consistently schema_mismatch; sensitive email passthrough returns a synthetic unmodeled private field. | Supply reviewed pinned EMAIL contracts and response projection/version enforcement. Static route gates and bounded freeform input checks pass; unknown top-level overrides cause zero effects. CHANGES-core explicitly declares these schemas unproven. |
| AD-W-13 | High | `ST-27.DIGEST`: approval omits canonical digest. `ST-27.OVERLONG`: 100 intel targets exceed the 160-character field summary; accept still executes targets hidden from the summary. | Include digest and all effective targets/actions; deny summaries that cannot faithfully display their effective scope. Display control neutralization and token redaction pass. |
| AD-W-14 | High, approval contract conflict | `ST-18.STDIO_REPLY approved-false` / `missing-approved`: correlated action:accept executes even with content.approved:false or absent content. `ST-27.STDIO_SCHEMA`: requestedSchema has no approved:boolean field. | Require the planned explicit approved:true boolean in a correlated accept, or formally reconcile the human approval design. Current accept-only behavior matches CHANGES-core; this test does not claim that a wrong RPC ID bypasses correlation. |
| AD-W-15 | High | `ST-28.PENDING` sends two prompts per session; `ST-28.PROCESS` admits five contexts. `ST-28.CANCEL` and `ST-29.CANCEL`: accepted-after-cancel / pre-cancelled calls reach builder (and write audit-start) before the client rejects cancellation. | Enforce session/process prompt caps and cancellation before any audit/build boundary. The cancelled fixtures have zero HTTP requests, so this report does not claim an upstream cancelled mutation. |
| AD-W-16 | Medium, deadline conflict | `ST-28.TIMEOUT`: no reply at 30,000 ms; the production SDK deadline is 120,000 ms. Fake-timer cleanup confirms no late acceptance executes. | Enforce min(30,000 ms, preview expiry), consume the handle and release capacity. CHANGES-core explicitly specifies 120 seconds today. |
| AD-W-17 | Medium, binary contract conflict | `ST-29.ENVELOPE`: PCAP is returned as file metadata and duplicated JSON text, not the specified pcap envelope/fixed text. `ST-29.OUTPUT`, `ST-29.ALLOCATION`: output overflow returns partial Base64 success rather than output_limit_exceeded. | Implement the agreed no-partial binary response and budget accounting, or formally reconcile CHANGES-core's partial-file semantics. Arbitrary-byte decoding, size/SHA and current 60,000-character cap pass. |
| AD-W-18 | Low, review evidence blocked | `ST-24.UNION_HASH`: supported read+sensitive+write configuration lacks a committed reviewed tools/list hash. | Review and pin that union; do not auto-generate snapshots during tests. Its manifest membership is tested separately and passes. |
| AD-W-19 | Low, defense in depth | `ST-25.AMBIGUOUS_PATH`: direct signing primitive admits generic internal `//` and double-encoded `%252e%252e`, reaching HMAC. | Reject ambiguous generic signing paths recursively, preserving the reviewed literal S6 Base64 exception. This is a signer-level repro, not evidence that tool arguments can forge an approved route. Plain traversal, `%2e`, leading `//` and tool path attacks are rejected. |
| AD-W-20 | Medium | `ST-29.RETAINED`: a 2,097,152-byte stream retains 2 MiB of copied chunks plus a 2 MiB consolidated Uint8Array simultaneously; measured retained production raw buffers total 4,194,304 bytes. | Use bounded preallocation/stream ownership to satisfy the specified retained-raw <=2 MiB budget. The cumulative stream cap itself is enforced and +1 aborts. |
| AD-W-21 | Low | `ST-29.NOTICE`: README warns that results go to the model provider, but does not explicitly identify Base64 PCAP as forwarded appliance data. | Add the planned explicit binary-data egress notice. Existing general provider notice remains present. |

## Exposure and limits, not closed findings

`ST-23.TOXIC` positively demonstrates copying a synthetic sensitive canary into
incident comments `body.message`, breach comments `body.message`, tag
`body.data.description`, intel `body.description`, and EMAIL action `body.note`.
The critical intel/email sinks still require approval; direct ordinary sinks execute
once in a combined profile. Audit records never contain the raw canary. Investigation
input does not accept an added `message` field. Sensitive-only contexts deny all
these writes; write-only contexts deny sensitive reads. No taint control or general
duplicate suppression exists, and these passes are exposure observations rather
than security-control closure. Separate host relay remains possible.

Prompt-injection corpus results stay bounded, provenance-tagged data, do not
change profiles/registry, and never trigger secondary requests. Unknown response
links are not fetched. Non-GET retry tests cover every active non-GET descriptor
including sensitive POST, under 429/500/503/reset/timeout/cancel: exactly one HMAC
and synthetic HTTP attempt, no backoff or alternate signature. Ordinary fresh
duplicates intentionally produce two requests. A signed-byte replay fixture
explicitly demonstrates mock replay acceptance without claiming an appliance window.

External ACL enforcement, provider eligibility, genuine host/human identity,
actual appliance replay tolerance, conditional-write persistence, EMAIL provenance,
protected targets and numeric per-operation blast-radius bounds remain unvalidated.
No live test is authorized or performed. Missing target/schema evidence remains a
release gate rather than a passing behavioral claim.

## Evidence and counts

The first sandbox baseline recorded 330 tests: 318 pass, 6 loopback `listen EPERM`
failures and 6 skips. The outside-sandbox first expanded run recorded 1,086 tests:
834 pass, 249 fail, 3 existing filesystem-mode skips, receiptComplete=true. Its
unaltered receipt is `test/security/evidence/2026-10-06T09-25-14-508Z.json`.
Subsequent targeted verification recorded 794 new tests: 527 pass, 267 fail, 0 skips.
All failures carried an AD-W marker; no syntax/import/loader failure was hidden.
The completed fresh-build run recorded 1,127 tests: 854 pass, 270 fail, 3 existing
skips, zero cancellations, buildStatus=0 and receiptComplete=true. Its write suite
has 797 tests: 527 pass, 270 fail, zero skips. The final receipt and writes manifest
bind the final bytes and exact hashes. Existing skips are the macOS filesystem's inability
to retain the special mode-bit fixture; the separate instrumented fstat oracle runs.

Final receipt: `test/security/evidence/2026-10-06T09-36-35-892Z.json`.
Final harness / runtime / case manifest:
`test/security/evidence/writes-2026-10-06T09-36-35-905Z.json`.
The completed run recorded 44,999 assertion invocations across all suites.
The intermediate `2026-10-06T09-33-02-377Z.json` receipt also remains intact.

CI security totals were increased from 330 to 1,127 in its two enumerated count
checks; the zero-fail / zero-skip release expectations remain unchanged. Neither
prepare-release nor verify-release enumerates security totals. Source/runtime/tool
hash pins were left unchanged. CI's existing source pin
`099c3244a455353ac2b9b467e0380d3578cbefa5366a157c8eaae82bb44f9125`
differs from this worktree's measured source tree
`a489010f3d65f1cdd814c9e3a5edc1a80871c9b4990b51effb4eb25871a31a3a`;
source/runtime pins require source-owner reconciliation after merging. This test-only
change does not certify stale release pins. The fresh snapshot source hash before
and after build matches; the source worktree remains untouched.
