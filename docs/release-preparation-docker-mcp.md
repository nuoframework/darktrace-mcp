# Validated-only private candidate preparation

## Current status — 2026-10-06

The candidate keeps the accepted source (`9e7c7070…`) and **15-tool / 19-selector** contract, and replaces the Docker runtime. The new runtime is 22 hash-pinned, `apk verify`-checked Alpine 3.24 packages per architecture: Alpine-maintained `nodejs-24.18.1-r0` with shared `libssl3`/`libcrypto3` `3.5.9-r0`, in a nonroot, shell-free `scratch` image. Images: arm64 `sha256:8cd85604…`, amd64 `sha256:b39e1b12…` ([implementation report](security/patched-runtime-implementation.md)).

| Gate | Status |
|---|---|
| Contract in image | 15 tools in both profiles on both architectures (hash `cd4ee422…`) |
| Tests | [CI run 37423665585](https://github.com/nuoframework/darktrace-mcp/actions/runs/37423665585), commit `2adb84b`: Node 22/24 offline + native Docker amd64/arm64, 130 + 325, 0 skipped, PASS |
| Scans | Trivy 0; Grype High CVE-2026-85091 (zlib) + Medium CVE-2024-9410 (`ada`), retained. Independent review (both architectures): zlib affected but vulnerable code not in the application path; `ada` is a name collision. zlib not fixed |
| Lab 7.1.0 | arm64 image 19/19 PASS, cleanup verified ([checkpoint](security/patched-runtime-lab-checkpoint.md)) |
| Release | `1.0.0` assets and hashes in the private GitHub Release notes; publication by the owner |
| Release | Version, assets and publication await separate owner decisions |

The section below records the **predecessor** image (`eb3a7681…`, OpenSSL 3.5.8) and is kept as history.

## Accepted validated-consultation checkpoint — 2026-10-06 (predecessor image, history)

The current candidate enforces **19 GET selectors in 15 MCP tools** in both read profiles. `sensitiveRead` cannot expand the ceiling. All excluded operations, including 20 formerly eligible reads and all writes, are denied before preview, audit or network access. Write and critical settings still fail closed at startup.

Source SHA-256: `9e7c7070298ef592a1a10cdcb7ca481420a377e25e4a93c863ca33c31921d7f2`; independent source review: [ACCEPT](security/validated-consultations-independent-review.md). Active full fixture: `6ddda2054c9c708d0516a90b7811eb0aba565016403953dace89d47bc89d213c`; both ordered complete profile hashes: `cd4ee42249a9110182046794c39fc00f5995700b7d751bccc6628e86afbddfe3`. The exact predecessor is archived, never an active fallback.

Native and hardened Docker initialized MCP each passed **all 19 distinct permitted selectors** on lab 7.1.0. Verified TLS, expected response shapes, no truncation or safe-projection fallback, sequential bounded recipes and no retries/extra pages; this does not establish every parameter combination or nonempty resource variant. Earlier missing-identifier refusals remain preserved. The exact campaign secret volume was removed and absence independently verified. [Bound lab receipts and manifest hashes](security/validated-consultations-lab-checkpoint.md).

Docker image `sha256:eb3a7681da69f6468df0a7600af9d72560cfd8d5c4747dfa8ee57e45f09abeaf` binds this source and the native transport runtime. Its full 49-file runtime hash is `e7cbb509d54909fa10276ffeaec11cab22bb201f1f81635fa8c988abcb3653fb`; both offline SDK profiles match the full 15-tool contract. [Image and dependency binding](security/validated-consultations-docker-checkpoint.md).

**Not ready for stable publication.** OpenSSL **3.5.8 / CVE-2026-35189** remains applicable to TLS certificate/CRLDP processing (official severity Low; fixed in 3.5.9). Container restrictions and response caps do not patch it. The final image has component equality to previously scanned OS/Node/dependency bytes, not a fresh scan database result. Historical Trivy 0.74.0 reports 23 MEDIUM and 8 LOW; Grype 0.118.0 reports **11 High**, 10 Medium, 3 Low and 7 Negligible for the same 31 Debian matches, with no fixed versions indicated. No zero-CVE or universal zero-High claim. [Primary advisory](https://openssl-library.org/news/secadv/20260929.txt).

Independent helper acceptance is scoped; the [migration review](security/validated-consultations-migration-review.md) still separates final test migration/provenance follow-up. **Final candidate suite completion is not yet claimed.** Root must freeze final documentation, run full applicable suites and two reproducible package builds/install/SRI/source-runtime-security-receipt checks, obtain final independent review, and verify remote CI and deployment/provider eligibility. Versions remain alpha; no commit, tag, release or publication is authorized by this checkpoint.

## Proposed private candidate Git revision — review only

Proposed subject: `Prepare validated-only 19-GET private MCP candidate`. Keep version `0.1.0-alpha.0` and `private:true`. Root must authorize Git mutation in a new dispatch after owner/independent reviews and exact final byte freeze. This document performs no staging, commit, tag, push, release, registry or API action. No stable publication is authorized.

The explicit path inventory below is a proposal from the working tree, not acceptance of every parallel owner file. Root must compare each byte with the corresponding owner receipt; a newly added or changed path requires explicit reconciliation. No directory-level staging, wildcard, dist, node_modules, temporary external receipt, secret or protected lab manifest is proposed. Existing published alpha assets and historical fixture/archive bytes remain immutable.

```text
.dockerignore
.github/workflows/ci.yml
CHANGELOG.md
Dockerfile
README.es.md
README.md
docs/architecture.md
docs/assets/badges/apache-2.0-en.svg
docs/assets/badges/apache-2.0-es.svg
docs/assets/badges/docker-local-en.svg
docs/assets/badges/docker-local-es.svg
docs/assets/badges/node-22-en.svg
docs/assets/badges/node-22-es.svg
docs/assets/badges/private-alpha-en.svg
docs/assets/badges/private-alpha-es.svg
docs/assets/badges/security-tests-en.svg
docs/assets/badges/security-tests-es.svg
docs/assets/badges/stdio-only-en.svg
docs/assets/badges/stdio-only-es.svg
docs/clients.md
docs/configuration.md
docs/docker.md
docs/es/getting-started.md
docs/getting-started.md
docs/lab-validation.md
docs/release-preparation-docker-mcp.md
docs/release-preparation.md
docs/releases.md
docs/security/docker-final-review.md
docs/security/docker-volume-review.md
docs/security/execution-permissions-checkpoint.md
docs/security/final-stable-gate-review.md
docs/security/first-stable-capability-review.md
docs/security/first-stable-release-helpers-review.md
docs/security/lab-campaign-inventory-review.md
docs/security/lab-harness-review.md
docs/security/mcp-attack-research.md
docs/security/mcp-corrections-acceptance.md
docs/security/mcp-defense-independent-review.md
docs/security/mcp-defense-results.md
docs/security/mcp-invisible-ca-corrections.md
docs/security/mcp-user-sources-gap-review.md
docs/security/read-campaign-final-review.md
docs/security/read-compatibility-corrections.md
docs/security/read-compatibility-repair-plan.md
docs/security/read-only-release-proposal.md
docs/security/response-view-overrides-docker-checkpoint.md
docs/security/response-view-overrides-independent-review.md
docs/security/response-view-overrides-lab-checkpoint.md
docs/security/restored-access-lab-checkpoint.md
docs/security/security-test-plan.md
docs/security/threat-model.md
docs/security/validated-consultations-docker-checkpoint.md
docs/security/validated-consultations-documentation-checkpoint.md
docs/security/validated-consultations-implementation.md
docs/security/validated-consultations-independent-review.md
docs/security/validated-consultations-lab-checkpoint.md
docs/security/validated-consultations-migration-review.md
docs/security/validated-consultations-release-helpers.md
docs/security/validated-consultations-release-plan.md
docs/stable-readiness.md
docs/troubleshooting.md
docs/visual-identity.md
docs/visual-security-docker-review.md
examples/docker.mcp.json
package.json
scripts/generate-catalogue.ts
scripts/lab-read-smoke.mjs
scripts/prepare-release.mjs
scripts/validate-examples.mjs
scripts/verify-release.mjs
src/api/operations.ts
src/api/response-view.ts
src/api/response-views.generated.json
src/api/validation.ts
src/config/load.ts
src/config/schema.ts
src/coverage/report.generated.json
src/coverage/report.ts
src/index.ts
src/observability/log.ts
src/policy/guard.ts
src/policy/release-capability.ts
src/server/createServer.ts
src/server/input.ts
src/server/stdio.ts
src/shape/output.ts
src/tools/index.ts
test/contract/integration.test.ts
test/contract/read-only-release.test.ts
test/contract/read-summary-compatibility.test.ts
test/contract/response-view-overrides.test.ts
test/contract/response-view-union.test.ts
test/contract/response-view.test.ts
test/contract/validated-consultations.test.ts
test/historical/alpha-read-write/provenance.json
test/historical/alpha-read-write/test/contract/integration.test.ts.txt
test/historical/alpha-read-write/test/mcp/corrections.test.ts.txt
test/historical/alpha-read-write/test/mcp/integration-final.test.ts.txt
test/historical/alpha-read-write/test/mcp/server.test.ts.txt
test/historical/alpha-read-write/test/security/config.test.mjs.txt
test/historical/alpha-read-write/test/security/mcp-contracts.mjs.txt
test/historical/alpha-read-write/test/security/mcp-defense.test.mjs.txt
test/historical/alpha-read-write/test/security/policy-sinks.test.mjs.txt
test/historical/alpha-read-write/test/unit/config.test.ts.txt
test/historical/alpha-read-write/test/unit/policy.test.ts.txt
test/historical/alpha-stdio/provenance.json
test/historical/alpha-stdio/stdio.test.ts.txt
test/historical/validated-contract-predecessor/mcp-tool-contracts-first-stable.json.txt
test/historical/validated-contract-predecessor/provenance.json
test/historical/validated-scope-predecessor/mcp-defense.test.mjs.txt
test/historical/validated-scope-predecessor/policy-sinks.test.mjs.txt
test/historical/validated-scope-predecessor/provenance.json
test/historical/validated-scope-predecessor/read-summary-compatibility.test.ts.txt
test/historical/validated-scope-predecessor/response-view.test.ts.txt
test/mcp/corrections.test.ts
test/mcp/integration-final.test.ts
test/mcp/server.test.ts
test/mcp/stdio.test.ts
test/security/config.test.mjs
test/security/evidence/2026-10-05T16-35-53-981Z.json
test/security/evidence/2026-10-05T16-59-25-647Z.json
test/security/evidence/2026-10-05T17-00-37-440Z.json
test/security/evidence/2026-10-05T17-03-58-658Z.json
test/security/evidence/2026-10-05T17-09-21-463Z.json
test/security/evidence/2026-10-05T17-27-39-624Z.json
test/security/evidence/2026-10-05T17-34-01-863Z.json
test/security/evidence/2026-10-05T17-38-27-890Z.json
test/security/evidence/2026-10-05T21-05-05-096Z.json
test/security/evidence/2026-10-05T21-40-23-825Z.json
test/security/evidence/2026-10-05T21-41-30-671Z.json
test/security/evidence/2026-10-05T21-51-26-818Z.json
test/security/evidence/2026-10-05T21-52-46-927Z.json
test/security/evidence/2026-10-05T21-57-52-976Z.json
test/security/evidence/2026-10-05T21-58-41-721Z.json
test/security/evidence/linux-node22-2026-10-05T17-23-25-078Z.json
test/security/evidence/linux-node22-2026-10-05T17-38-34-552Z.json
test/security/evidence/mcp-contract-description-delta.json
test/security/evidence/mcp-defense-2026-10-05T16-52-57-667Z.json
test/security/evidence/mcp-defense-2026-10-05T16-54-37-543Z.json
test/security/evidence/mcp-defense-2026-10-05T16-57-55-830Z.json
test/security/evidence/mcp-defense-2026-10-05T17-00-27-556Z.json
test/security/evidence/mcp-defense-2026-10-05T17-07-59-861Z.json
test/security/evidence/mcp-defense-2026-10-05T17-26-06-512Z.json
test/security/evidence/mcp-defense-2026-10-05T17-27-09-437Z.json
test/security/evidence/mcp-defense-2026-10-05T17-37-17-126Z.json
test/security/evidence/mcp-defense-2026-10-05T17-38-04-361Z.json
test/security/evidence/mcp-defense-final-manifest.json
test/security/evidence/mcp-invisible-ca-final-manifest.json
test/security/fixtures/mcp-tool-contracts-first-stable.json
test/security/fixtures/mcp-tool-contracts.json
test/security/mcp-contracts.mjs
test/security/mcp-defense.test.mjs
test/security/mcp-distribution.mjs
test/security/policy-sinks.test.mjs
test/security/run-defense-isolated.mjs
test/security/run-isolated.mjs
test/security/test-runtime-argv.ts
test/unit/config.test.ts
test/unit/policy.test.ts
```

## CI and review next steps

1. Reconcile owner reports and pending independent migration/provenance review; freeze the explicit file bytes, accepted source and full active fixture without regenerating an oracle.
2. Run typecheck, complete functional/security suites on frozen inputs; preserve failures and platform skips explicitly. Do not reuse predecessor receipts as current success.
3. Run isolated lifecycle-free/SRI-verified package preparation with both reproducible archives, README EN/ES source-and-installed binding, full source/runtime/dependency/security receipt evidence, archived alpha/predecessor integrity, CLI and write-startup refusals, and all verifier/tamper gates. Independently review exact package evidence.
4. Under a new root dispatch only, commit the explicit approved paths and run configured remote Node 22/24 plus Docker CI; record revision/results and independently inspect remote protection prerequisites. Local success is not remote CI.
5. Keep the stable hold until a supported official patched Node/OpenSSL runtime is digest-pinned and image/manual upstream applicability is independently revalidated. Lab 19/19 is bounded functionality, not a security waiver; deployment/provider eligibility remains separate.

## Preserved historical preparation reports — superseded

All older “current”, “pending”, 27/28-tool and broader campaign statements below describe predecessor checkpoints only. Original receipt hashes, failures, alpha archives and outcomes are retained; they do not override the current scope/gates above.

# Private consultation candidate preparation — current checkpoint 2026-10-05

**NOT READY for stable publication.** This section supersedes current-status claims in the preserved historical reports below. Task `task_32b6d85aae4b`, dispatch `ctx_d6256922b985`, owns this documentation and FG-01 package-list correction only. No credential/config/telemetry read, API call, production/helper/fixture edit, native agent, Git mutation, commit/tag/release, npm publication or registry publication was performed. **Wait for a new coordinator dispatch before any Git mutation.** The unchanged package version is `0.1.0-alpha.0`, with `private:true`.

## Candidate identity and evidence boundary

The accepted predecessor production source is R1/R2 `aa08c260847c0fc206253f2de3cb1a872f89d2f9d85f5618b88ffd0f5c681e8e`. The [implementation owner](security/read-compatibility-repair-plan.md) reports build/typecheck PASS, **124/124 functional PASS**, six added contract tests and unchanged tool contracts. Independent Sol review `ctx_afa82b46d409` is **ACCEPTED for rebuild/full-suite/same-recipe retest**, as recorded in [the independent R1/R2 review](security/response-view-overrides-independent-review.md); this does not approve the later whitelist or publication. R1 fixes explicitly documented numeric did arrays in Antigena summary; R2 permits the explicitly documented null automatic triggerer. R3 deviceinfo and R4 summary/query compatibility remain unresolved. On a clean isolated R1/R2 snapshot, the coordinator independently matched full source hash `aa08c260847c0fc206253f2de3cb1a872f89d2f9d85f5618b88ffd0f5c681e8e`, performed offline SRI-verified npm ci/build, and reports initialized production MCP minimal `get_status`, `get_antigena` and `get_antigena_summary` PASS, verified TLS, no fallback/truncation and compatibilityShapeValidated=true, exit 0. Protected schema-2 manifest: `d3fc39dc17a0a84e63bcb06c3019ce0c4d040b714927fc5922e82316dd2f4d34`. This adds two distinct selectors to the predecessor’s 17; it is not a retest of all 19 on the new whitelist or fresh complete security/package/image evidence.

The user chose **only validated consultations for the first stable release: 19 GET selectors across 15 tool groups**. The source owner has supplied an external whitelist candidate, whose complete 15/15 contract is independently accepted for root pin consideration in [the migration plan](security/validated-consultations-release-plan.md); whole-source acceptance, helper/test migration and explicit root pin remain pending. The accepted predecessor R1/R2 snapshot advertises the previous 27/28-group contract. Advanced Search and all other unvalidated selectors are deferred, including under sensitiveRead. These planned counts are not a claim of current enforcement.

Exact planned whitelist: `get_status`, `get_devices`, `get_subnets`, `get_aianalyst_stats`, `get_intelfeed`, `get_modelbreaches`, `get_devicesearch`, `get_similardevices`, `get_aianalyst_groups`, `get_aianalyst_incidentevents`, `get_aianalyst_investigations`, `get_mbcomments`, `get_details`, `get_tags_entities`, `get_tags_tid`, `get_tags_tid_entities`, `get_endpointdetails`, `get_antigena`, `get_antigena_summary`.

Frozen predecessor `d4d3f78c3a8e6668fcab76b483d6ec5d13a20e34b3f08853651f2039a985fb87` has the following coordinator-reported restored-access results, preserved in [restored-access-lab-checkpoint.md](security/restored-access-lab-checkpoint.md):

- Docker API and lab DNS work after full access was restored. The earlier registered volume was confirmed absent and its marker removed; no deletion time/actor is inferred. A separately created campaign volume was explicitly removed after the successful run, exit 0, then independently confirmed absent before marker removal.
- Initialized native production MCP: **17 distinct GET selectors PASS**, comprising 16 minimal selectors and inventory endpointdetails. Verified TLS, expected envelope/type, no truncation/fallback and compatibilityShapeValidated=true; no claim of all 27 groups/37 recipes/variants or nonempty dependent-resource coverage.
- Initialized Docker production MCP on local image `sha256:dc9b8f14c2c5f5b1041d0c47dbb9fc113c797a10731788f254878530e7dd3e3c`: status/devices/subnets PASS and container cleanup; independent offline SDK read27 exact-contract PASS. Protected manifest `963cbf0c36456f89d368e62c52a74262448f14873fa1165649c32789c5b97db0` binds that frozen runtime and SDK closure.
- Package preparation `/private/tmp/darktrace-restored-release-review-20261005`: **118/118 functional**, complete security runner exit 0 (**325 cases, 322 PASS, 0 FAIL, 3 platform special-bit SKIP**), all artifact/install/CLI/write-refusal checks PASS. Security receipt SHA-256 `58b451d929b77b5885a1085ca3538aa67268dbf36157f59238eca2a61336bed0`; two archive builds both `31c0512dcd89f735720b0ac0c92710c28fd74d958374ad3c2054dbbda8d2734a`.
- The separate bounded structure diagnostic stopped at deviceinfo refusal with exit 1, no structural findings or later Antigena requests. It is neither initialized-MCP PASS nor evidence supporting guessed overrides/parameters.

Earlier `listen EPERM`, `ECONNREFUSED`, Docker startup failures and platform skips remain factual failed/historical receipts. They are not relabeled as success. The restored d4d3 package/image/lab evidence is **historical for aa08c260**, and also predates the documentation and package-list bytes changed in this task. Fresh complete security, package, image/runtime/dependency/scan and coordinator-owned live gates are still required after independent whitelist review and the final input freeze.

The stable fixture remains `ea31d70a484c0d0353cb8651edc4b6a4ab13798c096056e8cdcf68e78324707f`; read27 `6ce22e568592b27281d14b1fd7361f80da1e0daf7bb2888c892458cc9f532e68`; sensitive28 `def9a8db53e2fc4d000257d865a2da5c2453c30285e6fb61244ce02c57434a6b`. Writes/critical capabilities are still denied before registration/signing, without previews. The current private snapshot has optional unvalidated Advanced Search; it is deferred from the user-selected stable whitelist. Historical alpha fixture/provenance and release assets are preserved.

The planned 15 tool names are `AIincidents`, `AIinvestigations`, `AIstats`, `antigena_listing`, `connectiondetails`, `devices`, `devicesearch`, `endpointdetails`, `intelfeed`, `mbcomments`, `modelbreaches`, `similardevices`, `status`, `subnets` and `tags`. SensitiveRead must add no operations in that future policy; complete source acceptance and the new pinned fixture are pending.


**Later accepted historical aa08 Docker checkpoint:** [R1/R2 Docker functional checkpoint](security/response-view-overrides-docker-checkpoint.md) records image `sha256:dfaf529bd23a3fd10a684386b72a751cbccbee9f711f1637af69a25e8cb27c00`, source `aa08c260847c0fc206253f2de3cb1a872f89d2f9d85f5618b88ffd0f5c681e8e`, full runtime tree `b00369cb5757301c295c4a3585ebbf9314237a11a9db4b38beb51a834d69b55a`, hardened offline exact read27 SDK PASS and 9/9 write-startup refusals. It proves unchanged Node/OS/dependency components against the earlier fresh scan; it is not a fresh database scan, new whitelist image or live Docker compatibility result. OpenSSL 3.5.8 and the scanner-qualified residual findings remain open. The [validated-consultations migration plan](security/validated-consultations-release-plan.md) defines the pending helper/oracle migration without automatically pinning it.

## FG-01 explicit Spanish README inclusion

Added only `"README.es.md"` after `"README.md"` in `package.json.files`. This resolves the robustness finding that inclusion relied on npm's implicit readme rule. Name, version, engines, private flag, dependencies, scripts and both locks are unchanged; `package-lock.json` and `npm-shrinkwrap.json` remain byte-identical SHA-256 `029af408743c19bfdf30c20e6583bd9fda2c3de984e9557c9ed231bb0e078e63`.

The accepted helpers already require the Spanish README to be a regular 0644 file, bounded to 1 MiB, byte-bound to the source snapshot and matching installed bytes. No allowlist/verifier was weakened. A new package preflight must consume the updated package list and synchronized README bytes before any release claim. A dry-run package inventory verifies inclusion only; it cannot replace two-build, security, installer or tamper-check evidence.

## Image security remains a publication blocker

[Fresh Docker review](security/docker-final-review.md) binds dc9b8f14 to d4d3. Trivy 0.74.0 rates its 31 Debian-package match pairs **23 MEDIUM, 8 LOW**; Grype 0.118.0 rates the same pairs **11 High, 10 Medium, 3 Low, 7 Negligible**. Neither scanner indicates a fixed version for these matches. Scanner versions, fresh DB timestamps, individual pairs and conservative applicability are recorded in that review; no zero-High/zero-CVE or blanket residual acceptance is claimed.

The scanner SBOM omitted Node and its bundled libraries. Manual inventory found **OpenSSL 3.5.8 affected by CVE-2026-35189, official severity Low**: TLS peer-certificate/CRLDP processing can exhaust memory. Production's verified node:https connection uses that path; body/output limits and container restrictions do not supply a patch. OpenSSL 3.5.9 fixes it, but the examined official supported Node 22.23.3, 24.21.0 and 26.10.0 releases/images still supplied 3.5.8 on October 5. The latest supported Node release is not automatically free of upstream advisories. [Primary OpenSSL advisory](https://openssl-library.org/news/secadv/20260929.txt) · [official Node release index](https://nodejs.org/dist/index.json).

Hold stable publication until an official supported patched runtime can be digest-pinned and revalidated; do not custom-build crypto, weaken TLS, substitute a system libssl for the static copy or silently accept the applicable issue for an ETA. Loaded-library residuals require specific independent applicability review and an explicit dated owner decision. A successful functional Docker run is not image security acceptance.

## Precise proposed Git candidate — review only, no mutation authorized

Suggested candidate commit subject: **`Prepare private consultation candidate with bounded response-view corrections`**. Keep version `0.1.0-alpha.0`; this would be a private candidate/CI revision, not a stable tag or replacement alpha release. HEAD was `f62d941048399a81652404c99baabc3f48d91bff` when prepared. The repository has parallel owner changes, so root must compare every listed file against its accepted owner receipt and freeze exact bytes before authorizing a commit under a **new dispatch**. Inclusion in this list is a proposal, not independent acceptance of the source or evidence.

The list below explicitly enumerates the modified/untracked candidate paths observed in this task. Unchanged tracked inputs come from the parent commit; no broad staging command, glob or directory-level add is proposed. Historical failed receipts and alpha archives are included as preserved evidence, not passing gates. No dist, node_modules, external receipts, credential files or lab configuration are in this list. If another owner adds or changes any input after this inventory, reconcile it explicitly and regenerate the freeze and affected gates.

```text
.dockerignore
.github/workflows/ci.yml
CHANGELOG.md
Dockerfile
README.es.md
README.md
docs/architecture.md
docs/assets/badges/apache-2.0-en.svg
docs/assets/badges/apache-2.0-es.svg
docs/assets/badges/docker-local-en.svg
docs/assets/badges/docker-local-es.svg
docs/assets/badges/node-22-en.svg
docs/assets/badges/node-22-es.svg
docs/assets/badges/private-alpha-en.svg
docs/assets/badges/private-alpha-es.svg
docs/assets/badges/security-tests-en.svg
docs/assets/badges/security-tests-es.svg
docs/assets/badges/stdio-only-en.svg
docs/assets/badges/stdio-only-es.svg
docs/clients.md
docs/configuration.md
docs/docker.md
docs/es/getting-started.md
docs/getting-started.md
docs/lab-validation.md
docs/release-preparation-docker-mcp.md
docs/release-preparation.md
docs/releases.md
docs/security/docker-final-review.md
docs/security/docker-volume-review.md
docs/security/execution-permissions-checkpoint.md
docs/security/final-stable-gate-review.md
docs/security/first-stable-capability-review.md
docs/security/first-stable-release-helpers-review.md
docs/security/lab-campaign-inventory-review.md
docs/security/lab-harness-review.md
docs/security/mcp-attack-research.md
docs/security/mcp-corrections-acceptance.md
docs/security/mcp-defense-independent-review.md
docs/security/mcp-defense-results.md
docs/security/mcp-invisible-ca-corrections.md
docs/security/mcp-user-sources-gap-review.md
docs/security/read-campaign-final-review.md
docs/security/read-compatibility-corrections.md
docs/security/read-compatibility-repair-plan.md
docs/security/read-only-release-proposal.md
docs/security/response-view-overrides-docker-checkpoint.md
docs/security/response-view-overrides-independent-review.md
docs/security/response-view-overrides-lab-checkpoint.md
docs/security/restored-access-lab-checkpoint.md
docs/security/security-test-plan.md
docs/security/threat-model.md
docs/stable-readiness.md
docs/visual-identity.md
docs/visual-security-docker-review.md
examples/docker.mcp.json
package.json
scripts/generate-catalogue.ts
scripts/lab-read-smoke.mjs
scripts/prepare-release.mjs
scripts/validate-examples.mjs
scripts/verify-release.mjs
src/api/operations.ts
src/api/response-view.ts
src/api/response-views.generated.json
src/api/validation.ts
src/config/load.ts
src/config/schema.ts
src/coverage/report.generated.json
src/coverage/report.ts
src/index.ts
src/observability/log.ts
src/policy/guard.ts
src/policy/release-capability.ts
src/server/createServer.ts
src/server/input.ts
src/server/stdio.ts
src/shape/output.ts
src/tools/index.ts
test/contract/integration.test.ts
test/contract/read-only-release.test.ts
test/contract/read-summary-compatibility.test.ts
test/contract/response-view-overrides.test.ts
test/contract/response-view-union.test.ts
test/historical/alpha-read-write/provenance.json
test/historical/alpha-read-write/test/contract/integration.test.ts.txt
test/historical/alpha-read-write/test/mcp/corrections.test.ts.txt
test/historical/alpha-read-write/test/mcp/integration-final.test.ts.txt
test/historical/alpha-read-write/test/mcp/server.test.ts.txt
test/historical/alpha-read-write/test/security/config.test.mjs.txt
test/historical/alpha-read-write/test/security/mcp-contracts.mjs.txt
test/historical/alpha-read-write/test/security/mcp-defense.test.mjs.txt
test/historical/alpha-read-write/test/security/policy-sinks.test.mjs.txt
test/historical/alpha-read-write/test/unit/config.test.ts.txt
test/historical/alpha-read-write/test/unit/policy.test.ts.txt
test/historical/alpha-stdio/provenance.json
test/historical/alpha-stdio/stdio.test.ts.txt
test/mcp/corrections.test.ts
test/mcp/integration-final.test.ts
test/mcp/server.test.ts
test/mcp/stdio.test.ts
test/security/config.test.mjs
test/security/evidence/2026-10-05T16-35-53-981Z.json
test/security/evidence/2026-10-05T16-59-25-647Z.json
test/security/evidence/2026-10-05T17-00-37-440Z.json
test/security/evidence/2026-10-05T17-03-58-658Z.json
test/security/evidence/2026-10-05T17-09-21-463Z.json
test/security/evidence/2026-10-05T17-27-39-624Z.json
test/security/evidence/2026-10-05T17-34-01-863Z.json
test/security/evidence/2026-10-05T17-38-27-890Z.json
test/security/evidence/2026-10-05T21-05-05-096Z.json
test/security/evidence/2026-10-05T21-40-23-825Z.json
test/security/evidence/2026-10-05T21-41-30-671Z.json
test/security/evidence/2026-10-05T21-51-26-818Z.json
test/security/evidence/2026-10-05T21-52-46-927Z.json
test/security/evidence/linux-node22-2026-10-05T17-23-25-078Z.json
test/security/evidence/linux-node22-2026-10-05T17-38-34-552Z.json
test/security/evidence/mcp-contract-description-delta.json
test/security/evidence/mcp-defense-2026-10-05T16-52-57-667Z.json
test/security/evidence/mcp-defense-2026-10-05T16-54-37-543Z.json
test/security/evidence/mcp-defense-2026-10-05T16-57-55-830Z.json
test/security/evidence/mcp-defense-2026-10-05T17-00-27-556Z.json
test/security/evidence/mcp-defense-2026-10-05T17-07-59-861Z.json
test/security/evidence/mcp-defense-2026-10-05T17-26-06-512Z.json
test/security/evidence/mcp-defense-2026-10-05T17-27-09-437Z.json
test/security/evidence/mcp-defense-2026-10-05T17-37-17-126Z.json
test/security/evidence/mcp-defense-2026-10-05T17-38-04-361Z.json
test/security/evidence/mcp-defense-final-manifest.json
test/security/evidence/mcp-invisible-ca-final-manifest.json
test/security/fixtures/mcp-tool-contracts-first-stable.json
test/security/fixtures/mcp-tool-contracts.json
test/security/mcp-contracts.mjs
test/security/mcp-defense.test.mjs
test/security/mcp-distribution.mjs
test/security/policy-sinks.test.mjs
test/security/run-defense-isolated.mjs
test/security/run-isolated.mjs
test/security/test-runtime-argv.ts
test/unit/config.test.ts
test/unit/policy.test.ts
```

Before staging, root must inspect the exact diff for each path and confirm no operator data is included; stage only the reviewed paths, compare the staged path list with this inventory, and record the resulting commit/tree identity next to the freeze hash. **This worker has neither staged nor committed anything.** A future commit cannot erase or replace the already published alpha tag/assets or claim that historical d4d3 receipts validate aa08c260. The proposed full list is also saved in the external `candidate-files.txt`, with per-file hashes in `candidate-file-hashes.json`; document-only owned hashes are in `after-hashes.json`.

## CI and publication preparation — next steps for root

1. Preserve the accepted independent R1/R2 review, implement the user-selected 19-selector/15-tool whitelist and obtain new independent contract acceptance. Preserve fail-closed projection/signing/limits, campaign failures, missing resources and Advanced Search's unvalidated status. Add new acceptance receipts without rewriting historical reviews.
2. Freeze all final source/generator/harness/docs/package inputs and the unchanged fixture/locks. Run `npm run release:prepare -- /absolute/external/fresh-candidate-directory` on that snapshot for full functional/security, two identical archive builds, allowlist/mode/SRI/installed-byte/README.es binding, CLI/write refusals and example parsing. Record exact Node/npm/platform versions, all skipped cases, archive/runtime/source/fixture hashes and all verification fields; do not reuse d4d3 package bytes after FG-01 or docs changes.
3. Rebuild image from the same accepted freeze, prove runtime/dependency binding, run hardened exact-contract SDK stdio, rescan Trivy/Grype with fresh DB dates and manually check bundled upstream components. New image functional/lab checks do not clear CVE-2026-35189 while it remains unpatched. Coordinator owns protected schema-2 manifest, bounded initialized-production-MCP retests and exact registered cleanup evidence; this worker makes no appliance calls.
4. Only after a **new dispatch authorizes Git mutation**, make the explicit candidate commit, confirm the remote is the private repository, and push the authorized candidate branch. Record its exact commit/tree hashes and the frozen receipt bindings. No stable tag or release is created at this step.
5. On that exact private revision, `.github/workflows/ci.yml` must pass both Linux **Node 22 and 24** `offline` jobs (each invokes release:prepare) and the dependent `docker` job. Record run/job URLs, revision SHA, actual Node/npm versions and results. Local checks do not substitute for remote CI. Current CI checks Docker configuration, offline diagnostics/inventory and SDK initialization; it does **not** perform vulnerability scanning or the live appliance campaign, and its tools-list assertion is merely nonempty. A new exact 15-tool/19-selector whitelist contract receipt and fresh scan receipts remain necessary; historical read27 is not the planned stable contract.
6. Retain the stable-publication hold until runtime patch, fresh source/artifact/image/lab evidence, scope decisions, provider-processing notice and dated residual-risk decision receive final independent acceptance. A later owner-chosen stable version changes bound package inputs and requires new evidence/CI. Do not reuse or move `v0.1.0-alpha.0`.
7. When separately authorized after those gates, `.github/workflows/release.yml` only prepares assets from a tag exactly matching package.version on Node22; it does **not publish**. Root owns any later private GitHub Release upload, re-confirmed visibility, download and checksum verification. No npm or container registry publication is planned or authorized here.

## Validation and receipt location for this task

External receipts: `/private/tmp/darktrace-docs-candidate-ctx_d6256922b985/`. They record before/after hashes for exactly the six owned files, a complete proposed candidate path/hash inventory, read-only source/fixture/lock identity checks, document/example validation and a package dry-run inclusion check. Corporate English/Spanish notices, banner/logo/badges, contact `contacto@pabloarrabal.com` and existing launch recipes are preserved. Validation PASS: the official offline example validator parsed five JSON examples, one TOML example and eight documents; Markdown launch-policy checks also covered all five owned Markdown files. The isolated offline `npm pack --dry-run --json --ignore-scripts` inventory contains both READMEs (32 package paths); it runs no documented launch commands and makes no appliance/network requests. Package metadata comparison permits exactly the added Spanish README entry; both lock hashes, aa08 source hash and stable fixture hash match their recorded values. Historical report suffixes and corporate/contact lines are preserved, and `git diff --check` passes. These documentation/package-list checks certify this edit's scope and consistency, not complete candidate release readiness. The report's own hash is recorded externally to avoid a self-referential hash claim.

---

# Historical preparation records — superseded current-status statements

The following records remain unchanged as evidence of their original sources, permissions and failures. References there to unavailable Docker access, pending d4d3 gates or implicit Spanish README inclusion describe those older checkpoints; the current checkpoint above supersedes them.

# Accepted first-stable contract migration — final checkpoint 2026-10-05

This section supersedes the pre-approval checkpoint and historical frozen-14 report below. Independent review accepted the description correction and root explicitly authorized pinning in `msg_f35fa2a91121`. Version remains `0.1.0-alpha.0`; no release pipeline, installation, Docker run, appliance call, version change or publication was performed in this dispatch. The packaging helpers are ready for independent review, not proof that release gates passed.

## Approved bindings and implementation

Production source SHA256 is `d4d3f78c3a8e6668fcab76b483d6ec5d13a20e34b3f08853651f2039a985fb87` (security receipt's recursive sorted src hash-map algorithm). The only additional runtime delta from independently accepted source `7104...` is the authorized consultation-only description sentence in `src/tools/index.ts`. The distinct pinned `test/security/fixtures/mcp-tool-contracts-first-stable.json` has SHA256 `ea31d70a484c0d0353cb8651edc4b6a4ab13798c096056e8cdcf68e78324707f`; supported read27 canonical hash is `6ce22e568592b27281d14b1fd7361f80da1e0daf7bb2888c892458cc9f532e68`, and sensitive28 is `def9a8db53e2fc4d000257d865a2da5c2453c30285e6fb61244ce02c57434a6b`. These three static verifier pins are now approved values, not null. Capture/build cannot update them.

Historical alpha oracle remains `37b5af95de1786ecce1b8762e12d2d63e577f171511a9db4964518b13a917f72`; original ten-file archive manifest remains `2d9bffe6f1c462b04d5bef68607fe335d699e0fcdc37673f8e10dbe299538d60`. A separately approved supplemental archive preserves the original `test/mcp/stdio.test.ts` bytes (`e14fb7a0247bbb991cbc43c363f147881f08584425bf9175f522d8e2d32b1d5c`) under `test/historical/alpha-stdio/stdio.test.ts.txt`; its distinct provenance manifest hashes to `33cbdcac2bb47ddc59585836180374a4e63de68945530042c6005d2e02d511a8`. The verifier binds both archives independently. Neither archive claims published-alpha bytes.

Active MR04 consumes the independently approved stable fixture, checks both full contracts and all three refused profiles, and keeps description/schema/annotation/order assertions. A dedicated matrix exercises nine production startup refusals with the DNS/socket/HMAC guard. Three obsolete startup expectations now require the known `DARKTRACE_PROFILES` diagnostic name. The old positive critical-write stdio case is archived and replaced by nine startup refusals, including exact diagnostic-variable assertions. No test is weakened, automatically repinned or newly skipped.

Schema 3 binds immutable capability, both fixture inputs, approved contracts/refusals, production source, helper/config/policy/stdio inputs, security receipts and both historical archives. Existing checksum inventory, tar allowlist/integrity, runtime equality, dependency SRI, two-build reproducibility and installed CLI requirements remain mandatory. Helper hashes at freeze:

| File | SHA256 |
| --- | --- |
| `scripts/prepare-release.mjs` | `3a7d3fdd1ebfa89eabc508e5eb582ecf3b3d40c3e798ef00dc9410ad112d91eb` |
| `scripts/verify-release.mjs` | `e4a293cebf731495534a69e75aec69fd2f7b8455a49b5e89d3a33f77ae5e7082` |
| `scripts/validate-examples.mjs` | `93d1e17f4129e85edd34245246cf634ca406bf085bd59d9088e072e7a6a94652` |
| `test/security/mcp-contracts.mjs` | `c2f57ddc73ade69f875bb87f577fa9fa5d46c126b252b905cff6c446c7823e56` |

## Actual local checks and remaining gates

Execution used Node v24.14.1 on macOS arm64, isolated external copies, clean PATH/HOME/TMPDIR and existing local dependencies; no credentials or operator configuration. Final security snapshot is `/private/tmp/darktrace-stable-gates-olv6hjlc`. After root's additional exact-variable assertion, the final functional-only snapshot is `/private/tmp/darktrace-stable-functional-e9svmw6i`.

| Command/check | Observed result |
| --- | --- |
| `npm run typecheck` in both final snapshots | exit 0 |
| `npm test` in both final snapshots | exit 0; 118 tests, 118 pass, 0 fail, 0 skipped |
| `npm run test:security` in final security snapshot | exit 1; 325 tests, 313 pass, 6 fail, 6 skipped |
| `node scripts/validate-examples.mjs` | exit 0; 5 JSON, 1 TOML, 8 docs; no commands executed or network probes |
| Syntax checks for three packaging scripts and MCP helper | exit 0 |
| `/private/tmp/darktrace-release-stable-pin-unit.mjs` at approved-pin checkpoint | exit 0; actual verifier rejects seven mutations (description/schema/annotation/order/capability/refusals/alpha binding); two archive mutations rejected; complete capture equals approved fixture and nine refusals pass |
| `/private/tmp/darktrace-release-supplement-unit.mjs` after supplemental archive binding | exit 0; both archives verified; supplemental bytes and manifest mutations rejected |

All six security failures are local TLS listener `EPERM` errors: trusted/hostname/untrusted/expired TLS and slow-body admission/caller-cancellation cases. Six existing platform skips cover public/private token and policy-file modes 2600/4600. They were neither bypassed nor changed. The receipt classifies these 12 cases BLOCKED, with 313 PASSED and zero assertion-classified FAIL, but the Node security command still failed: this is **not a passing security gate**. The receipt records 16,001 assertion invocations and `receiptComplete:true`, with source and both fixture hashes matching. Receipt: `/private/tmp/darktrace-stable-gates-olv6hjlc/test/security/evidence/2026-10-05T21-05-05-096Z.json`, SHA256 `567714c247b450493b012a696f295f4e709048b384244caddeae28b48e7f3c2d`.

Earlier functional and security runs exposed the remaining alpha stdio positive case and three stale startup-variable expectations; these were corrected with root approval and rerun. No unresolved non-TLS assertion failures remain in the final security run. Pre-approval fail-closed checks below remain evidence of that earlier phase, not commands rerun after pinning.

Final isolated packaging/two builds/install/CLI/end-to-end schema 3 asset tamper checks await coordinator documentation/source/version freeze and the applicable execution permissions. The nine schema 2 asset tamper checks below remain historical; they are not new schema 3 evidence. Linux Node22/24, Docker build/runtime/secret-mount cleanup and live compatibility are coordinator gates and are not claimed here. Docker socket access is still unavailable. Coordinator may run `node scripts/prepare-release.mjs /private/tmp/darktrace-first-stable-reviewed-candidate` only after those prerequisites; no stable publication is authorized by this checkpoint.

---

# Historical pre-approval first-stable packaging migration checkpoint — 2026-10-05

This checkpoint supersedes the current migration guidance below; the frozen-14 execution record remains historical and unchanged. Package version stays `0.1.0-alpha.0`. No fixture has been auto-pinned, no full release pipeline has run in this dispatch, and no stable/Docker/publication success is claimed. Root's current managed execution profile cannot access the Docker socket, so the final Docker gate and exact registered ephemeral-secret-volume cleanup remain pending under [execution-permissions-checkpoint.md](security/execution-permissions-checkpoint.md). No worker inspected that volume marker, protected configuration, tokens or lab data.

## Migration implemented, gated before artefacts

Root approved schema 3 with explicit immutable release capability, source bindings, historical alpha preservation and first-stable oracle separation. `scripts/verify-release.mjs` has three static null approval pins (fixture/read/sensitive full-contract hashes). Until an explicit independent-acceptance/root message authorizes replacing them, `assertReviewedReleaseContractReady` fails before output creation, dependency installation, capture or verification. There is no environment/CLI/argument override, automatic recapture or dynamic version switch. `scripts/prepare-release.mjs` checks this gate immediately after external-path validation and before mkdir/install; both verify CLI and exported evidence verification also gate before reading/creating evidence.

The planned fixture is `test/security/fixtures/mcp-tool-contracts-first-stable.json`; it is not written in this phase. Historical `test/security/fixtures/mcp-tool-contracts.json` remains exact SHA256 `37b5af95de1786ecce1b8762e12d2d63e577f171511a9db4964518b13a917f72`. Schema 3 binds both fixture paths/hashes in source evidence and security receipt; the first-stable complete fixture is the checksum asset `mcp-tool-contracts.json`. There are still nine release assets and a fixed checksum inventory.

`test/security/mcp-contracts.mjs` preserves its four alpha profile definitions for historical/current negative assertions. New immutable `releaseProfiles` contains only read and read+sensitive. The new `forbiddenReleaseProfiles` contains three exact cases: write, write+critical, critical-without-write. `verifyRejectedReleaseProfiles()` rejects each object and SDK-contract attempt before server construction, then invokes production stdio/doctor/check-config with synthetic environment and the existing DNS/socket/HMAC side-effect guard: status 1, empty stdout, only fixed startup metadata, no canaries or side-effect marker. No write tool listing is captured as successful or replaced by an empty listing. Two complete supported contracts and nine startup refusals are checked again after the second build.

The verifier checks capability `{write:false,writeCritical:false}` in the built module, frozen-object status, helper's exact supported/refused profile sets, complete ordered contracts, profile hashes, capability metadata and rejection expectations. It binds the release-capability source hash, config/loader/policy/stdio/helper/diagnostic-guard inputs to the exact checkout source inventory. Security source and runtime receipts, reproducible build, installed JS/JSON equality, tar allowlist, regular files, exact three libraries, SRI, SBOM hashes/licenses, bin mode and README.es binding remain required. Installed CLI additionally refuses all three write-grant combinations in stdio/doctor/check-config and must describe consultation-only behavior in help. This does not certify an appliance or future provider deployment.

Historical tests are not dropped: the verifier pins `test/historical/alpha-read-write/provenance.json` SHA256 `2d9bffe6f1c462b04d5bef68607fe335d699e0fcdc37673f8e10dbe299538d60`, its accepted source `4f6e...` and ten archived original path/byte hashes. These are source inputs, not packaged runtime files. Changed archive bytes, manifest, current source bindings, description/schema/annotations/order, fixture or receipt/checksum metadata cannot be accepted by the intended verifier. Tests do not rewrite expected hashes. Historical alpha reproduction uses matching historical scripts; the new schema 3 verifier does not silently reinterpret schema 2 evidence.

`validate-examples.mjs` continues parsing five JSON/one TOML and eight Markdown docs without executing their commands. It rejects write-profile grants, critical-write true grants and duplicate Docker env overrides while accepting explicit false critical settings. Existing immutable image template, no registry project launcher, native path, token-file, Docker hardening and negative-warning interpretation rules remain.

## Independently reviewed source and bounded description delta

Root relayed acceptance of source `7104f8c4518d45f090e471a5c3412bfcebe4bdda54c6d3b543581510ba460be8` and old candidate `1adf0108...` in [first-stable-capability-review.md](security/first-stable-capability-review.md). Its 84 contract/startup, 163 forged/descriptor and 45 targeted passes are independent reviewer results, not execution claims by this worker. That review found misleading write-preview wording in read descriptions.

Root explicitly authorized the sole additional source change in `src/tools/index.ts`: replace `Writes default to a preview; dryRun:false is required for eligible medium/high execution.` with `This release exposes consultation operations only; write actions are unavailable.` Every schema, selector, annotation, name, order and other description text stays identical. The old candidate and alpha oracle remain historical, not overwritten.

New clean snapshot: `/private/tmp/darktrace-release-description-1uibjurc`, source SHA256 `d4d3f78c3a8e6668fcab76b483d6ec5d13a20e34b3f08853651f2039a985fb87` using the security hash-map algorithm. Byte comparison with the accepted 7104 snapshot found exactly one source delta: `tools/index.ts`. Full new candidate `mcp-tool-contracts-first-stable.candidate.json` SHA256 `ea31d70a484c0d0353cb8651edc4b6a4ab13798c096056e8cdcf68e78324707f` is outside the repository. `contract-description.diff`, `source-description.diff`, `candidate-capture.json` and `startup-refusal-checks.json` accompany it.

| Supported profile | Tools | Complete description-corrected canonical SHA256, pending acceptance |
| --- | --- | --- |
| read | 27 | `6ce22e568592b27281d14b1fd7361f80da1e0daf7bb2888c892458cc9f532e68` |
| read+sensitive | 28 | `def9a8db53e2fc4d000257d865a2da5c2453c30285e6fb61244ce02c57434a6b` |

## Executed checks in this dispatch

Node `v24.14.1`, macOS arm64; no fresh dependency install or Docker/appliance/registry request. The clean snapshot used only PATH, operator-free HOME and TMPDIR, with existing local node_modules symlinked.

| Command | Exact outcome |
| --- | --- |
| `npm run typecheck` in the new snapshot | exit 0 |
| `npm run build` in the new snapshot | exit 0 |
| `node capture-description-candidate.mjs` in the new snapshot | exit 0; full contracts equal old candidate after only 55 authorized sentence replacements; 3 refused profiles / 9 production modes passed |
| `node --check scripts/verify-release.mjs`, prepare-release.mjs, validate-examples.mjs and test/security/mcp-contracts.mjs | all exit 0 |
| `node scripts/validate-examples.mjs` | exit 0; 5 JSON, 1 TOML, 8 documents, syntax/launch-policy true, commandsExecuted/networkProbe false |
| `node /private/tmp/darktrace-release-migration-unit.mjs` | exit 0; prepare and verify gates create no output before approval; archive10 exact; 2 archive mutations rejected; 4 full-candidate content mutations rejected; 2 example write-grants rejected; no pipeline, install, oracle pin or network |

The candidate mutation checks are independent external comparisons to the captured candidate, not an accepted/pinned production oracle. Production contract/asset tamper checks remain fail-closed behind the approval gate and must be rerun on approved new evidence after the fixture is pinned. The prior nine schema 2 asset tamper cases below are historical proof for frozen-14; they are not relabelled as new schema 3 execution. Full functional/security suites, two release builds, clean install/CLI and end-to-end artifact tamper tests have not been run on this new snapshot.

Root routed the complete new candidate/diffs to a fresh independent review. Only after explicit acceptance should the owner pin all three verifier hashes, add the distinct accepted fixture, migrate active MR04/security fixture consumers, and run full gates. Final release preparation must wait for parallel documentation/source/version freeze; no version change, commit, tag, push or publication is performed here. Docker access and final image/runtime/secret-mount/cleanup checks remain open.

---

The remainder is the preserved historical frozen-14 packaging report. Its commands, hashes and results apply only to that snapshot.

# Docker/MCP candidate preparation — 2026-10-05

This report supersedes current-candidate preparation guidance in [release-preparation.md](release-preparation.md), while preserving that historical alpha evidence. Package version remains **0.1.0-alpha.0**, `private:true`; published alpha assets must not be replaced. This worker has not committed, tagged, pushed, published, read protected lab configuration/tokens/screenshots, or made appliance requests. Final version/publication belongs to the coordinator after applicable gates and independent review.

## Implemented integrity checks

`prepare-release.mjs` builds in an isolated external snapshot with clean subprocess environment, installs using `npm ci --ignore-scripts`, runs typecheck/standard/security suites, packs twice around a second build, compares archive and complete generated build inventories, and checks that the security receipt binds the unchanged production source and shipped build. No archive/evidence is written inside the checkout. Dependency pins and lock/SRI bytes are unchanged: both lock and shrinkwrap SHA-256 `029af408743c19bfdf30c20e6583bd9fda2c3de984e9557c9ed231bb0e078e63`.

MR-04 generation imports `test/security/mcp-contracts.mjs` in the snapshot, obtains complete `tools/list` contracts for four profiles over in-memory SDK sessions, and compares canonical equality with the versioned reviewed fixture. It does not rewrite/recapture the oracle or make HTTP requests. Generation repeats after the second build. The full reviewed fixture is emitted as `mcp-tool-contracts.json`, with its raw digest and four profile digests in both build and installer evidence. Its SHA-256 is pinned in the verifier: `37b5af95de1786ecce1b8762e12d2d63e577f171511a9db4964518b13a917f72`. A changed oracle requires independent review and an explicit code update.

| Profile | Tools | Canonical complete-contract SHA-256 |
|---|---:|---|
| read | 27 | `49e37f629592026c68ad3ab2389a855bf702827cb887bce66d1d5ed3747b5052` |
| read+sensitive | 28 | `71de9e47636e0f421b1aaaf137bfd0c0e97479cc7ac07edeba7970f3bdb84c1f` |
| read+write | 36 | `baaaf4a7ae6bd522201acae1ee7bd3df503373363098390b8794388cf12a142f` |
| read+writeCritical | 41 | `36d8db13f56644c2083039c47a0bb777bbe3b44a6eb7b907e4ad3ed7122350fb` |

The source evidence includes all actual generator inputs: OpenAPI YAML, `docs/operation-inventory.json`, code-owned API JSON mappings, source/scripts/test/example inputs, tsconfigs, package/lock/shrinkwrap and inspected guide versions. It also binds both READMEs, original/approved local SVG source assets, Dockerfile and `.dockerignore`. Screenshot rasters are excluded from copying/hashing. Source-only Docker/SVG evidence does not imply these are included in the npm archive or that an image passed review.

npm automatically includes `README.es.md` despite an unchanged `package.files`. The coordinator approved that one additional tar entry: regular file, exact mode 0644 without special bits, at most 1 MiB, source-hash binding and installed-byte equality. The runtime archive allowlist remains fixed: package metadata/shrinkwrap, English/Spanish README, LICENSE, SECURITY and JS/JSON under `dist/src`; no source, tests, fixtures, environment files, dependency directories or Docker recipes. CLI bin mode is 0755. JS/JSON shipped bytes must equal the reviewed contract-generating build; declarations are generated build outputs but are not distributed.

The empty production install disables hooks and omits dev dependencies. Its exact three libraries are core/server **2.3.0**, Apache-2.0, and Zod **4.2.0**, MIT. Versions, URLs and SRI match shrinkwrap; separately retrieved dependency archives match SHA-512 SRI. CycloneDX runtime SBOM contains real archive hashes/licenses, and installed file hashes include license files. This is not a signature, attestation, OS-image scan or blanket vulnerability clearance. Help/version/doctor/check-config use synthetic protected files only; doctor reports no network probe.

`--check-evidence` verifies nine checksummed assets and all archive/source/build/receipt/MR-04/installer bindings without installation, network or rewriting evidence. Checksums provide integrity against a reviewed record, not origin authentication. The current verifier targets this candidate format; historical alpha reproduction requires its matching historical checkout/scripts.

## Executed local pipeline

Platform: macOS arm64, Node **v24.14.1**, npm **11.11.0**. Complete successful frozen-14 run:

```sh
npm_config_cache=/private/tmp/darktrace-npm-cache npm_config_offline=true node scripts/prepare-release.mjs /private/tmp/darktrace-mcp-candidate-docker-mr04-node24-frozen14
node scripts/verify-release.mjs /private/tmp/darktrace-mcp-candidate-docker-mr04-node24-frozen14/darktrace-mcp-0.1.0-alpha.0.tgz /private/tmp/darktrace-mcp-candidate-docker-mr04-node24-frozen14 --check-evidence
node /private/tmp/darktrace-release-mr04-tamper-check.mjs
node scripts/validate-examples.mjs
```

All exited 0. The pipeline ran these exact subprocesses, with status 0 for each: `node scripts/test-release-path.mjs`; `npm ci --ignore-scripts --no-audit --no-fund`; `npm run typecheck`; `npm test`; `npm run test:security`; two `npm pack --ignore-scripts --json --pack-destination <external-output>` calls around `npm run build`; `node scripts/verify-release.mjs <archive> <external-output>`; `node scripts/validate-examples.mjs`. Exact paths/arguments/statuses are retained in build-evidence; logs are beside the assets. Public dependencies were resolved from the existing npm cache with offline mode. Security TLS loopback tests required execution outside the filesystem/network sandbox; no appliance was contacted.

- Standard suite: **106 passed, zero failed/skipped**.
- Security: **324 subcases, 321 passed, three macOS permission-bit skips, zero failed**, complete receipt. Actual TLS, signing, parser, policy and MR-04 assertions ran; this is not a claim that every ST/deployment gate is approved.
- Two builds: identical full generated inventories and `.tgz` bytes. Archive contains 31 regular files. Installer, exact-three dependencies, tar allowlist, bin mode, SRI, installed bytes and CLI checks passed.
- Examples: **five JSON, one TOML, eight Markdown documents**, syntax/launch-policy passed; no documented commands were executed. Docker templates accept only a real immutable digest/ID or the exact non-executable marker `REPLACE_WITH_IMAGE_ID_FROM_DOCKER_INSPECT`, never a mutable tag/fictitious digest. Native/Docker hardening, explicit Claude user scope and repository-config trust warnings are checked. Negative warnings against unpublished bare npm/npx are not mistaken for executable advice.
- Synthetic scanner checks passed rejection of active bare registry project launchers, missing user scope/trust boundary and mutable/other image markers, while permitting explicit negative prose.
- Nine external tamper cases passed rejection: missing/altered complete contract; changed build/verification contract metadata; extra checksum entry; false reproducibility; omitted generator inventory even with refreshed source/checksum binding; incomplete receipt; changed Spanish README binding. Recomputing checksums does not override the pinned oracle or semantic bindings. Candidate assets were not mutated.

Production source inventory digest is `eadfe11732bd6c9bfa89cbfbbb2dc530d86e6984ad285576aab49b4dfc01d917`; it supersedes the earlier d72 snapshot for this run. Frozen-14 evidence binds **126 inputs**, source-tree digest `8abc6cdd60ed20431e040f5be9a8fea2637ef13b3e36076803ab999be0d675c6`. Snapshot: `/var/folders/tl/x0ps4dwd14x4qhyyh6x0lmgw0000gn/T/darktrace-release-source-uccybr`. Receipt source/built-source inventories match production; receipt runtime matches the reproducible generated build.

Frozen-14 candidate SHA-256 record:

```text
07042789d9a9f0749a2db906809d339cbf39569d5dc22826359d9091d8edf49a  darktrace-mcp-0.1.0-alpha.0.tgz
8536c4ec9eb77eb1960b9fbf23ed7e383cf14747153aec4b2026d0b2ed535b39  runtime-sbom.cdx.json
72e45e0f883ed757b61379be77e4c3e3282f8491ee248a4e9e7aa3e109c0cc89  runtime-files.sha256.json
4f216f91ad0f39a7b157548145954ac9452f17b8bd69bc256adbfe849d7dac39  source-files.sha256.json
41edfd8a3122817f6288d84ea1553ada93363b8ddff5d31a780737699a340c10  build-evidence.json
d16c37714860bb863c2bd30b5161cd390d6a1bf0a5faeb4fc8c0fc9439b95ea7  verification.json
30c8c75c4c62c79ee6e68537d05ca15d499f332156c1fa8c286b3575dc9de049  security-receipt.json
58c7def1dda20dea752545af7aa18d5c27382eb9a42bb3ca0e3fe996953b0b10  release-notes.md
37b5af95de1786ecce1b8762e12d2d63e577f171511a9db4964518b13a917f72  mcp-tool-contracts.json
```

**Freeze status:** a post-run comparison found only Dockerfile changed in the active checkout. Frozen-14 evidence remains truthful for its snapshot; final Docker/source evidence must be regenerated after that owner's freeze, not patched in place or called current. The release guide was subsequently clarified to distinguish the published offline alpha from the coordinator-reported limited final-source native reads; that documentation update also requires final source-evidence regeneration. The coordinator explicitly deferred further rebuilds until Docker, documentation/design and the eventual owner-selected version are all frozen. This successful snapshot is handed off for review now; regenerate the definitive candidate then, preserving this evidence.

## Retained failures and corrections

The first sandbox run `/private/tmp/darktrace-mcp-candidate-docker-mr04-node24-first` passed installation/typecheck/standard tests but security failed with loopback `listen EPERM`. The unrestricted second run passed security/reproducibility but tar verification correctly rejected npm's automatically included Spanish README; the coordinator approved its narrow explicit entry. The first final run exposed a newly added comparison erroneously including `.d.ts` outside the package allowlist; it was corrected to exact distributed JS/JSON equality, retaining complete build reproducibility/receipt checks. Subsequent `reviewed` and `frozen14` pipelines passed. Logs remain external; none of those failures is relabeled successful.

The scanner initially rejected the non-executable Docker marker and then an obsolete Spanish README recipe. Root approved only the exact marker; Luna corrected her recipe. Assertions/oracles/security tests were not weakened. A coordinator-authorized runner metadata fix safely records `commit:null` and factual `commitMetadata` when Git is absent/not in a checkout; receipt completeness and test gates are unchanged. Its frozen SHA-256 is `5ffb9af9ebaee5b638c64a38166369e2b48944f665f461a75a1e700f6f75212a`.

## Separately attributed evidence and remaining decisions

Root reports final-source Linux arm64 Node **22.23.3** standard **106/106 PASS** and security **324/324 PASS**, no skips/failures. Receipt: `test/security/evidence/linux-node22-2026-10-05T17-38-34-552Z.json`; standard log `/private/tmp/darktrace-mcp-linux-node22-standard-ir324-final.log`. These are root executions, not worker runs or final GitHub CI jobs. The worker's macOS skips remain explicit and cannot be silently waived by platform substitution.

The harness now binds the complete declared host SDK runtime dependency closure (14 fixed packages, 1,033 local regular files / 19,453,596 bytes) before SDK import, with strict budgets, no symlinks/specials and null-prototype path maps. Frozen script SHA-256: `c9d2dbb6ed623ff4e1a5673ffedd93c389c74a658b650db05adc23a46bf0bb4b`. Documentation/generator and external synthetic negative tests are in [lab-validation.md](lab-validation.md). This development-host closure is separate from the three-library production package. Earlier four/13-package freezes were withdrawn; root reports independent final-14 acceptance. The worker did not run a live harness.

Root's 11 distinct successful final-source native MCP selections are recorded as dated sanitized supplements in [stable-readiness.md](stable-readiness.md); they do not establish all 37 GET recipes/variants or Docker compatibility. Known safety refusals, missing IDs, semantic blockers and untested selections remain explicit. No full read-compatibility/stable approval is claimed.

Project gates still requiring final owner evidence/decision include advertised read-scope compatibility, final-source Docker image/dependency/OS review plus actual stdio/MCP/protected-mount/cleanup operation, final CI, independent source/artifact review and private immutable release visibility/digest verification. Each deployment separately needs approved host/provider processing, credentials and appliance ACLs; no universal provider approval is asserted or required to certify every future consumer before a private release. Runtime/package readiness cannot close those project gates or choose a version. Do not replace alpha assets, publish stable, or create a commit/tag/push from this preparation task.
