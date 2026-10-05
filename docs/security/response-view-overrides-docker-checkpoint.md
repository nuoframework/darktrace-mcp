# R1/R2 Docker functional checkpoint

**PASS for the frozen independently accepted `aa08c260` source and `ea31…` contract. This is an old scope checkpoint, not the final stable candidate.** Coordinator follow-up `msg_079f60cadb6e` states that the user selected a new immutable 19-GET consultation whitelist and new full contract, to be implemented/reviewed separately. That change requires another build and binding; this image does not certify it. Stable publication remains blocked by the existing unpatched bundled OpenSSL issue.

Date: 2026-10-05. Worker `task_b9b4a57669ce`, dispatch `ctx_d46647a746ce`. Only this repository document changed. No source, Dockerfile, package, helper, fixture, Git, version, lab credential, appliance API or native agent action occurred. Docker builds used public pinned bases/npm downloads; every runtime test used `--network=none` and synthetic data.

## Image and frozen context

- Local linux/arm64 image ID: **`sha256:dfaf529bd23a3fd10a684386b72a751cbccbee9f711f1637af69a25e8cb27c00`**.
- Convenience tag: `darktrace-mcp:r1r2-aa08c260`; consumers must use the immutable ID above.
- External checkpoint: `/private/tmp/darktrace-r1r2-docker-ctx_d46647a746ce/`.
- Clean frozen Docker context: its `source/` directory contains only the 40 build inputs, no shared dist, configuration, operator home or credentials. Context files/directories were made 0444/0555 after verification.
- Production source tree: `aa08c260847c0fc206253f2de3cb1a872f89d2f9d85f5618b88ffd0f5c681e8e` (28 files).
- Complete shipped `/app/dist/src` tree: **`b00369cb5757301c295c4a3585ebbf9314237a11a9db4b38beb51a834d69b55a`** (49 files: 23 JS, 3 JSON, 23 declarations).
- OCI platform manifest: `sha256:fb5afdcc31f01ed04e322244a09cded3fc7806aa0a513d6ac41e559d6b3a3df5`; config: `sha256:12f5a410e08fb1d40fa4fde30a98a59807169637d824e562461c6b1942243e02`. Image ID includes the BuildKit index/attestation; it is not a published registry digest.

The unchanged Dockerfile pins Node `22-bookworm-slim@sha256:43ac6c60b8f89723f746e8a92ce91abd5017e627ce1ddfe4238355d3a30b772c` and distroless `cc-debian13:nonroot@sha256:e792ab3d241a468a4fd7519ddbbebe66b49b5f365771716ea688ad40b6c6f1c2`. I built both the final image and its `build` target from the same external context. Export/copy inspections did not start the server. Every shipped runtime file is byte-identical to `/build/dist/src`, and every `/build/src` file is byte-identical to the frozen source after generation. Reviewed build inputs also matched the shared checkout at the verification checkpoint.

All tree aggregates use the release helper's sorted recursive route→SHA-256 map, compact JSON and SHA-256; dependency package maps use `.sort()` over paths as the lab harness does. Receipt byte hashes below are separately identified.

## Exact production dependencies and hardened runtime

The production installation contains exactly the three non-dev shrinkwrap packages, each with the locked registry URL and sha512 integrity. Every package file matches the build stage's `npm ci --ignore-scripts` installation, and the package trees match the previously reviewed `dc9b8f14` binding:

| Package | Version / files | Package tree SHA-256 |
|---|---|---|
| `@modelcontextprotocol/core` | 2.3.0 / 21 | `174b5387fb2ed22af55d657d1df27e1204a626e852835ff6d8c0393ca298c1c2` |
| `@modelcontextprotocol/server` | 2.3.0 / 85 | `7f2bdb59e5e0df2bd8da175f27b143b02fc3450227857996b513940786486ea0` |
| `zod` | 4.2.0 / 681 | `ea6dbf716fd3b87a3e3b5e71f5fe248dbc20c52d105da85ce094fe8555884606` |

Image configuration checks pass: default `1000:1000`, exact production entrypoint, no Cmd, ports, volumes or baked operator/proxy/TLS configuration. An actual hardened Node process confirms UID/GID 1000, every capability set zero, `NoNewPrivs=1`, seccomp mode 2, root-owned `/app` contents, and absent source/tests/scripts/docs/OpenAPI/.env/shell/npm/apt paths. Exported rootfs has 2,138 regular files and zero setuid/setgid entries.

The external SDK smoke imports SDK Client and StdioClientTransport 2.3.0 exported from this exact build stage. It runs the production entrypoint with `--pull=never --rm --init -i --network=none --read-only --cap-drop=ALL --security-opt=no-new-privileges --pids-limit=64 --memory=256m --log-driver=none`, no TTY or ports, and readonly synthetic 0600 token files. UID/GID override `501:20` matches the host owner of those files; the separate process check verifies the default image user.

**Actual SDK initialize/tools-list PASS:** 27 tools, exact ordered names/descriptions/input schemas/annotations against the copied fixture whose byte hash is `ea31d70a484c0d0353cb8651edc4b6a4ab13798c096056e8cdcf68e78324707f`; canonical read27 hash `6ce22e568592b27281d14b1fd7361f80da1e0daf7bb2888c892458cc9f532e68`. No tools-call or API request was issued. Client/transport closed, the exact synthetic container was confirmed absent and synthetic token files removed.

`read+write`, `read+writeCritical` and critical-without-write each reject in stdio, doctor and check-config: **9/9**, exit 1, empty stdout, fixed startup metadata and no synthetic token reflection. Network was disabled throughout. A local SDK-import preparation error occurred before any smoke container started, because exported dependencies were initially named `build-dependencies` rather than discoverable `node_modules`; an external symlink to that same frozen dependency tree resolved it, and the final smoke exited 0. The preparation error remains recorded separately.

## Scanner/component closure — no clean-CVE claim

I used the task's permitted **unchanged component closure** route instead of fresh Trivy/Grype runs. Baseline is the reviewed local image `sha256:dc9b8f14c2c5f5b1041d0c47dbb9fc113c797a10731788f254878530e7dd3e3c`, with reports in `/private/tmp/darktrace-docker-final-ctx_564c3933fb59/` and applicability analysis in [the Docker final review](docker-final-review.md).

Positive byte/layer proof in `component-closure.json`:

- The first five immutable rootfs diffID layers (OS, Node, Node license and production dependencies) are identical to the reviewed image. All diffIDs are recorded in full.
- All **2,134 regular files outside the four changed runtime files are byte-identical**, with identical path inventories. This includes all OS package records/libraries, the Node ELF and all dependency files.
- Node ELF SHA-256 remains `d09e299258c24f7cdf6f5d5ec185e3a56512b27a697113735dac909f1cac7b8d`. Actual in-image `process.versions` and build config exactly equal the baseline: Node 22.23.3, bundled OpenSSL **3.5.8**, with the same bundled library inventory/static-link settings.
- The only changed regular files are `api/response-view.js`, `api/response-view.d.ts`, `api/response-views.generated.json` and `coverage/report.generated.json` beneath `/app/dist/src`. Layers 5–7 differ; the final ESM package marker and project license bytes are nevertheless identical. Layer identity alone is not used to infer those two files' bytes.

The retained baseline scans remain **historical scanner results on identical Node/OS/dependency components**, not a new vulnerability-database refresh. Trivy 0.74.0: 31 matches (23 MEDIUM, 8 LOW), DB updated `2026-10-05T19:07:00.467981014Z`; Grype 0.118.0: 31 matches (11 High, 10 Medium, 3 Low, 7 Negligible), DB built `2026-10-05T06:45:38Z`. The closure receipt hashes both raw reports, scanner findings, SBOM and manual Node inventory. Their SBOM omission of bundled Node components is preserved explicitly; the manual inventory supplements it.

**Existing upstream OpenSSL CVE-2026-35189 remains unpatched and blocks stable publication.** This image has the exact same OpenSSL 3.5.8 ELF/component closure as the reviewed image; R1/R2 does not fix its certificate-handshake issue. The baseline review identifies the fix as 3.5.9 and no corrected official runtime in the versions it examined. I did not repeat that upstream availability search or waive any Debian/Node residual finding. This checkpoint makes no global zero-CVE, scanner-clean or risk-acceptance claim.

## Handoff artifacts and checksums

Every path below is relative to `/private/tmp/darktrace-r1r2-docker-ctx_d46647a746ce/`:

| Artifact | SHA-256 of receipt bytes |
|---|---|
| `source-files.json` | `765c73090d46049515fe26ecc9bdb6797a90e58b404dd6817c363b8c8d6c7883` |
| `runtime-files.json` | `32c949e70505f2835fd4f15ac689add860ac8362f75b7dd3285ff7746290ac81` |
| `binding.json` | `03cf0b38ebf362fc53fc582da613ab266791ac25ca7c175bff940ed696b92c0e` |
| `component-closure.json` | `e19c2a4c6cad37507491c1e719e596b67d280bdf98100069d6ffc50fe27ab6de` |
| `node-inventory.json` | `8763a75ccd0aafe2a840a7d6961494f8e0c3d02adc5fe85a14234e0c86730145` |
| `sdk-smoke.json` | `1361265a802de48eb092ef866d34f42d6a874f3441eb5431237c6665d63e7391` |
| `write-denials.json` | `037b54cdfe153055e8bbc691848ac72af039a2b34a77f4fab7c96fbed9cf97e1` |
| `SHA256SUMS` | `920b5d6dc911ce57d72d1389957be4ccdaa4226f7653e84c8aaa034940e2ffd1` |

`binding.json` contains all 49 runtime file hashes, all individual production package file hashes plus lock URL/SRI, source/runtime aggregates, image identity and the 26 JS/JSON `transportRuntimeFiles` mapping. `runtime-files.json` is the complete inventory; it is **not** a schema-2 lab manifest. Root must construct its protected reviewed manifest binding the intended host source/helpers/14 SDK dependency trees, and bind any Docker lab launch to this immutable image/runtime when deliberately testing this older scope. `expected-runtime/`, `built-source/`, `production-dependencies/`, `build-dependencies/`, `rootfs.tar`, full rootfs inventories, build logs and external verification/smoke scripts remain available.

Root owns any same-recipe Docker lab execution and credentials. No live compatibility acceptance occurred here. The new 19-GET scope and contract supersede this checkpoint for the final candidate and require a fresh image/binding/offline SDK check, with the external OpenSSL blocker still open.
