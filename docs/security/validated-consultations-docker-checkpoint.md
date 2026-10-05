# Validated19 Docker offline checkpoint

**PASS for the accepted frozen source, exact full 15/15 tools/list contract and clean root runtime byte binding. Stable publication remains blocked.** Worker `task_0e132c54f768`, dispatch `ctx_3ca977fbff79`; added ownership explicitly authorized by root message `msg_a13d2a21df0a`. Date 2026-10-05 UTC / 2026-10-06 Europe/Madrid. No production source, Dockerfile, package/version, Git, real credential, appliance API or publication action occurred. Builds use public pinned bases/npm; all runtime execution is `--network=none` with synthetic data. Root owns any secret-volume provision and subsequent initialized-MCP live campaign after independent binding acceptance.

## Immutable build and source/runtime binding

| Identity | Value |
|---|---|
| Local linux/arm64 image ID | `sha256:eb3a7681da69f6468df0a7600af9d72560cfd8d5c4747dfa8ee57e45f09abeaf` |
| OCI platform manifest | `sha256:2045e25bebb586e6bc4676b6c025178d55f3ad7f3b7f1434b9e867af16598f9b` |
| OCI config | `sha256:7c484bfaa8172bff5771a4021fcd49ab2d4b6c70ea01cf43c3f8a9511ca981c1` |
| Production src tree SHA-256 | `9e7c7070298ef592a1a10cdcb7ca481420a377e25e4a93c863ca33c31921d7f2` |
| Complete shipped dist/src tree SHA-256 | `e7cbb509d54909fa10276ffeaec11cab22bb201f1f81635fa8c988abcb3653fb` |
| Accepted full fixture bytes | `6ddda2054c9c708d0516a90b7811eb0aba565016403953dace89d47bc89d213c` |
| Both ordered 15-tool profile hashes | `cd4ee42249a9110182046794c39fc00f5995700b7d751bccc6628e86afbddfe3` |

External receipts: `/private/tmp/darktrace-validated19-docker-ctx_3ca977fbff79/`. The convenience tag `darktrace-mcp:validated19-9e7c7070` is for inspection only; use the immutable ID. The image ID is a local BuildKit index including attestation, not a published registry digest.

The frozen external `source/` context contains only the curated 40 Docker build inputs: source, two build/generator scripts, exact OpenAPI/inventory, package/locks, TypeScript configs, Dockerfile/.dockerignore and project license. Files/directories were protected 0444/0555 before building. No host configuration, credentials, Git, shared node_modules or shared dist enters the context. The Dockerfile remains pinned to official Node `22-bookworm-slim@sha256:43ac6c60b8f89723f746e8a92ce91abd5017e627ce1ddfe4238355d3a30b772c` and distroless `cc-debian13:nonroot@sha256:e792ab3d241a468a4fd7519ddbbebe66b49b5f365771716ea688ad40b6c6f1c2`; package stays private `0.1.0-alpha.0`.

Commands executed on that clean context:

```sh
docker build --progress=plain --iidfile /private/tmp/darktrace-validated19-docker-ctx_3ca977fbff79/image-id.txt -t darktrace-mcp:validated19-9e7c7070 /private/tmp/darktrace-validated19-docker-ctx_3ca977fbff79/source
docker build --progress=plain --target build --iidfile /private/tmp/darktrace-validated19-docker-ctx_3ca977fbff79/build-image-id.txt -t darktrace-mcp:validated19-build /private/tmp/darktrace-validated19-docker-ctx_3ca977fbff79/source
node /private/tmp/darktrace-validated19-docker-ctx_3ca977fbff79/verify-binding.mjs
node /private/tmp/darktrace-validated19-docker-ctx_3ca977fbff79/sdk-smoke.mjs
node /private/tmp/darktrace-validated19-docker-ctx_3ca977fbff79/sdk-smoke.mjs sensitive
python3 /private/tmp/darktrace-validated19-docker-ctx_3ca977fbff79/component-check.py
```

Builds and final verification exit 0. Export/copy inspection containers never start the server and are removed explicitly. The full 28-file source map equals generated `/build/src` after the build. **Every shipped runtime file is byte-identical to the same build target:** 49 files, comprising 23 JS, three JSON and 23 declarations. Tree aggregates use the release helper's recursive locale-sorted path→byte-SHA-256 map, compact JSON and SHA-256. Individual hashes, build inputs and image configuration are in `binding.json`, `source-files.json`, `runtime-files.json` and `src-relative-hashes.json`.

## Clean root lab runtime comparison

Root supplied `/private/tmp/darktrace-validated19-lab-584px9mb` and protected schema-2 manifest `/private/tmp/darktrace-validated19-lab-runtime.json`, byte SHA-256 `00adff89c7f0eedaa1022f480751ae3f1243e12600a5182cbc95fa2c1fbf1307`. I independently compared its entire `runtimeFiles` object to Docker's 26 JS/JSON `dist/src/...` hashes and checked every corresponding native clean-dist byte. **Exact map and all 26 files match.** `schema2-runtime-files.json` supplies those hashes without declarations; `lab-runtime-comparison.json` records the comparison. This is runtime byte evidence, not a replacement protected manifest or live compatibility receipt. Root must rebuild source/helper bindings after the separately authorized release-helper/harness changes.

An earlier copied owner runtime differed only in coverage-report JSON whitespace (semantically identical JSON); the clean npm run build/root lab output exactly matches this Docker build's two-space JSON. That earlier aggregate is not substituted for the current byte identity.

## Production dependency and license closure

Exactly three non-dev shrinkwrap packages are installed, with their exact locked registry URL and sha512 integrity; npm ci uses `--ignore-scripts`. Their complete file maps match the build target's installation and the previously reviewed baseline tree/SRI closure. There is no fourth production package, npm or Corepack in the final rootfs.

| Package | Version / files | Package tree SHA-256 |
|---|---|---|
| `@modelcontextprotocol/core` | 2.3.0 / 21 | `174b5387fb2ed22af55d657d1df27e1204a626e852835ff6d8c0393ca298c1c2` |
| `@modelcontextprotocol/server` | 2.3.0 / 85 | `7f2bdb59e5e0df2bd8da175f27b143b02fc3450227857996b513940786486ea0` |
| `zod` | 4.2.0 / 681 | `ea6dbf716fd3b87a3e3b5e71f5fe248dbc20c52d105da85ce094fe8555884606` |

Dependency tree maps sort path keys in JavaScript ordinal order, matching the lab dependency binding convention. SDK Client/stdio 2.3.0 used for the smoke is exported from this exact build target, not a registry launcher or arbitrary host client. `license-closure.json` records all three dependency license files/SPDX metadata, project Apache-2.0 bytes, Node license bytes and metadata closure. Node/system/dependency license/copyright bytes are unchanged from the reviewed baseline. Project LICENSE bytes are identical; its mode is now 0444 instead of baseline 0644 because the curated context was frozen read-only. All other non-runtime metadata (owners/modes/types/links) matches the baseline; no executable/setid privilege is introduced.

## Hardened actual execution and complete SDK contract

Inspection verifies image default user `1000:1000`, exact production Node entrypoint, no Cmd/listener/ports/volumes and no baked token, proxy, TLS bypass or operator environment. A separate actual hardened default-user Node process confirms UID/GID 1000, every capability set zero, NoNewPrivs=1, seccomp mode 2, readonly root (`EROFS`), root-owned app files and absence of source/tests/scripts/docs/OpenAPI/.env/shell/npm/apt paths. Exported rootfs contains 2,138 regular files and no setuid/setgid entry.

Both SDK sessions use `--pull=never --rm --init -i --network=none --read-only --cap-drop=ALL --security-opt=no-new-privileges --pids-limit=64 --memory=256m --log-driver=none`, no TTY/ports, isolated child environment and readonly synthetic 0600 token files. UID/GID override 501:20 matches host ownership of synthetic files; the separate process test verifies the image default user. **Actual initialize/tools-list PASS for read and read+sensitive:** each returns exactly 15 ordered names/descriptions/input schemas/annotations, byte-semantically matching the accepted 6dd fixture and canonical cd4 hash. No tool call or API request is made. All client/transports close, exact synthetic containers are confirmed absent and synthetic token directories are removed.

`read+write`, `read+writeCritical` and critical-without-write each reject in stdio, doctor and check-config: **9/9**, exit 1, empty stdout, fixed startup metadata and no synthetic token reflection. Network is disabled for every run. `sdk-read.json`, `sdk-sensitive.json` and `write-denials.json` record actual results.

## Component closure and unchanged publication blockers

The permitted **positive unchanged-component closure** route is used instead of new Trivy/Grype database scans. Baseline is accepted historical aa08 image `sha256:dfaf529bd23a3fd10a684386b72a751cbccbee9f711f1637af69a25e8cb27c00`, which itself positively binds Node/OS/dependencies to [the earlier fresh Docker review](docker-final-review.md).

- First five immutable rootfs diffID layers are identical. Node, Node license, OS package records/libraries, production dependencies and system license bytes remain unchanged.
- Path inventories match exactly. **2,134 of 2,138 regular files are byte-identical**; the only four changed bytes are `/app/dist/src/coverage/report.generated.json`, `policy/release-capability.js`, `policy/release-capability.d.ts` and `tools/index.js`. Complete per-file comparison is retained; layer equality is not used to guess final package marker/license bytes.
- Node ELF SHA-256 remains `d09e299258c24f7cdf6f5d5ec185e3a56512b27a697113735dac909f1cac7b8d`; actual in-image process.versions and build variables exactly equal baseline, including Node 22.23.3 and bundled static OpenSSL **3.5.8**.
- The closure receipt hashes prior closure, raw baseline Trivy/Grype reports and manual Node bundled inventory. These are **historical fresh-database results on identical components**, not a new scanner run: Trivy 0.74.0 DB `2026-10-05T19:07:00.467981014Z`, 31 matches (23 MEDIUM, eight LOW); Grype 0.118.0 DB `2026-10-05T06:45:38Z`, same 31 matches (11 High, ten Medium, three Low, seven Negligible). No fix is indicated by either report; this is neither zero High nor residual-risk acceptance.

Scanner SBOM omission of Node/bundled components remains explicit; the unchanged manual inventory supplements it. **CVE-2026-35189 applies to the bundled OpenSSL 3.5.8 TLS certificate/CRLDP path and still blocks stable publication**, official severity Low, patched in 3.5.9. [Primary OpenSSL advisory](https://openssl-library.org/news/secadv/20260929.txt). The earlier review found no patched official supported Node release among the examined October 5 releases; this checkpoint does not repeat the availability search, substitute a system libssl for static crypto, weaken TLS or waive any residual. Functional SDK results do not supply a security patch.

## Preserved preparation failures and remaining gates

The initial Docker cp of read-only built-source directories failed before complete extraction; both created inspection containers were removed. External byte-only tar extraction of that build source corrected the receipt preparation without changing any image or source bytes. The premature comparison then correctly refused incomplete extraction and is retained as `binding-preparation-failed.log`. An initial rootfs inventory comparison used an incorrect leading-dot path normalization and failed; exact prefix handling corrected the external checker, retained as `component-preparation-failed.log`. A later metadata check correctly found project LICENSE's read-only mode difference, now explicitly recorded rather than claiming identical metadata. These are failed receipt-preparation checks followed by actual passing checks, not image/runtime tests silently relabeled PASS.

Independent helper/test and Docker-binding acceptance remains required. Root owns protected manifest rebuild, exact reviewed first-page discovery/endpoint retest, temporary secret-volume cleanup evidence and any live Docker campaign. Full final-source security/reproducible package/remote CI and dated residual-risk decisions remain separate gates. No stable tag, release or registry publication occurred.
