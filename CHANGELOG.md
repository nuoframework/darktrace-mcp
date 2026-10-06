# Changelog

## 1.1.0 — prepared 2026-10-06 (not yet published)

- **Public distribution.** The package is `@nuoframework/darktrace-mcp` on the public npm registry (published from CI with npm trusted publishing and provenance), the image is `ghcr.io/nuoframework/darktrace-mcp:<version>` (linux/amd64 and linux/arm64, pinned by digest), and the server is described for the MCP Registry as `io.github.nuoframework/darktrace-mcp` (`mcpName` in `package.json`, `server.json`). Bootstrap: `npx -y @nuoframework/darktrace-mcp@1.1.0 setup`. When run from the npx cache, `setup` copies the verified package tree to `~/.local/share/darktrace-mcp/<version>/` and writes absolute `node` + `dist/src/index.js` paths, so clients never launch `npx`. These channels are live only after the owner's publication steps ([releases](docs/releases.md)).
- **Full API surface with profiles.** 77 of the 79 catalogue operations are executable, as 50 tools. One operation is excluded (the Darktrace/Email action, below) and one is deprecated (`GET /aianalyst/incidents`). `DARKTRACE_PROFILES` selects `read` (default), `sensitive`, `write`, `critical` or `all`. Every Darktrace/Email read needs `sensitive`. 56 operations have evidence from one Darktrace 7.1.0 lab, 11 of them only partial; the others are marked "not lab-validated" ([tool reference](docs/tools.md)).
- **Write controls.** Ordinary writes accept `dryRun:true` for a value-free preview; without it they run, relying on the host's tool-permission prompt (`DARKTRACE_WRITE_APPROVAL=host`, the default). Critical actions need a `dryRun:true` preview, then `confirm:true` with its single-use `previewId` (5 minutes) and, by default, an accepted server confirmation dialog (`approved:true`, at most one per session and four per process, 30-second deadline); a call without `confirm:true` is refused with `confirmation_required`. `DARKTRACE_CRITICAL_APPROVAL=host` needs `DARKTRACE_ACKNOWLEDGE_HOST_APPROVAL=true`. Writes are rate-limited (at most 10 per minute), a breaker stops all writes after three failed or unknown outcomes in a row until restart, optional protected targets and fixed per-call target caps apply, and every preview, refusal and write is written to a hash-chained audit line on stderr.
- **Sensitive and write together.** Any profile list with both `sensitive` and `write`, including `all`, starts only with `DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE=true`.
- **Darktrace/Email action excluded.** `darktrace_email_action` is not registered in any profile: its signing and request schema are unvalidated and the lab token got 403.
- **Older variables.** `DARKTRACE_SENSITIVE_READ` and `DARKTRACE_WRITE_CRITICAL` still work on their own. When `DARKTRACE_PROFILES` is set they may only agree with it or narrow it; a value that would add an unlisted capability stops startup.
- **Easier installation.** New `darktrace-mcp setup` wizard (hidden token entry, `0600` token files under `~/.config/darktrace-mcp/`, permission preset, automatic configuration of Claude Desktop, Claude Code, Codex, Cursor, VS Code, Windsurf, OpenCode and Gemini CLI with backups), plus `config <client>`, `remove` and `test`. One-line installers `scripts/install.sh` and `scripts/install.ps1`.
- **Claude Desktop extension.** `npm run pack:mcpb` builds a `.mcpb` bundle; Claude Desktop stores the tokens in the OS keychain.
- **Documentation restructure.** Short bilingual READMEs; task-oriented guides (getting started, clients, configuration, troubleshooting, security overview) with Spanish versions in `docs/es/`; generated tool reference (`npm run docs:tools`); past review and release reports moved to `docs/history/`.

### Known limitations in 1.1.0

From the [1.1.0 final gate review](docs/security/final-gate-review-1.1.0.md) §4. None is an exploitable defect found in the server, and none is an owner acceptance of risk.

1. **Email.** The email action is excluded. Email reads are not lab-validated (the lab token got 403). Their schemas come from darktrace-sdk 0.10.1, and responses may be sparse.
2. **Lab scope.** One 7.1.0 appliance and one broad token. Partial tests: Antigena manual block and `clear` only; subnets label only; intel feed add and remove only; models, components and enums only with `responsedata` (full lists return `too_large`). Appliance errors: `get_cves` returns 500 and `get_filtertypes` returns 302. Most write evidence predates the final write controls; after them, only the intel-feed critical flow, the `post_tags` preview, the `confirmation_required` refusal and POST Advanced Search were checked live. The GET Advanced Search forms passed live only before their path encoding changed; the current encoding has probe evidence for `=` only.
3. **PCAP.** A download is returned whole or fails with `output_limit_exceeded`. Captures above about 45 KB do not fit the 60,000-character output budget. The current contract was never tested live.
4. **DELETE and the write breaker.** The lab gateway answers 502 to every DELETE after applying it, which the server records as `outcome:"unknown"`. Three in a row open the write breaker until restart.
5. **Sensitive and write together.** There is no taint control. Once acknowledged, ordinary free-text writes (comments, tag descriptions, labels) can carry sensitive data out of the appliance. Comments cannot be deleted and every appliance user can see them.
6. **Approval.** Ordinary writes default to `writeApproval=host`: no server prompt. `host` mode delegates critical consent to the host. Auto-answering clients or "always allow" rules remove the human; the server cannot verify that a human answered.
7. **Per-process state.** Rate limits, the breaker, previews and the audit chain are per process; several host processes multiply the budgets. Audit chains share one genesis and carry no boot identifier. The audit goes to stderr only, with no external anchor. A restart resets the breaker.
8. **Sensitive reads are not audited.**
9. **Protected targets** are opt-in and match literal values only. For `post_antigena` they match the action `codeid`, not the device. `maxTargets` is owner policy.
10. **Token scope.** There is no least-privilege token mapping per profile. Appliance token permissions remain the real ceiling.
11. **Data egress.** Every result, including Base64 PCAP data and email metadata, reaches the MCP host and its model provider.
12. **Signing.** GET Advanced Search depends on proxies keeping percent-encoding byte-exact. A combined query and JSON body is refused.
13. **Distribution.** No image attestation; the SBOMs are inventories, not clearances. The ghcr image is rebuilt in `release.yml`; it is not the CI-tested image. For 1.1.0, the linux/arm64 image passed the local Docker gates; linux/amd64 is verified only by CI on the release commit, and there is no vulnerability scan of the 1.1.0 runtime yet. Docker Desktop needs `DARKTRACE_TOKEN_FILE_OWNER=root-or-current`. The `server.json` OCI launch passes tokens as container environment variables, readable by anyone with Docker access. Native Windows cannot protect token files.
14. **Previews.** The preview store evicts the oldest live critical preview once it holds 256 (availability only).
15. **Lab residue.** Undeletable `[mcp-test]` and `[mcp-ux]` comments remain on the lab appliance.

## 1.0.0 — prepared 2026-10-06

- Reviewed lab harness now requires schema-2 source/runtime and complete installed host SDK/Zod tree binding before SDK import; bounded deterministic hashing rejects symlinks and special files. Docker preflight/session use init, PID and memory limits. This is offline readiness, not final lab or image approval.

Private stable artifact preparation: package/server metadata is now `1.0.0`, with `private: true`, unchanged dependencies and immutable false write capability. Historical alpha assets remain unchanged; publication approval is separate.

- Added a private local Docker build recipe and hardened stdio setup with explicit nonroot identity, read-only token mounts, disabled daemon logging, no ports/TTY, restricted privileges/resources and immutable image selection for operator use. Final candidate image, appliance and provider gates remain separate.
- Corrected object-first response unions so device arrays keep their reviewed projection; unmodeled fields still use bounded safe output. Output projection and text neutralization are not universal compatibility or sensitive-data-removal guarantees.
- Bound MR-04's four complete MCP `tools/list` contracts (descriptions, input schemas, annotations and order) to reviewed fixture/profile hashes in candidate build evidence and checksums. Preparation compares generated listings with the versioned oracle and never recaptures it automatically.
- Added release evidence verification for missing/altered contracts, metadata and checksums, full generator inputs including operation inventory, and source-only Docker/Spanish README/vector inputs. Runtime package allowlist and locked three-library runtime dependency/SRI remain unchanged.
- Extended offline JSON/TOML and documentation launch checks to absolute installed executables, user-scoped setup, project-config trust warnings and reviewed immutable Docker templates; negative warnings are not executable advice.
- Made isolated security receipts report a nullable revision with factual Git probe metadata when Git or a checkout is unavailable; test completeness and security assertions remain required.

No new CI, lab or image success is asserted by this section. Per-operation live compatibility is partial; unresolved compatibility/security, final independent artifact review and deployment/provider approval prevent stable publication.

## 0.1.0-alpha.0 — prepared 2026-10-05

Private alpha; no npm release or container publication.

- Added English operator guides and Spanish quickstart with source installation and current MCP client configuration.
- Documented API 6.1 evidence, the unvalidated 7.1 lab target and the 79-operation inventory: 54 executable by profile, five critical previews, 19 blocked and one excluded.
- Added portable explicit build tooling, private package metadata, a shipped npm shrinkwrap and a compiled-runtime file allowlist.
- Added offline CI and local private artifact inspection; credential examples use separate token-file paths and contain no secrets.

- Added versioned private GitHub Release preparation, SHA256SUMS, verified runtime CycloneDX SBOM and installed-file inventory.
- Added isolated reproducible archive verification, exact three-library runtime/SRI checks, help/version/doctor checks and JSON/TOML example validation.
- Added `test:security` and Node 22/24 CI; manual preparation workflow has read-only repository permissions and does not publish.

Release publication, final independent review and live compatibility validation remain owner gates. This changelog is not release approval or a statement that all baseline controls have passed audit.
