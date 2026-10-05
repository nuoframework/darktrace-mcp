# Revisión independiente de las defensas MR-01 a MR-08, del bootstrap de pruebas y de LH-01

**Estado:** revisión independiente del código y de las pruebas. Fecha: 2026-10-05. Revisor: trabajador despachado (tarea `task_555093a19f37`).

**Qué no hice:** no edité código, pruebas, guías ni informes de otros owners. No hice commits ni publicaciones, no accedí al laboratorio y no leí credenciales ni configuraciones reales. Todas las pruebas fueron sintéticas y offline.

**Veredicto:**
- **Cerradas:** MR-02 (con un hueco Bajo), MR-04, MR-05, MR-06 y MR-07, además del bootstrap de pruebas.
- **MR-01:** parcialmente cerrado. Queda un hueco de severidad Baja-Media (**IR-01**).
- **MR-03:** cerrado en su alcance documental.
- **MR-08:** sigue pendiente; las guías aún no tienen el contenido entregado.
- **LH-01:** cerrado para `dist` y para la imagen Docker. Queda un hueco Bajo en `node_modules` (**IR-03**).
- **Hallazgos nuevos:** IR-01, IR-02 e IR-03.

Esto no es una certificación ni una afirmación general de resistencia a la inyección de prompts.

## 1. Fuente revisada y procedencia

| Elemento | Valor |
|---|---|
| Agregado de la fuente de producción (`sourceHashes` de `src/`, JSON compacto ordenado) | `d72e89282f7369e382ea2b40fc3d665d584721723e148540b7fcb38eb6023430`. Recalculado por mí en el workspace y en la copia: **coincide** con `mcp-defense-final-manifest.json` y con el recibo dirigido final. |
| Recibo root300 | `test/security/evidence/2026-10-05T17-09-21-463Z.json` (SHA-256 `4e94fc2c…`): **297 PASSED, 0 FAIL, 3 BLOCKED** (fixtures setgid que macOS no permite crear), con TLS real. Es del coordinador; no lo repetí. |
| Archivos clave | `src/shape/output.ts` `a79d11f6…`; `src/config/schema.ts` `0402f4e2…`; `src/server/input.ts` `061142aa…`; `src/server/createServer.ts` `989c59c2…`; `test/security/test-runtime-argv.ts` `56be6e70…`; `scripts/lab-read-smoke.mjs` `ef0cfcb1…` |

**Pruebas que ejecuté yo** (copia aislada en el directorio temporal de la sesión, sin las variables de proxy, `NODE_OPTIONS` ni `NODE_EXTRA_CA_CERTS`):

| Comando | Resultado |
|---|---|
| `node scripts/build.mjs` | Salida 0 |
| `node test/security/run-defense-isolated.mjs` | Salida 0: **62 de 62 dirigidas y 106 de 106 estándar**, con `sourceTree d72e8928…`. El recibo quedó **solo en la copia** (`mcp-defense-2026-10-05T17-18-03-559Z.json`); la evidencia del workspace no se tocó. |
| `review-probe.mjs` (mío, sintético, sin red) | Resultados en §2 (IR-01, IR-02 y MR-06) |

No ejecuté la suite root300 ni TLS real. Me apoyo en el recibo del coordinador.

## 2. Estado por defensa

| ID | Implementación revisada (evidencia de lectura) | Mis pruebas | Estado |
|---|---|---|---|
| **MR-01** | `shape/output.ts`: neutraliza C0, C1, `‪-‮`, `⁦-⁩`, `​-‏`, `⁠-⁤`, `﻿` y `U+E0000-E007F`. Los sustituye por un escape visible (`\u{XXXX}`) en valores **y en claves**, rechaza colisiones de claves y añade `controlCharsNeutralized`. Se aplica en `tools/index.ts:result()`, después de la minimización y la redacción. | Neutraliza ESC, RLO, ZWSP, TAG-A y TAG-CONTROL. **No neutraliza** VS1–VS16 (`U+FE00-FE0F`), VS17–256 (`U+E0100-E01EF`), `U+061C` (ALM, un control bidi), `U+2028/2029`, `U+00AD`, `U+034F`, `U+3164`, `U+FFA0`, `U+180E` ni `U+FFF9`. Un payload de contrabando con selectores de variación tras un emoji pasa intacto (`changed:false`). | **PARCIAL**, ver IR-01 |
| **MR-02** | `schema.ts`: rechaza `SSL_CERT_FILE`, `SSL_CERT_DIR` y `OPENSSL_CONF`, y los flags `--use-openssl-ca`, `--use-system-ca`, `--openssl-config`, `--openssl-legacy-provider`, `--tls-cipher-list` y `--tls-cipher-suites` tanto en argv como en `NODE_OPTIONS`. `log.ts` solo emite nombres fijos. | Rechaza `--use-openssl-ca=1`. **Acepta `NODE_USE_SYSTEM_CA=1`**, que la documentación de Node define como equivalente a `--use-system-ca` (añadido en v24.6.0 y v22.19.0; fuente: `nodejs/node doc/api/cli.md` vía Context7). Acepta, sin que sea un defecto, `--tls-min/max-v1.2`, FIPS y `--use-bundled-ca`. Los preloads (`--require`, `--import`, `LD_PRELOAD`) siguen como residuo del operador de confianza ya documentado. | **CERRADO con hueco Bajo**, ver IR-02 |
| **MR-03** | El escáner documental (`mcp-distribution.mjs`) y la decisión de distribuir un tgz privado | No lo repetí por separado; forma parte de los 62 dirigidos | **CERRADO** (alcance documental). No prueba nada sobre el registro npm. |
| **MR-04** | Contratos de `tools/list` por perfil en `fixtures/mcp-tool-contracts.json`; `io:'input'`; las descripciones son código fijo | Los 4 MR-04.CONTRACT pasan en mis 62 dirigidos | **CERRADO**. La integración de los hashes en `build-evidence` queda DEFERRED según su owner. |
| **MR-05** | `createServer.ts`: `initialized` solo se activa con `oninitialized` y si existen capacidades del cliente; `tools/list` y `tools/call` lanzan `InvalidRequest` antes de eso | Incluido en los 62 dirigidos | **CERRADO** |
| **MR-06** | `schema.ts`: `sensitiveRead && write` produce un error de configuración | `{sensitiveRead, write}` y `{…, writeCritical}` se rechazan; `{sensitiveRead, write:false}` se acepta | **CERRADO**. No previene flujos tóxicos a través de otros servidores del host. |
| **MR-07** | `input.ts`: escáner iterativo de claves duplicadas sobre JSON ya válido y acotado (con escapes y por ámbito); las tramas ambiguas pasan a `{}`. El rechazo de lotes y de anidamiento profundo lo prueban las regresiones. | En lectura, la lógica de `keyExpected` es correcta para objetos, arrays y valores string; incluido en los 62 dirigidos | **CERRADO** |
| **MR-08** | Entregado al root (`msg_6a297c749b71` y `msg_f940c517e352`) | Búsqueda en README, README.es, `docs/{clients,configuration,getting-started,troubleshooting}.md` y `docs/es`: **no hay** guía de aislamiento frente a servidores MCP no confiables ni fijación del Inspector a ≥0.14.1 | **PENDIENTE** (owner de documentación) |
| **Bootstrap de pruebas** | `test-runtime-argv.ts` elimina **solo** `--tls-cipher-list=<DEFAULT_CIPHERS>` y **solo** si existe `NODE_TEST_CONTEXT` | `grep` en `src`, `dist/src`, `scripts` y `package.json`: **0 referencias**. No se empaqueta y la producción no lo importa. | **CERRADO**. Que `NODE_TEST_CONTEXT` lo controle el atacante no afecta a producción. |
| **LH-01** | `lab-read-smoke.mjs` (`ef0cfcb1…`), `verifyRuntime`: manifiesto externo al checkout, `O_NOFOLLOW`, propietario el UID actual, sin bits de grupo, mundo, ejecución ni especiales (`0o7177`) y `nlink 1`. Exige igualdad exacta del conjunto y de los hashes de `src/**`, `scripts/**`, manifiestos, OpenAPI y `dist/src/**`, sin symlinks; si no, `DIST_NOT_REVIEWED`. En Docker, comprueba los hashes de `/app/dist/src` con `--network=none` y una imagen fijada por digest. | Revisión estática. No lancé Docker ni el harness. | **CERRADO para `dist` y la imagen**, con hueco Bajo, ver IR-03 |

## 3. Hallazgos nuevos

| ID | Sev | Hallazgo | Evidencia | Corrección propuesta | Prueba propuesta (no implementada) | Owner sugerido |
|---|---|---|---|---|---|---|
| **IR-01** | **Bajo-Medio** | MR-01 no cubre los selectores de variación ni otros code points invisibles o de formato. Los selectores permiten esconder un byte por code point detrás de un carácter visible. | `review-probe.mjs` (§2). Fuentes primarias: Paul Butler, *Smuggling arbitrary data through an emoji* (2025-02-08), https://paulbutler.org/2025/smuggling-arbitrary-data-through-an-emoji/ (rangos `U+FE00-FE0F` y `U+E0100-E01EF`; los tokenizadores los conservan). Embrace The Red, *Sneaky Bits* (2025-03-12), https://embracethered.com/blog/posts/2025/sneaky-bits-and-ascii-smuggler/ (U+2062 y U+2064 ya están cubiertos; recomienda "Remove invisible characters" y añadir pruebas). | Ampliar la clase con propiedades Unicode: `\p{Cc}`, `\p{Cf}` (cubre U+061C, U+00AD, U+180E, U+FFF9-FFFB y los Tags), `\p{Zl}`, `\p{Zp}`, `U+FE00-FE0F`, `U+E0100-E01EF`, `U+034F` y los rellenos Hangul `U+115F`, `U+1160`, `U+3164` y `U+FFA0`. Valorar la clase `\p{Default_Ignorable_Code_Point}` si el motor de Node la soporta. Mantener el escape visible y el indicador. | `MR-01.UNICODE-EXT`: para cada uno de esos code points, en valores y en claves, comprobar `changed:true` y que el code point no aparece en la salida. Payload "emoji + 5 selectores": la salida no contiene ningún selector. El texto ordinario con emojis sin selectores no cambia. | shape/tools (owner de MR-01) |
| **IR-02** | Bajo | `NODE_USE_SYSTEM_CA=1` no se rechaza, aunque su equivalente `--use-system-ca` sí | `review-probe.mjs`. Node `cli.md`: "This can also be enabled using the `--use-system-ca` command-line flag" (v24.6.0 y v22.19.0). | Añadir `NODE_USE_SYSTEM_CA` a las variables de anulación de confianza y a `STARTUP_VARIABLES`, o documentar que se acepta si el root lo decide así. | Ampliar MR-02.ENV con `NODE_USE_SYSTEM_CA=1` y también con `0` (definida aunque sea 0): `startup_error` con solo el nombre y cero DNS, sockets y HMAC. | config (owner de MR-02) |
| **IR-03** | Bajo | El binding de LH-01 en modo local no cubre `node_modules`. El harness ejecuta `dist` verificado, pero con el SDK y zod del checkout sin verificar. En Docker la imagen se fija por digest, así que allí no aplica. | `lab-read-smoke.mjs`: `verifyRuntime` solo inventaría `src`, `scripts`, los manifiestos, la OpenAPI y `dist/src` | Exigir en el manifiesto `dependencyFiles` (los archivos de `node_modules/@modelcontextprotocol/{server,core,client}` y `zod` que se cargan) o verificar la SRI del árbol instalado frente a `npm-shrinkwrap.json`. Alternativa: exigir el modo de instalación del tgz verificado o Docker. | Fixture del harness: alterar un byte de `node_modules/zod/package.json` en una copia → `DIST_NOT_REVIEWED` antes de importar el SDK o lanzar el hijo, sin red. | harness de laboratorio (Sol) |

## 4. Límites

- Mis pruebas fueron offline y sintéticas, en la copia `d72e8928…`. No hice pruebas de TLS real ni con Docker Engine, Linux, Node 22 ni el appliance.
- MR-08 y la integración de los hashes de MR-04 en `build-evidence` siguen pendientes de sus owners.
- Que el host no confunda texto visible con instrucciones no se puede garantizar desde el servidor. La neutralización es una defensa de presentación, no de la semántica.
- No se acepta ningún riesgo.
