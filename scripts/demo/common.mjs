import { mkdtempSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
export const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
export const state = mkdtempSync(join(tmpdir(), 'darktrace-demo-'));
export const ca = resolve(process.env.DEMO_CA ?? 'scripts/demo/mock/ca.pem');
export const url = process.env.DEMO_URL ?? 'https://127.0.0.1:8443';
for (const name of ['public', 'private']) {
  const path = join(state, `${name}-token`);
  writeFileSync(path, `mock-${name}-token\n`, { mode: 0o600 });
  chmodSync(path, 0o600);
}
export const server = {
  command: process.execPath,
  args: [join(root, 'dist/src/index.js')],
  env: {
    DARKTRACE_URL: url,
    DARKTRACE_PUBLIC_TOKEN_FILE: join(state, 'public-token'),
    DARKTRACE_PRIVATE_TOKEN_FILE: join(state, 'private-token'),
    DARKTRACE_PROFILES: 'read',
    DARKTRACE_QUERY_SIGNATURE_ENCODING: 'encoded',
    NODE_EXTRA_CA_CERTS: ca,
  },
};
export const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
export const title = (step, text) => console.log(`\x1b[2J\x1b[H\x1b[1;36mDARKTRACE MCP  /  ${step}\x1b[0m\n\x1b[2mSynthetic local appliance • no production data\x1b[0m\n\n${text}\n`);
export function print(text, width = 90) {
  for (const line of text.split('\n')) {
    let remaining = line;
    while (remaining.length > width) {
      const space = remaining.lastIndexOf(' ', width);
      const cut = space > 0 ? space : width;
      console.log(remaining.slice(0, cut));
      remaining = remaining.slice(cut).trimStart();
    }
    console.log(remaining);
  }
}
