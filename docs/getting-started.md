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
| GitHub CLI (`gh`) with access to `nuoframework/darktrace-mcp` | `gh auth login` |
| Node.js 22 or later, npm, git | [nodejs.org](https://nodejs.org) or your package manager |
| Approval to send Darktrace data to your model provider | Your security or compliance team |

Give the token only the Darktrace permissions you want the model to have. The server can never do more than the token allows.

## Step 1. Install

### macOS and Linux

Download the installer, read it, then run it:

```sh
gh auth login
gh api -H 'Accept: application/vnd.github.raw' \
  repos/nuoframework/darktrace-mcp/contents/scripts/install.sh > install.sh
less install.sh
bash install.sh
```

The installer:

1. Clones the private repository with `gh`.
2. Runs `npm ci --ignore-scripts` and `npm run build`.
3. Starts the setup wizard (Step 2).

### Windows

```powershell
gh auth login
gh api -H "Accept: application/vnd.github.raw" repos/nuoframework/darktrace-mcp/contents/scripts/install.ps1 > install.ps1
Get-Content .\install.ps1
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

If the server refuses your token files on native Windows, run it inside WSL instead. See [troubleshooting](troubleshooting.md#token-file-permissions).

### Manual install

```sh
gh repo clone nuoframework/darktrace-mcp
cd darktrace-mcp
npm ci --ignore-scripts
npm run build
node dist/src/index.js setup
```

If `darktrace-mcp` is not on your `PATH`, use `node /absolute/path/to/darktrace-mcp/dist/src/index.js` wherever this guide says `darktrace-mcp`.

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
| Permission preset | `read` (recommended to start), `read,sensitive`, `read,write`, or `all` |
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
| Claude Desktop extension (`.mcpb`) | [Clients: Claude Desktop](clients.md#claude-desktop) |
| Docker | [Docker guide](docker.md) and [Clients: Docker](clients.md#docker) |
| Manual config for one client | [Clients](clients.md) |
| Release archive (`.tgz`) | [Releases](releases.md) |

## Native install and OpenSSL

The Docker image ships OpenSSL 3.5.9. Some official Node.js builds still bundle OpenSSL 3.5.8, which has a known TLS issue. For a native install, check your version:

```sh
node -p 'process.versions.openssl'
```

Use a runtime with OpenSSL 3.5.9 or later, or use Docker. Details: [security overview](security.md).
