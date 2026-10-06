/** Installer subcommands. Kept dependency-free so the stdio entrypoint can import it cheaply. */
export const CLI_COMMANDS = Object.freeze(['setup', 'config', 'remove', 'test'] as const);

export function isCliCommand(args: readonly string[]): boolean {
  if (args.length === 0) return false;
  if ((CLI_COMMANDS as readonly string[]).includes(args[0])) return true;
  return args[0] === 'doctor' && args.length === 2 && args[1] === '--online';
}

export const CLI_HELP = `
Installer commands:
  setup [--dry-run] [--yes] [--client <name>]... [--url <https-origin>] [--profiles read|read-write|all|<list>]
        [--runtime node|docker] [--image <sha256:id>] [--tokens-from-stdin] [--inline-tokens-windows]
      Interactive wizard: stores tokens in ~/.config/darktrace-mcp (0700/0600) and registers the server
      in detected AI clients. Tokens are read with hidden input or as two stdin lines, never as flags.
      Started through npx (npx -y @nuoframework/darktrace-mcp@<version> setup), it first copies the package
      to ~/.local/share/darktrace-mcp/<version>/ and registers that absolute path, never npx.
  config <client> [--url <origin>] [--profiles <p>] [--runtime node|docker] [--image <id>]
      Print a ready-to-paste snippet (no secrets). VS Code and Cursor also get one-click install links.
  remove [--client <name>]... [--dry-run] [--purge]
      Remove the darktrace entry from client configs (backups kept); --purge also deletes stored tokens.
  test | doctor --online
      Load the configuration and perform one signed GET /status to verify URL, TLS and tokens.
  Clients: claude-desktop, claude-code, codex, cursor, vscode, windsurf, opencode, gemini.
`;
