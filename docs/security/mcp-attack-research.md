# Investigación de metodologías de ataque MCP y matriz de huecos de prueba

**Estado:** investigación y propuesta. Fecha: 2026-10-05. Autor: trabajador despachado (tarea `task_a8272f6d6831`). No implementé nada.

**Qué no hice:** no ataqué el laboratorio, no leí credenciales, configuraciones ni datos reales, y no edité el runtime, el README, Docker, las suites ni los informes históricos. No hice commits.

**Objetivo:** identificar ataques documentados contra MCP aplicables a este servidor (stdio, sin escucha HTTP, un único appliance) que la suite de seguridad actual (238 casos) no cubre, y proponer pruebas sintéticas aisladas para cada uno.

**Resultado:**
- 8 huecos: **3 Medios** (MR-01, MR-03, MR-06), **2 Bajo-Medios** (MR-02, MR-08) y **3 Bajos** (MR-04, MR-05, MR-07), cada uno con su diseño de prueba y owner sugerido.
- Las familias HTTP/OAuth quedan documentadas como no aplicables (§3).
- No invento CVE ni cobertura: cito cada afirmación externa con su URL y fecha, y la evidencia local con el comando y su salida.

## 1. Fuentes primarias consultadas

Consultadas el 2026-10-05 con WebFetch o WebSearch. "Leída" significa que obtuve y revisé el contenido de la página.

| ID | Fuente | URL | Fecha | Qué respalda |
|---|---|---|---|---|
| S1 | MCP Specification — Security Best Practices | https://modelcontextprotocol.io/specification/2025-06-18/basic/security_best_practices (sirve la revisión que enlaza a 2025-11-25) | Revisión 2025-11-25 | Confused deputy, token passthrough y SSRF en el descubrimiento OAuth; secuestro de sesión; *Local MCP Server Compromise*; validación de URL OAuth; stdio en escenarios proxy; minimización de scopes. Leída. |
| S2 | MCP Specification — Tools | https://modelcontextprotocol.io/specification/2025-06-18/server/tools | Revisión 2025-06-18 | Los servidores **MUST** "Validate all tool inputs … Rate limit … Sanitize tool outputs"; los clientes **MUST** tratar las anotaciones como no confiables; `listChanged`. Leída. |
| S3 | MCP Specification — Authorization | https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization | 2025-06-18 | "Implementations using an STDIO transport SHOULD NOT follow this specification, and instead retrieve credentials from the environment." Leída. |
| S4 | MCP Specification — Transports | https://modelcontextprotocol.io/specification/2025-11-25/basic/transports | 2025-11-25 | stdio: mensajes delimitados por saltos de línea sin saltos internos; "The server MUST NOT write anything to its stdout that is not a valid MCP message"; validación de `Origin` solo en HTTP. Leída. |
| S5 | MCP Specification — Lifecycle | https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle | 2025-11-25 | "The client SHOULD NOT send requests other than pings before the server has responded to the initialize request"; usar timeouts con un máximo. Leída. |
| S6 | Invariant Labs, *MCP Security Notification: Tool Poisoning Attacks* (L. Beurer-Kellner, M. Fischer) | https://invariantlabs.ai/blog/mcp-security-notification-tool-poisoning-attacks | 2025-04-01 | Instrucciones ocultas en descripciones, *rug pull* (cambio de descripción tras la aprobación), *shadowing* entre servidores, y anclar con hash las descripciones. Leída. |
| S7 | Invariant Labs, *GitHub MCP Exploited* (M. Milanta, L. Beurer-Kellner) | https://invariantlabs.ai/blog/mcp-github-vulnerability | 2025-05-26 | *Toxic agent flow*: una inyección indirecta en datos devueltos lleva a leer datos privados y escribirlos en un canal público; propone políticas de flujo de datos por sesión. Leída. |
| S8 | Trail of Bits, *Jumping the line* | https://blog.trailofbits.com/2025/04/21/jumping-the-line-how-mcp-servers-can-attack-you-before-you-ever-use-them/ | 2025-04-21 | Inyección vía descripciones antes de cualquier invocación; avisar cuando cambian las herramientas (*trust-on-first-use*). Leída. |
| S9 | Trail of Bits (K. Hoodlet), *Deceiving users with ANSI terminal codes in MCP* | https://blog.trailofbits.com/2025/04/29/deceiving-users-with-ansi-terminal-codes-in-mcp/ | 2025-04-29 | Secuencias ANSI (colores, cursor, borrado de pantalla, hipervínculos OSC 8) en descripciones **y en resultados** de herramientas; recomienda sustituir el byte `0x1b`. Leída. |
| S10 | Embrace The Red (J. Rehberger), *Hiding and finding text with Unicode Tags* | https://embracethered.com/blog/posts/2024/hiding-and-finding-text-with-unicode-tags/ | 2024-01-14 | Los caracteres U+E0000–E007F son invisibles para el usuario pero el LLM los interpreta; recomienda filtrarlos. Leída. |
| S11 | OWASP MCP Top 10 (Phase 3 Beta) | https://github.com/OWASP/www-project-mcp-top-10/blob/main/index.md | 2025 (beta) | MCP01 Token Mismanagement, MCP03 Tool Poisoning, MCP04 Supply Chain, MCP06 Intent Flow Subversion, MCP10 Context Injection & Over-Sharing. Leída. |
| S12 | OWASP GenAI, *Agentic AI – Threats and Mitigations* | https://genai.owasp.org/resource/agentic-ai-threats-and-mitigations/ | 2025-02-17 | Taxonomía de 15 amenazas: uso indebido de herramientas, compromiso de privilegios, sobrecarga de recursos, ruptura de intención, desbordar al humano en el bucle, etc. Leí el resumen de la página, no el PDF completo. |
| S13 | OWASP LLM06:2025 Excessive Agency | https://genai.owasp.org/llmrisk/llm062025-excessive-agency/ | 2025 | Exceso de funcionalidad, permisos y autonomía; aprobación humana; mediación completa. Leída. |
| S14 | GHSA-7f8r-222p-6f5g / CVE-2025-49596 (`@modelcontextprotocol/inspector` < 0.14.1) | https://github.com/advisories/GHSA-7f8r-222p-6f5g | 2025-06-13 | Proxy del Inspector sin autenticación que lanza comandos stdio (CWE-306). Leída. |
| S15 | GHSA-6xpm-ggf7-wc3p / CVE-2025-6514 (`mcp-remote` 0.0.5–0.1.15) | https://github.com/advisories/GHSA-6xpm-ggf7-wc3p | 2025-07-09 | Inyección de comandos a través de `authorization_endpoint` en un flujo OAuth del cliente. Leída. |
| S16 | Radosevich y Halloran, *MCP Safety Audit* (arXiv:2504.03767) | https://arxiv.org/abs/2504.03767 | 2025-04 | Los LLM pueden ser llevados a usar herramientas MCP para ejecutar código, tomar control remoto y robar credenciales. Consulté el abstract y la búsqueda, no el PDF completo. |

## 2. Evidencia local (sintética, offline, sobre la copia de la instantánea revisada)

Usé `dist` de la copia aislada `final2`, con la fuente de `final-code-review.md`. Los clientes de operación eran falsos y los tokens, centinelas.

| Sonda | Comando | Resultado observado |
|---|---|---|
| P1: descripciones de herramientas | `research-probe.mjs`: `z.toJSONSchema` de las 27 herramientas elegibles | 0 esquemas contienen campos `description`. Las descripciones son texto fijo del código, sin texto de la especificación del proveedor. |
| P5: caracteres invisibles o de terminal | `callTool(get_status)` con `version` = `"6.1"` seguido de `ESC[8m`, U+202E, U+200B, U+E0049..E004E, U+2066 y U+0007, y `hostname` con un hipervínculo OSC 8 | `structuredContent.data.version` conserva **todos** los code points (`1b 5b 38 6d 202e 200b e0049 e0047 e004e 2066 7`). El texto escapa ESC como `\u001b`, pero conserva los Unicode Tags y los controles bidi. El OSC 8 del `hostname` llega intacto a `structuredContent`. |
| P6: TLS y OpenSSL | `assertSafeNetworkEnvironment` con `NODE_OPTIONS` en {`--use-openssl-ca`, `--use-system-ca`, `--openssl-config=…`, `--openssl-legacy-provider`, `--tls-cipher-list=NULL`, `--secure-heap=0`} y con las variables `SSL_CERT_FILE`, `SSL_CERT_DIR` y `OPENSSL_CONF` | **Todo se acepta.** En cambio, `--use-env-proxy`, `--tls-min-v1.0`, `--tls-keylog` y las variables de proxy sí se rechazan (ST-03/04.FLAGS y PROXY). |
| A: `tools/call` antes de `initialize` | `frame-probe.sh` | Se despacha y devuelve un error genérico de herramienta. Como `get_status` es elegible, pudo intentar resolver por DNS el nombre reservado `appliance.example` (sin TLS, HTTP ni credenciales). Ver límites en §6. |
| B: anidamiento de 30 000 niveles (≈60 KB) | `frame-probe.sh` | Solo `protocol_error`; la sesión continúa y responde a `tools/list`. Sin caída. |
| C: lote JSON-RPC en una sesión con el protocolo antiguo 2024-11-05 | `frame-probe.sh` | `protocol_error`; ninguna petición del lote se ejecuta. |
| D: clave `operation` duplicada | `frame-probe.sh` | Gana la última (`post_tags`) y se rechaza con "Invalid operation selection". |
| Registro npm | `GET https://registry.npmjs.org/darktrace-mcp` | **HTTP 404**: el nombre no está registrado en npm. |

## 3. Familias no aplicables al despliegue actual

El despliegue actual es stdio, sin escucha HTTP (ST-16) y con credenciales del entorno o de archivos (S3).

| Familia | Fuente | Por qué no aplica | Barrera existente |
|---|---|---|---|
| Confused deputy de un proxy OAuth, token passthrough, scopes, validación de URL de autorización | S1, S3, S15 | No hay OAuth, ni cliente o servidor de autorización, ni tokens emitidos para MCP. El servidor solo firma HMAC hacia un único origen. | ST-16 y ST-03/07/09/16.ENV rechazan HTTP y bearer tokens |
| Secuestro de sesión HTTP y DNS rebinding contra una escucha local | S1, S4, S14 | No hay escucha ni sesión HTTP. Para el Inspector, CVE-2025-49596 afecta a su propio proxy y no se usa en las guías actuales. | ST-16.PROCESS (sin escucha) |
| stdio en escenarios proxy | S1 | No existe un proxy que lance procesos; el host lanza el servidor directamente | — |

Riesgos residuales del host, que el servidor no puede controlar: la ejecución de comandos de configuración maliciosos (S1, *Local MCP Server Compromise*) y el *shadowing* desde otros servidores MCP instalados en el mismo host (S6). Para estos solo se proponen guías (MR-08).

## 4. Matriz de huecos

**Leyenda de severidad:** impacto en este despliegue asumiendo los controles actuales. Medio significa ocultación o exfiltración plausible que depende del host; Bajo significa defensa en profundidad o una regresión no cubierta.

| ID | Metodología (fuentes) | Aplicable | Cobertura actual (IDs de prueba) | Caso que falta | Sev | Diseño de prueba sintética (cero firmas, sockets, escrituras y fugas) | Owner sugerido |
|---|---|---|---|---|---|---|---|
| **MR-01** | Inyección oculta y engaño visual mediante resultados con ANSI, OSC 8, bidi, caracteres de ancho cero y Unicode Tags (S9, S10, S2 "Sanitize tool outputs", S11 MCP06/MCP10, S7) | **Sí.** Los textos del appliance (hostnames, comentarios, títulos, etiquetas) los controla un atacante en la red monitorizada. | ST-06.INJECTION (procedencia y límites), ST-09.MINIMIZATION, ST-02.SINK. **Ninguna** prueba usa caracteres de control o invisibles. Probe P5 demuestra que pasan. | Normalizar o neutralizar C0/C1 (incluido ESC), bidi U+202A–202E y U+2066–2069, ancho cero U+200B–200F, U+2060–2064 y U+FEFF, y Tags U+E0000–E007F en **todos** los strings de la salida (text y structured) y en las claves | **Medio** | En `test/security/policy-sinks.test.mjs`, añadir `ST-06.UNICODE`: un cliente falso devuelve esos caracteres en un campo modelado (`version`, `hostname`, `title`). Comprobar que ningún code point de esas clases aparece en `content[*].text` ni en `structuredContent` (recorrido recursivo de strings y claves) y que se emite un indicador como `controlCharsNeutralized:true`. Comprobar que el texto visible permanece (por ejemplo, el placeholder `\u{E0049}`). Cero llamadas extra al cliente y ningún canario en stderr. Repetir con `darktrace_advanced_search` (sensitiveRead) y con el texto de errores. | Implementación: owner de shape/tools. Prueba independiente: owner adversarial. |
| **MR-02** | Ampliar la confianza TLS o debilitar la criptografía por flags de Node u OpenSSL (S1 *Local server compromise*; refuerza TM-03 y A6, "private CA via NODE_EXTRA_CA_CERTS only") | **Parcial.** El operador es de confianza según el modelo de amenazas, pero la política es incoherente: rechaza `--tls-min-v1.0` y acepta `--use-openssl-ca` con `SSL_CERT_FILE`, que **sustituye** el almacén de confianza. | ST-03/04.FLAGS (`--tls-keylog`, `--tls-min-v1.0`, `--use-env-proxy`), ST-03/04.PROXY. Probe P6: los nueve casos se aceptan. | Rechazar al arrancar `--use-openssl-ca`, `--use-system-ca` (o documentarlo como permitido), `--openssl-config`, `--openssl-legacy-provider`, `--tls-cipher-list`, `--tls-cipher-suites` y las variables `SSL_CERT_FILE`, `SSL_CERT_DIR` y `OPENSSL_CONF` | **Bajo-Medio** | Parametrizar `ST-03/04.FLAGS` en `config.test.mjs`, en `execArgv` y en `NODE_OPTIONS` con comillas: la salida es `startup_error` con solo el nombre del flag o la variable, sin DNS, sockets ni firmas. Si el owner decide aceptar `--use-system-ca` por necesidades corporativas, sustituir la prueba por una que lo documente y fije el comportamiento. | Config (segundo worker). La decisión es del root. |
| **MR-03** | Confusión de dependencias o typosquatting del nombre del paquete (S1, comandos de arranque maliciosos con `npx`; S11 MCP04) | **Sí.** El nombre sin scope `darktrace-mcp` no está registrado en npm (404). Cualquier `npx darktrace-mcp` o `npm i darktrace-mcp`, de un usuario o de una configuración de host copiada, instalaría lo que un tercero publique con ese nombre. | La guía de clientes ya advierte de no usar `npx` (`clients.md:25`) y la release verifica el tgz con SRI. No hay prueba que impida la referencia al nombre sin scope. | Decisión de distribución, más una prueba documental | **Medio** | Opciones: (a) que la release use un nombre con scope `@nuoframework/darktrace-mcp` y que los ejemplos solo apunten a rutas absolutas o a ese nombre; o (b) que el owner reserve el nombre. Prueba en `validate-examples` y en el verificador de release: buscar en `README`, `docs/**` y `examples/**` y fallar ante `npx darktrace-mcp`, `npm i darktrace-mcp` o `"command":"npx"` con el nombre sin scope. No requiere red. | Release (worker de implementación). Decisión de nombre: root u owner. |
| **MR-04** | Rug pull y deriva del esquema o las descripciones de herramientas (S6, S8, S2 anotaciones no confiables, S11 MCP03) | **Sí, como regresión.** Las herramientas son fijas y `listChanged:false` (SA-06), pero una actualización del SDK o de Zod puede cambiar el JSON Schema emitido o las anotaciones sin que nadie lo revise. | `test/mcp/corrections` (`listChanged:false`, `io:'input'`), ST-07.MATRIX. No hay una huella del `tools/list` completo. | Huella fija de `tools/list` por perfil, revisada en cada cambio | **Bajo** | Prueba de contrato: para los perfiles {read}, {read, sensitiveRead}, {read, write} y {read, write, writeCritical}, calcular el SHA-256 de `tools/list` canónico (nombres, descripciones, `inputSchema`, anotaciones) y compararlo con un snapshot versionado. Comprobar además que las descripciones no contienen controles ni caracteres invisibles (reutilizar la clase de MR-01) ni marcadores como `<IMPORTANT>`. Que la release incluya la huella en `build-evidence`. | Servidor (worker de implementación). |
| **MR-05** | Llamadas antes de completar la inicialización (S5) | **Sí, como defensa en profundidad.** Quien controla el pipe ya es el host de confianza, pero ni la guía de laboratorio ni el modelo cubren el estado pre-init. Probe A: se despacha y puede iniciar la resolución DNS. | ST-14.MALFORMED y ST-14.PROTO cubren tramas malformadas, no el orden del ciclo de vida | Rechazar `tools/call` y `tools/list` antes de `initialize` (o al menos antes de `initialized`) con un error JSON-RPC, sin cliente ni DNS | **Bajo** | `stdio.test.mjs`: enviar `tools/call` como primera trama. Comprobar un error JSON-RPC (sin `result`), 0 llamadas al cliente (con `diagnostic-guard`) y que un `initialize` posterior funcione con normalidad. | Servidor (worker de implementación); comprobar el soporte del SDK. |
| **MR-06** | Flujo tóxico y exceso de agencia: datos sensibles leídos que acaban en escrituras dentro del mismo appliance (S7, S13, S11 MCP06/MCP10, S12) | **Sí, condicional.** Solo si el operador activa `sensitiveRead` **y** `write`. Con un `dryRun:false` decidido por el modelo, las herramientas de comentario o investigación (texto libre) pueden escribir en el appliance datos de una búsqueda avanzada, visibles para otros usuarios del appliance. | ST-06.INJECTION (con el perfil por defecto se deniega la escritura posterior), ST-07, ST-08 (crítico), ST-13 (auditoría). No hay control de flujo de datos entre lecturas sensibles y escrituras. | Decisión de política, más una prueba | **Medio** (de diseño) | Opción recomendada, que debe decidir el root: que `sensitiveRead=true` junto con `write=true` sea un error de configuración, o que las escrituras de texto libre queden bloqueadas mientras `sensitiveRead` esté activo en el proceso. Prueba: con esa combinación, error de arranque, o `callTool(comment, dryRun:false)` devuelve vista previa o denegación con 0 llamadas. Si se acepta el riesgo, se necesita una decisión explícita y fechada del operador, y una prueba que fije la advertencia en la descripción de las herramientas de escritura. | Política: root y arquitectura. Implementación: el worker de implementación. |
| **MR-07** | Agotamiento del parser y ambigüedad de tramas: anidamiento profundo, lotes, claves duplicadas (S4, S12 sobrecarga de recursos) | **Sí, como regresión.** Las sondas B, C y D muestran un comportamiento seguro hoy. | ST-11.FRAMES, ST-11.INPUT, ST-14.MALFORMED y ST-14.PROTO no incluyen estos tres casos | Pruebas de regresión | **Bajo** | `stdio.test.mjs`: (B) 30 000 niveles de `[` dentro de 64 KiB: sin caída, solo `protocol_error`, y la sesión responde a un `tools/list` posterior. (C) Lote tras negociar 2024-11-05: 0 ejecuciones (cliente espía) y stdout solo con JSON-RPC válido. (D) `operation` duplicada: la clave que ven el wrapper de entrada y la validación es la misma, y con `get_status` seguido de `post_tags` se rechaza sin llamadas. | Owner adversarial (tester adversarial). |
| **MR-08** | Shadowing entre servidores y comandos de arranque no confiables en el host (S6, S8, S1) | **Residual del host** | Guías: rutas absolutas y advertencia sobre `npx`. No hay recomendación de aislar este servidor de otros servidores MCP no confiables. | Guía, sin código | **Bajo-Medio** | Revisión documental: las guías deben recomendar ejecutar este servidor en un host o perfil sin servidores MCP no confiables, revisar los cambios de herramientas de otros servidores (TOFU, S8) y fijar el Inspector en ≥0.14.1 (S14) si se usa en desarrollo. La comprobación es una búsqueda en la documentación. | Documentación (autor de documentación o el owner de guías). |

## 5. Cubierto (no son huecos)

| Metodología (fuentes) | Pruebas existentes en el recibo de 238 casos |
|---|---|
| SSRF, DNS rebinding y redirecciones hacia el appliance (S1, SSRF) | ST-04.DEST (12), ST-04.FR01 (20), ST-04.DNS (4), ST-04.SNAPSHOT, ST-05.REDIRECT (25) |
| TLS y proxy (S1) | ST-03.TLS (4), ST-03/12.TLS-code (5), ST-03/04.PROXY (10), ST-03/04.FLAGS (3) |
| Fuga de credenciales, incluidas codificaciones de un paso (S11 MCP01) | ST-02.SINK, ST-02/13/14.SINK, ST-02.ARGV, ST-02.FILE (24), ST-02.BOUND (6) |
| Validación de entradas, prototipo y límites (S2) | ST-11.INPUT, ST-11.FRAMES, ST-14.PROTO (2), ST-14.MALFORMED, ST-11/14.PROCESS |
| stdout limpio y ciclo de vida de EOF (S4) | ST-14.MALFORMED, ST-11/14.CANCEL, ST-16.PROCESS |
| Exceso de agencia en acciones críticas (S13) | ST-08.CRITICAL (18), ST-08.APPROVAL, ST-07.MATRIX |
| Límite de tasa y timeouts (S2, S5) | ST-11/12.RATE, ST-11.DEADLINE, ST-11.QUEUE, ST-12.* |
| Auditoría (S11 MCP08) | ST-13.AUDIT, ST-13.PREAUDIT, ST-13.POSTAUDIT |
| Minimización de la salida (S11 MCP10) | ST-09.MINIMIZATION, ST-09.SENSITIVE |
| Cadena de suministro del artefacto (S11 MCP04) | Fuera del harness de 238: `scripts/verify-release.mjs` (SRI, allowlist del tar, sin hooks), `release-review.md` y `release-review-final.md` |

## 6. Checklist propuesto para antes de una versión estable

- [ ] MR-01: neutralizar caracteres de control e invisibles en todas las salidas, más `ST-06.UNICODE`.
- [ ] MR-06: decisión del root sobre la combinación de `sensitiveRead` con escrituras de texto libre, más su prueba.
- [ ] MR-03: decisión sobre el nombre del paquete o su reserva, más una prueba documental contra el nombre sin scope.
- [ ] MR-02: completar o documentar la lista de flags y variables TLS/OpenSSL, más su prueba parametrizada.
- [ ] MR-04: huella fija de `tools/list` por perfil, incluida en `build-evidence`.
- [ ] MR-05: rechazo de llamadas antes de la inicialización, más su prueba.
- [ ] MR-07: regresiones de anidamiento, lotes y claves duplicadas.
- [ ] MR-08: guías de aislamiento del host y fijación de la versión del Inspector.
- [ ] Revisión independiente de cada corrección, sobre hashes exactos.

**Límites.** Es una investigación documental más sondas sintéticas locales; no es una auditoría completa ni una validación.
- Las sondas usaron la copia `final2`. La fuente actual solo difiere en la constante UA de `httpClient.ts`, que no afecta a MR-01..07.
- La sonda A pudo provocar una consulta DNS del nombre reservado `appliance.example`, sin conexión TLS ni HTTP y sin credenciales. Las pruebas propuestas deben usar `diagnostic-guard` para que la resolución DNS quede bloqueada.
- De S12 y S16 solo leí los resúmenes públicos.
- No se ha ejecutado ninguna prueba nueva, ni contra el laboratorio ni contra un proveedor real.
- No se acepta ningún riesgo.
