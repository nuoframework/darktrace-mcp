# Validated-only private candidate package checkpoint

Task `task_c3c749fc82ac`, dispatch `ctx_916b34c1fee0`, 2026-10-06 Europe/Madrid. **Private package preparation and verification PASS on the frozen Darwin arm64 / Node v24.14.1 inputs; not stable-publication approval.** npm 11.11.0. This worker wrote only this repository report and external artifacts; no helpers, source, tests, fixture, README, package/version or Git changes, real credential reads, lab calls, tag, release or registry publication.

## Immutable input freeze

External root: `/private/tmp/darktrace-package-final-ctx_916b34c1fee0`. All **214 regular candidate input files** were copied to `frozen-inputs/`, excluding shared dist/node_modules/Git, existing security evidence and bitmap documentation assets using the preparation helper's input boundary. No symlinks or special files were admitted. All input bytes and the four final test hashes were verified before running. An immutable receipt archive `frozen-inputs.tar` was created **before execution**, mode 0444, SHA-256 `b1aa0aafafcbd3b8eb095e0487577f657d8a7cb3f84974cecad46096cdbc682f`. The extracted runner copy retained original packaging modes; the full byte manifest, SHA-256 `cc48578f50ede65b7b25279ff2e844fdbe2e3f67b2842a98bba95155fba2f398`, was checked unchanged after execution, as were all copied builder inputs. No shared build was used.

Production source tree: `9e7c7070298ef592a1a10cdcb7ca481420a377e25e4a93c863ca33c31921d7f2`. Release helper's complete bound input aggregate: `b338b2d965830619762ed48e520ff47fd5cc64d8eb9ca9d52da352fa392d9a16`. Frozen helper hashes: prepare `ae93d8fff6fddc04537616cf75eef07dbcb167278e72dca5f58eb51e2a4ce22a`; verify `286d674f6efc18c5db8ca68cf25db5bb2e1fb493299b2b60bc53cf0ff3e5861f`. Complete source-file evidence remains in `prepared/source-files.sha256.json`; the broader all-input freeze is separately recorded, including review documents that are not shipped or package-build inputs.

| Final migrated test | Frozen SHA-256 |
|---|---|
| `test/contract/read-summary-compatibility.test.ts` | `c6c422e97b835961841e56d2797ea09c586b86dfdec212cecd9305bf403b86af` |
| `test/contract/response-view.test.ts` | `3a56b037180c44edab7291463569afdcfd00494f7f155723131e464872cf348a` |
| `test/security/mcp-defense.test.mjs` | `f5f6068ae7195f0e97343ce0949a46fc0fa386be3741cb713661a89d8d1e1513` |
| `test/security/policy-sinks.test.mjs` | `13a7471cd58fa5fbbe10711db74f0710ba6ab333518ea0f49a61c914b8238f55` |

Root-approved active fixture: `6ddda2054c9c708d0516a90b7811eb0aba565016403953dace89d47bc89d213c`; both full profile hashes: `cd4ee42249a9110182046794c39fc00f5995700b7d751bccc6628e86afbddfe3`. The helper compares the full contract; no oracle regeneration, alternate pin or dual fallback was used. Both profiles expose exactly 15 tools and 19 GET selectors. Write and critical capability remain immutable false.

## Commands and observable results

From `frozen-inputs/`:

```sh
npm_config_cache=/private/tmp/darktrace-npm-cache npm_config_offline=true node scripts/prepare-release.mjs /private/tmp/darktrace-package-final-ctx_916b34c1fee0/prepared
```

The runner created its own isolated build copy and sanitized operator-free home. All dependency work used the offline cache with lifecycle scripts disabled and committed shrinkwrap/registry/SRI constraints. Logs for every gate are retained externally.

| Gate | Exit / result |
|---|---|
| Output-path guard; npm ci; typecheck | All 0 |
| Complete functional suite | 0; 130 PASS, 0 FAIL, 0 SKIP |
| Complete isolated security runner | 0; 325 cases, 322 PASS, 0 FAIL, 3 platform SKIP; receiptComplete=true; 22,003 assertion invocations |
| First archive; second clean runtime build and archive | Both 0; runtime and archive bytes identical |
| Built-in release verifier and evidence validation | 0; tar regular-file allowlist/modes, exact dependencies, offline downloaded SRI, source/installed bytes, README.es, CLI checks and all write-startup refusals |
| Documentation examples | 0; five JSON, one TOML, eight documents; syntax/launchPolicy true; no launcher/network probe |
| Separate release verifier invocation | 0; fresh empty installation, same archive and frozen built checkout |
| Separate `--check-evidence` invocation | 0; full passing source/runtime-bound security receipt, source bindings, checksums and historical integrity |
| Actual installed archive SDK stdio | Both profiles initialize/listTools and match the complete pinned ordered contract, 15 tools each; no tool calls or API calls |

The three security skips are the public token, private token and nonsecret JSON mode-2600 fixture cases: macOS discarded the special bit before the invalid fixture could exist. They are **not passes**. Separate open-handle special-bit checks passed. Local synthetic TLS/security fixtures are offline evidence, not appliance compatibility. No failed package gate occurred in this dispatch; all outputs, platform refusals and earlier repository failed/historical receipts remain preserved.

The separate verifier ran the unchanged `scripts/verify-release.mjs` from the preparation-created build checkout, with the prepared archive and a new `independent/` output; its exact command/cwd/offline environment is in `independent-verify-command.json`. A second invocation used `prepared/ --check-evidence`. These executions independently rerun the existing verifier and installation, but do not substitute for independent code/artifact review by another owner.

Actual SDK 2.3.0 comes from the SRI-installed build copy, and the production entrypoint comes from the **separate verifier's installed archive**, not the source dist. `installed-sdk.mjs` uses synthetic owner-only token files and only SDK initialize/listTools. It compares names, descriptions, complete schemas, annotations, array order and canonical profile hashes to the pinned fixture. Both synthetic files were removed in a finally block. No model/provider or lab connection was made.

## Artifact, runtime and dependency binding

Both archive builds: `darktrace-mcp-0.1.0-alpha.0.tgz`, **SHA-256 `774b1614cedc3a6ec0e0812ac39ba3502bf746a33a2f22d35d420aa551a11a34`**. Package remains version `0.1.0-alpha.0`, `private:true`, 32 regular allowlisted files, no lifecycle hooks; bin mode 0755, README.es regular mode 0644. Spanish README source, tar and installed bytes match `21602cf99c4460a82eb728c92b02823174e1dea622636c6a180bf52a21bb6716`; English README source/tar/installed bytes likewise match the frozen source manifest. No source TypeScript, tests, fixtures, documentation sources, development scripts or secrets are packed.

The security receipt binds all **49 complete runtime files**, full aggregate `e7cbb509d54909fa10276ffeaec11cab22bb201f1f81635fa8c988abcb3653fb`, to the exact 28-file production source before and after the build; receipt build/test status 0 and receiptComplete=true. The shipped 26 JS/JSON runtime files are verified against this contract-generating build and installed bytes. The runtime aggregate equals the accepted Docker checkpoint, but this task neither rebuilds nor rescans Docker.

| Component byte inventory | Files | SHA-256 of recursively sorted-key, compact UTF-8 JSON byte map |
|---|---:|---|
| `darktrace-mcp` | 32 | `4d6301dd9342cc1eca0e4a7b8afea460d1757f8b22136da82871a94a88c56c3a` |
| `@modelcontextprotocol/core` | 21 | `174b5387fb2ed22af55d657d1df27e1204a626e852835ff6d8c0393ca298c1c2` |
| `@modelcontextprotocol/server` | 85 | `7f2bdb59e5e0df2bd8da175f27b143b02fc3450227857996b513940786486ea0` |
| `zod` | 681 | `ea6dbf716fd3b87a3e3b5e71f5fe248dbc20c52d105da85ce094fe8555884606` |

Runtime dependency closure is exactly `@modelcontextprotocol/core@2.3.0`, `@modelcontextprotocol/server@2.3.0` and `zod@4.2.0`; no other runtime dependency. Both verifications require committed registry URLs, shrinkwrap versions and SHA-512 SRI, compare installed bytes and verify offline npm-packed dependency tarballs against that SRI. `runtime-sbom.cdx.json` carries each downloaded dependency's SHA-256/SHA-512, registry reference and license, and `runtime-files.sha256.json` carries every installed file digest. These attest byte binding and integrity, not benign dependency code.

Historical alpha fixture `37b5af95…`, both alpha archives and manifests remain verified byte immutable. Contract predecessor `ea31d70a…` and separately pinned provenance `7390a234…` are verified nonexecuting history. Scope predecessor's four archived tests and provenance `35d826f3…` are independently recomputed and bound into full source evidence. No history is used as the active oracle.

## Evidence hashes

All paths below are relative to the external root. `SHA256SUMS` binds the nine prepared assets; the complete supplemental JSON summary carries hashes for both verifier runs, logs, frozen inputs and installed SDK evidence.

| Evidence | SHA-256 |
|---|---|
| `prepared/darktrace-mcp-0.1.0-alpha.0.tgz` | `774b1614cedc3a6ec0e0812ac39ba3502bf746a33a2f22d35d420aa551a11a34` |
| `prepared/security-receipt.json` | `1fdff5b0411c54904ffd0808b39d70b5d400689d7d1a309db3f7e7f026c09edc` |
| `prepared/build-evidence.json` | `3a6ddf6080b55e7d6885b9aa55f766377ad2f36f08a7adfdfd4dfb902c4b5b9c` |
| `prepared/source-files.sha256.json` | `bfc7dbd446f1502faa9b010619731a6ba7911c47e336bbc9b96ce5ef24a20635` |
| `prepared/runtime-files.sha256.json` | `0c5455b1e0e35bc0c48c261726ca79e6b0170b1ed21907934073c7d0070dea68` |
| `prepared/runtime-sbom.cdx.json` | `e43a3f92f120e948a5ab9f4c9b37f2f86af76a5935d2b3a8b901072e3f260570` |
| `prepared/verification.json` | `e47d389f3b688234c961d3e317f148c6d18623dbf9f83f1ed3f7f31d3d5ab9cf` |
| `prepared/mcp-tool-contracts.json` | `6ddda2054c9c708d0516a90b7811eb0aba565016403953dace89d47bc89d213c` |
| `prepared/SHA256SUMS` | `73af33a92726f2c9f7bc116a1291391a1cfb9b83104ecdb65da29b40a37b5633` |
| `independent/verification.json` | `5cc24e2467a9d3cd649efce13207372f6817a59aa1a174b938cf96377621b00d` |
| `installed-sdk-receipt.json` | `268ed3f2eeab62f1a0c2e097cc6169762739c9707b59c841aaccaef09aaffa21` |
| `independent-evidence-run.log` | `f1f187f864763604707a898f0eda1e49425edb13cb483eafb6e3b3490438ffda` |

## Independent acceptance, drift and remaining gates

The independent [migration review](validated-consultations-migration-review.md), SHA-256 `dacf35581591895ac0969087434d3cb9fa01902ed47ece47e83d7b2a60ed8529` captured externally, now explicitly **ACCEPTS** final helpers `ae93d8ff…` / `286d674f…`, active fixture/profile pins and all four final test bytes listed above; it resolves archive integration M-2. This report update arrived after the input freeze. A shared/frozen comparison found only that review document changed; all package-bound source/helper/test/README/configuration/lock inputs remained byte-identical. The frozen older review copy is retained, never silently replaced. Review-document updates do not change the package bytes or clear publication gates.

Package evidence is **provisional pending coordinator reconciliation of separate Linux Node 22/24 results and final independent artifact acceptance against these same bytes**. This worker has not received or claimed Linux results or remote CI/protection acceptance. A change to any package-bound input requires a new freeze and affected gates, not reuse of this receipt. Provider processing, residency, retention, appliance ACLs and production deployment authorization remain separate.

**Stable remains held by OpenSSL 3.5.8 / CVE-2026-35189**, applicable to TLS certificate/CRLDP processing, official Low severity, fixed in 3.5.9. Successful packaging and bounded native/Docker lab results do not patch it or waive the blocker. Historical scanner severities remain qualified: Trivy 23 MEDIUM / 8 LOW and Grype **11 High**, 10 Medium, 3 Low, 7 Negligible in the unchanged scanned OS component closure. No zero-CVE/zero-High, stable tag, Git mutation, release or registry publication is claimed or authorized.

Supplemental final evidence: `/private/tmp/darktrace-package-final-ctx_916b34c1fee0/final-evidence-summary.json`, SHA-256 `cc601954d9575d26fe88b463451d80515f30b8c8c63f6f4390244a98a8660c91`. This report's own final hash is provided separately to the coordinator to avoid self-reference.
