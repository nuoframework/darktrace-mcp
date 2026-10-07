# Revisión del README — ronda 3

[README](../../README.md) · [README inglés](../../README.en.md) · [Seguridad](../security.md) · [Versiones](../releases.md)

Revisión propia y cierre de los hallazgos independientes de la documentación española predeterminada y su espejo inglés.

Creada el 2026-10-06; actualizada el 2026-10-07. Base final: `origin/main` en `20293c0`, que incluye #20 (release 1.1.2), #21 (roles de revisión), #22 (plugin 1.1.2) y #18 (instalación). [Respuesta individual a los 27 hallazgos](https://github.com/nuoframework/darktrace-mcp/pull/19#issuecomment-6025877913). No es una nueva validación contra appliances ni una aprobación de despliegue.

## Petición del propietario

| Criterio | Resultado |
|---|---|
| Completo | Presentación, instalación, funcionamiento, capacidades, validación por área, matrices, seguridad, releases, contribución, soporte y licencia |
| Sencillo y fácil | Tres pasos, un comando inicial, tabla y botones opcionales en un desplegable; 220 líneas por README |
| Detallado | Herramientas y operaciones por área, cobertura completa/parcial/sin validar, límites PCAP y resultados DELETE desconocidos; fuentes enlazadas |
| Profesional | Español de España con «tú», condición no oficial y sin afiliación, banner B, insignias, procedencia de marca y GIF conservados |
| Español primero | `README.md` español, `README.en.md` inglés; once pares de guías manuales y referencia generada en `docs/en/`; movimientos mediante `git mv`, sin duplicados `*.es.md` |
| Presentación | H1 primero, selector de idioma, navegación y resumen; anclas inglesas conservadas para enlaces entrantes |
| Diagramas | Arquitectura, secuencia crítica con reversión condicionada y perfiles ramificados; tres Mermaid por idioma renderizados |
| Email | 14 operaciones inventariadas, 13 lecturas sensibles ejecutables y acción excluida; cero validación en vivo, 403 y posterior caída 503 fechada |
| Matrices | Clientes × sistema × instalación, runtime/firma y aprobación; 21 clientes documentados, con los 13 adaptadores de 1.1.3 identificados por fila |
| Versiones | Ejemplos y botones fijados a la 1.1.2 publicada; las novedades de #18 están en `main` y llegan en 1.1.3 |
| Paridad | Tablas y bloques de ejemplos coinciden entre idiomas; las 77 filas generadas conservan nombre, método/ruta, riesgo y perfil |
| Auditorías | Idioma inglés y resultados históricos conservados; índice español de todos los registros. #21 se hereda sin rehacer la redacción de atribuciones |
| Política de seguridad | Resumen español de notificación privada; compromisos originales de respuesta en inglés intactos; enlaces ingleses y estado de distribución corregidos |

## Hechos verificados y fuentes

| Hecho | Fuente |
|---|---|
| 79 operaciones inventariadas, 77 ejecutables y 50 herramientas | `src/api/catalogue.generated.json`, `src/api/tool-groups.json`, [generador](../../scripts/generate-tools-doc.mjs) y [referencia](../tools.md) |
| 59 con evidencia, incluidas 6 parciales; suma 53/6/18 | `validatedOn`, excepciones de cobertura del generador y [campaña 1.1.1](../security/lab-gap-campaign-1.1.1.md) |
| Dos appliances distintos 7.1.0 | Confirmación del propietario: lab A para 1.1.0, lab B para la campaña de huecos 1.1.1. CHANGELOG y metadatos compartidos del generador lo recogen; la cobertura es agregada |
| Perfiles mínimos 38/18/16/5 | `profileOf` y comparación de las filas ES/EN |
| Email 14/13/0 y acción excluida | Catálogo, [validación Email](../security/lab-email-validation.md) y [esquemas observados](../security/email-api-observed.md) |
| Caída Email posterior | Propietario: 2026-10-06, aproximadamente 22:50; todas las rutas `/agemail` devolvieron 503 con HTML «Darktrace Labs». Añadidos solo estos metadatos al registro, sin validación MCP ni cambio de cifras |
| Aprobación, caducidad y aceptación explícita | [Configuración](../configuration.md) y [clientes](../clients.md); implementación consultada sin modificar `src/` |
| Claude Code 2.1.289 y `input_required` | [Clientes](../clients.md#claude-code) y [aprobación](../configuration.md#aprobación-humana); no se extrapola a clientes no probados |
| Firma compact/spaced | [Configuración](../configuration.md#formato-de-fecha-de-la-firma), [evidencia](../security/lab-signing-evidence.md), [correcciones del cliente HTTP](../security/client-remediation-notes.md) |
| Node 22/24, Docker amd64/arm64 y Windows/WSL | [Clientes](../clients.md), [primeros pasos](../getting-started.md), [Docker](../docker.md) y CI fechada enlazada en releases |
| Publicación 1.1.2 | `npm view`, manifiesto ghcr y [GitHub Release](https://github.com/nuoframework/darktrace-mcp/releases/tag/v1.1.2), publicada a las 21:56:59 UTC del 2026-10-06; [workflow](https://github.com/nuoframework/darktrace-mcp/actions/runs/37536315754) y [CI](https://github.com/nuoframework/darktrace-mcp/actions/runs/37536315729) correctos |
| Digest ghcr 1.1.2 | `sha256:fa261c2f7423fa79c66b0b5ddf74d6d8bb53b59a64608dda869959b43900d9ee`; manifiestos amd64/arm64 y distinción entre imagen e índice en ambas guías de releases |
| Instalación definitiva de #18 | `main` en `20293c0`: tablas y rutas de 21 clientes, modos de configuración, generador de botones, Windows y limitaciones; diferenciados de npm 1.1.2 |
| Cifras históricas 230 / 1.150 | [Valores fijados 1.1.0](../security/release-pins-1.1.0.md), enlazados junto a la cifra; no se presentan como resultados actuales |
| Plazos de notificación | [SECURITY.md](../../SECURITY.md): acuse privado en 14 días y corrección en un máximo de 60 desde confirmación salvo acuerdo; texto original preservado |

## Validación final

- `npm test`: **289 pruebas correctas, cero fallos, cero omisiones**.
- `npm run test:security`: **1.150 subcasos, 1.147 correctos, cero fallos y 3 omisiones esperadas de bits de permisos en macOS**. Origen de producción: `38f2cef20454cb122cc879a2819f307e882b6d4b1275c9643206ced1e97db0c1`. Registro de esta ejecución conservado fuera del repositorio.
- `npm run lint`, incluida la comprobación de ambos documentos generados: correcto.
- `node scripts/validate-examples.mjs`: 9 ejemplos JSON, 1 TOML y 20 documentos correctos; no ejecuta comandos ni consulta appliances.
- Comprobador local suministrado: cero enlaces o anclas rotos. Se añadió `vscode-insiders:` a su filtro de protocolos externos para evitar un falso positivo; las comprobaciones locales no cambian.
- Generador: comparación de 77 filas ES/EN; idioma desconocido y eliminación temporal de una traducción provocan errores explícitos. Tabla de mensajes por idioma y datos de laboratorio compartidos, sin sustitución de frases ni retorno silencioso al inglés.
- `node scripts/install-badges.mjs --write`: ambos README ya actualizados a 1.1.2. El auxiliar reconoce el selector de idioma y el título español ampliado. Las pruebas de botones también pasan.
- Seis diagramas renderizados con Mermaid CLI 11; la secuencia española se inspeccionó visualmente. Se comprobó que los diagramas finales coinciden con las entradas renderizadas.
- `python3 scripts/demo/verify.py`: tres GIF y sus enlaces correctos. Los README cumplen el máximo de 220 líneas.
- Once pares manuales y la referencia generada: mismo número de filas de tablas y bloques de ejemplos, H1 primero y marcadores ingleses correctos.
- `npm pack --dry-run --ignore-scripts --json`: ambos README nuevos incluidos, sin el antiguo nombre español. No equivale a una preparación completa de release.
- `git diff --check`: correcto. Sin cambios propios en `src/`, `.github/` ni `claude-plugin/`.

## Integración y alcance

`package.json` ejecuta `docs:check` desde la entrada `lint` ya utilizada por CI; no se editaron workflows. La generación sin `--lang` conserva `docs/tools.md` como ruta predeterminada, ahora en español; `--lang en` produce el espejo.

El empaquetado, la vinculación al origen, los ejemplos y la validación de demos usan el nuevo par de README. El verificador mantiene las comprobaciones de tipo de archivo, permisos, tamaño e igualdad de bytes del espejo; sus campos son `readmeEnSha256` y `readmeEnSourceBinding`.

Con autorización expresa del propietario se actualizaron las referencias a README y su comprobación de presentación en los ejecutores aislados, el comprobador y fixture de distribución, los avisos en inglés y las pruebas de botones. No se debilitaron ni eliminaron aserciones. Las dos versiones siguen comprobándose.

Los 27 hallazgos tienen respuesta individual en la PR. El punto 15 se resolvió por separado en #21 por decisión del propietario; los demás se incorporan aquí. Los registros de 1.1.0/1.1.1 conservan sus fechas y hashes; las funciones de `main` previstas para 1.1.3 no se atribuyen al paquete 1.1.2. La fusión queda a cargo del propietario, sin fusión automática.

## Claridad de la tabla de capacidades

Por indicación final del propietario, ambos README separan Herramientas y Operaciones en columnas, con una nota sobre las variantes agrupadas por herramienta. La evidencia usa `✓ / ◐ / —` y una leyenda inmediatamente debajo; la referencia generada utiliza los mismos símbolos y explica su alcance. Las cifras y la clasificación de operaciones no cambian.

## Presentación de los botones

Los tres botones usan badges oscuros homogéneos de 36 px en una sola fila HTML, con textos localizados y explicación debajo. `scripts/install-badges.mjs` modifica solo su presentación; las funciones de URI siguen siendo las de #18. GitHub eliminaba los esquemas nativos también en `main`; con autorización del propietario se usan envoltorios HTTPS oficiales. El JSON codificado de `config` se conserva byte a byte. Cursor muestra la misma configuración y VS Code/Insiders devuelven HTTP 302 al esquema nativo correcto con la misma entrada y los tres campos `inputs`; no se confirmó ninguna instalación local. La comprobación de contenido del README se adapta a las filas HTML; las pruebas del JSON y de seguridad permanecen intactas. Los tres SVG tienen altura intrínseca de 36 px; la vista renderizada y la comprobación de enlaces HTTPS se enlazan en la PR.

## Descubribilidad

El primer párrafo explica Darktrace MCP server / Model Context Protocol para SOC, respuesta a incidentes, Antigena / RESPOND y Darktrace/Email sin validar, con clientes identificados naturalmente. Seis casos de uso con H3 enlazan a las guías. El pie enlaza a npm, GHCR, la entrada concreta del servidor en MCP Registry y la documentación oficial de Darktrace; el portal requiere acceso y no se inventa una ficha del Claude Directory. La URL del Registry devolvió 404 al comprobarla el 2026-10-07; su publicación sigue pendiente. La propuesta de descripción inglesa tiene 114 caracteres y 20 topics; el comando `gh repo edit` queda para el propietario. Los campos `description` y `keywords` de `package.json` permanecen intactos para que el propietario decida su aplicación en 1.1.3.

## Segunda pasada: hallazgos 28–34

Aplicados en ambos README: comando completo de Cursor para 1.1.2 (#28), aviso literal en negrita de ausencia de afiliación y autorización (#29), título de bloqueo de conexión con Antigena (#30), Email en 1.1.2 sin cambios desde 1.1.1 (#32), flowcharts con una sentencia por línea (#33) y enlace a la entrada específica del Registry (#34). El texto español abre con «Servidor MCP no oficial para Darktrace (Darktrace MCP server)» y usa «triaje» tanto en el título como en el cuerpo. CHANGELOG describe los redirectores HTTPS y sus parámetros (#31).

Se conservan las 220 líneas por README agrupando insignias y etiquetas HTML, sin reducir contenido ni compactar los diagramas. Los tres enlaces de instalación y sus cargas codificadas permanecen idénticos. La comprobación HTTP de la entrada del Registry devuelve 404 («Server not found»); el enlace solicitado no se presenta como prueba de publicación.

Validación de esta segunda pasada: 289 pruebas funcionales correctas; seguridad, 1.147 correctas, cero fallos y las tres omisiones esperadas de permisos macOS; lint y referencias generadas, ejemplos, enlaces locales (1.365 comprobados, cero rotos), GIF y seis renderizados Mermaid correctos. La API de renderizado Markdown de GitHub conserva el aviso literal como párrafo independiente en negrita y el comando completo de Cursor dentro del desplegable en ambos idiomas.
