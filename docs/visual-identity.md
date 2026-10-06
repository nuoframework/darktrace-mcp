# Visual identity evidence

Unofficial MCP. Developed by an independent third party, unaffiliated with Darktrace and without authorization from Darktrace.

MCP no oficial. Desarrollado por un tercero ajeno a Darktrace, sin afiliación ni autorización de Darktrace.

Logo use does not imply authorization or official status. Complaints, trademark or branding claims: [contacto@pabloarrabal.com](mailto:contacto@pabloarrabal.com).

## References inspected

Public Brand Hub pages were fetched live on 2026-10-05 and the **actual linked reference images were viewed**, not only their text or color values. Official reference artwork was downloaded to a temporary review directory and is not redistributed; the only official files kept in the repository are the two unmodified logo files documented in [docs/assets/brand/darktrace/README.md](assets/brand/darktrace/README.md).

| Public source | Specific visual reference viewed | Decision in this adaptation |
|---|---|---|
| [Logo](https://brandhub.darktrace.com/visual-identity/logo) | [Clear space and 127 px minimum](https://cdn.prod.website-files.com/62e3de3c93a3f82e39b780db/668e53f447eac7eaee73130f_logo-space.jpg), [white on dark with Trace](https://cdn.prod.website-files.com/62e3de3c93a3f82e39b780db/668e5446d92a8331983eb750_logo-color-background-2.png), [dark on white/Glow/orange](https://cdn.prod.website-files.com/62e3de3c93a3f82e39b780db/668e544687c32e1a4a99e64b_logo-color-background.png), [don'ts](https://cdn.prod.website-files.com/62e3de3c93a3f82e39b780db/66b601649a7331380d4016c5_donts.webp), [co-branding formula](https://cdn.prod.website-files.com/62e3de3c93a3f82e39b780db/668e5446e12854c139b44eea_logo-cobranding.png), [hero](https://cdn.prod.website-files.com/62e3de3c93a3f82e39b780db/668e5345841a31675350b721_logo_hero.jpg) | Official white wordmark from the public SVG pack embedded verbatim in the dark footer; clear space of one "D" width; above minimum size at every README breakpoint; no co-branding lockup, no icon-only "D", no orange variant; captioned as independent and unaffiliated. |
| [Colors](https://brandhub.darktrace.com/visual-identity/colors) | [Dark type composition](https://cdn.prod.website-files.com/62e3de3c93a3f82e39b780db/669a83c626645ccec9210074_color-gradient-use_1.jpg) and [light composition with glow](https://cdn.prod.website-files.com/62e3de3c93a3f82e39b780db/669a83c6acf9901eb44ce498_color-gradient-use_2.jpg); palette table re-read | Unchanged: equal-width white and DT Dark (`#030D11`) panels; DT Orange (`#FF6B00`) accents; DT M Gray (`#B6B6B6`) rules; Sun, Hard Pink, Jewel and Blurple restricted to the illustration. Every value matches the published palette. |
| [Typography](https://brandhub.darktrace.com/visual-identity/typography) | [Layout elements](https://cdn.prod.website-files.com/62e3de3c93a3f82e39b780db/668d12cdffb8049b2c8cecd1_typography_layout-elements.jpg), [horizontal example](https://cdn.prod.website-files.com/62e3de3c93a3f82e39b780db/668d06f4ebb9bb2d6681ed17_grids_horizntal-layout-example.jpg); fallback and secondary-typeface sections re-read | Headline and body keep regular weight, -4 % and -2 % tracking. Font stack now follows the published fallback order (Manrope, then Arial); no font files are embedded and FK Grotesk is not used because it is licensed to Darktrace staff only. Eyebrow, metadata line and logo caption now use a monospace stack, matching the secondary mono typeface role ("eyebrows, running headers, text related to code"). Logo anchors the composition at the bottom, as element 07 of the layout reference shows. |
| [Trace](https://brandhub.darktrace.com/visual-identity/trace) | [Gestural applications](https://cdn.prod.website-files.com/62e3de3c93a3f82e39b780db/669115e65fccc42668a9f9dc_trace_gestural.jpg) and [learning context](https://cdn.prod.website-files.com/62e3de3c93a3f82e39b780db/669115e504fb327130875614_trace_context-1.jpg) | Unchanged original 17-path fan with glow and square endpoint pixels; decorative only. |
| [Illustrations](https://brandhub.darktrace.com/visual-identity/illustrations) | [Three gestural compositions](https://cdn.prod.website-files.com/62e3de3c93a3f82e39b780db/6697e3ea40fe5643dd60a4a0_illustrations_gestural.jpg) (viewed in the previous pass) | Unchanged. |

## Comparison against the official examples and changes made

| Aspect | Previous cover (commit `5b535e4`) | Official reference | Change and concrete reason |
|---|---|---|---|
| Logo | No official mark; project name typed in Arial only | Logo anchors compositions at top or bottom; white logo on DT Dark, optionally with the Trace, "extra mindful to maintain contrast" | Added the unmodified white wordmark at the bottom of the dark panel on a `.94` opacity DT Dark substrate so the Trace never crosses it. Requested explicitly by the owner; placement follows the layout rule. |
| Clear space | n/a | One "D" width on all sides; minimum 127 px | Measured "D" = 10.5 % of wordmark width. Desktop: 272 units wide on a 1280 canvas, 29-unit margin kept free (edge 40, rule 29, caption 50, bottom 20). Rendered 190 px at GitHub's 896 px column, 128 px at a 601 px viewport; mobile cover 146 px at 343 px. |
| Independence label | "INDEPENDENT INTEGRATION" line in the footer | Co-branding examples use a lockup with a 2 px divider; not applicable to an unaffiliated project | Replaced with a two-line caption directly above the wordmark: "INDEPENDENT THIRD-PARTY PROJECT / NOT AFFILIATED WITH OR AUTHORIZED BY DARKTRACE" (ES: "PROYECTO INDEPENDIENTE DE UN TERCERO / SIN AFILIACIÓN NI AUTORIZACIÓN DE DARKTRACE"). No lockup, no divider, project name kept as plain text away from the mark. |
| Eyebrow and metadata type | Arial | FK Grotesk Mono for eyebrows, running headers and code-related text, next to the Pixel | Switched those three lines to a monospace stack (`Menlo, Consolas, Liberation Mono, monospace`). Headline and taglines stay sans. |
| Sans font stack | `Arial, Helvetica` | Primary FK Grotesk (restricted licence); primary fallback Manrope; system fallback Arial | Stack is now `Manrope, Arial, Helvetica, sans-serif`. Viewers with Manrope installed get the published fallback; everyone else gets the same Arial render as before. Both renders were inspected; all lines fit at both widths. |
| Rules | Left and right footer rules at different heights | Rulers structure the layout | Right-panel rule aligned with the left-panel rule at the same height on desktop. |
| Palette, Trace, split layout, headline sizes, notices | As before | As before | Unchanged; already matched the references in the previous pass. |

The exact full notices remain native Markdown immediately below the cover and project heading in both languages, so they do not depend on the image.

## Composition and checks

Desktop cover 1280 × 600; mobile cover 640 × 900 (taller than before to hold the caption and logo with full clear space). The SVGs contain only local content: original artwork, text with system font stacks, and the official logo `path` elements copied byte-for-byte from `Darktrace-white.svg` under a uniform `scale(0.453333)`. No scripts, external references or embedded fonts. XML validity was checked with `xmllint`.

Both language variants were rasterized at **896 px** (desktop) and **343 px** (mobile) with Manrope available and with Arial forced, plus a 601 px desktop render to confirm the logo's minimum size at the breakpoint. A local HTML harness reproducing the README `picture` markup was also opened in a browser at 1280 px and 390 px viewports to confirm source selection and layout.

- [Desktop before/after comparison, EN and ES](assets/visual-review-desktop.png)
- [Mobile before/after comparison, EN and ES](assets/visual-review-mobile.png)

These are local renders, not screenshots of a published GitHub README; live GitHub sanitation still requires the publishing review. A renderer that ignores `picture` sources receives the desktop `img` fallback.

Documentation checks confirm unchanged technical body text, commands and counts, preserved language/navigation links, valid local targets and matching bilingual structure. No runtime, package, workflow, release or validation-status changes are part of this pass; the 7.1 lab target remains NOT VALIDATED.

## Diagrams and badges

This section sets rules for technical diagrams and README badges. It reuses the approved palette and does not add official artwork: diagrams and badges never contain the Darktrace logo, the Trace or illustrations.

### Palette roles

| Token | Value | Role in diagrams and badges | Contrast checked (WCAG) |
|---|---|---|---|
| DT Dark | `#030D11` | Server/process nodes, badge labels, outlines of neutral nodes | White text 19.6:1 |
| White | `#FFFFFF` | Text on DT Dark; fill of host and external nodes | Text DT Dark 19.6:1 |
| DT Orange | `#FF6B00` | Outline of server nodes; value side of fact badges | DT Dark text on orange 6.9:1; against GitHub dark background 6.6:1 |
| Blurple | `#4B00D7` | Allowed paths and external systems; value side of the evidence badge | White text 9.2:1 |
| Hard Pink | `#FF00D9` | Denied, preview-only and rejected paths (always dashed) | Against white 3.4:1, against GitHub dark 5.6:1 |
| Sun | `#FFA52F` | Status badge (private alpha) | DT Dark text 10.0:1 |
| DT M Gray | `#B6B6B6` | Badge border, so badges keep an edge on light and dark pages | Against GitHub dark 9.3:1 |

Jewel (`#6F0067`) stays in the cover illustration only.

### Diagram rules

- **Mermaid in Markdown, no exported images.** Diagrams stay text, diffable and in step with the source. Each one has `accTitle` and `accDescr`, so screen readers get a sentence instead of a shape list.
- **Color is never the only signal.** Every node and edge states its meaning in words. Denied and preview-only nodes are also dashed.
- **Compact.** At most about ten nodes and two-line labels per diagram. Use `flowchart TB` for chains and `flowchart LR` for decision fans, so branches stack vertically. Both stay readable in a narrow GitHub column and on phones. A diagram that grows past that is split.
- **Same classes everywhere:** `core` (DT Dark fill, orange outline, white text), `host` (white fill, DT Dark outline), `ext`/`allow` (white fill, blurple outline), `deny` (white fill, dashed pink outline). The class lines are copied verbatim from [architecture §3](architecture.md#3-system-overview).
- **Facts only.** Labels describe behavior that the source implements and that a dated evidence document records. A future or blocked feature appears only as "rejected" or "not available".

### Badges

Local SVG files in [`docs/assets/badges/`](assets/badges/), in English (`*-en.svg`) and Spanish (`*-es.svg`). They are generated locally: no badge service, script, external font or tracking request. Text uses a monospace stack, matching the secondary typeface role for code-related text. Each file has `role="img"`, `aria-label` and `<title>`.

| Badge (EN / ES) | Link target (real evidence) | Why it is accurate |
|---|---|---|
| transport: stdio only / transporte: solo stdio | [architecture §9.1](architecture.md#91-baseline-stdio) | No HTTP listener or configuration; ST-16 checks the refusal |
| runtime: Node.js 22+ / entorno: Node.js 22+ | [`package.json`](../package.json) (`engines.node >=22`) | CI matrix runs Node 22 and 24 |
| license: Apache-2.0 / licencia: Apache-2.0 | [`LICENSE`](../LICENSE) | Package manifest and image label agree |
| docker: local build · pinned ID / docker: build local · ID fijado | [Docker guide](docker.md) | Local image only, run by inspected image ID with `--pull=never` |
| security tests: offline · 2026-10-05 / pruebas seguridad: offline · 2026-10-05 | [Corrections acceptance](security/mcp-corrections-acceptance.md) | Synthetic offline suite on source `eadfe117…`: Linux Node 22 324/324, macOS Node 24 321 passed + 3 platform-blocked, 0 failed; standard suite 106/106 |
| status: private alpha / estado: alfa privada | [Stable readiness](history/stable-readiness.md) | Version `0.1.0-alpha.0`; stable gates still open |

**Not proposed, on purpose:** OpenSSF Scorecard or Best Practices, "OWASP certified", "0 CVE" or "scan passed", Docker Hardened Images, npm version, downloads or coverage percentages. None is true or measured for this project today. The READMEs carry commented-out Scorecard and Best Practices placeholders; they stay commented out until the result exists, and enabling them is a deliberate exception to the local-only rule because they load from the OpenSSF badge services (see [supply-chain checks](security/supply-chain-checks.md#badges)). The Docker badge must not say "scanned" until the base-image remediation is accepted and its scan is recorded in the Docker guide.

The security badge carries a date because the evidence is tied to one source snapshot. When the source changes, update the date and the linked evidence, or remove the badge.

Suggested README markup (to be integrated by the README owner; the unofficial notice and contact address stay above the badges, unchanged):

```html
<p>
  <a href="docs/architecture.md#91-baseline-stdio"><img src="docs/assets/badges/stdio-only-en.svg" alt="transport: stdio only"></a>
  <a href="package.json"><img src="docs/assets/badges/node-22-en.svg" alt="runtime: Node.js 22+"></a>
  <a href="LICENSE"><img src="docs/assets/badges/apache-2.0-en.svg" alt="license: Apache-2.0"></a>
  <a href="docs/docker.md"><img src="docs/assets/badges/docker-local-en.svg" alt="docker: local build, pinned ID"></a>
  <a href="docs/security/mcp-corrections-acceptance.md"><img src="docs/assets/badges/security-tests-en.svg" alt="security tests: offline, 2026-10-05"></a>
  <a href="docs/stable-readiness.md"><img src="docs/assets/badges/private-alpha-en.svg" alt="status: private alpha"></a>
</p>
```

The Spanish README uses the `*-es.svg` files with Spanish `alt` text. Six badges wrap to two or three lines at a 343 px phone width; that is acceptable. Do not shrink them below 22 px high.
