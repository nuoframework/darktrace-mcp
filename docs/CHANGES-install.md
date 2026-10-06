# Easy installation: commands, client formats and sources

Change notes for the documentation owner. Superseded in part by [CHANGES-dist.md](CHANGES-dist.md): the package is now published as `@nuoframework/darktrace-mcp`, `setup` bootstraps through `npx` and installs a fixed copy, and `install.sh` clones into `~/.local/share/darktrace-mcp/source` (existing clones one level up are still detected). This file describes the installer added in
`src/cli/`, the Claude Desktop extension bundle, the install scripts and the updated examples.
README/docs pages were intentionally not edited.

## Commands

All installer commands are dispatched from `dist/src/index.js` (the `darktrace-mcp` bin). The
stdio server path, `--check-config` and offline `doctor` are unchanged.

| Command | Purpose |
| --- | --- |
| `darktrace-mcp setup` | Interactive wizard (URL, runtime, tokens, profile preset, clients). |
| `darktrace-mcp config <client>` | Print a ready-to-paste snippet for one client (no secrets). VS Code and Cursor also get one-click links. |
| `darktrace-mcp remove [--client <name>]... [--dry-run] [--purge]` | Remove the `darktrace` entry from client configs (with backups). `--purge` also deletes the stored token files and `setup.json`. |
| `darktrace-mcp test` / `darktrace-mcp doctor --online` | Load the configuration and send one signed `GET /status` through the production client. |

Clients: `claude-desktop`, `claude-code`, `codex`, `cursor`, `vscode`, `windsurf`, `opencode`, `gemini`
(`--client all` selects every client).

### `setup` flags

| Flag | Meaning |
| --- | --- |
| `--dry-run` | Show what would change; write nothing. |
| `--yes`, `-y` | Non-interactive: no questions; reuse saved answers; install into every detected client unless `--client` is given. |
| `--client <name>` | Repeatable or comma-separated. Overrides detection. |
| `--url <https-origin>` | Appliance origin (validated with the server's own origin rules). |
| `--profiles <p>` | Preset `read` (default), `read-write`, `all`, or a comma list of `read`, `write`, `critical`, `sensitive`, `all`. |
| `--runtime node\|docker` | `node` = this checkout (default); `docker` = reviewed image. |
| `--image <id>` | Docker image ID (`sha256:<64 hex>`) or `name@sha256:<digest>`; mutable tags are refused. |
| `--tokens-from-stdin` | Read two lines from stdin: public token, then private token. |
| `--inline-tokens-windows` | Windows only: explicit consent to place token values in client configs. |

Credentials are never accepted as flags. Any option whose name contains `token`, `secret`,
`password` or `key` (other than the two booleans above) is rejected with exit code 2, and
option values are never echoed in errors.

Non-interactive example:

```sh
printf '%s\n%s\n' "$PUBLIC" "$PRIVATE" | darktrace-mcp setup --yes --url https://darktrace.example.internal --tokens-from-stdin --client claude-desktop,cursor
```

### Wizard flow

1. Appliance URL (must be an `https://` origin without credentials, path, query or fragment).
2. Runtime: node (this checkout) or docker (image ID).
3. Tokens: hidden input (readline with muted echo, history disabled) or `--tokens-from-stdin`.
   Existing token files are offered for reuse. Tokens must be 1-4096 printable ASCII characters.
4. Profile preset: `read-only (recommended)` → `read`; `read + write` → `read,write`;
   `everything (all)` → `all`.
5. Storage: `~/.config/darktrace-mcp/` (or `$XDG_CONFIG_HOME/darktrace-mcp/`), directory `0700`,
   `public-token` and `private-token` `0600`, written atomically (temp file + fsync + rename),
   symbolic links refused. Non-secret answers are kept in `setup.json` (`0600`):
   `{version, url, profiles, runtime, tokenMode, image?}`.
6. Client selection: numbered list with `[detected]` markers; default = all detected.
7. Results table (`written`, `unchanged`, `command`, `manual`, `dry-run`, `failed`), backup paths,
   and snippets for anything that needs manual action.

### Generated server entry

Node runtime (only these variables are emitted; the server rejects unknown `DARKTRACE_*`):

```json
{
  "command": "/absolute/path/to/node",
  "args": ["/absolute/path/to/darktrace-mcp/dist/src/index.js"],
  "env": {
    "DARKTRACE_URL": "https://darktrace.example.internal",
    "DARKTRACE_PUBLIC_TOKEN_FILE": "/home/me/.config/darktrace-mcp/public-token",
    "DARKTRACE_PRIVATE_TOKEN_FILE": "/home/me/.config/darktrace-mcp/private-token",
    "DARKTRACE_PROFILES": "read"
  }
}
```

`command` is `process.execPath` of the Node that ran setup; `args[0]` is the absolute
`dist/src/index.js` of the checkout. `DARKTRACE_SENSITIVE_READ` is no longer emitted:
sensitive access is selected through `DARKTRACE_PROFILES` (`sensitive` / `all`).

Docker runtime: the hardened launch from the README (`run --rm -i --init --pull=never
--log-driver=none --read-only --cap-drop=ALL --security-opt=no-new-privileges --pids-limit=64
--memory=256m --network=bridge`), read-only bind mounts of both token files to
`/run/secrets/{public,private}-token`, `-e` for URL/token-file/profiles, and the image ID last.
Instead of requiring the files to be owned by UID 1000, setup passes `--user <uid>:<gid>` of the
invoking user (root is refused), so the container user owns the `0600` files. On Docker Desktop
(macOS/Windows) bind-mount ownership translation may differ; this is listed as an open risk.

## Per-client behaviour

| Client | How setup installs | Config written | Format |
| --- | --- | --- | --- |
| Claude Desktop | JSON merge | macOS `~/Library/Application Support/Claude/claude_desktop_config.json`; Windows `%APPDATA%\Claude\claude_desktop_config.json`; Linux `$XDG_CONFIG_HOME/Claude/claude_desktop_config.json` | `mcpServers.darktrace = {command,args,env}` |
| Claude Code | `claude mcp remove --scope user darktrace` then `claude mcp add --scope user --env K=V... --transport stdio darktrace -- <command> <args>`; if `claude` is not on PATH the command is printed. `~/.claude.json` is never edited. | (managed by `claude`) | CLI |
| Codex | `codex mcp remove darktrace` then `codex mcp add darktrace --env K=V... -- <command> <args>`; without `codex` on PATH, the block is written to `$CODEX_HOME/config.toml` or `~/.codex/config.toml` | TOML | `[mcp_servers.darktrace]` + `[mcp_servers.darktrace.env]` |
| Cursor | JSON merge | `~/.cursor/mcp.json` | `mcpServers.darktrace = {command,args,env}` |
| VS Code | JSON merge of the user profile `mcp.json`; if the User directory does not exist but `code` is on PATH, `code --add-mcp '<json>'` | macOS `~/Library/Application Support/Code/User/mcp.json`; Windows `%APPDATA%\Code\User\mcp.json`; Linux `$XDG_CONFIG_HOME/Code/User/mcp.json` | `servers.darktrace = {type:"stdio",command,args,env}` |
| Windsurf | JSON merge | `~/.codeium/windsurf/mcp_config.json`; when only the Devin Desktop directory exists (`$XDG_CONFIG_HOME/devin/` or `%APPDATA%\devin\`) its `mcp_config.json` is used | `mcpServers.darktrace = {command,args,env}` |
| OpenCode | JSON merge | `$XDG_CONFIG_HOME/opencode/opencode.json` (or an existing `opencode.jsonc`) | `mcp.darktrace = {type:"local",command:[exe,...args],environment,enabled:true}` |
| Gemini CLI | JSON merge | `~/.gemini/settings.json` | `mcpServers.darktrace = {command,args,env}` |

Detection: a client counts as installed when its CLI is on PATH (`claude`, `codex`, `code`,
`cursor`, `opencode`, `gemini`, `windsurf`) or its configuration directory exists (Claude Code:
`~/.claude.json` or `~/.claude/`).

JSON merge rules (all JSON clients):

- Read the file; only the `darktrace` key under the client's root key changes. Every other
  server and top-level key is preserved; output is 2-space JSON.
- Existing file → copied to `<file>.bak-<ISO timestamp>` with its original mode before writing.
- Atomic write (temp file in the same directory, fsync, rename). The original permission bits
  are kept; new files are created `0600` (new parent directories `0700`).
- Not rewritten (a snippet is printed instead): files with comments (JSONC), invalid JSON, a
  non-object root or root key, and symbolic links (dotfile managers).
- Re-running with the same answers reports `unchanged` and writes nothing.

Codex TOML rules: our block is preceded by `# Managed by darktrace-mcp setup`; upsert removes any
existing `[mcp_servers.darktrace]` table and its sub-tables, then appends the new block, so a
second run is byte-identical. Dotted-key or inline-table definitions of `mcp_servers.darktrace`
and multi-line strings inside the block are refused (manual edit).

## `config <client>` and one-click links

`config` uses the saved setup (or placeholders plus `--url/--profiles/--runtime/--image`) and
prints the client snippet, never token values.

- VS Code: `vscode:mcp/install?<encodeURIComponent(JSON)>` (and `vscode-insiders:` with
  `--insiders`) with payload `{name:"darktrace",type:"stdio",command,args,env,inputs}`. Tokens use
  two `promptString` inputs with `password: true`, referenced as
  `DARKTRACE_PUBLIC_TOKEN=${input:darktrace-public-token}` and
  `DARKTRACE_PRIVATE_TOKEN=${input:darktrace-private-token}`; VS Code prompts once and stores the
  values in its secret storage. The equivalent `code --add-mcp '<json>'` line is printed too.
- Cursor: `cursor://anysphere.cursor-deeplink/mcp/install?name=darktrace&config=<base64>`, where
  the base64 is `JSON.stringify({command,args,env})` (URL-encoded so `+`/`/`/`=` survive). Cursor
  has no secret inputs, so the link uses the token-file paths.

## `test` / `doctor --online`

Environment: explicit `DARKTRACE_URL`/`DARKTRACE_BASE_URL`/`DARKTRACE_CONFIG_FILE` win; otherwise
`setup.json` supplies the URL, profiles and token-file paths. The configuration is loaded with
the normal `loadConfig`, then one `get_status` request goes through `createHttpClient` (pinned
HTTPS connector, signing, limits). Output is `OK <origin> answered signed GET /status (HTTP 200,
N ms[, version X])` or `FAIL <kind>: <hint>`; exit 0/1.

| Kind | Hint |
| --- | --- |
| configuration | Server's own `ConfigValidationError` message (never contains secrets) |
| `auth` | Wrong/revoked token pair or token from another appliance |
| `clock_skew_suspected` | Sync the clock (NTP); signatures are time-based |
| `forbidden` | Token lacks API permissions |
| `network` | URL, DNS, firewall/VPN, TLS name/CA (`NODE_EXTRA_CA_CERTS`); proxies unsupported |
| `timeout` | Reachability or `DARKTRACE_TIMEOUT_MS` |
| `not_found`, `invalid_response` | URL is not the appliance (e.g. a login portal) |
| `rate_limited`, `server`, `too_large`, `bad_request` | Specific retry/limit guidance |

The client folds TLS failures into `network` (no separate `tls` kind exists), so the hint covers
both.

## Claude Desktop extension (`.mcpb`)

- `manifest.json` (repo root), `manifest_version` `0.3`, `server.type` `node`,
  `entry_point` `dist/src/index.js`, `mcp_config` `{command:"node", args:["${__dirname}/dist/src/index.js"], env}`.
- `user_config`: `darktrace_url` (string, required), `public_token` and `private_token`
  (string, `sensitive: true`, required: stored by the host in the OS keychain),
  `profiles` (string, default `read`). They map to `DARKTRACE_URL`, `DARKTRACE_PUBLIC_TOKEN`,
  `DARKTRACE_PRIVATE_TOKEN`, `DARKTRACE_PROFILES`.
- `compatibility.runtimes.node` `>=22.0.0`; platforms darwin, win32, linux (token values arrive
  as environment variables, so no file-permission requirement on Windows).
- Build: `npm run pack:mcpb` runs `scripts/build-mcpb.mjs`: checks the manifest, runs the normal
  build, stages `dist/src` (no `.d.ts`), the production packages from the lockfile
  (`npm-shrinkwrap.json`, dev packages excluded), a trimmed `package.json`, `LICENSE` and
  `manifest.json`, and writes `release/darktrace-mcp-<version>.mcpb` with a built-in ZIP writer
  (`zlib.deflateRawSync` + `zlib.crc32`, fixed timestamps, unix modes). `release/` is ignored by
  git. `--skip-build` reuses an existing `dist/`.
- Verified: `npx -y @anthropic-ai/mcpb validate manifest.json` → "Manifest schema validation
  passes!"; `unzip -t` reports no errors; the extracted bundle runs `--check-config` with token
  environment variables.

## Install scripts

- `scripts/install.sh` (POSIX sh, shellcheck clean): requires Node ≥ 22 and npm; uses the
  checkout it lives in, otherwise clones `nuoframework/darktrace-mcp` with `gh repo clone` (or
  `git clone`) into `$DARKTRACE_MCP_HOME` (default `~/.local/share/darktrace-mcp`); an existing
  clone is updated with `git pull --ff-only`. Then `npm ci --ignore-scripts`, `npm run build`, and
  `exec node dist/src/index.js setup "$@"` with stdin re-attached to `/dev/tty` when the script
  itself was piped. One-liner for the private repository:

  ```sh
  sh -c "$(gh api repos/nuoframework/darktrace-mcp/contents/scripts/install.sh -H 'Accept: application/vnd.github.raw')"
  ```

- `scripts/install.ps1` (Windows PowerShell): same steps into `%LOCALAPPDATA%\darktrace-mcp`.
  Windows cannot enforce owner-only token files (the server rejects token files on `win32`), so
  setup with the node runtime asks for explicit consent (or `--inline-tokens-windows`) before
  writing token values into client configs, and prints a warning. Claude Code on Windows gets a
  printed command instead (values must not appear in a process command line). Recommended
  alternatives: the `.mcpb` extension, Docker, or WSL with `install.sh`.

## Examples

- Existing examples dropped `DARKTRACE_SENSITIVE_READ` (generated configs no longer emit it).
- New: `examples/cursor.mcp.json`, `examples/windsurf.mcp_config.json`,
  `examples/gemini.settings.json`, `examples/opencode.json`.
- `scripts/validate-examples.mjs` now accepts `DARKTRACE_SENSITIVE_READ` absent or `false`
  (still rejects `true`), and validates OpenCode's `mcp.darktrace` command-array shape.
  Result: 9 JSON + 1 TOML examples, 8 documents, pass.

## Sensitive + write acknowledgement (gate blocker B5)

The server refuses to start when sensitive reads and writes are both enabled (`all`, or a list with
`sensitive` and `write`) unless `DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE=true` is set. Before this
change `setup`, the `.mcpb` bundle and `server.json` offered `all` but never emitted the variable, so
those entries could not start. Option (a) of the gate review is now implemented:

- `src/cli/entry.ts`: presets are `read`, `read-write`, `read-sensitive` (new) and `all`, with labels
  that say what each adds. `SENSITIVE_WRITE_NOTICE` is the exact risk text (sensitive data +
  untrusted content + write channels = exfiltration risk). `needsSensitiveWriteAck(profiles)` mirrors
  the server rule. `buildServerEntry` refuses such profiles without `acknowledgeSensitiveWrite: true`
  and, with it, adds `DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE=true` to the node `env` or as a docker
  `-e` argument (image stays last). The variable is never emitted for profiles that do not need it.
- `setup`: after the profile choice it prints the notice. Interactive: `[y/N]` question, default no.
  Yes emits the acknowledgement and records `acknowledgeSensitiveWrite: true` in `setup.json`. No offers
  `1) read + write` or `2) read + sensitive` (default 1). Non-interactive (`--yes`, or piped tokens
  without a terminal): the new `--acknowledge-sensitive-write` flag is required, otherwise setup exits
  with a setup error before any file is written.
- `config <client>`: accepts `--acknowledge-sensitive-write`, or reuses the acknowledgement saved by
  `setup`; without either it prints the notice on stderr and exits 2. When emitted, the snippet starts
  with the notice as `#` comments. VS Code / Cursor one-click payloads carry the variable.
- `test` / `doctor --online`: passes the saved acknowledgement with the saved profiles.
- There is no installer option for `DARKTRACE_CRITICAL_APPROVAL`, so the installer never produces
  `critical=host` entries and never needs `DARKTRACE_ACKNOWLEDGE_HOST_APPROVAL`. Operators who set host
  approval by hand must add that acknowledgement themselves (documented in `--help`).
- `manifest.json`: new `user_config.acknowledge_sensitive_write` (boolean, default `false`, not
  required) mapped to `DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE` (MCPB substitutes booleans as
  `"true"`/`"false"`, which the server parses). `profiles` still defaults to `read`; its description
  states what each value adds, that the email action is not available, and that `all` needs the box.
  `scripts/build-mcpb.mjs` `checkManifest` now requires the mapping, the opt-in default and the
  `read` default. `npx -y @anthropic-ai/mcpb@2.1.2 validate manifest.json` passes.
- `server.json`: both packages list `DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE` (`format: boolean`,
  default `"false"`, risk description); the profile descriptions mention it. Validated against the
  `2025-12-11` schema with Ajv (the `mcp-publisher` binary was not installed locally).
- `--help` (`src/index.ts`): profiles described as implemented: email action not available; critical
  needs a `dryRun:true` preview, then `confirm:true` with its `previewId`, otherwise it is refused
  (`confirmation_required`); host critical approval needs `DARKTRACE_ACKNOWLEDGE_HOST_APPROVAL=true`;
  any sensitive + write set needs `DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE=true`. Installer help lists the
  new flag and preset.
- Examples are all read-only consultation configurations and stay so. `scripts/validate-examples.mjs`
  now also rejects any `DARKTRACE_ACKNOWLEDGE_*` variable in them (an acknowledgement must never be
  pre-set by a copied example).
- Tests: `test/cli/sensitive-write.test.ts` (11 tests; functional total 213 → 224): the rule and notice text; `--yes` without the
  flag (also for `read,sensitive,write`) refused with nothing written; `--yes` with the flag emitting
  the variable in a JSON client and in the Claude Code CLI argv, saved state, `test` env and `config
  vscode` reuse; the compiled server's `--check-config` starting with the emitted env and refusing it
  without the variable; docker `-e`; interactive yes; interactive no falling back to `read,write`,
  `read,sensitive` and the default; empty answer = no; `config` refusing without, emitting with the flag
  (node and docker), and not emitting for `read,write`; help text. `test/cli/links-mcpb.test.ts` checks
  the manifest field, the checker and both `server.json` packages.

This changes `src/` (`src/cli/*`, `src/index.ts`), so `sourceTreeSha256`, the runtime file hashes
and the functional test count pinned in `ci.yml` and `verify-release.mjs` must be recomputed.

## Sources verified (2026-10-06)

| Topic | Source |
| --- | --- |
| MCPB manifest (0.3 default, 0.4 latest; `user_config` `sensitive`; `${__dirname}`, `${user_config.x}`) | Context7 `/modelcontextprotocol/mcpb` (MANIFEST.md, constants.md, CLI.md); `npx @anthropic-ai/mcpb validate` |
| Claude Code `claude mcp add` (`--scope user`, `--env`, `--transport`, `--` separator, name-after-`--env` pitfall), `claude mcp remove` | Context7 `/websites/code_claude` (code.claude.com/docs/en/mcp) |
| Claude Desktop config paths | modelcontextprotocol.io/docs/develop/connect-local-servers; Linux desktop app: code.claude.com/docs/en/desktop-linux |
| Codex `codex mcp add <name> --env K=V -- <cmd>`, `codex mcp remove`, `[mcp_servers.<name>.env]` | Context7 `/openai/codex` (codex-rs/cli/src/mcp_cmd.rs, tests/mcp_add_remove.rs, config tests) |
| OpenCode `mcp` local format (`type:"local"`, command array, `environment`, `enabled`), `opencode.json[c]` | Context7 `/anomalyco/opencode` (docs/mcp-servers.mdx) |
| Gemini CLI `~/.gemini/settings.json` `mcpServers` (`command`, `args`, `env`) | Context7 `/google-gemini/gemini-cli` (docs/tools/mcp-server.md) |
| VS Code user `mcp.json` `servers` + `inputs` (`promptString`, `password`), `code --add-mcp`, `vscode:mcp/install?` | Context7 `/microsoft/vscode-docs`; payload parser `parseMcpInstallUriPayload` (accepts `name`, `inputs`, local config) in `microsoft/vscode` `src/vs/workbench/contrib/mcp/browser/mcpWorkbenchService.ts` |
| Cursor deeplink `cursor://anysphere.cursor-deeplink/mcp/install?name=&config=<base64>` | cursor.com/docs/mcp/install-links (its sample `config` decodes to the inner `{command,args}` object) |
| Windsurf `mcp_config.json` format; docs now redirect to Devin Desktop (`~/.config/devin/mcp_config.json`, `%APPDATA%\devin\`) | docs.windsurf.com/windsurf/cascade/mcp → docs.devin.ai/desktop/cascade/mcp |
