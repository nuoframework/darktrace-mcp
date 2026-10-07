# Actualizar, volver a la versión anterior y desinstalar

**Español** · [English](en/update.md)

[README](../README.md) · [Instalación](install.md) · [Clientes](clients.md) · [Docker](docker.md) · [Versiones](releases.md) · [Modelo de amenazas de las actualizaciones](security/threat-model-updates.md)

Actualiza una instalación fijada con verificación, copias de seguridad y una versión anterior recuperable.

**Alcance por versión:** `update`, los avisos de actualización, `--update-mode` y la eliminación de imágenes anteriores de actualización están en `main` para 1.1.3; npm 1.1.2 no los incluye. Hasta su publicación, ejecuta los ejemplos desde un [checkout del código fuente compilado](../CONTRIBUTING.md).

El asistente fija cada entrada de cliente a una versión: una ruta absoluta a una copia fija del paquete (runtime Node) o un ID de imagen inmutable (runtime Docker). Nada cambia hasta que ejecutas `update`. El propio servidor MCP nunca contacta con el registro ni busca actualizaciones; solo lo hacen los comandos de instalación siguientes, y únicamente cuando los ejecutas.

```sh
node dist/src/index.js update --check     # instalada frente a última, notas; sale con 1 si hay una actualización
node dist/src/index.js update             # verifica la nueva versión y mueve todas las entradas de cliente
node dist/src/index.js update --rollback  # vuelve a la versión anterior (se conserva su copia o imagen)
```

En esta guía, `darktrace-mcp` significa `node dist/src/index.js` dentro de ese checkout compilado; cuando se publique 1.1.3, usa `npx -y @nuoframework/darktrace-mcp@1.1.3` o el ejecutable global si instalaste esa versión globalmente. La versión del prefijo solo elige qué copia del instalador se ejecuta; `update` siempre descarga la versión que resuelve desde el registro.

<a id="what-update-does"></a>

## Qué hace `update`

Runtime Node (predeterminado; lo que instala el asistente desde `npx`):

1. Lee `~/.config/darktrace-mcp/setup.json`: dirección del appliance, perfiles, formato de fecha, rutas de los archivos de token y entrada que arrancan los clientes. No recupera los valores de los tokens; permanecen en los dos archivos accesibles solo por su propietario.
2. Consulta **registry.npmjs.org** mediante `npm view --json` para obtener `latest` (o la versión exacta de `--version X.Y.Z`). El registro es fijo: `--registry` y la opción de registro del ámbito prevalecen sobre cualquier `.npmrc`, de modo que no puede responder un registro alternativo. Rechaza una versión anterior a la instalada salvo que indiques `--allow-downgrade`.
3. Enumera los clientes que tienen una entrada `darktrace` en ese momento (lee el archivo de los clientes que lo usan y consulta Claude Code mediante `claude mcp get`). Sin `--yes`, pregunta una vez: `Update 1.1.2 -> 1.1.3? [Y/n]`.
4. Ejecuta `npm install` de la versión exacta en un nuevo directorio temporal privado: dependencias de producción del shrinkwrap del propio paquete, `--ignore-scripts`, sin enlaces `.bin` y con el mismo registro fijo. npm comprueba cada tarball frente al hash de integridad del documento del registro.
5. Ejecuta `npm audit signatures` sobre ese árbol: la firma ECDSA del registro de cada paquete y la atestación de procedencia Sigstore de cada paquete que tenga una. Una firma inválida o ausente, o una versión cuyo registro anuncie procedencia que npm no pueda verificar, detiene la actualización antes de instalar nada.
6. Copia el árbol verificado a `~/.local/share/darktrace-mcp/<nueva versión>/` (el mismo mecanismo de copia de `setup`: sin enlaces simbólicos ni scripts de ciclo de vida), reemplaza cualquier directorio que ya exista con ese nombre y elimina el directorio temporal.
7. Ejecuta el propio `--check-config` de la nueva copia con los ajustes y archivos de token guardados, sin red. Esto demuestra que el nuevo código carga tu configuración y puede leer los tokens.
8. Envía una petición firmada `GET /status` al appliance con los ajustes guardados (la misma comprobación que `darktrace-mcp test`).
9. Solo entonces reescribe la entrada `darktrace` de cada cliente encontrado en el paso 3: primero guarda una copia de seguridad de cada archivo y lo reemplaza de forma atómica. Claude Code se vuelve a registrar con `claude mcp add --scope user` (si falla, se registra de nuevo la entrada anterior para que el cliente no se quede sin ella).
10. Registra la nueva versión en `setup.json`, junto con `previousVersion` y la ruta de la entrada anterior, pero solo cuando se hayan reescrito todos los clientes del paso 9. La copia anterior permanece en disco para `--rollback`; `uninstall` elimina ambas.

Si falla cualquier paso del 4 al 8, no cambia ninguna entrada de cliente y la versión anterior sigue en uso. Una copia instalada en el paso 6 antes de un fallo posterior no afecta al arranque (los clientes no la ejecutan); el siguiente `update` vuelve a descargarla, verificarla y reemplazarla, y `uninstall` la elimina. Si no se puede reescribir un cliente en el paso 9 (por ejemplo, un archivo de ajustes con comentarios, que el instalador nunca reescribe), el comando sale con 1, identifica el cliente y deja `setup.json` en la versión anterior: corrige ese cliente y repite `update`, que lo moverá e indicará que los demás no han cambiado.

Runtime Docker: sigue la misma secuencia con la imagen en lugar del paquete. `update` descarga `ghcr.io/nuoframework/darktrace-mcp:<nueva versión>`, resuelve el ID local y el digest del registro, ejecuta `--check-config` en el contenedor con los montajes y el usuario de la entrada del cliente y `--network=none`, comprueba el appliance desde el host, reescribe las entradas con el nuevo ID de imagen (`--pull=never`, como antes) y registra el ID anterior para la reversión. Una instalación que fijó la imagen por digest o ID no tiene una versión de release que comparar: `update` indica que omite la comprobación de retroceso y registra igualmente la imagen anterior. Compara el digest mostrado con el de las [notas de GitHub Release](releases.md) si quieres una comprobación independiente de la imagen.

El resumen termina indicando qué se verificó, dónde está la copia o imagen, qué clientes se reescribieron (con sus copias de seguridad) y el siguiente paso: reiniciar los clientes.

<a id="what-is-verified-and-what-is-not"></a>

## Qué se verifica y qué queda fuera

| Comprobación | Mecanismo | Demuestra | No cubre |
|---|---|---|---|
| Identidad del registro | `--registry=https://registry.npmjs.org/` y `--@nuoframework:registry=` en cada llamada a npm | Un `.npmrc`, `npm_config_registry` o registro de ámbito no puede redirigir la consulta ni la descarga | Una cuenta o infraestructura de npmjs.org comprometida (consulta [TM-U-01](security/threat-model-updates.md)) |
| Integridad del tarball | npm compara cada tarball con el SHA-512 `dist.integrity` del documento del registro | Los bytes instalados son los que describe el registro | Que el propio documento del registro sea honesto |
| Firma del registro | `npm audit signatures`: firma ECDSA con la clave publicada por el registro sobre `name@version:integrity`, para cada paquete del árbol | El registro publicó exactamente estos bytes con este nombre y versión | Quién los subió |
| Atestación de procedencia | `npm audit signatures`: bundle Sigstore (SLSA v1) cuyo sujeto es el digest del tarball, con la cadena de certificados Fulcio y la entrada del registro de transparencia Rekor | El tarball se compiló en un workflow de GitHub Actions con publicación de confianza OIDC y la declaración está en el registro público | npm no fija la identidad del certificado al workflow de este repositorio; para ello, ejecuta `gh attestation verify` sobre el archivo de la release como se describe en [Versiones](releases.md#verifying-release-signatures-and-provenance) |
| El nuevo código carga tus ajustes | El `--check-config` de la nueva copia con el entorno guardado, sin red | La nueva versión acepta la configuración, los perfiles y los archivos de token | El comportamiento contra el appliance |
| El appliance sigue respondiendo | Una petición firmada `GET /status` desde este host | La dirección, TLS, los tokens y el formato de fecha funcionan antes de cambiar entradas | Todas las demás operaciones |
| Reescritura de entradas | Los mismos escritores que `setup`: copia de seguridad, archivo temporal, renombrado atómico y rechazo de enlaces simbólicos | Una interrupción deja el archivo anterior o el nuevo, nunca uno a medio escribir | Un cliente que conserve otra copia de la entrada en otro lugar |

Todas las versiones de este paquete desde 1.1.0 se publican con publicación de confianza de npm y `--provenance`; `update --check` indica si el registro anuncia procedencia para la versión de destino. Los archivos del runtime también se fijan en CI mediante hashes ([valores fijados](security/release-pins-1.1.3.md)): es un control al publicar, no algo que `update` verifique en tu equipo.

## `update --check`

Muestra la versión instalada (y dónde está), la última publicada, si se publica procedencia y las notas de la versión de destino obtenidas de GitHub Release (con tamaño limitado y sin caracteres de control). Código de salida `0` si estás al día, `1` si hay una actualización y `2` si el uso es incorrecto. Un fallo de red o del registro se informa como error con el siguiente paso. `--json` muestra un documento JSON en lugar del texto (campos: `command`, `runtime`, `status`, `current`, `target`, `releaseNotes`, `next`) y, fuera de `--check` y `--dry-run`, necesita `--yes` porque no se puede preguntar en un flujo JSON; `--version X.Y.Z` compara contra esa versión en lugar de `latest`.

`darktrace-mcp test` y `doctor --online` muestran una línea, `Update available: 1.1.2 -> 1.1.3. Run: ...`, después de que responda el appliance, y solo entonces. No muestran nada si npm o el registro no están disponibles, y el servidor nunca realiza esta comprobación al arrancar.

## `update --rollback`

Vuelve a apuntar todas las entradas de cliente a `previousVersion` si su copia fija (Node) o imagen (Docker) sigue presente. Ejecuta el `--check-config` de esa copia sin red, reescribe las entradas con copias de seguridad e intercambia las dos versiones en `setup.json`, de modo que un segundo `--rollback` regresa a la más nueva. No se comprueba el appliance durante una reversión: es la vía de recuperación cuando la nueva versión falla y la anterior ya se comprobó al instalarla. Si falta la copia o imagen anterior, no cambia nada y el comando indica cómo reinstalar esa versión.

<a id="update-modes"></a>

## Modos de actualización

`setup` añade una pregunta tras el paso de permisos (solo con el runtime Node):

1. **pinned** (recomendado y predeterminado): las entradas arrancan la copia fija de una versión hasta que ejecutas `update`. Descarga verificada, `--check`, `--rollback` y funcionamiento sin red después de instalar.
2. **always latest** (siempre la última): las entradas arrancan `npx -y @nuoframework/darktrace-mcp@latest` (con la ruta absoluta a `npx` si se encuentra) y el mismo entorno de archivos de token. Cada arranque del cliente obtiene la última release publicada: sin comprobar firmas ni procedencia, sin comprobar el appliance antes de cambiar, sin reversión y con fallo de arranque si no se puede acceder al registro. Elígelo solo si aceptas estas condiciones, por ejemplo en un puesto de análisis desechable.

Sin interacción: `setup --update-mode pinned|npx-latest`. El modo se registra en `setup.json` (`updateMode`); en modo `npx-latest`, `update` no tiene nada que mover y lo indica, `update --check` sigue mostrando qué está publicado y `test` no muestra avisos de actualización. Para volver al modo fijado, repite `setup --update-mode pinned`: instala la copia fija y reescribe las entradas. Las entradas Docker siempre están fijadas.

<a id="paths-that-clients-manage-themselves"></a>

## Rutas que gestionan los propios clientes

`update` mueve las entradas que escribió `setup`. Estas rutas las actualiza el cliente o tú, no `update`:

| Ruta | Cómo actualizar | Notas |
|---|---|---|
| Plugin de Claude Code | `claude plugin update darktrace-mcp@darktrace-mcp` | El lockfile del plugin fija la versión del paquete; la actualización instala la nueva versión fijada. Los tokens permanecen en el almacén de credenciales del sistema. [Guía del plugin](plugin-distribution.md) |
| Plugin de Codex | `codex plugin marketplace upgrade darktrace-mcp` | Después repite `codex plugin add darktrace-mcp@darktrace-mcp` si Codex lo pide; `update` mueve normalmente la entrada `mcp_servers.darktrace` que escribió el asistente |
| Extensión de Claude Desktop (`.mcpb`) | Descarga `darktrace-mcp-<versión>.mcpb` de la [release](https://github.com/nuoframework/darktrace-mcp/releases) (o actualízala desde su ficha en Claude Directory) y ábrela | Los tokens del llavero se conservan; si también tienes una entrada escrita por `setup`, `update` la mueve |
| Docker fijado por digest en una entrada manual | `docker pull ghcr.io/nuoframework/darktrace-mcp@sha256:<nuevo digest>` de las notas de la release; después edita la entrada | `setup --runtime docker` seguido de `update` lo hace por ti y conserva la imagen anterior |
| Checkout del código fuente (`scripts/install.sh` o `git clone`) | `git pull --ff-only && npm ci --ignore-scripts && npm run build`, o repite `scripts/install.sh` | `update` rechaza modificar un checkout y muestra estos comandos |
| Instalación global de npm | `npm install -g @nuoframework/darktrace-mcp@<nueva versión>` y después `darktrace-mcp setup` | `update` detecta la disposición y muestra el comando; `uninstall` muestra el correspondiente `npm uninstall -g` |
| JetBrains AI Assistant (pegar configuración) | Después de `update`, ejecuta `darktrace-mcp config jetbrains` y pega el nuevo JSON | No hay un archivo documentado para este cliente, así que no se puede reescribir nada |

<a id="uninstall"></a>

## Desinstalar

`darktrace-mcp uninstall` sigue siendo la única vía de eliminación. Muestra un plan, pregunta una vez, elimina la entrada `darktrace` de cada cliente (conserva las copias de seguridad), borra los tokens guardados y `setup.json`, y elimina todas las copias fijas de `~/.local/share/darktrace-mcp/`, incluidas las instaladas por `update` y la anterior conservada para reversión (`--keep-copies` las conserva). Con `--docker`, elimina exactamente el ID de imagen en uso y el anterior registrado por `update`, nunca otras imágenes. Las copias de seguridad y las rutas gestionadas por los clientes que se indican arriba quedan a tu cargo.

<a id="files"></a>

## Archivos

| Archivo | Lo escribe | Contenido |
|---|---|---|
| `~/.config/darktrace-mcp/setup.json` (0600) | `setup`, `update` | Opciones no secretas más `installedVersion`, `entryPath` (Node), `updateMode` (solo Node), `previousVersion`, `previousEntryPath` o `previousImage` y `previousImageDigest`; se escribe solo después de mover todas las entradas de cliente |
| `~/.local/share/darktrace-mcp/<versión>/` | `setup` (desde la caché de npx), `update` | Una copia fija por versión: el paquete y sus dependencias fijadas, sin enlaces simbólicos |
| `<configuración del cliente>.bak-<marca de tiempo>` | Cada reescritura | El archivo tal como estaba antes de que lo modificaran `setup`, `update`, `--rollback`, `remove` o `uninstall` |
| Directorio temporal `darktrace-mcp-update-*` | `update` | La descarga que se está verificando; se elimina antes de que termine el comando, también si falla |

Nota para Windows: `update` no mueve una instalación que escribió valores de token en archivos de cliente (`--inline-tokens-windows`), porque no recupera esos valores; repite `setup` con la nueva versión. Las instalaciones con Docker Desktop y WSL se actualizan normalmente.

<a id="troubleshooting"></a>

## Solución de problemas

- `registry.npmjs.org could not be queried`: no hay red, un proxy bloquea npm o npm es antiguo. `npm view @nuoframework/darktrace-mcp version` desde una terminal muestra el mismo problema. No se ha cambiado nada.
- `npm audit signatures rejected the downloaded tree`: no instales esa versión. Comprueba `npm --version` (9.5 o posterior verifica las atestaciones), reintenta una vez y, si persiste, informa del error con la línea de npm mostrada.
- `the appliance check (signed GET /status) failed`: la nueva copia está instalada, pero no ha cambiado ninguna entrada. Ejecuta `darktrace-mcp test`, corrige la dirección, TLS, los tokens o el formato de fecha y repite `update`.
- `downgrades are refused`: has pedido una versión anterior; añade `--allow-downgrade` solo si es lo que quieres.
- Un cliente sigue ejecutando la versión anterior después de actualizar: reinícialo por completo (Claude Desktop: sal desde el menú). `darktrace-mcp config <client>` muestra la entrada que debería estar ahora en su archivo.
