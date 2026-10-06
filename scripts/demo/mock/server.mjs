import https from 'node:https';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { readFileSync, appendFileSync } from 'node:fs';

const file = name => new URL(name, import.meta.url);
const publicToken = process.env.MOCK_PUBLIC_TOKEN ?? 'mock-public-token';
const privateToken = process.env.MOCK_PRIVATE_TOKEN ?? 'mock-private-token';
const encoding = process.env.MOCK_QUERY_SIGNATURE_ENCODING ?? 'encoded';
if (!['encoded', 'decoded'].includes(encoding)) throw new Error('MOCK_QUERY_SIGNATURE_ENCODING must be encoded or decoded');
const rfc3986 = s => encodeURIComponent(s).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
const routes = JSON.parse(readFileSync(file('routes.json'), 'utf8')).map(r => ({
  ...r,
  regex: new RegExp('^' + r.path.split('/').map(s => s.startsWith('{') ? '[^/]+' : s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('/') + '$'),
})).sort((a,b) => (a.path.match(/\{/g)?.length ?? 0) - (b.path.match(/\{/g)?.length ?? 0));

function dateMillis(date) {
  const match = /^(\d{4})(?:-?(\d{2}))-?(\d{2})[T ](\d{2}):?(\d{2}):?(\d{2})$/.exec(date ?? '');
  if (!match || !/^(?:\d{8}T\d{6}|\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})$/.test(date)) return NaN;
  const [,y,m,d,h,min,s] = match;
  const iso = `${y}-${m}-${d}T${h}:${min}:${s}Z`;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0,19) === iso.slice(0,19) ? ms : NaN;
}
function authenticated(req, path, query, body) {
  const token = req.headers['dtapi-token'];
  const date = req.headers['dtapi-date'];
  const signature = req.headers['dtapi-signature'];
  if (token !== publicToken || typeof date !== 'string' || typeof signature !== 'string' || !/^[a-fA-F0-9]{40}$/.test(signature)) return false;
  const ms = dateMillis(date);
  if (!Number.isFinite(ms) || Math.abs(Date.now() - ms) > 300_000) return false;
  const encode = encoding === 'encoded' ? rfc3986 : s => s;
  const text = [...query].map(([k,v]) => `${encode(k)}=${encode(v)}`).join('&');
  let payload = path + (text ? '?' + text : '');
  if (req.method === 'POST' && body.length) payload += (text ? '&' : '?') + body.toString('utf8');
  const expected = createHmac('sha1', privateToken).update(`${payload}\n${token}\n${date}`).digest();
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}
const json = (res, status, value) => {
  res.writeHead(status, {'Content-Type':'application/json'});
  res.end(JSON.stringify(value));
};
// A valid little-endian PCAP global header followed by one Ethernet packet.
const packet = Buffer.from('ffffffffffff02000000000108004500001400000000400100000a0000010a000002','hex');
const pcap = Buffer.alloc(24 + 16 + packet.length);
pcap.writeUInt32LE(0xa1b2c3d4,0); pcap.writeUInt16LE(2,4); pcap.writeUInt16LE(4,6);
pcap.writeUInt32LE(65535,16); pcap.writeUInt32LE(1,20);
pcap.writeUInt32LE(1791280800,24); pcap.writeUInt32LE(packet.length,32); pcap.writeUInt32LE(packet.length,36); packet.copy(pcap,40);

const server = https.createServer({key:readFileSync(file('server-key.pem')),cert:readFileSync(file('server.pem'))}, async (req,res) => {
  let path, query;
  try {
    // Preserve the encoded path exactly, as signer.ts does.
    const [rawPath, ...rest] = req.url.split('?');
    path = rawPath; query = new URLSearchParams(rest.join('?'));
    let size = 0; const chunks = [];
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 4 * 1024 * 1024) { json(res,413,{error:'Body too large'}); return; }
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);
    const log = status => appendFileSync(file('requests.log'),JSON.stringify({time:new Date().toISOString(),method:req.method,path,query:[...query],status})+'\n');
    if (!authenticated(req,path,query,body)) { log(401); json(res,401,{error:'Invalid token, date or signature'}); return; }
    const route = routes.find(r => r.method === req.method && r.regex.test(path));
    if (!route) { log(404); json(res,404,{error:'Unknown route'}); return; }
    if (req.method === 'POST' || req.method === 'DELETE') {
      let parsed = body.length ? body.toString('utf8') : null;
      if (body.length && req.headers['content-type']?.startsWith('application/json')) {
        try { parsed = JSON.parse(parsed); } catch { log(400); json(res,400,{error:'Invalid JSON'}); return; }
      }
      appendFileSync(file('writes.log'),JSON.stringify({method:req.method,path,query:[...query],body:parsed})+'\n');
      log(200);
      // Advanced Search is a read-like POST but is still audited as a write.
      json(res,200,path === '/advancedsearch/api/search' ? {success:true,...routes.find(r=>r.path==='/advancedsearch/api/search/{query}').fixture} : {success:true});
      return;
    }
    log(200);
    if (route.path === '/pcaps/{filename}') {
      res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Length':pcap.length}); res.end(pcap); return;
    }
    let result = structuredClone(route.fixture);
    if (route.path === '/pcaps') result = [{filename:'mock-capture.pcap',size:pcap.length,time:1791280800000,did:1}];
    json(res,200,result);
  } catch (error) {
    console.error('Request failed:',error.message);
    if (!res.headersSent) json(res,500,{error:'Mock server error'}); else res.destroy();
  }
});
server.listen(Number(process.env.PORT ?? 8443),process.env.DEMO_BIND ?? '127.0.0.1',() => console.log(`Darktrace mock listening on https://${server.address().address}:${server.address().port} (${routes.length} operations)`));
for (const signal of ['SIGINT','SIGTERM']) process.on(signal,() => server.close(() => process.exit(0)));
