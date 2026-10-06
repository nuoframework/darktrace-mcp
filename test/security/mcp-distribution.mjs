import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
// Historical prose and negative warnings are evidence, never installation examples.
// Published name: @nuoframework/darktrace-mcp. The unscoped name is not ours (typosquat risk), and
// documented bootstrap commands must pin an exact version. Client configurations never launch a
// registry fetcher at all: `setup` writes absolute node + dist paths.
const unscoped = value => /^darktrace-mcp(?:@[^/\s]+)?$/.test(value);
const scoped = value => /^@nuoframework\/darktrace-mcp(?:@[^\s]+)?$/.test(value);
const exact = value => /^@nuoframework\/darktrace-mcp@\d+\.\d+\.\d+$/.test(value);
export function forbiddenCommand(line, launcher = false) {
  const words = line.trim().replace(/^\$\s*/, '').split(/\s+/).map(word => word.replace(/^['"]|['"]$/g, ''));
  const spec = word => /^--(?:package|p)=/.test(word) ? word.slice(word.indexOf('=') + 1) : word;
  const registry = word => { const s = spec(word); return unscoped(s) || (scoped(s) && (launcher || !exact(s))); };
  if (words[0] === 'npx') return words.slice(1).some(registry);
  if (words[0] === 'npm' && ['i', 'install', 'add', 'exec'].includes(words[1])) return words.slice(2).some(registry);
  return false;
}
function configs(value, where, issues) {
  if (!value || typeof value !== 'object') return;
  if (typeof value.command === 'string') {
    const command = value.command.split(/[\\/]/).at(-1);
    if (forbiddenCommand([command, ...(value.args ?? [])].join(' '), true)) issues.push(where);
  }
  for (const entry of Object.values(value)) configs(entry, where, issues);
}
export function distributionIssues(root) {
  const issues = [];
  // Every README language present (README.md plus README.en.md or README.es.md) is inspected.
  const files = ['README.md', 'README.en.md', 'README.es.md'].map((name) => join(root, name)).filter((file) => existsSync(file));
  function walk(dir) { for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name); if (entry.isDirectory()) walk(path); else files.push(path);
  } }
  walk(join(root, 'docs')); walk(join(root, 'examples'));
  for (const file of files) {
    if (!['.md', '.json', '.toml'].includes(extname(file))) continue;
    const text = readFileSync(file, 'utf8');
    if (extname(file) === '.json') { configs(JSON.parse(text), file, issues); continue; }
    if (extname(file) === '.toml') {
      const command = /^\s*command\s*=\s*"([^"]+)"/m.exec(text)?.[1];
      const args = /^\s*args\s*=\s*(\[[^\n]+\])/m.exec(text)?.[1];
      if (command && args) configs({ command, args: JSON.parse(args) }, file, issues);
      continue;
    }
    if (extname(file) !== '.md') continue;
    let executable = false;
    for (const [offset, line] of text.split('\n').entries()) {
      const fence = /^\s*```(.*)$/.exec(line);
      if (fence) { executable = !executable && /^(?:sh|shell|bash|zsh|console|json|toml)?\s*$/.test(fence[1]); continue; }
      if (executable && forbiddenCommand(line)) issues.push(file + ':' + (offset + 1));
    }
    // JSON host configs in fenced examples are parsed, rather than matching warnings.
    for (const match of text.matchAll(/```json\s*\n([\s\S]*?)\n\s*```/g)) {
      try { configs(JSON.parse(match[1]), file, issues); } catch { /* prose JSON placeholders are not configs */ }
    }
  }
  return issues;
}
