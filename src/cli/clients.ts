import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { atomicWrite, backupFile, fileModeOr, findOnPath, isSymlink, lstatOrUndefined, readTextIfExists } from './fsutil.js';
import { planJsonEntry } from './jsonConfig.js';
import { removeCodexServer, renderCodexBlock, upsertCodexServer } from './toml.js';
import { removeYamlBlock, renderContinueItem, renderGooseEntry, upsertYamlBlock, type YamlBlockOptions } from './yamlBlock.js';
import { SERVER_NAME, type ServerEntry } from './entry.js';
import type { StatusProber } from './online.js';

/**
 * Every client the wizard knows. Config locations and shapes come from each vendor's documentation (see
 * docs/install-matrix.md for the URLs); two are paste-only because the vendor documents no file (JetBrains AI
 * Assistant) or only a UI (Warp keeps a file, so it is written).
 */
export const CLIENT_IDS = [
  'claude-desktop', 'claude-code', 'codex', 'cursor', 'vscode', 'windsurf', 'opencode', 'gemini',
  'zed', 'cline', 'roo', 'continue', 'kiro', 'amp', 'copilot-cli', 'warp', 'goose', 'lmstudio', 'antigravity', 'junie', 'jetbrains',
] as const;
export type ClientId = typeof CLIENT_IDS[number];

export interface RunResult { readonly status: number | null; readonly stdout: string; readonly stderr: string }
export interface CliContext {
  readonly home: string;
  readonly platform: NodeJS.Platform;
  readonly env: NodeJS.ProcessEnv;
  readonly now: () => Date;
  /** Runs an external client CLI with an argument vector (never a shell). */
  readonly run: (command: string, args: readonly string[]) => RunResult;
  /** Runs docker (argument vector, never a shell); `stream` shows docker's own progress output. Defaults to `run`. */
  readonly runDocker?: (command: string, args: readonly string[], options?: { readonly stream?: boolean }) => RunResult;
  /** Signed GET /status used by `test` and the `setup` date-format probe. Defaults to the production client. */
  readonly probeStatus?: StatusProber;
}

export type ResultStatus = 'written' | 'unchanged' | 'command' | 'manual' | 'dry-run' | 'failed' | 'absent';
export interface ClientResult {
  readonly client: ClientId;
  readonly status: ResultStatus;
  readonly detail: string;
  readonly file?: string;
  readonly backup?: string;
  /** Ready-to-paste configuration when the installer could not (or did not) write it. */
  readonly snippet?: string;
}
export interface ApplyOptions {
  readonly dryRun: boolean;
  readonly inlineTokens: boolean;
  /** Entry shown to the user (placeholders instead of inline token values). Defaults to the written entry. */
  readonly displayEntry?: ServerEntry;
}

const LABELS: Readonly<Record<ClientId, string>> = {
  'claude-desktop': 'Claude Desktop', 'claude-code': 'Claude Code', codex: 'Codex', cursor: 'Cursor',
  vscode: 'VS Code', windsurf: 'Windsurf', opencode: 'OpenCode', gemini: 'Gemini CLI',
  zed: 'Zed', cline: 'Cline', roo: 'Roo Code', continue: 'Continue', kiro: 'Kiro', amp: 'Amp', 'copilot-cli': 'Copilot CLI',
  warp: 'Warp', goose: 'Goose', lmstudio: 'LM Studio', antigravity: 'Antigravity', junie: 'JetBrains Junie', jetbrains: 'JetBrains AI Assistant',
};
export const clientLabel = (id: ClientId): string => LABELS[id];
export function isClientId(value: string): value is ClientId { return (CLIENT_IDS as readonly string[]).includes(value); }

const xdgConfig = (ctx: CliContext): string =>
  ctx.env.XDG_CONFIG_HOME && path.isAbsolute(ctx.env.XDG_CONFIG_HOME) ? ctx.env.XDG_CONFIG_HOME : path.join(ctx.home, '.config');
const appData = (ctx: CliContext): string =>
  ctx.env.APPDATA && path.isAbsolute(ctx.env.APPDATA) ? ctx.env.APPDATA : path.join(ctx.home, 'AppData', 'Roaming');
const dirExists = (dir: string): boolean => lstatOrUndefined(dir)?.isDirectory() === true;

function platformAppDir(ctx: CliContext, name: string): string {
  if (ctx.platform === 'darwin') return path.join(ctx.home, 'Library', 'Application Support', name);
  if (ctx.platform === 'win32') return path.join(appData(ctx), name);
  return path.join(xdgConfig(ctx), name);
}

interface JsonClientDef {
  readonly rootKey: string;
  readonly file: (ctx: CliContext) => string;
  readonly shape: (entry: ServerEntry) => Record<string, unknown>;
}
const withEnv = (entry: ServerEntry, key = 'env'): Record<string, unknown> =>
  Object.keys(entry.env).length > 0 ? { [key]: { ...entry.env } } : {};
const standard = (entry: ServerEntry): Record<string, unknown> => ({ command: entry.command, args: [...entry.args], ...withEnv(entry) });

function windsurfFile(ctx: CliContext): string {
  const legacy = path.join(ctx.home, '.codeium', 'windsurf');
  // Windsurf documentation now lives under Devin Desktop, which reads <config>/devin/mcp_config.json.
  const devin = ctx.platform === 'win32' ? path.join(appData(ctx), 'devin') : path.join(xdgConfig(ctx), 'devin');
  if (!dirExists(legacy) && dirExists(devin)) return path.join(devin, 'mcp_config.json');
  return path.join(legacy, 'mcp_config.json');
}

function opencodeFile(ctx: CliContext): string {
  const dir = path.join(xdgConfig(ctx), 'opencode');
  const json = path.join(dir, 'opencode.json');
  const jsonc = path.join(dir, 'opencode.jsonc');
  if (!existsSync(json) && existsSync(jsonc)) return jsonc;
  return json;
}

/** JSON or JSONC variant: the `.jsonc` twin is used only when it exists and the `.json` file does not. */
function jsonOrJsonc(dir: string, base: string): string {
  const json = path.join(dir, `${base}.json`);
  const jsonc = path.join(dir, `${base}.jsonc`);
  if (!existsSync(json) && existsSync(jsonc)) return jsonc;
  return json;
}
/** VS Code extension storage: `<Code user dir>/globalStorage/<publisher.extension>/settings/<file>`. */
const vscodeGlobalStorage = (ctx: CliContext, extension: string, file: string): string =>
  path.join(platformAppDir(ctx, 'Code'), 'User', 'globalStorage', extension, 'settings', file);
const copilotHome = (ctx: CliContext): string =>
  ctx.env.COPILOT_HOME && path.isAbsolute(ctx.env.COPILOT_HOME) ? ctx.env.COPILOT_HOME : path.join(ctx.home, '.copilot');

const JSON_CLIENTS: Readonly<Partial<Record<ClientId, JsonClientDef>>> = {
  'claude-desktop': { rootKey: 'mcpServers', file: (ctx) => path.join(platformAppDir(ctx, 'Claude'), 'claude_desktop_config.json'), shape: standard },
  cursor: { rootKey: 'mcpServers', file: (ctx) => path.join(ctx.home, '.cursor', 'mcp.json'), shape: standard },
  vscode: {
    rootKey: 'servers', file: (ctx) => path.join(platformAppDir(ctx, 'Code'), 'User', 'mcp.json'),
    shape: (entry) => ({ type: 'stdio', ...standard(entry) }),
  },
  windsurf: { rootKey: 'mcpServers', file: windsurfFile, shape: standard },
  opencode: {
    rootKey: 'mcp', file: opencodeFile,
    shape: (entry) => ({ type: 'local', command: [entry.command, ...entry.args], ...withEnv(entry, 'environment'), enabled: true }),
  },
  gemini: { rootKey: 'mcpServers', file: (ctx) => path.join(ctx.home, '.gemini', 'settings.json'), shape: standard },
  // zed.dev/docs/ai/mcp: `context_servers` in settings.json (Linux path documented; macOS uses the same XDG location).
  zed: { rootKey: 'context_servers', file: (ctx) => path.join(xdgConfig(ctx), 'zed', 'settings.json'), shape: standard },
  // docs.cline.bot shape; the extension keeps the file in VS Code's globalStorage (the Cline CLI uses ~/.cline/data/settings/).
  cline: {
    rootKey: 'mcpServers', file: (ctx) => vscodeGlobalStorage(ctx, 'saoudrizwan.claude-dev', 'cline_mcp_settings.json'),
    shape: (entry) => ({ ...standard(entry), disabled: false, autoApprove: [] }),
  },
  // docs.roocode.com shape (`alwaysAllow`); global file lives in Roo's globalStorage.
  roo: {
    rootKey: 'mcpServers', file: (ctx) => vscodeGlobalStorage(ctx, 'rooveterinaryinc.roo-cline', 'mcp_settings.json'),
    shape: (entry) => ({ ...standard(entry), alwaysAllow: [], disabled: false }),
  },
  // kiro.dev/docs/mcp/configuration: ~/.kiro/settings/mcp.json.
  kiro: { rootKey: 'mcpServers', file: (ctx) => path.join(ctx.home, '.kiro', 'settings', 'mcp.json'), shape: (entry) => ({ ...standard(entry), disabled: false, autoApprove: [] }) },
  // ampcode.com/docs/customize/mcp: `amp.mcpServers` in ~/.config/amp/settings.json (same path on Windows, under the profile).
  amp: { rootKey: 'amp.mcpServers', file: (ctx) => jsonOrJsonc(path.join(ctx.home, '.config', 'amp'), 'settings'), shape: standard },
  // docs.github.com Copilot CLI: ~/.copilot/mcp-config.json (COPILOT_HOME), `type: local` plus `tools`.
  'copilot-cli': { rootKey: 'mcpServers', file: (ctx) => path.join(copilotHome(ctx), 'mcp-config.json'), shape: (entry) => ({ type: 'local', ...standard(entry), tools: ['*'] }) },
  // docs.warp.dev: global file ~/.warp/.mcp.json (also editable from Settings > Agents > MCP servers).
  warp: { rootKey: 'mcpServers', file: (ctx) => path.join(ctx.home, '.warp', '.mcp.json'), shape: standard },
  // lmstudio.ai/docs/app/mcp: ~/.lmstudio/mcp.json in Cursor notation.
  lmstudio: { rootKey: 'mcpServers', file: (ctx) => path.join(ctx.home, '.lmstudio', 'mcp.json'), shape: standard },
  // antigravity.google/docs/mcp: ~/.gemini/config/mcp_config.json.
  antigravity: { rootKey: 'mcpServers', file: (ctx) => path.join(ctx.home, '.gemini', 'config', 'mcp_config.json'), shape: standard },
  // junie.jetbrains.com: ~/.junie/mcp/mcp.json (shared by the Junie plugin and CLI).
  junie: { rootKey: 'mcpServers', file: (ctx) => path.join(ctx.home, '.junie', 'mcp', 'mcp.json'), shape: standard },
};

interface YamlClientDef {
  readonly file: (ctx: CliContext) => string;
  readonly render: (entry: ServerEntry) => string;
  readonly options: YamlBlockOptions;
}
const YAML_CLIENTS: Readonly<Partial<Record<ClientId, YamlClientDef>>> = {
  // docs.continue.dev/reference: top-level `mcpServers` list in ~/.continue/config.yaml (Windows: %USERPROFILE%\.continue).
  continue: {
    file: (ctx) => path.join(ctx.home, '.continue', 'config.yaml'),
    render: (entry) => renderContinueItem(SERVER_NAME, entry),
    options: { key: 'mcpServers', kind: 'list', conflict: /^\s*-?\s*name:\s*["']?darktrace["']?\s*$/ },
  },
  // goose-docs.ai/docs/guides/config-files: `extensions` map in config.yaml (macOS/Linux ~/.config/goose, Windows %APPDATA%\Block\goose\config).
  goose: {
    file: (ctx) => (ctx.platform === 'win32' ? path.join(appData(ctx), 'Block', 'goose', 'config', 'config.yaml') : path.join(xdgConfig(ctx), 'goose', 'config.yaml')),
    render: (entry) => renderGooseEntry(SERVER_NAME, entry),
    options: { key: 'extensions', kind: 'map', conflict: /^\s+darktrace:(?:\s|$)/ },
  },
};

/** Clients with no documented configuration file: the wizard prints the JSON to paste into their settings UI. */
const PASTE_ONLY: Readonly<Partial<Record<ClientId, { readonly where: string; readonly detect: (ctx: CliContext) => boolean }>>> = {
  // jetbrains.com/help/ai-assistant/mcp.html: Settings | Tools | AI Assistant | Model Context Protocol (MCP) > Add, paste JSON. No file path is documented.
  jetbrains: { where: 'Settings | Tools | AI Assistant | Model Context Protocol (MCP) > Add (STDIO), paste the JSON below, Apply', detect: (ctx) => dirExists(platformAppDir(ctx, 'JetBrains')) },
};

const codexFile = (ctx: CliContext): string =>
  path.join(ctx.env.CODEX_HOME && path.isAbsolute(ctx.env.CODEX_HOME) ? ctx.env.CODEX_HOME : path.join(ctx.home, '.codex'), 'config.toml');

const CLI_NAMES: Readonly<Partial<Record<ClientId, string>>> = {
  'claude-code': 'claude', codex: 'codex', vscode: 'code', cursor: 'cursor', opencode: 'opencode', gemini: 'gemini', windsurf: 'windsurf',
  zed: 'zed', amp: 'amp', 'copilot-cli': 'copilot', goose: 'goose', kiro: 'kiro-cli', lmstudio: 'lms', antigravity: 'agy',
};

/** Config file a client reads, or undefined when the client is managed through its CLI or settings UI only. */
export function clientConfigPath(id: ClientId, ctx: CliContext): string | undefined {
  if (id === 'codex') return codexFile(ctx);
  return JSON_CLIENTS[id]?.file(ctx) ?? YAML_CLIENTS[id]?.file(ctx);
}

/** How the wizard installs into a client: by editing its file, through its CLI, or by printing JSON to paste. */
export function clientMethod(id: ClientId): 'file' | 'cli' | 'paste' {
  if (id === 'claude-code') return 'cli';
  return PASTE_ONLY[id] !== undefined ? 'paste' : 'file';
}

export function detectClients(ctx: CliContext): ClientId[] {
  return CLIENT_IDS.filter((id) => {
    const cli = CLI_NAMES[id];
    if (cli !== undefined && findOnPath(cli, ctx.env, ctx.platform) !== undefined) return true;
    if (id === 'claude-code') return existsSync(path.join(ctx.home, '.claude.json')) || dirExists(path.join(ctx.home, '.claude'));
    const paste = PASTE_ONLY[id];
    if (paste !== undefined) return paste.detect(ctx);
    const file = clientConfigPath(id, ctx);
    return file !== undefined && dirExists(path.dirname(file));
  });
}

export function shellQuote(value: string): string {
  return /^[A-Za-z0-9_/.:=,@%+-]+$/.test(value) ? value : `'${value.replace(/'/g, `'\\''`)}'`;
}
const commandLine = (argv: readonly string[]): string => argv.map(shellQuote).join(' ');

function claudeAddArgs(entry: ServerEntry): string[] {
  const envFlags = Object.entries(entry.env).flatMap(([k, v]) => ['--env', `${k}=${v}`]);
  // --transport sits between --env and the name so the CLI never parses the name as another KEY=value.
  return ['mcp', 'add', '--scope', 'user', ...envFlags, '--transport', 'stdio', SERVER_NAME, '--', entry.command, ...entry.args];
}
function codexAddArgs(entry: ServerEntry): string[] {
  const envFlags = Object.entries(entry.env).flatMap(([k, v]) => ['--env', `${k}=${v}`]);
  return ['mcp', 'add', SERVER_NAME, ...envFlags, '--', entry.command, ...entry.args];
}

/** Human-readable, ready-to-paste configuration for one client. Contains token-file paths, never token values. */
export function clientSnippet(id: ClientId, entry: ServerEntry, ctx: CliContext): string {
  if (id === 'claude-code') {
    return `# Run once (user scope, available in every project):\n${commandLine(['claude', ...claudeAddArgs(entry)])}\n`;
  }
  if (id === 'codex') {
    return `# Either run:\n${commandLine(['codex', ...codexAddArgs(entry)])}\n# or add to ${codexFile(ctx)}:\n${renderCodexBlock(SERVER_NAME, entry)}`;
  }
  const yaml = YAML_CLIENTS[id];
  if (yaml !== undefined) return `# Merge into ${yaml.file(ctx)} under "${yaml.options.key}" (keep your other servers):\n${yaml.options.key}:\n${yaml.render(entry).split('\n').filter(Boolean).map((l) => '  ' + l).join('\n')}\n`;
  const paste = PASTE_ONLY[id];
  if (paste !== undefined) return `# ${clientLabel(id)}: ${paste.where}\n${JSON.stringify({ mcpServers: { [SERVER_NAME]: standard(entry) } }, null, 2)}\n`;
  const def = JSON_CLIENTS[id];
  if (def === undefined) throw new Error('unknown client');
  return `# Merge into ${def.file(ctx)} (keep your other servers):\n${JSON.stringify({ [def.rootKey]: { [SERVER_NAME]: def.shape(entry) } }, null, 2)}\n`;
}

function applyJsonFile(id: ClientId, def: JsonClientDef, value: Record<string, unknown> | undefined, ctx: CliContext, opts: ApplyOptions, snippet: string): ClientResult {
  const file = def.file(ctx);
  if (isSymlink(file)) return { client: id, status: 'manual', file, detail: `${file} is a symbolic link; not modified`, snippet };
  let text: string | undefined;
  try { text = readTextIfExists(file); } catch (error) {
    return { client: id, status: 'manual', file, detail: error instanceof Error ? error.message : 'unreadable config', snippet };
  }
  if (value === undefined && text === undefined) return { client: id, status: 'absent', file, detail: 'no configuration file' };
  const plan = planJsonEntry(text, def.rootKey, SERVER_NAME, value);
  if (!plan.ok && value === undefined && !(text ?? '').includes(`"${SERVER_NAME}"`)) return { client: id, status: 'absent', file, detail: 'no darktrace entry' };
  if (!plan.ok) return { client: id, status: 'manual', file, detail: value === undefined ? `${plan.reason}; delete the "${SERVER_NAME}" entry manually` : plan.reason, ...(value === undefined ? {} : { snippet }) };
  if (!plan.changed) return { client: id, status: value === undefined ? 'absent' : 'unchanged', file, detail: value === undefined ? 'no darktrace entry' : 'already up to date' };
  if (opts.dryRun) {
    return { client: id, status: 'dry-run', file, detail: `would ${value === undefined ? 'remove the darktrace entry from' : text === undefined ? 'create' : 'update'} ${file}`,
      ...(value === undefined ? {} : { snippet }) };
  }
  mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const mode = fileModeOr(file, 0o600);
  const backup = text === undefined ? undefined : backupFile(file, ctx.now());
  atomicWrite(file, plan.text, mode);
  return { client: id, status: 'written', file, ...(backup ? { backup } : {}), detail: value === undefined ? `removed darktrace from ${file}` : `${text === undefined ? 'created' : 'updated'} ${file}` };
}

function runCli(id: ClientId, binary: string, args: readonly string[], ctx: CliContext, okDetail: string): ClientResult {
  const result = ctx.run(binary, args);
  if (result.status === 0) return { client: id, status: 'command', detail: okDetail };
  return { client: id, status: 'failed', detail: `${path.basename(binary)} exited with status ${String(result.status)}`, snippet: commandLine([path.basename(binary), ...args]) };
}

export function installClient(id: ClientId, entry: ServerEntry, ctx: CliContext, opts: ApplyOptions): ClientResult {
  const snippet = clientSnippet(id, opts.displayEntry ?? entry, ctx);
  if (id === 'claude-code') {
    const claude = findOnPath('claude', ctx.env, ctx.platform);
    // Claude Code keeps user servers in ~/.claude.json, which the installer must never hand-edit.
    if (claude === undefined) return { client: id, status: 'manual', detail: '`claude` is not on PATH; run the command below', snippet };
    if (opts.inlineTokens) return { client: id, status: 'manual', detail: 'token values must not be passed on a command line; add the server manually', snippet };
    if (opts.dryRun) return { client: id, status: 'dry-run', detail: 'would run: ' + commandLine(['claude', ...claudeAddArgs(entry)]) };
    ctx.run(claude, ['mcp', 'remove', '--scope', 'user', SERVER_NAME]);
    return runCli(id, claude, claudeAddArgs(entry), ctx, 'registered with `claude mcp add --scope user`');
  }
  if (id === 'codex') {
    const codex = findOnPath('codex', ctx.env, ctx.platform);
    if (codex !== undefined && !opts.inlineTokens) {
      if (opts.dryRun) return { client: id, status: 'dry-run', detail: 'would run: ' + commandLine(['codex', ...codexAddArgs(entry)]) };
      ctx.run(codex, ['mcp', 'remove', SERVER_NAME]);
      return runCli(id, codex, codexAddArgs(entry), ctx, 'registered with `codex mcp add`');
    }
    return applyToml(id, entry, ctx, opts, snippet);
  }
  const paste = PASTE_ONLY[id];
  if (paste !== undefined) return { client: id, status: 'manual', detail: `no configuration file: paste the snippet below in ${paste.where}`, snippet };
  const yaml = YAML_CLIENTS[id];
  if (yaml !== undefined) return applyYamlFile(id, yaml, entry, ctx, opts, snippet);
  const def = JSON_CLIENTS[id];
  if (def === undefined) throw new Error('unknown client');
  if (id === 'vscode' && !dirExists(path.dirname(def.file(ctx))) && !opts.inlineTokens) {
    const code = findOnPath('code', ctx.env, ctx.platform);
    if (code !== undefined) {
      const payload = JSON.stringify({ name: SERVER_NAME, ...def.shape(entry) });
      if (opts.dryRun) return { client: id, status: 'dry-run', detail: 'would run: ' + commandLine(['code', '--add-mcp', payload]) };
      return runCli(id, code, ['--add-mcp', payload], ctx, 'registered with `code --add-mcp`');
    }
  }
  return applyJsonFile(id, def, def.shape(entry), ctx, opts, snippet);
}

function applyToml(id: ClientId, entry: ServerEntry | undefined, ctx: CliContext, opts: ApplyOptions, snippet?: string): ClientResult {
  const file = codexFile(ctx);
  if (isSymlink(file)) return { client: id, status: 'manual', file, detail: `${file} is a symbolic link; not modified`, ...(snippet ? { snippet } : {}) };
  const text = readTextIfExists(file);
  if (entry === undefined && text === undefined) return { client: id, status: 'absent', file, detail: 'no configuration file' };
  const plan = entry === undefined ? removeCodexServer(text ?? '', SERVER_NAME) : upsertCodexServer(text, SERVER_NAME, renderCodexBlock(SERVER_NAME, entry));
  if (!plan.ok) return { client: id, status: 'manual', file, detail: plan.reason, ...(snippet ? { snippet } : {}) };
  if (!plan.changed) return { client: id, status: entry === undefined ? 'absent' : 'unchanged', file, detail: entry === undefined ? 'no darktrace entry' : 'already up to date' };
  if (opts.dryRun) return { client: id, status: 'dry-run', file, detail: `would ${entry === undefined ? 'remove the darktrace block from' : 'write the darktrace block to'} ${file}`, ...(snippet && entry ? { snippet } : {}) };
  mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const mode = fileModeOr(file, 0o600);
  const backup = text === undefined ? undefined : backupFile(file, ctx.now());
  atomicWrite(file, plan.text, mode);
  return { client: id, status: 'written', file, ...(backup ? { backup } : {}), detail: `${entry === undefined ? 'removed darktrace from' : 'updated'} ${file}` };
}

function applyYamlFile(id: ClientId, def: YamlClientDef, entry: ServerEntry | undefined, ctx: CliContext, opts: ApplyOptions, snippet?: string): ClientResult {
  const file = def.file(ctx);
  if (isSymlink(file)) return { client: id, status: 'manual', file, detail: `${file} is a symbolic link; not modified`, ...(snippet ? { snippet } : {}) };
  let text: string | undefined;
  try { text = readTextIfExists(file); } catch (error) {
    return { client: id, status: 'manual', file, detail: error instanceof Error ? error.message : 'unreadable config', ...(snippet ? { snippet } : {}) };
  }
  if (entry === undefined && text === undefined) return { client: id, status: 'absent', file, detail: 'no configuration file' };
  const plan = entry === undefined ? removeYamlBlock(text ?? '', def.options) : upsertYamlBlock(text, def.render(entry), def.options);
  if (!plan.ok) return { client: id, status: 'manual', file, detail: plan.reason, ...(snippet && entry ? { snippet } : {}) };
  if (!plan.changed) return { client: id, status: entry === undefined ? 'absent' : 'unchanged', file, detail: entry === undefined ? 'no darktrace entry' : 'already up to date' };
  if (opts.dryRun) return { client: id, status: 'dry-run', file, detail: `would ${entry === undefined ? 'remove the darktrace block from' : text === undefined ? 'create' : 'update'} ${file}`, ...(snippet && entry ? { snippet } : {}) };
  mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const mode = fileModeOr(file, 0o600);
  const backup = text === undefined ? undefined : backupFile(file, ctx.now());
  atomicWrite(file, plan.text, mode);
  return { client: id, status: 'written', file, ...(backup ? { backup } : {}), detail: entry === undefined ? `removed darktrace from ${file}` : `${text === undefined ? 'created' : 'updated'} ${file}` };
}

export function removeClient(id: ClientId, ctx: CliContext, opts: Pick<ApplyOptions, 'dryRun'>): ClientResult {
  if (id === 'claude-code') {
    const args = ['mcp', 'remove', '--scope', 'user', SERVER_NAME];
    const claude = findOnPath('claude', ctx.env, ctx.platform);
    if (claude === undefined) {
      const used = existsSync(path.join(ctx.home, '.claude.json'));
      return used ? { client: id, status: 'manual', detail: '`claude` is not on PATH; run the command below', snippet: commandLine(['claude', ...args]) }
        : { client: id, status: 'absent', detail: 'Claude Code not found' };
    }
    if (opts.dryRun) return { client: id, status: 'dry-run', detail: 'would run: ' + commandLine(['claude', ...args]) };
    const result = ctx.run(claude, args);
    return result.status === 0 ? { client: id, status: 'command', detail: 'removed with `claude mcp remove --scope user`' } : { client: id, status: 'absent', detail: 'claude reported no darktrace server in user scope' };
  }
  if (id === 'codex') {
    const codex = findOnPath('codex', ctx.env, ctx.platform);
    if (codex !== undefined) {
      if (opts.dryRun) return { client: id, status: 'dry-run', detail: 'would run: codex mcp remove ' + SERVER_NAME };
      const result = ctx.run(codex, ['mcp', 'remove', SERVER_NAME]);
      if (result.status === 0) return { client: id, status: 'command', detail: 'removed with `codex mcp remove`' };
    }
    return applyToml(id, undefined, ctx, { dryRun: opts.dryRun, inlineTokens: false });
  }
  if (PASTE_ONLY[id] !== undefined) return { client: id, status: 'absent', detail: `${clientLabel(id)} keeps servers in its settings UI; remove "${SERVER_NAME}" there if you added it` };
  const yaml = YAML_CLIENTS[id];
  if (yaml !== undefined) return applyYamlFile(id, yaml, undefined, ctx, { dryRun: opts.dryRun, inlineTokens: false });
  const def = JSON_CLIENTS[id];
  if (def === undefined) throw new Error('unknown client');
  return applyJsonFile(id, def, undefined, ctx, { dryRun: opts.dryRun, inlineTokens: false }, '');
}
