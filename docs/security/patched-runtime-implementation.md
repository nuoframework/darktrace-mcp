# Patched runtime implementation

Date: 2026-10-06 (Europe/Madrid). **OpenSSL blocker removed in the private candidate; full acceptance and stable publication remain blocked.** The fresh Grype scan retains an unfixed High zlib library finding whose application reachability is under independent review, and the native amd64 325-case security gate is still pending. Independent runtime review, the root-owned real lab campaign, version/package/docs work and private CI gates remain separate approval gates.

## Scope and immutable inputs

This worker changed only `Dockerfile`, `.dockerignore`, `.github/workflows/ci.yml`, this report, and the newly authorized `scripts/prepare-docker-runtime.mjs`. The coordinator explicitly extended ownership to the new preparation helper. No production source, existing helper, test, fixture, contract, package/version, README, other report or Git was changed by this worker. The published alpha/main was not touched.

- Frozen production source: `9e7c7070298ef592a1a10cdcb7ca481420a377e25e4a93c863ca33c31921d7f2`.
- Complete production runtime: **49 files including declarations**, `e7cbb509d54909fa10276ffeaec11cab22bb201f1f81635fa8c988abcb3653fb`, identical on both architectures to the previously reviewed runtime.
- Both profiles preserve 15 tools and 19 GET selectors; production writes remain immutable false.
- First-stable fixture: `6ddda2054c9c708d0516a90b7811eb0aba565016403953dace89d47bc89d213c`; both complete ordered SDK profiles: `cd4ee42249a9110182046794c39fc00f5995700b7d751bccc6628e86afbddfe3`.
- External input/evidence directory: `/private/tmp/darktrace-patched-runtime-ctx_eee95805dccf/`. `source/` is the frozen external source/build context; `hardened-inputs/{arm64,amd64}/` contains signed APKs, index, original pinned-base signing keys, exact APK SHA-256 manifests, licenses and license manifests.
- The original complete gate snapshot is `/private/tmp/darktrace-validated19-platform-gates.UC5K3S/source/`; its approved input binding remains unchanged.

## Runtime construction

The runtime-relevant vendor stage uses official `alpine@sha256:294b683cb724975bec92580e1e685676bd4b50bda910ddb8c51d4cabeaec77e6` (Alpine 3.24.2). Its original OpenSSL 3.5.8 packages are explicitly replaced by the archived, signed `libssl3=3.5.9-r0` and `libcrypto3=3.5.9-r0`; signed MAIN `nodejs=24.18.1-r0` supplies the vendor Node binary. No Node or crypto compilation, TLS bypass or untrusted APK installation is used.

The helper refuses existing non-helper output directories, symlink paths and entries, special files, and files owned by another UID. Downloads reject redirects, have a 120-second deadline and a 128 MiB advertised/streamed byte cap, verify content before atomic rename, and remove failed partial files. Extraction runs as the invoking host UID/GID with network none, read-only root, all capabilities dropped and no-new-privileges; archive fetching returns output ownership to that user.

The helper authenticates MAIN APKINDEX and each APK with keys from that exact official base, then checks all 22 per-architecture APK hashes committed in the Dockerfile. Only HTTPS `https://dl-cdn.alpinelinux.org/alpine/v3.24/main` supplies APKs; no community/edge/testing runtime packages or extra signing keys are used. Exact vendor sources are archived and checked against SHA-512 from the corresponding signed APK commit APKBUILD. The 84 license/notice files have an identical manifest SHA-256 on both architectures: `ff0b7ab3ad3b2b0fdee3b6b4112b878ebabbcef661c0818c74a72660b719ad7f`.

Build from a newly prepared archive:

```sh
node scripts/prepare-docker-runtime.mjs /absolute/external/archive arm64
docker buildx build --platform linux/arm64 \
  --build-context runtime-apks=/absolute/external/archive/arm64 \
  --load --tag darktrace-mcp:local .
```

Use `amd64` in both arguments for that architecture. Preparation needs Docker and public HTTPS. Builds can reuse the archived signed APK/license context after mirrors discard old revisions; a mismatched or unavailable revision fails closed. Keep these archives permanently with an approved release; the configured CI artifact retention is only 30 days and is not permanent release storage. No release asset or registry publication occurred here.

The scratch final image preserves `/nodejs/bin/node` as a symlink to the signed package-owned `/usr/bin/node`. `PATH=/nodejs/bin` resolves only through root-owned immutable paths. The final image runs as UID/GID `1000:1000`, exposes no ports or volumes, contains no operator secret/proxy/TLS override environment variables, and ships no shell, busybox, apk, npm, CA-update utilities, production TypeScript sources, tests, helpers, OpenAPI or documentation build inputs. The exact existing application payload and three complete NPM package payloads are preserved.

All runtime library package payloads are retained conservatively, including signed OpenSSL engines/provider modules and ICU I/O. They are included in both scanners and the manual inventory. Builder-only utilities are removed and their installed-package records/file entries are removed, rather than hiding live components from scanners. The remaining 19 package records name only files present. `/etc/os-release` is explicitly synthesized for scanner identification from the pinned 3.24.2 base identity; it is not claimed to be a separately installed package file.

The Dockerfile frontend is pinned to `docker/dockerfile:1@sha256:4edf897a3ffa55b89f906fc8cc78afdb3f1834cc9c7083565e611a8a7d5fe99e`. Existing immutable official Node 22 builder stages remain solely for npm/TypeScript build and shrinkwrap dependencies; their bundled OpenSSL 3.5.8 is a recorded build-time residual and is absent from the final image. NPM never ships in the scratch runtime.

## Exact image binding

| Platform | Local immutable image/index ID | Platform manifest | Config digest used by scanners |
| --- | --- | --- | --- |
| linux/arm64 | `sha256:64d16616acaef502d121eff3f7d07d0d2100e03e1ffacd0f86f6bf81225be842` | `sha256:0f2313f021905848a79797bc293df662ed7959c28e9ab48600c97d609f984a8f` | `sha256:99a6dc212bb3584fb3b53fe04a3aa7cbe2552bd4a432f8f9381424af2e172c44` |
| linux/amd64 | `sha256:65985236cd6e606145cda32f1c1f46f4221fcedbddc32188e58643df9868dad6` | `sha256:ddfde1c10c54e0c518ae0ae9af30cea5a3856cf35cd83b202b0b101ca64c3723` | `sha256:053e3624fc349d2d8a55ff8781a9b2f75ae362b1ec5e835dbfd24bbdf13f9404` |

Per-architecture `image.tar` (`docker image save`) and exported `rootfs.tar` are retained. The original OCI index and extracted BuildKit SLSA provenance-v1 statements are archived as `oci-index.json` and `buildkit-provenance.json`; this records our image assembly, not a vendor compiler SLSA attestation. Scanner Docker-archive manifest digests can differ from the BuildKit OCI platform manifest; both scans bind to the exact config digest and rootfs DiffIDs, with the image archive hash recorded in `manual-sbom.json`.

| Platform | Image archive SHA-256 | Exported rootfs SHA-256 |
| --- | --- | --- |
| arm64 | `c18779c97d6f0f9080ecee60d35b68dbd675a3d976bcb3f448ab7ebe242e170c` | `2ac06f1eb9185e804872848e11da99fc1884f36d219c53ec3307be9358997621` |
| amd64 | `de3b78e7841043b9049f334c275d5ae5314b92ce7f062f22900c5d26cb3847c7` | `7f1e5170dcdc4f2a01a217d0766ddb9c769803a877eb4719d7c42ecb69e130c9` |

## Signed package and ELF inventory

Both architectures have the following actual runtime packages. Every package artifact hash, signed `.PKGINFO`, origin commit, build timestamp, license and actual payload file hash is in `<arch>/apk-inventory.json`; every actual file, ownership and mode is in `<arch>/rootfs-files.json`. Utility APKs are archived as fetched build inputs but their runtime packages are absent.

| Runtime package | Exact version |
| --- | --- |
| ada-libs | `3.3.0-r0` |
| brotli-libs | `1.2.0-r1` |
| c-ares | `1.34.8-r0` |
| ca-certificates | `20260909-r0` |
| ca-certificates-bundle | `20260909-r0` |
| icu-data-en | `78.1-r0` |
| icu-libs | `78.1-r0` |
| libcrypto3 | `3.5.9-r0` |
| libgcc | `15.2.0-r5` |
| libssl3 | `3.5.9-r0` |
| libstdc++ | `15.2.0-r5` |
| musl | `1.2.6-r2` |
| nghttp2-libs | `1.70.0-r0` |
| nodejs | `24.18.1-r0` |
| simdjson | `4.2.4-r0` |
| simdutf | `9.0.0-r0` |
| sqlite-libs | `3.53.4-r0` |
| zlib | `1.3.2-r0` |
| zstd-libs | `1.5.7-r2` |

The 26 actual ELF files per architecture all match the bytes of a verified signed APK. There are no unowned ELF binaries. `<arch>/elf-inventory.json` independently parses ELF machine, interpreter, DT_NEEDED, SONAME, RPATH and compiler comment. Node has no RPATH and resolves musl plus zlib, ada, simdjson, simdutf, brotli common/decoder/encoder, c-ares, nghttp2, sqlite, zstd, libcrypto, libssl, ICU i18n/uc/data, libstdc++ and libgcc. The builder `ldd` output plus execution inside the actual curated chroot proves closure. APK ownership checks require `libssl3-3.5.9-r0` and `libcrypto3-3.5.9-r0`. All files and directories are root-owned, and no setuid/setgid files exist.

Both builder and chrooted final runtime fail unless Node is exactly `24.18.1`, `node_shared_openssl === true`, and actual OpenSSL is on the **3.5 line with patch >= 9**. CI repeats the guard on the image actually launched. `<arch>/actual-runtime.json` records all actual `process.versions` components, compiler configuration, TLS defaults, FIPS, UID/GID, trusted PATH and refusal of a read-only application write. This includes embedded V8, libuv, llhttp, undici, acorn/amaro and other Node components, rather than omitting them from the manual SBOM.

Node ELF compiler comment on both architectures: `GCC: (Alpine 15.2.0) 15.2.0`. Signed metadata reports abuild `3.17.0-r0` and fakeroot `1.37.2`. Node source/recipe commit: `48d72323daf83509b541059c994366393ec68e63`; OpenSSL recipe commit: `29b9ec24b1b5b39aeef51fa2a044210e2ec5258e`. Complete public vendor Node build logs for both architectures, all package commit APKBUILDs and the source archives are preserved externally. The vendor logs show compilation against OpenSSL development headers **3.5.7-r0**; the shared ABI loads actual 3.5.9 at runtime. Some other `process.versions` values similarly reflect compile headers (nghttp2 1.69.0 and sqlite 3.53.2) while the signed loaded packages are 1.70.0 and 3.53.4. No exact reproducible vendor compiler-container digest or SLSA attestation is claimed; the evidence is signed binary provenance, source/recipe hashes, compiler comment and archived vendor build logs.

## Unchanged application and trust bytes

| NPM package | Version | Files | Frozen tree SHA-256 |
| --- | --- | ---: | --- |
| @modelcontextprotocol/core | 2.3.0 | 21 | `174b5387fb2ed22af55d657d1df27e1204a626e852835ff6d8c0393ca298c1c2` |
| @modelcontextprotocol/server | 2.3.0 | 85 | `7f2bdb59e5e0df2bd8da175f27b143b02fc3450227857996b513940786486ea0` |
| zod | 4.2.0 | 681 | `ea6dbf716fd3b87a3e3b5e71f5fe248dbc20c52d105da85ce094fe8555884606` |

`/app/package.json` remains exactly the module-only manifest and `/app/LICENSE` retains its original bytes. All 49 runtime files, including declaration files, match the frozen reviewed runtime individually on both architectures.

CA bundle: signed `ca-certificates-bundle=20260909-r0`, **121 certificates**, SHA-256 `028fca5150ee1915c4474489985d55c54fceaa680c754cc8d1301734f01b2232`; `/etc/ssl/cert.pem` points to `/etc/ssl/certs/ca-certificates.crt`. Alpine Node uses the OpenSSL default CA store. The complete vendor-node arm64 security suite exercised custom CA and fail-closed TLS cases. Separate final-scratch probes run as UID 1000 on both architectures with network none and a read-only root: 15 cases per architecture across default store, `NODE_EXTRA_CA_CERTS`, and explicit CA modes. Trusted synthetic CA succeeds only when provided; untrusted, expired, wrong-host and self-signed certificates fail before any HTTP request reaches the synthetic server. `tls-{default,extra,explicit}.json` records exact errors. Independent review still must confirm these final-image probes. No CA bypass was enabled, and no real credentials or lab calls were used by this worker. TLS defaults are TLSv1.2 minimum/TLSv1.3 maximum and FIPS remains off.

License closure: 84 checked upstream notices/texts under `/licenses`, including Node/embedded dependency notices, each shared library origin, GCC GPL/LGPL plus runtime exception, Mozilla CA MPL 2.0 and MIT notices, zlib license and SQLite public-domain blessing. NPM and project licenses remain in their original application package paths. The Dockerfile rejects any license file or directory outside the exact committed 84-file set and its required parent directories, including symlinks and special files. The final stage normalizes every notice to mode 0644 and parent directories to 0755 and asserts those modes; actual UID-1000 probes on both final images read all 84 notices (`license-readability.json`). Both an added license file and a symlink context were rejected by actual vendor-stage builds; logs are `license-{extra,symlink}-rejection.log`. The final image removes both `/lib/apk/db/scripts.tar.gz` and `/var/log/apk.log`; actual-process checks and exported-rootfs inspection confirm neither installer artifact remains.

## Validation and CI

| Gate | arm64 | amd64 |
| --- | --- | --- |
| Actual scratch Node/OpenSSL/shared linkage assertion | PASS | PASS |
| UID 1000, immutable root-owned app, write refusal, no tools/ports/secrets | PASS | PASS |
| Offline help, alpha version and protected synthetic check-config | PASS | PASS |
| Final scratch synthetic TLS (default/extra/explicit CA; five certificates each) | PASS 15/15 | PASS 15/15 |
| Complete 15-tool SDK read profile equals pinned fixture | PASS | PASS |
| Complete 15-tool SDK read+sensitive profile equals pinned fixture | PASS | PASS |
| Nine write-startup refusals (stdio/doctor/check-config) | PASS 9/9 | PASS 9/9 |
| Vendor Node 24 typecheck | PASS | PASS under emulation |
| Vendor Node 24 functional tests | 130 passed, 0 failed, 0 skipped | 130 passed, 0 failed, 0 skipped under emulation |
| Vendor Node 24 security tests | 325 passed, 0 failed, 0 skipped | BLOCKED: unchanged 120-second harness timeout under emulation; native CI pending |

Gate installations used `/private/tmp/darktrace-npm-cache` offline lockfile SRI cache with `npm ci --offline --ignore-scripts --no-audit --no-fund`. Containers used network none, a read-only root, all capabilities dropped and no-new-privileges; private tmpfs workspaces allowed executable test fixtures. No test edits, skips, filters or relaxed timeouts/assertions were used. SDK runs used only protected synthetic token files, network none, read-only launch, drop-all/no-new-privileges and complete fixture comparison; both exact profile hashes and all nine refusals are retained under each architecture.

Arm64 complete security receipt: `arm64/gates/security-evidence/2026-10-05T23-36-51-722Z.json`, SHA-256 `122ac181569e4cc6913358915d9ce7b83d63711a473acddb5f8c749aed2b5544`. The first amd64 failed emulation receipt was lost with its tmpfs; that failure is recorded as unverified. The second preserved failed receipt is `amd64/gates/security-evidence/2026-10-05T23-43-18-230Z.json`, SHA-256 `7194738cc89bf5a305c2cce1375dbe8621980cdbc1ce667250616d18654b6083`; build succeeds but the unchanged test child reports `spawnSync /usr/bin/node ETIMEDOUT`, status 1 and an incomplete receipt. It is explicitly not a passing security gate.

Native private CI is wired for `ubuntu-24.04` amd64 and `ubuntu-24.04-arm`: authenticated preparation, `vendor-checks` stage, full vendor-node gates in isolated tmpfs, exact test/pass/fail/skip counts, complete receipts, actual final runtime guards, both complete SDK fixtures, nine startup refusals and all 49 runtime byte comparisons to the vendor build. The expanded build context includes test/docs/helper inputs solely for that validation target; the scratch image excludes them. Commit-pinned upload-artifact preserves signed inputs and complete receipts even on failure. YAML, all Bash run blocks and the exact parsed JavaScript count assertions were validated against real preserved 130/325 zero-skip logs. The coordinator owns committing/pushing/running these private native jobs. CI additionally asserts the exact frozen source and complete 49-file runtime aggregates, and exactly one fresh complete security receipt; the parsed assertions passed against the preserved complete arm64 receipt.

The provisional native run **37391270956**, head `b0717a98292638f1fc1b7416d6139ced211cc700`, passed the existing offline Node 22/24 jobs but failed both Docker jobs during input preparation, before image builds or vendor gates. Both archived architecture `runtime-inputs-fetch.log` files shows all 22 APK signatures/hash inputs accepted, then `mkdir /archive/licenses/nodejs: Permission denied`: root in a drop-all-capabilities extraction container could not write into the runner-owned bind mount. The corrected helper uses the host UID/GID for extraction and restores archive ownership after root fetching without adding capabilities; both fresh architecture preparations and an arm64 rerun pass locally. A new native run on the corrected implementation is required; the failed run is not credited as a runtime or test pass. Artifacts remain under `ci-b071-native-failure/`.

## Fresh scans and reconciliation

Scans run against the exact final architecture image archives on 2026-10-06 Madrid / UTC, after database update checks. Trivy **0.74.0**, database updated `2026-10-05T13:07:51.292695513Z` (next update 2026-10-06T13:07:51Z), and Grype **0.118.0**, database built `2026-10-05T06:45:38Z`, schema v6.1.10, are recorded with database metadata. Original unmodified JSON outputs are `<arch>/trivy.json` and `<arch>/grype.json`. No suppression, ignore file, VEX waiver or severity filtering is applied.

| Finding | Both-architecture result | Reconciliation |
| --- | --- | --- |
| Trivy OS and NPM findings | 0 | Inventory independently contains all 19 actual OS packages, all three NPM packages, all Node embedded components and all 26 ELF files. A zero scanner result alone does not establish safety. |
| OpenSSL CVE-2026-35189 and September advisories | No findings; actual runtime 3.5.9 | [Primary OpenSSL advisory](https://openssl-library.org/news/secadv/20260929.txt) fixes the 3.5 line at 3.5.9. Signed libssl/libcrypto payload ownership, shared linkage and actual runtime execution establish the fixed version despite Alpine secdb lacking the new 3.5.9 entry. |
| Grype CVE-2026-85091, **High**, zlib 1.3.2-r0 | Present | **Unfixed library finding; final acceptance decision pending.** Signed MAIN package uses unmodified upstream 1.3.2; current 3.24 stable recipe has no relevant backport. [Upstream issue 1310](https://github.com/madler/zlib/issues/1310) maintainer confirms the defect is fixed by `df84af25dc1942490e1d1c899a07619152a46148`, which is not in the pinned source. No fixed maintained MAIN package was identified. No waiver, source compilation, downgrade or package omission is used. The independent reviewer separately traced Node/application call paths and reports that the affected gzip `gz*` APIs are unreachable from this application; that review does not patch the retained library, remove the raw finding, or itself authorize publication. |
| Grype CVE-2024-9410, Medium, ada-libs 3.3.0-r0 | Present | Apparent CPE product collision: [the originating Tenable advisory](https://www.tenable.com/security/research/tra-2024-41) concerns Ada.cx SaaS Sentry SSRF; the signed package is [ada-url/ada](https://github.com/ada-url/ada), a C++ WHATWG URL parser. Original finding remains visible; independent reviewer confirmation is required. |

Primary advisory, Alpine secdb, current stable zlib recipe, upstream issue/comments, release schedules and all scanner database receipts are archived externally. The raw High zlib finding remains visible and unfixed; independent reachability reconciliation and the coordinator’s acceptance decision remain pending even though the original OpenSSL 3.5.8 blocker is removed.

## Support and outstanding acceptance

Alpine MAIN 3.24 support ends **2028-06-01**; Node 24 Krypton ends **2028-04-30** and begins upstream maintenance on 2026-10-20. Vendor support is from Alpine, not a promise of upstream Tier 1 musl support: Node 24 BUILDING.md lists x64 musl as Experimental and does not list arm64 musl as a Tier 1 platform. This image uses trimmed English ICU data. NPM is builder/validation-only, so the shorter community support window does not apply to any final runtime package. See archived [Alpine releases](https://alpinelinux.org/releases.json), [Node schedule](https://github.com/nodejs/Release/blob/main/schedule.json) and [Node platform support](https://github.com/nodejs/node/blob/v24.18.1/BUILDING.md).

These IDs are the final F1/F2/F7 review respin. Original evidence remains under `pre-review-respin/`; intermediate F1/F2 images and evidence remain under `pre-license-mode-respin/`. Root previously ran all 19 real lab selectors successfully against the prior arm64 image, but that result is not rebound here to the new image; the coordinator owns reconfirmation against this exact final image.

Ready handoff was sent to the coordinator and independent reviewer before this report. Final image IDs, source/runtime/package hashes, context paths, complete inventories, exported rootfs/images and scan/SDK receipts are available for independent rebuild and the root-owned 19-query lab campaign. Outstanding gates include final independent reconciliation of the unfixed zlib High finding, native amd64 complete security/CI results, independent final-image TLS and supply-chain review, real lab validation, and final docs/package/version/approval work. This worker has not approved stable publication or performed any Git/tag/release/npm/GHCR operation.
