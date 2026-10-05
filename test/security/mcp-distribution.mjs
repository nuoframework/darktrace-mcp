import { readFileSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';
// Historical prose and negative warnings are evidence, never installation examples.
const bare = value => /^(?:darktrace-mcp)(?:@[^/\s]+)?$/.test(value);
export function forbiddenCommand(line) {
  const words = line.trim().replace(/^\$\s*/, '').split(/\s+/).map(word => word.replace(/^['"]|['"]$/g, ''));
  const registry = word => bare(word) || /^--(?:package|p)=/.test(word) && bare(word.slice(word.indexOf('=') + 1));
  if (words[0] === 'npx') return words.slice(1).some(registry);
  if (words[0] === 'npm' && ['i', 'install', 'add', 'exec'].includes(words[1])) return words.slice(2).some(registry);
  return false;
}
function configs(value, where, issues) {
  if (!value || typeof value !== 'object') return;
  if (typeof value.command === 'string') {
    const command = value.command.split(/[\\/]/).at(-1);
    if (forbiddenCommand([command, ...(value.args ?? [])].join(' '))) issues.push(where);
  }
  for (const entry of Object.values(value)) configs(entry, where, issues);
}
export function distributionIssues(root) {
  const issues = [];
  const files = [join(root, 'README.md'), join(root, 'README.es.md')];
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
