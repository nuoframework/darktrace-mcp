# Official Darktrace logo files — provenance

Unofficial MCP. Developed by an independent third party, unaffiliated with Darktrace and without authorization from Darktrace.

MCP no oficial. Desarrollado por un tercero ajeno a Darktrace, sin afiliación ni autorización de Darktrace.

The Darktrace name and logo belong to Darktrace. The files in this directory are **byte-for-byte unmodified copies** of files from the public logo pack linked on the official Brand Hub. They are stored locally so the README cover is self-contained and does not load anything from external hosts. Their presence and use in this repository identify the product this independent integration talks to; they do not imply authorization, endorsement, affiliation or official status. Logo use does not imply authorization or official status.

El nombre y el logotipo de Darktrace pertenecen a Darktrace. Los archivos de este directorio son copias **sin modificar, byte a byte**, del paquete público de logotipos enlazado en el Brand Hub oficial. Su uso identifica el producto con el que se integra este proyecto independiente y no implica autorización, respaldo, afiliación ni carácter oficial.

## Source / Fuente

| Item | Value |
|---|---|
| Guidelines page | <https://brandhub.darktrace.com/visual-identity/logo> |
| Public SVG pack link on that page | <https://darktrace-lite.darktrace.com/brandhub-files/darktrace-logos-svg.zip> |
| Downloaded (UTC) | 2026-10-05, HTTP 200, 35,820 bytes |
| Pack SHA-256 | `6e0fb1dd479fd330b54fe6289a4920f997a38c56318b8f0de1496199af3816bf` |
| Pack contents | `D-Black.svg`, `D-orange.svg`, `D-White.svg`, `Darkrace-black.svg`, `Darkrace-orange.svg`, `Darktrace-white.svg` (file names as published, including the `Darkrace-` spelling) |

## Files kept here / Archivos conservados

| File | SHA-256 (identical to the pack) | Bytes | Used |
|---|---|---|---|
| `Darktrace-white.svg` | `ab4377224643951b94e149304a583003849bf52ee4cb7ae86878181b9209da2c` | 28,730 | Embedded verbatim (same `path` elements, uniform scale only) in the four README cover SVGs, white on DT Dark |
| `Darkrace-black.svg` | `ef89670605b64913e9f3cca9496dd959a302a82465171f2bd7cb92343424d0bf` | 14,299 | Kept for a light-background use if ever needed; not currently displayed |

The icon-only `D` files and the orange wordmark were **not** copied: the guidelines restrict the icon to limited uses and reserve the orange wordmark for mostly black-and-white compositions, neither of which applies here.

## Rules applied / Reglas aplicadas

From the public logo page, verified on 2026-10-05:

- Single color only: white on DT Dark (`#030D11`), black on white. The cover uses the white file on a solid dark substrate (`fill-opacity .94`) in front of the Trace artwork, as the page allows "white logo on dark backgrounds with the Trace" while asking for extra care with contrast.
- Clear space equal to the width of the logo's "D" on every side. Measured: the "D" is 10.5% of the wordmark width (63 of 600 user units). At the 272-unit width used on the 1280-unit desktop canvas that is 29 units; nothing else is placed inside that margin (panel edge 40, rule above 29, label above 50, canvas bottom 20).
- Minimum width 127 px. The desktop cover renders the logo at 190 px in GitHub's 896 px content column and still at 128 px at a 601 px viewport, where the mobile cover takes over and renders it at 146 px on a 343 px column.
- No stretching, recoloring, partial coloring, masking or re-drawing: the official path data is reused unchanged under a uniform `scale()`.
- No co-branding lockup: the project name is ordinary text set apart from the wordmark, and the wordmark is captioned "Independent third-party project — not affiliated with or authorized by Darktrace" (and the Spanish equivalent) directly above it.

## Complaints, trademark or branding claims / Reclamaciones

<contacto@pabloarrabal.com> (mailto only; see the README section "Trademarks, logo and contact"). On a substantiated request from the trademark owner the files will be removed.
