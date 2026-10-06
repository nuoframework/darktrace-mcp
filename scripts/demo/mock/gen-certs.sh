#!/bin/sh
set -eu
cd "$(dirname "$0")"
umask 077
openssl genrsa -out ca-key.pem 2048
openssl req -x509 -new -sha256 -key ca-key.pem -days 3650 -out ca.pem \
  -subj '/CN=Darktrace Mock Local CA' \
  -addext 'basicConstraints=critical,CA:TRUE' \
  -addext 'keyUsage=critical,keyCertSign,cRLSign'
openssl genrsa -out server-key.pem 2048
openssl req -new -key server-key.pem -out server.csr -subj '/CN=localhost'
cat > server.ext <<EXT
basicConstraints=critical,CA:FALSE
keyUsage=critical,digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth
subjectAltName=DNS:localhost,IP:127.0.0.1,IP:${DEMO_BIND:?Set DEMO_BIND to the private IPv4 address of this machine}
EXT
openssl x509 -req -in server.csr -CA ca.pem -CAkey ca-key.pem -CAcreateserial \
  -out server.pem -days 365 -sha256 -extfile server.ext
rm -f server.csr server.ext ca.srl
printf 'Created ca.pem, ca-key.pem, server.pem and server-key.pem\n'
