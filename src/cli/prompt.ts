import readline from 'node:readline';
import type { Readable, Writable } from 'node:stream';

export interface Prompter {
  ask(question: string): Promise<string>;
  /** Read a value without echoing it. */
  secret(question: string): Promise<string>;
  close(): void;
}

export class PromptAbortedError extends Error {
  constructor() { super('input ended before setup finished'); this.name = 'PromptAbortedError'; }
}

/** Interactive prompter. Secret answers are never echoed and never kept in readline history. */
export function createTtyPrompter(input: Readable, output: Writable): Prompter {
  /** While set, only this prompt (and line breaks) reach the terminal; typed characters never do. */
  let mutedPrompt: string | undefined;
  let pending: ((error: Error) => void) | undefined;
  const rl = readline.createInterface({ input, output, terminal: true, historySize: 0 });
  const internals = rl as unknown as { _writeToOutput?: (text: string) => void };
  const original = internals._writeToOutput?.bind(rl);
  internals._writeToOutput = (text: string) => {
    if (mutedPrompt === undefined) original?.(text);
    else if (text.startsWith(mutedPrompt)) output.write(mutedPrompt);
    else if (/[\r\n]/.test(text)) output.write('\n');
  };
  rl.on('close', () => { pending?.(new PromptAbortedError()); pending = undefined; });
  // Raw-mode readline only pauses on Ctrl-C by default; abort setup instead.
  rl.on('SIGINT', () => { output.write('\n'); rl.close(); });
  const question = (q: string): Promise<string> => new Promise((resolve, reject) => {
    pending = reject;
    rl.question(q, (answer) => { pending = undefined; resolve(answer); });
  });
  return {
    ask: (q) => question(q),
    async secret(q) {
      mutedPrompt = q;
      try { return await question(q); } finally { mutedPrompt = undefined; }
    },
    close: () => { rl.close(); },
  };
}

/** Prompter over pre-read lines (piped stdin or tests). Prompts go to `output`; answers are not echoed. */
export function createLinePrompter(lines: readonly string[], output?: Writable): Prompter {
  const queue = [...lines];
  const next = async (q: string, echo: boolean): Promise<string> => {
    output?.write(q);
    const value = queue.shift();
    if (value === undefined) throw new PromptAbortedError();
    output?.write(echo ? value + '\n' : '\n');
    return value;
  };
  return { ask: (q) => next(q, true), secret: (q) => next(q, false), close: () => undefined };
}

/** Read all of stdin as lines, bounded so a runaway pipe cannot exhaust memory. */
export async function readStdinLines(stream: Readable, maxBytes = 65_536): Promise<string[]> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of stream) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    total += buffer.length;
    if (total > maxBytes) throw new Error('standard input exceeds the setup input limit');
    chunks.push(buffer);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  const lines = text.split(/\r?\n/);
  if (lines.at(-1) === '') lines.pop();
  return lines;
}
