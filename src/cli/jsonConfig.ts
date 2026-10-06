import { isDeepStrictEqual } from 'node:util';

export type JsonObject = Record<string, unknown>;
export type JsonPlan =
  | { readonly ok: true; readonly changed: boolean; readonly text: string; readonly previous: unknown }
  | { readonly ok: false; readonly reason: string };

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** True when the text contains // or /* comments outside of JSON strings. */
export function hasJsonComments(text: string): boolean {
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (c === '\\') i++;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === '/' && (text[i + 1] === '/' || text[i + 1] === '*')) return true;
  }
  return false;
}

/**
 * Plan a merge of one named server entry into `root[rootKey]`, preserving all other keys.
 * `value === undefined` removes the entry. JSONC (comments) is never rewritten, because
 * rewriting would silently drop the user's comments; the caller prints a snippet instead.
 */
export function planJsonEntry(text: string | undefined, rootKey: string, name: string, value: unknown): JsonPlan {
  let root: unknown = {};
  if (text !== undefined && text.trim() !== '') {
    try {
      root = JSON.parse(text.replace(/^﻿/, ''));
    } catch {
      return { ok: false, reason: hasJsonComments(text)
        ? 'file contains comments (JSONC); not rewritten so your comments are preserved'
        : 'file is not valid JSON; not rewritten' };
    }
  }
  if (!isObject(root)) return { ok: false, reason: 'file root is not a JSON object; not rewritten' };
  const section = root[rootKey];
  if (section !== undefined && !isObject(section)) return { ok: false, reason: `"${rootKey}" is not an object; not rewritten` };
  const previous = section?.[name];
  if (value === undefined) {
    if (section === undefined || !Object.hasOwn(section, name)) return { ok: true, changed: false, text: text ?? '', previous };
    const { [name]: _removed, ...rest } = section;
    return { ok: true, changed: true, text: JSON.stringify({ ...root, [rootKey]: rest }, null, 2) + '\n', previous };
  }
  if (previous !== undefined && isDeepStrictEqual(previous, value)) return { ok: true, changed: false, text: text ?? '', previous };
  const next: JsonObject = { ...root, [rootKey]: { ...(section ?? {}), [name]: value } };
  return { ok: true, changed: true, text: JSON.stringify(next, null, 2) + '\n', previous };
}
