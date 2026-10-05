# Revisión independiente de la documentación de usuario y cierre de R5-01

**Estado:** revisión de documentación únicamente. Fecha: 2026-10-05. Revisor: trabajador despachado (tarea `task_281fb9186282`).

**Veredicto:**
- **R5-01 está cerrado.** La frontera entre el archivo `--env-file` que carga Node y los archivos que valida el servidor está explicada de forma clara y coherente en todas las guías.
- **No hay defectos bloqueantes.** Hay **2 hallazgos de severidad Baja** (§4), que son mejoras de claridad. Ninguno contradice el diseño base.
- **La documentación de usuario está lista para pasar a la auditoría de código**, con D1 y D2 como correcciones recomendadas.

**Qué no hice:** no audité código, no ejecuté pruebas ni build, no hice llamadas de red ni commits, y no edité guías ni informes históricos.

## 1. Alcance

**Documentos revisados:**
- `README.md`
- `docs/configuration.md`
- `docs/getting-started.md`
- `docs/es/getting-started.md`
- `docs/clients.md`
- `docs/troubleshooting.md`
- `.env.example`
- los 5 ejemplos de `examples/`
- `docs/documentation-correction-report.md`
- R5-01 en `docs/security/design-review-round5.md`

**Archivos que existen en el repositorio pero cuyo contenido no verifiqué:** `SECURITY.md`, `Dockerfile`, `.github/workflows/ci.yml`, `npm-shrinkwrap.json` y `src/coverage/report.generated.json`. Solo comprobé que existen y, en algunos casos, los conteos o el digest que citan las guías.

**Bandeja Orca:** la comprobé al empezar y antes de cerrar. Estaba vacía (`count 0`, `deliveryId null`), así que no hubo entregas FIFO que confirmar.

## 2. Cierre de R5-01

R5-01 señalaba que la guía recomendaba un `--env-file` de Node que el servidor no puede verificar.

| Requisito | Evidencia | Resultado |
|---|---|---|
| Node lee `--env-file` **antes** de que arranque el servidor, y el servidor no valida su propietario, modo, tipo, symlinks ni tamaño. | `docs/configuration.md:9`; `docs/troubleshooting.md:9`; `docs/getting-started.md:48`; `docs/es/getting-started.md:34`; `.env.example:2-3` | Cumple |
| Los límites de 64 KiB (JSON) y 4 KiB (token) **no** se aplican a ese archivo. | `configuration.md:9`; `es/getting-started.md:34`; `.env.example:3` | Cumple |
| El operador lo protege por su cuenta: propietario el operador, modo `0600`, ubicación de confianza y sin symlinks. | `configuration.md:9`; `troubleshooting.md:9`; `es:34`; `.env.example:4` | Cumple |
| **Nunca** contiene valores de token; solo ajustes no secretos y rutas `*_TOKEN_FILE`. | `configuration.md:9`; `getting-started.md:48`; `troubleshooting.md:9`; `es:34`; `.env.example:5` (sin valores de token) | Cumple |
| `--check-config` valida la configuración resultante y los archivos JSON y token que lee el servidor, no el propio env-file. | `configuration.md:9` | Cumple |
| El `--env-file` de Docker tampoco lo valida el servidor y no debe llevar tokens. | `configuration.md:109` | Cumple |
| La configuración recomendada es JSON protegido más archivos de token separados. | `configuration.md:7`; `troubleshooting.md:9` | Cumple |

**R5-01: Cerrado.**

## 3. Verificación temática

| Tema | Evidencia | Resultado |
|---|---|---|
| **Instalación privada real.** `gh repo clone` del repositorio privado, `npm ci --ignore-scripts`, build y rutas absolutas. Se dice explícitamente que no hay publicación en npm ni imagen. | `README.md:15, 41-53, 90`; `getting-started.md:9-23`; `es:5-19`; `clients.md:5, 25` (prohíbe `npx` de un paquete no publicado) | Correcto |
| **Artefacto local.** `npm pack --ignore-scripts`, SHA-256 contrastado con un registro de build propio, inspección del contenido y del árbol instalado frente al shrinkwrap. El repo tiene `npm-shrinkwrap.json`, y `package.json` lo incluye en `files`. | `getting-started.md:63-85`; `README.md:90` | Correcto. Es un procedimiento, no una afirmación de que ya se ejecutó. |
| **Límites y permisos.** Token: 4.096 B, UID del proceso, modo `0600`/`0400`, sin symlinks, apertura no-follow. JSON: 64 KiB con las mismas reglas. Los techos solo pueden bajarse y coinciden con ARCH §5.1 (30 s, 2 MiB, 64 KiB/8/5.000, 60k, 4/16/10/120, 2 reintentos, 2.000 ms). `Retry-After` por encima del techo implica no reintentar. | `README.md:55`; `configuration.md:18, 26, 45-64, 76`; `getting-started.md:27, 48`; `es:23` | Coherente con el diseño base |
| **Windows nativo.** Las comprobaciones fallan de forma cerrada. | `configuration.md:26`; `getting-started.md:23` | Correcto. Ver D2 sobre la guía de clientes. |
| **Salida de datos al proveedor del modelo.** El aviso aparece en todas las guías, también para solo lectura. `sensitiveRead` registra la intención del operador, no certifica elegibilidad. | `README.md:36, 39`; `configuration.md:43, 109`; `getting-started.md:7`; `es:42`; `clients.md:7, 34` | Correcto |
| **Perfiles bloqueados.** Email (14 operaciones), exportación PCAP y HTTP se rechazan. Los campos `export`/`email` se rechazan aunque valgan `false`. La ejecución crítica está bloqueada y no existe campo `confirm`. Las escrituras usan `dryRun:true` por defecto. | `README.md:20-22, 70`; `configuration.md:36-41`; `troubleshooting.md:14-16`; `es:40` | Correcto |
| **Conteos de cobertura.** 54 ejecutables + 5 vistas previas críticas + 19 bloqueadas + 1 excluida = 79. `src/coverage/report.generated.json` contiene `implemented 59, blocked 19, excluded 1`, `labValidated false`. Comprobación propia: 19 bloqueadas = 14 email + 1 PCAP + 3 GET de S6 + 1 de S5; 54 = 39 lecturas + 15 escrituras. | `README.md:23, 27`; `es:40` | Coherente |
| **Firma y 7.1 pendientes.** Se dice que 7.1 **NO ESTÁ VALIDADO**, que no hay fallback de firma y que la firma en 7.1 no está validada. | `README.md:24, 72`; `getting-started.md:38`; `es:5, 36`; `clients.md:56`; `troubleshooting.md:12` | Correcto |
| **Ausencia de afirmaciones falsas sobre pruebas, artefactos o laboratorio.** Busqué "passed", "validated on 7.1", "verified release" y "production-ready" y no hay coincidencias relevantes. CI se describe como "configured", nunca como "passing". No se afirma atestación ni release. Docker: "No image has been published and local Docker execution is unverified". | `README.md:15, 25, 92`; `configuration.md:5, 93`; `getting-started.md:87-89` | Sin afirmaciones falsas |
| **Proxy y TLS.** Se rechazan las 8 variantes de variable de proxy y `NODE_USE_ENV_PROXY`; se eliminan solo para este proceso. No hay modo TLS inseguro. | `configuration.md:78-89`; `troubleshooting.md:11` | Coherente con ARCH:88 |
| **Ejemplos.** Los 4 JSON y el TOML se parsean bien. Solo contienen rutas a archivos de token, sin valores. `operator.config.json` no tiene campos `export`/`email` y usa `transport.kind:"stdio"`. | `examples/*` | Correcto |

## 4. Hallazgos

| ID | Sev | Defecto | Evidencia | Corrección concreta | Responsable |
|---|---|---|---|---|---|
| **D1** | Bajo | **La guía no avisa de que un `--env-file` de Node puede ejecutar código o cambiar la confianza TLS.** Según la documentación oficial de Node (`doc/api/cli.md`, consultada vía Context7), las variables que configuran Node dentro de un `--env-file`, **incluida `NODE_OPTIONS`, se interpretan y aplican**. Las guías solo dicen "only non-secret settings and token-file paths". No prohíben `NODE_OPTIONS` (que puede precargar código) ni `NODE_EXTRA_CA_CERTS` (que añade autoridades de confianza TLS), ni dicen que la integridad de ese archivo equivale a la de código ejecutable. El arranque rechaza `NODE_TLS_REJECT_UNAUTHORIZED=0` y las opciones de proxy venga de donde venga, pero no las precargas. | `configuration.md:9`; `troubleshooting.md:9`; `es/getting-started.md:34`; `.env.example:1-5`; ARCH:88/TM:26 (`NODE_OPTIONS` es configuración de operador de confianza) | Añadir una frase en `configuration.md:9` y replicarla en `troubleshooting.md:9`, `es:34` y `.env.example`: "Node applies Node-configuration variables from `--env-file`, including `NODE_OPTIONS`; do not set `NODE_OPTIONS` or `NODE_EXTRA_CA_CERTS` there unless reviewed, and treat the file's integrity like executable code." | Trabajador de documentación de usuario |
| **D2** | Bajo | **La guía de clientes es ambigua sobre Windows nativo.** `clients.md:34` dice "verify your execution platform supports the server's strict token-file checks" para Claude Desktop en Windows. En cambio, `configuration.md:26` y `getting-started.md:23` dicen que esas comprobaciones **fallan de forma cerrada** en Windows nativo y que hay que usar Linux/WSL. Un operador puede creer que Windows nativo podría funcionar. | `clients.md:34` frente a `configuration.md:26` y `getting-started.md:23` | Sustituir por: "Native Windows token/config-file checks currently fail closed; run the server in an approved Linux/WSL environment owned by its runtime user." | Trabajador de documentación de usuario |

No hay más defectos de seguridad en la documentación revisada.

## 5. Comprobaciones mecánicas

| Comprobación | Resultado |
|---|---|
| Enlaces y anclas locales en README, las 5 guías y el informe de corrección | **52, 0 rotos.** Coincide con `documentation-correction-report.md:28`. |
| Enlaces externos | 6. No los comprobé, para no salir a la red. |
| Archivos enlazados | `SECURITY.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `LICENSE`, `examples/*`, `src/coverage/report.generated.json` y la ruta de shrinkwrap: todos existen. |
| Digest de la imagen base de Docker | `Dockerfile:2, 14` usa el digest `sha256:43ac6c60…` citado en `configuration.md:93`. La afirmación de verificación contra el registro **no la reproduje**, para no salir a la red. |
| Ejemplos | 4 JSON y 1 TOML válidos |

## 6. Pendiente (no resuelto por la documentación)

- La auditoría independiente del código. Es la siguiente fase.
- Las pruebas ST-01–16, que **no se han ejecutado**.
- La validación de la firma y del comportamiento en el laboratorio 7.1.
- La decisión sobre la elegibilidad del proveedor del modelo.
- La verificación real del tarball, la imagen, el SBOM y la atestación.
- La ejecución de CI. Está configurada, pero no hay evidencia de que haya pasado.
- No se acepta ningún riesgo residual.
