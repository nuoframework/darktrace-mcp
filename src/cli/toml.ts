/** Minimal, line-based management of one `[mcp_servers.<name>]` block in Codex config.toml. */
export const TOML_MARKER = '# Managed by darktrace-mcp setup';

export function tomlString(value: string): string {
  return '"' + value.replace(/[\\"\u0000-\u001f\u007f]/g, (c) => {
    if (c === '\\') return '\\\\';
    if (c === '"') return '\\"';
    if (c === '\n') return '\\n';
    if (c === '\t') return '\\t';
    if (c === '\r') return '\\r';
    return '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0');
  }) + '"';
}

const BARE_KEY = /^[A-Za-z0-9_-]+$/;
const key = (k: string): string => BARE_KEY.test(k) ? k : tomlString(k);

export function renderCodexBlock(name: string, server: { command: string; args: readonly string[]; env: Readonly<Record<string, string>> }): string {
  const lines = [TOML_MARKER, `[mcp_servers.${key(name)}]`, `command = ${tomlString(server.command)}`,
    `args = [${server.args.map(tomlString).join(', ')}]`];
  const envKeys = Object.keys(server.env);
  if (envKeys.length > 0) {
    lines.push('', `[mcp_servers.${key(name)}.env]`);
    for (const k of envKeys) lines.push(`${key(k)} = ${tomlString(server.env[k])}`);
  }
  return lines.join('\n') + '\n';
}

function headerPath(line: string): string[] | undefined {
  const m = /^\s*\[\[?\s*([^\[\]]+?)\s*\]\]?\s*(?:#.*)?$/.exec(line);
  if (!m) return undefined;
  return m[1].split('.').map((part) => part.trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1'));
}

export type TomlPlan = { readonly ok: true; readonly changed: boolean; readonly text: string } | { readonly ok: false; readonly reason: string };

/** Remove every table for `mcp_servers.<name>` (and its sub-tables) plus our marker comment. */
export function removeCodexServer(text: string, name: string): TomlPlan {
  const lines = text.split('\n');
  const out: string[] = [];
  let removing = false;
  let changed = false;
  let currentTable: string[] = [];
  for (const line of lines) {
    const header = headerPath(line);
    if (header !== undefined) {
      currentTable = header;
      removing = header[0] === 'mcp_servers' && header[1] === name;
      if (removing) {
        changed = true;
        while (out.length > 0 && (out.at(-1)?.trim() === TOML_MARKER)) out.pop();
        continue;
      }
    } else if (!removing) {
      // Dotted keys or inline tables defining the server elsewhere cannot be edited safely.
      const inMcp = currentTable.length === 1 && currentTable[0] === 'mcp_servers';
      const atRoot = currentTable.length === 0;
      const dotted = new RegExp(`^\\s*${atRoot ? 'mcp_servers\\s*\\.\\s*' : ''}(?:"${name}"|'${name}'|${name})\\s*[.=]`);
      if ((inMcp || atRoot) && dotted.test(line)) {
        return { ok: false, reason: `config.toml defines mcp_servers.${name} with dotted keys or an inline table; edit it manually` };
      }
    }
    if (removing) {
      if (/'''|"""/.test(line)) return { ok: false, reason: `mcp_servers.${name} uses multi-line strings; edit it manually` };
      continue;
    }
    out.push(line);
  }
  if (!changed) return { ok: true, changed: false, text };
  let result = out.join('\n').replace(/\n{3,}/g, '\n\n');
  if (result.trim() === '') result = '';
  else if (!result.endsWith('\n')) result += '\n';
  return { ok: true, changed: true, text: result };
}

/** Replace (or append) the server block. Running it twice yields identical text. */
export function upsertCodexServer(text: string | undefined, name: string, block: string): TomlPlan {
  const original = text ?? '';
  const removed = removeCodexServer(original, name);
  if (!removed.ok) return removed;
  let base = removed.text.replace(/\s+$/, '');
  base = base === '' ? '' : base + '\n\n';
  const next = base + block;
  return { ok: true, changed: next !== original, text: next };
}
