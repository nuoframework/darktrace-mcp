[English](../troubleshooting.md) · **Español**

# Solución de problemas

[README](../../README.es.md) · [Primeros pasos](getting-started.md) · [Configuración](configuration.md) · [Clientes](clients.md)

Empieza con estos dos comandos, con el mismo entorno que usa tu cliente.

```sh
darktrace-mcp --check-config
darktrace-mcp test
```

`--check-config` detecta problemas locales (URL, archivos de token, perfiles). `test` llama a `GET /status` y detecta problemas de red, TLS, reloj y tokens. Los mensajes de error nunca incluyen los tokens.

## Tabla rápida

| Síntoma | Causa probable | Ver |
|---|---|---|
| El cliente muestra el servidor como fallido o "disconnected" | Ruta de Node o del entrypoint incorrecta, o error de configuración | [El servidor no arranca](#el-servidor-no-arranca) |
| `401`, `403`, "authentication failed" | Token incorrecto, token sin permiso o reloj desfasado | [Errores de autenticación](#errores-de-autenticación) |
| Funciona un rato y luego da `401` | Deriva del reloj | [Desfase de reloj](#desfase-de-reloj) |
| "unable to verify the first certificate", "self-signed certificate" | CA privada no reconocida | [TLS y CA privada](#tls-y-ca-privada) |
| "token file must be owned by…", "mode 0600" | Permisos de los archivos de token | [Permisos de los archivos de token](#permisos-de-los-archivos-de-token) |
| "proxy environment is not supported" | Variables de proxy en tu entorno | [Se rechazan las variables de proxy](#se-rechazan-las-variables-de-proxy) |
| Falta una herramienta | Su perfil no está activado | [Falta una herramienta](#falta-una-herramienta) |
| Una acción crítica solo devuelve una vista previa | Falta `confirm:true` | [Escrituras y acciones críticas](#escrituras-y-acciones-críticas) |
| "response too large" | El resultado supera el límite | [Resultados grandes](#resultados-grandes) |

## El servidor no arranca

1. Ejecuta en una terminal el `command` y los `args` exactos de la configuración de tu cliente, añadiendo `--check-config`.
2. Usa rutas absolutas. Las aplicaciones de escritorio no ven el `PATH` de tu shell, así que `node` a secas puede fallar. Obtén la ruta completa con `node -p 'process.execPath'`.
3. Asegúrate de haber compilado: `dist/src/index.js` debe existir (`npm run build`).
4. Revisa la sintaxis JSON o TOML. En Windows, las barras invertidas en JSON se escriben dobles.
5. Mira el log MCP del cliente. Los mensajes del servidor van a stderr. Un problema de configuración escribe una línea como `{"event":"startup_error","reason":"could not read private token file"}`; `reason` nombra el ajuste, nunca su valor. Otros fallos de arranque solo muestran el evento.

Que el servidor parezca "parado" es normal: espera al cliente.

## Errores de autenticación

Darktrace firma cada petición con tu token privado y la hora actual.

| Comprobación | Cómo |
|---|---|
| Los tokens público y privado no están intercambiados | Abre cada archivo. El público va en `..._PUBLIC_TOKEN_FILE` |
| No hay espacios ni finales de línea de Windows | `od -c public-token \| tail -3` debe terminar en el token y, opcionalmente, `\n`, no `\r\n` |
| El token tiene permiso de API para lo que pides | Revisa el token en System Config de Darktrace |
| El reloj es correcto | Consulta [desfase de reloj](#desfase-de-reloj) |
| Formato de firma | Si `test` sigue fallando, prueba `DARKTRACE_DATE_FORMAT=spaced` o `DARKTRACE_QUERY_SIGNATURE_ENCODING=encoded`, de uno en uno |

## Desfase de reloj

Darktrace rechaza firmas si tu reloj difiere del appliance más de unos minutos.

```sh
date -u
```

Compárala con la hora del appliance. Activa la sincronización automática (NTP) en el equipo que ejecuta el servidor. En Docker, el contenedor usa el reloj del host.

## TLS y CA privada

La verificación TLS está siempre activa y no se puede desactivar. Si tu appliance usa un certificado de una CA privada:

```sh
export NODE_EXTRA_CA_CERTS=/ruta/absoluta/a/ca-empresa.pem
darktrace-mcp test
```

En la configuración de un cliente, añade `NODE_EXTRA_CA_CERTS` al bloque `env`. En Docker, monta el PEM en solo lectura y apunta `NODE_EXTRA_CA_CERTS` a su ruta dentro del contenedor.

Comprueba también que el nombre de la URL coincide con el certificado y que no ha caducado.

## Permisos de los archivos de token

El servidor rechaza archivos de token que otros puedan leer.

```sh
ls -l /absolute/private/darktrace/
chmod 600 /absolute/private/darktrace/public-token /absolute/private/darktrace/private-token
```

| El mensaje menciona | Solución |
|---|---|
| mode | `chmod 600 <archivo>` |
| owner | El archivo debe ser del usuario que ejecuta el servidor. En Docker, del UID 1000 o del `--user` que indiques |
| symlink | Apunta la variable al archivo real, no a un enlace |
| size | Un token por archivo, menos de 4 KiB |
| relative path | Usa una ruta absoluta |

**Windows.** En Windows nativo los permisos no se pueden comprobar igual, así que el servidor puede rechazar los archivos. Ejecuta el servidor dentro de WSL con rutas de Linux.

**Docker Desktop.** En macOS y Windows los archivos montados aparecen como propiedad de root dentro del contenedor, así que verás `could not read ... token file` aunque los permisos en el host sean correctos. Añade `-e DARKTRACE_TOKEN_FILE_OWNER=root-or-current` a los argumentos de `docker run` (consulta la [guía de Docker](../docker.md), en inglés) y ejecuta `--check-config` en el contenedor. Nunca relajes los permisos.

## Se rechazan las variables de proxy

El servidor se conecta directamente al appliance y se detiene si ve configuración de proxy: `HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY`, `NO_PROXY` (en cualquier forma) o `NODE_USE_ENV_PROXY`. Quítalas solo para este servidor:

```sh
env -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u NO_PROXY \
  -u http_proxy -u https_proxy -u all_proxy -u no_proxy \
  -u NODE_USE_ENV_PROXY \
  darktrace-mcp --check-config
```

Si tu red solo permite salir por un proxy, pide a tu equipo de red una ruta directa al appliance. No cambies la política de proxy de todo el sistema.

## Falta una herramienta

Las herramientas solo aparecen si su perfil está activado. Revisa `DARKTRACE_PROFILES` en la configuración del cliente y reinícialo.

| Herramientas que faltan | Añade el perfil |
|---|---|
| Advanced Search, contenido de correo, descarga de PCAP, auditoría de correo | `sensitive` |
| Reconocer, comentar, fijar, etiquetas, solicitar PCAP, investigaciones | `write` |
| Acciones de Antigena, intel feed, cambios de subredes, acciones de correo, borrar etiqueta | `critical` |

El endpoint obsoleto `GET /aianalyst/incidents` nunca está disponible. Usa `darktrace_list_ai_analyst_incidents`.

## Escrituras y acciones críticas

- **Primero la vista previa.** Añade `dryRun:true` a cualquier escritura para ver qué pasaría.
- **Las acciones críticas** devuelven una vista previa salvo que la llamada incluya `confirm:true`. Lee la vista previa y después confirma.
- **Tiempo agotado o desconexión durante una escritura.** El resultado es desconocido. Comprueba en Darktrace si se aplicó antes de repetir. Las escrituras nunca se reintentan solas.
- **Darktrace devuelve 403 en una escritura.** Tu token no tiene ese permiso. Los perfiles no pueden saltarse los permisos del token.

## Resultados grandes

Se rechazan respuestas de más de 2 MiB y salidas de más de 60.000 caracteres. Acota la petición: menos tiempo, un dispositivo concreto, menos campos.

## Si sigues atascado

Recoge la salida de `darktrace-mcp --check-config` y `darktrace-mcp --version`, elimina nombres de host internos y abre una issue en el repositorio privado. Nunca compartas tokens ni datos del appliance. Problemas de seguridad: consulta [SECURITY.md](../../SECURITY.md).
