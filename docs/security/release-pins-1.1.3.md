# Release pins: 1.1.3 (pending release)

First change after the 1.1.2 release: branch `feat/install-everywhere` (PR #18, easy installation everywhere). The pins below are applied in `.github/workflows/ci.yml` by this PR. No tag, publication or release was performed; the package version literal stays `1.1.2` until the 1.1.3 release commit, which will move the source tree and runtime aggregate again (version literal in `src/server/createServer.ts`) and must recompute them following [release-pins-1.1.1.md](release-pins-1.1.1.md).

## Branch `feat/install-everywhere` (PR #18)

Measured on 2026-10-06 after rebasing the branch on the 1.1.2 release commit (`126e5ea`); the last production source change of the branch is `750571a`, and the only later `src/` difference from the release commit is the branch's own code (the 1.1.2 version literal is inherited from `main`). These values replace the 1.1.2 release pins and are applied in `.github/workflows/ci.yml` by PR #18 itself (functional count, source tree SHA-256, runtime file count in the assertion and in `byte-binding.json`, runtime aggregate SHA-256).

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
