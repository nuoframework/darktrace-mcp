# Update, roll back, uninstall

[Español](../update.md) · **English**

[README](../../README.en.md) · [Install](install.md) · [Clients](clients.md) · [Docker](docker.md) · [Releases](releases.md) · [Threat model of updates](../security/threat-model-updates.md)

Update a pinned installation with verification, backups and a recoverable previous version.

**Version scope:** `update`, update notifications, `--update-mode` and removal of previous update images are available on `main` for 1.1.3; npm 1.1.2 does not include them. Until publication, run the examples from a [built source checkout](../../CONTRIBUTING.md).

The wizard pins every client entry to one version: an absolute path to a fixed copy of the package (node runtime) or one immutable image ID (Docker runtime). Nothing changes until you run `update`. The MCP server itself never contacts the registry and never checks for updates; only the installer commands below do, and only when you run them.

```sh
node dist/src/index.js update --check     # installed vs latest, release notes; exit 1 when an update exists
node dist/src/index.js update             # verify the new version, then move every client entry to it
node dist/src/index.js update --rollback  # back to the previous version (its copy or image is kept)
```

`darktrace-mcp` below means `node dist/src/index.js` in that built checkout; after 1.1.3 is published, use `npx -y @nuoframework/darktrace-mcp@1.1.3` or the global binary if you installed that version globally. The version in the prefix only chooses which copy of the installer runs; `update` always downloads the version it resolves from the registry.

## What `update` does

Node runtime (the default; what the wizard installs from `npx`):

1. Reads `~/.config/darktrace-mcp/setup.json`: appliance URL, profiles, date format, token-file paths and the entry the clients start. Token values are never read back; they stay in the two owner-only files.
2. Queries **registry.npmjs.org** with `npm view --json` for `latest` (or the exact `--version X.Y.Z`). The registry is fixed: `--registry` and the scoped-registry flag override any `.npmrc`, so a redirected registry cannot answer. A version older than the installed one is refused unless you pass `--allow-downgrade`.
3. Lists the clients that carry a `darktrace` entry today (file clients by reading their file, Claude Code through `claude mcp get`). Without `--yes` it asks once: `Update 1.1.2 -> 1.1.3? [Y/n]`.
4. `npm install` of the exact version into a fresh private temporary directory: production dependencies from the package's own shrinkwrap, `--ignore-scripts`, no `.bin` links, same fixed registry. npm checks every tarball against the integrity hash of the registry document.
5. `npm audit signatures` on that tree: the registry's ECDSA signature of every package and the Sigstore provenance attestation of each package that has one. Any invalid or missing signature, or a version whose registry record announces provenance that npm cannot verify, stops the update before anything is installed.
6. Copies the verified tree to `~/.local/share/darktrace-mcp/<new version>/` (the same copy mechanism `setup` uses: no symbolic links, no lifecycle scripts), replacing any directory already there under that name, and deletes the temporary directory.
7. Runs the new copy's own `--check-config` with the stored settings and token files, offline. This proves the new code loads your configuration and can read the tokens.
8. Sends one signed `GET /status` to the appliance with the stored settings (the same check as `darktrace-mcp test`).
9. Only now rewrites the `darktrace` entry in every client found in step 3, each file backed up first and replaced atomically; Claude Code is re-registered with `claude mcp add --scope user` (if that add fails, the previous entry is registered again so the client is never left without one).
10. Records the new version in `setup.json` together with `previousVersion` and the previous entry path, but only when every client in step 9 was rewritten. The previous copy stays on disk for `--rollback`; `uninstall` removes both.

If any step from 4 to 8 fails, no client entry changes and the previous version stays in use. A copy that was installed in step 6 before a later failure is harmless (clients do not start it); the next `update` downloads and verifies again and replaces it, and `uninstall` deletes it. If one client cannot be rewritten in step 9 (for example a settings file with comments, which the installer never rewrites), the command exits 1, names it, and leaves `setup.json` on the previous version: fix that client and rerun `update`, which moves it and reports the others as unchanged.

Docker runtime: the same sequence with the image instead of the package. `update` pulls `ghcr.io/nuoframework/darktrace-mcp:<new version>`, resolves the local image ID and the registry digest, runs the container `--check-config` with the client entry's mounts and user and `--network=none`, probes the appliance from the host, rewrites the entries with the new image ID (`--pull=never` as before) and records the previous image ID for rollback. A setup that pinned the image by digest or ID has no release version to compare, so `update` says that the downgrade check is skipped and still records the previous image. Compare the printed digest with the one in the [GitHub Release notes](releases.md) when you want an independent check of the image.

The summary ends with what was verified, where the copy or image lives, which clients were rewritten (with their backups) and the one next step: restart the clients.

## What is verified, and what is not

| Check | Mechanism | Proves | Not covered |
|---|---|---|---|
| Registry identity | `--registry=https://registry.npmjs.org/` and `--@nuoframework:registry=` on every npm call | A `.npmrc`, `npm_config_registry` or a scoped registry cannot redirect the query or the download | A compromised npmjs.org account or infrastructure (see [TM-U-01](../security/threat-model-updates.md)) |
| Tarball integrity | npm compares each tarball with the `dist.integrity` SHA-512 of the registry document | The bytes installed are the bytes the registry describes | That the registry document itself is honest |
| Registry signature | `npm audit signatures`: ECDSA signature by the registry's published key over `name@version:integrity`, for every package in the tree | The registry published exactly these bytes under this name and version | Who uploaded them |
| Provenance attestation | `npm audit signatures`: Sigstore bundle (SLSA v1) whose subject is the tarball digest, with the Fulcio certificate chain and the Rekor transparency-log entry | The tarball was built by a GitHub Actions workflow with OIDC trusted publishing and the statement is in the public log | npm does not pin the certificate identity to this repository's workflow; for that, run `gh attestation verify` on the release asset as described in [Releases](releases.md#verifying-release-signatures-and-provenance) |
| New code loads your settings | The new copy's `--check-config` with the stored environment, no network | The configuration, profiles and token files are accepted by the new version | Behaviour against the appliance |
| Appliance still answers | One signed `GET /status` from this host | URL, TLS, tokens and date format work before any entry changes | Every other operation |
| Entry rewrite | Same writers as `setup`: backup, temp file, atomic rename, symbolic links refused | A crash leaves the old file or the new one, never a half-written file | A client that keeps a copy of the entry elsewhere |

Every version of this package since 1.1.0 is published with npm trusted publishing and `--provenance`; `update --check` prints whether the registry announces provenance for the target version. The runtime files of the package are also pinned in CI by hash ([release pins](../security/release-pins-1.1.3.md)), which is a release-time control, not something `update` verifies on your machine.

## `update --check`

Prints the installed version (and where it lives), the latest published version, whether provenance is published, and the release notes of the target version from the GitHub release (bounded, control characters stripped). Exit code `0` when up to date, `1` when an update exists, `2` for a usage error. A registry or network failure is reported as an error with the next step. `--json` prints one JSON document instead of the text (fields: `command`, `runtime`, `status`, `current`, `target`, `releaseNotes`, `next`) and, outside `--check` and `--dry-run`, needs `--yes` because no question can be asked on a JSON stream; `--version X.Y.Z` compares against that version instead of `latest`.

`darktrace-mcp test` and `doctor --online` print one line, `Update available: 1.1.2 -> 1.1.3. Run: ...`, after the appliance answered, and only then. Nothing is printed when npm or the registry is unavailable, and the server never performs this check at start.

## `update --rollback`

Points every client entry back at `previousVersion` when its fixed copy (node) or image (Docker) is still present. It runs that copy's `--check-config` offline, rewrites the entries with backups, and swaps the two versions in `setup.json`, so a second `--rollback` returns to the newer one. There is no appliance probe during a rollback: it is the recovery path when the new version misbehaves, and the previous version was already probed when it was installed. If the previous copy or image is gone, nothing changes and the command tells you how to reinstall that version.

## Update modes

`setup` asks one question after the permissions step (node runtime only):

1. **pinned** (recommended, default): the entries start the fixed copy of one version until you run `update`. Verified download, `--check`, `--rollback`, works offline after the install.
2. **always latest**: the entries start `npx -y @nuoframework/darktrace-mcp@latest` (absolute `npx` path when found) with the same token-file environment. Every client start fetches the newest published release: no signature or provenance check, no appliance check before the switch, no rollback, and a start fails when the registry is unreachable. Choose it only when you accept that trade-off, for example on a disposable analyst workstation.

Non-interactive: `setup --update-mode pinned|npx-latest`. The mode is recorded in `setup.json` (`updateMode`); in `npx-latest` mode `update` has nothing to move and says so, `update --check` still shows what is published, and `test` prints no update line. To switch back, rerun `setup --update-mode pinned`: it installs the fixed copy and rewrites the entries. Docker entries are always pinned.

## Paths that clients manage themselves

`update` moves the entries that `setup` wrote. These paths are updated by the client or by you, not by `update`:

| Path | How to update | Notes |
|---|---|---|
| Claude Code plugin | `claude plugin update darktrace-mcp@darktrace-mcp` | The plugin's lockfile pins the package version; the update installs the new pin. Tokens stay in the OS credential store. [Plugin guide](plugin-distribution.md) |
| Codex plugin | `codex plugin marketplace upgrade darktrace-mcp` | Then `codex plugin add darktrace-mcp@darktrace-mcp` again if Codex asks; the `mcp_servers.darktrace` entry the wizard wrote is moved by `update` as usual |
| Claude Desktop extension (`.mcpb`) | Download `darktrace-mcp-<version>.mcpb` from the [release](https://github.com/nuoframework/darktrace-mcp/releases) (or update it from the Claude Directory listing) and open it | Keychain tokens are kept; the entry `setup` wrote, if you also have one, is moved by `update` |
| Docker pinned by digest in a hand-written entry | `docker pull ghcr.io/nuoframework/darktrace-mcp@sha256:<new digest>` from the release notes, then edit the entry | `setup --runtime docker` followed by `update` does this for you and keeps the previous image |
| Source checkout (`scripts/install.sh` or `git clone`) | `git pull --ff-only && npm ci --ignore-scripts && npm run build`, or rerun `scripts/install.sh` | `update` refuses to touch a checkout and prints these commands |
| Global npm install | `npm install -g @nuoframework/darktrace-mcp@<new version>`, then `darktrace-mcp setup` | `update` detects the layout and prints the command; `uninstall` prints the matching `npm uninstall -g` |
| JetBrains AI Assistant (paste-only) | After `update`, run `darktrace-mcp config jetbrains` and paste the new JSON | No file is documented for this client, so nothing can be rewritten |

## Uninstall

`darktrace-mcp uninstall` stays the single removal path. It shows a plan, asks once, removes the `darktrace` entry from every client (backups kept), deletes the stored tokens and `setup.json`, deletes every fixed copy in `~/.local/share/darktrace-mcp/` including the ones `update` installed and the previous copy kept for rollback (`--keep-copies` keeps them), and with `--docker` removes exactly the image ID in use and the previous one recorded by `update`, never other images. Backups and the client-managed paths above are left for you.

## Files

| File | Written by | Content |
|---|---|---|
| `~/.config/darktrace-mcp/setup.json` (0600) | `setup`, `update` | Non-secret choices plus `installedVersion`, `entryPath` (node), `updateMode` (node only), `previousVersion`, `previousEntryPath` or `previousImage` and `previousImageDigest`; written only after every client entry moved |
| `~/.local/share/darktrace-mcp/<version>/` | `setup` (from the npx cache), `update` | One fixed copy per version: the package and its locked dependencies, no symbolic links |
| `<client config>.bak-<timestamp>` | every rewrite | The file as it was before `setup`, `update`, `--rollback`, `remove` or `uninstall` touched it |
| Temporary `darktrace-mcp-update-*` directory | `update` | The download under verification; removed before the command ends, also on failure |

Windows note: a setup that wrote token values into client files (`--inline-tokens-windows`) is not moved by `update`, because the values are never read back; rerun `setup` with the new version instead. Docker Desktop and WSL setups update normally.

## Troubleshooting

- `registry.npmjs.org could not be queried`: no network, a proxy that blocks npm, or an old npm. `npm view @nuoframework/darktrace-mcp version` from a shell shows the same problem. Nothing was changed.
- `npm audit signatures rejected the downloaded tree`: do not install that version. Check `npm --version` (9.5 or newer verifies attestations), retry once, then report it with the printed npm line.
- `the appliance check (signed GET /status) failed`: the new copy is installed but no entry changed. Run `darktrace-mcp test`, fix the URL, TLS, tokens or date format, then rerun `update`.
- `downgrades are refused`: you asked for an older version; add `--allow-downgrade` only when you mean it.
- A client still runs the old version after the update: restart it completely (Claude Desktop: quit from the menu). `darktrace-mcp config <client>` prints the entry that should now be in its file.
