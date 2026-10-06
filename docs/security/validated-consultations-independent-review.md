# Validated consultation ceiling — independent source review

**Verdict: ACCEPT source `9e7c7070…` for an explicit new pin and same-recipe 19-selector retests. This verdict does not cover stable publication.** The full functional and security suites still need migration and are **not PASS**. OpenSSL 3.5.8 CVE-2026-35189 is still an unwaived stable-publication blocker, and it is outside this review's scope.

Date: 2026-10-06 (Europe/Madrid). Task `task_2f11a553cecc`, dispatch `ctx_abea85402aaa`. This review is independent of the owner (`ctx_49a07121236f`). The only file written in the repository is this document. No production, test, helper, fixture, README, package, Docker, Git, API or credential change was made. No live API was used and no shared `dist` was built. All builds and tests ran in a private clone of the owner's frozen snapshot, `…/scratchpad/rev`.

## Source identity (recomputed)

The production tree hash was recomputed with the `prepare-release.mjs` algorithm: sorted recursive `src/` file-hash map, then SHA-256 of its JSON. The table also lists the hashes of each changed file.

| Item | SHA-256 | Shared = snapshot |
|---|---|---|
| `src/` tree (28 files) | `9e7c7070298ef592a1a10cdcb7ca481420a377e25e4a93c863ca33c31921d7f2` | yes |
| `src/policy/release-capability.ts` | `f8288146b66751915f0ce1d0aa28a7244df8d9965a422fa52e1ce340b4196854` | yes |
| `src/tools/index.ts` | `a24033b3ade55330ffd0d6029c6a92764ea96d5045dfdab1a07372882072e573` | yes |
| `src/coverage/report.generated.json` | `f17f756c9938781f1d9008e44a480d784165e7e11d4ad6930313f924ba126235` | yes |
| `test/contract/validated-consultations.test.ts` | `b2ddca9952c3da4731e6e75fa029e3548f264b018a5675d3a6107807f1575adb` | yes |
| `test/contract/read-only-release.test.ts` | `993356f977a7c41fe609429b9e3c4cf9056a64b485c625b9a52ecc9cae2592f3` | yes |
| R1/R2 `src/api/response-view.ts` | `f3c92e69d0e159a4f5e1fdd214a999f4745c7e5a181e8640d01db500af593747` | yes |
| R1/R2 `src/api/response-views.generated.json` | `d554398d4cbe299121acb9c858941c8074097896f0457c8a53572aff96cdd4c1` | yes |

`scripts/` and `test/` (excluding evidence) in the shared tree are byte-identical to the snapshot.

**Diff against the accepted aa08 tree.** The aa08 copy at `/private/tmp/darktrace-r1r2-lab-0n8g040t/src` hashed to `aa08c260847c0fc206253f2de3cb1a872f89d2f9d85f5618b88ffd0f5c681e8e`. Only the three declared production files differ from it. The guard, HTTP client, stdio, config schema, validation/limits, redaction, output shaping and both R1/R2 response-view files are byte-identical to aa08. R1/R2 is therefore intact, and the schema and limits are unchanged.

## Code review

- **`release-capability.ts`**
  - `RELEASE_CAPABILITY` is still the frozen `{write:false,writeCritical:false}` object, with exactly two keys.
  - The ceiling is a frozen array of 19 primitive string literals plus a frozen ID→route map.
  - `releaseAllowsOperation` requires all of the following: `implemented`, tier `read`, method `GET`, an exact ID match, and the exact fixed `pathTemplate`. Catalogue status alone cannot widen it.
- **`tools/index.ts`**
  - `allTools()` filters on the predicate before grouping.
  - `defineTool` recomputes the description, selector schema and annotations from the surviving operations only.
  - `callTool` looks up tools only in the filtered set.
  - A single-op tool with an omitted `operation` uses its only op. An explicit `operation` must match an op that survived the filter, so there is no fallback.
  - `authorize` still runs before validation, preview, audit and dispatch, and again before `client.request`.
- **`guard.isEligible`** calls the predicate first, so `sensitiveRead` and forged write or critical profiles cannot add an operation.
- **Single-op input schemas** are the catalogue `strictObject` with `operation: z.literal(id).default(id)`. This is what makes the discriminator optional and accepted for the now single-selector model-breach and comment tools.
- **Trusted transport registry.** `stdio.productionOperationDescriptors` is derived from the strengthened predicate: 19 frozen `{operationId,method,pathTemplate}` entries, all of them GET. The HTTP client builds its own frozen registry from these entries and rejects unknown IDs before signing or network.
- **Coverage report** (byte-reproducible).
  - Versus aa08, the only fields that change are `releaseEligible`, `discovery` and `execution`.
  - All 79 operations stay in the same order, with historical `status` intact.
  - `releaseEligible` covers exactly the 19 IDs. There are 60 exclusions, of which 20 were previously eligible: `get_aianalyst_incident_comments`, `get_components`, `get_components_cid`, `get_cves`, `get_deviceinfo`, `get_devicesummary`, `get_enums`, `get_filtertypes`, `get_metricdata`, `get_metrics`, `get_metrics_mlid`, `get_modelbreaches_pbid`, `get_modelbreaches_pbid_comments`, `get_models`, `get_models_pid`, `get_network`, `get_pcaps`, `get_summarystatistics`, `get_tags`, `post_advancedsearch_api_search`.
  - No operation became newly eligible.

The exact 19 IDs match the owner report and the literal oracle in the focused test:

```
get_status,get_devices,get_subnets,get_aianalyst_stats,get_intelfeed,
get_modelbreaches,get_devicesearch,get_similardevices,get_aianalyst_groups,
get_aianalyst_incidentevents,get_aianalyst_investigations,get_mbcomments,
get_details,get_tags_entities,get_tags_tid,get_tags_tid_entities,
get_endpointdetails,get_antigena,get_antigena_summary
```

## Independent execution (isolated clone, synthetic only)

- **Build and typecheck.** Two `npm run build` runs exit 0, with identical `dist` digests and an identical coverage file (`f17f756c…`). The `src/` tree stayed `9e7c7070…` after the builds. `npm run typecheck` exits 0.
- **Owner focused tests.** The validated ceiling, read-only release, R1/R2 overrides and unit policy tests give **27/27 PASS**.
- **Reviewer probe** (`probe-independent.mjs`, kept outside the repository; my own literal oracle and route map): **10,620 assertions, all PASS**. It covers:
  - Constants: the capability, ceiling and catalogue are frozen, and mutation attempts are rejected.
  - Catalogue: 79 operations, 60 excluded, and each of the 19 has GET, `read`, `implemented` and the exact route.
  - Forged descriptors on the 19 IDs (method POST/DELETE/lowercase, tier high/critical/write, status blocked/planned, altered path including an Advanced Search or `pbid` route, altered ID case or whitespace): all denied. Excluded ops forged to GET/read/implemented: denied. `__proto__` and `toString` IDs: denied.
  - **6,090 direct `callTool` denials.** Every one of the 60 excluded ops was tried under forged `{read,write,writeCritical:true}` × `sensitiveRead` false/true × `dryRun` absent/true/false. Each was routed through its own tool name and through every listed tool name. Results: zero client requests, zero audit records, zero shaping, no preview output and no canary reflection.
  - The real `createHttpClient` with the production registry rejects all 60 excluded IDs with **zero signer and zero fetch invocations**.
  - `eligibleTools` returns 15 tools with exactly the 19 IDs under the default-read, sensitive-read and both forged configurations. No excluded ID appears in any description.
  - Real SDK `listTools` for read and read+sensitive returns 15 tools. All annotations are `readOnly:true`, `destructive:false`, `idempotent:true`, `openWorld:false`. No excluded ID is advertised. The two listings are canonically identical.
  - SDK calls:
    - `darktrace_list_model_breaches` and `darktrace_get_model_breach_comments` succeed with the discriminator omitted and with it explicit.
    - Historical siblings (`get_modelbreaches_pbid`, `get_modelbreaches_pbid_comments`) and Advanced Search are rejected with no client effect.
    - Excluded siblings on multi-selector and single tools are rejected with no fallback.
    - Multi-selector tools without a discriminator are rejected.
    - Unknown or hidden tool names are rejected.
- **Candidate inspection, without regenerating the oracle.**
  - `mcp-tool-contracts-validated19-candidate.json` has SHA-256 `6ddda2054c9c708d0516a90b7811eb0aba565016403953dace89d47bc89d213c`.
  - Both profiles list 15 tools with `sha256 = cd4ee42249a9110182046794c39fc00f5995700b7d751bccc6628e86afbddfe3`. That value equals the canonical digest of the candidate's own tool arrays.
  - My live SDK listing in both profiles is deep-equal (ordered name, description, inputSchema, annotations) to the candidate tools.
  - The envelope has `write:false` and `writeCritical:false`, the alpha binding `37b5af95…`, and three rejected profiles. Its documentary `sensitiveRead` string matches the owner report.
- **Full functional suite** (diagnostic, frozen pre-migration tests): **129 tests, 127 PASS, 2 FAIL, 0 SKIP**. The two failures are exactly the owner-reported historical positives that the ceiling now denies:
  - `read-summary-compatibility`: `get_summarystatistics`
  - `response-view`: Advanced Search dispatch
- **Security suite** (`run-isolated.mjs`, diagnostic): **325 tests, 316 PASS, 6 FAIL, 3 SKIP**. All six failures are expected migrations, not regressions:
  - MR-01 and IR-01: Advanced Search tool output, which is now hidden.
  - MR-04 read and read+sensitive: the exact-contract snapshot is still pinned to the historical ea31 27/28 contract.
  - ST-09 SENSITIVE and MINIMIZATION: these expect Advanced Search dispatch.

  These are not claimed as PASS. They belong to the second-worker migration (`ctx_713964029b89`) and the helper/test-migration follow-up reviews.

## Historical evidence preserved

- `test/security/fixtures/mcp-tool-contracts-first-stable.json` is still `ea31d70a484c0d0353cb8651edc4b6a4ab13798c096056e8cdcf68e78324707f`.
- The alpha fixture is still `37b5af95de1786ecce1b8762e12d2d63e577f171511a9db4964518b13a917f72`.
- `verifyHistoricalArchive` passes: manifest `2d9bffe6f1c462b04d5bef68607fe335d699e0fcdc37673f8e10dbe299538d60`, 10 files.
- No pin was changed. Neither ea31 nor 37b5 can certify the new contract, so an explicit root-owned new pin is required.

## Findings

No blocking or high, medium or low security defect was found in the reviewed source.

- **I-1 (informational, pre-existing).** `src/api/operations.ts:41` still exports `operationDescriptors` (all implemented non-critical ops). It has no production consumer: stdio and the client use `productionOperationDescriptors`. It is unchanged from aa08. A later change could remove it or filter it through the ceiling as defense in depth.
- **I-2 (informational).** `releaseAllowsOperation` reads descriptor properties more than once. An accessor-based forged object could in theory answer inconsistently between reads. This is not reachable: production passes only frozen data-property catalogue ops, and the client registry independently limits transport to the 19 routes.
- **I-3 (process).** The 2 functional and 6 security failures listed above must be migrated through independently reviewed test and helper changes, not masked. Fresh full suites, package/source receipts, image rebuild and lab retests then have to bind to `9e7c7070…` and the explicitly pinned candidate `cd4ee422…`.

## Decision

**ACCEPT** source `9e7c7070298ef592a1a10cdcb7ca481420a377e25e4a93c863ca33c31921d7f2` for an explicit new contract pin (`cd4ee42249a9110182046794c39fc00f5995700b7d751bccc6628e86afbddfe3`, candidate bytes `6ddda205…`) and same-recipe 19-selector retests.

This does **not** accept stable publication, because these remain open:
- the test and helper migrations and their reviews
- full-suite PASS on the pinned source
- the package, Docker and lab gates
- the external OpenSSL 3.5.8 CVE-2026-35189 blocker, which has no waiver
