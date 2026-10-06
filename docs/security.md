# Security overview

[README](../README.md) · [Security policy](../SECURITY.md) · [Configuration](configuration.md) · [Architecture](architecture.md)

This page explains, in plain terms, how the server protects your appliance and your data, and where the limits are. Detailed reviews and test records are in [docs/security/](#detailed-records).

## What the server does for you

| Protection | What it means |
|---|---|
| You choose the permissions | Profiles (`read`, `sensitive`, `write`, `critical`) are set by you at startup. The model cannot change them. `sensitive` and `write` together (including `all`) start only with `DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE=true` |
| Previews and approval for changes | Writes accept `dryRun:true` for a preview. Critical actions need a `dryRun:true` preview, then `confirm:true` with its single-use `previewId`, and by default an accepted server dialog. A critical call without `confirm:true` is refused (`confirmation_required`). Skipping the server dialog (`DARKTRACE_CRITICAL_APPROVAL=host`) needs `DARKTRACE_ACKNOWLEDGE_HOST_APPROVAL=true` |
| Audit | Every write, preview and refusal writes a hash-chained JSON audit line to stderr. Sensitive reads are not audited |
| No automatic retry of changes | A write that times out is reported as unknown, never replayed. Writes are rate-limited, and three failed or unknown writes in a row stop all writes until restart |
| Token files locked down | Token files must be private (`0600`), owned by you, not symlinks |
| One destination | The server only talks to the configured appliance URL, over verified TLS. Proxies and TLS bypasses stop startup |
| Bounded input and output | Size, depth and rate limits on every call. Responses are trimmed to known fields, secrets are redacted and hidden Unicode characters are escaped |
| Local only | stdio transport. No network port is opened |

## What it cannot do

- **It cannot stop data reaching your model provider.** Every result goes to your MCP client and its model. Check provider eligibility, retention and residency before connecting a production appliance.
- **It cannot confirm a human approved.** Ordinary writes rely on your client's permission prompt by default. In `host` mode, or with "always allow" rules or auto-answering clients, no human may see the call.
- **It cannot stop data moving between profiles.** With `sensitive` and `write` both on, the model can copy sensitive results into comments, tag descriptions or labels. There is no taint control; comments cannot be deleted.
- **It cannot make the model trustworthy.** Appliance data can contain attacker-controlled text (hostnames, email subjects). The server marks results as data, but the model may still be influenced. Keep `critical` off unless you need it, and read previews before confirming.
- **It cannot exceed your token.** Darktrace token permissions are the final authority. Give the token only the rights you want to delegate.
- **It does not protect against a compromised machine.** Anyone who can run code as your user can read the token files.

## Lab validation

56 operations have evidence from one Darktrace 7.1.0 lab appliance (2026-10-06); for 11 of them the evidence is partial (for example, Antigena `clear` only, subnet label only, Advanced Search GET forms tested before their encoding changed). The rest, including every Darktrace/Email read, are marked **not lab-validated**. Most write evidence predates the final write controls. The [tool reference](tools.md) shows the status of each operation, and the [known limitations](../CHANGELOG.md#known-limitations-in-110) list what is not covered. Test writes on a non-production appliance first.

## Runtime notes

- The Docker image uses Alpine's Node.js 24 with OpenSSL 3.5.9.
- Some official Node.js builds still bundle OpenSSL 3.5.8 (CVE-2026-35189, TLS certificate processing). For native installs, check `node -p 'process.versions.openssl'` and prefer 3.5.9 or later.
- Image scans and their review for v1.0.0 are recorded in the [Docker guide](docker.md#v100-image-at-a-glance-previous-release). The 1.1.0 image has no scan record yet ([status](docker.md#110-image-verification-status)).

## Supply-chain checks

CodeQL, ESLint with security rules, Dependabot and OpenSSF Scorecard run on the repository. What each one checks and how to read its results: [supply-chain checks](security/supply-chain-checks.md).

## Report a vulnerability

Use GitHub private vulnerability reporting, as described in [SECURITY.md](../SECURITY.md). Do not post tokens, appliance data or exploit details in issues.

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
| Writes and 1.1.0 | [threat model](security/threat-model-writes.md), [test plan](security/security-test-plan-writes.md), [design review](security/design-review-writes.md), [client code review](security/code-review-writes-client.md), [adversarial results](security/adversarial-results-writes.md), [lab campaign](security/final-lab-campaign-1.1.0.md), [release pins](security/release-pins-1.1.0.md), [1.1.0 final gate review](security/final-gate-review-1.1.0.md) |

Older release records: [docs/history](history/README.md).
