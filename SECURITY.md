# Security policy

**Resumen en español — cómo informar de una vulnerabilidad.** Usa [el formulario privado de GitHub](https://github.com/nuoframework/darktrace-mcp/security/advisories/new) (Security → Report a vulnerability). Si no está disponible, abre una incidencia (issue) titulada «Security contact request» que solo solicite un canal privado, sin detalles técnicos, credenciales ni datos del appliance. Ese contacto público no garantiza un plazo de respuesta. Para informes privados, el compromiso es acusar recibo en 14 días y corregir vulnerabilidades confirmadas cuanto antes y como máximo en 60 días desde su confirmación, salvo acuerdo distinto con quien informa. Incluye versión, entorno y reproducción con datos sintéticos. La política completa en inglés figura a continuación.

This policy covers the public `nuoframework/darktrace-mcp` repository. For how the server protects your appliance and data, read the [security overview](docs/en/security.md).

| Version | Scope |
|---|---|
| 1.1.2 (published 2026-10-06) | Same API surface and lab evidence as 1.1.1. Adds the self-service Docker path in `setup`, the URL prompt without a saved default, `uninstall`, the Claude Code plugin bundle, signed release assets with SLSA build provenance, and the zlib 1.3.2-r1 runtime image. Publication is complete; see [release status](docs/en/releases.md#release-status-2026-10-06) and [known limitations](CHANGELOG.md#known-limitations-in-112). |
| 1.1.1 (published 2026-10-06) | Same surface as 1.1.0 (77 executable operations in 50 tools; Darktrace/Email action excluded). 59 operations have Darktrace 7.1.0 lab evidence from two lab appliances, 6 of them only partial; email reads are not lab-validated (HTTP 403: the lab tokens lacked the Email Logs permission). Tolerates npm registry propagation in the release workflow. See [known limitations](CHANGELOG.md#111--2026-10-06). |
| 1.1.0 (published 2026-10-06) | Full API surface behind operator-chosen profiles (`read`, `sensitive`, `write`, `critical`): 77 executable operations in 50 tools. The Darktrace/Email action is excluded and the deprecated `GET /aianalyst/incidents` is not available. 56 operations have Darktrace 7.1.0 lab evidence, 11 of them only partial; email reads are not lab-validated. See [known limitations](CHANGELOG.md#known-limitations-in-110) |
| 1.0.0 | 15 read-only tools covering 19 lab-validated GET operations |

Lab results are not full API compatibility, production security or acceptance of residual risk. Scanner findings for the v1.0.0 image are listed in the [Docker guide](docs/en/docker.md#v100-image-at-a-glance-previous-release); the 1.1.0 image has no scan record yet ([status](docs/en/docker.md#110-image-verification-status)).

## Report a vulnerability privately

Use GitHub private vulnerability reporting: open the repository's **Security** tab and choose **Report a vulnerability**, or go directly to [the advisory form](https://github.com/nuoframework/darktrace-mcp/security/advisories/new). Only the maintainers see the report. See GitHub's guide to [privately reporting a security vulnerability](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability).

If the form is not available, open a public issue titled "Security contact request" that contains **only** a request for a private channel: no affected component, impact, credentials, appliance data or exploit details. A maintainer will reply with a private route. Never put vulnerability details, tokens or raw appliance data in public issues, discussions or pull requests. The complaints address below is not a vulnerability-reporting channel. No response time is guaranteed.

**Response times.** The maintainer acknowledges a private vulnerability report within 14 days, agrees a fix or mitigation plan with the reporter, and publishes an advisory and a fixed release when the fix is available; confirmed vulnerabilities are fixed as quickly as possible and at most within 60 days of confirmation unless the reporter agrees otherwise.

Include the affected commit/version, runtime, minimal reproduction with synthetic data, observed impact and suggested mitigation. Rotate any exposed appliance tokens through the authorized operator; redact logs before sharing. No external report is sent by this project automatically.

## Complaints, trademark and branding contact

Complaints, trademark or branding claims about this unofficial, unaffiliated project, including requests concerning the Darktrace logo shown in the README: [contacto@pabloarrabal.com](mailto:contacto@pabloarrabal.com). Do not send vulnerability details, credentials or appliance data to this address. Reclamaciones y reivindicaciones sobre marcas o imagen corporativa: la misma dirección; no es un canal para vulnerabilidades. This project never sends mail on its own.

## Security boundaries

- **Transport:** stdio only; one HTTPS origin and one credential pair per process. No listening port.
- **Profiles:** `read` is the default. `sensitive`, `write` and `critical` must be enabled by the operator at startup; the model cannot enable them. Model or client approval is not authorization: appliance token permissions remain authoritative.
- **Changes:** `write` operations accept `dryRun:true` previews; ordinary writes default to `DARKTRACE_WRITE_APPROVAL=host` (the client's own tool-permission prompt, no server dialog). `critical` operations (Antigena/RESPOND, intel feed, subnets, tag deletion) need a `dryRun:true` preview, then `confirm:true` with its single-use `previewId`, and by default an accepted server dialog; a call without `confirm:true` is refused with `confirmation_required`. `DARKTRACE_CRITICAL_APPROVAL=host` needs `DARKTRACE_ACKNOWLEDGE_HOST_APPROVAL=true`. Enabling `sensitive` and `write` together (including `all`) needs `DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE=true`, and there is no taint control between them. Every write, preview and refusal is audited; sensitive reads are not. POST/DELETE are never retried; an interrupted write has an unknown outcome and must be checked on the appliance.
- **Not available:** HTTP transport, export to disk, the Darktrace/Email action (excluded from this release) and the deprecated `GET /aianalyst/incidents`.
- **Token files:** regular files, at most 4,096 bytes, owned by the runtime user, mode `0600` or stricter, opened without following symlinks.
- **TLS:** verification is mandatory; a private CA is added with `NODE_EXTRA_CA_CERTS`. Proxy variables and TLS bypass settings stop startup.
- **Data egress:** results reach the MCP host and its model provider. Operators must assess provider processing, retention, residency and host forwarding, with extra care for the `sensitive` profile.

Assumptions and test evidence: [threat model](docs/security/threat-model.md), [design decisions](docs/security/design-decisions.md), [security test plan](docs/security/security-test-plan.md). A hostile process running as the same OS user is out of scope.

## Distribution

Public repository. On a reviewed `v<version>` tag, `.github/workflows/release.yml` verifies the tarball and then publishes `@nuoframework/darktrace-mcp` on npm (trusted publishing over OIDC with an npm provenance statement) and `ghcr.io/nuoframework/darktrace-mcp:<version>` on GitHub Container Registry (linux/amd64 and linux/arm64; pin the digest, never a tag). The workflow rebuilds the ghcr image; it is not the image the CI Docker job tested. The `github-release` job then creates the GitHub Release for the tag with the `.tgz`, `.mcpb`, `SHA256SUMS`, SBOM and verification evidence; from 1.1.2 it signs every asset with cosign (keyless Sigstore bundles) and attests SLSA build provenance ([verification](docs/en/releases.md#verifying-release-signatures-and-provenance)). Versions 1.1.0 and 1.1.1 are published on npm, ghcr and GitHub Release. Version 1.1.2 is also published, checked on 2026-10-06; see [release status](docs/en/releases.md#release-status-2026-10-06). Install only exact versions (`npx -y @nuoframework/darktrace-mcp@<version> setup`); the unscoped name `darktrace-mcp` is not this project. Review exact dependency pins, shrinkwrap and actual artifact contents/tree before internal distribution. [GitHub artifact attestations](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations) cover the release assets from 1.1.2, not the ghcr image; SBOMs ship as release evidence and are inventories, not vulnerability clearances. No supported production release or patch SLA is currently declared.
