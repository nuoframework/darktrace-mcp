# Security policy

This policy covers the private `nuoframework/darktrace-mcp` repository. For how the server protects your appliance and data, read the [security overview](docs/security.md).

| Version | Scope |
|---|---|
| Unreleased (main) | Full API surface: 78 of 79 operations behind operator-chosen profiles (`read`, `sensitive`, `write`, `critical`). 19 read operations are lab-validated on Darktrace 7.1.0; the rest are marked not lab-validated |
| 1.0.0 | 15 read-only tools covering 19 lab-validated GET operations |

Lab results are not full API compatibility, production security or acceptance of residual risk. Open scanner findings are listed in the [Docker guide](docs/docker.md#current-candidate-at-a-glance).

## Report a vulnerability privately

Authorized collaborators can [open an issue in this private repository](https://github.com/nuoframework/darktrace-mcp/issues/new) titled “Security contact request”, with only the affected version, a broad impact summary and a request for restricted contact. Do not include credentials, raw appliance data or exploit details: all repository collaborators may see the issue. A maintainer will arrange an agreed restricted channel for the full report. If you lack issue access, contact the maintainer who provided your repository access; no public vulnerability-reporting address is advertised, and the complaints address below is not a vulnerability-reporting channel. [GitHub repository advisories/private vulnerability reporting](https://docs.github.com/en/code-security/concepts/vulnerability-reporting-and-management/repository-security-advisories) currently support public repositories; this repository is private, so the [repository advisory endpoint](https://github.com/nuoframework/darktrace-mcp/security/advisories/new) is a reference, not an active reporting route. Do not change repository visibility to report a vulnerability. Do not open a public issue or include tokens, raw appliance data or exploit details in public channels. No reporting feature or response time is guaranteed.

Include the affected commit/version, runtime, minimal reproduction with synthetic data, observed impact and suggested mitigation. Rotate any exposed appliance tokens through the authorized operator; redact logs before sharing. No external report is sent by this project automatically.

## Complaints, trademark and branding contact

Complaints, trademark or branding claims about this unofficial, unaffiliated project, including requests concerning the Darktrace logo shown in the README: [contacto@pabloarrabal.com](mailto:contacto@pabloarrabal.com). Do not send vulnerability details, credentials or appliance data to this address. Reclamaciones y reivindicaciones sobre marcas o imagen corporativa: la misma dirección; no es un canal para vulnerabilidades. This project never sends mail on its own.

## Security boundaries

- **Transport:** stdio only; one HTTPS origin and one credential pair per process. No listening port.
- **Profiles:** `read` is the default. `sensitive`, `write` and `critical` must be enabled by the operator at startup; the model cannot enable them. Model or client approval is not authorization: appliance token permissions remain authoritative.
- **Changes:** `write` operations accept `dryRun:true` previews. `critical` operations (Antigena/RESPOND, intel feed, subnets, email actions, tag deletion) return a preview unless the call carries `confirm:true`. Every write is audited. POST/DELETE are never retried; an interrupted write has an unknown outcome and must be checked on the appliance.
- **Not available:** HTTP transport, export to disk and the deprecated `GET /aianalyst/incidents`.
- **Token files:** regular files, at most 4,096 bytes, owned by the runtime user, mode `0600` or stricter, opened without following symlinks.
- **TLS:** verification is mandatory; a private CA is added with `NODE_EXTRA_CA_CERTS`. Proxy variables and TLS bypass settings stop startup.
- **Data egress:** results reach the MCP host and its model provider. Operators must assess provider processing, retention, residency and host forwarding, with extra care for the `sensitive` profile.

Assumptions and test evidence: [threat model](docs/security/threat-model.md), [design decisions](docs/security/design-decisions.md), [security test plan](docs/security/security-test-plan.md). A hostile process running as the same OS user is out of scope.

## Distribution

Public repository. Releases are published only by `.github/workflows/release.yml` on a reviewed `v<version>` tag, after the preparation job verifies the tarball: `@nuoframework/darktrace-mcp` on npm (trusted publishing over OIDC with an npm provenance statement; no long-lived token), `ghcr.io/nuoframework/darktrace-mcp:<version>` on GitHub Container Registry (linux/amd64 and linux/arm64; pin the digest, never a tag) and GitHub Release assets (`.tgz`, `.mcpb`, `SHA256SUMS`, SBOM and verification evidence). Install only exact versions (`npx -y @nuoframework/darktrace-mcp@<version> setup`); the unscoped name `darktrace-mcp` is not this project. Review exact dependency pins, shrinkwrap and actual artifact contents/tree before internal distribution. [GitHub artifact attestations](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations) for the image are not yet produced; SBOMs ship as release evidence and are inventories, not vulnerability clearances. No supported production release or patch SLA is currently declared.
