import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runSetup, type SetupArgs } from '../../src/cli/setup.js';
import { runCli } from '../../src/cli/main.js';
import { parseImageReference } from '../../src/cli/docker.js';
import { readSavedSetup } from '../../src/cli/state.js';
import type { Prompter } from '../../src/cli/prompt.js';
import {
  sandbox, collector, stdinFrom, allFiles, readJson, fakePackageEntry, PUBLIC, PRIVATE, DEFAULT_REF, FAKE_ID, FAKE_DIGEST,
} from './helpers.js';

const ENTRY = fakePackageEntry();
const BASE: SetupArgs = { dryRun: false, yes: true, url: 'https://dt.example.com', runtime: 'docker', clients: ['cursor'], tokensFromStdin: true, inlineTokens: false };

function io(box: ReturnType<typeof sandbox>, prompter?: Prompter, stdin = stdinFrom(`${PUBLIC}\n${PRIVATE}\n`)) {
  const out = collector();
  return { out, io: { ctx: box.ctx, stdin, stdout: out.stream, stderr: out.stream, execPath: '/opt/node/bin/node', entryPath: ENTRY, uid: 501, gid: 20, ...(prompter ? { prompter } : {}) } };
}

/** Prompter that records every question and answers from a queue. */
export function recorder(answers: string[]): Prompter & { questions: string[] } {
  const questions: string[] = [];
  const queue = [...answers];
  const next = async (q: string): Promise<string> => {
    questions.push(q);
    const v = queue.shift();
    if (v === undefined) throw new Error(`no answer for ${q}`);
    return v;
  };
  return { questions, ask: next, secret: next, close: () => undefined };
}

const cursorArgs = (box: ReturnType<typeof sandbox>): string[] => readJson(join(box.home, '.cursor/mcp.json')).mcpServers.darktrace.args;
const envFlags = (args: string[]): string[] => args.flatMap((v, i) => (v === '-e' ? [args[i + 1]] : []));
const written = (home: string): string[] => allFiles(home).filter((f) => !f.includes('/bin/'));

test('image references: tag, digest and ID accepted; malformed or option-like values rejected', () => {
  assert.equal(parseImageReference(DEFAULT_REF).kind, 'tag');
  assert.equal(parseImageReference('localhost:5000/team/darktrace-mcp:1.1.2-rc.1').kind, 'tag');
  assert.equal(parseImageReference('darktrace-mcp:local').kind, 'tag');
  assert.equal(parseImageReference(FAKE_DIGEST).kind, 'digest');
  assert.equal(parseImageReference(FAKE_ID).kind, 'id');
  for (const bad of ['', 'ghcr.io/nuoframework/darktrace-mcp', 'Darktrace:1', '--privileged:1', 'ghcr.io/a/b:-x', 'a b:1', 'ghcr.io/a/b@sha256:abc',
    'sha256:' + 'A'.repeat(64), 'sha256:' + 'a'.repeat(63), 'a//b:1', 'a..b:1', 'a/b:1;rm', 'ghcr.io:99999/a:1', `a:${'x'.repeat(129)}`,
    'a/b@sha512:' + 'a'.repeat(64), '-a:1']) {
    assert.throws(() => parseImageReference(bad), /tag reference|digest reference/, bad);
  }
});

test('default reference: missing image is pulled with --pull, client gets the ID, setup.json keeps ID and digest', async () => {
  const box = sandbox('linux', ['docker']);
  const { out, io: setupIo } = io(box);
  assert.equal(await runSetup({ ...BASE, pull: true }, setupIo), 0, out.text());
  assert.deepEqual(box.docker.calls[0].args, ['version', '--format', '{{.Server.Os}}/{{.Server.Arch}}']);
  assert.deepEqual(box.docker.calls.find((c) => c.args[0] === 'pull'), { args: ['pull', DEFAULT_REF], stream: true });
  const args = cursorArgs(box);
  assert.equal(args.at(-1), FAKE_ID);
  assert.ok(args.includes('--pull=never'));
  assert.equal(args[args.indexOf('--user') + 1], '501:20');
  assert.ok(args.some((a) => a.endsWith('dst=/run/secrets/public-token,readonly')));
  assert.equal(envFlags(args).some((v) => v.startsWith('DARKTRACE_TOKEN_FILE_OWNER=')), false, 'Linux keeps the strict owner rule');
  const saved = readSavedSetup(box.ctx);
  assert.equal(saved?.image, FAKE_ID);
  assert.equal(saved?.imageReference, DEFAULT_REF);
  assert.equal(saved?.imageDigest, FAKE_DIGEST);
  assert.ok(out.text().includes(`image ID: ${FAKE_ID}`));
  assert.ok(out.text().includes(FAKE_DIGEST));
  assert.match(out.text(), /GitHub Release notes/);
});

test('interactive: default reference is offered, pull is confirmed, macOS adds root-or-current', async () => {
  const box = sandbox('darwin', ['docker']);
  // URL, runtime 2, image (default), pull yes, tokens, profile, clients.
  const prompter = recorder(['https://dt.example.com', '2', '', 'y', PUBLIC, PRIVATE, '1', 'cursor']);
  const { out, io: setupIo } = io(box, prompter, stdinFrom(''));
  assert.equal(await runSetup({ dryRun: false, yes: false, tokensFromStdin: false, inlineTokens: false }, setupIo), 0, out.text());
  assert.ok(prompter.questions.some((q) => q.includes(`[${DEFAULT_REF}]`)), prompter.questions.join('|'));
  assert.ok(prompter.questions.some((q) => /Pull it now\? \[Y\/n\]/.test(q)));
  const args = cursorArgs(box);
  assert.equal(args.at(-1), FAKE_ID);
  assert.deepEqual(envFlags(args).filter((v) => v.startsWith('DARKTRACE_TOKEN_FILE_OWNER=')), ['DARKTRACE_TOKEN_FILE_OWNER=root-or-current']);
  // Declining the pull stops without writing.
  const declined = sandbox('darwin', ['docker']);
  const no = recorder(['https://dt.example.com', '2', '', 'n']);
  await assert.rejects(runSetup({ dryRun: false, yes: false, tokensFromStdin: false, inlineTokens: false }, io(declined, no, stdinFrom('')).io), /was not pulled/);
  assert.deepEqual(written(declined.home), []);
});

test('tag already present is not pulled; digest and raw ID references resolve to the ID', async () => {
  for (const image of [DEFAULT_REF, FAKE_DIGEST, FAKE_ID]) {
    const box = sandbox('linux', ['docker']);
    box.docker.local.push(box.docker.registry[0]);
    const { out, io: setupIo } = io(box);
    assert.equal(await runSetup({ ...BASE, image }, setupIo), 0, out.text());
    assert.equal(box.docker.calls.some((c) => c.args[0] === 'pull'), false, image);
    assert.equal(cursorArgs(box).at(-1), FAKE_ID, image);
    assert.equal(readSavedSetup(box.ctx)?.imageDigest, FAKE_DIGEST, image);
  }
  // A digest reference missing locally is pulled by digest.
  const box = sandbox('linux', ['docker']);
  const { out, io: setupIo } = io(box);
  assert.equal(await runSetup({ ...BASE, image: FAKE_DIGEST, pull: true }, setupIo), 0, out.text());
  assert.deepEqual(box.docker.calls.find((c) => c.args[0] === 'pull')?.args, ['pull', FAKE_DIGEST]);
  // A raw ID that is not present cannot be pulled.
  const missing = sandbox('linux', ['docker']);
  await assert.rejects(runSetup({ ...BASE, image: 'sha256:' + '9'.repeat(64), pull: true }, io(missing).io), /not present locally/);
  assert.equal(missing.docker.calls.some((c) => c.args[0] === 'pull'), false);
  assert.deepEqual(written(missing.home), []);
});

test('missing image with --yes and no --pull fails clearly before writing anything', async () => {
  const box = sandbox('linux', ['docker']);
  await assert.rejects(runSetup(BASE, io(box).io), /rerun with --pull/);
  assert.equal(box.docker.calls.some((c) => c.args[0] === 'pull'), false);
  assert.deepEqual(written(box.home), []);
});

test('daemon down, docker missing or Windows containers stop with guidance and write nothing', async () => {
  const down = sandbox('linux', ['docker']);
  down.docker.daemon = 'down';
  await assert.rejects(runSetup({ ...BASE, pull: true }, io(down).io), /daemon did not answer.*systemctl start docker.*docker group/s);
  assert.deepEqual(written(down.home), []);
  const mac = sandbox('darwin', ['docker']);
  mac.docker.daemon = 'down';
  await assert.rejects(runSetup({ ...BASE, pull: true }, io(mac).io), /Start Docker Desktop/);
  const win = sandbox('darwin', ['docker']);
  win.docker.daemon = 'windows';
  await assert.rejects(runSetup({ ...BASE, pull: true }, io(win).io), /Linux containers/);
  await assert.rejects(runSetup({ ...BASE, pull: true }, io(sandbox('linux')).io), /sudo apt install docker\.io/);
  await assert.rejects(runSetup({ ...BASE, pull: true }, io(sandbox('darwin')).io), /Docker Desktop/);
});

test('dry run inspects but never pulls or writes', async () => {
  const box = sandbox('linux', ['docker']);
  const { out, io: setupIo } = io(box);
  assert.equal(await runSetup({ ...BASE, dryRun: true }, setupIo), 0, out.text());
  assert.ok(out.text().includes(`Would run: docker pull ${DEFAULT_REF}`));
  assert.equal(box.docker.calls.some((c) => c.args[0] === 'pull'), false);
  assert.deepEqual(written(box.home), []);
});

test('config reuses the saved ID and digest; test runs --check-config in the container first', async () => {
  const box = sandbox('linux', ['docker']);
  const { out, io: setupIo } = io(box);
  assert.equal(await runSetup({ ...BASE, pull: true }, setupIo), 0, out.text());
  const printed = collector();
  const cliIo = { ...setupIo, stdout: printed.stream, stderr: printed.stream };
  assert.equal(await runCli(['config', 'cursor'], cliIo), 0, printed.text());
  assert.ok(printed.text().includes(FAKE_ID));
  assert.ok(printed.text().includes(FAKE_DIGEST));

  box.docker.calls.length = 0;
  const tested = collector();
  assert.equal(await runCli(['test'], { ...cliIo, stdout: tested.stream, stderr: tested.stream }), 0, tested.text());
  const run = box.docker.calls.find((c) => c.args[0] === 'run');
  assert.ok(run, 'container check ran');
  assert.equal(run.args.at(-1), '--check-config');
  assert.equal(run.args.at(-2), FAKE_ID);
  assert.ok(run.args.includes('--network=none'));
  assert.equal(run.args.includes('--network=bridge'), false);
  assert.match(tested.text(), /OK container --check-config/);
  assert.match(tested.text(), /OK https:\/\/dt\.example\.com answered/);

  box.docker.checkConfig = { status: 1, stdout: '', stderr: '{"event":"startup_error","reason":"token_file_owner"}\n' };
  const failed = collector();
  assert.equal(await runCli(['test'], { ...cliIo, stdout: failed.stream, stderr: failed.stream }), 1);
  assert.match(failed.text(), /FAIL container --check-config.*token_file_owner/);
  assert.equal(failed.text().includes(PRIVATE) || failed.text().includes(PUBLIC), false);
});

test('the URL prompt never suggests a saved appliance address', async () => {
  const box = sandbox('linux');
  mkdirSync(join(box.home, '.config/darktrace-mcp'), { recursive: true });
  writeFileSync(join(box.home, '.config/darktrace-mcp/setup.json'),
    JSON.stringify({ version: 1, url: 'https://saved-host.example.internal', profiles: 'read', runtime: 'node', tokenMode: 'file' }));
  const prompter = recorder(['', 'https://dt.example.com', '1', PUBLIC, PRIVATE, '1', 'none']);
  const { out, io: setupIo } = io(box, prompter, stdinFrom(''));
  assert.equal(await runSetup({ dryRun: true, yes: false, tokensFromStdin: false, inlineTokens: false }, setupIo), 0, out.text());
  assert.equal(prompter.questions[0], 'Darktrace appliance URL (https://...): ');
  assert.equal(prompter.questions[1], 'Darktrace appliance URL (https://...): ', 'an empty answer is not replaced by the saved URL');
  assert.match(out.text(), /A value is required/);
  assert.equal(prompter.questions.join('\n').includes('saved-host'), false);
  assert.equal(out.text().includes('saved-host'), false);
});
