Where each version is published, how to verify it and how to prepare a reproducible release.

[README](../../README.en.md) · [Getting started](getting-started.md) · [Changelog](../../CHANGELOG.md)

[Español](../releases.md) · **English**

# Releases and distribution

> Most users should install with the [setup wizard](getting-started.md): `npx -y @nuoframework/darktrace-mcp@1.1.1 setup`. This page describes where each version is published and how the owner publishes one. The v1.0.0 release contains the earlier read-only build (15 tools); the full API surface and profiles described in the README ship from 1.1.0.

## 1.1.1

The [lab gap campaign](../security/lab-gap-campaign-1.1.1.md) increases lab evidence to 59 operations, 6 partial. The [1.1.1 release pins](../security/release-pins-1.1.1.md) record the current checks and byte bindings. Current [known limitations](../../CHANGELOG.md#known-limitations-in-111) cover Email, CVEs, filter types and the DELETE gateway errors. The 1.1.0 evidence below is historical.

## Release status (2026-10-06)

**1.1.1 is published on npm, ghcr and GitHub Release**, checked on 2026-10-06. npm reports version `1.1.1`; the [release](https://github.com/nuoframework/darktrace-mcp/releases/tag/v1.1.1) is public and includes the `.mcpb`, tarball, checksums and evidence. The ghcr index for linux/amd64 and linux/arm64 is `sha256:a1e3944426eddae0e1fa13db0f58a380ae601562dcd4dd93f1767fa42a98a1e1`. The following section records 1.1.0 separately; do not use its digest as a 1.1.1 pin.

## Published 1.1.0 (2026-10-06)

Version 1.1.0 is published on [npm with a provenance attestation](https://registry.npmjs.org/@nuoframework%2fdarktrace-mcp/1.1.0), in ghcr, and as the [v1.1.0 GitHub Release](https://github.com/nuoframework/darktrace-mcp/releases/tag/v1.1.0). The release includes the `.mcpb`, npm tarball, `SHA256SUMS`, runtime SBOM and evidence files. Publication status was checked on 2026-10-06; the dated gate reviews below retain their original scope and findings.

The ghcr index digest is `sha256:dd79adb2dfe78134fa9721508a1f46776ed1736158dcf0b7f54e1dd0bca2d511`, with linux/amd64 and linux/arm64 manifests. Use `ghcr.io/nuoframework/darktrace-mcp@sha256:dd79adb2dfe78134fa9721508a1f46776ed1736158dcf0b7f54e1dd0bca2d511` for pulls and client configuration; per-platform image IDs are not interchangeable with registry manifest digests.

## Distribution channels (1.1.0 and later)

| Channel | Name | Produced by |
|---|---|---|
| npm (public) | [`@nuoframework/darktrace-mcp`](https://www.npmjs.com/package/@nuoframework/darktrace-mcp), exact versions only | `publish-npm` job: publishes the byte-verified `release:prepare` tarball with [npm trusted publishing](https://docs.npmjs.com/trusted-publishers) (OIDC, `id-token: write`) and `--provenance --access public` |
| GitHub Container Registry (public) | `ghcr.io/nuoframework/darktrace-mcp:<version>`, linux/amd64 + linux/arm64, pin by digest | `publish-ghcr` (one native build per architecture, pushed by digest) and `publish-ghcr-manifest` (one `<version>` tag; no `latest` tag is ever moved) |
| GitHub Release assets | `nuoframework-darktrace-mcp-<version>.tgz`, `darktrace-mcp-<version>.mcpb`, `SHA256SUMS`, SBOM, evidence; from the first release after 1.1.1 also one `<asset>.sigstore.json` signature per asset, `darktrace-mcp-<version>.intoto.jsonl` and `darktrace-mcp-<version>.provenance.sigstore.json` | `github-release` job: cosign keyless signatures and SLSA provenance over the verified bytes ([verification](#verifying-release-signatures-and-provenance)) |
| MCP Registry | `io.github.nuoframework/darktrace-mcp` ([`server.json`](../../server.json), `mcpName` in `package.json`) | owner, with `mcp-publisher` (below) |

The same tarball bytes go to npm and to the Release assets; `SHA256SUMS` and `verification.json` from the `prepare` job describe them. `npx` is only a one-time bootstrap: `setup` installs a fixed copy and writes absolute paths, so clients configured through the wizard never launch the registry.

The 1.1.0 candidate gates pin six operator profile contracts (including `read+sensitive+write`, AD-W-18) and two approval-description variants. The [release pin evidence](../security/release-pins-1.1.0.md) records the final counts and byte bindings. The independent content review of the regenerated full-API fixture required by [E11](../CHANGES-core.md#811-exceptions-and-open-conflicts) is recorded as ACCEPT in the [1.1.0 final gate review](../security/final-gate-review-1.1.0.md#15-e11-independent-review-of-the-full-api-contract-fixture-o) §1.5.

### 1.1.0 evidence files

Evidence for the published 1.1.0 release. Each receipt is bound to its recorded source and runtime bytes; see the [final gate review](../security/final-gate-review-1.1.0.md) and [dated owner decisions](../security/owner-decisions-1.1.0.md). Publication does not remove the disclosed residual risks.

| Evidence | File | Covers |
|---|---|---|
| Security receipt, Linux arm64 (Node 24.18.1) | [`release-1.1.0-linux-arm64-2026-10-06T12-43-25-292Z.json`](../../test/security/evidence/release-1.1.0-linux-arm64-2026-10-06T12-43-25-292Z.json), SHA-256 `cd71cecd…dad9` | 1,150 security subcases, 1,150 pass; source tree `5b1208f1…fdc503e` |
| Security receipt, macOS arm64 (Node 24.14.1) | [`release-1.1.0-macos-arm64-2026-10-06T13-06-41-906Z.json`](../../test/security/evidence/release-1.1.0-macos-arm64-2026-10-06T13-06-41-906Z.json), SHA-256 `5699ae23…0736` | 1,150 subcases, 1,147 pass, 3 platform skips (setgid file modes) |
| Earlier receipt (superseded) | [`2026-10-06T11-44-04-525Z.json`](../../test/security/evidence/2026-10-06T11-44-04-525Z.json) | Before the V-W-01 fix: 6 Advanced Search POST failures |
| Release pins and local Docker check | [release-pins-1.1.0.md](../security/release-pins-1.1.0.md) | Every CI/verify pin, `release:prepare` output hashes, arm64 image `sha256:7e5a2a41…6aad` |
| Live lab checks after the write controls | [final-lab-campaign-1.1.0.md](../security/final-lab-campaign-1.1.0.md) | 50 tools listed; reads, POST search, `post_tags` preview, `confirmation_required`, the intel-feed critical flow |
| Signing probe | [lab-signing-evidence.md](../security/lab-signing-evidence.md) and its [JSON](../security/evidence/lab-signing-evidence-2026-10-06T09-17-38-944Z.json) | Which request-signing shapes the 7.1.0 appliance accepts |
| Lab results per operation | [CHANGES-core §6](../CHANGES-core.md#6-live-lab-validation-darktrace-710-2026-10-06) and the [tool reference](tools.md) | 56 operations with lab evidence, 11 partial; email not validated |

Additional available evidence:

| Evidence | Record | Scope |
|---|---|---|
| Release-commit CI | [Run 37497433186](https://github.com/nuoframework/darktrace-mcp/actions/runs/37497433186), commit `f95e798bf3ed3f0dcedb91ff86e84849f1b12acb` | Node 22 and 24 offline jobs, lint, and native Docker jobs on amd64 and arm64 all succeeded |
| Residual-risk decisions | [Owner decisions, 2026-10-06](../security/owner-decisions-1.1.0.md) | Recorded acceptance of specific residuals; acceptance does not remove them |
| Published assets | [v1.1.0 release](https://github.com/nuoframework/darktrace-mcp/releases/tag/v1.1.0) | `.mcpb`, tarball, `SHA256SUMS`, SBOM and evidence files |

A vulnerability scan of the 1.1.0 runtime is still not recorded here. CI is evidence for the source-built images it tested; the published ghcr images are rebuilt separately. The [known limitations](../../CHANGELOG.md#known-limitations-in-110) remain disclosed in the release notes.

### Release naming

Use one convention for every GitHub Release: tag `vX.Y.Z` and title `Darktrace MCP vX.Y.Z` (for example, tag `v1.1.1`, title `Darktrace MCP v1.1.1`). Pre-release tags include their version suffix, such as `v1.2.0-rc.1`; only pre-release titles may append ` — short subtitle`. The `github-release` job derives `VERSION` from the tag by removing its leading `v` and passes `--title "Darktrace MCP v${VERSION}"`. Existing releases already follow this convention.

### Verifying release signatures and provenance

From the first release after 1.1.1, the `github-release` job signs every asset and attests its build provenance before it creates the release ([how it works ](../security/supply-chain-checks.md#release-signing-and-provenance)):

- `<asset>.sigstore.json`: a keyless [Sigstore](https://www.sigstore.dev/) bundle written by `cosign sign-blob` (certificate, signature and transparency-log entry), one per asset including `SHA256SUMS`. The certificate identity is `https://github.com/nuoframework/darktrace-mcp/.github/workflows/release.yml@refs/tags/v<version>`.
- `darktrace-mcp-<version>.intoto.jsonl`: the SLSA v1 build provenance statement that lists every asset as a subject (in-toto DSSE envelope, one line).
- `darktrace-mcp-<version>.provenance.sigstore.json`: the same statement with its verification material, as `actions/attest` wrote it and as the GitHub attestations API stores it.

Download the asset and its signature or the provenance file, then:

```sh
# Provenance (GitHub CLI 2.49 or newer): built by release.yml in this repository, from the tag
gh attestation verify nuoframework-darktrace-mcp-<version>.tgz --repo nuoframework/darktrace-mcp \
  --signer-workflow nuoframework/darktrace-mcp/.github/workflows/release.yml --source-ref refs/tags/v<version>
# Same check from the downloaded bundle instead of the attestations API
gh attestation verify nuoframework-darktrace-mcp-<version>.tgz --repo nuoframework/darktrace-mcp \
  --bundle darktrace-mcp-<version>.provenance.sigstore.json
# Signature (cosign 3.x): the bundle, the exact workflow identity and the GitHub OIDC issuer
cosign verify-blob --bundle nuoframework-darktrace-mcp-<version>.tgz.sigstore.json \
  --certificate-identity https://github.com/nuoframework/darktrace-mcp/.github/workflows/release.yml@refs/tags/v<version> \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  nuoframework-darktrace-mcp-<version>.tgz
# The provenance statement itself (subjects, builder, source commit)
jq -r .payload darktrace-mcp-<version>.intoto.jsonl | base64 -d | jq .
```

`--certificate-identity-regexp '^https://github.com/nuoframework/darktrace-mcp/\.github/workflows/release\.yml@refs/tags/v'` accepts any tag of this workflow. Both tools check the Sigstore certificate chain and the transparency log; `sha256sum -c SHA256SUMS` still checks that the downloaded bytes match, and verifying `SHA256SUMS.sigstore.json` proves the checksum file itself.

Releases published before this change (`v0.1.0-alpha.0`, `v1.0.0`, `v1.1.0`, `v1.1.1`) receive signatures after the fact through `sign-release.yml` (next section). Their bundles have the identity `.../.github/workflows/sign-release.yml@refs/heads/main`, state that the published bytes were signed on that date, and carry no provenance.

### Signing a release published before 1.1.2 (owner, once per tag)

1. Actions → **Sign an existing release** → *Run workflow* with the tag, for example `v1.1.1`; or `gh workflow run sign-release.yml -f tag=v1.1.1`.
2. The run downloads the assets, verifies them with the release's `SHA256SUMS`, signs every asset that has no bundle yet, verifies the bundles and uploads only the new `<asset>.sigstore.json` files. Existing assets and the release notes are never changed, so re-running is safe.
3. Repeat for `v1.1.0`, `v1.0.0` and `v0.1.0-alpha.0`. Scorecard's Signed-Releases check averages the last five releases with assets, so all four need signatures for the full effect ([status ](../security/supply-chain-checks.md#status-and-accepted-gaps-score-67-at-0e4d64f-2026-10-06)).

### Publishing a version (owner)

1. Set the same `version` in `package.json`, `package-lock.json`, `npm-shrinkwrap.json`, `manifest.json` and `server.json`, update `CHANGELOG.md`, commit, then create and push the tag `v<version>` on the reviewed commit. `release.yml` refuses a tag that does not match the package version.
2. The workflow runs `prepare` exactly as before (clean install, typecheck, tests, security suite, two reproducible builds, tarball verification). Only when it passes do `publish-npm` and `publish-ghcr*` run, both from the verified bytes.
   - **npm propagation.** `publish-npm` fails only when `npm publish` itself fails, based on npm's own exit code. A new version can take several minutes to appear on the public registry. After publishing, the job polls `npm view <package>@<version> --registry https://registry.npmjs.org` every 30 s for up to 15 minutes, then writes the registry record to the step summary. If the version is still not visible, the job emits a warning, records the tarball shasum (SHA-1, cross-checked against the verified tarball) and sha512 integrity, and still succeeds.
   - **GitHub Release.** `github-release` runs when `prepare`, `docker-gates`, `pack-mcpb` and `publish-ghcr-manifest` succeeded and `publish-npm` did not fail. A delay in recording the npm version does not block the release, but a failed publish does. Before writing the body, the job checks the registry once more. The release body records the npm status as `published` (with the `npm view` record) or `published, pending registry propagation` (with the shasum and integrity).
3. **npm trusted publisher (one-time).** On npmjs.com open the package → Settings → Trusted publisher → GitHub Actions: organization `nuoframework`, repository `darktrace-mcp`, workflow filename `release.yml`, no environment, allow `npm publish`. Until this exists (for example for the very first publish of the package name) the job falls back to an `NPM_TOKEN` repository secret (granular access token, publish-only, scoped to this package) and prints a warning; delete the secret once the trusted publisher works. Provenance statements are generated either way.
4. **ghcr visibility (one-time).** The first push creates the package as private. In the organization's Packages settings set `darktrace-mcp` to public and confirm it is linked to this repository (the image carries `org.opencontainers.image.source`). Copy the digest from the `publish-ghcr-manifest` summary or the `ghcr-image-digest` artifact into the release notes.
5. **Release assets.** The `github-release` job normally creates the release, with the title `Darktrace MCP v<version>`. Use this manual fallback only if that job did not run, for example because `publish-npm` failed and was then fixed by hand. Download the `darktrace-mcp-release-candidate` artifact, verify `SHA256SUMS`, build the extension from the tag (`npm ci --ignore-scripts && npm run pack:mcpb`), then create the release with `gh release create v<version> --title "Darktrace MCP v<version>" --verify-tag --draft --notes-file release-notes.md <assets>` and publish it after inspection. If only npm recording failed, re-running the failed jobs is usually enough. Before creating a release manually, confirm with `npm view @nuoframework/darktrace-mcp@<version> --registry https://registry.npmjs.org` that the version is visible.
6. **MCP Registry.** After the npm version is live (the registry checks `mcpName` in the published `package.json`):

```sh
curl -L "https://github.com/modelcontextprotocol/registry/releases/latest/download/mcp-publisher_$(uname -s | tr '[:upper:]' '[:lower:]')_$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/').tar.gz" | tar xz mcp-publisher
./mcp-publisher validate server.json
./mcp-publisher login github
./mcp-publisher publish
```

   `login github` proves ownership of the `io.github.nuoframework` namespace through GitHub; in CI, `login github-oidc` with `id-token: write` does the same without a browser. Check the result at `https://registry.modelcontextprotocol.io/v0.1/servers/io.github.nuoframework%2Fdarktrace-mcp/versions/latest`.

7. **Plugin bundle.** Only after `npm view @nuoframework/darktrace-mcp@<version>` shows the new version: set `version` to `<version>` in `claude-plugin/.claude-plugin/plugin.json` and `claude-plugin/plugin.json`, set the dependency to `<version>` in `claude-plugin/package.json` and regenerate `claude-plugin/package-lock.json` as [plugin distribution](plugin-distribution.md#bump-the-pinned-version-at-each-release) describes, change the pinned `@nuoframework/darktrace-mcp@<old>` to `@<version>` in `claude-plugin/mcp.json`, `claude-plugin/README.md` and the skill, run `claude plugin validate --strict ./claude-plugin` and `claude plugin validate .`, and merge that commit to `main`. The Claude Directory follows `main`, re-scans the plugin folder and publishes the version according to the plugin's publish setting; a pin to a version that is not on npm yet makes every install fail, so never bump it before the registry shows the package. Details: [plugin distribution](plugin-distribution.md).

<a id="openssf-badge-placeholders"></a>

## OpenSSF badges

The former static **OpenSSF Scorecard: pending** and **OpenSSF Best Practices: pending** labels were not scores, registrations or certifications. The current badges in both READMEs link to the public result and Best Practices project 15261; no numeric score or passing level is claimed here.

The npm version and GitHub Release badges use live data from Shields.io. Version 1.1.0 is published in both channels. The CI badge links to `ci.yml`; its latest status does not replace the commit-specific release receipts above.

Client badge logos were checked against the [Simple Icons catalog](https://simpleicons.org) and its [slug list](https://github.com/simple-icons/simple-icons/blob/develop/slugs.md) on 2026-10-06: `anthropic`, `cursor`, `windsurf`, `opencode`, `googlegemini`, `docker`. Codex and VS Code use plain badges because `openai` and `visualstudiocode` are absent from that catalog snapshot. The runtime badge uses `nodedotjs`. Names/logos state compatibility only, not endorsement.

### OpenSSF Best Practices registration (owner, one-time)

1. Sign in at [bestpractices.dev](https://www.bestpractices.dev/) with the GitHub account that administers `nuoframework/darktrace-mcp` and choose **Get Your Badge Now** → add the repository URL `https://github.com/nuoframework/darktrace-mcp`.
2. Answer the "passing" criteria. Most answers point to existing files: `SECURITY.md` (vulnerability reporting), `CONTRIBUTING.md`, `LICENSE`, `CHANGELOG.md`, the CI workflows (tests, `lint`, CodeQL) and [supply-chain checks](../security/supply-chain-checks.md) (static analysis, dependency updates).
3. The project is registered as id 15261 (`https://www.bestpractices.dev/projects/15261`); both READMEs link its badge. Note the numeric project id from the project URL (`https://www.bestpractices.dev/projects/<id>`). Use the real project ID and the published `scorecard.yml` result on `main`; never use static placeholders to imply results.
4. Both READMEs are release inputs, so this edit belongs in a release commit (the release pins change).

## v1.0.0 (previous release, private)

Use the [v1.0.0 private release](https://github.com/nuoframework/darktrace-mcp/releases/tag/v1.0.0). Docker is recommended: download your architecture's image archive and `SHA256SUMS`, verify it, then run `docker load`. See [the Docker installation guide](docker.md#install-options). The release also includes the native package, security/provenance evidence, complete native CI receipts and a package-evidence archive preserving the original verifier sidecars. The release-level checksum file covers every downloadable archive.

The first stable provides 15 read-only tools covering 19 lab-validated GET selectors. Native amd64/arm64 CI passed 130 functional and 325 security tests with zero skips. Exact image IDs, asset hashes and the disclosed vulnerability applicability results are in the bilingual release notes. No npm or public registry publication is used. Earlier alpha tags and assets remain unchanged.

## Historical alpha installation and preparation

The following procedure describes the immutable earlier alpha release, not the current stable. For v1.0.0, use the installation above.


The published `v0.1.0-alpha.0` assets are immutable historical evidence. At this historical checkpoint the candidate version was `0.1.0-alpha.0` and `0.1.0` was proposed; these are superseded by the separately reviewed v1.0.0 preparation. The proposed first stable scope is supported read-only queries, with write operations reviewed for a later delivery. See [current preparation evidence](../history/release-preparation.md#historical-release-direction-and-docker-smoke) and the earlier [Docker preparation record](../history/release-preparation-docker-mcp.md).

This was the distribution procedure for private releases of `nuoframework/darktrace-mcp`. Version `0.1.0-alpha.0` uses tag `v0.1.0-alpha.0`. In that procedure, no release was created by scripts or workflows. The owner published only after independent source and artifact review. `package.private:true` was still set; neither npm nor container publication was used.

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

At the historical checkpoint described here, the script generated complete `tools/list` contracts for the four reviewed profiles through `test/security/mcp-contracts.mjs`, compares them to the versioned MR-04 fixture without rewriting it, repeats after the second build, and adds the full `mcp-tool-contracts.json` asset and profile hashes to build/verification evidence. The fixture SHA-256 is `37b5af95de1786ecce1b8762e12d2d63e577f171511a9db4964518b13a917f72`; changing it requires explicit independent review. All nine assets are included in `SHA256SUMS`.

The script builds an isolated copy, runs typecheck, the standard suite and `npm run test:security`, compares two builds/tarballs, validates examples, rejects tar entries outside the runtime allowlist and verifies an empty production install. It never commits, tags, pushes or publishes. Review all logs and `build-evidence.json`, including security skips and source-file hashes. Rebuild after any packaged source, README, metadata or shrinkwrap change. The source inventory binds generator YAML and `docs/operation-inventory.json`, all source/scripts/test/example inputs, tsconfigs, package/locks, both READMEs, inspected guides and original SVG assets. npm automatically includes `README.md`; it is explicitly allowed and verified as a regular mode-0644 file, at most 1 MiB, with exact source and installed byte equality; `README.md` is the Spanish default. Dockerfile, `.dockerignore` and SVGs are source-only evidence, not files in the npm archive. No screenshot raster is copied or hashed. Protect the reviewed release ref with repository rulesets and restrict release write access to owners before publication; these remote settings are not asserted as configured by this repository.


After preparation, rerun the read-only sidecar integrity gate from the same reviewed source checkout:

```sh
node scripts/verify-release.mjs /absolute/private/darktrace-mcp-release/darktrace-mcp-0.1.0-alpha.0.tgz /absolute/private/darktrace-mcp-release --check-evidence
```

This mode verifies all nine checksums, full MR-04 contract bytes and their pinned oracle, build/source/archive/security-receipt bindings and installer checks without installation, network access or rewriting evidence. Missing or modified contract/evidence/checksum assets fail. It is integrity checking against the reviewed checkout, not origin authentication or compatibility proof. For a fresh installer/SBOM reproduction, first place the independently reviewed `mcp-tool-contracts.json` in a new external verification directory, build the matching reviewed checkout, then run the normal verifier; compare results with the approved candidate.

For the historical alpha, `.github/workflows/release.yml` was a manual read-only preparation workflow, restricted to an existing `refs/tags/v*` ref whose tag exactly matches `v` plus the package version. Dispatch it against that reviewed tag; branch dispatches are skipped. It uploads a seven-day candidate artifact, not a GitHub Release. CI separately configures Node 22 and 24; a configured job is not evidence of a completed run. Publication is a separate manual owner action using a previously created, reviewed and protected tag. The following was the alpha publication command pattern. **Do not rerun it to replace the published alpha.** A future delivery requires a new reviewed version/tag and independently approved assets:

```sh
gh release create v0.1.0-alpha.0 --repo nuoframework/darktrace-mcp \
  --verify-tag --draft --prerelease --title '0.1.0-alpha.0 — private offline alpha' \
  --notes-file release-notes.md \
  darktrace-mcp-0.1.0-alpha.0.tgz SHA256SUMS runtime-sbom.cdx.json \
  runtime-files.sha256.json source-files.sha256.json build-evidence.json verification.json security-receipt.json release-notes.md mcp-tool-contracts.json
```

Inspect the draft's assets and checksums before manually removing draft status. At that historical checkpoint, no workflow had `contents:write`, registry credentials, `id-token:write` or release publication rights. [GitHub CLI `--verify-tag`](https://cli.github.com/manual/gh_release_create) rejects a missing tag instead of creating one. [Environment required reviewers in private repositories](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments) require an eligible GitHub plan; entitlement and remote protections have not been verified. Do not assume merely naming an environment would enforce approval. Artifact attestations were not produced or claimed at this historical checkpoint. Signatures and provenance now start with `github-release`; earlier releases can be signed afterwards with `sign-release.yml` ([verification](#verifying-release-signatures-and-provenance)).

## Version 1.0.0

The published `0.1.0-alpha.0` is immutable history. It predates the 15-tool / 19-selector contract and the patched runtime.

`1.0.0` runs on Alpine-maintained Node.js 24.18.1 with shared OpenSSL 3.5.9 (the CVE-2026-35189 fix) on arm64 and amd64. See the [Docker guide](docker.md#v100-image-at-a-glance-previous-release).

- **CI:** [run 37423665585](https://github.com/nuoframework/darktrace-mcp/actions/runs/37423665585) on commit `2adb84b` passed every job: Node 22/24 offline, plus native Docker on amd64 and arm64 with 130 + 325 tests and 0 skipped. The release tag may point to a later commit that changes only documentation and keeps the production, build and shipped-document files identical.
- **Lab:** on 2026-10-06, arm64 image `sha256:8cd85604…` passed [19/19 real queries](../security/patched-runtime-lab-checkpoint.md). The lab is closed. 1.0.0 differs only in the production version literal and was not retested live.
- **Scans:** Grype's raw matches are retained: High CVE-2026-85091 (zlib 1.3.2) and Medium CVE-2024-9410 (`ada`). An independent review of both architectures found the zlib library affected but its vulnerable code outside the application's execution path, and the `ada` match a product-name collision. zlib is not fixed, because Alpine 3.24 has no fixed package yet. There is no zero-CVE claim.
- **Assets:** per-architecture Docker image archives, the npm tarball and `SHA256SUMS`, with hashes and image IDs in the release notes.
- **Deployment:** assess provider processing, retention, residency and eligibility for each deployment.

Output views are code-owned and conservative: at most eight selected principal fields, summaries for unknown objects/maps. They do not establish removal of every arbitrary nested sensitive field.

## Incremental delivery cadence

1. `0.1.0-alpha.0`: private offline alpha with reviewed source, verified package, checksums and runtime SBOM; live appliance/provider gates remain open.
2. First stable, targeted as `1.0.0`: the 15 read-only tools, only after the gates above are accepted. In that plan, package metadata was still `0.1.0-alpha.0` until a separately coordinated version change; the target is not a readiness decision.
3. A later delivery may add write operations after mutation compatibility, safety controls and residual risks receive separate review. The version label itself does not waive a gate.

Each delivery uses a new immutable reviewed tag, its own notes, verified assets and explicit remaining gaps. Do not replace a published version's assets with a different build. No delivery dates or automatic publication are promised.
