# Patched vendor runtime: independent review

**Status: FINAL INDEPENDENT PASS for the patched runtime.**

- The final images are arm64 `64d16616…` and amd64 `65985236…`, and F1–F4 and F7 are fixed.
- Native CI run 37423283298 on commit `122dc4a` passed on both architectures. I verified its artifacts independently (see "Final native CI evidence").
- Root's dated (2026-10-06) decision on R1 accepts the image-bound zlib VEX, *not in execute path*. The raw High finding stays disclosed, there is no fixed-library claim, and a rebuild follows any vendor fix.
- The lab is closed: root accepts the historical 19/19 PASS, given the byte-identical application and the final TLS and SDK rechecks.
- Choosing the stable version is a separate, metadata-only decision for root. This review publishes nothing, tags nothing and does no registry action.

## Final native CI evidence (run 37423283298, commit `122dc4aa4f5196ac8eccda9b1b5f31bb255af33d`)

**Recipe.** Commit `122dc4a` changes only `Dockerfile`, `ci.yml` and the helper on top of `b0717a9`, with no `src`, `test`, package or fixture changes. Its hashes match the reviewed recipe exactly:

| File | sha256 |
|---|---|
| `Dockerfile` | `4799ba3b…` |
| `.dockerignore` | `2d653d10…` |
| `ci.yml` | `b6276de9…` |
| `prepare-docker-runtime.mjs` | `70638c66…` |

**Jobs.** All four succeeded: `offline (22)`, `offline (24)`, `docker (amd64, ubuntu-24.04)` and `docker (arm64, ubuntu-24.04-arm)`.

**Artefacts.** I downloaded both through the GitHub API and checked them against GitHub's recorded digests.

| Architecture | Artefact ID | sha256 | Verified |
|---|---|---|---|
| arm64 | 11394495161 | `6f776313c3796793753da6c9adffa510f5e7e77e26c56017f8e94573991d5697` | OK |
| amd64 | 11393844014 | `93ba98d9a91119e14b04800a9c08b1d1296292022259b7eead1ff8a6d13c7b0e` | OK |

My checker (`ci-verify.py`, in the external receipts) found **17/17 PASS on each architecture**:

| Check | amd64 (native x64) | arm64 |
|---|---|---|
| Vendor-checks and final-image Node | 24.18.1, OpenSSL 3.5.9, shared | same |
| Typecheck | clean | clean |
| Functional | **130/130**, 0 fail, cancelled, skipped or todo | same |
| Security (unmodified runner) | **325/325**, 0 skipped, exactly 1 receipt, `receiptComplete`, every subcase PASSED, 22,132 assertions | same |
| Source / fixture | `9e7c7070…` / `6ddda205…` | same |
| Final image `/app/dist/src` | 49 files, aggregate `e7cbb509…`, equal to the tested `runtimeHashes` and to my independently reviewed map | same |
| SDK read and read+sensitive | 15 tools each, `cd4ee422…`, exact fixture, no API calls | same |
| Write refusals | 9/9 | 9/9 |
| CI-fetched APKs | 22, equal to my independent pins | 22, equal to my independent pins |
| Licence pins | `ff0b7ab3…` | `ff0b7ab3…` |

- This closes the amd64 security gate, which had only timed out under emulation earlier.
- CI built its own images (amd64 `sha256:ac504030…`, arm64 `sha256:2d90bbad…`). Their runtime bytes are bound to the same 49-file aggregate. The accepted local review images are still `64d16616…` and `65985236…`.

- Reviewer: worker `task_e22e7c4daefa`, dispatch `ctx_ca8518283203`, 2026-10-06 Europe/Madrid.
- Implementation owner: implementation worker, `task_7bc20d4178f8` / `ctx_eee95805dccf`.
- The research input `/private/tmp/darktrace-runtime-alternatives-research.md` was used as research only.
- Constraints of this review: no API credentials or appliance calls, no source, test, fixture, Dockerfile, workflow or helper edits, and no tag, release or registry action.
- External receipts: `/private/tmp/darktrace-patched-runtime-review-ctx_ca8518283203/`, indexed in `SHA256SUMS` there.

## What I reviewed

There were three freezes. Every check in sections 1–6 was first run in full on the v1 images. Each later freeze was then compared with v1 across every exported path, and runtime, TLS, SDK and scan evidence was re-run on its exact IDs.

| Freeze | arm64 (local ID) | amd64 (local ID) | Exported rootfs sha256 (arm64 / amd64) | Difference from v1 |
|---|---|---|---|---|
| v1 (lab 19/19) | `sha256:8cd856049fe44dea8692333dded5022e9e7826e8dbb2e40814c056edd0219ca2` | `sha256:b39e1b1211818e1841deae004291a03f23ca263fc273e2e5ce2a272914eb6cc5` | `195bcfb5…948c` / `18f225d8…d151` | — |
| v2 (F1–F4) | `sha256:cf9634e21af7b5bfe2ad2745209894afeb6c8cb2c2cac36f31c757de85ba5769` | `sha256:59b1f5400c04c7b13191c7ea4b12c964df8458cb4ea484e3452c652251d7d35b` | `0324bd9b…37c` / `859f4616…bd0` | F2 removals; `MPL-2.0.txt` 0600 (F7) |
| **v3 (final)** | `sha256:64d16616acaef502d121eff3f7d07d0d2100e03e1ffacd0f86f6bf81225be842` | `sha256:65985236cd6e606145cda32f1c1f46f4221fcedbddc32188e58643df9868dad6` | `e30b3b15…170a` / `a2442eea…04b8` | Only the F2 removals (`scripts.tar.gz`, `apk.log`) and gcc `LICENSE.IMG` 0755→0644. All other 1,299 paths have identical bytes, mode and owner. |

The final recipe sits in the working tree and is not yet committed:

| File | sha256 |
|---|---|
| `Dockerfile` | `4799ba3b9cdd464a0c27239b1a4e05c6c7ba5bf75fde0559d4ba2e3d2319a769` |
| `.dockerignore` | `2d653d102ff3d63943ac262daf89bead0005a02fa37fd7580c705434218060e1` (unchanged) |
| `.github/workflows/ci.yml` | `b6276de9c70a84b70475ea33972b32bc3334be4ebbef92ada7927a97ce6f40bf` |
| `scripts/prepare-docker-runtime.mjs` | `70638c66cf5d7c14ea3ce03888c14d2ab3110b92ac654f055fe1471c843c0b74` |

The v1 recipe, reviewed first, is below.

| Item | Value |
|---|---|
| Recipe commit (private candidate branch) | `b0717a9`. It changes only the four files below; `src`, `test`, `package.json` and the fixture are untouched. |
| `Dockerfile` | `44103b918af4783c6f3fee9fb06d70e2d4b2d8ffedee145f56cf1931f2460b8b` |
| `.dockerignore` | `2d653d102ff3d63943ac262daf89bead0005a02fa37fd7580c705434218060e1` |
| `.github/workflows/ci.yml` | `ab6724633ce9b9a00a2bc7aee66f2c347f6abf6746f27fc81da563afc88578ce` |
| `scripts/prepare-docker-runtime.mjs` | `fc7e0b82e1192b00c3cd397c26c5754e4a96ca85ab5e2332f84c850d7be462e2` |
| Base image | `alpine@sha256:294b683cb724975bec92580e1e685676bd4b50bda910ddb8c51d4cabeaec77e6` (3.24.2) |
| Frozen production source / fixture / both profiles | `9e7c7070…d7f2` / `6ddda205…213c` / `cd4ee422…dfe3` |

Exports came from containers that were created but never started, and every container was removed afterwards. The local image IDs are not registry digests.

## Findings

All checks below ran on both architectures unless a step names one.

### 1. Vendor authenticity, versions and support

- **Independent package fetch.** In throwaway containers built from the pinned base, I resolved the closure of `nodejs=24.18.1-r0`, `libssl3=3.5.9-r0`, `libcrypto3=3.5.9-r0`, `ca-certificates-bundle` and `musl` from Alpine 3.24 `main`.
  - That gives 22 APKs per architecture.
  - `apk verify` returned OK for all of them, using the keys shipped in the pinned base under `/etc/apk/keys`.
  - All **44 per-architecture sha256 pins** in the Dockerfile are byte-identical to my own fetch.
- **Origins and licences** come from the signed `.PKGINFO` files: `nodejs` commit `48d72323…` (MIT) and `openssl` commit `29b9ec24…` (Apache-2.0). The full list is in `reference/<arch>/pkginfo.txt`.
- **Fix coverage.** OpenSSL 3.5.9 fixes CVE-2026-35189 and the other 12 CVEs in the [29 September 2026 advisory](https://openssl-library.org/news/secadv/20260929.txt).
  - Node 24.18.1 is the latest 24.x release flagged `security` in nodejs.org `index.json` (2026-07-28).
  - No newer Node security release exists, and Alpine 3.24 `main` has not moved on any pinned package (checked 2026-10-06).
- **Support windows.** Alpine 3.24 is supported until 2028-06-01. Node 24 LTS ends in April 2028.

### 2. Package, file and licence closure

- **Package-owned files.** The image contains 154 of them, and all are byte-identical to files extracted from the official signed APKs.
- **Unowned files.** There is no unexpected unowned file. The only unowned paths are export artefacts, the synthetic `/etc/os-release`, `passwd` and `group`, the apk metadata, and the `/nodejs/bin/node` symlink.
- **apk database.** It holds 19 records. No listed file is missing, there are no Q1 checksum mismatches, and there are no records for busybox, ssl_client, apk or npm.
- **No dangerous files or tools.** There are no setid or world-writable files, nothing is owned by a non-root user, and there is no shell, busybox, apk, npm, env, openssl, c_rehash, ssl_client or update-ca-certificates.
- **ELF closure** (`scanelf`; 26 ELF files):
  - Every DT_NEEDED entry resolves inside the image to the musl loader or a library under `/usr/lib`.
  - The only RPATH is `libsqlite3` → `/usr/lib`.
  - There are no ELF files under `/app`.
  - Extra modules from the full signed payloads (`engines-3/*`, `ossl-modules/legacy.so`, `libicuio`) are signed bytes, are covered by the scans, and are not loaded by default.
- **Libraries in the running process.** `/proc/self/maps` of the actual process showed that every mapped library (21 of 21) is official package bytes, including `libssl.so.3` and `libcrypto.so.3` from 3.5.9-r0.
- **Licences.** `/licenses` contains exactly the 84 pinned regular files (aggregate `ff0b7ab3…`), including the GCC runtime exception and MPL-2.0.
- **Reproducible rebuild.** I built a fresh arm64 image from `git archive b0717a9`, using the committed helper's own output, with `--no-cache`.
  - It reproduced all 1,302 rootfs paths byte-identically, with the same types, modes and owners.
  - The single exception was `/var/log/apk.log`, which carries timestamps (see F2).

### 3. Runtime hardening and application bytes

- **Image configuration.**
  - User `1000:1000`.
  - Entrypoint `["/nodejs/bin/node","/app/dist/src/index.js"]`.
  - Env contains only `PATH=/nodejs/bin`.
  - No Cmd, ports or volumes.
- **Process state.** I ran the actual process with `--read-only --cap-drop=ALL --security-opt=no-new-privileges --network=none`.
  - uid/gid were 1000, all five capability sets were 0, `NoNewPrivs=1` and `Seccomp=2`, and writes failed with `EROFS`.
  - Node reported 24.18.1, OpenSSL 3.5.9, `node_shared_openssl=true`.
- **Application bytes.**
  - `/app/dist/src` has exactly 49 files with aggregate `e7cbb509…`, the same as the frozen 9e7 build.
  - There are exactly three production packages: `@modelcontextprotocol/core` 2.3.0 (`174b5387…`), `@modelcontextprotocol/server` 2.3.0 (`7f2bdb59…`) and `zod` 4.2.0 (`ea6dbf71…`).
  - `package.json` is `{"type":"module"}`, and the project `LICENSE` is byte-identical.
- **SDK contracts.** I used SDK Client/stdio 2.3.0 from the locked tree against the actual images.
  - Both `read` and `read+sensitive` returned exactly 15 tools, byte-semantically equal to fixture `6ddda205…`, with canonical hash `cd4ee422…`.
  - Write startup was refused **9/9**: `read,write`, `read,write+critical` and critical-only, each × stdio/doctor/`--check-config`. Each run exited 1 with empty stdout and a fixed startup error, and no synthetic token was echoed.
  - No API call was made, and no containers were left behind.

### 4. TLS and certificate trust (synthetic, offline, in the actual images)

| Case | Default trust | `ca` option or `NODE_EXTRA_CA_CERTS` |
|---|---|---|
| Valid leaf from a private CA | `UNABLE_TO_VERIFY_LEAF_SIGNATURE` | TLSv1.3, authorized |
| Wrong host | rejected | `ERR_TLS_CERT_ALTNAME_INVALID` |
| Expired | `CERT_HAS_EXPIRED` | `CERT_HAS_EXPIRED` |
| Self-signed | `DEPTH_ZERO_SELF_SIGNED_CERT` | `DEPTH_ZERO_SELF_SIGNED_CERT` |

**Trust-root change.** Alpine builds Node with `--openssl-use-def-ca-store`, and I confirmed what that means empirically. A CA file bind-mounted over `/etc/ssl/certs/ca-certificates.crt` is trusted by default and rejected under `--use-bundled-ca`.

- The effective trust store is therefore `ca-certificates-bundle` 20260909-r0: 121 roots, sha256 `028fca51…`.
- It is not Node's bundled list. `tls.getCACertificates('default')` misleadingly reports the bundled 120.
- Compared with the official Node binary, 5 roots are added (Izenpe; SECOM TLS ECC/RSA 2024; Telia EC/RSA v3) and 4 are dropped (Entrust Root CA, Chunghwa, Atos 2011, SecureSign CA12).
- The app's only private-CA input is `NODE_EXTRA_CA_CERTS`, and it refuses `SSL_CERT_FILE`, `SSL_CERT_DIR` and `OPENSSL_CONF` at startup (verified in the image).
- **The real lab used the default trust store, so this change applies directly to it.** Root's 19-query campaign on `8cd85604…` used no CA file and no `NODE_EXTRA_CA_CERTS`, and it passed with verified TLS. The appliance chain is therefore currently trusted by Alpine's bundle `028fca51…`.
- The custom and extra CA checks in this section are synthetic only. Future changes to `ca-certificates-bundle` can change appliance trust, so each rebuild must repeat a live TLS check.

### 5. Full test suites under the vendor Node

I ran these under my own independently verified APKs (the same 22 files), with frozen source `9e7c…`, uid 1000 and no network.

| Architecture | Functional | Security (`run-isolated.mjs`, unmodified) |
|---|---|---|
| arm64 (native) | **130/130** | **325/325**, 0 skipped, 22,132 assertions, `receiptComplete` |
| amd64 (emulated) | **130/130** | **NOT PASS**: `spawnSync ETIMEDOUT` at the fixed 120 s cap, 0 assertions |

The amd64 diagnostic is labelled as a diagnostic, not a gate. The identical security command run uncapped gave 325/325 and 22,132 assertions in 187 s. That points to emulation speed as the cause and rules out an amd64 test failure. **The amd64 gate stays open until the native ubuntu-24.04 CI artifact shows 325/325 under the unmodified runner.**

### 6. Scanners, reconciled against primary sources

| Scanner (DB) | Result on both images |
|---|---|
| Trivy 0.74.0 (DB 2026-10-05T13:07Z) | 0 findings: 19 Alpine packages and 3 npm packages |
| Grype 0.118.0 (DB built 2026-10-05T06:45Z) | 2 findings, below |

- **CVE-2026-85091, zlib 1.3.2-r0. Raw severity HIGH, retained and not suppressed.**
  - No fixed zlib exists. Upstream's latest release is v1.3.2; the fix `df84af25` is unreleased; Alpine 3.24 and edge both ship 1.3.2-r0 with no secdb entry.
  - The vulnerable `gz_vacate` path is reachable only through `gzprintf`/`gzvprintf` after a stalled non-blocking `gzwrite`.
  - No ELF in either image imports any `gz*` symbol. Node's libz imports are only `deflate*`, `inflate*`, `crc32` and `zlibVersion`.
  - Node v24.18.1 `src/node_zlib.cc` (sha256 `9a56956e…`) has zero `gz*` calls.
  - There are no `.node` addons, the app source has no dlopen, FFI or child-process use, and the root filesystem is read-only.
  - Reconciliation: *vulnerable code not in execute path* for these images. This is **not** a waiver, and zlib is **not** fixed.
  - **Reviewer position on the stable gate.** This technical not-affected result does satisfy the applicable-vulnerability gate for CVE-2026-85091 on stable, provided every condition below holds; a scanner's raw severity alone should not hold the release.
    1. It applies only to images bound by ID whose ELF set has been re-checked for `gz*` imports. Any respin needs that check again; I recommend adding it to CI.
    2. The final report and VEX disclose the raw High match on both scanners' scope, with no zero-CVE claim.
    3. The amd64, build, CI and final-source gates pass.
    4. An Alpine `zlib` release containing `df84af25` triggers a rebuild.
  - Whether to accept the residual risk is still root's dated decision (**R1**).
- **CVE-2024-9410, ada-libs 3.3.0-r0 (MEDIUM). Not applicable.** This is a CPE product collision. The CVE describes an SSRF in Ada.cx's Sentry setup ([Tenable TRA-2024-41](https://www.tenable.com/security/research/tra-2024-41)), not the ada-url C++ URL parser.
- **Alpine secdb gap.** Alpine's secdb has no `3.5.9-r0` secfix entry for `openssl`. The fixed status of libssl3 3.5.9 therefore rests on the primary OpenSSL advisory and the in-process version `3.5.9`, not on scanner metadata.

## Required fixes and recommendations

Status: F1–F4 and F7 are **fixed and verified** in v3. The fixes:

- **F1:** an exact-set lstat walk with no symlinks, special files or extra directories.
- **F2:** both files are removed.
- **F3:** CI asserts `9e7c…`, `e7cbb509…` and exactly one receipt.
- **F4:** canonical owned and marked output, a 120 s timeout, a 128 MiB streaming cap, and extraction running as the invoking user. This also fixes CI run 37391270956.
- **F7:** licence files 0644 and directories 0755, with the modes asserted.

F5 is a source recommendation for root, and F6 is informational.

| ID | Severity | Item | Owner |
|---|---|---|---|
| F7 | Low | In v2, the helper's streaming download (mode 0600) shipped `/licenses/MPL-2.0.txt` as root-owned 0600, so uid 1000 could not read it. | Implementation worker |
| F1 | Medium | `COPY --from=runtime-apks /licenses/` copies the whole named context, but `sha256sum -c` checks only listed files, so extra files, symlinks or special files would enter the image unreviewed. Fail closed on any non-regular entry and on any path outside the 84 pins. The current images comply. | Implementation worker |
| F2 | Low | The Dockerfile removes `scripts.tar`, but apk writes `scripts.tar.gz`. Stale busybox, ca-certificates, icu and nodejs install scripts remain. `/var/log/apk.log` is also left behind and is the only non-reproducible file. | Implementation worker |
| F3 | Low | CI checks only internal consistency. Also assert source `9e7c…`, the runtime aggregate `e7cbb509…`, and exactly one new security evidence JSON. | Implementation worker |
| F4 | Low | Helper hardening (an operator tool, not part of the MCP attack surface): add a fetch timeout and size cap; refuse a symlinked or foreign output directory; note that the fetch container leaves root-owned files on Linux, which breaks reruns. | Implementation worker |
| F5 | Low (recommendation) | Shared OpenSSL makes `LD_LIBRARY_PATH`, `LD_PRELOAD`, `OPENSSL_MODULES` and `OPENSSL_ENGINES` relevant to which crypto library loads. The app guard does not reject them (I confirmed this against the image). Only the operator can set them, so this is not a blocker. Consider adding them to `assertSafeNetworkEnvironment` in a future source change; the source is frozen now. | root |
| F6 | Info | CI runs no scanner, so Trivy and Grype remain manual evidence bound to the image IDs above. | — |

## Delta threat model (vendor runtime compared with the official static Node 22 image)

1. **Vendor linkage.**
   - OpenSSL, zlib, ICU, c-ares, nghttp2 and others are now shared Alpine libraries. Patch level follows signed Alpine `main` packages rather than Node releases. That unblocks CVE-2026-35189 now, but it adds a dependency on Alpine's update speed (R1 shows this).
   - The libraries cannot be swapped at runtime by the process: the root filesystem is read-only and root-owned, the process runs as uid 1000, and NoNewPrivs and seccomp are on.
   - An operator who controls the environment and mounts can redirect loading through `LD_*` or `OPENSSL_MODULES`/`OPENSSL_ENGINES` (F5). That is the same trust level as the existing `NODE_OPTIONS` and CA configuration.
2. **Trust roots.**
   - Default TLS trust is now Alpine's `ca-certificates-bundle` (+5/−4 roots versus Node's bundle), frozen in the image (`028fca51…`). Updates to it need a rebuild.
   - Private CAs stay explicit through `NODE_EXTRA_CA_CERTS`, and the store-redirecting variables are refused at startup.
   - Validation fails closed for untrusted, wrong-host, expired and self-signed certificates.
3. **Package authenticity.**
   - The chain is: pinned base digest → its Alpine keys → the signed APKINDEX → per-APK signatures → 44 committed sha256 pins → per-file bytes checked against the APKs.
   - Mirrors drop superseded builds, so CI archives the exact APKs, licences and receipts as artefacts, and the pins make any substitution fail.
   - The licence payload must also be exact-set bound (F1).
4. **musl and Node 24 ABI.**
   - The Node major version changes from 22 to 24. Node is built against Alpine musl, with shared ICU 78 and English-only ICU data (`icu-data-en`); Intl falls back to `en-US`.
   - Mitigations: the full functional and security suites pass on arm64 under this exact vendor Node; both SDK contracts are byte-identical; date formatting tests pass in UTC.
   - Node's own support tier for musl is "Experimental", so platform support comes from Alpine.

## Gate summary

| Gate | arm64 (v1 `8cd85604…` → final `64d16616…`) | amd64 (v1 `b39e1b12…` → final `65985236…`) |
|---|---|---|
| Vendor signature, digest and version pins | PASS | PASS |
| Package, ELF, licence and DB closure | PASS; F1/F2/F7 fixed in final | PASS; F1/F2/F7 fixed in final |
| Final-ID rebind: hardening, Node 24.18.1 / OpenSSL 3.5.9 shared, TLS matrices, SDK 15/15 ×2, 9 refusals, Trivy 0 / Grype 2 | PASS | PASS (emulated) |
| Hardening, nonroot, read-only, no shell, ports or secrets | PASS | PASS |
| 49 runtime bytes, exactly 3 dependencies | PASS | PASS |
| Both SDK contracts + 9 refusals | PASS | PASS (emulated) |
| Synthetic TLS / custom CA | PASS | PASS (emulated) |
| Functional 130 / security 325 under vendor Node | PASS / PASS (native CI 37423283298) | PASS / PASS (native CI 37423283298) |
| Scanner reconciliation | R1 accepted by root 2026-10-06 (raw High retained, not in execute path) | same |
| Lab-execution readiness (functional only) | **Accepted**. Root's campaign: 19/19 selectors PASS, 25 requests, verified TLS through default (Alpine) trust (root checkpoint `e13cf132…`) | — |
| Native CI run 37391270956 (`b0717a9`) | **FAILED** before building: helper licence extraction denied (`--cap-drop ALL` root cannot write the runner-owned mount). The APKs CI fetched match the pins. Fix routed to the implementation worker; needs a new commit and a rerun. | same |
| Final independent acceptance | **PASS** | **PASS** |

## Final stable 1.0.0 native evidence (run 37423665585, commit `2adb84b6a076cf6018fb5723659aac57c8070e4e`)

Reviewed on 2026-10-06 by dispatch `ctx_4b210a8c95fe`. **Result: PASS.**

**Version-only diff from `122dc4a`.**

- Production changes:
  - `src/server/createServer.ts`: the `VERSION` literal changes from `0.1.0-alpha.0` to `1.0.0`.
  - The root `version` fields in `package.json`, `package-lock.json` and `npm-shrinkwrap.json`. Dependencies are unchanged, and the package stays `private: true`.
- `ci.yml` changes only the two exact pins: source `582a12121e7e9bb3844d527556ad62dfc5c0ed8f8c6ba57f64aad0ccee07f72c` and runtime `054a25fa1ff349a8ad7a84dd03e2f891ddf6f762b4472bdcec0f36f22d52d16f`. Its new hash is `ee223145b8cb01f26692636576100d9e7a8e7856aae27d94cacde151fc38573d`.
- The other changes are documentation only: `README*`, `SECURITY.md` and `CHANGELOG.md`.
- There are no changes to tests, the fixture, OpenAPI, scripts, the Dockerfile (still `4799ba3b…`), `.dockerignore` (`2d653d10…`) or the helper (`70638c66…`).
- I recomputed the source tree of `2adb84b` independently: 28 files, `582a1212…`. The fixture is still `6ddda205…`.

**CI run.** All four jobs succeeded.

| Architecture | Artefact ID | ZIP sha256 | Matches GitHub API digest |
|---|---|---|---|
| arm64 | 11394168319 | `78f6a7d7f3a404aaa45412936c44d9084d454a040fc6bbc359d5d1429a992634` | yes |
| amd64 | 11394009187 | `ce81eb5d414982f9d011040890740a238c3f314ab42507c91b8501ad87f131a3` | yes |

**Receipts.** I extracted them independently from the ZIPs, and `ci-verify-final.py` gave **17/17 PASS on each architecture**:

- Node 24.18.1 with shared OpenSSL 3.5.9, in both the vendor-checks stage and the final image.
- Typecheck clean.
- Functional **130/130** and security **325/325**, with 0 fail, cancelled or skipped. There was exactly one complete receipt, every subcase PASSED, and 22,132 assertions were counted.
- Source `582a…` and fixture `6ddda205…`.
- The final image's 49 `dist/src` files have aggregate `054a…`, equal to the tested `runtimeHashes`. They differ from the reviewed 9e7 map only in `server/createServer.js` and `server/createServer.d.ts`.
- SDK read and read+sensitive: 15 tools each, `cd4ee422…`. Write refusals 9/9.
- The 22 CI-fetched APKs equal my independent pins, and the licence pins are `ff0b7ab3…`.

**Final local images.** arm64 `sha256:bc0a29b49347c2ed21557b34193a2b8aa26017c8459c526665e09ee632a03f92` and amd64 `sha256:59a490c78a08b63e6757a7d872526a16b60cd119efc2240e607a97581844c0a3`.

- Rootfs exports: `cfde49dc…` (arm64) and `f80b0172…` (amd64).
- Against the accepted v3 images (`64d16616…` / `65985236…`), all 1,300 paths are identical except three files, whose type, mode and owner are unchanged:
  - `createServer.js`, now `VERSION = '1.0.0'`.
  - `createServer.d.ts`.
  - `node_modules/.package-lock.json`, where only the root version changes to `1.0.0`. It still lists the same three packages.
- Each image's `dist/src` map equals the CI-tested `054a…` map.
- The config is unchanged: `1000:1000`, the exact entrypoint, `PATH` only, and no ports or volumes.

**Scope of this addendum.** It covers native CI evidence and the source/image byte binding. I did not separately re-audit the implementation worker's npm package archive (`3abf8b7a…`) or the publication staging. R1 is accepted by root (2026-10-06): the raw zlib High stays disclosed and there is no fixed-library claim. No lab rerun is required.
