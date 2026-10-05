# Documentación oficial de Darktrace vs. `LegendEvent/darktrace-sdk` v0.10.1

En este documento se compara [`darktrace-threat-visualizer.yaml`](darktrace-threat-visualizer.yaml), generado desde la documentación del Customer Portal (Threat Visualizer API 6.1), con el inventario de endpoints del SDK. El inventario se sacó leyendo el código del SDK, sin ejecutarlo.

## Rutas y métodos

En total hay 79 operaciones en la documentación y 76 en el SDK. Todas las operaciones del SDK aparecen en la documentación. Al revés no: estas tres solo están en la documentación.

| Operación | Por qué falta en el SDK |
|---|---|
| `GET /aianalyst/incidents` | Está deprecada desde 5.2. El README del SDK dice que la cubre, pero no está implementada. |
| `GET /modelbreaches/{pbid}` | El SDK usa `?pbid=` en su lugar. Las dos formas son equivalentes según la documentación. |
| `GET /models/{pid}` | El SDK solo filtra por `?uuid=`. La forma `/models/12` solo aparece en un ejemplo de la documentación. |

## Parámetros: de dónde vienen las diferencias

### 1. Parámetros que el SDK pasa sin validar
Los métodos `get_groups`, `get_stats`, `get_investigations` (`dt_analyst.py`), `Antigena.get_actions` y `ModelBreaches.get` aceptan `**params` y los reenvían tal cual. Su lista de parámetros es la del docstring, que alguien escribió copiando y pegando. Por eso:

- **`/aianalyst/groups`**: el docstring dice `groupcompliance/groupcritical/groupsuspicious`, pero esos nombres son de `/aianalyst/incidentevents`. Para groups, la documentación usa `compliance/critical/suspicious`. El docstring tampoco menciona `includeallpinned`, `includegroupurl` ni `uuid`. Si se siguen los nombres del docstring, el filtro no se aplica y el servidor no da ningún error.
- **`/aianalyst/stats`**: el docstring lista una docena de filtros (`did`, `sid`, `saasonly`, `group*`…). La documentación solo recoge `starttime/endtime`. Parecen copiados del docstring de incidentevents.
- **`/aianalyst/investigations`**: el docstring usa `investigationid` en minúsculas y filtros de `*reporttime`. La documentación usa `investigationId` y `responseData`, con mayúsculas intermedias. Si el servidor distingue mayúsculas, el nombre del SDK no filtraría nada. **Hay que verificarlo contra una instancia.**
- **`/antigena` con `did`** y **`/modelbreaches` con `fulldevicedetails`**: no están en la tabla de parámetros. El flujo de `/antigena/summary` que describe la documentación sí habla de consultar `/antigena` con `did`. Probablemente funcionan aunque no estén documentados.

### 2. Parámetros que el SDK se inventa
- **`/devicesummary`**: el SDK acepta 13 parámetros (`device_name`, `ip_address`, `start_timestamp`, …) y la documentación solo `did`, que además es obligatorio. El propio SDK dice que la guía solo documenta `did`, y tiene abierto el issue #37: el endpoint devuelve HTTP 500 con tokens de API.

### 3. Parámetros que el SDK añade por su cuenta
- `responsedata` en `GET /intelfeed`, `GET /pcaps` y `GET /pcaps/{filename}`. La documentación no lo incluye en estos endpoints, aunque sí en casi todos los demás.
- En `POST /subnets`, el SDK manda `responsedata` **en el body** en lugar de en la query. Es un bug.
- En `GET /tags/{tid}`, el SDK añade `tag`, que es redundante con la ruta. Además, con `tag_id=0` el SDK llama a `/tags` y devuelve todos los tags.
- `metric1..metricN` en `/metricdata` sí está documentado, pero solo en las notas y no en la tabla. Por eso no sale en el YAML.

### 4. Darktrace / EMAIL (`/agemail/...`)
La documentación del portal solo enumera las rutas. Sus parámetros están en el OpenAPI propio de cada instancia, en `https://[instance]/agemail/api/api-docs`. El SDK los ha implementado a mano (`days`, `limit`, `link`, `include_headers`, `eventType`, `offset`). El YAML deja estas operaciones abiertas a propósito: se recomienda combinarlo con el spec oficial de esa URL.

## Autenticación y firma: puntos frágiles del SDK
- **Firma sin url-encoding.** En los GET, el SDK firma los valores sin codificar y `requests` los envía codificados (espacios en `from/to`, comillas en `devicesearch?query=`). La documentación avisa: *"The space must be percent-encoded when making the final request but not when producing the signature."* El comportamiento del SDK es coherente con esa nota, pero solo funciona porque el servidor decodifica antes de verificar la firma.
- **POST JSON con query.** El SDK firma `ruta?a=1&{json}`, un formato que la documentación no define. Solo describe `?param=v` o `?{json}`.
- **Advanced Search.** El SDK descarta `size` y cualquier otra clave que no sea search, fields, offset, timeframe o time. El GET ignora `starttime/endtime`, aunque el POST sí los usa. El base64 no es url-safe y puede contener `/`, `+` y `=` dentro de la ruta.

## Otras observaciones del SDK que conviene tener en cuenta
- Sobre Threat Visualizer 7.0.42, el SDK informa de que `POST /aianalyst/incident/comments` responde SUCCESS pero no guarda el comentario, y de que `summarystatistics?hours=` devuelve 400. Las dos cosas contradicen la documentación 6.1, así que pueden ser regresiones de la versión 7.x.
- `create_manual_action` dice devolver un `codeid` entero, pero devuelve el JSON completo, `{"codeid": N}`, como indica la documentación.

## Comparación directa de los dos ficheros OpenAPI

`python3 tools/diff_openapi.py openapi/darktrace-threat-visualizer.yaml openapi/darktrace-sdk.yaml` compara los dos YAML operación por operación: rutas, parámetros de query y de ruta, cuerpo, tipos, obligatoriedad y content-types. Confirma las diferencias de las secciones anteriores y además saca estas:

| Operación | Diferencia | Causa |
|---|---|---|
| `POST /devices`, `/intelfeed`, `/subnets`, `/modelbreaches/{pbid}/(un)acknowledge` | La documentación admite JSON **o** formulario. El SDK solo envía JSON. | Decisión del SDK. Es válido porque JSON está soportado desde 6.0. |
| `POST /modelbreaches/{pbid}/acknowledge` | `acknowledge` es obligatorio en la documentación y opcional en el SDK. | El SDK siempre manda `true` por defecto. No hay diferencia real. |
| `POST /tags` | `data` es obligatorio en la documentación y opcional en el SDK. | El SDK siempre manda `data: {}` (`dt_tags.py:60`). No hay diferencia real. |
| `GET /similardevices` | `did` es opcional en el SDK. | La tabla de la documentación no recoge `did`, aunque es obligatorio según su ejemplo y su descripción. El SDK lo deja opcional porque permite consultar solo con `token`. Hay que verificarlo contra una instancia. |
| `saasfilter` (`/devices`, `/modelbreaches`) y `protocol` (`/metricdata`) | Array o string en la documentación; `str|list` o `str|int` en el SDK. | Equivalentes: el SDK manda una lista como claves repetidas. |

> La primera versión de `darktrace-sdk.yaml` tenía tres fallos del generador, no del SDK. En `POST /antigena` faltaba `clear`, porque solo se tomaba el cuerpo de la primera función del SDK. `uuid` aparecía como array, aunque el SDK lo envía como cadena CSV. `data` de `/tags` aparecía como string. Los tres están corregidos.

## Resumen de causas
1. **Docstrings copiados entre endpoints** del SDK y parámetros reenviados sin validar. Es la causa de la mayoría de las diferencias de parámetros.
2. **Desfase de versiones**: la documentación es de la 6.1 y el SDK se ha probado sobre 6.3 y 7.0. Eso explica los endpoints deprecados y los comportamientos distintos.
3. **Documentación incompleta**: hay variantes de ruta que solo salen en los ejemplos y parámetros que solo salen en las notas. El SDK cubre algunas de estas variantes y no otras.
4. **Errores reales del SDK**: `responsedata` en el body de `POST /subnets`, comprobaciones de valor vacío en `tags`/`pcaps`, `size` descartado en Advanced Search y `/devicesummary` con parámetros inventados.
