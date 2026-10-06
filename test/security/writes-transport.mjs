// Used ONLY by the real-entrypoint subprocess loader. A request still runs the
// production builder, client, signer and bounded response reader; no socket.
export class DestinationPolicyError extends Error {}
export class NodeHttpsConnector {
  async initialize() { globalThis.__writeSpies.connector++; }
  async request(request) {
    globalThis.__writeSpies.http++;
    process.stderr.write(JSON.stringify({ adWriteWire: true, operationPath: request.url.pathname,
      method: request.method, body: request.body ? Buffer.from(request.body).toString('utf8') : null }) + '\n');
    return { status: 200, headers: new Headers({ 'content-type': 'application/json' }),
      body: Object.assign((async function* () { yield Buffer.from('{"status":"SUCCESS"}'); })(), { async cancel() {} }) };
  }
  close() {}
}
