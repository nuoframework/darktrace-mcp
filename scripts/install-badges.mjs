// Prints the README one-click badge rows for the package version in package.json (run after `npm run build`).
// With --write it replaces the existing badge rows in every README in place (README.md, README.en.md, README.es.md;
// the language is detected from the "## Instalación" heading); test/cli/badges.test.ts checks they match.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { installBadgesMarkdown } from '../dist/src/cli/entry.js';
const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
export const BADGE_LABELS = {
  en: { cursor: 'Install in Cursor', vscode: 'Install in VS Code', insiders: 'Install in VS Code Insiders' },
  es: { cursor: 'Instalar en Cursor', vscode: 'Instalar en VS Code', insiders: 'Instalar en VS Code Insiders' },
};
const BADGE_LINE = /^\[!\[[^\]]*\]\([^)]*\)\]\((?:cursor:\/\/anysphere\.cursor-deeplink\/mcp\/install\?name=darktrace|vscode:mcp\/install\?|vscode-insiders:mcp\/install\?).*\)$/;
/** Replace the three badge rows of one README with the current version; returns true when the file changed. */
export function rewriteBadges(file, text) {
  const lang = /^## Instalación$/m.test(text) ? 'es' : 'en';
  const rows = installBadgesMarkdown(version, BADGE_LABELS[lang]).split('\n');
  const lines = text.split('\n');
  const indexes = lines.flatMap((line, i) => (BADGE_LINE.test(line.trim()) ? [i] : []));
  if (indexes.length !== rows.length) throw new Error(`${file}: expected ${rows.length} badge rows, found ${indexes.length}`);
  indexes.forEach((i, n) => { const indent = /^\s*/.exec(lines[i])[0]; lines[i] = indent + rows[n]; });
  const next = lines.join('\n');
  return { changed: next !== text, text: next };
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv.includes('--write')) {
    for (const name of ['README.md', 'README.en.md', 'README.es.md']) {
      const file = new URL('../' + name, import.meta.url);
      if (!existsSync(file)) continue;
      const { changed, text } = rewriteBadges(name, readFileSync(file, 'utf8'));
      if (changed) writeFileSync(file, text);
      console.log(`${name}: ${changed ? 'updated' : 'already current'} (${version})`);
    }
  } else for (const [lang, labels] of Object.entries(BADGE_LABELS)) console.log(`## ${lang}\n${installBadgesMarkdown(version, labels)}\n`);
}
