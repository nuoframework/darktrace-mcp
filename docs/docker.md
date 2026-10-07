# Uso con Docker

**Español** · [English](en/docker.md)

[README](../README.md) · [Clientes: Docker](clients.md#docker) · [Configuración](configuration.md) · [Solución de problemas](troubleshooting.md)

Instala y ejecuta el servidor por stdio en Docker con imagen fijada, tokens privados y controles de contenedor.

<a id="docker-use"></a>

La imagen ejecuta MCP por stdio y no abre puertos. Desde v1.1.0, el flujo de publicación la distribuye como `ghcr.io/nuoframework/darktrace-mcp:<version>` para linux/amd64 y linux/arm64; fija siempre el digest. [Estado de verificación](#110-image-verification-status).

Expone las mismas herramientas que una instalación nativa. Define `DARKTRACE_PROFILES` con `-e` (por defecto `read`); consulta [perfiles](configuration.md#perfiles).

> **Archivos de imagen.** Los de v1.0.0 contienen la compilación anterior de solo lectura (15 herramientas). Para la API completa, compila desde el checkout actual ([compilación](#build)) o usa la imagen publicada desde 1.1.0.

<a id="install"></a>

## Instalar

Dos pasos. Primero instala Docker y arráncalo:

- Linux: `sudo apt install docker.io` (o Docker Engine de docs.docker.com), después `sudo usermod -aG docker $USER` y cierra e inicia sesión.
- macOS y Windows: instala y arranca Docker Desktop.

Ejecuta el asistente y elige `2) docker` cuando pregunte cómo deben arrancar el servidor los clientes:

```sh
npx -y @nuoframework/darktrace-mcp@1.1.2 setup
```

El asistente:

1. Resuelve la ruta absoluta de `docker` y comprueba el daemon (`docker version`). Si falta o está parado, indica qué instalar o arrancar y se detiene sin escribir.
2. Propone `ghcr.io/nuoframework/darktrace-mcp:<versión del paquete>`. Acepta otra etiqueta, `name@sha256:<digest>` o `sha256:<ID de imagen>` local; rechaza cualquier otra forma.
3. Si la imagen no existe localmente, pregunta `Pull it now? [Y/n]` y muestra el progreso de `docker pull`. Con `--yes` debes pasar `--pull`; de lo contrario se detiene con una explicación.
4. Lee el ID y el digest del registro. Los clientes arrancan el **ID de imagen** con `--pull=never`: ejecutan exactamente esos bytes. Muestra y guarda el ID y el digest `ghcr.io/nuoframework/darktrace-mcp@sha256:…` en `~/.config/darktrace-mcp/setup.json`. Compara el digest con las notas de GitHub Release.
5. Escribe un `docker run` protegido: tu UID:GID, tokens montados de solo lectura y, en macOS/Windows, `DARKTRACE_TOKEN_FILE_OWNER=root-or-current` ([motivo](#mcp-client-configuration)). Linux conserva la comprobación estricta del propietario.

Después, `darktrace-mcp config <cliente>` muestra esa entrada con el ID guardado. `darktrace-mcp test` ejecuta `--check-config` dentro del contenedor con los montajes y usuario del cliente, sin red, y hace el `GET /status` firmado desde el host. `darktrace-mcp uninstall --docker` borra entradas, tokens y exactamente ese ID de imagen.

Alternativa manual: descarga, carga o compila la imagen ([opciones](#install-options)), ejecuta `--check-config` dentro con tus montajes ([abajo](#mcp-client-configuration)) y añade el fragmento de [Clientes: Docker](clients.md#docker) con su ID.

<a id="110-image-verification-status"></a>

## Estado de verificación de la imagen 1.1.0

| Elemento | Estado (2026-10-06) |
|---|---|
| linux/arm64 | La compilación local `sha256:7e5a2a410cce692efb1dc0848ad040424fccf66d1c7d482003ca5fbeaadd6aad` superó las comprobaciones Docker de CI locales: inventario, ayuda/versión, Node.js de la distribución y OpenSSL compartido, inventario del runtime, `--check-config`, `tools/list` para los ocho contratos, doctor por perfil y canal de aprobación y rechazos de arranque. Sus bytes coinciden con el registro de seguridad Linux arm64 ([valores fijados](security/release-pins-1.1.0.md#docker-evidence)) |
| linux/amd64 | No ejecutada localmente; verificada por el trabajo CI `docker` del commit de publicación |
| Imagen ghcr publicada | `release.yml` vuelve a compilar para publicar; no es la imagen probada por CI. El digest del manifiesto consta en las notas |
| Sesión MCP real | Solo sobre una compilación anterior a los controles finales de escritura ([campaña](security/final-lab-campaign-1.1.0.md#docker-hardened-run-macos-docker-desktop)) |
| Escaneo de vulnerabilidades | Sin registro para el runtime 1.1.0. El escaneo v1.0.0 de abajo no establece el estado de 1.1.0 |
| Atestación | Sin atestación de imagen. Los SBOM son inventarios, no garantías de seguridad |

No afirma ausencia de CVE ni constituye aprobación de publicación.

<a id="v100-image-at-a-glance-previous-release"></a>

## Imagen v1.0.0 de un vistazo (versión anterior)

Registro de la imagen v1.0.0 revisada, de solo lectura; es histórico para 1.1.0.

| Elemento | Estado (2026-10-06) |
|---|---|
| Runtime | Alpine 3.24.2, Node.js **24.18.1** mantenido por Alpine, OpenSSL compartido **3.5.9**, ICU 78.1 (datos en inglés) |
| Imágenes | Revisadas antes del cambio de metadatos a 1.0.0: arm64 `sha256:64d16616…5be842`, amd64 `sha256:65985236…68dad6` ([revisión](security/patched-runtime-independent-review.md)). El laboratorio usó arm64 `sha256:8cd85604…`, con aplicación idéntica byte a byte. Los ID de los archivos v1.0.0 constan en las notas |
| Aplicación | 49 archivos compilados ligados al origen v1.0.0 `582a121…`, agregado `054a25fa…`; hash del contrato de 15 herramientas `cd4ee422…` en ambos perfiles y arquitecturas |
| Pruebas | [CI 37423665585](https://github.com/nuoframework/darktrace-mcp/actions/runs/37423665585), commit `2adb84b`: Node 22/24 offline y Docker nativo amd64/arm64, 130 pruebas funcionales + 325 de seguridad, ninguna omitida, todas correctas |
| Escaneos de las imágenes exactas | Trivy: 0 coincidencias. Grype: **High CVE-2026-85091 (zlib 1.3.2)** y Medium CVE-2024-9410 (`ada`). Se conservan resultados sin supresión. La revisión independiente en ambas arquitecturas concluyó que zlib está afectada pero su código `gz*` vulnerable no está en la ruta de ejecución (sin imports, enlaces Node, complementos, FFI, `dlopen` o subprocesos relevantes), y que `ada` es una coincidencia de nombres de producto. zlib **no está corregida**: Alpine 3.24 no tenía paquete corregido el 2026-10-06 |
| Laboratorio Darktrace 7.1.0 | arm64 `sha256:8cd85604…`, 2026-10-06: **19/19 consultas reales correctas**, sin escrituras. Laboratorio cerrado. Las imágenes 1.0.0 solo difieren en el literal de versión y no se repitieron en vivo; formas de respuesta, límites, TLS y limpieza correctos ([registro](security/patched-runtime-lab-checkpoint.md)) |
| Confianza TLS | Node usa la CA del sistema por defecto (`/etc/ssl/cert.pem` → `ca-certificates.crt`, 121 raíces; Node incluye 120). El laboratorio usó la del sistema; las pruebas de CA privada (`NODE_EXTRA_CA_CERTS`) pasaron por separado |
| Publicación | Versión `1.0.0`; hashes de archivos de la release privada e ID en sus notas |

No afirma ausencia de CVE ni aprobación de versión estable.

<a id="install-options"></a>

## Opciones de instalación

1. **Imagen pública en GitHub Container Registry (la más sencilla; desde v1.1.0).** `.github/workflows/release.yml` la compila sobre la etiqueta revisada, en ejecutores nativos amd64 y arm64, y crea una etiqueta conjunta. El digest del manifiesto consta en el resumen y las notas.

```sh
npx -y @nuoframework/darktrace-mcp@1.1.2 setup --runtime docker
```

   El asistente descarga y resuelve la imagen cuando hace falta ([instalación](#install)). Compara el digest con las notas. Los clientes usan ID local y `--pull=never`: una etiqueta es mutable, el ID no. Para un digest ya comprobado, pasa `--image ghcr.io/nuoframework/darktrace-mcp@sha256:<digest>`. En configuración manual usa el ID de `docker image inspect --format '{{.Id}}'` ([configuración](#mcp-client-configuration)).
2. **Archivo de imagen de GitHub Release (v1.0.0, anterior).** Archivos: `darktrace-mcp-1.0.0-linux-amd64.tar.gz`, `darktrace-mcp-1.0.0-linux-arm64.tar.gz`, `darktrace-mcp-1.0.0.tgz` (paquete npm) y `SHA256SUMS`.

```sh
gh release download v1.0.0 --repo nuoframework/darktrace-mcp \
  --pattern 'darktrace-mcp-1.0.0-linux-arm64.tar.gz' --pattern SHA256SUMS
shasum -a 256 --ignore-missing -c SHA256SUMS
docker load --input darktrace-mcp-1.0.0-linux-arm64.tar.gz
docker image inspect --format '{{.Id}}' darktrace-mcp:1.0.0-arm64
```

   En x86-64, usa el archivo `amd64` y la etiqueta `darktrace-mcp:1.0.0-amd64`. Compara el ID cargado con las notas y usa `sha256:…` con `--pull=never`.
3. **Compila el checkout revisado**, como sigue.

<a id="build"></a>

## Compilar

```sh
<a id="1-fetch-and-verify-the-pinned-alpine-runtime-packages-public-https--docker"></a>

# 1. Descarga y verifica los paquetes Alpine fijados (HTTPS público + Docker).
<a id="---use-an-absolute-directory-outside-the-checkout-choose-amd64-or-arm64"></a>

#    Directorio absoluto fuera del checkout; elige amd64 o arm64.
node scripts/prepare-docker-runtime.mjs /absolute/private/darktrace-runtime arm64
<a id="2-build-for-the-same-architecture-from-that-verified-archive"></a>

# 2. Compila la misma arquitectura desde ese archivo verificado.
docker buildx build --platform linux/arm64 \
  --build-context runtime-apks=/absolute/private/darktrace-runtime/arm64 \
  --load --tag darktrace-mcp:local .
docker image inspect --format '{{.Id}}' darktrace-mcp:local
```

`scripts/prepare-docker-runtime.mjs` necesita Docker y HTTPS público a `dl-cdn.alpinelinux.org`, `distfiles.alpinelinux.org` y `raw.githubusercontent.com` (un texto de licencia SPDX fijado por hash). Usa las claves de la imagen Alpine fijada para autenticar el índice `main` y sus paquetes firmados. Comprueba SHA-256 de los 22 paquetes, SHA-512 de sus fuentes y hashes de licencias extraídas. Escribe `<arch>/apks`, `<arch>/licenses` y `vendor-sources` en el directorio indicado. Consérvalo fuera del checkout y junto a la versión aprobada: los espejos dejan de ofrecer revisiones antiguas. `--platform` y `runtime-apks` deben corresponder a la misma arquitectura. Dockerfile vuelve a verificar los valores y rechaza diferencias.

| Etapa | Qué fija y comprueba |
|---|---|
| Constructor / dependencias | `node:22-bookworm-slim@sha256:43ac6c60…b772c` oficial; `npm ci --ignore-scripts` con metadatos versionados. npm y OpenSSL 3.5.8 del constructor solo existen al compilar, **no** en la imagen final |
| Runtime de la distribución | `alpine@sha256:294b683c…c77e6` (3.24.2). 22 paquetes `main` firmados por arquitectura, fijados por SHA-256 y verificados con `apk verify`, incluidos `nodejs-24.18.1-r0`, `libssl3`/`libcrypto3` `3.5.9-r0`, `musl-1.2.6-r2`, `ca-certificates-bundle-20260909-r0`. Instalación offline |
| Comprobaciones al compilar | Node informa `node_shared_openssl=true` y OpenSSL ≥ 3.5.9; paquetes 3.5.9 propietarios de `libssl.so.3`/`libcrypto.so.3`. El sistema de archivos se ejecuta en chroot para repetir comprobaciones y confirmar ausencia de `/bin/sh`, npm, apk y `update-ca-certificates` |
| Imagen final | `FROM scratch`, `PATH=/nodejs/bin`, UID/GID `1000:1000`, sin puertos ni volúmenes. `/nodejs/bin/node` enlaza al `/usr/bin/node` del paquete. Incluye `dist/src`, `node_modules` de producción, `package.json` del runtime, `LICENSE`, `/licenses/<package-origin>/` y `/etc/ssl/certs/ca-certificates.crt` (121 certificados) |

`.dockerignore` limita el contexto: excluye archivos locales de entorno y secretos. Incluye pruebas, ejemplos, scripts, ciertas guías, ambos README y SECURITY para que CI ejecute la etapa de comprobación del proveedor, pero nada de ello llega a la imagen final. No añadas tokens, credenciales de registro/proxy ni datos de appliance a argumentos, contextos o capas. En clientes usa el ID inmutable con `--pull=never`; `darktrace-mcp:local` solo es una etiqueta local.

<a id="runtime-support"></a>

## Soporte del runtime

Node.js es la compilación musl mantenida por Alpine, no un binario Tier 1 del proyecto Node.js. La [lista de plataformas de Node.js 24](https://github.com/nodejs/node/blob/v24.x/BUILDING.md#platform-list) clasifica x64 musl como Experimental y no enumera arm64 musl; `main`, para versiones futuras, clasifica x64 musl como Tier 2. Las correcciones dependen de las actualizaciones de Alpine de `nodejs`, `openssl`, `zlib` y los demás paquetes fijados. Cada actualización cambia deliberadamente los hashes y repite las comprobaciones.

**Instalaciones nativas.** Los binarios oficiales examinados el 2026-10-05 incluyen OpenSSL 3.5.8 (afectado por CVE-2026-35189). Usar Node 22 o 24 no basta: comprueba independientemente OpenSSL 3.5.9 o posterior en un runtime mantenido, o usa Docker.

<a id="mcp-client-configuration"></a>

## Configuración del cliente MCP

Monta los tokens público y privado por separado y de solo lectura. Cada archivo debe ser normal, no simbólico, de hasta 4 KiB, propiedad del UID efectivo no root del contenedor y modo `0600` o más estricto (`0400` también vale). Se admite un LF final; no uses CRLF ni archivos de entorno con tokens. En Docker Desktop para macOS/Windows, los archivos montados aparecen como root (uid 0) con el modo del host, independientemente de `--user`, y fallan la comprobación predeterminada. Solo ahí añade `--env DARKTRACE_TOKEN_FILE_OWNER=root-or-current`: acepta también root, conserva todos los demás requisitos y registra `{"event":"token_file_owner_relaxed"}` en stderr al arrancar. El asistente lo añade en macOS/Windows. Mantén el valor predeterminado en Linux, donde se conserva el propietario del host. Comprueba `--check-config` antes de añadirlo al cliente; nunca relajes el modo del archivo.

Ejemplo (sustituye ejecutable, rutas privadas y el marcador por tu origen HTTPS aprobado localmente):

```json
{
  "mcpServers": {
    "darktrace": {
      "command": "/absolute/path/to/docker",
      "args": [
        "run", "--rm", "-i", "--init", "--pull=never", "--log-driver=none",
        "--read-only", "--cap-drop=ALL", "--security-opt=no-new-privileges",
        "--pids-limit=64", "--memory=256m", "--user", "1000:1000",
        "--mount", "type=bind,src=/absolute/private/darktrace/public-token,dst=/run/secrets/public-token,readonly",
        "--mount", "type=bind,src=/absolute/private/darktrace/private-token,dst=/run/secrets/private-token,readonly",
        "--env", "DARKTRACE_URL=https://<tu-appliance>",
        "--env", "DARKTRACE_PUBLIC_TOKEN_FILE=/run/secrets/public-token",
        "--env", "DARKTRACE_PRIVATE_TOKEN_FILE=/run/secrets/private-token",
        "--env", "DARKTRACE_PROFILES=read",
        "--env", "DARKTRACE_SENSITIVE_READ=false",
        "REPLACE_WITH_IMAGE_ID_FROM_DOCKER_INSPECT"
      ]
    }
  }
}
```

Sustituye el marcador de imagen por el `sha256:...` exacto de `docker image inspect --format '{{.Id}}' darktrace-mcp:local`. El ejemplo usa UID `1000`: los archivos montados deben tener ese propietario dentro del contenedor. Alternativamente, un comando manual puede usar un `--user` no cero que coincida con el dueño. En ambos casos comprueba `--check-config`. La dirección es un marcador, no un appliance real.

Si los archivos privados pertenecen al usuario no root actual, usa `--user "$(id -u):$(id -g)"` en el comando shell, no en el JSON MCP. El ejecutable y la aplicación permanecen propiedad de root y legibles por el UID elegido.

El host stdio debe mantener stdin abierto (`-i`) y no asignar TTY (`-t`). `--pull=never` y el ID fijado limitan el arranque a los bytes inspeccionados. `--log-driver=none` evita que el daemon persista stdout/stderr, pero no impide que el cliente reenvíe resultados al proveedor. No captures stdio crudo con `docker logs` u otros destinos. Usa diagnósticos acotados: `--help` y `--version` no necesitan credenciales; `--check-config` revisa ajustes y permisos sin red. Ejecútalos con `--network=none` y logs desactivados. No validan permisos del token, endpoints, idoneidad del despliegue ni conectividad.

Usa un perfil de cliente o usuario del sistema dedicado cuando sea posible. Revisa comandos, entorno y montajes de otros servidores MCP: ejecutan código con privilegios del host. No pongas producción detrás de MCP Inspector o proxies sin revisar. Separa diagnósticos y desarrollo del perfil del operador.

En un despliegue aprobado, limita la salida HTTPS al appliance configurado y a la ruta de CA privada aprobada. No uses red del host, puertos, proxies ambientales, `NODE_TLS_REJECT_UNAUTHORIZED=0` ni otras omisiones TLS. Desactivar logs no controla la salida al proveedor. Puedes montar una CA privada revisada de solo lectura con `NODE_EXTRA_CA_CERTS`: amplía raíces sin desactivar certificados ni nombres. Node aplica `NODE_OPTIONS` y `NODE_EXTRA_CA_CERTS` antes del arranque; las precargas pueden ejecutar código y la confianza TLS debe revisarse y protegerse como configuración del host.

El UID predeterminado es `1000`, no root. Mantén el sistema de archivos de solo lectura, retira capacidades e impide elevación de privilegios. El servidor empieza en `read`, sin lecturas sensibles. Sigue siendo necesario revisar proveedor, retención e idoneidad de los resultados enviados.

La imagen conserva `LICENSE`, licencias de dependencias y del runtime/fuentes en `/licenses/<package-origin>/`. Para una transferencia privada tras revisar y probar una imagen local, registra el hash del archivo por separado y verifícalo antes de cargar:

```sh
image_id="$(docker image inspect --format '{{.Id}}' darktrace-mcp:local)"
docker save --output darktrace-mcp-local.tar "$image_id"
shasum -a 256 darktrace-mcp-local.tar > darktrace-mcp-local.tar.sha256
<a id="on-the-receiving-machine-verify-the-separately-transferred-checksum-first"></a>

# En el destino, verifica primero la suma recibida por separado.
shasum -a 256 -c darktrace-mcp-local.tar.sha256
docker load --input darktrace-mcp-local.tar
docker image inspect --format '{{.Id}}' darktrace-mcp:local
```

Transfiere archivo y suma por un canal privado aprobado. Esta receta no autoriza publicar en un registro. El hash solo protege la transferencia si su valor esperado llega por separado mediante un canal de confianza.

<a id="hardening-controls"></a>

## Controles de refuerzo

Se aplican a esta receta y configuración; no establecen la seguridad del host ni del daemon.

| Control | Estado |
|---|---|
| Procedencia | Constructor, dependencias y Alpine fijados por digest; 22 paquetes firmados fijados por SHA-256 por arquitectura; `npm ci` sin scripts de ciclo de vida. Sin atestación ni firma de la imagen derivada |
| Separación compilación/ejecución | Solo `dist/src`, dependencias de producción, metadatos, bibliotecas seleccionadas, CA y licencias llegan a `scratch`. Sin shell, busybox, apk, npm ni actualizador de CA |
| Identidad y archivos | UID/GID `1000:1000`; aplicación y runtime de root. Ejecuta con `--read-only` |
| Privilegios y recursos | `--cap-drop=ALL`, `--security-opt=no-new-privileges`, `--pids-limit=64`, `--memory=256m`; seccomp predeterminado activo. No se probaron AppArmor/SELinux ni Docker sin root |
| Red y puertos | Sin puertos expuestos/publicados. Diagnósticos con `--network=none`; salida de producción limitada al appliance por política del despliegue |
| Secretos | Solo archivos montados de solo lectura, del UID de ejecución (o root en Desktop con `DARKTRACE_TOKEN_FILE_OWNER=root-or-current`), modo `0600` o más estricto. Sin tokens en entorno, argumentos o capas |
| Límite del host | Sin socket Docker montado. Desktop/daemon, integración del host y otros servidores MCP siguen siendo componentes de confianza no auditados |

<a id="predecessor-base-image-review-history"></a>

## Revisión de la imagen base anterior (histórico)

Esta sección conserva la receta anterior: Distroless Debian 13 y Node 22.23.3 oficial.

El [proyecto Distroless](https://github.com/GoogleContainerTools/distroless) publicaba imágenes Debian 13 `cc`, incluida `nonroot`; su [documentación](https://github.com/GoogleContainerTools/distroless/blob/main/cc/README.md) describe glibc. La receta usa ese sistema de archivos multiarquitectura fijado como etapa intermedia y termina en `scratch`, sin heredar variables. El constructor aporta Node 22.23.3 de la imagen oficial fijada; conserva su [`LICENSE`](https://github.com/nodejs/node/blob/v22.23.3/LICENSE) en `/licenses/node/LICENSE` y las licencias del sistema Distroless. La candidata Distroless Node 22 directa tenía Node 22.22.0 y `SSL_CERT_FILE`, incompatibles con nuestras comprobaciones. También se evaluó Node Trixie slim: Trivy de la base registró 211 vulnerabilidades, 43 altas afectadas y una alta aplazada. En la imagen elegida, Trivy dio cero HIGH/CRITICAL y Grype clasificó 11 de las mismas 31 coincidencias como HIGH. No equivale a un escaneo limpio ni a cero CVE. El 2026-10-05, `docker manifest inspect dhi.io/node:22-debian13` devolvió `unauthorized` con la autenticación existente; no se intentó iniciar sesión ni obtener credenciales. No se produjo firma/atestación de la imagen derivada; fijar los digests base no la atestigua.

<a id="predecessor-image-and-lab-checkpoint--2026-10-06-history"></a>

## Imagen anterior y control de laboratorio — 2026-10-06 (histórico)

> Imagen anterior `sha256:eb3a7681…` con OpenSSL 3.5.8 incorporado. Su bloqueo afectaba a esa imagen; v1.0.0 se describe [arriba](#v100-image-at-a-glance-previous-release).

La candidata limitaba ambos perfiles de lectura a **19 selectores GET en 15 herramientas MCP**. `sensitiveRead` no ampliaba el límite. Toda operación excluida (20 lecturas antes elegibles y todas las escrituras) se rechazaba antes de vista previa, auditoría o red. Activar escritura o crítico impedía el arranque.

SHA-256 de origen: `9e7c7070298ef592a1a10cdcb7ca481420a377e25e4a93c863ca33c31921d7f2`; revisión independiente: [ACCEPT](security/validated-consultations-independent-review.md). Instantánea completa: `6ddda2054c9c708d0516a90b7811eb0aba565016403953dace89d47bc89d213c`; hashes ordenados de ambos perfiles: `cd4ee42249a9110182046794c39fc00f5995700b7d751bccc6628e86afbddfe3`. Se archiva el predecesor exacto; no es alternativa activa.

Tanto nativo como Docker reforzado con MCP inicializado superaron **los 19 selectores permitidos** en 7.1.0. TLS, formas esperadas, sin recortes ni proyección de respaldo, recetas secuenciales acotadas y sin reintentos/páginas extra; no cubre todo argumento ni variantes de recursos no vacíos. Se conservan rechazos por identificadores ausentes. Se borró el volumen exacto de secretos y se verificó su ausencia independientemente. [Registros y hashes](security/validated-consultations-lab-checkpoint.md).

La imagen `sha256:eb3a7681da69f6468df0a7600af9d72560cfd8d5c4747dfa8ee57e45f09abeaf` liga ese origen y runtime de transporte nativo. Hash de 49 archivos: `e7cbb509d54909fa10276ffeaec11cab22bb201f1f81635fa8c988abcb3653fb`; ambos perfiles SDK offline coinciden con las 15 herramientas. [Imagen y dependencias](security/validated-consultations-docker-checkpoint.md).

**No estaba lista para publicación estable.** OpenSSL **3.5.8 / CVE-2026-35189** afectaba al procesamiento TLS de certificados/CRLDP (gravedad oficial Low; corregida en 3.5.9). Las restricciones y límites no la corrigen. Se acreditó igualdad de componentes con bytes antes escaneados, no un escaneo nuevo. Trivy 0.74.0: 23 MEDIUM y 8 LOW; Grype 0.118.0: **11 High**, 10 Medium, 3 Low y 7 Negligible para los mismos 31 paquetes Debian, sin versiones corregidas indicadas. No afirma cero CVE ni cero High universal. [Aviso primario](https://openssl-library.org/news/secadv/20260929.txt).

La aceptación independiente tenía alcance limitado; la [revisión de migración](security/validated-consultations-migration-review.md) separaba el seguimiento de pruebas/procedencia. **No se afirmaba la finalización de la batería candidata.** Faltaba congelar documentación, ejecutar las baterías aplicables y dos compilaciones reproducibles/verificaciones de instalación, SRI y vinculación origen-runtime-seguridad, obtener revisión final y comprobar CI remota e idoneidad del despliegue/proveedor. Las versiones seguían en alfa; ese punto de control no autorizaba commits, etiquetas, releases ni publicación.

<a id="historical-local-build-and-scan-record--predecessor-only"></a>

## Registro histórico de compilación y escaneo local — solo predecesor

Las identidades y resultados siguientes describen solo la imagen anterior. Las denegaciones de acceso son históricas; después se restauró y se recompiló/probó la imagen aceptada. Recompila e inspecciona cualquier otro checkout antes de usarlo o transferirlo.

| Comprobación | Resultado |
|---|---|
| Compilación | `docker build --progress=plain --pull --tag darktrace-mcp:local .` pasó en Docker Desktop 29.8.1 (linux/arm64), con digests Node y Distroless Debian 13 fijados. Ambas etapas `npm ci --ignore-scripts` acabaron en origen limpio; npm audit indicó 0 vulnerabilidades. No es un escaneo del sistema operativo |
| Imagen final | `darktrace-mcp@sha256:cb0330ddb93c5611b34efeff01e43c64252b99681567eb30835fd2ba5be281cf`; origen `eadfe11732bd6c9bfa89cbfbbb2dc530d86e6984ad285576aab49b4dfc01d917`; `linux/arm64`; Debian 13.7; Node `v22.23.3`; usuario `1000:1000`; entrada `/nodejs/bin/node /app/dist/src/index.js`; sin puertos y solo `PATH` fijo |
| Runtime | Pasaron ayuda/versión offline, UID, inventario `/app` de root, CA TLS, licencia Node, `--check-config` con tokens sintéticos 0600 de solo lectura e initialize/tools/list MCP (27 herramientas). Opciones: `--pull=never --log-driver=none --network=none --read-only --cap-drop=ALL --security-opt=no-new-privileges --pids-limit=64 --memory=256m`; stdio añadió `--init -i` |
| Inventario/SBOM y escaneo | Para ese digest y origen `eadfe11732bd6c9bfa89cbfbbb2dc530d86e6984ad285576aab49b4dfc01d917`: Trivy 0.74.0 (BD `UpdatedAt=2026-10-05T13:07:51.292695513Z`) encontró 31 paquetes Debian: 23 MEDIUM, 8 LOW, ninguno corregible. Grype 0.118.0: mismos 31, 11 HIGH, 10 MEDIUM, 3 LOW, 7 NEGLIGIBLE, ninguno corregible. Gravedades específicas del escáner, no cero CVE universal. El SBOM CycloneDX 1.7 tiene 18 componentes (17 bibliotecas, 1 sistema) y 25 entradas de vulnerabilidad; no inventarían `/nodejs/bin/node` 22.23.3 ni OpenSSL 3.5.8, zlib, c-ares 1.34.8 e ICU 78.3 incorporados. JSON y SBOM eran archivos locales, no incluidos en imagen o repositorio |
| Límites | Imagen y escaneo anteriores al código de denegación de escrituras; no lo validan. Los tres GET Docker y la prueba anterior de 27 herramientas no validan el origen final. No se eludió la denegación del socket Docker; arriba consta el acceso restaurado y las comprobaciones posteriores. No se probaron Docker sin root, variantes AppArmor/SELinux, descarga DHI autenticada, appliance privado, tokens reales, host/perfil productivo ni reenvío al proveedor. No se publicó imagen |

El fallo previo de red de `npm ci` como root no estaba en los registros de esta revisión ni se reprodujo con Docker Desktop aprobado. La compilación correcta demuestra que la ruta local funciona, no la causa exacta del fallo previo.

Los controles siguen las recomendaciones aplicables de [OWASP Docker Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html) y [OWASP Docker-Security](https://github.com/OWASP/Docker-Security): no root, retirada de capacidades, sin elevación, seccomp, red acotada, límites de recursos, archivos de solo lectura, secretos protegidos y revisión de integridad/escaneos. La [documentación oficial de la imagen Node](https://github.com/nodejs/docker-node) describe variantes Debian y compilación multietapa sin gestores de paquetes. La [política Distroless](https://github.com/GoogleContainerTools/distroless/blob/main/SUPPORT_POLICY.md) describe etiquetas soportadas; estas políticas y archivos no atestiguan la imagen derivada.
