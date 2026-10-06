// A minimal MCP host: displays the real server elicitation and only allows decline.
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { rmSync } from 'node:fs';
import { server, state, title, print, pause } from './common.mjs';
const child = spawn(server.command, server.args, { env: { PATH: process.env.PATH, ...server.env, DARKTRACE_PROFILES: 'read,write,critical' }, stdio: ['pipe', 'pipe', 'pipe'] });
const pending = new Map(); let id = 0, buffer = ''; const audit = [];
const rl = createInterface({ input: process.stdin, output: process.stdout });
const deadline = setTimeout(() => { child.kill(); process.exitCode = 1; rl.close(); }, 60_000);
child.stderr.on('data', chunk => {
  for (const line of String(chunk).trim().split('\n')) try { const record = JSON.parse(line); if (record.audit) audit.push(record); else process.stderr.write(line + '\n'); } catch { process.stderr.write(line + '\n'); }
});
child.stdout.on('data', chunk => {
  buffer += chunk;
  let end;
  while ((end = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
    if (line.trim()) void handle(JSON.parse(line));
  }
});
async function handle(message) {
  if (message.method === 'elicitation/create') {
    title('03 / HUMAN APPROVAL', 'Confirmation dialog • demo MCP host (not a client screenshot)');
    print(message.params.message);
    print('\nRequired field: approved (boolean)\n');
    await rl.question('[ Accept ]  [ Decline ]  → Press Enter to DECLINE: ');
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: message.id, result: { action: 'decline' } }) + '\n');
  } else if (pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
}
function send(method, params) { return new Promise(resolve => { const requestId = ++id; pending.set(requestId, resolve); child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: requestId, method, params }) + '\n'); }); }
try {
  await send('initialize', { protocolVersion: '2025-06-18', capabilities: { elicitation: {} }, clientInfo: { name: 'darktrace-demo-host', version: '1.0.0' } });
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
  title('03 / PREVIEW FIRST', 'Critical action • read,write,critical profiles • default elicitation');
  const body = { codeid: 1, activate: true, duration: 60, reason: 'Synthetic demo - decline this action' };
  print('1. Preview Antigena action: dryRun:true');
  print(JSON.stringify(body));
  const preview = await send('tools/call', { name: 'darktrace_antigena_action', arguments: { operation: 'post_antigena', dryRun: true, body } });
  const previewId = preview.result?.structuredContent?.previewId;
  if (!previewId) throw new Error(JSON.stringify(preview));
  print(`\npreviewId: ${previewId}\nSingle-use • valid for 5 minutes`);
  await pause(3000);
  print('\n2. Repeat the same action: confirm:true + previewId\n   The server now asks the host for human approval.');
  await pause(2500);
  const result = await send('tools/call', { name: 'darktrace_antigena_action', arguments: { operation: 'post_antigena', confirm: true, previewId, body } });
  const data = result.result?.structuredContent;
  print('\n\x1b[33m3. Declined → ' + JSON.stringify(data) + '\x1b[0m');
  if (data?.errorCode !== 'approval_denied') throw new Error('Expected approval_denied');
  print('\nNo action executed. Preview and refusal audited on stderr.');
  await pause(4000);
} finally { clearTimeout(deadline); rl.close(); child.stdin.end(); child.kill(); rmSync(state, { recursive: true }); }
