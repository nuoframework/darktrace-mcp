# Current release preparation

The current versioned private-release procedure and execution record are in [release preparation](release-preparation.md) and [releases](../releases.md). The preliminary archive/hash and partial-build notes below are historical evidence, superseded for final delivery; do not use them as release checksums. No release has been published by the preparation task.

# Documentation and private packaging acceptance report

**Status: authoring scope accepted; artifact evidence PRELIMINARY.** Recorded 2026-10-05T12:05:02.996943+00:00. Coordinator instruction `msg_9d669f4fae5d` explicitly moved final artifact rebuild/verification to **phase 7 after final server integration and code audit**. This report does not certify final source, security, live API compatibility, a release or accepted residual risk.

## Delivered scope

English README with restrained header, feature/status table, navigation and Mermaid data flow; English operator/config/client/troubleshooting guides; Spanish quickstart; full official Apache-2.0 text; security/contributing policies and unreleased changelog. Five JSON/TOML examples use absolute Node/entry paths and separate public/private token-file paths with no credential values. Source contract 6.1 and 7.1 **NOT VALIDATED** are explicit, alongside 79 inventory operations: 54 executable by profile, five critical previews, 19 blocked and one excluded.

Private package metadata and exact dependency versions are unchanged from the approved pins. Both locks are consistent; shrinkwrap is explicitly allowlisted. The portable build script generates the catalogue, compiles TypeScript and applies executable mode using Node APIs, with generated-dist cleanup. It has no install lifecycle hooks. CI is configured for Node 22/24, contents-read only, immutable official action commits and no publication job. Docker is an optional local recipe with a verified official base digest, nonroot runtime and read-only secret mounts; it was not built or run.

## Commands and observed results

| Executed command/check | Working directory / result |
|---|---|
| `npm run build` | Shared checkout, twice during active source edits: failed TypeScript checks in config tests / HTTPS connector; not a successful final build. Generation and partial compiler output existed, so the tarball below is preliminary. |
| `npm run typecheck` | Shared checkout during active edits: failed, including transient missing-client/config/connector typing errors. No current or final typecheck pass is claimed. |
| `npm ci --ignore-scripts --cache /private/tmp/darktrace-npm-cache` | `/private/tmp/darktrace-private-package-audit/source`, manifest/lock-only isolated copy: passed, 18 packages installed. Full source/build verification was deferred. |
| `npm pack --ignore-scripts --dry-run --json --cache /private/tmp/darktrace-npm-cache` | Shared checkout: inspected allowlist; initially detected omitted shrinkwrap, then explicitly allowlisted it and rechecked. |
| `npm pack --ignore-scripts --json --pack-destination /private/tmp/darktrace-private-package-audit --cache /private/tmp/darktrace-npm-cache` | Shared checkout, preliminary emitted runtime snapshot: passed, 26 entries. |
| `npm install --ignore-scripts --omit=dev --cache /private/tmp/darktrace-npm-cache /private/tmp/darktrace-private-package-audit/darktrace-mcp-0.1.0-alpha.0.tgz` | Empty `/private/tmp/darktrace-private-package-audit/install`: passed. |
| `npm ls --omit=dev --all` | Isolated installation: server 2.3.0, core 2.3.0, Zod 4.2.0; no development dependencies installed. |
| `node /private/tmp/darktrace-private-package-audit/install/node_modules/darktrace-mcp/dist/src/index.js --help` and `--version` | Passed; supported diagnostics and version `0.1.0-alpha.0`. |
| Same installed entrypoint, `--check-config` | Four client examples plus operator JSON, substituted external synthetic 0600 token files: all passed. Each returned `registeredTools:27`, `networkProbe:false`, `labValidated:false`, with critical/email/export false. These are local checks, not live authentication tests. |
| Same installed entrypoint, `doctor` | Protected external operator JSON with synthetic token files: passed, same local diagnostic result. |
| Python JSON / `tomllib` parsing and local-link/fragment checks | Four JSON + one TOML examples parsed; authored documentation links/anchors and code fences checked. Current totals are stored in the local verification file. |
| Workflow YAML parsing; `bash -n /private/tmp/darktrace-ci-pack-check.sh`; `node --check /private/tmp/darktrace-ci-pack-check.mjs`; `node --check scripts/build.mjs` | Current workflow/build syntax checks passed. |
| `npm_config_cache=/private/tmp/darktrace-npm-cache bash /private/tmp/darktrace-ci-pack-check.sh` | Earlier preliminary workflow pack block executed locally: passed content/mode/tree/version checks. Current block additionally checks computed archive SHA-512/SHA-256 and resolved URLs; its current syntax was checked, but no GitHub run is claimed. |
| `git diff --check --` followed by the owned path list | Passed for tracked scoped changes; untracked documents were also checked directly. |
| `codex mcp --help`, `codex mcp add --help` | Installed CLI confirmed TOML location and stdio/file-path environment registration options. |
| `docker version` | Docker CLI present; daemon socket access denied in this worker environment. No image build/run evidence. |

Local runtime: **Node 24.14.1 / npm 11.11.0**. Node 22 is in the proposed CI matrix and was not executed locally. README GitHub authentication/clone commands were documented, not executed: this worker used the supplied checkout. No live appliance call, shared lab token, commit, package publication, image publication, GitHub issue creation or external report was made.

## Preliminary artifact evidence

- Path: `/private/tmp/darktrace-private-package-audit/darktrace-mcp-0.1.0-alpha.0.tgz` (private local directory).
- SHA-256: `4d70da2f0b1656d4df70419d2f2acfc83d43013845844def50333fcee363fa6f`.
- SHA-512 SRI: `sha512-oCUtiuP09AwxOM8vRexqhSkdehKILoxfDtrlp8hsEYExOTlQctvIvZPCJ/Ic00LuFU/6MgMYZ9Cjkt1EMJVLfg==`.
- 26 files; executable bin mode `0o755`; only compiled `dist/src/**/*.js`, runtime JSON, package manifest, shrinkwrap, README, LICENSE and SECURITY.
- No `.env`, docs-src, tests, scripts, TypeScript/declaration sources or bundled development dependencies. Content inspection found no synthetic token values, private-key PEM blocks or common literal credential assignments. This constrained scan is not a source/dependency security audit.
- Actual installed package paths, on-disk package versions, resolved URLs and integrity values matched all three production shrinkwrap entries, with no unexpected production packages. Packed runtime bytes matched installed runtime bytes; packed manifest/shrinkwrap matched current unchanged manifest/shrinkwrap.
- README/SECURITY inside this preliminary archive predate later reporting/availability refinements. Phase 7 must regenerate them with the final code; this archive must not be presented as a final release.

The full entry list, per-file compiled runtime hashes and production tree are in `/private/tmp/darktrace-private-package-audit/artifact-verification.json`. Local example results are in `config-example-results.json` in the same directory. These private temporary artifacts are inspection evidence, not a distributed release.

## Source hash boundary

Current read-only source fingerprint (SHA-256 of sorted path→SHA-256 JSON): `0cbcc8fe7ad33b95dca9117a3bc04835152373d13c18c8312dfc1dccca673c0a` across 21 source files. Individual hashes below describe the **current point-in-time source**, which was still changing; they **do not establish provenance of the earlier partial-build tarball**. Complete hashes are recorded in `/private/tmp/darktrace-private-package-audit/current-readonly-source-hashes.json`. No stable commit or final source snapshot was accepted for artifact verification in this dispatch.

| Current source file | SHA-256 |
|---|---|
| `src/index.ts` | `9897e2096c31eed3c0482f8be6713ba414764f93930bd4cfb783b05f2a999d38` |
| `src/config/load.ts` | `d8960b429b4174069748cacc864459abd46f54c3e7e04740c894ed94be604065` |
| `src/config/schema.ts` | `a6ef17e4ef4af7302d799e3379d807b511d7430ca84ff5efdeeca264c54ea39d` |
| `src/client/httpClient.ts` | `2aa861bd676c93d4fe97be87272aa08f9d69c6a977353695d84c6089e2566644` |
| `src/client/httpsConnector.ts` | `38c1b949fdccaf9c2d93d522b7df2a802eabb76a4e7ae5afcbc9423fc1374201` |
| `src/server/stdio.ts` | `2f3875dcbae1bd004110c49e102e97077c6b42aef03a26e12853b45719e74723` |

Current package manifest SHA-256: `c19aabe664a7f49a746cbb8f827d7089bfae52ae4356bdf0e31487a80b6825e9`. Both lock files SHA-256: `029af408743c19bfdf30c20e6583bd9fda2c3de984e9557c9ed231bb0e078e63`. Official full Apache license SHA-256: `cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30`.

## Primary-source checks

- [Claude Code MCP](https://code.claude.com/docs/en/mcp): project `.mcp.json`, user/local `~/.claude.json`, stdio registration.
- [Official MCP Desktop setup](https://modelcontextprotocol.io/docs/2026-07-28/develop/connect-local-servers): macOS/Windows Desktop config paths.
- [VS Code MCP](https://code.visualstudio.com/docs/agent-customization/mcp-servers): portable/workspace/user-profile destinations and wrappers.
- [Codex MCP](https://developers.openai.com/codex/mcp), cross-checked with installed local CLI help: shared `config.toml`, stdio environment configuration.
- [Official Apache text](https://www.apache.org/licenses/LICENSE-2.0.txt): downloaded full LICENSE.
- Official [checkout v4.2.2 ref](https://api.github.com/repos/actions/checkout/git/ref/tags/v4.2.2) → `11bd71901bbe5b1630ceea73d27597364c9af683`; [setup-node v4.4.0 ref](https://api.github.com/repos/actions/setup-node/git/ref/tags/v4.4.0) → `49933ea5288caeca8642d1e84afbd3f7d6820020`. Their exact-commit action metadata was reviewed; no complete upstream code audit is claimed.
- Official Docker Hub `library/node:22-bookworm-slim` OCI index fetched with anonymous registry authentication on 2026-10-05: byte SHA-256 equaled the HTTP `docker-content-digest` value `43ac6c60b8f89723f746e8a92ce91abd5017e627ce1ddfe4238355d3a30b772c`. Raw index/header evidence remains `/private/tmp/darktrace-node-manifest.json` and `/private/tmp/darktrace-docker-response-headers`.
- [GitHub repository advisories](https://docs.github.com/en/code-security/concepts/vulnerability-reporting-and-management/repository-security-advisories) currently support public repositories. SECURITY supplies an authorized-collaborator **private repository issue** contact request with no secrets/exploit details, followed by an agreed restricted channel; the advisory URL is not falsely advertised as enabled.
- [GitHub artifact attestations](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations) for private/internal repositories currently require Enterprise Cloud. Entitlement is unverified; no attestation, SBOM or release guarantee is claimed.

## Required phase 7 / unresolved evidence

Final source integration and independent code audit, then a fresh isolated source `npm ci --ignore-scripts`, successful build/typecheck/Node tests, new pack, content/secret/mode inspection and clean artifact installation/tree-integrity comparison. Re-run all synthetic config examples and diagnostics against that exact artifact and record exact source/compiled hashes. No final source/security validation occurred here.

Coordinator’s latest accepted JSON-file requirement is **64 KiB**, separate from **4 KiB token files**, with runtime UID ownership, 0600-or-stricter mode, regular/no-follow handling. Configuration/getting-started document explicit `chmod 600` for protected JSON. At the last read-only checkpoint the implementation still showed `CONFIG_FILE_MAX_BYTES = 1_000_000`; Luna’s tightening was pending, so phase 7 must confirm **65,536-byte actual enforcement**, not infer it from these docs. `DARKTRACE_BASE_URL` alias/conflict rejection was present at the final documentation read; canonical new examples use `DARKTRACE_URL`.

Docker build/nonroot/read-only-mount/runtime proof, Node 22 and real GitHub CI remain unverified. Authorized 7.1 signing, ACLs, live compatibility and action-specific lab scope remain external gates. Provider processing/retention/residency/eligibility needs assessment for any deployment, with additional Advanced Search eligibility. Medium/high execution needs operator authorization; critical execution, email/export/HTTP remain outside baseline activation. No residual risk is accepted by this report.
