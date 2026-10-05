# MCP clients

[README](../README.md) · [Getting started](getting-started.md) · [Examples](../examples)

Build first and substitute **real absolute paths** for Node, the compiled entrypoint and the two token files in every example. `~` and shell variables inside paths are not portable substitutions. GUI applications may use a different environment from your terminal. The OS user running the server must own and read the token files. A remote workspace runs the server on its execution host: provision credentials there through your approved secret manager, never by committing files.

All examples set only token **file paths**, not token values. No token is passed as an argument. Keep profiles and sensitive-read settings under operator control. Assess provider processing, retention, residency and host forwarding before any deployment; Advanced Search needs additional eligibility. Host approval prompts are not appliance authorization.

## Claude Code

Use the [Claude Code example](../examples/claude-code.mcp.json) as a project-root `.mcp.json`; review project trust/approval before starting. User/local configuration is maintained in `~/.claude.json`. Alternatively, add a user-scoped stdio server with file-path environment settings:

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

Use workspace `.mcp.json` with the [portable example](../examples/claude-code.mcp.json), or use `.vscode/mcp.json` with the VS Code `servers` wrapper in the [VS Code example](../examples/vscode.mcp.json). For user configuration, run **MCP: Open User Configuration**; its location follows your active profile. New portable user configuration can also use `~/.copilot/mcp-config.json` (`$COPILOT_HOME/mcp-config.json` when set). Review workspace trust before enabling servers; use **MCP: List Servers** to inspect startup. For remote workspaces, the configured execution host needs the absolute paths and private files.

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

Run the compiled entrypoint with `--check-config` using the same settings as your host. This checks local configuration only. Host registration and parsing do not establish appliance authentication, compatibility or provider eligibility. API 6.1 is the source contract; the 7.1 target remains NOT VALIDATED.

## Output and destination boundaries

Runtime output uses code-owned conservative views, with up to eight selected principal fields. `minimized:true` and `unmodeledFieldsOmitted:true` describe projection, not proof that all arbitrary nested sensitive data was removed. Unknown objects and maps are summarized. Advanced Search omits `@message` and `@fields` content. Known secret values and supported one-step encodings are redacted; arbitrary transformed encodings are outside that guarantee. The MCP host/model provider can still receive sensitive information in retained fields.

The HTTPS connector pins an approved startup DNS snapshot. The standard NAT64 ranges (`64:ff9b::/96`, `64:ff9b:1::/48`), 6to4 (`2002::/16`) and Teredo (`2001::/32`) addresses are always blocked, including translations that appear to target public IPv4. A prohibited DNS answer causes a terminal connector failure until the server process restarts; fixing DNS does not reopen that running connector. Operator-specific NAT64 prefixes cannot be detected generically; exact destination allowlists and deployment network review remain necessary. This fail-closed behavior may require changing the deployment's DNS/network design. Actual private-network pinning and appliance behavior remain unvalidated.
