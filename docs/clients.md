# MCP clients

[README](../README.md) · [Getting started](getting-started.md) · [Examples](../examples)

Build first and substitute **real absolute paths** for Node, the compiled entrypoint and the two token files in every example. `~` and shell variables inside paths are not portable substitutions. GUI applications may use a different environment from your terminal. The OS user running the server must own and read the token files. Prefer user-scoped configuration with absolute executable and entrypoint paths; only enable project-shared configuration after reviewing every command, argument, environment value and host preload it can launch. `NODE_OPTIONS`, `LD_PRELOAD`, `DYLD_*` and `BASH_ENV` are applied before the server can enforce its own policy. A remote workspace runs the server on its execution host: provision credentials there through your approved secret manager, never by committing files.

All examples set only token **file paths**, not token values. No token is passed as an argument. Keep profiles and sensitive-read settings under operator control. Assess provider processing, retention, residency and host forwarding before any deployment; Sensitive read cannot expand release eligibility. Host approval prompts are not appliance authorization. Where supported, run this server in a dedicated MCP host/profile. If a profile is shared, review every other MCP server's command, environment and filesystem mounts.

The independently accepted candidate enforces **19 validated GET selectors across 15 MCP tools**. Both `read` and `read` + `sensitiveRead` expose the same complete contract; sensitive read cannot expand this ceiling. Advanced Search and every other excluded selector, including writes, are refused before preview, audit or network access. [Bounded lab results](security/validated-consultations-lab-checkpoint.md); no final suite or stable release approval.

## Claude Code

Prefer a user-scoped stdio server. The checked-in [Claude Code example](../examples/claude-code.mcp.json) is portable configuration material, not a default for a shared project; review all commands, arguments, environment values and host preloads before enabling any project `.mcp.json`. User/local configuration is maintained in `~/.claude.json`. Add a user-scoped server with file-path environment settings:

```sh
claude mcp add --scope user \
  --env DARKTRACE_URL=https://darktrace.example.internal \
  --env DARKTRACE_PUBLIC_TOKEN_FILE=/absolute/private/darktrace/public-token \
  --env DARKTRACE_PRIVATE_TOKEN_FILE=/absolute/private/darktrace/private-token \
  --env DARKTRACE_PROFILES=read \
  --env DARKTRACE_SENSITIVE_READ=false \
  --transport stdio darktrace -- \
  /absolute/path/to/node /absolute/path/to/darktrace-mcp/dist/src/index.js
claude mcp get darktrace
```

Open `/mcp` in Claude Code to inspect availability. See [official Claude Code MCP documentation](https://code.claude.com/docs/en/mcp) for scope, trust and current behavior. Do not replace this source-installed entrypoint with an unpublished `npx` package.

## Claude Desktop

In Settings → Developer → Edit Config, merge the [Desktop example](../examples/claude-desktop.json) into `mcpServers`, preserving your other entries. The config paths are:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Restart Desktop completely after editing.

The Windows config path above belongs to the Desktop host; **native Windows token/config-file checks currently fail closed**. Run the server in an approved Linux/WSL environment using that environment's absolute Node, entrypoint, token and JSON paths, with files owned by its Linux runtime UID on a filesystem enforcing the required permissions. If the Windows host launches WSL, use an operator-reviewed launcher that starts Linux Node with those Linux paths; do not pass Windows host paths as Linux file paths or disable/weaken the checks. Escape backslashes only where the host's JSON configuration requires Windows launcher paths. Consult the [official MCP local-server guide](https://modelcontextprotocol.io/docs/2026-07-28/develop/connect-local-servers). A local process still returns data to the host/provider context.

## VS Code / Copilot

Prefer **MCP: Open User Configuration** and the active user profile. Workspace `.mcp.json` or `.vscode/mcp.json` can run for every collaborator who trusts the project; use those only after reviewing all commands, arguments, environment values and host preloads in the configuration. New portable user configuration can also use `~/.copilot/mcp-config.json` (`$COPILOT_HOME/mcp-config.json` when set). Review workspace trust before enabling servers; use **MCP: List Servers** to inspect startup. For remote workspaces, the configured execution host needs the absolute paths and private files.

See [official VS Code MCP documentation](https://code.visualstudio.com/docs/agent-customization/mcp-servers). Keep secret values out of workspace JSON; these examples use paths to operator-provisioned files.

## Codex CLI / IDE

Merge the [Codex example](../examples/codex.config.toml) into `~/.codex/config.toml` (or `$CODEX_HOME/config.toml` when configured). Trusted project configuration can use `.codex/config.toml`. The CLI and IDE extension share this MCP configuration. Check registration with:

```sh
codex mcp --help
codex mcp list
codex mcp get darktrace
```

The installed CLI also supports `codex mcp add --env KEY=VALUE darktrace -- /absolute/node /absolute/entry.js`; only supply non-secret configuration or file paths this way. Consult [official Codex MCP documentation](https://developers.openai.com/codex/mcp) and your installed `codex mcp add --help` for version-specific options. The TOML example avoids shell-dependent environment inheritance and credentials in argv.

## Verify without an appliance call

Run the compiled entrypoint with `--check-config` using the same settings as your host. This checks local configuration only. Host registration and parsing do not establish appliance authentication, compatibility or provider eligibility. API 6.1 is the source contract; lab 7.1.0 passed 19 bounded selectors in native MCP and Docker, which does not establish full compatibility. See [lab validation](lab-validation.md) and [stable-readiness gates](stable-readiness.md).

## Docker stdio client

Build the local image, inspect its ID, then replace the placeholder in the [Docker client example](../examples/docker.mcp.json) with that `sha256:...` ID. The host command uses `--pull=never` to prevent replacing the reviewed image. Use an absolute Docker executable path, `--log-driver=none`, `-i` and no TTY; do not publish ports. The image's default runtime UID is nonroot UID 1000. Token files must be owned by the effective UID seen inside the container and have mode `0600` or `0400`; bind-mount them read-only. If needed, set a nonzero `--user UID:GID` that matches their owner. Run `--check-config` separately first, especially with Docker Desktop, to verify bind-mount ownership and permissions from inside the container. Leave `--check-config` off the MCP host command so it can serve stdio requests. Never weaken the file checks to make a mount pass. Disabling Docker daemon logging does not prevent the MCP host from forwarding results to its provider; use the safe fixed diagnostics and do not persist raw MCP stdout with `docker logs`.

The example includes no token values or Docker env-file. Keep credentials in the mounted files and configure only file paths in the container environment. Constrain outbound appliance access through deployment network policy; the bridge network example does not provide that policy by itself. Do not use `--network host`. Review the Apache-2.0 project license and the production dependencies' license/notice obligations represented in the runtime image before distributing a derived image. Provider eligibility, retention, residency and forwarding review apply to container deployments as well.

## Output and destination boundaries

Runtime output uses code-owned conservative views, with up to eight selected principal fields. `minimized:true` and `unmodeledFieldsOmitted:true` describe projection, not proof that all arbitrary nested sensitive data was removed. Unknown objects and maps are summarized. Known secret values and supported one-step encodings are redacted; arbitrary transformed encodings are outside that guarantee. The MCP host/model provider can still receive sensitive information in retained fields.

The HTTPS connector pins an approved startup DNS snapshot. The standard NAT64 ranges (`64:ff9b::/96`, `64:ff9b:1::/48`), 6to4 (`2002::/16`) and Teredo (`2001::/32`) addresses are always blocked, including translations that appear to target public IPv4. A prohibited DNS answer causes a terminal connector failure until the server process restarts; fixing DNS does not reopen that running connector. Operator-specific NAT64 prefixes cannot be detected generically; exact destination allowlists and deployment network review remain necessary. This fail-closed behavior may require changing the deployment's DNS/network design. Actual private-network pinning and appliance behavior remain unvalidated.
