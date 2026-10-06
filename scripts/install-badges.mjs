// README presentation for the canonical installation links owned by src/cli/entry.ts.
// Run after npm run build; --write updates the existing buttons without moving the surrounding content.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { cursorBadgeLink, installBadgesMarkdown, vscodeBadgeLink } from '../dist/src/cli/entry.js';
const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
export const BADGE_LABELS = {
  en: { cursor: 'Install in Cursor', vscode: 'Install in VS Code', insiders: 'Install in VS Code Insiders' },
  es: { cursor: 'Instalar en Cursor', vscode: 'Instalar en VS Code', insiders: 'Instalar en VS Code Insiders' },
};
const escapeAttribute = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
/** Equal-height, dark badges. URI builders and encoded payloads remain unchanged. */
export function readmeBadgesHtml(packageVersion, labels) {
  const buttons = [
    [labels.cursor, cursorBadgeLink(packageVersion)],
    [labels.vscode, vscodeBadgeLink(packageVersion)],
    [labels.insiders, vscodeBadgeLink(packageVersion, true)],
  ].map(([label, href]) => {
    const src = `https://img.shields.io/badge/${encodeURIComponent(label)}-161B22?style=for-the-badge`;
    return `<a href="${escapeAttribute(href)}"><img src="${src}" height="36" alt="${escapeAttribute(label)}"></a>`;
  });
  return `<p align="left">${buttons.join('\n')}<\/p>`;
}
const BADGE_LINE = /^\[!\[[^\]]*\]\([^)]*\)\]\((?:cursor:\/\/anysphere\.cursor-deeplink\/mcp\/install\?name=darktrace|vscode:mcp\/install\?|vscode-insiders:mcp\/install\?).*\)$/;
const HTML_BADGE_LINE = /^(?:<p align="left">)?<a href="(?:cursor:\/\/anysphere\.cursor-deeplink\/mcp\/install\?|vscode:mcp\/install\?|vscode-insiders:mcp\/install\?)/;
/** Refresh current HTML or legacy Markdown in place; keep legacy output stable for existing consumers. */
export function rewriteBadges(file, text) {
  const lang = /^(?:\*\*Español\*\*|## Instalación(?:\s|$))/m.test(text) ? 'es' : 'en';
  const lines = text.split('\n');
  const html = lines.some(line => HTML_BADGE_LINE.test(line.trim()));
  const rows = (html ? readmeBadgesHtml(version, BADGE_LABELS[lang]) : installBadgesMarkdown(version, BADGE_LABELS[lang])).split('\n');
  const indexes = lines.flatMap((line, i) => ((html ? HTML_BADGE_LINE : BADGE_LINE).test(line.trim()) ? [i] : []));
  if (indexes.length !== rows.length) throw new Error(`${file}: expected ${rows.length} badge rows, found ${indexes.length}`);
  indexes.forEach((i, n) => { const indent = /^\s*/.exec(lines[i])[0]; lines[i] = indent + rows[n]; });
  const next = lines.join('\n');
  return { changed: next !== text, text: next };
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv.includes('--write')) {
    for (const name of ['README.md', 'README.en.md']) {
      const file = new URL('../' + name, import.meta.url);
      let current;
      try { current = readFileSync(file, 'utf8'); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
      const { changed, text } = rewriteBadges(name, current);
      if (changed) writeFileSync(file, text);
      console.log(`${name}: ${changed ? 'updated' : 'already current'} (${version})`);
    }
  } else for (const [lang, labels] of Object.entries(BADGE_LABELS)) console.log(`## ${lang}\n${readmeBadgesHtml(version, labels)}\n`);
}
