# Plugin distribution

[README](../README.md) · [Client setup](clients.md) · [Releases](releases.md) · [Security](security.md)

The folder `claude-plugin/` packages the server as a plugin for Claude Code, Cowork and Codex. This page describes what the folder contains, how people install it from this repository, how the owner submits it to Anthropic's Claude Directory, and what to change at each release.

## What the folder contains

| File | Read by | Purpose |
|---|---|---|
| `claude-plugin/.claude-plugin/plugin.json` | Claude Code, Cowork, Claude Directory | Manifest: name `darktrace-mcp`, version, metadata and the `userConfig` options Claude Code asks for (appliance URL, public and private token marked sensitive, profiles, sensitive-write acknowledgement, signature date format) |
| `claude-plugin/.mcp.json` | Claude Code, Cowork | One stdio server `darktrace` that runs `npx -y @nuoframework/darktrace-mcp@1.1.1` with the `DARKTRACE_*` variables filled from `${user_config.*}` |
| `claude-plugin/plugin.json` | Codex | Portable manifest (Agent Plugins schema) with the OpenAI listing fields under `extensions.com.openai.interface` |
| `claude-plugin/mcp.json` | Codex | Portable MCP file declaring the same stdio server with `type: "stdio"` and only `DARKTRACE_PROFILES=read` in its environment |
| `claude-plugin/skills/darktrace-investigation/SKILL.md` | All | Investigation skill: read-only first, small responses, previews and approval before critical actions, appliance data treated as untrusted |
| `claude-plugin/README.md`, `claude-plugin/LICENSE` | Claude Directory, people | Listing description and license (a copy of the root `LICENSE`) |
| `.claude-plugin/marketplace.json` | Claude Code | Repository marketplace `darktrace-mcp` with one entry whose source is `./claude-plugin` |
| `.agents/plugins/marketplace.json` | Codex | Repository marketplace with the same entry (`source: local`, `policy.installation: AVAILABLE`) |

The plugin lives in a subfolder because the repository root holds `package.json` and lockfiles; a plugin folder with those at its root is held for a reviewer ("Dependencies install from a lockfile"). None of these files enter the npm tarball (`files` in `package.json` is a whitelist), the Docker image (`.dockerignore` whitelists paths) or the release snapshot (`scripts/prepare-release.mjs` copies named directories only).

## Install from the repository marketplace

**Claude Code.** Add the marketplace, install the plugin, and answer the configuration prompts (the tokens are stored in the operating system's credential store, not in `settings.json`):

```sh
claude plugin marketplace add nuoframework/darktrace-mcp
claude plugin install darktrace-mcp@darktrace-mcp
```

Run `/mcp` in a session to see the `darktrace` server, and `/config` to change the profile later. The server is a local process: it works in Claude Code and in Cowork sessions that run on your computer, and it is ignored in chat on claude.ai, where only the skill loads.

**Codex.** Add the marketplace and install the plugin:

```sh
codex plugin marketplace add nuoframework/darktrace-mcp
codex plugin add darktrace-mcp@darktrace-mcp
```

Codex does not prompt for configuration values, and the bundled server receives only the variables declared in `mcp.json` plus `PLUGIN_ROOT` and `PLUGIN_DATA`; variables exported in your shell and `env` overrides under `[plugins."darktrace-mcp@darktrace-mcp".mcp_servers.darktrace]` are not passed to it (checked with Codex CLI 0.160.1). The bundled server therefore stops at startup for lack of an appliance URL. Configure the connection with the wizard, which writes a complete `mcp_servers.darktrace` entry with absolute paths and token files into `~/.codex/config.toml`, then disable the bundled copy and keep the skill:

```sh
npx -y @nuoframework/darktrace-mcp@1.1.1 setup
```

```toml
[plugins."darktrace-mcp@darktrace-mcp".mcp_servers.darktrace]
enabled = false
```

OpenAI's public plugin directory accepts only remote (HTTPS) MCP servers, so this plugin is distributed to Codex through the repository marketplace only.

## Submit to the Claude Directory (owner)

The developer portal validates the plugin, scans each new commit on the tracked branch and lists the plugin for people on Pro, Max, Team and Enterprise plans. Read the [pre-submission checklist](https://claude.com/docs/plugins/pre-submission-checklist) and [Submit your plugin](https://claude.com/docs/plugins/submit) first.

1. Check locally: `claude plugin validate --strict ./claude-plugin` and `claude plugin validate .` must both print `✔ Validation passed`.
2. Open [claude.ai/directory/manage](https://claude.ai/directory/manage) and select **Submit new** → **Plugin bundle**. The GitHub account connected to claude.ai must be able to push to the repository.
3. On **Source** enter:
   - **Repository:** `nuoframework/darktrace-mcp`
   - **Plugin path:** `claude-plugin`
   - **Branch or tag:** leave empty (the default branch, `main`)
4. Select **Validate**. Expected result: no blocking finding; one **Policy hold**, "Runs a pinned npx or uvx package", because `.mcp.json` starts a registry package. The hold means an Anthropic reviewer reads the version before it goes live. A second hold, "Name matches a known brand", can appear because the name contains a trademark the author does not own; the README states that the project is independent and unofficial.
5. If a finding blocks, fix it, push to `main`, and select **Re-validate**. A result applies to one commit only.
6. **Listing details** are read from `plugin.json` and the README. The values below are the ones in the repository.
7. **Data handling**: answer as in the table below.
8. **Compliance**: confirm the contact email and the four acknowledgements.
9. **Review and submit**: keep **GitHub push webhook** so that merges to `main` reach the directory without waiting for the scheduled check (the webhook needs admin access to the repository), then **Submit for review**.
10. When the version passes and the reviewer clears the hold, select **Publish** on the plugin's page.

### Listing text

| Field | Value |
|---|---|
| Name | `darktrace-mcp` |
| Display name | Darktrace MCP |
| Short description | Investigate alerts, devices and incidents on your own Darktrace Threat Visualizer appliance through a local MCP server: read-only by default, previews for every change and human approval for critical actions. |
| Long description | The listing shows `claude-plugin/README.md`. |
| Author | Pablo Arrabal, https://github.com/nuoframework |
| License | Apache-2.0 |
| Documentation | https://github.com/nuoframework/darktrace-mcp/blob/main/docs/getting-started.md |
| Support | https://github.com/nuoframework/darktrace-mcp/issues |
| Privacy policy | https://github.com/nuoframework/darktrace-mcp/blob/main/SECURITY.md |

### Data handling answers

| Question | Answer |
|---|---|
| Does the plugin read or store personal data? | It reads whatever the user's own Darktrace appliance returns for the user's queries (device names, IP addresses, user names in alerts, email metadata when the `sensitive` profile is enabled). Nothing is stored by the plugin; results stay in the user's session. |
| Does it send data to services other than its declared connectors? | No. The server connects only to the appliance URL the user enters, over HTTPS with signed requests. There is no telemetry, update check or crash reporting. The only other network access is `npx` downloading the pinned npm package from the npm registry on first start. |
| How long is data kept? | The publisher receives and keeps nothing. Credentials are stored by Claude Code in the operating system's credential store on the user's machine and sent only to the appliance as a request signature. |
| Is it intended for people under 18? | No. It is a tool for security analysts who operate a Darktrace appliance. |

### After publication

The directory follows `main`. Every merge that touches `claude-plugin/` becomes a new version that is scanned again; the "Runs a pinned npx or uvx package" hold applies to each. If a version fails the security scan, later versions wait until a reviewer clears the plugin. The listing keeps serving the last published version meanwhile.

## Bump the pinned version at each release

The plugin pins the npm package to an exact version, as the directory requires. The pin must point to a version that is already on the public registry, otherwise every install fails at `npx`. Step 7 of [publishing a version](releases.md#publishing-a-version-owner) is the checklist entry; in short, after `npm view @nuoframework/darktrace-mcp@<version>` shows the release:

1. Set `version` in `claude-plugin/.claude-plugin/plugin.json` and `claude-plugin/plugin.json`.
2. Replace `@nuoframework/darktrace-mcp@<old>` with `@<version>` in `claude-plugin/.mcp.json` and `claude-plugin/mcp.json`.
3. Run both validate commands and merge to `main`.

Codex users who installed from the repository marketplace receive the new version with `codex plugin marketplace upgrade darktrace-mcp`; Claude Code users with `claude plugin update darktrace-mcp@darktrace-mcp`.

## Test the plugin locally

Load the folder for one session and give the configuration through `--settings`, which accepts inline JSON; the key under `pluginConfigs` is the plugin name:

```sh
claude --plugin-dir ./claude-plugin \
  -p "List the Darktrace tools you have and nothing else" \
  --allowedTools "mcp__plugin_darktrace-mcp_darktrace__*" \
  --settings '{"pluginConfigs":{"darktrace-mcp":{"appliance_url":"https://darktrace.example.invalid","public_token":"dummy","private_token":"dummy","profiles":"read","acknowledge_sensitive_write":"false","date_format":"compact"}}}'
```

With dummy values the server starts and lists the 27 read-profile tools; it only contacts the appliance when a tool is called. The same environment shape can be checked without Claude Code, from any directory outside this repository:

```sh
DARKTRACE_URL=https://darktrace.example.invalid DARKTRACE_PUBLIC_TOKEN=dummy DARKTRACE_PRIVATE_TOKEN=dummy \
DARKTRACE_PROFILES=read DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE=false DARKTRACE_DATE_FORMAT=compact \
npx -y @nuoframework/darktrace-mcp@1.1.1 --check-config
```

Run it outside a checkout of this repository: inside one, `npx` resolves the package name to the local, unbuilt project and fails with `darktrace-mcp: command not found`. For the same reason, do not start Claude Code with the plugin enabled from a checkout of this repository unless `dist/` is built.

For Codex: `CODEX_HOME=$(mktemp -d) codex plugin marketplace add ./ && codex plugin marketplace list` registers the repository as a marketplace in a throwaway home, and `codex plugin add darktrace-mcp@darktrace-mcp` installs it; `codex mcp list` then shows the bundled `darktrace` server.

## Limitations

- **Local server.** Runs in Claude Code and in Cowork on the user's machine; ignored in chat on claude.ai. Node.js 22 or later and network access from that machine to the appliance are required.
- **Private certificate authority.** `NODE_EXTRA_CA_CERTS` cannot be set through the plugin. Users of an appliance with a private CA should install the npm package with the wizard and use the [TLS options](configuration.md#network-and-tls) instead.
- **Every option needs a value.** An empty string for `DARKTRACE_DATE_FORMAT`, `DARKTRACE_PROFILES` or the acknowledgement stops the server at startup, which is why every optional `userConfig` entry has a default.
- **Codex.** No configuration prompts and no way to pass the connection to the bundled server; use the wizard and disable the bundled server as described above.
- **First start needs the registry.** `npx` downloads the pinned version once and keeps it in the npm cache; later starts are offline. This differs from the wizard, which installs a fixed copy and writes absolute paths.
