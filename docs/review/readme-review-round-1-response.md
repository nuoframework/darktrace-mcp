# README review round 1 — response

Date: **2026-10-06**. Responds to [round 1](readme-review-round-1.md) and the owner’s subsequent selection of banner variant B. No runtime, release pin, GIF or official-logo bytes were changed.

Publication was independently rechecked against the [GitHub Release](https://github.com/nuoframework/darktrace-mcp/releases/tag/v1.1.0), [npm version metadata and provenance link](https://registry.npmjs.org/@nuoframework%2fdarktrace-mcp/1.1.0), the ghcr index via `docker manifest inspect`, and [release-commit CI](https://github.com/nuoframework/darktrace-mcp/actions/runs/37497433186). The index includes both linux/amd64 and linux/arm64; its platform manifest digests were not substituted for the index digest.

## Per-item decisions

| Item | Decision | Reason | Exact text now used |
|---|---|---|---|
| 1 [must] Publication wording | **applied** | Removed both stale npm comments and stated verified publication in all three channels. | [Verbatim excerpts](#item-1) |
| 2 [must] First command | **applied with changes** | One fenced npm command comes first. Owner-only files are scoped to macOS/Linux, and backups are described for existing configs; the Windows warning and one-time bootstrap paragraph stay. | [Verbatim excerpts](#item-2) |
| 3 [should] Docker digest | **applied with changes** | Pinned the verified multi-arch index digest. Added an explicit pull before setup because generated launchers use --pull=never; setup alone does not download the image. | [Verbatim excerpts](#item-3) |
| 4 [should] Lab legend | **applied with changes** | Split the legend and three caveats. The proposed “not run against a real appliance” is inaccurate for attempted requests returning 403/500/302; retained “not lab-validated, including blocked or failed checks.” All eleven data rows and counts are unchanged. | [Verbatim excerpts](#item-4) |
| 5 [should] Section order | **applied** | Install now follows the nav, followed immediately by the three recordings. All recordings remain inline. | [Verbatim excerpts](#item-5) |
| 6 [should] GIF captions | **applied with changes** | Clarified non-echoed input, the npx fixed-copy step, live paced output and scripted Decline. Limited “nothing reaches the appliance” to no write, to avoid implying an absence of all network traffic. GIF bytes are unchanged. | [Verbatim excerpts](#item-6) |
| 7 [should] Spanish links | **applied** | All nine client badges use the Spanish guide; primary navigation and documentation links identify the requested English-only destinations. Node and MCP badges now use Spanish guides too. | [Verbatim excerpts](#item-7) |
| 8 [nice] Hero badges | **applied with changes** | Removed both pending OpenSSF badges, retained their policy in releases.md, and added a live release badge. It links to the release listing so future badge values keep a matching destination; installation stays pinned to 1.1.0. | [Verbatim excerpts](#item-8) |
| 9 [nice] Critical-path caption | **applied** | Added the requested critical-action scope above each unchanged Mermaid diagram. | [Verbatim excerpts](#item-9) |
| 10 [nice] Spanish wording | **applied** | Removed the English parenthetical, preserving and emphasizing all three deployment-assessment requirements. The tagline remains unchanged. | [Verbatim excerpts](#item-10) |
| 11 [nice] GIF title banners | **declined** | Deferred to the next recording revision, as the reviewer recommends. Re-recording is not justified by this text review alone; no claim was made that the existing first frames have changed. | [Verbatim excerpts](#item-11) |
| 12 [nice] Release-commit Docker gates | **applied with changes** | Linked the successful release-commit CI run directly and named f95e798. Replaced the relative “later installer” wording with a separate dated installer-evidence link. | [Verbatim excerpts](#item-12) |
| Outside README: docs/releases.md | **applied** | Added verified publication status, available CI/owner/asset evidence and current badge policy. Retained the missing-runtime-scan caveat and source-built versus published-image distinction. | [Verbatim excerpts](#outside-readme) |
| Outside README: CHANGELOG.md / SECURITY.md | **declined** | These root files are outside the requested README + docs/ paths. Their stale publication labels remain for the owning release/security-documentation pass. | [Verbatim excerpts](#outside-readme) |
| Outside README: wizard preset wording | **declined** | The source change is outside docs/ and would reopen runtime/release pins. The reviewer assigns it to the next release; the GIF and runtime are unchanged. | [Verbatim excerpts](#outside-readme) |
| Owner decision: variant B hero | **applied** | Selected EN/ES desktop and mobile B sources without changing alt text; retained the four previous heroes, indexed them as 0 — previous hero, recorded the date/rationale and rendered the selected mobile SVG at 600 px. | [Verbatim excerpts](#owner-decision) |

The excerpts below are copied from the edited files, including their original link paths. Paths inside code fences are relative to the source file, not this response.

## Item 1


**EN**

````markdown
All three paths ship 1.1.0: npm (with provenance), the `.mcpb` on the [v1.1.0 release](https://github.com/nuoframework/darktrace-mcp/releases/tag/v1.1.0) and the ghcr image. Prefer to build from source? See the [fallback](docs/getting-started.md#fallback-build-from-source).

Open source under [Apache-2.0](LICENSE). [Contributions](CONTRIBUTING.md) are welcome. Where each version is published, and how to verify it: [Releases](docs/releases.md).
````


**ES**

````markdown
Las tres vías ya distribuyen 1.1.0: npm (con procedencia firmada), el `.mcpb` de la [release v1.1.0](https://github.com/nuoframework/darktrace-mcp/releases/tag/v1.1.0) y la imagen en ghcr. ¿Prefieres compilar desde el código? Consulta la [alternativa](docs/es/getting-started.md#alternativa-compilar-desde-el-código-fuente).

Código abierto bajo [Apache-2.0](LICENSE). Consulta cómo [contribuir](CONTRIBUTING.md). Dónde se publica cada versión y cómo verificarla: [Versiones (EN)](docs/releases.md).
````

## Item 2


**EN**

````markdown
## Install

You need **Node.js 22+**, your appliance URL (`https://…`) and a public/private API token pair (Darktrace: **System Config → Settings → API Token**).

```sh
npx -y @nuoframework/darktrace-mcp@1.1.0 setup
```

Choose `read`, then pick your clients. The wizard verifies TLS and the tokens with a signed request, stores the tokens in owner-only files on macOS/Linux, and backs up existing client configs before updating them. [Full guide](docs/getting-started.md).

`npx` is a one-time bootstrap. The wizard installs a fixed copy and gives clients absolute Node + `dist/src/index.js` paths. Native Windows cannot protect token files: use [.mcpb, Docker or WSL](docs/getting-started.md#windows). [Full installation guide](docs/getting-started.md).

- **Claude Desktop:** download `darktrace-mcp-1.1.0.mcpb` from the [v1.1.0 release](https://github.com/nuoframework/darktrace-mcp/releases/tag/v1.1.0) and open it; tokens go to the OS keychain.
- **Docker:** with Docker installed, pull the pinned image first, then run the wizard. Client launchers use `--pull=never`.
````


**ES**

````markdown
## Instalación

Necesitas **Node.js 22+**, la URL del appliance (`https://…`) y el par de tokens API público/privado (Darktrace: **System Config → Settings → API Token**).

```sh
npx -y @nuoframework/darktrace-mcp@1.1.0 setup
```

Elige `read` y después tus clientes. El asistente comprueba TLS y los tokens con una petición firmada, guarda los tokens en archivos de solo propietario en macOS/Linux y hace una copia de seguridad de las configuraciones existentes antes de actualizarlas. [Guía completa](docs/es/getting-started.md).

`npx` solo se usa para instalar. El asistente copia una versión fija y configura los clientes con rutas absolutas a Node y `dist/src/index.js`. Windows nativo no puede proteger los archivos de tokens: usa [.mcpb, Docker o WSL](docs/es/getting-started.md#windows). [Guía completa](docs/es/getting-started.md).

- **Claude Desktop:** descarga `darktrace-mcp-1.1.0.mcpb` de la [release v1.1.0](https://github.com/nuoframework/darktrace-mcp/releases/tag/v1.1.0) y ábrelo; los tokens van al llavero del sistema.
- **Docker:** con Docker instalado, descarga primero la imagen fijada y después ejecuta el asistente. Los lanzadores de los clientes usan `--pull=never`.
````

## Item 3


**EN**

````markdown
- **Docker:** with Docker installed, pull the pinned image first, then run the wizard. Client launchers use `--pull=never`.

```sh
docker pull ghcr.io/nuoframework/darktrace-mcp@sha256:dd79adb2dfe78134fa9721508a1f46776ed1736158dcf0b7f54e1dd0bca2d511
npx -y @nuoframework/darktrace-mcp@1.1.0 setup --runtime docker \
  --image ghcr.io/nuoframework/darktrace-mcp@sha256:dd79adb2dfe78134fa9721508a1f46776ed1736158dcf0b7f54e1dd0bca2d511
```

Multi-arch image (linux/amd64, linux/arm64), pinned by its index digest. Use the digest, not the mutable `1.1.0` tag, in client configuration. [Docker guide](docs/docker.md).
````


**ES**

````markdown
- **Docker:** con Docker instalado, descarga primero la imagen fijada y después ejecuta el asistente. Los lanzadores de los clientes usan `--pull=never`.

```sh
docker pull ghcr.io/nuoframework/darktrace-mcp@sha256:dd79adb2dfe78134fa9721508a1f46776ed1736158dcf0b7f54e1dd0bca2d511
npx -y @nuoframework/darktrace-mcp@1.1.0 setup --runtime docker \
  --image ghcr.io/nuoframework/darktrace-mcp@sha256:dd79adb2dfe78134fa9721508a1f46776ed1736158dcf0b7f54e1dd0bca2d511
```

Imagen multiarquitectura (linux/amd64, linux/arm64), fijada por el digest del índice. Usa el digest, no la etiqueta variable `1.1.0`, en la configuración del cliente. [Guía Docker (EN)](docs/docker.md).
````

## Item 4


**EN**

````markdown
| Area | Tools / ops | Examples | Profiles | Lab evidence |

**✓** lab evidence on Darktrace 7.1.0 · **◐** partial evidence (the [tool reference](docs/tools.md) states what was covered) · **—** not lab-validated, including blocked or failed checks.

- 56 of 77 operations have lab evidence, 11 of them partial. Most write evidence predates the final write controls; only a few writes were re-checked afterwards.
- All 13 Darktrace/Email reads are unvalidated (the lab token got HTTP 403). The email download returns size and SHA-256 only.
- Not available: the Darktrace/Email action (excluded) and the deprecated `GET /aianalyst/incidents`.
````


**ES**

````markdown
| Área | Herram. / ops | Ejemplos | Perfiles | Evidencia de laboratorio |

**✓** evidencia en un laboratorio Darktrace 7.1.0 · **◐** evidencia parcial (la [referencia de herramientas (EN)](docs/tools.md) indica qué se cubrió) · **—** sin validar en laboratorio, incluidas las pruebas bloqueadas o fallidas.

- 56 de 77 operaciones tienen evidencia de laboratorio, 11 de ellas parcial. La mayoría de la evidencia de escritura es anterior a los controles finales; solo unas pocas escrituras se volvieron a comprobar después.
- Las 13 lecturas de Darktrace/Email están sin validar (el token del laboratorio recibió HTTP 403). La descarga de correo solo devuelve tamaño y SHA-256.
- No disponibles: la acción de Darktrace/Email (excluida) y el obsoleto `GET /aianalyst/incidents`.
````

## Item 5


**EN**

````markdown
## Install
## See it work
## Compatible clients
## What you can do
## Safety by design
## How it was validated
## Documentation and contributing
## Trademarks and contact
````


**ES**

````markdown
## Instalación
## Mira cómo funciona
## Clientes compatibles
## Qué puedes hacer
## Seguridad desde el diseño
## Cómo se ha validado
## Documentación y contribuciones
## Marcas y contacto
````

## Item 6


**EN**

````markdown
**1 · Connect once.** Type the appliance URL and both tokens (input is not echoed), pick `read`, then choose a client. The wizard verifies TLS and the tokens with a signed request and lists what it wrote. Recorded from a source checkout; `npx` adds a fixed-copy installation step.

**2 · Ask an analyst question.** Claude Code calls the device and model-breach tools, then suggests what to inspect next. Real output from a non-interactive `claude -p` run, paced for reading; the answer is not canned.

**3 · Keep control of critical actions.** Preview, then confirm, then Claude Code's native approval dialog, where a scripted keypress selects **Decline**. The server refuses the action; no write reaches the appliance. Startup and waits are cut.
````


**ES**

````markdown
**1 · Conecta una vez.** Escribe la URL del appliance y los dos tokens (no se muestran al teclear), elige `read` y un cliente. El asistente verifica TLS y los tokens con una petición firmada y lista lo que ha escrito. Grabado desde el código fuente; `npx` añade la instalación de una copia fija.

**2 · Haz una pregunta de analista.** Claude Code llama a las herramientas de dispositivos y model breaches y propone qué revisar después. Salida real de una ejecución no interactiva (`claude -p`), con un ritmo ajustado para leerla; la respuesta no está preparada de antemano.

**3 · Mantén el control de las acciones críticas.** Vista previa, confirmación y el diálogo nativo de aprobación de Claude Code, donde una pulsación programada elige **Decline** (rechazar). El servidor deniega la acción; no se envía ninguna escritura al appliance. Se recortan el arranque y las esperas.
````

## Item 7


**ES**

````markdown
[Primeros pasos](docs/es/getting-started.md) · [Herramientas (EN)](docs/tools.md) · [Configuración](docs/es/configuration.md) · [Seguridad (EN)](docs/security.md) · [Solución de problemas](docs/es/troubleshooting.md)

El asistente configura estos clientes; cada insignia enlaza a su guía. Los diálogos de aprobación dependen del cliente y del protocolo. [Aprobación de acciones críticas](docs/es/clients.md#claude-code).

[![Claude Desktop](https://img.shields.io/badge/Claude%20Desktop-D97757?style=flat-square&logo=anthropic&logoColor=white)](docs/es/clients.md#claude-desktop)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-D97757?style=flat-square&logo=anthropic&logoColor=white)](docs/es/clients.md#claude-code)
[![Codex](https://img.shields.io/badge/Codex-412991?style=flat-square)](docs/es/clients.md#codex)
[![Cursor](https://img.shields.io/badge/Cursor-111111?style=flat-square&logo=cursor&logoColor=white)](docs/es/clients.md#cursor)
[![VS Code](https://img.shields.io/badge/VS%20Code-007ACC?style=flat-square)](docs/es/clients.md#vs-code)
[![Windsurf](https://img.shields.io/badge/Windsurf-087F8C?style=flat-square&logo=windsurf&logoColor=white)](docs/es/clients.md#windsurf)
[![OpenCode](https://img.shields.io/badge/OpenCode-222222?style=flat-square&logo=opencode&logoColor=white)](docs/es/clients.md#opencode)
[![Gemini CLI](https://img.shields.io/badge/Gemini%20CLI-4285F4?style=flat-square&logo=googlegemini&logoColor=white)](docs/es/clients.md#gemini-cli)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)](docs/es/clients.md#docker)

## Documentación y contribuciones

[Primeros pasos](docs/es/getting-started.md) · [Clientes](docs/es/clients.md) · [Herramientas (EN)](docs/tools.md) · [Configuración](docs/es/configuration.md) · [Docker (EN)](docs/docker.md) · [Arquitectura (EN)](docs/architecture.md) · [Solución de problemas](docs/es/troubleshooting.md) · [Versiones (EN)](docs/releases.md) · [Cambios](CHANGELOG.md)

Código abierto bajo [Apache-2.0](LICENSE). Consulta cómo [contribuir](CONTRIBUTING.md). Dónde se publica cada versión y cómo verificarla: [Versiones (EN)](docs/releases.md).


[![Node.js 22+](https://img.shields.io/badge/node-22%2B-339933?logo=nodedotjs&logoColor=white)](docs/es/getting-started.md)
[![MCP 2026-07-28](https://img.shields.io/badge/MCP-2026--07--28-7C3AED)](docs/es/configuration.md#aprobación-humana)
````

## Item 8


**EN**

````markdown
[![Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-2563EB)](LICENSE)
[![Node.js 22+](https://img.shields.io/badge/node-22%2B-339933?logo=nodedotjs&logoColor=white)](docs/getting-started.md)
[![MCP 2026-07-28](https://img.shields.io/badge/MCP-2026--07--28-7C3AED)](docs/configuration.md#human-approval)
[![CI](https://github.com/nuoframework/darktrace-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/nuoframework/darktrace-mcp/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@nuoframework/darktrace-mcp)](docs/releases.md#distribution-channels-110-and-later)
[![Release](https://img.shields.io/github/v/release/nuoframework/darktrace-mcp?display_name=tag)](https://github.com/nuoframework/darktrace-mcp/releases)
````


**ES**

````markdown
[![Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-2563EB)](LICENSE)
[![Node.js 22+](https://img.shields.io/badge/node-22%2B-339933?logo=nodedotjs&logoColor=white)](docs/es/getting-started.md)
[![MCP 2026-07-28](https://img.shields.io/badge/MCP-2026--07--28-7C3AED)](docs/es/configuration.md#aprobación-humana)
[![CI](https://github.com/nuoframework/darktrace-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/nuoframework/darktrace-mcp/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@nuoframework/darktrace-mcp)](docs/releases.md#distribution-channels-110-and-later)
[![Release](https://img.shields.io/github/v/release/nuoframework/darktrace-mcp?display_name=tag)](https://github.com/nuoframework/darktrace-mcp/releases)
````

## Item 9


**EN**

````markdown
Critical actions (Antigena, intel feed, subnets, tag deletion) follow this path. Ordinary writes skip the preview unless you ask for one.
````


**ES**

````markdown
Las acciones críticas (Antigena, intel feed, subredes, borrado de etiquetas) siguen este camino. Las escrituras ordinarias omiten la vista previa salvo que la pidas.
````

## Item 10


**ES**

````markdown
> **Los datos salen de tu red.** Los resultados llegan al cliente MCP y al proveedor del modelo, incluidos PCAP en Base64 y metadatos de correo. Evalúa la **idoneidad del proveedor, la retención y la residencia de los datos** antes de conectar un appliance de producción.
````

## Item 11

No replacement text or image frames. The existing recording titles/first frames remain unchanged; the exact, newly honest captions are under item 6.

## Item 12


**EN**

````markdown
- [Two Darktrace 7.1.0 labs](docs/security/final-lab-campaign-1.1.0.md), with narrower coverage than the offline suites; [Docker gates on arm64 and amd64](https://github.com/nuoframework/darktrace-mcp/actions/runs/37497433186) at release commit `f95e798`. Installer validation also has [separate pins](docs/security/release-pins-1.1.0.md#update-after-the-installer-date-format-probe-2026-10-06-later).
````


**ES**

````markdown
- [Dos laboratorios Darktrace 7.1.0](docs/security/final-lab-campaign-1.1.0.md), con menor cobertura que las pruebas offline; [comprobaciones Docker en arm64 y amd64](https://github.com/nuoframework/darktrace-mcp/actions/runs/37497433186) en el commit de la versión `f95e798`. La validación del instalador también tiene [sus propios registros (EN)](docs/security/release-pins-1.1.0.md#update-after-the-installer-date-format-probe-2026-10-06-later).
````

## Outside README


**docs/releases.md — publication**

````markdown
## Published 1.1.0 (2026-10-06)

Version 1.1.0 is published on [npm with a provenance attestation](https://registry.npmjs.org/@nuoframework%2fdarktrace-mcp/1.1.0), in ghcr, and as the [v1.1.0 GitHub Release](https://github.com/nuoframework/darktrace-mcp/releases/tag/v1.1.0). The release includes the `.mcpb`, npm tarball, `SHA256SUMS`, runtime SBOM and evidence files. Publication status was checked on 2026-10-06; the dated gate reviews below retain their original scope and findings.

The ghcr index digest is `sha256:dd79adb2dfe78134fa9721508a1f46776ed1736158dcf0b7f54e1dd0bca2d511`, with linux/amd64 and linux/arm64 manifests. Use `ghcr.io/nuoframework/darktrace-mcp@sha256:dd79adb2dfe78134fa9721508a1f46776ed1736158dcf0b7f54e1dd0bca2d511` for pulls and client configuration; per-platform image IDs are not interchangeable with registry manifest digests.
````


**docs/releases.md — evidence**

````markdown
Additional available evidence:

| Evidence | Record | Scope |
|---|---|---|
| Release-commit CI | [Run 37497433186](https://github.com/nuoframework/darktrace-mcp/actions/runs/37497433186), commit `f95e798bf3ed3f0dcedb91ff86e84849f1b12acb` | Node 22 and 24 offline jobs, lint, and native Docker jobs on amd64 and arm64 all succeeded |
| Residual-risk decisions | [Owner decisions, 2026-10-06](security/owner-decisions-1.1.0.md) | Recorded acceptance of specific residuals; acceptance does not remove them |
| Published assets | [v1.1.0 release](https://github.com/nuoframework/darktrace-mcp/releases/tag/v1.1.0) | `.mcpb`, tarball, `SHA256SUMS`, SBOM and evidence files |

A vulnerability scan of the 1.1.0 runtime is still not recorded here. CI is evidence for the source-built images it tested; the published ghcr images are rebuilt separately. The [known limitations](../CHANGELOG.md#known-limitations-in-110) remain disclosed in the release notes.
````


**docs/releases.md — badge policy**

````markdown
## OpenSSF badge placeholders

OpenSSF badges are omitted from both READMEs until a public Scorecard result and a Best Practices project record exist. The former **OpenSSF Scorecard: pending** and **OpenSSF Best Practices: pending** labels were static placeholders, not scores, registrations or certifications. Add badges only with links to the project's public evidence. No numeric score or passing level is claimed.

The npm version and GitHub Release badges use live data from Shields.io. Version 1.1.0 is published in both channels. The CI badge links to `ci.yml`; its latest status does not replace the commit-specific release receipts above.

Client badge logos were checked against the [Simple Icons catalog](https://simpleicons.org) and its [slug list](https://github.com/simple-icons/simple-icons/blob/develop/slugs.md) on 2026-10-06: `anthropic`, `cursor`, `windsurf`, `opencode`, `googlegemini`, `docker`. Codex and VS Code use plain badges because `openai` and `visualstudiocode` are absent from that catalog snapshot. The runtime badge uses `nodedotjs`. Names/logos state compatibility only, not endorsement.
````

The remaining root/source items have **no replacement text** in this pass. Their exact unchanged labels are:


**CHANGELOG.md**

````markdown
## 1.1.0 — prepared 2026-10-06 (not yet published)
````


**SECURITY.md**

````markdown
| 1.1.0 (candidate, not yet published) | Full API surface behind operator-chosen profiles (`read`, `sensitive`, `write`, `critical`): 77 executable operations in 50 tools. The Darktrace/Email action is excluded and the deprecated `GET /aianalyst/incidents` is not available. 56 operations have Darktrace 7.1.0 lab evidence, 11 of them only partial; email reads are not lab-validated. See [known limitations](CHANGELOG.md#known-limitations-in-110) |
````

The source preset still describes “email content”; this mismatch is tracked here for the next release rather than silently changing runtime inputs or re-recording the GIF.

## Owner decision


**EN — exact picture markup**

````markdown
<picture>
  <source media="(max-width: 600px)" srcset="docs/assets/banner-variants/b/readme-banner-en-mobile.svg">
  <img src="docs/assets/banner-variants/b/readme-banner-en.svg" width="1280" alt="Darktrace MCP — Unofficial MCP. Developed by an independent third party, unaffiliated with Darktrace and without authorization from Darktrace. The footer shows the official Darktrace logo, labeled as an independent third-party project; logo use does not imply authorization or official status.">
</picture>
````


**ES — exact picture markup**

````markdown
<picture>
  <source media="(max-width: 600px)" srcset="docs/assets/banner-variants/b/readme-banner-es-mobile.svg">
  <img src="docs/assets/banner-variants/b/readme-banner-es.svg" width="1280" alt="Darktrace MCP — MCP no oficial. Desarrollado por un tercero ajeno a Darktrace, sin afiliación ni autorización de Darktrace. El pie muestra el logotipo oficial de Darktrace, etiquetado como proyecto independiente de un tercero; su uso no implica autorización ni carácter oficial.">
</picture>
````


**docs/assets/banner-variants/README.md — selected status and previous hero**

````markdown
**Selected: B — Network / Red**, by owner decision on 2026-10-06. Both READMEs now use its desktop and mobile SVGs; the other alternatives and previous hero remain available for comparison.

## 0 — previous hero

The original Trace composition is retained unchanged: desktop [EN](../readme-banner-en.svg) / [ES](../readme-banner-es.svg), mobile [EN](../readme-banner-en-mobile.svg) / [ES](../readme-banner-es-mobile.svg).
````


**docs/visual-identity.md — dated decision**

````markdown
## Selected hero: variant B (2026-10-06)

On **2026-10-06**, the owner selected **B — Network / Red** from the [banner alternatives](assets/banner-variants/README.md). The light title panel preserves the current editorial hierarchy while the subtle Blurple node-link pattern and radar rings suggest investigation. The graph is original decorative artwork, not an appliance topology or the official Trace. This replaces the previous flowing Trace illustration; it adds no endorsement or compatibility claim.

- Desktop: [English](assets/banner-variants/b/readme-banner-en.svg) and [Spanish](assets/banner-variants/b/readme-banner-es.svg), **1280 × 600**.
- Mobile: [English](assets/banner-variants/b/readme-banner-en-mobile.svg) and [Spanish](assets/banner-variants/b/readme-banner-es-mobile.svg), **640 × 900**; the existing `max-width: 600px` picture breakpoint is unchanged.
- [Mobile PNG at 600 px](assets/banner-variants/preview/b-en-mobile.png), rendered for this revision. The 343 px renders were also inspected for readable title, body copy and independence captions.
- The original four [desktop](assets/readme-banner-en.svg) / [mobile](assets/readme-banner-en-mobile.svg) banners remain unchanged, with their [Spanish desktop](assets/readme-banner-es.svg) / [Spanish mobile](assets/readme-banner-es-mobile.svg) equivalents, indexed as **0 — previous hero**.

The white official wordmark path elements remain byte-for-byte identical to `Darktrace-white.svg`, uniformly scaled by `0.48` to 288 canvas units on a solid DT Dark footer. One D width is 30.24 units; that clear space is preserved on every side. The mark renders at 135 px at the 601 px desktop breakpoint, 154 px at a 343 px mobile width, and 270 px at 600 px mobile width, above the 127 px minimum. The project title remains separate from the wordmark, and the independence caption stays directly above it.

The palette remains DT Dark (`#030D11`), white, DT Orange (`#FF6B00`), DT M Gray (`#B6B6B6`) and Blurple (`#4B00D7`). The graph introduces no new brand colors. Typography retains the system stacks, regular weight and tight headline/body tracking described below. SVGs have no external fonts or image references. The selected SVGs are under 35 KB each; the PNG previews are palette-optimized derivatives. Full unofficial-status alt text, the notice below each README title, and the trademark/contact sections are unchanged.

The following reference comparisons document the **previous hero** and its original brand review. They remain as historical design evidence, rather than describing the newly selected graph artwork.
````

## Validation

- Preserved by exact comparison: both taglines, unofficial-status lines, hero alt text, eleven area-table data rows, eight safety bullets, Mermaid diagrams, and trademark/contact sections. The requested Spanish egress wording changes no deployment requirement. GIFs, official logo files and all four previous hero SVGs are byte-for-byte unchanged.
- `python3 scripts/demo/verify.py`: passed; 150 local links/anchors and all three GIF size/frame/duration limits.
- `node scripts/validate-examples.mjs`: passed; 9 JSON examples, 1 TOML example and 8 documents; syntax and launch policy valid. Documented commands were not executed by this check.
- Changed-document link check: **237 local links, anchors and picture sources passed** across both READMEs, releases, visual identity, the banner index and this response. Fenced verbatim excerpts are not treated as hyperlinks.
- External README link check: **19 URLs returned HTTP 200**. The illustrative inline `https://…` text is not a hyperlink and is excluded; the earlier broad URL scan incorrectly treated it as one.
- Selected mobile preview: **600 × 844 px**, **62,522 bytes**. Visually inspected at 600 px; the title, supporting text, independence caption and wordmark are legible. SVG source remains 640 × 900, with the existing picture breakpoint and no external fonts.
- `git diff --check`: passed.
