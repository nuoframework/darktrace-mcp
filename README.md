**English** · [Español](README.es.md)

<picture>
  <source media="(max-width: 600px)" srcset="docs/assets/banner-variants/b/readme-banner-en-mobile.svg">
  <img src="docs/assets/banner-variants/b/readme-banner-en.svg" width="1280" alt="Darktrace MCP — with a decorative network graph. Unofficial MCP. Developed by an independent third party, unaffiliated with Darktrace and without authorization from Darktrace. The footer shows the official Darktrace logo, labeled as an independent third-party project; logo use does not imply authorization or official status.">
</picture>

# Darktrace MCP

**Unofficial MCP. Developed by an independent third party, unaffiliated with Darktrace and without authorization from Darktrace.**

Investigate your Darktrace appliance from your MCP client. Start read-only; choose when to allow changes.

[![Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-2563EB)](LICENSE)
[![Node.js 22+](https://img.shields.io/badge/node-22%2B-339933?logo=nodedotjs&logoColor=white)](docs/getting-started.md)
[![MCP 2026-07-28](https://img.shields.io/badge/MCP-2026--07--28-7C3AED)](docs/configuration.md#human-approval)
[![CI](https://github.com/nuoframework/darktrace-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/nuoframework/darktrace-mcp/actions/workflows/ci.yml)
[![OpenSSF Best Practices](https://www.bestpractices.dev/projects/15261/badge)](https://www.bestpractices.dev/projects/15261)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/nuoframework/darktrace-mcp/badge)](https://scorecard.dev/viewer/?uri=github.com/nuoframework/darktrace-mcp)
[![npm version](https://img.shields.io/npm/v/@nuoframework/darktrace-mcp)](docs/releases.md#distribution-channels-110-and-later)
[![Release](https://img.shields.io/github/v/release/nuoframework/darktrace-mcp?display_name=tag)](https://github.com/nuoframework/darktrace-mcp/releases)

[Get started](docs/getting-started.md) · [Tools](docs/tools.md) · [Configuration](docs/configuration.md) · [Security](docs/security.md) · [Troubleshooting](docs/troubleshooting.md)

## Install

1. **Requirements.** Node.js 22+, your appliance URL (`https://…`) and a public/private API token pair (Darktrace: **System Config → Settings → API Token**).
2. **Run the wizard.** One command for every client. It asks for the URL, the tokens (hidden input, stored in owner-only files), the permissions (`read` by default) and the clients it detects, checks the connection with a signed request, and only then writes the entries (existing files are backed up).

    ```sh
    npx -y @nuoframework/darktrace-mcp@1.1.2 setup
    ```

    One click instead: the Cursor button only adds the entry; then run `npx -y @nuoframework/darktrace-mcp@1.1.2 setup --client cursor` to complete it. The VS Code buttons prompt for the URL and tokens themselves.

    [![Install in Cursor](https://cursor.com/deeplink/mcp-install-dark.png)](cursor://anysphere.cursor-deeplink/mcp/install?name=darktrace&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIkBudW9mcmFtZXdvcmsvZGFya3RyYWNlLW1jcEAxLjEuMiJdLCJlbnYiOnsiREFSS1RSQUNFX1BST0ZJTEVTIjoicmVhZCJ9fQ%3D%3D)
    [![Install in VS Code](https://img.shields.io/badge/VS_Code-Install_darktrace-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](vscode:mcp/install?%7B%22name%22%3A%22darktrace%22%2C%22type%22%3A%22stdio%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22%40nuoframework%2Fdarktrace-mcp%401.1.2%22%5D%2C%22env%22%3A%7B%22DARKTRACE_URL%22%3A%22%24%7Binput%3Adarktrace-url%7D%22%2C%22DARKTRACE_PUBLIC_TOKEN%22%3A%22%24%7Binput%3Adarktrace-public-token%7D%22%2C%22DARKTRACE_PRIVATE_TOKEN%22%3A%22%24%7Binput%3Adarktrace-private-token%7D%22%2C%22DARKTRACE_PROFILES%22%3A%22read%22%7D%2C%22inputs%22%3A%5B%7B%22type%22%3A%22promptString%22%2C%22id%22%3A%22darktrace-url%22%2C%22description%22%3A%22Darktrace%20appliance%20URL%20(https%3A%2F%2F...)%22%2C%22password%22%3Afalse%7D%2C%7B%22type%22%3A%22promptString%22%2C%22id%22%3A%22darktrace-public-token%22%2C%22description%22%3A%22Darktrace%20API%20public%20token%22%2C%22password%22%3Atrue%7D%2C%7B%22type%22%3A%22promptString%22%2C%22id%22%3A%22darktrace-private-token%22%2C%22description%22%3A%22Darktrace%20API%20private%20token%22%2C%22password%22%3Atrue%7D%5D%7D)
    [![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Install_darktrace-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](vscode-insiders:mcp/install?%7B%22name%22%3A%22darktrace%22%2C%22type%22%3A%22stdio%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22%40nuoframework%2Fdarktrace-mcp%401.1.2%22%5D%2C%22env%22%3A%7B%22DARKTRACE_URL%22%3A%22%24%7Binput%3Adarktrace-url%7D%22%2C%22DARKTRACE_PUBLIC_TOKEN%22%3A%22%24%7Binput%3Adarktrace-public-token%7D%22%2C%22DARKTRACE_PRIVATE_TOKEN%22%3A%22%24%7Binput%3Adarktrace-private-token%7D%22%2C%22DARKTRACE_PROFILES%22%3A%22read%22%7D%2C%22inputs%22%3A%5B%7B%22type%22%3A%22promptString%22%2C%22id%22%3A%22darktrace-url%22%2C%22description%22%3A%22Darktrace%20appliance%20URL%20(https%3A%2F%2F...)%22%2C%22password%22%3Afalse%7D%2C%7B%22type%22%3A%22promptString%22%2C%22id%22%3A%22darktrace-public-token%22%2C%22description%22%3A%22Darktrace%20API%20public%20token%22%2C%22password%22%3Atrue%7D%2C%7B%22type%22%3A%22promptString%22%2C%22id%22%3A%22darktrace-private-token%22%2C%22description%22%3A%22Darktrace%20API%20private%20token%22%2C%22password%22%3Atrue%7D%5D%7D)

3. **Restart the client and ask it:** "list my Darktrace devices".

<details>
<summary>Per client (21 clients), plugin, Docker, Claude Desktop extension, uninstall</summary>

`setup --client <id>` configures one client; `config <id>` prints its snippet with your real paths and no secrets. Details and file locations: [install page](docs/install.md).

| Client | Shortest path |
|---|---|
| Claude Desktop | `setup --client claude-desktop`, or open the `.mcpb` from the [release](https://github.com/nuoframework/darktrace-mcp/releases) (tokens go to the OS keychain) |
| Claude Code | `setup --client claude-code`, or the plugin: `claude plugin marketplace add nuoframework/darktrace-mcp` then `claude plugin install darktrace-mcp@darktrace-mcp` ([guide](docs/plugin-distribution.md)) |
| Codex CLI / app | `setup --client codex`, or `codex plugin marketplace add nuoframework/darktrace-mcp`, `codex plugin add darktrace-mcp@darktrace-mcp`, then `setup` once |
| Cursor | Cursor button above, then `setup --client cursor` |
| VS Code / Insiders | VS Code button above (prompts for URL and tokens), or `setup --client vscode` |
| Windsurf, OpenCode, Gemini CLI | `setup --client windsurf` / `opencode` / `gemini` |
| Zed, Cline, Roo Code, Continue | `setup --client zed` / `cline` / `roo` / `continue` |
| Kiro, Amp, Copilot CLI, Warp | `setup --client kiro` / `amp` / `copilot-cli` / `warp` |
| Goose, LM Studio, Antigravity | `setup --client goose` / `lmstudio` / `antigravity` |
| JetBrains Junie / AI Assistant | `setup --client junie`; AI Assistant: `config jetbrains` and paste into Settings \| Tools \| AI Assistant \| MCP |
| Docker | `setup --runtime docker` pulls `ghcr.io/nuoframework/darktrace-mcp:1.1.2` (published index digest `sha256:fa261c2f7423fa79c66b0b5ddf74d6d8bb53b59a64608dda869959b43900d9ee`) and pins the local image ID ([Docker guide](docs/docker.md)) |
| Update | `npx -y @nuoframework/darktrace-mcp@1.1.2 update` verifies the newest release and moves every entry to it; `update --rollback` returns ([guide](docs/update.md)) |
| Uninstall | `npx -y @nuoframework/darktrace-mcp@1.1.2 uninstall` removes every entry (backups kept), the tokens and the fixed copies |

Windows, manual snippets, `test`, when to pin the version and what the buttons do: [install page](docs/install.md) · [install matrix](docs/install-matrix.md).

</details>

## Update

```sh
npx -y @nuoframework/darktrace-mcp@1.1.2 update
```

Moves every client entry to the newest release only after verifying it: fixed npm registry, registry signatures and provenance attestation (`npm audit signatures`), the new copy's `--check-config` with your stored settings, one signed request to the appliance. The previous version stays for `update --rollback`; `update --check` prints installed vs latest with the release notes, and `test` mentions a newer version when one exists. The server never checks for updates by itself. [Update guide](docs/update.md) covers the plugin paths (`claude plugin update darktrace-mcp@darktrace-mcp`, `codex plugin marketplace upgrade darktrace-mcp`), the `.mcpb`, Docker and `uninstall`.

## See it work

Three recordings against a **synthetic HTTPS mock**, with dummy tokens and no production data. These demonstrate the workflow, not appliance compatibility. [Sources, transcripts and re-recording guide](scripts/demo/README.md).

**1 · Connect once.** Type the appliance URL and both tokens (input is not echoed), pick `read`, then choose a client. The wizard verifies TLS and the tokens with a signed request and lists what it wrote. Recorded from a source checkout; `npx` adds a fixed-copy installation step.

![Setup wizard selecting read-only access and writing a temporary OpenCode configuration](docs/assets/demo/setup.gif)

**2 · Ask an analyst question.** Claude Code calls the device and model-breach tools, then suggests what to inspect next. Real output from a non-interactive `claude -p` run, paced for reading; the answer is not canned.

![Claude Code retrieves synthetic devices and model breaches through MCP, then recommends investigation steps](docs/assets/demo/analyst.gif)

**3 · Keep control of critical actions.** Preview, then confirm, then Claude Code's native approval dialog, where a scripted keypress selects **Decline**. The server refuses the action; no write reaches the appliance. Startup and waits are cut.

![Animated Claude Code session previewing an Antigena action, selecting Decline in the native MCP input dialog, and reporting the refusal](docs/assets/demo/approval.gif)

## Compatible clients

The wizard configures these clients; each badge links to its setup guide. Dialog support depends on the client and protocol. [Critical-action approval](docs/clients.md#claude-code).

[![Claude Desktop](https://img.shields.io/badge/Claude%20Desktop-D97757?style=flat-square&logo=anthropic&logoColor=white)](docs/clients.md#claude-desktop)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-D97757?style=flat-square&logo=anthropic&logoColor=white)](docs/clients.md#claude-code)
[![Codex](https://img.shields.io/badge/Codex-412991?style=flat-square)](docs/clients.md#codex)
[![Cursor](https://img.shields.io/badge/Cursor-111111?style=flat-square&logo=cursor&logoColor=white)](docs/clients.md#cursor)
[![VS Code](https://img.shields.io/badge/VS%20Code-007ACC?style=flat-square)](docs/clients.md#vs-code)
[![Windsurf](https://img.shields.io/badge/Windsurf-087F8C?style=flat-square&logo=windsurf&logoColor=white)](docs/clients.md#windsurf)
[![OpenCode](https://img.shields.io/badge/OpenCode-222222?style=flat-square&logo=opencode&logoColor=white)](docs/clients.md#opencode)
[![Gemini CLI](https://img.shields.io/badge/Gemini%20CLI-4285F4?style=flat-square&logo=googlegemini&logoColor=white)](docs/clients.md#gemini-cli)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)](docs/clients.md#docker)

Product names and logos identify compatibility only; they belong to their respective owners and imply no endorsement.

## What you can do

**50 tools · 77 executable operations.** Start with `read` (38 operations). Add `sensitive` (18), `write` (16), or `write,critical` (5 critical operations) as needed. Your appliance token permissions still set the ceiling.

| Area | Tools / ops | Examples | Profiles | Lab evidence |
|---|---:|---|---|---:|
| [System and reference data](docs/tools.md#system-and-reference-data) | 5 / 6 | Health, network statistics, enums | `read` | 3 / 1 / 2 |
| [Devices](docs/tools.md#devices) | 9 / 9 | Search, connections, metrics, labels | `read`, `write` | 9 / 0 / 0 |
| [Model breaches](docs/tools.md#model-breaches) | 4 / 7 | Read, acknowledge, comment | `read`, `write` | 7 / 0 / 0 |
| [Models and metrics](docs/tools.md#models-and-metrics) | 3 / 6 | Model, component and metric definitions | `read` | 4 / 2 / 0 |
| [AI Analyst](docs/tools.md#ai-analyst) | 8 / 11 | Incidents, pinning, investigations | `read`, `write` | 11 / 0 / 0 |
| [Autonomous Response (Antigena)](docs/tools.md#autonomous-response-antigena) | 3 / 4 | List, activate, extend, clear | `read`, `critical` | 3 / 1 / 0 |
| [Tags](docs/tools.md#tags) | 3 / 10 | List, create, assign, remove, delete | `read`, `write`, `critical` | 7 / 0 / 3 |
| [Intel feed and subnets](docs/tools.md#intel-feed-and-subnets) | 4 / 4 | Watched Domains, subnet settings | `read`, `critical` | 2 / 2 / 0 |
| [Packet captures](docs/tools.md#packet-captures) | 3 / 3 | List, request, download | `read`, `sensitive`, `write` | 3 / 0 / 0 |
| [Advanced Search](docs/tools.md#advanced-search) | 1 / 4 | Queries, field analysis, graphs | `sensitive` | 4 / 0 / 0 |
| [Darktrace/Email](docs/tools.md#darktraceemail) | 7 / 13 | Dashboards, metadata, search, audit | `sensitive` | 0 / 0 / 13 |

**✓** lab evidence on Darktrace 7.1.0 · **◐** partial evidence (the [tool reference](docs/tools.md) states what was covered) · **—** not lab-validated, including blocked or failed checks.

- 59 of 77 operations have lab evidence from two Darktrace 7.1.0 lab appliances, 6 of them partial. The write and critical paths were re-checked on the second lab after the final write controls.
- All 13 Darktrace/Email reads are unvalidated (the lab token got HTTP 403). The email download returns size and SHA-256 only.
- Not available: the Darktrace/Email action (excluded) and the deprecated `GET /aianalyst/incidents`.

Try asking:

- “Find devices named finance and show their recent connections.” (`read`)
- “Summarize the highest-scoring model breaches from the last 24 hours.” (`read`)
- “Show AI Analyst incidents for this device and the existing analyst comments.” (`read`)
- “Preview a triage tag for device 42 before changing anything.” (`write`)
- “Search traffic for this domain and summarize the matching connections.” (`sensitive`)
- “Preview clearing Antigena action 123. Wait for my approval.” (`write,critical`)

## Safety by design

Critical actions (Antigena, intel feed, subnets, tag deletion) follow this path. Ordinary writes skip the preview unless you ask for one.

```mermaid
flowchart LR
    P[Profiles + target policy] --> V[Critical preview: previewId]
    V --> C[confirm: true + same arguments]
    C --> H{Human approval dialog}
    H -->|Accept| W[Write to appliance]
    H -->|Decline| R[Refuse]
    V -.-> A[Hash-chained audit on stderr]
    W --> A
    R --> A
```

- **Profiles:** `read` by default; opt into sensitive data and changes. Ordinary writes run without a preview unless you set `dryRun:true`; their approval defaults to the host's tool prompt.
- **Critical approval:** a single-use `previewId` (5 minutes), then `confirm:true` with the same arguments, then the default server dialog. Decline/cancel refuses the action. The server cannot prove that a human answered; auto-allow rules weaken this control.
- **Write limits:** up to 10 writes/minute, 3 critical; three consecutive failed/unknown writes open the circuit breaker until restart. Limits and state are per process. Writes are never retried automatically.
- **Protected targets:** opt-in, exact literal matching plus per-operation target caps. Antigena action protection matches `codeid`, not the device.
- **Audit:** writes, previews and refusals have hash-chained records on stderr. Sensitive reads are not audited; chains have no external anchor or boot identity.
- **Bounded output:** field selection, size limits and instruction neutralization reduce exposure. They do not guarantee removal of every sensitive field or defeat every prompt injection. PCAPs over about 45 KB are refused with size/digest only.
- **Transport:** local stdio; verified TLS, HMAC-signed requests, a pinned destination and no proxies or redirects.
- **Explicit acknowledgements:** `all` or `sensitive` + `write` needs `DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE=true` (no taint control). Critical `host` approval needs `DARKTRACE_ACKNOWLEDGE_HOST_APPROVAL=true`.

> **Data leaves your network.** Results reach your MCP client and its model provider, including inline Base64 PCAP data and email metadata. Assess provider **eligibility, retention and residency** before connecting a production appliance.

[Security overview](docs/security.md) · [Configuration and approval modes](docs/configuration.md#human-approval) · [Report a vulnerability](SECURITY.md)

## How it was validated

- Threat model [TM-18…31](docs/security/threat-model-writes.md), [independent design review](docs/security/design-review-writes.md) and [adversarial suites](docs/security/adversarial-results-writes.md).
- Recorded release pins: **230 functional tests / 1,150 security subcases**. Linux receipts report 1,150 passes; macOS has three platform skips. These are dated evidence, not a certification. [Pins and receipts](docs/security/release-pins-1.1.0.md).
- [Two Darktrace 7.1.0 labs](docs/security/final-lab-campaign-1.1.0.md), with narrower coverage than the offline suites; [Docker gates on arm64 and amd64](https://github.com/nuoframework/darktrace-mcp/actions/runs/37497433186) at release commit `f95e798`. Installer validation also has [separate pins](docs/security/release-pins-1.1.0.md#update-after-the-installer-date-format-probe-2026-10-06-later).
- The [final gate review](docs/security/final-gate-review-1.1.0.md) records blockers and [residual risks](docs/security/final-gate-review-1.1.0.md#4-residual-risks-to-disclose-in-the-release-notes); [dated owner decisions](docs/security/owner-decisions-1.1.0.md) accept specific residuals. Neither removes them. There is no zero-CVE claim or recorded 1.1.0 runtime scan.

## Documentation and contributing

[Getting started](docs/getting-started.md) · [Clients](docs/clients.md) · [Tools](docs/tools.md) · [Configuration](docs/configuration.md) · [Docker](docs/docker.md) · [Architecture](docs/architecture.md) · [Troubleshooting](docs/troubleshooting.md) · [Releases](docs/releases.md) · [Changelog](CHANGELOG.md)

Open source under [Apache-2.0](LICENSE). [Contributions](CONTRIBUTING.md) are welcome. Where each version is published, and how to verify it: [Releases](docs/releases.md).

## Trademarks and contact

The Darktrace name and logo belong to Darktrace. The banner uses the [unmodified official wordmark](docs/assets/brand/darktrace/Darktrace-white.svg) to identify the integrated product ([provenance](docs/assets/brand/darktrace/README.md)). **Logo use does not imply authorization or official status.**

Branding or removal requests: [contacto@pabloarrabal.com](mailto:contacto@pabloarrabal.com). Security reports: [SECURITY.md](SECURITY.md). This project never sends mail on its own.
