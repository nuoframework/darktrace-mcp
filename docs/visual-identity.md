# Visual identity evidence

Unofficial MCP. Developed by an independent third party, unaffiliated with Darktrace and without authorization from Darktrace.

MCP no oficial. Desarrollado por un tercero ajeno a Darktrace, sin afiliación ni autorización de Darktrace.

## References inspected

Reviewed the public pages and **viewed the actual linked reference images**, not only their text or color values, on 2026-10-05. Official reference artwork was downloaded to a temporary review directory; it is not redistributed in this repository.

| Public source | Specific visual reference viewed | Decision in this adaptation |
|---|---|---|
| [Colors](https://brandhub.darktrace.com/visual-identity/colors) | [Dark type composition](https://cdn.prod.website-files.com/62e3de3c93a3f82e39b780db/669a83c626645ccec9210074_color-gradient-use_1.jpg) and [light composition with glow](https://cdn.prod.website-files.com/62e3de3c93a3f82e39b780db/669a83c6acf9901eb44ce498_color-gradient-use_2.jpg) | Equal-width white and DT Dark (`#030D11`) panels; orange (`#FF6B00`) accents, with Sun, Hard Pink, Jewel and Blurple restricted to the illustration. |
| [Typography](https://brandhub.darktrace.com/visual-identity/typography) | [Layout elements](https://cdn.prod.website-files.com/62e3de3c93a3f82e39b780db/668d12cdffb8049b2c8cecd1_typography_layout-elements.jpg), [horizontal example](https://cdn.prod.website-files.com/62e3de3c93a3f82e39b780db/668d06f4ebb9bb2d6681ed17_grids_horizntal-layout-example.jpg), and [vertical example](https://cdn.prod.website-files.com/62e3de3c93a3f82e39b780db/668d06f4b93226b6ad9c31a3_grids_vertical-layout-example.jpg) | Large regular-weight Arial, tight headline spacing, small pixel eyebrow, thin rules and left alignment. Desktop title sizes are 90/116px on a 1280px canvas, with 48px inset; mobile uses its own hierarchy. Arial is the listed system fallback; no font files are embedded. |
| [Trace](https://brandhub.darktrace.com/visual-identity/trace) | [Gestural applications](https://cdn.prod.website-files.com/62e3de3c93a3f82e39b780db/669115e65fccc42668a9f9dc_trace_gestural.jpg) and [learning context](https://cdn.prod.website-files.com/62e3de3c93a3f82e39b780db/669115e504fb327130875614_trace_context-1.jpg) | Fine luminous paths, broader localized glow and square endpoint pixels. The repeated fan suggests signals converging through a bounded interface; it is decorative, not an architecture or security guarantee. |
| [Illustrations](https://brandhub.darktrace.com/visual-identity/illustrations) | [Three gestural compositions](https://cdn.prod.website-files.com/62e3de3c93a3f82e39b780db/6697e3ea40fe5643dd60a4a0_illustrations_gestural.jpg) and [finished construction example](https://cdn.prod.website-files.com/62e3de3c93a3f82e39b780db/6697e3eaba5796d21d237d4d_illustration-gestural-8.jpg) | Original 17-path fan, angular entries transitioning into curves, staggered interruptions, alternating gradients and two translucent glow ribbons. Several paths remain continuous. |

## Composition and checks

The former rounded dark card, bold single-line heading, three orange circuits and inset notice box were replaced by an editorial light/dark split. The independent project name is ordinary text, not Darktrace's official wordmark. All artwork is original SVG with local references, no scripts, external assets or proprietary fonts. The exact full notices remain visible as native Markdown immediately below the cover and project heading, where they wrap accessibly in both languages.

The desktop cover is 1280 × 600; the mobile cover is a separately composed 640 × 820 stack. Both language variants were rasterized and visually inspected at **896px content width** and **343px mobile width**, respectively. The first pass placed a small label over the Trace; the final pass removes it and gives the remaining footer a dark substrate. Headline, Spanish accents, endpoint pixels and footer contrast were checked in the final images.

- [Desktop before/after comparison](assets/visual-review-desktop.png)
- [Mobile before/after comparison, including both languages](assets/visual-review-mobile.png)

These are local SVG render comparisons, not screenshots of a published GitHub README. The README uses standard `picture` / `source media="(max-width: 600px)"` markup; live GitHub sanitation and source selection still require the publishing review. A renderer that ignores `picture` sources receives the desktop `img` fallback. The full project name, exact notice, description and runtime metadata also remain native Markdown, so essential information does not depend on either image or responsive support.

Documentation checks confirm unchanged technical body text and fenced code blocks, preserved language/navigation links, valid local targets, valid SVG XML, and matching bilingual structure. No runtime, package, workflow, release or validation-status changes are part of this redesign.
