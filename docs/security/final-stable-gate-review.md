# v1.0.0 final gate review

Date: 2026-10-06. Result: **ACCEPT for private GitHub Release publication**.

- **Implementation and artifacts:** Sol medium (`task_c6c9dbdd7776`) completed the version-only change, reproducible package, final images, SDK/TLS checks and signed component inventories. [Artifact report](first-stable-artifact-finalization.md).
- **Independent runtime and native CI:** Opus medium (`task_40d3ba0bcb45`) accepted the final stable images and independently verified both architectures' GitHub artifact digests, 130 functional / 325 security tests with zero skips, 22,132 assertions, complete receipts, source/runtime binding, unchanged dependency/ELF payloads and version-only production differences. [Independent report](patched-runtime-independent-review.md), [CI run 37423665585](https://github.com/nuoframework/darktrace-mcp/actions/runs/37423665585), tested commit `2adb84b6a076cf6018fb5723659aac57c8070e4e`.
- **Package acceptance by the coordinator:** independently verified the package SHA-256, 32 regular allowlisted files, version/private metadata, exact shipped README/README.es/SECURITY/LICENSE/shrinkwrap bytes, unchanged dependency objects, and the unchanged verifier's `--check-evidence` result against all nine canonical evidence assets. The owner's complete Linux vendor-runtime preparation proves two byte-identical builds, installed files/SRI, SDK contracts, refusal checks and examples. This is not a claim that the runtime reviewer separately re-audited the npm package.
- **Publication assembly by the coordinator:** inspected Docker archive paths, embedded architecture tags and nonroot configuration; verified all six downloadable archives against the universal `SHA256SUMS`. The package-evidence archive preserves its original canonical checksum inventory. Native CI evidence contains the actual final receipts for both architectures. The security archive has 68 substantive evidence files plus its manifest, all regular, without token/key files or lab telemetry.
- **Documentation:** Opus low (`task_55433bc975f6`) completed the bilingual guides and release body. Coordinator corrections clarified historical alpha instructions, final runtime hashes and the universal release checksums. Shipped documentation is frozen at the tested commit; subsequent release-documentation commits change only `docs/` and preserve all production, build, workflow, dependency and shipped-package bytes. Example syntax and launch-policy validation passed.
- **Lab:** preserve the successful 19-selector campaign on the historical bound image. The user terminated the lab. Final images were not retested live; the sole production source change is the version literal. [Lab record](patched-runtime-lab-checkpoint.md), [coordinator decisions](first-stable-coordinator-decision.md).
- **Disclosed scanner findings:** retain the raw zlib High with independently proven vulnerable code outside this application's execution path, and the ada product collision. No fixed-zlib or zero-CVE claim. A vendor fix or changed native/application paths requires reassessment.

Publication stays private. The release provides 15 read-only tools / 19 validated GET selectors; writes and critical actions remain unavailable. Historical alpha releases and their assets are preserved.

## Historical gate review — superseded

The following record is preserved verbatim for its earlier source and artifact snapshot. Its pending/current statements do not describe v1.0.0.

# Final stable release gate: independent security review

**Decision: NOT READY. Stable publication is blocked.** Ten finite blockers (§4) must each close with a receipt before any stable version, tag or GitHub Release. Nothing in this review is a pass, a zero-CVE claim or an acceptance of risk.

- **Date:** 2026-10-05
- **Reviewer:** dispatched worker, task `task_8d057e919fc0`, dispatch `ctx_1270f7e22b18`
- **What I did not do:** I made no production or helper edits, commits, version changes, tags or publication. I used no lab credentials, lab API or Docker runs, and delegated nothing to native agents. I created only this file.
- **What I did:** offline reads, SHA-256 hashing, one `npm pack --dry-run` (which writes nothing), and two read-only GitHub metadata queries (`gh repo view` and `gh release list`).

## 1. Evidence classes

Evidence below is labelled in one of three ways:

- **[O]** I observed it in this review.
- **[R]** The root coordinator reported it, either in the referenced documents or in this task's Orca reply. I did not observe it.
- **[H]** Historical. It is bound to an earlier source, image or harness snapshot and does not certify the current candidate.

## 2. Current candidate identity [O]

| Input | SHA-256 now | Matches accepted review? |
|---|---|---|
| `src/` production tree (prepare-release algorithm) | `d4d3f78c3a8e6668fcab76b483d6ec5d13a20e34b3f08853651f2039a985fb87` | Yes, the accepted consultation source ([capability review §6](first-stable-capability-review.md)) |
| `scripts/prepare-release.mjs` | `3a7d3fdd…12d91eb` | Yes ([helpers review](first-stable-release-helpers-review.md)) |
| `scripts/verify-release.mjs` | `e4a293ce…a6e7082` | Yes |
| `scripts/validate-examples.mjs` | `93d1e17f…6a94652` | Yes |
| `test/security/mcp-contracts.mjs` | `c2f57ddc…7823e56` | Yes |
| `test/security/fixtures/mcp-tool-contracts-first-stable.json` | `ea31d70a…e78324707f` | Yes, the accepted contract |
| `test/mcp/stdio.test.ts` | `8d29d0e6…6f14cddc` | Yes, the coordinator checkpoint ([permissions checkpoint](execution-permissions-checkpoint.md)) |
| `README.md` / `README.es.md` | `f8780516…977dc` / `f036e890…f580` | Yes, the coordinator checkpoint |
| `Dockerfile` / `.dockerignore` | `5561dc46…31a2a6` / `c96a8972…ed835` | Not re-reviewed against an image built from `d4d3f78c` (B2) |
| `package.json` | `480ad6d3…105206`, version `0.1.0-alpha.0`, `"private": true` | No stable version chosen (B8) |

Git state [O]:
- HEAD is `f62d941`, one commit ahead of `origin/main` (`d5a4550`).
- `git status --porcelain` lists **103** modified or untracked entries. The candidate is therefore not a commit, and no CI run can exist for it.

## 3. Independent inspection of the requested areas

### 3.1 `README.es.md` package inclusion [O]

- **How it gets in:** `package.json` `files` does **not** list `README.es.md`. With npm 11.11.0 on Node v24.14.1, `npm pack --dry-run --json --ignore-scripts` still includes it, because npm-packlist always includes files matching `readme*`. The non-`dist` entries are exactly `LICENSE`, `README.es.md`, `README.md`, `SECURITY.md`, `npm-shrinkwrap.json` and `package.json`.
- **Fail-closed checks:** `verify-release.mjs` requires:
  - its presence, through the tar allowlist plus `lstat` on the extracted file;
  - a regular file of 1–1048576 bytes with mode `0644`;
  - byte equality with the checkout copy;
  - `verification.readmeEsSha256 === source['README.es.md']` and `checks.readmeEsSourceBinding === true`.

  `prepare-release.mjs` copies it into the snapshot and binds it in `source-files.sha256.json`. If a future npm stopped including it implicitly, verification would **fail**, not ship silently.
- **Finding FG-01 (Low, robustness, not blocking):** inclusion depends on npm's implicit readme rule rather than the declared allowlist. Adding `"README.es.md"` to `files` would make it explicit. That edits `package.json`, so do it only before freezing the snapshot for B5, and accept the resulting rerun. Otherwise record the dependency as a known limitation.
- **Open:** the actual stable archive's `verification.json` is still pending (B5).

### 3.2 Private GitHub distribution

- **Repository visibility [O]:** `gh repo view` returned `{"isPrivate":true,"visibility":"PRIVATE"}`. The only release is `v0.1.0-alpha.0`, a pre-release published 2026-10-05T14:20:17Z [H]. No stable release or tag exists.
- **Release workflow [O]:** `.github/workflows/release.yml` runs only on `workflow_dispatch` from a `refs/tags/v*` ref with `contents: read`. It requires the tag to equal `v<package.version>`, runs `npm run release:prepare` on Node 22, and uploads candidate assets as a 7-day workflow artifact. It **does not publish**. The owner uploads the release manually.
- **Consequences:**
  - A stable run needs a version bump, a commit, a push and a tag first (B6, B8).
  - Asset upload to a private release and post-upload digest verification are manual steps with no automated receipt (B9).
- **Out of scope:** no npm registry or container registry publication is planned. The Docker image is a source-only distribution input (`sourceOnlyDistributionInputs` in `build-evidence.json`). The release notes must not imply a published image.

### 3.3 Docker hardened operation

- **Hardened design [O, from source]:** the Dockerfile is digest-pinned, uses `npm ci --ignore-scripts`, copies the distroless `cc-debian13:nonroot` rootfs onto `scratch`, sets `USER 1000:1000`, has no `EXPOSE` or `CMD`, and uses an explicit entrypoint. `.dockerignore` allowlists build inputs only.
- **CI coverage [O]:** the CI `docker` job checks, offline:
  - image configuration;
  - help and version;
  - nonroot, root-owned runtime inventory;
  - synthetic token files;
  - SDK initialize and tool listing.

  It runs with `--network=none --read-only`.
- **Image identity [H]:** the only reviewed image is `sha256:cb0330dd…`, built from source `eadfe117…`. It predates the accepted write-denial source `d4d3f78c` ([Docker final review](docker-final-review.md) §7). It is **stale** for this candidate.
- **Lab runs [R]:** one historical Docker batch had three bounded GET passes [H]. The second batch failed with `CONFIG_OR_INITIALIZE_FAILED`: the container exited with code 1 after 164 ms, and the cause is **unexplained** (docker-final-review §6). No Docker MCP run on the final source exists.
- **Secret volume [R]:** the registered ephemeral volume is confirmed absent (`docker volume inspect` reports no such volume, and inventory excludes it). The marker was removed. The root makes no deletion claim. This **closes** the open cleanup item in the [permissions checkpoint](execution-permissions-checkpoint.md); no deletion is attested.

### 3.4 Docker scan residual assessment [H]

- **Historical result:** for `cb0330dd…`, Trivy 0.74.0 found 31 Debian matches (23 MEDIUM, 8 LOW). Grype 0.118.0 rated the same matches 11 HIGH, 10 MEDIUM, 3 LOW and 7 NEGLIGIBLE. Zero had a fix available.
- **Applicability:** the per-CVE assessment is reasoned from `DT_NEEDED`, imports and code flow. For example, `node` does not load `libz.so.1`, DNS goes through c-ares, and there are no setuid binaries. It is sound as an applicability argument, but it is not a patch and not proof that the issues cannot be exploited.
- **Remaining gaps:**
  - The scanners and the SBOM do not inventory `/nodejs/bin/node` or its bundled OpenSSL, zlib, c-ares and ICU (DF-01, still open).
  - CI has **no** vulnerability-scan step, so scanning is a manual, scanner-dependent gate.
  - The [threat model](threat-model.md) requires that "operator acceptance of residual risk must be explicit and dated; none is recorded here." No such acceptance exists for the Docker residual.
- **Wording:** the README, the Spanish README and `docs/docker.md` correctly avoid zero-CVE wording and name each scanner (DF-02 is addressed). This review makes no zero-CVE claim.

### 3.5 Test and lab evidence

- **Security receipt [O]:** `test/security/evidence/2026-10-05T21-05-05-096Z.json` is still the latest receipt for `d4d3f78c`. It records 325 cases: 313 PASS, **6 FAIL** (TLS `listen EPERM`) and 6 SKIP, with `tests.status` 1. `prepare-release.mjs` asserts `receipt.tests.status === 0`, so a release attempt would correctly abort.
- **Functional suite [R]:** 118/118 on the frozen snapshot.
- **Linux Node 22 [H]:** 324/324, from receipt `linux-node22-2026-10-05T17-38-34-552Z`, run on an earlier source.
- **Native lab, current source [R], manifest `963cbf0c`:** status, devices, subnets, aianalyst_stats, intelfeed, modelbreaches and devicesearch PASS today.
  - **New failure:** `get_deviceinfo` (minimal) returned `OUTPUT_SHAPE_MISMATCH` with `safeProjectionFallback=true`. The batch stopped, so `get_similardevices` was not called.
  - **Still open from [stable-readiness](../stable-readiness.md):**
    - three semantic blockers: endpointdetails, metricdata and summarystatistics (inventory profile: two);
    - `/filtertypes` HTTP 302, which is refused;
    - 32 KiB `too_large` refusals on full collections;
    - `get_antigena` and `get_antigena_summary` reaching only a fallback-only pass;
    - untested dependent selectors.

## 4. Finite blocker list (all must close; none may be waived silently)

| # | Blocker | Closure evidence required | Owner |
|---|---|---|---|
| **B1** | The security suite fails on `d4d3f78c` (6 TLS `listen EPERM`) | A fresh complete receipt bound to the frozen candidate with `tests.status === 0`, `receiptComplete:true` and source/runtime hashes equal to the snapshot. Skips must be listed explicitly and classified as platform skips. Test cases must not be weakened. | Root / Sol |
| **B2** | The Docker image is stale (`eadfe117` ≠ `d4d3f78c`) | A rebuild from the frozen candidate, giving a new image ID. Runtime `/app/dist/src` must be byte-equal to the reviewed manifest, and dependency trees must equal the shrinkwrap. Then a Trivy and Grype rescan with versions and DB dates, a fresh CycloneDX SBOM plus a recorded Node 22.x and bundled-library inventory (DF-01), and a per-CVE applicability delta against the 31 historical matches. | Luna |
| **B3** | No Docker MCP operation on the final image | Using the reviewed UID and protected read-only secret mounts: initialize, `tools/list` equal to read27 `6ce22e56…`, and status, with TLS verified, graceful EOF/signal cleanup and sanitized records only. Either the earlier `CONFIG_OR_INITIALIZE_FAILED` must be root-caused, or a passing repeat must be shown on the same configuration. | Root / Luna |
| **B4** | Lab compatibility is unresolved for the advertised read scope (repair-or-remove policy in §6) | For each failure (`get_deviceinfo` mismatch, antigena fallback-only, filtertypes 302, too_large collections and three semantic blockers), either a reviewed source fix with a live retest, or a dated **owner scope decision** that removes or qualifies the claim in README/README.es/docs. Public claims must equal the tested subset. | Root |
| **B5** | No stable package artifact | `npm run release:prepare` on a **fresh frozen snapshot** of the final bytes. It must show two identical builds, `verification.json` with all checks true (including `readmeEsSourceBinding`, `writeProfilesRejected` and `binMode 0755`), a matching `SHA256SUMS`, a runtime SBOM and a passing `verifyReleaseEvidence`. If FG-01 is applied, apply it before freezing. | Root / Sol |
| **B6** | The candidate is uncommitted: 103 entries, HEAD unpushed, Git metadata read-only in the managed profile | A reviewed commit or commits containing exactly the frozen bytes, pushed to the private `origin`, with the tree hash recorded alongside the B1/B5 receipts. | Root |
| **B7** | No remote CI on the final revision | Passing `ci.yml` runs for Node 22 and 24 plus the `docker` job on the B6 commit, with job URLs and exact Node/npm versions. Local runs do not substitute. | Root |
| **B8** | No stable version or notes | The owner chooses the version. Update `package.json`, regenerate the lock and shrinkwrap only if required, and turn the CHANGELOG `Unreleased` section into the version entry (it becomes `release-notes.md`). This changes bound inputs, so B1, B5 and B7 must run **after** this change. | Root |
| **B9** | Publication procedure unproven | A tag `v<version>` on the B6/B8 commit runs `release.yml` and must pass. Then a manual upload to a GitHub Release in the **private** repository (re-confirm visibility on the day), download and `sha256sum -c SHA256SUMS` against the published assets, and record the published digests. No npm or container registry publication. | Root (owner) |
| **B10** | No final independent acceptance and no dated residual-risk decision | An independent review of the B1–B9 receipts against the final artifact digest, plus an **explicit, dated owner decision** on the Docker scan residual and the provider-processing notice (TM-17). Without that decision, the residual stays open per the threat model. | Independent reviewer + owner |

Order of work: B4 scope decision and fixes → B8 version → freeze → B6 commit/push → B1, B5, B2, B3 and B7 on that exact revision → B10 review → B9 publish. Any change to bound inputs after the freeze restarts B1, B2, B5 and B7.

## 5. Non-blocking findings

| ID | Sev | Finding | Action |
|---|---|---|---|
| FG-01 | Low | `README.es.md` is packed only through npm's implicit readme rule (§3.1); verification fails closed. | Optionally add it to `files` before freezing. |
| FG-02 | Info | CI has no image vulnerability scan; the B2 scan is manual, and results depend on the scanner and DB date. | Record the scanner, version and DB timestamp in the B2 receipt. Optionally add a non-gating CI scan later. |
| FG-03 | Info | `release.yml` prepares on Node 22 only. Node 24 coverage comes from the `ci.yml` matrix (B7). | None, if B7 covers Node 24. |
| FG-04 | Info | DF-01 (Node binary missing from the SBOM) is still open from the Docker review. | Covered by B2. |

## 6. B4 repair scope: answer to the root's question (2026-10-05)

**New results [R]:**
- On fresh native current-source runs with manifest `963cbf0c…`, `get_deviceinfo` returns `OUTPUT_SHAPE_MISMATCH` with `safeProjectionFallback` in **both** the minimal and inventory profiles.
- The summarystatistics `loginput` `hours=1` recipe returns `TOOL_ERROR` with `apiErrorCode bad_request`.
- In both cases the stop rules held and no dependent calls were made.

**Question:** can unused, incompatible catalogue operations be documented honestly, or must every one be repaired before release?

**Answer:** documentation is enough only for operations that are **not advertised** to the model. Whether to repair or remove is the owner's choice, but the outcome must satisfy:

1. **Catalogue-only operations, never registered as tools:** these are already outside the release surface. Listing them as "not validated or not supported in this release" is honest and sufficient.
2. **Advertised tools that fail live:** a footnote is not enough. The guards fail closed, so this is not a security defect. It is an accuracy defect of the same class as SC-01: the model is told a capability exists that the lab shows does not work. Each failing advertised selector needs **one** of:
   - **(a) Repair:** a reviewed source fix plus a sanitized live PASS with `compatibilityShapeValidated:true` and no fallback.
   - **(b) Remove:** take it out of the release surface through a reviewed change to the frozen release predicate or tool list. That change produces a new contract candidate, which needs a new independent review and repinning, and it restarts B1, B5 and B7.

   "Fallback-only" passes, such as `get_antigena_summary`, are not compatibility evidence. Remove them, or label them in the tool description and README as "safe projection only; upstream shape not validated."
3. **Parameterized variants within a tool that otherwise passes:** reject the failing variant at validation, with a fixed sanitized error and a test, instead of removing the tool.

**Finite repair scope (no guessing, no weakened guards):**

| Item | Safe repair path | Do not |
|---|---|---|
| `get_deviceinfo` (`DeviceinfoFulldevicedetailsFalse` view) | Capture a **structure-only** diagnostic (key-presence and JSON-type map, no values or IDs) from one bounded call. Diff it against the 6.1 schema. Relax the oracle only where the OpenAPI already allows absence or nullability, as with the stats empty-map fix. If the 7.1 shape truly differs from 6.1, choose (b) for this release. | Allow unknown keys, raise caps, or accept fallback as a pass |
| summarystatistics `loginput` `hours=1` → `bad_request` | Treat it as a 6.1-vs-7.1 parameter contract gap. Keep the `loginput` variant rejected at validation (path 3) and the selector BLOCKED, unless an authoritative 7.x parameter specification is obtained and reviewed. | Try alternate parameter combinations against the lab |
| `/filtertypes` 302 | Keep refusing the redirect. Choose (b), or document it if the tool group also serves `get_enums`, which passes. | Follow `Location` |
| Full-collection `too_large` (models, tags, components, metrics, enums) | Use only the filtered or discovered-handle recipes. Advertise the size refusal in the tool description. | Raise the 32 KiB or 1 MiB caps |
| endpointdetails and metricdata semantic blockers | Choose (b), or an approved discovery path with a new review | Invent identities or defaults |
| `get_antigena` and `get_antigena_summary` (fallback or truncation) | Use path (a) with a structure-only diff, or choose (b) or a label | Count fallback as a pass |

**Recommended stable scope:** to ship a polished stable without guesswork, release exactly the selectors that have a live, non-fallback PASS on the frozen candidate. Remove every other advertised tool or variant through one reviewed release-surface change and a new contract candidate, and list them in the README and README.es as deferred to a later release. That bounds B4 to a single review cycle instead of an open-ended compatibility campaign.

## 7. Closed or confirmed items [O unless noted]

- The accepted source, contract and helper hashes are unchanged in the workspace (§2).
- The README and stdio test drift from the helper review has been reconciled to the coordinator checkpoint hashes.
- The repository is private, and no stable release or tag exists.
- The registered lab secret volume is confirmed absent [R].
- The release helpers block a failing security receipt (`tests.status` must be 0).

**Gate decision:** **BLOCKED.** Publish only after B1–B10 each have receipts and a final independent acceptance. Earlier audits, receipts and the alpha release remain immutable historical evidence.
