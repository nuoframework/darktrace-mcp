# Revisión independiente de packaging, workflows e instalación de la release

**Estado:** revisión independiente del candidato de release privada `0.1.0-alpha.0`. Fecha: 2026-10-05. Revisor: trabajador despachado (tarea `task_a4a64cc89f44`).

**Veredicto:** el artefacto candidato de `/private/tmp/darktrace-mcp-release` supera todas mis comprobaciones independientes y corresponde exactamente a la fuente que revisé.
- **Hallazgos:** detecté 3, todos de severidad Baja o informativa (RR-01 a RR-03). Su owner los corrigió y lo revalidé.
- **FR-02b** de la revisión final de código está cerrado en las guías.
- **Defectos abiertos conocidos en el alcance: 0.**

**Lo que este informe no afirma.** No certifica la seguridad del sistema y no aprueba la publicación. No hay validación en el laboratorio 7.1. La elegibilidad del proveedor, la prueba de pinning sobre una red privada real y Docker siguen pendientes (§6).

## 1. Alcance y procedencia

**Revisado:**
- Scripts: `scripts/{prepare-release,verify-release,validate-examples,release-path,test-release-path}.mjs`.
- `package.json`, `package-lock.json` y `npm-shrinkwrap.json`.
- Workflows: `.github/workflows/{ci,release}.yml`.
- `Dockerfile` y `.dockerignore`.
- Documentación: `README.md`, `SECURITY.md`, `CHANGELOG.md`, `docs/{releases,release-preparation,configuration,getting-started,clients,troubleshooting}.md` y `docs/es/getting-started.md`.
- Los cambios de release `test/security/run-isolated.mjs` y `test/unit/client-http.test.ts`.
- Los artefactos de `/private/tmp/darktrace-mcp-release`.

**Lo que no hice:** no edité código, guías, scripts, pruebas, artefactos ni informes históricos. No hice commits, push, tags ni releases, y no escribí evidencia en el workspace.

**Congelación de la fuente** (15:34): 87 archivos (`src`, `scripts`, `test` sin `evidence`, `examples`, `openapi`, manifiestos, tsconfig, README, LICENSE, SECURITY y CHANGELOG). La lista está en el directorio temporal de la sesión (`release-freeze.txt`), con SHA-256 `87ccf103cad59640a01d166afc0eddcaa32382761fac948b53b078045aef9a64`. El manifiesto `source-files.sha256.json` del artefacto tiene **87 entradas y 0 discrepancias** con el workspace.

| Artefacto (`/private/tmp/darktrace-mcp-release`) | SHA-256 |
|---|---|
| `darktrace-mcp-0.1.0-alpha.0.tgz` | `6a4efe2170bb9409137849819ccdd6693a60330692b29c62d62dc1a5687d6034` |
| `SHA256SUMS` | `1f4c2c5c6c23d099a27d8b87638df25bed610084b87c9078345277b85700b439` |
| `runtime-sbom.cdx.json` | `29ab647b0cd0a3f6a516dc26a397834ab18c9848f0009a90a84d6b8a4bf6e9c4` |
| `source-files.sha256.json` | `965630597a308cf83e4f8fd6c08cfbbbc745a0e2d2b6b8e98781ff9070655f01` |
| `build-evidence.json` | `4b0870cb8e8d51c1853fb8c5418205996d43c365bb1b6f215947905f17ee4b0c` (Node v22.23.3, darwin, `reproducibleTwoBuilds:true`, todos los comandos con estado 0) |
| `verification.json` | `fa03016697caf2e026a10f44b838b18008e6b0306c575097bc75e8d3eff2ef1a` |
| `security-receipt.json` | `4969039420e72f212a7745c365bfa6294b5be02e07b04398e16ff0e32b915923` (`receiptComplete:true`; 235 pasan y 3 bloqueados porque macOS no deja crear el bit setgid; build 0, pruebas 0) |

**Correspondencia con la revisión final de código** (`final-code-review.md`): los **26 archivos de `src` del artefacto son idénticos** a los de esa instantánea revisada, y el recibo de seguridad usa exactamente esos 26 hashes. Desde entonces solo cambiaron `scripts/prepare-release.mjs`, `scripts/verify-release.mjs`, `test/security/run-isolated.mjs` y `test/unit/client-http.test.ts`; los reviso en §3.

| Script o workflow | SHA-256 |
|---|---|
| `scripts/prepare-release.mjs` | `b44d051b30ce5155a66ee4c322848f306d493968ef8b89dededd0f7c11429ebc` |
| `scripts/verify-release.mjs` | `3645417a4f2adf9ddd1023206cde1bde77a807653df248edeff7d3859a15c171` |
| `scripts/release-path.mjs` | `8d63752809ce4afd7cdffc7f4ac54acf45caf8fefedbfc29315de9a0b9cbf3f5` |
| `scripts/test-release-path.mjs` | `37a2289a12824cd22541dee6d7cb6ffb423a5a2170d3cd84b3dd410ca0966ee7` |
| `scripts/validate-examples.mjs` | `8d8f309c022788889c60bdf659d3d6aa02899fd3dda544a209bfcf1c9040234e` |
| `.github/workflows/ci.yml` | `b2a0a9d0c254d8e132f4092025176585abba23cca3c22d4ab80868c29374dcca` |
| `.github/workflows/release.yml` | `178cb0bc615cbb96a07e79c12265e4bd3ee2058a9dfcea5f1456b425a646d088` |
| `Dockerfile` / `.dockerignore` | `f01b45b7…` / `3b893820…` |

## 2. Verificación independiente del artefacto

Usé mi propio script, `indep-verify.sh` en el directorio temporal de la sesión, que trata el directorio del artefacto como solo lectura y trabaja en una carpeta temporal aparte. Hice una prueba previa contra el preflight de Node 24 (`/private/tmp/darktrace-release-preflight24-network`, mismo SHA del tgz) y la verificación final contra `/private/tmp/darktrace-mcp-release`.

| Comprobación | Resultado |
|---|---|
| `shasum -a 256 -c SHA256SUMS` | Los 8 archivos dan OK |
| Entradas del tar (`tar -tvzf`) | **29**, todas archivos regulares (`-`). Allowlist: `package/{package.json,npm-shrinkwrap.json,README.md,LICENSE,SECURITY.md}` más `dist/src/**/*.{js,json}`. Sin rutas absolutas ni `..`. |
| Permisos del binario | `dist/src/index.js` es **0755** tras extraer |
| Material secreto o de prueba | Busqué claves privadas, certificados, los canarios `offline-*`, `SENTINEL`, `/Users/`, `/private/tmp` y `test/security`. La única coincidencia es el nombre del script `test:security` en `package.json`, que es inofensivo. No hay claves, fixtures ni evidencia en el tar. |
| `dist` del tar frente a mi build independiente | **Idéntico byte a byte** a `dist/` compilado por mí desde la misma fuente en la revisión final de código (Node 24 contra la build Node 22 del artefacto) |
| SBOM | 3 componentes: `@modelcontextprotocol/core` 2.3.0 y `@modelcontextprotocol/server` 2.3.0 (Apache-2.0) y `zod` 4.2.0 (MIT). La SRI de cada uno coincide con el shrinkwrap; el SHA-256 del componente raíz coincide con el tgz. |
| Instalación independiente | `env -i … npm install --ignore-scripts --omit=dev <tgz>` en un directorio vacío. `npm ls` muestra exactamente server, core y zod, con versiones fijas. Descargó las 3 dependencias del registro npm, que es la única red usada. |
| CLI instalada | `--version` devuelve `0.1.0-alpha.0`. `doctor` con archivos de token sintéticos 0600 devuelve `ok:true`, `networkProbe:false`, `labValidated:false` y 27 herramientas. Con `HTTPS_PROXY=http://u:p@proxy` sale con 1 y solo `variable:"HTTPS_PROXY"`, sin valor. |
| `lock == shrinkwrap` | `cmp` idéntico |
| Comparación Node 22 / Node 24 | En `/private/tmp/darktrace-mcp-release-node24` los 8 activos de `SHA256SUMS` dan OK. El tgz, el SBOM, los inventarios de archivos, el manifiesto de fuente y las notas son **byte a byte iguales** a los de la entrega Node 22. `build-evidence` de Node v24.14.1: los 10 comandos con estado 0 y `reproducibleTwoBuilds:true`. |

**Controles estáticos verificados:**
- `package.json` tiene `private:true`, ningún hook de ciclo de vida (`pre/post/install`, `prepare`, `prepublish*`), `files` en lista blanca, `bin` y versiones exactas. Todas las instalaciones de scripts y workflows usan `--ignore-scripts`.
- `verify-release.mjs` exige allowlist, ausencia de `..`, entradas regulares **antes** de extraer, 0755, `private:true`, ningún hook, exactamente 3 dependencias, que la SRI descargada coincida con el shrinkwrap y bytes instalados idénticos al tar.
- Los workflows tienen `permissions: contents: read` y acciones fijadas por SHA. Los SHA coinciden con los que conozco para checkout v4.2.2, setup-node v4.4.0 y upload-artifact v4.6.2; no los comprobé contra la red. `persist-credentials:false`; sin `secrets.*`, `id-token` ni pasos de publicación.
- El Dockerfile usa una base fijada por digest, `npm ci --ignore-scripts`, una imagen final con solo `dist/src` y los manifiestos, y `USER 1000:1000`. El directorio de pruebas, con los fixtures sintéticos, solo entra en la etapa de build.

## 3. Hallazgos y cierre

| ID | Sev | Hallazgo y evidencia | Corrección del owner | Cierre independiente |
|---|---|---|---|---|
| **RR-01** | Bajo | `README.md:90` enlazaba `docs/release-preparation.md`, que no existía (61 de 62 enlaces locales bien) | El owner creó el documento | **Cerrado.** 63 de 63 enlaces locales bien. |
| **RR-02** | Bajo | `prepare-release.mjs:10` comprobaba `out.startsWith(root)` con `root` terminado en `/`. La raíz exacta del checkout sin barra final pasaba y los artefactos se escribían en el checkout. | Se añadió `scripts/release-path.mjs` (`realpath` del ancestro existente más cercano y `path.relative`), usado por `prepare-release` y `verify-release`. `prepare` exige un directorio externo vacío; `verify` exige el argumento. | **Cerrado.** `node scripts/test-release-path.mjs` sale con 0. Mis pruebas: la raíz con y sin barra, `root/x/../y` y `…/../Documents/darktrace-mcp/z` se rechazan, y `darktrace-mcp-release` (hermano) se acepta. `verify-release` sin argumento o con salida dentro del checkout falla sin crear nada. |
| **RR-03** | Info | `release.yml` (`workflow_dispatch`) aceptaba cualquier ref | `if: startsWith(github.ref,'refs/tags/v')`, más una comprobación de que el tag es exactamente `v`+versión | **Cerrado** por lectura. No se ejecutó en GitHub. |
| **FR-02b** (de `final-code-review.md`) | Bajo | Las guías no mencionaban la minimización de respuestas ni el rechazo de NAT64, 6to4 y Teredo | Texto añadido en README:102-104, `configuration.md:115-117`, `getting-started.md:97-99`, `clients.md:62-64`, `troubleshooting.md:25-27`, `es/getting-started.md:54-56` y `releases.md:57` | **Cerrado.** El texto coincide con el código: hasta 8 campos principales, `minimized`/`unmodeledFieldsOmitted`, `@message` y `@fields` excluidos, rechazo integral de prefijos de transición y fallo DNS terminal hasta reiniciar. Además advierte que no garantiza eliminar datos sensibles anidados arbitrarios. |
| Cambio en `run-isolated.mjs` | — | Revisión del cambio | `--test-reporter=spec`, y `receiptComplete` exige que los subcasos coincidan con el total del pie; si no, falla | **Aceptado.** El cambio es mínimo, no toca oráculos ni casos y el recibo final tiene `receiptComplete:true`. |
| Fixture Node 22 en `client-http.test.ts` | — | Revisión del cambio | Watchdogs locales de 2 s que modelan el handle del socket | **Aceptado, sin debilitar las comprobaciones.** Se conservan `bodyObservedAbort` y los tipos de error esperados, y se añaden `responseHandleClosed` y `activeMockSockets===0`. Si el abort fallara, el watchdog no haría pasar la prueba porque `bodyObservedAbort` seguiría en false. Ningún archivo de `src` cambió. |

## 4. Observaciones (sin defecto)

- `verify-release` y la instalación de los usuarios descargan las 3 dependencias del registro npm configurado. La integridad la protege la SRI del shrinkwrap; el registro y el `.npmrc` del operador quedan bajo su control.
- En `release.yml` se suben los `*.log` aunque no están en `SHA256SUMS`. Son diagnósticos, no activos de la release, y `releases.md` lista solo los activos con checksum.
- `docs/releases.md` y `docs/release-preparation.md` advierten que un checksum descargado junto al artefacto no autentica su origen. No se afirma tener atestación ni firma.

## 5. Comandos ejecutados (todos locales)

```sh
indep-verify.sh /private/tmp/darktrace-release-preflight24-network <final2-build> <workspace>   # prueba previa
indep-verify.sh /private/tmp/darktrace-mcp-release <final2-build> <workspace>                   # verificación final
node scripts/test-release-path.mjs
node --input-type=module -e "import {resolveExternalOutput} …"   # vectores de ruta
node scripts/verify-release.mjs                                   # sin argumento: falla sin escribir
node scripts/verify-release.mjs /nonexistent.tgz <checkout>/should-not-exist
cmp package-lock.json npm-shrinkwrap.json
```

Una corrección propia: mi primer escaneo de secretos falló porque el `grep` de BSD rechaza una alternativa vacía en la expresión regular. Lo corregí y repetí; el resultado es el de §2.

## 6. Límites y gates pendientes

- **Ajuste pendiente del README.** El coordinador pidió (`msg_7cf2f45c0c25`) actualizar en `README.md` las frases que quedarían obsoletas al publicar ("unpublished alpha", "audit in progress"). **No está aplicado en esta congelación**: el workspace coincide con `release-freeze.txt` y el tgz sigue siendo `6a4efe21…`. Si se aplica, cambian el README empaquetado y el hash del archivo, y hay que reverificar con `indep-verify.sh`. Esta revisión cubre solo el hash `6a4efe21…`.
- **No es una aprobación de publicación.** El owner publica a mano tras su propia revisión. No se publica nada en npm ni como contenedor.
- **No hay validación en el laboratorio 7.1:** modos de firma, ACL, respuestas reales y resultado de las escrituras.
- **Pendiente:** la elegibilidad del proveedor y del host, que corresponde al operador.
- **Pinning:** la evidencia TLS real sustituye el destino del socket. **No hay prueba de pinning sobre una red privada real.**
- **Docker no se construyó ni se ejecutó** en esta revisión.
- **Workflows:** no se ejecutaron en GitHub. Los SHA de las acciones no se verificaron contra la red, y las protecciones del repositorio (rulesets, revisores de entorno) no están comprobadas.
- **No hay atestación ni firma de artefactos.** El SBOM es un inventario, no un análisis de vulnerabilidades.
- **Mis límites:** solo macOS; mi build de referencia usó Node 24 y el artefacto Node 22. Linux no se probó.
- **No se acepta ningún riesgo.**
