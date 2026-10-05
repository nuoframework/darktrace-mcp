# Private prerelease preparation — 0.1.0-alpha.0

This report supersedes the preliminary packaging evidence in `packaging-report.md`. Preparation only: no commit, tag, push, GitHub Release, npm publication or container publication was performed. The version remains `0.1.0-alpha.0`, with `package.private:true`. The owner's independent artifact review and publication remain pending.

## Implemented preparation

- `scripts/prepare-release.mjs` copies allowlisted build inputs to a new isolated directory, installs with `npm ci --ignore-scripts`, runs typecheck, the standard suite and `test:security`, performs a second build, and compares the runtime files and npm archive bytes. It validates example JSON and TOML with Python's standard-library TOML parser (Python 3.11+).
- `scripts/verify-release.mjs` lists and checks all tar entries before extraction, rejects nonregular entries and paths outside the runtime allowlist, checks bin mode exactly `0755`, then installs into an empty directory with `npm install --ignore-scripts --omit=dev`. It compares installed runtime bytes, exact dependency count/versions/resolved URLs/SRI against shipped shrinkwrap, independently retrieves dependency archives with hooks disabled and checks their SHA-512 SRI. Installed help/version/doctor/check-config run with synthetic protected local token files and no appliance request.
- The SBOM is CycloneDX 1.5 JSON: application plus exactly three runtime libraries. Versions, SPDX license identifiers and archive SHA-256/SHA-512 hashes come from verified installed manifests and real retrieved tarballs. An installed-file hash inventory permits byte comparison including license files. This is not an attestation, signature or vulnerability clearance.
- CI configures Node 22/24; the manual release workflow prepares seven-day candidate assets with repository `contents:read`. It cannot publish. The owner reviews and manually publishes a draft prerelease using a pre-existing reviewed tag and `gh release create --verify-tag`; see [releases](releases.md).

No dependency pins were changed. `package-lock.json` and `npm-shrinkwrap.json` remain identical; adding explicit package scripts does not require dependency-lock changes. The existing LICENSE was not edited. No src files, security cases, fixtures or assertions were edited by this worker. A narrow coordinator-authorized change to `test/security/run-isolated.mjs` fixes the reporter to `spec` and rejects incomplete receipts by comparing parsed subcase count to the actual test summary; Node 22 captured output otherwise defaults to TAP.

## Local execution and failures retained

Platform: macOS arm64. Node 24.14.1/npm 11.11.0 is the existing local runtime. Official Node 22.23.3 darwin-arm64 was downloaded outside the repository from `https://nodejs.org/dist/v22.23.3/node-v22.23.3-darwin-arm64.tar.gz`. Archive SHA-256: `23b25245dcfb9af7262f8ff142e9e2e0af025368117329e7a7458a51e5922f53`, matching the official HTTPS checksum manifest retrieved to `/private/tmp/darktrace-node22-v22.23.3-SHASUMS256.txt` ([official checksum manifest](https://nodejs.org/dist/v22.23.3/SHASUMS256.txt)). This is a checksum verification, not a claim of detached-signature verification.

Commands and retained preliminary attempts:

1. `PATH=/private/tmp/node-v22.23.3-darwin-arm64/bin:$PATH npm run release:prepare -- /private/tmp/darktrace-release-preflight22` failed in npm ci due sandbox DNS `ENOTFOUND registry.npmjs.org` and an unwritable default npm log directory. Log: `install.log` in that directory.
2. The cached Node 22 attempt at `/private/tmp/darktrace-release-preflight22-cached` installed and passed typecheck, then `npm test` returned 1: 102 cases, 97 pass, zero assertion failures, five cancellations. First cancellation was the streaming timeout mock with no active event-loop handle. The network-authorized repetition at `/private/tmp/darktrace-release-preflight22-network` reproduced it. It was escalated to the client/test owner, without changing out-of-scope code.
3. `npm_config_cache=/private/tmp/darktrace-npm-cache npm_config_offline=true npm run release:prepare -- /private/tmp/darktrace-release-preflight24` passed the standard suite 102/102; security returned 1 because sandbox `listen EPERM 127.0.0.1` blocked six real local TLS cases. This is retained as an environment-blocked attempt, not a security pass.
4. Authorized `npm_config_cache=/private/tmp/darktrace-npm-cache npm run release:prepare -- /private/tmp/darktrace-release-preflight24-network` returned 0. Typecheck passed; standard 102/102; security 238 cases, 235 pass, zero fail/cancelled, three macOS setgid skips. Archive had 29 regular allowlisted files, exact bin 0755, exact three pinned runtime dependencies, verified SRI and offline installed CLI checks. Two builds produced identical archive/runtime bytes. Preliminary archive SHA-256 `6a4efe2170bb9409137849819ccdd6693a60330692b29c62d62dc1a5687d6034` is not the final reviewed delivery record.

## Superseded completed checkpoint

Before the final README/CHANGELOG delta, Node 22/24 both completed all checks and produced archive `6a4efe2170bb9409137849819ccdd6693a60330692b29c62d62dc1a5687d6034`. Those complete candidate directories were preserved as `/private/tmp/darktrace-mcp-release-before-readme` and `/private/tmp/darktrace-mcp-release-node24-before-readme`; their independent review is a historical snapshot, not approval of the current bytes. The new candidate below supersedes their checksums. The current guide also closes NR-01 (obsolete audit/JSON-ceiling status in configuration); that guide is not shipped in the tarball.

## Final candidate

Executed after the reviewed unit-fixture correction, RR fixes and publication-ready README/CHANGELOG delta, on macOS arm64, with separate authorized unsandboxed processes for registry access and real localhost TLS tests:

```sh
PATH=/private/tmp/node-v22.23.3-darwin-arm64/bin:$PATH npm_config_cache=/private/tmp/darktrace-npm-cache npm run release:prepare -- /private/tmp/darktrace-mcp-release
npm_config_cache=/private/tmp/darktrace-npm-cache npm run release:prepare -- /private/tmp/darktrace-mcp-release-node24
```

Both returned **0**. The nested exact command arrays and statuses are in each `build-evidence.json`; each command has a separate `.log`. Results:

| Check | Node 22.23.3 / npm 10.9.9 | Node 24.14.1 / npm 11.11.0 |
|---|---|---|
| Output directory guard, helper and real script entrypoints | Exact checkout, child and symlink aliases rejected before writes | Same |
| `npm ci --ignore-scripts --no-audit --no-fund` | 0 | 0 |
| `npm run typecheck` | 0 | 0 |
| `npm test` (includes first build) | 102 pass, 0 fail/cancelled | 102 pass, 0 fail/cancelled |
| `npm run test:security` | 238 total: 235 pass, 3 setgid skips, 0 fail/cancelled | Same |
| Security receipt completeness | 238 parsed cases, `receiptComplete:true`, 4,434 assertion invocations | Same |
| Second `npm run build` and npm pack | Runtime-file hashes and archive bytes equal first build | Same |
| Clean production install and independently downloaded dependency SRI | Exact three runtime libraries; all checks pass | Same |
| Installed help/version/doctor/check-config | Pass; local synthetic credentials, `networkProbe:false` | Same |
| Example JSON/TOML syntax | Pass | Pass |

Node 22 snapshot: `/var/folders/tl/x0ps4dwd14x4qhyyh6x0lmgw0000gn/T/darktrace-release-source-L9Vbik`. Node 24 snapshot: `/var/folders/tl/x0ps4dwd14x4qhyyh6x0lmgw0000gn/T/darktrace-release-source-dZfoqk`.

Release-input aggregate SHA-256 in both builds: `2d5c2e0006de3fcfb173929eee79a37ffc29adda0b0fe2be79ad339b5ef6a916`. The input manifest enumerates source, scripts, openapi, tests, examples and packaged metadata; it is not a signed commit identity or a hash of every repository document. All enumerated current checkout files matched the executed snapshot after completion. Security runtime-source aggregate in both receipts: `f7bfeac17dfae00c0152df0e93a15d88b1882c5fd84d4a4dd5e24b7b5bd80bed`; generator execution changed no source hashes. All 238 case names, fixture hashes and oracle/helper file hashes match the frozen `harness-238-manifest.json` and its receipt, except the explicitly authorized reporter wrapper. Luna's unit fixture SHA-256 is `d9cb2e8addd8b910adc412b85b64c07760b8901d74dc9d02c2aeeb18a11244cd`; no production source was changed for that fix.

The deliverable directory is **`/private/tmp/darktrace-mcp-release`**, with Node 22 evidence. Separate Node 24 evidence is in `/private/tmp/darktrace-mcp-release-node24`. Both directories contain the same archive, runtime SBOM, installed-file inventory, source manifest and release notes **byte for byte**; build/verification/security receipts deliberately retain their actual runtime, timing and paths. Comparison record: `/private/tmp/darktrace-release-comparison.json`.

Final `darktrace-mcp-0.1.0-alpha.0.tgz`: **SHA-256 `bf8b93bdce436131673ffbca2746abfe127b1082221e373aab39ee01c102dc92`**. It contains 29 regular allowlisted files, bin mode exactly `0755`, `private:true`, no lifecycle hooks, no tests/fixtures/source TypeScript/scripts/secrets. The compiled runtime, README, LICENSE, SECURITY, package metadata and shrinkwrap are shipped.

Runtime libraries: `@modelcontextprotocol/core@2.3.0` and `@modelcontextprotocol/server@2.3.0` (Apache-2.0), `zod@4.2.0` (MIT). The SBOM records hashes of the retrieved original registry tarballs verified against shrinkwrap SRI, not invented hashes of names or metadata. Installed-file inventories include actual license file hashes.

`shasum -a 256 -c SHA256SUMS` in each directory returned 0, all eight listed assets **OK**. Node 22 asset checksums:

```text
bf8b93bdce436131673ffbca2746abfe127b1082221e373aab39ee01c102dc92  darktrace-mcp-0.1.0-alpha.0.tgz
321e0f6716736c805104a505cb1dfb3c68737f87a85e1cde089c277dfbcf1be4  runtime-sbom.cdx.json
1eac687d2e310e406105057d931e39e0b44ba04fed7fb2e65b7ff1c5a0c98568  runtime-files.sha256.json
5ba9e1ffee539a463aa7eeaeb3d992241c2447e2b1ea8485d1f7b93caf1a8724  source-files.sha256.json
fb1fb1a0ff725d9441e3a57899871c8568700bd0c6e263c2fb66355b89a73153  build-evidence.json
633b1f46c3daaff706cc8dc0ab995d6395ae12ec5b4ea0fd1928b5eef552017d  verification.json
80e8a764f5beb77e8b17ea54bc912c6fef5960d3aceed17e14e442c4c895992c  security-receipt.json
9041f93139ed1d95e1da84fb5db83ac6a9e65583aa771bcd1e53a305b93fa52b  release-notes.md
```

Additional local static checks passed: both workflow YAML files parse, all referenced actions are pinned to immutable 40-hex commits, and repository permissions are read-only. The manual candidate job additionally requires a `refs/tags/v*` ref and checks its exact equality with `v` plus the package version. These checks do not verify remote ruleset configuration or grant publication approval.

## Remote execution and remaining gates

GitHub CI and manual preparation workflow were not dispatched during this task. Local execution is separate evidence; configured Node 22/24 jobs are not claimed as remote passes. Upload-artifact v4.6.2 was pinned to commit `ea165f8d65b6e75b540449e92b4886f43607fa02`, checked against its official GitHub tag-ref API. Existing checkout/setup-node pins were retained.

Repository rulesets, release write permissions and eligible private-environment reviewer protections must be verified by the owner before publication. No entitlement, configured remote protection or artifact attestation is claimed. Required environment reviewers for private repositories depend on the GitHub plan; see the primary [GitHub environment documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments).

Darktrace 7.1 signing/ACL/response/mutation behavior, real private-network deployment pinning, provider/host processing eligibility, retention/residency and Docker build/run remain pending. Output views are conservative projections, not a universal sensitive-data-removal guarantee. Three macOS setgid tests are skipped, not passed. Offline/security/package results do not establish that every ST control, organizational gate or residual risk is accepted.
