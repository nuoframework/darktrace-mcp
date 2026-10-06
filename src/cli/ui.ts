import type { Writable } from 'node:stream';

/**
 * Terminal presentation for the installer: a plain-text banner, numbered steps, coloured markers, aligned
 * tables and a spinner. Hand-rolled ANSI, no dependency. Colour follows the usual conventions: NO_COLOR (any
 * value) disables it, FORCE_COLOR (other than 0) enables it even without a TTY, TERM=dumb and non-TTY output
 * fall back to plain text. Every element degrades to plain ASCII so narrow terminals and logs stay readable,
 * and tests inject `{ color: false, tty: false }` for byte-stable output.
 */
export interface UiOptions {
  readonly color: boolean;
  /** Output is an interactive terminal: spinners animate and are erased; otherwise they print nothing. */
  readonly tty: boolean;
  /** Unicode markers (check mark, cross, braille spinner); false on consoles that may not render them. */
  readonly unicode: boolean;
}

export function detectUi(env: NodeJS.ProcessEnv, stdout: { isTTY?: boolean }, platform: NodeJS.Platform = process.platform): UiOptions {
  const tty = stdout.isTTY === true;
  const force = env.FORCE_COLOR;
  const disabled = (env.NO_COLOR !== undefined && env.NO_COLOR !== '') || force === '0' || force?.toLowerCase() === 'false';
  const forced = force !== undefined && force !== '' && !disabled;
  const color = disabled ? false : forced ? true : tty && env.TERM !== 'dumb';
  // Legacy Windows consoles lack the glyphs; Windows Terminal, VS Code and ConEmu render them.
  const unicode = platform !== 'win32' || env.WT_SESSION !== undefined || env.TERM_PROGRAM !== undefined || env.ConEmuANSI === 'ON';
  return { color, tty, unicode };
}

export const PLAIN_UI: UiOptions = Object.freeze({ color: false, tty: false, unicode: false });

type Tone = 'green' | 'red' | 'yellow' | 'cyan' | 'bold' | 'dim';
const CODES: Readonly<Record<Tone, [string, string]>> = {
  green: ['\x1b[32m', '\x1b[39m'], red: ['\x1b[31m', '\x1b[39m'], yellow: ['\x1b[33m', '\x1b[39m'], cyan: ['\x1b[36m', '\x1b[39m'],
  bold: ['\x1b[1m', '\x1b[22m'], dim: ['\x1b[2m', '\x1b[22m'],
};

export interface Ui {
  readonly options: UiOptions;
  paint(tone: Tone, text: string): string;
  /** Title line plus one short explanatory line. Plain text only: no box drawing, nothing wider than the title. */
  banner(title: string, subtitle?: string): string;
  /** "Step 2 of 5 · Title" header. */
  step(n: number, total: number, title: string): string;
  ok(text: string): string;
  fail(text: string): string;
  warn(text: string): string;
  note(text: string): string;
  /** Marker for a result status: check, cross or a neutral dot. */
  marker(kind: 'ok' | 'fail' | 'warn' | 'info'): string;
  /** Aligned columns. Cells are padded to the widest entry of each column; the last column is never padded. */
  table(rows: ReadonlyArray<ReadonlyArray<string>>, indent?: string): string;
  /** Spinner on a TTY (erased when stopped); silent otherwise so piped and recorded output stays deterministic. */
  spinner(out: Writable, label: string): Spinner;
}
export interface Spinner { stop(): void }

const FRAMES_UNICODE = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const FRAMES_ASCII = ['-', '\\', '|', '/'];

export function createUi(options: UiOptions = PLAIN_UI): Ui {
  const paint = (tone: Tone, text: string): string => (options.color ? `${CODES[tone][0]}${text}${CODES[tone][1]}` : text);
  const marks = options.unicode ? { ok: '✓', fail: '✗', warn: '!', info: '·' } : { ok: '+', fail: 'x', warn: '!', info: '-' };
  const marker = (kind: 'ok' | 'fail' | 'warn' | 'info'): string =>
    kind === 'ok' ? paint('green', marks.ok) : kind === 'fail' ? paint('red', marks.fail) : kind === 'warn' ? paint('yellow', marks.warn) : paint('dim', marks.info);
  return {
    options, paint, marker,
    banner: (title, subtitle) => `${paint('bold', title)}\n${subtitle ? `${paint('dim', subtitle)}\n` : ''}`,
    step: (n, total, title) => `\n${paint('cyan', `Step ${n} of ${total}`)} ${paint('dim', '·')} ${paint('bold', title)}\n`,
    ok: (text) => `${marker('ok')} ${text}`,
    fail: (text) => `${marker('fail')} ${text}`,
    warn: (text) => `${marker('warn')} ${text}`,
    note: (text) => paint('dim', text),
    table: (rows, indent = '  ') => {
      const widths: number[] = [];
      for (const row of rows) row.forEach((cell, i) => { widths[i] = Math.max(widths[i] ?? 0, visibleLength(cell)); });
      return rows.map((row) => indent + row.map((cell, i) => (i === row.length - 1 ? cell : padVisible(cell, widths[i]))).join('  ').replace(/\s+$/, '') + '\n').join('');
    },
    spinner: (out, label) => {
      if (!options.tty) return { stop: () => undefined };
      const frames = options.unicode ? FRAMES_UNICODE : FRAMES_ASCII;
      let i = 0;
      const draw = (): void => { out.write(`\r\x1b[2K${paint('cyan', frames[i++ % frames.length])} ${label}`); };
      draw();
      const timer = setInterval(draw, 80);
      timer.unref?.();
      let stopped = false;
      return { stop: () => { if (stopped) return; stopped = true; clearInterval(timer); out.write('\r\x1b[2K'); } };
    },
  };
}

/** Length without ANSI escape sequences, so coloured cells align with plain ones. */
export function visibleLength(text: string): number { return text.replace(/\x1b\[[0-9;]*m/g, '').length; }
const padVisible = (text: string, width: number): string => text + ' '.repeat(Math.max(0, width - visibleLength(text)));

/** Octal mode of a file as shown in summaries, or an empty string when unknown. */
export const modeText = (mode: number | undefined): string => (mode === undefined ? '' : (mode & 0o777).toString(8).padStart(4, '0'));
