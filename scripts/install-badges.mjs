// Prints the README one-click badge rows for the package version in package.json. Run after `npm run build`
// and paste the output into README.md (en) and README.es.md (es); test/cli/badges.test.ts checks they match.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { installBadgesMarkdown } from '../dist/src/cli/entry.js';
const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
export const BADGE_LABELS = {
  en: { cursor: 'Install in Cursor', vscode: 'Install in VS Code', insiders: 'Install in VS Code Insiders' },
  es: { cursor: 'Instalar en Cursor', vscode: 'Instalar en VS Code', insiders: 'Instalar en VS Code Insiders' },
};
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  for (const [lang, labels] of Object.entries(BADGE_LABELS)) console.log(`## ${lang}\n${installBadgesMarkdown(version, labels)}\n`);
}
