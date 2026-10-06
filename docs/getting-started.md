**English** · [Español](es/getting-started.md)

# Getting started

[README](../README.md) · [Clients](clients.md) · [Configuration](configuration.md) · [Troubleshooting](troubleshooting.md)

This guide takes you from nothing to a working Darktrace MCP server in your client. It takes about ten minutes.

## Before you start

You need:

| Item | Where to get it |
|---|---|
| Darktrace appliance address | For example `https://darktrace.example.internal`. HTTPS only |
| Public API token and private API token | Darktrace Threat Visualizer: **System Config → Settings → API Token**. Ask your Darktrace admin |
| Node.js 22 or later (npm and `npx` come with it) | [nodejs.org](https://nodejs.org) or your package manager |
| Approval to send Darktrace data to your model provider | Your security or compliance team |

Give the token only the Darktrace permissions you want the model to have. The server can never do more than the token allows.

## Step 1. Install and run the wizard

### macOS, Linux and Windows

```sh
npx -y @nuoframework/darktrace-mcp@1.1.0 setup
```

`npx` downloads the exact published version `1.1.0` (npm checks its integrity) and starts the setup wizard (Step 2). Because the `npx` cache is temporary, the wizard first copies the package and its three locked dependencies to a fixed directory and registers that absolute path in your clients:

| OS | Fixed copy |
|---|---|
| macOS, Linux | `~/.local/share/darktrace-mcp/1.1.0/` (or `$XDG_DATA_HOME/darktrace-mcp/1.1.0/`) |
| Windows | `%LOCALAPPDATA%\darktrace-mcp\1.1.0\` |

Clients start the server as `/absolute/path/to/node …/node_modules/@nuoframework/darktrace-mcp/dist/src/index.js`; they never run `npx` and never need the registry again. Re-running the command reuses the copy.

To get a `darktrace-mcp` command on your `PATH` (optional), install it globally with the same pinned version:

```sh
npm install -g @nuoframework/darktrace-mcp@1.1.0
```

Otherwise, wherever this guide says `darktrace-mcp …`, run `npx -y @nuoframework/darktrace-mcp@1.1.0 …`.

### Windows

The same `npx` command works in PowerShell. Native Windows cannot enforce owner-only token files, so the server rejects token files there; the wizard asks for explicit consent before writing token values into client configs. Prefer the [Claude Desktop extension](clients.md#claude-desktop), [Docker](docker.md) or WSL with the Linux command. See [troubleshooting](troubleshooting.md#token-file-permissions).

### Fallback: build from source

```sh
curl -fsSLO https://raw.githubusercontent.com/nuoframework/darktrace-mcp/main/scripts/install.sh
less install.sh
sh install.sh
```

The script clones this repository into `~/.local/share/darktrace-mcp/source`, runs `npm ci --ignore-scripts` and `npm run build`, then starts the wizard. Windows: `scripts/install.ps1`. Manual equivalent:

```sh
git clone https://github.com/nuoframework/darktrace-mcp.git
cd darktrace-mcp
npm ci --ignore-scripts
npm run build
node dist/src/index.js setup
```

## Step 2. Run the setup wizard

```sh
darktrace-mcp setup
```

The wizard asks you:

| Question | What to enter |
|---|---|
| Appliance URL | `https://` address of your appliance |
| Public token | Typed hidden |
| Private token | Typed hidden |
| Permission preset | `read` (recommended to start), `read,sensitive`, `read,write`, or `all`. `all` starts only with `DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE=true` in the client entry ([why](configuration.md#profiles)) |
| Clients to configure | It lists the clients it found on your machine |

It then:

- saves each token to its own file under `~/.config/darktrace-mcp/`, with mode `0600` (only you can read it);
- backs up each client config file before changing it;
- adds a `darktrace` server entry to every client you selected.

Restart your client after the wizard finishes.

## Step 3. Check the setup

```sh
darktrace-mcp --check-config
darktrace-mcp test
```

| Command | Network? | What it checks |
|---|---|---|
| `--check-config` (or `doctor`) | No | URL format, token files exist with safe permissions, profiles are valid |
| `test` | Yes, one `GET /status` | Tokens work, clock is in sync, TLS is trusted |

If either fails, see [troubleshooting](troubleshooting.md).

## Step 4. Try it in your client

Ask your assistant, for example:

- "Show the Darktrace system status."
- "List model breaches from the last 24 hours with a score above 0.8."
- "Which AI Analyst incidents are open right now?"

With the `write` profile you can also ask "Acknowledge model breach 1234". Try it with `dryRun:true` first to see a preview.

## Change permissions later

Run the wizard again, or edit `DARKTRACE_PROFILES` in your client config:

```sh
darktrace-mcp setup
```

Profiles are explained in [configuration](configuration.md#profiles).

## Remove

```sh
darktrace-mcp remove
```

This removes the `darktrace` entry from the clients the wizard configured. Delete the token files under `~/.config/darktrace-mcp/` yourself if you no longer need them, and revoke the tokens in Darktrace.

## Other ways to install

| Method | Guide |
|---|---|
| Claude Desktop extension (`.mcpb`, from the GitHub release) | [Clients: Claude Desktop](clients.md#claude-desktop) |
| Docker image `ghcr.io/nuoframework/darktrace-mcp` | [Docker guide](docker.md) and [Clients: Docker](clients.md#docker) |
| One-line commands per client | [Clients: one-liners](clients.md#one-line-install-per-client) |
| Manual config for one client | [Clients](clients.md) |
| Release assets (`.tgz`, `.mcpb`, `SHA256SUMS`) | [Releases](releases.md) |

## Native install and OpenSSL

The Docker image ships OpenSSL 3.5.9. Some official Node.js builds still bundle OpenSSL 3.5.8, which has a known TLS issue. For a native install, check your version:

```sh
node -p 'process.versions.openssl'
```

Use a runtime with OpenSSL 3.5.9 or later, or use Docker. Details: [security overview](security.md).
