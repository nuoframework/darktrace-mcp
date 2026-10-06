# Resultados de defensas MCP — 2026-10-05

Estado: implementación y regresiones offline completadas; revisión independiente y gates externos pendientes. Tarea `task_3fc159ecaed2`, dispatch `ctx_732bcf8186b6`; investigación de entrada: [MR-01–08](mcp-attack-research.md). Este informe no certifica el sistema ni aprueba una versión estable.

Implementé las decisiones explícitas del coordinador para MR-01, MR-02, MR-05 y MR-06, fijé snapshots MR-04 y añadí regresiones MR-03/MR-07. La última ejecución dirigida pasó **62/62** casos nuevos y el comando normal **`npm test` pasó 106/106** pruebas en una copia aislada. El coordinador ejecutó la suite final de **300 casos: 297 PASSED, cero FAIL y tres BLOCKED**, con seis TLS reales, sobre la misma fuente final `d72e8928…`, incluida la última corrección factual de descripciones. Los recibos anteriores quedan conservados con sus hashes distintos.

## Alcance y cambios

- Producción: `src/shape/output.ts`, `src/tools/index.ts`, `src/config/schema.ts`, `src/server/{createServer,input,stdio}.ts` y, con ampliación explícita `msg_7f3caa108e71`, únicamente clasificación fija de diagnóstico en `src/observability/log.ts`.
- Pruebas: nuevo `test/security/mcp-defense.test.mjs`, helpers de contratos/distribución, bootstrap exclusivo de tests, fixture de cuatro contratos y runner de copia aislada. Los seis archivos de casos históricos de 238 pruebas se conservaron; sus recibos e informe anterior no se reescribieron. La prueba estándar de configuración cambió su ejemplo positivo a un perfil sensible sin escrituras, y las nuevas negativas ejercen la combinación antes aceptada.
- Con ampliación `msg_07b7e6321efb`, añadí suplementos fechados a [threat model](threat-model.md#mcp-defense-supplement--2026-10-05) y [test plan](security-test-plan.md#executed-mcp-regression-supplement--2026-10-05). Con `msg_29f2be0db47f`, los runners incluyen README.es.md y examples; `scripts/prepare-release.mjs` solo añade README.es.md a copia/hash de inputs.
- No edité cliente HTTP, connector, Docker, README, manifests ni harness de laboratorio; no hice commit, push, instalación, publicación o pruebas contra un appliance/proveedor. La corrección simultánea de selección de unión en `src/api/response-view.ts` y tres pruebas de contrato corresponden al owner de implementación; la instantánea final incluye ese trabajo, sin atribuírmelo.

## Matriz de aceptación por MR

PASSED significa que pasó el subcaso indicado; no equivale a cumplimiento total de un ST. DEFERRED/NOTRUN identifica lo que esta entrega no prueba.

| ID | Estado local y evidencia | Lo que queda / límite |
|---|---|---|
| **MR-01** | **FIXED / PASSED**: MR-01.UNICODE recorre todos los 213 code points de las clases exigidas, valores anidados y claves; escapes visibles, texto ordinario conservado y colisión de claves rechazada. Dos MR-01.TOOL prueban status y Advanced Search modelados: flag code-owned true, una llamada al cliente falso, cero auditorías adicionales, sin canarios. MR-01.ERROR verifica error fijo y cap tras expansión. | La neutralización se aplica al resultado final después de minimización/redacción; el cap anterior sigue vigente. No elimina instrucciones visibles ni demuestra resistencia semántica del modelo. Las claves upstream no modeladas ya se omiten; la prueba de claves dinámicas ejerce directamente la función común. JSON-RPC IDs quedan fuera de esta transformación. |
| **MR-02** | **FIXED / PASSED**: 36 MR-02.FLAGS, seis MR-02.ENV, CA aprobada/clasificador, MR-02.TEST-RUNTIME y tres modos STARTUP con 10 estímulos cada uno. Rechaza los seis flags tanto en argv como NODE_OPTIONS; las tres variables, incluso vacías; acepta NODE_EXTRA_CA_CERTS. startup_error emite solo event/ts y nombre fijo permitido, nunca valores/canarios. | Los probes de NODE_OPTIONS lo inyectan **después** del arranque nativo de Node, para probar el guard de la aplicación. No equivalen a validar todas las combinaciones nativas de OpenSSL/Node; un preload o startup command malicioso del host sigue fuera del límite. No hay excepción de producción para tls-cipher-list. |
| **MR-03** | **DECISION FIXED / PASSED documental**: scanner de README.md, README.es.md, docs y examples distingue comandos ejecutables/configs JSON/TOML de advertencias y prosa histórica; rechaza bare npm/npx con versión y package-option. Probes sintéticos positivos fallan; npm ci y tgz local pasan. Binarios se excluyen antes de leer UTF-8. | Distribución privada GitHub con tgz verificado; sin reserva/rename/publicación npm. Scanner documental no prueba registro npm, autenticidad de assets ni instalación de artefacto: ST-15 pertenece a release. No corrige comandos arbitrarios construidos por un host externo. |
| **MR-04** | **SNAPSHOTS FIXED / PASSED**: cuatro MR-04.CONTRACT comprueban igualdad completa de nombres, orden, descripción, inputSchema y annotations, más SHA-256 canónico. Captura explícita separada; el test normal nunca actualiza el oracle. | Hashes preparados para integración en build-evidence por owner de release: **DEFERRED** en esta entrega. Anotaciones/descripciones fijas no garantizan que un cliente confíe correctamente en otro servidor. |
| **MR-05** | **FIXED / PASSED**: pre-init list/call, initialized falsificado y llamadas entre initialize e initialized devuelven errores JSON-RPC con cero efectos del cliente. Inicialización posterior correcta, listado y lectura funcionan. MR-05/07.PROCESS agrega guard de DNS/socket/HMAC. | Identidad sigue siendo posesión del pipe; no hay identidad humana nueva. Se prueba la sesión stdio legacy prevista, no un servicio HTTP ni autorización OAuth. |
| **MR-06** | **FIXED / PASSED**: sensitiveRead+write produce error de configuración, con/sin critical y en objeto/env/protected-file+env overlays. Los cuatro perfiles permitidos cargan. Arranque y diagnósticos rechazan antes de operación/DNS/socket/HMAC. | No existe campo de aceptación del riesgo ni salida condicional por dryRun:false. El host puede transferir datos entre otros procesos/servidores: no se afirma prevención general de toxic agent flows. |
| **MR-07** | **REGRESSIONS ADDED / PASSED**: 30, 000 niveles en 60, 002 bytes incluyendo newline, lote tras negociar 2024-11-05, operación duplicada en ambos órdenes y con spelling escapado, duplicados anidados, strings con delimitadores y scopes distintos. Cero operación-cliente, sesión viva y stdout JSON-RPC válido; fixed protocol_error en el subprocess. | Duplicados se rechazan antes del SDK mediante scanner iterativo sobre JSON ya validado y bounded; el frame ambiguo se convierte en objeto inválido, con diagnóstico fijo y sin respuesta de operación. No se reescribe ningún ID enviado: las respuestas válidas conservan correlación exacta incluso con controles/token sintético. No constituye fuzzing exhaustivo ni garantía de recursos para cualquier versión SDK. |
| **MR-08** | **GUIDANCE HANDED OFF**: `msg_6a297c749b71` y `msg_f940c517e352` enviados al root para owner Docker/docs: host/perfil dedicado sin servidores MCP no confiables, revisión de cambios de herramientas, comandos absolutos de artefacto privado verificado y versión revisada de Inspector ≥0.14.1 si se usa en desarrollo. | Publicación/revisión de guías, Inspector actual, aislamiento de host y controles reales de imagen: **DEFERRED / NOTRUN** por este worker. Contenedor no impide inyección semántica, host cross-server shadowing ni proveedor egress. |

MR-01/05.JSONRPC demuestra por separado que un ID con token **sintético** y controles se devuelve idéntico; la redacción del transporte se limita a result/error/params, conservando el envelope. Por ello la ausencia de canarios se exige en payloads, no en ese ID deliberadamente suministrado por el caller.

## Contratos MR-04 para release

Canonicalización: JSON UTF-8, claves de objetos ordenadas recursivamente, arrays en su orden original. Datos fijados en [mcp-tool-contracts.json](../../test/security/fixtures/mcp-tool-contracts.json); helper [mcp-contracts.mjs](../../test/security/mcp-contracts.mjs) exporta `profiles`, `canonical`, `digest`, `toolContract`. Revisé nombres/orden, las descripciones fijas del código, esquemas estrictos y annotations; no hay descripciones provenientes del appliance ni del proveedor. La revisión independiente posterior debe volver a evaluar estos contratos. La única actualización posterior fue explícitamente autorizada por `msg_648506340a9e`: sustituir la afirmación antigua de ausencia de validación live por `Live compatibility is operation- and release-specific; consult the published validation evidence.` porque otro owner ya produjo evidencia parcial de laboratorio; no implica catálogo completo validado. [Delta revisable](../../test/security/evidence/mcp-contract-description-delta.json) conserva hashes anteriores/nuevos y demuestra exactamente 132 descriptions cambiadas: restaurar el fragmento deja nombres, orden, inputSchema y annotations idénticos.

| Perfil | Herramientas | SHA-256 |
|---|---:|---|
| read | 27 | `49e37f629592026c68ad3ab2389a855bf702827cb887bce66d1d5ed3747b5052` |
| read+sensitiveRead | 28 | `71de9e47636e0f421b1aaaf137bfd0c0e97479cc7ac07edeba7970f3bdb84c1f` |
| read+write | 36 | `baaaf4a7ae6bd522201acae1ee7bd3df503373363098390b8794388cf12a142f` |
| read+write+writeCritical | 41 | `36d8db13f56644c2083039c47a0bb777bbe3b44a6eb7b907e4ad3ed7122350fb` |

No snapshot permite sensitiveRead+write. Cinco critical tools siguen preview-only y email permanece bloqueado; que el perfil critical tenga más herramientas no implica ejecución crítica.

## Ejecuciones y trazabilidad

Runtime observado: **Node v24.14.1, Darwin arm64**, 2026-10-05. Los runners copian fuente, tests, scripts, OpenAPI, docs y ejemplos a un directorio temporal, enlazan node_modules existente y construyen solo allí. Child env limpiado, CA sintética local; tokens/fixtures de la campaña anterior son sintéticos. Ni instalaciones ni acceso a secretos reales. Linux, Node22 y acceso real al appliance/proveedor **NOTRUN por este worker**.

Comandos desde la raíz, ejecutados en copias aisladas por los scripts:

```sh
node test/security/run-defense-isolated.mjs --capture-contracts
node test/security/run-defense-isolated.mjs
node test/security/run-isolated.mjs
```

El segundo script ejecuta el build, el test dirigido y el **`npm test` normal del manifest sin editarlo**. Su log conserva `npm run build && node --test dist/test/**/*.test.js`. El primer comando de captura se ejecutó una vez para crear el contrato inicial, no tras un fallo de contrato; la única actualización de fixture fue la corrección factual explícita de descripción anterior, con delta verificado y nuevo retest. Ningún runner normal actualiza el oracle.

| Recibo | Resultado y motivo |
|---|---|
| [16:52:57](../../test/security/evidence/mcp-defense-2026-10-05T16-52-57-667Z.json) | Build0; targeted59/60, standard98/103. Fallos por Node24 test runner inyectando su default tls-cipher-list en execArgv, correctamente denegado por el nuevo guard. Conservar el recibo, no atribuirlo a un test de permisos/file ni ocultarlo. |
| [16:54:37](../../test/security/evidence/mcp-defense-2026-10-05T16-54-37-543Z.json) | Build0; targeted60/60 y standard106/106 después de bootstrap exclusivo de tests. Fuente combinada incluye la corrección de unión del otro owner. |
| [16:57:55](../../test/security/evidence/mcp-defense-2026-10-05T16-57-55-830Z.json) | Build0; targeted61/61 y npm test normal106/106; añade límites de scope del scanner de claves duplicadas. |
| [16:59:25 sandbox](../../test/security/evidence/2026-10-05T16-59-25-647Z.json) | 299 casos:287 PASSED, 0 FAIL de producto, 12 BLOCKED; seis TLS listen EPERM y seis fixtures de bits especiales descartados. Runner exit1 por seis errores listen; **no** suite totalmente verde ni prueba TLS real. 20,344 invocaciones assert, no número de requisitos independientes. |
| [17:00:27 final dirigido](../../test/security/evidence/mcp-defense-2026-10-05T17-00-27-556Z.json) | Build0; **62/62 targeted y npm test106/106**, 0 FAIL/0 BLOCKED. Incluye bootstrap negativo adicional y regresión README.es; recibo SHA-256 `45149c17da9d7ec61e9eb9265a067b8201840715a19a5a55c7ed891b187af288`. |
| [17:00:37 root TLS](../../test/security/evidence/2026-10-05T17-00-37-440Z.json) | Coordinador fuera de sandbox:299 casos,**296 PASSED, 0 FAIL,3 BLOCKED**,20,509 invocaciones assert; seis TLS reales PASSED. Confirmado `msg_bce2d94d9543`. El nuevo TEST-RUNTIME posterior no estaba incluido; recibo SHA-256 `bb1af4fb52710c2b39e59eb5948b1af955abd4d3273e0db71c780c05e4238242`. |
| [17:03:58 root300](../../test/security/evidence/2026-10-05T17-03-58-658Z.json) | Build0/tests0;300 casos,**297 PASSED, 0 FAIL,3 BLOCKED**,20,517 invocaciones assert; seis TLS reales PASSED. SourceTree anterior `0174becc…`, antes de corrección factual de descripciones; recibo SHA-256 `dccb9b298723cbd60d1273c29ef978f405058b5cbe386b4f390d5e16af53e2af`. |
| [17:07:59 final dirigido](../../test/security/evidence/mcp-defense-2026-10-05T17-07-59-861Z.json) | Build0; **62/62 targeted y npm test106/106**, 0 FAIL/0 BLOCKED tras corrección de texto y hashes MR-04. Fuente final `d72e8928…`; recibo SHA-256 `c964b8048d8133091749b4f0e3ead99cf13b0198d65a3494f9636cff214958a2`. |
| [17:09:21 root300 final](../../test/security/evidence/2026-10-05T17-09-21-463Z.json) | Build0/tests0;**300 casos,297 PASSED, 0 FAIL,3 BLOCKED**,20,517 invocaciones assert; seis TLS reales PASSED y receiptComplete true. Confirmación `msg_752cdca98ead`; sourceTree y runtimeHashes iguales al final dirigido. Recibo SHA-256 `4e94fc2c6a0ebb88f1932614fc2419f6c414a2d8024fd70e44fb15ba7657d047`. Los tres BLOCKED son fixtures macOS setgid descartados, no prueba de rechazo por producción. |

Node24 materializa su default nativo de cipher list en los hijos de node:test. [test-runtime-argv.ts](../../test/security/test-runtime-argv.ts) elimina **solo** `--tls-cipher-list=` exactamente igual a `tls.DEFAULT_CIPHERS` y **solo** si existe NODE_TEST_CONTEXT. Los flags custom y todos los casos explícitos de guard permanecen, con prueba propia. La prueba estándar de config importa este helper compilado para que el comando normal pase; los runners de seguridad lo precargan después del build. No lo importa ningún entrypoint de producción ni se empaqueta bajo dist/src. No se cambió la política TLS para hacer pasar el test; la revisión independiente debe examinar este seam.

## Fuente exacta fijada

El recibo final dirigido y root300 final comparten `sourceTreeSha256 = d72e89282f7369e382ea2b40fc3d665d584721723e148540b7fcb38eb6023430`, calculado sobre el mapa ordenado sourceHashes, distinto de `0174becc…` de los pases root anteriores por la corrección de descripción. sourceHashes == builtSourceHashes: generación/build no cambió esos bytes. El SHA-256 del mapa ordenado runtimeHashes final es `2e46e901452a6c62e51bd6e380264d0ad53818c7bbe71f3bae61653593ce2abd`; los hashes individuales están en el recibo y en [manifest final](../../test/security/evidence/mcp-defense-final-manifest.json), que vincula ambos recibos. Comprobé que todos los hashes de fuente y harness del recibo final dirigido coinciden con los archivos actuales antes del cierre.

| Archivo de producción | SHA-256 |
|---|---|
| src/tools/index.ts | `6c792914e076df3537f6d83eb0884803fe1eb01f01feb5241f6d8e9be1048843` |
| src/shape/output.ts | `a79d11f630b7bc2265874b05acceb4ea5df762f47bc3482c7111e4c8491c4d72` |
| src/config/schema.ts | `0402f4e27ed4f17479d865210c63e98e6306d0144cf9bf05fbb11be8ef81dff3` |
| src/server/createServer.ts | `989c59c2eca75af687ff897626b2190b6a916bc7991f04502697d4526cff7744` |
| src/server/input.ts | `061142aaee64ebefe552097a3868d3aa6f06bb45005bcf5c902a1a3e0429ca2e` |
| src/server/stdio.ts | `5f674483f2ad5b47a09242b66855c13e7c7456f7197bdcac8293a052d9fd7510` |
| src/observability/log.ts | `8c5ee0358e433fe36f12cf25b3d8f708779999ace99f0b8ae1b03e386c89ef1d` |
| src/api/response-view.ts (owner de implementación, combinado) | `5f69e5c82283100cc5039e239f64faa2cfd5164a58bc88f0319819b1ccaa010e` |

## Pendientes explícitos

El root pidió cierre de implementación en `msg_86f590e955ca`, sin esperar la próxima ronda, y luego la corrección factual de descripción `msg_648506340a9e`, ya implementada y retesteada también en la suite completa300. Quedan revisión independiente sobre hashes exactos y las fuentes adicionales aportadas por el usuario, integración de MR-04 en build-evidence y rebuild/review de artefacto con las nuevas defensas, publicación/revisión de guías MR-08, Linux/Node22 y los subcasos originales NOTRUN de la campaña anterior. Los TLS sintéticos no prueban pinning socket end-to-end en red privada, ni 7.1, ni aprobación de proveedor. ST-10 writer sigue no implementado y crítico/email/export siguen denegados; cualquier piloto de laboratorio separado tiene su propio alcance y no se ejecutó por esta entrega. Ningún riesgo residual queda aceptado ni ninguna prueba offline autoriza una versión estable.


## Suplemento correctivo IR-01/IR-02 — 2026-10-05

La revisión independiente sobre d72e8928… encontró IR-01 (selectores de variación e invisibles adicionales) e IR-02 (NODE_USE_SYSTEM_CA). Esta ronda corrige exclusivamente shape/output.ts, config/schema.ts y observability/log.ts, añade 24 casos sin alterar 238 históricos ni 62 anteriores y conserva MR-04 sin drift. El [informe correctivo](mcp-invisible-ca-corrections.md) documenta rangos explícitos, límites de la defensa, reproducción negativa22/23 y freeze `eadfe11732bd6c9bfa89cbfbbb2dc530d86e6984ad285576aab49b4dfc01d917`.

En Node24.14.1 aislado pasan 86/86 dirigidos y 106/106 estándar. Suite inicial 323 sandbox: 311 PASSED, 12 BLOCKED, 0 FAIL de producto; runner exit1 por seis listen EPERM, conservados en el recibo. Root323 posterior con TLS real: 320 PASSED, 0 FAIL, 3 BLOCKED macOS. El nuevo caso 24 interpreta solo el aviso exacto de TLS nativo en Linux/Node22/value1; negativos/metadata/canarios/efectos se conservan, sin source drift. Los recibos root300 anteriores y el manifest anterior son historia de la fuente anterior; no acreditan este freeze. El nuevo manifest y los recibos están vinculados desde el informe correctivo; segunda aceptación independiente y retests externos quedan explícitos allí. La neutralización visible es reversible y no demuestra defensa semántica general ni borrado de secretos transformados.


Retests finales sobre el mismo source eadfe y harness ce7f6351…: coordinador Node24 **324 casos, 321 PASSED, 0 FAIL, 3 BLOCKED macOS**; coordinador Linux Node22.23.3 **324/324 PASSED, 0 FAIL, 0 BLOCKED**, ambos exit0/receiptComplete true y seis TLS reales PASSED. El [informe correctivo](mcp-invisible-ca-corrections.md) enlaza recibos/hash exactos, conserva el primer fallo Linux por aviso nativo y mantiene segunda aceptación independiente pendiente.
