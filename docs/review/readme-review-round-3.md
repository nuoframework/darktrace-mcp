Revisión propia de la documentación española predeterminada y su espejo inglés, con fuentes y comprobaciones reproducibles.

[README](../../README.md) · [README inglés](../../README.en.md) · [Seguridad](../security.md) · [Versiones](../releases.md)

# Revisión del README — ronda 3

Fecha: 2026-10-06. Revisión del borrador documental, pendiente de la revisión independiente del orquestador. No constituye una nueva validación contra appliances ni una aprobación de publicación del runtime.

## Petición del propietario

| Criterio | Comprobación |
|---|---|
| Completo | Presentación, instalación, funcionamiento, capacidades, validación por área, tres matrices, seguridad, releases, contribución, soporte y licencia, en ese orden |
| Sencillo y fácil | Un comando inicial; una línea por cliente; lectura por defecto; profundidad en guías enlazadas; ambos README de 217 líneas |
| Detallado | Herramientas/operaciones por área, 53 completas + 6 parciales + 18 sin validar, límites PCAP y resultados DELETE desconocidos; fuentes enlazadas |
| Profesional | Español neutro con tratamiento de tú; condición no oficial y sin afiliación; banner variante B, insignias, procedencia de marca y GIF existentes |
| Español primero | `README.md` español, `README.en.md` inglés; guías predeterminadas españolas y espejos en `docs/en/`; movimientos mediante `git mv` |
| Diagramas | Arquitectura, secuencia crítica con reversión condicionada y escala de perfiles; tres Mermaid por idioma, renderizados sin errores |
| Email | 14 operaciones inventariadas: 13 lecturas sensibles ejecutables, acción excluida. Ninguna validada en vivo; HTTP 403 con tokens, consola en otro host con sesión, permisos/esquema/pruebas pendientes |
| Matrices | Clientes × sistema × instalación; runtime y firma; aprobación por cliente/capacidad, distinguiendo rutas documentadas de pruebas ejecutadas |
| Paridad | Mismas secciones, tablas y bloques de ejemplos en las once guías manuales; los 77 registros de operaciones generados coinciden en nombre, método/ruta, riesgo y perfil |
| Evidencia histórica | Informes de `docs/security/` conservan idioma y contenido; nuevo índice español con una línea por archivo. Solo se adapta un enlace al README renombrado |
| Política de seguridad | Resumen español de notificación privada; texto original de plazos de respuesta en inglés intacto |

## Hechos verificados y procedencia

| Hecho | Fuente / comprobación |
|---|---|
| 79 operaciones inventariadas, 77 ejecutables, 50 herramientas | `src/api/catalogue.generated.json`, `src/api/tool-groups.json`, [generador](../../scripts/generate-tools-doc.mjs), [referencia](../tools.md) |
| 59 con evidencia, incluidas 6 parciales | `validatedOn` del catálogo, excepciones del generador y [campaña 1.1.1](../security/lab-gap-campaign-1.1.1.md); suma por áreas 53/6/18 |
| Perfiles mínimos: 38/18/16/5 | Función `profileOf` del generador; contraste de filas ES/EN |
| Email: 14 totales, 13 disponibles, 0 validadas | Catálogo, [prueba Email](../security/lab-email-validation.md), [esquemas observados](../security/email-api-observed.md). El requisito inicial de «14 detrás de sensitive» se precisa: la acción no está registrada en ningún perfil |
| Condiciones de aprobación, caducidad y acknowledgements | [Configuración](../configuration.md), [clientes](../clients.md), implementación consultada sin modificar `src/` |
| Claude Code 2.1.289, protocolo 2026-07-28 y `input_required` | [Clientes](../clients.md#claude-code) y [aprobación](../configuration.md#aprobación-humana). No se extrapola a versiones o clientes no probados |
| Firma compact/spaced y diferencias entre appliances 7.1.0 | [Configuración](../configuration.md#formato-de-fecha-de-la-firma), [evidencia de firma](../security/lab-signing-evidence.md), [correcciones del cliente HTTP](../security/client-remediation-notes.md) |
| Node 22/24, Docker amd64/arm64 y límites de Windows/WSL | [Clientes](../clients.md), [primeros pasos](../getting-started.md), [Docker](../docker.md), trabajos declarados en CI y registros enlazados desde releases |
| Runtime nativo y OpenSSL requieren comprobación separada | [Docker](../docker.md#runtime-support); las afirmaciones históricas se mantienen fechadas |
| Publicación real 1.1.1 | `npm view @nuoframework/darktrace-mcp@1.1.1 version dist.integrity --json`; `gh release view v1.1.1` confirmó release no borrador, no preliminar, publicada el 2026-10-06; `docker buildx imagetools inspect` confirmó las dos arquitecturas |
| Digest ghcr 1.1.1 | `sha256:a1e3944426eddae0e1fa13db0f58a380ae601562dcd4dd93f1767fa42a98a1e1`; distinto del digest histórico 1.1.0, conservado por separado |
| Plazos de notificación | [SECURITY.md](../../SECURITY.md): 14 días para acuse privado, máximo 60 desde confirmación salvo acuerdo; texto inglés original sin cambios |
| Pruebas y riesgos publicados | [Valores fijados 1.1.0](../security/release-pins-1.1.0.md), [revisión final](../security/final-gate-review-1.1.0.md), [decisiones del propietario](../security/owner-decisions-1.1.0.md). No se presentan como pruebas nuevas de este PR |

## Validación del borrador

- Comprobador local de enlaces indicado por el propietario: ejecutado después de leerlo; cero enlaces o anclas locales rotos. Se añadió `vscode-insiders:` al filtro de protocolos externos del comprobador temporal suministrado: antes lo trataba incorrectamente como archivo local; las comprobaciones de archivos y anclas no cambian. Se conservan anclas inglesas para enlaces entrantes a títulos traducidos.
- `node scripts/validate-examples.mjs`: 9 ejemplos JSON, 1 TOML y 20 documentos; sintaxis y política de arranque correctas; no ejecuta comandos ni consulta appliances.
- `npm run lint`: correcto; incluye `npm run docs:check`, que verifica ambos idiomas. No se modifican workflows.
- `npm run docs:tools`: produce `docs/tools.md` español y `docs/en/tools.md` inglés. Invocar el generador sin `--lang` conserva la ruta predeterminada `docs/tools.md`, ahora en español. `--check` funciona con ambos idiomas y rechaza idiomas desconocidos.
- Se compararon programáticamente las 77 filas ES/EN, las cifras del catálogo, el inventario Email y el límite de 220 líneas de ambos README.
- `npx -y @mermaid-js/mermaid-cli@11`: seis diagramas renderizados a SVG; también se inspeccionó visualmente el PNG de la secuencia española. Archivos de comprobación en un directorio temporal, fuera del repositorio.
- `python3 scripts/demo/verify.py`: los tres GIF conservan dimensiones, duración y tamaño admitidos; enlaces de los README y guía de demos correctos.
- `npm pack --dry-run --ignore-scripts --json`: incluye `README.md` y `README.en.md`, no `README.es.md`. Esta comprobación es del inventario documental, no una verificación completa de release.
- `git diff --check`: correcto. Sin modificaciones en `src/`, `.github/` o `claude-plugin/`; los únicos cambios en `test/` son las referencias a los README autorizadas posteriormente por el propietario.

## Adaptaciones de integración

- `package.json`: ambos README en el paquete; generación y comprobación bilingües; `lint` llama a `docs:check`, aprovechando la entrada que ya usa CI. La configuración inicial no tenía una comprobación específica del generador en CI.
- `.dockerignore`, `scripts/prepare-release.mjs`, `scripts/verify-release.mjs`, `scripts/validate-examples.mjs` y `scripts/demo/verify.py`: nuevas rutas. El verificador conserva las comprobaciones de archivo normal, modo, tamaño y vinculación al origen del espejo, ahora con campos `readmeEnSha256` y `readmeEnSourceBinding`.
- Se integró la documentación de [PR #18](https://github.com/nuoframework/darktrace-mcp/pull/18), rama `origin/feat/install-everywhere`, commit `2f12f9d96e6e002fb2c71c4377ff9d96a2d13013`: botones exactos en ambos idiomas, guías `install` y `install-matrix`, y 13 secciones adicionales de clientes con sus ejemplos. Se tradujeron completas y se diferencian los ocho adaptadores publicados en 1.1.1 de los 13 pendientes. No se incorporó código ajeno de `src/` ni pruebas de esa rama. Sus cambios de código deben fusionarse por su PR; la futura versión publicada deberá actualizar los comandos fijados.
- **Integración de tests resuelta con permiso del propietario:** los dos ejecutores aislados y el comprobador de distribución usan `README.md` + `README.en.md`; el fixture de distribución conserva la correspondencia de idiomas. Las dos comprobaciones de avisos escritos en inglés leen `README.en.md`. No se cambian aserciones ni casos de seguridad. `npm test`: 267/267, sin omisiones. `npm run test:security`: 1.150 subcasos, 1.147 correctos, cero fallos y 3 omisiones de bits de permisos en macOS. Registro generado conservado fuera del repositorio; árbol de producción `98e58ced6311366e666077de7878cf0e4eed3f504535373cc464effdb540f9ad`.
- Rebase sobre `main` en `cf9d5e3`: se conservó la instalación del plugin desde su bloqueo y se reflejaron sus instrucciones actualizadas en ambos idiomas; no se editaron sus archivos.
- Revisión independiente: pendiente del orquestador; los hallazgos se resolverán en este mismo PR. No activar fusión automática.

## Seguimiento de integración y revisión

- Rebase sobre `origin/main` en `a287e3a` tras #15: se conservan íntegramente los controles de cadena de suministro y las instrucciones de firmas/procedencia se incorporan en español e inglés.
- #18 sigue pendiente de fusión; se repetirá el rebase con sus documentos definitivos.
- La revisión independiente de #19 todavía no ha publicado hallazgos; se responderá a cada comentario en la PR.
