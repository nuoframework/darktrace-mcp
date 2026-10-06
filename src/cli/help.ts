/** Installer subcommands. Kept dependency-free so the stdio entrypoint can import it cheaply. */
export const CLI_COMMANDS = Object.freeze(['setup', 'config', 'remove', 'uninstall', 'test'] as const);

export function isCliCommand(args: readonly string[]): boolean {
  if (args.length === 0) return false;
  if ((CLI_COMMANDS as readonly string[]).includes(args[0])) return true;
  return args[0] === 'doctor' && args.length === 2 && args[1] === '--online';
}

export const CLI_HELP = `
Installer commands:
  setup [--dry-run] [--yes] [--client <name>]... [--url <https-origin>]
        [--profiles read|read-write|read-sensitive|all|<list>] [--acknowledge-sensitive-write]
        [--runtime node|docker] [--image <ref>] [--pull] [--tokens-from-stdin] [--inline-tokens-windows]
        [--date-format compact|spaced] [--offline]
      Interactive wizard: stores tokens in ~/.config/darktrace-mcp (0700/0600) and registers the server
      in detected AI clients. Tokens are read with hidden input or as two stdin lines, never as flags.
      Started through npx (npx -y @nuoframework/darktrace-mcp@<version> setup), it first copies the package
      to ~/.local/share/darktrace-mcp/<version>/ and registers that absolute path, never npx.
      Profiles that combine sensitive reads with writes (all, or a list with sensitive and write) show a
      risk notice and need an explicit yes; with --yes or piped input pass --acknowledge-sensitive-write.
      The entries then set DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE=true, without which the server refuses to start.
      Before writing anything, setup sends a signed GET /status (compact date format; on HTTP 400 once more with
      spaced) and records the accepted format as DARKTRACE_DATE_FORMAT in every client entry. If neither works it
      stops. --date-format skips the check; --offline and --dry-run skip it and use the saved format or compact.
      Docker runtime: checks that the daemon answers, defaults the image to ghcr.io/nuoframework/darktrace-mcp:<version>
      (or --image <name:tag | name@sha256:digest | sha256:ID>), offers to pull it when missing (--pull with --yes),
      then writes the local image ID (--pull=never) and records the ID and registry digest in setup.json.
  config <client> [--url <origin>] [--profiles <p>] [--acknowledge-sensitive-write] [--runtime node|docker] [--image <id>]
         [--date-format compact|spaced]
      Print a ready-to-paste snippet (no secrets). VS Code and Cursor also get one-click install links.
      Reuses the date format saved by setup. Docker runtime: reuses the image ID and digest saved by setup.
      Reuses an acknowledgement saved by setup; otherwise sensitive + write profiles need the flag.
  remove [--client <name>]... [--dry-run] [--purge]
      Remove the darktrace entry from client configs (backups kept); --purge also deletes stored tokens.
  uninstall [--dry-run] [--yes] [--keep-copies] [--docker]      (alias: remove --all)
      Show a plan, ask once, then remove the darktrace entry from every client (backups kept), delete the stored
      tokens, setup.json and ~/.config/darktrace-mcp, and delete the fixed copies in ~/.local/share/darktrace-mcp
      (unless --keep-copies). --docker also runs docker image rm on the image ID recorded by setup (only that one).
      Prints the npm uninstall -g command when the package is installed globally; never runs it.
  test | doctor --online
      Load the configuration and perform one signed GET /status to verify URL, TLS and tokens. On HTTP 400 with
      no date format chosen, retries once with the other format and tells you which DARKTRACE_DATE_FORMAT to set.
      With the docker runtime saved by setup, first runs the image's --check-config in a container with the client
      entry's mounts and user (no network); the signed GET /status then runs from this host.
  Clients: claude-desktop, claude-code, codex, cursor, vscode, windsurf, opencode, gemini.
`;
