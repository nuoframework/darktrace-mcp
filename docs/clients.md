**English** · [Español](es/clients.md)

# Client setup

[README](../README.md) · [Getting started](getting-started.md) · [Configuration](configuration.md) · [Troubleshooting](troubleshooting.md)

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
| [Windsurf](#windsurf) | `windsurf` | `~/.codeium/windsurf/mcp_config.json` |
| [OpenCode](#opencode) | `opencode` | `~/.config/opencode/opencode.json` |
| [Gemini CLI](#gemini-cli) | `gemini` | `~/.gemini/settings.json` |
| [Docker](#docker) | — | Any of the above |

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
| Claude Code | `claude mcp add --scope user --env DARKTRACE_URL=https://… --env DARKTRACE_PUBLIC_TOKEN_FILE=/abs/public-token --env DARKTRACE_PRIVATE_TOKEN_FILE=/abs/private-token --env DARKTRACE_PROFILES=read --transport stdio darktrace -- /abs/node /abs/index.js` |
| Codex | `codex mcp add darktrace --env DARKTRACE_URL=https://… --env DARKTRACE_PUBLIC_TOKEN_FILE=/abs/public-token --env DARKTRACE_PRIVATE_TOKEN_FILE=/abs/private-token --env DARKTRACE_PROFILES=read -- /abs/node /abs/index.js` |
| Claude Code (plugin) | `claude plugin marketplace add nuoframework/darktrace-mcp` then `claude plugin install darktrace-mcp@darktrace-mcp`; Claude Code asks for the URL, the tokens and the profile ([plugin guide](plugin-distribution.md)) |
| Codex (plugin) | `codex plugin marketplace add nuoframework/darktrace-mcp` then `codex plugin add darktrace-mcp@darktrace-mcp`; the skill loads, the connection still comes from `darktrace-mcp setup` ([plugin guide](plugin-distribution.md#install)) |
| VS Code | `code --add-mcp '{"name":"darktrace","type":"stdio","command":"/abs/node","args":["/abs/index.js"],"env":{…}}'`; `darktrace-mcp config vscode` prints it filled in, plus a `vscode:mcp/install` link whose password inputs keep the tokens in VS Code's secret storage |
| Cursor | `darktrace-mcp config cursor` prints a `cursor://anysphere.cursor-deeplink/mcp/install?…` link |
| Gemini CLI | `gemini mcp add --scope user -e DARKTRACE_URL=https://… -e DARKTRACE_PUBLIC_TOKEN_FILE=/abs/public-token -e DARKTRACE_PRIVATE_TOKEN_FILE=/abs/private-token -e DARKTRACE_PROFILES=read darktrace /abs/node /abs/index.js` |
| Claude Desktop | `.mcpb` from the release (below) |
| Windsurf, OpenCode | JSON snippets below (no CLI) |

Never put `npx` in a client config: every launch would depend on the registry and would silently pick up new code. The wizard always writes absolute paths. The Claude Code [plugin](plugin-distribution.md) follows the same rule: Claude Code installs the package from the plugin's lockfile, pinned to `1.1.2`, when it installs the plugin, and starts `node` on the installed entry file. Only the Codex copy of the plugin starts `npx -y @nuoframework/darktrace-mcp@1.1.2`, pinned to the same version, because Codex has no lockfile install.

## Claude Desktop

**Automatic.** Either run `darktrace-mcp setup`, or install the extension: download `darktrace-mcp-1.1.2.mcpb` from the [v1.1.2 release](https://github.com/nuoframework/darktrace-mcp/releases/tag/v1.1.2) (or build it from a checkout with `npm run pack:mcpb`) and double-click it. Claude Desktop asks for the URL, tokens and profile. It stores the tokens in your OS keychain.

**Manual.** Settings → Developer → Edit Config. Merge this into `mcpServers`, keeping your other servers:

```json
{
  "mcpServers": {
    "darktrace": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/darktrace-mcp/dist/src/index.js"],
      "env": {
        "DARKTRACE_URL": "https://darktrace.example.internal",
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

**Automatic.** `darktrace-mcp setup` adds a user-scoped server.

**Plugin.** Two commands, then answer the prompts (appliance URL, both tokens, profile). Nothing else to run:

```sh
claude plugin marketplace add nuoframework/darktrace-mcp
claude plugin install darktrace-mcp@darktrace-mcp
```

The plugin installs the npm package pinned to `1.1.2` from its lockfile and adds the `darktrace-investigation` skill. The tokens go to the operating system's credential store; change the profile later in `/config`. It also works in Cowork sessions on your machine, but not in chat on claude.ai. Details, Claude Directory listing and limitations: [plugin distribution](plugin-distribution.md).

**Manual.**

```sh
claude mcp add --scope user \
  --env DARKTRACE_URL=https://darktrace.example.internal \
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

**Automatic.** `darktrace-mcp setup`.

**Plugin.** Three commands: install the plugin, then run the wizard once for the connection:

```sh
codex plugin marketplace add nuoframework/darktrace-mcp
codex plugin add darktrace-mcp@darktrace-mcp
npx -y @nuoframework/darktrace-mcp@1.1.2 setup
```

The plugin brings the `darktrace-investigation` skill and a bundled server. Codex does not prompt for configuration and passes the bundled server only the variables declared in the plugin, so that copy stops at startup; the wizard writes the working `mcp_servers.darktrace` entry, and the skill guides you to the wizard if the tools are missing. Then disable the bundled copy with `[plugins."darktrace-mcp@darktrace-mcp".mcp_servers.darktrace]` `enabled = false` in `~/.codex/config.toml`. See [plugin distribution](plugin-distribution.md#install).

**Manual.** Add to `~/.codex/config.toml`. The Codex CLI and IDE extension share this file.

```toml
[mcp_servers.darktrace]
command = "/absolute/path/to/node"
args = ["/absolute/path/to/darktrace-mcp/dist/src/index.js"]

[mcp_servers.darktrace.env]
DARKTRACE_URL = "https://darktrace.example.internal"
DARKTRACE_PUBLIC_TOKEN_FILE = "/absolute/private/darktrace/public-token"
DARKTRACE_PRIVATE_TOKEN_FILE = "/absolute/private/darktrace/private-token"
DARKTRACE_PROFILES = "read"
```

Check it with `codex mcp list`.

## Cursor

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
        "DARKTRACE_URL": "https://darktrace.example.internal",
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
        "DARKTRACE_URL": "https://darktrace.example.internal",
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

**Automatic.** `darktrace-mcp setup`.

**Manual.** Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "darktrace": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/darktrace-mcp/dist/src/index.js"],
      "env": {
        "DARKTRACE_URL": "https://darktrace.example.internal",
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
        "DARKTRACE_URL": "https://darktrace.example.internal",
        "DARKTRACE_PUBLIC_TOKEN_FILE": "/absolute/private/darktrace/public-token",
        "DARKTRACE_PRIVATE_TOKEN_FILE": "/absolute/private/darktrace/private-token",
        "DARKTRACE_PROFILES": "read"
      }
    }
  }
}
```

## Gemini CLI

**Automatic.** `darktrace-mcp setup`.

**Manual.** Either use the CLI:

```sh
gemini mcp add --scope user \
  -e DARKTRACE_URL=https://darktrace.example.internal \
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
        "DARKTRACE_URL": "https://darktrace.example.internal",
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

## Docker

Use this with any client that accepts `command` + `args` (Claude Desktop, Cursor, Windsurf, Gemini CLI, VS Code). With Docker installed and running, run the wizard and choose `2) docker`:

```sh
npx -y @nuoframework/darktrace-mcp@1.1.2 setup
```

The wizard checks that the Docker daemon answers, proposes `ghcr.io/nuoframework/darktrace-mcp:1.1.2` (the package version), offers to pull it when it is missing, and writes the hardened entry with the local image ID and `--pull=never`. It prints the image ID and the registry digest and keeps both in `~/.config/darktrace-mcp/setup.json`; compare the digest with the release notes. Without prompts: `setup --yes --runtime docker --pull --url https://… --tokens-from-stdin`. `--image` also accepts another tag, a `name@sha256:…` digest or a local `sha256:…` image ID. `darktrace-mcp config <client>` reuses the saved image ID, and `darktrace-mcp test` first runs `--check-config` in the container with the same mounts and user (no network), then checks the appliance from the host. Details: [Docker guide](docker.md#install).

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
        "-e", "DARKTRACE_URL=https://darktrace.example.internal",
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

## Uninstall

```sh
darktrace-mcp uninstall
```

It shows a plan and asks once (`--yes` skips the question, `--dry-run` only prints the plan). It removes the `darktrace` entry from every client (config files are backed up first), deletes the stored tokens, `setup.json` and `~/.config/darktrace-mcp`, and deletes the fixed copies in `~/.local/share/darktrace-mcp/<version>/` (`--keep-copies` keeps them). With the Docker runtime, `--docker` also removes the one image ID that setup recorded, never other images. When the package is installed globally it prints the `npm uninstall -g @nuoframework/darktrace-mcp` command for you to run. Symbolic links and unknown files are never touched. `remove --all` is the same command. Without a global install, run it as `npx -y @nuoframework/darktrace-mcp@1.1.2 uninstall`.

## Several clients, one setup

All clients can share the same token files and URL. Only the client config differs. To change permissions for one client, edit `DARKTRACE_PROFILES` in that client's entry.
