import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('production runStdio creates exactly one operation client and shares it with every server context (E8/CR-12)', () => {
  // Observe the compiled production factories in a fresh process. Do not supply runStdio's test runtime,
  // replace the client factory, or select the HTTP client's testOnly seam. Listing never contacts an appliance.
  const hook = `export async function load(url, context, nextLoad) {
    const loaded = await nextLoad(url, context);
    if (loaded.format !== 'module') return loaded;
    let source = String(loaded.source);
    for (const [suffix, pattern, observation] of [
      ['/dist/src/client/httpClient.js', /export function createHttpClient\\([^)]*\\) \\{/, 'globalThis.__scope.factories++;'],
      ['/dist/src/server/createServer.js', /export function createServer\\(ctx\\) \\{/, 'globalThis.__scope.servers++; globalThis.__scope.clients.add(ctx.client);'],
      ['/dist/src/server/stdio.js', /const client = test\\?\\.client \\?\\? createHttpClient\\(cfg, \\{ operations: productionOperationDescriptors \\}\\);/, 'globalThis.__scope.productionClient = client;']
    ]) if (url.endsWith(suffix)) {
      if (!pattern.test(source)) throw new Error('Production factory observation point changed');
      source = source.replace(pattern, match => match + observation);
    }
    return {...loaded, source};
  }`;
  const dataUrl = (source:string) => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
  const preload = dataUrl(`import {register} from 'node:module'; register(${JSON.stringify(dataUrl(hook))});`);
  const script = `
    import {PassThrough} from 'node:stream';
    globalThis.__scope = {factories:0, servers:0, clients:new Set()};
    const {runStdio} = await import('./dist/src/server/stdio.js');
    const {parseConfig} = await import('./dist/src/config/schema.js');
    const cfg = parseConfig({instance:{baseUrl:'https://appliance.example'},auth:{publicToken:'TEST_PUBLIC',privateToken:'TEST_PRIVATE'}});
    const output = process.stdout.write.bind(process.stdout), stdin = new PassThrough(), stdout = new PassThrough();
    Object.defineProperty(process, 'stdin', {value:stdin});
    Object.defineProperty(process, 'stdout', {value:stdout});
    let buffered = '', next = 0;
    const pending = new Map();
    stdout.on('data', chunk => {
      buffered += chunk;
      let end;
      while ((end = buffered.indexOf('\\n')) >= 0) {
        const frame = JSON.parse(buffered.slice(0,end)); buffered = buffered.slice(end+1);
        pending.get(frame.id)?.(frame); pending.delete(frame.id);
      }
    });
    const request = (method,params) => new Promise(resolve => {
      const id = ++next; pending.set(id,resolve);
      stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\\n');
    });
    const handle = runStdio(cfg);
    try {
      const init = await request('initialize',{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'scope-test',version:'1'}});
      if (init.error) throw new Error('Initialize failed');
      const a = await request('tools/list',{}), b = await request('tools/list',{});
      if (a.error || b.error || !a.result.tools.length || !b.result.tools.length) throw new Error('Listing failed');
    } finally { await handle.close(); }
    output(JSON.stringify({factories:__scope.factories, servers:__scope.servers, clients:__scope.clients.size,
      sharesProductionClient:__scope.clients.has(__scope.productionClient)})+'\\n');
  `;
  const child = spawnSync(process.execPath, ['--import', preload, '--input-type=module', '-e', script], {
    env: { PATH: process.env.PATH }, encoding: 'utf8', timeout: 5000,
  });
  assert.equal(child.error, undefined);
  assert.equal(child.status, 0, 'Production wiring probe failed');
  assert.equal(child.stderr, '');
  const observed = JSON.parse(child.stdout);
  assert.equal(observed.factories, 1);
  assert.ok(observed.servers >= 1);
  assert.equal(observed.clients, 1);
  assert.equal(observed.sharesProductionClient, true);
});
