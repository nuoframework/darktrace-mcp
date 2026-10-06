# Public distribution: npm, ghcr.io, MCP Registry and the npx bootstrap

Change notes for the owner (2026-10-06). Branch `nuoframework/dist-github-packages`. The owner's
decision during the work: the repository becomes **public** and the package is published to the
**public npm registry** (the earlier GitHub Packages plan was dropped before implementation).
Nothing was published from this branch; every publish step runs only in `release.yml` on a tag.

## npm registry propagation delay (`release.yml`)

In release runs 37497433270 and 37506533706, `npm publish` succeeded but the next step's immediate
`npm view` returned E404, because the public registry had not yet exposed the new version. That step failed
`publish-npm`, so `github-release` was skipped and the GitHub Release had to be created by hand.
Now `publish-npm` checks the exit code of `npm publish` itself, and a failed publish still fails the job.
After a successful publish, the job polls `npm view --registry https://registry.npmjs.org` every 30 s
for up to 15 minutes (the job timeout is now 30 minutes). If the version is still not visible, it
emits a warning and records the tarball shasum and integrity instead. `github-release` now runs with
`if: always() && …` when every gate and the ghcr manifest succeeded and `publish-npm` did not fail.
Its release body shows the npm status as `published` or as `published, pending registry
propagation`, with the shasum.

## 1.1.0 gate closure: release workflow (blockers B7 and B9)

Follow-up to the final gate review (`docs/security/final-gate-review-1.1.0.md` §5). The counts and
the CI pin in "Verification" below are historical (taken before the full-API merge).

### `release.yml` changes

| Job | Permissions | What it does |
| --- | --- | --- |
| `docker-gates` (new) | `contents: read`, `actions: read` | Runs in parallel with `prepare`. Polls the `ci.yml` runs for `head_sha == GITHUB_SHA` (the tag push triggers `ci.yml` on the same commit) for up to 110 minutes. Passes only when one completed, successful run has **both** `docker (amd64, …)` and `docker (arm64, …)` jobs concluded `success` at that SHA: vendor Node gates, functional and security counts, image configuration, SDK smoke over all eight contracts, and the byte binding to the security receipt. Fails fast when every run for the SHA completed without that. Writes the run and job URLs to `docker-gates.json` / `.md` (artifact, 90 days). |
| `pack-mcpb` (new) | `contents: read` | Needs `prepare`. Checks out the tagged SHA, `npm ci --ignore-scripts`, validates the manifest with a pinned `@anthropic-ai/mcpb@2.1.2`, runs `npm run pack:mcpb`, then downloads the verified candidate and proves the bundle's `dist/src` is byte-identical (`diff -r`) to the verified tarball's `package/dist/src`, and that its `manifest.json` equals the reviewed one and matches the tag. Uploads `darktrace-mcp-<version>.mcpb` and its SHA-256. |
| `publish-npm` | unchanged | Now `needs: [prepare, docker-gates]`. |
| `publish-ghcr` | unchanged | Now `needs: [prepare, docker-gates]`, so no image is pushed unless both architectures passed the CI Docker gates at the tagged SHA. |
| `github-release` (new) | `contents: write` | Needs `prepare`, `docker-gates`, `pack-mcpb`, `publish-npm`, `publish-ghcr-manifest`. Re-checks `SHA256SUMS`, adds the `.mcpb` line, re-checks again, and creates the GitHub Release for the tag (`gh release create --verify-tag`) with every file in `SHA256SUMS` (tarball, evidence, `release-notes.md`, `.mcpb`) plus `SHA256SUMS`. The release body is `release-notes.md` followed by the publication record: `npm view` integrity and tarball URL, the ghcr manifest-list digest and both per-arch digests, the `.mcpb` SHA-256, and the CI docker-gate run URLs. `release-notes.md` itself stays byte-identical, because it is listed in `SHA256SUMS`. |

`actionlint` (with shellcheck) passes. Locally, `npm run pack:mcpb` and `npm pack` of the same tree
give identical `dist/src` trees, which is the check `pack-mcpb` enforces.

Residual: `publish-ghcr` still rebuilds the image on the release runners rather than pushing the
exact image that `ci.yml` tested. Both builds use the same SHA, the same archived runtime inputs and
the same Dockerfile, and the release notes record the digests that were pushed.

### One-time owner steps (not automatable from the repository)

1. **npm publisher.** Either configure a trusted publisher on npmjs.com for
   `@nuoframework/darktrace-mcp`: organization/user `nuoframework`, repository `darktrace-mcp`,
   workflow file `release.yml`, no environment. Or, if the package name does not exist yet (npm can
   only attach a trusted publisher to an existing package), add a granular, publish-only,
   short-lived `NPM_TOKEN` repository secret for the first release. Then configure the trusted
   publisher, delete the secret and revoke the token. With the secret present, `publish-npm` uses it
   and emits a warning.
2. **ghcr visibility.** After the first `publish-ghcr` push, open the package
   `ghcr.io/nuoframework/darktrace-mcp` in the organization's Packages settings. Set it to
   **Public** and confirm it is linked to the repository (the `org.opencontainers.image.source`
   label does that). Anonymous `docker pull` fails until then.
3. **MCP Registry.** Only after `npm view @nuoframework/darktrace-mcp@<version>` shows the release
   (the registry verifies `mcpName` in the published package) and the ghcr package is public:
   `mcp-publisher login github` (or `github-oidc` from a workflow), `mcp-publisher validate
   server.json`, then `mcp-publisher publish`.
4. **Security reporting route.** `SECURITY.md` must describe a reporting route a public user can
   follow, for example GitHub private vulnerability reporting enabled in the repository settings,
   instead of the private-repository route. The documentation owner edits `SECURITY.md`; enabling
   private vulnerability reporting is a repository setting.
5. **Tag only after the pins are recomputed.** `ci.yml` and `scripts/verify-release.mjs` pin
   `sourceTreeSha256`, the runtime hashes and the test counts. The B5 change touched `src/`, and
   `docker-gates` will block publication until `ci.yml` is green at the tagged SHA.

## What changed (initial distribution work)

### Package metadata

| File | Change |
| --- | --- |
| `package.json` | `name` → `@nuoframework/darktrace-mcp`, `version` → `1.1.0`, `"private": true` removed (npm refuses to publish a private package), `publishConfig: {access: "public", registry: "https://registry.npmjs.org"}`, `mcpName: "io.github.nuoframework/darktrace-mcp"`, public description and keywords. `bin.darktrace-mcp`, `files`, `engines` and the three runtime dependencies are unchanged; still no lifecycle scripts. |
| `package-lock.json`, `npm-shrinkwrap.json` | Root name/version updated (the shrinkwrap ships in the tarball). |
| `manifest.json` (MCPB) | Version `1.1.0`; the bundle name stays `darktrace-mcp` (extension identifier, not the npm name). `npx -y @anthropic-ai/mcpb validate manifest.json` passes. |
| `server.json` (new) | MCP Registry entry (`2025-12-11` schema): npm package `@nuoframework/darktrace-mcp@1.1.0` (stdio, env vars with `isSecret`) and the OCI package `ghcr.io/nuoframework/darktrace-mcp:1.1.0`. `mcp-publisher validate server.json` → valid (mcp-publisher 1.8.1). |
| `src/server/createServer.ts` | `VERSION` literal `1.1.0` (`--version` must equal `package.json`, checked by `verify-release`). |
| `Dockerfile` | Description label no longer says "private"; adds `org.opencontainers.image.source` so ghcr links the package to the repository. |
| `CHANGELOG.md` | `Unreleased` → `1.1.0 — prepared 2026-10-06` with a distribution entry. |

### Release scripts

- `scripts/verify-release.mjs`: expects the scoped name, **no** `private` flag, `publishConfig`
  `{access: public, registry: npmjs}` and `mcpName`; installs/inspects
  `node_modules/@nuoframework/darktrace-mcp`; the `private` check in `verification.json` is now
  `publicPackageMetadata`. The tarball is now named `nuoframework-darktrace-mcp-<version>.tgz`.
- `scripts/prepare-release.mjs`: `server.json` joins the hashed root inputs.
- `scripts/validate-examples.mjs` and `test/security/mcp-distribution.mjs`: the old rule ("no
  registry invocation of darktrace-mcp") became a publication policy: only the scoped name, only an
  exact `@x.y.z` pin (never `latest` or a range), and never as a client `command` (even pinned).
  `test/security/mcp-defense.test.mjs` covers all three; the suite still has 325 tests.
- `scripts/install.sh` / `scripts/install.ps1` (fallback): public clone with `git` (gh optional),
  one-liner via `raw.githubusercontent.com`, checkout detection by the scoped name, default home
  `~/.local/share/darktrace-mcp/source` (an existing clone one level up is still detected, because
  `~/.local/share/darktrace-mcp/<version>/` is now used by the fixed copies). shellcheck clean.

### `release.yml`

Trigger: `push` of `v*` tags (plus `workflow_dispatch` on a tag). Jobs, all pinned by commit SHA:

| Job | Permissions | What it does |
| --- | --- | --- |
| `prepare` | `contents: read` | Unchanged gate: tag must equal the package version, `npm run release:prepare` (clean install, typecheck, tests, security suite, two reproducible builds, tarball verification), artifact `darktrace-mcp-release-candidate` (30 days). |
| `publish-npm` | `contents: read`, `id-token: write` | Node 24, requires npm ≥ 11.5.1 (installs npm 11 otherwise), downloads the candidate, `sha256sum -c SHA256SUMS`, checks the tarball's `package.json` (name, version = tag, no `private`, public access, `mcpName`, no lifecycle scripts), then `npm publish <tgz> --provenance --access public` with **trusted publishing (OIDC)**. If an `NPM_TOKEN` secret exists it is used instead (temporary `NPM_CONFIG_USERCONFIG`) with a warning. Records `npm view` output in the step summary. |
| `publish-ghcr` | `contents: read`, `packages: write` | Matrix amd64 (`ubuntu-24.04`) / arm64 (`ubuntu-24.04-arm`): `prepare-docker-runtime.mjs`, buildx, `docker/login-action` with `GITHUB_TOKEN`, build with `--build-context runtime-apks=…` and push **by digest** (`push-by-digest=true`), digest uploaded as an artifact. |
| `publish-ghcr-manifest` | `packages: write` | `docker buildx imagetools create -t ghcr.io/nuoframework/darktrace-mcp:<version> <amd64 digest> <arm64 digest>`, records the manifest-list digest and the `setup --runtime docker --image name@sha256:…` command in the summary and in the `ghcr-image-digest` artifact (90 days). No `latest` tag. |

Sources checked on 2026-10-06 (Context7): docs.npmjs.com/trusted-publishers (npm ≥ 11.5.1, Node
≥ 22.14, `id-token: write`, no token needed, `--provenance`), docs.npmjs.com/generating-provenance-statements,
modelcontextprotocol/registry docs (server.json npm/oci packages, `mcpName`, `mcp-publisher login
github|github-oidc`, `validate`, `publish`).

One-time owner steps (also in `docs/releases.md`): configure the trusted publisher on npmjs.com
(org `nuoframework`, repo `darktrace-mcp`, workflow `release.yml`); if the package name does not
exist yet, the first publish can use the `NPM_TOKEN` fallback, then remove the secret; set the ghcr
package to public after the first push; publish `server.json` with `mcp-publisher` after the npm
version is live.

### CLI: npx bootstrap and fixed copy (`src/cli/install.ts`)

`npx -y @nuoframework/darktrace-mcp@1.1.0 setup` runs the CLI from `~/.npm/_npx/<hash>/…`. That
path is temporary and would make every client start depend on the registry, so:

- `isTransientInstall(entryPath, ctx)`: true when the resolved entry path has a `_npx` segment or
  lies under `npm_config_cache`, `~/.npm` or (Windows) `%LOCALAPPDATA%\npm-cache`.
- `installFixedCopy(entryPath, ctx, dryRun)`: copies `<npx root>/node_modules` (our package plus its
  three locked dependencies, already integrity-checked by npm) to
  `$XDG_DATA_HOME/darktrace-mcp/<version>/` (default `~/.local/share/darktrace-mcp/<version>/`,
  Windows `%LOCALAPPDATA%\darktrace-mcp\<version>\`), skipping symlinks and `.bin`, via a temp dir +
  rename; reuses a valid existing copy; refuses symlinked targets; verifies the result.
  No network, no `npm install -g` (which may need sudo and a reachable registry).
- `setup` (node runtime) calls it before building the client entry, so clients get
  `command: <abs node>`, `args: [<fixed copy>/node_modules/@nuoframework/darktrace-mcp/dist/src/index.js]`.
  `--dry-run` only reports the planned path. `config <client>` prefers an existing fixed copy and
  otherwise warns that the printed path is temporary.
- Help text and docs describe this. Tests: `test/cli/npx-install.test.ts` (detection on POSIX and
  Windows paths, layout parsing, copy/reuse/idempotence, `.bin` exclusion, `config` behaviour).

The `~/.npmrc` / GitHub-token `doctor` check from the first brief was dropped with the public-npm
decision (no token is needed to install).

### Documentation

README (EN/ES), `docs/getting-started.md`, `docs/clients.md`, `docs/docker.md`, `docs/releases.md`
and the `docs/es/` mirrors: primary path `npx -y @nuoframework/darktrace-mcp@1.1.0 setup`;
`.mcpb` downloaded from the GitHub release; Docker via `ghcr.io/nuoframework/darktrace-mcp:1.1.0`
pinned by digest through `setup --runtime docker --image name@sha256:…`; `install.sh` from
`raw.githubusercontent.com` as the source fallback; a per-client one-liner table (`claude mcp add`,
`codex mcp add`, `code --add-mcp`, Cursor deeplink via `config cursor`, `gemini mcp add`);
distribution channels and the owner publishing procedure in `docs/releases.md`. "Private
repository / gh auth" prerequisites removed from README, getting started, CONTRIBUTING, SECURITY
(distribution paragraph), architecture and troubleshooting.

## Verification (local, macOS, Node 24.14.1, npm 11.11.0)

| Check | Result |
| --- | --- |
| `npm run typecheck` | OK |
| `npm test` | 155 tests, 0 failed (baseline 151 + 4 new CLI tests) |
| `npm run test:security` | 325 tests, 322 passed, 3 skipped (macOS baseline) |
| `node scripts/validate-examples.mjs` | 9 JSON + 1 TOML examples, 8 documents, pass |
| `node scripts/generate-tools-doc.mjs --check` | `docs/tools.md` up to date |
| `npm pack` | `nuoframework-darktrace-mcp-1.1.0.tgz`, 44 files |
| `npm publish --dry-run <tgz>` | "Publishing to https://registry.npmjs.org with tag latest and public access (dry-run)"; nothing published |
| `npm run release:prepare` | exit 0: clean `npm ci`, typecheck, 155 tests, security suite, two reproducible builds, `verify-release` (all checks true, `publicPackageMetadata` included), examples; archive `nuoframework-darktrace-mcp-1.1.0.tgz`, 44 files, sha256 `3a011534…cf83f6c`; nine assets in `SHA256SUMS` |
| `mcp-publisher validate server.json` | valid |
| `npx @anthropic-ai/mcpb validate manifest.json` | passes |
| `shellcheck scripts/install.sh` | clean |

## Open points for the owner

- `.github/workflows/ci.yml` still pins the production source-tree hash
  (`582a1212…`) and runtime hashes of the previous tree, and expects 130 functional tests; any
  `src/` change (including this branch and the other agent's) invalidates those pins. They need a
  refresh after merge.
- `SECURITY.md` still describes the private-repository vulnerability-reporting route (issue titled
  "Security contact request"); with a public repository, GitHub private vulnerability reporting
  becomes available. That is a policy decision, so only the distribution paragraph was changed.
- First publish: trusted publishing needs the package to exist or the `NPM_TOKEN` fallback (see
  `docs/releases.md`). The ghcr package must be switched to public once.
- The historical v1.0.0 sections in `docs/releases.md` and `docs/docker.md` were kept as history.
