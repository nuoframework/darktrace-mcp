# Revisión final independiente del código

**Estado:** revisión independiente de la instantánea final del código. Fecha: 2026-10-05. Revisor: trabajador despachado (tarea `task_656dd60590d4`).

**Veredicto:**
- **Los 18 hallazgos asignados están cerrados en el código y en los documentos de diseño:** CA-01 a CA-07, SA-01 a SA-06, G4 y AD-01 a AD-03. Lo verifiqué leyendo el código y con pruebas propias.
- Durante la revisión encontré **2 defectos nuevos de severidad Baja** (FR-01 y FR-02). Se corrigieron y los revalidé.
- **Las guías de usuario (FR-02b) siguen en fase de publicación** y quedan fuera de este cierre. Las precisiones para el owner van al coordinador en el worker_done: no mencionan la minimización de la salida ni el rechazo de los prefijos de transición IPv6. No afecta al código.
- **Defectos de código abiertos conocidos: 0.**

**Lo que este informe no afirma.** No certifica la seguridad del sistema. No hay validación en el laboratorio 7.1. ST-15 (artefactos) y la elegibilidad del proveedor siguen pendientes. Los mocks y los puntos de inyección de pruebas tienen los límites descritos en §5. No se acepta ningún riesgo.

## 1. Instantánea revisada y comandos

| Elemento | Valor |
|---|---|
| Instantánea final | 78 archivos de `src`, `scripts`, `test`, manifiestos y tsconfig. La lista completa está en `final2-copy-hashes.txt`, en el directorio temporal de la sesión. **El workspace era idéntico a la copia probada** al cerrar (comparación byte a byte con `diff`). |
| `src/config/address.ts` | `095e032867be614dd44dffd49de774a87effe4b9d8ac305cd62de4e1319da61e` (corrección de FR-01) |
| `src/client/httpsConnector.ts` | `cc48293791dec4a615e145dadf1aeba56ef0d805c9a276739ae307c457ae9e8c` (AD-02) |
| `src/shape/redact.ts` | `8c79e7f45fe3d51f174d8473b2d49583681d0704c3a460b78abec27dea0716dc` (AD-01, CA-03) |
| `src/client/httpClient.ts` | `98bf8a8db1814fae2d33af470d4651c6665e75c4c51f97bc1ea502e5d7697f70` |
| `src/tools/index.ts` | `1c5710ca3e9aeb8f3f974ce8c8714e5ea3243619c8d2e0362e6ca1254ecf9849` |
| `src/api/response-view.ts` | `c79148dd35414520ac500af0c9d8e6b4c3c0873e61cb1789fdfd0d6e917961f6` |
| `src/api/response-views.generated.json` | `0b8870f9611af5ba26e7c004f36f4feff9e0212e3bfb0e7110e98465de487838` |
| `docs/architecture.md` / `docs/security/threat-model.md` | `302482254f3106f08cf34e148010b5b05c6b9095ae421059fc19914a49f57583` / `4993ab331d0c437085827fbabef95fcd1db5724b05dd74c8085f46f9088468f5` |

**Comandos que ejecuté** en una copia aislada (`rsync -a --exclude /.git --exclude /dist`), con las variables de proxy, `NODE_OPTIONS` y `NODE_EXTRA_CA_CERTS` eliminadas. Node v24.14.1 en darwin.

| Comando | Resultado |
|---|---|
| `npx --no-install tsc -p tsconfig.json --noEmit` | Salida 0 |
| `npm test` (build más `node --test dist/test/**/*.test.js`) | Salida 0; **102 pruebas, 102 pasan**, 0 fallos, cancelaciones, skips o todos. Repetido en la instantánea inicial y en la final. |
| `probe.mjs`, `spot.mjs`, `e2e.sh` (míos, sintéticos y offline) | Resultados en §3 y §4 |

**Evidencia TLS real del coordinador.** No la dupliqué, a petición del coordinador. Comprobé que sus recibos corresponden byte a byte a lo que revisé:

| Recibo | Correspondencia con mi instantánea | Resultado |
|---|---|---|
| `test/security/evidence/2026-10-05T12-59-46-877Z.json` | Mismos hashes en los 26 archivos de `src` de la instantánea inicial | 215 pasan, 3 bloqueados, 0 fallos |
| `test/security/evidence/2026-10-05T13-13-32-846Z.json` (árbol `f7bfeac1…`, recibo final del coordinador en `msg_b9d1b7d05659`; manifiesto `harness-238-manifest.json`) | Mismos hashes en los 26 archivos de `src` de la instantánea final | build 0, pruebas 0; **235 pasan, 3 bloqueados, 0 fallos**; 13 casos TLS pasan |

Los 3 casos bloqueados son `ST-02 … mode 2600`: macOS no permite crear el archivo con el bit setgid, así que la prueba no puede montarse. No son fallos del producto.

## 2. Estado de cada hallazgo

| ID | Estado | Evidencia propia (lectura del código y prueba) |
|---|---|---|
| CA-01 | **Cerrado** | `httpClient.ts`: solo se reintenta con una lista fija de 7 códigos de error de red previos a la respuesta. Los errores TLS y los desconocidos nunca se reintentan. Cubierto por la prueba unitaria y por el recibo. |
| CA-02 | **Cerrado, por documentación** | El código mantiene el comportamiento conservador: un abort durante la inicialización DNS deja el fallo como terminal. Ahora está documentado en ARCH §5.3 y TM:65 ("caller abort while shared initialization is pending … cached as terminal"). |
| CA-03 | **Cerrado** | `shape/redact.ts`: ya no reinterpreta texto como JSON y usa salidas con `Object.create(null)`. |
| CA-04 | **Cerrado mediante FR-01** | La primera corrección **no era equivalente** a lo pedido (ver FR-01). La corrección final rechaza los prefijos de transición completos; revalidado. |
| CA-05 | **Cerrado** | `load.ts:60`: el archivo de configuración debe tener ruta absoluta. |
| CA-06 | **Cerrado** | La vista previa del cliente se calcula después de las reglas S4/S5/S6 y solo acepta nombres de parámetro del descriptor. En producción la vista previa la genera la capa de política, con esquemas estrictos. |
| CA-07 | **Cerrado** | `docs/configuration.md`: una allowlist vacía es un error de arranque. |
| SA-01 | **Cerrado** | **e2e:** `{"event":"startup_error","variable":"HTTPS_PROXY"}` y `variable:"DARKTRACE_PROFILES"`, sin valores. Las variables desconocidas no se reflejan (`startupVariable` devuelve `undefined`). |
| SA-02 | **Cerrado** | **spot:** la búsqueda por `pbid` envía `query []`; la consulta de colección mantiene la ventana de tiempo. |
| SA-03 | **Cerrado** | **spot:** una IP inválida y `count` 1001 se rechazan, y la cobertura documenta la regla de IP ("Valid IPv4 or IPv6 literal…"). |
| SA-04 | **Cerrado** | `createServer.ts`: el esquema se genera con `z.toJSONSchema(…,{io:'input'})`. |
| SA-05 | **Cerrado** | `src/api/tool-groups.json`: el generador ya no lee el Markdown de arquitectura. |
| SA-06 | **Cerrado** | `listChanged:false` |
| G4 | **Cerrado** | `stdio.ts:14`. **spot:** se rechazan `{testOnly:'true'}`, `testOnly:true` heredado y `null`. `index.ts` llama a `runStdio(cfg)` sin segundo argumento. |
| AD-01 | **Cerrado, con alcance limitado** | **probe:** un token codificado en base64, hex, percent o JSON escapado se redacta. **No se redactan, y así queda documentado en TM:77:** la doble codificación percent y el base64 de un texto con prefijo (`eFBSSVZT…` permanece). |
| AD-02 | **Cerrado** | `httpsConnector.ts`: el listener de abort sigue activo mientras se recibe el cuerpo y destruye la respuesta y el socket. Con TLS real lo cubren los recibos del coordinador (no lo reproduje, a petición suya). |
| AD-03 | **Cerrado** | `response-view.ts` y las vistas generadas. **probe:** en `get_status` los campos desconocidos y `rawMailBody` se omiten; en Advanced Search se excluye `@message`, `@fields` queda como resumen fijo y se descartan claves anidadas extra. 0 centinelas en la salida; aparecen `minimized:true` y `unmodeledFieldsOmitted:true`. |
| **FR-01 (nuevo, Bajo)** | **Cerrado y revalidado** | **Defecto encontrado:** la lectura /48 del prefijo local NAT64 `64:ff9b:1::/48` permitía, con un prefijo /64 del operador, direcciones como `64:ff9b:1:a00:a9:fea9:fe00:0`, que incrusta 169.254.169.254. También se permitían `::ffff:0:0/96` y Teredo. **Corrección decidida por el coordinador:** rechazar los prefijos completos `::/96`, `::ffff:0:0/96`, `64:ff9b::/96`, `64:ff9b:1::/48`, `2002::/16` y `2001::/32`, aunque estén en la allowlist. **Revalidación:** los 8 vectores de transición se rechazan. `::ffff:10.0.0.5`, `10.0.0.5`, `fd12::5`, `8.8.8.8` y `2001:db8::1` se permiten. `::ffff:169.254.169.254`, `100.100.100.200` y `fec0::1` se rechazan. ARCH:110, TM:65 y ST-04 documentan la regla y que **los prefijos NAT64 propios de un operador no se pueden detectar**; para ellos solo sirve la allowlist exacta. |
| **FR-02 (nuevo, Bajo, documentación)** | **Cerrado en ARCH y TM** | ARCH:169 y TM:77 describen ahora las vistas de AD-03 y el alcance acotado de la redacción de AD-01. |
| **FR-02b (Bajo, guías de usuario)** | **Pendiente de la fase de publicación; no es un hallazgo de esta revisión** | Según el coordinador (`msg_5db20a98f11f`), las guías siguen en fase de publicación bajo `ctx_ae36468140d7` y se revisarán con el artefacto en otro dispatch. Precisiones para su owner: en la instantánea revisada, ni `README.md` ni `docs/{configuration,troubleshooting,getting-started,clients}.md` ni la guía en español mencionan la minimización de respuestas (`minimized`, `unmodeledFieldsOmitted`, resumen fijo), ni que **una resolución a NAT64, 6to4 o Teredo se rechaza siempre** y deja un fallo DNS terminal. No requiere cambios de código. |

## 3. Invariantes verificados en la instantánea final

| Invariante | Evidencia |
|---|---|
| **Solo stdio, stdout limpio** | **e2e:** 3 de 3 líneas de stdout son JSON-RPC 2.0; 27 herramientas en lectura (la búsqueda avanzada oculta sin `sensitiveRead`); `__proto__` en los argumentos se rechaza; 0 centinelas en stdout y stderr; con una trama de 70.000 bytes stdout queda vacío y solo hay `protocol_error`. Sin escucha HTTP. |
| **HMAC exacto** | `signer.ts` sin cambios desde mi auditoría del cliente. ST-01 cubierto por las pruebas unitarias y el recibo. |
| **Anclaje DNS/TLS y límites** | Prefijos de transición rechazados (arriba). `rejectUnauthorized:true`, SNI y `checkServerIdentity` sin cambios. Plazo, cola y tasa sin cambios. TLS real en los recibos. |
| **El abort corta el cuerpo y respeta el plazo** | AD-02 (arriba) |
| **Vistas previas definidas por el código** | Las vistas previas críticas tienen 4 campos y no generan llamadas (auditoría del servidor, confirmado por el recibo). La vista previa del cliente valida los nombres. |
| **Secretos codificados redactados** | AD-01, con el alcance limitado ya descrito |
| **Vistas minimizadas, también en Advanced Search** | AD-03, comprobado con el probe |
| **Archivos seguros** | `load.ts` sin regresión. La ruta absoluta se exige (CA-05). |
| **Barreras de proveedor y laboratorio** | `--check-config` informa `labValidated:false` y `networkProbe:false`. Ningún flag habilita email, export ni la ejecución crítica. |

## 4. Defectos nuevos y prioridad

Ningún defecto nuevo de código queda abierto. FR-01 se corrigió y lo revalidé. Las guías de usuario (FR-02b) se revisarán en otro dispatch, cuando la fase de publicación termine. Durante la revisión no encontré regresiones en ninguna de las 102 pruebas, en mis reproducciones ni en los recibos del coordinador.

## 5. Límites explícitos de la evidencia

- **Pinning TLS.** El recibo del coordinador sustituye solo el Agent de la instancia de prueba para que la conexión llegue a loopback. Esto prueba TLS, certificado, SNI y los bytes HTTP reales, **pero no** que un socket de producción alcance una IP privada aprobada. Esa comprobación requiere una red de pruebas aislada y autorizada.
- **Puntos de inyección de pruebas.** El resolver y el conector solo se inyectan con `testOnly:true` propio. `runStdio` exige `testOnly` propio y literal. El punto de entrada de producción no usa ninguno de los dos. Los límites de tasa entre varios procesos no están medidos.
- **Cobertura no ejecutada.** Node 22 no se ejecutó. ST-10 (escritor de exportación) no existe; ST-15 (paquete e imagen) no forma parte de esta revisión. Las reglas de redacción no cubren codificaciones arbitrarias.
- **Fuera de alcance.** No hubo laboratorio, credenciales reales, red externa, commits ni publicación. No edité código, pruebas, informes históricos ni manifiestos.

## 6. Conclusión

- **Código:** los 18 hallazgos asignados (CA-01 a 07, SA-01 a 06, G4, AD-01 a 03) y FR-01 están cerrados con evidencia propia y del coordinador sobre hashes idénticos. **Defectos de código abiertos conocidos: 0.**
- **Documentación:** FR-02 está cerrado en ARCH y TM; las guías de usuario se revisarán con el artefacto (FR-02b).
- **Pendiente antes de cualquier despliegue:** el laboratorio 7.1, ST-15, la elegibilidad del proveedor y la prueba de pinning sobre una red privada real.
- **Esto no es una certificación ni una aceptación de riesgo.**
