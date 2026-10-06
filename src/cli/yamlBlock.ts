/**
 * Marker-delimited management of one server block in a YAML client file (Continue `config.yaml`, Goose
 * `config.yaml`). No YAML parser ships with the server, so the editor never rewrites the rest of the file: it only
 * inserts or removes the lines between its own markers, directly under the documented top-level key, and refuses
 * (with a ready-to-paste snippet) whenever the surrounding shape is not the plain documented one.
 */
import type { ServerEntry } from './entry.js';

export const YAML_BEGIN = '# >>> darktrace-mcp setup (managed block; edit with darktrace-mcp setup)';
export const YAML_END = '# <<< darktrace-mcp setup';

/** YAML double-quoted scalars accept JSON string syntax, so JSON.stringify is a correct, escape-safe YAML string. */
export const yamlString = (value: string): string => JSON.stringify(value);
const indentLines = (text: string, indent: string): string => text.split('\n').filter((l) => l.length > 0).map((l) => indent + l).join('\n') + '\n';

/** Continue: one item of the top-level `mcpServers` list (docs.continue.dev/reference). */
export function renderContinueItem(name: string, entry: ServerEntry): string {
  const lines = [`- name: ${yamlString(name)}`, `  type: stdio`, `  command: ${yamlString(entry.command)}`, '  args:'];
  for (const a of entry.args) lines.push(`    - ${yamlString(a)}`);
  const env = Object.entries(entry.env);
  if (env.length > 0) { lines.push('  env:'); for (const [k, v] of env) lines.push(`    ${k}: ${yamlString(v)}`); }
  return lines.join('\n') + '\n';
}

/** Goose: one entry of the top-level `extensions` map (goose-docs.ai config-files). */
export function renderGooseEntry(name: string, entry: ServerEntry): string {
  const lines = [`${name}:`, '  type: stdio', `  name: ${yamlString(name)}`, '  enabled: true', `  cmd: ${yamlString(entry.command)}`,
    `  args: [${entry.args.map(yamlString).join(', ')}]`, '  timeout: 300'];
  const env = Object.entries(entry.env);
  lines.push(env.length === 0 ? '  envs: {}' : '  envs:');
  for (const [k, v] of env) lines.push(`    ${k}: ${yamlString(v)}`);
  lines.push('  env_keys: []');
  return lines.join('\n') + '\n';
}

export type YamlPlan = { readonly ok: true; readonly changed: boolean; readonly text: string } | { readonly ok: false; readonly reason: string };

interface Managed { readonly before: string[]; readonly after: string[]; readonly had: boolean; readonly indent: string }

/** Split the file around the managed block (whole lines, markers included). */
function splitManaged(lines: readonly string[]): Managed | { readonly error: string } {
  const begin = lines.findIndex((l) => l.trim() === YAML_BEGIN);
  if (begin === -1) return { before: [...lines], after: [], had: false, indent: '' };
  const end = lines.findIndex((l, i) => i > begin && l.trim() === YAML_END);
  if (end === -1) return { error: 'the managed darktrace block has no end marker; repair the file by hand' };
  if (lines.some((l, i) => i > end && l.trim() === YAML_BEGIN)) return { error: 'the file has more than one managed darktrace block; repair it by hand' };
  return { before: lines.slice(0, begin), after: lines.slice(end + 1), had: true, indent: /^\s*/.exec(lines[begin])?.[0] ?? '' };
}

/** Index of the exact top-level `key:` line (no inline value), or -1. An inline value (`key: []`, `key: {}`) cannot be extended. */
function topLevelKeyLine(lines: readonly string[], key: string): number | 'inline' {
  const bare = new RegExp(`^${key}:\\s*(?:#.*)?$`);
  const inline = new RegExp(`^${key}:\\s*\\S`);
  for (let i = 0; i < lines.length; i++) {
    if (bare.test(lines[i])) return i;
    if (inline.test(lines[i])) return 'inline';
  }
  return -1;
}

/** First content line after `index` that still belongs to the key (indented, or a column-0 list item), or undefined. */
function firstChild(lines: readonly string[], index: number): string | undefined {
  for (let i = index + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    return /^\s/.test(line) || line.startsWith('- ') ? line : undefined;
  }
  return undefined;
}

export interface YamlBlockOptions {
  /** Top-level key the block lives under (`mcpServers` for Continue, `extensions` for Goose). */
  readonly key: string;
  /** Regular expression matching an unmanaged definition of the same server, which the editor must not duplicate. */
  readonly conflict: RegExp;
  /** `list`: items start with `- `; `map`: entries are `name:` keys. Decides the indentation rule. */
  readonly kind: 'list' | 'map';
}

/** Remove the managed block; drop the top-level key too when nothing else is left under it. */
export function removeYamlBlock(text: string, options: YamlBlockOptions): YamlPlan {
  const lines = text.split('\n');
  const split = splitManaged(lines);
  if ('error' in split) return { ok: false, reason: split.error };
  if (!split.had) return { ok: true, changed: false, text };
  let out = [...split.before, ...split.after];
  const key = topLevelKeyLine(out, options.key);
  if (typeof key === 'number' && firstChild(out, key) === undefined) out = out.filter((_, i) => i !== key);
  let result = out.join('\n').replace(/\n{3,}/g, '\n\n');
  if (result.trim() === '') result = '';
  else if (!result.endsWith('\n')) result += '\n';
  return { ok: true, changed: result !== text, text: result };
}

/** Insert (or replace) the managed block directly under the top-level key, creating the key at the end when absent. */
export function upsertYamlBlock(text: string | undefined, block: string, options: YamlBlockOptions): YamlPlan {
  const original = text ?? '';
  const lines = original.split('\n');
  const split = splitManaged(lines);
  if ('error' in split) return { ok: false, reason: split.error };
  const rest = [...split.before, ...split.after];
  if (rest.some((l) => options.conflict.test(l))) return { ok: false, reason: `the file already defines a darktrace server outside the managed block; merge the snippet by hand` };
  if (/^---\s*$/m.test(rest.join('\n'))) return { ok: false, reason: 'the file contains several YAML documents; merge the snippet by hand' };
  const key = topLevelKeyLine(rest, options.key);
  if (key === 'inline') return { ok: false, reason: `"${options.key}" has an inline value in this file; merge the snippet by hand` };
  let out: string[];
  if (key === -1) {
    const base = rest.join('\n').replace(/\s+$/, '');
    out = [...(base === '' ? [] : [...base.split('\n'), '']), `${options.key}:`, ...indentLines(YAML_BEGIN + '\n' + block + YAML_END + '\n', '  ').split('\n').slice(0, -1)];
  } else {
    const child = firstChild(rest, key);
    // Match the indentation already used under the key; the documented default is two spaces.
    let indent = '  ';
    if (child !== undefined) {
      const lead = /^\s*/.exec(child)?.[0] ?? '';
      if (options.kind === 'list' && !/^\s*- /.test(child)) return { ok: false, reason: `"${options.key}" is not a plain list in this file; merge the snippet by hand` };
      if (options.kind === 'map' && /^\s*- /.test(child)) return { ok: false, reason: `"${options.key}" is not a map in this file; merge the snippet by hand` };
      indent = lead;
    }
    const managed = indentLines(YAML_BEGIN + '\n' + block + YAML_END + '\n', indent).split('\n').slice(0, -1);
    out = [...rest.slice(0, key + 1), ...managed, ...rest.slice(key + 1)];
  }
  let next = out.join('\n').replace(/\n{3,}/g, '\n\n');
  if (!next.endsWith('\n')) next += '\n';
  return { ok: true, changed: next !== original, text: next };
}
