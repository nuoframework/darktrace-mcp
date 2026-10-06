# Releases and distribution

[README](../README.md) · [Getting started](getting-started.md) · [Changelog](../CHANGELOG.md)

> Most users should install with the [setup wizard](getting-started.md): `npx -y @nuoframework/darktrace-mcp@1.1.0 setup`. This page describes where each version is published and how the owner publishes one. The v1.0.0 release contains the earlier read-only build (15 tools); the full API surface and profiles described in the README ship from 1.1.0.

## Distribution channels (1.1.0 and later)

| Channel | Name | Produced by |
|---|---|---|
| npm (public) | [`@nuoframework/darktrace-mcp`](https://www.npmjs.com/package/@nuoframework/darktrace-mcp), exact versions only | `publish-npm` job: publishes the byte-verified `release:prepare` tarball with [npm trusted publishing](https://docs.npmjs.com/trusted-publishers) (OIDC, `id-token: write`) and `--provenance --access public` |
| GitHub Container Registry (public) | `ghcr.io/nuoframework/darktrace-mcp:<version>`, linux/amd64 + linux/arm64, pin by digest | `publish-ghcr` (one native build per architecture, pushed by digest) and `publish-ghcr-manifest` (one `<version>` tag; no `latest` tag is ever moved) |
| GitHub Release assets | `nuoframework-darktrace-mcp-<version>.tgz`, `darktrace-mcp-<version>.mcpb`, `SHA256SUMS`, SBOM, evidence | owner, from the `darktrace-mcp-release-candidate` workflow artifact |
| MCP Registry | `io.github.nuoframework/darktrace-mcp` ([`server.json`](../server.json), `mcpName` in `package.json`) | owner, with `mcp-publisher` (below) |

The same tarball bytes go to npm and to the Release assets; `SHA256SUMS` and `verification.json` from the `prepare` job describe them. `npx` is only a one-time bootstrap: `setup` installs a fixed copy and writes absolute paths, so no client ever launches the registry.

The 1.1.0 candidate gates pin six operator profile contracts (including `read+sensitive+write`, AD-W-18) and two approval-description variants. The [release pin evidence](security/release-pins-1.1.0.md) records the final counts and byte bindings. Deterministic regeneration of the full-API fixture still requires independent review under [E11](CHANGES-core.md#811-exceptions-and-open-conflicts) before release approval.

### Publishing a version (owner)

1. Set the same `version` in `package.json`, `package-lock.json`, `npm-shrinkwrap.json`, `manifest.json` and `server.json`, update `CHANGELOG.md`, commit, then create and push the tag `v<version>` on the reviewed commit. `release.yml` refuses a tag that does not match the package version.
2. The workflow runs `prepare` exactly as before (clean install, typecheck, tests, security suite, two reproducible builds, tarball verification). Only when it passes do `publish-npm` and `publish-ghcr*` run, both from the verified bytes.
3. **npm trusted publisher (one-time).** On npmjs.com open the package → Settings → Trusted publisher → GitHub Actions: organization `nuoframework`, repository `darktrace-mcp`, workflow filename `release.yml`, no environment, allow `npm publish`. Until this exists (for example for the very first publish of the package name) the job falls back to an `NPM_TOKEN` repository secret (granular access token, publish-only, scoped to this package) and prints a warning; delete the secret once the trusted publisher works. Provenance statements are generated either way.
4. **ghcr visibility (one-time).** The first push creates the package as private. In the organization's Packages settings set `darktrace-mcp` to public and confirm it is linked to this repository (the image carries `org.opencontainers.image.source`). Copy the digest from the `publish-ghcr-manifest` summary or the `ghcr-image-digest` artifact into the release notes.
5. **Release assets.** Download the `darktrace-mcp-release-candidate` artifact, verify `SHA256SUMS`, build the extension from the tag (`npm ci --ignore-scripts && npm run pack:mcpb`), then create the release with `gh release create v<version> --verify-tag --draft --notes-file release-notes.md <assets>` and publish it after inspection.
6. **MCP Registry.** After the npm version is live (the registry checks `mcpName` in the published `package.json`):

```sh
curl -L "https://github.com/modelcontextprotocol/registry/releases/latest/download/mcp-publisher_$(uname -s | tr '[:upper:]' '[:lower:]')_$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/').tar.gz" | tar xz mcp-publisher
./mcp-publisher validate server.json
./mcp-publisher login github
./mcp-publisher publish
```

   `login github` proves ownership of the `io.github.nuoframework` namespace through GitHub; in CI, `login github-oidc` with `id-token: write` does the same without a browser. Check the result at `https://registry.modelcontextprotocol.io/v0.1/servers/io.github.nuoframework%2Fdarktrace-mcp/versions/latest`.

## v1.0.0 (previous release, private)

Use the [v1.0.0 private release](https://github.com/nuoframework/darktrace-mcp/releases/tag/v1.0.0). Docker is recommended: download your architecture's image archive and `SHA256SUMS`, verify it, then run `docker load`. See [the Docker installation guide](docker.md#install-options). The release also includes the native package, security/provenance evidence, complete native CI receipts and a package-evidence archive preserving the original verifier sidecars. The release-level checksum file covers every downloadable archive.

The first stable provides 15 read-only tools covering 19 lab-validated GET selectors. Native amd64/arm64 CI passed 130 functional and 325 security tests with zero skips. Exact image IDs, asset hashes and the disclosed vulnerability applicability results are in the bilingual release notes. No npm or public registry publication is used. Earlier alpha tags and assets remain unchanged.

## Historical alpha installation and preparation

The following procedure describes the immutable earlier alpha release, not the current stable. For v1.0.0, use the installation above.


The published `v0.1.0-alpha.0` assets are immutable historical evidence. At this historical checkpoint the candidate version was `0.1.0-alpha.0` and `0.1.0` was proposed; these are superseded by the separately reviewed v1.0.0 preparation. The proposed first stable scope is supported read-only queries, with write operations reviewed for a later delivery. See [current preparation evidence](history/release-preparation.md#historical-release-direction-and-docker-smoke) and the earlier [Docker preparation record](history/release-preparation-docker-mcp.md).

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

## Version 1.0.0

The published `0.1.0-alpha.0` is immutable history. It predates the 15-tool / 19-selector contract and the patched runtime.

`1.0.0` runs on Alpine-maintained Node.js 24.18.1 with shared OpenSSL 3.5.9 (the CVE-2026-35189 fix) on arm64 and amd64. See the [Docker guide](docker.md#current-candidate-at-a-glance).

- **CI:** [run 37423665585](https://github.com/nuoframework/darktrace-mcp/actions/runs/37423665585) on commit `2adb84b` passed every job: Node 22/24 offline, plus native Docker on amd64 and arm64 with 130 + 325 tests and 0 skipped. The release tag may point to a later commit that changes only documentation and keeps the production, build and shipped-document files identical.
- **Lab:** on 2026-10-06, arm64 image `sha256:8cd85604…` passed [19/19 real queries](security/patched-runtime-lab-checkpoint.md). The lab is closed. 1.0.0 differs only in the production version literal and was not retested live.
- **Scans:** Grype's raw matches are retained: High CVE-2026-85091 (zlib 1.3.2) and Medium CVE-2024-9410 (`ada`). An independent review of both architectures found the zlib library affected but its vulnerable code outside the application's execution path, and the `ada` match a product-name collision. zlib is not fixed, because Alpine 3.24 has no fixed package yet. There is no zero-CVE claim.
- **Assets:** per-architecture Docker image archives, the npm tarball and `SHA256SUMS`, with hashes and image IDs in the release notes.
- **Deployment:** assess provider processing, retention, residency and eligibility for each deployment.

Output views are code-owned and conservative: at most eight selected principal fields, summaries for unknown objects/maps. They do not establish removal of every arbitrary nested sensitive field.

## Incremental delivery cadence

1. `0.1.0-alpha.0`: private offline alpha with reviewed source, verified package, checksums and runtime SBOM; live appliance/provider gates remain open.
2. First stable, targeted as `1.0.0`: the 15 read-only tools, only after the gates above are accepted. The package metadata is still `0.1.0-alpha.0` until a separately coordinated version change; the target is not a readiness decision.
3. A later delivery may add write operations after mutation compatibility, safety controls and residual risks receive separate review. The version label itself does not waive a gate.

Each delivery uses a new immutable reviewed tag, its own notes, verified assets and explicit remaining gaps. Do not replace a published version's assets with a different build. No delivery dates or automatic publication are promised.
