// Fetch immutable, signed Alpine runtime inputs; no production files are changed.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, rmSync, renameSync, lstatSync, realpathSync, openSync, closeSync, writeSync } from 'node:fs';
import { resolve, join, dirname, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
const base='alpine@sha256:294b683cb724975bec92580e1e685676bd4b50bda910ddb8c51d4cabeaec77e6';
const repository='https://dl-cdn.alpinelinux.org/alpine/v3.24/main';
const sources=[
  {
    "origin": "nodejs",
    "url": "https://distfiles.alpinelinux.org/distfiles/v3.24/node-v24.18.1.tar.gz",
    "sha512": "a7fead0ffffe78be8338e725bccd577d6bd083d197a7fd46dd0b912dd72c60abf90e58248c40b541479157202597618a6e2e18b26c5584449e6e86b629f5fe3c",
    "licenses": [
      "node-v24.18.1/LICENSE"
    ],
    "file": "node-v24.18.1.tar.gz"
  },
  {
    "origin": "openssl",
    "url": "https://distfiles.alpinelinux.org/distfiles/v3.24/openssl-3.5.9.tar.gz",
    "sha512": "c4c8136fd2c98d13bb85a57bfb0def25c906f47f1fe97675cd114594944eab957b5b81a3e0f48826e1a0f093afff5e83766b539d49768f6db68310fd678d7de6",
    "licenses": [
      "openssl-3.5.9/LICENSE.txt",
      "openssl-3.5.9/external/perl/Text-Template-1.56/LICENSE",
      "openssl-3.5.9/util/perl/OpenSSL/copyright.pm"
    ],
    "file": "openssl-3.5.9.tar.gz"
  },
  {
    "origin": "musl",
    "url": "https://distfiles.alpinelinux.org/distfiles/v3.24/musl-1.2.6.tar.gz",
    "sha512": "1adad96eddb3a2eb0cacb3e363b0046568925fcdd75cf8b0503f2139df1f693d64730779ca0ce8131b7624ab2d37f4247bb1d3393c523de6e30d2b1d7732555c",
    "licenses": [
      "musl-1.2.6/COPYRIGHT"
    ],
    "file": "musl-1.2.6.tar.gz"
  },
  {
    "origin": "ada",
    "url": "https://distfiles.alpinelinux.org/distfiles/v3.24/ada-3.3.0.tar.gz",
    "sha512": "728bf278fcac51a8ffdf5571cb486e789cd49511674c61e354c802bbfaeea64598fb22cd28ef4b02eacdd42c1c3437f40666ca8dba8097e0ecebbae1095de77f",
    "licenses": [
      "ada-3.3.0/LICENSE-APACHE",
      "ada-3.3.0/LICENSE-MIT"
    ],
    "file": "ada-3.3.0.tar.gz"
  },
  {
    "origin": "brotli",
    "url": "https://distfiles.alpinelinux.org/distfiles/v3.24/brotli-1.2.0.tar.gz",
    "sha512": "f94542afd2ecd96cc41fd21a805a3da314281ae558c10650f3e6d9ca732b8425bba8fde312823f0a564c7de3993bdaab5b43378edab65ebb798cefb6fd702256",
    "licenses": [
      "brotli-1.2.0/LICENSE"
    ],
    "file": "brotli-1.2.0.tar.gz"
  },
  {
    "origin": "c-ares",
    "url": "https://distfiles.alpinelinux.org/distfiles/v3.24/c-ares-1.34.8.tar.gz",
    "sha512": "d5997a57fda9b3a3385b1685e6b2f9292c3a1d39bd27579acaabf3d2d33aa5e91bfec5d41c5e51ca6b50dbc1f4346d75e9bfbccf44a494fbd4bc7613b167143c",
    "licenses": [
      "c-ares-1.34.8/LICENSE.md"
    ],
    "file": "c-ares-1.34.8.tar.gz"
  },
  {
    "origin": "icu",
    "url": "https://distfiles.alpinelinux.org/distfiles/v3.24/icu4c-78.1-sources.tgz",
    "sha512": "c366398fdb50afc6355a8c45ed1d68a18eaa5f07a5d1c4555becbcfb9d4073e65ebe1e9caf24b93779b11b36cd813c98dd59e4b19f008851f25c7262811c112d",
    "licenses": [
      "icu/license.html",
      "icu/LICENSE"
    ],
    "file": "icu4c-78.1-sources.tgz"
  },
  {
    "origin": "gcc",
    "url": "https://distfiles.alpinelinux.org/distfiles/v3.24/gcc-15.2.0.tar.xz",
    "sha512": "89047a2e07bd9da265b507b516ed3635adb17491c7f4f67cf090f0bd5b3fc7f2ee6e4cc4008beef7ca884b6b71dffe2bb652b21f01a702e17b468cca2d10b2de",
    "licenses": [
      "gcc-15.2.0/include/COPYING3",
      "gcc-15.2.0/include/COPYING",
      "gcc-15.2.0/libffi/LICENSE-BUILDTOOLS",
      "gcc-15.2.0/libffi/LICENSE",
      "gcc-15.2.0/zlib/contrib/dotzlib/LICENSE_1_0.txt",
      "gcc-15.2.0/libsanitizer/LICENSE.TXT",
      "gcc-15.2.0/COPYING.RUNTIME",
      "gcc-15.2.0/libphobos/libdruntime/LICENSE.txt",
      "gcc-15.2.0/libphobos/src/LICENSE_1_0.txt",
      "gcc-15.2.0/COPYING3",
      "gcc-15.2.0/libgo/LICENSE",
      "gcc-15.2.0/libgo/go/golang.org/x/xerrors/LICENSE",
      "gcc-15.2.0/libgo/go/golang.org/x/tools/LICENSE",
      "gcc-15.2.0/libgo/go/golang.org/x/sync/LICENSE",
      "gcc-15.2.0/libgo/go/golang.org/x/mod/LICENSE",
      "gcc-15.2.0/gcc/rust/checks/errors/borrowck/ffi-polonius/vendor/rustc-hash/LICENSE-MIT",
      "gcc-15.2.0/gcc/rust/checks/errors/borrowck/ffi-polonius/vendor/rustc-hash/LICENSE-APACHE",
      "gcc-15.2.0/gcc/rust/checks/errors/borrowck/ffi-polonius/vendor/datafrog/LICENSE-MIT",
      "gcc-15.2.0/gcc/rust/checks/errors/borrowck/ffi-polonius/vendor/datafrog/LICENSE-APACHE",
      "gcc-15.2.0/gcc/rust/checks/errors/borrowck/ffi-polonius/vendor/log/LICENSE-MIT",
      "gcc-15.2.0/gcc/rust/checks/errors/borrowck/ffi-polonius/vendor/log/LICENSE-APACHE",
      "gcc-15.2.0/gcc/COPYING3",
      "gcc-15.2.0/gcc/COPYING.LIB",
      "gcc-15.2.0/gcc/testsuite/gcc.dg/vect/tsvc/license.txt",
      "gcc-15.2.0/gcc/testsuite/gcc.dg/params/LICENSE",
      "gcc-15.2.0/gcc/COPYING3.LIB",
      "gcc-15.2.0/gcc/m2/COPYING.RUNTIME",
      "gcc-15.2.0/gcc/m2/COPYING3",
      "gcc-15.2.0/gcc/m2/COPYING3.LIB",
      "gcc-15.2.0/gcc/m2/COPYING.FDL",
      "gcc-15.2.0/gcc/m2/images/LICENSE.IMG",
      "gcc-15.2.0/gcc/ada/doc/share/copyright.tex",
      "gcc-15.2.0/gcc/go/gofrontend/LICENSE",
      "gcc-15.2.0/gcc/COPYING",
      "gcc-15.2.0/COPYING.LIB",
      "gcc-15.2.0/libgcobol/LICENSE",
      "gcc-15.2.0/COPYING3.LIB",
      "gcc-15.2.0/libstdc++-v3/include/pstl/LICENSE.txt",
      "gcc-15.2.0/libstdc++-v3/doc/html/manual/license.html",
      "gcc-15.2.0/libgrust/libformat_parser/vendor/libc/LICENSE-MIT",
      "gcc-15.2.0/libgrust/libformat_parser/vendor/libc/LICENSE-APACHE",
      "gcc-15.2.0/libgrust/libformat_parser/vendor/unicode-xid/LICENSE-MIT",
      "gcc-15.2.0/libgrust/libformat_parser/vendor/unicode-xid/LICENSE-APACHE",
      "gcc-15.2.0/libgrust/libformat_parser/vendor/unicode-xid/COPYRIGHT",
      "gcc-15.2.0/libiberty/copying-lib.texi",
      "gcc-15.2.0/libiberty/COPYING.LIB",
      "gcc-15.2.0/libquadmath/COPYING.LIB",
      "gcc-15.2.0/libcody/LICENSE",
      "gcc-15.2.0/COPYING"
    ],
    "file": "gcc-15.2.0.tar.xz"
  },
  {
    "origin": "nghttp2",
    "url": "https://distfiles.alpinelinux.org/distfiles/v3.24/nghttp2-1.70.0.tar.xz",
    "sha512": "8d8a95dcd05dfe8a032b78d99b7d32a9f0ad2c952c4548de4c6b4af0d2f3c584b0a2854b31516eca20b0c9c30f20d0d040edfe9961a3084e96353012f711b9d1",
    "licenses": [
      "nghttp2-1.70.0/tests/munit/COPYING",
      "nghttp2-1.70.0/COPYING",
      "nghttp2-1.70.0/doc/_exts/rubydomain/LICENSE.rubydomain",
      "nghttp2-1.70.0/third-party/mruby/LICENSE",
      "nghttp2-1.70.0/third-party/mruby/mrbgems/mruby-set/LICENSE"
    ],
    "file": "nghttp2-1.70.0.tar.xz"
  },
  {
    "origin": "simdjson",
    "url": "https://distfiles.alpinelinux.org/distfiles/v3.24/simdjson-4.2.4.tar.gz",
    "sha512": "8a4c4b96c11f3b2b5345310ee759d989423e2484d5585056f57aa2786fed8806ac714a1ddff14da8c8bf34487ede78b9bf2f2348f4e197aa874f31fa8097b6e4",
    "licenses": [
      "simdjson-4.2.4/LICENSE",
      "simdjson-4.2.4/LICENSE-MIT"
    ],
    "file": "simdjson-4.2.4.tar.gz"
  },
  {
    "origin": "simdutf",
    "url": "https://distfiles.alpinelinux.org/distfiles/v3.24/simdutf-9.0.0.tar.gz",
    "sha512": "0c74226247cbe95368efa87ab84f5217485f16bcdf7a9def8741c6086cb86e6c378f0c437030d2be0934726e3ea9c28b5df2e593d0c654c78291c455a8d1e103",
    "licenses": [
      "simdutf-9.0.0/LICENSE-APACHE",
      "simdutf-9.0.0/LICENSE-MIT",
      "simdutf-9.0.0/benchmarks/competition/u8u16/COPYRIGHT",
      "simdutf-9.0.0/benchmarks/competition/utf8lut/LICENSE",
      "simdutf-9.0.0/benchmarks/competition/utfcpp/LICENSE"
    ],
    "file": "simdutf-9.0.0.tar.gz"
  },
  {
    "origin": "sqlite",
    "url": "https://distfiles.alpinelinux.org/distfiles/v3.24/sqlite-autoconf-3530400.tar.gz",
    "sha512": "c24374e9393a943157f533f96e89e6c5743e5f5aad169d8393cff3088ca5ccbe5cc0561681ace49c349d0fe402298ee2624d319f422967247ce0792e3b3aa01e",
    "licenses": [
      "sqlite-autoconf-3530400/autosetup/LICENSE",
      "sqlite-autoconf-3530400/sqlite3.h",
      "sqlite-autoconf-3530400/tea/license.terms"
    ],
    "file": "sqlite-autoconf-3530400.tar.gz"
  },
  {
    "origin": "zstd",
    "url": "https://distfiles.alpinelinux.org/distfiles/v3.24/zstd-1.5.7.tar.gz",
    "sha512": "26e441267305f6e58080460f96ab98645219a90d290a533410b1b0b1d2f870721c95f8384e342ee647c5e968385a5b7e30c2d04340c37f59b3e6d86762c3260c",
    "licenses": [
      "zstd-1.5.7/COPYING",
      "zstd-1.5.7/LICENSE",
      "zstd-1.5.7/build/LICENSE"
    ],
    "file": "zstd-1.5.7.tar.gz"
  },
  {
    "origin": "zlib",
    "url": "https://distfiles.alpinelinux.org/distfiles/v3.24/zlib-1.3.2.tar.gz",
    "sha512": "70963771ea5d763614278a69b474f09b7d237ef8f53b675a10fe31d9923aeef601504b35d7ebd1b1e7f347e9ebb048e6b3b47fffdf137e7bdc7e8d5eb4ec4692",
    "licenses": [
      "zlib-1.3.2/LICENSE",
      "zlib-1.3.2/contrib/dotzlib/LICENSE_1_0.txt",
      "zlib-1.3.2/contrib/minizip/LICENSE.Info-Zip"
    ],
    "file": "zlib-1.3.2.tar.gz"
  },
  {
    "origin": "ca-certificates",
    "url": "https://distfiles.alpinelinux.org/distfiles/v3.24/ca-certificates-20260909.tar.bz2",
    "file": "ca-certificates-20260909.tar.bz2",
    "sha512": "d235529da679f14e2e8df4175bc8189507add1382fe0ef8493824b07a49763a2a3af8201f43d30a0260eb8357a10bb0d7054d9b012abf3b74ecf889551cf0dd7",
    "licenses": [
      "ca-certificates-20260909/certdata.txt",
      "ca-certificates-20260909/c_rehash.c"
    ]
  }
];
const args=process.argv.slice(2);
assert.equal(args.length,2,'Usage: node scripts/prepare-docker-runtime.mjs OUTPUT_DIRECTORY amd64|arm64');
const output=resolve(args[0]), arch=args[1];assert.ok(['amd64','arm64'].includes(arch));
const dockerfile=readFileSync(new URL('../Dockerfile',import.meta.url),'utf8');
const pins=new RegExp(String.raw`COPY <<EOF /pins-${arch}\n([\s\S]*?)EOF`).exec(dockerfile)?.[1];
assert.ok(pins,'Committed architecture APK pins must exist');
const markerName='.darktrace-runtime-inputs.json';
const markerBytes=JSON.stringify({schemaVersion:1,owner:'darktrace-mcp/prepare-docker-runtime'})+'\n';
assert.ok(typeof process.getuid==='function','Preparation requires a Unix Docker host');
const uid=process.getuid(),gid=process.getgid();
function checkAncestors(target){
 let current=target;
 while(current!==dirname(current)){
  const st=lstatSync(current,{throwIfNoEntry:false});
  if(st)assert.ok(st.isDirectory()&&!st.isSymbolicLink(),`Unsafe output ancestor: ${current}`);
  current=dirname(current);
 }
}
function checkTree(dir){
 for(const e of readdirSync(dir,{withFileTypes:true})){
  const name=join(dir,e.name),st=lstatSync(name);
  assert.ok(!st.isSymbolicLink()&&(st.isDirectory()||st.isFile()),`Unsafe archive entry: ${name}`);
  assert.equal(st.uid,uid,`Archive entry must be owned by the preparing user: ${name}`);
  if(st.isDirectory())checkTree(name);
 }
}
checkAncestors(output);
if(existsSync(output)){
 const st=lstatSync(output);assert.equal(st.uid,uid,'Output directory must be owned by the preparing user');
 const marker=join(output,markerName),m=lstatSync(marker,{throwIfNoEntry:false});
 assert.ok(m?.isFile()&&!m.isSymbolicLink()&&m.uid===uid,'Refusing existing non-helper output directory');
 assert.equal(readFileSync(marker,'utf8'),markerBytes,'Invalid helper output marker');checkTree(output);
}else{
 mkdirSync(output,{recursive:true,mode:0o700});assert.equal(realpathSync(output),output,'Output must be a canonical nonsymlink path');
 writeFileSync(join(output,markerName),markerBytes,{flag:'wx',mode:0o600});
}
assert.equal(realpathSync(output),output,'Output must be a canonical nonsymlink path');
const archive=join(output,arch), downloaded=join(output,'vendor-sources');
mkdirSync(join(archive,'apks'),{recursive:true});mkdirSync(downloaded,{recursive:true});
function run(argv){const r=spawnSync(argv[0],argv.slice(1),{stdio:'inherit'});if(r.error)throw r.error;assert.equal(r.status,0,`${argv[0]} failed`);}
// apk update authenticates APKINDEX with the keys in the digest-pinned base.
// apk verify authenticates every archive; SHA-256 also rejects any revision change.
const fetchScript=`set -eu
printf '%s\n' '${repository}' > /etc/apk/repositories
apk update
cp /etc/apk/keys/* /archive/
cp /etc/apk/repositories /archive/repositories
cp /var/cache/apk/* /archive/ 2>/dev/null || true
apk fetch --recursive --output /archive/apks nodejs=24.18.1-r0 libssl3=3.5.9-r0 libcrypto3=3.5.9-r0 ca-certificates-bundle=20260909-r0
apk verify /archive/apks/*.apk
chown -R ${uid}:${gid} /archive
`;
run(['docker','run','--rm','--platform',`linux/${arch}`,'--mount',`type=bind,src=${archive},dst=/archive`,base,'sh','-ec',fetchScript]);
writeFileSync(join(archive,'SHA256SUMS'),pins);
const expected=new Map(pins.trim().split('\n').map(l=>l.split(/  /)));
assert.equal(readdirSync(join(archive,'apks')).length,expected.size);
for(const [hash,name] of expected)assert.equal(createHash('sha256').update(readFileSync(join(archive,'apks',name))).digest('hex'),hash,name);
const maximumDownloadBytes=128*1024*1024;
async function download(url,file,hash,algorithm){
 checkAncestors(dirname(file));
 const existing=lstatSync(file,{throwIfNoEntry:false});
 if(existing){assert.ok(existing.isFile()&&!existing.isSymbolicLink());assert.equal(existing.uid,uid);assert.ok(existing.size<=maximumDownloadBytes);}
 else{
  const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(120000)});assert.ok(r.ok,`${url}: ${r.status}`);
  const advertised=r.headers.get('content-length');if(advertised!==null)assert.ok(Number.isSafeInteger(Number(advertised))&&Number(advertised)>=0&&Number(advertised)<=maximumDownloadBytes,'Oversized response');
  const temporary=file+'.partial';const fd=openSync(temporary,'wx',0o600);let bytes=0;
  try{
   for await(const chunk of r.body){bytes+=chunk.length;assert.ok(bytes<=maximumDownloadBytes,'Download byte cap exceeded');let offset=0;while(offset<chunk.length)offset+=writeSync(fd,chunk,offset,chunk.length-offset);}
   closeSync(fd);assert.equal(createHash(algorithm).update(readFileSync(temporary)).digest('hex'),hash,file);renameSync(temporary,file);
  }catch(error){try{closeSync(fd);}catch{}rmSync(temporary,{force:true});throw error;}
 }
 assert.equal(createHash(algorithm).update(readFileSync(file)).digest('hex'),hash,file);
}
// Exact vendor source hashes come from the APKBUILD commits in signed .PKGINFO.
for(const source of sources){
 await download(source.url,join(downloaded,source.file),source.sha512,'sha512');
 assert.ok(source.licenses.every(m=>!m.startsWith('/')&&!m.split('/').includes('..')));
 writeFileSync(join(downloaded,`${source.origin}.members`),source.licenses.join('\n')+'\n');
}
const licenseDir=join(archive,'licenses');rmSync(licenseDir,{recursive:true,force:true});mkdirSync(licenseDir);
const extract=sources.map(s=>`mkdir -p /archive/licenses/${s.origin}; tar -xf /sources/${s.file} -C /archive/licenses/${s.origin} -T /sources/${s.origin}.members --no-same-permissions -o`).join('\n');
run(['docker','run','--rm','--user',`${uid}:${gid}`,'--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--mount',`type=bind,src=${archive},dst=/archive`,'--mount',`type=bind,src=${downloaded},dst=/sources,readonly`,base,'sh','-ec','set -eu\n'+extract]);
renameSync(join(licenseDir,'nodejs/node-v24.18.1/LICENSE'),join(licenseDir,'nodejs/LICENSE'));rmSync(join(licenseDir,'nodejs/node-v24.18.1'),{recursive:true});
const sqlite=join(licenseDir,'sqlite/sqlite-autoconf-3530400/sqlite3.h');const text=readFileSync(sqlite,'utf8');writeFileSync(join(dirname(sqlite),'public-domain-NOTICE.txt'),text.slice(0,text.indexOf('*/')+2)+'\n');rmSync(sqlite);
const ca=join(licenseDir,'ca-certificates/ca-certificates-20260909');
writeFileSync(join(licenseDir,'ca-certificates/Mozilla-NOTICE.txt'),readFileSync(join(ca,'certdata.txt'),'utf8').split('\n\n')[0]+'\n');
writeFileSync(join(licenseDir,'ca-certificates/MIT-NOTICE.txt'),readFileSync(join(ca,'c_rehash.c'),'utf8').split('*/')[0]+'*/\n');rmSync(ca,{recursive:true});
await download('https://raw.githubusercontent.com/spdx/license-list-data/v3.27.0/text/MPL-2.0.txt',join(licenseDir,'MPL-2.0.txt'),'66a3107d5ad6a058aab753eaac2047ccb2ed0e39465dd0fe5844da3e300d5172','sha256');
function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(dir,e.name)):[join(dir,e.name)]);}
const licensePins=files(licenseDir).sort().map(f=>createHash('sha256').update(readFileSync(f)).digest('hex')+'  '+relative(licenseDir,f)+'\n').join('');
assert.equal(createHash('sha256').update(licensePins).digest('hex'),'ff0b7ab3ad3b2b0fdee3b6b4112b878ebabbcef661c0818c74a72660b719ad7f','License inventory mismatch');
writeFileSync(join(archive,'LICENSE-SHA256SUMS'),licensePins);
console.log(`Verified archived inputs: ${archive}`);
console.log(`docker buildx build --platform linux/${arch} --build-context runtime-apks=${archive} --load --tag darktrace-mcp:local .`);
