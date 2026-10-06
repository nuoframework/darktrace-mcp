# Release pins: 1.1.3 (pending release)

First change after the 1.1.2 release: branch `feat/install-everywhere` (PR #18, easy installation everywhere). The pins below are applied in `.github/workflows/ci.yml` by this PR. No tag, publication or release was performed; the package version literal stays `1.1.2` until the 1.1.3 release commit, which will move the source tree and runtime aggregate again (version literal in `src/server/createServer.ts`) and must recompute them following [release-pins-1.1.1.md](release-pins-1.1.1.md).

## Branch `feat/install-everywhere` (PR #18)

Measured on 2026-10-07 on the 1.1.2 release commit (`126e5ea`, tag `v1.1.2`) plus the branch; the last production source change of the branch is `f09a94e` (context-aware runtime wording in `setup`), and the only `src/` difference from the release commit is the branch's own code (the 1.1.2 version literal is inherited from `main`). These values replace the 1.1.2 release pins and are applied in `.github/workflows/ci.yml` by PR #18 itself (functional count, source tree SHA-256, runtime file count in the assertion and in `byte-binding.json`, runtime aggregate SHA-256).

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
