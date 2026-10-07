# Install

[Español](../install.md) · **English**

[README](../../README.en.md) · [Clients (details)](clients.md) · [Install matrix (audit)](install-matrix.md) · [Getting started](getting-started.md) · [Docker](docker.md) · [Troubleshooting](troubleshooting.md)

Install the server with one command and choose the path for your client.

> **Version scope.** 1.1.2 includes the eight original clients, `uninstall` and the Docker wizard. The 13 additional adapters, `darktrace_setup_status` and the new Windsurf path are **available on `main` and arrive in 1.1.3**. They are not in npm 1.1.2: use the manual snippets for those clients.

One command starts the process: it asks for settings, checks the appliance with a signed request, stores tokens in owner-only files and writes entries into detected clients:

```sh
npx -y @nuoframework/darktrace-mcp@1.1.2 setup
```

Then restart the client and ask it: **"list my Darktrace devices"**.

You need Node.js 22+, the appliance address (`https://<your-appliance>`) and an API token pair (Darktrace: **System Config → Settings → API Token**). No settings, tokens or client entries are written before the appliance check passes; `--dry-run` shows the plan without writing.

## Pick your client

Each line is the shortest path. `darktrace-mcp` means `npx -y @nuoframework/darktrace-mcp@1.1.2` unless you installed the package globally; new IDs need the future release described above. `config <client>` prints the exact snippet with your real paths and no secrets.

| Client | Shortest path | Where the entry lives |
|---|---|---|
| **Claude Desktop** | `setup --client claude-desktop`, or download the `.mcpb` from the [release](https://github.com/nuoframework/darktrace-mcp/releases) and open it (tokens go to the OS keychain) | `claude_desktop_config.json` ([details](clients.md#claude-desktop)) |
| **Claude Code** | `setup --client claude-code` (runs `claude mcp add --scope user …`), or the [plugin](plugin-distribution.md) | `~/.claude.json` ([details](clients.md#claude-code)) |
| **Codex CLI / Codex app** | `setup --client codex` (runs `codex mcp add …`, or edits the file) | `~/.codex/config.toml` ([details](clients.md#codex)) |
| **Cursor** | click the Cursor badge in the [README](../../README.en.md#install-in-one-minute), then run `setup`; or `setup --client cursor` | `~/.cursor/mcp.json` ([details](clients.md#cursor)) |
| **VS Code (Copilot agent mode)** | click the VS Code badge (it prompts for the URL and tokens and keeps the tokens in its secret storage); or `setup --client vscode` | user `mcp.json` ([details](clients.md#vs-code)) |
| **VS Code Insiders** | the Insiders badge, same prompts | user `mcp.json` |
| **Windsurf (Devin Desktop)** | `setup --client windsurf` | upcoming `~/.config/devin/mcp_config.json`; previous path in 1.1.2 ([details](clients.md#windsurf)) |
| **OpenCode** | `setup --client opencode` | `~/.config/opencode/opencode.json` ([details](clients.md#opencode)) |
| **Gemini CLI** | `setup --client gemini` | `~/.gemini/settings.json` ([details](clients.md#gemini-cli)) |
| **Zed** (1.1.3) | `setup --client zed` (a settings file with comments gets a paste snippet instead) | `~/.config/zed/settings.json` → `context_servers` ([details](clients.md#zed)) |
| **Cline** (1.1.3) | `setup --client cline` | Cline's `cline_mcp_settings.json` in VS Code storage ([details](clients.md#cline)) |
| **Roo Code** (1.1.3) | `setup --client roo` | Roo's `mcp_settings.json` in VS Code storage ([details](clients.md#roo-code)) |
| **Continue** (1.1.3) | `setup --client continue` (adds a marked item to `mcpServers`) | `~/.continue/config.yaml` ([details](clients.md#continue)) |
| **Kiro** (1.1.3) | `setup --client kiro`; `config kiro` also prints a `kiro.dev/launch` link | `~/.kiro/settings/mcp.json` ([details](clients.md#kiro)) |
| **Amp** (1.1.3) | `setup --client amp` | `~/.config/amp/settings.json` → `amp.mcpServers` ([details](clients.md#amp)) |
| **GitHub Copilot CLI** (1.1.3) | `setup --client copilot-cli` | `~/.copilot/mcp-config.json` ([details](clients.md#github-copilot-cli)) |
| **Warp** (1.1.3) | `setup --client warp` | `~/.warp/.mcp.json` ([details](clients.md#warp)) |
| **Goose** (1.1.3) | `setup --client goose` (adds a marked entry to `extensions`) | `~/.config/goose/config.yaml` ([details](clients.md#goose)) |
| **LM Studio** (1.1.3) | `setup --client lmstudio`; `config lmstudio` also prints an `lmstudio://add_mcp` link | `~/.lmstudio/mcp.json` ([details](clients.md#lm-studio)) |
| **Antigravity** (1.1.3) | `setup --client antigravity` | `~/.gemini/config/mcp_config.json` ([details](clients.md#antigravity)) |
| **JetBrains Junie** (1.1.3) | `setup --client junie` | `~/.junie/mcp/mcp.json` ([details](clients.md#jetbrains-junie)) |
| **JetBrains AI Assistant** (1.1.3) | `config jetbrains`, paste into Settings \| Tools \| AI Assistant \| MCP \| Add (or "Import from Claude" after a Claude Desktop setup) | no file ([details](clients.md#jetbrains-ai-assistant)) |

Several clients at once: `setup` lists detected clients and preselects them in the new presentation; `setup --client all` configures every client that has a file. All of them share the same token files.

The wizard uses `npx` only during installation; clients launch absolute paths or a pinned local image with `--pull=never`. Badges and the plugin have their own launch methods.

## What the badge does

GitHub removes non-HTTP schemes: buttons use the official [Cursor](https://cursor.com/en/install-mcp) and [VS Code](https://github.com/github/github-mcp-server#installation) HTTPS wrappers while preserving the encoded JSON and all input prompts exactly; Insiders adds `quality=insiders`.

A README badge cannot know your paths or tokens, so it adds a `darktrace` entry that starts the pinned package through `npx` with the `read` profile and nothing else. On `main`, for 1.1.3, a server without connection settings exposes exactly one tool, `darktrace_setup_status`, which says what is missing and the one command to run:

```sh
npx -y @nuoframework/darktrace-mcp@1.1.2 setup --client cursor
```

With the 1.1.2 Cursor badge, run `setup` before starting the server: setup mode is not included in that version. `setup` then rewrites the entry with an absolute Node path, a fixed copy of the package and the token file paths, and the Darktrace tools appear after a restart. The VS Code badges are different: VS Code prompts for the URL and both tokens itself, so they work without `setup`. These version-pinned badges are explicit bootstrap exceptions. Ordinary wizard entries use absolute paths to avoid a registry dependency at startup. If the npm cache is removed, a badge entry needs the registry again.

## Pinning the version

`npx -y @nuoframework/darktrace-mcp setup` (no version) installs the latest published version; check the [channel status](releases.md#release-status-2026-10-06) before installing. Pin an exact version when you want the same bytes on every machine, in scripts, in the badges and in anything a client entry launches. The wizard itself never writes `npx` into a client.

Badge versions come from `package.json`: after building, `node scripts/install-badges.mjs --write` updates both README files after a version bump. The corresponding test detects drift.

## Other paths

- **Docker.** `setup --runtime docker` checks that the daemon answers, proposes `ghcr.io/nuoframework/darktrace-mcp:1.1.2`, pulls it on request and writes a hardened entry that starts the immutable image ID with `--pull=never`. [Docker guide](docker.md#install).
- **Claude Desktop extension.** `darktrace-mcp-1.1.2.mcpb` from the GitHub release, or `npm run pack:mcpb` from a checkout. [Details](clients.md#claude-desktop).
- **Plugin and Codex marketplace.** See the [installation and distribution guide](plugin-distribution.md).
- **Manual.** `darktrace-mcp config <client>` prints the snippet with real paths; every client's file and shape is listed in [Clients](clients.md).
- **Build from source.** [Fallback](getting-started.md#fallback-build-from-source).

## Windows

Native Windows cannot prove that a token file is owner-only (Node has no file-ACL API), so the server refuses token files there. These paths work natively without that trade-off: the Claude Desktop `.mcpb` (OS keychain), the VS Code badge or `config vscode` link (secret storage), Docker Desktop, or WSL with the Linux command. For any other client, `setup --inline-tokens-windows` writes the token values into that client's file after an explicit consent notice. The analysis and the follow-up are in the [install matrix](install-matrix.md#windows-native).

<a id="check-and-remove"></a>

## Check, update and remove

```sh
npx -y @nuoframework/darktrace-mcp@1.1.2 test
npx -y @nuoframework/darktrace-mcp@1.1.2 uninstall
```

**Update is on `main` for 1.1.3.** npm 1.1.2 does not include `update` or update notifications. From the [built checkout](update.md), run:

```sh
node dist/src/index.js update
```

`test` performs one signed `GET /status` and says exactly what to fix; in 1.1.3 it also mentions a newer version when one exists. `update` verifies the newest release (registry signatures and provenance when announced, the new copy's `--check-config`, one signed request) and only then moves every client entry to it, keeping the previous version for `update --rollback`; `update --check` only reports. `uninstall` shows a plan, asks once, removes the `darktrace` entry from clients supported by the installed version (backups kept), the stored tokens and every fixed copy. [Update guide](update.md) · [Troubleshooting](troubleshooting.md).

The wizard uses user scope. Before trusting a project `.mcp.json`, review its commands and variables: they execute for everyone who trusts that repository.
