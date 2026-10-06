# Darktrace MCP plugin

[Documentation](https://github.com/nuoframework/darktrace-mcp/blob/main/docs/getting-started.md) · [Support](https://github.com/nuoframework/darktrace-mcp/issues) · [Security and privacy policy](https://github.com/nuoframework/darktrace-mcp/blob/main/SECURITY.md) · [Source](https://github.com/nuoframework/darktrace-mcp)

Investigate alerts, devices and incidents on your own Darktrace Threat Visualizer appliance from Claude Code, Cowork or Codex. The plugin bundles a local MCP server and one skill that teaches Claude how to investigate safely. It is an independent, unofficial project; Darktrace is a trademark of its owner and does not endorse it.

## Install

**Claude Code.** Install the plugin and answer the prompts (appliance URL, public token, private token, profile). That is the whole setup.

```sh
claude plugin marketplace add nuoframework/darktrace-mcp
claude plugin install darktrace-mcp@darktrace-mcp
```

**Codex.** Install the plugin, then run the setup wizard once; it asks for the same values and writes the server entry for you.

```sh
codex plugin marketplace add nuoframework/darktrace-mcp
codex plugin add darktrace-mcp@darktrace-mcp
npx -y @nuoframework/darktrace-mcp@1.1.2 setup
```

You need Node.js 22 or later, the appliance URL and an API token pair (Darktrace: **System Config → Settings → API Token**).

## What it does

The server exposes 50 tools over the Darktrace Threat Visualizer API: model breaches (alerts), AI Analyst incidents, devices and their connections, Autonomous Response (Antigena) actions, tags, Watched Domains, subnets, packet captures, Advanced Search and Darktrace/Email reads. The full catalogue, with the profile each tool needs and its lab evidence, is in the [tool reference](https://github.com/nuoframework/darktrace-mcp/blob/main/docs/tools.md).

## What it runs

When Claude Code installs the plugin, it installs the published npm package `@nuoframework/darktrace-mcp` at the exact version pinned in the plugin's `package.json` and `package-lock.json` (with `--ignore-scripts`, from registry.npmjs.org, integrity-checked), together with its three runtime dependencies (`zod`, `@modelcontextprotocol/server`, `@modelcontextprotocol/core`). The plugin then starts exactly one local process:

```sh
node node_modules/@nuoframework/darktrace-mcp/dist/src/index.js
```

It needs Node.js 22 or later on your machine. The process speaks MCP over standard input and output; it opens no listening port. Nothing else is downloaded or executed. In Codex the bundled server is started with `npx -y @nuoframework/darktrace-mcp@1.1.2` instead, pinned to the same version.

## Where it connects

The server talks only to the appliance URL you enter, over HTTPS with certificate verification, and signs every request with your token pair (HMAC). It never contacts any other host: no telemetry, no update check, no crash reporting. Appliance answers are returned to Claude and stay in your session.

## Credentials

When you enable the plugin, Claude Code asks for the appliance URL, the public token and the private token. Both tokens are marked sensitive, so Claude Code keeps them in your operating system's credential store rather than in a settings file, and passes them to the server process as environment variables. They are sent to your appliance only, as a signature. Create the token pair in Darktrace under **System Config → Settings → API Token**, and give it the smallest permission set you need.

## Profiles and approval

- `read` (the default) only reads. Start here.
- `sensitive` adds reads that can return raw traffic, email content or audit data.
- `write` adds reversible changes (acknowledge, comment, pin, tags, labels, capture requests). Ask for `dryRun:true` first to see what would change.
- `critical` adds actions that can block traffic or change detection (Antigena, Watched Domains, subnets, tag deletion). Each runs only after a `dryRun:true` preview, a repeat call with `confirm:true` and its `previewId`, and a confirmation dialog that Claude Code shows you with the exact values. Nothing is sent until you choose **Accept**.
- `all` combines everything and needs the "acknowledge sensitive and write" option set to `true`.

Every preview, refusal and write is written as an audit line to the server's log. Writes are rate limited and never retried. The details are in the [configuration guide](https://github.com/nuoframework/darktrace-mcp/blob/main/docs/configuration.md#profiles).

## Where it works

The server is a local process, so the plugin works in Claude Code (terminal, IDE extensions and the desktop app's Code tab) and in Cowork sessions that run on your computer. In chat on claude.ai the local server is ignored; only the skill loads there. The server must reach the appliance from your machine. A private certificate authority cannot be configured through the plugin; use the [npm package](https://github.com/nuoframework/darktrace-mcp/blob/main/docs/configuration.md#network-and-tls) directly in that case.

## Codex

Codex reads the portable `plugin.json` and `mcp.json` in this folder. It does not prompt for configuration values, so the bundled server has no appliance URL or tokens on its own and stops at startup. The setup wizard shown above writes a complete `mcp_servers.darktrace` entry with absolute paths and token files into `~/.codex/config.toml`; the skill tells Codex to guide you through it the first time. Afterwards keep the plugin for its skill and disable the bundled copy:

```toml
[plugins."darktrace-mcp@darktrace-mcp".mcp_servers.darktrace]
enabled = false
```

See the [client guide](https://github.com/nuoframework/darktrace-mcp/blob/main/docs/clients.md#codex).

## More

- [Getting started](https://github.com/nuoframework/darktrace-mcp/blob/main/docs/getting-started.md)
- [Configuration](https://github.com/nuoframework/darktrace-mcp/blob/main/docs/configuration.md)
- [Security overview](https://github.com/nuoframework/darktrace-mcp/blob/main/docs/security.md) and [security policy](https://github.com/nuoframework/darktrace-mcp/blob/main/SECURITY.md)
- [Plugin distribution](https://github.com/nuoframework/darktrace-mcp/blob/main/docs/plugin-distribution.md)

License: Apache-2.0.
