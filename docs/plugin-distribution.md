# Distribución del plugin

**Español** · [English](en/plugin-distribution.md)

[README](../README.md) · [Clientes](clients.md) · [Versiones](releases.md) · [Seguridad](security.md)

Contenido, instalación y publicación del plugin para clientes que ejecutan el servidor localmente.

<a id="plugin-distribution"></a>

La carpeta `claude-plugin/` empaqueta el servidor como plugin para Claude Code, Cowork y Codex; el repositorio es marketplace para ambos clientes. Esta página empieza por instalar, y después explica el contenido, el envío a Claude Directory, los cambios por versión, las pruebas locales y los límites.

<a id="install-from-the-repository-marketplace"></a>

<a id="install"></a>

## Instalar

**Claude Code.** Dos comandos y después las preguntas (dirección, tokens público y privado y perfil). Es toda la configuración:

```sh
claude plugin marketplace add nuoframework/darktrace-mcp
claude plugin install darktrace-mcp@darktrace-mcp
```

Los tokens van al almacén de credenciales del sistema, no a un archivo de ajustes. Usa `/mcp` en una sesión para ver `darktrace` y `/config` para cambiar después el perfil. Es un proceso local: funciona en Claude Code y en sesiones Cowork de tu ordenador; el chat de claude.ai lo ignora y solo carga la guía de investigación.

**Codex.** Tres comandos: instala el plugin y ejecuta el asistente una vez para la conexión:

```sh
codex plugin marketplace add nuoframework/darktrace-mcp
codex plugin add darktrace-mcp@darktrace-mcp
npx -y @nuoframework/darktrace-mcp@1.1.2 setup
```

Codex no pide valores de configuración. El servidor incluido solo recibe las variables declaradas en `mcp.json`, más `PLUGIN_ROOT` y `PLUGIN_DATA`; no recibe las exportadas en tu shell ni las sustituciones `env` en `[plugins."darktrace-mcp@darktrace-mcp".mcp_servers.darktrace]` (comprobado con Codex CLI 0.160.1). Por ello termina con `instance.baseUrl must be an HTTPS origin` y Codex registra `MCP server startup failed server_name="darktrace"` (visible con `RUST_LOG=info`). El modelo no ve herramientas `darktrace_*`; la guía de investigación le dirige al asistente. Configura la conexión con el asistente, que escribe una entrada `mcp_servers.darktrace` completa con rutas absolutas y archivos de token en `~/.codex/config.toml`; después desactiva la copia incluida y conserva la guía:


```toml
[plugins."darktrace-mcp@darktrace-mcp".mcp_servers.darktrace]
enabled = false
```

El directorio público de plugins de OpenAI solo acepta servidores MCP remotos (HTTPS); este plugin se distribuye para Codex únicamente mediante el marketplace del repositorio.

<a id="what-the-folder-contains"></a>

## Contenido de la carpeta

| Archivo | Quién lo lee | Finalidad |
|---|---|---|
| `claude-plugin/.claude-plugin/plugin.json` | Claude Code, Cowork, Claude Directory | Manifiesto: nombre `darktrace-mcp`, versión, metadatos y opciones `userConfig` que pide Claude Code (dirección del appliance, tokens público y privado marcados como sensibles, perfiles, aceptación de lectura sensible con escritura y formato de fecha de firma) |
| `claude-plugin/.claude-plugin/icon.png` | Claude Directory | Icono 1024 × 1024: grafo propio de la cabecera sobre DT Dark, sin logotipo textual. El directorio fija el icono en el primer envío |
| `claude-plugin/package.json`, `claude-plugin/package-lock.json` | Claude Code | Instalación con bloqueo: versión publicada exacta de `@nuoframework/darktrace-mcp` y tres dependencias de runtime, con direcciones de registro y hashes de integridad. Instala con `--ignore-scripts` al copiar el plugin a su caché |
| `claude-plugin/.mcp.json` | Claude Code, Cowork | Servidor stdio `darktrace`: `node ${CLAUDE_PLUGIN_ROOT}/node_modules/@nuoframework/darktrace-mcp/dist/src/index.js`, con variables `DARKTRACE_*` de `${user_config.*}` |
| `claude-plugin/plugin.json` | Codex | Manifiesto portable (esquema Agent Plugins) con los campos de publicación de OpenAI en `extensions.com.openai.interface` |
| `claude-plugin/mcp.json` | Codex | Archivo MCP portable, `type: "stdio"`, arranque `npx -y @nuoframework/darktrace-mcp@1.1.2` (Codex no instala desde bloqueo) y solo `DARKTRACE_PROFILES=read` en su entorno |
| `claude-plugin/skills/darktrace-investigation/SKILL.md` | Todos | Guía de investigación: lectura primero, respuestas pequeñas, vista previa y aprobación de acciones críticas, datos del appliance tratados como no fiables y orientación al asistente cuando no hay herramientas |
| `claude-plugin/README.md`, `claude-plugin/LICENSE` | Claude Directory, personas | Descripción y licencia (copia de `LICENSE` de la raíz) |
| `.claude-plugin/marketplace.json` | Claude Code | Marketplace `darktrace-mcp` del repositorio con una entrada cuya fuente es `./claude-plugin` |
| `.agents/plugins/marketplace.json` | Codex | Marketplace con la misma entrada (`source: local`, `policy.installation: AVAILABLE`) |

El plugin está en una subcarpeta para que el directorio lea su propio `package.json` y bloqueo, no los del repositorio, y solo esa carpeta se instale en los equipos. Estos archivos no entran en el paquete npm (lista permitida `files`), la imagen Docker (rutas permitidas de `.dockerignore`) ni la copia de publicación (`scripts/prepare-release.mjs` copia directorios concretos).

<a id="submit-to-the-claude-directory-owner"></a>

## Enviar al Claude Directory (propietario)

El portal valida el plugin, analiza cada nuevo commit de la rama seguida y lo ofrece a usuarios de planes Pro, Max, Team y Enterprise. Lee antes la [lista de requisitos](https://claude.com/docs/plugins/pre-submission-checklist) y la [guía de envío](https://claude.com/docs/plugins/submit).

1. Comprueba localmente `claude plugin validate --strict ./claude-plugin` y `claude plugin validate .`: ambos deben mostrar `✔ Validation passed`.
2. Abre [claude.ai/directory/manage](https://claude.ai/directory/manage) y elige **Submit new** → **Plugin bundle**. La cuenta GitHub conectada debe poder enviar cambios al repositorio.
3. En **Source**, indica repositorio `nuoframework/darktrace-mcp`, ruta `claude-plugin` y deja **Branch or tag** vacío (rama predeterminada `main`).
4. Elige **Validate**. Se espera que no haya bloqueos. La primera validación (`main` en `b57fd26`, aún con `npx`) indicó «Runs a pinned npx package», «No icon», «Launcher lock missing» y tres «Unrecognized field in plugin.json». El icono, la instalación con bloqueo y el manifiesto reducido los atienden. Puede quedar retención por instalar dependencias desde bloqueo («Dependencies install from a lockfile»: un revisor de Anthropic examina la versión) o por «Name matches a known brand». El README declara independencia y carácter no oficial.
5. Si hay un bloqueo, corrígelo, envía el cambio a `main` y elige **Re-validate**. Un resultado solo se aplica a un commit.
6. **Listing details** se obtiene de `plugin.json` y el README. La tabla siguiente contiene los valores del repositorio.
7. En **Data handling**, responde según la tabla de tratamiento de datos.
8. En **Compliance**, confirma el correo de contacto y las cuatro aceptaciones.
9. En **Review and submit**, conserva **GitHub push webhook** para recibir las fusiones en `main` sin esperar la comprobación programada (necesita acceso de administrador); después **Submit for review**.
10. Cuando la versión supere la revisión y se levante la retención, elige **Publish** en su página.

<a id="listing-text"></a>

### Texto de la ficha

| Campo | Valor |
|---|---|
| Nombre | `darktrace-mcp` |
| Nombre visible | Darktrace MCP |
| Descripción breve | Investiga alertas, dispositivos e incidentes de tu appliance Darktrace Threat Visualizer mediante un servidor MCP local: lectura por defecto, vistas previas disponibles para cada cambio y aprobación humana de acciones críticas. |
| Descripción larga | La ficha muestra `claude-plugin/README.md`. |
| Autor | Pablo Arrabal, https://github.com/nuoframework |
| Licencia | Apache-2.0 |
| Documentación | https://github.com/nuoframework/darktrace-mcp/blob/main/docs/getting-started.md |
| Soporte | https://github.com/nuoframework/darktrace-mcp/issues |
| Política de privacidad | https://github.com/nuoframework/darktrace-mcp/blob/main/SECURITY.md |

<a id="data-handling-answers"></a>

### Respuestas sobre tratamiento de datos

| Pregunta | Respuesta |
|---|---|
| ¿Lee o almacena datos personales? | Lee lo que el appliance del usuario devuelve a sus consultas (nombres de dispositivos, IP, nombres de usuario en alertas, metadatos de correo con `sensitive`). El plugin no almacena resultados; quedan en la sesión del usuario. |
| ¿Envía datos a otros servicios distintos de sus conectores? | No. El servidor solo conecta al appliance indicado por el usuario, por HTTPS con peticiones firmadas. No hay telemetría, búsqueda de actualizaciones ni envío de fallos. La instalación descarga el paquete y sus dependencias fijadas de npm; el lanzador Codex puede descargarlos a su caché al primer arranque. |
| ¿Cuánto tiempo conserva los datos? | El editor no recibe ni conserva datos. Claude Code guarda las credenciales en el almacén del sistema del usuario; el servidor autentica ante el appliance con el token público y una firma, sin enviar el token privado. |
| ¿Está destinado a menores de 18 años? | No. Es una herramienta para analistas de seguridad que operan un appliance Darktrace. |

<a id="after-publication"></a>

### Después de publicar

El directorio sigue `main`. Cada fusión que modifica `claude-plugin/` se convierte en una versión que vuelve a analizarse; cada una puede quedar pendiente de revisión. Si una versión falla el análisis, las posteriores esperan a que un revisor desbloquee el plugin. Mientras tanto, la ficha ofrece la última versión publicada.

<a id="bump-the-pinned-version-at-each-release"></a>

## Actualizar la versión fijada en cada release

El plugin fija una versión npm exacta, como exige el directorio. Debe existir ya en el registro público o fallará la instalación. El paso 7 de [publicación](releases.md#publishing-a-version-owner) recoge la tarea. Cuando `npm view @nuoframework/darktrace-mcp@<version>` muestre la versión:

1. Cambia `version` en `claude-plugin/.claude-plugin/plugin.json` y `claude-plugin/plugin.json`.
2. Fija la dependencia a `<version>` en `claude-plugin/package.json` y regenera el bloqueo.
3. Sustituye la referencia npm en `claude-plugin/mcp.json`, `claude-plugin/README.md` y el comando inicial de la guía de investigación.
4. Ejecuta ambas validaciones y fusiona en `main`.

Para regenerar el bloqueo, ejecuta `npm install --package-lock-only --ignore-scripts --no-audit --no-fund` dentro de `claude-plugin/` y conserva solo el árbol de producción del servidor. El paquete publicado incluye `npm-shrinkwrap.json` con herramientas marcadas `dev`, pero npm copia todo ese árbol a un bloqueo anidado (112 paquetes, incluidos ESLint y TypeScript), que se descargaría en cada instalación. El bloqueo reducido conserva el servidor y lo accesible desde sus `dependencies` (`zod`, `@modelcontextprotocol/server`, `@modelcontextprotocol/core`; comprueba `npm view @nuoframework/darktrace-mcp@<version> dependencies`):

```sh
node -e '
const fs=require("fs");const l=JSON.parse(fs.readFileSync("package-lock.json","utf8"));const pk=l.packages;
const find=(from,n)=>{let b=from;for(;;){const c=(b?b+"/":"")+"node_modules/"+n;if(pk[c])return c;if(!b)return null;const i=b.lastIndexOf("/node_modules/");b=i<0?"":b.slice(0,i);}};
const keep=new Set([""]);const st=["node_modules/@nuoframework/darktrace-mcp"];
while(st.length){const p=st.pop();if(keep.has(p))continue;keep.add(p);for(const n of Object.keys({...pk[p].dependencies,...pk[p].optionalDependencies,...pk[p].peerDependencies})){const r=find(p,n);if(r)st.push(r);}}
l.packages=Object.fromEntries(Object.entries(pk).filter(([k])=>keep.has(k)));fs.writeFileSync("package-lock.json",JSON.stringify(l,null,2)+"\n");console.log([...keep].filter(Boolean));'
```

Comprueba en una copia temporal que `npm ci --ignore-scripts` funciona y que `node node_modules/@nuoframework/darktrace-mcp/dist/src/index.js --check-config` responde con las variables `DARKTRACE_*` definidas. Omitir las entradas de desarrollo del shrinkwrap queda pendiente para la siguiente publicación del servidor; entonces no hará falta reducir el bloqueo.

Los usuarios de Codex actualizan con `codex plugin marketplace upgrade darktrace-mcp`; los de Claude Code, con `claude plugin update darktrace-mcp@darktrace-mcp`.

<a id="test-the-plugin-locally"></a>

## Probar el plugin localmente

La instalación por marketplace copia a la caché de Claude Code e instala desde el bloqueo (observado: unos 3 segundos para 4 paquetes). `--plugin-dir` carga en el sitio y no instala dependencias: ejecuta antes `npm ci --ignore-scripts` dentro de `claude-plugin/` (`node_modules` se ignora en git). Después carga una sesión y pasa la configuración por `--settings`, que acepta JSON; la clave bajo `pluginConfigs` es el nombre del plugin:

```sh
claude --plugin-dir ./claude-plugin \
  -p "List the Darktrace tools you have and nothing else" \
  --allowedTools "mcp__plugin_darktrace-mcp_darktrace__*" \
  --settings '{"pluginConfigs":{"darktrace-mcp":{"appliance_url":"https://<tu-appliance>","public_token":"dummy","private_token":"dummy","profiles":"read","acknowledge_sensitive_write":"false","date_format":"compact"}}}'
```

Sustituye el marcador de dirección localmente para probar; no es una dirección ejecutable. Con una dirección válida y valores de token sintéticos, el servidor arranca y lista las 27 herramientas `read`; solo contacta al appliance cuando se llama a una herramienta. Puedes comprobar el mismo entorno sin el cliente, desde fuera del repositorio:

```sh
DARKTRACE_URL='https://<tu-appliance>' DARKTRACE_PUBLIC_TOKEN=dummy DARKTRACE_PRIVATE_TOKEN=dummy \
DARKTRACE_PROFILES=read DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE=false DARKTRACE_DATE_FORMAT=compact \
npx -y @nuoframework/darktrace-mcp@1.1.2 --check-config
```

Ejecuta esto fuera de un checkout: dentro, `npx` resuelve el paquete al proyecto local sin compilar y falla con `darktrace-mcp: command not found`.

Para probar una rama como una instalación real, usa un marketplace temporal con fuente `git-subdir` (`"url": "https://github.com/nuoframework/darktrace-mcp.git", "path": "claude-plugin", "ref": "<branch>"`), añádelo con `claude plugin marketplace add <dir>`, instala `darktrace-mcp@<marketplace-name>` con valores `--config` y comprueba que existe `~/.claude/plugins/cache/<marketplace-name>/darktrace-mcp/<version>/node_modules`.

Para Codex, usa un directorio temporal aislado con su opción de configuración del directorio de usuario, registra `./` como marketplace, instala `darktrace-mcp@darktrace-mcp` y comprueba `codex mcp list`. No cambies el directorio de configuración de tu sesión de trabajo habitual.

<a id="limitations"></a>

## Limitaciones

- **Servidor local.** Funciona en Claude Code y Cowork en el ordenador del usuario; el chat de claude.ai lo ignora. Necesita Node.js 22 o posterior y acceso desde esa máquina al appliance.
- **CA privada.** El plugin no permite definir `NODE_EXTRA_CA_CERTS`. Usa el paquete npm con el asistente y las [opciones TLS](configuration.md#red-y-tls).
- **Cada opción necesita un valor.** Una cadena vacía para `DARKTRACE_DATE_FORMAT`, `DARKTRACE_PROFILES` o la aceptación impide el arranque; por eso todas las opciones `userConfig` opcionales tienen un valor predeterminado.
- **Codex.** No pide configuración ni permite pasar la conexión al servidor incluido; usa el asistente y desactiva esa copia.
- **La instalación necesita el registro.** Claude Code descarga el paquete y sus tres dependencias de registry.npmjs.org al instalar o actualizar (npm, `--ignore-scripts`, límite 60 s); los siguientes arranques no requieren descargas. En Codex, `npx` descarga al primer arranque y conserva la versión en la caché npm.

## Descubribilidad del repositorio (propietario)

Propuesta lista para aplicar; este cambio documental no modifica la descripción ni los topics de GitHub. Tampoco modifica `description` o `keywords` de `package.json`: el propietario puede aplicar la misma descripción y lista en 1.1.3.

Descripción inglesa (114 caracteres): **Unofficial Darktrace MCP server for SOC investigations and incident response in Claude, Cursor, Codex and VS Code.**

```sh
gh repo edit nuoframework/darktrace-mcp \
  --description 'Unofficial Darktrace MCP server for SOC investigations and incident response in Claude, Cursor, Codex and VS Code.' \
  --remove-topic cybersecurity-tools,mcp-security,mcp-tools,security,security-tools \
  --add-topic mcp,mcp-server,model-context-protocol,darktrace,darktrace-api,threat-visualizer,soc,incident-response,security-automation,claude,claude-code,cursor,codex,vscode,typescript,cybersecurity,ndr,antigena,llm-tools,ai-agents
```

El comando retira cinco topics genéricos existentes y añade la selección de 20, para dejar exactamente la propuesta; revísalo antes de ejecutarlo.

Los 20 topics del comando son también la propuesta de `keywords` para npm. Describen integración y casos de uso; no implican afiliación ni validación de capacidades pendientes. Añade al README el enlace del Claude Directory cuando exista una ficha pública aprobada. Hasta confirmar la publicación del servidor en MCP Registry, el enlace «Relacionado» apunta al catálogo oficial, sin afirmar que exista ya una ficha del servidor. La documentación de Darktrace enlazada está en su portal público oficial y requiere acceso de cliente; nunca apunta a un appliance.
