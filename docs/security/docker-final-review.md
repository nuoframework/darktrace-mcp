# Revisión Docker vigente — checkpoint de consulta `d4d3f78c`

**Fecha:** 2026-10-05. **Tarea:** `task_8bd3c1c7ac3b`, dispatch `ctx_564c3933fb59`. **Decisión: BLOCKED para publicación estable.** Build, binding y stdio sintético pasan; existe un aviso upstream aplicable en OpenSSL empaquetado, sin runtime oficial corregido disponible en las líneas examinadas. **Grype informa 11 High.** No se acepta riesgo ni se declara un escaneo limpio.

Esta sección sustituye el veredicto vigente del informe anterior, conservado íntegro al final como evidencia histórica de otra imagen/fuente. No cambié producción, versiones, Dockerfile, credenciales, commits ni publicación. El coordinador amplió permiso para cambiar únicamente Dockerfile si encontraba un runtime oficial corregido; la investigación no encontró tal candidato, por lo que no hice esa modificación. Solo cambié este documento. No leí secretos ni hice llamadas al appliance; mis contenedores de prueba usan `--network=none`. Build, pulls y descargas de bases/avisos sí usaron la red pública.

## Evidencia y binding inmutable

**Deriva durante cierre:** otros owners cambiaron `scripts/generate-catalogue.ts`, `src/api/response-view.ts`, `src/api/response-views.generated.json` y `src/coverage/report.generated.json` después de congelar el contexto (cambios R1/R2 asignados por el coordinador; el generador añade `applyResponseViewOverrides`). La imagen revisada demuestra el snapshot `d4d3f78c` indicado, no el workspace posterior. `workspace-drift-at-review-close.json` registra los hashes observados; todo input nuevo exige reconstrucción y revisión nuevas antes de asociarlo con esta evidencia.

Todos los recibos están fuera del repositorio en `/private/tmp/darktrace-docker-final-ctx_564c3933fb59/`. `source/` contiene exclusivamente los 40 archivos necesarios para este build, sin configuración del operador. `source-files.json` fija cada archivo, incluyendo Dockerfile, ignore, locks, generadores y entradas OpenAPI/inventario. No se usó HEAD como identidad del árbol sucio compartido.

| Artefacto | Identidad SHA-256 |
|---|---|
| Imagen local (ID de Docker/index OCI, linux/arm64) | `dc9b8f14c2c5f5b1041d0c47dbb9fc113c797a10731788f254878530e7dd3e3c` |
| Config OCI del build | `b3e099de19771b0d3636774d565da6d62235ac6dd6f078d465cb0aecdca41d22` |
| Manifiesto de plataforma OCI del build | `f74f7b5885eb06188d6826cb4d0fb1e4ebfd52a6ff75dd4ed13c5dc80fe555b9` |
| `src/` (28 archivos, algoritmo del release helper) | `d4d3f78c3a8e6668fcab76b483d6ec5d13a20e34b3f08853651f2039a985fb87` |
| `source-files.json` (hash de los bytes del recibo) | `22b6a96178288ef3c02a7c1043d3d57f77aa4307e3ee43dda4c875b611fce9e1` |
| Dockerfile | `5561dc46110d59e1dd2cde65aec6816076df405e7c4f835f9508d066c031a2a6` |
| `npm-shrinkwrap.json` y `package-lock.json` (idénticos) | `029af408743c19bfdf30c20e6583bd9fda2c3de984e9557c9ed231bb0e078e63` |
| Árbol runtime completo `/app/dist/src` (49 archivos) | `6b05c29bec0932c4412c8c6f8aad326489e659f206eb6cf598046d462c38be2e` |
| Node ELF `/nodejs/bin/node`, idéntico al de la fase oficial build | `d09e299258c24f7cdf6f5d5ec185e3a56512b27a697113735dac909f1cac7b8d` |
| Fixture estable completo (bytes) | `ea31d70a484c0d0353cb8651edc4b6a4ab13798c096056e8cdcf68e78324707f` |
| Contrato read27 (JSON canónico) | `6ce22e568592b27281d14b1fd7361f80da1e0daf7bb2888c892458cc9f532e68` |

`binding.json` fija todos los hashes individuales de runtime y dependencias. Comparé byte a byte el runtime exportado con `/build/dist/src` de la fase build del mismo contexto congelado: 23 JS, tres JSON y 23 declaraciones TypeScript. Comparé también `/build/src` después del generador contra la fuente inicial: los 28 archivos permanecen idénticos. El agregado source/runtime usa el mapa de rutas relativas a cada árbol y hashes de bytes, recorrido ordenado con `localeCompare`, serializado mediante `JSON.stringify` sin espacios; el hash del recibo `source-files.json` es distinto y se identifica explícitamente como tal.

Las tres dependencias de producción son exactamente las entradas no-dev del shrinkwrap, con URL `registry.npmjs.org` e integridad sha512. Sus archivos exportados coinciden con los paquetes instalados por `npm ci --ignore-scripts` en la fase build; la fase final instala con `--omit=dev`. Para árboles de paquete se ordenan todas las rutas con `.sort()` y se calcula SHA-256 del JSON compacto ruta→hash, como el harness.

| Paquete | Versión / archivos | Hash de árbol |
|---|---|---|
| `@modelcontextprotocol/core` | 2.3.0 / 21 | `174b5387fb2ed22af55d657d1df27e1204a626e852835ff6d8c0393ca298c1c2` |
| `@modelcontextprotocol/server` | 2.3.0 / 85 | `7f2bdb59e5e0df2bd8da175f27b143b02fc3450227857996b513940786486ea0` |
| `zod` | 4.2.0 / 681 | `ea6dbf716fd3b87a3e3b5e71f5fe248dbc20c52d105da85ce094fe8555884606` |

Bases fijadas: `node:22-bookworm-slim@sha256:43ac6c60b8f89723f746e8a92ce91abd5017e627ce1ddfe4238355d3a30b772c` y `gcr.io/distroless/cc-debian13:nonroot@sha256:e792ab3d241a468a4fd7519ddbbebe66b49b5f365771716ea688ad40b6c6f1c2`. El ID local incluye el index/attestation de BuildKit; no es un digest publicado. Grype usa la conversión Docker del mismo objeto: config `b3e099de…`, manifiesto Docker `48543db716884d4a823323a79bac9aaf2ce7af21afbe98f50467be2445c3b94b`. No confundir esas representaciones con una discrepancia de fuente.

## Runtime y stdio endurecido

`image-inspect.json`, `image-history.txt`, `rootfs-summary.json`, `node-elf.json` y `runtime-maps.json` conservan las pruebas. Usuario predeterminado `1000:1000`, entrypoint `/nodejs/bin/node /app/dist/src/index.js`, solo PATH en Env, sin Cmd, puertos publicados/declarados ni volúmenes declarados. Rootfs exportado: 2.138 archivos regulares, cero setuid/setgid, cero rutas escribibles por todos sin sticky y ningún `sh`, `bash`, `npm`, `apt`, `dpkg`, `ldd` o `nscd`. Los únicos archivos fuera de runtime/dependencias en `/app` son LICENSE y el marcador package.json ESM. Licencias del proyecto, Node, paquetes npm y copyrights Debian permanecen presentes.

El ELF y el mapa real de bibliotecas cargadas muestran `libdl`, `libstdc++`, `libm`, `libgcc_s`, `libpthread`, `libc` y el cargador arm64. No cargan `libz.so.1`, `libssl.so.3`, `libgomp` ni zstd del sistema. La prueba de proceso mostró UID/GID 1000, todas las capacidades a cero, `NoNewPrivs: 1` y seccomp modo 2. El binario **sí importa getaddrinfo/gethostbyname**: usar c-ares en el conector no demuestra que todo Node sea ajeno al resolver de glibc.

`SDK Client` y `StdioClientTransport` 2.3.0, extraídos de la fase build fijada, conectaron al entrypoint de producción y ejecutaron initialize/tools-list con archivos **sintéticos** 0600, destino `.invalid`, perfil read y sensitiveRead=false. Flags: `--pull=never --rm --init -i --network=none --read-only --cap-drop=ALL --security-opt=no-new-privileges --pids-limit=64 --memory=256m --log-driver=none --user 501:20`, dos mounts de tokens sintéticos readonly, sin TTY ni puertos. El UID override corresponde al propietario de esos archivos del host; la prueba de proceso anterior comprueba el usuario predeterminado de la imagen.

**PASS:** 27 herramientas, comparación completa de nombres, orden, descripciones, schemas y annotations con el fixture estable; hash read27 exacto. Solo se solicitó el inventario MCP: cero tools-call/cero API. SDK/transport cerrados y ausencia del contenedor sintético comprobada, archivos sintéticos borrados. Recibo `sdk-smoke.json` SHA-256 `1a05011103822c0b4c786349af479d4da4100be5873560edae9fd860b4932f3b`. Dos errores de preparación de imports del script externo (extensión `.js` en lugar de `.mjs`, y resolución node_modules) se corrigieron antes del PASS; no eran fallos del servidor.

## Reescaneo con bases descargadas de nuevo

Se usaron directorios de caché nuevos y descarga explícita, sin reutilizar la base histórica y sin filtros `ignore-unfixed`, severidad o VEX. Salida 0 de las herramientas indica que completaron el escaneo; no indica ausencia de vulnerabilidades.

| Escáner | Base y resultado |
|---|---|
| Trivy 0.74.0 | DB v2 actualizada `2026-10-05T19:07:00.467981014Z`, descargada `2026-10-05T21:37:34.751842Z`; **31 coincidencias: 23 MEDIUM, 8 LOW**, ninguna FixedVersion |
| Grype 0.118.0 / Syft 1.51.1 | DB `v6.1.10`, built `2026-10-05T06:45:38Z`, valid=true, archivo remoto SHA-256 `97459838f3b53ba97e4562fb3d5d2fd92422cd44c179f59268f0c0d404c00e7a`; **31 coincidencias: 11 High, 10 Medium, 3 Low, 7 Negligible**; 16 not-fixed y 15 wont-fix |

Comparé los pares `(CVE, paquete)` de ambos informes: mismos 31 pares, no 31 CVE únicas. `scanner-findings.json` conserva versión, descripción, referencias, ambas severidades y fix state para cada par. Todos son Debian; ninguno de los tres paquetes npm tiene coincidencias. Trivy SBOM tiene 18 componentes y **omite el binario Node y sus componentes empaquetados**. Por tanto, cero coincidencias npm no prueba que Node/OpenSSL carezcan de avisos.

### Aplicabilidad actual de las coincidencias Debian

Estas son inferencias de rutas de código, ELF y rootfs, no pruebas de explotación ni aceptaciones de riesgo. Se corrige la certeza excesiva del informe histórico: límites de entrada o ausencia de un import directo no demuestran inalcanzabilidad de una biblioteca cargada.

| Grupo y CVE | Clasificación para este proceso |
|---|---|
| zlib1g: 27171, 85091 (ambas CVE-2026) | Biblioteca del sistema no cargada por Node. Su copia empaquetada se evalúa por separado abajo; no extrapolar el resultado Debian a ella. |
| GCC, 95619 y 102010 (CVE-2026), cada una en cuatro paquetes | `libstdc++` y `libgcc_s` se cargan; rutas vulnerables no demostradas alcanzables ni excluidas. **Residual pendiente de revisión/aceptación específica**, sin parche indicado. `libgomp` y gcc-14-base no son bibliotecas cargadas. No recalifico los High del escáner como Low. |
| glibc DNS/resolver: CVE-2026-5435, 6238, 8674, 89092 | Conector usa Resolver.resolve4/6 y lookup fijado; nscd ausente y no se invocan APIs de impresión DNS en src. Esas rutas no se observan en el conector. **Exclusión global no demostrada**, porque Node importa funciones de resolver y libc se carga. |
| Loader: CVE-2026-86805, 95818 | Precondición AT_SECURE/setuid no presente en rootfs y pruebas endurecidas. No aplicables bajo esas condiciones; cambio de privilegios invalida el razonamiento. |
| glibc otros: CVE-2026-18374, 19499, 19542, 6368, 6791, 77117, 80489 | No hay flujo de aplicación que exponga strfmon, tdelete, wordexp, conversión iconv JISX0213 o fopen con ccs=. **Sin ruta identificada**, no prueba de exclusión transitiva en toda libc. |
| CVE-2010-4756, 2018-20796, 2019-9192, 2019-1010022/23/24/25, 2026-97399 | Mayormente disputadas/unimportant según inventario histórico; ldd ausente, sin API regex/glob de libc expuesta desde src. strncasecmp importada: límites reducen exposición, no son parche. Conservar estados/severidad del escáner. |

## Inventario manual de Node y avisos que no cubre el SBOM

`node-inventory.json` proviene del **binario de la imagen fijada**, no de la versión del host. `node-bundled-inventory.cdx.json` añade 25 entradas de versión reportadas por el runtime; excluye modules/napi por ser versiones ABI. Es un suplemento manual, no un SBOM completo reconstruido desde cada objeto compilado. Node 22.23.3 usa componentes estáticos: `node_shared_openssl/zlib/cares/nghttp2/libuv/brotli/sqlite/zstd=false`; `openssl_quic=false`.

Inventario: Node 22.23.3; V8 12.4.254.21-node.57; OpenSSL 3.5.8; zlib **1.3.1-e00f703**; c-ares 1.34.8; libuv 1.51.0; nghttp2 1.69.0; llhttp 9.4.3; Undici 6.28.1; ICU 78.3; CLDR 48.0; Unicode 17.0; tz 2026c; Brotli 1.1.0; zstd 1.5.7; simdjson 4.5.0; simdutf 6.4.2; SQLite 3.51.3; ada 2.9.2; acorn 8.16.0; amaro 1.1.8; cjs_module_lexer 2.2.0; nbytes 0.1.3; ncrypto 0.0.1; uvwasi 0.0.23. Enumerar versiones no equivale a auditar todas sus rutas nativas.

| Aviso upstream omitido / componente | Estado y aplicabilidad |
|---|---|
| **OpenSSL CVE-2026-35189, Low, corregida 3.5.9** | **Aplicable/potencialmente alcanzable:** consumo de memoria por CRLDP en certificado de un peer durante handshake TLS cliente. OpenSSL 3.5.8 afectado. Producción usa node:https y valida certificados; el cap de body empieza después del handshake. **Bloquea publicación**, sin aceptar riesgo. [Aviso upstream 2026-09-29](https://openssl-library.org/news/secadv/20260929.txt). |
| OpenSSL CVE-2026-84782 (High), 75806 (Low) | DTLS. No aplicables al transporte TCP/TLS del conector. |
| OpenSSL CVE-2026-35191, 42772, 54873, 75804, 84784 (Low) | QUIC; runtime openssl_quic=false y servidor stdio. No aplicables a esta ruta. |
| OpenSSL CVE-2026-54872, 54875, 77696 (Low) | Firma EC no-NIST/SM2; aplicación usa HMAC-SHA1 y no configura clave cliente de firma. Sin ruta identificada. |
| OpenSSL CVE-2026-72897, 75805 (Low) | Cambio SSL_CTX de servidor/CMP; APIs no utilizadas por el conector cliente. Sin ruta identificada. |
| OpenSSL CVE-2026-84783 (Moderate) | Solo OpenSSL 4.0; 3.5 explícitamente no afectado. |
| zlib CVE-2026-27171 | El [crc32.c del tag Node](https://raw.githubusercontent.com/nodejs/node/v22.23.3/deps/zlib/crc32.c) mantiene la llamada sin guard de longitud negativa a x2nmodp. **No marcado corregido**; las APIs combine no están expuestas por este servidor y no hay import de node:zlib. HTTP rechaza content-encoding distinto de identity. Sin ruta de entrada identificada; nueva descompresión requiere revisión. [Release zlib 1.3.2](https://github.com/madler/zlib/releases/tag/v1.3.2). |
| zlib CVE-2026-85091 | gz_vacate de versiones posteriores: esa función no está en [gzwrite.c del tag Node](https://raw.githubusercontent.com/nodejs/node/v22.23.3/deps/zlib/gzwrite.c). No trasladar la coincidencia del paquete Debian a este fork; no hay uso gzprintf/gzvprintf en src. |
| SQLite CVE-2026-11822/11824 | Upstream fija en 3.53.2; 3.51.3 es anterior. Requiere SQL/FTS5 y defensive desactivado; servidor no importa node:sqlite ni ejecuta SQL. **No corregido por versión, sin ruta identificada**. CVE-2025-70873 afecta extensión zipfile, ausente del flujo. [Registro SQLite](https://sqlite.org/cves.html). |
| c-ares CVE-2026-33630, GHSA-pjmc-gx33-gc76, GHSA-jv8r-gqr9-68wj | Corregidas desde 1.34.7; copia 1.34.8 posterior. [Changelog oficial](https://c-ares.org/changelog.html). |
| Undici GHSA-rfgv-xxqx-mfg5 / CVE-2026-19534, High | Fijada 6.28.1; runtime coincide. WebSocket/fetch no son el conector de producción. [Aviso del proyecto](https://github.com/nodejs/undici/security/advisories/GHSA-rfgv-xxqx-mfg5). |
| Node CVE-2026-56846/56848/58043/56850/58040/58042/58045/56847/58039/58044 | El [release de seguridad julio](https://nodejs.org/en/blog/vulnerability/july-2026-security-releases) los fija en 22.23.2; 22.23.3 es posterior. HTTPS/session reuse y DNS se evaluaron como partes utilizadas, no se descartaron por ser read-only. |
| libuv GHSA-f74f-cvh7-c6q6, High | Fijada 1.48.0; runtime 1.51.0 posterior. [Aviso upstream](https://github.com/libuv/libuv/security/advisories/GHSA-f74f-cvh7-c6q6). |
| nghttp2 CVE-2026-27135 | Fijada 1.68.1; copia 1.69.0 posterior; src no usa HTTP/2. [Release oficial](https://nghttp2.org/blog/). |
| ICU/Brotli y demás entradas | Se consultaron [release ICU](https://icu.unicode.org/) y [security Brotli](https://github.com/google/brotli/security); no se identificó un aviso aplicable adicional en esa revisión limitada. Para V8 y demás componentes el estado es inventariado, **no certificación exhaustiva** ni equivalencia automática con Chrome. Mantener vigilancia por versión/parche de Node. |

Las filas OpenSSL derivan del aviso enlazado; las exclusiones de rutas son inferencias del código y configuración de esta imagen. Conservar el High DTLS en el registro manual aunque su transporte no sea aplicable; **no sumarlo** a los 11 High de Grype como si fueran el mismo inventario.

## Búsqueda de runtime corregido y mitigaciones

Descargué nuevamente [el índice oficial de releases](https://nodejs.org/dist/index.json), guardado íntegro en `node-releases.json`. Últimos registros de líneas 22/24/26: **22.23.3, 24.21.0, 26.10.0; todos OpenSSL 3.5.8**. No figura un release soportado con 3.5.9+. Las páginas [22.23.3](https://nodejs.org/en/blog/release/v22.23.3), [24.21.0](https://nodejs.org/en/blog/release/v24.21.0) y [26.10.0](https://nodejs.org/en/blog/release/v26.10.0) concuerdan con esa dependencia. El índice y algunas fechas del blog difieren en uno/dos días; no se utiliza esa fecha para inferir una corrección.

Además hice pull nuevo y ejecución offline de los candidatos oficiales alternativos:

| Candidato | Digest oficial obtenido / versiones observadas |
|---|---|
| `node:24-bookworm-slim` | `sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6`; Node 24.21.0 / OpenSSL 3.5.8 |
| `node:26-bookworm-slim` | `sha256:662933cf47f013bc8e4beb31a6116448427a82057ba7c42c97e4c5ba766504c2`; Node 26.10.0 / OpenSSL 3.5.8 |

Sus pulls, inspect y process.versions quedan en recibos `node24-*` y `node26-*`. Son candidatos **descartados**, no sustitutos evaluados del producto; no se les atribuye suite funcional ni aceptación. Actualizar solo libssl de distroless no sustituye el OpenSSL estático de Node. Una CA privada, hostname validation o pinning no demuestra evitar el procesamiento previo del certificado; el límite de memoria contiene el impacto del proceso pero permite DoS. `--network=none` impide explotación remota en el smoke, pero también impide la consulta real. TLS termination externa cambiaría arquitectura/confianza y requiere diseño/revisión propios; no se propone como mitigación ya validada. La acción viable actual es **retener publicación hasta un runtime oficial con fix**, fijar su digest y repetir build, bindings, contrato, suites, TLS/lab y escaneos. No se hizo build criptográfico personalizado ni se debilitó TLS.

## Comandos y cierre de gates

Se ejecutaron desde el workspace, con salidas dirigidas exclusivamente al directorio externo descrito arriba:

```sh
docker build --pull --iidfile /private/tmp/darktrace-docker-final-ctx_564c3933fb59/image-id.txt -t darktrace-mcp:consultation-d4d3-final /private/tmp/darktrace-docker-final-ctx_564c3933fb59/source
docker build --target build -t darktrace-mcp:review-build-d4d3 /private/tmp/darktrace-docker-final-ctx_564c3933fb59/source
trivy image --cache-dir /private/tmp/darktrace-docker-final-ctx_564c3933fb59/trivy-cache --download-db-only
GRYPE_DB_CACHE_DIR=/private/tmp/darktrace-docker-final-ctx_564c3933fb59/grype-db grype db update
trivy image --cache-dir /private/tmp/darktrace-docker-final-ctx_564c3933fb59/trivy-cache --image-src docker --scanners vuln --format json --output /private/tmp/darktrace-docker-final-ctx_564c3933fb59/trivy.json darktrace-mcp:consultation-d4d3-final
GRYPE_DB_CACHE_DIR=/private/tmp/darktrace-docker-final-ctx_564c3933fb59/grype-db grype docker:darktrace-mcp:consultation-d4d3-final -o json
trivy image --cache-dir /private/tmp/darktrace-docker-final-ctx_564c3933fb59/trivy-cache --image-src docker --format cyclonedx --scanners vuln --output /private/tmp/darktrace-docker-final-ctx_564c3933fb59/runtime-sbom.cdx.json darktrace-mcp:consultation-d4d3-final
DARKTRACE_IMAGE_ID=sha256:dc9b8f14c2c5f5b1041d0c47dbb9fc113c797a10731788f254878530e7dd3e3c node /private/tmp/darktrace-docker-final-ctx_564c3933fb59/sdk-smoke.mjs
docker pull node:24-bookworm-slim
docker pull node:26-bookworm-slim
```

Build, descargas, scans, SBOM y smoke final: exit 0. Inspección/export y docker cp no arrancaron el servidor ni montaron secretos. Los comandos completos del smoke y su cleanup están en `sdk-smoke.mjs`; los flags de ejecución están documentados arriba. Los recibos JSON y logs seleccionados se indexan en `SHA256SUMS` externo; cada input del snapshot figura en `source-files.json`.

**Revisión adicional solicitada por el coordinador:** leí, sin ejecutar ni importar configuración, `/private/tmp/darktrace-structure-diagnostic-proposal/operator-wiring.mjs` y `structure-diagnostic.mjs`. La salida usa únicamente paths del modelo, tipos/counts y vocabulario fijo, sin valores ni claves desconocidas; operaciones exactas GET y caps son adecuados para diagnóstico acotado del coordinador. La primera revisión pidió parada inmediata al primer fallo y saneamiento de preparación. Releí la versión corregida: se detiene ante error/truncación, omisiones de discovery y ausencia de DID; preparación e imports de producción están en catch con sentinel fijo. **ACCEPTED para el diagnóstico acotado**, sujeto al recheck completo schema2/fuente/runtime/14 árboles de dependencias antes de ejecución y al wrapper del coordinador que suprime stderr. Hashes revisados: operator-wiring `337eaba8b3de1432c4b6d490226345ece1b69061f30c5de901c28634c3259049`, structure-diagnostic `6f44729adbb99b338cf6587d8379a7464fc1b0fe3ab195a5eed6fdbb0c84cb3a`. No se considera compatibilidad MCP PASS ni se amplió mi permiso de acceso al lab. Comunicaciones `msg_8af542d6a63a` y aceptación final `msg_7a2c50f5e388`.

**Pendiente de release:** runtime oficial corregido para CVE-2026-35189, resolución específica de residuales en bibliotecas cargadas, aprobación independiente de los gates restantes del coordinador y distribución/publicación. Esta tarea no ejecutó suites funcional/security globales ni amd64/rootless/SELinux/AppArmor. La validación Docker actual contra lab fue comunicada por el coordinador (`msg_a6473d3c3710`): get_status/devices/subnets PASS, harness exit 0 y cleanup de volumen confirmado sobre esta imagen, runtime manifest `963cbf0c…`; **no la observé ni leí sus credenciales**. Esa evidencia parcial no elimina el bloqueo OpenSSL ni valida las 27 herramientas en vivo. Advanced Search opt-in continúa fuera de mi prueba.

---

## Informe histórico conservado — no describe el checkpoint actual

El texto siguiente corresponde a `eadfe117…` / imagen `cb0330dd…`. Sus certezas de aplicabilidad, valoración DF-01 como Bajo y cierre de gates quedan sustituidos por la revisión vigente anterior. Se conserva sin reescribir como trazabilidad, incluyendo sus límites y fallos anteriores.

# Revisión final independiente de la imagen Docker

**Estado:** revisión independiente, sintética y offline. Fecha: 2026-10-05. Revisor: trabajador despachado (tarea `task_e58e6f286f75`).

**Qué no hice:**
- No usé credenciales, configuraciones reales ni el laboratorio.
- No modifiqué `src`, el Dockerfile, el harness, versiones ni releases, y no hice commits ni push.
- Todas las ejecuciones de contenedores usaron `--network=none` y archivos sintéticos.

**Veredicto:**
- La imagen `sha256:cb0330ddb93c5611b34efeff01e43c64252b99681567eb30835fd2ba5be281cf` está **vinculada byte a byte** a la fuente revisada `eadfe117…` y a las dependencias fijadas, y cumple las restricciones de runtime declaradas.
- **No es un escaneo limpio:** quedan 31 hallazgos en paquetes Debian sin versión corregida disponible.
- Su aplicabilidad está documentada abajo hallazgo por hallazgo. No se acepta ningún riesgo de forma genérica y no se exige un "0 CVE" imposible.
- Quedan como gates del coordinador: la ejecución Docker contra el laboratorio, la CI y la publicación.

## 1. Artefactos revisados

| Elemento | Valor |
|---|---|
| Imagen | `darktrace-mcp@sha256:cb0330dd…` (linux/arm64, creada 2026-10-05T18:58:34Z). Grype informa la configuración `sha256:cc034508…` y el manifiesto `sha256:2f3fc2f9…`. |
| Dockerfile | Fases `build` y `production-deps` en `node:22-bookworm-slim@sha256:43ac6c60…`; rootfs de `gcr.io/distroless/cc-debian13:nonroot@sha256:e792ab3d…` copiado a `scratch`; `node` copiado desde la fase de build |
| Informes del owner | Trivy `/private/tmp/darktrace-mcp-trivy-debian13-final.json` (Trivy 0.74.0, base de datos de 2026-10-05T13:07Z) y CycloneDX 1.7 `/private/tmp/darktrace-mcp-distroless-debian13-final.cdx.json` (18 componentes, 25 vulnerabilidades) |
| Manifiestos de referencia | `/private/tmp/darktrace-mcp-ir14-reviewed-runtime.json` (`b9aabc26…`) y el nuevo `/private/tmp/darktrace-mcp-inventory-reviewed-runtime.json` (`6b2fa571…`) |

## 2. Comprobaciones independientes

| Comprobación | Método | Resultado |
|---|---|---|
| Configuración de la imagen | `docker image inspect` | `User 1000:1000`; entrypoint `/nodejs/bin/node /app/dist/src/index.js`; sin `Cmd`, `ExposedPorts` ni volúmenes; entorno con solo `PATH`; etiquetas de título, descripción y licencia Apache-2.0 |
| Historial | `docker history` | Coincide con el Dockerfile; ningún paso `RUN` en la fase final |
| Sistema de archivos | `docker export` de un contenedor creado y no ejecutado (2.652 entradas) | 0 archivos setuid/setgid; 0 rutas escribibles por todos sin sticky; sin `sh`, `bash`, `apt`, `dpkg`, `ldd`, `nscd` ni `npm`; `/app` y `/nodejs` pertenecen a 0:0, de modo que UID 1000 no puede modificarlos |
| Binding del runtime | SHA-256 de cada archivo de `/app/dist/src` | 25 archivos, **idénticos** a `runtimeFiles` del manifiesto revisado de la fuente `eadfe117…`; ningún archivo extra en `/app` aparte de `LICENSE` y `package.json` (`{"type":"module"}`) |
| Procedencia de las dependencias | Hash del árbol completo de cada paquete con el algoritmo del harness | `@modelcontextprotocol/core` (21 archivos), `@modelcontextprotocol/server` (85) y `zod` (681) **coinciden** con `dependencyTrees` del manifiesto. Son exactamente los 3 paquetes no-dev de `npm-shrinkwrap.json`, que vienen de `registry.npmjs.org` con integridad sha512. |
| Node | Ejecución offline (`--network=none`, `--read-only`, `--cap-drop=ALL`) | Node 22.23.3, que según `nodejs.org/dist/index.json` es la última 22.x (2026-09-23) e incluye los parches de seguridad de 22.23.2. OpenSSL 3.5.8, zlib, c-ares 1.34.8 e ICU 78.3 van **empaquetados** (no compartidos). Se ejecuta como uid/gid 1000. |
| Bibliotecas que enlaza `node` | Lectura de `DT_NEEDED` del ELF | `libdl`, `libstdc++.so.6`, `libm`, `libgcc_s.so.1`, `libpthread`, `libc.so.6` y `ld-linux`. **No** enlaza `libz.so.1` ni `libssl.so.3`. Requiere como máximo GLIBC_2.28, y la imagen trae 2.41. |
| Licencias | Inventario del sistema de archivos | `LICENSE` del proyecto (idéntico al del repositorio), `/licenses/node/LICENSE`, los `LICENSE` de los 3 paquetes npm y 11 archivos de copyright Debian en `/usr/share/doc` |
| Confianza TLS | Código y sistema de archivos | `/etc/ssl/certs/ca-certificates.crt` está presente, pero Node usa por defecto su almacén empaquetado. `NODE_USE_SYSTEM_CA` y `--use-system-ca` se rechazan (IR-02); las CA privadas se añaden solo con `NODE_EXTRA_CA_CERTS`. |
| Reescaneo | `trivy image` 0.74.0 (misma base de datos) y Grype 0.118.0 (base de datos de 2026-10-05T06:45Z) | **Trivy:** 31 hallazgos (23 MEDIUM, 8 LOW), 0 corregibles; lo reproduce exactamente. **Grype:** las mismas 31 coincidencias en paquetes Debian, 0 corregibles (15 `wont-fix`, 16 `not-fixed`), con otra severidad: 11 High, 10 Medium, 3 Low y 7 Negligible. |

**Severidad según la fuente de datos.** En Trivy, 22 de los MEDIUM no tienen severidad de Debian (proceden de Red Hat o Ubuntu); los LOW son, en 7 casos, valoración de Debian. Grype asigna High a CVE-2026-85091 (zlib), CVE-2026-5435 y CVE-2026-19499 (glibc), y a CVE-2026-95619 y CVE-2026-102010 en cada uno de los 4 paquetes de GCC. Por eso ningún documento debe afirmar "0 high" sin decir qué escáner lo dice.

## 3. Aplicabilidad de los 31 hallazgos

Ninguno tiene versión corregida en Debian 13 a fecha 2026-10-05, así que cambiar el digest de distroless no los elimina hoy. La aplicabilidad se evalúa sobre el proceso real (`node` con su red, DNS y TLS empaquetados), no se asume.

| Grupo (paquete) | CVE | Aplicabilidad en esta imagen | Estado |
|---|---|---|---|
| zlib1g (2 MEDIUM) | CVE-2026-27171 (`crc32_combine64`), CVE-2026-85091 (`gzprintf` tras un bloqueo de escritura) | `node` **no carga** `libz.so.1`: no figura en `DT_NEEDED`, porque usa su zlib empaquetada. La biblioteca solo está en disco. | No alcanzable desde el servidor. La zlib empaquetada en Node se sigue en DF-01. |
| GCC runtime: `libstdc++6`, `libgcc-s1`, `libgomp1`, `gcc-14-base` (8 MEDIUM, 2 CVE × 4 paquetes) | CVE-2026-95619 (desbordamiento en el `operator new` alineado), CVE-2026-102010 (`erase_if` en una cola de prioridad) | `libstdc++` y `libgcc_s` **sí se cargan**. 95619 exige tamaños enormes en `new` alineado; las entradas del servidor están acotadas (tramas JSON de 64 KiB, respuestas de 2 MiB, salida de 60.000 caracteres), lo que no prueba que sea inalcanzable. Para 102010 no hay indicios de uso por parte de Node. `libgomp1` y `gcc-14-base` no se cargan. | Residual bajo, **sin corrección disponible**. Vigilar las actualizaciones de Debian y reconstruir cuando haya parche. |
| glibc: resolver y DNS (MEDIUM) | CVE-2026-5435, CVE-2026-6238 (`ns_printrr*`/`fp_nquery`, funciones de depuración), CVE-2026-8674 (dominio de búsqueda largo en `resolv.conf`), CVE-2026-89092 (`nscd`) | El servidor resuelve con **c-ares empaquetado** (`Resolver.resolve4/6`) y conecta mediante un `lookup` fijado; no usa `getaddrinfo` ni el resolver de glibc. `ns_printrr*` no se importa y no hay `nscd`. `resolv.conf` lo controla el operador o Docker. | No alcanzable en el flujo del servidor |
| glibc: cargador `ld.so` (MEDIUM) | CVE-2026-86805 (TOCTOU con `$ORIGIN`), CVE-2026-95818 (desbordamiento con `$ORIGIN`) | Solo afectan a programas setuid/setgid (`AT_SECURE`). La imagen no tiene **ningún** binario setuid ni setgid, el runtime usa `no-new-privileges` y el sistema de archivos es de solo lectura. | No alcanzable |
| glibc: funciones no importadas (MEDIUM) | CVE-2026-18374 (`fopen` con `ccs=`), CVE-2026-19499 (`strfmon`), CVE-2026-19542 (`tdelete`), CVE-2026-6368 y CVE-2026-6791 (`wordexp` y expansión de tilde), CVE-2026-77117 y CVE-2026-80489 (`iconv` JISX0213) | `node` no importa `wordexp`, `strfmon`, `tdelete` ni `iconv_open`; usa ICU. Sí importa `fopen` y `glob`, pero no con un modo `ccs=` ni con patrones controlados por un atacante. | No alcanzable con entradas del modelo ni del appliance |
| glibc: LOW (8) | CVE-2010-4756 (`glob`), CVE-2018-20796 y CVE-2019-9192 (regex), CVE-2019-1010022/23/24/25 (protecciones y `ldd`), CVE-2026-97399 (`strncasecmp`) | Históricas, la mayoría con disputa o `unimportant` en Debian; sin `ldd` en la imagen. `strncasecmp` se carga, pero no recibe entradas sin acotar. | Residual negligible |

Estas valoraciones se basan en el binario, las bibliotecas que enlaza, sus imports y el flujo del código fuente. No sustituyen un parche. Si Debian publica correcciones, hay que reconstruir con un nuevo digest de distroless y volver a escanear.

## 4. Hallazgos

| ID | Sev | Owner | Hallazgo | Propuesta |
|---|---|---|---|---|
| DF-01 | Bajo | Docker (segundo worker) | Trivy, Grype y el SBOM CycloneDX **no inventarían `/nodejs/bin/node`** (22.23.3) ni lo que lleva empaquetado (OpenSSL 3.5.8, zlib, c-ares 1.34.8, ICU 78.3), que es el componente más expuesto. El "0 hallazgos Node" se refiere solo a los 3 paquetes npm. | Añadir el componente Node.js 22.23.3 (y lo que empaqueta) al SBOM o al registro, y contrastarlo con los avisos de seguridad de Node en cada reconstrucción. Hoy es la última 22.x. |
| DF-02 | Info | Docker (segundo worker), `docs/docker.md` | El registro dice "0 high, 0 critical" sin indicar la fuente de severidad; Grype califica como High 11 de los mismos hallazgos. | Indicar el escáner y la fuente, por ejemplo "Trivy 0.74.0: 23 medium, 8 low; Grype 0.118.0: 11 high…; 0 corregibles". |
| DF-03 | Info | — | `libz.so.1` y `libssl.so.3` vienen con la base distroless `cc` pero `node` no los usa. | Sin acción: retirarlos exigiría mantener un rootfs propio y no hay corrección pendiente. |
| DF-04 | Corregido | README (yo) | Los README EN y ES decían que el escaneo, el SBOM y la revisión de licencias estaban pendientes. | Corregidos (§5) |

## 5. Corrección de los README

En la sección Docker de `README.md` y `README.es.md`, sincronizados:
- La frase "escaneo, licencias y SBOM pendientes" pasa a describir el escaneo local con Trivy y el SBOM CycloneDX de `sha256:cb0330dd…` (Distroless Debian 13, Node.js 22.23.3):
  - Registran 31 hallazgos en paquetes del sistema Debian, ninguno con versión corregida a 2026-10-05.
  - Trivy los clasifica como 23 medium y 8 low; Grype da High a 11 de ellos.
  - Los escáneres no inventarían el binario de Node.
  - No es un escaneo limpio, con enlaces a la guía Docker y a este informe.
  - Siguen pendientes las ejecuciones contra un appliance real y la publicación.
- La frase sobre licencias añade la licencia de Node.js y los archivos de copyright de Debian.

No cambian: banners, logotipo, avisos de proyecto no oficial, `contacto@pabloarrabal.com`, badges ni la receta Docker (`--user 1000:1000`, `-i` sin `-t`, sin puertos, ID con `--pull=never`), que coincide con `USER 1000:1000` y la ausencia de `ExposedPorts`.

## 6. Mensajes del coordinador atendidos durante la tarea

- **Manifiesto de inventario `6b2fa571…`:** lo regeneré con el generador documentado sobre una copia del snapshot limpio y salió **byte a byte idéntico**. Respecto a `b9aabc26…`, solo cambia `scripts/lab-read-smoke.mjs`. El harness acepta el binding con el perfil `inventory` (`msg_4d9f9fd77151`).
- **Segundo lote Docker** (`CONFIG_OR_INITIALIZE_FAILED`):
  - Según `docker events` (solo metadatos), el contenedor de producción salió con código 1 a los 164 ms de arrancar. Fue un rechazo de arranque, no un timeout ni un límite de recursos.
  - La reproducción sintética muestra la misma firma para un `--user` que no coincide con el propietario, una configuración en 0644, un token en 0640 o `NODE_OPTIONS` presente.
  - **Causa: desconocida.** El root indica (`msg_9a65e2f2ba45`) que ambos lotes usaron exactamente la misma configuración Docker, el mismo usuario `501:20`, los mismos montajes y el mismo digest, y que las credenciales y la configuración no cambiaron; solo cambió la selección de operaciones. La reproducción muestra **clases posibles** de rechazo, no demuestra cuál ocurrió. No se trata como timeout ni como incompatibilidad con el laboratorio, y el fallo se conserva como fallo. Lo siguiente es que el root compare los metadatos `stat`. Como mejora opcional para el owner del harness, propongo un código fijo `CHILD_EXITED_BEFORE_INITIALIZE` con el código de salida, sin stderr (`msg_dcd307292d66`).
  - Los 3 GET del primer lote los informó el root; yo no los observé.

## 7. Límites

- Solo cubre Docker Desktop en arm64. No probé rootless, AppArmor/SELinux, amd64 ni el appliance.
- La aplicabilidad se infiere del binario y del código; no es una prueba de explotación.
- Las bases de datos de vulnerabilidades son de 2026-10-05.
- No acepto riesgos: la decisión de despliegue y publicación es del root.
- **Deriva de la fuente:** el árbol de trabajo actual tiene `src/` = `2f0ec8746203e4a3407c07e701c76742b26b501fd67b66487b2e5e84c4e182b5` por la corrección paralela de otro owner. La imagen revisada corresponde a `eadfe117…`. Cualquier fuente nueva exige reconstruir la imagen, generar un manifiesto nuevo, volver a escanear y repetir esta verificación.
