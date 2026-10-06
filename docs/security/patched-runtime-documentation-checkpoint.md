# Patched runtime documentation checkpoint

**Status: documentation final; lab receipt, amd64 native-CI security suite and final independent review pending; stable publication BLOCKED (zlib CVE-2026-85091).** This checkpoint records the documentation for the replacement Docker runtime (Alpine 3.24, Alpine-maintained Node.js 24.18.1, shared OpenSSL 3.5.9). It claims no gate as passed. Historical alpha records and earlier security checkpoints are unchanged.

**Unofficial MCP. Developed by an independent third party, unaffiliated with Darktrace and without authorization from Darktrace.** Contact for claims: [contacto@pabloarrabal.com](mailto:contacto@pabloarrabal.com).

## Scope

- Task `task_72e83f2f5b35`, dispatch `ctx_8df7328601b5` (documentation). Implementation dispatch `ctx_eee95805dccf`; independent review dispatch `ctx_ca8518283203`.
- The tool contract is unchanged: **19 validated GET selectors in 15 MCP tools**, identical in `read` and `read` + `sensitiveRead`. No new query or write is documented.
- No lab access, credentials, appliance API calls, image push or publication were used to write this checkpoint.

## Claims and their evidence binding

| Claim in the documentation | Source | Status |
|---|---|---|
| The runtime uses `alpine@sha256:294b683c…c77e6` plus 22 SHA-256-pinned APKs per architecture, including `nodejs-24.18.1-r0`, `libssl3-3.5.9-r0`, `libcrypto3-3.5.9-r0`, `musl-1.2.6-r2`, `ca-certificates-bundle-20260909-r0` | Working-tree `Dockerfile` (uncommitted) | Read from the recipe; not yet built or reviewed |
| The build asserts `node_shared_openssl=true`, OpenSSL ≥ 3.5.9, 3.5.9 package ownership of `libssl.so.3`/`libcrypto.so.3`, and no `/bin/sh`, npm, apk or `update-ca-certificates` in the runtime | Working-tree `Dockerfile` `RUN` assertions | Recipe assertion only; no build log recorded |
| Final image is `scratch`, nonroot `1000:1000`, `PATH=/nodejs/bin`, no listener | Working-tree `Dockerfile`; client examples | Pending runtime inspection |
| Node.js 24 platform list rates x64 musl Experimental and does not list arm64 musl; `main` rates x64 musl Tier 2 | [v24.x BUILDING.md](https://github.com/nodejs/node/blob/v24.x/BUILDING.md#platform-list), [main BUILDING.md](https://github.com/nodejs/node/blob/main/BUILDING.md#platform-list), read 2026-10-06 | Verified from the upstream source |
| Official upstream Node.js releases examined on 2026-10-05 bundle OpenSSL 3.5.8; 3.5.9 fixes CVE-2026-35189 | Existing accepted checkpoints; [OpenSSL advisory](https://openssl-library.org/news/secadv/20260929.txt) | Carried forward, not re-examined |
| Native installs need an independently verified maintained runtime with OpenSSL ≥ 3.5.9 | Coordinator direction | Guidance, not a test result |

## Pending evidence (must be filled before any "passed" wording)

| Gate | Value |
|---|---|
| Exact user build invocation and APK supply method | `node scripts/prepare-docker-runtime.mjs <dir> <arch>` then `docker buildx build --platform linux/<arch> --build-context runtime-apks=<dir>/<arch> --load` (implementation report) |
| Image ID(s) and platforms | Frozen candidates: arm64 `sha256:8cd856049fe44dea8692333dded5022e9e7826e8dbb2e40814c056edd0219ca2`; amd64 `sha256:b39e1b1211818e1841deae004291a03f23ca263fc273e2e5ce2a272914eb6cc5` (implementation/root report; not independently reviewed) |
| Runtime versions (`node`, `openssl`) and `ldd` linkage | Node 24.18.1, OpenSSL 3.5.9 (confirmed actual), ICU 78.1 English data (implementation report) |
| License and CA bundle paths in the image | `/licenses/<package-origin>/`; `/etc/ssl/certs/ca-certificates.crt` 20260909-r0, 121 certs, SHA-256 `028fca51…b2232` (root report) |
| Offline `--help`, `--version`, `--check-config` and test suites | arm64: 130 + 325 tests, zero skips; amd64: 130 pass, 325-test security suite pending native CI after an emulation timeout (root report) |
| `tools/list`: 15 tools in both profiles, match to the pinned contract | Pass on arm64 and amd64: 15 tools in `read` and `read` + `sensitiveRead`, full hash `cd4ee422…`, 9 write refusals; `dist` aggregate `e7cbb509…` unchanged (root report) |
| Vulnerability scans / SBOM (scanner-specific, no zero-CVE claim) | Trivy: 0 matches. Grype: HIGH CVE-2026-85091 (zlib 1.3.2); MEDIUM CVE-2024-9410 (`ada-libs`, likely name collision). zlib finding is real; upstream fix `df84af25…`, no fixed Alpine 3.24 `main` package yet. **Blocks stable publication**; not waived or suppressed |
| Bounded lab receipt for the exact image | PENDING (root) |
| Independent review verdict | PENDING (`ctx_ca8518283203`) |

The patched images remove the OpenSSL 3.5.8 / CVE-2026-35189 exposure (actual OpenSSL 3.5.9), but **stable publication stays blocked** by the zlib HIGH finding and the pending lab, native-CI and final review gates. No stable version, tag or publication is claimed, and nothing here certifies the image as free of vulnerabilities.

## Changed documentation paths

SHA-256 at documentation finalization, 2026-10-06. This checkpoint file is excluded from its own table. Local links and `scripts/validate-examples.mjs` passed; JSON client examples are unchanged.

| Path | SHA-256 |
|---|---|
| `README.md` | `64b12dab1780de633a5b73fd7e8a29b3e5b7749a246839e5d514a31412b14a8f` |
| `README.es.md` | `dc30816aa7b6a72cb95c3baa6589055efb0102a42b06cf9bf7752b5773eee054` |
| `docs/docker.md` | `5dbfe32acc6c638061ead99134fc884c3fa0941acf43c86afa68fcd4a6002d54` |
| `docs/getting-started.md` | `a6f47b75f0c16453038cf4f956ae2a73ac916368cf54b8566b3208689ee25b1e` |
| `docs/es/getting-started.md` | `68216b2c8336c35491f062c7f8f8a56823605260b91b98db4a23488b2063da04` |
| `docs/releases.md` | `de82ef921cfb9b8ba820dacdba2a26512d26bdd8d8a67adfffb02d6de49c5c65` |
| `docs/release-preparation.md` | `06488b2bf0049acc8e0f3d0b84d5e99fa4066d912e039698a26625fa88fa3eae` |
| `docs/release-preparation-docker-mcp.md` | `66359c3d385ab2dbaf55fa9c3ced205b2b9399f36daeb89912dd78e9b98de3ab` |
