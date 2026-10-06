# Instalar

**Español** · [English](en/install.md)

[README](../README.md) · [Clientes](clients.md) · [Matriz de instalación](install-matrix.md) · [Primeros pasos](getting-started.md) · [Docker](docker.md) · [Problemas](troubleshooting.md)

Instala el servidor con un comando y elige la vía adecuada para tu cliente.

> **Alcance por versión.** 1.1.2 incluye los ocho clientes originales, `uninstall` y el asistente Docker. Los 13 adaptadores adicionales, `darktrace_setup_status` y la nueva ruta Windsurf están **disponibles en `main` y llegan en 1.1.3**. No están en npm 1.1.2: usa los fragmentos manuales para esos clientes.

Un comando inicia el proceso. Pide los datos, comprueba el appliance con una petición firmada, guarda tokens en archivos privados y configura los clientes detectados:

```sh
npx -y @nuoframework/darktrace-mcp@1.1.2 setup
```

Reinicia el cliente y pide: **«lista mis dispositivos Darktrace»**.

Necesitas Node.js 22+, la dirección `https://<tu-appliance>` y el par de tokens API (Darktrace: **System Config → Settings → API Token**). No se escriben ajustes, tokens ni entradas de cliente antes de superar la comprobación del appliance; `--dry-run` muestra el plan sin escribir.

## Elige tu cliente

Cada fila indica la vía más corta. `darktrace-mcp` equivale a `npx -y @nuoframework/darktrace-mcp@1.1.2` salvo instalación global; los identificadores nuevos necesitan la versión futura indicada arriba. `config <cliente>` muestra el fragmento con tus rutas reales y sin secretos.

| Cliente | Vía más corta | Dónde se guarda |
|---|---|---|
| **Claude Desktop** | `setup --client claude-desktop`, o abre el `.mcpb` de la [release](https://github.com/nuoframework/darktrace-mcp/releases) (tokens al llavero) | `claude_desktop_config.json` ([detalles](clients.md#claude-desktop)) |
| **Claude Code** | `setup --client claude-code` (ejecuta `claude mcp add --scope user …`), o el [plugin](plugin-distribution.md) | `~/.claude.json` ([detalles](clients.md#claude-code)) |
| **Codex CLI / aplicación** | `setup --client codex` (ejecuta `codex mcp add …` o edita el archivo) | `~/.codex/config.toml` ([detalles](clients.md#codex)) |
| **Cursor** | Botón del [README](../README.md#instalación-en-1-minuto), después `setup`; o `setup --client cursor` | `~/.cursor/mcp.json` ([detalles](clients.md#cursor)) |
| **VS Code (modo agente Copilot)** | Botón de VS Code (pide dirección y tokens y los guarda en su almacén secreto); o `setup --client vscode` | `mcp.json` de usuario ([detalles](clients.md#vs-code)) |
| **VS Code Insiders** | Botón Insiders, con las mismas preguntas | `mcp.json` de usuario |
| **Windsurf (Devin Desktop)** | `setup --client windsurf` | Próxima ruta `~/.config/devin/mcp_config.json`; ruta anterior en 1.1.2 ([detalles](clients.md#windsurf)) |
| **OpenCode** | `setup --client opencode` | `~/.config/opencode/opencode.json` ([detalles](clients.md#opencode)) |
| **Gemini CLI** | `setup --client gemini` | `~/.gemini/settings.json` ([detalles](clients.md#gemini-cli)) |
| **Zed** (1.1.3) | `setup --client zed` (si hay comentarios, muestra un fragmento para pegar) | `~/.config/zed/settings.json` → `context_servers` ([detalles](clients.md#zed)) |
| **Cline** (1.1.3) | `setup --client cline` | `cline_mcp_settings.json` del almacenamiento VS Code ([detalles](clients.md#cline)) |
| **Roo Code** (1.1.3) | `setup --client roo` | `mcp_settings.json` del almacenamiento VS Code ([detalles](clients.md#roo-code)) |
| **Continue** (1.1.3) | `setup --client continue` (añade un elemento marcado a `mcpServers`) | `~/.continue/config.yaml` ([detalles](clients.md#continue)) |
| **Kiro** (1.1.3) | `setup --client kiro`; `config kiro` muestra también un enlace `kiro.dev/launch` | `~/.kiro/settings/mcp.json` ([detalles](clients.md#kiro)) |
| **Amp** (1.1.3) | `setup --client amp` | `~/.config/amp/settings.json` → `amp.mcpServers` ([detalles](clients.md#amp)) |
| **GitHub Copilot CLI** (1.1.3) | `setup --client copilot-cli` | `~/.copilot/mcp-config.json` ([detalles](clients.md#github-copilot-cli)) |
| **Warp** (1.1.3) | `setup --client warp` | `~/.warp/.mcp.json` ([detalles](clients.md#warp)) |
| **Goose** (1.1.3) | `setup --client goose` (añade una entrada marcada a `extensions`) | `~/.config/goose/config.yaml` ([detalles](clients.md#goose)) |
| **LM Studio** (1.1.3) | `setup --client lmstudio`; `config lmstudio` muestra `lmstudio://add_mcp` | `~/.lmstudio/mcp.json` ([detalles](clients.md#lm-studio)) |
| **Antigravity** (1.1.3) | `setup --client antigravity` | `~/.gemini/config/mcp_config.json` ([detalles](clients.md#antigravity)) |
| **JetBrains Junie** (1.1.3) | `setup --client junie` | `~/.junie/mcp/mcp.json` ([detalles](clients.md#jetbrains-junie)) |
| **JetBrains AI Assistant** (1.1.3) | `config jetbrains`, pega en Settings \| Tools \| AI Assistant \| MCP \| Add (o «Import from Claude» tras configurar Desktop) | Sin archivo documentado ([detalles](clients.md#jetbrains-ai-assistant)) |

Varios clientes: `setup` lista los detectados y los preselecciona en la nueva presentación; `setup --client all` configura los que tienen archivo. Comparten los mismos archivos de token.

El asistente usa `npx` solo al instalar; los clientes arrancan rutas absolutas o una imagen local fijada con `--pull=never`. Los botones y el plugin tienen sus propios métodos de arranque.

## Qué hace el botón

Un botón del README no conoce tus rutas ni tokens: añade `darktrace` con la versión npm fijada, `npx`, perfil `read` y nada más. En `main`, para 1.1.3, un servidor sin conexión expone solo `darktrace_setup_status`, que indica qué falta y el comando:

```sh
npx -y @nuoframework/darktrace-mcp@1.1.2 setup --client cursor
```

Con el botón Cursor que instala la versión 1.1.2, ejecuta `setup` antes de arrancar: esa versión no incluye el modo de configuración. El asistente reescribe la entrada con Node absoluto, copia fija y archivos de token; las herramientas aparecen tras reiniciar. Los botones VS Code piden dirección y tokens en el propio cliente y funcionan sin `setup`. Los botones con versión fijada son excepciones explícitas de arranque inicial. Las entradas normales del asistente usan rutas absolutas para evitar depender del registro en cada arranque. Si se borra la caché npm, una entrada creada por botón vuelve a necesitar el registro.

## Fijar la versión

Omitir la versión en `npx -y @nuoframework/darktrace-mcp setup` descarga la última publicada; consulta el [estado por canal](releases.md#release-status-2026-10-06) antes de instalar. Fija siempre una versión exacta para reproducir los mismos bytes entre máquinas, en scripts, botones y entradas de cliente. El asistente nunca escribe `npx` en la configuración.

La versión de los botones procede de `package.json`: después de compilar, `node scripts/install-badges.mjs --write` actualiza las filas de ambos README al cambiar la versión. La prueba correspondiente detecta cualquier desajuste.

## Otras vías

- **Docker.** `setup --runtime docker` comprueba el daemon, propone `ghcr.io/nuoframework/darktrace-mcp:1.1.2`, descarga con permiso y escribe una entrada protegida con ID inmutable y `--pull=never`. [Guía](docker.md#install).
- **Extensión Claude Desktop.** `darktrace-mcp-1.1.2.mcpb` de GitHub Release o `npm run pack:mcpb` desde el checkout. [Detalles](clients.md#claude-desktop).
- **Plugin y marketplace Codex.** Consulta la [guía de instalación y distribución](plugin-distribution.md).
- **Manual.** `darktrace-mcp config <cliente>` muestra rutas reales; [Clientes](clients.md) detalla archivos y formatos.
- **Desde fuentes.** [Alternativa](getting-started.md#fallback-build-from-source).

## Windows

Windows nativo no permite demostrar que un token sea privado mediante la API de archivos de Node; el servidor rechaza esos archivos. Alternativas nativas sin ese compromiso: `.mcpb` de Claude Desktop (llavero), botón VS Code o enlace `config vscode` (almacén secreto), Docker Desktop, o WSL con el comando Linux. En otros clientes, `setup --inline-tokens-windows` escribe los valores en su configuración solo tras aceptación explícita. [Análisis y seguimiento](install-matrix.md#windows-native).

## Comprobar y desinstalar

```sh
npx -y @nuoframework/darktrace-mcp@1.1.2 test
npx -y @nuoframework/darktrace-mcp@1.1.2 uninstall
```

`test` hace un `GET /status` firmado e indica qué corregir. `uninstall` muestra un plan, pregunta una vez y borra entradas `darktrace` de los clientes admitidos por la versión instalada (con copias de seguridad), tokens y copias fijas. [Solución de problemas](troubleshooting.md).

El asistente usa ámbito de usuario. Antes de confiar en un archivo `.mcp.json` de proyecto, revisa sus comandos y variables: se ejecutan para quienes confían en ese repositorio.
