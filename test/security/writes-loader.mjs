// Test-only observational loader. Production source is never edited. Fail if an
// observation point drifts, rather than silently treating missing spies as zero.
export async function load(url, context, nextLoad) {
  const loaded = await nextLoad(url, context);
  if (loaded.format !== 'module' || !url.includes('/dist/src/')) return loaded;
  let source = String(loaded.source);
  for (const [suffix, marker, counter] of [
    ['/api/operations.js', 'export function buildRequest(op, args, signal) {', 'builder'],
    ['/client/signer.js', 'sign(input) {', 'signer'],
  ]) if (url.endsWith(suffix)) {
    if (!source.includes(marker)) throw new Error('Write observation point changed: ' + suffix);
    source = source.replace(marker, marker + ` globalThis.__writeSpies && globalThis.__writeSpies.${counter}++;`);
  }
  if (url.endsWith('/client/httpClient.js')) {
    const marker = 'const bytes = new Uint8Array(total);';
    if (!source.includes(marker)) throw new Error('Write buffer observation point changed');
    source = source.replace(marker, marker + ' globalThis.__writeBufferPeaks?.push(bytes.byteLength + chunks.reduce((n, chunk) => n + chunk.byteLength, 0));');
  }
  if (process.env.AD_W_FAKE_TRANSPORT === '1' && url.endsWith('/client/httpClient.js'))
    source = source.replaceAll("'./httpsConnector.js'", JSON.stringify(new URL('./writes-transport.mjs', import.meta.url).href));
  return { ...loaded, source };
}
