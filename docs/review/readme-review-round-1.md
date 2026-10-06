# README review, round 1

Independent review of `README.md` and `README.es.md` on the `docs/readme-pro` branch (PR #5), with the three recordings under `docs/assets/demo/`. Reviewer stance: a security engineer who gives this repository two minutes on GitHub before deciding whether to install it.

| | |
|---|---|
| Date | 2026-10-06 |
| Files reviewed | `README.md`, `README.es.md`, `docs/assets/demo/{setup,analyst,approval}.gif` (frames sampled with ffmpeg) |
| Evidence compared against | `docs/tools.md`, `docs/CHANGES-docs.md`, `docs/security/final-gate-review-1.1.0.md`, `docs/security/owner-decisions-1.1.0.md`, `docs/security/final-lab-campaign-1.1.0.md`, `docs/security/release-pins-1.1.0.md`, `CHANGELOG.md`, `scripts/demo/README.md` |
| Live state checked | npm `@nuoframework/darktrace-mcp@1.1.0` is published with a SLSA provenance attestation; `ghcr.io/nuoframework/darktrace-mcp:1.1.0` resolves to index digest `sha256:dd79adb2dfe78134fa9721508a1f46776ed1736158dcf0b7f54e1dd0bca2d511` (linux/amd64 + linux/arm64); GitHub Release `v1.1.0` is published (not draft) with the `.mcpb`, tarball, `SHA256SUMS`, SBOM and evidence files; the Shields npm badge returns HTTP 200 |
| Checks run | `python3 scripts/demo/verify.py`: all three GIFs within limits, 151 local links and anchors pass |

## Verdict: CHANGES REQUESTED

The content is accurate and unusually honest. Every number in the area table matches `docs/tools.md` row by row (50 tools, 77 operations, 45 / 11 / 21 lab flags, per-area tool and operation counts, profiles per area). The profile counts (38 / 18 / 16 / 5), the write limits (10 per minute, 3 critical), the 5-minute single-use `previewId`, the 45 KB PCAP ceiling, the audit scope, the email-download behaviour, the test pins (230 / 1,150, three macOS skips) and the residual-risk wording all match their sources. I found no claim that exceeds the evidence.

What blocks approval is narrower: the README still describes 1.1.0 as unpublished in three places, and the install section does not tell a newcomer what to run first. Both are quick fixes. The rest below is polish, ordered by impact.

## Items

### 1. [must] Remove the "when published" wording: npm, ghcr and the GitHub Release are live

The package, image and release exist now, so the hedges read as either stale or as a sign that the author does not know the state of their own release. Three places in each README.

**EN, line 20 (HTML comment above the npm badge).** Current:

```
<!-- npm badge will 404 until the package is published. No publication claim is made here. -->
```

Proposed: delete the line. The badge now renders `1.1.0`.

**EN, line 43.** Current:

> These 1.1.0 distribution paths become available when the release is published; see [release status and source-install fallback](docs/getting-started.md).

Proposed:

> All three paths ship 1.1.0 today: npm (with provenance), the `.mcpb` on the [v1.1.0 release](https://github.com/nuoframework/darktrace-mcp/releases/tag/v1.1.0) and the ghcr image. Prefer to build from source? See the [fallback](docs/getting-started.md#fallback-build-from-source).

**EN, line 150.** Current:

> Distribution channels are described in [Releases](docs/releases.md); availability follows publication of each version.

Proposed:

> Where each version is published, and how to verify it: [Releases](docs/releases.md).

**ES, line 20.** Same comment, delete.

**ES, line 43.** Current:

> Estas vías de distribución de 1.1.0 estarán disponibles cuando se publique la versión; consulta el [estado y la instalación desde el código](docs/es/getting-started.md).

Proposed:

> Las tres vías ya distribuyen 1.1.0: npm (con procedencia firmada), el `.mcpb` de la [release v1.1.0](https://github.com/nuoframework/darktrace-mcp/releases/tag/v1.1.0) y la imagen en ghcr. ¿Prefieres compilar desde el código? Consulta la [alternativa](docs/es/getting-started.md#alternativa-compilar-desde-el-código-fuente).

**ES, line 150.** Current:

> Los canales de distribución se detallan en [Releases](docs/releases.md); cada versión estará disponible tras su publicación.

Proposed:

> Dónde se publica cada versión y cómo verificarla: [Releases](docs/releases.md).

### 2. [must] Make the first command unmistakable

Today the install section opens with a sentence of prerequisites in jargon ("HTTPS origin and API token pair"), then a three-column HTML table where the `npx` command is split over three lines with backslashes and sits beside two alternatives of equal visual weight. A newcomer has to decide between three paths before running anything. Lead with one fenced command, then offer the alternatives.

Also, "Install in 60 seconds" contradicts `docs/getting-started.md`, which says "about ten minutes". Pick the honest one.

**EN, lines 41–63.** Current heading and lead:

> ## Install in 60 seconds
>
> Have your appliance's HTTPS origin and API token pair ready. The wizard needs **Node.js 22+**. These 1.1.0 distribution paths become available when the release is published; see [release status and source-install fallback](docs/getting-started.md).

Proposed (replace heading, lead and the table's first column; keep the `.mcpb` and Docker columns as a two-column "Other ways" table below, or as two short bullets):

> ## Install
>
> You need **Node.js 22+**, your appliance URL (`https://…`) and a public/private API token pair (Darktrace: **System Config → Settings → API Token**).
>
> ```sh
> npx -y @nuoframework/darktrace-mcp@1.1.0 setup
> ```
>
> Choose `read`, then pick your clients. The wizard verifies TLS and the tokens with a signed request, stores the tokens in owner-only files and writes each client's config with a backup. [Full guide](docs/getting-started.md).
>
> **Other ways.** Claude Desktop: download `darktrace-mcp-1.1.0.mcpb` from the [v1.1.0 release](https://github.com/nuoframework/darktrace-mcp/releases/tag/v1.1.0) and open it; tokens go to the OS keychain. Docker: see item 3.

**ES, lines 41–63.** Proposed:

> ## Instalación
>
> Necesitas **Node.js 22+**, la URL del appliance (`https://…`) y el par de tokens API público/privado (Darktrace: **System Config → Settings → API Token**).
>
> ```sh
> npx -y @nuoframework/darktrace-mcp@1.1.0 setup
> ```
>
> Elige `read` y después tus clientes. El asistente comprueba TLS y los tokens con una petición firmada, guarda los tokens en archivos de solo propietario y escribe la configuración de cada cliente con copia de seguridad. [Guía completa](docs/es/getting-started.md).
>
> **Otras vías.** Claude Desktop: descarga `darktrace-mcp-1.1.0.mcpb` de la [release v1.1.0](https://github.com/nuoframework/darktrace-mcp/releases/tag/v1.1.0) y ábrelo; los tokens van al llavero del sistema. Docker: véase el punto 3.

Keep the existing paragraph about `npx` being a one-time bootstrap and the Windows warning; both are correct and useful.

### 3. [should] Docker: give the digest now that it exists

The README tells readers to "resolve the digest" themselves. The digest is known and recorded in the release notes, and `docs/clients.md#docker` already documents the wizard flag that pins it.

**EN, lines 57–62.** Current:

> `docker pull ghcr.io/nuoframework/darktrace-mcp:1.1.0`
> [Resolve the digest and run the Docker wizard](docs/clients.md#docker). Pin the digest, never the moving tag.

Proposed:

> ```sh
> npx -y @nuoframework/darktrace-mcp@1.1.0 setup --runtime docker \
>   --image ghcr.io/nuoframework/darktrace-mcp@sha256:dd79adb2dfe78134fa9721508a1f46776ed1736158dcf0b7f54e1dd0bca2d511
> ```
>
> Multi-arch image (linux/amd64, linux/arm64), pinned by digest. Never pin the `1.1.0` tag. [Docker guide](docs/docker.md).

**ES.** Same block; caption:

> Imagen multiarquitectura (linux/amd64, linux/arm64), fijada por digest. No fijes nunca la etiqueta `1.1.0`. [Guía Docker](docs/docker.md).

Use the index digest above (verified with `docker buildx imagetools inspect`). Do not copy the per-platform values from the release notes into the README; they are image IDs, not manifest digests, and a reader who passes them to `--image` will get a pull error.

### 4. [should] Untangle the lab-evidence paragraph under the table

The table is excellent. The paragraph after it packs seven facts and four numbers into five sentences, and the column header `Lab: ✓ / ◐ / —` is only explained afterwards. Move the legend into the header's footnote position and split the facts.

**EN, line 87 header cell.** Current: `Lab: ✓ / ◐ / —`. Proposed: `Lab evidence`, and put the legend as the first line below the table.

**EN, line 101.** Current:

> Counts come from [docs/tools.md](docs/tools.md). **✓** = lab evidence; **◐** = partial evidence; **—** = not lab-validated. 56 operations have evidence from the first 7.1.0 lab, including 11 partial. Most write evidence predates the final controls; see the per-operation limits and later lab checks there. All 13 Email reads remain unvalidated (403); email download returns size and SHA-256 only. The Email action is excluded and `GET /aianalyst/incidents` is unavailable.

Proposed:

> **✓** passed on a Darktrace 7.1.0 lab appliance · **◐** passed partially (the [tool reference](docs/tools.md) says what was covered) · **—** follows the API docs but was not run against a real appliance.
>
> - 56 of 77 operations have lab evidence, 11 of them partial. Most write evidence predates the final write controls; only a few writes were re-checked afterwards.
> - All 13 Darktrace/Email reads are unvalidated (the lab token got HTTP 403). The email download returns size and SHA-256 only.
> - Not available: the Darktrace/Email action (excluded) and the deprecated `GET /aianalyst/incidents`.

**ES, line 101.** Proposed:

> **✓** probada en un appliance Darktrace 7.1.0 de laboratorio · **◐** probada parcialmente (la [referencia de herramientas](docs/tools.md), en inglés, indica qué se cubrió) · **—** sigue la documentación de la API pero no se ejecutó contra un appliance real.
>
> - 56 de 77 operaciones tienen evidencia de laboratorio, 11 de ellas parcial. La mayoría de la evidencia de escritura es anterior a los controles finales; solo unas pocas escrituras se volvieron a comprobar después.
> - Las 13 lecturas de Darktrace/Email están sin validar (el token del laboratorio recibió HTTP 403). La descarga de correo solo devuelve tamaño y SHA-256.
> - No disponibles: la acción de Darktrace/Email (excluida) y el obsoleto `GET /aianalyst/incidents`.

### 5. [should] Put Install before the recordings

The three GIFs are each about 690 px tall. On a laptop the install command is three screens down, below ~1.2 MB of animation. The two-minute reader reads top-down: hero, then "what do I run". Move **Install** directly under the nav line and keep **See it work** right after it. The recordings lose nothing; they still appear before the tools table and the safety section.

If you prefer to keep the demos first, an alternative is to keep only recording 3 (the approval flow, the strongest trust signal) inline and wrap 1 and 2 in `<details>`. I recommend the reorder; it is simpler and the GIFs stay visible.

### 6. [should] Sharpen the three GIF captions

I sampled frames from all three recordings. They are readable, progressively typed, and match their captions. Three wording issues:

- Caption 1 says "hidden tokens", which reads as if the tokens are secret in some other sense. The frames show "Private token (hidden):", meaning the input is not echoed.
- The setup recording runs `node dist/src/index.js setup` from a source checkout and its first prompt is "How should clients start the server? 1) node (this checkout)". A reader following the README's `npx` path will see a slightly different first prompt. Say so in one clause.
- Caption 2's "formats actual headless client output" is insider vocabulary.
- Caption 3: the demo guide (`scripts/demo/README.md`) is careful to say the decline is scripted and is "protocol/UI evidence, not proof of an independent human decision". The README caption should carry that one word.

**EN, line 29.** Current:

> **1 · Connect once.** Enter the URL and hidden tokens, pick `read`, then choose a client. The wizard checks TLS/authentication and shows what it wrote.

Proposed:

> **1 · Connect once.** Type the appliance URL and both tokens (input is not echoed), pick `read`, then choose a client. The wizard verifies TLS and the tokens with a signed request and lists what it wrote. Recorded from a source checkout; the `npx` path shows the same wizard.

**EN, line 33.** Current:

> **2 · Ask an analyst question.** Claude Code calls the device and model-breach tools, then suggests what to inspect next. The recording formats actual headless client output.

Proposed:

> **2 · Ask an analyst question.** Claude Code calls the device and model-breach tools, then suggests what to inspect next. Real output from a non-interactive `claude -p` run, paced for reading; the answer is not canned.

**EN, line 37.** Current:

> **3 · Keep control of critical actions.** Preview → confirm → native Claude Code confirmation dialog → Decline. Startup and waiting time are omitted. No action executes.

Proposed:

> **3 · Keep control of critical actions.** Preview, then confirm, then Claude Code's native approval dialog, where a scripted keypress selects **Decline**. The server refuses and nothing reaches the appliance. Startup and waits are cut.

**ES, lines 29 / 33 / 37.** Proposed:

> **1 · Conecta una vez.** Escribe la URL del appliance y los dos tokens (no se muestran al teclear), elige `read` y un cliente. El asistente verifica TLS y los tokens con una petición firmada y lista lo que ha escrito. Grabado desde el código fuente; con `npx` verás el mismo asistente.

> **2 · Haz una pregunta de analista.** Claude Code llama a las herramientas de dispositivos y model breaches y propone qué revisar después. Salida real de una ejecución no interactiva (`claude -p`), ralentizada para leerla; la respuesta no está preparada de antemano.

> **3 · Mantén el control de las acciones críticas.** Vista previa, confirmación y el diálogo nativo de aprobación de Claude Code, donde una pulsación programada elige **Decline** (rechazar). El servidor deniega la acción y nada llega al appliance. Se recortan el arranque y las esperas.

### 7. [should] Spanish README: link the Spanish client guide and mark English-only targets

`docs/es/clients.md` exists with the same section anchors as the English guide (`#claude-desktop`, `#claude-code`, `#codex`, `#cursor`, `#vs-code`, `#windsurf`, `#opencode`, `#gemini-cli`, `#docker`), yet all nine badges in `README.es.md` link to the English file. Line 69 then apologises for it. Point the badges at `docs/es/clients.md#…` and drop the apology.

**ES, line 69.** Current:

> El asistente configura estos clientes; cada insignia enlaza a su guía (en inglés; [guía en español](docs/es/clients.md)). Los diálogos dependen del cliente y del protocolo.

Proposed:

> El asistente configura estos clientes; cada insignia enlaza a su guía. Los diálogos de aprobación dependen del cliente y del protocolo.

**ES, line 23 (nav).** `Herramientas` and `Seguridad` point to English-only files while the table note on line 101 does flag "(inglés)". Be consistent: either mark both in the nav (`[Herramientas (EN)](docs/tools.md)`, `[Seguridad (EN)](docs/security.md)`) or drop the marker everywhere. I would mark them; a Spanish reader clicking through to an English page should not be surprised.

Also line 148: `[Docker](docs/docker.md)`, `[Arquitectura](docs/architecture.md)`, `[Versiones](docs/releases.md)` are English-only; same treatment.

### 8. [nice] Trim the hero badges

Seven badges, two of which say "pending" in grey. For a security engineer, a "pending" OpenSSF badge is noise at best and a question mark at worst; `docs/releases.md` already explains the placeholders. Suggest: drop both placeholders from the README until a real result exists (keep the section in `releases.md`), and add a release badge now that v1.1.0 exists:

```
[![Release v1.1.0](https://img.shields.io/github/v/release/nuoframework/darktrace-mcp?display_name=tag)](https://github.com/nuoframework/darktrace-mcp/releases/tag/v1.1.0)
```

The badge row would then read: license · Node · MCP protocol · CI · npm · release. Six badges, all live data. Same change in both files.

### 9. [nice] Caption the flowchart as the critical path

The Mermaid diagram starts at "Profiles + target policy" and flows into "Critical preview", which implies every write takes that path. The first bullet below corrects this, but a reader scanning the picture will not reach it. Add one line above the code fence.

**EN, before line 114:**

> Critical actions (Antigena, intel feed, subnets, tag deletion) follow this path. Ordinary writes skip the preview unless you ask for one.

**ES:**

> Las acciones críticas (Antigena, intel feed, subredes, borrado de etiquetas) siguen este camino. Las escrituras ordinarias omiten la vista previa salvo que la pidas.

### 10. [nice] Spanish wording

**ES, line 135.** The bold English parenthetical inside a Spanish sentence looks like an untranslated leftover. Current:

> Evalúa la idoneidad del proveedor, la retención y la residencia (**provider eligibility, retention, residency**) antes de conectar un appliance de producción.

Proposed:

> Evalúa la **idoneidad del proveedor, la retención y la residencia de los datos** antes de conectar un appliance de producción.

**ES, line 12.** "Empieza en modo lectura y decide cuándo permitir cambios." is good; keep.

### 11. [nice] GIF first frames and title banners

The analyst recording opens with a title banner ("DARKTRACE MCP / 02 / INVESTIGATE · Synthetic local appliance · no production data"), which is exactly the right framing and reads as one visual system. The setup and approval recordings open on an almost empty terminal (`bash-3.2$ n`, `$ n`) for their first second, and that empty frame is what GitHub shows as the poster while the GIF loads or when the viewer has reduced motion enabled. When these are next re-recorded, give all three the same banner (01 / SETUP, 02 / INVESTIGATE, 03 / APPROVE). Not worth a re-record on its own.

### 12. [nice] Point "Docker gates" at the release commit

Line 143 links the Docker gate evidence to the CI closure section in `release-pins-1.1.0.md`, which records run 37476050725 at `5edc8fc`. The v1.1.0 release notes record a later green run at the release commit `f95e798` (run 37497433186, amd64 and arm64 both green). Linking the release-commit run is stronger evidence and makes "at the recorded commit" concrete. Either add that run to `release-pins-1.1.0.md` and keep the link, or link the release notes directly.

## Excellent, do not change

- **The tagline.** "Investigate your Darktrace appliance from your MCP client. Start read-only; choose when to allow changes." One sentence of value, one of posture. The Spanish is equally good.
- **The unofficial-status line** directly under the title, repeated in the banner alt text and in the trademark section. Clear, unapologetic, legally careful without being defensive.
- **The area table.** Eleven rows, every number traceable to `docs/tools.md`, profiles per area, lab flags per area. This is the best single artefact in the README and is exactly what a security engineer wants to see before anything else.
- **"Safety by design" bullets.** Each control is stated with its limit in the same breath ("The server cannot prove that a human answered"; "Sensitive reads are not audited"; "They do not guarantee removal of every sensitive field"). This is the opposite of fear-mongering and the opposite of marketing. Keep every caveat.
- **The egress callout.** Bold, short, names the three questions the deploying organisation must answer. Matches owner decision TM-17 word for word in spirit.
- **"How it was validated".** Dated evidence, named reviewers' documents, explicit "not a certification", explicit "no zero-CVE claim". Keep the sentence "Neither removes them."
- **Synthetic-mock disclosure** on the recordings, with a link to sources and a re-recording guide. Most projects would have shown these as if they were production.
- **"Try asking"** with the profile each prompt needs. Small, practical, teaches the profile model by example.
- **Windows warning** in the install section. Short and placed where it is needed.
- **Trademarks and contact.** Complete and proportionate.

## Outside the README, seen while checking it

Not part of this review's scope, but a reader who clicks through from the README will hit them within the two minutes:

- `CHANGELOG.md` line 3 still reads "1.1.0 — prepared 2026-10-06 (not yet published)". The README links it twice.
- `SECURITY.md` version table still says "1.1.0 (candidate, not yet published)".
- `docs/releases.md` line 34 still lists the published release assets, the owner decisions and the amd64 CI receipts under "Not yet available"; all three now exist.
- The setup wizard preset text visible in `setup.gif` ("read + sensitive: also Advanced Search, **email content**, PCAP download, audit events", `src/cli/entry.ts:9,16`) contradicts the README and `docs/tools.md`, which correctly say the email download returns size and digest only. Changing it is a `src/` edit and reopens the pins, so it belongs to the next release; the caption in item 6 does not depend on it.
