# Primeros pasos

**Español** · [English](en/getting-started.md)

[README](../README.md) · [Clientes](clients.md) · [Configuración](configuration.md) · [Solución de problemas](troubleshooting.md)

Instala el servidor, protege los tokens y comprueba tu primera conexión.

<a id="getting-started"></a>

Esta guía te lleva de cero a un servidor Darktrace MCP funcionando en tu cliente. Son unos diez minutos.

<a id="before-you-start"></a>

## Antes de empezar

Necesitas:

| Elemento | Dónde conseguirlo |
|---|---|
| Dirección del appliance Darktrace | Por ejemplo `https://<tu-appliance>`. Solo HTTPS |
| Token de API público y token de API privado | Darktrace Threat Visualizer: **System Config → Settings → API Token**. Pídeselo a tu administrador de Darktrace |
| Node.js 22 o posterior (npm y `npx` vienen incluidos) | [nodejs.org](https://nodejs.org) o tu gestor de paquetes |
| Aprobación para enviar datos de Darktrace a tu proveedor del modelo | Tu equipo de seguridad o cumplimiento |

Da al token solo los permisos de Darktrace que quieras que tenga el modelo. El servidor nunca puede hacer más de lo que el token permite.

<a id="step-1-install-and-run-the-wizard"></a>

## Paso 1. Instalar y lanzar el asistente

<a id="macos-linux-and-windows"></a>

### macOS, Linux y Windows

```sh
npx -y @nuoframework/darktrace-mcp@1.1.2 setup
```

`npx` descarga la versión publicada exacta `1.1.2` (npm comprueba su integridad) y lanza el asistente (paso 2). Como la caché de `npx` es temporal, el asistente copia primero el paquete y sus tres dependencias fijadas a un directorio estable y registra esa ruta absoluta en tus clientes:

| Sistema | Copia fija |
|---|---|
| macOS, Linux | `~/.local/share/darktrace-mcp/1.1.2/` (o `$XDG_DATA_HOME/darktrace-mcp/1.1.2/`) |
| Windows | `%LOCALAPPDATA%\darktrace-mcp\1.1.2\` |

Los clientes arrancan el servidor como `/ruta/absoluta/a/node …/node_modules/@nuoframework/darktrace-mcp/dist/src/index.js`; nunca ejecutan `npx` ni vuelven a necesitar el registro. Repetir el comando reutiliza la copia.

Si quieres un comando `darktrace-mcp` en tu `PATH` (opcional), instálalo globalmente con la misma versión fijada:

```sh
npm install -g @nuoframework/darktrace-mcp@1.1.2
```

Si no, donde esta guía diga `darktrace-mcp …`, ejecuta `npx -y @nuoframework/darktrace-mcp@1.1.2 …`.

### Windows

El mismo comando `npx` funciona en PowerShell. Windows nativo no puede garantizar archivos de token legibles solo por su dueño, así que el servidor los rechaza; el asistente pide consentimiento explícito antes de escribir los valores de los tokens en la configuración de los clientes. Prefiere la [extensión de Claude Desktop](clients.md#claude-desktop), [Docker](docker.md) o WSL con el comando de Linux. Consulta [solución de problemas](troubleshooting.md#permisos-de-los-archivos-de-token).

<a id="fallback-build-from-source"></a>

### Alternativa: compilar desde el código fuente

```sh
curl -fsSLO https://raw.githubusercontent.com/nuoframework/darktrace-mcp/main/scripts/install.sh
less install.sh
sh install.sh
```

El script clona este repositorio en `~/.local/share/darktrace-mcp/source`, ejecuta `npm ci --ignore-scripts` y `npm run build`, y lanza el asistente. Windows: `scripts/install.ps1`. Equivalente manual:

```sh
git clone https://github.com/nuoframework/darktrace-mcp.git
cd darktrace-mcp
npm ci --ignore-scripts
npm run build
node dist/src/index.js setup
```

<a id="step-2-run-the-setup-wizard"></a>

## Paso 2. Ejecutar el asistente

```sh
darktrace-mcp setup
```

El asistente te pregunta:

| Pregunta | Qué responder |
|---|---|
| URL del appliance | Dirección `https://` de tu appliance |
| Token público | Se escribe sin mostrarse |
| Token privado | Se escribe sin mostrarse |
| Permisos | `read` (recomendado para empezar), `read,sensitive`, `read,write` o `all`. `all` solo arranca con `DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE=true` en la entrada del cliente ([por qué](configuration.md#perfiles)) |
| Clientes a configurar | Muestra los clientes que encuentra en tu equipo |

Después:

- guarda cada token en su propio archivo en `~/.config/darktrace-mcp/`, con permisos `0600` (solo tú puedes leerlo);
- hace una copia de seguridad de cada archivo de configuración antes de modificarlo;
- añade una entrada `darktrace` en cada cliente que elegiste.

Reinicia tu cliente al terminar.

<a id="step-3-check-the-setup"></a>

## Paso 3. Comprobar la instalación

```sh
darktrace-mcp --check-config
darktrace-mcp test
```

| Comando | ¿Usa red? | Qué comprueba |
|---|---|---|
| `--check-config` (o `doctor`) | No | Formato de la URL, que los archivos de token existen con permisos seguros, perfiles válidos |
| `test` | Sí, un `GET /status` | Que los tokens funcionan, el reloj está sincronizado y TLS es de confianza |

Si algo falla, consulta [solución de problemas](troubleshooting.md).

<a id="step-4-try-it-in-your-client"></a>

## Paso 4. Probarlo en tu cliente

Pídele a tu asistente, por ejemplo:

- "Muestra el estado del sistema Darktrace."
- "Lista los model breaches de las últimas 24 horas con puntuación mayor que 0,8."
- "¿Qué incidentes de AI Analyst están abiertos ahora?"

Con el perfil `write` también puedes pedir "Reconoce el model breach 1234". Pruébalo primero con `dryRun:true` para ver una vista previa.

<a id="change-permissions-later"></a>

## Cambiar permisos más tarde

Vuelve a ejecutar el asistente, o edita `DARKTRACE_PROFILES` en la configuración de tu cliente:

```sh
darktrace-mcp setup
```

Los perfiles se explican en [configuración](configuration.md#perfiles).

<a id="remove"></a>

## Desinstalar

```sh
darktrace-mcp remove
```

Quita la entrada `darktrace` de los clientes que configuró el asistente. Borra tú mismo los archivos de token de `~/.config/darktrace-mcp/` si ya no los necesitas, y revoca los tokens en Darktrace.

<a id="other-ways-to-install"></a>

## Otras formas de instalar

| Método | Guía |
|---|---|
| Extensión de Claude Desktop (`.mcpb`, desde la release de GitHub) | [Clientes: Claude Desktop](clients.md#claude-desktop) |
| Imagen Docker `ghcr.io/nuoframework/darktrace-mcp` | [Guía de Docker](docker.md) y [Clientes: Docker](clients.md#docker) |
| Una línea por cliente | [Clientes: una línea por cliente](clients.md#una-línea-por-cliente) |
| Configuración manual de un cliente | [Clientes](clients.md) |
| Archivos de la release (`.tgz`, `.mcpb`, `SHA256SUMS`) | [Releases](releases.md) |

<a id="native-install-and-openssl"></a>

## Instalación nativa y OpenSSL

La imagen Docker incluye OpenSSL 3.5.9. Algunas versiones oficiales de Node.js todavía traen OpenSSL 3.5.8, que tiene un fallo conocido de TLS. En una instalación nativa, comprueba tu versión:

```sh
node -p 'process.versions.openssl'
```

Usa un entorno con OpenSSL 3.5.9 o posterior, o usa Docker. Detalles: [resumen de seguridad](security.md).
