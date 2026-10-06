# Documentation changes: names to reconcile

Working list for the maintainers. The documentation was written for behaviour that other branches implement (full API surface, profiles, setup wizard, `.mcpb`). Every CLI command, flag, file name and assumption used in the docs is listed here so it can be checked against the final code. Delete this file once reconciled.

Files that use these names: `README.md`, `README.es.md`, `SECURITY.md`, `CHANGELOG.md`, `docs/getting-started.md`, `docs/clients.md`, `docs/configuration.md`, `docs/troubleshooting.md`, `docs/security.md`, `docs/docker.md`, `docs/architecture.md`, `docs/releases.md`, and the Spanish copies in `docs/es/`.

## CLI commands and flags

| Name in docs | Where | Assumed behaviour |
|---|---|---|
| `darktrace-mcp` (no args) | configuration | Starts the stdio MCP server |
| `darktrace-mcp setup` | README, getting-started, clients, configuration, CHANGELOG (+ es) | Interactive wizard: URL, hidden token prompts, permission preset (`read`, `read,sensitive`, `read,write`, `all`), detects and configures clients with backups |
| `node dist/src/index.js setup` | getting-started (+ es) | Same wizard when `darktrace-mcp` is not on `PATH` |
| `darktrace-mcp config <client>` | clients, configuration (+ es) | Prints a snippet with real paths. Client names assumed: `claude-desktop`, `claude-code`, `codex`, `cursor`, `vscode`, `windsurf`, `opencode`, `gemini` |
| `darktrace-mcp config cursor` | clients (+ es) | Prints a `cursor://` one-click install link |
| `darktrace-mcp config vscode` | clients (+ es) | Prints a VS Code one-click install link |
| `darktrace-mcp remove` | getting-started, configuration (+ es) | Removes the `darktrace` entry from clients the wizard configured. Docs say token files are **not** deleted |
| `darktrace-mcp test` | README, getting-started, configuration, troubleshooting (+ es) | Online check with one `GET /status` |
| `darktrace-mcp --check-config` / `doctor` | README, getting-started, configuration, troubleshooting (+ es) | Offline config check (existing) |
| `darktrace-mcp --help` / `--version` | configuration, troubleshooting (+ es) | Existing |
| `darktrace-mcp` on `PATH` after `install.sh` | README, all guides | Assumes the installer (or `npm link`) puts the bin on `PATH` |

## Scripts and build

| Name in docs | Assumed behaviour |
|---|---|
| `scripts/install.sh` | macOS/Linux; clones private repo with `gh`, runs `npm ci --ignore-scripts`, `npm run build`, then `setup`. Docs fetch it with `gh api -H 'Accept: application/vnd.github.raw' repos/nuoframework/darktrace-mcp/contents/scripts/install.sh > install.sh` and ask users to read it before `bash install.sh` |
| `scripts/install.ps1` | Windows equivalent, run with `powershell -ExecutionPolicy Bypass -File .\install.ps1` |
| `npm run pack:mcpb` | Builds a `.mcpb` bundle. Docs do not name the output file; they say "the generated `.mcpb` file" |
| `npm run docs:tools` | Added in this branch: regenerates `docs/tools.md` (`--check` mode available via `node scripts/generate-tools-doc.mjs --check`) |
| `npm run build`, `npm ci --ignore-scripts` | Existing |

## Environment variables and call arguments

| Name | Assumed behaviour |
|---|---|
| `DARKTRACE_PROFILES` | Comma list of `read` (default), `sensitive`, `write`, `critical`, `all`. Examples used: `read`, `read,sensitive`, `read,write`, `all` |
| `DARKTRACE_SENSITIVE_READ=true` | Legacy; equivalent to adding `sensitive` |
| `DARKTRACE_WRITE_CRITICAL=true` | Legacy; equivalent to adding `critical` |
| JSON `profiles.{read,write,sensitiveRead,writeCritical}` | Still accepted; mapped to profiles |
| `dryRun:true` | Preview for non-critical writes. Docs do not say it is the default |
| `confirm:true` | Required to execute critical operations; otherwise a preview is returned |
| Audit | Docs say: one JSON line with `"audit":true` on the server's stderr for every write and critical call |

## Files and locations

| Name | Assumed behaviour |
|---|---|
| `~/.config/darktrace-mcp/` | Token files written by the wizard, mode `0600`. Docs show `public-token` and `private-token` as file names in a `chmod` example |
| Client config paths | Claude Desktop `~/Library/Application Support/Claude/claude_desktop_config.json` / `%APPDATA%\Claude\claude_desktop_config.json`; Claude Code via `claude mcp add --scope user`; Codex `~/.codex/config.toml`; Cursor `~/.cursor/mcp.json`; VS Code user `mcp.json`; Windsurf `~/.codeium/windsurf/mcp_config.json`; OpenCode `~/.config/opencode/opencode.json`; Gemini CLI `~/.gemini/settings.json` |
| `.mcpb` | Claude Desktop prompts for URL, tokens and profile; tokens kept in the OS keychain |

## Assumptions to confirm

1. **Profile per operation** in `docs/tools.md` and the README table is derived by `scripts/generate-tools-doc.mjs`: tier `critical` → `critical`; tier `medium`/`high` → `write`; read with sensitivity `high` → `sensitive`; the whole `darktrace_advanced_search` tool → `sensitive`; `requiredProfiles` in the catalogue can raise this. If the implementation differs, edit `profileOf()` and rerun `npm run docs:tools`.
2. **Lab-validated list** is hard-coded in the generator (the 19 operations from the 2026-10-06 lab) and merged with any `validatedOn` entries in the catalogue.
3. **Tool count** (51 tools, 78 operations) comes from the current `tool-groups.json`. Rerun the generator if it changes and update the README counts (EN and ES).
4. **Native Windows**: docs say token-file checks may refuse files and recommend WSL. Remove if `install.ps1`/the wizard handles Windows ACLs.
5. **Docker**: docs say v1.0.0 image archives contain the earlier read-only build and recommend building from the checkout for the full surface. The wizard is not documented as configuring Docker.
6. **Release v1.0.0** in `docs/releases.md` is described as read-only; the full surface is said to "arrive in a later release".
7. **Docs lint**: `scripts/validate-examples.mjs` requires JSON client snippets in README/guides to use `DARKTRACE_PROFILES=read` and `DARKTRACE_SENSITIVE_READ=false`, node + absolute `dist/src/index.js`. All snippets comply. If the wizard emits a different command (for example the `darktrace-mcp` bin), the lint and the snippets need updating together.
