# Informe de experiencia y estabilidad: el MCP visto por un agente

**Español** · [English](en/ux-stability-report.md)

[README](../README.md) · [Herramientas](tools.md) · [Configuración](configuration.md) · [Seguridad](security.md)

Registro fechado de la experiencia, los errores y la estabilidad del servidor en pruebas de laboratorio.

<a id="ux-and-stability-report-the-mcp-as-seen-by-an-llm-agent"></a>

> **Registro fechado.** Esta ejecución es anterior a la exclusión de la acción Darktrace/Email y a los controles finales de escritura. Las «51 herramientas y 78 operaciones» y la vista previa de correo describen aquella compilación. La candidata 1.1.0 expone 50 herramientas y 77 operaciones ejecutables; consulta la [referencia](tools.md).

Laboratorio: Darktrace 7.1.0 (laboratorio A, nombre omitido), 2026-10-06. Servidor probado: `dist/src/index.js` por stdio, protocolo MCP 2025-06-18. Se evaluó si un agente podía trabajar con fluidez: pocos errores, errores que indiquen qué hacer, valores predeterminados útiles, ningún recorte silencioso y formas de respuesta coherentes. No se registraron datos de respuesta. El banco de pruebas guardó solo metadatos: herramienta, operación, *forma* de los argumentos, éxito/error, errorCode, latencia, bytes, indicadores de recorte, número de elementos y presencia de campos necesarios para el analista.

<a id="1-method"></a>

## 1. Método

- **Banco de pruebas:** cliente JSON-RPC stdio, por la misma ruta que un host. Ejecutó la compilación base (`before`, commit `e4ad0b1`) y la corregida (`after`, este cambio) contra el mismo laboratorio. Las llamadas se encadenaron como una investigación: los listados proporcionaron `did` (positivo, con IP), `pbid`, `groupid` e identificador de incidente de AI Analyst, `mlid`, `pid`, `cid`, `tid`, `sid`, `codeid` y nombre PCAP. El análisis de alertas también usó el dispositivo que originó una alerta en 24 h.
- **Cobertura:** las 51 herramientas y 78 operaciones. Para cada una se probaron argumentos plausibles, valores sin argumentos, variantes de recuento y paginación, ventanas de 1 h / 24 h / 7 d, `minimal`, `responsedata` y pruebas negativas deliberadas: ventana de 8 días, falta de filtro obligatorio, falta de `operation`, UUID sintéticos de correo y herramientas denegadas por política.
- **Perfiles:** `read`, `read,sensitive` y `all`, tres ejecuciones cada uno.
- **Escrituras:** una pasada de cambios reversibles con `all`. Se añadieron comentarios `[mcp-ux]` a una alerta y a AI Analyst, se reconoció y desreconoció una alerta, se desfijó y volvió a fijar un incidente, se creó `mcp-ux-<ts>`, se asignó a un dispositivo y se retiró. También se envió `dryRun` para cada escritura no crítica no reversible: actualizar dispositivo, solicitar PCAP, crear investigación, reconocer/desreconocer AI Analyst y ambas operaciones de entidad por `tid`.
- **Escrituras críticas:** solo vistas previas de Antigena, Antigena manual, intel feed, subredes y acción de correo. La elicitación se probó de extremo a extremo. `confirm:true` con `previewId` y respuesta **decline** (añadir al intel feed) no ejecutó el cambio. En `delete_tags_tid` de la etiqueta de prueba, rechazar la conservó y aceptar la borró. Fue la única acción crítica aceptada.
- **Carga:** tres rondas de 20 lecturas mixtas concurrentes por compilación, en ambos órdenes. Después, prueba sostenida de 10 minutos por compilación a unas 100 llamadas/min (por debajo de 120/min). Antes se ejecutaron 10 minutos sin regular para probar el limitador y 3 minutos sin regular sobre la versión corregida.
- **Totales:** unas 2.100 llamadas medidas (1.046 antes y 1.056 después), 360 concurrentes, 1.938 de carga regulada y unas 504.000 llamadas de prueba del limitador sin regulación.

<a id="2-results"></a>

## 2. Resultados

| Métrica (batería principal, lecturas ×3 por perfil y escrituras) | Antes | Después |
|---|---:|---:|
| Llamadas | 1.046 | 1.056 |
| Éxito de todas las llamadas (incluidas negativas) | 76,4 % | 82,1 % |
| Éxito de llamadas plausibles de analista | 82,6 % | 85,7 % |
| Llamadas plausibles fallidas **en el cliente** | 12 | 0 |
| Errores con el texto genérico «Request rejected… Check operator diagnostics» | 245 / 247 | **0 / 189** |
| Errores con `errorCode` | 172 / 247 | 189 / 189 |
| Errores con `hint` útil | 0 | 187 / 189 (los 2 restantes son escrituras `outcome:"unknown"` con instrucciones propias) |
| Resultados de array con `returnedItems`/`totalItems` | 100 / 440 | 491 / 491 |
| Resultados recortados con recuentos | 130 / 150 | 180 / 200 (los restantes son recortes anidados de varios campos indicados en `truncatedFields` o límites de cadenas) |
| Operaciones con al menos una llamada correcta | 61 / 78 | 62 / 78 |
| Latencia de llamadas correctas, p50 / p95 / máx. | 57 / 418 / 2.398 ms | 56 / 279 / 896 ms |
| Tamaño de respuesta, p50 / p95 | 492 B / 27,6 KB | 1,1 KB / 27,8 KB |

La latencia procede casi enteramente del appliance. Los rechazos del cliente responden en 1–5 ms. El p95 bajó porque los listados de alertas de 24 h y 7 d ya no fallan con `too_large` ni se reintentan. El tamaño p50 creció al añadir recuentos, valores aplicados y pistas, y al devolver datos donde antes había respuestas vacías o fallidas.

**Concurrencia** (3 rondas × 20 llamadas, por compilación, dos órdenes): 60/60 correctas en todos los grupos salvo el primero contra un appliance con caché fría. En ese grupo, `list_models` y `deviceinfo` agotaron 30 s. Le ocurrió a la compilación `after` cuando fue primero, no cuando fue segundo: se atribuyó al calentamiento de caché, no a la compilación. Cada ronda duró 0,4–1,3 s y el p50 por llamada fue 300–560 ms.

**Carga regulada** (10 min, unas 100/min): antes 990/990 correctas; después 947/948 (un timeout transitorio en `metrics/{mlid}`). p50 59 ms en ambas; p95 191 ms antes y 234 ms después. Sin errores de memoria o protocolo ni llamadas atascadas (el banco tiene un supervisor de 60 s por llamada y detecta la salida del servidor).

**Bucle sin regulación** (prueba del limitador): el primer `rate_limited` llegó exactamente en la llamada 121; después pasaron 120/min, todas correctas (1.076 en 10 min antes, 360 en 3 min después). El proceso terminó limpiamente. Los rechazos rápidos `rate_limited` tardan cerca de 1 ms, por lo que un agente en bucle consume tokens muy deprisa. La pista nueva indica esperar hasta 60 s y detener el bucle.

<a id="3-error-taxonomy-before--after-main-battery"></a>

## 3. Clasificación de errores (antes → después, batería principal)

| Clase | Antes | Después | Causa y tratamiento |
|---|---:|---:|---|
| Validación del cliente, llamada plausible | 12 | 0 | Cuatro causas corregidas: (a) el listado PCAP devuelve `filename:"/pcaps/<name>"` y la descarga rechazaba `/`; (b) `{from:…}` en búsqueda de correo se trataba como intervalo temporal; (c) `did`/`sid` devueltos por la API (`-11`, rangos y sensores cliente) fallaban `min(1)`; (d) el mensaje no indicaba campos. |
| Validación del cliente, prueba negativa | 17 | 10 | La ventana de 8 días se rechaza ahora con `invalid_arguments` y la regla de 7 días. Reconocer sin cuerpo dejó de fallar al añadir cuerpo predeterminado. Las pruebas de política son `policy_denied`. |
| `operation` ausente o incorrecta | 46 | 16 | Las herramientas de varios listados eligen la primera llamada del analista (`get_aianalyst_groups`, `get_antigena`, `get_tags`). Las que siguen sin valor predeterminado (`get_reference_data`, `email_dashboard`) devuelven `invalid_operation` con identificadores válidos. |
| `policy_denied` (pruebas de perfiles) | (en validación) | 6 | Antes era texto genérico; ahora indica el perfil necesario y que no se reintente. |
| `too_large` (respuesta > 2 MiB) | 50 | 30 | Alertas de 24 h/7 d sin `minimal`: corregido con `minimal:true` por defecto (datos parciales con recuentos). Quedan los listados completos `models`, `components`, `enums`; descripción y pista incluyen ejemplos `responsedata` probados (`"pid,name"`, `"cid,mlid"`, `"Protocol"`). |
| `forbidden` del appliance (403) | 78 | 83 | Todas las rutas Darktrace/EMAIL: el token carece del permiso o módulo. Después hay 5 más porque la búsqueda ya llega al appliance (antes fallaba en el cliente). |
| `server` del appliance (500/502) | 22 | 22 | `GET /cves` devuelve 500 en este laboratorio no OT (20 llamadas). `DELETE /tags/entities` y `DELETE /tags/{tid}` se aplican pero devuelven 502: correctamente `outcome:"unknown"` (2 llamadas). |
| `network` del appliance (302) | 10 | 10 | `GET /filtertypes` redirige con este token y nunca se siguen redirecciones. La pista ahora lo explica. |
| `bad_request` del appliance | 10 | 10 | `GET /details` sin `did`/`pbid` (negativa). La descripción ahora exige uno de esos filtros. |
| `timeout` / `not_found` | 1 / 1 | 1 / 1 | Timeout transitorio. `not_found` es el resultado esperado al verificar tras borrar. |

<a id="operations-that-fail-on-this-appliance-and-why"></a>

### Operaciones que fallan en este appliance y por qué

| Operaciones | Resultado | Motivo |
|---|---|---|
| 13 Darktrace/EMAIL (dash ×4, resources ×3, audit eventTypes y events, search, decode_link, emails/{uuid}, download) | HTTP 403 | Al token o módulo le falta permiso de correo. No se corrige en el MCP. |
| `get_cves` | HTTP 500 | Endpoint exclusivo de Darktrace/OT en laboratorio no OT. |
| `get_filtertypes` | HTTP 302 → `network` | El appliance redirige para este token. |
| `delete_tags_entities`, `delete_tags_tid` | HTTP 502 tras aplicar | Particularidad del appliance. MCP informa `outcome:"unknown"`; la lectura posterior confirma el cambio. |
| `get_models`, `get_components`, `get_enums` sin `responsedata` | `too_large` | Listas completas de más de 2 MiB. Funcionan con `responsedata`. |
| `get_aianalyst_incidents` | No expuesta | Obsoleta (fila 79 del catálogo). |

Las demás (62 operaciones) pasaron, incluida `get_pcaps_filename`, que ahora funciona encadenada al listado.

<a id="4-fixes-made"></a>

## 4. Correcciones realizadas

Todo el texto que recibe el modelo procede del código. No se refleja ningún valor enviado ni texto, estado o identificador de petición del origen. La ocultación, neutralización, listas permitidas y límites de tamaño no cambian. No se modificaron `src/policy`, `src/config` ni `src/server`.

1. **Errores de validación útiles** (`src/tools/feedback.ts`, `src/tools/index.ts`).
   - Los fallos de esquema devuelven `errorCode:"invalid_arguments"`, `operation`, `requiredFields` y hasta 20 `issues` de forma `{path, problem, expected?, allowed?}`, derivados del esquema zod propio: `required`, `wrong_type`, `too_small`/`too_big` con límite, `invalid_format` con patrón, valores enum y `unknown_parameter` con nombres permitidos.
   - Nunca se repiten los valores. Los nombres desconocidos solo se muestran si cumplen `[A-Za-z0-9_.-]{1,64}`; en otro caso se ocultan como `?`.
   - Los mensajes propios (7 días, tiempos sin pareja, codificación de búsqueda, anclas de resumen, presupuesto de entrada, claves inseguras) se traducen en orientaciones específicas.
   - El documento Advanced Search decodificado se valida con `SearchSchema`; sus fallos se indican como `search.<field>`.
2. **Otros errores incluyen códigos y siguientes pasos.**
   - `policy_denied` indica el perfil necesario solo si esa es la causa.
   - `invalid_operation` enumera identificadores válidos.
   - `unknown_tool`, `invalid_preview` y `rate_limited` (presupuesto de escritura) tienen códigos propios.
   - Los errores del appliance mantienen mensajes propios del código y una pista por código (`src/client/errors.ts`): `auth` (tokens/dirección), `forbidden` (permiso), `rate_limited` (120/min, espera hasta 60 s), `timeout`, `clock_skew_suspected` (sincroniza NTP), `not_found`, `network` (sin redirecciones), `server`.
   - Para `too_large` y recortes, el consejo depende de la operación y solo menciona sus parámetros: reducir `starttime`/`endtime`, `count`, usar `minimal:true`, `responsedata` o ruta por identificador.
3. **Valores predeterminados útiles.**
   - `get_modelbreaches` usa `minimal:true`; `minimal:false` sigue funcionando.
   - Las herramientas de lectura con varios listados tienen una operación preferida.
   - Reconocer/desreconocer alertas usa el único cuerpo válido (`{acknowledge:true}` / `{unacknowledge:true}`).
   - Se informan los valores aplicados en `appliedDefaults`: `count`, `starttime`/`endtime`, `minimal`.
   - Un resultado vacío en la ventana predeterminada indica que era la última hora.
4. **Sin recortes silenciosos; formas coherentes.**
   - Cada array tiene `returnedItems`/`totalItems`; este último cuenta la lista de origen antes del límite de 1.000 (por ejemplo `components` 1000/2752, `models` 516/1385).
   - Las pistas de recorte indican datos parciales y el consejo de la operación.
5. **Datos útiles donde faltaban.**
   - Las secciones de `devicesummary` (dispositivo, similares, alertas, información, detalles) eran `"fields omitted"`. Ahora usan las vistas revisadas de `get_devices`, `get_similardevices`, `get_modelbreaches`, `get_deviceinfo`, `get_details`. Mantienen las mismas listas permitidas: por ejemplo, `credentials` sigue excluido.
   - Las respuestas de un registro desde listados (`tags?tag=<name>`) usan la vista del elemento en lugar de colapsarse.
6. **Formas de identificadores** (`src/api/operations.ts`, `src/api/validation.ts`).
   - El nombre PCAP `"/pcaps/<name>"` del listado se acepta y reduce a `<name>`. Se mantienen las comprobaciones de segmento y ahora se rechazan espacios: el laboratorio devolvía `auth` ante un nombre con espacios, como si fallara la firma.
   - Se permiten filtros `did`/`sid` negativos (-99999..-1, no 0) **solo en parámetros de consulta de lectura**. Cuerpos, rutas y consultas de escritura mantienen `min(1)`.
   - `interval` del gráfico Advanced Search está en milisegundos (se había interpretado como segundos). El laboratorio confirmó 3.600 → 3,6 s y 600.000 → 10 min. Su límite es 604.800.000 ms; `interval` de métricas sigue en 604.800 s.
   - Los cuerpos libres Darktrace/EMAIL ya no pasan la comprobación de pareja temporal: `from` es un remitente.
7. **Descripciones que orientan a llamadas pequeñas y seguras** (`src/tools/descriptions.ts`, `toolDescription`).
   - Las escrituras enumeran campos obligatorios: por ejemplo `post_tags = create tag (body: name, data)` y `post_antigena (body: codeid)`.
   - Las herramientas temporales indican `starttime/endtime epoch ms`.
   - Las notas cubren `minimal`, necesidad de `did`/`pbid` en detalles, ejemplos `responsedata` para modelos, componentes, enumeraciones y métricas, y exclusividad OT de `cves`.
   - Cada descripción sigue siendo de ≤ 600 caracteres y enumera exactamente sus identificadores.

Una revisión independiente examinó el diff. No hubo hallazgos críticos. Se corrigieron sus dos hallazgos importantes: se habían permitido identificadores negativos en la consulta de escritura `delete_tags_entities`, y la pista `policy_denied` culpaba a perfiles cuando el rechazo era de ruta o versión.

<a id="tests"></a>

### Pruebas

- `npm run typecheck`: correcto.
- `npm test`: **183/183** (antes 174). Nueve pruebas nuevas en `test/unit/ux-feedback.test.ts`; dos existentes actualizadas para la operación predeterminada y la clave `hint` de errores API.
- `npm run test:security`: **330 pruebas, 327 correctas, 0 fallos, 3 omitidas**, igual que la base. La instantánea MR-04 `test/security/fixtures/mcp-tool-contracts-full-api.json` se regeneró para los cinco perfiles porque descripciones y esquemas cambiaron deliberadamente. Necesita revisión independiente, como indica `CHANGES-core.md`.
- `src/coverage/report.generated.json` se regeneró al compilar. Solo cambian unidad y límite de `interval` del gráfico.
- El hash de la instantánea y los valores de origen en `scripts/verify-release.mjs` deben recalcularse al publicar. Ese script no se cambió aquí.

<a id="lab-state-after-the-run"></a>

### Estado del laboratorio después

- La API no permite borrar comentarios: quedan algunos `[mcp-ux] stability probe <ts>` en la alerta 1537456 y un incidente AI Analyst.
- Las etiquetas de prueba se borraron; la lectura devolvió `not_found`.
- Se restauraron fijación y reconocimiento. Durante `after` hubo un reconocimiento adicional al convertirse en válida la prueba sin cuerpo; se revirtió desreconociendo y se verificó que la alerta volvía al listado predeterminado de no reconocidas. La prueba ahora usa `dryRun`.

<a id="5-remaining-recommendations"></a>

## 5. Recomendaciones pendientes

1. **Descripciones de parámetros en el esquema de entrada.** `tools/list` incluye tipos y límites, pero no texto por parámetro: unidades y formatos (`seensince`, `iptime`, `from`/`to`, `eventtype`) quedan ocultos salvo que la descripción los mencione. Unas 30 descripciones breves para parámetros frecuentes reducirían las conjeturas. Añadirlas a todos sumaría unos 100 KB, demasiado.
2. **Listas de referencia grandes.** El límite de 2 MiB se alcanza antes de recortar. Opciones: lector JSON parcial/en flujo para devolver datos parciales, o valores `responsedata` predeterminados en código para `models`, `components`, `enums`.
3. **Recorte según presupuesto.** `metrics` devuelve 6 de 322 porque cada una contiene cientos de `filtertypes`. `fitToBudget` recorta el array mayor, la lista exterior; limitar primero arrays anidados permitiría más registros.
4. **Visibilidad del límite de frecuencia.** Exponer presupuesto restante por minuto o `retryAfterSeconds` desde `src/client`/`src/config` permitiría regular al agente y evitar rechazos rápidos.
5. **Timeouts con caché fría.** Rutas pesadas (`models` con `responsedata`, `deviceinfo`) pueden superar 30 s con 20 llamadas simultáneas. Reducir concurrencia o permitir un reintento automático de GET idempotente mitigaría el problema.
6. **Ergonomía de escrituras.** `post_tags` exige `data` incluso vacío; podría usar `data:{}` por defecto. `did` negativo en escrituras (por ejemplo, etiquetar un rango de red) sigue bloqueado a la espera de una decisión expresa.
7. **Email.** Validar rutas Darktrace/EMAIL con un token con permiso de correo. Los cuerpos libres no tienen límite de ventana temporal: aceptable para búsqueda, pero debe revisarse al conocer el esquema.
