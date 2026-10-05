# Revisión del harness de laboratorio y del parche User-Agent

**Estado:** revisión estática del harness de lectura de laboratorio, del parche User-Agent y de su documentación. Fecha: 2026-10-05. Revisor: trabajador despachado (tarea `task_3e108cf4e1b0`).

**Qué no hice:** no ejecuté suites, no hice llamadas reales, no usé tokens ni configuración reales y no hice commits ni push. Tampoco edité el código, las pruebas ni la documentación. Lo único que ejecuté fue `node --check` y lecturas de archivos. El root asigna las correcciones.

**Veredicto:**
- El parche User-Agent es correcto y mínimo.
- El harness aplica las restricciones de lectura acotada que promete.
- Hay **un hallazgo Medio (LH-01):** el harness ejecuta un `dist/` que hoy está desactualizado y no lo detecta.
- Hay 2 observaciones Bajas o informativas.

## 1. Archivos revisados

| Archivo | SHA-256 |
|---|---|
| `scripts/lab-read-smoke.mjs` | `62077839ed9250cf79268ecd9370ce92b930bcd8c27e7f0138fd72bbf2a402f4` |
| `docs/lab-validation.md` | `7324402b0a52f5812a0ea9b1018289952c8ca85b91399ea6e709d21634b445eb` |
| `src/client/httpClient.ts` (parche de Luna) | `0d62af42ab0741776afa8533fa02c42faea6a80efb015c40a6a43f8de57f449b` |
| `test/unit/client-http.test.ts` | `6f402015e94db15b83028443546bba0099afe31ea0195fbb8a60eebba6eadc3f` |

Comparé el resto de `src/` con la instantánea de `final-code-review.md`: **solo cambió `httpClient.ts`**. `signer.ts`, `httpsConnector.ts`, `load.ts` y `schema.ts` son idénticos.

## 2. Parche User-Agent

| Comprobación | Evidencia | Resultado |
|---|---|---|
| UA fijo y local | `httpClient.ts:105`: `const DARKTRACE_USER_AGENT = 'darktrace-mcp'` | Correcto. Es una constante: no depende de la configuración, del entorno ni de argumentos, y no incluye versión ni host. |
| No altera la firma | `httpClient.ts:609-614`: se añade **después** de `...signed.headers` y antes de `Accept`. El HMAC solo cubre ruta, query, cuerpo y fecha (`signer.ts` sin cambios). | Correcto. El UA no puede sustituir `DTAPI-*` y no entra en el texto firmado. |
| Sin efectos sobre el transporte | El conector, la verificación TLS, el pinning DNS, los reintentos y los límites no cambian | Correcto |
| Prueba | `client-http.test.ts:137-191`: exige `User-Agent === 'darktrace-mcp'`. Sin el UA, las demás cabeceras son exactamente las firmadas más `Accept`, `Accept-Encoding` y `Content-Length`. URL y bytes del cuerpo coinciden con lo firmado. | Adecuada. No la ejecuté, porque no se me pidió correr suites. |

Esto encaja con lo que observó el root: `GET /status` daba 403 sin UA y 200 con un UA fijo y la firma de producción.

## 3. Restricciones del harness

| Requisito | Evidencia | Resultado |
|---|---|---|
| **Perfil de solo lectura forzado** | `:74`: `DARKTRACE_PROFILES=read`, `SENSITIVE_READ=false`, `WRITE_CRITICAL=false`. En producción (`load.ts`, `applyProfiles`) las variables de entorno sustituyen `profiles.write`, `sensitiveRead` y `writeCritical` del JSON. | Correcto. Un JSON que active `write` o `sensitiveRead` queda anulado. |
| **Allowlist fija de GET de baja sensibilidad** | `:7-11`: 3 candidatos con argumentos fijos. `:73`: exige `op.tool===name`, método GET, nivel `read`, sensibilidad `low`, estado `implemented` y que `safeParse` de los argumentos fijos funcione contra el `dist` compilado. `:85`: exige `readOnlyHint` e `idempotentHint` true y `destructiveHint` distinto de true en el listado real. El catálogo confirma `get_status`, `get_models` y `get_tags` como GET, `read`, `low`. | Correcto. La CLI no acepta argumentos libres. |
| **Status primero; parada al primer fallo** | `:39`: `tools[0]==='darktrace_get_status'`, sin duplicados ni desconocidos y como máximo 8. `:89-93`: `break` ante error, forma inesperada o excepción. | Correcto |
| **Límites** | `:74`: `TIMEOUT_MS=30000`, `MAX_CONCURRENT=1`, `QUEUED=0`, `PAGES=1`, `GET_RETRIES=0`, `RATE=8`, `RESPONSE_BYTES=32768`, `OUTPUT_CHARS=8192`. Todos están dentro de los techos y `load.ts` y `schema.ts` los aceptan (cola y reintentos admiten 0). `:49-53`: plazo exterior de 30 s más `timeout`, `maxTotalTimeout` y `resetTimeoutOnProgress:false` del SDK, que existen en el SDK 2.3.0 (`_setupTimeout`). Las llamadas son secuenciales. | Correcto |
| **Nada sensible en stdout, stderr ni archivos** | `:22-24`: stdout solo recibe el sobre JSON; `process.stderr.write` y `console.*` quedan anulados. `:76`: stderr del hijo en `'ignore'`. `:28`: el sobre solo contiene campos fijos. `:65`: la versión solo se emite si encaja con `^\d{1,2}\.\d{1,2}(\.\d{1,4})?$` (excluye IPs y texto). No escribe archivos. Las excepciones se convierten en códigos fijos (`:29-31`, `:93`, `:103`). | Correcto |
| **Sin autenticación, enrutado ni bypass de TLS alternativos** | `:74-75`: el hijo recibe solo las variables listadas, más `DARKTRACE_{PUBLIC,PRIVATE}_TOKEN_FILE` y `NODE_EXTRA_CA_CERTS` si existen. No reenvía tokens directos, URL, allowlist, `NODE_OPTIONS` ni proxies. Semántica del SDK (`@modelcontextprotocol/client` 2.3.0, `dist/stdio.mjs`): `spawn(..., {env:{...getDefaultEnvironment(), ...env}, shell:false})`, y la herencia por defecto en POSIX se limita a `HOME`, `LOGNAME`, `PATH`, `SHELL`, `TERM` y `USER`. | Correcto. Ninguna variable de proxy ni `NODE_OPTIONS` del padre llega al hijo, y producción rechazaría proxies o flags de bypass igualmente. |
| **Buffer stdio** | `:76`: `maxBufferSize:1048576`. En el SDK, si `ReadBuffer.append` se desborda lanza un error y `stdout.on('data')` llama a `close()`. | Correcto; coincide con `lab-validation.md:74` |
| **Sin acceso a la configuración** | El padre nunca abre el archivo de configuración ni los tokens; solo pasa `DARKTRACE_CONFIG_FILE` al hijo (`:74`). Exige ruta absoluta (`:37`). | Correcto |

## 4. Hallazgos

| ID | Sev | Hallazgo (archivo y línea) | Impacto | Corrección propuesta |
|---|---|---|---|---|
| **LH-01** | **Medio** (integridad de la evidencia y funcionamiento) | `scripts/lab-read-smoke.mjs:72-76` importa `dist/src/api/operations.js` y lanza `dist/src/index.js` del checkout **sin comprobar que ese `dist` corresponde a la fuente revisada**. Comprobado: `dist/src/client/httpClient.js` es de las 15:11 y **no contiene `User-Agent`**, mientras que `src/client/httpClient.ts` sí. `lab-validation.md:7` habla de un "reviewed checkout, its production compiled dist", pero nada lo hace cumplir. | Si se ejecuta ahora, el harness usará código sin el UA (reproduciendo el 403 de `/status`), y en general cualquier build desactualizada o modificada, generando evidencia de laboratorio que no corresponde al código revisado. No supone escalada de privilegios: las restricciones de producción del `dist` ejecutado siguen activas. | Antes de iniciar la sesión, que el harness compare los SHA-256 de `dist/src/**` con un manifiesto revisado. Opciones: el `runtime-files.sha256.json` de una release verificada, o la ejecución desde el paquete instalado del tgz verificado (`node_modules/darktrace-mcp/dist/src/index.js`). Si no coinciden, debe fallar con un código fijo como `DIST_NOT_REVIEWED` y emitir el SHA del manifiesto. En `docs/lab-validation.md`, exigir recompilar desde la fuente revisada, o instalar el tgz reconstruido con el UA, antes de la fase 1. **Prueba:** un `dist` sin UA o con un byte cambiado debe fallar antes de lanzar el hijo. |
| LH-02 | Bajo (documentación) | `docs/lab-validation.md` no menciona que el appliance puede exigir un User-Agent (el 403 que observó el root sin él) ni que el UA de producción es el fijo `darktrace-mcp`. En §"Sanitized evidence", `TOOL_ERROR` no distingue un 403 por UA de uno por ACL o firma. | Un operador podría atribuir un 403 a la firma o a las ACL y cambiar de modo de firma sin motivo. | Añadir una nota: la build debe incluir el UA fijo; un `TOOL_ERROR` en status con una build anterior se explica así; no cambiar el modo de firma por ello. **Owner:** el de documentación (Fable), según el encargo. |
| LH-03 | Info | El cliente del SDK 2.3.0 trae `DEFAULT_INPUT_REQUIRED_AUTO_FULFILL = true` para resultados `input_required` (protocolo 2026). El servidor de producción no emite esas solicitudes, y el harness no declara capacidades de sampling ni elicitation. | Ninguno con el servidor actual | Si el servidor llegara a emitirlas, configurar el cliente del harness para no responderlas automáticamente. Sin acción ahora. |

## 5. Límites de esta revisión

- Fue una revisión estática más `node --check`. **No ejecuté** el harness, las suites ni la prueba del UA, y no contacté con el appliance.
- No sé si el appliance exige el UA siempre o solo en algunos endpoints; tomo como dato lo que observó el root.
- La firma en 7.1, las ACL, el resto de endpoints, la elegibilidad del proveedor y la prueba de pinning sobre una red privada real siguen pendientes.
- Nada de lo anterior es una validación de laboratorio ni una aceptación de riesgo.
