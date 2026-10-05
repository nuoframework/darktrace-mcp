# Volumen de secretos para el modo Docker del harness

**Estado:** implementación y pruebas sintéticas. Fecha: 2026-10-05. Autor: trabajador despachado (tarea `task_1cc675edc8b1`).

**Qué no hice:**
- No usé credenciales ni configuraciones reales y no accedí al laboratorio.
- No cambié la fuente de producción, el Dockerfile, el README ni las versiones, y no hice commits.
- Solo modifiqué `scripts/lab-read-smoke.mjs` y `docs/lab-validation.md`, y creé este informe.

## 1. Problema y decisión

El root observó en DockerDesktop que un token montado como bind mostraba UID 501 con `lstat` y UID 0 con el `fstat` del descriptor abierto con `O_NOFOLLOW`, con el mismo directorio 0700 y archivos 0600. La primera ejecución real pasó y las siguientes fallaron. Producción rechaza correctamente esa discrepancia, así que **no se toca su comprobación de propietario**.

En mi entorno no se reprodujo: con archivos sintéticos, `lstat` y `fstat` dieron ambos 501. Por eso se añade una alternativa opcional, solo para Docker: un **volumen con nombre** creado por el operador. Sus archivos viven en el sistema de archivos del motor Docker, de modo que el propietario no depende de la traducción de metadatos que hace el file sharing del host.

## 2. Cambios

**`scripts/lab-read-smoke.mjs`:** de `6b00b0ce…` a **`ad4583071e6c2d7b29c3c81ad39015e9f445dc29f4093234f4124de6dd9c2bd6`**.

- **CLI:** nuevo `--secret-volume`, solo junto a `--docker-image`, que debe cumplir `^darktrace-mcp-lab-secrets-[a-f0-9]{32}$`. Es excluyente con `--public-token-file`, `--private-token-file` y `--ca-file`. `--config` sigue siendo obligatorio como referencia externa, pero en este modo no se monta ni se lee.
- **`verifySecretVolume()`:** se ejecuta después de la comprobación de runtime, que no cambia, y antes del contenedor de producción.
  1. `docker volume inspect`: nombre exacto, `Driver=local`, `Scope=local` y `Options` vacías. Esto rechaza volúmenes `local` respaldados por bind o tmpfs.
  2. `docker ps --all --filter volume=`: debe estar vacío; si no, `SECRET_VOLUME_IN_USE`.
  3. Un contenedor de metadatos con `--network=none`, los mismos flags endurecidos, `--user` e ID de imagen, y el volumen montado `readonly,volume-nocopy`. Comprueba los nombres permitidos y obligatorios, `lstat` y el `fstat` de un descriptor `O_NOFOLLOW`: tipo, mismo inodo y dispositivo, UID igual al de `--user`, máscara `0o7177`, `nlink` 1 y tamaño. No lee contenido y solo devuelve `{"ca":bool}`. El directorio raíz del volumen no puede ser escribible por grupo ni por otros.
- **Producción:** un único `--mount type=volume,source=<vol>,target=/run/secrets,readonly,volume-nocopy`. `NODE_EXTRA_CA_CERTS` se define solo si existe `ca.pem`. El resto del entorno, los flags (`--rm --init --pids-limit=64 --memory=256m --pull=never --log-driver=none --read-only --cap-drop=ALL --security-opt=no-new-privileges`), el entrypoint fijo y la limpieza por nombre exacto no cambian.
- **Se mantiene:** el binding de fuente, runtime y los 14 árboles, el ID de imagen inmutable y la ausencia de puertos, TTY, pulls y logs. El harness **no contiene ninguna orden de borrado de volúmenes**.

**`docs/lab-validation.md`:** de `b64a1e45…` a **`feff8e0f4a60690959f63929105ed088ac61b97ee73034c172c5ee9bfb529831`**. Nueva subsección *Docker secret volume alternative (root only)*, con los requisitos, las comprobaciones, el procedimiento de aprovisionamiento del root y la destrucción del volumen por parte del root al terminar la campaña.

## 3. Aprovisionamiento (para el root)

El procedimiento usa `docker volume create`, después `docker create --network=none` con el volumen (el contenedor auxiliar **no se arranca**), un `tar` sin atributos extendidos de macOS enviado a `docker cp -a` y finalmente `docker rm` del auxiliar.

Observaciones de las pruebas:
- Con esta imagen, `docker cp` asigna el `USER` de la imagen (**1000:1000**) aunque el tar diga otro UID; con `--uid 1001` el resultado fue igualmente 1000. Por tanto, el procedimiento sirve para `--user 1000:1000`. Otro UID necesitaría un método de aprovisionamiento revisado aparte.
- `tar` de macOS añade `com.apple.provenance` salvo que se use `--no-xattrs --no-mac-metadata`; Docker rechaza ese atributo.

## 4. Pruebas sintéticas

Condiciones: tokens falsos, CA de prueba `test/security/fixtures/ca.pem`, `baseUrl` `https://127.0.0.1` (el conector la rechaza antes de abrir socket), imagen `sha256:cb0330dd…`. El harness se ejecutó en una copia del snapshot limpio (fuente `eadfe117…`) con un manifiesto generado por el generador documentado: `d13983cb…`, schema 2, 14 árboles, archivo externo con modo 0600.

| Caso | Resultado |
|---|---|
| `--secret-volume` sin `--docker-image`; con token público, token privado o `--ca-file`; nombre con 31 hex, en mayúsculas, otro prefijo, con `/`, como ruta absoluta o con sufijo; `--user 0:0` | `INVALID_DOCKER_SELECTION`, sin ninguna orden Docker |
| Flag repetido | `INVALID_CLI` |
| Volumen inexistente | `SECRET_VOLUME_NOT_REVIEWED` |
| Volumen `local` con opciones (tmpfs) | `SECRET_VOLUME_NOT_REVIEWED`; el volumen se conserva |
| Falta `private-token`; archivo extra; `public-token` con modo 0640; `public-token` como symlink a `private-token`; `ca.pem` como hard link (`nlink` 2) | `SECRET_VOLUME_NOT_REVIEWED`; el volumen se conserva |
| Volumen válido (UID 1000) con `--user 1001:1001` | `SECRET_VOLUME_NOT_REVIEWED` |
| Volumen usado por otro contenedor (creado, sin arrancar) | `SECRET_VOLUME_IN_USE` |
| Volumen válido, con y sin `ca.pem` | Pasa la comprobación de runtime, el volumen, `initialize` y `listTools`; `get_status` termina en `TOOL_ERROR` por el destino rechazado, que es lo esperado |
| Sonda directa con `--network=none` y el mismo montaje de volumen | `fstat` de producción correcto, `initialize` en 211 ms, `tools/list` con **27** herramientas, salida 0 |
| Regresiones | El modo bind con `--user 501:20` sigue funcionando; el modo nativo con el manifiesto antiguo da `DIST_NOT_REVIEWED`; `--help` documenta el volumen |
| Limpieza | Tras cada caso, 0 contenedores `darktrace-mcp-lab-*`. El harness nunca borró el volumen; mis volúmenes sintéticos los borré yo después y quedan 0. |

**Límites:**
- No es evidencia de Docker contra un appliance real.
- No se reprodujo la discrepancia `lstat`/`fstat` del bind.
- Docker Desktop arm64 únicamente.
- Que la orden `docker` sea de confianza sigue dependiendo del `PATH` del operador.

## 5. Severidad según escáner y omisión de Node en el SBOM (de la revisión final de Docker)

- **Severidad según la fuente:** sobre la misma imagen `sha256:cb0330dd…`, Trivy 0.74.0 informa 23 MEDIUM y 8 LOW. En 22 de esos MEDIUM la severidad no viene de Debian sino de Red Hat o Ubuntu; 7 de los LOW sí son valoraciones de Debian. Grype 0.118.0 (base de datos de 2026-10-05) informa las mismas 31 coincidencias Debian como 11 High, 10 Medium, 3 Low y 7 Negligible. Ninguna tiene versión corregida (15 `wont-fix` y 16 `not-fixed`). Por eso no debe decirse "0 high" sin indicar el escáner y la fuente.
- **Omisión de Node en el SBOM:** Trivy, Grype y el SBOM CycloneDX **no inventarían `/nodejs/bin/node`** (22.23.3) ni lo que empaqueta: OpenSSL 3.5.8, zlib, c-ares 1.34.8 e ICU 78.3. Hay que añadirlo de forma explícita al SBOM o al registro y contrastarlo con los avisos de Node en cada reconstrucción.

La aplicabilidad detallada está en [docker-final-review.md](docker-final-review.md).

## 6. Hashes congelados y siguiente paso

| Elemento | SHA-256 |
|---|---|
| `scripts/lab-read-smoke.mjs` | `ad4583071e6c2d7b29c3c81ad39015e9f445dc29f4093234f4124de6dd9c2bd6` |
| `docs/lab-validation.md` | `feff8e0f4a60690959f63929105ed088ac61b97ee73034c172c5ee9bfb529831` |
| Política de validación (sin cambios) | `d501a0591b1a78ea1dd5363118c233cd78c59aca2400ffd3eadfddc474c15212` |

El root debe:
1. Obtener una revisión independiente de este cambio.
2. Generar un manifiesto nuevo desde un snapshot limpio con este harness. Los manifiestos `6b2fa571…` y `b9aabc26…` ya no sirven, porque cambia `scripts/lab-read-smoke.mjs`.
3. Crear el volumen a partir de los archivos protegidos.
4. Ejecutar la campaña.
5. Destruir el volumen.

Los cambios de CI corresponden a Luna, que no ha recibido ninguna modificación de este trabajo.
