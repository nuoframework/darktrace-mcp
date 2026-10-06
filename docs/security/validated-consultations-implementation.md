# Validated consultation ceiling implementation

**Implemented for independent review: exactly 19 GET selectors in 15 tools, identical under read and sensitive-read configurations.** This report does not pin a contract oracle or approve stable publication. The external unpatched OpenSSL blocker remains open without waiver.

Date: 2026-10-06 (Europe/Madrid). Task `task_30744780dee1`, dispatch `ctx_49a07121236f`. No credential, live API, Git, Dockerfile, version, package, fixture or release-helper modification occurred. No delegation occurred. Tests/builds ran only in the external snapshot `/private/tmp/darktrace-validated19-ctx_49a07121236f/`; no shared dist build was run.

## Changed behavior and files

`src/policy/release-capability.ts` preserves the exact frozen `{write:false,writeCritical:false}` object. A separate frozen array of primitive operation IDs defines the approved ceiling. Membership additionally requires `implemented`, `read`, `GET` and the exact fixed route from a frozen primitive-value path map. A matching ID with altered method, tier, status or path fails authorization. Catalogue implementation status cannot add a selector.

The exact approved IDs are:

```
get_status,get_devices,get_subnets,get_aianalyst_stats,get_intelfeed,
get_modelbreaches,get_devicesearch,get_similardevices,get_aianalyst_groups,
get_aianalyst_incidentevents,get_aianalyst_investigations,get_mbcomments,
get_details,get_tags_entities,get_tags_tid,get_tags_tid_entities,
get_endpointdetails,get_antigena,get_antigena_summary
```

`src/tools/index.ts` builds groups only from release-allowed operations, then builds description, selector schema and annotations from each group's actual eligible operations. Unvalidated sibling variants disappear from both descriptions and input schemas. Multi-selector groups contain only the two AI Analyst incident selectors, the two Antigena selectors and the three tag selectors; all other groups have a single selector. Newly single-selector model breach and comment tools accept their advertised optional operation discriminator. An explicit excluded sibling selector rejects without falling back to another operation.

Existing authorization remains before input validation/preview/dispatch and immediately before client request. Direct calls use the same filtered groups, so hidden names and excluded selectors deny without preview, audit, output shaping or client calls, even with forged write/critical/sensitive configuration. Existing `src/server/stdio.ts` derives its frozen transport descriptors from the strengthened predicate: exactly 19 fixed GET routes. The HTTP client continues to copy/freeze trusted descriptors and constructs routes from its own operation-ID table rather than caller-supplied method/path.

`src/coverage/report.generated.json` was copied from the isolated reproducible build under the coordinator's explicit coverage ownership extension (`msg_1b891452e606`). Its `releaseEligible` set is exactly the 19 IDs. Historical catalogue implementation status and the original operation inventory remain intact. `src/coverage/report.ts` itself required no edit because it already uses the release predicate.

`test/contract/validated-consultations.test.ts` adds an independent literal ID/tool-name oracle, descriptor mutation negatives, exact schema/description selector checks, all-excluded direct-call denials and real SDK listing/call coverage. `test/contract/read-only-release.test.ts` updates only its production descriptor expectation from 39 semantic reads including one POST to 19 GETs; existing frozen write-ceiling and zero-effect checks remain. The four expressly reserved the second worker baseline files were not edited.

The complete modified-file list for this task is:

1. `src/policy/release-capability.ts`
2. `src/tools/index.ts`
3. `src/coverage/report.generated.json`
4. `test/contract/validated-consultations.test.ts`
5. `test/contract/read-only-release.test.ts`
6. `docs/security/validated-consultations-implementation.md`

## Observed validation

- Isolated `npm run build` and `npm run typecheck`: exit 0. A second build reproduces the coverage bytes and entire production source hash map exactly.
- Focused tests (validated ceiling, immutable read-only release, R1/R2 response overrides and unit policy): **27/27 PASS**, no failures/skips.
- New tests assert the exact 19 IDs and 15 tool names, frozen primitive whitelist and capability/descriptors, and reject forged matching-ID POST/DELETE/write-tier/blocked-status/altered-path descriptors.
- All 60 excluded catalogue operations are denied under both sensitive settings plus forged write/critical grants, with absent/true/false dryRun: **360 direct denial cases**, zero client/audit/shaping effects and no canary reflection.
- Actual SDK listing is exactly the same full 15-tool contract in both configurations. SDK calls accept an omitted discriminator for the newly single model-breach tool and reject its historical sibling and Advanced Search without extra client effects.
- Candidate generation additionally passed all three forbidden profiles in stdio, doctor and check-config, using the existing diagnostic guard: nine production startup refusals with fixed metadata, empty stdout and no network/signing effects.
- Separate **production stdio children** for read and sensitive-read match the full external candidate, including order, names, descriptions, input schemas and annotations. No tools-call, appliance request or diagnostic network/signing violation occurs in that capture.

All caps, credential/TLS/redirect guards and write refusals remain unchanged. R1/R2 source and generated response views retain hashes `f3c92e69d0e159a4f5e1fdd214a999f4745c7e5a181e8640d01db500af593747` and `d554398d4cbe299121acb9c858941c8074097896f0457c8a53572aff96cdd4c1`; their six focused regression tests pass.

## External contract candidate — not pinned

Full candidate: **`/private/tmp/darktrace-validated19-ctx_49a07121236f/mcp-tool-contracts-validated19-candidate.json`**.

- Candidate bytes SHA-256: **`6ddda2054c9c708d0516a90b7811eb0aba565016403953dace89d47bc89d213c`**.
- Read: 15 tools, canonical full-contract SHA-256 **`cd4ee42249a9110182046794c39fc00f5995700b7d751bccc6628e86afbddfe3`**.
- Read+sensitive: 15 tools, the **same** canonical full-contract SHA-256.
- Envelope retains the historical alpha fixture binding and three forbidden profiles. Its documentary `releaseCapability.sensitiveRead` string now states `operator opt-in; cannot expand the validated consultation ceiling`; runtime `RELEASE_CAPABILITY` remains exactly the two booleans.

The candidate and hashes were sent to the coordinator and helper reviewer `ctx_8bda65425c97` for independent review. No accepted pin or fixture was changed. Existing full fixture `ea31d70a484c0d0353cb8651edc4b6a4ab13798c096056e8cdcf68e78324707f` is preserved as historical evidence for the prior 27/28-tool scope, and cannot certify this new contract.

## Exact source identity and remaining migration

Current production `src/` tree after reproducible coverage generation, using the release helper algorithm: **`9e7c7070298ef592a1a10cdcb7ca481420a377e25e4a93c863ca33c31921d7f2`**. Shared source and the built/tested snapshot's complete source map were checked equal.

| Changed production input | SHA-256 |
|---|---|
| `src/policy/release-capability.ts` | `f8288146b66751915f0ce1d0aa28a7244df8d9965a422fa52e1ce340b4196854` |
| `src/tools/index.ts` | `a24033b3ade55330ffd0d6029c6a92764ea96d5045dfdab1a07372882072e573` |
| `src/coverage/report.generated.json` | `f17f756c9938781f1d9008e44a480d784165e7e11d4ad6930313f924ba126235` |

External evidence includes `focused.log`, `typecheck.log`, `build.log`, `build-reproducibility.log`, `candidate-metadata.json`, `candidate-source-files.json`, `candidate-production-child.json`, `candidate-startup-refusals.json` and `implementation-hashes.json`.

A diagnostic full functional run on the frozen pre-migration test snapshot reports **129 tests, 127 PASS, 2 FAIL, 0 SKIP**. The two failures are historical expectations now correctly denied by the release ceiling:

- `test/contract/read-summary-compatibility.test.ts`: expects live `get_summarystatistics` dispatch.
- `test/contract/response-view.test.ts`: expects sensitive Advanced Search dispatch.

These were reported to the coordinator for the baseline test owner; I did not weaken or edit them. Other workers' subsequent migrations are not certified by this old test snapshot. Security exact-contract checks and release helpers also require explicit independently reviewed migration to the new candidate; automatically capturing/pinning it is prohibited. This implementation is ready for independent review, then fresh full suites, package/source-bound receipts, image rebuild and appropriately scoped lab evidence. OpenSSL remains an external stable-publication blocker.
