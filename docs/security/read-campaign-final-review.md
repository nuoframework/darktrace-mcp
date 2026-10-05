# Revisión de la fuente `4f6ef96` (agregado de resumen y diagnóstico API seguro) y recetas de inventario del harness

**Estado:** revisión independiente e implementación en el harness, solo con pruebas sintéticas. Fecha: 2026-10-05. Revisor: trabajador despachado (tarea `task_157150b97a81`).

**Qué no hice:**
- No usé credenciales, volúmenes reales, el laboratorio ni la API real.
- No modifiqué la fuente de producción ni hice commits.
- Solo cambié `scripts/lab-read-smoke.mjs`, `docs/lab-validation.md` y este informe.

**Veredicto:**
- La fuente `4f6ef96c82b8c3bff7628fbad18aea6eb694819a2e001dc0e30086d1daefd834` queda **aceptada** para el agregado `loginput` y para el `errorCode` seguro.
- Las dos recetas de inventario quedan implementadas y congeladas, a falta de revisión del root y de un manifiesto nuevo.
- La revisión del contrato estable de `tools/list` y de la capacidad de solo lectura de Sol queda **pendiente**: aún no se ha entregado.

## 1. Procedencia

- **Diff revisado:** `eadfe117…` → `4f6ef96c…`, en `api/validation.ts`, `api/operations.ts`, `api/response-view.ts`, `tools/index.ts`, `coverage/report.ts` y `coverage/report.generated.json`.
- **Construcción usada para todas las pruebas:** desde el snapshot de Sol `/private/tmp/darktrace-read-compatibility-h4074cxh`. Su agregado de fuente es exactamente `4f6ef96c…` antes y después de construir, y sus lockfiles son idénticos a los del snapshot limpio del piloto.
- **Corrección de procedimiento:** mi primera copia se tomó del workspace mientras Sol seguía editando la fuente. Incluía `policy/release-capability.ts` y cambios de configuración, así que no era `4f6ef96`. Descarté esos resultados y repetí todo sobre la construcción exacta.
- **Deriva de la fuente:** el workspace actual es `7104f8c4…` por el trabajo en curso de Sol. Este informe **no** cubre esa versión.

## 2. Revisión de la fuente `4f6ef96`

| Área | Hallazgo | Pruebas (exactas, bajo `diagnostic-guard`) |
|---|---|---|
| Excepción de validación | Solo `get_summarystatistics` con `eventtype==='loginput'` exacto, `hours` entero seguro entre 1 y 168 y **un único** ancla: `endtime` en milisegundos según el descriptor y entero mayor o igual que 0, o `to` en formato `YYYY-MM-DD HH:MM:SS` con fecha válida en UTC. Los modos `eventtype`, `csensor` y `mitreTactics` son mutuamente excluyentes. La regla de rangos emparejados se omite **solo** para ese extremo de esa operación; las llamadas de body siguen sin `operationId`, así que no se ven afectadas. | **Aceptados:** `hours` 1 y 168, `endtime=0`, `to` válido, `loginput` sin ancla y `{}`. **Rechazados (23 casos):** `hours` 0, 169, 1,5 o `"1"`; ancla sin `hours`; `endtime` negativo, fraccionario o como texto; `endtime` y `to` a la vez; `to` con fecha imposible, con `T`, con `Z` o con 24:00; `LOGINPUT`; `loginput ` con espacio; otro `eventtype`; `csensor` o `mitreTactics` junto a `eventtype`; `{hours:1}` o `{endtime}` sin `eventtype`; `starttime`, `from` o un parámetro desconocido añadidos. **Sin regresión en otras operaciones:** un `endtime` o `starttime` suelto en `get_modelbreaches`, `get_details`, `get_aianalyst_groups` y `get_network` sigue rechazado. **Petición construida:** exactamente `eventtype`, `endtime` y `hours`, sin inventar `starttime`. |
| Vista de respuesta | `selectResponseView` devuelve `SUMMARY_LOGINPUT_VIEW` solo si la **consulta validada** tiene `eventtype==='loginput'`. En cualquier otro caso, incluidas las variantes `Loginput` o `['loginput']` y cualquier otra operación, usa la vista base. Las claves de la respuesta no influyen. | Los canarios de campos desconocidos, `hostname` e IP se descartan en la proyección. Los 23 tests dirigidos de Sol pasan (23/23). |
| `errorCode` seguro | Solo para `instanceof DarktraceApiError` y solo un miembro de la lista congelada de 14 códigos, **idéntica** a `ApiErrorKind`. El valor emitido es la constante de la lista. Mensaje, estado, `requestId`, URL, stack y configuración nunca se reflejan. El `try/catch` cubre los getters que lanzan excepciones. | Los 14 códigos salen exactos, sin `REQID` ni estado. Un prototipo falsificado con getter que lanza, un `kind` de tipo objeto, un `kind` desconocido, un `Error` normal con `kind:'auth'`, un Proxy, un string, `null` o `{kind:'auth'}` producen **sin `errorCode`** y sin canarios. Un getter que cambia de valor solo puede producir un miembro constante de la lista ("server"), nunca un valor externo. |

**Observaciones informativas (sin bloqueo):**
- La validación es ahora **más estricta** para formas que antes se aceptaban: `{hours:N}` sin `eventtype` y combinaciones de modos se rechazan. Es un endurecimiento, no un debilitamiento.
- El rango de `hours` permitido por la fuente llega a 168 (7 días). La campaña solo usa `hours=1`.
- Un código de error como `auth` o `forbidden` llega al modelo como diagnóstico; es un dato fijo, no remoto.

## 3. Cambios en el harness

`scripts/lab-read-smoke.mjs` pasa de `ad4583071e6c2d7b…` a **`72e13efd34ca4c14514e91a968966466c0018ebbea52c751ae07dc5296d24f5f`**.

- **`inventoryRecipes.get_summarystatistics`:** `{eventtype:'loginput', hours:1}` más un `endtime` igual al ancla de la ejecución, en milisegundos y redondeado al segundo. No añade `starttime` ni amplía la ventana. La revisión de la selección exige un único `endtime` en milisegundos y la existencia de `hours`; si no, `BLOCKED_TIME_UNITS`.
- **`inventoryRecipes.get_endpointdetails`:** `ip` más `devices`, `additionalinfo` y `score` a `false`. El `endpoint_ip` sale **solo** de una fila de `get_devicesearch` en inventory con `did` positivo. Se valida como string de hasta 45 caracteres en `[0-9A-Fa-f:.]` con `isIP`. Se guarda solo en memoria y no se emite nunca. `get_devices` no lo aporta; no se usan hostnames, IP inventadas, DNS ni escaneos.
- **Oráculo:** la vista la elige `selectResponseView` del `dist` compilado y vinculado por el manifiesto, a partir de la consulta validada. Si no existe en inventory, falla con `LOCAL_SCHEMA_MISMATCH`. En `minimal` el resultado es el mismo que antes, porque las demás operaciones conservan su vista base.
- **Diagnóstico:** se añade `apiErrorCode` solo si el propio `structuredContent.errorCode` del resultado coincide con la lista estática de 14 códigos del harness. `errorCode` sigue siendo `TOOL_ERROR`.
- **Política:** `validationPolicy` incluye ahora `apiErrorCodes` y las recetas nuevas. Su digest pasa de `d501a059…` a **`ed55eb308bb748c22494047367f114598614e399b7c6ffb115d969bb41412ac9`**.
- **Se conserva:** `minimal` mantiene `BLOCKED_EVENTTYPE_CONTRACT`, `BLOCKED_ENDPOINT_IDENTITY` y `BLOCKED_METRIC_CONTRACT`. Tampoco cambian el modo volumen de `ad45…` (flags, comprobaciones, ningún borrado de volúmenes), el binding de los 14 árboles, la limpieza por nombre exacto ni la ausencia de logs, puertos, TTY y pulls.

`docs/lab-validation.md` pasa a **`7cd70c29470eb25f5e18ec4e0af810b9594b30e9c7bf29efb994f3db73ad157a`**, con la nueva subsección *Inventory summary aggregate and endpoint details (source 4f6ef96)* y los recuentos de recetas corregidos.

## 4. Pruebas del harness (sintéticas)

| Prueba | Resultado |
|---|---|
| Fixture externo vinculado a la fuente (`campaign-fixture.mjs`, SHA-256 `088244f7…`) | Comprueba el SHA del harness, lo corta antes de `main()` y lo importa con exports añadidos, sobre el `dist` exacto de `4f6ef96`, con `diagnostic-guard`. Resultado **43/43**, cubriendo: argumentos y petición exactos del resumen; bloqueos en `minimal`; endpoint sin handle; 12 IP inválidas (hostname, zona `%`, `/24`, espacios, longitud 46, no strings) dan `BLOCKED_IDENTIFIER_CONTRACT`; 3 IP válidas son aceptadas por la fuente; `remember` (`did>0`, sin sobrescribir, `minimal` y `get_devices` no aportan IP, zona o solo hostname rechazados); revisión de la selección con descriptores mutados (unidades distintas, sin `hours`, otro tier); el oráculo distingue los datos `loginput` de los NOC y de los de tipo erróneo; el envelope, la lista estática y las recetas congeladas. El archivo temporal se borra. |
| Extremo a extremo nativo, sobre la construcción exacta de `4f6ef96` y el manifiesto generado con el generador documentado (`39d7db66…`), con configuración sintética y `baseUrl` `https://127.0.0.1` | `inventory` con `get_status,get_devicesearch,get_summarystatistics,get_endpointdetails` y `minimal` con `--tools darktrace_get_status`: el `initialize`, la revisión de `tools/list` y la revisión de la selección pasan; `get_status` da `TOOL_ERROR` con **`apiErrorCode:"network"`**, porque el conector rechaza `127.0.0.1` antes de abrir un socket. |
| Regresión Docker con volumen | Con la imagen histórica `cb0330dd…` (fuente `eadfe`) se obtiene correctamente `DOCKER_RUNTIME_NOT_REVIEWED`; el volumen se conserva y no queda ningún contenedor. **El modo Docker necesita una imagen reconstruida desde `4f6ef96`.** |

**Límites:**
- No probé el recorrido completo de devicesearch → resumen → endpoint contra un appliance o un servidor sintético con datos: las recetas se validan por unidad y con la fuente vinculada.
- Los recuentos son de preparación, no de cobertura real.

## 5. Siguiente paso del root

1. Generar un snapshot limpio de `4f6ef96`, o de la fuente final revisada, con el harness `72e13efd…`, y un manifiesto nuevo (`ad45…`, `6b2f…` y `b9aa…` ya no valen).
2. Para Docker, reconstruir y reescanear la imagen.
3. Crear el volumen y ejecutar el piloto `inventory` acotado.
4. Destruir el volumen.

La revisión del contrato estable de `tools/list` y de la capacidad inmutable de solo lectura de Sol se hará cuando se entregue, sin fijar automáticamente ningún fixture.
