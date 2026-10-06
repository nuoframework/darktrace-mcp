# Release pins: 1.1.2

Version 1.1.2 is cut from `main` at `a287e3a03578878c843bf43a2fea20e7c3963019` (PRs #13 to #17 merged). This record follows the recomputation procedure in [release-pins-1.1.1.md](release-pins-1.1.1.md). The first two sections were written on the branches before they merged (the installer branch `feat/setup-docker-easy`, PR #13, and the supply-chain branch `chore/scorecard`, PR #15) and are kept as history; the [final section](#release-commit-final-pins) binds the release commit, whose only production source change relative to `a287e3a` is the version literal in `src/server/createServer.ts`.

## Installer branch (PR #13, history)

This section covers the installer changes on branch `feat/setup-docker-easy`: the self-service Docker path in `setup`, the container `--check-config` in `test` / `doctor --online`, the URL prompt without a saved default, and the new `uninstall` command (alias `remove --all`). Only `src/cli/` changed in production source, plus tests and documentation. The package version literal was still `1.1.1`; no tag, publication or release was performed.

### Pin recomputation

Ran `npm run lint`, `npm run typecheck`, `npm test` and `npm run test:security` after the last source change. The source binding covers `src/`. Runtime aggregate SHA-256 is exactly SHA-256 of `JSON.stringify(runtimeHashes)`, preserving insertion order; it was also recomputed directly from `dist/src` with the CI hashing function and matches the receipt.

Receipt: [2026-10-06T20-07-36-725Z.json](../../test/security/evidence/2026-10-06T20-07-36-725Z.json), SHA-256 `b8c9463044c4bbcbfff712c64843c2715ca528060cf92fb5462b506e962fea97`. It records `receiptComplete:true`, successful build/test status, 1150 subcases, 95 runtime hashes and the source binding below. Its base commit is `fe624777dfd41455337dc5e67c68745f53749645`; the branch changes were uncommitted during this check.

### CI pins (old → new)

| Pin | Old → new | Locations |
|---|---|---|
| Functional tests / Linux passes | 230 → 245 | `.github/workflows/ci.yml` |
| Security tests / Linux passes / receipt subcases | 1150 → 1150 (unchanged) | `.github/workflows/ci.yml` |
| Production source tree SHA-256 | `b4b5d68c4fe26b4c4db52b5ed1b8863d6228fa182970779e2e07bea6fe8a7eb3` → `98e58ced6311366e666077de7878cf0e4eed3f504535373cc464effdb540f9ad` | `.github/workflows/ci.yml` |
| Runtime files | 91 → 95 | `.github/workflows/ci.yml` (assertion and `byte-binding.json`) |
| Runtime aggregate SHA-256 | `6fa8d03ebf3e95003ca63213c074605248bfb691c8d3e76898f4e6fb75823972` → `3eb5f9740d4c995849d736160bbdfed98c90433bdfda42f47cc6877e511e38ad` | `.github/workflows/ci.yml` |
| Full-API fixture SHA-256 | `86083b272bb9456f193427d9f4432817ae3b5e2a3ff8a30fcc68c72c25b66fb6` (unchanged) | `.github/workflows/ci.yml`, `scripts/verify-release.mjs` |
| First-stable fixture SHA-256 | `6ddda2054c9c708d0516a90b7811eb0aba565016403953dace89d47bc89d213c` (unchanged) | `.github/workflows/ci.yml` |

The 15 new functional tests are in `test/cli/docker-setup.test.ts` (9) and `test/cli/uninstall.test.ts` (6). The four new runtime files are the compiled `src/cli/docker.ts` and `src/cli/uninstall.ts` outputs. Tool contracts, profile `tools/list` hashes and profile tool/operation counts are unchanged: no file under `src/policy`, `src/config`, `src/client`, `src/tools` or `src/server` changed.

### Completed checks

| Environment | Functional total / pass / fail / skip | Security total / pass / fail / skip |
|---|---|---|
| macOS arm64 | 245 / 245 / 0 / 0 | 1150 / 1147 / 0 / 3 |

The three security skips are the existing macOS setgid-mode cases; Linux CI still requires 1150 passes and zero skips. Local checks do not establish a Linux or Docker CI result.

- `npm run lint`, `npm run typecheck`, `npm test` and `npm run test:security`: passed.
- `node scripts/validate-examples.mjs`: passed (9 JSON examples, 1 TOML example, 8 documents).

### Files changed

- `.github/workflows/ci.yml`
- `CHANGELOG.md`
- `README.md`, `README.es.md`
- `docs/CHANGES-install.md`, `docs/clients.md`, `docs/es/clients.md`, `docs/docker.md`
- `docs/security/release-pins-1.1.2.md`
- `src/cli/clients.ts`, `src/cli/docker.ts` (new), `src/cli/help.ts`, `src/cli/main.ts`, `src/cli/online.ts`, `src/cli/setup.ts`, `src/cli/state.ts`, `src/cli/uninstall.ts` (new)
- `test/cli/date-format.test.ts`, `test/cli/docker-setup.test.ts` (new), `test/cli/helpers.ts`, `test/cli/sensitive-write.test.ts`, `test/cli/setup.test.ts`, `test/cli/uninstall.test.ts` (new)
- `test/security/evidence/2026-10-06T20-07-36-725Z.json`

## Supply-chain branch (PR #15, history): signed releases and property-based tests

Branch `chore/scorecard` adds no production source: `src/` is unchanged, so the source tree SHA-256, the runtime file count and the runtime aggregate SHA-256 above still apply. It adds `fast-check` 4.10.2 as an exact development dependency (both lockfiles updated and byte-identical) and 22 property-based tests in `test/unit/validation-properties.test.ts` (9), `test/unit/signer-properties.test.ts` (7) and `test/unit/canonical-properties.test.ts` (6). Workflow changes (release signing, the pinned npm fallback, `sign-release.yml`, the Scorecard token) do not affect any pin.

Ran `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:security` and `node scripts/validate-examples.mjs` from `7ccfa798ccef9c385f3f292c6728a754cf388ead` (main after PR #13) with the branch changes uncommitted.

Receipt: [2026-10-06T20-31-32-550Z.json](../../test/security/evidence/2026-10-06T20-31-32-550Z.json), SHA-256 `ed9b12452199d725015eafb84f8c141846d618755f76dccb720cbaf06580d681`. It records `receiptComplete:true`, successful build/test status, 1150 subcases, 95 runtime hashes and source tree `98e58ced6311366e666077de7878cf0e4eed3f504535373cc464effdb540f9ad`, identical to the receipt above.

| Pin | Old → new | Locations |
|---|---|---|
| Functional tests / Linux passes | 245 → 267 | `.github/workflows/ci.yml` |
| Security tests / Linux passes / receipt subcases | 1150 → 1150 (unchanged) | `.github/workflows/ci.yml` |
| Production source tree SHA-256 | `98e58ced6311366e666077de7878cf0e4eed3f504535373cc464effdb540f9ad` (unchanged) | `.github/workflows/ci.yml` |
| Runtime files / runtime aggregate SHA-256 | 95 / `3eb5f9740d4c995849d736160bbdfed98c90433bdfda42f47cc6877e511e38ad` (unchanged) | `.github/workflows/ci.yml` |

| Environment | Functional total / pass / fail / skip | Security total / pass / fail / skip |
|---|---|---|
| macOS arm64 (Node 24.14.1) | 267 / 267 / 0 / 0 | 1150 / 1147 / 0 / 3 (the existing macOS setgid-mode skips) |

## Release commit: final pins

The release branch `release/1.1.2` sets the version to 1.1.2 in `package.json`, `package-lock.json`, `npm-shrinkwrap.json`, `manifest.json`, `server.json` and `src/server/createServer.ts`, moves the changelog's unreleased entries under `1.1.2 — 2026-10-06`, and updates the install snippets, `SECURITY.md` and `docs/releases.md`. The version literal is the only production source change, so the source tree SHA-256 and the runtime aggregate move; every count, contract hash and fixture hash is unchanged.

Ran `npm ci --ignore-scripts`, `npm run build`, `npm test` and `npm run test:security` after the version bump. The source binding covers `src/`. Runtime aggregate SHA-256 is exactly SHA-256 of `JSON.stringify(runtimeHashes)`, preserving insertion order; it was recomputed directly from `dist/src` with the CI hashing function and matches the receipt.

Receipt: [2026-10-06T21-20-32-905Z.json](../../test/security/evidence/2026-10-06T21-20-32-905Z.json), SHA-256 `dc8d1373607e675d4c3c740d0c53bbab6435396d417b9ec05bb194eef4690f13`. It records `receiptComplete:true`, successful build/test status, 1150 subcases, 95 runtime hashes and the source binding below. Its base commit is `a287e3a03578878c843bf43a2fea20e7c3963019`; the release edits were uncommitted during this check.

### CI pins (old → new)

| Pin | Old → new | Locations |
|---|---|---|
| Functional tests / Linux passes | 267 → 267 (unchanged) | `.github/workflows/ci.yml` |
| Security tests / Linux passes / receipt subcases | 1150 → 1150 (unchanged) | `.github/workflows/ci.yml` |
| Production source tree SHA-256 | `98e58ced6311366e666077de7878cf0e4eed3f504535373cc464effdb540f9ad` → `d6d76aa987abc61d4aee924b691a39f8c64492c6f64b53657f42b50cc6e86e30` | `.github/workflows/ci.yml` |
| Runtime files | 95 → 95 (unchanged) | `.github/workflows/ci.yml` (assertion and `byte-binding.json`) |
| Runtime aggregate SHA-256 | `3eb5f9740d4c995849d736160bbdfed98c90433bdfda42f47cc6877e511e38ad` → `333711e86ab16ddf888f120a7a63b59af5955abe9f95740c8b811def1624e5d3` | `.github/workflows/ci.yml` |
| Full-API fixture SHA-256 | `86083b272bb9456f193427d9f4432817ae3b5e2a3ff8a30fcc68c72c25b66fb6` (unchanged) | `.github/workflows/ci.yml`, `scripts/verify-release.mjs` |
| First-stable fixture SHA-256 | `6ddda2054c9c708d0516a90b7811eb0aba565016403953dace89d47bc89d213c` (unchanged) | `.github/workflows/ci.yml` |

The eight profile `tools/list` hashes and the profile tool/operation counts recorded for 1.1.1 are unchanged: no file under `src/policy`, `src/config`, `src/client`, `src/tools` or `src/server` other than the version literal changed since 1.1.1, and the `tools/list` canonical hash does not include the server version. `scripts/prepare-release.mjs` has no release-specific hash or count pin.

### Completed checks

| Environment | Functional total / pass / fail / skip | Security total / pass / fail / skip |
|---|---|---|
| macOS arm64, Node v24.14.1 | 267 / 267 / 0 / 0 | 1150 / 1147 / 0 / 3 |

The three security skips are the existing macOS setgid-mode cases; Linux CI still requires 1150 passes and zero skips.

- `npm run lint`, `npm run typecheck`, `npm test` and `npm run test:security`: passed.
- `node scripts/validate-examples.mjs`: passed (9 JSON examples, 1 TOML example, 8 documents).
- `node scripts/generate-tools-doc.mjs --check`: passed.
- `npx -y @anthropic-ai/mcpb@2.1.2 validate manifest.json`: manifest schema validation passes.
- `actionlint .github/workflows/ci.yml`: passed (only the two byte-binding pins changed).

GitHub Releases use tag `vX.Y.Z` and title `Darktrace MCP vX.Y.Z` ([release naming](../releases.md#release-naming)); for this version, tag `v1.1.2` and title `Darktrace MCP v1.1.2`.

### Docker evidence (linux/arm64, local)

The `docker` job of `ci.yml` was replayed locally for `linux/arm64` on Docker Desktop 29.8.1, step by step from the workflow file with the updated pins. Authenticated runtime inputs were prepared with `scripts/prepare-docker-runtime.mjs`; the image was built with `docker buildx build --platform linux/arm64 --build-context runtime-apks=<inputs>/arm64 --load --tag darktrace-mcp:1.1.2-rc .`.

Image ID (`docker image inspect --format '{{.Id}}' darktrace-mcp:1.1.2-rc`): `sha256:9d71b972f5f1501f2e1ae03f9de5cc545accd3f9087e78ffa3280d86f1946a23`.

Every step passed: the native `vendor-checks` stage (typecheck, 267/267 functional, 1150/1150 security with zero skips on Alpine Node 24.18.1 with shared OpenSSL 3.5.9), the image configuration inventory (nonroot user, entrypoint, no ports or secrets), `--help` and `--version` (`1.1.2`), the vendor Node and shared OpenSSL check, the root-owned runtime inventory, the protected synthetic-token `--check-config`, the SDK `initialize` and `tools/list` smoke for all eight pinned contracts with `doctor` and `--check-config` per profile, the critical-without-write startup refusals, and the final byte binding: the Linux receipt's `sourceTreeSha256` is `d6d76aa9…6e30`, its 95 runtime hashes equal the image's `dist/src` hashes, and their aggregate is `333711e8…e5d3`.

Linux receipt: [`release-1.1.2-linux-arm64-2026-10-06T21-24-16-470Z.json`](../../test/security/evidence/release-1.1.2-linux-arm64-2026-10-06T21-24-16-470Z.json), SHA-256 `8f8456068c76f850e7ba5b1ac0ce70f6bfa8921345203427fd3a4b007f99550c` (1150 subcases, 1150 pass, 0 skips). This checks Linux arm64 locally; amd64 and the Node 22 matrix remain for CI on the release commit.

### Isolated release preparation

`npm run release:prepare -- <scratchpad>/release-1.1.2` passed end to end with network access on the final release tree (after the last README edit). It ran a clean install, typecheck, functional/security gates, two byte-identical builds and tarballs, an empty archive install with SRI/SBOM checks, all eight profile/approval contracts, historical provenance checks, example validation and the complete release-evidence verifier. `node scripts/verify-release.mjs <dir>/nuoframework-darktrace-mcp-1.1.2.tgz <dir> --check-evidence` then verified all nine checksums, the full MR-04 contract bytes and the build/source/archive/security-receipt bindings. The prepared security receipt matches every source/runtime/fixture binding above (1150 subcases, 1147 pass, 3 macOS skips; source tree `d6d76aa9…6e30`, 95 runtime hashes).

| Artifact | SHA-256 |
|---|---|
| `nuoframework-darktrace-mcp-1.1.2.tgz` | `e8454c85012cf67ae39190f439974af74beda935ea7261db3ee73b6c8c71fe6a` |
| `security-receipt.json` | `dee60bfb76f78248b3ab4eedb8d8b4e9b59197e523048bac4390de97d852016a` |
| `build-evidence.json` | `4a8f9fcc85cb0a7de3ded0cc194e595d0b1868e028ce27477f078f50024af466` |
| `verification.json` | `44c45af5eb21c8dce523d93fc57b896cabbe571fff6ef5dec8f97711d9e5d032` |
| `SHA256SUMS` | `3a46f367779023701f7f6a7c4941f099e5f01aef3284c776de372dc0c812b02d` |

These are local candidate hashes; `release.yml` rebuilds and re-verifies the candidate on the tag, and its artifacts are the published ones.

### Files changed for 1.1.2 release preparation

- `.github/workflows/ci.yml` (two byte-binding pins)
- `CHANGELOG.md`
- `README.md`, `README.es.md`
- `SECURITY.md`
- `docs/CHANGES-docs.md`, `docs/clients.md`, `docs/docker.md`, `docs/es/clients.md`, `docs/es/getting-started.md`, `docs/getting-started.md`, `docs/releases.md`
- `docs/security/release-pins-1.1.2.md`
- `manifest.json`, `npm-shrinkwrap.json`, `package-lock.json`, `package.json`, `server.json`
- `scripts/install.ps1`, `scripts/install.sh`
- `src/server/createServer.ts` (version literal)
- `test/security/evidence/2026-10-06T21-20-32-905Z.json`, `test/security/evidence/release-1.1.2-linux-arm64-2026-10-06T21-24-16-470Z.json`

`claude-plugin/**` is deliberately unchanged: its exact pin moves to 1.1.2 only after the npm registry shows the version ([plugin distribution](../plugin-distribution.md#bump-the-pinned-version-at-each-release)).

## Pending for 1.1.3: branch `feat/install-everywhere` (PR #18)

Measured on 2026-10-06 after rebasing the branch on the 1.1.2 release commit (`126e5ea`); the last production source change of the branch is `750571a`, and the only later `src/` difference from the release commit is the branch's own code (the 1.1.2 version literal is inherited from `main`). These values replace the release pins above once PR #18 merges as the first change of 1.1.3; the release orchestrator updates `.github/workflows/ci.yml` (this branch does not edit workflows).

Production source changed by the branch: `src/cli/clients.ts`, `src/cli/entry.ts`, `src/cli/help.ts`, `src/cli/main.ts`, `src/cli/online.ts`, `src/cli/setup.ts`, `src/cli/uninstall.ts`, `src/cli/ui.ts` (new), `src/cli/yamlBlock.ts` (new), `src/config/load.ts`, `src/index.ts`, `src/observability/log.ts`, `src/server/setupServer.ts` (new), `src/server/stdio.ts`. Tool contracts, profile `tools/list` hashes and profile tool/operation counts are unchanged: `src/tools`, `src/policy`, `src/client` and `src/server/createServer.ts` (beyond the release's version literal) did not change, and the setup-mode server is reachable only when no connection variable is set, never in the pinned profile captures.

Receipt: [2026-10-06T21-56-57-240Z.json](../../test/security/evidence/2026-10-06T21-56-57-240Z.json), SHA-256 `f20f7614c46fe2060557a5b8d83cae550375fcc0b06670dba4999c0c3a1b47ca`; `receiptComplete:true`, test status 0, 1150 subcases, 101 runtime hashes, base commit `52910a2`. The runtime aggregate was recomputed directly from `dist/src` with the CI hashing function and matches.

| Pin | 1.1.2 release value → measured on this branch | Locations |
|---|---|---|
| Functional tests / Linux passes | 267 → **288** | `.github/workflows/ci.yml` |
| Security tests / Linux passes / receipt subcases | 1150 → 1150 (unchanged) | `.github/workflows/ci.yml` |
| Production source tree SHA-256 | `d6d76aa987abc61d4aee924b691a39f8c64492c6f64b53657f42b50cc6e86e30` → **`79a911373fa75c8ccdae1418adffca889d5cb3e73c291bf4a3c035049c99175b`** | `.github/workflows/ci.yml` |
| Runtime files | 95 → **101** | `.github/workflows/ci.yml` (assertion and `byte-binding.json`) |
| Runtime aggregate SHA-256 | `333711e86ab16ddf888f120a7a63b59af5955abe9f95740c8b811def1624e5d3` → **`efcb0f37878b0a0c3e4973c24ae91171a946829240156485e611d075d8c58608`** | `.github/workflows/ci.yml` |
| Full-API fixture SHA-256 | `86083b272bb9456f193427d9f4432817ae3b5e2a3ff8a30fcc68c72c25b66fb6` (unchanged) | `.github/workflows/ci.yml`, `scripts/verify-release.mjs` |
| First-stable fixture SHA-256 | `6ddda2054c9c708d0516a90b7811eb0aba565016403953dace89d47bc89d213c` (unchanged) | `.github/workflows/ci.yml` |

The 21 new functional tests: `test/mcp/setup-mode.test.ts` (5), `test/cli/ui.test.ts` (4), `test/cli/more-clients.test.ts` (7), `test/cli/badges.test.ts` (5). The six new runtime files are the compiled `.js` and `.d.ts` of `src/cli/ui.ts`, `src/cli/yamlBlock.ts` and `src/server/setupServer.ts`. `test/mcp/corrections.test.ts` (G4) still finds exactly one `runStdio(cfg)` call in `src/index.ts`; the unconfigured branch calls `runSetupStdio()` with no configuration object.

Earlier measurements of this branch (before the 1.1.2 version literal) were source tree `a9258eca5ff70e7382a80b44d6d9821fd96b33a70ffef057bef7e33235a5f0a9` and aggregate `5ba75fa837b884f92ec84baa62ce5bae17338f75a27c6d14b658ef97defb5496`; Linux CI run [37532749367](https://github.com/nuoframework/darktrace-mcp/actions/runs/37532749367) executed the vendor gates on that state with functional 287 / 287 / 0 / 0 (one test fewer than now) and security 1150 / 1150 / 0 / 0, failing only on the workflow's pin assertion.

Local checks on macOS arm64 at `52910a2`: `npm run lint`, `npm run typecheck`, `npm test` (288 / 288 / 0 / 0), `npm run test:security` (1150 / 1147 / 0 / 3, the existing macOS setgid skips), `node scripts/validate-examples.mjs` (9 JSON examples, 1 TOML example, 8 documents).
