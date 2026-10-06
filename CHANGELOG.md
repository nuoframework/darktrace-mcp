# Changelog

## Unreleased

- **Full API surface with profiles.** 78 of the 79 catalogue operations are available as 51 tools (the deprecated `GET /aianalyst/incidents` stays excluded). `DARKTRACE_PROFILES` selects `read` (default), `sensitive`, `write`, `critical` or `all`. Non-critical writes accept `dryRun:true`; critical actions need `confirm:true` and otherwise return a preview. All writes are audited. `DARKTRACE_SENSITIVE_READ` and `DARKTRACE_WRITE_CRITICAL` keep working. Operations without lab evidence are marked "not lab-validated".
- **Easier installation.** New `darktrace-mcp setup` wizard (hidden token entry, `0600` token files under `~/.config/darktrace-mcp/`, permission preset, automatic configuration of Claude Desktop, Claude Code, Codex, Cursor, VS Code, Windsurf, OpenCode and Gemini CLI with backups), plus `config <client>`, `remove` and `test`. One-line installers `scripts/install.sh` and `scripts/install.ps1`.
- **Claude Desktop extension.** `npm run pack:mcpb` builds a `.mcpb` bundle; Claude Desktop stores the tokens in the OS keychain.
- **Documentation restructure.** Short bilingual READMEs; task-oriented guides (getting started, clients, configuration, troubleshooting, security overview) with Spanish versions in `docs/es/`; generated tool reference (`npm run docs:tools`); past review and release reports moved to `docs/history/`.

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
