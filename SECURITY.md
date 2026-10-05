# Security policy

This private alpha is under implementation and independent review. Offline tests and packaging checks do not establish appliance compatibility, production security or accepted residual risk. The 7.1 lab target remains NOT VALIDATED.

## Report a vulnerability privately

Authorized collaborators can [open an issue in this private repository](https://github.com/nuoframework/darktrace-mcp/issues/new) titled “Security contact request”, with only the affected version, a broad impact summary and a request for restricted contact. Do not include credentials, raw appliance data or exploit details: all repository collaborators may see the issue. A maintainer will arrange an agreed restricted channel for the full report. If you lack issue access, contact the maintainer who provided your repository access; no public vulnerability-reporting address is advertised, and the complaints address below is not a vulnerability-reporting channel. [GitHub repository advisories/private vulnerability reporting](https://docs.github.com/en/code-security/concepts/vulnerability-reporting-and-management/repository-security-advisories) currently support public repositories; this repository is private, so the [repository advisory endpoint](https://github.com/nuoframework/darktrace-mcp/security/advisories/new) is a reference, not an active reporting route. Do not change repository visibility to report a vulnerability. Do not open a public issue or include tokens, raw appliance data or exploit details in public channels. No reporting feature or response time is guaranteed.

Include the affected commit/version, runtime, minimal reproduction with synthetic data, observed impact and suggested mitigation. Rotate any exposed appliance tokens through the authorized operator; redact logs before sharing. No external report is sent by this project automatically.

## Complaints, trademark and branding contact

Complaints, trademark or branding claims about this unofficial, unaffiliated project, including requests concerning the Darktrace logo shown in the README: [contacto@pabloarrabal.com](mailto:contacto@pabloarrabal.com). Do not send vulnerability details, credentials or appliance data to this address. Reclamaciones y reivindicaciones sobre marcas o imagen corporativa: la misma dirección; no es un canal para vulnerabilidades. This project never sends mail on its own.

## Baseline boundaries

Stdio only; one HTTPS origin and credential pair per process. Read enabled by default; sensitive reads disabled by default. Medium/high writes default to unsigned previews and require operator opt-in for execution. Critical execution, email, PCAP export and HTTP transport are blocked. Model approval cannot authorize an appliance action. Unknown mutation outcomes require investigation, never automatic retries.

Token files must be regular, bounded to 4,096 bytes, owned by the runtime user, mode 0600 or stricter and opened without following symlinks. TLS verification is mandatory; private CA trust uses NODE_EXTRA_CA_CERTS. Operators must assess provider processing, retention, residency and host forwarding for any deployment, plus extra eligibility for Advanced Search.

See the [threat model](docs/security/threat-model.md), [design decisions](docs/security/design-decisions.md) and [security test plan](docs/security/security-test-plan.md) for assumptions, pending evidence and activation gates. Same-user hostile OS/operator compromise is outside process isolation.

## Distribution

Private repository; no npm or image publication. Review exact dependency pins, shrinkwrap and actual artifact contents/tree before internal distribution. Private/internal [GitHub artifact attestations](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations) currently require GitHub Enterprise Cloud; this repository’s entitlement is unverified. Future attestations/SBOMs require owner review and verification, not an assumed guarantee. No supported production release or patch SLA is currently declared.
