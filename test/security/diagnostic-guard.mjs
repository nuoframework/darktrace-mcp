// Subprocess instrumentation: fail before any real DNS/socket/signing effect.
import {syncBuiltinESMExports} from 'node:module';
import dns from 'node:dns';import https from 'node:https';import http from 'node:http';import net from 'node:net';import tls from 'node:tls';import crypto from 'node:crypto';
const deny=()=>{process.stderr.write('ADVERSARIAL_FORBIDDEN_SIDE_EFFECT\n');throw new Error('synthetic side-effect guard');};
for(const key of ['lookup','resolve','resolve4','resolve6']) dns[key]=deny;
dns.Resolver.prototype.resolve4=deny;dns.Resolver.prototype.resolve6=deny;
https.request=deny;https.get=deny;http.request=deny;net.connect=deny;net.createConnection=deny;net.Server.prototype.listen=deny;tls.connect=deny;crypto.createHmac=deny;
syncBuiltinESMExports();
