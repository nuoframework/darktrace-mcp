[English](../clients.md) · **Español**

# Configurar clientes

[README](../../README.es.md) · [Primeros pasos](getting-started.md) · [Configuración](configuration.md) · [Solución de problemas](troubleshooting.md)

Cada cliente se puede configurar de dos formas:

- **Automática:** `darktrace-mcp setup` encuentra el cliente y escribe la entrada por ti (con copia de seguridad).
- **Manual:** `darktrace-mcp config <cliente>` muestra la configuración con tus rutas reales. Pégala en el archivo indicado abajo.

| Cliente | Nombre `<cliente>` | Archivo de configuración |
|---|---|---|
| [Claude Desktop](#claude-desktop) | `claude-desktop` | macOS `~/Library/Application Support/Claude/claude_desktop_config.json`, Windows `%APPDATA%\Claude\claude_desktop_config.json` |
| [Claude Code](#claude-code) | `claude-code` | `~/.claude.json` (con `claude mcp add`) |
| [Codex](#codex) | `codex` | `~/.codex/config.toml` |
| [Cursor](#cursor) | `cursor` | `~/.cursor/mcp.json` |
| [VS Code](#vs-code) | `vscode` | `mcp.json` de usuario (**MCP: Open User Configuration**) |
| [Windsurf](#windsurf) | `windsurf` | `~/.codeium/windsurf/mcp_config.json` |
| [OpenCode](#opencode) | `opencode` | `~/.config/opencode/opencode.json` |
| [Gemini CLI](#gemini-cli) | `gemini` | `~/.gemini/settings.json` |
| [Docker](#docker) | — | Cualquiera de los anteriores |

## Reglas para toda configuración manual

- Usa **rutas absolutas** para Node, para `dist/src/index.js` y para los archivos de token. La mayoría de clientes no expanden `~` ni `$HOME`.
- Pon en la configuración las **rutas** de los archivos de token, nunca los tokens.
- Los ejemplos usan el perfil por defecto `read`. Para permitir más, cambia `DARKTRACE_PROFILES` (consulta [perfiles](configuration.md#perfiles)).
- Reinicia el cliente después de editar su configuración.

Obtén tus rutas:

```sh
node -p 'process.execPath'
node -p 'require("node:path").resolve("dist/src/index.js")'
```

Ejecuta el segundo comando dentro de la carpeta `darktrace-mcp`. Tras el arranque con `npx`, la entrada es `~/.local/share/darktrace-mcp/1.1.1/node_modules/@nuoframework/darktrace-mcp/dist/src/index.js`.

## Una línea por cliente

`darktrace-mcp setup` ejecuta estos comandos por ti. Para lanzarlos tú mismo, usa tu ruta absoluta de Node (`node -p process.execPath`), la ruta de entrada anterior y los archivos de token que creó el asistente en `~/.config/darktrace-mcp/`.

| Cliente | Comando |
|---|---|
| Claude Code | `claude mcp add --scope user --env DARKTRACE_URL=https://… --env DARKTRACE_PUBLIC_TOKEN_FILE=/abs/public-token --env DARKTRACE_PRIVATE_TOKEN_FILE=/abs/private-token --env DARKTRACE_PROFILES=read --transport stdio darktrace -- /abs/node /abs/index.js` |
| Codex | `codex mcp add darktrace --env DARKTRACE_URL=https://… --env DARKTRACE_PUBLIC_TOKEN_FILE=/abs/public-token --env DARKTRACE_PRIVATE_TOKEN_FILE=/abs/private-token --env DARKTRACE_PROFILES=read -- /abs/node /abs/index.js` |
| VS Code | `code --add-mcp '{"name":"darktrace","type":"stdio","command":"/abs/node","args":["/abs/index.js"],"env":{…}}'`; `darktrace-mcp config vscode` lo imprime relleno, más un enlace `vscode:mcp/install` cuyas entradas de contraseña guardan los tokens en el almacén secreto de VS Code |
| Cursor | `darktrace-mcp config cursor` imprime un enlace `cursor://anysphere.cursor-deeplink/mcp/install?…` |
| Gemini CLI | `gemini mcp add --scope user -e DARKTRACE_URL=https://… -e DARKTRACE_PUBLIC_TOKEN_FILE=/abs/public-token -e DARKTRACE_PRIVATE_TOKEN_FILE=/abs/private-token -e DARKTRACE_PROFILES=read darktrace /abs/node /abs/index.js` |
| Claude Desktop | `.mcpb` de la release (abajo) |
| Windsurf, OpenCode | Fragmentos JSON de abajo (sin CLI) |

Nunca pongas `npx` en la configuración de un cliente: cada arranque dependería del registro y recogería código nuevo sin avisar. El asistente siempre escribe rutas absolutas.

## Claude Desktop

**Automática.** Ejecuta `darktrace-mcp setup` o instala la extensión: descarga `darktrace-mcp-1.1.1.mcpb` de la [release v1.1.1](https://github.com/nuoframework/darktrace-mcp/releases/tag/v1.1.1) (o constrúyela desde un checkout con `npm run pack:mcpb`) y haz doble clic. Claude Desktop pide la URL, los tokens y el perfil, y guarda los tokens en el llavero del sistema.

**Manual.** Settings → Developer → Edit Config. Añade esto dentro de `mcpServers`, sin borrar tus otros servidores:

```json
{
  "mcpServers": {
    "darktrace": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/darktrace-mcp/dist/src/index.js"],
      "env": {
        "DARKTRACE_URL": "https://darktrace.example.internal",
        "DARKTRACE_PUBLIC_TOKEN_FILE": "/absolute/private/darktrace/public-token",
        "DARKTRACE_PRIVATE_TOKEN_FILE": "/absolute/private/darktrace/private-token",
        "DARKTRACE_PROFILES": "read",
        "DARKTRACE_SENSITIVE_READ": "false"
      }
    }
  }
}
```

Cierra Claude Desktop por completo y vuelve a abrirlo.

## Claude Code

**Automática.** `darktrace-mcp setup` añade un servidor con ámbito de usuario.

**Manual.**

```sh
claude mcp add --scope user \
  --env DARKTRACE_URL=https://darktrace.example.internal \
  --env DARKTRACE_PUBLIC_TOKEN_FILE=/absolute/private/darktrace/public-token \
  --env DARKTRACE_PRIVATE_TOKEN_FILE=/absolute/private/darktrace/private-token \
  --env DARKTRACE_PROFILES=read \
  --transport stdio darktrace -- \
  /absolute/path/to/node /absolute/path/to/darktrace-mcp/dist/src/index.js
claude mcp get darktrace
```

Usa `/mcp` dentro de Claude Code para ver el servidor. Prefiere `--scope user`. Un `.mcp.json` de proyecto se ejecuta para todo el que confíe en el repositorio: úsalo solo después de revisar cada comando y variable.

**Aprobar acciones críticas.** Mantén el valor por defecto `DARKTRACE_CRITICAL_APPROVAL=elicitation`. Claude Code usa el protocolo 2026-07-28 y declara elicitación de formulario en cada petición (probado con Claude Code 2.1.289). Cuando Claude repite una llamada ya previsualizada con `confirm:true`, Claude Code muestra "MCP server "darktrace" requests your input" con la operación y los valores exactos, y las opciones **Accept** / **Decline**. No se envía nada si no eliges Accept. Consulta [aprobación humana](configuration.md#aprobación-humana).

- **Ejecuciones no interactivas** (`claude -p`, CI): no hay nadie a quien mostrar el diálogo, así que Claude Code responde "cancel". La acción se rechaza y no se reintenta. Para aprobar en automatización, responde al diálogo con un hook `Elicitation` que controles. El hook recibe el mensaje del servidor (operación y valores) y puede devolver accept o decline.
- **`DARKTRACE_CRITICAL_APPROVAL=host`**: úsalo solo si no puedes responder al diálogo, por ejemplo con un Claude Code antiguo que rechaza con `"approval":"unsupported"`. En ese caso el único control es el aviso de permisos por herramienta de Claude Code. Una regla de permitir (`--allowedTools`, "always allow") aprueba todas las llamadas críticas siguientes a esa herramienta sin enseñarte los valores.

## Codex

**Automática.** `darktrace-mcp setup`.

**Manual.** Añade a `~/.codex/config.toml`. La CLI de Codex y la extensión del IDE comparten este archivo.

```toml
[mcp_servers.darktrace]
command = "/absolute/path/to/node"
args = ["/absolute/path/to/darktrace-mcp/dist/src/index.js"]

[mcp_servers.darktrace.env]
DARKTRACE_URL = "https://darktrace.example.internal"
DARKTRACE_PUBLIC_TOKEN_FILE = "/absolute/private/darktrace/public-token"
DARKTRACE_PRIVATE_TOKEN_FILE = "/absolute/private/darktrace/private-token"
DARKTRACE_PROFILES = "read"
```

Compruébalo con `codex mcp list`.

## Cursor

**Automática.** `darktrace-mcp setup`, o genera un enlace de instalación de un clic:

```sh
darktrace-mcp config cursor
```

Abre el enlace `cursor://` que aparece y confirma en Cursor.

**Manual.** Añade a `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "darktrace": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/darktrace-mcp/dist/src/index.js"],
      "env": {
        "DARKTRACE_URL": "https://darktrace.example.internal",
        "DARKTRACE_PUBLIC_TOKEN_FILE": "/absolute/private/darktrace/public-token",
        "DARKTRACE_PRIVATE_TOKEN_FILE": "/absolute/private/darktrace/private-token",
        "DARKTRACE_PROFILES": "read",
        "DARKTRACE_SENSITIVE_READ": "false"
      }
    }
  }
}
```

Compruébalo en Cursor Settings → MCP.

## VS Code

**Automática.** `darktrace-mcp setup`, o genera un enlace de instalación de un clic:

```sh
darktrace-mcp config vscode
```

Abre el enlace que aparece y confirma en VS Code.

**Manual.** Ejecuta **MCP: Open User Configuration** y añade:

```json
{
  "servers": {
    "darktrace": {
      "type": "stdio",
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/darktrace-mcp/dist/src/index.js"],
      "env": {
        "DARKTRACE_URL": "https://darktrace.example.internal",
        "DARKTRACE_PUBLIC_TOKEN_FILE": "/absolute/private/darktrace/public-token",
        "DARKTRACE_PRIVATE_TOKEN_FILE": "/absolute/private/darktrace/private-token",
        "DARKTRACE_PROFILES": "read",
        "DARKTRACE_SENSITIVE_READ": "false"
      }
    }
  }
}
```

Usa **MCP: List Servers** para iniciarlo o revisarlo. Prefiere la configuración de usuario a un `.vscode/mcp.json` del espacio de trabajo.

## Windsurf

**Automática.** `darktrace-mcp setup`.

**Manual.** Añade a `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "darktrace": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/darktrace-mcp/dist/src/index.js"],
      "env": {
        "DARKTRACE_URL": "https://darktrace.example.internal",
        "DARKTRACE_PUBLIC_TOKEN_FILE": "/absolute/private/darktrace/public-token",
        "DARKTRACE_PRIVATE_TOKEN_FILE": "/absolute/private/darktrace/private-token",
        "DARKTRACE_PROFILES": "read",
        "DARKTRACE_SENSITIVE_READ": "false"
      }
    }
  }
}
```

Actualiza la lista de MCP en el panel Cascade de Windsurf.

## OpenCode

**Automática.** `darktrace-mcp setup`.

**Manual.** Añade a `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "darktrace": {
      "type": "local",
      "command": ["/absolute/path/to/node", "/absolute/path/to/darktrace-mcp/dist/src/index.js"],
      "enabled": true,
      "environment": {
        "DARKTRACE_URL": "https://darktrace.example.internal",
        "DARKTRACE_PUBLIC_TOKEN_FILE": "/absolute/private/darktrace/public-token",
        "DARKTRACE_PRIVATE_TOKEN_FILE": "/absolute/private/darktrace/private-token",
        "DARKTRACE_PROFILES": "read"
      }
    }
  }
}
```

## Gemini CLI

**Automática.** `darktrace-mcp setup`.

**Manual.** Usa la CLI:

```sh
gemini mcp add --scope user \
  -e DARKTRACE_URL=https://darktrace.example.internal \
  -e DARKTRACE_PUBLIC_TOKEN_FILE=/absolute/private/darktrace/public-token \
  -e DARKTRACE_PRIVATE_TOKEN_FILE=/absolute/private/darktrace/private-token \
  -e DARKTRACE_PROFILES=read \
  darktrace /absolute/path/to/node /absolute/path/to/darktrace-mcp/dist/src/index.js
gemini mcp list
```

o añade a `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "darktrace": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/darktrace-mcp/dist/src/index.js"],
      "env": {
        "DARKTRACE_URL": "https://darktrace.example.internal",
        "DARKTRACE_PUBLIC_TOKEN_FILE": "/absolute/private/darktrace/public-token",
        "DARKTRACE_PRIVATE_TOKEN_FILE": "/absolute/private/darktrace/private-token",
        "DARKTRACE_PROFILES": "read",
        "DARKTRACE_SENSITIVE_READ": "false"
      }
    }
  }
}
```

No pongas `"trust": true`: mantén la confirmación de Gemini en cada llamada.

## Docker

Sirve para cualquier cliente que acepte `command` + `args` (Claude Desktop, Cursor, Windsurf, Gemini CLI, VS Code). Descarga la imagen publicada ([guía de Docker](../docker.md), en inglés) y deja que el asistente escriba la entrada endurecida fijada a su digest:

```sh
docker pull ghcr.io/nuoframework/darktrace-mcp:1.1.1
docker image inspect --format '{{index .RepoDigests 0}}' ghcr.io/nuoframework/darktrace-mcp:1.1.1
npx -y @nuoframework/darktrace-mcp@1.1.1 setup --runtime docker --image ghcr.io/nuoframework/darktrace-mcp@sha256:<digest>
```

**Manual.** Obtén el ID de la imagen (o usa el digest `nombre@sha256:…` anterior):

```sh
docker image inspect --format '{{.Id}}' ghcr.io/nuoframework/darktrace-mcp:1.1.1
command -v docker
```

Sustituye el último argumento por ese ID `sha256:…` y `command` por la ruta completa de Docker:

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
        "-e", "DARKTRACE_URL=https://darktrace.example.internal",
        "-e", "DARKTRACE_PUBLIC_TOKEN_FILE=/run/secrets/public-token",
        "-e", "DARKTRACE_PRIVATE_TOKEN_FILE=/run/secrets/private-token",
        "-e", "DARKTRACE_PROFILES=read",
        "-e", "DARKTRACE_SENSITIVE_READ=false",
        "REPLACE_WITH_IMAGE_ID_FROM_DOCKER_INSPECT"
      ]
    }
  }
}
```

Los archivos de token deben pertenecer al UID 1000 (o cambia `--user` para que coincida con su dueño) y tener permisos `0600`. Mantén `-i` y nunca añadas `-t`. No publiques puertos ni uses `--network host`.

## Varios clientes, una configuración

Todos los clientes pueden compartir los mismos archivos de token y la misma URL. Solo cambia la configuración del cliente. Para cambiar los permisos de un cliente, edita `DARKTRACE_PROFILES` en su entrada.
