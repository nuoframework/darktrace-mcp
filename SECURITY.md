# Security policy

This policy covers the public `nuoframework/darktrace-mcp` repository. For how the server protects your appliance and data, read the [security overview](docs/security.md).

| Version | Scope |
|---|---|
| 1.1.0 (candidate, not yet published) | Full API surface behind operator-chosen profiles (`read`, `sensitive`, `write`, `critical`): 77 executable operations in 50 tools. The Darktrace/Email action is excluded and the deprecated `GET /aianalyst/incidents` is not available. 56 operations have Darktrace 7.1.0 lab evidence, 11 of them only partial; email reads are not lab-validated. See [known limitations](CHANGELOG.md#known-limitations-in-110) |
| 1.0.0 | 15 read-only tools covering 19 lab-validated GET operations |

Lab results are not full API compatibility, production security or acceptance of residual risk. Scanner findings for the v1.0.0 image are listed in the [Docker guide](docs/docker.md#v100-image-at-a-glance-previous-release); the 1.1.0 image has no scan record yet ([status](docs/docker.md#110-image-verification-status)).

## Report a vulnerability privately

Use GitHub private vulnerability reporting: open the repository's **Security** tab and choose **Report a vulnerability**, or go directly to [the advisory form](https://github.com/nuoframework/darktrace-mcp/security/advisories/new). Only the maintainers see the report. See GitHub's guide to [privately reporting a security vulnerability](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability).

If the form is not available, open a public issue titled "Security contact request" that contains **only** a request for a private channel: no affected component, impact, credentials, appliance data or exploit details. A maintainer will reply with a private route. Never put vulnerability details, tokens or raw appliance data in public issues, discussions or pull requests. The complaints address below is not a vulnerability-reporting channel. No response time is guaranteed.

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

Public repository. On a reviewed `v<version>` tag, `.github/workflows/release.yml` verifies the tarball and then publishes `@nuoframework/darktrace-mcp` on npm (trusted publishing over OIDC with an npm provenance statement) and `ghcr.io/nuoframework/darktrace-mcp:<version>` on GitHub Container Registry (linux/amd64 and linux/arm64; pin the digest, never a tag). The workflow rebuilds the ghcr image; it is not the image the CI Docker job tested. The GitHub Release and its assets (`.tgz`, `.mcpb`, `SHA256SUMS`, SBOM and verification evidence) are created by the owner, not by the workflow. Nothing is published for 1.1.0 until those steps run. Install only exact versions (`npx -y @nuoframework/darktrace-mcp@<version> setup`); the unscoped name `darktrace-mcp` is not this project. Review exact dependency pins, shrinkwrap and actual artifact contents/tree before internal distribution. [GitHub artifact attestations](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations) for the image are not yet produced; SBOMs ship as release evidence and are inventories, not vulnerability clearances. No supported production release or patch SLA is currently declared.
