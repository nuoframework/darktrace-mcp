# Revisión visual, de seguridad y Docker de la documentación de diseño

**Estado:** fase de diseño documental. Fecha: 2026-10-05. Autor: trabajador despachado (tarea `task_f7b1ce0625cb`).

**Qué no hice:**
- No edité código, pruebas, el harness, el Dockerfile, las guías de Luna ni `README.md`/`README.es.md`. Los README los leí solo para preparar la integración.
- No hice commits ni push, no cambié versiones y no publiqué assets externos.
- No accedí al laboratorio ni a la API real, y no leí credenciales ni configuraciones.

## 1. Cambios entregados

| Archivo | Cambio |
|---|---|
| `docs/architecture.md` | La §3 pasa a tener cuatro vistas Mermaid compactas: 3.1 ruta de petición y retorno, con la respuesta tratada como dato y no como instrucción; 3.2 perfiles y límites de confianza; 3.3 runtime Docker; 3.4 orden interno de ejecución, que es el diagrama anterior, ahora en vertical. El ejemplo Docker de la §10.2 ya no apunta a una imagen inexistente en `ghcr.io`: usa el ID de la imagen local, `--pull=never` y los mismos flags que la guía Docker. |
| `docs/visual-identity.md` | Nueva sección *Diagrams and badges*: funciones de cada color de la paleta aprobada con su contraste WCAG medido, reglas de los diagramas, badges propuestos con su enlace de evidencia, lista de badges no propuestos a propósito y el markup sugerido para el README. |
| `docs/assets/badges/*.svg` (12) | Badges locales EN y ES: transporte, entorno, licencia, docker, pruebas de seguridad y estado. Sin servicio externo, scripts, `href` ni fuentes incrustadas. Cada uno tiene `role="img"`, `aria-label` y `<title>`, y es XML válido (`xmllint`). |

Las banners, el logotipo oficial y sus archivos no se tocaron.

## 2. Exactitud de los diagramas frente a la fuente

| Afirmación del diagrama | Evidencia |
|---|---|
| Transporte solo stdio; sin puertos | `architecture.md` §9.1; ST-16; el ejemplo Docker no publica puertos |
| Firma HMAC y `node:https` fijado con TLS verificado | §5.2 y §5.3; `rejectUnauthorized:true`; las variables de anulación de CA se rechazan (IR-02, cerrado) |
| Respuesta tratada como dato: tope de tamaño, vistas definidas en el código, redacción y escape de caracteres invisibles | `src/config/schema.ts`: 2 MiB y 60.000 caracteres por defecto; `src/shape/output.ts` (IR-01, cerrado). Se aclara que es una defensa de presentación, no semántica. |
| Lectura activa por defecto; escritura desactivada y con preview sin firmar; operaciones críticas solo en preview; lectura sensible con opt-in; exportación, email y HTTP rechazados | §1 y §8.2 |
| Docker: UID 1000, root de solo lectura, `cap-drop=ALL`, `no-new-privileges`, `--init`, PIDs 64, memoria 256 MiB, logging desactivado, ID fijado, `--pull=never`, tokens montados en solo lectura | `Dockerfile` (`USER 1000:1000`), `README.md` (sección Docker) y `examples/docker.mcp.json` |
| Evidencia de seguridad con fecha | `security/mcp-corrections-acceptance.md`: fuente `eadfe117…`; Linux Node22 324/324; Node24 321 PASS + 3 bloqueos de plataforma en macOS; 0 fallos; suite estándar 106/106 |

No se afirma ningún escaneo limpio, ninguna certificación ni la validación del appliance.

## 3. Validación del render (solo local)

- **Herramientas:** Mermaid 11.17.2, instalado con `--ignore-scripts` en el scratchpad, y Chrome headless con páginas locales. Los 4 diagramas se renderizan sin errores (`OK 4`).
- **Capturas:** tema claro y oscuro, a 896 px (columna de GitHub) y 360 px (móvil).
- **Correcciones tras las capturas:**
  - El abanico de perfiles era demasiado ancho; pasó a `LR`, de modo que las ramas se apilan en vertical.
  - Las restricciones Docker se cortaban a mitad de un flag; ahora se escriben en lenguaje llano.
  - El diagrama interno era una cadena horizontal diminuta; pasó a `TB`.
- **Badges:** renderizados con `rsvg-convert` sobre blanco y sobre `#0D1117`. El texto cabe y el borde gris los mantiene visibles en modo oscuro.
- **Enlaces:** todos los enlaces locales y anclas de `architecture.md` y `visual-identity.md` resuelven (0 fallos).
- **Límites:**
  - GitHub aplica su propio tema de Mermaid y puede cambiar el color de los subgrafos. Las clases de nodo se mantienen y el significado no depende del color.
  - A 360 px el diagrama de perfiles se ve pequeño; GitHub permite ampliar y desplazar los diagramas.
  - No revisé un render real de GitHub, porque el repositorio es privado y no publiqué nada.

## 4. Hallazgos para sus owners (no editados por mí)

| ID | Sev | Owner | Hallazgo | Propuesta |
|---|---|---|---|---|
| VD-01 | Bajo | Luna (`docs/docker.md`) | En *Local build and scan record*, las filas *Final image* e *Inventory/SBOM and vulnerability scan* dicen que el ID y el escaneo están "recorded below", pero el documento no contiene ese registro. | Al cerrar la remediación (distroless o trixie), añadir el ID de la imagen, la versión y la fecha de la base de datos de Trivy, y los recuentos por severidad. Hasta entonces, decir explícitamente "remediación en curso; sin escaneo aceptado". |
| VD-02 | Info | Integración del README (task27) | El README describe el build local como verificado, pero no menciona que el escaneo de la base sigue pendiente. | En la integración, añadir una frase: "remediación del escaneo de la imagen base en curso" y no usar ningún badge de escaneo. |
| VD-03 | Info | `architecture.md` (yo, sin cambiar) | La línea de estado ("implementation IN PROGRESS; not security validated") es anterior a la evidencia del 2026-10-05. | Mantenerla mientras el proyecto sea alfa. La §3 ya enlaza la evidencia con fecha y su alcance. |

## 5. Notas para la integración del README (task27)

- **Avisos:** conservar sin cambios el aviso destacado EN/ES de MCP no oficial, de un tercero sin afiliación ni autorización de Darktrace, y el contacto `contacto@pabloarrabal.com`. Siguen presentes en `README.md:10`, `:146` y `:148`, y en `README.es.md:10`, `:147` y `:149`.
- **Badges:** colocarlos debajo del aviso, nunca antes, con el markup de `visual-identity.md`. Usar los `*-es.svg` en el README en español.
- **Diagrama:** sustituir el Mermaid actual del README por la vista 3.1 (o enlazar a `docs/architecture.md#3-system-overview`) para que haya un solo esquema que mantener.
- **No añadir:** OpenSSF, "OWASP certificado", "0 CVE", "scan passed" ni DHI.

## 6. Integración (tarea `task_e807fbb349a2`)

### 6.1 Arquitectura reconciliada con la fuente

En `docs/architecture.md`:
- La línea de estado ahora dice "private alpha `0.1.0-alpha.0`, stable release conditional", con la evidencia descrita como fechada, sintética y offline, y la compatibilidad con 7.1 como parcial.
- La nueva §1.1, *Current implementation snapshot*, recoge las cifras que verifiqué en `src/coverage/report.generated.json` y `test/security/fixtures/mcp-tool-contracts.json`:

| Concepto | Valor |
|---|---|
| Operaciones en el inventario | 79 |
| Implementadas | 59 |
| Ejecutables según perfil | 54 = 38 GET + 15 POST + 1 DELETE (read 39, medium 9, high 6) |
| Críticas | 5, solo preview |
| Bloqueadas | 19: 14 de email, la descarga de PCAP, 3 formas GET/base64 de Advanced Search y `delete_tags_entities` |
| Excluidas | 1 |
| Herramientas registradas por perfil | `read` 27 · +`sensitiveRead` 28 · +`write` 36 · +`writeCritical` 41 |

- La cifra de 51 corresponde a los nombres de herramienta definidos en el inventario. De ellos, 42 respaldan operaciones implementadas.
- La §6 sigue siendo el catálogo de diseño original, ahora marcado como tal y con enlace a la §1.1.
- No se describe ninguna confirmación futura de operaciones críticas como si ya existiera.
- **Diagrama 3.1:** muestra que los resultados entran en el contexto del proveedor del modelo, como hacía el diagrama anterior del README. La salida al proveedor va dentro de la etiqueta del nodo del cliente; un nodo aparte desordenaba el layout.

### 6.2 Cambios preparados para el README (EN/ES)

**Aplicados** el 2026-10-05, tras el ACK de Luna (`msg_2d78a9149144`, transmitido por el root):
1. **Badges:** la línea de texto "Private GitHub prereleases · Node.js 22+ · stdio · Apache-2.0" se sustituye por los 6 badges locales del idioma correspondiente, colocados **debajo** del aviso no oficial y del lema, cada uno con su enlace a evidencia.
2. **Fila de seguridad:** pasa a dar la evidencia con fecha (fuente `eadfe117…`; Linux Node 22 324/324; macOS Node 24 321 superadas, 3 bloqueadas por plataforma, 0 fallos). Enlaza a `mcp-corrections-acceptance.md` y a la evidencia de release, y advierte de que "no es una certificación".
3. **Herramientas:** una frase con las 27 herramientas del perfil `read` por defecto y enlace a la §1.1.
4. **Diagrama:** el Mermaid antiguo se sustituye por la vista principal 3.1 (traducida en ES), con enlaces a los esquemas de perfiles y límites de confianza y al de Docker.
5. **Docker:** se elimina la afirmación de que el ID y el escaneo están en la guía (VD-01). Por indicación del coordinador, se dice que siguen pendientes el escaneo final, la revisión de licencias, el SBOM y la ejecución Docker contra un appliance real, y que no se afirma un escaneo limpio. La receta (`-i` sin `-t`, `--user 1000:1000`, sin puertos, ID con `--pull=never`) no cambia y coincide con `USER 1000:1000` del `Dockerfile`.
6. **Tabla de documentación:** la fila de arquitectura menciona los diagramas y las herramientas por perfil.

No cambian: banners, logotipo, avisos EN/ES, el contacto `contacto@pabloarrabal.com`, la instalación desde código fuente, el tgz de la prerelease privada ni la receta Docker.

### 6.3 Render local

Los borradores se renderizaron con marked 15.0.12 y Mermaid 11.17.2 en Chrome headless, con los banners y badges reales: EN a 896 px en claro y ES a 358 px en oscuro. El aviso aparece antes de los badges y estos se reparten en 2 líneas (escritorio) o 6 (móvil). La tabla de capacidades necesita desplazamiento horizontal en móvil, igual que antes. Ningún diagrama da error.

### 6.4 Verificación de los README aplicados

- **Avisos y contacto:** en EN y ES, el aviso no oficial aparece 2 veces y `contacto@pabloarrabal.com` también 2 veces. El aviso va **antes** de los badges.
- **Banners y diagrama:** las referencias a los banners siguen intactas y hay un único bloque Mermaid.
- **Enlaces:** todos los enlaces, anclas, `src` y `srcset` locales resuelven (0 fallos).
- **Render:** los README reales se volvieron a renderizar (ES a 896 px en claro, EN a 358 px en oscuro). Mermaid no da error.

## 7. Revisión independiente del perfil `inventory` del harness

Revisé el harness `6b00b0ce2452e33f77a01652cd5ea20e5874d76500af2254878bb855e526cb50`, `docs/lab-validation.md` `b64a1e4546c4f56ca25c2bf2b24191faf712109c13e17d734b7a21ff3b676613` y `security/lab-campaign-inventory-review.md`. Comparé el harness con el `c9d2dbb6…` aceptado en `mcp-corrections-acceptance.md`.

| Requisito | Resultado |
|---|---|
| Descubrimiento con `count=1` sin `recent` | `get_devices` y `get_devicesearch` mantienen `count:1` (y `offset:0`). Solo el perfil `inventory` elimina `seensince`; `minimal` conserva `'300'`. No hay texto libre ni filtros por hostname, IP o MAC. |
| Límites globales fijos | `productionEnvironment()` pasa al proceso hijo `DARKTRACE_MAX_RESPONSE_BYTES`/`MAX_TOOL_OUTPUT_CHARS` desde el perfil (`inventory` 1.048.576 / 60.000; `minimal` 32.768 / 8.192). Son globales para toda la sesión y no se pueden ajustar por CLI. El resto del entorno no cambia (8 llamadas, 1 página, 0 reintentos, concurrencia 1, cola 0, 8 por minuto, 30 s). |
| `get_metricdata` | Solo con `inventory`: necesita un `did` entero positivo descubierto y un `Metrics.name` tomado del campo `name` de una fila de `get_metrics`, validado con `^[A-Za-z][A-Za-z0-9_.-]{0,127}$`. Usa `interval=300`, `breachtimes=false` y `fulldevicedetails=false`, con ventana de 5 minutos en milisegundos anclada una sola vez por ejecución. Si falta el `did` o el nombre, se bloquea antes de la petición. En `minimal` sigue `BLOCKED_METRIC_CONTRACT`. |
| Bloqueos | `get_summarystatistics` (`BLOCKED_EVENTTYPE_CONTRACT`) y `get_endpointdetails` (`BLOCKED_ENDPOINT_IDENTITY`) siguen bloqueados en ambos perfiles, porque `inventoryRecipes` solo sustituye la receta de `get_metricdata`. |
| Binding de los 14 árboles, flags y limpieza de Docker | Sin cambios respecto a `c9d2dbb6…`: `dependencyNames`, `verifyRuntime`, `dockerFlags` (`--init`, `--pids-limit=64`, `--memory=256m`…), la comprobación previa de la imagen y la limpieza por nombre exacto. La revisión de la selección pasa a ejecutarse antes de importar el SDK, lo que es más estricto. |

**Negativos sintéticos** con `diagnostic-guard`, configuración inexistente y sin red:
- `--validation-profile` con los valores `__proto__`, `constructor`, `Inventory` o `full`, o repetido, da siempre `INVALID_VALIDATION_PROFILE`.
- Con `inventory` y el manifiesto antiguo `b9aabc26…` da `DIST_NOT_REVIEWED`, como debe: el harness ha cambiado y hace falta un manifiesto nuevo.
- El digest de política emitido es `d501a0591b1a78ea1dd5363118c233cd78c59aca2400ffd3eadfddc474c15212`, el mismo que declara el owner.

**Hallazgo IN-01 (Info):** cuando el perfil pedido es inválido, la salida de error informa `validationProfile:"minimal"`, que es el valor por defecto, en lugar de indicar que no hay perfil válido. No tiene impacto en la seguridad, porque el proceso falla antes de cualquier efecto, pero un lector del recibo podría interpretarlo como una ejecución en `minimal`. Propuesta: emitir `validationProfile:null` en ese error.

**Conclusión:** el perfil `inventory` cumple los requisitos revisados. Sus resultados sintéticos son conteos de recetas, **no cobertura real**. Antes de una ejecución en vivo, el root necesita un manifiesto nuevo para `6b00b0ce…`. No acepto riesgos y no ejecuté el laboratorio.
