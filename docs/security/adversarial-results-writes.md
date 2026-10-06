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

## Verification after remediation

Verification date: 2026-10-06. Source baseline: `10ec5abdbb5ed05d42d4e0aabc53793671fadafc`.
I read the implementation against CHANGES-core §8, including its target table and E1–E11, rather than
treating green tests as proof of every original recommendation. The original findings above are historical.
The tables below supersede their OPEN labels for this snapshot. CLOSED means the defect is removed under
the approved §8 contract; PARTIAL identifies a remaining recommendation, evidence gap or limited scope.
No appliance was contacted; operator credentials were neither accessed nor included in evidence.

Before changing the oracles, the targeted writes + MR2 run had **813 tests, 781 pass, 32 fail**; the
policy/client/signer/MCP approval run had **58 pass, 0 fail**. The full unsandboxed baseline had
**1,145 tests, 1,110 pass, 32 fail, 3 macOS skips**. The 32 cases were classified as E1–E6, but verification
then disproved E6's explanation of six Advanced Search POST failures (see V-W-01 below). The encoding
distinction is also a real missing error kind, now fixed. Sandboxed loopback TLS failures were rerun outside the sandbox.
The three skips concern macOS discarding the requested setgid bit (`2600`) on PUBLIC, PRIVATE and policy files.

### AD-W closure verification

| ID | Status | Implementation evidence and targeted verification |
|---|---|---|
| AD-W-01 | CLOSED | `src/policy/errors.ts:56`, `src/tools/index.ts:118`, `src/tools/index.ts:309`: fixed denial body, identical JSON/text and zero-effect gates pass ST-17/18/22/26. E6's missing encoding distinction is now fixed at `src/client/httpClient.ts:663` and `src/tools/index.ts:237`; ST-29.ENCODING returns `unsupported_encoding`, cancels before reading, and never retries. |
| AD-W-02 | CLOSED | `src/tools/index.ts:354`, `src/policy/previews.ts:38`, `src/policy/guard.ts:27`: explicit confirm/preview denials, critical expiry and used tombstones; ordinary previews have no handle. ST-18.GATES, ST-19.EXPIRY/RACE/EXPIRED_USED and ST-20.REPLAY pass. E1 blocked email fixtures now assert denial. |
| AD-W-03 | CLOSED | `src/policy/targets.ts:13`, `src/api/operations.ts:56`, `src/tools/index.ts:342`: reviewed operation-specific bounds and literal operator-protected targets before preview. Unit protected-target and N/N+1 tests pass. Bounds are owner policy, not appliance-derived limits. |
| AD-W-04 | CLOSED | `src/policy/canonical.ts:34`, `src/policy/previews.ts:38`: canonical validated API arguments, code-point sorting, ordered arrays, and mismatch without consumption. ST-19.HASH/QUERY_ORDER/INVALID_BEFORE_RESERVATION pass. |
| AD-W-05 | CLOSED | `src/policy/previews.ts:19`, `src/policy/previews.ts:38`, `src/server/createServer.ts:90`: session plus policy/schema epoch binding; ST-19.SESSION/POLICY_EPOCH/RESTART pass. |
| AD-W-06 | CLOSED | `src/tools/index.ts:396`, `src/policy/previews.ts:47`: post-approval expiry/binding check before admission; ST-19.APPROVAL_EXPIRY passes with zero builder/sign/HTTP. |
| AD-W-07 | CLOSED | `src/observability/audit.ts:10`, `src/observability/audit.ts:43`, `src/tools/index.ts:309`: exact record fields, canonical hash, serialized emission, preview/denial and execution correlation. ST-21.CHAIN/CONCURRENT/DENIAL_AUDIT/PREVIEW_HASH and ST-18.HOST pass. |
| AD-W-08 | CLOSED | `src/tools/index.ts:232`, `src/tools/index.ts:415`, `src/tools/index.ts:430`: determinate versus unknown outcomes and fixed terminal-sink diagnostic. ST-17.ACL, ST-25.401, ST-20.UNKNOWN and ST-21.DIAGNOSTIC/SINK pass; DELETE 502 remains unknown and never retries. |
| AD-W-09 | CLOSED | `src/config/schema.ts:138`, `src/policy/admission.ts:4`: lower-only ceiling 10; ST-22.CEILING and invalid startup fixtures pass. |
| AD-W-10 | CLOSED | `src/policy/admission.ts:48`, `src/tools/index.ts:362`, `src/tools/index.ts:417`: three failed/unknown mutations open the breaker; success resets before opening, reads continue. ST-22.BREAKER/RESET pass. E8 scope is per operation client. |
| AD-W-11 | CLOSED | `src/server/createServer.ts:66`: exact `Invalid Request`; ST-24.LIFECYCLE passes and premature initialized never dispatches. |
| AD-W-12 | CLOSED | `src/api/email-views.ts:33`, `src/tools/index.ts:294`, `src/tools/index.ts:443`, `src/api/catalogue.generated.json:285`: pinned SDK path-item provenance, minimal projections and object/list/version gate; unit EMAIL cases pass with the real dashboard ID, and ST-26.EMAIL_PIN independently recomputes all 14 digests from the committed SDK YAML. Closure uses §8.8's essential-shape contract, not a claim of appliance-confirmed response schemas. E1 excludes the action. |
| AD-W-13 | CLOSED | `src/policy/guard.ts:69`, `src/tools/index.ts:370`: full fields and argsHash, summary-over-budget denial before prompt. ST-27.DIGEST and unit/MR2 summary tests pass; E2's 100 targets are independently blast-radius-denied. |
| AD-W-14 | CLOSED | `src/server/createServer.ts:13`, `src/server/createServer.ts:15`, `src/server/createServer.ts:101`: required approved boolean and accept+true in both protocol channels. ST-18.STDIO_REPLY and ST-27.STDIO_SCHEMA pass. |
| AD-W-15 | CLOSED | `src/policy/admission.ts:58`, `src/tools/index.ts:339`, `src/tools/index.ts:391`: one/session, four/process pending slots and pre/post-approval cancellation. ST-28.PENDING/PROCESS/CANCEL and ST-29.CANCEL pass. |
| AD-W-16 | CLOSED | `src/tools/index.ts:258`, `src/policy/admission.ts:10`: push deadline min(30 seconds, preview TTL), late reply ignored, slots released. ST-28.TIMEOUT passes. E10 separately documents the 120-second integrity state for slot-free input-required retries. |
| AD-W-17 | CLOSED | `src/tools/index.ts:278`, `src/tools/index.ts:433`, `src/client/httpClient.ts:689`: exact PCAP envelope and size/digest-only overflow before Base64 allocation. ST-29.ENVELOPE/OUTPUT/ALLOCATION pass; E6-aligned BASE64 also passes with exact bytes and digest. Historical lab evidence remains prefix-only. |
| AD-W-18 | PARTIAL | `test/security/fixtures/mcp-tool-contracts-full-api.json:4`, `src/tools/index.ts:105`: union hash is now committed and ST-24.UNION_HASH/LIST pass. E11 still requires independent release-fixture review and release-pin recomputation; a presence/hash-match test is not that review. |
| AD-W-19 | CLOSED | `src/client/signer.ts:98`: bounded recursive decode, encoded-separator/traversal rejection and explicit encoded S6 exception. ST-25.AMBIGUOUS_PATH and signer unit cases pass before HMAC. |
| AD-W-20 | CLOSED | `src/client/httpClient.ts:412`: one capped destination buffer and subarray return, no retained chunk copies. ST-29.RETAINED and STREAM cap/+1 tests pass. |
| AD-W-21 | CLOSED | `README.md:128`: explicit inline Base64 PCAP forwarding to host/model provider; ST-29.NOTICE passes. |

### CR closure verification

| ID | Status | Implementation evidence and targeted verification |
|---|---|---|
| CR-01 | CLOSED | `src/policy/guard.ts:43`, `src/policy/guard.ts:69`, `src/tools/index.ts:370`: JSON-quoted full fields, digest, no reverse escape and refusal when incomplete. ST-27.UI/DIGEST, MR2-03/04 and unit summary checks pass. |
| CR-02 | CLOSED | `src/client/httpClient.ts:208`, `src/client/signer.ts:80`: RFC3986-encoded standard Base64 is both signed and sent. ST-25.S6 and `test/contract/integration.test.ts:38` use independent encoded-as-sent HMAC vectors. No new live appliance test. |
| CR-03 | CLOSED | `src/api/operations.ts:110`, `src/client/httpClient.ts:571`: query+JSON rejected before signing/transport; ST-25.S4 and client S4 unit test pass. The NONGET fixture explicitly verifies a validated body-only request; V-W-01 separately shows the signer rejects that valid POST path. |
| CR-04 | CLOSED | `src/tools/index.ts:396`, `src/policy/previews.ts:47`: expiry rechecked after acceptance; ST-19.APPROVAL_EXPIRY zero-effect test passes. |
| CR-05 | CLOSED | `src/tools/index.ts:201`, `src/api/email-views.ts:33`: sensitive JSON has code-owned projections; unreviewed passthrough limited to non-sensitive low-sensitivity reads. Unit EMAIL unknown/body/header/attachment fields are omitted. SDK pins do not prove live EMAIL schemas. |
| CR-06 | CLOSED | `src/policy/targets.ts:13`, `src/tools/index.ts:342`: fixed per-operation N plus operator literal protection before preview/approval; unit N/N+1 and protected-target cases pass. |
| CR-07 | CLOSED | `src/policy/admission.ts:48`, `src/tools/index.ts:417`: failure streak/breaker and read availability verified by ST-22.BREAKER/RESET. Per-client scope is E8. |
| CR-08 | CLOSED | `src/policy/admission.ts:58`, `src/tools/index.ts:258`: bounded capacity, min deadline and release on terminal paths; ST-28.PENDING/PROCESS/TIMEOUT/CANCEL pass. |
| CR-09 | CLOSED | `src/server/createServer.ts:13`, `src/server/createServer.ts:15`: only correlated accept with approved:true; MCP unit approval and ST-18.STDIO_REPLY/SCHEMA pass. |
| CR-10 | CLOSED | `src/observability/audit.ts:10`, `src/tools/index.ts:408`: digest/mode are hashed and shared across start/terminal without raw args/handle; ST-21.CHAIN/PREVIEW_HASH and host checks pass. |
| CR-11 | PARTIAL | `src/config/load.ts:302`, `src/observability/audit.ts:10` implement critical-host acknowledgement/mode, but `src/policy/guard.ts:37` still defaults ordinary writes to host and `src/tools/index.ts:102` marks medium comments/investigations non-destructive. MCP approval unit test confirms ordinary host execution without elicitation; this cannot prove host consent. |
| CR-12 | PARTIAL | `src/policy/admission.ts:20`, `src/server/stdio.ts:17`, `src/server/stdio.ts:52`: per-client limiter, one client created by runStdio and reused by its server factory. E8 approves stdio scope; embedders with two clients still multiply budgets. `ST-22.CLIENT_SCOPE` and `test/mcp/stdio-client-scope.test.ts:5` verify separate 10/3 windows and exactly one production factory/client; no aggregate-process claim. |
| CR-13 | CLOSED | `src/config/schema.ts:138`, `src/policy/admission.ts:4`: plan's ceiling 10 wins; ST-22.CEILING passes. |
| CR-14 | CLOSED | `src/client/signer.ts:98`: recursively checks each generic segment before HMAC; ST-25.AMBIGUOUS_PATH and unit double-encoded separator/traversal cases pass. |

### AD2 closure verification

| ID | Status | Implementation evidence and targeted verification |
|---|---|---|
| AD2-01 | CLOSED | `src/policy/guard.ts:43`, `src/policy/guard.ts:82`: JSON quote each field, then join structural lines, no unescaping. MR2-03 passes literal escape/forged Operation-line probe. |
| AD2-02 | CLOSED | `src/policy/guard.ts:82`, `src/tools/index.ts:370`: budget reserves footer/counter; incomplete summaries never elicit. MR2-04 and unit summary denial pass. |
| AD2-03 | CLOSED | `src/policy/admission.ts:58`, `src/tools/index.ts:371`, `src/tools/index.ts:377`: bounded pending slots and synchronous rate reservation before prompt. MR2-06 and ST-28 capacity tests pass. |
| AD2-04 | CLOSED | `src/shape/output.ts:9`: all reported additional assigned invisibles are visibly escaped. MR2-15.UNICODE-SMUGGLE and CONTROL pass; this is not blanket Unicode coverage. |

### DR-W closure verification

| ID | Status | Implementation evidence and targeted verification |
|---|---|---|
| DR-W-01 | CLOSED | `src/policy/guard.ts:43`: no sentinel reversal; MR2-03 spoofing and ST-27 controls pass. |
| DR-W-02 | CLOSED | `src/policy/guard.ts:69`, `src/tools/index.ts:370`: complete full-field approval or zero-effect refusal. ST-27.DIGEST plus unit summary check pass. §8 selects whole-dialog budget/full digest in prompt rather than the review's 161-character threshold or digest-in-preview proposal. |
| DR-W-03 | PARTIAL | `src/config/load.ts:298`, `src/tools/index.ts:96`: explicit union acknowledgement and free-text notices exist; unit acknowledgement test passes. ST-23.TOXIC still demonstrates authorized copying into ordinary free-text writes; no session-taint forced elicitation. The minimum startup gate is closed, the stronger proposal is absent. |
| DR-W-04 | PARTIAL | `src/observability/audit.ts:10`, `src/tools/index.ts:309`, `src/tools/index.ts:408`: write/denial/preview digest and mode verified. `src/tools/index.ts:405` audits execution only for writes; §8.7 intentionally excludes successful sensitive reads and has no reason enum in the exact record. Sensitive-read traceability recommendation remains absent. |
| DR-W-05 | CLOSED | `src/policy/targets.ts:13`, `src/policy/admission.ts:48`: target bounds/protection and three-failure breaker pass unit/ST-17/ST-22 checks. §8 counts DELETE 502 unknowns as failures; the review's suggested exclusion was not adopted. E8 limits scope to one operation client. |
| DR-W-06 | CLOSED | `src/config/schema.ts:138`, `src/tools/index.ts:340`, `src/tools/index.ts:377`: ceiling 10 and tier-based write slots (POST reads excluded). Unit ceiling checks pass; read-via-POST is excluded by the tier check, but V-W-01 prevents Advanced Search POST transport from being exercised. |
| DR-W-07 | CLOSED | `src/policy/admission.ts:58`, `src/tools/index.ts:258`: plan-selected 1/session, 4/process, 30 seconds/preview TTL; ST-28 tests pass. |
| DR-W-08 | CLOSED (description); residual noted | `src/tools/index.ts:92`, `src/tools/index.ts:118`: approval sentence now follows the configured channel. Host-mode critical tools say they execute after confirm:true + previewId relying on the host's own tool-permission prompt, with no server confirmation dialog; elicitation-mode ordinary writes say the user must accept a server dialog. Pinned as `read+write+critical/critical-host` and `read+write/write-elicitation` in the full-API contract fixture (MR-04.CONTRACT approval-channel; schemas/annotations asserted identical to the default channel) and in the profiles-policy DR-W-08 matrix. Residual: the server still cannot verify that an auto-answering host involved a human (CHANGES-core §8.12). |
| DR-W-09 | CLOSED | `src/tools/index.ts:68`, `src/tools/index.ts:111`: the three irreversible medium operations (model-breach comment, AI Analyst incident comment, AI Analyst investigation) carry destructiveHint:true and `Write (profile "write", irreversible)`; ack/unack and pin/unpin stay destructiveHint:false. MR2-10.ANNOTATIONS and the contract annotation test pin the exact three ids and six reversible ids independently. Read-only sensitive download hint wording (the review's secondary point) is unchanged. |
| DR-W-10 | CLOSED | `src/api/catalogue.generated.json:4065`, `src/policy/release-capability.ts:14`, `src/api/email-views.ts:33`: action blocked/unpublished and reads projected under sensitive. Unit EMAIL checks pass; E1 tests must keep operation_denied and zero effects. No live EMAIL compatibility claim. |
| DR-W-11 | CLOSED | `src/tools/index.ts:278`, `src/client/httpClient.ts:689`, `docs/CHANGES-core.md:161`: full-or-error PCAP contract now enforced; historical lab row explicitly says prefix+size+SHA only. ST-29.ENVELOPE/OUTPUT/ALLOCATION pass. Full capture behavior is synthetic verification, not a new lab receipt. |
| DR-W-12 | OPEN (data-model change needed) | `src/api/operations.ts:11`, `src/tools/index.ts:86`, `docs/CHANGES-core.md:195`: validatedOn is still a version-string array without action/response scope; unvalidated label is dropped when any version exists. Lab rows qualify clear/label/responsedata, while tool metadata does not. Keeping the label for partial live results needs a per-action catalogue field; deliberately not changed in the 2026-10-06 follow-up (CHANGES-core §8.12). |
| DR-W-13 | CLOSED | `src/tools/index.ts:232`, `src/tools/index.ts:418`: fixed determinate classification versus 5xx/reset/timeout unknowns. ST-17.ACL, ST-25.401 and DELETE 502 check pass. |
| DR-W-14 | OPEN | `src/policy/admission.ts:20`, `src/policy/previews.ts:12`, `src/observability/audit.ts:10`: process/context-local state; exact record lacks bootId and starts at common genesis. E8 documents separate clients, but no cross-process budget or per-boot chain identity exists. |
| DR-W-15 | OPEN | `README.md:126`, `src/cli/entry.ts:9`, `docs/configuration.md:46`: generic token-permission/profile guidance exists, but no profile-to-appliance least-privilege ACL table or verified separate-token installation workflow. No restricted-token live receipt. |
| DR-W-16 | CLOSED | `src/config/load.ts:246`: with DARKTRACE_PROFILES set, DARKTRACE_SENSITIVE_READ=true / DARKTRACE_WRITE_CRITICAL=true for an unlisted capability is a startup error (`... conflicts with DARKTRACE_PROFILES`); agreeing or narrowing values are accepted and legacy-only configs are unchanged. Full matrix in `test/unit/config.test.ts`; MR-06.PROFILES now asserts the read,write + sensitive=true conflict even with the union acknowledgement. |
| DR-W-17 | PARTIAL | `src/tools/index.ts:349`, `src/policy/previews.ts:28`, `src/policy/previews.ts:40`: ordinary previews no longer occupy the store and mismatch leaves original intact (ST-19.INVALID_BEFORE_RESERVATION passes); new critical previews still evict oldest live handles at 256 (MR2-13.PREVIEW-FLOOD). This fail-closed availability tradeoff is explicit in §8.3. |
| DR-W-18 | CLOSED | `docs/CHANGES-core.md:219`, `docs/CHANGES-core.md:383`: dated reconciliation chooses plan contract and enumerates exceptions. ST-17..29 now trace to §8/E1–E11; unresolved recommendations are explicitly retained here rather than declared fixed. |
| DR-W-19 | PARTIAL | `src/tools/index.ts:309`, `src/policy/previews.ts:52`: refusal is a fixed error and reserved handle is consumed (ST-18.REPLIES). No argument-binding cooldown exists; a fresh preview of the same args can prompt again. §8 does not require that extra recommendation. |

### Reconciliation and final validation

- **E1:** all email-action fixtures now require `operation_denied` and zero builder/signer/HMAC/network/elicitation/audit-start effects, including preview and forged execution attempts. Manifest is 79 total, 77 implemented, one deprecated exclusion, one blocked action. Tests are retained, not skipped.
- **E2:** keep the 100-target intel blast-radius denial; add a separate 20-target, long-value input that reaches approval summary checking, returns `invalid_arguments` with `reason:"summary_too_large"`, and consumes its reserved handle with zero execution effects.
- **E3/E4:** ordinary preview is asserted without a handle; host stdio audit is exactly preview/start/ok with matching digest and separate preview correlation.
- **E5:** all four dashboard references use `get_agemail_api_ep_api_v1_0_dash_dash_stats`. They now issue one real synthetic request and test version/shape/projection, rather than succeeding at an unknown-operation gate.
- **E6:** ST-29.BASE64 uses the exact PCAP envelope and independently checks decoded bytes and digest. Add the safe `unsupported_encoding` client kind, existing cancellation branch's throw and tool errorCode mapping; update compression oracles and add a unit test for GET/POST, four encodings, zero body reads, one cancellation and one attempt. The Advanced Search NONGET fixture is validated JSON-only and explicitly asserts an empty wire query; its six failures are V-W-01, not S4.
- **E7:** retain plan vocabulary and exact messages; no loosened code sets or expected failures.
- **E8:** ST-22.CLIENT_SCOPE demonstrates two clients in this same process admit 20 combined writes, including six critical writes, with separate 10/3 budgets. The fresh-process MCP observational-loader test exercises production runStdio without its test seam, observes exactly one HTTP-client construction, and sees one shared client across server contexts. CR-12 remains PARTIAL for embedders; stdio scope is verified by design.
- **E9:** startup harness acknowledgements were already set in `test/security/writes-helpers.mjs:106`; retain them. Unit startup gates and MR-06 env/file overlays test refusal without acknowledgement and acceptance with `DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE=true`.
- **E10/E11:** note only: no held slot across input-required retries, 120-second HMAC state separate from the 30-second push deadline/preview expiry. Fixture review and release-pin recomputation remain release work; no snapshot or pin was regenerated here.

**V-W-01 — OPEN, real compatibility regression (client/signer owner).**
`src/client/signer.ts:80` classifies every `/advancedsearch/api/{search,analyze,graph}` path as S6,
without considering the HTTP method. Its expected segment count at `:83` and rejection at `:85`
therefore reject the valid POST `/advancedsearch/api/search`, which has no Base64 path segment.
`src/client/signer.ts:170` runs that check before HMAC. The HTTP client catches it at
`src/client/httpClient.ts:637` as `invalid_request`, with one signer invocation but zero HMACs and
zero HTTP requests. The catalogue POST has **no query parameters** and one JSON hash body
(`src/api/catalogue.generated.json:3989`); §8.11 E6's S4-fixture explanation is incorrect for this snapshot.
A direct signer probe reproduces the fixed TypeError without printing inputs or credentials.

Remaining failing tests are exactly `ST-20.NONGET post_advancedsearch_api_search` for **429, 500, 503,
reset, timeout and cancel**, at `test/security/writes.test.mjs:242`. Each preserves the required one-attempt
oracle and fails the expected HTTP count (0 instead of 1), because the synthetic failure is never reached.
This needs a signer correction distinguishing the legitimate POST route from S6 GET paths, with encoded
S6/path-traversal guards retained. No owner decision about S4, blast radius or exclusion would fix it.
The signer was left unchanged in this test-owner verification round; only the expressly allowed error-kind
production change was made. No negative oracle was suppressed to reach a green count.

Final checks on Node 24.14.1 / macOS arm64:

| Command | Result |
|---|---|
| `npm run typecheck` | PASS |
| `npm test` | **209 pass, 0 fail, 0 skipped**; includes production runStdio single-client wiring and safe unsupported-encoding unit coverage |
| Targeted writes + MR2 | **815 total, 809 pass, 6 fail, 0 skipped**; all AD2 reproductions now pass |
| `npm run test:security` (loopback enabled) | **1,147 total, 1,138 pass, 6 fail, 3 macOS skips**, no cancellations/todos; all six failures are V-W-01 |

Original-finding summary (58 IDs; V-W-01 is additional):

| Family | CLOSED | OPEN | PARTIAL |
|---|---:|---:|---:|
| AD-W-01..21 | 20 | 0 | 1 |
| CR-01..14 | 12 | 0 | 2 |
| AD2-01..04 | 4 | 0 | 0 |
| DR-W-01..19 | 9 | 5 | 5 |
| **Total** | **45** | **5** | **8** |

OPEN original recommendations are DR-W-09/12/14/15/16. PARTIAL are AD-W-18, CR-11/12,
DR-W-03/04/08/17/19. These remain visible even though they have no failing plan oracle after reconciliation.
They concern annotations/host delegation, validation scope, audit identity/read traceability, token guidance,
legacy precedence, fixture review, taint/cooldown and availability. None is relabeled as live ACL, host UI,
full-capture lab or organizational risk acceptance. Receipt: [`2026-10-06T11-44-04-525Z.json`](../../test/security/evidence/2026-10-06T11-44-04-525Z.json),
`receiptComplete:true`, source tree SHA-256
`82c0d44eaba3e448fefb1dbe086b58440a06cc9e3483e5d146cf9f80b15f574e`.
The receipt's sourceHashes and builtSourceHashes match; build did not rewrite the source snapshot.
The latest npm test run independently checks the final production-client identity assertion.

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
