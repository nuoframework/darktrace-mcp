# Configurar clientes

**Español** · [English](en/clients.md)

[README](../README.md) · [Primeros pasos](getting-started.md) · [Configuración](configuration.md) · [Solución de problemas](troubleshooting.md)

Configura cada cliente MCP automáticamente o con rutas y archivos explícitos.

<a id="client-setup"></a>

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

<a id="rules-for-every-manual-snippet"></a>

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

Ejecuta el segundo comando dentro de la carpeta `darktrace-mcp`. Tras el arranque con `npx`, la entrada es `~/.local/share/darktrace-mcp/1.1.2/node_modules/@nuoframework/darktrace-mcp/dist/src/index.js`.

<a id="one-line-install-per-client"></a>

## Una línea por cliente

`darktrace-mcp setup` ejecuta estos comandos por ti. Para lanzarlos tú mismo, usa tu ruta absoluta de Node (`node -p process.execPath`), la ruta de entrada anterior y los archivos de token que creó el asistente en `~/.config/darktrace-mcp/`.

| Cliente | Comando |
|---|---|
| Claude Code | `claude mcp add --scope user --env DARKTRACE_URL='https://<tu-appliance>' --env DARKTRACE_PUBLIC_TOKEN_FILE=/abs/public-token --env DARKTRACE_PRIVATE_TOKEN_FILE=/abs/private-token --env DARKTRACE_PROFILES=read --transport stdio darktrace -- /abs/node /abs/index.js` |
| Codex | `codex mcp add darktrace --env DARKTRACE_URL='https://<tu-appliance>' --env DARKTRACE_PUBLIC_TOKEN_FILE=/abs/public-token --env DARKTRACE_PRIVATE_TOKEN_FILE=/abs/private-token --env DARKTRACE_PROFILES=read -- /abs/node /abs/index.js` |
| Claude Code (plugin) | `claude plugin marketplace add nuoframework/darktrace-mcp` y después `claude plugin install darktrace-mcp@darktrace-mcp`; Claude Code pide la URL, los tokens y el perfil ([guía del plugin](plugin-distribution.md)) |
| Codex (plugin) | `codex plugin marketplace add nuoframework/darktrace-mcp` y después `codex plugin add darktrace-mcp@darktrace-mcp`; carga la skill, pero la conexión sigue saliendo de `darktrace-mcp setup` ([guía del plugin](plugin-distribution.md#install-from-the-repository-marketplace)) |
| VS Code | `code --add-mcp '{"name":"darktrace","type":"stdio","command":"/abs/node","args":["/abs/index.js"],"env":{…}}'`; `darktrace-mcp config vscode` lo imprime relleno, más un enlace `vscode:mcp/install` cuyas entradas de contraseña guardan los tokens en el almacén secreto de VS Code |
| Cursor | `darktrace-mcp config cursor` imprime un enlace `cursor://anysphere.cursor-deeplink/mcp/install?…` |
| Gemini CLI | `gemini mcp add --scope user -e DARKTRACE_URL='https://<tu-appliance>' -e DARKTRACE_PUBLIC_TOKEN_FILE=/abs/public-token -e DARKTRACE_PRIVATE_TOKEN_FILE=/abs/private-token -e DARKTRACE_PROFILES=read darktrace /abs/node /abs/index.js` |
| Claude Desktop | `.mcpb` de la release (abajo) |
| Windsurf, OpenCode | Fragmentos JSON de abajo (sin CLI) |

Usa rutas absolutas en la configuración manual del cliente; el asistente las escribe automáticamente. El plugin Claude Code también evita el registro al arrancar: instala la versión 1.1.2 desde su bloqueo y ejecuta `node` sobre la entrada instalada. La copia Codex usa `npx -y @nuoframework/darktrace-mcp@1.1.2`, porque ese cliente no instala desde bloqueo. Los [botones de instalación](install.md#qué-hace-el-botón) son otra excepción explícita con versión fijada.

## Claude Desktop

**Automática.** Ejecuta `darktrace-mcp setup` o instala la extensión: descarga `darktrace-mcp-1.1.2.mcpb` de la [release v1.1.2](https://github.com/nuoframework/darktrace-mcp/releases/tag/v1.1.2) (o constrúyela desde un checkout con `npm run pack:mcpb`) y haz doble clic. Claude Desktop pide la URL, los tokens y el perfil, y guarda los tokens en el llavero del sistema.

**Manual.** Settings → Developer → Edit Config. Añade esto dentro de `mcpServers`, sin borrar tus otros servidores:

```json
{
  "mcpServers": {
    "darktrace": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/darktrace-mcp/dist/src/index.js"],
      "env": {
        "DARKTRACE_URL": "https://<tu-appliance>",
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

**Plugin.** El repositorio es un marketplace de plugins. El plugin instala el paquete npm fijado a `1.1.2` desde su archivo de bloqueo y lo arranca con Node, añade la skill `darktrace-investigation` y, al activarlo, pide la URL del appliance, los dos tokens (guardados en el almacén de credenciales del sistema) y el perfil; el perfil se cambia después en `/config`. También funciona en sesiones de Cowork en tu máquina, pero no en el chat de claude.ai. Detalles, ficha en el Claude Directory y limitaciones: [distribución del plugin ](plugin-distribution.md).

```sh
claude plugin marketplace add nuoframework/darktrace-mcp
claude plugin install darktrace-mcp@darktrace-mcp
```

**Manual.**

```sh
claude mcp add --scope user \
  --env DARKTRACE_URL='https://<tu-appliance>' \
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

**Plugin.** `codex plugin marketplace add nuoframework/darktrace-mcp` y después `codex plugin add darktrace-mcp@darktrace-mcp` instala la skill `darktrace-investigation` y un servidor incluido. Codex no pide configuración y solo pasa a ese servidor las variables declaradas en el plugin, así que no puede llegar a tu appliance; configura la conexión con `darktrace-mcp setup` (abajo) y desactiva la copia incluida con `[plugins."darktrace-mcp@darktrace-mcp".mcp_servers.darktrace]` `enabled = false` en `~/.codex/config.toml`. Consulta [distribución del plugin ](plugin-distribution.md#install-from-the-repository-marketplace).

**Manual.** Añade a `~/.codex/config.toml`. La CLI de Codex y la extensión del IDE comparten este archivo.

```toml
[mcp_servers.darktrace]
command = "/absolute/path/to/node"
args = ["/absolute/path/to/darktrace-mcp/dist/src/index.js"]

[mcp_servers.darktrace.env]
DARKTRACE_URL = "https://<tu-appliance>"
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
        "DARKTRACE_URL": "https://<tu-appliance>",
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
        "DARKTRACE_URL": "https://<tu-appliance>",
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
        "DARKTRACE_URL": "https://<tu-appliance>",
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
        "DARKTRACE_URL": "https://<tu-appliance>",
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
  -e DARKTRACE_URL='https://<tu-appliance>' \
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
        "DARKTRACE_URL": "https://<tu-appliance>",
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

> Los adaptadores adicionales siguientes corresponden a la [PR #18](https://github.com/nuoframework/darktrace-mcp/pull/18), pendiente de publicación. Sus identificadores no están en el asistente npm 1.1.2: usa los fragmentos manuales hasta que se publique una versión que los incluya. Rutas y fuentes de fabricantes: [matriz de instalación](install-matrix.md).

## Zed

**Automática (1.1.3).** `darktrace-mcp setup --client zed`. `settings.json` de Zed es JSONC; si contiene comentarios, el asistente muestra el fragmento en lugar de reescribirlo.

**Manual.** Añade a `~/.config/zed/settings.json` (o Settings → AI → MCP Servers → Add Local Server):

```json
{
  "context_servers": {
    "darktrace": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/darktrace-mcp/dist/src/index.js"],
      "env": {
        "DARKTRACE_URL": "https://<tu-appliance>",
        "DARKTRACE_PUBLIC_TOKEN_FILE": "/absolute/private/darktrace/public-token",
        "DARKTRACE_PRIVATE_TOKEN_FILE": "/absolute/private/darktrace/private-token",
        "DARKTRACE_PROFILES": "read"
      }
    }
  }
}
```

Comprueba que aparece en Settings → AI → MCP Servers.

## Cline

**Automática (1.1.3).** `darktrace-mcp setup --client cline` escribe `cline_mcp_settings.json` en el almacenamiento VS Code de Cline (consulta la matriz de instalación). Cline lo vuelve a cargar al cambiar.

**Manual.** Panel Cline → MCP Servers → Configure → Configure MCP Servers; añade bajo `mcpServers`:

```json
{
  "mcpServers": {
    "darktrace": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/darktrace-mcp/dist/src/index.js"],
      "env": {
        "DARKTRACE_URL": "https://<tu-appliance>",
        "DARKTRACE_PUBLIC_TOKEN_FILE": "/absolute/private/darktrace/public-token",
        "DARKTRACE_PRIVATE_TOKEN_FILE": "/absolute/private/darktrace/private-token",
        "DARKTRACE_PROFILES": "read"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

Mantén `autoApprove` vacío para que Cline pregunte antes de cada llamada. Su CLI usa `~/.cline/data/settings/cline_mcp_settings.json` con la misma estructura.

## Roo Code

**Automática (1.1.3).** `darktrace-mcp setup --client roo` escribe `mcp_settings.json` global (consulta la matriz).

**Manual.** Roo Code → MCP Servers → Edit Global MCP; añade bajo `mcpServers`:

```json
{
  "mcpServers": {
    "darktrace": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/darktrace-mcp/dist/src/index.js"],
      "env": {
        "DARKTRACE_URL": "https://<tu-appliance>",
        "DARKTRACE_PUBLIC_TOKEN_FILE": "/absolute/private/darktrace/public-token",
        "DARKTRACE_PRIVATE_TOKEN_FILE": "/absolute/private/darktrace/private-token",
        "DARKTRACE_PROFILES": "read"
      },
      "alwaysAllow": [],
      "disabled": false
    }
  }
}
```

El `.roo/mcp.json` de proyecto sustituye la entrada global; revísalo como cualquier archivo de proyecto.

## Continue

**Automática (1.1.3).** `darktrace-mcp setup --client continue` inserta un elemento delimitado por marcadores al principio de `mcpServers` en `~/.continue/config.yaml` (Windows `%USERPROFILE%\.continue\config.yaml`) sin tocar el resto. Si ya existe `darktrace` o `mcpServers` no es una lista simple, muestra el fragmento para pegar.

**Manual.** Añade a `config.yaml`:

```yaml
mcpServers:
  - name: darktrace
    type: stdio
    command: /absolute/path/to/node
    args:
      - /absolute/path/to/darktrace-mcp/dist/src/index.js
    env:
      DARKTRACE_URL: https://<tu-appliance>
      DARKTRACE_PUBLIC_TOKEN_FILE: /absolute/private/darktrace/public-token
      DARKTRACE_PRIVATE_TOKEN_FILE: /absolute/private/darktrace/private-token
      DARKTRACE_PROFILES: read
```

Las herramientas MCP están disponibles en el modo agente de Continue. Compruébalo con el icono de herramientas del chat.

## Kiro

**Automática (1.1.3).** `darktrace-mcp setup --client kiro` escribe `~/.kiro/settings/mcp.json`. `darktrace-mcp config kiro` también muestra un enlace `https://kiro.dev/launch/mcp/add?…`; Kiro pide confirmación antes de escribir.

**Manual.** Añade a `~/.kiro/settings/mcp.json`:

```json
{
  "mcpServers": {
    "darktrace": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/darktrace-mcp/dist/src/index.js"],
      "env": {
        "DARKTRACE_URL": "https://<tu-appliance>",
        "DARKTRACE_PUBLIC_TOKEN_FILE": "/absolute/private/darktrace/public-token",
        "DARKTRACE_PRIVATE_TOKEN_FILE": "/absolute/private/darktrace/private-token",
        "DARKTRACE_PROFILES": "read"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

Kiro carga el archivo al guardarlo; el servidor aparece en MCP Servers.

## Amp

**Automática (1.1.3).** `darktrace-mcp setup --client amp` escribe `~/.config/amp/settings.json` (usa la variante `.jsonc` si es la única; nunca reescribe comentarios).

**Manual.** Añade a `~/.config/amp/settings.json`:

```json
{
  "amp.mcpServers": {
    "darktrace": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/darktrace-mcp/dist/src/index.js"],
      "env": {
        "DARKTRACE_URL": "https://<tu-appliance>",
        "DARKTRACE_PUBLIC_TOKEN_FILE": "/absolute/private/darktrace/public-token",
        "DARKTRACE_PRIVATE_TOKEN_FILE": "/absolute/private/darktrace/private-token",
        "DARKTRACE_PROFILES": "read"
      }
    }
  }
}
```

Comprueba con `amp mcp list`.

## GitHub Copilot CLI

**Automática (1.1.3).** `darktrace-mcp setup --client copilot-cli` escribe `~/.copilot/mcp-config.json` (respeta `COPILOT_HOME`).

**Manual.** Usa `/mcp add` dentro de Copilot CLI o añade a `~/.copilot/mcp-config.json`:

```json
{
  "mcpServers": {
    "darktrace": {
      "type": "local",
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/darktrace-mcp/dist/src/index.js"],
      "env": {
        "DARKTRACE_URL": "https://<tu-appliance>",
        "DARKTRACE_PUBLIC_TOKEN_FILE": "/absolute/private/darktrace/public-token",
        "DARKTRACE_PRIVATE_TOKEN_FILE": "/absolute/private/darktrace/private-token",
        "DARKTRACE_PROFILES": "read"
      },
      "tools": ["*"]
    }
  }
}
```

Copilot CLI solo pasa las variables de `env` y `PATH` al servidor. Comprueba con `/mcp` en una sesión.

## Warp

**Automática (1.1.3).** `darktrace-mcp setup --client warp` escribe `~/.warp/.mcp.json`.

**Manual.** Settings → Agents → MCP servers → añade un servidor CLI y pega; o añade a `~/.warp/.mcp.json`:

```json
{
  "mcpServers": {
    "darktrace": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/darktrace-mcp/dist/src/index.js"],
      "env": {
        "DARKTRACE_URL": "https://<tu-appliance>",
        "DARKTRACE_PUBLIC_TOKEN_FILE": "/absolute/private/darktrace/public-token",
        "DARKTRACE_PRIVATE_TOKEN_FILE": "/absolute/private/darktrace/private-token",
        "DARKTRACE_PROFILES": "read"
      }
    }
  }
}
```

Arranca el servidor desde esa misma página de ajustes.

## Goose

**Automática (1.1.3).** `darktrace-mcp setup --client goose` inserta `darktrace` delimitado por marcadores bajo `extensions` en `~/.config/goose/config.yaml` (Windows `%APPDATA%\Block\goose\config\config.yaml`) sin tocar el resto. No reescribe una entrada `darktrace` existente ajena al asistente: muestra el fragmento.

**Manual.** `goose configure` → Add Extension → Command-line Extension, o añade bajo `extensions:`:

```yaml
extensions:
  darktrace:
    type: stdio
    name: darktrace
    enabled: true
    cmd: /absolute/path/to/node
    args: ["/absolute/path/to/darktrace-mcp/dist/src/index.js"]
    timeout: 300
    envs:
      DARKTRACE_URL: https://<tu-appliance>
      DARKTRACE_PUBLIC_TOKEN_FILE: /absolute/private/darktrace/public-token
      DARKTRACE_PRIVATE_TOKEN_FILE: /absolute/private/darktrace/private-token
      DARKTRACE_PROFILES: read
    env_keys: []
```

Los enlaces `goose://extension` solo aceptan `npx`, `uvx`, `jbang`, `goosed` o `docker` como comando; el asistente no genera uno para su ruta absoluta de Node.

## LM Studio

**Automática (1.1.3).** `darktrace-mcp setup --client lmstudio` escribe `~/.lmstudio/mcp.json`. `darktrace-mcp config lmstudio` también muestra un enlace `lmstudio://add_mcp?…` (LM Studio 0.3.17 o posterior).

**Manual.** Program → Install → Edit mcp.json; añade bajo `mcpServers` (notación Cursor):

```json
{
  "mcpServers": {
    "darktrace": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/darktrace-mcp/dist/src/index.js"],
      "env": {
        "DARKTRACE_URL": "https://<tu-appliance>",
        "DARKTRACE_PUBLIC_TOKEN_FILE": "/absolute/private/darktrace/public-token",
        "DARKTRACE_PRIVATE_TOKEN_FILE": "/absolute/private/darktrace/private-token",
        "DARKTRACE_PROFILES": "read"
      }
    }
  }
}
```

Guardar el archivo carga el servidor. Los modelos locales pueden tener ventanas de contexto menores; conserva el perfil `read`.

## Antigravity

**Automática (1.1.3).** `darktrace-mcp setup --client antigravity` escribe `~/.gemini/config/mcp_config.json`.

**Manual.** Agent panel → … → MCP Servers → Manage MCP Servers → View raw config; añade:

```json
{
  "mcpServers": {
    "darktrace": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/darktrace-mcp/dist/src/index.js"],
      "env": {
        "DARKTRACE_URL": "https://<tu-appliance>",
        "DARKTRACE_PUBLIC_TOKEN_FILE": "/absolute/private/darktrace/public-token",
        "DARKTRACE_PRIVATE_TOKEN_FILE": "/absolute/private/darktrace/private-token",
        "DARKTRACE_PROFILES": "read"
      }
    }
  }
}
```

Antigravity usa Ask por defecto; consérvalo para perfiles de escritura.

## JetBrains Junie

**Automática (1.1.3).** `darktrace-mcp setup --client junie` escribe `~/.junie/mcp/mcp.json`, compartido por plugin y CLI de Junie. También se lee `.junie/mcp/mcp.json` de proyecto.

**Manual.** Settings → Tools → Junie → MCP Settings → Add (abre el mismo archivo); añade:

```json
{
  "mcpServers": {
    "darktrace": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/darktrace-mcp/dist/src/index.js"],
      "env": {
        "DARKTRACE_URL": "https://<tu-appliance>",
        "DARKTRACE_PUBLIC_TOKEN_FILE": "/absolute/private/darktrace/public-token",
        "DARKTRACE_PRIVATE_TOKEN_FILE": "/absolute/private/darktrace/private-token",
        "DARKTRACE_PROFILES": "read"
      }
    }
  }
}
```

## JetBrains AI Assistant

JetBrains no documenta un archivo de configuración de AI Assistant; el asistente muestra JSON para pegar.

**Pegar.** `darktrace-mcp config jetbrains`; después Settings | Tools | AI Assistant | Model Context Protocol (MCP) → Add → STDIO, pega el JSON (estructura de [Junie](#jetbrains-junie)) y Apply: arranca inmediatamente. Si `setup` ya configuró Claude Desktop en esa máquina, **Import from Claude** reutiliza su entrada.

## Docker

Sirve para cualquier cliente que acepte `command` + `args` (Claude Desktop, Cursor, Windsurf, Gemini CLI, VS Code). Con Docker instalado y en marcha, ejecuta el asistente y elige `2) docker`:

```sh
npx -y @nuoframework/darktrace-mcp@1.1.2 setup
```

El asistente comprueba que el daemon de Docker responde, propone `ghcr.io/nuoframework/darktrace-mcp:1.1.2` (la versión del paquete), ofrece descargarla si falta y escribe la entrada endurecida con el ID local de la imagen y `--pull=never`. Muestra el ID de la imagen y el digest del registro y guarda ambos en `~/.config/darktrace-mcp/setup.json`; compara el digest con las notas de la versión. Sin preguntas: `setup --yes --runtime docker --pull --url https://<tu-appliance> --tokens-from-stdin`. `--image` también acepta otra etiqueta, un digest `nombre@sha256:…` o un ID local `sha256:…`. `darktrace-mcp config <cliente>` reutiliza el ID guardado, y `darktrace-mcp test` ejecuta primero `--check-config` en el contenedor con los mismos montajes y usuario (sin red) y después comprueba el appliance desde el host. Detalles: [guía de Docker](docker.md#install).

**Manual.** Obtén el ID de la imagen (o usa el digest `nombre@sha256:…` anterior):

```sh
docker image inspect --format '{{.Id}}' ghcr.io/nuoframework/darktrace-mcp:1.1.2
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
        "-e", "DARKTRACE_URL=https://<tu-appliance>",
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

<a id="uninstall"></a>

## Desinstalar

```sh
darktrace-mcp uninstall
```

Muestra un plan y pregunta una vez (`--yes` omite la pregunta, `--dry-run` solo muestra el plan). Quita la entrada `darktrace` de todos los clientes (antes guarda una copia de cada archivo), borra los tokens guardados, `setup.json` y `~/.config/darktrace-mcp`, y borra las copias fijas de `~/.local/share/darktrace-mcp/<versión>/` (`--keep-copies` las conserva). Con el runtime Docker, `--docker` borra además el único ID de imagen que registró setup, nunca otras imágenes. Si el paquete está instalado globalmente, muestra el comando `npm uninstall -g @nuoframework/darktrace-mcp` para que lo ejecutes tú. Nunca toca enlaces simbólicos ni archivos desconocidos. `remove --all` es el mismo comando. Sin instalación global, ejecútalo como `npx -y @nuoframework/darktrace-mcp@1.1.2 uninstall`.

<a id="several-clients-one-setup"></a>

## Varios clientes, una configuración

Todos los clientes pueden compartir los mismos archivos de token y la misma URL. Solo cambia la configuración del cliente. Para cambiar los permisos de un cliente, edita `DARKTRACE_PROFILES` en su entrada.
