**English** · Spanish version maintained by the documentation track

# Install

[README](../README.md) · [Clients (details)](clients.md) · [Install matrix (audit)](install-matrix.md) · [Getting started](getting-started.md) · [Docker](docker.md) · [Troubleshooting](troubleshooting.md)

One command works everywhere. It asks five questions, checks the appliance with a signed request, stores the tokens in owner-only files and writes the entry into the clients it finds:

```sh
npx -y @nuoframework/darktrace-mcp@1.1.2 setup
```

Then restart the client and ask it: **"list my Darktrace devices"**.

You need Node.js 22+, the appliance address (`https://…`) and an API token pair (Darktrace: **System Config → Settings → API Token**). Nothing is written before the appliance check passes; `--dry-run` shows the plan without writing.

## Pick your client

Each line is the shortest path. `darktrace-mcp` means `npx -y @nuoframework/darktrace-mcp@1.1.2` unless you installed the package globally. `config <client>` prints the exact snippet with your real paths and no secrets.

| Client | Shortest path | Where the entry lives |
|---|---|---|
| **Claude Desktop** | `setup --client claude-desktop`, or download the `.mcpb` from the [release](https://github.com/nuoframework/darktrace-mcp/releases) and open it (tokens go to the OS keychain) | `claude_desktop_config.json` ([details](clients.md#claude-desktop)) |
| **Claude Code** | `setup --client claude-code` (runs `claude mcp add --scope user …`), or the [plugin](#other-paths) | `~/.claude.json` ([details](clients.md#claude-code)) |
| **Codex CLI / Codex app** | `setup --client codex` (runs `codex mcp add …`, or edits the file) | `~/.codex/config.toml` ([details](clients.md#codex)) |
| **Cursor** | click the Cursor badge in the [README](../README.md#install), then run `setup`; or `setup --client cursor` | `~/.cursor/mcp.json` ([details](clients.md#cursor)) |
| **VS Code (Copilot agent mode)** | click the VS Code badge (it prompts for the URL and tokens and keeps the tokens in its secret storage); or `setup --client vscode` | user `mcp.json` ([details](clients.md#vs-code)) |
| **VS Code Insiders** | the Insiders badge, same prompts | user `mcp.json` |
| **Windsurf (Devin Desktop)** | `setup --client windsurf` | `~/.config/devin/mcp_config.json` ([details](clients.md#windsurf)) |
| **OpenCode** | `setup --client opencode` | `~/.config/opencode/opencode.json` ([details](clients.md#opencode)) |
| **Gemini CLI** | `setup --client gemini` | `~/.gemini/settings.json` ([details](clients.md#gemini-cli)) |
| **Zed** | `setup --client zed` (a settings file with comments gets a paste snippet instead) | `~/.config/zed/settings.json` → `context_servers` ([details](clients.md#zed)) |
| **Cline** | `setup --client cline` | Cline's `cline_mcp_settings.json` in VS Code storage ([details](clients.md#cline)) |
| **Roo Code** | `setup --client roo` | Roo's `mcp_settings.json` in VS Code storage ([details](clients.md#roo-code)) |
| **Continue** | `setup --client continue` (adds a marked item to `mcpServers`) | `~/.continue/config.yaml` ([details](clients.md#continue)) |
| **Kiro** | `setup --client kiro`; `config kiro` also prints a `kiro.dev/launch` link | `~/.kiro/settings/mcp.json` ([details](clients.md#kiro)) |
| **Amp** | `setup --client amp` | `~/.config/amp/settings.json` → `amp.mcpServers` ([details](clients.md#amp)) |
| **GitHub Copilot CLI** | `setup --client copilot-cli` | `~/.copilot/mcp-config.json` ([details](clients.md#github-copilot-cli)) |
| **Warp** | `setup --client warp` | `~/.warp/.mcp.json` ([details](clients.md#warp)) |
| **Goose** | `setup --client goose` (adds a marked entry to `extensions`) | `~/.config/goose/config.yaml` ([details](clients.md#goose)) |
| **LM Studio** | `setup --client lmstudio`; `config lmstudio` also prints an `lmstudio://add_mcp` link | `~/.lmstudio/mcp.json` ([details](clients.md#lm-studio)) |
| **Antigravity** | `setup --client antigravity` | `~/.gemini/config/mcp_config.json` ([details](clients.md#antigravity)) |
| **JetBrains Junie** | `setup --client junie` | `~/.junie/mcp/mcp.json` ([details](clients.md#jetbrains-junie)) |
| **JetBrains AI Assistant** | `config jetbrains`, paste into Settings \| Tools \| AI Assistant \| MCP \| Add (or "Import from Claude" after a Claude Desktop setup) | no file ([details](clients.md#jetbrains-ai-assistant)) |

Several clients at once: `setup` lists the ones it detects and preselects them; `setup --client all` configures every client that has a file. All of them share the same token files.

## What the badge does

A README badge cannot know your paths or tokens, so it adds a `darktrace` entry that starts the pinned package through `npx` with the `read` profile and nothing else. The button only adds the entry; complete it with the wizard:

```sh
npx -y @nuoframework/darktrace-mcp@1.1.2 setup --client cursor
```

`setup` rewrites the entry with an absolute Node path, a fixed copy of the package and the token file paths, and the Darktrace tools appear after a restart. Until then the entry has no appliance to talk to: with the published 1.1.1 and 1.1.2 the server exits with `startup_error`; from the first version that ships setup mode (this branch, planned for 1.1.3) it starts anyway and exposes exactly one tool, `darktrace_setup_status`, whose description and result repeat the command above. The VS Code badges are different: VS Code prompts for the URL and both tokens itself, so they work without `setup`. Every other client entry must never run `npx`: each launch would depend on the registry and could silently pick up new code, which is why the wizard registers absolute paths.

## Pinning the version

`npx -y @nuoframework/darktrace-mcp setup` (no version) installs the latest published version; it was checked against the registry on 2026-10-06, when it resolved to 1.1.1; after the 1.1.2 publication it resolves to 1.1.2. Pin an exact version when you want the same bytes on every machine, in scripts, in the badges and in anything a client entry launches. The wizard itself never writes `npx` into a client. The version pinned in the badges comes from `package.json`: `node scripts/install-badges.mjs --write` rewrites the badge rows of every README after a version bump, and a test fails when they drift.

## Other paths

- **Docker.** `setup --runtime docker` checks that the daemon answers, proposes `ghcr.io/nuoframework/darktrace-mcp:1.1.2` (published index digest `sha256:fa261c2f7423fa79c66b0b5ddf74d6d8bb53b59a64608dda869959b43900d9ee`; pass it as `--image ghcr.io/nuoframework/darktrace-mcp@sha256:fa261c2f7423fa79c66b0b5ddf74d6d8bb53b59a64608dda869959b43900d9ee` to pin it yourself), pulls it on request and writes a hardened entry that starts the immutable image ID with `--pull=never`. [Docker guide](docker.md#install).
- **Claude Desktop extension.** `darktrace-mcp-1.1.2.mcpb` from the GitHub release, or `npm run pack:mcpb` from a checkout. [Details](clients.md#claude-desktop).
- **Claude Code plugin.** `claude plugin marketplace add nuoframework/darktrace-mcp`, then `claude plugin install darktrace-mcp@darktrace-mcp`; Claude Code asks for the URL, tokens and profile and keeps the tokens in the OS credential store. Codex: `codex plugin marketplace add nuoframework/darktrace-mcp`, `codex plugin add darktrace-mcp@darktrace-mcp`, then `setup` once for the connection. [Plugin guide](plugin-distribution.md).
- **Manual.** `darktrace-mcp config <client>` prints the snippet with real paths; every client's file and shape is listed in [Clients](clients.md).
- **Build from source.** [Fallback](getting-started.md#fallback-build-from-source).

## Windows

Native Windows cannot prove that a token file is owner-only (Node has no file-ACL API), so the server refuses token files there. These paths work natively without that trade-off: the Claude Desktop `.mcpb` (OS keychain), the VS Code badge or `config vscode` link (secret storage), Docker Desktop, or WSL with the Linux command. For any other client, `setup --inline-tokens-windows` writes the token values into that client's file after an explicit consent notice. The analysis and the follow-up are in the [install matrix](install-matrix.md#windows-native).

## Check and remove

```sh
npx -y @nuoframework/darktrace-mcp@1.1.2 test
npx -y @nuoframework/darktrace-mcp@1.1.2 uninstall
```

`test` performs one signed `GET /status` and says exactly what to fix. `uninstall` shows a plan, asks once, removes the `darktrace` entry from every client (backups kept), the stored tokens and the fixed copies. [Troubleshooting](troubleshooting.md).
