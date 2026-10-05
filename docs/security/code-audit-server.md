# Auditoría independiente de código: servidor, API, política, herramientas, observabilidad y cobertura

**Estado:** auditoría de código del alcance indicado. Fecha: 2026-10-05. Auditor: trabajador despachado (tarea `task_91fc80b55093`).

**Veredicto:**
- **No hay defectos Críticos, Altos ni Medios en el alcance.**
- Hay **3 defectos Bajos** (SA-01 a SA-03), **3 observaciones informativas** (SA-04 a SA-06) y **4 huecos de evidencia** (G1 a G4).
- **Funcionan en las reproducciones offline:** el control de política en tiempo de ejecución, el bloqueo de crítico, email y export, `sensitiveRead`, la auditoría que bloquea si falla, la entrada acotada antes del SDK, la redacción y la salida limpia por stdout.

**Esto no es una aprobación de seguridad.** Los mocks y la e2e local no sustituyen las pruebas ST con TLS real ni el laboratorio 7.1. Las correcciones CA-01 a CA-07 del cliente están en curso por otro trabajador. No se acepta ningún riesgo.

## 1. Alcance, instantánea y método

**Dentro del alcance:** `src/{server,api,policy,tools,observability,coverage}`, `src/index.ts`, `scripts/`, `test/contract`, `test/mcp`, `test/unit/policy.test.ts`. Como referencia, el diseño base (ARCH/TM/ST) y `docs/integration-report.md`.

**Fuera del alcance:** cliente, configuración y `shape`. Están en corrección paralela y no los audité ni los edité.

**Hashes SHA-256 del alcance** (la lista completa, 24 archivos, queda en el directorio temporal de la sesión, `server-hashes.txt`):

| Archivo | SHA-256 |
|---|---|
| `src/api/catalogue.generated.json` | `592f9bc1…a0f6e` (coincide con `integration-report.md:61`) |
| `src/coverage/report.generated.json` | `02598229…f53f71f` (coincide con `integration-report.md:63`) |

**Método:**
- Leí íntegro el código fuente, unas 600 líneas sin contar los JSON generados.
- Hice una copia aislada en el directorio temporal de la sesión, sin `.git` ni `/dist`, y ejecuté `node scripts/build.mjs`: salida 0. **Los JSON generados (catálogo y cobertura) son idénticos byte a byte** a los del espacio de trabajo.
- Ejecuté las suites del alcance (`test/contract`, `test/mcp`, `test/unit/policy`): **42 de 42 pasan**. Junto a las 42 del cliente de la auditoría anterior suman las 84 de `integration-report.md:3`.
- Escribí reproducciones sintéticas (`repro.mjs`, `repro2.mjs` y `e2e.sh` en la copia aislada). Usan clientes falsos, tokens centinela y un proceso stdio local. No hubo red externa, laboratorio ni secretos reales.

**Nota sobre la auditoría anterior:** al hacer la copia de la auditoría del cliente usé `--exclude dist` sin anclar, lo que excluyó también `node_modules/*/dist`. Eso explica los errores de tipos de `test/mcp` de entonces; no afecta a sus 42 pruebas del cliente, que pasaron. En esta auditoría usé `--exclude /dist`.

## 2. Controles verificados

| Control | Evidencia | Reproducción |
|---|---|---|
| **Control de política independiente del registro de herramientas** | `tools/index.ts:53-58`: `callTool` busca en **todas** las herramientas y llama a `authorize` antes de validar. Hay una segunda comprobación en `:63`. `policy/guard.ts:6-16`: solo operaciones `implemented`; `/advancedsearch/` exige `sensitiveRead`; crítico exige `write` y `writeCritical`. | **A:** una escritura oculta con perfil por defecto se rechaza con 0 llamadas al cliente. **D:** la búsqueda avanzada sin `sensitiveRead` se rechaza y no aparece en la lista. |
| **Crítico solo en vista previa; email y export bloqueados** | `guard.ts:23-26`: crítico siempre devuelve vista previa. `api/operations.ts:41`: el registro del cliente excluye las operaciones críticas y las no implementadas (defensa en profundidad). `scripts/generate-catalogue.ts:32-36` asigna el estado (email, `get_pcaps_filename`, S5/S6, obsoleta). | **B2:** `delete_tags_tid` con `dryRun:false` devuelve exactamente `{dryRun,operationId,method,parameterNames:["tid"]}` con 0 llamadas. **G:** `get_pcaps_filename` y `confirm:true` se rechazan con 0 llamadas. |
| **Vista previa con nombres permitidos** | `guard.ts:17-22` se ejecuta tras `validateOperation`, que usa esquemas estrictos (`z.strictObject`), así que las claves son las del esquema. Esto cierra el riesgo de CA-06 en el camino de producción. | B2 |
| **Rutas fijas y validación del segmento de ruta** | `operations.ts:64-66` rechaza `/ \ ? #`, `.`, `..`, `%2e`, `%2f`, `%5c` y `%25`. `:82` bloquea query con JSON (S4). | Pruebas de contrato |
| **Límites finitos de los esquemas** | `validation.ts:51-111`: cadenas de hasta 8192, arrays de hasta 100, enteros acotados por nombre, unidades de tiempo desconocidas convertidas en `z.never()`, rangos de fecha emparejados de 7 días como máximo (`:135-143`). Hash de búsqueda canónico, de 16 KiB como máximo y con esquema estricto (`:124-134`). | Cobertura: 418 registros (383 aceptados, 35 bloqueados), cifras confirmadas |
| **Entrada acotada antes del SDK** | `server/input.ts`: admisión por bytes antes de cualquier `JSON.parse`, incluido el salto de línea; se rechazan claves de prototipo; el reemplazo de argumentos no puede subir el presupuesto. `stdio.ts:18`: `maxBufferSize` usa el mismo límite. | **e2e:** 70.000 bytes sin salto de línea producen 0 bytes en stdout y solo `protocol_error`. Un `__proto__` en los argumentos se rechaza de forma saneada. |
| **Redacción que conserva tipos y prototipo, sin fuga de centinelas** | `observability/redact.ts` sustituye literales sin reinterpretar JSON y crea objetos con `Object.create(null)`. `tools/index.ts:30-47` limita profundidad y tamaño, descarta `__proto__/prototype/constructor` y redacta claves sensibles. `stdio.ts:20` redacta todo lo que sale. | **E:** 0 centinelas en el resultado. **e2e:** 0 centinelas en stdout y stderr. |
| **Auditoría** | `tools/index.ts:61`: la auditoría previa se espera (`await`) y bloquea si falla. `:65-66`: si falla la posterior, se informa `completed` sin reintentar. `:77-78`: un error tras enviar se registra como `unknown`. `observability/audit.ts` guarda solo los 5 campos, genera `requestId` si falta, lo valida y valida la operación. Las vistas previas no se auditan, lo que el diseño permite (R3-02). | **C:** la auditoría previa falla y hay 0 llamadas al cliente. |
| **Política antes de firmar o abrir socket; cierre ordenado** | `authorize`, la validación y la vista previa ocurren antes de `client.request`. `stdio.ts:24-46`: un único cierre idempotente para EOF, cierre o error de stdin, error de stdout, cierre del transporte y SIGINT/SIGTERM, que primero llama a `client.close()` (aborta lo activo y lo encolado). La señal de cancelación del SDK llega a `buildRequest`. | **e2e:** al cerrar stdin el proceso termina con salida 0. |
| **Sin puntos de inyección de pruebas en producción** | `index.ts:26` llama a `runStdio(cfg)` **sin** el parámetro `test`, y `stdio.ts:14` usa `createHttpClient(cfg,{operations})` sin `testOnly`. | Cierra el hueco G4 de `code-audit-client.md` |
| **stdout solo JSON-RPC** | Los registros van a stderr (`observability/log.ts`, `audit.ts`). En modo servidor no hay `console.*` ni escrituras directas a stdout fuera de las salidas de CLI (`--help`, `--version`, `--check-config`). | **e2e:** 3 de 3 líneas de stdout son JSON-RPC 2.0. `tools/list` muestra 27 herramientas en modo lectura: las 28 del catálogo menos la búsqueda avanzada. |
| **Sin consulta automática de versión** | Ni `index.ts` ni `stdio.ts` llaman a `/status`. `--check-config` informa `networkProbe:false` y `labValidated:false`. | e2e: `--check-config` sale con 0 |
| **Build portable y reproducible** | `scripts/build.mjs` llama a `node` con rutas de `node_modules`, sin depender del shell, y vuelve a generar el catálogo y la cobertura. | La copia aislada reproduce los JSON byte a byte. Node 22 no se ejecutó (G2). |

## 3. Defectos

| ID | Sev | Defecto y línea | Reproducción | Corrección | Prueba requerida |
|---|---|---|---|---|---|
| **SA-01** | Bajo | **Los errores de arranque y diagnóstico no dicen qué variable falló.** `index.ts:28` sustituye cualquier `ConfigValidationError` por un evento fijo `startup_error`. Las comprobaciones de configuración ya generan mensajes que nombran la variable sin su valor, pero se descartan. Esto contradice ARCH:88, TM:65 y el oráculo de ST-04 ("A rejection identifies only the offending variable name"), y obliga al operador a adivinar. | **e2e:** `HTTPS_PROXY=http://user:pw@proxy --check-config` y `DARKTRACE_PROFILES=read,email --check-config` producen solo `{"event":"startup_error"}`, sin nombre. | Emitir un código fijo más el campo `variable`, tomado **solo** de una lista blanca de nombres conocidos (por ejemplo `HTTPS_PROXY` o `DARKTRACE_PROFILES`), nunca valores, rutas ni mensajes libres. | ST-04 y ST-14: stderr contiene `HTTPS_PROXY` y no contiene `user:pw` ni la URL; lo mismo con un perfil `email`. |
| **SA-02** | Bajo (funcional; no afecta a la seguridad) | **Se inyecta una ventana de 1 hora incluso al pedir un identificador concreto.** `api/operations.ts:49-52` añade `starttime/endtime` = última hora siempre que la operación tenga ambos parámetros y el llamante no los dé. Eso incluye `get_modelbreaches_pbid` con `pbid` en la ruta. Una brecha concreta de más de 1 hora puede devolver resultados vacíos sin aviso. La cobertura documenta este valor por defecto, así que no hay afirmación falsa. | **F:** `get_modelbreaches_pbid` con `{pbid:42}` envía `[["endtime",…],["starttime",…]]` con una diferencia de 1 hora. | Para búsquedas por identificador (parámetro de ruta presente) no inyectar ventana, o rechazar con un mensaje que pida una ventana explícita. Alternativa: indicarlo en la descripción de la herramienta. | Prueba de contrato: `get_modelbreaches_pbid` sin tiempo, con el comportamiento elegido. |
| **SA-03** | Bajo (veracidad de la cobertura) | **La cobertura no recoge reglas `refine` de Zod.** `coverage/report.ts:16-27` saca los límites con `z.toJSONSchema`, que omite los `refine`. Solo `uuid/addlist` y `hash` tienen `additionalRule`. Faltan: `ip/ip1/ip2` (`isIP`, `validation.ts:99`); `from/to` en UTC (validez del calendario, `:103-106`); `count/limit/size` y `offset/page` como cadena (`:97-98`); el máximo de la descripción (`:101-102`). `integration-report.md:19` dice que las reglas que no son de esquema "are stated separately", y eso es **parcialmente inexacto**. El código es más estricto de lo que dice el informe; no hay validaciones falsas, pero la trazabilidad está incompleta. | Por ejemplo, `get_devices.ip` aparece como `string ≤8192` sin regla de IP; `get_antigena.from` aparece solo con el patrón, sin regla de calendario. | Mantener un registro de reglas `refine` en `validation.ts` (nombre y descripción) y que `report.ts` lo copie en `additionalRule`. | `coverage-final.test`: cada parámetro con `refine` tiene `additionalRule`, y casos IP inválida y fecha 2026-02-30 se rechazan. |

## 4. Observaciones informativas

| ID | Observación | Recomendación |
|---|---|---|
| SA-04 | **El esquema anunciado marca como obligatorios campos que tienen valor por defecto.** `createServer.ts:8` usa `z.toJSONSchema` en modo salida, así que `operation` y `dryRun` aparecen en `required`. Por ejemplo, `delete_tags_tid` declara `required:["operation","path","dryRun"]`. Es conservador, pero empuja al modelo a fijar `dryRun` explícitamente. | Usar `z.toJSONSchema(schema,{io:'input'})`. |
| SA-05 | **La agrupación de herramientas se obtiene de una tabla en Markdown.** `generate-catalogue.ts:7-18` lee la tabla de `docs/architecture.md`. Un cambio de prosa puede reagrupar herramientas. El nivel de riesgo y el estado no vienen de ahí, así que la política no se ve afectada. | Mover el mapeo a un JSON del código revisado. |
| SA-06 | **Se anuncia `tools.listChanged:true` aunque la lista es estática** (el SDK lo pone por defecto). | Opcional: desactivarlo. |

## 5. Huecos de evidencia (no son defectos)

| ID | Hueco |
|---|---|
| G1 | **Las pruebas del alcance usan clientes falsos.** No hay e2e del servidor con el cliente real contra un mock TLS local (ST-03 y ST-04 completas). |
| G2 | **Node 22 no se ejecutó**, ni en esta auditoría ni en `integration-report.md:72`. |
| G3 | **Las correcciones CA-01 a CA-07 del cliente están pendientes.** La política del servidor, que filtra los nombres de la vista previa, mitiga CA-06 en producción, pero `HttpClient.send({dryRun})` sigue existiendo. |
| G4 | **`runStdio(cfg,test)` no comprueba `testOnly` en tiempo de ejecución**; solo lo exige el tipo. Hoy el punto de entrada nunca lo pasa. Se recomienda una prueba que impida importarlo desde `index.ts`. |

## 6. Conclusión

- **Resultado:** 0 defectos Críticos, Altos o Medios; 3 Bajos (SA-01 a SA-03) y 3 informativos.
- **Afirmaciones de `integration-report.md` verificadas:** 79 filas (59, 19 y 1), 418 registros (383 y 35), los dos digests, la build reproducible y las 42 pruebas de servidor que pasan. **Excepción:** la afirmación sobre las reglas `refine` (SA-03).
- **Pendientes:** las correcciones SA-01 a SA-03 y CA-01 a CA-07 con sus pruebas, G1 a G4, las pruebas ST-01 a ST-16 en el commit exacto, el laboratorio 7.1, la verificación de artefactos y la decisión sobre el proveedor.
- **Ningún ST se da por aprobado por los mocks, y no se acepta ningún riesgo.**
