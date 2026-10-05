# Versioned private GitHub Releases

This is the distribution procedure for private prereleases of `nuoframework/darktrace-mcp`. Version `0.1.0-alpha.0` uses tag `v0.1.0-alpha.0`. No release is created by the preparation scripts or workflows. The owner publishes only after independent source review and artifact review. `package.private:true` remains set; neither npm publication nor container publication is used.

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

`runtime-sbom.cdx.json` lists the application and three runtime libraries with exact versions, license identifiers, real archive SHA-256/SHA-512 hashes and npm SRI. `runtime-files.sha256.json` records installed file hashes, including license files. It is an inventory, not a vulnerability clearance, signature or attestation. Reproduce verification from a reviewed checkout with `npm run release:verify -- /absolute/path/package.tgz /absolute/private/verification` and compare SBOM and file-inventory bytes. That verifier installs without hooks, downloads dependency tarballs without hooks, verifies SRI and runs help/version/doctor using synthetic local credentials only.

## Owner preparation and publication

From the final reviewed source, with Node 22+ and Python 3.11+ for TOML validation, use a new empty artifact directory outside the checkout (including its symlink aliases):

```sh
npm run release:prepare -- /absolute/private/darktrace-mcp-release
cd /absolute/private/darktrace-mcp-release
shasum -a 256 -c SHA256SUMS
```

The script builds an isolated copy, runs typecheck, the standard suite and `npm run test:security`, compares two builds/tarballs, validates examples, rejects tar entries outside the runtime allowlist and verifies an empty production install. It never commits, tags, pushes or publishes. Review all logs and `build-evidence.json`, including security skips and source-file hashes. Rebuild after any packaged source, README, metadata or shrinkwrap change. Protect the reviewed release ref with repository rulesets and restrict release write access to owners before publication; these remote settings are not asserted as configured by this repository.

`.github/workflows/release.yml` is a manual read-only preparation workflow, restricted to an existing `refs/tags/v*` ref whose tag exactly matches `v` plus the package version. Dispatch it against that reviewed tag; branch dispatches are skipped. It uploads a seven-day candidate artifact, not a GitHub Release. CI separately configures Node 22 and 24; a configured job is not evidence of a completed run. Publication is a separate manual owner action using a previously created, reviewed and protected tag. After approval, the owner can run:

```sh
gh release create v0.1.0-alpha.0 --repo nuoframework/darktrace-mcp \
  --verify-tag --draft --prerelease --title '0.1.0-alpha.0 — private offline alpha' \
  --notes-file release-notes.md \
  darktrace-mcp-0.1.0-alpha.0.tgz SHA256SUMS runtime-sbom.cdx.json \
  runtime-files.sha256.json source-files.sha256.json build-evidence.json verification.json security-receipt.json release-notes.md
```

Inspect the draft's assets and checksums before manually removing draft status. No workflow has `contents:write`, registry credentials, `id-token:write` or release publication rights. [GitHub CLI `--verify-tag`](https://cli.github.com/manual/gh_release_create) rejects a missing tag instead of creating one. [Environment required reviewers in private repositories](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments) require an eligible GitHub plan; entitlement and remote protections have not been verified. Do not assume merely naming an environment would enforce approval. Artifact attestations are not produced or claimed.

## Remaining deployment gates

This is an offline private prerelease. Darktrace 7.1 signing modes, appliance ACLs, real responses and mutation outcomes have not been lab validated. Host/model-provider processing, retention, residency and eligibility require deployment-specific approval. Docker build/run remains unverified and no image is distributed. Offline suites and packaging verification do not establish that all security tests, organizational gates or residual risks are approved.

Output views are code-owned and conservative: at most eight selected principal fields, summaries for unknown objects/maps, and no `@message`/`@fields` passthrough for Advanced Search. They do not establish removal of every arbitrary nested sensitive field. Review the current configuration/security documentation before deployment.

## Incremental delivery cadence

1. `0.1.0-alpha.0`: private offline alpha with reviewed source, verified package, checksums and runtime SBOM; live appliance/provider gates remain open.
2. A subsequent alpha: add measured read/auth compatibility evidence for Darktrace 7.1 when an approved lab becomes accessible, documenting actual tested signing modes, ACLs and response behavior.
3. Beta: only after applicable integration/security gates and residual-risk decisions have been reviewed; the version label itself does not waive a gate.

Each delivery uses a new immutable reviewed tag, its own notes, verified assets and explicit remaining gaps. Do not replace a published version's assets with a different build. No delivery dates or automatic publication are promised.
