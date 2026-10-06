// Optional native-client rehearsal. Decline the elicitation; never accept it.
import { spawn } from 'node:child_process';
import { writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { state, server } from './common.mjs';

server.env.DARKTRACE_PROFILES = 'all';
server.env.DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE = 'true';
const config = join(state, 'mcp.json');
writeFileSync(config, JSON.stringify({ mcpServers: { darktrace: server } }), { mode: 0o600 });
const child = spawn('claude', [
  '--mcp-config', config, '--strict-mcp-config', '--setting-sources', '',
  '--disable-slash-commands', '--tools', '',
  '--permission-mode', 'default',
  '--allowedTools', 'mcp__darktrace__darktrace_antigena_action',
], { cwd: state, stdio: 'inherit', env: { ...process.env, DISABLE_AUTOUPDATER: '1' } });
try {
  process.exitCode = await new Promise(resolve => child.on('close', resolve));
} finally {
  rmSync(state, { recursive: true, force: true });
}
