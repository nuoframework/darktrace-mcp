# Validated consultations — final candidate independent review

Task `task_e2bf25be2057`, dispatch `ctx_3573b223885d`, 2026-10-06 (Europe/Madrid). This is an independent reviewer's report on the final documentation, package and platform evidence gates for the accepted validated-only scope: 19 GET selectors in 15 MCP tools. It follows my accepted [source review](validated-consultations-independent-review.md) and [migration review](validated-consultations-migration-review.md).

The only file written in the repository is this document. I made no production, test, helper, fixture, package/version, main-documentation or Git change. I made no API call and read no credentials. All execution ran in private isolated copies of the shared tree (`…/scratchpad/fc`) and private copies of the evidence (`…/scratchpad/pk`, `…/scratchpad/npmcache`). No original artifact was modified.

**Bound identities**

| Item | Value |
|---|---|
| Source | `9e7c7070298ef592a1a10cdcb7ca481420a377e25e4a93c863ca33c31921d7f2` |
| Fixture | `6ddda2054c9c708d0516a90b7811eb0aba565016403953dace89d47bc89d213c` |
| Both profiles | `cd4ee42249a9110182046794c39fc00f5995700b7d751bccc6628e86afbddfe3` |
| Helpers (prepare / verify) | `ae93d8ff…` / `286d674f…` |
| Tests | `c6c422e9…`, `3a56b037…`, `f5f6068a…`, `13a7471c…` |

I re-checked each of these in the shared tree and in my isolated copy.

## 1. Documentation checkpoint: **ACCEPT**

Reviewed: [validated-consultations-documentation-checkpoint.md](validated-consultations-documentation-checkpoint.md), SHA-256 `30223749dc79f0e17294d628509cee449c55770cf02c8921ce714bf2fb6f6a17`. That hash equals the entry in its external manifest `/private/tmp/darktrace-docs-final-ctx_d0357e00d67b/final-hashes-and-evidence.json`.

- **Exact bytes.** All 14 changed documents in the shared tree match the checkpoint's SHA-256 table exactly. That covers `README.md`, `README.es.md`, the architecture, clients, configuration and Docker guides, both EN and ES getting-started guides, lab-validation, both release-preparation documents, releases, stable-readiness and troubleshooting.
- **Offline example validation.** I re-ran `node scripts/validate-examples.mjs` in my isolated copy. It exits 0: `{"jsonExamples":5,"tomlExamples":1,"documents":8,"syntax":true,"launchPolicy":true,"commandsExecuted":false,"networkProbe":false}`.
- **Scope accuracy, EN and ES.**
  - `docs/architecture.md` names all 15 tools and all 19 selector IDs.
  - Every user-facing guide, including both READMEs and both getting-started guides, states the 15/19 scope and refers to the architecture mapping.
  - None of these active guides contains an excluded operation ID or excluded tool name inside a code block.
- **Notices.** Both READMEs keep the unofficial/unaffiliated notice, the `contacto@pabloarrabal.com` contact, the historical `v0.1.0-alpha.0` distinction and the CVE-2026-35189 hold.
- **History boundary.** In `docs/lab-validation.md`, excluded IDs (`get_cves`, `get_devicesummary`, `get_metricdata`, `get_metrics`) appear only below the explicit heading "Historical broader campaign procedures — superseded, not active instructions". The current procedure at the top uses only `get_status,get_devicesearch,get_endpointdetails`.
- **28-day claim.** The current procedure's "existing default 28-day window" matches the OpenAPI `/devicesearch` text: "The default time frame is four weeks (28 days). This can be altered with the seensince parameter."
- **Limits and blockers.** The checkpoint correctly distinguishes bounded recipe passes from full parameter/resource coverage, and records that native first-batch evidence is transcript-only. It keeps the OpenSSL blocker and the dated Trivy/Grype counts without any waiver or zero-CVE claim.

**DOC-1 (informational, non-blocking).** The trailing section "Validated19 bounded endpoint-IP discovery checkpoint" in `docs/lab-validation.md` still says the recipe is "readiness … not a new endpoint PASS". It was written before the run. The top of the same document and the lab checkpoint correctly record that the endpoint passed afterwards, so this is stale wording, not a wrong current instruction. A later docs pass may annotate it.

## 2. Package checkpoint: **ACCEPT** (local Darwin arm64 candidate)

Reviewed: [validated-consultations-package-checkpoint.md](validated-consultations-package-checkpoint.md), SHA-256 `44fddd4947116104e2a5f0be2328bd0962ba1bea84a0efa292366811904f5e4a`. External artifacts are in `/private/tmp/darktrace-package-final-ctx_916b34c1fee0`; `final-evidence-summary.json` is `cc601954…`. The package owner's dispatch `ctx_916b34c1fee0` has settled.

### Freeze integrity

- Frozen manifest `cc48578f…` (214 files) and frozen archive `b1aa0aaf…` both match the report.
- All 214 frozen copies match the manifest.
- Against the **current shared tree**, 213 of 214 are byte-identical. The only difference is my own `validated-consultations-migration-review.md`: the frozen copy is the intermediate `d145b58f…`, while shared holds the final `dacf3558…`, which only relabels one diagnostic heading and adds Part B.
- That file is not in `prepared/source-files.sha256.json` (0 references) and is not shipped, so the package bindings are unaffected. The package report discloses this drift.

### Evidence integrity

- `SHA256SUMS` validates all 9 prepared assets.
- All 10 evidence hashes in the report's table equal the original files.
- The tarball is `774b1614cedc3a6ec0e0812ac39ba3502bf746a33a2f22d35d420aa551a11a34`, with 32 allowlisted files.
- Build evidence (schema 3) binds:
  - production tree `9e7c7070…` and source aggregate `b338b2d9…`
  - `reproducibleTwoBuilds:true`
  - predecessor archives contract `7390a234…` and scope `35d826f3…`, plus alpha `2d9bffe6…`
  - every gate command at exit 0 (path guard, `npm ci --ignore-scripts`, typecheck, test, test:security, two packs plus a build, verify, examples)
- The security receipt has `receiptComplete:true` and source `9e7c7070…`.
- The logs show **functional 130/130 PASS** and **security 325 cases: 322 PASS, 0 FAIL, 3 SKIP**. The skips are the macOS mode-2600 fixtures, which are platform-blocked, not passes.

### Reviewer-executed verification (own run, copied artifacts)

**Full verifier.** I ran `scripts/verify-release.mjs <copied tgz> <my empty out>` from my isolated, freshly built checkout of the current shared bytes. It ran offline (`npm_config_offline=true`, private copy of the npm cache) with a minimal `env -i` and returned **exit 0**. This was a fresh installation that independently exercised:
- tar allowlist and regular-file checks
- bin mode 0755 and the README.es source binding
- `private:true` and no lifecycle hooks
- installed-byte equality
- exactly three dependencies, with shrinkwrap and downloaded-tarball SRI checks
- `--help`, `--version`, `doctor`, `--check-config`
- all write-profile startup refusals
- full contract recapture: both profiles `cd4ee422…`, 15 tools each

My `runtime-files.sha256.json` and `runtime-sbom.cdx.json` are **identical** to the prepared ones. My `verification.json` differs from the prepared one only in its temporary `work` path; this was run under Node v24.14.1 / npm 11.11.0.

**Evidence cross-check.** I ran `verify-release.mjs <copied tgz> <copied prepared> --check-evidence` with **my checkout as base** and got **exit 0**. This confirms the prepared source, runtime and receipt bindings, checksums and history integrity against the current shared bytes.

**Installed full contract.** My own SDK client (`installed-list.mjs`) launched the **installed tarball's** `dist/src/index.js` over stdio with synthetic token files. For read and read+sensitive, the 15 ordered names, descriptions, input schemas and annotations are canonically equal to the pinned fixture (`cd4ee422…`). I made no tool call and no network request.

**Runtime cross-binding.** The installed tarball's 26 JS/JSON runtime files are byte-identical to all three of:
- my clean isolated build (same aggregate)
- the accepted Docker image `eb3a7681…` runtime
- the reviewed lab endpoint manifest `e0875c41…` `runtimeFiles`

**Not independently redone:** the dependency byte-inventory hashes in the report table (beyond equality of my recomputed `runtime-files.sha256.json`) and the frozen-copy runner's internal logs. I relied on the matching hashes and my own verifier run.

## 2b. Supplemental native lab receipt (msg_59b2d009a5c1): **verified**

- `lab-native-receipt-completion.jsonl` has SHA-256 `850b680ed68a33cf1afdbb4f77cb98d2519cd29e15c46d3329eca78949e4fbbd`, equal to the lab checkpoint's appended section. The current checkpoint bytes are `adee1b85…`.
- Its seven rows (status, device search, subnets, AI stats, intel feed, model breaches, similar devices) are all `success:true`. Each binds the minimal profile, the reviewed final policy `3060d0a2…` and manifest `e0875c41…`.
- The records are envelope-only: no IPv4/MAC values and no credential strings.
- The union of all native JSONL receipts now covers exactly the 19 oracle selectors, with no extras. The original transcript-only first batch stays disclosed as history.
- I made no API call. This is receipt-consistency review, not lab execution.

## 3. Linux Node 22/24 platform gates

### 3a. Reviewer's own independent Linux execution (msg_1adbb8e72643): **PASS, zero skips**

**Inputs**
- **Source copy.** A private copy of the package freeze `frozen-inputs/` (manifest `cc48578f…`). In that copy, `src/` is `9e7c7070…`, the four migrated tests are `c6c422e9…`/`3a56b037…`/`f5f6068a…`/`13a7471c…`, and the fixture is `6ddda205…`.
- **npm cache.** A private copy of the offline SRI npm cache.
- **Images.** Pinned and local: `node:22-bookworm-slim@sha256:43ac6c60b8f89723f746e8a92ce91abd5017e627ce1ddfe4238355d3a30b772c` and `node:24-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6`, both linux/arm64 (Docker Desktop linuxkit 7.0.14).

**Command (per version)**

```sh
docker run --rm --pull=never --network=none --user node --memory=4g --pids-limit=512 -e HOME=/home/node -e CI=true \
  --mount type=bind,src=<copy>/src,dst=/src,readonly --mount type=bind,src=<copy>/cache,dst=/cache,readonly \
  --mount type=bind,src=<copy>/run.sh,dst=/run.sh,readonly --mount type=bind,src=<copy>/outNN,dst=/out <pinned image> /bin/sh /run.sh
```

`run.sh` (SHA-256 `babebfda…`) works as follows:
- It copies the read-only inputs into a container-local `/home/node/work` as UID/GID 1000.
- It runs, in order: `npm ci --offline --ignore-scripts --no-audit --no-fund`, `npm run typecheck`, `npm test`, `npm run test:security`.
- It saves the security receipt and re-hashes `src/` afterwards.

No credentials or appliance were involved; only the suites' synthetic fixtures were used.

**Results**

| Platform | `npm ci` / typecheck | Functional | Security | `src/` after | Security receipt |
|---|---|---|---|---|---|
| Linux arm64, Node **v22.23.3**, npm 10.9.9 | 0 / 0 | exit 0: **130 tests, 130 pass, 0 fail, 0 skip** (TAP) | exit 0: **325 tests, 325 pass, 0 fail, 0 skip, 0 cancelled, 0 todo** | `9e7c7070…` | `6329efdcbd70250146886ababfcc573f580bcda54aadcc5309e2ef16a7a42c5b` |
| Linux arm64, Node **v24.21.0**, npm 11.19.0 | 0 / 0 | exit 0: **130 tests, 130 pass, 0 fail, 0 skip** | exit 0: **325 tests, 325 pass, 0 fail, 0 skip, 0 cancelled, 0 todo** | `9e7c7070…` | `1a19ecb5a8c0c4a84a019529b2e1710b9f05e05f6b7eb88175d7e1486f0676aa` |

Both receipts report:
- `receiptComplete:true` and `sourceTreeSha256` `9e7c7070…`
- platform `linux`/`arm64`
- active fixture `6ddda205…`
- build status 0 and test status 0
- 22,132 assertion invocations

The three Darwin mode-2600 skips do **not** occur on Linux: all 325 security cases execute and pass there.

The logs, `env.txt`, `status.txt`, receipts and `run.sh` are preserved read-only in `/private/tmp/darktrace-final-candidate-review-ctx_3573b223885d/`. Their `SHA256SUMS` is `5fffecfead9544f6744d58b716ddb8f84ee76593c18bb285e50884e46e672f4d`.

**Input purity.** The bound input copy contained exactly the 214 frozen-manifest files: 0 extra, 0 missing, 0 byte mismatches and **0 AppleDouble `._*` files**. It was created with `cp -R`, not BSD tar. This rules out the contamination cause root diagnosed in Luna's first Node 22 attempt.

**Limits.** The runs are linux/arm64 only; I did not run linux/amd64. They use the slim images' bundled Node and OpenSSL 3.5.x and exercise no TLS against a real appliance. They are independent execution and do not replace Luna's report or remote CI.

### 3b. Luna platform evidence (`ctx_4391c2c0d51b`): **settled, consistent**

External root: `/private/tmp/darktrace-validated19-platform-gates.UC5K3S`.

- **Input binding.** `input-binding.json` records `immutableInput:true`, source `9e7c7070…` (28 files), 4 test hashes, test tree `59fe734b…` (69 files), fixture `6ddda205…`, alpha `37b5af95…` and snapshot tar `bd01fe7d…`. The extracted `source/` contains 0 `._*` files.
- **Clean Node 22 run** (`results/node22`).
  - Runtime: v22.23.3, npm 10.9.9, OpenSSL 3.5.8.
  - Gate exits: `npm_ci=0 typecheck=0 functional=0 security=0`.
  - Functional 130/130 with 0 skip; security 325/325 with 0 fail and 0 skip.
  - Receipt `48e0345f…` has `receiptComplete:true`, source `9e7c7070…`, linux/arm64, fixture `6ddda205…` and 22,132 assertions.
- **Clean Node 24 run** (`results/node24`).
  - Runtime: v24.21.0, npm 11.19.0, OpenSSL 3.5.8.
  - All four gate exits are 0.
  - Functional 130/130 and security 325/325, both with 0 skip.
  - Receipt `2d36dea4…` has `receiptComplete:true`, source `9e7c7070…`, linux/arm64 and 22,132 assertions.
- These results agree exactly with my independent runs in 3a: same counts and same assertion totals.
- **Preserved failure.** `results/diagnostic/node22-appledouble-attempt` keeps the first Node 22 attempt at its true outcome: `security=1`, with a receipt bound to contaminated source `80c4fef6…`. That source came from BSD tar AppleDouble `._*` entries, per root's diagnosis. It is a failed attempt, not a pass, and it does not apply to the clean `9e7c7070…` input. - **Final report.** [validated-consultations-platform-gates.md](validated-consultations-platform-gates.md), SHA-256 `bdafaafce8494299f76900871a5ae8a81e8a15cf0f4945a68b4bb10a9a669c1f`. Settled succeeded (`msg_8da7e9f6ed81`) and accepted by root.
- **Non-final attempts, recorded separately and not relabelled as passes.**
  1. The first Node 22 extraction exited `97` before any gate ran (non-root read-only extraction). No gate logs exist for it, which is the lost-log limitation root noted.
  2. The AppleDouble-contaminated Node 22 run produced security 332 tests, 324 pass, 8 fail, 0 skip. Its receipt `3fdd59c6…` is bound to contaminated source `80c4fef6…`.
- **Final-run filtering.** Luna's final runs dropped only the generated `._*` entries at unpack. The resulting receipts bind the clean `9e7c7070…`, so that filtering did not alter source bytes.

## Findings

- **No blocking defect** in the documentation, package or platform evidence for the accepted 19-GET/15-tool scope.
- **DOC-1 (informational).** There is stale "not a new endpoint PASS" wording in the trailing historical endpoint-readiness section of `docs/lab-validation.md`. The current sections are correct.
- **PKG-1 (informational).** The package freeze contains an intermediate copy (`d145b58f…`) of the migration review document. It is not shipped and not source-bound; it is disclosed and has no effect on the package bytes.
- **PLAT-1 (process).** Luna's two non-final Node 22 attempts (exit 97 with no logs; AppleDouble-contaminated `80c4fef6…` with 8 failures) remain failures. Platform acceptance rests on the clean `9e7c7070…` runs: mine (3a) and Luna's final runs (3b), which agree exactly.
- **Scope limits.** Linux evidence is arm64 only, with no amd64 run. Remote CI and branch protections were not reviewed here. Lab evidence is bounded recipe and shape coverage only.

## Decision

### Local candidate: **ACCEPT**

The private local candidate below is accepted, for documentation, package and platform gates only:

| Item | Value |
|---|---|
| Source | `9e7c7070298ef592a1a10cdcb7ca481420a377e25e4a93c863ca33c31921d7f2` |
| Fixture | `6ddda2054c9c708d0516a90b7811eb0aba565016403953dace89d47bc89d213c` (both profiles `cd4ee42249a9110182046794c39fc00f5995700b7d751bccc6628e86afbddfe3`) |
| Helpers (prepare / verify) | `ae93d8ff…` / `286d674f…` |
| Tests | `c6c422e9…` / `3a56b037…` / `f5f6068a…` / `13a7471c…` |
| Package | `darktrace-mcp-0.1.0-alpha.0.tgz` `774b1614cedc3a6ec0e0812ac39ba3502bf746a33a2f22d35d420aa551a11a34` (private) |
| Docker image | `sha256:eb3a7681…` (runtime aggregate `e7cbb509…`) |

Supporting evidence:
- The documentation checkpoint (`30223749…`).
- The package checkpoint (`44fddd49…`), which I verified independently.
- The macOS suites: 130/130 functional and 322/0/3 security, the 3 skips being platform-blocked mode-2600 fixtures.
- **Linux arm64 Node 22.23.3 and 24.21.0: 130/130 and 325/325 with zero skips**, in my own runs and in Luna's.

### Stable publication: **NOT approved**

- **OpenSSL 3.5.8 / CVE-2026-35189.** The CVE remains an **open stable-publication blocker**. It applies to the TLS certificate/CRLDP path and is fixed in OpenSSL 3.5.9. Every examined runtime still bundles 3.5.8: the Docker image, and both Linux test images per Luna's `runtime.txt`. No waiver is granted or implied.
- **Residual scanner findings.** The dated findings remain as recorded and are not re-scanned here. On the unchanged OS component closure:
  - Trivy 0.74.0 (DB 2026-10-05): 23 MEDIUM, 8 LOW
  - Grype 0.118.0 (DB 2026-10-05): **11 High**, 10 Medium, 3 Low, 7 Negligible

  No zero-CVE or zero-High claim is made.
- **Still required before any stable tag or release:**
  - remote CI and protections
  - a dated residual-risk decision
  - a patched OpenSSL/Node runtime, followed by a fresh freeze and the affected gates
  - explicit root GO for any Git, tag, release or registry action
