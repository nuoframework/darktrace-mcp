[English](../getting-started.md) · **Español**

# Primeros pasos

[README](../../README.es.md) · [Clientes](clients.md) · [Configuración](configuration.md) · [Solución de problemas](troubleshooting.md)

Esta guía te lleva de cero a un servidor Darktrace MCP funcionando en tu cliente. Son unos diez minutos.

## Antes de empezar

Necesitas:

| Elemento | Dónde conseguirlo |
|---|---|
| Dirección del appliance Darktrace | Por ejemplo `https://darktrace.example.internal`. Solo HTTPS |
| Token de API público y token de API privado | Darktrace Threat Visualizer: **System Config → Settings → API Token**. Pídeselo a tu administrador de Darktrace |
| GitHub CLI (`gh`) con acceso a `nuoframework/darktrace-mcp` | `gh auth login` |
| Node.js 22 o posterior, npm, git | [nodejs.org](https://nodejs.org) o tu gestor de paquetes |
| Aprobación para enviar datos de Darktrace a tu proveedor del modelo | Tu equipo de seguridad o cumplimiento |

Da al token solo los permisos de Darktrace que quieras que tenga el modelo. El servidor nunca puede hacer más de lo que el token permite.

## Paso 1. Instalar

### macOS y Linux

Descarga el instalador, léelo y ejecútalo:

```sh
gh auth login
gh api -H 'Accept: application/vnd.github.raw' \
  repos/nuoframework/darktrace-mcp/contents/scripts/install.sh > install.sh
less install.sh
bash install.sh
```

El instalador:

1. Clona el repositorio privado con `gh`.
2. Ejecuta `npm ci --ignore-scripts` y `npm run build`.
3. Lanza el asistente de configuración (paso 2).

### Windows

```powershell
gh auth login
gh api -H "Accept: application/vnd.github.raw" repos/nuoframework/darktrace-mcp/contents/scripts/install.ps1 > install.ps1
Get-Content .\install.ps1
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

Si el servidor rechaza tus archivos de token en Windows nativo, ejecútalo dentro de WSL. Consulta [solución de problemas](troubleshooting.md#permisos-de-los-archivos-de-token).

### Instalación manual

```sh
gh repo clone nuoframework/darktrace-mcp
cd darktrace-mcp
npm ci --ignore-scripts
npm run build
node dist/src/index.js setup
```

Si `darktrace-mcp` no está en tu `PATH`, usa `node /ruta/absoluta/a/darktrace-mcp/dist/src/index.js` donde esta guía diga `darktrace-mcp`.

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
| Permisos | `read` (recomendado para empezar), `read,sensitive`, `read,write` o `all` |
| Clientes a configurar | Muestra los clientes que encuentra en tu equipo |

Después:

- guarda cada token en su propio archivo en `~/.config/darktrace-mcp/`, con permisos `0600` (solo tú puedes leerlo);
- hace una copia de seguridad de cada archivo de configuración antes de modificarlo;
- añade una entrada `darktrace` en cada cliente que elegiste.

Reinicia tu cliente al terminar.

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

## Paso 4. Probarlo en tu cliente

Pídele a tu asistente, por ejemplo:

- "Muestra el estado del sistema Darktrace."
- "Lista los model breaches de las últimas 24 horas con puntuación mayor que 0,8."
- "¿Qué incidentes de AI Analyst están abiertos ahora?"

Con el perfil `write` también puedes pedir "Reconoce el model breach 1234". Pruébalo primero con `dryRun:true` para ver una vista previa.

## Cambiar permisos más tarde

Vuelve a ejecutar el asistente, o edita `DARKTRACE_PROFILES` en la configuración de tu cliente:

```sh
darktrace-mcp setup
```

Los perfiles se explican en [configuración](configuration.md#perfiles).

## Desinstalar

```sh
darktrace-mcp remove
```

Quita la entrada `darktrace` de los clientes que configuró el asistente. Borra tú mismo los archivos de token de `~/.config/darktrace-mcp/` si ya no los necesitas, y revoca los tokens en Darktrace.

## Otras formas de instalar

| Método | Guía |
|---|---|
| Extensión de Claude Desktop (`.mcpb`) | [Clientes: Claude Desktop](clients.md#claude-desktop) |
| Docker | [Guía de Docker](../docker.md) (inglés) y [Clientes: Docker](clients.md#docker) |
| Configuración manual de un cliente | [Clientes](clients.md) |
| Archivo de release (`.tgz`) | [Releases](../releases.md) (inglés) |

## Instalación nativa y OpenSSL

La imagen Docker incluye OpenSSL 3.5.9. Algunas versiones oficiales de Node.js todavía traen OpenSSL 3.5.8, que tiene un fallo conocido de TLS. En una instalación nativa, comprueba tu versión:

```sh
node -p 'process.versions.openssl'
```

Usa un entorno con OpenSSL 3.5.9 o posterior, o usa Docker. Detalles: [resumen de seguridad](../security.md) (inglés).
