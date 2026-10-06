import test from 'node:test';
import assert from 'node:assert/strict';
import { createUi, detectUi, modeText, PLAIN_UI, visibleLength } from '../../src/cli/ui.js';
import { collector } from './helpers.js';

test('colour detection honours NO_COLOR, FORCE_COLOR, TERM=dumb and non-TTY output', () => {
  assert.deepEqual(detectUi({}, { isTTY: true }, 'darwin'), { color: true, tty: true, unicode: true });
  assert.deepEqual(detectUi({}, { isTTY: false }, 'darwin'), { color: false, tty: false, unicode: true });
  assert.deepEqual(detectUi({}, {}, 'linux'), { color: false, tty: false, unicode: true });
  assert.equal(detectUi({ NO_COLOR: '1' }, { isTTY: true }, 'darwin').color, false, 'NO_COLOR wins on a TTY');
  assert.equal(detectUi({ NO_COLOR: '1', FORCE_COLOR: '1' }, { isTTY: true }, 'darwin').color, false, 'NO_COLOR wins over FORCE_COLOR');
  assert.equal(detectUi({ FORCE_COLOR: '1' }, { isTTY: false }, 'darwin').color, true, 'FORCE_COLOR enables colour without a TTY');
  assert.equal(detectUi({ FORCE_COLOR: '0' }, { isTTY: true }, 'darwin').color, false);
  assert.equal(detectUi({ TERM: 'dumb' }, { isTTY: true }, 'darwin').color, false);
  assert.equal(detectUi({}, { isTTY: true }, 'win32').unicode, false, 'legacy Windows console falls back to ASCII markers');
  assert.equal(detectUi({ WT_SESSION: 'x' }, { isTTY: true }, 'win32').unicode, true, 'Windows Terminal renders Unicode');
});

test('plain ui is byte-stable: no escape codes, ASCII markers, aligned tables', () => {
  const ui = createUi(PLAIN_UI);
  const text = ui.banner('darktrace-mcp setup · v1', 'sub') + ui.step(2, 5, 'Runtime') + ui.ok('fine\n') + ui.fail('bad\n') + ui.warn('hm\n') + ui.note('n');
  assert.equal(text.includes('\x1b['), false);
  assert.match(text, /Step 2 of 5 · Runtime/);
  assert.match(text, /^\+ fine/m);
  assert.match(text, /^x bad/m);
  const table = ui.table([['+', 'Cursor', 'written', '/a/mcp.json', '0600'], ['', '', 'backup', '/a/mcp.json.bak', ''], ['x', 'Claude Desktop', 'manual', 'file contains comments']]);
  assert.equal(table, [
    '  +  Cursor          written  /a/mcp.json             0600',
    '                     backup   /a/mcp.json.bak',
    '  x  Claude Desktop  manual   file contains comments',
  ].join('\n') + '\n');
  assert.equal(ui.table([]), '');
});

test('coloured ui wraps text in SGR codes that do not count towards column widths', () => {
  const ui = createUi({ color: true, tty: false, unicode: true });
  assert.equal(ui.paint('green', 'x'), '\x1b[32mx\x1b[39m');
  assert.equal(visibleLength(ui.ok('done')), '✓ done'.length);
  const table = ui.table([[ui.marker('ok'), 'a', 'z'], [ui.marker('fail'), 'bbb', 'z']]);
  const lines = table.trimEnd().split('\n').map((l) => l.replace(/\x1b\[[0-9;]*m/g, ''));
  assert.deepEqual(lines, ['  ✓  a    z', '  ✗  bbb  z']);
  assert.equal(modeText(0o100600), '0600');
  assert.equal(modeText(undefined), '');
});

test('spinner is silent without a TTY and erases itself on a TTY', async () => {
  const quiet = collector();
  createUi({ color: false, tty: false, unicode: true }).spinner(quiet.stream, 'Working').stop();
  assert.equal(quiet.text(), '');
  const loud = collector();
  const spinner = createUi({ color: false, tty: true, unicode: false }).spinner(loud.stream, 'Working');
  await new Promise((r) => setTimeout(r, 180));
  spinner.stop();
  spinner.stop();
  const text = loud.text();
  assert.ok(text.includes('Working'));
  assert.ok(text.endsWith('\r\x1b[2K'), 'the line is cleared exactly once when stopped');
  assert.ok(text.includes('\r\x1b[2K- Working') && text.includes('\r\x1b[2K\\ Working'), 'ASCII frames advance');
});
