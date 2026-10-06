import { register, syncBuiltinESMExports } from 'node:module';
import dns from 'node:dns';
import dnsPromises from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';
import crypto from 'node:crypto';
export const effects = globalThis.__writeSpies = { builder: 0, signer: 0, hmac: 0, dns: 0, socket: 0, connector: 0, http: 0 };
globalThis.__writeHmacInputs = [];
globalThis.__writeBufferPeaks = [];
const realHmac = crypto.createHmac;
crypto.createHmac = (...args) => {
  effects.hmac++;
  const instance = realHmac(...args), originalUpdate = instance.update;
  instance.update = function (value, ...rest) {
    globalThis.__writeHmacInputs.push(typeof value === 'string' ? value : Buffer.from(value).toString('utf8'));
    return originalUpdate.call(this, value, ...rest);
  };
  return instance;
};
const deny = kind => () => { effects[kind]++; throw new Error('AD_W forbidden native ' + kind); };
for (const mod of [dns, dnsPromises]) for (const key of ['lookup', 'resolve', 'resolve4', 'resolve6']) mod[key] = deny('dns');
for (const Resolver of [dns.Resolver, dnsPromises.Resolver]) for (const key of ['resolve', 'resolve4', 'resolve6']) Resolver.prototype[key] = deny('dns');
for (const [mod, keys] of [[http, ['request', 'get']], [https, ['request', 'get']], [net, ['connect', 'createConnection']], [tls, ['connect']]])
  for (const key of keys) mod[key] = deny('socket');
net.Socket.prototype.connect = deny('socket');
net.Server.prototype.listen = deny('socket');
syncBuiltinESMExports();
register('./writes-loader.mjs', import.meta.url);
if (process.env.AD_W_FAKE_TRANSPORT === '1') process.on('exit', () => process.stderr.write(JSON.stringify({ adWriteEffects: effects }) + '\n'));
