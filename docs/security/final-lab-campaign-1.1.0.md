# Final lab campaign — 1.1.0 candidate (2026-10-06)

Live checks run by the release orchestrator against the owner-authorised Darktrace 7.1.0 lab
(`7.1.0 (4ff13d8c)`), after the writes remediation. Node 24.14.1 on macOS arm64 for the node
path; the hardened Docker image for the container path. Tokens were read from 0600 files; no
token value, hostname of the appliance or response content beyond shape is recorded here.

## Node (stdio), profile `all` with `DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE=true`

| Call | Result |
|---|---|
| `tools/list` | 50 tools (email action excluded by decision 8) |
| `get_status` (fast) | PASS, version `7.1.0` |
| `get_devicesearch` count 3 | PASS, 44 total, analyst fields present |
| `get_modelbreaches` minimal, minscore 0.9 | PASS, `returnedItems`/`totalItems`, `appliedDefaults` reported |
| `get_aianalyst_groups` | PASS |
| `get_antigena_summary` | PASS |
| `get_tags`, `get_subnets`, `get_intelfeed` (sources) | PASS |
| `post_advancedsearch_api_search` (sensitive) | PASS, 8 214 hits, bounded output |
| `get_pcaps` | PASS |
| `post_tags` dryRun | PASS, preview without handle (ordinary write) |
| `post_antigena` without `confirm` | denied `confirmation_required` with hint, no network |

## Critical approval flow (intel feed, reversible)

1. `post_intelfeed` `dryRun:true` → preview with `previewId`.
2. Same args + `confirm:true` + `previewId` → `elicitation/create` with the code-owned summary
   (operation, `argsHash`, every body field) and `requestedSchema.approved: boolean`.
3. Reply `accept` with `content.approved:true` → executed, appliance `SUCCESS`; `get_intelfeed`
   shows the test entry.
4. Replaying the same `previewId` → `preview_used`, no network.
5. A second preview/approval with `removeentry` → executed; `get_intelfeed` shows the entry gone.
6. Control: reply `accept` without `approved:true` → `approval_denied`, no network.

Audit lines (stderr) carried `seq`, `prevHash`, `hash`, `argsHash`, `approvalMode` for preview,
error and execution records.

## Docker (hardened run, macOS Docker Desktop)

Earlier in the day, on the pre-remediation build of the same branch: 51 tools, reads PASS, write
preview PASS, critical preview + `elicitation/create` + decline → not executed, `previewId`
consumed. `DARKTRACE_TOKEN_FILE_OWNER=root-or-current` was required because Docker Desktop
presents bind-mounted files as uid 0. The image is rebuilt and re-checked at the release gate.

## Clients

- Codex CLI: analyst questions answered through the MCP (devices, incidents, breaches, status).
- Claude Code: same, over protocol 2026-07-28; approval dialog rendered and answered live
  (see `docs/clients.md`).
- Cursor, Claude Desktop, Gemini CLI: registered by `darktrace-mcp setup` with backups; not
  driven interactively in this campaign.

Residuals: email routes answer 403 for this token (not validated); `get_cves` 500 and
`get_filtertypes` 302 are appliance-side; DELETE routes answer 502 after applying the change.

## Second lab (lab B, 2026-10-06, final tree `ea99f1e` + 1.1.0-rc image)

The first lab expired during the day; the owner provisioned a second Darktrace 7.1.0 appliance.

- **Signing difference:** lab B rejects the compact `DTAPI-Date` (`YYYYMMDDTHHMMSS`, HTTP 400 on
  `GET /status`) and accepts the spaced form; lab A accepted both. `DARKTRACE_DATE_FORMAT=spaced`
  was set for every run below. The installer now probes both formats at setup time and records the
  working one (no runtime fallback).
- **Node, profile `all` (acknowledged):** 50 tools; status, device search, breaches, AI Analyst
  groups, Antigena summary, tags, subnets, intel feed, POST Advanced Search (sensitive), PCAP
  listing: all PASS; `post_tags` preview PASS; `post_antigena` without `confirm` →
  `confirmation_required`.
- **Critical flow with revert (node):** intel feed `addentry` → preview → `confirm:true` +
  `previewId` → dialog (`argsHash`, every field, `approved` boolean) → accept → `SUCCESS`; entry
  visible; replay → `preview_used`; `removeentry` through the same flow → `SUCCESS`; entry gone.
  The `mcp-test` intel *source* name remains listed by the appliance with no entries (the API has
  no source-delete call).
- **Docker 1.1.0-rc (`sha256:7e5a2a41…6aad`, hardened run, Docker Desktop with
  `DARKTRACE_TOKEN_FILE_OWNER=root-or-current`):** the same campaign, all reads and the write
  preview PASS; critical without `confirm` refused.
