// Live Claude Code output, formatted from stream-json; no canned model answer.
import { spawn } from 'node:child_process';
import { writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { state, server, title, print, pause } from './common.mjs';
const config = join(state, 'mcp.json');
writeFileSync(config, JSON.stringify({ mcpServers: { darktrace: server } }), { mode: 0o600 });
const prompt = 'Use darktrace_get_devices and darktrace_list_model_breaches once each. Which devices and model breaches are visible, and what should I investigate next? This is synthetic mock data; do not infer real threats or counts beyond returned items. Answer in under 85 words, plain text, no table. Do not narrate before calling the tools.';
title('02 / INVESTIGATE', 'Claude Code • read profile');
for (const char of '$ claude --mcp-config <tmp.json> --strict-mcp-config -p "…"\n') {
  process.stdout.write(char); await pause(35);
}
print('\n> Which devices and model breaches are visible? What should I investigate next?\n');
const child = spawn('claude', ['--mcp-config', config, '--strict-mcp-config', '--setting-sources', '', '--disable-slash-commands', '--no-session-persistence', '--tools', '', '--allowedTools', 'mcp__darktrace__darktrace_get_devices,mcp__darktrace__darktrace_list_model_breaches', '--output-format', 'stream-json', '--include-partial-messages', '--verbose', '-p', prompt], { cwd: state, stdio: ['ignore', 'pipe', 'pipe'] });
let buffer = '', failed = false, calls = new Set();
// Serialize display only: tool results and text come from the live client.
// Pace received words so fast network chunks remain legible in the recording.
let display = Promise.resolve(), column = 0;
const enqueue = fn => { display = display.then(fn); };
async function words(text) {
  for (const word of text.split(/(\s+)/)) {
    if (word.includes('\n')) { process.stdout.write(word); column = 0; }
    else {
      if (column + word.length > 90) { process.stdout.write('\n'); column = 0; }
      process.stdout.write(word); column += word.length;
    }
    if (word.trim()) await pause(45);
  }
}
child.stdout.on('data', chunk => {
  buffer += chunk;
  let end;
  while ((end = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
    let event; try { event = JSON.parse(line); } catch { continue; }
    if (event.type === 'assistant') for (const block of event.message?.content ?? []) {
      if (block.type === 'tool_use') { calls.add(block.name); enqueue(async () => { print(`\x1b[36mMCP → ${block.name.replace('mcp__darktrace__', '')}\x1b[0m`); await pause(200); print(JSON.stringify(block.input)); }); }
    }
    if (event.type === 'stream_event' && event.event?.delta?.type === 'text_delta') {
      enqueue(() => words(event.event.delta.text));
    }
    if (event.type === 'user') for (const block of event.message?.content ?? []) if (block.type === 'tool_result') {
      const content = typeof block.content === 'string' ? block.content : JSON.stringify(block.content);
      if (block.is_error) { failed = true; enqueue(async () => print(content)); }
      else enqueue(async () => { await pause(250); print('\x1b[32m  ← tool result received\x1b[0m\n'); });
    }
    if (event.type === 'result' && event.is_error) { failed = true; print(event.result ?? event.errors?.join('\n') ?? 'Client failed'); }
  }
});
child.stderr.on('data', chunk => process.stderr.write(chunk));
const timeout = setTimeout(() => child.kill(), 180_000);
const code = await new Promise(resolve => child.on('close', resolve));
clearTimeout(timeout);
await display;
print('\n');
await pause(3000);
rmSync(state, { recursive: true });
if (code !== 0 || failed || calls.size < 2) process.exitCode = 1;
