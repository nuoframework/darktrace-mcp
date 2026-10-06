[English](README.md) · **Español**

<picture>
  <source media="(max-width: 600px)" srcset="docs/assets/readme-banner-es-mobile.svg">
  <img src="docs/assets/readme-banner-es.svg" width="1280" alt="Darktrace MCP — MCP no oficial. Desarrollado por un tercero ajeno a Darktrace, sin afiliación ni autorización de Darktrace. El pie muestra el logotipo oficial de Darktrace, etiquetado como proyecto independiente de un tercero; su uso no implica autorización ni carácter oficial.">
</picture>

# Darktrace MCP

**MCP no oficial. Desarrollado por un tercero ajeno a Darktrace, sin afiliación ni autorización de Darktrace.**

Usa la API de Darktrace Threat Visualizer desde Claude, Codex, Cursor, VS Code y otros clientes MCP: investiga dispositivos, model breaches e incidentes de AI Analyst y, si lo permites, ejecuta acciones.

<p>
  <a href="docs/architecture.md#91-baseline-stdio"><img src="docs/assets/badges/stdio-only-es.svg" alt="transporte: solo stdio"></a>
  <a href="package.json"><img src="docs/assets/badges/node-22-es.svg" alt="entorno: Node.js 22+"></a>
  <a href="LICENSE"><img src="docs/assets/badges/apache-2.0-es.svg" alt="licencia: Apache-2.0"></a>
  <a href="docs/docker.md"><img src="docs/assets/badges/docker-local-es.svg" alt="docker: archivo de imagen privado o build local, ID de imagen fijado"></a>
  <a href="docs/security.md"><img src="docs/assets/badges/security-tests-es.svg" alt="pruebas de seguridad: offline"></a>
</p>

[Primeros pasos](docs/es/getting-started.md) · [Clientes](docs/es/clients.md) · [Herramientas](docs/tools.md) (inglés) · [Configuración](docs/es/configuration.md) · [Solución de problemas](docs/es/troubleshooting.md)

## Inicio rápido

Necesitas: la dirección HTTPS de tu appliance Darktrace, un token de API **público** y uno **privado**, y acceso a este repositorio privado de GitHub.

### 1. Instalador y asistente (macOS, Linux)

```sh
gh auth login
gh api -H 'Accept: application/vnd.github.raw' \
  repos/nuoframework/darktrace-mcp/contents/scripts/install.sh > install.sh
less install.sh
bash install.sh
```

El instalador clona el repositorio, lo compila y lanza `darktrace-mcp setup`. El asistente pide la URL y los tokens (sin mostrarlos), guarda los tokens en archivos que solo tú puedes leer y configura los clientes que encuentra. Windows: usa `scripts/install.ps1` ([detalles](docs/es/getting-started.md#windows)).

### 2. Extensión de Claude Desktop (.mcpb)

```sh
gh repo clone nuoframework/darktrace-mcp && cd darktrace-mcp
npm ci --ignore-scripts && npm run build
npm run pack:mcpb
```

Haz doble clic en el archivo `.mcpb`. Claude Desktop pide la URL y los tokens y guarda los tokens en el llavero del sistema.

### 3. Docker

```sh
docker load --input darktrace-mcp-<version>-linux-arm64.tar.gz
docker image inspect --format '{{.Id}}' darktrace-mcp:<version>-arm64
```

Descarga el archivo de una release privada o constrúyelo tú, y añade la configuración endurecida del cliente. Consulta la [guía de Docker](docs/docker.md) (inglés).

### Comprobar que funciona

```sh
darktrace-mcp --check-config
darktrace-mcp test
```

`--check-config` revisa la configuración sin conexión. `test` hace una llamada real (`GET /status`) a tu appliance.

## Clientes compatibles

`darktrace-mcp setup` configura estos clientes automáticamente. Cada enlace incluye también la configuración manual.

| Cliente | Automático | Guía manual |
|---|---|---|
| Claude Desktop | `setup` o `.mcpb` | [Claude Desktop](docs/es/clients.md#claude-desktop) |
| Claude Code | `setup` | [Claude Code](docs/es/clients.md#claude-code) |
| Codex (CLI e IDE) | `setup` | [Codex](docs/es/clients.md#codex) |
| Cursor | `setup` o enlace de un clic | [Cursor](docs/es/clients.md#cursor) |
| VS Code (Copilot) | `setup` o enlace de un clic | [VS Code](docs/es/clients.md#vs-code) |
| Windsurf | `setup` | [Windsurf](docs/es/clients.md#windsurf) |
| OpenCode | `setup` | [OpenCode](docs/es/clients.md#opencode) |
| Gemini CLI | `setup` | [Gemini CLI](docs/es/clients.md#gemini-cli) |
| Cualquier cliente, con Docker | manual | [Docker](docs/es/clients.md#docker) |

## Qué puede hacer

Están disponibles 78 de las 79 operaciones de la API, agrupadas en 51 herramientas. Lista completa: [referencia de herramientas](docs/tools.md) (inglés).

| Área | Ejemplos | Perfil necesario |
|---|---|---|
| Dispositivos | listar, buscar, dispositivos similares, conexiones, métricas | `read` |
| Model breaches | listar, comentarios | `read` |
| | reconocer (acknowledge), comentar | `write` |
| AI Analyst | incidentes, eventos, investigaciones, estadísticas | `read` |
| | reconocer, fijar, comentar, iniciar una investigación | `write` |
| Respuesta autónoma (Antigena) | listar acciones, resumen | `read` |
| | activar, ampliar, anular, acciones manuales | `critical` |
| Etiquetas (tags) | listar etiquetas y dispositivos etiquetados | `read` |
| | crear, asignar, quitar | `write` |
| | borrar una etiqueta | `critical` |
| Intel feed y subredes | leer | `read` |
| | modificar | `critical` |
| Capturas de paquetes (PCAP) | listar | `read` |
| | solicitar una captura | `write` |
| | descargar una captura | `sensitive` |
| Advanced Search | consultas, análisis, gráficos | `sensitive` |
| Darktrace/Email | paneles, datos de referencia | `read` |
| | contenido de correos, búsqueda, eventos de auditoría | `sensitive` |
| | retener, liberar y otras acciones sobre correo | `critical` |
| Modelos, métricas, estado | modelos, componentes, métricas, estado, estadísticas | `read` |

19 operaciones superaron consultas reales en un laboratorio Darktrace 7.1.0. El resto aparece como **not lab-validated** (no validada en laboratorio) en la [referencia de herramientas](docs/tools.md).

## Permisos y seguridad

Tú decides qué puede hacer el modelo con `DARKTRACE_PROFILES` (el asistente te lo pregunta). Por defecto es `read`.

| Perfil | Permite | Protección adicional |
|---|---|---|
| `read` (por defecto) | Lecturas normales | — |
| `sensitive` | Advanced Search, contenido de correos, descarga de PCAP, eventos de auditoría | — |
| `write` | Reconocer, comentar, fijar, etiquetas, etiquetas de dispositivo, solicitar PCAP, investigaciones | `dryRun:true` muestra una vista previa sin cambiar nada |
| `critical` | Acciones de Antigena, intel feed, subredes, acciones sobre correo, borrar una etiqueta | Solo se ejecuta con `confirm:true`. Sin él recibes una vista previa |
| `all` | Todo lo anterior | Las mismas reglas de cada perfil |

Combina perfiles con comas, por ejemplo `DARKTRACE_PROFILES=read,write`. Cada escritura y acción crítica queda auditada. Los permisos de tu token de Darktrace siguen aplicando: el servidor no puede hacer más de lo que el token permite.

> **Los datos salen de tu red.** Los resultados llegan a tu cliente MCP y a su proveedor del modelo. Comprueba la idoneidad del proveedor, la retención y la residencia de datos (provider eligibility, retention, residency) en tu organización antes de conectar un appliance de producción.

Más: [resumen de seguridad](docs/security.md) (inglés) · [política de seguridad](SECURITY.md).

## Documentación

| Guía | Qué encontrarás |
|---|---|
| [Primeros pasos](docs/es/getting-started.md) | Instalación paso a paso, tokens, primera prueba |
| [Clientes](docs/es/clients.md) | Configuración automática y manual de cada cliente |
| [Configuración](docs/es/configuration.md) | Variables de entorno, archivo de configuración, perfiles, límites |
| [Herramientas](docs/tools.md) (inglés) | Cada herramienta y operación de la API, con su perfil |
| [Solución de problemas](docs/es/troubleshooting.md) | Autenticación, reloj, TLS, permisos, proxies |
| [Docker](docs/docker.md) (inglés) | Imagen y opciones de ejecución endurecidas |
| [Seguridad](docs/security.md) (inglés) | Modelo de seguridad y enlaces a revisiones detalladas |
| [Arquitectura](docs/architecture.md) (inglés) | Flujo de una petición y decisiones de diseño |
| [Releases](docs/releases.md) · [Changelog](CHANGELOG.md) | Versiones y cambios |
| [Historial](docs/history/README.md) | Registros de revisiones y releases anteriores |

## Estado del proyecto

Repositorio privado. No se publica nada en npm ni en registros públicos. Licencia [Apache-2.0](LICENSE). Contribuciones: [CONTRIBUTING.md](CONTRIBUTING.md).

## Marcas, logotipo y contacto

**MCP no oficial. Desarrollado por un tercero ajeno a Darktrace, sin afiliación ni autorización de Darktrace.** El nombre y el logotipo de Darktrace pertenecen a Darktrace. La portada muestra el [logotipo oficial sin modificar](docs/assets/brand/darktrace/Darktrace-white.svg) del [paquete público de logotipos del Brand Hub](https://brandhub.darktrace.com/visual-identity/logo) ([procedencia](docs/assets/brand/darktrace/README.md), [identidad visual](docs/visual-identity.md), en inglés). Identifica el producto con el que se integra este proyecto. **El uso del logotipo no implica autorización ni carácter oficial.**

Reclamaciones y reivindicaciones sobre marcas o imagen corporativa, incluidas solicitudes para retirar el logotipo: [contacto@pabloarrabal.com](mailto:contacto@pabloarrabal.com). Esta dirección no es para vulnerabilidades; consulta la [política de seguridad](SECURITY.md). Este proyecto nunca envía correo por sí mismo.
