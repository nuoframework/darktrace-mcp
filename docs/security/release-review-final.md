# Revisión final acotada del candidato de release

**Estado:** revisión acotada del nuevo candidato de release privada `0.1.0-alpha.0`, con el README y el CHANGELOG preparados para la alpha privada. Fecha: 2026-10-05. Revisor: trabajador despachado (tarea `task_a804c6f8bd47`).

**Base de comparación:** `docs/security/release-review.md`, que revisó el candidato `6a4efe21…`. Ese informe histórico no se modifica.

**Veredicto:** el candidato **`bf8b93bdce436131673ffbca2746abfe127b1082221e373aab39ee01c102dc92`** supera todas las comprobaciones independientes.
- Frente a la base, el único cambio en el archivo es `package/README.md`.
- Las builds de Node 22 y Node 24 producen exactamente el mismo archivo.
- Encontré **un hallazgo nuevo de severidad Baja (NR-01)**, que el owner corrigió y revalidé.
- **Hallazgos abiertos nuevos: 0.**

**Lo que este informe no afirma.** No certifica la seguridad del sistema ni aprueba la publicación (§5).

## 1. Delta revisado

**Cambios de fuente respecto a la congelación anterior:** solo `README.md` (`144de2d6…`) y `CHANGELOG.md` (`9041f931…`). Fuera del archivo empaquetado cambiaron también `docs/configuration.md` (`b55b7933…`, por NR-01) y `docs/release-preparation.md` (`b1dc2e68…`, evidencia actualizada).

**Comprobación factual de la nueva redacción frente al código y la evidencia:**

| Afirmación | Correcto | Motivo |
|---|---|---|
| "private offline alpha", "no npm publication" | Sí | `private:true` y ningún paso de publicación |
| "Independent source review completed" | Sí | Corresponde a `final-code-review.md`: 0 defectos de código abiertos |
| Las barreras de appliance, proveedor y despliegue y las decisiones de riesgo residual siguen abiertas | Sí | — |
| Se bloquean siempre los rangos NAT64 estándar (`64:ff9b::/96`, `64:ff9b:1::/48`), 6to4 y Teredo | Sí | Coincide con `src/config/address.ts` (`095e0328…`) |
| Los prefijos NAT64 propios de un operador no se pueden detectar | Sí | Coincide con ARCH:110 |
| CHANGELOG "0.1.0-alpha.0 — prepared 2026-10-05" | Sí | — |

Las guías de usuario ya no contienen "unpublished alpha", "audit in progress", "No release has been published" ni "tightening". La única coincidencia restante, `clients.md:25` ("unpublished `npx` package"), es correcta.

**Enlaces locales:** 64 en README, SECURITY, CHANGELOG, CONTRIBUTING, `docs/{releases,release-preparation,configuration,getting-started,clients,troubleshooting}.md` y `docs/es/getting-started.md`, **0 rotos**.

| ID | Sev | Hallazgo | Cierre |
|---|---|---|---|
| **NR-01** | Bajo | `docs/configuration.md:5` seguía diciendo "Implementation and independent audit are still in progress" y daba como pendiente el endurecimiento del límite JSON, ya implementado. Contradecía el nuevo README. | El owner `ctx_ae36468140d7` lo corrigió: revisión de fuente completa, límite de 64 KiB vigente, enlace a la evidencia actual y barreras pendientes. **Cerrado y revalidado.** No afecta al archivo empaquetado. |

## 2. Verificación independiente del candidato `bf8b93bd…`

Usé el mismo script `indep-verify.sh` (en el directorio temporal de la sesión), que trata `/private/tmp/darktrace-mcp-release` como solo lectura y trabaja en una carpeta temporal propia. Los artefactos no se modificaron.

| Comprobación | Resultado |
|---|---|
| `shasum -a 256 -c SHA256SUMS` | Los 8 activos dan OK en `/private/tmp/darktrace-mcp-release` (Node 22) y en `/private/tmp/darktrace-mcp-release-node24` |
| Tar | 29 entradas, todas archivos regulares, dentro de la allowlist y sin traversal; `dist/src/index.js` es **0755** |
| Material secreto o de prueba | Solo aparece el nombre del script `test:security` en `package.json`; no hay claves, canarios ni rutas locales |
| `dist` frente a mi build independiente | **Idéntico byte a byte** |
| Contenido frente al candidato anterior `6a4efe21…` | `diff -r` de ambos paquetes extraídos: **solo cambia `README.md`**, y el README empaquetado es byte a byte igual al `README.md` del workspace |
| Manifiesto de fuente | 87 entradas, **0 discrepancias** con el workspace. Respecto a la base solo difieren `README.md` y `CHANGELOG.md`. Agregado `sourceTreeSha256` = `2d5c2e0006de3fcfb173929eee79a37ffc29adda0b0fe2be79ad339b5ef6a916`, que coincide con el aviso del owner. |
| `src` de producción | **Los 26 archivos son idénticos** a los de la instantánea de `final-code-review.md`; el recibo de seguridad usa esos mismos 26 hashes |
| `release-notes.md` | Byte a byte igual a `CHANGELOG.md` |
| SBOM | Exactamente las 3 dependencias de antes (core y server 2.3.0, zod 4.2.0). La SRI de cada una coincide con el shrinkwrap y el hash del componente raíz coincide con el tgz. |
| Instalación independiente (`env -i … npm install --ignore-scripts --omit=dev`) | Árbol: server, core y zod con versiones exactas. `--version` = 0.1.0-alpha.0. `doctor` con tokens sintéticos devuelve `ok:true`, `networkProbe:false`, `labValidated:false` y 27 herramientas. Con `HTTPS_PROXY` el arranque se rechaza nombrando solo la variable. |
| Pruebas estándar | **102 de 102** pasan en Node 22 (`test.log`: `# tests 102 … # fail 0`) y en Node 24 (`ℹ tests 102`) |
| Recibo de seguridad | Completo (`receiptComplete:true`) en Node 22 y Node 24: **235 pasan, 3 bloqueados** (macOS no deja crear el bit setgid), build 0, pruebas 0 |
| Node 22 frente a Node 24 | El tgz, el SBOM, `runtime-files`, `source-files` y `release-notes` son **byte a byte iguales**. `build-evidence`: v22.23.3 y v24.14.1, ambos con los 10 comandos en estado 0 y `reproducibleTwoBuilds:true` |

**Hashes de los artefactos** (`/private/tmp/darktrace-mcp-release`):

| Archivo | SHA-256 |
|---|---|
| `darktrace-mcp-0.1.0-alpha.0.tgz` | `bf8b93bdce436131673ffbca2746abfe127b1082221e373aab39ee01c102dc92` |
| `SHA256SUMS` | `15ba2a097359b3bf2e232a70c99c173eaa2595b9895bc2f542865582103e95ed` |
| `source-files.sha256.json` | `5ba9e1ffee539a463aa7eeaeb3d992241c2447e2b1ea8485d1f7b93caf1a8724` |
| `runtime-sbom.cdx.json` | `321e0f6716736c805104a505cb1dfb3c68737f87a85e1cde089c277dfbcf1be4` |
| `runtime-files.sha256.json` | `1eac687d2e310e406105057d931e39e0b44ba04fed7fb2e65b7ff1c5a0c98568` |
| `build-evidence.json` | `fb1fb1a0ff725d9441e3a57899871c8568700bd0c6e263c2fb66355b89a73153` |
| `verification.json` | `633b1f46c3daaff706cc8dc0ab995d6395ae12ec5b4ea0fd1928b5eef552017d` |
| `security-receipt.json` | `80e8a764f5beb77e8b17ea54bc912c6fef5960d3aceed17e14e442c4c895992c` |

**Congelación de la fuente empaquetada:** 87 archivos (el mismo conjunto que en la revisión anterior), con SHA-256 de la lista `93055816d08ef5801869ceb890cca3da4cc2003c9ee9ab3e48acaa21ceb7a697`. La comprobé al empezar y de nuevo antes de cerrar, sin cambios.

## 3. Comandos

```sh
diff -u <README del tgz 6a4efe21> README.md; diff -u <release-notes 6a4efe21> CHANGELOG.md
indep-verify.sh /private/tmp/darktrace-mcp-release <build-de-referencia> <workspace>
(cd /private/tmp/darktrace-mcp-release-node24 && shasum -a 256 -c SHA256SUMS); cmp <activos Node 24> <activos Node 22>
diff -rq <paquete 6a4efe21 extraído> <paquete bf8b93bd extraído>
```

Además ejecuté un comprobador de enlaces locales en Python y la congelación de la fuente con `shasum`.

## 4. Lo que no repetí

Por ser una revisión acotada, no repetí la investigación del código ni de las pruebas de producto: el código de producción y los oráculos no cambiaron. Los invariantes de SBOM, shrinkwrap, 3 dependencias, 0755, allowlist del tar, hooks y guardas de ruta los verificó `release-review.md`, y aquí se comprueba que siguen igual.

## 5. Límites explícitos

- **No es una aprobación de publicación.** El owner publica a mano. No hay publicación en npm ni como contenedor, ni commits, tags o releases por mi parte.
- **No hay validación en el laboratorio Darktrace 7.1:** firma, ACL, respuestas reales y resultado de las escrituras.
- **Pendiente:** la elegibilidad del proveedor y del host.
- **Pinning:** no hay prueba sobre una red privada real; la prueba TLS sustituye el destino del socket.
- **Docker no se construyó ni se ejecutó.**
- **Workflows:** no se ejecutaron en GitHub ni en Linux. Las protecciones del repositorio (rulesets, revisores) no se verificaron porque no estaban disponibles.
- **No hay atestación ni firma de artefactos.** El SBOM es un inventario, no un análisis de vulnerabilidades.
- **Mis límites:** solo macOS. El registro npm se usó únicamente para descargar las 3 dependencias fijadas.
- **No se acepta ningún riesgo.**
