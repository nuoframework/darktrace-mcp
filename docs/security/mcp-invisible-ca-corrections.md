# Correcciones IR-01 e IR-02: invisibles y CA ambiental

Fecha: 2026-10-05. Tarea `task_25aac7de75bd`, dispatch `ctx_1918d2f8589e`. Respuesta a [la revisión independiente](mcp-defense-independent-review.md) de la fuente anterior `d72e89282f7369e382ea2b40fc3d665d584721723e148540b7fcb38eb6023430`. **Implementadas y probadas offline; pendiente segunda aceptación independiente sobre este freeze.** No es certificación ni autorización de versión estable.

## Cambios y subcasos

| Hallazgo | Corrección | Evidencia dirigida |
|---|---|---|
| IR-01, Baja–Media | Clase explícita ampliada en `src/shape/output.ts`; escapes visibles en strings y claves, conservando colisiones fail-closed, flag code-owned y límite final. | Seis casos nuevos PASSED: UNICODE-EXT, EMOJI, TOOL status, TOOL Advanced Search, BOUNDS y PROCESS. Recorren 269 puntos nuevos, strings anidados/claves, contrabando sintético de bytes con selectores tras emoji, texto/structuredContent, ambos órdenes de colisión y cap de expansión. |
| IR-02, Baja | `assertSafeNetworkEnvironment` rechaza `NODE_USE_SYSTEM_CA` siempre que esté definida; `startupVariable` reconoce únicamente su nombre fijo. | 18 casos nuevos PASSED: cuatro ENV (vacío/0/1/canario), EQUIVALENCE (argv/NODE_OPTIONS/CA aprobada/clasificador), doce STARTUP (stdio/doctor/check-config × cuatro valores) y NATIVE-WARNING con aceptación exacta y rechazos negativos. Exit1, stdout vacío y metadata exacta event/ts/variable, sin valores. |

Los **269 puntos nuevos** son U+FE00–FE0F (16), U+E0100–E01EF (240) y estos 13: U+061C, U+2028, U+2029, U+00AD, U+034F, U+115F, U+1160, U+3164, U+FFA0, U+180E y U+FFF9–FFFB. Permanecen los 213 anteriores: C0 U+0000–001F, DEL/C1 U+007F–009F, bidi U+202A–202E y U+2066–2069, U+200B–200F, U+2060–2064, U+FEFF y Tags U+E0000–E007F. Total: **482 puntos explícitos**.

Decisión: clase reproducible, sin ampliar a `\p{Cc}`, `\p{Cf}`, `\p{Zl}`, `\p{Zp}` ni `Default_Ignorable_Code_Point`. Esas propiedades abarcan puntos adicionales y dependen de tablas Unicode del runtime; no se pretende neutralizar todos ellos. El escape conserva el formato anterior `\u{XXXX}`, hex mayúsculo. Emoji sin selectores, caracteres visibles, texto multilingüe y acentos combinantes ordinarios se conservan; eliminar un selector puede cambiar su presentación gráfica y es la neutralización elegida.

Un encoder independiente transforma el canario sintético en selectores. Se comprueba que no quedan sus code points/bytes UTF-8 ni el canario original literal en las salidas probadas. **Los escapes son reversibles**: un lector puede reconstruir los puntos y la codificación. Esto hace visible el canal; no demuestra borrado irreversible de secretos transformados, DLP general ni resistencia semántica a prompt injection. El flag no puede sobrescribirse desde upstream. IDs JSON-RPC y redacción/minimización siguen fuera de estos cambios; sus regresiones anteriores pasan.

TOOL usa cliente falso con una lectura y cero auditorías adicionales. PROCESS y STARTUP precargan `diagnostic-guard.mjs`: fallarían ante DNS/socket/HMAC reales. Pasan con cero intentos y sin marcador de efecto prohibido. `NODE_EXTRA_CA_CERTS` sigue permitido; la CA sintética se conserva también en los probes de rechazo. La equivalencia argv/NODE_OPTIONS se prueba en el guard; `NODE_USE_SYSTEM_CA` se pasa como ambiente real de los hijos antes del arranque. No se usan red externa ni tokens reales.

## Reproducción y preservación

Se añadieron inicialmente 23 casos y luego una regresión del aviso nativo: **24 nuevos**, **238 históricos + 62 MR + 24 IR = 324 seguridad**, y **86 dirigidos**. El prefijo anterior de 19,668 bytes de `mcp-defense.test.mjs` conserva SHA-256 `649b7e73f723ca9aa95db93fa79c7d1f77934c128140bfef03a66152da5575cf`. Los seis ficheros históricos coinciden con el manifest anterior. El test completo actual tiene SHA-256 `ce7f63514613f432ac68ab61bc3aefebb3ecdb788474042749a5adb17f10367e`.

| Recibo aislado | Fuente | Resultado |
|---|---|---|
| [17:26:06, reproducción anterior](../../test/security/evidence/mcp-defense-2026-10-05T17-26-06-512Z.json) | d72e8928… | Build0; dirigido **63 PASSED / 22 FAIL** de 85; estándar 106/106. Los 62 anteriores pasan; de los 23 nuevos solo EQUIVALENCE pasa. Reproduce IR-01/02 sin debilitar oráculos. |
| [17:27:09, corregido dirigido](../../test/security/evidence/mcp-defense-2026-10-05T17-27-09-437Z.json) | eadfe117… | Node24.14.1 Darwin arm64: build0; **85/85 dirigido y npm test 106/106**, cero fallos/bloqueos. |
| [17:27:39, corregido completo sandbox](../../test/security/evidence/2026-10-05T17-27-39-624Z.json) | eadfe117… | **323 subcasos: 311 PASSED / 0 FAIL de producto / 12 BLOCKED**. Node reporta 6 fail por listen EPERM y 6 skipped por bits especiales descartados; runner exit1. Recibo conserva los errores y clasifica los bloqueos. No equivale a suite verde ni TLS real. |
| [17:34:01 root Node24 TLS real](../../test/security/evidence/2026-10-05T17-34-01-863Z.json) | eadfe117… | **323 total: 320 PASSED / 0 FAIL / 3 BLOCKED macOS**, receiptComplete true, exit0; seis TLS reales PASSED. Coordinador, confirmado msg_7a610a564595. Harness anterior de 85 dirigidos. |
| [17:37:17, prueba transitoria del helper](../../test/security/evidence/mcp-defense-2026-10-05T17-37-17-126Z.json) | eadfe117… | **85 PASSED / 1 FAIL** de 86: el test negativo sí rechaza el canario, pero esperaba texto de AssertionError equivocado. Corregido para comprobar su código ERR_ASSERTION; producción inalterada y recibo conservado. Estándar 106/106. |
| [17:38:04, dirigido final](../../test/security/evidence/mcp-defense-2026-10-05T17-38-04-361Z.json) | eadfe117… | **86/86 dirigido y npm test 106/106**, build0; nuevo harness ce7f6351… y producción sin drift. |
| [17:38:27 root Node24 final324](../../test/security/evidence/2026-10-05T17-38-27-890Z.json) | eadfe117… | **324 total: 321 PASSED / 0 FAIL / 3 BLOCKED macOS**, receiptComplete true, exit0; seis TLS reales PASSED; 23,738 asserts. Coordinador, confirmado msg_39e629302f11. |
| [17:38:34 root Linux Node22 final324](../../test/security/evidence/linux-node22-2026-10-05T17-38-34-552Z.json) | eadfe117… | Node22.23.3 Linux arm64: **324/324 PASSED, 0 FAIL, 0 BLOCKED**, receiptComplete true, exit0; seis TLS y fixtures de permisos especiales reales PASSED; 23,867 asserts. Coordinador, confirmado msg_8007547eb2f9. |

El completo local registra `receiptComplete:true`, 23,553 invocaciones assert y sourceHashes==builtSourceHashes. Asserts no cuentan requisitos independientes. Los seis TLS bloqueados son trusted/wronghostname/untrusted/expired y slow-body deadline/cancel. Los otros seis son permisos especiales que macOS no materializó; los tests instrumentados separados pasan sin sustituir evidencia del OS.

Comandos ejecutados desde la raíz:

```sh
node test/security/run-defense-isolated.mjs
node test/security/run-isolated.mjs
```

El primero se ejecutó antes y después de corregir. Ambos construyen solo copias temporales con dependencias locales y ambiente sintético. El dirigido ejecuta `node scripts/build.mjs`, `node --import ./dist/test/security/test-runtime-argv.js --test --test-reporter=spec test/security/mcp-defense.test.mjs` y **npm test normal**. El completo añade assertion-counter y concurrencia 1 sobre siete suites. Los comandos absolutos y hashes de runtime/harness están en los recibos. No se editaron runners/bootstrap en esta ronda.

Root300 Node24 y Node22 anteriores corresponden a la fuente anterior y no acreditan las correcciones. El nuevo root323 sí comparte eadfe y runtimeHashes con el dirigido final; su harness precede la regresión NATIVE-WARNING. Los retests finales 324 de Node22/Linux y Node24 están completados en los recibos anteriores. Fuente y los 47 hashes compilados coinciden exactamente con el dirigido final, incluido sourceHashes==builtSourceHashes. Este worker verificó los recibos; las ejecuciones externas las realizó el coordinador.

**Node22/Linux, primera ejecución 323:** el coordinador informó 320 PASSED / 3 FAIL / 0 skipped (msg_f61a57dbd425), con los tres fallos en JSON.parse del stderr de STARTUP value1. Log `/private/tmp/darktrace-mcp-linux-node22-security-ir-final.log`. Reprodujo independientemente que `node -e` importando `node:tls` emite exactamente `Cannot open directory /etc/ssl/certs to load OpenSSL certificates.` antes de ejecutar producto, mientras que sin import TLS no lo emite (msg_3fbc6ea3279e). Diagnostic-guard importa TLS para instrumentarlo. No se ocultó el fallo ni se cambió el rechazo de producción.

El helper añadido reconoce **una sola ocurrencia inicial**, con newline exacto, exclusivamente plataforma Linux/major22/NODE_USE_SYSTEM_CA='1'; después exige JSON íntegro. Un test independiente cubre prefijo repetido, ruta distinta, sufijo/arbitrario, otros valores, Node24/macOS y canario. El escaneo de TODO stderr, marker de DNS/socket/HMAC, exit1, stdout vacío y keys/event/variable exactas permanecen. No permite advertencias genéricas. El runtime puede consultar su truststore antes de los imports/guard de la aplicación; no se afirma impedir ese comportamiento nativo ni otros preloads del host. Este aviso fijo del runtime se distingue del único JSON fijo emitido por el producto.

## Freeze para segunda revisión

**sourceTreeSha256:** `eadfe11732bd6c9bfa89cbfbbb2dc530d86e6984ad285576aab49b4dfc01d917` (mapa ordenado sourceHashes, JSON compacto). Los 27 hashes actuales coinciden con el recibo corregido; frente a la reproducción anterior cambian solo:

| Fuente | SHA-256 |
|---|---|
| src/shape/output.ts | `38d50128abd7f252bf098362a120da434c9db3915ae4282efd175e4b6bf58135` |
| src/config/schema.ts | `3c2a4be497ccc8a85f48be54b8ba8e5b612d39e563f0b25eb989504673b893b5` |
| src/observability/log.ts | `9080a65ff4aed7db68c368010c90e1458228c237ef01a2bfae8987f3e4f6c15a` |

Mapa runtimeHashes compilado SHA-256 `74f24910d8de30f4367245fff2dd445505accbdc29491dc9e419fe565d98e1c6`. Sus 47 hashes individuales y hashes de recibos están en el [manifest de corrección](../../test/security/evidence/mcp-invisible-ca-final-manifest.json). El manifest histórico permanece intacto.

MR-04 **sin drift**: fixture SHA-256 `37b5af95de1786ecce1b8762e12d2d63e577f171511a9db4964518b13a917f72`. Cuatro CONTRACT pasan; nombres/descripciones/esquemas/annotations no cambian. Hashes:

| Perfil | SHA-256 |
|---|---|
| read (27) | `49e37f629592026c68ad3ab2389a855bf702827cb887bce66d1d5ed3747b5052` |
| read+sensitiveRead (28) | `71de9e47636e0f421b1aaaf137bfd0c0e97479cc7ac07edeba7970f3bdb84c1f` |
| read+write (36) | `baaaf4a7ae6bd522201acae1ee7bd3df503373363098390b8794388cf12a142f` |
| read+write+writeCritical (41) | `36d8db13f56644c2083039c47a0bb777bbe3b44a6eb7b907e4ad3ed7122350fb` |

IR-03 integridad node_modules del lab harness, guías MR-08, artefacto/release ST-15 y segunda revisión independiente pertenecen a otros owners. ST-10 writer sigue no implementado; lab7.1/appliance/proveedor externos NOTRUN por esta entrega. No se acepta riesgo residual ni se altera ningún gate. No se tocaron Docker/README/clients/lab/releasehelpers, manifests de paquete, credenciales o configuraciones reales; no hubo commits/push.
