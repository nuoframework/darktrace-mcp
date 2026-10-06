Dated audit of installation paths by client, operating system and delivery method.

[README](../../README.en.md) · [Install page](install.md) · [Clients](clients.md) · [Getting started](getting-started.md) · [Docker](docker.md)

[Español](../install-matrix.md) · **English**

# Install matrix

> **Version scope.** The eight original wizard clients are available in npm 1.1.1. The additional 13 client adapters, updated Windsurf path and setup-mode tool below describe [installation PR #18](https://github.com/nuoframework/darktrace-mcp/pull/18), pending release. Use their manual snippets with 1.1.1; the new `setup --client` IDs require that change and a newly published version. Do not expect the pinned 1.1.1 command to include them.

Audit of every installation path per client, operating system and method, dated **2026-10-06**. "Before" is the state at `origin/main` commit `7ccfa79`; "After" is this branch. The installation track checked every client row against the vendor's current documentation on that date; the URL in the last column is the page that was read. Where a vendor documents no file path, the matrix says so and the wizard prints JSON to paste instead of guessing.

Owner rule applied throughout: installation must be easy on every client, IDE and path. No appliance URL is suggested or prefilled anywhere; tokens normally live in owner-only files (mode `0600`) or client secret storage, never in a link or on a command line; native Windows inline storage requires the explicit consent described below.

## Paths

| Path | What it is | Steps for the user |
|---|---|---|
| **Wizard** | `npx -y @nuoframework/darktrace-mcp@1.1.1 setup` | 1 command, configuration questions (five numbered steps in the new presentation), restart the client |
| **One-click badge** | README badge opens the client, which adds a `darktrace` entry running the pinned package through `npx`; the pending change adds setup mode and its only tool says to run `setup` | badge → confirm in client → run `setup` once → restart; on 1.1.1, run setup before starting |
| **Plugin / marketplace** | Claude plugin bundle and Codex marketplace, built by another track in `claude-plugin/`, `.claude-plugin/`, `.agents/` | out of scope here |
| **`.mcpb`** | Claude Desktop extension bundle from the GitHub release; tokens go to the OS keychain | download, double-click, fill the form |
| **Docker** | `setup --runtime docker`, pinned image ID with `--pull=never` | 1 command plus `Pull it now? [Y/n]` |
| **Manual JSON / TOML / YAML** | `darktrace-mcp config <client>` prints the exact snippet with real paths | paste, restart |

## Clients × paths

Legend: **W** wizard writes the file or calls the client CLI · **P** wizard prints JSON to paste (vendor documents no file) · **L** one-click link printed by `config <client>` · **B** README badge · **–** not applicable · **?** not documented by the vendor.

| Client | Before (`7ccfa79`) | After | Wizard id | Where the entry goes (user scope) | Deeplink | Verified against |
|---|---|---|---|---|---|---|
| Claude Desktop | W | W + `.mcpb` | `claude-desktop` | macOS `~/Library/Application Support/Claude/claude_desktop_config.json`, Windows `%APPDATA%\Claude\claude_desktop_config.json`; Linux not documented by the vendor | – (extension install instead) | [modelcontextprotocol.io/quickstart/user](https://modelcontextprotocol.io/quickstart/user), [support.claude.com: local MCP servers](https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop), [anthropics/mcpb MANIFEST](https://github.com/anthropics/mcpb/blob/main/MANIFEST.md) |
| Claude Code | W (CLI) | W (CLI) | `claude-code` | `~/.claude.json` via `claude mcp add --scope user … --transport stdio darktrace -- node index.js` | – | [code.claude.com/docs/en/mcp](https://code.claude.com/docs/en/mcp) |
| Codex CLI + Codex app | W (CLI or TOML) | W | `codex` | `~/.codex/config.toml` `[mcp_servers.darktrace]` (shared by CLI, IDE extension and the desktop app); `codex mcp add darktrace --env K=V -- node index.js` | – | [learn.chatgpt.com/docs/extend/mcp](https://learn.chatgpt.com/docs/extend/mcp?surface=cli), [config reference](https://learn.chatgpt.com/docs/config-file/config-reference) |
| Cursor | W + L | W + L + **B** | `cursor` | `~/.cursor/mcp.json` `mcpServers` | `cursor://anysphere.cursor-deeplink/mcp/install?name=darktrace&config=<base64 JSON>` | [cursor.com/docs/mcp](https://cursor.com/docs/mcp), [install links](https://cursor.com/docs/mcp/install-links) |
| VS Code (Copilot agent mode) | W + L + `code --add-mcp` | W + L + **B** (+ Insiders badge) | `vscode` | user profile `mcp.json` (**MCP: Open User Configuration**; macOS `~/Library/Application Support/Code/User/`, Linux `~/.config/Code/User/`, Windows `%APPDATA%\Code\User\`) `servers` with `type: stdio` and `inputs` | `vscode:mcp/install?<url-encoded JSON>`, `vscode-insiders:…`; `code --add-mcp '<json>'` | [code.visualstudio.com MCP servers](https://code.visualstudio.com/docs/agent-customization/mcp-servers), [MCP configuration reference](https://code.visualstudio.com/docs/agents/reference/mcp-configuration) |
| Windsurf (now Devin Desktop) | W (`~/.codeium/windsurf/`) | W (new path first) | `windsurf` | `~/.config/devin/mcp_config.json` (Windows `%APPDATA%\devin\mcp_config.json`); legacy `~/.codeium/windsurf/mcp_config.json` still used when present | – ("no one-click install") | [docs.devin.ai/desktop/cascade/mcp](https://docs.devin.ai/desktop/cascade/mcp) |
| OpenCode | W | W | `opencode` | `~/.config/opencode/opencode.json` (`.jsonc` honoured) `mcp` with `type: local`, `command` array, `environment` | – | [opencode.ai/docs/mcp-servers](https://opencode.ai/docs/mcp-servers) |
| Gemini CLI | W | W | `gemini` | `~/.gemini/settings.json` `mcpServers`; `gemini mcp add -s user -e K=V darktrace node index.js` | – | [geminicli.com/docs/tools/mcp-server](https://geminicli.com/docs/tools/mcp-server/) |
| JetBrains AI Assistant | – | **P** | `jetbrains` | no file documented: Settings \| Tools \| AI Assistant \| MCP \| Add, paste JSON; "Import from Claude" reuses the Claude Desktop entry | – | [jetbrains.com/help/ai-assistant/mcp.html](https://www.jetbrains.com/help/ai-assistant/mcp.html) |
| JetBrains Junie | – | **W** | `junie` | `~/.junie/mcp/mcp.json` `mcpServers` (plugin and CLI share it); project `.junie/mcp/mcp.json` | – | [junie.jetbrains.com CLI MCP](https://junie.jetbrains.com/docs/junie-cli-mcp-configuration.html), [plugin settings](https://junie.jetbrains.com/docs/junie-plugin-mcp-settings.html) |
| Zed | – | **W** | `zed` | `~/.config/zed/settings.json` `context_servers` (`command`, `args`, `env`); Windows path **?**; the file is JSONC, so a file with comments gets a paste snippet instead | – | [zed.dev/docs/ai/mcp](https://zed.dev/docs/ai/mcp) |
| Cline | – | **W** | `cline` | `<Code user dir>/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json` `mcpServers` with `disabled`, `autoApprove` (shape from the vendor docs; the extension path is confirmed by the project's own file watcher and issue tracker, the docs page only names the CLI path `~/.cline/data/settings/`) | – | [docs.cline.bot MCP](https://docs.cline.bot/mcp/adding-and-configuring-servers) |
| Roo Code | – | **W** | `roo` | `<Code user dir>/globalStorage/rooveterinaryinc.roo-cline/settings/mcp_settings.json` `mcpServers` with `alwaysAllow`, `disabled` (path from the vendor's issue tracker; docs name only "Edit Global MCP"); project `.roo/mcp.json` | – | [docs.roocode.com using MCP](https://roocodeinc.github.io/Roo-Code/features/mcp/using-mcp-in-roo) |
| Continue | – | **W** (YAML block) | `continue` | `~/.continue/config.yaml` top-level `mcpServers:` list (Windows `%USERPROFILE%\.continue\config.yaml`); the wizard inserts a marker-delimited item and refuses any shape it does not recognise | – | [docs.continue.dev MCP](https://docs.continue.dev/customize/deep-dives/mcp), [reference](https://docs.continue.dev/reference) |
| Kiro | – | **W** + L | `kiro` | `~/.kiro/settings/mcp.json` `mcpServers` with `disabled`, `autoApprove`; project `.kiro/settings/mcp.json` | `https://kiro.dev/launch/mcp/add?name=darktrace&config=<url-encoded JSON>` (Kiro confirms before writing) | [kiro.dev/docs/mcp/configuration](https://kiro.dev/docs/mcp/configuration/), [servers](https://kiro.dev/docs/mcp/servers/) |
| Amp | – | **W** | `amp` | `~/.config/amp/settings.json` (or `.jsonc`) key `amp.mcpServers`; same `~/.config/amp` path on Windows; `amp mcp add` has no documented `--env`, so the file is written | – | [ampcode.com/docs/customize/mcp](https://ampcode.com/docs/customize/mcp), [CLI settings](https://ampcode.com/docs/cli/settings) |
| GitHub Copilot CLI | – | **W** | `copilot-cli` | `~/.copilot/mcp-config.json` (`COPILOT_HOME`) `mcpServers` with `type: local`, `tools: ["*"]`; `copilot mcp add --env K=V darktrace -- node index.js` | – | [docs.github.com: add MCP servers to Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers) |
| Warp | – | **W** | `warp` | `~/.warp/.mcp.json` `mcpServers` (`command`, `args`, `env`); also Settings > Agents > MCP servers | – (`warp://settings/mcp` only opens the page) | [docs.warp.dev MCP](https://docs.warp.dev/agents/capabilities/mcp) |
| Goose | – | **W** (YAML block) | `goose` | `~/.config/goose/config.yaml` (Windows `%APPDATA%\Block\goose\config\config.yaml`) `extensions:` map with `type: stdio`, `cmd`, `args`, `envs`, `timeout` | `goose://extension?cmd=…` exists but allows only `npx`, `uvx`, `jbang`, `goosed`, `docker` as `cmd`, so it cannot carry the absolute Node path the wizard uses; not emitted | [goose-docs.ai config files](https://goose-docs.ai/docs/guides/config-files), [using extensions](https://goose-docs.ai/docs/getting-started/using-extensions) |
| LM Studio | – | **W** + L | `lmstudio` | `~/.lmstudio/mcp.json` `mcpServers` (Cursor notation) | `lmstudio://add_mcp?name=darktrace&config=<base64 JSON>` | [lmstudio.ai/docs/app/mcp](https://lmstudio.ai/docs/app/mcp), [deeplink](https://lmstudio.ai/docs/app/mcp/deeplink) |
| Antigravity | – | **W** | `antigravity` | `~/.gemini/config/mcp_config.json` `mcpServers`; workspace `.agents/mcp_config.json` | – | [antigravity.google/docs/mcp](https://antigravity.google/docs/mcp) |

Every **W** entry: backup of the existing file (`<file>.bak-<timestamp>`), atomic write, absolute Node and `dist/src/index.js` paths, token **file** paths (never values), new files created `0600` in a `0700` directory, symbolic links and JSONC files never rewritten (a paste snippet is printed instead). Native Windows inline storage is the explicitly acknowledged exception. `setup --client <id>`, `config <id>` and `remove --client <id>` accept these IDs in the installation change.

## Operating systems

| OS | Wizard | Token storage | Notes |
|---|---|---|---|
| macOS | yes | `~/.config/darktrace-mcp/{public,private}-token`, mode `0600`, directory `0700` | Docker Desktop bind mounts appear root-owned: the Docker entry sets `DARKTRACE_TOKEN_FILE_OWNER=root-or-current` |
| Linux | yes | same | Docker keeps the host owner; strict owner check stays on |
| WSL | yes (run the Linux command inside WSL) | same, inside the WSL file system | Windows-side clients must launch the server through `wsl.exe`; the wizard does not write Windows client files from inside WSL |
| Windows native | **partial** | token **values** in the client file, only after explicit consent (`--inline-tokens-windows`) | The server refuses token files on `win32` because it cannot verify an owner-only ACL. See [Windows](#windows-native) below. Fully native paths without that trade-off: the `.mcpb` for Claude Desktop (OS keychain), the VS Code badge or `config vscode` link (VS Code secret storage), Docker Desktop |

## Where a user can get stuck (before → after)

| Friction | Before | After |
|---|---|---|
| A client entry exists but has no URL or tokens (badge, manual copy, forgotten `setup`) | the server exited with `startup_error`; the client showed a dead server | pending release: the server starts in **setup mode** with one read-only tool, `darktrace_setup_status`, whose description and result name the exact command: `npx -y @nuoframework/darktrace-mcp@1.1.1 setup`; stderr gets one `setup_required` line |
| Client not in the wizard | 13 of the 21 clients above needed hand-written JSON | every client has an id; one is paste-only because the vendor documents no file |
| Which client file, which key | per-client prose in `docs/clients.md` | `docs/install.md` starts with "pick your client" and gives 1 to 3 lines each; the wizard summary prints file, status and mode |
| Wizard output on a 80-column terminal | unstructured text | banner, `Step n of 5`, markers, aligned summary; plain ASCII without a TTY or with `NO_COLOR` |
| Network probe looks hung | silent wait | spinner on a TTY, nothing extra when piped |
| Error with no way forward | message only | every error ends with a `Next:` line |
| `npx` without a version | README pinned `@1.1.1`, unpinned form undocumented | documented: the unpinned form installs the latest published version; pin for reproducibility and in client entries (the wizard always registers absolute paths, never `npx`) |
| Windows | "cannot protect token files" with no analysis | analysis and the safe native paths below |

## Windows native

**Finding.** Node.js exposes no file-ACL API. On Windows `fs.stat` reports only the read-only attribute, so the server's owner-only check (`assertPrivateFile` in `src/config/load.ts`) cannot be evaluated and the server refuses token files on `win32` by design.

**Investigated path.** `icacls <file> /inheritance:r /grant:r "<user>:(R)"` restricts a token file under `%LOCALAPPDATA%\darktrace-mcp\` to the current account (plus SYSTEM and Administrators through ownership), which is the practical equivalent of mode `0600`; the wizard could run it with an injected runner and test it. The missing half is **verification at server start**: reading an ACL from Node needs either a native addon (not acceptable for this supply chain) or spawning `icacls`/PowerShell from the server's startup path, which the security design excludes (no subprocesses, no shell, deterministic startup) and which CI cannot exercise because the pipeline runs on Linux only. Shipping an unverifiable or untested security check would be worse than the current explicit refusal.

**Decision.** Not implemented in this branch; documented instead. What works natively today, in order of preference:

1. Claude Desktop `.mcpb`: tokens in the OS keychain.
2. VS Code badge or `darktrace-mcp config vscode` link: tokens as password inputs kept in VS Code secret storage.
3. Docker Desktop: `setup --runtime docker` mounts the token files read-only into the container.
4. WSL: run the Linux wizard inside WSL for WSL-side clients.
5. Any other client: `setup --inline-tokens-windows` after reading the consent notice. Client files under the user profile are already ACL-restricted to the account by Windows defaults, which is why the trade-off is acceptable only with explicit consent.

**Follow-up (tracked, not done):** an opt-in `DARKTRACE_TOKEN_FILE_CHECK=windows-acl` mode that verifies the ACL through a reviewed, pinned helper, with a Windows CI runner before it can be enabled by default.

## Not covered

- Project-scope files (`.cursor/mcp.json`, `.mcp.json`, `.roo/mcp.json`, `.kiro/settings/mcp.json`, `.vscode/mcp.json`): the wizard writes user scope only, because project files run for everyone who trusts the repository and should be reviewed by hand.
- Claude plugin bundle and Codex marketplace: another track.
- Linux path of Claude Desktop: not documented by Anthropic; the wizard uses `$XDG_CONFIG_HOME/Claude` only when that directory exists.
