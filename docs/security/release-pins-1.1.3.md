# Release pins: 1.1.3 (pending release)

First change after the 1.1.2 release: branch `feat/install-everywhere` (PR #18, easy installation everywhere). The pins below are applied in `.github/workflows/ci.yml` by this PR. No tag, publication or release was performed; the package version literal stays `1.1.2` until the 1.1.3 release commit, which will move the source tree and runtime aggregate again (version literal in `src/server/createServer.ts`) and must recompute them following [release-pins-1.1.1.md](release-pins-1.1.1.md).

## Branch `feat/install-everywhere` (PR #18)

Measured on 2026-10-07 on the 1.1.2 release commit (`126e5ea`, tag `v1.1.2`) plus the branch; the last production source change of the branch is the runtime-wording commit (`f09a94e` when measured; `b1e7b8e` after the rebase on PR #22, which changed no `src/` file), and the only `src/` difference from the release commit is the branch's own code (the 1.1.2 version literal is inherited from `main`). These values replace the 1.1.2 release pins and are applied in `.github/workflows/ci.yml` by PR #18 itself (functional count, source tree SHA-256, runtime file count in the assertion and in `byte-binding.json`, runtime aggregate SHA-256).

Production source changed by the branch: `src/cli/clients.ts`, `src/cli/entry.ts`, `src/cli/help.ts`, `src/cli/main.ts`, `src/cli/online.ts`, `src/cli/setup.ts`, `src/cli/uninstall.ts`, `src/cli/ui.ts` (new), `src/cli/yamlBlock.ts` (new), `src/config/load.ts`, `src/index.ts`, `src/observability/log.ts`, `src/server/setupServer.ts` (new), `src/server/stdio.ts`. Tool contracts, profile `tools/list` hashes and profile tool/operation counts are unchanged: `src/tools`, `src/policy`, `src/client` and `src/server/createServer.ts` (beyond the release's version literal) did not change, and the setup-mode server is reachable only when no connection variable is set, never in the pinned profile captures.

Receipt: [2026-10-06T22-08-08-898Z.json](../../test/security/evidence/2026-10-06T22-08-08-898Z.json), SHA-256 `025e0ab757cb70626c9ddbe9e644db3d92e21614640f1fccd24d4dbed5fed839`; `receiptComplete:true`, test status 0, 1150 subcases, 101 runtime hashes, base commit `f09a94e`. The runtime aggregate was recomputed directly from `dist/src` with the CI hashing function and matches.

| Pin | 1.1.2 release value → measured on this branch | Locations |
|---|---|---|
| Functional tests / Linux passes | 267 → **289** | `.github/workflows/ci.yml` |
| Security tests / Linux passes / receipt subcases | 1150 → 1150 (unchanged) | `.github/workflows/ci.yml` |
| Production source tree SHA-256 | `d6d76aa987abc61d4aee924b691a39f8c64492c6f64b53657f42b50cc6e86e30` → **`38f2cef20454cb122cc879a2819f307e882b6d4b1275c9643206ced1e97db0c1`** | `.github/workflows/ci.yml` |
| Runtime files | 95 → **101** | `.github/workflows/ci.yml` (assertion and `byte-binding.json`) |
| Runtime aggregate SHA-256 | `333711e86ab16ddf888f120a7a63b59af5955abe9f95740c8b811def1624e5d3` → **`3abf48bf90004257715e89cb97daf901ce09e1e85b11545d237db57cb78dbbe4`** | `.github/workflows/ci.yml` |
| Full-API fixture SHA-256 | `86083b272bb9456f193427d9f4432817ae3b5e2a3ff8a30fcc68c72c25b66fb6` (unchanged) | `.github/workflows/ci.yml`, `scripts/verify-release.mjs` |
| First-stable fixture SHA-256 | `6ddda2054c9c708d0516a90b7811eb0aba565016403953dace89d47bc89d213c` (unchanged) | `.github/workflows/ci.yml` |

The 22 new functional tests: `test/mcp/setup-mode.test.ts` (5), `test/cli/ui.test.ts` (4), `test/cli/more-clients.test.ts` (7), `test/cli/badges.test.ts` (5), `test/cli/npx-install.test.ts` (1 added: entry origin and runtime wording). The six new runtime files are the compiled `.js` and `.d.ts` of `src/cli/ui.ts`, `src/cli/yamlBlock.ts` and `src/server/setupServer.ts`. `test/mcp/corrections.test.ts` (G4) still finds exactly one `runStdio(cfg)` call in `src/index.ts`; the unconfigured branch calls `runSetupStdio()` with no configuration object.

Earlier measurements of this branch were source tree `a9258eca…` / aggregate `5ba75fa8…` (before the 1.1.2 version literal) and `79a91137…` / `efcb0f37…` (before the runtime-wording change, receipt `2026-10-06T21-56-57-240Z`, superseded); Linux CI run [37532749367](https://github.com/nuoframework/darktrace-mcp/actions/runs/37532749367) executed the vendor gates on that state with functional 287 / 287 / 0 / 0 (one test fewer than now) and security 1150 / 1150 / 0 / 0, failing only on the workflow's pin assertion.

Local checks on macOS arm64 at `f09a94e`: `npm run lint`, `npm run typecheck`, `npm test` (289 / 289 / 0 / 0), `npm run test:security` (1150 / 1147 / 0 / 3, the existing macOS setgid skips), `node scripts/validate-examples.mjs` (9 JSON examples, 1 TOML example, 8 documents).

## Branch `feat/update-command` (update lifecycle)

This section covers branch `feat/update-command`: the `update` command (`--check`, `--rollback`, `--version`, `--allow-downgrade`, `--dry-run`, `--yes`, `--json`), the `setup` update-mode step (`--update-mode pinned|npx-latest`), the `Update available` line in `test` / `doctor --online`, and `uninstall` removing the copies and the previous image kept by `update`. Production source changed only under `src/cli/`; tests and documentation changed too. The package version literal stays `1.1.2`; no tag, publication or release was performed. The pins below are applied in `.github/workflows/ci.yml` by this branch and supersede the PR #18 values above.

### Pin recomputation

Ran `npm run lint`, `npm run typecheck`, `npm test` and `npm run test:security` after the last source change. The source binding covers `src/`. Runtime aggregate SHA-256 is exactly SHA-256 of `JSON.stringify(runtimeHashes)`, preserving insertion order; it was also recomputed directly from `dist/src` with the CI hashing function and matches the receipt.

Receipt: [2026-10-06T22-24-39-371Z.json](../../test/security/evidence/2026-10-06T22-24-39-371Z.json), SHA-256 `b037342b790554a17ba8c2ba351f06048d4c38b12f3ba320e227e25399d897ad`. It records `receiptComplete:true`, build and test status 0, 1150 subcases, 105 runtime hashes and the source binding below. Its base commit is `15c0072a3b71fd443277d9b149e8e28806b61557`: this work as one commit on `main` at the PR #18 merge commit `20293c0`; one test-only change (an extra prompter answer in `test/cli/npx-install.test.ts`) followed, which does not touch `src/`.

### CI pins (value applied by PR #18 → value on this branch)

| Pin | Old → new | Locations |
|---|---|---|
| Functional tests / Linux passes | 289 → **311** | `.github/workflows/ci.yml` |
| Security tests / Linux passes / receipt subcases | 1150 → 1150 (unchanged) | `.github/workflows/ci.yml` |
| Production source tree SHA-256 | `38f2cef20454cb122cc879a2819f307e882b6d4b1275c9643206ced1e97db0c1` → **`05e326f5e96fb94a750d20c3caccb3bd7cea3da99401a002b616cc9373965b99`** | `.github/workflows/ci.yml` |
| Runtime files | 101 → **105** | `.github/workflows/ci.yml` (assertion and `byte-binding.json`) |
| Runtime aggregate SHA-256 | `3abf48bf90004257715e89cb97daf901ce09e1e85b11545d237db57cb78dbbe4` → **`5493a69ac9014aa2f2a0f89b947b9c5119ae5531f596f32736bf7417e9dfea14`** | `.github/workflows/ci.yml` |
| Full-API fixture SHA-256 | `86083b272bb9456f193427d9f4432817ae3b5e2a3ff8a30fcc68c72c25b66fb6` (unchanged) | `.github/workflows/ci.yml`, `scripts/verify-release.mjs` |
| First-stable fixture SHA-256 | `6ddda2054c9c708d0516a90b7811eb0aba565016403953dace89d47bc89d213c` (unchanged) | `.github/workflows/ci.yml` |

The 289 baseline is `npm test` on `main` after PR #18 (the value PR #18 applied to `ci.yml`). The 22 new functional tests are all in `test/cli/update.test.ts`: version ordering, the full node update with verification and client rewrite, downgrade refusal, failed probe / signature / `--check-config` leaving everything untouched, rollback (including a missing copy), dry run and the confirmation question, `--check` with release notes and `--json`, the `test` / `doctor --online` line, the `npx-latest` launcher shape (flag and interactive), the Docker update / rollback / uninstall path, refused layouts (Windows inline tokens, checkout, no setup), ambiguous older setups, registry answer validation and strict flags, plus the six added after an independent code review: a client that cannot be rewritten leaves `setup.json` on the previous version and the next `update` repairs it, a failed `claude mcp add` re-registers the previous entry, a directory already present for the target version is replaced by the verified download, a saved `npx-latest` mode never leaks into a Docker setup, digest-pinned Docker setups warn about the skipped downgrade check and keep a rollback point, and `--json` without `--yes` is refused. Four existing interactive tests gained one answer (the new update-mode question; the fourth is PR #18's entry-origin test in `test/cli/npx-install.test.ts`) and one state assertion gained the recorded `entryPath`. The four new runtime files are the compiled `.js` and `.d.ts` of `src/cli/registry.ts` and `src/cli/update.ts`.

Tool contracts, profile `tools/list` hashes and profile tool/operation counts are unchanged: no file under `src/policy`, `src/config`, `src/client`, `src/tools` or `src/server` changed, and `src/index.ts` is untouched (the `update` command is reached through the existing `isCliCommand` dispatch in `src/cli/help.ts`). The server runtime gained no registry access and no update check.

### Completed checks

| Environment | Functional total / pass / fail / skip | Security total / pass / fail / skip |
|---|---|---|
| macOS arm64 (Node 24.14.1, npm 11.11.0) | 311 / 311 / 0 / 0 | 1150 / 1147 / 0 / 3 |
| Linux arm64, local replay of the `ci.yml` docker job (vendor Node 24.18.1, OpenSSL 3.5.9 shared) | 311 / 311 / 0 / 0 | 1150 / 1150 / 0 / 0 |

The three macOS security skips are the existing setgid-mode cases. The Linux row is the `docker (arm64)` job replayed locally step by step from the workflow with the pins above (every step passed, including the final byte binding: source tree `05e326f5…`, runtime aggregate `5493a69a…`, 105 files); the GitHub Actions run on PR #23 is the authoritative result.

- `npm run lint`, `npm run typecheck`, `npm test` and `npm run test:security`: passed.
- `node scripts/validate-examples.mjs`: passed (9 JSON examples, 1 TOML example, 8 documents).
- Documentation launcher scan (`distributionIssues` from `test/security/mcp-distribution.mjs` over the current tree): no issues. The always-latest launcher appears in prose only, never in an executable example.
- Live check against registry.npmjs.org and api.github.com with the built CLI in a throwaway `HOME` (fixed copy 1.1.0, Cursor entry, unreachable appliance): `update --check` resolved 1.1.1 with provenance and printed the release notes (exit 1); `update --yes` downloaded 1.1.1, `npm audit signatures` verified registry signatures for 4 packages and attestations for 4, the fixed copy was installed, the new copy's `--check-config` passed with the token files, the appliance probe failed (`network`), and the Cursor entry, `setup.json` and the temporary download directory were left as designed (unchanged, unchanged, removed).

### Files changed

- `CHANGELOG.md`
- `README.md`, `README.es.md`
- `docs/clients.md`, `docs/install.md`, `docs/update.md` (new)
- `docs/security/release-pins-1.1.3.md` (new), `docs/security/threat-model-updates.md` (new)
- `src/cli/clients.ts`, `src/cli/entry.ts`, `src/cli/help.ts`, `src/cli/install.ts`, `src/cli/main.ts`, `src/cli/online.ts`, `src/cli/registry.ts` (new), `src/cli/setup.ts`, `src/cli/state.ts`, `src/cli/uninstall.ts`, `src/cli/update.ts` (new)
- `test/cli/docker-setup.test.ts`, `test/cli/npx-install.test.ts`, `test/cli/sensitive-write.test.ts`, `test/cli/setup.test.ts`, `test/cli/update.test.ts` (new)
- `test/security/evidence/2026-10-06T22-24-39-371Z.json`
