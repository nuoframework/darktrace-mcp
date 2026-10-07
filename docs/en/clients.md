# Client setup

[Español](../clients.md) · **English**

[README](../../README.en.md) · [Getting started](getting-started.md) · [Update](update.md) · [Configuration](configuration.md) · [Troubleshooting](troubleshooting.md)

Configure each MCP client automatically or with explicit paths and files.

Every client can be set up two ways:

- **Automatic:** `darktrace-mcp setup` finds the client and writes the entry for you (with a backup).
- **Manual:** `darktrace-mcp config <client>` prints the snippet with your real paths filled in. Paste it into the file shown below.

`setup` checks the appliance once and records the signature date format it accepts as `DARKTRACE_DATE_FORMAT` in every entry it writes (and `config` reuses it). If you write an entry by hand for an appliance that answers HTTP 400 to `darktrace-mcp test`, add `"DARKTRACE_DATE_FORMAT": "spaced"` to its `env`; see [signature date format](configuration.md#signature-date-format).

| Client | `<client>` name | Config file |
|---|---|---|
| [Claude Desktop](#claude-desktop) | `claude-desktop` | macOS `~/Library/Application Support/Claude/claude_desktop_config.json`, Windows `%APPDATA%\Claude\claude_desktop_config.json` |
| [Claude Code](#claude-code) | `claude-code` | `~/.claude.json` (via `claude mcp add`) |
| [Codex](#codex) | `codex` | `~/.codex/config.toml` |
| [Cursor](#cursor) | `cursor` | `~/.cursor/mcp.json` |
| [VS Code](#vs-code) | `vscode` | User `mcp.json` (**MCP: Open User Configuration**) |
| [Windsurf](#windsurf) | `windsurf` | 1.1.2: `~/.codeium/windsurf/mcp_config.json`; 1.1.3: `~/.config/devin/mcp_config.json`, retaining the old path when present |
| [OpenCode](#opencode) | `opencode` | `~/.config/opencode/opencode.json` |
| [Gemini CLI](#gemini-cli) | `gemini` | `~/.gemini/settings.json` |
| [Zed](#zed) (1.1.3) | `zed` | `~/.config/zed/settings.json` (`context_servers`) |
| [Cline](#cline) (1.1.3) | `cline` | `<VS Code user dir>/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json` |
| [Roo Code](#roo-code) (1.1.3) | `roo` | `<VS Code user dir>/globalStorage/rooveterinaryinc.roo-cline/settings/mcp_settings.json` |
| [Continue](#continue) (1.1.3) | `continue` | `~/.continue/config.yaml` (`mcpServers` list) |
| [Kiro](#kiro) (1.1.3) | `kiro` | `~/.kiro/settings/mcp.json` |
| [Amp](#amp) (1.1.3) | `amp` | `~/.config/amp/settings.json` (`amp.mcpServers`) |
| [GitHub Copilot CLI](#github-copilot-cli) (1.1.3) | `copilot-cli` | `~/.copilot/mcp-config.json` |
| [Warp](#warp) (1.1.3) | `warp` | `~/.warp/.mcp.json` |
| [Goose](#goose) (1.1.3) | `goose` | `~/.config/goose/config.yaml` (`extensions` map; Windows `%APPDATA%\Block\goose\config\config.yaml`) |
| [LM Studio](#lm-studio) (1.1.3) | `lmstudio` | `~/.lmstudio/mcp.json` |
| [Antigravity](#antigravity) (1.1.3) | `antigravity` | `~/.gemini/config/mcp_config.json` |
| [JetBrains Junie](#jetbrains-junie) (1.1.3) | `junie` | `~/.junie/mcp/mcp.json` |
| [JetBrains AI Assistant](#jetbrains-ai-assistant) (1.1.3) | `jetbrains` | none: paste into Settings \| Tools \| AI Assistant \| MCP |
| [Docker](#docker) | — | Any of the above |

Clients marked **1.1.3** are available on `main` and arrive in that release; use manual configuration with npm 1.1.2. [Installation](install.md) · [Matrix and vendor sources](install-matrix.md). `<VS Code user dir>` is `~/Library/Application Support/Code/User` on macOS, `~/.config/Code/User` on Linux and `%APPDATA%\Code\User` on Windows.

**Unconfigured startup (1.1.3).** `main` exposes only `darktrace_setup_status` when connection settings are absent. An incomplete 1.1.2 entry exits with `startup_error`: run setup and restart the client.

**Updates (1.1.3).** `update`, its notifications and `--update-mode` are on `main` for 1.1.3; npm 1.1.2 does not include them. Update examples use the [built checkout executable](update.md). Plugin and `.mcpb` paths are managed separately.

## Rules for every manual snippet

- Use **absolute paths** for Node, for `dist/src/index.js` and for the token files. `~` and `$HOME` are not expanded by most clients.
- Put token **file paths** in the config, never token values.
- The snippets below use the default `read` profile. To allow more, change `DARKTRACE_PROFILES` (see [profiles](configuration.md#profiles)).
- Restart the client after editing its config.

Find your paths:

```sh
node -p 'process.execPath'
node -p 'require("node:path").resolve("dist/src/index.js")'
```

Run the second command inside the `darktrace-mcp` folder. After the `npx` bootstrap the entry is `~/.local/share/darktrace-mcp/1.1.2/node_modules/@nuoframework/darktrace-mcp/dist/src/index.js`.

## One-line install per client

`darktrace-mcp setup` runs these for you. To run them yourself, use your absolute Node path (`node -p process.execPath`), the entry path above, and the token files the wizard created under `~/.config/darktrace-mcp/`.

| Client | Command |
|---|---|
| Claude Code | `claude mcp add --scope user --env DARKTRACE_URL='https://<your-appliance>' --env DARKTRACE_PUBLIC_TOKEN_FILE=/abs/public-token --env DARKTRACE_PRIVATE_TOKEN_FILE=/abs/private-token --env DARKTRACE_PROFILES=read --transport stdio darktrace -- /abs/node /abs/index.js` |
| Codex | `codex mcp add darktrace --env DARKTRACE_URL='https://<your-appliance>' --env DARKTRACE_PUBLIC_TOKEN_FILE=/abs/public-token --env DARKTRACE_PRIVATE_TOKEN_FILE=/abs/private-token --env DARKTRACE_PROFILES=read -- /abs/node /abs/index.js` |
| Claude Code (plugin) | `claude plugin marketplace add nuoframework/darktrace-mcp` then `claude plugin install darktrace-mcp@darktrace-mcp`; Claude Code asks for the URL, the tokens and the profile ([plugin guide](plugin-distribution.md)) |
| Codex (plugin) | `codex plugin marketplace add nuoframework/darktrace-mcp` then `codex plugin add darktrace-mcp@darktrace-mcp`; the skill loads, the connection still comes from `darktrace-mcp setup` ([plugin guide](plugin-distribution.md#install-from-the-repository-marketplace)) |
| VS Code | `code --add-mcp '{"name":"darktrace","type":"stdio","command":"/abs/node","args":["/abs/index.js"],"env":{…}}'`; `darktrace-mcp config vscode` prints it filled in, plus a `vscode:mcp/install` link whose password inputs keep the tokens in VS Code's secret storage |
| Cursor | `darktrace-mcp config cursor` prints a `cursor://anysphere.cursor-deeplink/mcp/install?…` link |
| Gemini CLI | `gemini mcp add --scope user -e DARKTRACE_URL='https://<your-appliance>' -e DARKTRACE_PUBLIC_TOKEN_FILE=/abs/public-token -e DARKTRACE_PRIVATE_TOKEN_FILE=/abs/private-token -e DARKTRACE_PROFILES=read darktrace /abs/node /abs/index.js` |
| Claude Desktop | `.mcpb` from the release (below) |
| Windsurf, OpenCode | JSON snippets below (no CLI) |

Use absolute paths in manual client configuration; the wizard writes them automatically. The Claude Code plugin also avoids registry access at startup: it installs version 1.1.2 from its lockfile and runs `node` on the installed entry. The Codex copy uses `npx -y @nuoframework/darktrace-mcp@1.1.2` because that client has no lockfile install. The [installation badges](install.md#what-the-badge-does) are another explicit version-pinned bootstrap exception.

## Claude Desktop

**Update (1.1.3).** `darktrace-mcp update` rewrites this entry after verifying the new version (file backed up; `update --rollback` restores the previous one). Installed from the `.mcpb` instead: open the new `.mcpb` from the release; the keychain tokens are kept. [Update guide](update.md).

**Automatic.** Either run `darktrace-mcp setup`, or install the extension: download `darktrace-mcp-1.1.2.mcpb` from the [v1.1.2 release](https://github.com/nuoframework/darktrace-mcp/releases/tag/v1.1.2) (or build it from a checkout with `npm run pack:mcpb`) and double-click it. Claude Desktop asks for the URL, tokens and profile. It stores the tokens in your OS keychain.

**Manual.** Settings → Developer → Edit Config. Merge this into `mcpServers`, keeping your other servers:

```json
{
  "mcpServers": {
    "darktrace": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/darktrace-mcp/dist/src/index.js"],
      "env": {
        "DARKTRACE_URL": "https://<your-appliance>",
        "DARKTRACE_PUBLIC_TOKEN_FILE": "/absolute/private/darktrace/public-token",
        "DARKTRACE_PRIVATE_TOKEN_FILE": "/absolute/private/darktrace/private-token",
        "DARKTRACE_PROFILES": "read",
        "DARKTRACE_SENSITIVE_READ": "false"
      }
    }
  }
}
```

Quit Claude Desktop completely and open it again.

## Claude Code

**Update (1.1.3).** `darktrace-mcp update` re-registers the server with `claude mcp add --scope user` on the verified new path. Plugin install: `claude plugin update darktrace-mcp@darktrace-mcp`. [Update guide](update.md).

**Automatic.** `darktrace-mcp setup` adds a user-scoped server.

**Plugin.** The repository is a plugin marketplace. The plugin installs the npm package pinned to `1.1.2` from its lockfile and starts it with Node, adds the `darktrace-investigation` skill, and asks for the appliance URL, both tokens (stored in the operating system's credential store) and the profile when you enable it; change the profile later in `/config`. It also works in Cowork sessions on your machine, but not in chat on claude.ai. Details, Claude Directory listing and limitations: [plugin distribution](plugin-distribution.md).

```sh
claude plugin marketplace add nuoframework/darktrace-mcp
claude plugin install darktrace-mcp@darktrace-mcp
```

**Manual.**

```sh
claude mcp add --scope user \
  --env DARKTRACE_URL='https://<your-appliance>' \
  --env DARKTRACE_PUBLIC_TOKEN_FILE=/absolute/private/darktrace/public-token \
  --env DARKTRACE_PRIVATE_TOKEN_FILE=/absolute/private/darktrace/private-token \
  --env DARKTRACE_PROFILES=read \
  --transport stdio darktrace -- \
  /absolute/path/to/node /absolute/path/to/darktrace-mcp/dist/src/index.js
claude mcp get darktrace
```

Use `/mcp` inside Claude Code to see the server. Prefer `--scope user`. A project `.mcp.json` runs for everyone who trusts the repository, so only use one after you review every command and variable in it.

**Approving critical actions.** Keep the default `DARKTRACE_CRITICAL_APPROVAL=elicitation`. Claude Code uses protocol 2026-07-28 and declares form elicitation on every request (tested with Claude Code 2.1.289). After Claude repeats a previewed call with `confirm:true`, Claude Code shows "MCP server "darktrace" requests your input" with the exact operation and values, plus **Accept** / **Decline**. Nothing is sent unless you choose Accept. See [human approval](configuration.md#human-approval).

- **Non-interactive runs** (`claude -p`, CI): there is nobody to show the dialog to, so Claude Code answers "cancel". The action is refused and not retried. To approve in automation, answer the dialog with an `Elicitation` hook you control. The hook receives the server's message (operation and values) and can return accept or decline.
- **`DARKTRACE_CRITICAL_APPROVAL=host`**: use it only if you can't answer the dialog, for example with an older Claude Code that refuses with `"approval":"unsupported"`. Then the only check is Claude Code's per-tool permission prompt. An allow rule (`--allowedTools`, "always allow") approves every later critical call to that tool without showing you the values.

## Codex

**Update (1.1.3).** `darktrace-mcp update` rewrites `mcp_servers.darktrace` (backup kept) or re-runs `codex mcp add`. Plugin install: `codex plugin marketplace upgrade darktrace-mcp`. [Update guide](update.md).

**Automatic.** `darktrace-mcp setup`.

**Plugin.** `codex plugin marketplace add nuoframework/darktrace-mcp` then `codex plugin add darktrace-mcp@darktrace-mcp` installs the `darktrace-investigation` skill and a bundled server. Codex does not prompt for configuration and passes the bundled server only the variables declared in the plugin, so that server cannot reach your appliance; configure the connection with `darktrace-mcp setup` (below) and disable the bundled copy with `[plugins."darktrace-mcp@darktrace-mcp".mcp_servers.darktrace]` `enabled = false` in `~/.codex/config.toml`. See [plugin distribution](plugin-distribution.md#install-from-the-repository-marketplace).

**Manual.** Add to `~/.codex/config.toml`. The Codex CLI and IDE extension share this file.

```toml
[mcp_servers.darktrace]
command = "/absolute/path/to/node"
args = ["/absolute/path/to/darktrace-mcp/dist/src/index.js"]

[mcp_servers.darktrace.env]
DARKTRACE_URL = "https://<your-appliance>"
DARKTRACE_PUBLIC_TOKEN_FILE = "/absolute/private/darktrace/public-token"
DARKTRACE_PRIVATE_TOKEN_FILE = "/absolute/private/darktrace/private-token"
DARKTRACE_PROFILES = "read"
```

Check it with `codex mcp list`.

## Cursor

**Update (1.1.3).** `darktrace-mcp update` rewrites this entry after verifying the new version (file backed up; `update --rollback` restores the previous one). [Update guide](update.md).

**Automatic.** `darktrace-mcp setup`, or get a one-click install link:

```sh
darktrace-mcp config cursor
```

Open the printed `cursor://` link and confirm in Cursor.

**Manual.** Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "darktrace": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/darktrace-mcp/dist/src/index.js"],
      "env": {
        "DARKTRACE_URL": "https://<your-appliance>",
        "DARKTRACE_PUBLIC_TOKEN_FILE": "/absolute/private/darktrace/public-token",
        "DARKTRACE_PRIVATE_TOKEN_FILE": "/absolute/private/darktrace/private-token",
        "DARKTRACE_PROFILES": "read",
        "DARKTRACE_SENSITIVE_READ": "false"
      }
    }
  }
}
```

Check it under Cursor Settings → MCP.

## VS Code

**Update (1.1.3).** `darktrace-mcp update` rewrites this entry after verifying the new version (file backed up; `update --rollback` restores the previous one). [Update guide](update.md).

**Automatic.** `darktrace-mcp setup`, or get a one-click install link:

```sh
darktrace-mcp config vscode
```

Open the printed link and confirm in VS Code.

**Manual.** Run **MCP: Open User Configuration** and add:

```json
{
  "servers": {
    "darktrace": {
      "type": "stdio",
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/darktrace-mcp/dist/src/index.js"],
      "env": {
        "DARKTRACE_URL": "https://<your-appliance>",
        "DARKTRACE_PUBLIC_TOKEN_FILE": "/absolute/private/darktrace/public-token",
        "DARKTRACE_PRIVATE_TOKEN_FILE": "/absolute/private/darktrace/private-token",
        "DARKTRACE_PROFILES": "read",
        "DARKTRACE_SENSITIVE_READ": "false"
      }
    }
  }
}
```

Use **MCP: List Servers** to start or inspect it. Prefer the user configuration over a workspace `.vscode/mcp.json`.

## Windsurf

**Update (1.1.3).** `darktrace-mcp update` rewrites this entry after verifying the new version (file backed up; `update --rollback` restores the previous one). [Update guide](update.md).

For Devin Desktop, the current manual path is `~/.config/devin/mcp_config.json` (Windows `%APPDATA%\devin\mcp_config.json`). The 1.1.2 wizard uses the older path in the example; 1.1.3 prefers the new path and retains the old one when it already exists.

**Automatic.** `darktrace-mcp setup`.

**Manual.** Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "darktrace": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/darktrace-mcp/dist/src/index.js"],
      "env": {
        "DARKTRACE_URL": "https://<your-appliance>",
        "DARKTRACE_PUBLIC_TOKEN_FILE": "/absolute/private/darktrace/public-token",
        "DARKTRACE_PRIVATE_TOKEN_FILE": "/absolute/private/darktrace/private-token",
        "DARKTRACE_PROFILES": "read",
        "DARKTRACE_SENSITIVE_READ": "false"
      }
    }
  }
}
```

Refresh the MCP list in Windsurf's Cascade panel.

## OpenCode

**Update (1.1.3).** `darktrace-mcp update` rewrites this entry after verifying the new version (file backed up; `update --rollback` restores the previous one). [Update guide](update.md).

**Automatic.** `darktrace-mcp setup`.

**Manual.** Add to `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "darktrace": {
      "type": "local",
      "command": ["/absolute/path/to/node", "/absolute/path/to/darktrace-mcp/dist/src/index.js"],
      "enabled": true,
      "environment": {
        "DARKTRACE_URL": "https://<your-appliance>",
        "DARKTRACE_PUBLIC_TOKEN_FILE": "/absolute/private/darktrace/public-token",
        "DARKTRACE_PRIVATE_TOKEN_FILE": "/absolute/private/darktrace/private-token",
        "DARKTRACE_PROFILES": "read"
      }
    }
  }
}
```

## Gemini CLI

**Update (1.1.3).** `darktrace-mcp update` rewrites this entry after verifying the new version (file backed up; `update --rollback` restores the previous one). [Update guide](update.md).

**Automatic.** `darktrace-mcp setup`.

**Manual.** Either use the CLI:

```sh
gemini mcp add --scope user \
  -e DARKTRACE_URL='https://<your-appliance>' \
  -e DARKTRACE_PUBLIC_TOKEN_FILE=/absolute/private/darktrace/public-token \
  -e DARKTRACE_PRIVATE_TOKEN_FILE=/absolute/private/darktrace/private-token \
  -e DARKTRACE_PROFILES=read \
  darktrace /absolute/path/to/node /absolute/path/to/darktrace-mcp/dist/src/index.js
gemini mcp list
```

or add to `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "darktrace": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/darktrace-mcp/dist/src/index.js"],
      "env": {
        "DARKTRACE_URL": "https://<your-appliance>",
        "DARKTRACE_PUBLIC_TOKEN_FILE": "/absolute/private/darktrace/public-token",
        "DARKTRACE_PRIVATE_TOKEN_FILE": "/absolute/private/darktrace/private-token",
        "DARKTRACE_PROFILES": "read",
        "DARKTRACE_SENSITIVE_READ": "false"
      }
    }
  }
}
```

Do not set `"trust": true`: keep Gemini's confirmation prompt for every tool call.

> The following additional client adapters are available on `main` and arrive in **1.1.3** ([merged PR #18](https://github.com/nuoframework/darktrace-mcp/pull/18)). They are not wizard IDs in npm 1.1.2; use the manual snippets until a version containing them is published. Configuration paths and vendor references: [installation matrix](install-matrix.md).

## Zed

**Update (1.1.3).** `darktrace-mcp update` rewrites this entry after verifying the new version (file backed up; `update --rollback` restores the previous one). [Update guide](update.md).

**Automatic (1.1.3).** `darktrace-mcp setup --client zed`. Zed's `settings.json` is JSONC; when the file contains comments the wizard prints the snippet instead of rewriting it.

**Manual.** Add to `~/.config/zed/settings.json` (or Settings → AI → MCP Servers → Add Local Server):

```json
{
  "context_servers": {
    "darktrace": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/darktrace-mcp/dist/src/index.js"],
      "env": {
        "DARKTRACE_URL": "https://<your-appliance>",
        "DARKTRACE_PUBLIC_TOKEN_FILE": "/absolute/private/darktrace/public-token",
        "DARKTRACE_PRIVATE_TOKEN_FILE": "/absolute/private/darktrace/private-token",
        "DARKTRACE_PROFILES": "read"
      }
    }
  }
}
```

Verify: the server appears under Settings → AI → MCP Servers.

## Cline

**Update (1.1.3).** `darktrace-mcp update` rewrites this entry after verifying the new version (file backed up; `update --rollback` restores the previous one). [Update guide](update.md).

**Automatic (1.1.3).** `darktrace-mcp setup --client cline` writes `cline_mcp_settings.json` in Cline's VS Code storage (see the table above). Cline reloads the file on change.

**Manual.** Cline panel → MCP Servers → Configure → Configure MCP Servers, then add under `mcpServers`:

```json
{
  "mcpServers": {
    "darktrace": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/darktrace-mcp/dist/src/index.js"],
      "env": {
        "DARKTRACE_URL": "https://<your-appliance>",
        "DARKTRACE_PUBLIC_TOKEN_FILE": "/absolute/private/darktrace/public-token",
        "DARKTRACE_PRIVATE_TOKEN_FILE": "/absolute/private/darktrace/private-token",
        "DARKTRACE_PROFILES": "read"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

Keep `autoApprove` empty so Cline asks before each tool call. The Cline CLI uses `~/.cline/data/settings/cline_mcp_settings.json` with the same shape.

## Roo Code

**Update (1.1.3).** `darktrace-mcp update` rewrites this entry after verifying the new version (file backed up; `update --rollback` restores the previous one). [Update guide](update.md).

**Automatic (1.1.3).** `darktrace-mcp setup --client roo` writes the global `mcp_settings.json` (table above).

**Manual.** Roo Code → MCP Servers → Edit Global MCP, then add under `mcpServers`:

```json
{
  "mcpServers": {
    "darktrace": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/darktrace-mcp/dist/src/index.js"],
      "env": {
        "DARKTRACE_URL": "https://<your-appliance>",
        "DARKTRACE_PUBLIC_TOKEN_FILE": "/absolute/private/darktrace/public-token",
        "DARKTRACE_PRIVATE_TOKEN_FILE": "/absolute/private/darktrace/private-token",
        "DARKTRACE_PROFILES": "read"
      },
      "alwaysAllow": [],
      "disabled": false
    }
  }
}
```

A project `.roo/mcp.json` overrides the global entry; review it as you would any project file.

## Continue

**Update (1.1.3).** `darktrace-mcp update` rewrites this entry after verifying the new version (file backed up; `update --rollback` restores the previous one). [Update guide](update.md).

**Automatic (1.1.3).** `darktrace-mcp setup --client continue` inserts a marker-delimited item at the top of the `mcpServers` list in `~/.continue/config.yaml` (Windows `%USERPROFILE%\.continue\config.yaml`) and never touches the rest of the file. If the file already defines a `darktrace` server, or `mcpServers` is not a plain list, the wizard prints the snippet instead.

**Manual.** Add to `config.yaml`:

```yaml
mcpServers:
  - name: darktrace
    type: stdio
    command: /absolute/path/to/node
    args:
      - /absolute/path/to/darktrace-mcp/dist/src/index.js
    env:
      DARKTRACE_URL: https://<your-appliance>
      DARKTRACE_PUBLIC_TOKEN_FILE: /absolute/private/darktrace/public-token
      DARKTRACE_PRIVATE_TOKEN_FILE: /absolute/private/darktrace/private-token
      DARKTRACE_PROFILES: read
```

MCP tools are available in Continue's agent mode. Verify with the tools icon in the chat input.

## Kiro

**Update (1.1.3).** `darktrace-mcp update` rewrites this entry after verifying the new version (file backed up; `update --rollback` restores the previous one). [Update guide](update.md).

**Automatic (1.1.3).** `darktrace-mcp setup --client kiro` writes `~/.kiro/settings/mcp.json`. `darktrace-mcp config kiro` also prints a `https://kiro.dev/launch/mcp/add?…` link; Kiro shows a confirmation dialog before writing.

**Manual.** Add to `~/.kiro/settings/mcp.json`:

```json
{
  "mcpServers": {
    "darktrace": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/darktrace-mcp/dist/src/index.js"],
      "env": {
        "DARKTRACE_URL": "https://<your-appliance>",
        "DARKTRACE_PUBLIC_TOKEN_FILE": "/absolute/private/darktrace/public-token",
        "DARKTRACE_PRIVATE_TOKEN_FILE": "/absolute/private/darktrace/private-token",
        "DARKTRACE_PROFILES": "read"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

Kiro reloads the file on save; the server shows in the MCP Servers view.

## Amp

**Update (1.1.3).** `darktrace-mcp update` rewrites this entry after verifying the new version (file backed up; `update --rollback` restores the previous one). [Update guide](update.md).

**Automatic (1.1.3).** `darktrace-mcp setup --client amp` writes `~/.config/amp/settings.json` (a `.jsonc` twin is used when it is the only file; comments are never rewritten).

**Manual.** Add to `~/.config/amp/settings.json`:

```json
{
  "amp.mcpServers": {
    "darktrace": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/darktrace-mcp/dist/src/index.js"],
      "env": {
        "DARKTRACE_URL": "https://<your-appliance>",
        "DARKTRACE_PUBLIC_TOKEN_FILE": "/absolute/private/darktrace/public-token",
        "DARKTRACE_PRIVATE_TOKEN_FILE": "/absolute/private/darktrace/private-token",
        "DARKTRACE_PROFILES": "read"
      }
    }
  }
}
```

Verify with `amp mcp list`.

## GitHub Copilot CLI

**Update (1.1.3).** `darktrace-mcp update` rewrites this entry after verifying the new version (file backed up; `update --rollback` restores the previous one). [Update guide](update.md).

**Automatic (1.1.3).** `darktrace-mcp setup --client copilot-cli` writes `~/.copilot/mcp-config.json` (`COPILOT_HOME` is honoured).

**Manual.** Either `/mcp add` inside Copilot CLI, or add to `~/.copilot/mcp-config.json`:

```json
{
  "mcpServers": {
    "darktrace": {
      "type": "local",
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/darktrace-mcp/dist/src/index.js"],
      "env": {
        "DARKTRACE_URL": "https://<your-appliance>",
        "DARKTRACE_PUBLIC_TOKEN_FILE": "/absolute/private/darktrace/public-token",
        "DARKTRACE_PRIVATE_TOKEN_FILE": "/absolute/private/darktrace/private-token",
        "DARKTRACE_PROFILES": "read"
      },
      "tools": ["*"]
    }
  }
}
```

Copilot CLI passes only the variables listed in `env` to the server (plus `PATH`). Verify with `/mcp` in a session.

## Warp

**Update (1.1.3).** `darktrace-mcp update` rewrites this entry after verifying the new version (file backed up; `update --rollback` restores the previous one). [Update guide](update.md).

**Automatic (1.1.3).** `darktrace-mcp setup --client warp` writes `~/.warp/.mcp.json`.

**Manual.** Settings → Agents → MCP servers → add a CLI server and paste, or add to `~/.warp/.mcp.json`:

```json
{
  "mcpServers": {
    "darktrace": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/darktrace-mcp/dist/src/index.js"],
      "env": {
        "DARKTRACE_URL": "https://<your-appliance>",
        "DARKTRACE_PUBLIC_TOKEN_FILE": "/absolute/private/darktrace/public-token",
        "DARKTRACE_PRIVATE_TOKEN_FILE": "/absolute/private/darktrace/private-token",
        "DARKTRACE_PROFILES": "read"
      }
    }
  }
}
```

Start the server from the same settings page.

## Goose

**Update (1.1.3).** `darktrace-mcp update` rewrites this entry after verifying the new version (file backed up; `update --rollback` restores the previous one). [Update guide](update.md).

**Automatic (1.1.3).** `darktrace-mcp setup --client goose` inserts a marker-delimited `darktrace` entry under `extensions` in `~/.config/goose/config.yaml` (Windows `%APPDATA%\Block\goose\config\config.yaml`) and leaves the rest untouched. An existing unmanaged `darktrace` entry is never rewritten; the snippet is printed instead.

**Manual.** `goose configure` → Add Extension → Command-line Extension, or add under `extensions:`:

```yaml
extensions:
  darktrace:
    type: stdio
    name: darktrace
    enabled: true
    cmd: /absolute/path/to/node
    args: ["/absolute/path/to/darktrace-mcp/dist/src/index.js"]
    timeout: 300
    envs:
      DARKTRACE_URL: https://<your-appliance>
      DARKTRACE_PUBLIC_TOKEN_FILE: /absolute/private/darktrace/public-token
      DARKTRACE_PRIVATE_TOKEN_FILE: /absolute/private/darktrace/private-token
      DARKTRACE_PROFILES: read
    env_keys: []
```

Goose's `goose://extension` links accept only `npx`, `uvx`, `jbang`, `goosed` or `docker` as the command, so the wizard does not print one for the absolute Node path it registers.

## LM Studio

**Update (1.1.3).** `darktrace-mcp update` rewrites this entry after verifying the new version (file backed up; `update --rollback` restores the previous one). [Update guide](update.md).

**Automatic (1.1.3).** `darktrace-mcp setup --client lmstudio` writes `~/.lmstudio/mcp.json`. `darktrace-mcp config lmstudio` also prints an `lmstudio://add_mcp?…` link (LM Studio 0.3.17 or later).

**Manual.** Program → Install → Edit mcp.json, then add under `mcpServers` (Cursor notation):

```json
{
  "mcpServers": {
    "darktrace": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/darktrace-mcp/dist/src/index.js"],
      "env": {
        "DARKTRACE_URL": "https://<your-appliance>",
        "DARKTRACE_PUBLIC_TOKEN_FILE": "/absolute/private/darktrace/public-token",
        "DARKTRACE_PRIVATE_TOKEN_FILE": "/absolute/private/darktrace/private-token",
        "DARKTRACE_PROFILES": "read"
      }
    }
  }
}
```

Saving the file loads the server. Local models may have smaller context windows than hosted ones; keep the `read` profile.

## Antigravity

**Update (1.1.3).** `darktrace-mcp update` rewrites this entry after verifying the new version (file backed up; `update --rollback` restores the previous one). [Update guide](update.md).

**Automatic (1.1.3).** `darktrace-mcp setup --client antigravity` writes `~/.gemini/config/mcp_config.json`.

**Manual.** Agent panel → … → MCP Servers → Manage MCP Servers → View raw config, then add:

```json
{
  "mcpServers": {
    "darktrace": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/darktrace-mcp/dist/src/index.js"],
      "env": {
        "DARKTRACE_URL": "https://<your-appliance>",
        "DARKTRACE_PUBLIC_TOKEN_FILE": "/absolute/private/darktrace/public-token",
        "DARKTRACE_PRIVATE_TOKEN_FILE": "/absolute/private/darktrace/private-token",
        "DARKTRACE_PROFILES": "read"
      }
    }
  }
}
```

Tools default to Ask mode in Antigravity; keep it that way for write profiles.

## JetBrains Junie

**Update (1.1.3).** `darktrace-mcp update` rewrites this entry after verifying the new version (file backed up; `update --rollback` restores the previous one). [Update guide](update.md).

**Automatic (1.1.3).** `darktrace-mcp setup --client junie` writes `~/.junie/mcp/mcp.json`, shared by the Junie plugin and the Junie CLI. A project `.junie/mcp/mcp.json` is also read.

**Manual.** Settings → Tools → Junie → MCP Settings → Add (opens the same file), then add:

```json
{
  "mcpServers": {
    "darktrace": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/darktrace-mcp/dist/src/index.js"],
      "env": {
        "DARKTRACE_URL": "https://<your-appliance>",
        "DARKTRACE_PUBLIC_TOKEN_FILE": "/absolute/private/darktrace/public-token",
        "DARKTRACE_PRIVATE_TOKEN_FILE": "/absolute/private/darktrace/private-token",
        "DARKTRACE_PROFILES": "read"
      }
    }
  }
}
```

## JetBrains AI Assistant

**Update (1.1.3).** No file to rewrite: after `darktrace-mcp update`, run `darktrace-mcp config jetbrains` again and paste the new JSON. [Update guide](update.md).

JetBrains documents no configuration file for AI Assistant, so the wizard prints the JSON to paste.

**Paste.** `darktrace-mcp config jetbrains`, then Settings | Tools | AI Assistant | Model Context Protocol (MCP) → Add → STDIO, paste the printed JSON (same shape as [Junie](#jetbrains-junie)) and Apply; the server starts immediately. If `setup` already configured Claude Desktop on this machine, **Import from Claude** on the same page reuses that entry.

## Docker

**Update (1.1.3).** `darktrace-mcp update` pulls the new release tag, runs the container `--check-config` with the same mounts and user, rewrites the image ID in every entry and keeps the previous image for `update --rollback`. [Update guide](update.md).

Use this with any client that accepts `command` + `args` (Claude Desktop, Cursor, Windsurf, Gemini CLI, VS Code). With Docker installed and running, run the wizard and choose `2) docker`:

```sh
npx -y @nuoframework/darktrace-mcp@1.1.2 setup
```

The wizard checks that the Docker daemon answers, proposes `ghcr.io/nuoframework/darktrace-mcp:1.1.2` (the package version), offers to pull it when it is missing, and writes the hardened entry with the local image ID and `--pull=never`. It prints the image ID and the registry digest and keeps both in `~/.config/darktrace-mcp/setup.json`; compare the digest with the release notes. Without prompts: `setup --yes --runtime docker --pull --url https://<your-appliance> --tokens-from-stdin`. `--image` also accepts another tag, a `name@sha256:…` digest or a local `sha256:…` image ID. `darktrace-mcp config <client>` reuses the saved image ID, and `darktrace-mcp test` first runs `--check-config` in the container with the same mounts and user (no network), then checks the appliance from the host. Details: [Docker guide](docker.md#install).

**Manual.** Get the image ID (or use the `name@sha256:…` digest above):

```sh
docker image inspect --format '{{.Id}}' ghcr.io/nuoframework/darktrace-mcp:1.1.2
command -v docker
```

Replace the last argument with that `sha256:…` ID and `command` with the full Docker path:

```json
{
  "mcpServers": {
    "darktrace": {
      "command": "/absolute/path/to/docker",
      "args": [
        "run", "--rm", "-i", "--init", "--pull=never", "--log-driver=none",
        "--read-only", "--cap-drop=ALL", "--security-opt=no-new-privileges",
        "--pids-limit=64", "--memory=256m", "--user", "1000:1000",
        "--mount", "type=bind,src=/absolute/private/darktrace/public-token,dst=/run/secrets/public-token,readonly",
        "--mount", "type=bind,src=/absolute/private/darktrace/private-token,dst=/run/secrets/private-token,readonly",
        "-e", "DARKTRACE_URL=https://<your-appliance>",
        "-e", "DARKTRACE_PUBLIC_TOKEN_FILE=/run/secrets/public-token",
        "-e", "DARKTRACE_PRIVATE_TOKEN_FILE=/run/secrets/private-token",
        "-e", "DARKTRACE_PROFILES=read",
        "-e", "DARKTRACE_SENSITIVE_READ=false",
        "REPLACE_WITH_IMAGE_ID_FROM_DOCKER_INSPECT"
      ]
    }
  }
}
```

The token files must be owned by UID 1000 (or change `--user` to match their owner) and have mode `0600`. Keep `-i`, never add `-t`. Do not publish ports or use `--network host`.

<a id="update"></a>
## Update

**Available on `main` for 1.1.3; not in npm 1.1.2.** Here `darktrace-mcp` means the executable described in the [update guide](update.md).


```sh
darktrace-mcp update --check
darktrace-mcp update
```

`update` reads the settings `setup` stored, resolves the newest published version on registry.npmjs.org (or `--version X.Y.Z`; downgrades need `--allow-downgrade`), installs it with npm into a private temporary directory, requires `npm audit signatures` to verify the registry signatures and the provenance attestation when the registry announces it, copies the tree to `~/.local/share/darktrace-mcp/<new>/`, runs the new copy's `--check-config` with your settings and one signed `GET /status`, and only then rewrites the `darktrace` entry in every client that has one (backups kept). The previous copy stays for `update --rollback`. With the Docker runtime it pulls the release tag, runs the container `--check-config` and rewrites the image ID, keeping the old one. `--dry-run` prints the plan, `--yes` skips the question, `--json` prints one summary. Per client:

| Client | What `update` does | Client-managed path |
|---|---|---|
| File clients (Claude Desktop, Cursor, VS Code, Windsurf, OpenCode, Gemini CLI, Zed, Cline, Roo Code, Continue, Kiro, Amp, Copilot CLI, Warp, Goose, LM Studio, Antigravity, Junie) | Rewrites the entry in the file listed in its section, after a backup | Claude Desktop `.mcpb`: open the new `.mcpb` from the release or the Directory; keychain tokens are kept |
| Claude Code | Re-runs `claude mcp add --scope user` with the new path (detected with `claude mcp get darktrace`) | Plugin: `claude plugin update darktrace-mcp@darktrace-mcp` |
| Codex | Rewrites `mcp_servers.darktrace` in `config.toml` (or re-runs `codex mcp add`) | Plugin: `codex plugin marketplace upgrade darktrace-mcp` |
| JetBrains AI Assistant | Nothing (no documented file): run `darktrace-mcp config jetbrains` and paste the new JSON | — |
| Docker runtime | Pulls `ghcr.io/nuoframework/darktrace-mcp:<new>`, container `--check-config`, rewrites the image ID, keeps the old one | Hand-pinned digests: pull the digest from the release notes and edit the entry |

`setup` offers an "always latest" mode (`--update-mode npx-latest`) whose entries start `npx` with the `@latest` tag at every client start, unverified; the default (pinned) is the one every section on this page assumes. Full description, verification table and exit codes: [Update guide](update.md).

## Uninstall

```sh
darktrace-mcp uninstall
```

It shows a plan and asks once (`--yes` skips the question, `--dry-run` only prints the plan). It removes the `darktrace` entry from every client (config files are backed up first), deletes the stored tokens, `setup.json` and `~/.config/darktrace-mcp`, and deletes the fixed copies in `~/.local/share/darktrace-mcp/<version>/`, including copies installed by `update` and the previous copy kept for rollback in 1.1.3 (`--keep-copies` keeps them). With the Docker runtime, `--docker` also removes the image ID that setup recorded and, in 1.1.3, the previous one kept by `update`, never other images. When the package is installed globally it prints the `npm uninstall -g @nuoframework/darktrace-mcp` command for you to run. Symbolic links and unknown files are never touched. `remove --all` is the same command. Without a global install, run it as `npx -y @nuoframework/darktrace-mcp@1.1.2 uninstall`.

## Several clients, one setup

All clients can share the same token files and URL. Only the client config differs. To change permissions for one client, edit `DARKTRACE_PROFILES` in that client's entry.
