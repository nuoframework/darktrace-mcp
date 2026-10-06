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

Ejecuta el segundo comando dentro de la carpeta `darktrace-mcp`.

## Claude Desktop

**Automática.** Ejecuta `darktrace-mcp setup` o instala la extensión:

```sh
npm run pack:mcpb
```

Haz doble clic en el archivo `.mcpb` generado. Claude Desktop pide la URL, los tokens y el perfil, y guarda los tokens en el llavero del sistema.

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

Sirve para cualquier cliente que acepte `command` + `args` (Claude Desktop, Cursor, Windsurf, Gemini CLI, VS Code). Carga o construye la imagen primero ([guía de Docker](../docker.md), en inglés) y obtén su ID:

```sh
docker image inspect --format '{{.Id}}' darktrace-mcp:local
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
