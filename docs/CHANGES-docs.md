# Documentation changes

Record of documentation changes that the release reviewers check against the code. Owner: documentation.

> Publication update (2026-10-06): 1.1.0 is published on npm, ghcr and GitHub Release; the 1.1.1 release is in progress. See [current release status](releases.md#release-status-2026-10-06). The tables below preserve the wording at their original review checkpoints, including superseded pre-publication labels.

## 1. Final gate blockers B4 and B6 (2026-10-06)

Source: [1.1.0 final gate review](security/final-gate-review-1.1.0.md) §2, §3.1 and §4. Documentation only: no `src/`, test, workflow, `manifest.json` or `server.json` change, and nothing was re-tested. The `--help` text in `src/index.ts:16-17` still mentions email actions and the old preview contract; changing it is a `src/` edit that reopens B1/B2, so it is left to the core owner.

### B4: public claims reduced to the evidence

| File | Before | After |
|---|---|---|
| `README.md`, `README.es.md` (What it can do) | "78 of the 79 API operations are available, grouped into 51 tools" | "77 of the 79 API operations are executable, grouped into 50 tools"; the Darktrace/Email action is excluded; `GET /aianalyst/incidents` is not available |
| `README.md`, `README.es.md` (table) | Darktrace/Email "dashboards, reference data" → `read`; "hold, release and other email actions" → `critical` | One row: dashboards, reference data, email metadata, search, audit events → `sensitive`. Email-action row removed |
| `README.md`, `README.es.md` | "19 operations passed real queries on a Darktrace 7.1.0 lab" | "56 operations have evidence from one Darktrace 7.1.0 lab; for 11 of them it is partial (for example, Antigena `clear` only). Email reads are not lab-validated (the lab token got 403)" |
| `README.md`, `README.es.md` (profiles) | `sensitive`: "email content" | "email metadata and search" (the email download returns only size and SHA-256) |
| `README.md`, `README.es.md` (profiles) | `write`: "`dryRun:true` shows a preview" | Adds: without it the write runs, relying on the client's tool-permission prompt (default `writeApproval=host`) |
| `README.md`, `README.es.md` (profiles) | `critical`: "Antigena actions, intel feed, subnets, email actions, deleting a tag … Runs only with `confirm:true`. Without it you get a preview" | Email actions removed. `dryRun:true` gives a preview with `previewId`; runs only with `confirm:true` + that `previewId` and, by default, an accepted server dialog; without `confirm:true` the call is refused |
| `README.md`, `README.es.md` (profiles) | `all`: "Everything above / Same rules as each profile" | Adds: starts only with `DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE=true`; any `sensitive`+`write` list needs it too; `DARKTRACE_CRITICAL_APPROVAL=host` needs `DARKTRACE_ACKNOWLEDGE_HOST_APPROVAL=true` |
| `README.md`, `README.es.md` (Docker) | "The image is built for linux/amd64 and linux/arm64" | Adds: for 1.1.0 the arm64 image passed the local Docker gates; amd64 is verified by CI on the release commit (link to the new status section) |
| `README.md`, `README.es.md` (badge alt) | "private image archive or local build, pinned image ID" | "local build or ghcr.io image, pinned image ID" |
| `README.md`, `README.es.md` (Project status) | "Published as … on npm …, ghcr …" | The release workflow publishes these from v1.1.0; each channel is live only once v1.1.0 is published. Link to known limitations |
| `SECURITY.md:3` | "the private `nuoframework/darktrace-mcp` repository" | "the public `nuoframework/darktrace-mcp` repository" |
| `SECURITY.md:7` | "Unreleased (main): 78 of 79 operations … 19 read operations are lab-validated" | "1.1.0 (candidate, not yet published)": 77 executable operations in 50 tools, email action excluded, deprecated route unavailable, 56 with lab evidence (11 partial), email reads not lab-validated, link to known limitations |
| `SECURITY.md:10` | "Open scanner findings are listed in the Docker guide (current candidate)" | v1.0.0 scanner findings are in the Docker guide; the 1.1.0 image has no scan record yet |
| `SECURITY.md:14` (reporting route) | Issue in "this private repository" for authorized collaborators; advisory endpoint "a reference, not an active reporting route" | GitHub private vulnerability reporting (Security tab → Report a vulnerability, advisory form). Fallback: a public issue that only asks for a private channel, with no details |
| `SECURITY.md:26` | `critical` (… email actions …) "return a preview unless the call carries `confirm:true`" | Email actions removed. Preview → `confirm:true` + single-use `previewId` → default server dialog; without `confirm:true`, `confirmation_required`. Ordinary writes default to `host`. Both acknowledgements named. No taint control. Previews and refusals audited; sensitive reads not |
| `SECURITY.md:27` | Not available: HTTP, export, deprecated route | Adds the Darktrace/Email action |
| `SECURITY.md:36` (Distribution) | Releases published only by `release.yml`, including GitHub Release assets (`.tgz`, `.mcpb`, …) | `release.yml` publishes npm and ghcr; the ghcr image is rebuilt, not the CI-tested image; the GitHub Release and its assets are created by the owner; nothing is published for 1.1.0 until those steps run |
| `CHANGELOG.md` 1.1.0 | "78 of the 79 … as 51 tools"; "critical actions need `confirm:true` and otherwise return a preview"; "`DARKTRACE_SENSITIVE_READ` and `DARKTRACE_WRITE_CRITICAL` keep working"; "Operations without lab evidence are marked" | 77 executable / 50 tools (1 excluded, 1 deprecated); email reads need `sensitive`; 56 with lab evidence, 11 partial. New bullets: write controls (§8), sensitive+write acknowledgement, email-action exclusion, legacy variables may only agree or narrow. Heading says "not yet published" |
| `CHANGELOG.md` 1.1.0 | No limitations section | New "Known limitations in 1.1.0": the 15 residuals of the gate review §4, including the Docker status (arm64 local gates passed, amd64 CI only, no 1.1.0 scan) |
| `docs/tools.md` (generator `scripts/generate-tools-doc.mjs`) | "51 tools cover 78 of 79 API operations"; critical count 6; `darktrace_email_action` listed as an available critical tool | "50 tools cover 77 executable operations"; 1 excluded + 1 deprecated; critical count 5; the email action appears only under "Not available" with its reason. Generator now treats only `status: implemented` as available |
| `docs/tools.md` | "56 operations passed real queries"; Lab "yes" for every `validatedOn` row; hard-coded 19-operation list | Lab column from `validatedOn` only, with 11 rows qualified as partial: `POST /antigena` (`clear` only), `POST /antigena/manual` (one `connection` block), `POST /subnets` (label only), `POST /intelfeed` (add/remove only), `GET /models`, `/components`, `/enums` (`responsedata` only), `GET /pcaps/{filename}` (old partial contract; current full-or-error contract not tested live), three GET Advanced Search forms (before the CR-02 encoding change; probe for `=` only). Header states email reads are not lab-validated and most write evidence predates the final write controls |
| `docs/tools.md` | `critical`: "act on email … Needs `confirm:true`"; PCAP "Download a packet capture file"; email download "Download a raw email" | Critical: preview → `confirm:true` + `previewId` → default dialog, else `confirmation_required`. PCAP: whole or refused with `output_limit_exceeded` above about 45 KB. Email download: size and SHA-256 only. `all`/`sensitive`+`write` acknowledgement stated |
| `docs/security.md` | "Writes accept `dryRun:true`. Critical actions only run with `confirm:true`; otherwise they return a preview"; "Every write and critical call" audited | Full critical sequence and refusal; host-approval acknowledgement; audit covers writes, previews and refusals, not sensitive reads; rate limit and breaker |
| `docs/security.md` | — | New limits: the server cannot confirm a human approved; no taint control between `sensitive` and `write` |
| `docs/security.md` (Lab validation) | "19 read operations passed real queries" | 56 with lab evidence, 11 partial, email not validated, most write evidence predates the final controls |
| `docs/security.md` | Report: "See SECURITY.md"; records table without the 1.1.0 writes records | Names GitHub private vulnerability reporting; adds a "Writes and 1.1.0" records row |
| `docs/troubleshooting.md`, `docs/es/troubleshooting.md` | "Critical action returns only a preview — `confirm:true` missing"; critical row lists "email actions"; "Critical actions return a preview unless the call has `confirm:true`" | Symptom is `confirmation_required` / `preview_required`; email action listed as excluded; three-step critical flow with the preview error codes; new startup-error row and step for both acknowledgements; breaker and DELETE 502 note |
| `docs/architecture.md:14-17` | "78 of 79 … 51 tools"; "`critical` operations return a preview unless the call carries `confirm:true`"; "19 read operations passed a Darktrace 7.1.0 lab" | 77 of 79 executable in 50 tools, email action `blocked`; acknowledgements; preview → confirm + `previewId` → default dialog, else `confirmation_required`, with a link to CHANGES-core §8; 56 with lab evidence, 11 partial, email not validated |
| `docs/architecture.md` §3.2 flowchart | critical: `confirm:true?` no → preview | critical: `dryRun` → preview; otherwise `confirm:true` + valid `previewId` + approval, or denied. Adds that the server cannot verify a human answered |
| `docs/architecture.md` §3.3, §10.2 | "Fresh scans retain …"; links to "current candidate" | The scans are of the v1.0.0 image; the 1.1.0 runtime has no scan record yet; links to the new Docker sections |
| `docs/docker.md` | "Current candidate at a glance" = v1.0.0 image; "Since v1.1.0 the release workflow publishes it" | New "1.1.0 image verification status": arm64 local build `sha256:7e5a2a41…6aad` passed the local CI Docker checks; amd64 only via CI; ghcr image is rebuilt; live Docker session only on a pre-remediation build; no 1.1.0 scan; no attestation. Old table renamed "v1.0.0 image at a glance (previous release)". Publication stated as pending |
| `docs/getting-started.md`, `docs/es/getting-started.md` | Preset "`all`" without conditions | `all` starts only with `DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE=true` in the client entry |
| `docs/releases.md` | "Deterministic regeneration of the full-API fixture still requires independent review under E11" | E11 content review recorded as ACCEPT in the final gate review §1.5 |
| `docs/releases.md` | — | New "1.1.0 evidence files": the two release receipts with hashes, the superseded V-W-01 receipt, release pins, lab campaign, signing probe, per-operation lab results; and what is not yet available (amd64/Node 22 CI receipts, 1.1.0 scan, owner decisions, release assets) |
| `docs/ux-stability-report.md` | "all 51 tools and 78 operations" without context | Dated-record note: that run predates the email-action exclusion; 1.1.0 exposes 50 tools / 77 operations |

### B6: review records corrected against the code

| File | Before | After (evidence) |
|---|---|---|
| `docs/security/adversarial-results-writes.md` | "V-W-01 — OPEN, real compatibility regression" | CLOSED by `6b8d08d`: `src/client/signer.ts:80-88` classifies S6 by method (exact POST search route has no S6 segment; other POST/non-GET refused), GET checks `:89-94` unchanged; test `test/unit/signer.test.ts:102-111`; the six `ST-20.NONGET post_advancedsearch_api_search` cases PASSED in both release receipts; POST search passed live afterwards. Original text kept as history |
| same | DR-W summary "9 / 5 / 5"; totals 45 / 5 / 8; "OPEN … DR-W-09/12/14/15/16. PARTIAL … DR-W-03/04/08/17/19" | DR-W 12 CLOSED / 3 OPEN / 4 PARTIAL; totals 48 / 3 / 7; OPEN DR-W-12/14/15; PARTIAL AD-W-18, CR-11/12, DR-W-03/04/17/19. Evidence for the rows already marked CLOSED: DR-W-09 `src/tools/index.ts:68,111`; DR-W-16 `src/config/load.ts:246`; DR-W-08 `src/tools/index.ts:92-93,118` |
| same | CR-03 and DR-W-06 rows said V-W-01 still blocks POST Advanced Search transport | Marked as true at that snapshot and fixed since |
| same | Final checks table ended at the failing 1,147-test run | Adds the post-fix result: 1,150 total; Linux arm64 1,150 pass; macOS 1,147 pass + 3 platform skips |
| `docs/CHANGES-core.md` §4 | S6 Base64 "verbatim" in path and signature; S4 "signed as `path?query&{compact json}`"; PCAP content "cut and marked `partial:true`" | Marked corrected. S4 refused before signing (`src/client/httpClient.ts:571-574`, `src/client/signer.ts:182-185`); S6 percent-encoded once and signed as sent (`src/client/httpClient.ts:205-208`, `src/client/signer.ts:73-77,80-94`); downloads whole or `output_limit_exceeded` with size and SHA-256 (`src/client/httpClient.ts:688-694`, `src/tools/index.ts:288-295,446-448`); email download returns size and digest only (`src/tools/index.ts:298-301`). Old choices kept under "Superseded" |
| `docs/CHANGES-core.md` §6 | GET Advanced Search PASS "confirms the S6 signing choice" | The run predates the CR-02 encoding change; the current encoding has probe evidence for `=` only |

## 2. Names used by the documentation

Names the guides rely on, checked against the code when the docs were restructured. Corrections from the B4 review are applied.

| Name | Behaviour the docs describe |
|---|---|
| `darktrace-mcp setup` | Wizard: URL, hidden token prompts, permission preset (`read`, `read,sensitive`, `read,write`, `all`), configures detected clients with backups. `all` needs `DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE=true` to start; the installer owner tracks emitting it (gate blocker B5) |
| `darktrace-mcp config <client>`, `remove`, `test`, `--check-config` / `doctor`, `--help`, `--version` | As in [configuration](configuration.md#commands) |
| `npm run docs:tools` | Regenerates `docs/tools.md`; `node scripts/generate-tools-doc.mjs --check` fails when it is stale |
| `DARKTRACE_PROFILES` | `read` (default), `sensitive`, `write`, `critical`, `all` |
| `DARKTRACE_SENSITIVE_READ`, `DARKTRACE_WRITE_CRITICAL` | Legacy. Alone they still work; with `DARKTRACE_PROFILES` set they may only agree or narrow, otherwise startup fails |
| `dryRun:true` | Value-free preview for ordinary writes; for critical writes, a preview with a single-use `previewId` (5 minutes). Without it, an ordinary write runs under `DARKTRACE_WRITE_APPROVAL` (default `host`) |
| `confirm:true` + `previewId` | Required to execute a critical write; by default also an accepted server dialog. A critical call without `confirm:true` is refused (`confirmation_required`) |
| `DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE`, `DARKTRACE_ACKNOWLEDGE_HOST_APPROVAL` | Required for `sensitive`+`write` (including `all`) and for `critical` with `DARKTRACE_CRITICAL_APPROVAL=host` |
| Audit | One JSON line with `"audit":true` on stderr for every write, preview and refusal; sensitive reads are not audited |
