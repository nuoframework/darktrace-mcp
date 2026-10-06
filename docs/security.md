# Security overview

[README](../README.md) · [Security policy](../SECURITY.md) · [Configuration](configuration.md) · [Architecture](architecture.md)

This page explains, in plain terms, how the server protects your appliance and your data, and where the limits are. Detailed reviews and test records are in [docs/security/](#detailed-records).

## What the server does for you

| Protection | What it means |
|---|---|
| You choose the permissions | Profiles (`read`, `sensitive`, `write`, `critical`) are set by you at startup. The model cannot change them |
| Previews for changes | Writes accept `dryRun:true`. Critical actions only run with `confirm:true`; otherwise they return a preview |
| Audit | Every write and critical call writes a JSON audit line to stderr |
| No automatic retry of changes | A write that times out is reported as unknown, never replayed |
| Token files locked down | Token files must be private (`0600`), owned by you, not symlinks |
| One destination | The server only talks to the configured appliance URL, over verified TLS. Proxies and TLS bypasses stop startup |
| Bounded input and output | Size, depth and rate limits on every call. Responses are trimmed to known fields, secrets are redacted and hidden Unicode characters are escaped |
| Local only | stdio transport. No network port is opened |

## What it cannot do

- **It cannot stop data reaching your model provider.** Every result goes to your MCP client and its model. Check provider eligibility, retention and residency before connecting a production appliance.
- **It cannot make the model trustworthy.** Appliance data can contain attacker-controlled text (hostnames, email subjects). The server marks results as data, but the model may still be influenced. Keep `critical` off unless you need it, and read previews before confirming.
- **It cannot exceed your token.** Darktrace token permissions are the final authority. Give the token only the rights you want to delegate.
- **It does not protect against a compromised machine.** Anyone who can run code as your user can read the token files.

## Lab validation

19 read operations passed real queries on a Darktrace 7.1.0 lab (2026-10-06). The rest follow the official API 6.1 documentation but were not tried against a real appliance. They are marked **not lab-validated** in the [tool reference](tools.md). Test writes on a non-production appliance first.

## Runtime notes

- The Docker image uses Alpine's Node.js 24 with OpenSSL 3.5.9.
- Some official Node.js builds still bundle OpenSSL 3.5.8 (CVE-2026-35189, TLS certificate processing). For native installs, check `node -p 'process.versions.openssl'` and prefer 3.5.9 or later.
- Image scans and their review are recorded in the [Docker guide](docker.md#current-candidate-at-a-glance).

## Report a vulnerability

See [SECURITY.md](../SECURITY.md). Do not post tokens, appliance data or exploit details in issues.

## Detailed records

Design and threat analysis:

- [Threat model](security/threat-model.md)
- [Design decisions](security/design-decisions.md)
- [Security test plan](security/security-test-plan.md)
- [MCP attack research](security/mcp-attack-research.md)

Review and checkpoint records (dated, kept as evidence; some describe the earlier read-only release):

| Topic | Records |
|---|---|
| Code audits | [server](security/code-audit-server.md), [client](security/code-audit-client.md), [final code review](security/final-code-review.md) |
| Design reviews | [1](security/design-review.md), [2](security/design-review-round2.md), [3](security/design-review-round3.md), [4](security/design-review-round4.md), [5](security/design-review-round5.md) |
| MCP defenses | [results](security/mcp-defense-results.md), [independent review](security/mcp-defense-independent-review.md), [corrections acceptance](security/mcp-corrections-acceptance.md), [adversarial results](security/adversarial-results.md) |
| Patched runtime | [implementation](security/patched-runtime-implementation.md), [independent review](security/patched-runtime-independent-review.md), [lab checkpoint](security/patched-runtime-lab-checkpoint.md) |
| Docker | [final review](security/docker-final-review.md), [volume review](security/docker-volume-review.md) |
| Stable release gate | [final gate review](security/final-stable-gate-review.md), [capability review](security/first-stable-capability-review.md) |

Older release records: [docs/history](history/README.md).
