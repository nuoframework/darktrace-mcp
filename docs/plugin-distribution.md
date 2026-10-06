# Plugin distribution

[README](../README.md) · [Client setup](clients.md) · [Releases](releases.md) · [Security](security.md)

The folder `claude-plugin/` packages the server as a plugin for Claude Code, Cowork and Codex, and the repository is a plugin marketplace for both clients. This page starts with the install commands, then describes the folder, the Claude Directory submission, the per-release version bump, the local tests and the limitations.

## Install

**Claude Code.** Two commands, then answer the prompts (appliance URL, public token, private token, profile). That is the whole setup.

```sh
claude plugin marketplace add nuoframework/darktrace-mcp
claude plugin install darktrace-mcp@darktrace-mcp
```

The tokens go to the operating system's credential store, not to a settings file. Run `/mcp` in a session to see the `darktrace` server and `/config` to change the profile later. The server is a local process: it works in Claude Code and in Cowork sessions that run on your computer, and it is ignored in chat on claude.ai, where only the skill loads.

**Codex.** Three commands: install the plugin, then run the wizard once for the connection.

```sh
codex plugin marketplace add nuoframework/darktrace-mcp
codex plugin add darktrace-mcp@darktrace-mcp
npx -y @nuoframework/darktrace-mcp@1.1.2 setup
```

Codex does not prompt for configuration values. Its bundled copy of the server receives only `DARKTRACE_PROFILES`, `PLUGIN_ROOT` and `PLUGIN_DATA`; variables exported in your shell and `env` overrides under `[plugins."darktrace-mcp@darktrace-mcp".mcp_servers.darktrace]` are not passed to it (Codex CLI 0.160.1), so that copy exits at startup with `instance.baseUrl must be an HTTPS origin` and Codex logs `MCP server startup failed server_name="darktrace"` (visible only with `RUST_LOG=info`); the model sees no `darktrace_*` tools and the skill then guides you to the wizard. The wizard writes a complete `mcp_servers.darktrace` entry with absolute paths and token files into `~/.codex/config.toml`. Afterwards disable the bundled copy and keep the skill:

```toml
[plugins."darktrace-mcp@darktrace-mcp".mcp_servers.darktrace]
enabled = false
```

OpenAI's public plugin directory accepts only remote (HTTPS) MCP servers, so this plugin reaches Codex through the repository marketplace only.

## What the folder contains

| File | Read by | Purpose |
|---|---|---|
| `claude-plugin/.claude-plugin/plugin.json` | Claude Code, Cowork, Claude Directory | Manifest: name `darktrace-mcp`, version, metadata and the `userConfig` options Claude Code asks for (appliance URL, public and private token marked sensitive, profiles, sensitive-write acknowledgement, signature date format) |
| `claude-plugin/.claude-plugin/icon.png` | Claude Directory | 1024 × 1024 listing icon: the project's own node-graph artwork from the README banner on DT Dark, no wordmark. The directory fixes the icon at the first submission |
| `claude-plugin/package.json`, `claude-plugin/package-lock.json` | Claude Code | Lockfile install: `@nuoframework/darktrace-mcp` at the exact published version plus its three runtime dependencies, with registry URLs and integrity hashes. Claude Code runs the install with `--ignore-scripts` when it copies the plugin into its cache |
| `claude-plugin/.mcp.json` | Claude Code, Cowork | One stdio server `darktrace` that runs `node ${CLAUDE_PLUGIN_ROOT}/node_modules/@nuoframework/darktrace-mcp/dist/src/index.js` with the `DARKTRACE_*` variables filled from `${user_config.*}` |
| `claude-plugin/plugin.json` | Codex | Portable manifest (Agent Plugins schema) with the OpenAI listing fields under `extensions.com.openai.interface` |
| `claude-plugin/mcp.json` | Codex | Portable MCP file declaring the same server with `type: "stdio"`, started as `npx -y @nuoframework/darktrace-mcp@1.1.2` because Codex has no lockfile install, and only `DARKTRACE_PROFILES=read` in its environment |
| `claude-plugin/skills/darktrace-investigation/SKILL.md` | All | Investigation skill: read-only first, small responses, previews and approval before critical actions, appliance data treated as untrusted, and the first-run guidance to the wizard when no tools are available |
| `claude-plugin/README.md`, `claude-plugin/LICENSE` | Claude Directory, people | Listing description and license (a copy of the root `LICENSE`) |
| `.claude-plugin/marketplace.json` | Claude Code | Repository marketplace `darktrace-mcp` with one entry whose source is `./claude-plugin` |
| `.agents/plugins/marketplace.json` | Codex | Repository marketplace with the same entry (`source: local`, `policy.installation: AVAILABLE`) |

The plugin lives in a subfolder so that the directory reads the plugin's own `package.json` and lockfile, not the repository's, and so that only the plugin folder is installed on users' machines. None of these files enter the npm tarball (`files` in `package.json` is a whitelist), the Docker image (`.dockerignore` whitelists paths) or the release snapshot (`scripts/prepare-release.mjs` copies named directories only).

## Submit to the Claude Directory (owner)

The developer portal validates the plugin, scans each new commit on the tracked branch and lists the plugin for people on Pro, Max, Team and Enterprise plans. Read the [pre-submission checklist](https://claude.com/docs/plugins/pre-submission-checklist) and [Submit your plugin](https://claude.com/docs/plugins/submit) first.

1. Check locally: `claude plugin validate --strict ./claude-plugin` and `claude plugin validate .` must both print `✔ Validation passed`.
2. Open [claude.ai/directory/manage](https://claude.ai/directory/manage) and select **Submit new** → **Plugin bundle**. The GitHub account connected to claude.ai must be able to push to the repository.
3. On **Source** enter:
   - **Repository:** `nuoframework/darktrace-mcp`
   - **Plugin path:** `claude-plugin`
   - **Branch or tag:** leave empty (the default branch, `main`)
4. Select **Validate**. Expected result: no blocking finding. The portal's first validation (main at `b57fd26`, when `.mcp.json` still used `npx`) reported the hold "Runs a pinned npx package" and the warnings "No icon", "Launcher lock missing" and three "Unrecognized field in plugin.json"; the icon, the lockfile install and the trimmed manifest answer them. A hold can still appear for the lockfile install ("Dependencies install from a lockfile": an Anthropic reviewer reads the version before it goes live) and for "Name matches a known brand", because the name contains a trademark the author does not own; the README states that the project is independent and unofficial.
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

The directory follows `main`. Every merge that touches `claude-plugin/` becomes a new version that is scanned again, and a reviewer hold can apply to each. If a version fails the security scan, later versions wait until a reviewer clears the plugin. The listing keeps serving the last published version meanwhile.

## Bump the pinned version at each release

The plugin pins the npm package to an exact version, as the directory requires. The pin must point to a version that is already on the public registry, otherwise every install fails. Step 7 of [publishing a version](releases.md#publishing-a-version-owner) is the checklist entry; in short, after `npm view @nuoframework/darktrace-mcp@<version>` shows the release:

1. Set `version` in `claude-plugin/.claude-plugin/plugin.json` and `claude-plugin/plugin.json`.
2. Set the dependency to `<version>` in `claude-plugin/package.json` and regenerate the lockfile (below).
3. Replace `@nuoframework/darktrace-mcp@<old>` with `@<version>` in `claude-plugin/mcp.json`, `claude-plugin/README.md` and the skill's first-run command.
4. Run both validate commands and merge to `main`.

To regenerate the lockfile, run `npm install --package-lock-only --ignore-scripts --no-audit --no-fund` inside `claude-plugin/`, then keep only the server's production subtree. The published package ships an `npm-shrinkwrap.json` whose dev tooling is flagged `dev`, but npm copies that whole tree into a nested lock (112 packages, ESLint and TypeScript included), which would be downloaded on every plugin install. The pruned lock keeps `@nuoframework/darktrace-mcp` and the packages reachable from its `dependencies` (`zod`, `@modelcontextprotocol/server`, `@modelcontextprotocol/core`; check `npm view @nuoframework/darktrace-mcp@<version> dependencies`):

```sh
node -e '
const fs=require("fs");const l=JSON.parse(fs.readFileSync("package-lock.json","utf8"));const pk=l.packages;
const find=(from,n)=>{let b=from;for(;;){const c=(b?b+"/":"")+"node_modules/"+n;if(pk[c])return c;if(!b)return null;const i=b.lastIndexOf("/node_modules/");b=i<0?"":b.slice(0,i);}};
const keep=new Set([""]);const st=["node_modules/@nuoframework/darktrace-mcp"];
while(st.length){const p=st.pop();if(keep.has(p))continue;keep.add(p);for(const n of Object.keys({...pk[p].dependencies,...pk[p].optionalDependencies,...pk[p].peerDependencies})){const r=find(p,n);if(r)st.push(r);}}
l.packages=Object.fromEntries(Object.entries(pk).filter(([k])=>keep.has(k)));fs.writeFileSync("package-lock.json",JSON.stringify(l,null,2)+"\n");console.log([...keep].filter(Boolean));'
```

Then confirm in a scratch copy that `npm ci --ignore-scripts` succeeds and that `node node_modules/@nuoframework/darktrace-mcp/dist/src/index.js --check-config` answers with the `DARKTRACE_*` variables set. The shrinkwrap problem is a packaging item for the next server release (publish it with the dev entries omitted), after which the prune step becomes unnecessary.

Codex users who installed from the repository marketplace receive the new version with `codex plugin marketplace upgrade darktrace-mcp`; Claude Code users with `claude plugin update darktrace-mcp@darktrace-mcp`.

## Test the plugin locally

A marketplace install copies the plugin into Claude Code's cache and runs the lockfile install there (observed: about 3 seconds for the 4 packages). `--plugin-dir` loads the folder in place and does not install dependencies, so run `npm ci --ignore-scripts` inside `claude-plugin/` first (`node_modules` is ignored by git). Then load the folder for one session and give the configuration through `--settings`, which accepts inline JSON; the key under `pluginConfigs` is the plugin name:

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
npx -y @nuoframework/darktrace-mcp@1.1.2 --check-config
```

Run it outside a checkout of this repository: inside one, `npx` resolves the package name to the local, unbuilt project and fails with `darktrace-mcp: command not found`.

To test a branch the way users install it, point a scratch marketplace at the branch with a `git-subdir` source (`"url": "https://github.com/nuoframework/darktrace-mcp.git", "path": "claude-plugin", "ref": "<branch>"`), add it with `claude plugin marketplace add <dir>`, install `darktrace-mcp@<marketplace-name>` with `--config` values, and check that `~/.claude/plugins/cache/<marketplace-name>/darktrace-mcp/<version>/node_modules` exists.

For Codex: `CODEX_HOME=$(mktemp -d) codex plugin marketplace add ./ && codex plugin marketplace list` registers the repository as a marketplace in a throwaway home, and `codex plugin add darktrace-mcp@darktrace-mcp` installs it; `codex mcp list` then shows the bundled `darktrace` server.

## Limitations

- **Local server.** Runs in Claude Code and in Cowork on the user's machine; ignored in chat on claude.ai. Node.js 22 or later and network access from that machine to the appliance are required.
- **Private certificate authority.** `NODE_EXTRA_CA_CERTS` cannot be set through the plugin. Users of an appliance with a private CA should install the npm package with the wizard and use the [TLS options](configuration.md#network-and-tls) instead.
- **Every option needs a value.** An empty string for `DARKTRACE_DATE_FORMAT`, `DARKTRACE_PROFILES` or the acknowledgement stops the server at startup, which is why every optional `userConfig` entry has a default.
- **Codex.** No configuration prompts and no way to pass the connection to the bundled server; use the wizard and disable the bundled server as described above.
- **Install needs the registry.** Claude Code downloads the pinned package and its three dependencies from registry.npmjs.org when it installs or updates the plugin (npm, `--ignore-scripts`, 60-second limit); later starts are offline. In Codex, `npx` downloads the pinned version on first start and keeps it in the npm cache.
