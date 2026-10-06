# Public distribution: npm, ghcr.io, MCP Registry and the npx bootstrap

Change notes for the owner (2026-10-06). Branch `nuoframework/dist-github-packages`. The owner's
decision during the work: the repository becomes **public** and the package is published to the
**public npm registry** (the earlier GitHub Packages plan was dropped before implementation).
Nothing was published from this branch; every publish step runs only in `release.yml` on a tag.

## What changed

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
