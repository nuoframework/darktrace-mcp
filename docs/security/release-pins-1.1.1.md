# Release pins: 1.1.1 candidate

Version 1.1.1 includes the [lab gap campaign](lab-gap-campaign-1.1.1.md): 59 operations with lab evidence, 6 partial. This record follows the recomputation procedure in [release-pins-1.1.0.md](release-pins-1.1.0.md). Preparation is local; no push, tag or publication was performed.

## Pin recomputation

Ran `npm run build && npm test && npm run test:security`, then repeated the final functional and security gates after updating the release pins. The source binding covers `src/`, including the version literal. Runtime aggregate SHA-256 is exactly SHA-256 of `JSON.stringify(runtimeHashes)`, preserving insertion order.

Receipt: [2026-10-06T17-35-02-154Z.json](../../test/security/evidence/2026-10-06T17-35-02-154Z.json), SHA-256 `60fc4e0ee83337c86bf657bb983bf2c2434f3cfc8370f4ffad77e62280d1a628`. It records `receiptComplete:true`, successful build/test status, 1150 subcases, 91 runtime hashes and the final source binding below. Its base commit is `b9f9da7d2e6cd40e1bac86df5e4fda45141c4082`; release gate edits were uncommitted during this check.

The earlier sandbox attempt could not bind loopback TLS test servers (`listen EPERM`). It was superseded by the complete run outside the sandbox and is not accepted evidence.

## CI and release pins (old → new)

| Pin | Old → new | Locations |
|---|---|---|
| Functional tests / Linux passes | 230 → 230 (unchanged) | `.github/workflows/ci.yml` |
| Security tests / Linux passes / receipt subcases | 1150 → 1150 (unchanged) | `.github/workflows/ci.yml` |
| Production source tree SHA-256 | `23113051be498f0043c53078723b3441155c19c0d252fa1a0563591795cbedc7` → `b4b5d68c4fe26b4c4db52b5ed1b8863d6228fa182970779e2e07bea6fe8a7eb3` | `.github/workflows/ci.yml` |
| Runtime files | 91 → 91 (unchanged) | `.github/workflows/ci.yml` |
| Runtime aggregate SHA-256 | `d52f2a6305e6c08f5c6610dd5be3e8a3dd25e29b8f1f3399888d81dde251ba3c` → `6fa8d03ebf3e95003ca63213c074605248bfb691c8d3e76898f4e6fb75823972` | `.github/workflows/ci.yml` |
| Full-API fixture SHA-256 | `df8ca493e50a9f8eef2dd883c8e7a4f3b36b2effa0cba72cf36ed07ab488ded5` → `86083b272bb9456f193427d9f4432817ae3b5e2a3ff8a30fcc68c72c25b66fb6` | `.github/workflows/ci.yml`, `scripts/verify-release.mjs` |

The generated catalogue adds lab validation to `post_devices`, `post_aianalyst_investigations` and `post_pcaps`. Their tool descriptions remove only the `Not lab-validated.` sentence. The fixture was already re-captured in the lab campaign commit; `node test/security/mcp-contracts.mjs --capture` repeated the deterministic capture and produced identical fixture bytes. Schemas, annotations, operation order and profile counts remain unchanged.

| Profile tools/list SHA-256 | Old → new |
|---|---|
| `read` | `734a9e33dd8632df6efa4ec7b81c3f313d85dfbb478af3128bd3aec4f0b6833a` → `734a9e33dd8632df6efa4ec7b81c3f313d85dfbb478af3128bd3aec4f0b6833a` (unchanged) |
| `read+sensitive` | `d885ce0e247f9dc7d55c7f27ed67be4396ffd8b35b2c7a6faf18d3f6a051b046` → `d885ce0e247f9dc7d55c7f27ed67be4396ffd8b35b2c7a6faf18d3f6a051b046` (unchanged) |
| `read+write` | `1820b2b88e685e8058a79d26d97acf9f19f3d47a90cfd9e0862f4b37ce294f22` → `c5daa9f8890a23059a4f55715244a83d9e8dacb22cd4c32ba06b70edcefa7ff2` |
| `read+write+critical` | `c5372a1b21079709f4f2766df8c298bd8e91151aa5c417fc2703c734d12c0aae` → `c358306affc356ca3719c614c9f1777f7582ecb20d7c0b0b932a472949450615` |
| `all` | `90c0a24a18ed849bec6bb8f6c9a6a7a2a2672121c0ed5d1fcbe8fad206e5f53d` → `de987c3b3285bb1e53e4e8d0c806d739a31cc9ff864ba4f3aca02c336a79955e` |
| `read+sensitive+write` | `3ccf0ef5ace7817dfb69fdb83893dab1baa36911bf3cbb906062dae26ca5b64b` → `e00ecf4a4c348d837bba433e50e88e316e58646bc5537f4dcdf998f87589dbe8` |
| `read+write+critical/critical-host` | `f1b5457452b52acb25a9fe37df152d1a88f542580d3b8eadd73bae183a7ae646` → `4fd0a1ea10bc225b9fc450dbf12479e865eb4318f5b59c7f8ca8121cde82f2d9` |
| `read+write/write-elicitation` | `cbd4ac4d9f9f904591ad905f8c3be9244614c982a8d511b9f1102457a968e5bd` → `3a706c271a515f3f3f2f311acdc86cb8d0ad24e496c4e93e6cbd017de97b7186` |

All profile hashes are pinned in both `.github/workflows/ci.yml` and `scripts/verify-release.mjs`.

| Profile tools / operations | Old → new |
|---|---|
| `read` | 27/38 → 27/38 (unchanged) |
| `read+sensitive` | 36/56 → 36/56 (unchanged) |
| `read+write` | 36/54 → 36/54 (unchanged) |
| `read+write+critical` | 41/59 → 41/59 (unchanged) |
| `all` | 50/77 → 50/77 (unchanged) |
| `read+sensitive+write` | 45/72 → 45/72 (unchanged) |
| `read+write+critical/critical-host` | 41/59 → 41/59 (unchanged) |
| `read+write/write-elicitation` | 36/54 → 36/54 (unchanged) |

The `profileShape` oracle was checked against the fixture and retained. `scripts/prepare-release.mjs` has no changed release-specific hash or count pin; it derives its bindings from the snapshot and the verified contracts. Historical alpha, first-stable and validated predecessor fixtures and provenance pins were retained.

## Completed checks

| Environment | Functional total / pass / fail / skip | Security total / pass / fail / skip |
|---|---|---|
| macOS arm64, Node v24.14.1 | 230 / 230 / 0 / 0 | 1150 / 1147 / 0 / 3 |

The three security skips are the existing macOS setgid-mode cases; Linux CI still requires 1150 passes and zero skips. Local checks do not establish a new Linux or Docker CI result.

- `npm run lint`, `npm run typecheck`, `npm test` and `npm run test:security`: passed.
- `node scripts/validate-examples.mjs`: passed (9 JSON examples, 1 TOML example, 8 documents).
- `node scripts/generate-tools-doc.mjs --check`: passed.
- `npx -y @anthropic-ai/mcpb validate manifest.json`: manifest schema validation passes.
- Workflow YAML, tag-derived release title, all profile pins and exact lockfile equality: passed.

GitHub Releases use tag `vX.Y.Z` and title `Darktrace MCP vX.Y.Z`. Only pre-release titles may append a short subtitle, as recorded under [Release naming](../releases.md#release-naming).

## Isolated release preparation

`npm run release:prepare -- /private/tmp/claude-501/-Users-nuofrwk-Documents-darktrace-mcp/0897ccdd-e7ca-496b-9c63-9d79a5db4291/scratchpad/release-1.1.1` passed end to end with network access. It ran a clean install, typecheck, functional/security gates, two byte-identical builds and tarballs, an empty archive install with SRI/SBOM checks, all eight profile/approval contracts, historical provenance checks, example validation and the complete release-evidence verifier. The prepared security receipt independently matches every source/runtime/fixture binding above (1150 subcases, 1147 pass, 3 macOS skips).

| Artifact | SHA-256 |
|---|---|
| `nuoframework-darktrace-mcp-1.1.1.tgz` | `21665b8cec90340558c4bcdd6640e14a2c7967c627b29e8dabb933212036f45e` |
| `security-receipt.json` | `fd6a0a55fd49444be866cbc97d8f623d5e163140d22421a9825f0bad453b3743` |
| `build-evidence.json` | `d91f023566ca941675887ddbebc417fe8ec2940bfac52776024a88441346f1cb` |
| `verification.json` | `ea887a7642798c7b00c2dcc4e21421dde13344fd2ae07932e69f853c2bfd00c0` |
| `SHA256SUMS` | `b0d309449698439ae76b0ccc562e5fa39de9b6c7be34c967cee9e2ee86fe3bf1` |

Raw logs: `/private/tmp/release-111-functional-final.log`, `/private/tmp/release-111-security-final.log`, `/private/tmp/release-111-prepare.log` and the preparation directory's per-command logs.

## Files changed for 1.1.1 release preparation

- `.github/workflows/ci.yml`
- `.github/workflows/release.yml`
- `CHANGELOG.md`
- `README.es.md`
- `README.md`
- `docs/clients.md`
- `docs/docker.md`
- `docs/es/clients.md`
- `docs/es/getting-started.md`
- `docs/getting-started.md`
- `docs/releases.md`
- `docs/security/release-pins-1.1.1.md`
- `manifest.json`
- `npm-shrinkwrap.json`
- `package-lock.json`
- `package.json`
- `scripts/install.ps1`
- `scripts/install.sh`
- `scripts/verify-release.mjs`
- `server.json`
- `src/server/createServer.ts`
- `test/security/evidence/2026-10-06T17-35-02-154Z.json`

The lab campaign and its generated catalogue, tool reference and contract fixture were already committed in the base branch. This list covers only the 1.1.1 release preparation work.
