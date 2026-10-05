import assert from 'node:assert/strict';
import test from 'node:test';
import { parseConfig } from '../../src/config/schema.js';
import { NodeHttpsConnector, createPinnedLookup, createPinnedTlsOptions, DestinationPolicyError, type ResolvedAddress } from '../../src/client/httpsConnector.js';
import { createHttpClient, type TrustedOperation } from '../../src/client/httpClient.js';

const origin = new URL('https://appliance.example:8443');
const operations: readonly TrustedOperation[] = [{ operationId: 'get_status', method: 'GET', pathTemplate: '/status' }];

function config(overrides: Record<string, unknown> = {}) {
  return parseConfig({
    instance: { baseUrl: origin.origin },
    auth: { publicToken: 'public', privateToken: 'private' },
    ...overrides,
  });
}

test('connector resolves startup A/AAAA answers once, normalizes mapped IPv4, freezes snapshot', async () => {
  let calls = 0;
  const answers: readonly ResolvedAddress[] = [
    { address: '10.10.0.4', family: 4 },
    { address: 'fd12:3456::1', family: 6 },
    { address: '::ffff:10.10.0.5', family: 6 },
  ];
  const connector = new NodeHttpsConnector(origin, undefined, async (_hostname, signal) => {
    calls += 1;
    assert.equal(signal.aborted, false);
    return answers;
  });
  const controller = new AbortController();
  await connector.initialize(controller.signal);
  await connector.initialize(controller.signal);
  assert.equal(calls, 1);
  assert.deepEqual(connector.pinnedAddresses, [
    { address: '10.10.0.4', family: 4 },
    { address: 'fd12:3456::1', family: 6 },
    { address: '10.10.0.5', family: 4 },
  ]);
  assert.equal(Object.isFrozen(connector.pinnedAddresses), true);
  connector.close();
});

test('every answer is validated and an optional IP allowlist must include every result', async () => {
  for (const address of ['127.0.0.1', '169.254.169.254', '224.0.0.1', '0.0.0.0', '::', '::1', 'fe80::1', 'ff02::1', 'fd00:ec2::254', 'not-an-ip']) {
    const connector = new NodeHttpsConnector(origin, undefined, async () => [{ address }]);
    await assert.rejects(connector.initialize(new AbortController().signal), DestinationPolicyError, address);
    connector.close();
  }
  const mixed = new NodeHttpsConnector(origin, ['10.0.0.4'], async () => [
    { address: '10.0.0.4', family: 4 }, { address: '192.0.2.1', family: 4 },
  ]);
  await assert.rejects(mixed.initialize(new AbortController().signal), DestinationPolicyError);
  mixed.close();

  const allowlisted = new NodeHttpsConnector(new URL('https://appliance.example'), ['10.0.0.4'], async () => [
    { address: '10.0.0.4', family: 4 },
  ]);
  await allowlisted.initialize(new AbortController().signal);
  assert.deepEqual(allowlisted.pinnedAddresses, [{ address: '10.0.0.4', family: 4 }]);
  allowlisted.close();
});

test('IPv4-in-IPv6 transition and metadata destinations are denied before signing or opening a socket', async () => {
  const denied = [
    '::7f00:1',                         // IPv4-compatible prefix ::/96
    '::808:808',                        // IPv4-compatible prefix, otherwise public IPv4
    '64:ff9b::a9fe:a9fe',               // Entire RFC 6052 well-known NAT64 /96
    '64:ff9b::808:808',                 // Same prefix, otherwise public IPv4
    '64:ff9b:1:6464:64:c800::',         // RFC 8215 local-use prefix -> 100.100.100.200
    '64:ff9b:1:a00:a9:fea9:fe00:0',     // Entire local-use /48, embedded metadata
    '64:ff9b:1:a00:7f:1:0:0',           // Entire local-use /48, embedded loopback
    '2002:a9fe:a9fe::',                 // 6to4 -> 169.254.169.254
    '2002:808:808::',                   // Entire 6to4 /16, otherwise public IPv4
    '::ffff:0:1',                      // IPv4-mapped 0.0.0.1
    '::ffff:0:a9fe:a9fe',              // IPv4-translated prefix ::ffff:0:0/96
    '::ffff:0:808:808',                // Same translated prefix, otherwise public IPv4
    '2001:0:4136:e378:8000:63bf:3fff:fdd2', // Teredo transition prefix
    'fec0::1',                          // obsolete site-local
    '100.100.100.200',                 // Alibaba metadata
  ];
  for (const address of denied) {
    for (const allowlist of [undefined, [address]] as const) {
      let signCalls = 0;
      let socketCalls = 0;
      const inner = new NodeHttpsConnector(origin, allowlist, async () => [{ address }]);
      const connector = {
        initialize: inner.initialize.bind(inner),
        async request() { socketCalls += 1; throw new Error('socket must not open'); },
        close: inner.close.bind(inner),
      };
      const client = createHttpClient(config(), {
        testOnly: true,
        operations,
        connector,
        signer: { sign() { signCalls += 1; throw new Error('must not sign'); } },
      });
      await assert.rejects(client.send({ operationId: 'get_status' }), (error: unknown) => (error as { kind?: string }).kind === 'network', address);
      assert.equal(signCalls, 0, address);
      assert.equal(socketCalls, 0, address);
      client.close();
    }
  }

  for (const address of ['10.20.30.40', '192.168.1.9', '172.20.3.4', 'fd12:3456::1', 'fc00::9', '8.8.8.8', '::ffff:10.20.30.40']) {
    const connector = new NodeHttpsConnector(origin, undefined, async () => [{ address }]);
    await connector.initialize(new AbortController().signal);
    const pinned = connector.pinnedAddresses;
    assert.ok(pinned);
    assert.equal(pinned.length, 1, address);
    connector.close();
  }
});

test('custom agent lookup serves only the frozen snapshot and refuses another hostname', async () => {
  const lookup = createPinnedLookup('appliance.example', [
    { address: '10.0.0.4', family: 4 }, { address: 'fd12:3456::1', family: 6 },
  ]);
  const all = await new Promise<readonly ResolvedAddress[]>((resolve, reject) => {
    (lookup as unknown as (host: string, options: { all: true }, callback: (error: Error | null, addresses?: readonly ResolvedAddress[]) => void) => void)(
      'appliance.example', { all: true }, (error, addresses) => error ? reject(error) : resolve(addresses ?? []),
    );
  });
  assert.deepEqual(all, [{ address: '10.0.0.4', family: 4 }, { address: 'fd12:3456::1', family: 6 }]);
  await assert.rejects(new Promise<void>((resolve, reject) => {
    (lookup as unknown as (host: string, options: { all: false }, callback: (error: Error | null) => void) => void)(
      'elsewhere.example', { all: false }, (error) => error ? reject(error) : resolve(),
    );
  }), /pinned destination/);
});

test('TLS options require verification, keep DNS SNI, and check IP origins against IP SANs', () => {
  const dnsTls = createPinnedTlsOptions('appliance.example');
  assert.equal(dnsTls.rejectUnauthorized, true);
  assert.equal(dnsTls.servername, 'appliance.example');
  assert.ok(dnsTls.checkServerIdentity);
  const dnsCert = { subjectaltname: 'DNS:appliance.example' } as never;
  assert.equal(dnsTls.checkServerIdentity?.('socket-ip-is-pinned.example', dnsCert), undefined);
  const badDnsCert = { subjectaltname: 'DNS:other.example' } as never;
  assert.ok(dnsTls.checkServerIdentity?.('appliance.example', badDnsCert) instanceof Error);

  const ipTls = createPinnedTlsOptions('10.20.30.40');
  assert.equal(ipTls.rejectUnauthorized, true);
  assert.equal(ipTls.servername, undefined);
  assert.equal(ipTls.checkServerIdentity?.('10.20.30.40', { subjectaltname: 'IP Address:10.20.30.40' } as never), undefined);
  assert.ok(ipTls.checkServerIdentity?.('10.20.30.40', { subjectaltname: 'IP Address:10.20.30.41' } as never) instanceof Error);
});

test('aborting initial DNS cancels the resolver and prevents signing or fallback attempts', async () => {
  let signerCalls = 0;
  let resolverCalls = 0;
  let observedAbort = false;
  const client = createHttpClient(config(), {
    testOnly: true,
    operations,
    resolver: async (_hostname, signal) => {
      resolverCalls += 1;
      return await new Promise<readonly ResolvedAddress[]>((_resolve, reject) => {
        signal.addEventListener('abort', () => { observedAbort = true; reject(new Error('aborted')); }, { once: true });
      });
    },
    signer: { sign() { signerCalls += 1; throw new Error('should not sign'); } },
  });
  const controller = new AbortController();
  const pending = client.send({ operationId: 'get_status' }, { signal: controller.signal });
  await new Promise((resolve) => setImmediate(resolve));
  const concurrent = client.send({ operationId: 'get_status' });
  await new Promise((resolve) => setImmediate(resolve));
  controller.abort();
  await assert.rejects(pending, (error: unknown) => (error as { kind?: string }).kind === 'cancelled');
  await assert.rejects(concurrent, (error: unknown) => (error as { kind?: string }).kind === 'network');
  assert.equal(observedAbort, true);
  await assert.rejects(client.send({ operationId: 'get_status' }), (error: unknown) => (error as { kind?: string }).kind === 'network');
  assert.equal(resolverCalls, 1);
  assert.equal(signerCalls, 0);
  client.close();
});

test('DNS policy failure never reaches signer and is not retried', async () => {
  let signerCalls = 0;
  let resolverCalls = 0;
  const client = createHttpClient(config(), {
    testOnly: true,
    operations,
    resolver: async () => { resolverCalls += 1; return [{ address: '127.0.0.1', family: 4 }]; },
    signer: { sign() { signerCalls += 1; throw new Error('should not sign'); } },
  });
  await assert.rejects(client.send({ operationId: 'get_status' }), (error: unknown) => (error as { kind?: string }).kind === 'network');
  await assert.rejects(client.send({ operationId: 'get_status' }), (error: unknown) => (error as { kind?: string }).kind === 'network');
  assert.equal(resolverCalls, 1);
  assert.equal(signerCalls, 0);
  client.close();
});
