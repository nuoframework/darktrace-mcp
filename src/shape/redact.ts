import { Buffer } from 'node:buffer';

const REDACTED = '[REDACTED]';

function normalizedTokens(tokens: readonly string[]): readonly string[] {
  const variants = new Set<string>();
  const addDerived = (candidate: string, original: string): void => {
    if (candidate !== original && candidate.length > 0) variants.add(candidate);
  };
  for (const token of tokens) {
    if (typeof token !== 'string' || token.length === 0) continue;
    variants.add(token);
    const escaped = JSON.stringify(token).slice(1, -1);
    if (escaped !== token) variants.add(escaped);

    const bytes = Buffer.from(token, 'utf8');
    const base64 = bytes.toString('base64');
    const base64Url = base64.replace(/\+/g, '-').replace(/\//g, '_');
    addDerived(base64, token);
    addDerived(base64.replace(/=+$/, ''), token);
    addDerived(base64Url, token);
    addDerived(base64Url.replace(/=+$/, ''), token);

    try {
      const uri = encodeURIComponent(token);
      addDerived(uri, token);
      addDerived(uri.replace(/%[0-9A-F]{2}/g, (part) => part.toLowerCase()), token);
    } catch { /* A malformed surrogate has no URI representation; the literal is still redacted. */ }
    const fullUri = [...bytes].map((byte) => `%${byte.toString(16).padStart(2, '0').toUpperCase()}`).join('');
    addDerived(fullUri, token);
    addDerived(fullUri.toLowerCase(), token);

    if (bytes.length >= 4) {
      const hex = bytes.toString('hex');
      addDerived(hex, token);
      addDerived(hex.toUpperCase(), token);
    }
  }
  return [...variants].sort((left, right) => right.length - left.length);
}

function replaceLiterals(value: string, tokens: readonly string[]): string {
  let result = value;
  for (const token of tokens) {
    result = result.split(token).join(REDACTED);
  }
  return result;
}

/** Replace configured secret literals in free text, including JSON-escaped forms. */
export function redactString(value: string, tokens: readonly string[]): string {
  return replaceLiterals(value, normalizedTokens(tokens));
}

/** Redact a JSON log while preserving JSON value types and safely serializing keys. */
export function redactJsonString(value: string, tokens: readonly string[]): string {
  const secrets = normalizedTokens(tokens);
  try {
    const parsed: unknown = JSON.parse(value);
    const cleaned = redactValues(parsed, secrets);
    return JSON.stringify(cleaned);
  } catch {
    return replaceLiterals(value, secrets);
  }
}

function redactValues(value: unknown, secrets: readonly string[]): unknown {
  const seen = new WeakMap<object, unknown>();
  const visit = (item: unknown): unknown => {
    if (typeof item === 'string') return replaceLiterals(item, secrets);
    if (item === null || typeof item !== 'object') return item;
    if (seen.has(item)) return seen.get(item);
    if (Array.isArray(item)) {
      const output: unknown[] = [];
      seen.set(item, output);
      for (const entry of item) output.push(visit(entry));
      return output;
    }
    const output: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    seen.set(item, output);
    for (const [key, entry] of Object.entries(item)) {
      output[replaceLiterals(key, secrets)] = visit(entry);
    }
    return output;
  };
  return visit(value);
}

/** Recursively redact literal tokens from JSON-compatible objects and strings. */
export function redactSecrets<T>(value: T, tokens: readonly string[]): T {
  return redactValues(value, normalizedTokens(tokens)) as T;
}
