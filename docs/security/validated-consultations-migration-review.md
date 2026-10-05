# Validated consultations — independent helper and test-migration review

Task `task_a0e5ec1aea18`, dispatch `ctx_5d729af9564d`, 2026-10-06 (Europe/Madrid). This review is independent of the helper owner Sol (`ctx_3ca977fbff79`) and of the test owner Luna (`ctx_713964029b89`). It follows my accepted source review, [validated-consultations-independent-review.md](validated-consultations-independent-review.md), for source `9e7c7070…`.

The only file written in the repository is this document. No source, test, helper, fixture, package, Docker, Git, API or credential change was made, and no shared build was run. Every execution ran in a private copy of the current shared bytes (`…/scratchpad/mig`, node_modules symlinked) whose `src/` tree still hashes to `9e7c7070298ef592a1a10cdcb7ca481420a377e25e4a93c863ca33c31921d7f2`.

## Part A — release helpers: **ACCEPT** (scoped)

### Applied shared bytes

| File | Before (dispatch start) | Applied at Part A (superseded for verify by A2 `286d674f…`) |
|---|---|---|
| `scripts/prepare-release.mjs` | `3a7d3fdd1ebfa89eabc508e5eb582ecf3b3d40c3e798ef00dc9410ad112d91eb` | `ae93d8fff6fddc04537616cf75eef07dbcb167278e72dca5f58eb51e2a4ce22a` |
| `scripts/verify-release.mjs` | `e4a293cebf731495534a69e75aec69fd2f7b8455a49b5e89d3a33f77ae5e7082` | `83af29df918fc3ff04f4b506c81c0865ccb8a8a01e1e855801d0a8a8fd6318ed` |
| `scripts/validate-examples.mjs` | `93d1e17f…` | unchanged |
| `test/security/mcp-contracts.mjs` | `c2f57ddc…` | unchanged |
| active `test/security/fixtures/mcp-tool-contracts-first-stable.json` | `ea31d70a…` | `6ddda2054c9c708d0516a90b7811eb0aba565016403953dace89d47bc89d213c` (= reviewed candidate bytes) |
| `test/historical/validated-contract-predecessor/mcp-tool-contracts-first-stable.json.txt` | — | `ea31d70a484c0d0353cb8651edc4b6a4ab13798c096056e8cdcf68e78324707f` (verbatim predecessor) |
| `test/historical/validated-contract-predecessor/provenance.json` | — | `7390a234bc73fa52f8922196771e9c5e38ef155f976f0da60a8a331d8358f878` |
| alpha fixture `test/security/fixtures/mcp-tool-contracts.json` | `37b5af95…` | unchanged |

**Patch fidelity.** I applied Sol's `prepare-release.mjs.patch` and `verify-release.mjs.patch` to the pre-migration bytes (`3a7d…`/`e4a2…`, taken from the frozen owner snapshot). The result is **byte-identical** to the current shared helpers, so the shared tree contains no unreviewed helper edit. In Sol's external snapshot, the only `scripts/`, `src/` and `test/` difference from shared is one line in `test/contract/validated-consultations.test.ts`, which is not part of the helper scope. Shared still has the source owner's `b2ddca99…` bytes.

**Provenance content.** The predecessor manifest says `historicalOnly:true`. It binds:
- aa08 source `aa08c260…`
- the original and archive paths
- ea31 bytes
- the historical read/sensitive profile hashes `6ce22e56…`/`def9a8db…`
- alpha `37b5…`

Its stated purpose is "never an active oracle or fallback". Its path is distinct from the pending Luna test archive `test/historical/validated-scope-predecessor`.

### Code review of the helper diff

- **Pins.** The active fixture pin moves to `6ddda205…`, and both profile pins move to `cd4ee422…`. The pins are literal constants and are never computed from output. `fixtureCapability.sensitiveRead` now holds the reviewed documentary text.
- **Independent oracle.** A literal `validatedTools` map has 15 names and 19 selectors, written out in the helper and not derived from generated eligibility. For each profile, `assertValidatedTools` requires:
  - exactly 15 names
  - per-tool selector branches equal to the oracle
  - description operation-ID tokens equal to the tool's own selectors
  - exact annotations `{readOnly:true,destructive:false,idempotent:true,openWorld:false}`
  - 19 unique selectors in total
- **Content checks.** In addition, `verifyFirstStableContractContent` now requires:
  - the exact envelope key set
  - the exact canonicalization text
  - the exact profile key set (`sha256`, `tools`)
  - **deep equality of the read and read+sensitive contracts**
  - the existing full canonical ordered hashes and byte pin
- **Capture.** `captureReviewedContracts` also checks the compiled trusted modules: `RELEASE_CONSULTATION_OPERATIONS` must be frozen and equal to the oracle, and `productionOperationDescriptors` must be frozen, contain exactly the 19 IDs, and be all GET. It then compares the regenerated full contract to the pinned fixture. The helper only compares and never writes the fixture, so there is no auto-regeneration.
- **Predecessor archive.** `verifyValidatedPredecessorArchives` requires regular, non-symlink files and checks:
  - the manifest byte pin
  - `historicalOnly`, the aa08 source, the paths and the fixture hash
  - the archived bytes against ea31
  - alpha identity
  - each historical profile hash recomputed from the archived tools

  Prepare carries the result in schema-3 `historicalValidatedPredecessors`. Verify requires equality with recomputation, and every archive path/hash must be present in the source-file evidence.
- **Source binding.** The release-guard source-binding list now also covers `scripts/prepare-release.mjs`, `scripts/verify-release.mjs`, `scripts/validate-examples.mjs` and `src/tools/index.ts`, alongside the existing guard, config, stdio, contract-helper and capability bindings.
- **Untouched gates.** None of the previously reviewed gates are removed or weakened:
  - output-path guard
  - lifecycle-free `npm ci`
  - full functional and security runs
  - one isolated security receipt and its fixture hashes
  - two reproducible archives
  - tar allowlist and modes
  - three locked dependencies with registry/shrinkwrap/SRI
  - installed-byte and runtime-tree comparison
  - CLI help/version/doctor/check-config
  - nine forbidden-profile startup refusals
  - Spanish README binding
  - checksums
  - alpha-history (`2d9bffe6…`) and stdio-supplement verification

  The diff only adds lines to verifier and prepare logic, apart from the pin, metadata and import substitutions.

### Independent execution (reviewer's own synthetic negatives)

`reviewer-helper-negatives.mjs` (kept outside the repository) found **3 positives** and **34 negatives, all rejected**.

Positives:
- the pinned 6ddda fixture
- the predecessor archive
- a full capture from an isolated build, giving bytes `6ddda205…` and both profiles `cd4ee422…`

Negatives:
- **Replay attempts.**
  - The ea31 predecessor replayed as the active content.
  - The old 27-tool oracle inside the new envelope with recomputed hashes.
  - The ea31 bytes copied over the active fixture.
  - A semantically equal but byte-different active fixture.
- **Both-profile mutations with recomputed embedded hashes** (dual-oracle replay):
  - dropped, duplicated or renamed tool, and swapped order
  - an added `get_metricdata` branch, a dropped tag branch, and the single model-breach selector widened to an enum with `get_modelbreaches_pbid`
  - an excluded ID leaked into a description, and a reworded description
  - `readOnlyHint` false, `openWorldHint` true, and an extra annotation
  - a loosened `maxLength`, and `additionalProperties` set to true
- **Envelope and metadata.**
  - An unequal sensitive profile.
  - Capability `write:true`, and the old sensitiveRead text.
  - A missing forbidden profile, and a forbidden profile marked after network.
  - Changed alpha identity.
  - An extra envelope key, an extra profile, and an extra profile key.
  - Changed canonicalization text, and only the embedded SHA changed.
- **History and file integrity.**
  - Predecessor provenance with `historicalOnly:false`.
  - Predecessor ea31 bytes with one byte appended.
  - Alpha provenance tampered, and the alpha fixture tampered.
  - The predecessor archive replaced by a symlink.

**Compiled-module tampering.** Each case ran in a fresh process so the ESM cache could not mask it.

| Tamper | Result |
|---|---|
| Whitelist widened with `get_metricdata` | REJECTED |
| Whitelist narrowed | REJECTED |
| `RELEASE_CAPABILITY.writeCritical:true` | REJECTED |
| stdio descriptor filter replaced by status/tier only | REJECTED |
| Release filter removed from both `guard.js` and `tools/index.js` | REJECTED (full-contract digest mismatch) |
| Release filter removed from only one of those layers | ACCEPTED (see note) |

A single-layer removal is accepted because the other layer still produces the identical contract. Source-level tampering of either file is caught separately: `src/policy/guard.ts` and `src/tools/index.ts` are byte-bound in the source evidence, and `dist` is rebuilt from bound source by the release pipeline. This is defense-in-depth layering, not a gap (informational M-1).

**Owner harnesses replayed on the applied shared bytes.** Sol's own `helper-tamper.mjs` and `evidence-tamper.mjs` exit 0 in my copy, reproducing **18** contract-tamper refusals and **12** recomputed-checksum evidence-tamper refusals. The evidence harness is synthetic unit evidence only; it does not prove package, installation, image or security-receipt readiness.

### A2 — final helper integration of the Luna scope history (msg_5b5351634279): **ACCEPT**

Final shared bytes:
- `scripts/prepare-release.mjs` `ae93d8fff6fddc04537616cf75eef07dbcb167278e72dca5f58eb51e2a4ce22a`, unchanged since A
- `scripts/verify-release.mjs` **`286d674f6efc18c5db8ca68cf25db5bb2e1fb493299b2b60bc53cf0ff3e5861f`**
- `src/` still `9e7c7070…`, fixture still `6ddda205…`

These match Sol's `final-code-hashes.json` and the root message.

The full diff from `83af29df…` to `286d674f…` is narrow:
- **New `historicalBytes`.** It requires regular, non-symlink files with mode exactly `0644`. Both predecessor archives now read through it.
- **Literal scope pin.** `test/historical/validated-scope-predecessor/provenance.json` is pinned at `35d826f3b7f31547ae2080861359050693985dcb47e087e3c4d8581b44c4e675`.
- **Manifest checks.** `schemaVersion` 1, `historicalOnly`, and exactly four rows.
- **Per-row checks.**
  - The original path is restricted to `test/(contract|security)/*.ts|mjs`.
  - The archive path must be `<dir>/<basename>.txt` and unique.
  - The archive hash must equal the original hash, the byte length must match, and the SHA must match.
- **Evidence binding.** The return value gains `scope:{manifestPath,manifestSha256,files}`. The unchanged loop in `verifyReleaseEvidence` iterates every predecessor archive and requires each manifest and file hash in the source-file evidence. Prepare carries the result unchanged in `historicalValidatedPredecessors`. The test archive is therefore pinned, source-bound and evidence-bound separately from the contract predecessor.

**Archive bytes are verbatim originals.** All four archived files equal my frozen pre-migration copies, taken from the source-owner snapshot `ctx_49a07121236f` before any migration:

| Original file | Archived SHA-256 | Archived length |
|---|---|---|
| `read-summary-compatibility.test.ts` | `9715e5ae…` | 8381 |
| `response-view.test.ts` | `ca2b0687…` | 3248 |
| `mcp-defense.test.mjs` | `7a768440…` | 31756 |
| `policy-sinks.test.mjs` | `14ba5a07…` | 10609 |

All archive files and both provenance files are `0644`.

**Reviewer scope negatives** (`scope-negatives.mjs`, isolated copy): 1 positive and **25 rejected**.
- Per archived file: one-byte append, replacement by the currently migrated active bytes, mode `0755`, symlink, and missing file.
- Provenance: `historicalOnly:false`, a dropped row in otherwise consistent JSON, a whitespace-only change, and mode `0600`.
- Contract-predecessor provenance at mode `0755`.

Sol reports 21 contract/history and 14 source/evidence tamper refusals; I did not re-run those. Mine cover the new scope paths independently.

Note: the strict `0644` check depends on the release snapshot copy preserving modes. `cpSync` does, and the archives are `0644` in the shared tree.

### Diagnostic suites on pre-migration test bytes (isolated, not gates; superseded by Part B final runs)

| Suite | Result | Notes |
|---|---|---|
| Functional | **129 tests, 127 PASS, 2 FAIL** | `read-summary-compatibility` (`get_summarystatistics`) and `response-view` (Advanced Search) |
| Security (`run-isolated.mjs`) | **325 tests, 318 PASS, 4 FAIL, 3 SKIP** | MR-01 and IR-01 (Advanced Search tool output), ST-09 SENSITIVE and MINIMIZATION |

With the new pin applied, MR-04 read and read+sensitive now **PASS** against the 6ddda fixture, which brings the security failures down from 6 to 4. All six remaining failures are historical Advanced Search or summary positives owned by the pending Luna migration. They are not claimed as PASS.

## Part B — active-test migration (Luna `ctx_713964029b89`): **ACCEPT** (scoped)

Reviewed bytes: the four files listed in the owner report [validated-consultations-test-migration.md](validated-consultations-test-migration.md). They are identical in the shared tree and in my isolated run copy.

| Active file | Final SHA-256 | Archived original |
|---|---|---|
| `test/contract/read-summary-compatibility.test.ts` | `c6c422e97b835961841e56d2797ea09c586b86dfdec212cecd9305bf403b86af` | `9715e5ae…` |
| `test/contract/response-view.test.ts` | `3a56b037180c44edab7291463569afdcfd00494f7f155723131e464872cf348a` | `ca2b0687…` |
| `test/security/mcp-defense.test.mjs` | `f5f6068ae7195f0e97343ce0949a46fc0fa386be3741cb713661a89d8d1e1513` | `7a768440…` |
| `test/security/policy-sinks.test.mjs` | `13a7471cd58fa5fbbe10711db74f0710ba6ab333518ea0f49a61c914b8238f55` | `14ba5a07…` |

The predecessor archive (provenance `35d826f3…`) holds the verbatim originals, which I matched against my frozen pre-migration copies. It is pinned and evidence-bound by verify `286d674f…`, as described in A2. `test/contract/validated-consultations.test.ts` is unchanged (`b2ddca99…`).

### Diff review against the archived originals

- **`read-summary-compatibility`.**
  - The positive summary dispatch is replaced by an approved `darktrace_get_devices` dispatch. It asserts:
    - exactly 1 call
    - strict projection that drops upstream `unknown` and shaped `rawMailBody` canaries
    - invalid-input (`unreviewed` query) rejection with zero extra calls
  - Explicit `get_summarystatistics` has zero client calls, zero audits, and no `dryRun`, `preview` or `outcome`.
  - The unchanged tests still cover the summary input validation matrix and the selector-bound loginput/base views directly through `selectResponseView`/`projectResponse`, including the `unmodeled`/`omitted` flags.
  - Minor: the base-view default value `{subnets:2}` is no longer asserted literally, but base-view projection and its unmodeled flag remain covered directly.
- **`response-view`.**
  - The Advanced Search positive is replaced by an **active positive** device projection. It strips unknown top-level and nested (`ips[]`) fields, keeps the reviewed fields exactly, and has 1 call. It is followed by a separate zero-effect denial of Advanced Search under caller-forged `sensitiveRead`/`providerEligible`/`dryRun`, with no hash reflection.
  - This is **not** a vacant denial-only replacement.
  - Projection is allowlist-only (`src/api/response-view.ts:1`), so the old dynamic-map case is the same nested-unknown-object behavior now exercised through devices. The Advanced Search-specific view is no longer reachable and no longer actively tested; it would need restoring if that selector is ever re-enabled.
- **`mcp-defense` (MR-01.TOOL and IR-01.TOOL).**
  - The Advanced Search case is replaced by `darktrace_get_devices` under the sensitive-read profile. The attack and smuggled values now sit in a nested array/object field, with an extra unknown-field canary.
  - All original assertions are retained: code-owned neutralization flag, visible-emoji preservation, selector and canary byte absence in text and structured output, exactly 1 call and 0 audits.
  - The ERROR/BOUNDS/KEYS budget tests are unchanged.
- **`policy-sinks` (ST-07, ST-09).**
  - The ST-07 matrix is **strengthened**. All 60 unpublished inventory IDs are checked across default, sensitive and forged `{sensitiveRead,write,writeCritical}` profiles × `dryRun` absent/true/false (540 cases). Each asserts an error, 0 calls, 0 audits, no `dryRun`/`preview`/`outcome` and no canaries. It also requires 15 eligible tools and 19 published IDs.
  - ST-09.SENSITIVE asserts identical status output across both profiles, and denies Advanced Search with zero effects despite caller `sensitiveRead`/`providerEligible`/`confirm` flags and forged write profiles.
  - ST-09.MINIMIZATION keeps the unknown-telemetry exclusion in both read profiles.
  - The device-level sensitive-profile minimization is covered in `mcp-defense` and `response-view`.

Every displaced positive therefore has either an approved GET positive carrying the same projection, invisible-character, canary, effect-count and budget assertions, or direct projector coverage. Every excluded route also has an actual zero-effect denial.

### Reviewer execution on the final bytes (fresh isolated copy, `src/` `9e7c7070…`)

| Check | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | exit 0: **130 tests, 130 PASS, 0 FAIL, 0 SKIP** |
| `npm run test:security` | exit 0: **325 tests, 322 PASS, 0 FAIL, 3 SKIP** |

The 3 skips are the documented macOS `2600` special-bit fixtures (`ST-02.FILE` ×2 and `ST-02.POLICY`), where the OS discards the bits.

My security receipt `2026-10-05T22-44-45-149Z.json` has SHA-256 `8ff3efa07b7e4f70957950fc28317ec86d13900f2bf630e0c5d18e08f39bad97`. It shows `receiptComplete:true`, `sourceTreeSha256` `9e7c7070…`, fixture hashes 6ddda/37b5, and Node v24.14.1 on darwin/arm64. It is independent of Luna's `aebac98f…`.

`captureReviewedContracts` plus `verifyValidatedPredecessorArchives` on the final bytes returns:
- contract bytes `6ddda205…`
- both profiles `cd4ee422…`
- scope provenance `35d826f3…`
- contract provenance `7390a234…`

**Remaining (not reviewed here):**
- Linux Node 22/24 full-suite runs
- the package preparation/installed-archive verification delegated to Sol
- final docs sync (see [validated-consultations-documentation-checkpoint.md](validated-consultations-documentation-checkpoint.md); I did not review it)

## Part C — proposed endpoint discovery recipe (msg_0a10f5f56f2f): **CONDITIONAL ACCEPT, review only**

The proposal is to replace the inventory `get_devicesearch` discovery `count:1` with `{count:10,offset:0,seensince:"300"}`, so that one existing device IP can be found for `get_endpointdetails`. I did not apply or execute anything. I reviewed the shared `scripts/lab-read-smoke.mjs`, the OpenAPI spec and the current production source.

- **OpenAPI semantics.** `/devicesearch` `count` is "the number of devices to return; default 100, maximum 300". `offset` is the pagination start. `seensince` is a relative activity window. Count 10 at offset 0 is the documented first page and stays far below the default and the maximum. The production strict schema accepts it (integer 1–1000) without any schema or cap change. That 1000 > 300 slack is pre-existing and should not be exercised.
- **Correction required: `seensince` does not survive.** `argumentsFor` (`lab-read-smoke.mjs:263`) deletes `seensince` from `get_devices`/`get_devicesearch` whenever the profile has `inventoryDiscovery` (the inventory profile). The effective inventory request would therefore be **`{count:10,offset:0}`**, not `{…,seensince:"300"}`. Accept that effective form and leave line 263 alone. If the root instead wants `seensince` kept in inventory, that is a different recipe change and needs re-review.
- **Placement.** Add it only as an `inventoryRecipes.get_devicesearch` entry. The minimal campaign recipe stays `{count:1,offset:0,seensince:'300'}`.
- **Identifier handling stays fail-closed.**
  - `remember` takes `endpoint_ip` only from `row.ip`, only for a row with a positive safe-integer `did`, and only after the existing `endpointIp` validation (`isIP`, ≤45 chars, hex/colon/dot alphabet).
  - It takes the first qualifying row out of at most 10, keeps it in memory only, and never invents, derives or retries.
  - If no row qualifies, `argumentsFor` raises `BLOCKED_MISSING_IDENTIFIER` (or `BLOCKED_IDENTIFIER_CONTRACT`) before any endpoint request. No second page, alternate offset or extra call is possible: `maxCalls 8`, `maxPages 1`, `maxGetRetries 0`.
- **Budgets.** The inventory profile caps stay unchanged: 1 MiB upstream, 60000 output characters, 20000 shape elements, 240000 shape string bytes, and a 1 MiB transport buffer.
  - An oversized upstream response fails as `too_large`.
  - If the tool output exceeds 60000, `callTool` returns `{truncated:true}` without `data`. The harness then fails shape or finds no handle, both fail-closed.
  - The `devicesearch` response view stays a strict projection, and its `ip` field is unchanged.
- **Privacy.** Up to ten projected device rows (hostname, MAC, IPs, tags) are now held transiently in SDK response memory instead of one. The harness emits only envelopes and does not log `structuredContent` or handles, so this is acceptable as bounded and memory-only.
- **Side effects to record.**
  - `did` still comes from the first qualifying row, so it is unchanged.
  - The `tid` handle is the first tagged device among up to 10, so it may come from a different row than before. That is harmless but changes the `tags_tid` handle source.
  - The change alters `validationPolicy` and its `validationPolicySha256`. The protected lab manifest must be re-pinned, and the final harness diff reviewed, before execution.
- **Claims.** The 18 PASS selectors remain current. `get_endpointdetails` stays unexecuted, so no 19/19 claim can be made until a real run passes. If no IP is found, the resource gap is kept without blind queries.

### C2 — exact applied harness change: **ACCEPT** (no API executed by me)

Root authorized exactly `inventoryRecipes.get_devicesearch = Object.freeze({query:{count:10,offset:0}})`, without `seensince`. That resolves my correction.

- **Bytes.** Shared `scripts/lab-read-smoke.mjs` is `5d2a9fefa682bd41852e7fc1e2333180384cc2f76e0e23becb5827315b802e23`. It is byte-identical to Sol's `lab-read-smoke-before.mjs` (`789c0a11…`) plus `lab-discovery.patch`: one frozen recipe line plus help text, a 7-line diff. That `before` hash also equals the harness in my earlier isolated copy, so it is the genuine prior shared file.
- **Independent extraction.** I loaded a copy with only the `main()` call replaced by an export.
  - `validationPolicySha256` is `ed55eb308bb748c22494047367f114598614e399b7c6ffb115d969bb41412ac9` before and **`3060d0a25c9d156501ade8d053183cc04a70946171926bdda0de1f17508c6996`** after, matching the root receipt.
  - The only changed policy key is `inventoryRecipes`, and within it only `get_devicesearch`.
  - Across all 37 campaign operations × {minimal, inventory} with synthetic handles, exactly **one** argument changes: inventory devicesearch goes from `{count:1,offset:0}` to `{count:10,offset:0}`. Minimal remains `{count:1,offset:0,seensince:"300"}`.
- **Fail-closed behavior.**
  - `remember` over 10 synthetic rows skips `did:0`, a non-IP value, an injection-like value and a non-integer `did`, and selects the first valid IP.
  - With no IP present, `get_endpointdetails` raises `BLOCKED_MISSING_IDENTIFIER` before any request.
  - The minimal profile never stores `endpoint_ip`.
- **Pending gate.** The root must rebuild the protected manifest to bind `5d2a9fef…`/`3060d0a2…` before the endpoint run.

**Verdict for Part C:** ACCEPT the narrow inventory-only `{count:10,offset:0}` discovery under the conditions above: `seensince` stripped as today, no other parameter, cap, retry, redirect or TLS change, validation-policy hash re-pinned, and the exact harness diff re-reviewed before execution.

## Part D — Docker checkpoint binding (msg_b8206d8bf258): **ACCEPT** (offline binding only)

Scope: [validated-consultations-docker-checkpoint.md](validated-consultations-docker-checkpoint.md), image `sha256:eb3a7681da69f6468df0a7600af9d72560cfd8d5c4747dfa8ee57e45f09abeaf`. I did not rebuild the image, ran no scanner and made no API call. Image containers were created only for `docker export`, never started, and then removed. All runs used synthetic tokens with `--network=none`.

- **Image config.** User `1000:1000`. The entrypoint is exactly `/nodejs/bin/node /app/dist/src/index.js`. There is no Cmd, port or volume, and the only env is PATH (no token, proxy or TLS variables). History shows only the expected COPY, USER and LABEL steps. The first five rootfs diffIDs equal baseline `dfaf529b…`.
- **Full rootfs comparison with baseline dfaf**, both exported, all files hashed:
  - Both images contain 2,138 regular files, with identical path and metadata sets.
  - Exactly four files differ in bytes: `app/dist/src/coverage/report.generated.json`, `policy/release-capability.{js,d.ts}` and `tools/index.js`.
  - The only metadata difference is `app/LICENSE` at mode 0444 vs 0644, which is disclosed in the checkpoint.
  - There is no setuid/setgid entry and no source, tests, scripts, docs, OpenAPI, `.env`, shell, npm or apt path.
  - Node, OpenSSL 3.5.8 and dependency bytes are therefore unchanged from the reviewed baseline.
- **Runtime binding.**
  - All 49 shipped `dist/src` files (23 JS, 3 JSON, 23 `.d.ts`) are byte-identical to **my own independent isolated build** of `9e7c7070…`.
  - The release-convention aggregate reproduces `e7cbb509d54909fa10276ffeaec11cab22bb201f1f81635fa8c988abcb3653fb`.
  - The 26 JS/JSON files equal the `runtimeFiles` map of root lab manifest `00adff89c7f0eedaa1022f480751ae3f1243e12600a5182cbc95fa2c1fbf1307` exactly.
- **Hardened offline SDK run** (`docker-list.mjs`, my own client). Flags: `--read-only --cap-drop=ALL --security-opt=no-new-privileges --pids-limit=64 --memory=256m --network=none --log-driver=none`.
  - read and read+sensitive each list 15 tools. The ordered name, description, inputSchema and annotations are canonically equal to the pinned 6ddda fixture (`cd4ee422…`), and no synthetic token appears.
  - The **9/9** forbidden write and critical startups (stdio, doctor, check-config) exit 1 with empty stdout and no token reflection.
  - No container is left behind.
- **Not independently re-run.** These rest on the checkpoint's receipts, plus the byte identity with baseline that I established:
  - in-process capability/seccomp/NoNewPrivs/EROFS probes
  - the license and SRI closure files
  - the historical scanner reports

  The OpenSSL 3.5.8 CVE-2026-35189 hold remains, and nothing here claims zero CVEs.

## Part E — lab checkpoint evidence (msg_d868a05d1944): **receipts consistent**, no expanded claim

I reviewed [validated-consultations-lab-checkpoint.md](validated-consultations-lab-checkpoint.md) against the protected receipts in `/private/tmp/darktrace-validated19-lab-584px9mb/`. I made no API call.

- **Receipt hashes.** All eight receipt SHA-256 values equal the checkpoint table (`73658e0a…`, `af97daa2…`, `9e1ffcd7…`, `892ad5f6…`, `f159ffa0…`, `830e2b7c…`, `e4d1af50…`, `934e5552…`).
- **Envelope fields only.** Records contain just these keys: `operation`, `tool`, `success`, `errorCode`, `expectedShape`, `elapsedMs`, `version`, `validationProfile`, `validationPolicySha256`, `runtimeManifestSha256`. A scan found no IPv4 or MAC values and no token, secret, password or authorization strings.
- **Docker coverage.** Docker receipts alone pass exactly the 19 oracle IDs, with no extras.
- **Native coverage.** Native JSONL receipts pass 14. The remaining five native first-batch passes (subnets, AI stats, intel feed, model breaches, similar devices) exist only in the coordinator transcript, and the checkpoint states this. Native coverage of those five is therefore not file-receipt-bound.
- **Binding.**
  - Both reviewed endpoint receipts (native and Docker) carry inventory policy `3060d0a2…` with manifest `e0875c41…`.
  - The native pre-change inventory receipt carries `ed55eb30…`/`00adff89…` and records the preserved `BLOCKED_MISSING_IDENTIFIER`.
  - The earlier minimal batches under `ed55eb30…` remain valid for the final harness, because my extraction showed that minimal-profile arguments are identical under both policies.
  - The initial manifest file is `00adff89…`.
- **Endpoint manifest.** The final endpoint manifest `/private/tmp/darktrace-validated19-endpoint-runtime.json` hashes to **`e0875c41547f623f25a522baba3cd1d251c0086a07055a7a11415d437e6e2aca`** (schema keys `dependencyTrees`, `runtimeFiles`, `schemaVersion`, `sourceFiles`).
  - Its 26 `runtimeFiles` equal the Docker image's JS/JSON exactly, and equal those of `00adff89…`.
  - Relative to `00adff89…`, only three `sourceFiles` entries change, all to the reviewed bytes: `scripts/lab-read-smoke.mjs` `789c0a11…` → `5d2a9fef…`, `scripts/prepare-release.mjs` `3a7d3fdd…` → `ae93d8ff…`, and `scripts/verify-release.mjs` `e4a293ce…` → `286d674f…`.
  - All 43 bound source files equal the current shared bytes.
- **Volume cleanup.** No Darktrace-named Docker volume remains.

These are bounded recipe and response-shape passes, not exhaustive parameter coverage. That is consistent with the checkpoint's own limits.

## Findings

- **No blocking defect** in the applied helper change.
- **M-1 (informational).** Dist-only removal of a single policy layer is not detected by contract capture, because the other layer keeps the contract identical. The source byte binding and rebuild-from-source cover this.
- **M-2 (resolved in A2).** The test-archive pin `35d826f3…` and its source/evidence binding for `validated-scope-predecessor` were added in verify `286d674f…` and reviewed above.

## Decision

- **Part A and A2 (helpers and pins): ACCEPT.**
  - Final `scripts/prepare-release.mjs` `ae93d8fff6fddc04537616cf75eef07dbcb167278e72dca5f58eb51e2a4ce22a`.
  - Final `scripts/verify-release.mjs` **`286d674f6efc18c5db8ca68cf25db5bb2e1fb493299b2b60bc53cf0ff3e5861f`**. The intermediate `83af29df…` is superseded.
  - Active fixture `6ddda2054c9c708d0516a90b7811eb0aba565016403953dace89d47bc89d213c`, with both profile pins `cd4ee42249a9110182046794c39fc00f5995700b7d751bccc6628e86afbddfe3`.
  - Contract predecessor `ea31d70a…` with provenance `7390a234bc73fa52f8922196771e9c5e38ef155f976f0da60a8a331d8358f878`.
  - Scope test predecessor provenance **`35d826f3b7f31547ae2080861359050693985dcb47e087e3c4d8581b44c4e675`**, whose four archived originals are verbatim.
  - Source `9e7c7070…`, unchanged.
- **Part C2 (discovery harness): ACCEPT.** `scripts/lab-read-smoke.mjs` is `5d2a9fef…` and the validation policy is `3060d0a2…`.
- **Part D (Docker binding of `eb3a7681…`): ACCEPT**, offline binding only.
- **Part E (lab checkpoint): receipts consistent.**
- **Part B (active-test migration): ACCEPT.** Final bytes `c6c422e9…`/`3a56b037…`/`f5f6068a…`/`13a7471c…`. My isolated runs give functional 130/130 PASS and security 322 PASS, 0 FAIL, 3 Darwin skips (receipt `8ff3efa0…`).
- **No stable claim.** The final full suites, package preparation, installed archive and remaining gates are separate. The OpenSSL 3.5.8 CVE-2026-35189 blocker remains, with no waiver.
