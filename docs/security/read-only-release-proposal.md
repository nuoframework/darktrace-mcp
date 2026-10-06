# First stable release: immutable consultation capability proposal

2026-10-05. **Proposal approved for minimal write denial; implementation checkpoint below.** Requested scope: first stable consultation only, writes in a later release. The initial proposal changed only this document; after explicit coordinator approval the source and tests listed below were implemented. Versions, Docker, README, harness and release helpers remain outside this task.

## Frozen baseline and decision

The reviewed starting source remains SHA256 `4f6ef96c82b8c3bff7628fbad18aea6eb694819a2e001dc0e30086d1daefd834`. Its existing isolated macOS Node24 checks recorded 113 functional passes and security 324 cases / 321 passes / 3 platform-blocked skips / 0 failures; those receipts are historical evidence for that source, not results for the proposed capability. The summary/error corrections report remains unchanged.

**Coordinator-selected minimal first-stable capability:** immutable denial of every tier other than `read`, with no write previews. Preserve current read publication and the separate `sensitiveRead` opt-in: default 27 tool groups (38 implemented GET operations, including metadata-only PCAP listing), and sensitive profile 28 groups (adds one implemented semantically read-only AdvancedSearch POST; three GET search forms are already blocked). The 37-operation bounded GET campaign excludes PCAP metadata and all AdvancedSearch. Sensitive reads remain explicitly unvalidated in the lab; no POST campaign is proposed. Consultation-only is a semantic no-write boundary, not a claim that every permitted request uses GET.

Reject `profiles.write:true` and `profiles.writeCritical:true` in production configuration with fixed errors; accept absent/false values for existing safe files. Preserve `sensitiveRead:true` independently under its existing opt-in policy. Do not silently coerce unsupported write profiles to false. `DARKTRACE_PROFILES=read,write`, `DARKTRACE_WRITE_CRITICAL=true`, file/env overlays and object parsing reach the same rejection. No version comparison, environment switch, CLI flag, NODE_TEST_CONTEXT, testOnly option, constructor parameter or model argument can enable release writes. A future write release must deliberately change source and undergo new review.

This is the exact updated proposal reflecting coordinator message `msg_4db582d90252`; implementation was subsequently authorized by message `msg_45f5685e0b5e`. Source and oracle hashes remain unchanged.

## Concrete minimal source changes after approval

| File | Proposed change |
| --- | --- |
| New `src/policy/release-capability.ts` | Export a frozen code-owned first-release capability and predicate over trusted operation descriptors: implemented and tier read. No inputs/env/config/version lookup. Predicate and constants are immutable and have no public override. Existing sensitive-read authorization remains independent; no widening of read schema/operation status. |
| `src/config/schema.ts` | Import the constant; validate requested booleans and reject true write/writeCritical before returning frozen configuration. Keep fixed errors without supplied values. Keep legacy false fields for file compatibility; retain boolean Config field types if necessary for forged-config security tests, while runtime output is always false; do not remove catalogue metadata. |
| `src/config/load.ts` | Reject `write` in DARKTRACE_PROFILES rather than merely emitting a merged write flag; reject forbidden file profile requests before an env overlay can hide them, then retain parseConfig final validation. Reject critical true environment switch; preserve sensitive-read opt-in. Preserve secure file ownership/mode and token-file loading checks; no token content handling changes. |
| `src/policy/guard.ts` | Check release capability before existing profile policy. `authorize` and `isEligible` deny all write tiers even with a forged Config carrying write flags. Retain checks both before validation/preview and immediately before dispatch. Never expose write previews as a substitute for refusal. Critical-preview code may remain dormant for historical/later-release internals; production authorization never reaches it. |
| `src/tools/index.ts` | eligibleTools remains capability-filtered. Preserve exact default read27 and sensitive28 descriptions/input schemas/annotations for the existing contract invariants; no write group is eligible. No model-selected release capability. Existing generic catalogue descriptions mention write previews, so CLI/doctor and release documentation must explicitly explain that those future capabilities are unavailable in this release; do not silently rewrite the pinned read descriptions. Existing minimization, redaction, Unicode neutralization, safe errors, input/output caps and read validation are unchanged. |
| `src/server/stdio.ts` | Construct the production HTTP client with an immutable filtered descriptor list derived from the same trusted capability, rather than all noncritical descriptors. Thus a production-created client cannot resolve write routes even if the upper dispatch path regresses. Never use testOnly to widen the descriptor list. Test runtime injection still exercises the real immutable policy and cannot publish/call writes. |
| `src/index.ts` | Update local --help/doctor statements so they do not advertise writes or deferred sensitive scope. No new release selector or bypass flag. This file is a necessary explicit ownership extension requiring coordinator approval; no edit has been made. |
| `src/coverage/report.ts` and regenerated coverage | Add release-eligibility/effective-execution metadata without changing historical catalogue implementation/tier/spec counts. Catalogue implementation status is distinct from release permission: nonread forms remain documented but unavailable in this release. Preserve schemas and pending lab-validation flags. |

`src/api/catalogue.generated.json`, OpenAPI, full operation metadata/input validators and historical alpha receipts remain intact. A new filtered descriptor export can live in the capability module or stdio boundary; changing generic HTTP signer/client internals is unnecessary. The low-level client is an internal reusable transport and synthetic POST/DELETE signing tests remain valid; only the production stdio factory receives the release-filtered descriptors. This proposal guarantees the compiled MCP production boundary, not resistance to an operator replacing installed JavaScript or importing a generic transport with their own operation catalogue.

Rejecting forbidden file flags before env overlays closes the current possibility that a file containing write:true is neutralized by DARKTRACE_PROFILES=read. Secure configuration rejection must occur before DNS/signing/socket creation. No network probe is required to reject these profiles.

## Functional tests affected and replacement expectations

Do not add an alpha/test capability bypass to keep old positive write expectations passing. Preserve historical evidence/cases in a version-labelled alpha archive or immutable alpha revision and replace active stable expectations with stronger deny assertions; independent review must approve the migration. Do not silently skip obsolete cases or continue reporting 113 passes as stable proof.

| Current file | Impact / stable verification |
| --- | --- |
| `test/unit/config.test.ts` | WriteCritical prerequisite assertion becomes immutable release rejection; add absent/false/true/nonboolean variants and unchanged sensitive-read opt-in. Preserve all network/file/limit checks. |
| `test/unit/policy.test.ts` | Positive medium/high dispatch, critical preview, form preview and write-audit outcome cases no longer describe the release. Replace production expectations with no preview, fixed refusal, zero request/audit/signing and forged-config denial for every nonread operation. Keep audit primitives and historical alpha execution tests archived; keep existing default read/security checks. |
| `test/contract/integration.test.ts` | Remove write-enabled shared config; status signing fixture stays read-only. Form-write/critical positive test becomes production descriptor and policy rejection. Lower-level body/signing tests remain elsewhere and must not be removed. |
| `test/mcp/server.test.ts` | WriteCritical tools/list and preview expectation becomes rejected configuration and hidden/direct-denied tool. All read-onlyHint annotations true. |
| `test/mcp/corrections.test.ts` | Shared write config and write schema/preview case change to baseline read MCP schema checks plus refusal. Preserve input-io, initialization and unrelated regression cases. |
| `test/mcp/integration-final.test.ts` | Shared write config and execution/audit effect case migrate to stable zero-side-effect denial. Keep cleanup/stdio/limit/audit primitive tests unchanged. |
| New `test/contract/read-only-release.test.ts` and/or `test/mcp/read-only-release.test.ts` | Exhaustive catalogue deny table, forged profile objects, dryRun absent/true/false, confirm/hostApproval flags, unavailable operation selectors, filtered descriptor equality, exact default listing and production child startup env/file-overlay rejection. Exercise GET reads unchanged. No real appliance calls. |

The current grep-identified configuration consumers are the files above plus security cases below. During implementation rerun typecheck and inspect imports for further type fallout; do not weaken checks just to preserve counts. `test/unit/client-http.test.ts` and `test/security/signer-client.test.mjs` legitimately exercise generic transport signing with synthetic descriptors and can remain independent of MCP release policy.

## Security suites and MR04 migration

- `test/security/policy-sinks.test.mjs`: write dispatch/preview/audit positives become release refusals with zero sinks for every write tier. Existing prompt-injection, allowlist/output projection and read checks remain. Historic positive write audit tests require alpha evidence separation, not a production bypass.
- `test/security/config.test.mjs`: profile file fixtures currently use write:true for mode tests. Replace those synthetic policy payloads with a supported false/read policy so ownership/mode acceptance tests still test file security rather than fail early on release semantics; retain separate true-write rejection tests. Invalid permissions must still be rejected for the intended reason.
- `test/security/mcp-defense.test.mjs`: MR06 independent-profile acceptance must become immutable write denial across object/env/file-overlay/startup channels. MR01 sensitive AdvancedSearch output test remains active with its existing synthetic read fixture; it is not lab compatibility proof. Unicode defenses must not lose assertions. MR04 selects the new independently reviewed stable fixture. MR05 lifecycle and MR02 TLS/network guards remain fully active.
- `test/security/mcp-contracts.mjs`: preserve original alpha helper/profile definitions as historical evidence; new stable contract helper uses only supported configurations, never auto-generates its oracle. Forbidden profiles have dedicated rejection tests rather than fake tools/list captures.
- `test/security/run-isolated.mjs`: add any newly named suite to its existing discovery naturally; retain complete receipts/assertion counts and source binding. If historical cases are archived, keep them outside active *.test.mjs discovery with explicit provenance and alpha-only execution instructions; do not mislabel them stable passes.

The existing `test/security/fixtures/mcp-tool-contracts.json` must remain byte-for-byte historical alpha fixture SHA256 `37b5af95de1786ecce1b8762e12d2d63e577f171511a9db4964518b13a917f72`:

| Historical profile | Tools | Canonical SHA256 |
| --- | --- | --- |
| read | 27 | `49e37f629592026c68ad3ab2389a855bf702827cb887bce66d1d5ed3747b5052` |
| read+sensitive | 28 | `71de9e47636e0f421b1aaaf137bfd0c0e97479cc7ac07edeba7970f3bdb84c1f` |
| read+write | 36 | `baaaf4a7ae6bd522201acae1ee7bd3df503373363098390b8794388cf12a142f` |
| read+writeCritical | 41 | `36d8db13f56644c2083039c47a0bb777bbe3b44a6eb7b907e4ad3ed7122350fb` |

Create a distinct proposed `test/security/fixtures/mcp-tool-contracts-first-stable.json` with provenance/capability identity, complete ordered name/description/inputSchema/annotations and canonical hash, plus the explicit write/critical configuration-refusal matrix. Default listing remains exact read27 and sensitive28 contracts with their existing canonical hashes; no description/schema/annotation change is needed. Independently pin these two supported contracts in the separate stable fixture alongside code-owned startup-rejection expectations for forbidden write profiles; never pretend the denied write profiles are successful empty listings. Explicit false aliases should produce the exact default contract and be tested against the same oracle.

Generate candidate contract evidence in a clean external snapshot, submit the full candidate/diff and hashes to the independent reviewer, and only pin the separately accepted fixture after approval. Generation cannot update an oracle or expected hash during tests/build. Test mutation of descriptions, schema, selector and annotations so the verifier rejects a changed contract. Catalogue schemas need not change merely to prevent authorization.

Packaging impact is outside current ownership: `scripts/prepare-release.mjs` currently captures four alpha profiles; `scripts/verify-release.mjs` pins their paths, hashes and receipt fixture. Their owner must select the new reviewed first-stable fixture/helper and bind its capability, source hashes and checksums without overwriting the historical alpha asset or verification rules. No helper/version/release file is modified by this proposal.

## Approval sequence and gates

1. Coordinator approves immutable write denial, retained separate sensitive-read opt-in and the exact necessary ownership extensions (stdio/index/coverage and affected active tests). Until then source `4f6e` stays frozen.
2. Implement the constant/config/policy/production descriptor guard and focused negative tests; preserve alpha provenance separately. Review semantics before capturing any new oracle.
3. Independent reviewer accepts the full new stable tools/list contract and its hash; active stable MR04 checks then pin it explicitly. Separate packaging owner updates candidate evidence selection.
4. Run targeted tests, typecheck, full functional and full security suites in a clean isolated copy; report actual counts/skips and source hash. Root performs Linux Node22/24, final Docker/package checks and approved sanitized read campaign with a new source-bound manifest. This worker makes no live calls.
5. Stable publication waits for all applicable gates and honest supported-read scope. No version is selected or changed here; writes need their own future-release capability, compatibility and security review.

## Implementation checkpoint after explicit approval

Coordinator approved the write-only ceiling with sensitive read opt-in retained, exact source/test ownership extensions and historical archive migration. Implemented: `src/policy/release-capability.ts`, `src/config/schema.ts`, `src/config/load.ts`, `src/policy/guard.ts`, `src/server/stdio.ts`, `src/index.ts`, `src/coverage/report.ts` and generated coverage. `src/tools/index.ts` needs no additional edit: its existing authorize checks now inherit the immutable capability before preview and dispatch. Catalogue and generic client remain unchanged. Returned parsed write booleans are always false; Config types stay boolean to permit forged-object negative tests without a production bypass.

Historical byte-preserving copies of ten affected test/helper files are stored under `test/historical/alpha-read-write/` with `.txt` suffixes outside active test discovery and TS compilation. `provenance.json` records original paths, SHA256, source baseline and alpha oracle. Copies were taken before any active test changes. Alpha positive write expectations were replaced with stable no-preview/no-audit/no-network assertions; audit primitive and low-level signer tests remain active. No skip or test-enabled release capability was added.

Source checkpoint SHA256: `7104f8c4518d45f090e471a5c3412bfcebe4bdda54c6d3b543581510ba460be8`, using the security receipt's sorted recursive src-file hash-map algorithm. The historical alpha fixture still hashes to `37b5af95de1786ecce1b8762e12d2d63e577f171511a9db4964518b13a917f72`.

Clean external snapshot: `/private/tmp/darktrace-read-only-0mbihxf6`. Environment only PATH, operator-free HOME and TMPDIR; dependencies reuse existing local node_modules; no operator configuration/tokens. Exact commands run there:

- `npm run typecheck`: exit 0.
- `npm run build`: exit 0.
- `node --test dist/test/contract/read-only-release.test.js dist/test/contract/integration.test.js dist/test/unit/policy.test.js dist/test/unit/config.test.js dist/test/mcp/server.test.js dist/test/mcp/corrections.test.js dist/test/mcp/integration-final.test.js`: 45 pass, 0 fail/skip, exit 0.
- `node check-candidate.mjs`: exit 0; verifies exact two read contracts, rejects mutations of description/schema/annotations/order, and checks all three refused profiles. Supporting external candidate-check.json records zero requests and oraclePinned:false; it does not replace independent review.
- `node capture-first-stable.mjs`: production compiled server plus SDK in-memory transport captured both complete read contracts; deep equality and canonical digests exactly match alpha read27/sensitive28. No requests or appliance calls.

First targeted snapshot `/private/tmp/darktrace-read-only-ruqiq784` had 43 pass / 2 failures: the newly added loader-positive test needed the existing exact-native TLS Node-test bootstrap, and the migrated GET schema assertion needed to assert absent dryRun rather than an optional-array result equal to false. Both test changes preserve production guards; final commands above passed.

Candidate complete stable contract: `/private/tmp/darktrace-read-only-0mbihxf6/mcp-tool-contracts-first-stable.candidate.json`, SHA256 `1adf0108cdd6e7c925943be8c46808e11a6ac0f5c9b83e80b08a24eb9f09e19d`; review diff `alpha-to-first-stable.diff` alongside it. It contains the unchanged complete read/sensitive contracts, immutable capability metadata and three explicit refused profile expectations. This candidate is not yet pinned in the repository. Active MR04 temporarily verifies the existing alpha fixture's two read contracts and tests refused write profiles; a separate stable fixture must be accepted independently before oracle migration.

Full functional/security suites have not yet run on this capability checkpoint: coordinator explicitly ordered targeted/candidate first, independent MR04 acceptance second, then full gates. Counts 113/324 belong to the prior source, not this new checkpoint. No claim of final stable readiness, Linux, Docker, package or live compatibility is made.

Attempted review/packaging notifications to the supplied reviewer/worker dispatches were rejected because those dispatches were completed; the coordinator was informed to create new follow-ups. Awaiting independent candidate acceptance and subsequent full-gate authorization. No commit, push or publication.


### Accepted description/fixture and full local gate checkpoint — 2026-10-05

This checkpoint supersedes the earlier pending-oracle/full-suite statements above; their original phase evidence remains historical. Independent review accepted the consultation-only description correction, and root authorized the separate first-stable pin in `msg_f35fa2a91121`. Current source SHA256 is `d4d3f78c3a8e6668fcab76b483d6ec5d13a20e34b3f08853651f2039a985fb87`. Only `src/tools/index.ts` changed after source7104: the write-preview sentence now states that this release exposes consultation operations only and write actions are unavailable. Schemas/selectors/annotations/order are unchanged.

Accepted stable fixture SHA256 is `ea31d70a484c0d0353cb8651edc4b6a4ab13798c096056e8cdcf68e78324707f`, with complete read27 hash `6ce22e568592b27281d14b1fd7361f80da1e0daf7bb2888c892458cc9f532e68` and sensitive28 hash `def9a8db53e2fc4d000257d865a2da5c2453c30285e6fb61244ce02c57434a6b`. Active MR04 and packaging now bind this distinct approved oracle and three forbidden startup profiles; alpha37b5 is unchanged. Tests cannot rewrite it. Packaging source/receipt/contract/archive bindings and mutation checks are described in [release-preparation-docker-mcp.md](../history/release-preparation-docker-mcp.md).

Root also approved archiving the remaining alpha positive critical-write stdio test separately before migration: original SHA256 `e14fb7a0247bbb991cbc43c363f147881f08584425bf9175f522d8e2d32b1d5c`, supplemental manifest `33cbdcac2bb47ddc59585836180374a4e63de68945530042c6005d2e02d511a8`. The original ten-file archive is unchanged. Its replacement asserts nine production refusals, zero side effects, sanitized diagnostics and exact known-variable names. Three obsolete security startup-variable expectations were corrected without relaxing their guards.

Actual isolated local commands: `npm run typecheck` exit0 and `npm test` exit0 with 118 pass/0 fail/0 skip, including the final strengthened stdio assertion (`/private/tmp/darktrace-stable-functional-e9svmw6i`). `npm run test:security` in `/private/tmp/darktrace-stable-gates-olv6hjlc` exits1: 325 tests, 313 pass, six TLS `listen EPERM` failures and six existing platform skips. This is not a passing security gate; no bypass/new skip was introduced. The receipt classifies 313 PASSED/12 BLOCKED/0 assertion FAIL, records 16,001 assertions and `receiptComplete:true`, and hashes to `567714c247b450493b012a696f295f4e709048b384244caddeae28b48e7f3c2d`. Linux/TLS, final isolated release pipeline, Docker and live compatibility remain pending coordinator gates; no version change or publication occurred.

### Exact earlier implementation checkpoint file hashes

| File | SHA256 |
| --- | --- |
| `src/policy/release-capability.ts` | `39cb390e1ba5fdd3a0cda3232dbdbbf4a9ed619373bd7f7f804d80137e7317af` |
| `src/config/schema.ts` | `c39d867404895f3d0307c6ade0ce62daee7b3e008fa6ef315c2cf507dcaa8528` |
| `src/config/load.ts` | `ad23445b7712a28ce1856c1f774dee147414add9dd374abe265ed2adbd575cb4` |
| `src/policy/guard.ts` | `3fe3a853c0b41712769f02202e54048f120b09c52debc30b1e486cd0bdce2cdf` |
| `src/server/stdio.ts` | `da31207782cb36fe4ae630ec204fce5acd7adf18e507a2f1d2364d520a597e30` |
| `src/index.ts` | `d5d887034ffd2ae85db636d5295e5f43177355862b9dd24966b9701a297dec42` |
| `src/coverage/report.ts` | `699bef7728916ca32d6f2d6441ec3ddb97487ca964989d47eba4a72d65d13f7e` |
| `src/coverage/report.generated.json` | `0759f30fd355606b5569ca169f447f15a4383e14dacbaf8c36ac8ea2d31add48` |
| `test/contract/read-only-release.test.ts` | `93050ec98fa928fba3d694fd520120ca34cadac09310d253ffeb07d06e4eb27e` |
