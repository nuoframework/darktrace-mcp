# syntax=docker/dockerfile:1@sha256:4edf897a3ffa55b89f906fc8cc78afdb3f1834cc9c7083565e611a8a7d5fe99e
# Keep the official Node base immutable in every stage.
FROM node:22-bookworm-slim@sha256:43ac6c60b8f89723f746e8a92ce91abd5017e627ce1ddfe4238355d3a30b772c AS build
WORKDIR /build
COPY package.json package-lock.json npm-shrinkwrap.json ./
RUN npm ci --ignore-scripts
COPY tsconfig.json tsconfig.generate.json ./
COPY scripts/build.mjs scripts/generate-catalogue.ts ./scripts/
COPY src/ ./src/
COPY openapi/darktrace-threat-visualizer.yaml openapi/darktrace-sdk.yaml ./openapi/
COPY docs/operation-inventory.json ./docs/
RUN npm run build
RUN printf '{"type":"module"}\n' > /build/runtime-package.json

FROM node:22-bookworm-slim@sha256:43ac6c60b8f89723f746e8a92ce91abd5017e627ce1ddfe4238355d3a30b772c AS production-deps
WORKDIR /install
COPY package.json package-lock.json npm-shrinkwrap.json ./
RUN npm ci --ignore-scripts --omit=dev && npm cache clean --force

# Signed, archived Alpine main APKs are supplied as a named build context.
# Build with --build-context runtime-apks=/path/to/<architecture>/archive.
FROM alpine@sha256:294b683cb724975bec92580e1e685676bd4b50bda910ddb8c51d4cabeaec77e6 AS vendor-runtime
ARG TARGETARCH
COPY --from=runtime-apks /apks/ /apks/
COPY <<EOF /pins-amd64
b52b68118ed5ef4e59547e6d5dd29630e4ac33fa30e48b2795d78441ce925466  ada-libs-3.3.0-r0.apk
f0823de7c6d45859aeb6a7facfc5cfbf2dadb83ad4f27c794cb6ecc74e578cee  brotli-libs-1.2.0-r1.apk
0e626fa97cf937fda7bba4ed4dde8e2f2dbb5083ac34e02180cec0c4eba9351b  busybox-1.37.0-r31.apk
93f803ae5db6b729c0f66f4afba6e907ccc17d7d5f8b8c3d25bdb4636de2c48a  busybox-binsh-1.37.0-r31.apk
123fdeadc5ec884b897787f98d865492bf70402697b251cd1f3591a00b8c9d73  c-ares-1.34.8-r0.apk
d33f9058111586cea83cb3cca78d24efb36a45e6466fd0228f66e791f1cb79ed  ca-certificates-20260909-r0.apk
a35f8cf2366d90294d0bb089af565fd17f3fa03721e61bcc7f02ed3d8334e7ea  ca-certificates-bundle-20260909-r0.apk
7fc4d3abd06b6e3301c82e9f872e4555d4a41e2abc28087f4286aba01e5dd5a7  icu-data-en-78.1-r0.apk
ef9a3035f23886cf0da5869902c736a775cf3db151ae1ab7f1406e2a0f84bd64  icu-libs-78.1-r0.apk
6632d758d8f5e9ea3b650fe966f23bbf9a202f8b8dceecac93da135dec5e3689  libcrypto3-3.5.9-r0.apk
393dcd32629f06d7d85409c272d142d0c082772d10b87ef55ee82f47de3be637  libgcc-15.2.0-r5.apk
05e3393fb95aa5751ca2f9d242f659f6cff82c1cc7767cc2df4a086f7ad01877  libssl3-3.5.9-r0.apk
14c987b556f5385a5db18376e788c75f37d85321b8dc1920d926ea7daac1d6f6  libstdc++-15.2.0-r5.apk
573712e2f49c15bfc20a2699f204acdfc74c772722b15e7353d768057fae0e71  musl-1.2.6-r2.apk
f0c4014eb2f10308dcdfd84cd49c121673c7b78cb8182b6e7a1388d8ae112a3b  nghttp2-libs-1.70.0-r0.apk
e02ef91fb73a6d96e0c0ba3945b1069651c981528cef483f2f94a62715939d19  nodejs-24.18.1-r0.apk
b57ae504ace2b17f62da0de606d1d982d4a35ba9e3dd589c8a37f1444f84f535  simdjson-4.2.4-r0.apk
5d286fce7f98524973e72a1e50a89dfc2043d37565b9ee5266968c5ee64e20c6  simdutf-9.0.0-r0.apk
a8a216e53d22faa3f04d2e3650c1991af66f8d0b42fadff5afcdb9afb60b19e5  sqlite-libs-3.53.4-r0.apk
e578a140670e4cf9816117b0c2063632bf3754ecbe8fa593a7fd2b4039372bf0  ssl_client-1.37.0-r31.apk
b636306cbf8a0c15493b38de608ba11605fd8f11ade631f5ece6f7fdf5a1e09e  zlib-1.3.2-r0.apk
23c6065b0049b2406441564bcf0032515a43f78e80d76fcb85535a3803ef5d4e  zstd-libs-1.5.7-r2.apk
EOF
COPY <<EOF /pins-arm64
70dd9fe3d2e2153213a93f7a76cef202b2d939839696a7c4d8a4c97cb29cca04  ada-libs-3.3.0-r0.apk
e0e7a7892f28326a9f18e09607b1aea72baedda470bc4e3d2b11262b9ae5dda3  brotli-libs-1.2.0-r1.apk
18e3490a6f024004b2b13dd4b54bd50ccd82894938023b2d4eab389a4edcba70  busybox-1.37.0-r31.apk
f3a1b2257cfa114ff20de05c665f380695385d589908bfc9af5768f39fef9ef5  busybox-binsh-1.37.0-r31.apk
689603d300dc56f0b99e313506e4d7b3a3ffb87cec536324f8a306bc218afe67  c-ares-1.34.8-r0.apk
66e0a1de0218b95e37d8aa950bb7d608b8d5158793b79b3f980c3156c999603b  ca-certificates-20260909-r0.apk
81a2c508dcdb3295196e6a8987274e3bc3487f99ad8d18e985f20bb2c336b5e6  ca-certificates-bundle-20260909-r0.apk
3fa1dfb91a081f73c32a46f6ec054196caa37c9fd9569c433ddf6b29415dcf13  icu-data-en-78.1-r0.apk
2393882dcf1e3f5be98696665c3468dd0d2a85cd568d50abd232729863df9738  icu-libs-78.1-r0.apk
2676a2b0b6e23ea2edccf3ee982b9842a665d52603d047de3d0a185dc316d983  libcrypto3-3.5.9-r0.apk
369aaa6e9d099a737bad6dd3e6c2fe7bb1547ca26d22b94ee0411228f709b403  libgcc-15.2.0-r5.apk
20ac252b276d73f2c69c1d25f84537c7fba81caefc026c6be1094b394af2082e  libssl3-3.5.9-r0.apk
2302e766d4e4926038ec166ecb85837ee884576115236ddb565e3a5fca4a11d7  libstdc++-15.2.0-r5.apk
5e9674b7f41152fe2119093b5cb4c13eaaadb19c2d5422b2d7267913e663ee6e  musl-1.2.6-r2.apk
7ef451f4dcdc065aa872c2f3c78b9d9bb4348caa5bcc70dee0c9e1fcf8e4c1fd  nghttp2-libs-1.70.0-r0.apk
73bb381ae2387f3e5ee661ee23628bb25e6aba5c7c82b54fd6e869be2edb4071  nodejs-24.18.1-r0.apk
8e35f0644c8157c0d5ccdaaf001e70bb6640777b1b680e714e6a453d178829fd  simdjson-4.2.4-r0.apk
336f5dfe8b0f784462cbccb4b58f71c15d64388c784ebca8568c8615b6f3c6b2  simdutf-9.0.0-r0.apk
b39d8d73c1208838a436f2d481ba605b52a095f8d6ff781556eafc81cd1a13e9  sqlite-libs-3.53.4-r0.apk
fa2911d412b7922b17a07829914ee630c2cd7091ef558abd4329ffb6020f879d  ssl_client-1.37.0-r31.apk
a535991af7c9e8369ebbf33c1e388c1bc63c87ead5142eddaee71f65836c33e3  zlib-1.3.2-r0.apk
2bb5136c89f5b0bbe1554c8915a3b520d5aa63ae2a51d4d821eb81698db5a818  zstd-libs-1.5.7-r2.apk
EOF
RUN cd /apks && sha256sum -c /pins-${TARGETARCH} && \
    test "$(find . -name '*.apk' | wc -l)" -eq 22 && \
    apk verify /apks/*.apk && \
    apk add --no-network /apks/*.apk && \
    apk info --installed --exists nodejs=24.18.1-r0 && \
    test "$(apk info -W /usr/lib/libssl.so.3)" = '/usr/lib/libssl.so.3 is owned by libssl3-3.5.9-r0' && \
    test "$(apk info -W /usr/lib/libcrypto.so.3)" = '/usr/lib/libcrypto.so.3 is owned by libcrypto3-3.5.9-r0' && \
    node -e 'const a=require("node:assert/strict");a.equal(process.versions.node,"24.18.1");a.equal(process.config.variables.node_shared_openssl,true);a.ok(process.versions.openssl.startsWith("3.5."));a.ok(process.versions.openssl.split(".").map(Number).reduce((n,v)=>n*1000+v,0)>=3005009)' && \
    ldd /usr/bin/node | tee /linkage.txt && \
    mkdir -p /rootfs/etc/apk/keys && cp /etc/apk/keys/* /rootfs/etc/apk/keys/ && \
    apk --root /rootfs --initdb --no-network --no-scripts add /apks/*.apk && \
    rm -rf /rootfs/bin /rootfs/sbin /rootfs/usr/sbin /rootfs/etc/apk /rootfs/lib/apk/db/scripts.tar /rootfs/lib/apk/db/scripts.tar.gz /rootfs/var/log/apk.log && \
    mkdir -p /rootfs/nodejs/bin /rootfs/etc /rootfs/licenses && \
    ln -s /usr/bin/node /rootfs/nodejs/bin/node && \
    printf 'NAME="Alpine Linux"\nID=alpine\nVERSION_ID=3.24.2\n' > /rootfs/etc/os-release && \
    printf 'root:x:0:0:root:/:/nonexistent\nnonroot:x:1000:1000:nonroot:/nonexistent:/nonexistent\n' > /rootfs/etc/passwd && \
    printf 'root:x:0:\nnonroot:x:1000:\n' > /rootfs/etc/group
# Remove builder-only utilities and retain accurate metadata for the curated payload.
RUN node --input-type=commonjs <<'NODE'
const fs=require('node:fs'),path=require('node:path');
for(const p of ['/usr/bin/c_rehash','/usr/bin/ssl_client','/usr/share/udhcpc','/etc/busybox-paths.d','/etc/logrotate.d','/etc/network','/etc/udhcpc','/etc/securetty','/etc/ca-certificates/update.d'])fs.rmSync('/rootfs'+p,{recursive:true,force:true});
const db='/rootfs/lib/apk/db/installed';
const blocks=fs.readFileSync(db,'utf8').trim().split('\n\n');
const filtered=blocks.filter(b=>!/^P:(busybox|busybox-binsh|ssl_client)$/m.test(b)).map(b=>{
 const lines=b.split('\n'), out=[];let dir='',keep=true;
 for(const line of lines){
  if(line.startsWith('F:')){dir=line.slice(2);keep=fs.existsSync('/rootfs/'+dir);}
  else if(line.startsWith('R:')){const p='/rootfs/'+path.posix.join(dir,line.slice(2));keep=fs.existsSync(p)||fs.lstatSync(p,{throwIfNoEntry:false})?.isSymbolicLink();}
  else if(!/^[aMZ]:/.test(line))keep=true;
  if(keep)out.push(line);
 }
 return out.join('\n');
});
fs.writeFileSync(db,filtered.join('\n\n')+'\n\n');
fs.rmSync('/rootfs/lib/apk/db/triggers',{force:true});
fs.rmSync('/rootfs/etc/ca-certificates/update.d',{recursive:true,force:true});
NODE
COPY --from=runtime-apks /licenses/ /rootfs/licenses/
COPY --from=runtime-apks /LICENSE-SHA256SUMS /license-pins
RUN echo 'ff0b7ab3ad3b2b0fdee3b6b4112b878ebabbcef661c0818c74a72660b719ad7f  /license-pins' | sha256sum -c - && \
    cd /rootfs/licenses && sha256sum -c /license-pins
# Reject unreviewed license context extras, symlinks and special files.
RUN node --input-type=commonjs <<'NODE'
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const expected=fs.readFileSync('/license-pins','utf8').trim().split('\n').map(l=>l.split('  ')[1]);
assert.equal(expected.length,84);
const directories=new Set();for(const name of expected){let d=path.posix.dirname(name);while(d!=='.'){directories.add(d);d=path.posix.dirname(d);}}
const actual=[];function walk(dir,relative=''){
 for(const name of fs.readdirSync(dir)){const p=path.join(dir,name),r=relative+name,st=fs.lstatSync(p);assert.ok(!st.isSymbolicLink(),`license symlink: ${r}`);
  if(st.isDirectory()){assert.ok(directories.has(r),`extra license directory: ${r}`);fs.chmodSync(p,0o755);assert.equal(fs.statSync(p).mode&0o777,0o755);walk(p,r+'/');}
  else {assert.ok(st.isFile(),`license special file: ${r}`);fs.chmodSync(p,0o644);assert.equal(fs.statSync(p).mode&0o777,0o644);actual.push(r);}
 }
}fs.chmodSync('/rootfs/licenses',0o755);assert.equal(fs.statSync('/rootfs/licenses').mode&0o777,0o755);walk('/rootfs/licenses');assert.deepEqual(actual.sort(),expected.sort());
NODE
# Execute the curated loader/library closure, not only the builder's Node.
RUN chroot /rootfs /nodejs/bin/node -e 'const a=require("node:assert/strict"),f=require("node:fs");a.equal(process.versions.node,"24.18.1");a.equal(process.config.variables.node_shared_openssl,true);a.ok(process.versions.openssl.startsWith("3.5."));a.ok(process.versions.openssl.split(".").map(Number).reduce((n,v)=>n*1000+v,0)>=3005009);console.log(JSON.stringify({node:process.versions.node,openssl:process.versions.openssl,shared:process.config.variables.node_shared_openssl}));for(const p of ["/bin/sh","/bin/busybox","/usr/bin/ssl_client","/usr/bin/c_rehash","/usr/bin/npm","/sbin/apk","/usr/sbin/update-ca-certificates"])a.equal(f.existsSync(p),false)'

# CI runs the complete Linux gates under the same vendor Node/libraries.
# npm and all development files remain confined to this validation stage.
FROM vendor-runtime AS vendor-checks
COPY --from=build /usr/local/lib/node_modules/npm /opt/npm
RUN ln -s /opt/npm/bin/npm-cli.js /usr/bin/npm && mkdir /work /validation && chown 1000:1000 /work /validation
COPY --chown=1000:1000 . /work/
COPY --from=build --chown=1000:1000 /build/node_modules /work/node_modules
ENV PATH="/usr/bin:/bin"
USER 1000:1000
WORKDIR /work
FROM scratch AS runtime
COPY --from=vendor-runtime /rootfs/ /
ENV PATH="/nodejs/bin"
WORKDIR /app
COPY --from=production-deps /install/node_modules ./node_modules
COPY --from=build /build/dist/src ./dist/src
COPY --from=build /build/runtime-package.json ./package.json
COPY LICENSE ./LICENSE
LABEL org.opencontainers.image.title="Darktrace MCP" \
      org.opencontainers.image.description="Private stdio MCP server for Darktrace Threat Visualizer" \
      org.opencontainers.image.licenses="Apache-2.0"
USER 1000:1000
ENTRYPOINT ["/nodejs/bin/node", "/app/dist/src/index.js"]
