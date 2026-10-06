[English](../configuration.md) · **Español**

# Configuración

[README](../../README.es.md) · [Primeros pasos](getting-started.md) · [Clientes](clients.md) · [Solución de problemas](troubleshooting.md)

El asistente de configuración escribe todo esto por ti. Lee esta página si quieres cambiar algo a mano.

El servidor lee la configuración de **variables de entorno** y, opcionalmente, de un **archivo JSON**. Las variables de entorno tienen prioridad. Las variables `DARKTRACE_*` desconocidas y los campos JSON desconocidos detienen el arranque, así se detectan erratas. El servidor no lee archivos `.env`.

## Conexión y credenciales

| Variable | Campo JSON | Por defecto | Notas |
|---|---|---|---|
| `DARKTRACE_URL` | `instance.baseUrl` | — (obligatoria) | Solo origen HTTPS, por ejemplo `https://darktrace.example.internal`. Sin ruta, query ni usuario |
| `DARKTRACE_PUBLIC_TOKEN_FILE` | `auth.publicTokenFile` | — (obligatoria) | Ruta absoluta al archivo con el token público |
| `DARKTRACE_PRIVATE_TOKEN_FILE` | `auth.privateTokenFile` | — (obligatoria) | Ruta absoluta al archivo con el token privado |
| `DARKTRACE_TOKEN_FILE_OWNER` | `auth.tokenFileOwner` | `current` | Quién puede ser dueño de los archivos de token. `root-or-current` acepta también root (uid 0); solo para Docker Desktop, ver abajo |
| `DARKTRACE_CONFIG_FILE` | — | ninguno | Ruta absoluta al archivo JSON |
| `DARKTRACE_DATE_FORMAT` | `auth.dateFormat` | `compact` | Formato de fecha de la firma. Alternativa: `spaced` |
| `DARKTRACE_QUERY_SIGNATURE_ENCODING` | `auth.querySignatureEncoding` | `unencoded` | Alternativa: `encoded`. Sin cambio automático |
| `DARKTRACE_DESTINATION_ALLOWLIST` | `instance.destinationAllowlist` | ninguna | IPs separadas por comas a las que puede resolver la URL. IPs exactas, sin CIDR |
| `NODE_EXTRA_CA_CERTS` | — | ninguno | Archivo PEM con tu CA privada. Node lo lee al arrancar |

`DARKTRACE_BASE_URL` es el nombre antiguo de `DARKTRACE_URL`. Si ambas tienen valores distintos, el arranque falla.

### Archivos de token

Cada archivo de token debe:

- ser un archivo normal (no un enlace simbólico), de 4 KiB como máximo;
- pertenecer al usuario que ejecuta el servidor;
- tener permisos `0600` o `0400`;
- contener solo el token, opcionalmente seguido de un salto de línea.

**Docker Desktop (macOS y Windows).** Los archivos montados con bind mount aparecen dentro del contenedor como propiedad de root (uid 0), sea cual sea su dueño en el host, y la comprobación por defecto los rechaza. Define `DARKTRACE_TOKEN_FILE_OWNER=root-or-current` (o `"auth": {"tokenFileOwner": "root-or-current"}`) para aceptar también archivos de token de root. El resto de comprobaciones se mantiene: archivo normal, sin enlace simbólico, máximo 4 KiB y permisos solo para el dueño. Mientras esté activo, el servidor escribe `{"event":"token_file_owner_relaxed"}` en stderr al arrancar. Es un ajuste del operador; el modelo no puede cambiarlo. En Linux déjalo en `current`, porque los bind mounts conservan el dueño del host. `darktrace-mcp setup` lo añade solo con el runtime Docker en macOS y Windows.

```sh
chmod 600 ~/.config/darktrace-mcp/public-token ~/.config/darktrace-mcp/private-token
```

`DARKTRACE_PUBLIC_TOKEN` y `DARKTRACE_PRIVATE_TOKEN` (el token directamente en el entorno) también funcionan, para gestores de secretos que los inyectan. Es preferible usar archivos. Nunca configures el valor y el archivo del mismo token a la vez.

## Perfiles

Los perfiles deciden qué herramientas ve y puede usar el modelo. Se configuran con una lista separada por comas:

| Variable | Campo JSON | Por defecto |
|---|---|---|
| `DARKTRACE_PROFILES` | objeto `profiles` (ver [variables antiguas](#variables-antiguas)) | `read` |

| Perfil | Permite | Protección |
|---|---|---|
| `read` | Lecturas normales: dispositivos, model breaches, AI Analyst, lista de Antigena, etiquetas, modelos, métricas, estado | — |
| `sensitive` | Lecturas que pueden devolver contenido en bruto: Advanced Search, contenido y búsqueda de correos, descarga de PCAP, eventos de auditoría de correo | — |
| `write` | Cambios de nivel medio y alto: reconocer, comentar, fijar, etiquetas, etiquetas de dispositivo, solicitar PCAP, investigaciones de AI Analyst | Añade `dryRun:true` a una llamada para ver una vista previa sin cambiar nada |
| `critical` | Acciones de Antigena/RESPOND, intel feed, subredes, acciones sobre correo, borrar una etiqueta | Solo se ejecuta si la llamada repite una vista previa con `confirm:true` y su `previewId`, y (por defecto) aceptas el diálogo de confirmación del servidor. Si no, devuelve una vista previa. Consulta [aprobación humana](#aprobación-humana) |
| `all` | Todo lo anterior | Las mismas reglas por operación |

Ejemplos:

```sh
export DARKTRACE_PROFILES=read
export DARKTRACE_PROFILES=read,sensitive
export DARKTRACE_PROFILES=read,write
export DARKTRACE_PROFILES=all
```

Buenas prácticas:

- Empieza con `read`. Añade más solo cuando lo necesites.
- Da `critical` solo a quien podría hacer la misma acción en la interfaz de Darktrace.
- `confirm:true` debe venir de ti, después de leer la vista previa. No le digas al modelo que confirme siempre.
- Cada escritura y acción crítica genera una línea de auditoría (JSON con `"audit":true`) en el log stderr del servidor.
- Si una escritura agota el tiempo, su resultado es desconocido. Revisa el appliance antes de repetir. Las escrituras nunca se reintentan solas.

### Aprobación humana

Quién confirma una escritura antes de que llegue al appliance:

| Variable | Campo JSON | Valores | Por defecto |
|---|---|---|---|
| `DARKTRACE_CRITICAL_APPROVAL` | `profiles.criticalApproval` | `elicitation`, `host` | `elicitation` |
| `DARKTRACE_WRITE_APPROVAL` | `profiles.writeApproval` | `elicitation`, `host` | `host` |

- `elicitation`: el propio servidor te pregunta en un diálogo de confirmación (elicitación MCP). El diálogo muestra la operación y los valores exactos. No se envía nada si no aceptas. Rechazar, cancelar, cerrar el diálogo o no responder en 2 minutos equivalen a no.
- `host`: el servidor confía en el aviso de permisos de herramientas de tu cliente. Las acciones críticas siguen necesitando `confirm:true` con un `previewId` válido. Este modo es más débil: una regla de "permitir siempre" para la herramienta aprueba todas las llamadas siguientes sin enseñarte los valores.

El servidor solo considera que un cliente puede mostrar el diálogo si el cliente lo declara a nivel de protocolo. Los argumentos de herramienta que escribe el modelo nunca cuentan. Hay dos formas de declararlo:

- **Clientes del protocolo 2025**: declaran la capacidad `elicitation` en `initialize`. El servidor envía una petición `elicitation/create`.
- **Clientes del protocolo 2026-07-28** (por ejemplo, Claude Code): no hay `initialize`. Declaran `elicitation` en el sobre `_meta` de cada petición. Esa revisión no tiene peticiones del servidor al cliente, así que el servidor responde a la llamada con un resultado `input_required` que lleva el diálogo. El cliente te pregunta y repite la llamada idéntica con tu respuesta. El servidor acepta esa respuesta una sola vez, para esa llamada exacta, durante 2 minutos, y solo junto con el estado firmado que emitió.

Si el cliente no declara un diálogo de formulario (por ejemplo, sin `elicitation` o solo con URL), las acciones críticas se rechazan con `"approval":"unsupported"`. La pista dice que el host no puede mostrar el diálogo y menciona `DARKTRACE_CRITICAL_APPROVAL=host`. Consejos por cliente: [configuración de clientes](clients.md#claude-code).

### Variables antiguas

Siguen funcionando y equivalen a perfiles:

| Configuración antigua | Equivale a |
|---|---|
| `DARKTRACE_SENSITIVE_READ=true` / `profiles.sensitiveRead: true` | añadir `sensitive` |
| `DARKTRACE_WRITE_CRITICAL=true` / `profiles.writeCritical: true` | añadir `critical` |
| `profiles.write: true` | añadir `write` |

Qué perfil necesita cada operación: [referencia de herramientas](../tools.md) (inglés).

## Límites

Solo se pueden bajar. Un valor por encima del máximo detiene el arranque.

| Variable | Campo JSON | Por defecto y máximo |
|---|---|---:|
| `DARKTRACE_TIMEOUT_MS` | `instance.timeoutMs` | 30.000 ms por llamada |
| `DARKTRACE_MAX_RESPONSE_BYTES` | `limits.maxResponseBytes` | 2 MiB |
| `DARKTRACE_MAX_TOOL_INPUT_BYTES` | `limits.maxToolInputBytes` | 65.536 bytes |
| `DARKTRACE_MAX_TOOL_INPUT_DEPTH` | `limits.maxToolInputDepth` | 8 |
| `DARKTRACE_MAX_TOOL_INPUT_ELEMENTS` | `limits.maxToolInputElements` | 5.000 |
| `DARKTRACE_MAX_TOOL_OUTPUT_CHARS` | `limits.maxToolOutputChars` | 60.000 |
| `DARKTRACE_MAX_CONCURRENT_REQUESTS` | `limits.maxConcurrentRequests` | 4 |
| `DARKTRACE_MAX_QUEUED_REQUESTS` | `limits.maxQueuedRequests` | 16 |
| `DARKTRACE_MAX_PAGES` | `limits.maxPages` | 10 |
| `DARKTRACE_RATE_LIMIT_PER_MINUTE` | `limits.rateLimitPerMinute` | 120 |
| `DARKTRACE_MAX_GET_RETRIES` | `limits.maxGetRetries` | 2 (solo GET) |
| `DARKTRACE_MAX_RETRY_AFTER_MS` | `limits.maxRetryAfterMs` | 2.000 ms |

Cola, reintentos y espera entre reintentos aceptan `0`. El resto empieza en 1.

## Archivo de configuración

En lugar de muchas variables, puedes usar un archivo JSON. Parte de [operator.config.json](../../examples/operator.config.json):

```json
{
  "instance": { "baseUrl": "https://darktrace.example.internal", "timeoutMs": 30000 },
  "auth": {
    "publicTokenFile": "/absolute/private/darktrace/public-token",
    "privateTokenFile": "/absolute/private/darktrace/private-token"
  },
  "profiles": { "read": true, "write": false, "sensitiveRead": false, "writeCritical": false },
  "transport": { "kind": "stdio" }
}
```

```sh
chmod 600 /absolute/private/darktrace/operator.json
export DARKTRACE_CONFIG_FILE=/absolute/private/darktrace/operator.json
darktrace-mcp --check-config
```

El archivo sigue las mismas reglas que los de token (tuyo, `0600`, sin enlaces simbólicos), con un límite de 64 KiB.

## Comandos

| Comando | Qué hace | Red |
|---|---|---|
| `darktrace-mcp` | Arranca el servidor MCP por stdio. Lo ejecuta tu cliente | Sí |
| `darktrace-mcp setup` | Asistente interactivo: URL, tokens, perfil, clientes | No |
| `darktrace-mcp config <cliente>` | Muestra la configuración, o un enlace de un clic para `vscode` y `cursor` | No |
| `darktrace-mcp remove` | Quita el servidor de los clientes configurados | No |
| `darktrace-mcp test` | Una llamada `GET /status` para comprobar URL, tokens, reloj y TLS | Sí |
| `darktrace-mcp --check-config` / `doctor` | Comprueba la configuración y los archivos de token | No |
| `darktrace-mcp --help` / `--version` | Ayuda y versión | No |

Nunca se aceptan credenciales como argumentos de línea de comandos.

## Red y TLS

- La verificación de certificados TLS está siempre activa. No hay forma de desactivarla.
- Para una CA privada, define `NODE_EXTRA_CA_CERTS=/ruta/absoluta/ca.pem`.
- Las variables de proxy (`HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY`, `NO_PROXY`, en minúsculas o mayúsculas, y `NODE_USE_ENV_PROXY`) detienen el arranque. El servidor se conecta directamente al appliance. Consulta [solución de problemas](troubleshooting.md#se-rechazan-las-variables-de-proxy).
- `NODE_TLS_REJECT_UNAUTHORIZED=0`, `SSL_CERT_FILE`, `SSL_CERT_DIR` y `OPENSSL_CONF` también detienen el arranque.
- El servidor solo se conecta a la URL configurada. El DNS se resuelve una vez al arrancar. Se rechazan direcciones NAT64, 6to4 y Teredo.

## No compatible

Transporte HTTP (solo stdio), exportación a disco y más de un appliance por proceso. Si tienes varios, configura una entrada de servidor por appliance.
