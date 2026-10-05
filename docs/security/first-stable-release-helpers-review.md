# Revisión de los helpers de release de la primera versión estable

**Estado:** revisión independiente con comprobaciones dirigidas de manipulación, offline. Fecha: 2026-10-05. Revisor: trabajador despachado (tarea `task_bab8b0b05e75`).

**Qué no hice:**
- No ejecuté el pipeline completo de release.
- No usé sockets TLS, Docker, secretos, la API, la red ni git, y no cambié versiones.
- Solo creé este archivo.

## Decisión

**ACEPTADOS** los helpers congelados del snapshot `/private/tmp/darktrace-stable-gates-olv6hjlc`, cuya fuente de producción es la `d4d3f78c3a8e6668fcab76b483d6ec5d13a20e34b3f08853651f2039a985fb87` aceptada antes.

| Archivo (snapshot) | SHA-256 | ¿Igual en el workspace? |
|---|---|---|
| `scripts/prepare-release.mjs` | `3a7d3fdd1ebfa89eabc508e5eb582ecf3b3d40c3e798ef00dc9410ad112d91eb` | Sí |
| `scripts/verify-release.mjs` | `e4a293cebf731495534a69e75aec69fd2f7b8455a49b5e89d3a33f77ae5e7082` | Sí |
| `scripts/validate-examples.mjs` | `93d1e17f4129e85edd34245246cf634ca406bf085bd59d9088e072e7a6a94652` | Sí |
| `test/security/mcp-contracts.mjs` | `c2f57ddc73ade69f875bb87f577fa9fa5d46c126b252b905cff6c446c7823e56` | Sí |
| `test/security/fixtures/mcp-tool-contracts-first-stable.json` | `ea31d70a484c0d0353cb8651edc4b6a4ab13798c096056e8cdcf68e78324707f`, el candidato aceptado | Sí |
| `test/security/fixtures/mcp-tool-contracts.json` (alfa) | `37b5af95de1786ecce1b8762e12d2d63e577f171511a9db4964518b13a917f72` | Sí |
| `test/historical/alpha-read-write/provenance.json` y los 10 `.txt` | `2d9bffe6f1c462b04d5bef68607fe335d699e0fcdc37673f8e10dbe299538d60`; los 10 archivos tienen los mismos hashes que en la revisión anterior | Sí |
| `test/historical/alpha-stdio/provenance.json` y `stdio.test.ts.txt` | `33cbdcac2bb47ddc59585836180374a4e63de68945530042c6005d2e02d511a8` y `e14fb7a0247bbb991cbc43c363f147881f08584425bf9175f522d8e2d32b1d5c` | Sí |
| `test/mcp/stdio.test.ts` (activo) | `49cae44e2b47b112a14d037c1b3257736a5351740aacc49fbe4963ad56b45522` | **DERIVA** (ver §4) |

## 1. Revisión del código (frente a la línea base alfa `4f6ef96`)

- **`verify-release.mjs`:**
  - **Oráculo:** fija el oráculo estable `ea31d70a…` con los perfiles read27 `6ce22e56…` y sensitive28 `def9a8db…`, que son exactamente los aceptados. Sigue verificando el fixture alfa `37b5af95…`. Todas las entradas revisadas se leen con `regularBytes`, que solo admite archivos regulares y no symlinks.
  - **`verifyFirstStableContractContent`:** exige exactamente dos contratos, `releaseCapability` igual a `{write:false, writeCritical:false, sensitiveRead:"operator opt-in; …"}`, el hash del fixture alfa, `rejectedProfiles` idéntico a la matriz de 3 perfiles definida en el código, y el hash canónico de cada contrato.
  - **`captureReviewedContracts`:** importa el `release-capability.js` compilado y exige que valga `{write:false, writeCritical:false}` y esté congelado. Captura los dos contratos completos solo a partir de `releaseProfiles` y ejecuta `verifyRejectedReleaseProfiles`: 3 rechazos de objeto o contrato más **9 arranques** (3 concesiones de escritura por stdio, doctor y `--check-config`), con `diagnostic-guard`, exit 1, stdout vacío, sin canarios, sin marcador de efectos y un `startup_error` de claves fijas.
  - **`verifyHistoricalArchive`:** comprueba el manifiesto `2d9bffe6…` (fuente `4f6ef96c…`, fixture `37b5af95…`), exactamente 10 rutas que cumplen el regex y los bytes de cada `.txt`, además del suplemento stdio `33cbdcac…` / `e14fb7a0…`.
  - **Evidencia schema 3:** `releaseCapability` está ligada al SHA del código fuente de `src/policy/release-capability.ts`. `historicalAlphaTests` se compara con lo recalculado. Seis archivos de guarda (`mcp-contracts.mjs`, `diagnostic-guard.mjs`, `guard.ts`, `load.ts`, `schema.ts` y `stdio.ts`) quedan vinculados a la fuente. El recibo debe contener ambos fixtures.
  - **Comprobaciones previas sin cambios:** allowlist de tar, archivos regulares, `private`, sin lifecycle, bytes instalados, exactamente tres dependencias, SRI del shrinkwrap y de lo descargado, `binMode 0755` y el vínculo exacto de `README.es.md`.
  - **Nuevo `writeProfilesRejected`:** el CLI **instalado** rechaza 9 combinaciones de concesión de escritura y modo.
  - **`--help`:** debe decir "consultation only" y no contener el texto alfa sobre escrituras.
- **`prepare-release.mjs`:** antes de crear salidas llama a `assertReviewedReleaseContractReady`. Escribe la evidencia schema 3 con `releaseCapability`, que lleva el SHA del código fuente, y con `historicalAlphaTests` verificado. No cambian ni la build reproducible doble ni el inventario `SHA256SUMS`.
- **`validate-examples.mjs`:** solo endurece reglas. Prohíbe variables de entorno duplicadas y cualquier `DARKTRACE_PROFILES` distinto de `read`, y solo admite `DARKTRACE_WRITE_CRITICAL=false` o ausente.
- **`mcp-contracts.mjs`:** conserva los 4 `profiles` alfa como procedencia y casos de denegación activos, y añade `releaseProfiles` y `forbiddenReleaseProfiles`, ambos congelados. Nunca captura listas vacías de escritura.
- **`test/mcp/stdio.test.ts` (snapshot):** el caso positivo alfa de preview crítica, archivado byte a byte, se sustituye por 9 rechazos de arranque bajo guard. Es más estricto.

## 2. Comprobaciones de manipulación (copias externas, `diagnostic-guard`, **32/32**)

**Línea base (sin cambios):** `verifyHistoricalArchive`, `verifyFirstStableContractContent` y `captureReviewedContracts` pasan. La última incluye la captura de los dos contratos, la matriz de 3 + 9 rechazos y el archivo histórico.

**Rechazadas en memoria (14):** sobre el contenido del fixture:
- `contracts`: descripción con un espacio añadido; frase alfa restaurada; `inputSchema` con `additionalProperties`; anotación `destructiveHint`; orden de dos herramientas cambiado; herramienta eliminada; `sha256` declarado alterado; contrato extra `read+write`.
- `releaseCapability`: `write:true`; texto de `sensitiveRead` cambiado.
- Otros campos: `alphaFixtureSha256` alterado; en `rejectedProfiles`, `errorClass` cambiado, un perfil eliminado y `beforeNetwork:false`.

**Rechazadas en archivo (13, cada una en una copia nueva):**
- Fixtures: un byte del fixture estable; un byte del fixture alfa; el fixture alfa sustituido por un symlink.
- Capacidad compilada: `write:true`; sin `Object.freeze`.
- `mcp-contracts.mjs`: matriz prohibida con otro `errorClass`; perfil de release extra `read+write`.
- Archivo `alpha-read-write`: un byte de un `.txt`; un `.txt` borrado; un `.txt` sustituido por un symlink; el manifiesto editado.
- Archivo `alpha-stdio`: un byte del `.txt`; el manifiesto editado.

**`verifyHistoricalArchive` por sí sola (2):** también rechaza las dos manipulaciones de bytes de archivo.

Comprobé con `diff` que cada mutación se aplicó de verdad. Ningún caso dejó efectos según el guard.

## 3. Estado de las gates (según el root; no ejecutadas por mí)

- **Funcional:** 118 PASS.
- **Seguridad (cifra corregida por el root, `msg_e6aeb8a0034c`):** 325 casos, de los que 313 PASS, **6 FAIL TLS por `listen EPERM`** (restricción de sockets del entorno gestionado) y 6 SKIP de plataforma. Recibo `test/security/evidence/2026-10-05T21-05-05-096Z.json` del snapshot, SHA-256 `567714c247b450493b012a696f295f4e709048b384244caddeae28b48e7f3c2d`, con `sourceTreeSha256` `d4d3f78c…`, `receiptComplete:true` y `tests.status:1`. Antes se había informado de 316 PASS y 3 SKIP.
- **Consecuencia:** **no es un PASS certificado.** `verifyReleaseEvidence` exige `receipt.tests.status===0` y un recibo completo, de modo que un release con esos 6 fallos queda **bloqueado**, como debe. Hace falta volver a ejecutar la suite de seguridad en un entorno que permita sockets locales de loopback/TLS sintéticos, sin debilitar casos.

## 4. Deriva detectada (no aprobada)

Tras congelar el snapshot, estos archivos del workspace cambiaron (hora de modificación 23:04–23:06). No los apruebo:

- `test/mcp/stdio.test.ts`: workspace `8d29d0e6…` frente a snapshot `49cae44e…`. Añade una aserción sobre `error.variable`.
- `README.md`: workspace `780837e5…` frente a snapshot `771a035b…`.
- `README.es.md`: workspace `dfb931eb…` frente a snapshot `91393275…`.

Los helpers revisados no cambian, pero el release vincula los README y los tests en `source-files.sha256.json`. Por tanto, el pipeline debe ejecutarse desde un snapshot **nuevo y congelado** que incluya esos bytes revisados. Recomiendo una revisión rápida de esos tres archivos antes del pipeline.

## 5. Observaciones (informativas)

- `assertReviewedReleaseContractReady` ya solo comprueba el formato de constantes fijadas. La puerta real son los hashes fijados y el contenido verificado. Es coherente ahora que el root ha autorizado fijarlos.
- La capacidad que se registra en `prepare-release` es un literal del código. Su veracidad depende de las comprobaciones de `captureReviewedContracts` sobre el `dist` compilado y del vínculo con el SHA del código fuente, ambos presentes.

No se acepta ningún riesgo de forma genérica. Se conservan la historia alfa y los tests existentes.
