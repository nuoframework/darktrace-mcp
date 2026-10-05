# Validated consultations: release-helper and full-contract migration plan

Checkpoint: 2026-10-05 UTC / 2026-10-06 Europe/Madrid. Worker `task_48d8db91eebe`, dispatch `ctx_8bda65425c97`. **ACCEPT external 15/15 full contract for root pin consideration; helper/test migration and complete source/release acceptance remain pending.** This dispatch edits only this plan and the current section of [candidate preparation](../release-preparation-docker-mcp.md). No helper, source, fixture, test, package, Git, credential or appliance mutation/call is authorized here. No oracle is automatically regenerated or pinned. Source owner `ctx_49a07121236f` implements the new policy separately; README counts stay planned until source acceptance.

The user approved first stable **only for the 19 validated GET selectors below, grouped into 15 tools**. Both `read` and `read+sensitive` must advertise identical complete 15-tool contracts; sensitiveRead must grant no extra operations. `RELEASE_CAPABILITY` stays frozen `{write:false,writeCritical:false}`. Scope approval is not a security waiver: applicable bundled OpenSSL CVE-2026-35189 and independently reviewed scanner residuals still block stable publication.

## Accepted predecessor evidence is not new-scope acceptance

[Independent R1/R2 review](response-view-overrides-independent-review.md), dispatch `ctx_afa82b46d409`, is **ACCEPTED** for rebuild, full-suite and same-recipe lab retest. It found only the documented Antigena summary numeric-ID arrays and automatic null triggerer corrections; its exact full contracts remain read27/sensitive28. Source SHA-256 is `aa08c260847c0fc206253f2de3cb1a872f89d2f9d85f5618b88ffd0f5c681e8e`. This closes the earlier pending R1/R2 independent review, not the forthcoming whitelist review.

[Accepted historical aa08 Docker checkpoint](response-view-overrides-docker-checkpoint.md): image `sha256:dfaf529bd23a3fd10a684386b72a751cbccbee9f711f1637af69a25e8cb27c00`, runtime tree `b00369cb5757301c295c4a3585ebbf9314237a11a9db4b38beb51a834d69b55a`, exact hardened offline read27 SDK PASS, nine startup write refusals, source/runtime/three production dependency bindings and positive unchanged component closure. It reused historical fresh databases on byte-identical Node/OS/dependencies; it is not a new scan refresh or live Docker result. OpenSSL 3.5.8 remains affected, official severity Low, fixed in 3.5.9; the examined official supported Node releases did not provide that fix on October 5. Trivy's 23 MEDIUM/8 LOW and Grype's 11 High/10 Medium/3 Low/7 Negligible refer to the 31 baseline Debian matches, not zero High or zero CVE.

The root's native 17-selector d4d3 checkpoint plus two aa08 Antigena selectors explains the selected subset. New source enforcement, complete new contract and source-bound retests still need acceptance. Preserve earlier permission failures, refused structure diagnostic, projection mismatches and package/image receipts with their original hashes and source identities.

## Exact independent scope baseline

These are actual MCP names from the operation catalogue, rather than catalogue group labels. Array order is reviewed separately from set membership; this table does not authorize a changed registration order.

| MCP tool | Permitted operation selectors |
|---|---|
| `darktrace_get_status` | `get_status` |
| `darktrace_get_devices` | `get_devices` |
| `darktrace_list_subnets` | `get_subnets` |
| `darktrace_get_ai_analyst_stats` | `get_aianalyst_stats` |
| `darktrace_get_intel_feed` | `get_intelfeed` |
| `darktrace_list_model_breaches` | `get_modelbreaches` |
| `darktrace_search_devices` | `get_devicesearch` |
| `darktrace_get_similar_devices` | `get_similardevices` |
| `darktrace_list_ai_analyst_incidents` | `get_aianalyst_groups`, `get_aianalyst_incidentevents` |
| `darktrace_list_ai_analyst_investigations` | `get_aianalyst_investigations` |
| `darktrace_get_model_breach_comments` | `get_mbcomments` |
| `darktrace_get_connection_details` | `get_details` |
| `darktrace_list_tags` | `get_tags_entities`, `get_tags_tid`, `get_tags_tid_entities` |
| `darktrace_get_endpoint_details` | `get_endpointdetails` |
| `darktrace_list_antigena_actions` | `get_antigena`, `get_antigena_summary` |

All must be implemented, read-tier GETs. The old production descriptor ceiling has 39 implemented semantic reads (38 GET plus one POST); subtracting these 19 leaves exactly **20 previously eligible selectors** to deny:

```text
get_aianalyst_incident_comments
get_components
get_components_cid
get_cves
get_deviceinfo
get_devicesummary
get_enums
get_filtertypes
get_metricdata
get_metrics
get_metrics_mlid
get_modelbreaches_pbid
get_modelbreaches_pbid_comments
get_models
get_models_pid
get_network
get_pcaps
get_summarystatistics
get_tags
post_advancedsearch_api_search
```

In particular, shared tool groups must lose their excluded branches: modelbreaches loses pbid, mbcomments loses pbid_comments, and tags loses get_tags and every write. A tool's name surviving does not authorize its old enum/union branches. For a tool narrowed from a historical multi-operation group to one allowed selector (modelbreaches and mbcomments), an omitted operation discriminator must route to that sole advertised operation with the same validation as tools/list. It must not select a historical excluded variant or fail merely because allTools had multiple variants. Explicit excluded IDs still fail. Actual SDK calls with synthetic clients must cover omitted and explicit valid selection plus explicit deferred selection.

Every excluded selector and all 22 nonread catalogue operations must fail before preview, audit or client/signing/network effects, including direct calls, forged config, sensitiveRead, confirmation/provider flags and omitted/true/false dryRun. All other blocked/excluded catalogue operations remain denied. Test authority by operation ID plus GET/read/implemented predicates, not caller-supplied method/tier/status or a tool-name-only whitelist.

## Reviewed helper assumptions and exact narrow changes proposed

| File / existing boundary | Needed migration after independent full-contract acceptance |
|---|---|
| `scripts/prepare-release.mjs` | No literal 27/28 count or profile hash exists. Keep two supported profile captures, security-before-pack, both complete-contract comparisons around the second build and schema-3 evidence. Its recursive `src/scripts/openapi/test/examples` input inventory automatically binds new source/fixture and any preserved predecessor fixture. Add only a specific new historical predecessor provenance binding if root chooses that approach; do not bypass the current verifier to get a package out. |
| `scripts/verify-release.mjs` lines 14–21 | After explicit root pin authorization, replace the current fixture byte pin `ea31…` and both canonical profile pins with independently reviewed new values. Both profile hashes must be equal because all names/descriptions/schemas/annotations/order must be equal, not just counts. Replace fixtureCapability's obsolete `operator opt-in; semantic read, not live-validated` wording with the exact independently accepted metadata stating no additional stable operations. Keep `{write:false,writeCritical:false}` and the existing three forbidden profiles byte-semantically unchanged. |
| `verifyFirstStableContractContent`, `captureReviewedContracts`, contract asset/evidence checks | Retain complete canonical contract equality, byte pinning and exact profile/rejection metadata. Add explicit 15-tools-per-profile, identical ordered arrays, exact 19 selected operation IDs with no duplicates/extra branches and GET/read predicate assertions against trusted descriptors. Bind the policy source and new whitelist IDs/digest in source/evidence if the implementation adds a separate policy module. Never replace full equality with counts or derive the expected scope from the just-generated output. |
| `verifyReleaseEvidence` lines 82, 85, 89 | Keep fixture/source/receipt equality and all present guard source bindings. Add any new separate whitelist policy file to the explicit guarded-input list; if whitelist remains in `release-capability.ts`, that file is already byte-bound but its changed bytes need review. Keep fixture filename receipt checks aligned with the deliberate migration choice, plus predecessor preservation checks. Do not use fallback to the old fixture or accept a receipt from aa08/d4d3 for the new production tree. |
| `test/security/mcp-contracts.mjs` | `toolContract` already captures full ordered name/description/inputSchema/annotations and dispatches no appliance calls. `releaseProfiles` already has the required two supported profiles; retain both and the three forbidden profiles/9-mode startup refusals. No literal 27/28 assumption needs changing. Add independent exact-scope assertions to the accepted tests/helper boundary if required; do not turn this helper into a fixture-writing/pin-updating step. The original four `profiles` keys are alpha provenance plus active denial cases, not a request to restore write contracts. |
| `scripts/validate-examples.mjs` | No count, fixture pin or sensitive opt-in grant exists. Keep default read/sensitive=false examples, fixed production Node path, immutable Docker image requirement, readonly synthetic/token file mounts, every hardening flag, no TLS bypass, no write grant or daemon mount, and offline JSON/TOML/Markdown parsing. Update prose counts by the docs owner after source acceptance; no launch-policy relaxation is needed. |

Accepted candidate metadata retains canonicalization and alphaFixtureSha256 (the predecessor envelope has no schemaVersion field); keep the exact two supported contract keys and the existing rejectedProfiles object. The independently accepted releaseCapability.sensitiveRead literal is `operator opt-in; cannot expand the validated consultation ceiling`; assert it exactly in verify-release. Both write booleans and rejectedProfiles remain unchanged. The complete candidate byte hash and profile hashes below are reviewed values, not permission to pin without explicit root acceptance. If metadata gains a whitelist ID list/digest, validate it from the independent table above and bind it everywhere the complete artifact is checked. A schemaVersion change is needed only for an incompatible artifact format; shrinking full contract values alone does not require one.

## Every affected contract-test migration requirement

| Existing test boundary | Required new assertion / preservation |
|---|---|
| `test/contract/read-only-release.test.ts` | Replace descriptor expected set derived from all implemented reads and old 39/one-POST counts with independent exact 19 GET IDs, frozen descriptors and zero POST. Expand operation denial matrix to the exact 20 newly deferred reads plus all existing 22 nonreads; assert zero preview/audit/network and no reflection under forged write/critical/sensitive configs and all dryRun values. Keep protected-file overlay, immutable capability and startup refusal checks. Coverage releaseEligible must be false for every deferred selector. |
| `test/security/mcp-defense.test.mjs` MR-04 | Compare both supported profiles to the independently pinned new full fixture and assert identical 15-tool arrays/19 branches. Keep Unicode cleaning, exact descriptions/schema/annotations and forbidden-profile object/SDK/production refusals. A mismatch against old ea31 is an expected migration blocker, not permission to recapture the fixture. |
| Same file MR-01.TOOL and IR Unicode/tool arrays (currently include Advanced Search success) | Preserve the former complete tests in reviewed historical text/provenance before replacing active Advanced Search success with explicit zero-effect refusal. Exercise equivalent nested string/key/invisible-control/prototype/output-budget tests on a permitted GET with a matching documented projected response path, or keep the direct lower-level projector tests. Do not retain an expected successful POST or silently drop its output-security coverage. Status success tests and all transport/config/lifecycle controls stay active. |
| `test/security/policy-sinks.test.mjs` ST-07 | Account for all 79 catalogue IDs; preserve 22 nonread count. Derive allowed IDs from an independently fixed whitelist; deny every other operation, including the 20 formerly eligible reads, not only status-blocked/advancedsearch routes. Verify all refused calls produce zero request and audit counters. |
| Same file ST-09.SENSITIVE / MINIMIZATION | Both false and true sensitiveRead must refuse Advanced Search (including forged providerEligible and model argument grants), with zero effects. Preserve documentary provider/retention/residency/eligibility assertions. Move successful minimization/canary checks to a permitted nested GET or test projector directly; a refusal with zero calls cannot stand in for a tested output projection. |
| `test/contract/read-summary-compatibility.test.ts` summary success/default calls | Archive the former callTool success expectation and replace it with denied summary selectors/zero sinks for both profiles. Keep hourly-anchor schema validation, compiled conditional views and direct projection stripping/bounds as unexposed catalogue regression tests. Status API-error enum/nonreflection checks remain active. Do not label the refused call a successful live-compatible summary. |
| `test/contract/response-view.test.ts` Advanced Search success | Archive the old application-level expectation; add denial assertion at callTool and preserve its unknown nested secret/key stripping independently at the projection layer or a permitted documented response view. Do not weaken the underlying catalogue/view budgets merely because the operation is deferred. |
| `test/unit/policy.test.ts`, `test/mcp/server.test.ts`, `test/mcp/stdio.test.ts`, `test/contract/integration.test.ts`, `test/mcp/integration-final.test.ts`, `test/mcp/corrections.test.ts` | Strengthen weak nonempty/readOnly checks to exact two-profile names/order/schema contracts and excluded shared-group selector refusals as appropriate. Keep status successful fixture/signing/route behavior, unknown/prototype input refusals, output caps, write refusal and raw stdio safety. For models_pid traversal currently blocked by new scope, retain separate low-level validator traversal coverage so an earlier policy refusal does not make the input-validation claim vacuous. |
| `test/contract/catalogue.test.ts`, `coverage-final.test.ts`, `corrections.test.ts`; signer/client low-level tests | Preserve all 79 design rows, 59 implemented/19 blocked/one excluded source accounting where unchanged, schema generation, encoded-query validation, path/signing bounds and response views. Catalogue implementation does not imply release eligibility. Pure low-level Advanced Search schema/signing tests may remain as unexposed catalogue tests; no production/MCP success assertion may imply eligibility. Add exact 19 releaseEligible IDs to coverage assertions. |
| `test/security/run-isolated.mjs` and receipt consumer | Keep complete enumerated subcases, actual failures/skips, source/builtSource/runtime maps and fixture hashes. This runner has no old 27/28 count. New tests can change case totals; do not require historical 325 or erase historical receipts. Every full new receipt must be source-bound, complete and exit zero before package verification. |
| Release helper tamper/evidence tests and CI Docker SDK smoke | Re-run output-path/regular-file/archive/mode/SRI/README.es/evidence/fixture tamper checks against new pins, including old-fixture replay, one changed branch/name/schema/annotation/order, extra tool, missing selector, changed profile metadata and mismatched receipt. Keep no runtime auto-pin. CI currently only requires nonempty Docker tools/list; independent offline exact15 full-contract evidence is required even if CI is not changed in this migration. |

Historical projection tests are evidence, not active authorization. Preserve the underlying security guarantees with active allowed-operation or lower-level tests; do not merely archive assertions and reduce coverage. No broad test replacement or rewriting all expected counts is justified. The source owner controls implementation/tests under its dispatch; this document does not authorize this worker to edit them.

## Historical fixture preservation and pin handoff

1. Preserve alpha fixture `test/security/fixtures/mcp-tool-contracts.json`, SHA-256 `37b5af95de1786ecce1b8762e12d2d63e577f171511a9db4964518b13a917f72`, both existing alpha historical test archives/provenance and all earlier receipts unchanged. Their currently pinned manifest checks must remain active.
2. Preserve the accepted predecessor full stable fixture bytes `ea31d70a484c0d0353cb8651edc4b6a4ab13798c096056e8cdcf68e78324707f`, read27 canonical `6ce22e568592b27281d14b1fd7361f80da1e0daf7bb2888c892458cc9f532e68`, sensitive28 canonical `def9a8db53e2fc4d000257d865a2da5c2453c30285e6fb61244ce02c57434a6b`. Narrow recommended approach: add a nonexecuting historical predecessor fixture copy plus provenance binding before root deliberately replaces the active `mcp-tool-contracts-first-stable.json`. Alternative: keep that active-path file unchanged as predecessor and introduce a separately named validated-only fixture, updating every active fixture consumer/receipt key deliberately. Choose one; do not support a permissive dual-oracle fallback.
3. Historical former tool-success tests must be copied verbatim to nonexecuting `.txt` archives with original-path hashes, predecessor source/fixture identity and a pinned provenance manifest, analogous to the existing alpha archive. New helper preservation checks must verify exact bytes, regular files and inclusion in source-files evidence. Keep existing alpha validation unchanged; adding predecessor verification is separate from changing its original manifest.
4. The source owner supplies an external complete candidate for both supported profiles, canonicalization/rejection metadata and bound source/runtime inputs. A reviewer compares actual SDK tools/list against exact schemas/descriptions/annotations/order, confirms the independent 19-ID table and all denials, and records byte/canonical hashes. Only after explicit root acceptance may a separately authorized owner copy the reviewed bytes to the active fixture and pin matching helper constants. Never generate the expected oracle from the candidate in the same accepting test.
5. Rebuild and run full functional/security/reproducible package, installed archive verification, hardened exact-contract Docker SDK, image/source/runtime/dependency/scan/manual upstream review and root-owned protected-manifest bounded lab gates on the final freeze. Old aa08/d4d3 evidence and old alpha assets remain historical. Version stays private alpha until separately authorized; no tag/release/registry publication is implied.

## Independent external full-contract review — ACCEPT, scoped

Decision: **ACCEPT the external full 15/15 contract for explicit root pin consideration**. This is not helper/source-wide acceptance, an oracle pin or stable-publication approval. No active fixture or helper constant changed. Independent execution used Node v24.14.1 on macOS arm64; no real credentials or appliance calls occurred.

Owner handoff: `/private/tmp/darktrace-validated19-ctx_49a07121236f/mcp-tool-contracts-validated19-candidate.json`. I copied the candidate, source map, metadata, source, compiled runtime, helpers and historical test inputs to a separate external snapshot before execution. Its recursive locale-sorted src hash map exactly matches the owner's map and metadata. My complete compiled-runtime inventory is recorded separately; this review tested those frozen compiled bytes, without claiming a newly reproduced build or an installed-package receipt.

| Reviewed identity | SHA-256 |
|---|---|
| Complete candidate fixture bytes | `6ddda2054c9c708d0516a90b7811eb0aba565016403953dace89d47bc89d213c` |
| Canonical ordered tools for `read` | `cd4ee42249a9110182046794c39fc00f5995700b7d751bccc6628e86afbddfe3` |
| Canonical ordered tools for `read+sensitive` | `cd4ee42249a9110182046794c39fc00f5995700b7d751bccc6628e86afbddfe3` |
| Production source tree | `9e7c7070298ef592a1a10cdcb7ca481420a377e25e4a93c863ca33c31921d7f2` |
| Complete copied `dist/src` tree | `c65673ccb8b14de318a21000988756c4e81c820e90a3ee4d57dff3f7a78aeb40` |

The reviewed candidate envelope differs from the accepted predecessor only in full contracts and `releaseCapability.sensitiveRead`, now exactly `operator opt-in; cannot expand the validated consultation ceiling`. Alpha byte identity, canonicalization and rejectedProfiles are identical. Both full ordered arrays are identical, exactly 15 unique MCP names and 19 unique operation branches matching the independent table. Every operation is implemented/read/GET with its trusted catalogue tool and fixed production descriptor route. Every description lists only its filtered IDs, excludes critical-preview advice and limits live compatibility to published recipes. Annotations are exactly readOnlyHint=true, destructiveHint=false, idempotentHint=true, openWorldHint=false.

I compared each allowed schema branch with its predecessor branch, normalizing only the top-level JSON-schema dialect marker and operation discriminator requirement/default differences caused by narrowing a multi-operation tool to a sole advertised selector. **Every remaining path/query/body field, required parameter, strict-object rule and schema budget matches the predecessor.** The new single-operation selectors have fixed operation defaults/const values; multi-operation tools retain reviewed explicit discriminators. This semantic comparison supplements the exact new full-contract byte/canonical equality; it is not a count-only acceptance.

Independent `/private/tmp/darktrace-validated-release-plan-ctx_8bda65425c97/snapshot/review-contract.mjs` exited **0**, producing `independent-contract-review.json` and its log:

- In-memory SDK capture for both supported profiles exactly equals the external candidate's ordered names/descriptions/schemas/annotations; identical canonical hashes.
- Actual initialized **production stdio** SDK tools/list for both sensitiveRead=false/true exactly matches the full candidate. Child instrumentation denies DNS, sockets, HTTPS and HMAC before real side effects; fixed synthetic credentials and isolated environment only, with no guard violation or token reflection.
- **540 direct denied-call assertions**: all 60 excluded catalogue operations × three configuration matrices (default, sensitive, forged write/critical/sensitive) × omitted/true/false dryRun. This includes all 20 newly deferred reads and all 22 nonreads. Client, audit and shape counters remain **0/0/0**, with no preview/outcome or input canary reflection. All other blocked/excluded IDs remain denied as well.
- Actual production stdio makes **eight** successful refusal checks across both profiles for excluded modelbreaches pbid, mbcomments pbid_comments, tags get_tags and tags write selectors. No guarded signing/network effect occurs.
- Synthetic initialized SDK callTool verifies four actual omitted-discriminator routings across both profiles: modelbreaches → get_modelbreaches, mbcomments → get_mbcomments. Their fixed synthetic client sees exactly those IDs. These are offline routing checks, not appliance compatibility calls.
- Frozen primitive whitelist, exact 19 frozen GET production descriptors, and allowed-ID descriptor mutations to wrong ID/method/tier/status/path all fail closed. Exact immutable two-boolean capability is preserved.
- All three forbidden profiles retain object/SDK rejection and **nine** production stdio/doctor/check-config startup refusals. Existing alpha archive/provenance verification passes, and both alpha and ea31 predecessor fixture byte hashes remain unchanged.

The owner's separate full functional baseline log reports **129 cases, 127 PASS, two FAIL, zero SKIP**: former summary callTool success and former Advanced Search callTool projection success need the deliberate test migrations above. These are retained failed expectations, not a successful full suite or permission to drop projection coverage. Security/fixture consumers and release helpers still point to ea31 and will also require the explicitly accepted migration. This worker did not run or relabel that owner's full suite as independent PASS.

Root may now separately authorize pinning these exact candidate bytes and matching metadata/hashes after its whole-source review. It must first select and accept predecessor-fixture/test archival provenance, apply the narrow helper/test changes, then freeze and rerun full functional/security/reproducible package/installed archive/image/scan/root lab gates. Any source change affecting advertised contracts requires fresh independent review; no auto-capture fallback is accepted. OpenSSL and residual-risk gates remain open.

External receipts: `/private/tmp/darktrace-validated-release-plan-ctx_8bda65425c97/`. `reviewed-input-hashes.json` records initial helper bytes; `independent-binding.json` binds complete source/runtime maps and candidate hash; `independent-contract-review.json` records actual outcomes; `plan-hashes.json` records the two owned documents. No helper/source tests were executed in the shared checkout by this dispatch.
