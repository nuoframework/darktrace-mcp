// Live Claude Code output, formatted from stream-json; no canned model answer.
import { spawn } from 'node:child_process';
import { writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { root, state, server, title, print, pause } from './common.mjs';
const config = join(state, 'mcp.json');
writeFileSync(config, JSON.stringify({ mcpServers: { darktrace: server } }), { mode: 0o600 });
const prompt = 'Use darktrace_get_devices and darktrace_list_model_breaches once each. Which devices and model breaches are visible, and what should I investigate next? This is synthetic mock data; do not infer real threats or counts beyond returned items. Answer in under 110 words, plain text, no table, lines under 85 columns.';
title('02 / INVESTIGATE', 'Claude Code • read profile');
print('$ claude --mcp-config <temporary mcp.json> --strict-mcp-config -p "…"');
print('\n> Which devices and model breaches are visible? What should I investigate next?\n');
await pause(1000);
const child = spawn('claude', ['--mcp-config', config, '--strict-mcp-config', '--setting-sources', '', '--disable-slash-commands', '--no-session-persistence', '--tools', '', '--allowedTools', 'mcp__darktrace__darktrace_get_devices,mcp__darktrace__darktrace_list_model_breaches', '--output-format', 'stream-json', '--verbose', '-p', prompt], { cwd: state, stdio: ['ignore', 'pipe', 'pipe'] });
let buffer = '', failed = false, calls = new Set();
child.stdout.on('data', chunk => {
  buffer += chunk;
  let end;
  while ((end = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
    let event; try { event = JSON.parse(line); } catch { continue; }
    if (event.type === 'assistant') for (const block of event.message?.content ?? []) {
      if (block.type === 'tool_use') { calls.add(block.name); print(`\x1b[36mMCP → ${block.name.replace('mcp__darktrace__', '')}\x1b[0m`); print(JSON.stringify(block.input)); }
      if (block.type === 'text') print('\n' + block.text);
    }
    if (event.type === 'user') for (const block of event.message?.content ?? []) if (block.type === 'tool_result') {
      const content = typeof block.content === 'string' ? block.content : JSON.stringify(block.content);
      if (block.is_error) { failed = true; print(content); }
      else print('\x1b[32m  ← tool result received\x1b[0m\n');
    }
    if (event.type === 'result' && event.is_error) { failed = true; print(event.result ?? event.errors?.join('\n') ?? 'Client failed'); }
  }
});
child.stderr.on('data', chunk => process.stderr.write(chunk));
const timeout = setTimeout(() => child.kill(), 180_000);
const code = await new Promise(resolve => child.on('close', resolve));
clearTimeout(timeout);
await pause(3000);
rmSync(state, { recursive: true });
if (code !== 0 || failed || calls.size < 2) process.exitCode = 1;
