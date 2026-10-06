# Matriz de instalación

**Español** · [English](en/install-matrix.md)

[README](../README.md) · [Instalar](install.md) · [Clientes](clients.md) · [Primeros pasos](getting-started.md) · [Docker](docker.md)

Auditoría fechada de las vías de instalación por cliente, sistema operativo y método de distribución.

> **Alcance por versión.** 1.1.2 incluye los ocho clientes originales, `uninstall` y el asistente Docker. Los 13 adaptadores nuevos, `darktrace_setup_status` y la ruta Windsurf nueva están propuestos en la [PR #18](https://github.com/nuoframework/darktrace-mcp/pull/18), todavía sin fusionar, para 1.1.3. No están en npm 1.1.2: usa los fragmentos manuales para esos clientes.

Auditoría del **2026-10-06**. «Antes» es `origin/main` en `7ccfa79`; «Después» es la rama de instalación. El responsable de esa rama contrastó cada cliente con la documentación del fabricante en esa fecha; la última columna enlaza a la página consultada. Si el fabricante no documenta un archivo, el asistente muestra JSON para pegar en lugar de adivinar una ruta.

Regla del propietario: instalación fácil en cada cliente, IDE y vía. No se sugiere ni precarga ninguna dirección de appliance; normalmente los tokens se guardan en archivos privados (`0600`) o en el almacén secreto del cliente, nunca en enlaces ni argumentos. Guardarlos directamente en Windows nativo requiere la aceptación descrita abajo.

## Vías

| Vía | En qué consiste | Pasos |
|---|---|---|
| **Asistente** | `npx -y @nuoframework/darktrace-mcp@1.1.2 setup` | Un comando, preguntas de configuración (cinco numeradas en la presentación nueva), reiniciar |
| **Botón de instalación** | Añade `darktrace` con paquete fijado y `npx`; el cambio pendiente incorpora un modo de configuración cuya única herramienta indica ejecutar `setup` | Botón → confirmar → `setup` una vez → reiniciar; en 1.1.2 ejecuta `setup` antes de arrancar |
| **Plugin / marketplace** | Plugin y marketplace Codex, otro trabajo en `claude-plugin/`, `.claude-plugin/`, `.agents/` | Fuera de esta auditoría |
| **`.mcpb`** | Extensión Claude Desktop de GitHub Release; tokens al llavero | Descargar, abrir, completar formulario |
| **Docker** | `setup --runtime docker`, ID fijado con `--pull=never` | Un comando y `Pull it now? [Y/n]` |
| **JSON / TOML / YAML manual** | `darktrace-mcp config <cliente>` muestra rutas reales | Pegar, reiniciar |

## Clientes y vías

**W**: escribe archivo o llama a la CLI · **P**: muestra JSON para pegar (sin archivo documentado) · **L**: enlace generado por `config` · **B**: botón del README · **–**: no aplicable · **?**: no documentado por el fabricante.

| Cliente | Antes (`7ccfa79`) | Después | ID | Destino (usuario) | Enlace | Fuente consultada |
|---|---|---|---|---|---|---|
| Claude Desktop | W | W + `.mcpb` | `claude-desktop` | macOS `~/Library/Application Support/Claude/claude_desktop_config.json`, Windows `%APPDATA%\Claude\claude_desktop_config.json`; el fabricante no documenta Linux | – (instalación de extensión) | [modelcontextprotocol.io/quickstart/user](https://modelcontextprotocol.io/quickstart/user), [support.claude.com: local MCP servers](https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop), [anthropics/mcpb MANIFEST](https://github.com/anthropics/mcpb/blob/main/MANIFEST.md) |
| Claude Code | W (CLI) | W (CLI) | `claude-code` | `~/.claude.json` mediante `claude mcp add --scope user … --transport stdio darktrace -- node index.js` | – | [code.claude.com/docs/en/mcp](https://code.claude.com/docs/en/mcp) |
| Codex CLI + Codex app | W (CLI o TOML) | W | `codex` | `~/.codex/config.toml` `[mcp_servers.darktrace]`, compartido por CLI, extensión IDE y aplicación; `codex mcp add darktrace --env K=V -- node index.js` | – | [learn.chatgpt.com/docs/extend/mcp](https://learn.chatgpt.com/docs/extend/mcp?surface=cli), [config reference](https://learn.chatgpt.com/docs/config-file/config-reference) |
| Cursor | W + L | W + L + **B** | `cursor` | `~/.cursor/mcp.json` `mcpServers` | `cursor://anysphere.cursor-deeplink/mcp/install?name=darktrace&config=<base64 JSON>` | [cursor.com/docs/mcp](https://cursor.com/docs/mcp), [install links](https://cursor.com/docs/mcp/install-links) |
| VS Code (Copilot agent mode) | W + L + `code --add-mcp` | W + L + **B** (+ botón Insiders) | `vscode` | `mcp.json` del perfil de usuario (**MCP: Open User Configuration**; macOS `~/Library/Application Support/Code/User/`, Linux `~/.config/Code/User/`, Windows `%APPDATA%\Code\User\`), `servers` con `type: stdio` e `inputs` | `vscode:mcp/install?<url-encoded JSON>`, `vscode-insiders:…`; `code --add-mcp '<json>'` | [code.visualstudio.com MCP servers](https://code.visualstudio.com/docs/agent-customization/mcp-servers), [MCP configuration reference](https://code.visualstudio.com/docs/agents/reference/mcp-configuration) |
| Windsurf (ahora Devin Desktop) | W (`~/.codeium/windsurf/`) | W (primero la ruta nueva) | `windsurf` | `~/.config/devin/mcp_config.json` (Windows `%APPDATA%\devin\mcp_config.json`); conserva `~/.codeium/windsurf/mcp_config.json` si existe | – (sin instalación de un clic) | [docs.devin.ai/desktop/cascade/mcp](https://docs.devin.ai/desktop/cascade/mcp) |
| OpenCode | W | W | `opencode` | `~/.config/opencode/opencode.json` (respeta `.jsonc`), `mcp` con `type: local`, array `command` y `environment` | – | [opencode.ai/docs/mcp-servers](https://opencode.ai/docs/mcp-servers) |
| Gemini CLI | W | W | `gemini` | `~/.gemini/settings.json` `mcpServers`; `gemini mcp add -s user -e K=V darktrace node index.js` | – | [geminicli.com/docs/tools/mcp-server](https://geminicli.com/docs/tools/mcp-server/) |
| JetBrains AI Assistant | – | **P** | `jetbrains` | Sin archivo documentado: Settings \| Tools \| AI Assistant \| MCP \| Add, pega JSON; «Import from Claude» reutiliza Desktop | – | [jetbrains.com/help/ai-assistant/mcp.html](https://www.jetbrains.com/help/ai-assistant/mcp.html) |
| JetBrains Junie | – | **W** | `junie` | `~/.junie/mcp/mcp.json` `mcpServers` (compartido por plugin y CLI); proyecto `.junie/mcp/mcp.json` | – | [junie.jetbrains.com CLI MCP](https://junie.jetbrains.com/docs/junie-cli-mcp-configuration.html), [plugin settings](https://junie.jetbrains.com/docs/junie-plugin-mcp-settings.html) |
| Zed | – | **W** | `zed` | `~/.config/zed/settings.json` `context_servers` (`command`, `args`, `env`); ruta Windows **?**; JSONC con comentarios: muestra fragmento para pegar | – | [zed.dev/docs/ai/mcp](https://zed.dev/docs/ai/mcp) |
| Cline | – | **W** | `cline` | `<Code user dir>/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json` `mcpServers` con `disabled`, `autoApprove` (formato de la documentación; ruta de extensión confirmada en el observador de archivos y el registro de incidencias del proyecto; la guía solo nombra `~/.cline/data/settings/` para CLI) | – | [docs.cline.bot MCP](https://docs.cline.bot/mcp/adding-and-configuring-servers) |
| Roo Code | – | **W** | `roo` | `<Code user dir>/globalStorage/rooveterinaryinc.roo-cline/settings/mcp_settings.json` `mcpServers` con `alwaysAllow`, `disabled` (ruta del registro de incidencias; la guía solo dice «Edit Global MCP»); proyecto `.roo/mcp.json` | – | [docs.roocode.com using MCP](https://roocodeinc.github.io/Roo-Code/features/mcp/using-mcp-in-roo) |
| Continue | – | **W** (bloque YAML) | `continue` | `~/.continue/config.yaml`, lista `mcpServers:` (Windows `%USERPROFILE%\.continue\config.yaml`); inserta un elemento entre marcadores y rechaza estructuras desconocidas | – | [docs.continue.dev MCP](https://docs.continue.dev/customize/deep-dives/mcp), [reference](https://docs.continue.dev/reference) |
| Kiro | – | **W** + L | `kiro` | `~/.kiro/settings/mcp.json` `mcpServers` con `disabled`, `autoApprove`; proyecto `.kiro/settings/mcp.json` | `https://kiro.dev/launch/mcp/add?name=darktrace&config=<url-encoded JSON>` (Kiro confirma antes de escribir) | [kiro.dev/docs/mcp/configuration](https://kiro.dev/docs/mcp/configuration/), [servers](https://kiro.dev/docs/mcp/servers/) |
| Amp | – | **W** | `amp` | `~/.config/amp/settings.json` (o `.jsonc`), clave `amp.mcpServers`; misma ruta en Windows. `amp mcp add` no documenta `--env`, por eso se escribe el archivo | – | [ampcode.com/docs/customize/mcp](https://ampcode.com/docs/customize/mcp), [CLI settings](https://ampcode.com/docs/cli/settings) |
| GitHub Copilot CLI | – | **W** | `copilot-cli` | `~/.copilot/mcp-config.json` (`COPILOT_HOME`) `mcpServers` con `type: local`, `tools: ["*"]`; `copilot mcp add --env K=V darktrace -- node index.js` | – | [docs.github.com: add MCP servers to Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers) |
| Warp | – | **W** | `warp` | `~/.warp/.mcp.json` `mcpServers` (`command`, `args`, `env`); también Settings > Agents > MCP servers | – (`warp://settings/mcp` solo abre la página) | [docs.warp.dev MCP](https://docs.warp.dev/agents/capabilities/mcp) |
| Goose | – | **W** (bloque YAML) | `goose` | `~/.config/goose/config.yaml` (Windows `%APPDATA%\Block\goose\config\config.yaml`), mapa `extensions:` con `type: stdio`, `cmd`, `args`, `envs`, `timeout` | Existe `goose://extension?cmd=…`, pero solo admite `npx`, `uvx`, `jbang`, `goosed`, `docker` como `cmd`, no la ruta absoluta de Node; no se genera | [goose-docs.ai config files](https://goose-docs.ai/docs/guides/config-files), [using extensions](https://goose-docs.ai/docs/getting-started/using-extensions) |
| LM Studio | – | **W** + L | `lmstudio` | `~/.lmstudio/mcp.json` `mcpServers` (notación Cursor) | `lmstudio://add_mcp?name=darktrace&config=<base64 JSON>` | [lmstudio.ai/docs/app/mcp](https://lmstudio.ai/docs/app/mcp), [deeplink](https://lmstudio.ai/docs/app/mcp/deeplink) |
| Antigravity | – | **W** | `antigravity` | `~/.gemini/config/mcp_config.json` `mcpServers`; workspace `.agents/mcp_config.json` | – | [antigravity.google/docs/mcp](https://antigravity.google/docs/mcp) |

Cada entrada **W** hace copia `<file>.bak-<timestamp>`, escritura atómica, rutas absolutas a Node y `dist/src/index.js`, rutas de **archivos** de token (no valores), archivos nuevos `0600` en directorio `0700`. No reescribe enlaces simbólicos ni JSONC con comentarios: muestra fragmento para pegar. La excepción Windows requiere aceptación explícita. `setup --client <id>`, `config <id>` y `remove --client <id>` aceptan los identificadores anteriores en el cambio de instalación.

## Sistemas operativos

| Sistema | Asistente | Tokens | Notas |
|---|---|---|---|
| macOS | Sí | `~/.config/darktrace-mcp/{public,private}-token`, `0600`, directorio `0700` | Los montajes Desktop aparecen como root: usa `DARKTRACE_TOKEN_FILE_OWNER=root-or-current` |
| Linux | Sí | Igual | Docker conserva el propietario; comprobación estricta |
| WSL | Sí, comando Linux dentro de WSL | Igual, dentro del sistema de archivos WSL | Los clientes Windows deben lanzar por `wsl.exe`; el asistente WSL no escribe sus archivos |
| Windows nativo | **Parcial** | **Valores** en el archivo del cliente, solo tras aceptación (`--inline-tokens-windows`) | Rechaza archivos de token en `win32` al no verificar ACL privada. Alternativas nativas: `.mcpb` (llavero), botón/enlace VS Code (almacén secreto), Docker Desktop |

## Dónde se atasca el usuario (antes → después)

| Dificultad | Antes | Después |
|---|---|---|
| Entrada sin dirección o tokens (botón, copia manual, falta `setup`) | `startup_error` y servidor detenido | **Modo de configuración** pendiente de publicación: solo `darktrace_setup_status`, con descripción y respuesta que indican `npx -y @nuoframework/darktrace-mcp@1.1.2 setup`; una línea `setup_required` en stderr |
| Cliente ausente del asistente | 13 de los 21 exigían JSON manual | Todos tienen ID; uno solo muestra JSON porque no hay archivo documentado |
| Qué archivo y clave usar | Prosa por cliente en `docs/clients.md` | `docs/install.md` empieza por elegir cliente; resumen del asistente con archivo, estado y modo |
| Terminal de 80 columnas | Texto sin estructura | Cabecera, `Step n of 5`, marcadores y resumen alineado; ASCII sin TTY o con `NO_COLOR` |
| Comprobación de red parece bloqueada | Espera silenciosa | Indicador animado con TTY, nada extra al redirigir |
| Error sin siguiente paso | Solo mensaje | Cada error termina con `Next:` |
| `npx` sin versión | README fijado a `@1.1.1`; forma sin versión no documentada | Se explica que descarga la última publicada; fija versión para reproducibilidad y entradas (el asistente usa rutas absolutas) |
| Windows | «No puede proteger archivos» sin análisis | Análisis y vías nativas seguras abajo |

<a id="windows-native"></a>

## Windows nativo

**Hallazgo.** Node.js no expone API de ACL de archivos. En Windows, `fs.stat` solo refleja el atributo de solo lectura; no permite evaluar `assertPrivateFile` de `src/config/load.ts`. El rechazo de archivos de token en `win32` es deliberado.

**Vía investigada.** `icacls <file> /inheritance:r /grant:r "<user>:(R)"` restringe un archivo en `%LOCALAPPDATA%\darktrace-mcp\` a la cuenta actual (además de SYSTEM y Administrators mediante propiedad), como equivalente práctico de `0600`. El asistente podría ejecutarlo con un ejecutor inyectable y probarlo. Falta **verificar al arrancar**: Node necesita un complemento nativo (no aceptable para esta cadena de suministro) o lanzar `icacls`/PowerShell al iniciar el servidor, excluido por el diseño de seguridad (sin subprocesos/shell, arranque determinista). CI solo ejecuta Linux y no puede comprobarlo. No se entrega una comprobación de seguridad sin verificación ni pruebas.

**Decisión.** No implementado en esa rama; queda documentado. Vías nativas, por preferencia:

1. `.mcpb` de Claude Desktop: tokens en el llavero.
2. Botón VS Code o `darktrace-mcp config vscode`: entradas de contraseña en su almacén secreto.
3. Docker Desktop: `setup --runtime docker`, archivos montados de solo lectura.
4. WSL: asistente Linux para clientes dentro de WSL.
5. Otros: `setup --inline-tokens-windows`, tras leer y aceptar el aviso. Los archivos del perfil suelen estar restringidos por las ACL predeterminadas de Windows; este compromiso requiere aceptación explícita.

**Seguimiento registrado, no realizado:** modo optativo `DARKTRACE_TOKEN_FILE_CHECK=windows-acl` que verifique ACL con un auxiliar revisado y fijado; necesita un ejecutor CI Windows antes de habilitarlo por defecto.

## Fuera del alcance

- Archivos de proyecto (`.cursor/mcp.json`, `.mcp.json`, `.roo/mcp.json`, `.kiro/settings/mcp.json`, `.vscode/mcp.json`): el asistente solo escribe ámbito de usuario. Los archivos de proyecto ejecutan código para quien confía en el repositorio y se deben revisar manualmente.
- Plugin y marketplace Codex: otro trabajo.
- Ruta Linux de Claude Desktop: Anthropic no la documenta; el asistente solo usa `$XDG_CONFIG_HOME/Claude` si existe ese directorio.
