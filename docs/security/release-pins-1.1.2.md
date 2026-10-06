# Release pins: 1.1.2 candidate (installer changes)

This record covers the installer changes on branch `feat/setup-docker-easy`: the self-service Docker path in `setup`, the container `--check-config` in `test` / `doctor --online`, the URL prompt without a saved default, and the new `uninstall` command (alias `remove --all`). Only `src/cli/` changed in production source, plus tests and documentation. It follows the recomputation procedure in [release-pins-1.1.1.md](release-pins-1.1.1.md). The package version literal is unchanged (`1.1.1`); no tag, publication or release was performed.

## Pin recomputation

Ran `npm run lint`, `npm run typecheck`, `npm test` and `npm run test:security` after the last source change. The source binding covers `src/`. Runtime aggregate SHA-256 is exactly SHA-256 of `JSON.stringify(runtimeHashes)`, preserving insertion order; it was also recomputed directly from `dist/src` with the CI hashing function and matches the receipt.

Receipt: [2026-10-06T20-07-36-725Z.json](../../test/security/evidence/2026-10-06T20-07-36-725Z.json), SHA-256 `b8c9463044c4bbcbfff712c64843c2715ca528060cf92fb5462b506e962fea97`. It records `receiptComplete:true`, successful build/test status, 1150 subcases, 95 runtime hashes and the source binding below. Its base commit is `fe624777dfd41455337dc5e67c68745f53749645`; the branch changes were uncommitted during this check.

## CI pins (old → new)

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

## Completed checks

| Environment | Functional total / pass / fail / skip | Security total / pass / fail / skip |
|---|---|---|
| macOS arm64 | 245 / 245 / 0 / 0 | 1150 / 1147 / 0 / 3 |

The three security skips are the existing macOS setgid-mode cases; Linux CI still requires 1150 passes and zero skips. Local checks do not establish a Linux or Docker CI result.

- `npm run lint`, `npm run typecheck`, `npm test` and `npm run test:security`: passed.
- `node scripts/validate-examples.mjs`: passed (9 JSON examples, 1 TOML example, 8 documents).

## Files changed

- `.github/workflows/ci.yml`
- `CHANGELOG.md`
- `README.md`, `README.es.md`
- `docs/CHANGES-install.md`, `docs/clients.md`, `docs/es/clients.md`, `docs/docker.md`
- `docs/security/release-pins-1.1.2.md`
- `src/cli/clients.ts`, `src/cli/docker.ts` (new), `src/cli/help.ts`, `src/cli/main.ts`, `src/cli/online.ts`, `src/cli/setup.ts`, `src/cli/state.ts`, `src/cli/uninstall.ts` (new)
- `test/cli/date-format.test.ts`, `test/cli/docker-setup.test.ts` (new), `test/cli/helpers.ts`, `test/cli/sensitive-write.test.ts`, `test/cli/setup.test.ts`, `test/cli/uninstall.test.ts` (new)
- `test/security/evidence/2026-10-06T20-07-36-725Z.json`
