# First stable artifact finalization

Date: 2026-10-06. Private `1.0.0` artifacts are prepared and validated; this worker performed no Git or publication operations. Root controls final independent acceptance and the private release.

## Deliberate metadata diff

Ownership: package.json, package-lock.json, explicitly authorized npm-shrinkwrap.json root versions, src/server/createServer.ts VERSION literal, CHANGELOG.md, two exact CI aggregate assertions, and this report. `private: true` remains set. Structural comparisons prove all dependency objects, resolved URLs and SRI values unchanged. The only production source delta is `server/createServer.ts`; compiled deltas are `server/createServer.js` and `server/createServer.d.ts`, containing only the version literal. No behavior, tools, selectors, profiles, immutable false writes, fixture, helper, test, timeout or skip policy changed. Historical evidence remains untouched.

- New 28-source aggregate: `582a12121e7e9bb3844d527556ad62dfc5c0ed8f8c6ba57f64aad0ccee07f72c`.
- New complete 49-runtime aggregate including declarations: `054a25fa1ff349a8ad7a84dd03e2f891ddf6f762b4472bdcec0f36f22d52d16f`.
- Exact fixture remains `6ddda2054c9c708d0516a90b7811eb0aba565016403953dace89d47bc89d213c`.
- Both full ordered SDK profiles remain `cd4ee42249a9110182046794c39fc00f5995700b7d751bccc6628e86afbddfe3`: 15 tools, 19 selectors, immutable false writes.
- Exact diff, file hashes and source/runtime maps: `/private/tmp/darktrace-first-stable-ctx_9a97f372cc6d/version-only.diff`, `metadata-hashes.json`, `source-hashes.json`, `runtime-hashes.json`.

## Frozen package

`darktrace-mcp-1.0.0.tgz` SHA-256: **`3abf8b7a5be5a0d56b23529c62a883fbf49a28cb08a6e606d6ac3fcb9916b37b`**. Two explicit builds produce identical archive bytes; installed files match the archive, the module package stays private, and exactly three runtime NPM libraries retain original versions and SRI. Installed SDK initialize reports server `1.0.0`; both full listings equal the pinned oracle, and all nine write-startup refusals pass. These SDK probes execute the installed tarball under the signed vendor Node 24.18.1 Linux arm64 runtime with read-only mounts and network none.

Shipped documentation freeze verified before packing:

- README.md: `d7e3c7962ace382baafeac9d0635b365937be54816aefa5babd50245175c1215`.
- README.es.md: `c3d51961e9f3dd42cc8cc4918202ce3a50743c7ad6f667eaee084a1ed6fa2a52`.
- SECURITY.md: `60115ab08ed1a1cd405ab0d96b133a834a72f773325dd194417b4bcd1afec633`.

The unchanged preparation helper fully passes under vendor Node 24.18.1 on Linux arm64: typecheck, 130 functional and 325 security tests, zero failures/skips, reproducibility, complete security receipt, installed bytes/SRI, exact three dependencies, fixture equality, help/version/doctor/check-config, nine startup refusals, and JSON/TOML/examples validation. Complete canonical assets and checksums are in `package-results/package-final/`. The first run stopped after successful package/installed checks because the external validation container lacked Python; its receipts remain under `package-results/package/`. A dedicated external validation image adds Python from the digest-pinned Alpine base without changing production images, source, helpers or assertions. The second run finishes every original helper check. An auxiliary installed-tree copy after helper success hit a Docker Desktop permission error; a fresh offline exact-tarball installation supplies the successful SDK probes. None of these environment errors is represented as a passing command.

## Final images

Recipe SHA-256 remains `4799ba3b9cdd464a0c27239b1a4e05c6c7ba5bf75fde0559d4ba2e3d2319a769`, using the previously verified signed APK/license archives. Node 24.18.1 uses shared OpenSSL 3.5.9; both images preserve the reviewed nonroot UID 1000, root-owned immutable app, trusted PATH, no shell/npm/apk/ports/secrets, complete loader/library/CA/license closure, 19 accurate OS package records, 26 signed package-owned ELF files and the exact three original NPM payloads. Each complete image runtime equals the new 49-file aggregate individually. Every ELF/NPM/CA byte equals the accepted predecessor; the app version literal, its declaration and the generated hidden NPM lock’s top-level version differ. The hidden lock is structurally identical after substituting only its root version to `1.0.0`; all dependency payloads and lock entries remain byte-identical.

| Architecture | Immutable local image/index | Scanner-bound config digest | gzip-n archive SHA-256 |
| --- | --- | --- | --- |
| arm64 | `sha256:bc0a29b49347c2ed21557b34193a2b8aa26017c8459c526665e09ee632a03f92` | `sha256:1f285a9b520d63832c8bf89428922ea145e2b3870556e1eb34447ba80341ac91` | `8c0d7c8ddb18c4d20d38802105ebe4d55a1018242ad074206314e77e064cfe5e` |
| amd64 | `sha256:59a490c78a08b63e6757a7d872526a16b60cd119efc2240e607a97581844c0a3` | `sha256:95edccf4ea47e5d094dd9ab80186a6a1e26c6cefc203c51bcf870ec038044aa0` | `3594f1051a1f334603681b3869b25dbe9b0c52e6ec5e243b39b457e775a86cad` |

Archives are `darktrace-mcp-1.0.0-linux-arm64.tar.gz` and `darktrace-mcp-1.0.0-linux-amd64.tar.gz`, produced with actual `gzip -n` from Docker save archives. Verified embedded tags are `darktrace-mcp:1.0.0-arm64` and `darktrace-mcp:1.0.0-amd64`; OCI indexes bind to the IDs above. All actual UID-1000/shared-SSL guards, help/version, protected synthetic check-config, four complete SDK profiles and nine startup refusals per architecture pass. SDK server metadata is `1.0.0`. Fifteen final-image synthetic TLS cases per architecture pass, preserving CA validation and rejecting wrong-host, untrusted, expired and self-signed certificates before HTTP reaches the local server. No live credentials, appliance queries or TLS bypass was used.

## Fresh scans, native CI and acceptance

Fresh unmodified Trivy 0.74.0 and Grype 0.118.0 outputs bind to the exact config digests above. Trivy reports zero OS/NPM findings; Grype retains CVE-2026-85091 High on unchanged signed zlib 1.3.2-r0 and CVE-2024-9410 Medium product collision on ada-url. No suppression or waiver is used. Dated database descriptors, every retained OS/NPM/Node-embedded component and all ELF/CA payloads are in each architecture's complete manual SBOM and raw scanner outputs. The independent applicability review and coordinator decision apply by unchanged ELF/NPM bytes; final version-only artifact review remains the reviewer's responsibility. See [independent runtime review](patched-runtime-independent-review.md), [coordinator decision](first-stable-coordinator-decision.md) and [final stable gate review](final-stable-gate-review.md).

Final frozen-doc/stable native CI [run 37423665585](https://github.com/nuoframework/darktrace-mcp/actions/runs/37423665585) at `2adb84b6a076cf6018fb5723659aac57c8070e4e` is **all four jobs successful**: offline Node 22/24 and native Docker amd64/arm64. Native vendor gates require 130/325 with zero Linux skips, one complete receipt, exact fixture and source/runtime aggregate assertions. `native-ci-final.json` preserves the full successful job/step binding. The root/reviewer own archived native receipts and final private publication decision.

The user terminated the lab. The successful 19-selector campaign and its exact historical image binding remain in [the lab checkpoint](patched-runtime-lab-checkpoint.md); no claim is made that rebuilt 1.0.0 images were run against that closed lab. Final images were tested synthetically only. No new live campaign is requested.

Final package/image assets, canonical package evidence, small sanitized security/provenance archive and complete file checksums are under `/private/tmp/darktrace-first-stable-ctx_9a97f372cc6d/assets/`. The small evidence archive contains exact per-architecture image binding, complete SBOM/inventories, raw scans, actual runtime/TLS/SDK receipts, BuildKit assembly provenance, version diff/pins, native CI status and applicability-review pointers; no secrets, telemetry, raw lab outputs or bulky vendor sources are included. Original fetched signed APKs, upstream source/license archives and earlier receipts remain separately preserved externally for reproducibility. Support limits remain those in [the reviewed runtime implementation](patched-runtime-implementation.md).

The unchanged release verifier requires its canonical nine-entry `SHA256SUMS`; that manifest is preserved verbatim. `all-artifacts.SHA256SUMS` additionally binds every package/image/evidence asset without changing the verifier or its assertions.
