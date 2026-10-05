# Versioned private GitHub Releases

The published `v0.1.0-alpha.0` assets are immutable historical evidence. The working-tree candidate still has package version `0.1.0-alpha.0`; it must not replace those assets or be labeled stable. `0.1.0` (without a prerelease suffix) is the proposed first stable target under consultation; this proposal does not change the package version, create a tag or approve publication. The proposed first stable scope is supported read-only queries, with write operations reviewed for a later delivery. See [current preparation evidence](release-preparation.md#current-release-direction-and-docker-smoke) and the earlier [Docker preparation record](release-preparation-docker-mcp.md).

This is the distribution procedure for private releases of `nuoframework/darktrace-mcp`. Version `0.1.0-alpha.0` uses tag `v0.1.0-alpha.0`. No release is created by the preparation scripts or workflows. The owner publishes only after independent source review and artifact review. `package.private:true` remains set; neither npm publication nor container publication is used.

## Install a reviewed version

Require Node.js 22+, npm and an authenticated GitHub CLI account with private repository access. Choose an explicit reviewed tag; never install an implicit latest prerelease. Download into a new directory:

```sh
mkdir darktrace-mcp-v0.1.0-alpha.0
cd darktrace-mcp-v0.1.0-alpha.0
gh release download v0.1.0-alpha.0 --repo nuoframework/darktrace-mcp \
  --pattern 'darktrace-mcp-0.1.0-alpha.0.tgz' --pattern SHA256SUMS \
  --pattern '*.json' --pattern release-notes.md
shasum -a 256 -c SHA256SUMS
npm init -y
npm install --ignore-scripts --omit=dev ./darktrace-mcp-0.1.0-alpha.0.tgz
npm ls --omit=dev --all
node node_modules/darktrace-mcp/dist/src/index.js --version
node node_modules/darktrace-mcp/dist/src/index.js --help
```

Check the checksum against the owner's reviewed release record through your trusted organizational channel. A checksum downloaded beside a replaced artifact does not authenticate its origin. Registry access is needed for the three pinned dependencies; the project archive itself comes from the private GitHub Release. Their npm SRI values are recorded in the shipped shrinkwrap and SBOM. The generated installation lock supports subsequent `npm ci --ignore-scripts --omit=dev`.

Provision separate protected token files as described in [getting started](getting-started.md), then run `node node_modules/darktrace-mcp/dist/src/index.js doctor`. It performs local configuration checks and no network probe. Use the absolute Node executable and installed `node_modules/darktrace-mcp/dist/src/index.js` in the [client examples](clients.md); the packaged runtime does not require source compilation or dev dependencies.

`runtime-sbom.cdx.json` lists the application and three runtime libraries with exact versions, license identifiers, real archive SHA-256/SHA-512 hashes and npm SRI. `runtime-files.sha256.json` records installed file hashes, including license files. It is an inventory, not a vulnerability clearance, signature or attestation. For the historical alpha, use the verifier from its matching reviewed release checkout, not a newer candidate verifier requiring additional evidence. Reproduce verification from that checkout with `npm run release:verify -- /absolute/path/package.tgz /absolute/private/verification` and compare SBOM and file-inventory bytes. That verifier installs without hooks, downloads dependency tarballs without hooks, verifies SRI and runs help/version/doctor using synthetic local credentials only.

## Owner preparation and publication

From the final reviewed source, with Node 22+ and Python 3.11+ for TOML validation, use a new empty artifact directory outside the checkout (including its symlink aliases):

```sh
npm run release:prepare -- /absolute/private/darktrace-mcp-release
cd /absolute/private/darktrace-mcp-release
shasum -a 256 -c SHA256SUMS
```

The current script generates complete `tools/list` contracts for the four reviewed profiles through `test/security/mcp-contracts.mjs`, compares them to the versioned MR-04 fixture without rewriting it, repeats after the second build, and adds the full `mcp-tool-contracts.json` asset and profile hashes to build/verification evidence. The fixture SHA-256 is `37b5af95de1786ecce1b8762e12d2d63e577f171511a9db4964518b13a917f72`; changing it requires explicit independent review. All nine assets are included in `SHA256SUMS`.

The script builds an isolated copy, runs typecheck, the standard suite and `npm run test:security`, compares two builds/tarballs, validates examples, rejects tar entries outside the runtime allowlist and verifies an empty production install. It never commits, tags, pushes or publishes. Review all logs and `build-evidence.json`, including security skips and source-file hashes. Rebuild after any packaged source, README, metadata or shrinkwrap change. The source inventory binds generator YAML and `docs/operation-inventory.json`, all source/scripts/test/example inputs, tsconfigs, package/locks, both READMEs, inspected guides and original SVG assets. npm automatically includes `README.es.md`; it is explicitly allowed and verified as a regular mode-0644 file, at most 1 MiB, with exact source and installed byte equality. Dockerfile, `.dockerignore` and SVGs are source-only evidence, not files in the npm archive. No screenshot raster is copied or hashed. Protect the reviewed release ref with repository rulesets and restrict release write access to owners before publication; these remote settings are not asserted as configured by this repository.


After preparation, rerun the read-only sidecar integrity gate from the same reviewed source checkout:

```sh
node scripts/verify-release.mjs /absolute/private/darktrace-mcp-release/darktrace-mcp-0.1.0-alpha.0.tgz /absolute/private/darktrace-mcp-release --check-evidence
```

This mode verifies all nine checksums, full MR-04 contract bytes and their pinned oracle, build/source/archive/security-receipt bindings and installer checks without installation, network access or rewriting evidence. Missing or modified contract/evidence/checksum assets fail. It is integrity checking against the reviewed checkout, not origin authentication or compatibility proof. For a fresh installer/SBOM reproduction, first place the independently reviewed `mcp-tool-contracts.json` in a new external verification directory, build the matching reviewed checkout, then run the normal verifier; compare results with the approved candidate.

`.github/workflows/release.yml` is a manual read-only preparation workflow, restricted to an existing `refs/tags/v*` ref whose tag exactly matches `v` plus the package version. Dispatch it against that reviewed tag; branch dispatches are skipped. It uploads a seven-day candidate artifact, not a GitHub Release. CI separately configures Node 22 and 24; a configured job is not evidence of a completed run. Publication is a separate manual owner action using a previously created, reviewed and protected tag. The following was the alpha publication command pattern. **Do not rerun it to replace the published alpha.** A future delivery requires a new reviewed version/tag and independently approved assets:

```sh
gh release create v0.1.0-alpha.0 --repo nuoframework/darktrace-mcp \
  --verify-tag --draft --prerelease --title '0.1.0-alpha.0 — private offline alpha' \
  --notes-file release-notes.md \
  darktrace-mcp-0.1.0-alpha.0.tgz SHA256SUMS runtime-sbom.cdx.json \
  runtime-files.sha256.json source-files.sha256.json build-evidence.json verification.json security-receipt.json release-notes.md mcp-tool-contracts.json
```

Inspect the draft's assets and checksums before manually removing draft status. No workflow has `contents:write`, registry credentials, `id-token:write` or release publication rights. [GitHub CLI `--verify-tag`](https://cli.github.com/manual/gh_release_create) rejects a missing tag instead of creating one. [Environment required reviewers in private repositories](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments) require an eligible GitHub plan; entitlement and remote protections have not been verified. Do not assume merely naming an environment would enforce approval. Artifact attestations are not produced or claimed.

## Remaining deployment gates

The published alpha is immutable historical evidence and predates the accepted 19-selector candidate. Current source has 15 tools in both profiles; [native and hardened Docker MCP passed all 19 permitted bounded GET recipes](security/validated-consultations-lab-checkpoint.md), not all API variants. Exact [image/component binding](security/validated-consultations-docker-checkpoint.md) is separate from final suites, reproducible packaging and independent migration follow-up. **OpenSSL 3.5.8 / CVE-2026-35189 blocks stable publication.** Grype reports 11 High in unchanged scanned OS components; no zero-CVE claim. No stable tag or public/npm/container release is approved. Remote CI/protections and deployment-specific provider processing, retention, residency and eligibility remain separate gates.

Output views are code-owned and conservative: at most eight selected principal fields, summaries for unknown objects/maps. They do not establish removal of every arbitrary nested sensitive field. Review the current configuration/security documentation before deployment.

## Incremental delivery cadence

1. `0.1.0-alpha.0`: private offline alpha with reviewed source, verified package, checksums and runtime SBOM; live appliance/provider gates remain open.
2. Proposed first stable target `0.1.0`: supported read-only queries, only after applicable compatibility, security and organizational gates have been reviewed and accepted. This is under consultation; it is not the current package version or a readiness decision.
3. A later delivery may add write operations after mutation compatibility, safety controls and residual risks receive separate review. The version label itself does not waive a gate.

Each delivery uses a new immutable reviewed tag, its own notes, verified assets and explicit remaining gaps. Do not replace a published version's assets with a different build. No delivery dates or automatic publication are promised.
