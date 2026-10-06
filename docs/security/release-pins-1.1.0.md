# Release pins: 1.1.0 candidate

The final tree's release and CI gates are consistent. No production source, dependency, Docker runtime input or runtime behavior was changed by this work. All changes are release checks, contract capture, documentation and evidence. This is a local candidate verification; no publication or push was performed.

**E11 remains open: the regenerated full-API contract fixture needs independent review before release approval.** Deterministic regeneration, passing tests and matching pins do not supply that review. See [CHANGES-core §8.11 E11](../CHANGES-core.md#811-exceptions-and-open-conflicts).

## Deterministic contract capture

After `npm ci --ignore-scripts`, `npm run build` and the initial tests, run:

```sh
node test/security/mcp-contracts.mjs --capture
```

This calls the project's `toolContract(profile)` SDK generator for six operator profiles and both approval-description variants, captures twice and asserts identical bytes before writing. The regenerated fixture is byte-identical to the pre-existing full-API fixture in this worktree; no hand edits were made. Its release pins were stale. Array order is preserved and recursive object keys are sorted for each tools/list hash.

## Changed pins (old → new)

Locations below use the final files' line numbers. An absent pin is shown as `absent`.

| Pin | Old → new | Location |
|---|---|---|
| Linux functional tests/pass | 149 → 213 | `.github/workflows/ci.yml:73` |
| Linux security tests/pass | 1127 → 1150 | `.github/workflows/ci.yml:73` |
| Security receipt subcases | 1127 → 1150 | `.github/workflows/ci.yml:299` |
| Production source tree SHA-256 | `099c3244a455353ac2b9b467e0380d3578cbefa5366a157c8eaae82bb44f9125` → `5b1208f1c0994996f698803a0468f7b25a3b256fe033bbe20ad50ad50fdc503e` | `.github/workflows/ci.yml:298` |
| Runtime file count | 53 → 91 | `.github/workflows/ci.yml:301`, `.github/workflows/ci.yml:305` |
| Runtime aggregate SHA-256 | `99e8fdcdf437e583f6697a7810115114ba1505d27d5f129deabe26be36a454f9` → `3bd374dcf7225557ba56d4737e381698a0e0a4bccf03cc00d62f00ced84c7284` | `.github/workflows/ci.yml:302` |
| Full-API fixture SHA-256 | `c95104ced1955b7a1bdc72a6e19bc79c3d1a3e0ee39114e7eabf7fa71545fd3b` → `df8ca493e50a9f8eef2dd883c8e7a4f3b36b2effa0cba72cf36ed07ab488ded5` | `.github/workflows/ci.yml:228`, `.github/workflows/ci.yml:303`, `scripts/verify-release.mjs:15`, `scripts/verify-release.mjs:92` |
| Production route descriptor count | 78 → 77 | `scripts/verify-release.mjs:110` |
| Implemented critical-operation oracle | 6 operations including blocked email action → 5 implemented operations; blocked email route explicitly absent | `scripts/verify-release.mjs:27`, `scripts/verify-release.mjs:111` |
| Operator profile oracle | 5 → 6, adding `read+sensitive+write` | `test/security/mcp-contracts.mjs:17` |
| Capture/evidence profile scope | 5 → 6 operator profiles + 2 approval-description variants | `scripts/verify-release.mjs:113`, `scripts/verify-release.mjs:114`, `scripts/prepare-release.mjs:58` |

The single added MR-04 union snapshot test increases the initial macOS security total from 1149 to 1150. Functional tests remain 213. Linux security passes equal macOS passes + skips: 1147 + 3 = 1150; this was also verified in the native Linux vendor stage. Linux gates still require zero skipped and failed cases.

| Profile tools/list SHA-256 | Old → new | Location |
|---|---|---|
| `read` | `afeb056eb4e1830462256436948ceaa706601d14ade6ebc7f36ab00cda011964` → `734a9e33dd8632df6efa4ec7b81c3f313d85dfbb478af3128bd3aec4f0b6833a` | `scripts/verify-release.mjs:24`, `.github/workflows/ci.yml:169` |
| `read+sensitive` | `ca4ebd6b4d640aae3571ad3d68e18bd489ae39f02b980188a554dfb989462d6a` → `d885ce0e247f9dc7d55c7f27ed67be4396ffd8b35b2c7a6faf18d3f6a051b046` | `scripts/verify-release.mjs:24`, `.github/workflows/ci.yml:170` |
| `read+write` | `9d55533f6fff2982f3aa0414687a259c1d042cc7aa267a0106126a4ea7d4e39b` → `1820b2b88e685e8058a79d26d97acf9f19f3d47a90cfd9e0862f4b37ce294f22` | `scripts/verify-release.mjs:24`, `.github/workflows/ci.yml:171` |
| `read+write+critical` | `f22cee1aefb944c8be6b683f251951a965d9d94dd0b9ff872a5c06cc69bd062b` → `c5372a1b21079709f4f2766df8c298bd8e91151aa5c417fc2703c734d12c0aae` | `scripts/verify-release.mjs:24`, `.github/workflows/ci.yml:172` |
| `all` | `b377eac60a2eed8233d8481b0b69074e79eac6a537b8e1b4ec1e47a5b2abf859` → `90c0a24a18ed849bec6bb8f6c9a6a7a2a2672121c0ed5d1fcbe8fad206e5f53d` | `scripts/verify-release.mjs:24`, `.github/workflows/ci.yml:173` |
| `read+sensitive+write` | `absent` → `3ccf0ef5ace7817dfb69fdb83893dab1baa36911bf3cbb906062dae26ca5b64b` | `scripts/verify-release.mjs:24`, `.github/workflows/ci.yml:174` |
| `read+write+critical/critical-host` | `absent` → `f1b5457452b52acb25a9fe37df152d1a88f542580d3b8eadd73bae183a7ae646` | `scripts/verify-release.mjs:24`, `.github/workflows/ci.yml:175` |
| `read+write/write-elicitation` | `absent` → `cbd4ac4d9f9f904591ad905f8c3be9244614c982a8d511b9f1102457a968e5bd` | `scripts/verify-release.mjs:24`, `.github/workflows/ci.yml:176` |

| Profile tools / operations | Old → new | Location |
|---|---|---|
| `read` | 27/38 → 27/38 | `scripts/verify-release.mjs:26`, `.github/workflows/ci.yml:169` |
| `read+sensitive` | 36/56 → 36/56 | `scripts/verify-release.mjs:26`, `.github/workflows/ci.yml:170` |
| `read+write` | 36/54 → 36/54 | `scripts/verify-release.mjs:26`, `.github/workflows/ci.yml:171` |
| `read+write+critical` | 42/60 → 41/59 | `scripts/verify-release.mjs:26`, `.github/workflows/ci.yml:172` |
| `all` | 51/78 → 50/77 | `scripts/verify-release.mjs:26`, `.github/workflows/ci.yml:173` |
| `read+sensitive+write` | absent → 45/72 | `scripts/verify-release.mjs:26`, `.github/workflows/ci.yml:174` |
| `read+write+critical/critical-host` | absent → 41/59 | `scripts/verify-release.mjs:26`, `.github/workflows/ci.yml:175` |
| `read+write/write-elicitation` | absent → 36/54 | `scripts/verify-release.mjs:26`, `.github/workflows/ci.yml:176` |

Unchanged rows are included to show the complete profile matrix. The summary in `docs/CHANGES-core.md:49` also changes critical 42/60 → 41/59, all 51/78 → 50/77, and adds the union 45/72.

Additional gate alignment: the 600-character description budget now excludes only the exact fixed AD-W-18 notice on union profiles, as the existing functional test already requires. Installed-package and Docker smoke checks set the required union acknowledgement, check both approval channels, and cover all eight contracts. Invalid-profile smoke checks expect the existing `reason` field. Approval variant receipt names replace `/` with `-` to keep them regular files. No runtime descriptions, approvals, schemas or annotations were changed.

Historical first-stable and alpha fixtures, their SHA-256 pins, and all historical provenance manifest pins remain untouched:

- First-stable: `6ddda2054c9c708d0516a90b7811eb0aba565016403953dace89d47bc89d213c`.
- Alpha: `37b5af95de1786ecce1b8762e12d2d63e577f171511a9db4964518b13a917f72`.

## Evidence and completed checks

| Environment | Functional total / pass / fail / skip | Security total / pass / fail / skip |
|---|---|---|
| macOS arm64, Node 24.14.1 | 213 / 213 / 0 / 0 | 1150 / 1147 / 0 / 3 |
| Linux arm64 vendor, Node 24.18.1, shared OpenSSL 3.5.9 | 213 / 213 / 0 / 0 | 1150 / 1150 / 0 / 0 |

Byte-preserved complete security receipts:

- [release-1.1.0-macos-arm64-2026-10-06T13-06-41-906Z.json](../../test/security/evidence/release-1.1.0-macos-arm64-2026-10-06T13-06-41-906Z.json): SHA-256 `5699ae236eac58006e3773755d214afd117edff5d8ee99e29192c02bd2bf0736`.
- [release-1.1.0-linux-arm64-2026-10-06T12-43-25-292Z.json](../../test/security/evidence/release-1.1.0-linux-arm64-2026-10-06T12-43-25-292Z.json): SHA-256 `cd71cecdda097d8003e7d4c311baedbbd3ee87616900f90c85664f5ac265dad9`.

Both receipts have `receiptComplete:true`, successful build/test status, 1150 subcases, production `sourceTreeSha256` `5b1208f1c0994996f698803a0468f7b25a3b256fe033bbe20ad50ad50fdc503e`, and 91 runtime hashes. The aggregate is exactly SHA-256 of `JSON.stringify(runtimeHashes)` (object insertion order preserved): `3bd374dcf7225557ba56d4737e381698a0e0a4bccf03cc00d62f00ced84c7284`. All fixture hashes agree. The source binding covers `src/`; the receipt commit identifies its base revision, while these release gate edits were uncommitted during verification.

Complete preparation succeeded in `/private/tmp/claude-501/-Users-nuofrwk-Documents-darktrace-mcp/0897ccdd-e7ca-496b-9c63-9d79a5db4291/scratchpad/release-1.1.0/final-2` with a clean npm install, typecheck, tests, security checks, two byte-identical builds/packs, archive install/SRI/SBOM verification, eight profile/approval checks, historical provenance checks and example validation. `release:prepare` invokes full `verify-release.mjs` itself; a separate `npm run release:verify -- <archive> <output> --check-evidence` also passed all nine checksum assets.

- Archive: `nuoframework-darktrace-mcp-1.1.0.tgz`, SHA-256 `c162785897f7299abfc1698e8e03321545884d57cdece8fee3f2ae6e32860abf`.
- Prepared `security-receipt.json` SHA-256: `5699ae236eac58006e3773755d214afd117edff5d8ee99e29192c02bd2bf0736` (identical to the committed macOS receipt).
- `build-evidence.json` SHA-256: `230e35f31fa41006764362d9d5d80130d96c4b704591efea3fc5b9e5e8a169ee`.
- `verification.json` SHA-256: `68cbcab82e1920b9efec3a7dc2d7650108c9928f49afc5ce522b2cc326554ff6`.
- `SHA256SUMS` SHA-256: `31a2cfae3588df034017775e5733bfd73f7acd9507ac4dee132f66260e3346e8`.

The initial sandbox run could not bind loopback TLS servers; the successful macOS runs used the required access. Two attempts hit intermittent security harness timeouts and were superseded by the complete preparation above; no timeout or failing receipt was accepted.

## Docker evidence

Authenticated inputs were prepared using `scripts/prepare-docker-runtime.mjs` at the requested scratchpad `docker-runtime/arm64` location. The image was built with `docker buildx build --platform linux/arm64 --build-context runtime-apks=<inputs>/arm64 --load --tag darktrace-mcp:1.1.0-rc .`.

Image ID (`docker image inspect --format '{{.Id}}' darktrace-mcp:1.1.0-rc`): `sha256:7e5a2a410cce692efb1dc0848ad040424fccf66d1c7d482003ca5fbeaadd6aad`.

CI's local checks passed: configuration inventory (nonroot user, entrypoint, no ports/secrets), help/version, vendor Node/shared OpenSSL, root-owned runtime inventory, protected synthetic-token `--check-config`, SDK initialize/tools/list for every fixture entry, doctor/config checks per profile and approval channel, and critical-without-write startup refusals. Runtime checks used `--network none`, a read-only filesystem and dropped capabilities. The native `vendor-checks` stage passed typecheck and both suites; the workflow's final byte-binding assertion matched the Linux receipt to the actual image's runtime hashes and every updated pin.

Local raw Docker logs/results: `/private/tmp/release-pins-docker-runtime.log`, `/private/tmp/release-pins-docker-build.log`, `/private/tmp/release-pins-vendor-build.log`, `/private/tmp/release-pins-image-checks.log`, `/private/tmp/release-pins-byte-binding.log`, and `/private/tmp/release-pins-image-results/vendor-results/`. This checks Linux arm64 locally; amd64 and the Node 22 matrix remain for CI.
