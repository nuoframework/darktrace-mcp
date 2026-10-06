# 1.1.0 final gate review

**Decision: NOT READY.** Do not tag or publish 1.1.0 yet.

- **What passes:** the security design meets the design-review gates for every capability except the email action, which is correctly excluded. The tests are green on the merged candidate. The CI and release pins match the tree byte for byte.
- **What blocks:** seven finite blockers remain open (§5). They concern public documentation that claims more than the evidence, an installer option that produces a configuration that cannot start, remote CI on the platforms not yet run, Docker and publication steps, and dated owner decisions.
- **What it is not:** none of the blockers is an exploitable defect in the server. Nothing here is a zero-CVE claim or an acceptance of residual risk.

| | |
|---|---|
| Date | 2026-10-06 |
| Reviewer | Independent final gate reviewer. I wrote none of the changes under review. |
| Branch | `nuoframework/final-gate-<reviewer>` (this file is my only commit) |
| Format | follows [final-stable-gate-review.md](final-stable-gate-review.md) and [first-stable-coordinator-decision.md](first-stable-coordinator-decision.md) |

Evidence labels:

- **[O]** I observed it: read the code, hashed the file, or ran the command.
- **[R]** Reported in a project record that I read but did not reproduce.
- **[H]** Historical: bound to an earlier source, image or lab snapshot.

## 1. Scope and exact HEAD

### 1.1 Candidate identity [O]

I reviewed `b8f2e49`, then fast-forwarded to the release-pins merge as instructed. Between the two, `src/`, the READMEs, `SECURITY.md`, `CHANGELOG.md`, `docs/tools.md`, `manifest.json` and `server.json` are unchanged.

| Item | Value |
|---|---|
| HEAD | `2a904539e2989db1937bf9cbcdcfd80dc31a6819` ("Merge release gate alignment…"), tip of `feat/full-api-easy-install` |
| Tree | `9e00c6dbdd7fc8fc7d2e9a04d7371e7a49e5ca94` |
| `src/` tree SHA-256 (algorithm of `run-isolated.mjs`) | `5b1208f1c0994996f698803a0468f7b25a3b256fe033bbe20ad50ad50fdc503e` |
| `test/security/fixtures/mcp-tool-contracts-full-api.json` | `df8ca493e50a9f8eef2dd883c8e7a4f3b36b2effa0cba72cf36ed07ab488ded5` |
| `scripts/verify-release.mjs` | `3d75cd9d635cb2aba425170976c953fc15d2a8c92192c4005befed3020dce685` |
| `scripts/prepare-release.mjs` | `90033b4e13eb7cf1cade4e3a9c450b3dc4238ebb075a4c210891669f0cf21842` |
| `test/security/mcp-contracts.mjs` | `06768ecd09e65c7878e8c18e2ffade18ae2eef3220519a7022ac09613f78375a` |
| `.github/workflows/ci.yml` | `21fe10709f7b48135fa36092ccabcb331ebb25658703c628bd24587cff58dfb2` |
| `.github/workflows/release.yml` | `813421befdd70eab3c7559b0b32a6a293c3afde5aed90ff703bc3481d288d29e` |
| `src/policy/release-capability.ts` | `370bbba525edcb1ffa6cdbd4914fb2108a4219124067b8002160c837a6fca22c` |
| `package.json` | `9fd3c3aa8877c79f6082d41d9be44f0cff6899a7b65c4b3dc6ef687fd57ac614`, version `1.1.0` |

Tool surface, counted from the fixture [O]. These counts also match `verify-release.mjs` and `ci.yml`.

| Profile | Tools / operations |
|---|---|
| `read` | 27 / 38 |
| `read+sensitive` | 36 / 56 |
| `read+write` | 36 / 54 |
| `read+write+critical` | 41 / 59 |
| `all` | 50 / 77 |
| `read+sensitive+write` | 45 / 72 |

The approval variants `critical-host` and `write-elicitation` keep the counts of their base profile. The email action appears in no profile.

### 1.2 Inputs read

- Change records: `docs/CHANGES-core.md` (including §8 and the §8.11 exceptions), `CHANGES-install.md`, `CHANGES-dist.md`, `CHANGES-docs.md`.
- Security records: `threat-model-writes.md`, `security-test-plan-writes.md`, `design-review-writes.md` (§6), `code-review-writes-client.md`, `adversarial-results-writes.md` (including "Verification after remediation"), `mcp-attack-research-round2.md`, `lab-signing-evidence.md`, `client-remediation-notes.md`, `final-lab-campaign-1.1.0.md`, `release-pins-1.1.0.md`, `docs/ux-stability-report.md`.
- Receipts: the four newest in `test/security/evidence/`.
- Release tooling: `ci.yml`, `release.yml`, `verify-release.mjs`, `prepare-release.mjs`, and the diff of release-pins commit `e965ff5`.
- Public files: `README.md`, `README.es.md`, `SECURITY.md`, `CHANGELOG.md`, `docs/tools.md`, `docs/configuration.md`, `server.json`, `manifest.json`.
- Code read directly:
  - `src/index.ts`;
  - `src/config/load.ts` (acknowledgement gates);
  - `src/cli/entry.ts` (presets);
  - `src/server/stdio.ts`;
  - `src/policy/release-capability.ts`;
  - the V-W-01 diff `6b8d08d` (`src/client/signer.ts`).

### 1.3 Test runs by the reviewer [O]

Environment: macOS arm64, Node v24.14.1, npm 11.11.0, after `npm ci --ignore-scripts` (18 packages, no tracked files changed).

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0, no diagnostics |
| `npm test` | **213 tests, 213 pass, 0 fail, 0 skipped**, 0 cancelled, 0 todo |
| `npm run test:security` | **1,150 tests, 1,147 pass, 0 fail, 3 skipped**, 0 cancelled; `buildStatus 0`, `testStatus 0` |

**My security receipt:** `test/security/evidence/2026-10-06T13-12-38-653Z.json`, SHA-256 `98a82c05f9ba7f8bea2c6060e8486efdf0615d398d5681a919bac548abe1a95e`. Its contents:

- Run state: `receiptComplete:true`, commit `2a904539…`, 80,687 assertion invocations.
- Source tree: `5b1208f1…fdc503e`.
- Subcases: 1,150, of which 1,147 PASSED and 3 BLOCKED. The three blocked cases are ST-02.FILE PUBLIC 2600, ST-02.FILE PRIVATE 2600 and ST-02.POLICY 2600. They test file modes with the setgid bit, which macOS discards. They are classified platform skips.
- Runtime: 91 runtime hashes, aggregate `3bd374dcf7225557ba56d4737e381698a0e0a4bccf03cc00d62f00ced84c7284`.
- Fixtures: full-API `df8ca493…`, first-stable `6ddda205…`.

**Earlier attempt:** at `b8f2e49`, before dependencies were installed, all three commands failed before running any test. That attempt left the untracked receipt `2026-10-06T11-57-27-297Z.json` (`buildStatus 1`). Neither receipt is committed (§6).

### 1.4 Test evidence history [O, read from receipts]

| Receipt | Source tree | Subcases | PASS / FAIL / BLOCKED | `tests.status` |
|---|---|---:|---|---:|
| `2026-10-06T11-44-04-525Z.json` [H] | `82c0d44e…` | 1,147 | 1,138 / 6 / 3 | 1 (V-W-01) |
| `release-1.1.0-linux-arm64-2026-10-06T12-43-25-292Z.json` [O] | `5b1208f1…` | 1,150 | 1,150 / 0 / 0 | 0 |
| `release-1.1.0-macos-arm64-2026-10-06T13-06-41-906Z.json` [O] | `5b1208f1…` | 1,150 | 1,147 / 0 / 3 | 0 |
| Mine, `2026-10-06T13-12-38-653Z.json` [O] | `5b1208f1…` | 1,150 | 1,147 / 0 / 3 | 0 |

- **Hashes match the release-pins record.** The two release receipts hash to `cd71cecd…dad9` (Linux, Node v24.18.1) and `5699ae23…0736` (macOS), as `release-pins-1.1.0.md` states. Both record runtime aggregate `3bd374dc…` and fixture `df8ca493…`.
- **V-W-01 is fixed.** The six Advanced Search POST failures are gone. The diff of `6b8d08d` is narrow: only the exact POST route `/advancedsearch/api/search` skips S6 parsing, and the GET S6 checks are unchanged [O].
- **Remote CI is still needed.** Linux amd64, the Node 22 matrix leg and the amd64 Docker job have no receipt yet (B1).

### 1.5 E11: independent review of the full-API contract fixture [O]

CHANGES-core §8.11 E11 and `release-pins-1.1.0.md` say the regenerated fixture needs an independent review. I reviewed its content across all eight contracts:

- **Matches the server.** My test run regenerated the `tools/list` output, and the MR-04 suites compared it with the fixture: same bytes, under each pinned profile.
- **No injected or hidden text.** No description contains injection markers, URLs, ANSI codes or bidi/zero-width code points. The only `<`/`>` characters are the `<query>` placeholder in the Advanced Search description.
- **Email action absent.** No contract mentions the email action.
- **Closed input schemas.** Every input schema, including each `anyOf` branch and nested object, is closed (`additionalProperties:false` or `propertyNames`).
- **Annotations follow the rules.**
  - `readOnlyHint` holds exactly for all-read tools, including the two POST searches.
  - `destructiveHint` holds for every high and critical tool and for the three irreversible medium tools (both comment tools and the investigation tool).
  - Acknowledge/unacknowledge and pin/unpin are non-destructive.
  - `confirm` appears only on the five critical tools.
- **Approval wording matches the channel.**
  - Default critical tools say the user "must then also accept a confirmation dialog".
  - The `critical-host` variant says "relying on the host's own tool-permission prompt; no server confirmation dialog".
  - The `write-elicitation` variant says "the user must accept a server dialog".
  - Union profiles append the fixed AD-W-18 notice.

**E11 verdict: ACCEPT.** Two cosmetic notes, neither blocking:

1. The host-variant sentence repeats "confirm:true + previewId" twice.
2. The comment tools do not say that comments are visible to every appliance user (DR-W-09's secondary point).

This review covers the fixture's **content**. It is not live evidence that a host shows these descriptions faithfully.

## 2. Per-capability verdicts

Locally, the common test gate B1 holds on macOS, plus the reported Linux arm64 receipt. Remote CI still has to confirm it.

| # | Capability | Verdict | Evidence | Finite blockers |
|---|---|---|---|---|
| 1 | **Reads** (27 tools / 38 operations) | **ACCEPT WITH DISCLOSED RESIDUALS** | CHANGES-core §6 live on 7.1.0 [R]; post-remediation reads in the final campaign [R]; code-owned views; per-profile `tools/list` hash pinned [O]; suites green [O]. | B1 (remote CI) |
| 2 | **Sensitive reads** (Advanced Search, PCAP download, audit events) | **ACCEPT WITH DISCLOSED RESIDUALS** | POST search passed live after the V-W-01 fix (8,214 hits) [R]. The GET forms passed live only before CR-02 switched them to percent-encoding; the probe covered the encoded form for `=` only [R]. PCAP follows a full-or-error contract (synthetic tests only). The 79,725-byte lab capture would now be refused: its 106,300 Base64 characters exceed the 60,000-character budget [O, arithmetic]. Sensitive reads are not audited (DR-W-04 partial). | B4 (lab flags) |
| 3 | **Reversible writes** (ack/unack, pin/unpin, tag create/assign/unassign) | **ACCEPT WITH DISCLOSED RESIDUALS** | Live PASS with revert before the §8 remediation [H]. Post-remediation live check: `post_tags` preview only [R]. The §8 controls (targets, rate limits, breaker, audit) are tested synthetically [O, suites green]. With the default `writeApproval=host`, no server prompt appears. | — |
| 4 | **Tag delete, subnets, intel feed** (critical) | **ACCEPT WITH DISCLOSED RESIDUALS** | DR-W-01/02/04 closed [R]. After remediation, the full intel-feed flow ran live [R]: preview → dialog with argsHash and every field → `approved:true` executes → replay returns `preview_used` → accept without `approved` returns `approval_denied`. Subnets: label only [H]. `delete_tags_tid`: 502, still not lab-validated [R]. | B4 (scope flags) |
| 5 | **Antigena / RESPOND** | **ACCEPT WITH DISCLOSED RESIDUALS** | All six DR-W §6 NO-GO items are closed or reconciled [R]. Live before remediation: a manual block, then `clear` [H]. After remediation: a call without `confirm` returned `confirmation_required` with no network [R]. Activate, extend and reactivate were never run live. The protected-target path for `post_antigena` is `body.codeid`, not the device [R]. | B4, B8 |
| 6 | **Email reads** (13 operations, `sensitive`) | **ACCEPT WITH DISCLOSED RESIDUALS** | Code-owned minimal views; download returns size and digest only; schema digests pinned to SDK 0.10.1 [R]. **Not lab-validated:** the lab token got 403. The README places dashboards and reference data under `read` [O]. | B4 |
| 7 | **Email action** | **EXCLUDED.** The exclusion is accepted; the capability is NOT READY. | `blocked` in the catalogue; absent from the production descriptors [O, `src/server/stdio.ts:13`]; absent from all eight contracts [O]; E1 tests expect `operation_denied` with zero effects [O, suites green]. **Public docs still advertise it** (§3.1). | B4. Re-enabling it needs a reviewed schema, a signing proof with an email-licensed token, and a new design review. |
| 8 | **`all` / sensitive+write union** with acknowledgement | **Server: ACCEPT WITH DISCLOSED RESIDUALS. Installer, `.mcpb` and registry paths: NOT READY.** | Without `DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE=true`, `loadConfig` refuses to start in stdio, `doctor` and `--check-config` [O, `src/config/load.ts:300-311`, `src/index.ts:33`]. CI and `verify-release` now set the acknowledgement [O]. ST-23 still shows authorized copying; there is no taint control (DR-W-03 partial). **But** the `setup` preset `all` emits only `DARKTRACE_PROFILES=all` [O, `src/cli/entry.ts:9,103,116`], and the `.mcpb` `profiles` option and `server.json` have no acknowledgement either. Those entries fail at startup: closed, but advertised. | B5, B8 |
| 9 | **Approval: push elicitation** | **ACCEPT WITH DISCLOSED RESIDUALS** | `approved:boolean` is required; only a correlated accept with `approved:true` counts. At most 1 pending prompt per session and 4 per process. Deadline = min(30 s, preview TTL), and expiry is rechecked after approval [O, suites green]. Exercised live with a scripted client [R]. The server cannot verify a human answered. | — |
| 10 | **Approval: 2026-07-28 `input_required`** | **ACCEPT WITH DISCLOSED RESIDUALS** | Holds no slot. The HMAC state is single-use and lasts 120 s. The preview is re-reserved on retry (E10) [R]. A live dialog in a 2026-07-28 host client was rendered and answered [R]. | — |
| 11 | **Approval: `host`** | **ACCEPT WITH DISCLOSED RESIDUALS** | Needs `DARKTRACE_ACKNOWLEDGE_HOST_APPROVAL=true` at startup [O]. Its description variant is pinned and reviewed (§1.5). `approvalMode:"host"` is written to the audit [R]. Consent is delegated: an "always allow" rule removes the human. Ordinary writes default to `host`. | B8 |
| 12 | **Distribution** (npx/npm, ghcr, `.mcpb`, MCP Registry) | **NOT READY** | Pins and structure are consistent [O, §3.2]. `release:prepare` and `--check-evidence` passed locally [R]. **But:** `release.yml` neither builds the `.mcpb` nor creates a GitHub Release, although the README links `darktrace-mcp-1.1.0.mcpb` from it. `publish-ghcr` rebuilds and pushes without running the Docker gates [O]. `SECURITY.md` still describes a private repository [O]. | B5, B9 |
| 13 | **Docker runtime** | **NOT READY** | Linux arm64 image `sha256:7e5a2a41…6aad` passed every local CI Docker check; its byte binding matches the receipt [R]. No amd64 run yet. The only live Docker MCP session used the pre-remediation build [R]. There is no scan or dated applicability statement for the 1.1.0 runtime, and `docs/docker.md` still presents v1.0.0 as the current candidate [O]. | B1, B7 |

## 3. Consistency checks

### 3.1 Documentation claims compared with evidence

| Claim (file) | Evidence | Status |
|---|---|---|
| "78 of the 79 API operations … 51 tools" (`README.md:87`, `README.es.md:87`, `CHANGELOG.md:6`, `docs/tools.md:7`, `SECURITY.md:7`) | 77 operations / 50 tools in `all` [O]; the final lab saw 50 tools [R]; CHANGES-core §1 now says 50/77 [O] | **Over-claim** |
| `darktrace_email_action` listed as an available `critical` tool (`docs/tools.md:157`, critical count 6 at `:17`); "hold, release and other email actions" (`README.md:109`, `README.es.md:109`); email actions among the critical capabilities (`SECURITY.md:26`, `docs/architecture.md:16`, `--help` at `src/index.ts:16`) | Blocked and never published [O] | **Over-claim.** Move to "Not available". |
| "Darktrace/Email: dashboards, reference data → `read`" (`README.md:107`, `README.es.md:107`) | Every email read needs `sensitive` [R; `docs/tools.md` agrees] | **Wrong profile** |
| "19 operations passed real queries" (`README.md:112`, `README.es.md:112`, `SECURITY.md:7`) vs "56 operations passed" (`docs/tools.md:8`) | `validatedOn` is set on 56 operations [R] | **Contradictory** |
| `docs/tools.md` Lab "yes" for `GET /pcaps/{filename}` | Live: prefix, size and SHA under the superseded partial contract; the current contract would refuse that capture | **Over-claim** |
| Lab "yes" for `POST /antigena`, `/subnets`, `/intelfeed`, `GET /models`, `/components`, `/enums` | Only `clear` / `label` / add-remove / with `responsedata` [R]; DR-W-12 still OPEN | **Over-claims scope** |
| Lab "yes" for the three GET Advanced Search forms | Passed before CR-02 changed the encoding; the current form has only probe evidence for `=` [R] | Qualify |
| "`critical` … Without [`confirm:true`] you get a preview" (`README.md:123`, `README.es.md:123`, `SECURITY.md:26`, `CHANGELOG.md:6`, `docs/security.md:12`, `docs/troubleshooting.md:124`, `docs/architecture.md:16`, `src/index.ts:16-17`) | Without `confirm` the server returns the `confirmation_required` denial, also seen live [R]. `docs/configuration.md:57` has it right. | **Stale** (pre-§8 contract) |
| "`all`: Everything above, same rules" (`README.md:124`), plus the `setup`, `.mcpb` and `server.json` `all` choices | Requires `DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE=true` [O]; `docs/configuration.md:58-62` has it right | **Incomplete.** The generated entries do not start (B5). |
| "`DARKTRACE_SENSITIVE_READ` and `DARKTRACE_WRITE_CRITICAL` keep working" (`CHANGELOG.md:6`) | With `DARKTRACE_PROFILES` set they may only agree or narrow (DR-W-16) [O, `load.ts:251`] | **Incomplete** |
| CHANGELOG 1.1.0 (it becomes `release-notes.md`) | No entry for the §8 controls or the email-action exclusion | **Missing** |
| `SECURITY.md:3,14` (private repository and its reporting route); `:7` "Unreleased (main)" | The repository becomes public; the version is 1.1.0 [R] | **Stale** |
| README Docker badge alt text says "private image archive"; `docs/docker.md:9-30` "current candidate" = v1.0.0 | 1.1.0 ships through ghcr | Stale |
| `README.md:149` "Published as … on npm …, ghcr…" | Nothing is published yet | Acceptable only once B9 succeeds |

Records reviewers rely on that still disagree with the code (not shipped):

- **CHANGES-core §4** still describes S6 as "verbatim", S4 as signed `path?query&{json}`, and PCAP results as `partial:true`. CR-02, CR-03 and §8.9 superseded all three, but §4 is not marked superseded. (§1 is now correct.)
- **`adversarial-results-writes.md`**:
  - It still lists V-W-01 as OPEN, although `6b8d08d` fixed it [O, receipts green].
  - Its DR-W summary says "9 / 5 / 5" and lists DR-W-09 and DR-W-16 as OPEN. Its own table gives 12 CLOSED (01, 02, 05–11, 13, 16, 18), 4 PARTIAL (03, 04, 17, 19) and 3 OPEN (12, 14, 15) [O].
- **`CHANGES-dist.md`** verification counts (155 / 325) and its CI pin `582a1212…` are historical.
- **`CHANGES-docs.md`** asks to be deleted once reconciled; its notes on `dryRun` and the legacy variables are outdated.

### 3.2 CI and release pins compared with the current tree [O]

The release-pins merge recomputed every pin. Each value below appears in `ci.yml` and/or `verify-release.mjs`, and I compared it with my own run and hashes. **No mismatch remains.**

| Pin | `ci.yml` / `verify-release.mjs` | Observed by me |
|---|---|---|
| Functional tests / pass | 213 | 213 / 213 |
| Security tests / pass | 1150 (Linux, 0 skips) | 1,150 tests: 1,147 pass + 3 macOS skips |
| `sourceTreeSha256` | `5b1208f1…fdc503e` | `5b1208f1c0994996f698803a0468f7b25a3b256fe033bbe20ad50ad50fdc503e` |
| `subcases.length` | 1150 | 1,150 |
| Runtime file count | 91 | 91 |
| Runtime aggregate | `3bd374dc…7284` | `3bd374dcf7225557ba56d4737e381698a0e0a4bccf03cc00d62f00ced84c7284` |
| Full-API fixture | `df8ca493…ded5` (ci ×2, verify) | `df8ca493e50a9f8eef2dd883c8e7a4f3b36b2effa0cba72cf36ed07ab488ded5` |
| `read` | `734a9e33…833a` | identical (fixture `contracts.read.sha256`) |
| `read+sensitive` | `d885ce0e…b046` | identical |
| `read+write` | `1820b2b8…4f22` | identical |
| `read+write+critical` | `c5372a1b…0aae` | identical |
| `all` | `90c0a24a…f53d` | identical |
| `read+sensitive+write` | `3ccf0ef5…5b64b` | identical |
| `read+write+critical/critical-host` | `f1b54574…e646` | identical |
| `read+write/write-elicitation` | `cbd4ac4d…68e5bd` | identical |
| Tools / operations per profile | 27/38, 36/56, 36/54, 41/59, 50/77, 45/72, 41/59, 36/54 | identical (§1.1) |
| Production descriptors; critical-operation oracle | 77; 5 operations, email action asserted absent | 77 implemented rows; email action not registered [O, code] |

Historical pins all match [O]:

- First-stable fixture `6ddda205…213c`; alpha fixture `37b5af95…2f72`.
- `test/historical/alpha-read-write/provenance.json` `2d9bffe6…8d60`.
- `alpha-stdio/provenance.json` `33cbdcac…11a8`, with `stdio.test.ts.txt` `e14fb7a0…1d5c`.
- `validated-contract-predecessor/provenance.json` `7390a234…f878`, with its fixture copy `ea31d70a…707f`.
- `validated-scope-predecessor/provenance.json` `35d826f3…c4e675`.

The four structural problems from my first pass at `b8f2e49` are fixed in `e965ff5` [O, diff]:

1. Every `doctor`, `--check-config` and SDK smoke start now sets `DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE=true` and `DARKTRACE_ACKNOWLEDGE_HOST_APPROVAL=true`.
2. Production descriptors are pinned at 77, with the email action asserted absent.
3. The fixture key set covers all eight contracts.
4. The CI smoke now covers `read,sensitive,write` and both approval variants.

One remaining gap: the CI image smoke always sets both acknowledgements, so CI never checks on the built image that `all` **without** the acknowledgement refuses to start. Unit tests and MR-06 cover that refusal [R]. Low; optional.

### 3.3 Version literals: all `1.1.0` [O]

- `package.json`.
- `package-lock.json` and `npm-shrinkwrap.json` (root and `packages[""]`).
- `src/server/createServer.ts:18` `VERSION`.
- `manifest.json`.
- `server.json`: top level, the npm package, and the OCI package tagged `ghcr.io/nuoframework/darktrace-mcp:1.1.0`.
- The README install commands.
- `CHANGELOG.md`.

`release.yml` derives the image version label from the tag. The remaining `1.0.0` mentions in `docs/docker.md` and `docs/releases.md` are labelled as history.

### 3.4 Names [O]

- `@nuoframework/darktrace-mcp` is the same in `package.json`, the lock file, the shrinkwrap, `server.json` `packages[0].identifier`, `verify-release.mjs` and `manifest.json` `long_description`.
- `mcpName` and `server.json` `name` are both `io.github.nuoframework/darktrace-mcp`.
- The OCI identifier matches `release.yml` `IMAGE`.
- `manifest.json` `name` is `darktrace-mcp`: the bundle identifier, intentionally unscoped.

No mismatch.

## 4. Residual risks to disclose in the release notes

1. **Email.** The email action is excluded. Email reads are not lab-validated (the lab token got 403). Their schemas come from SDK 0.10.1, and responses may be sparse.
2. **Lab scope.**
   - Lab: one 7.1.0 appliance, one broad token.
   - Partial tests:
     - Antigena: manual block and `clear` only.
     - Subnets: label only.
     - Intel feed: add and remove only.
     - Models, components and enums: only with `responsedata`; full lists return `too_large`.
   - Appliance errors: `get_cves` returns 500; `get_filtertypes` returns 302.
   - Timing: most write evidence predates the §8 remediation.
   - Post-remediation live checks: the intel-feed critical flow, the `post_tags` preview, the `confirmation_required` denial and POST search.
3. **PCAP.** A download is returned whole or fails with `output_limit_exceeded`. Captures above about 45 KB do not fit the 60,000-character budget. The current contract was never tested live.
4. **DELETE versus the breaker.** The lab gateway answers 502 to every DELETE after applying it, which the server records as `outcome:"unknown"`. Three in a row open the write breaker until restart.
5. **Combined sensitive+write.** There is no taint control. Once acknowledged, ordinary free-text writes (comments, tag descriptions, labels) can carry sensitive data out of the appliance. Comments cannot be deleted and every appliance user can see them.
6. **Approval.**
   - Ordinary writes default to `writeApproval=host`: no server prompt.
   - `host` mode delegates critical consent to the host.
   - Auto-answering clients or "always allow" rules remove the human. The server cannot verify that a human answered.
7. **Per-process state.**
   - Rate limits, the breaker, previews and the audit chain are per process (per operation client, E8).
   - Several host processes multiply the budgets.
   - Audit chains share one genesis and carry no `bootId` (DR-W-14).
   - The audit goes to stderr only, with no anchor.
   - A restart resets the breaker.
8. **Sensitive reads are not audited** (DR-W-04 partial).
9. **Protected targets** are opt-in and match literal values only. For `post_antigena` they match the action `codeid`, not the device. `maxTargets` is owner policy.
10. **Token scope.** There is no least-privilege token mapping per profile (DR-W-15). Appliance token permissions remain the real ceiling.
11. **Data egress.** Every result, including Base64 PCAP data and email metadata, reaches the MCP host and its model provider.
12. **Signing.** GET Advanced Search depends on proxies keeping percent-encoding byte-exact. Combined query and JSON body (S4) is refused.
13. **Distribution.**
    - No image attestation; the SBOMs are inventories, not clearances.
    - The ghcr image is rebuilt in `release.yml`; it is not the CI-tested image.
    - Docker Desktop needs `DARKTRACE_TOKEN_FILE_OWNER=root-or-current`.
    - The `server.json` OCI launch passes tokens as container environment variables, readable by anyone with Docker access.
    - Native Windows cannot protect token files.
14. **Previews.** The preview store evicts the oldest live critical preview once it holds 256 (DR-W-17, availability only).
15. **Lab residue.** Undeletable `[mcp-test]` and `[mcp-ux]` comments remain on the lab appliance.

## 5. Finite blocker list

| # | Blocker | Status | Closure evidence required | Owner |
|---|---|---|---|---|
| **B1** | Green tests on the release commit | **Partly closed.** macOS: my run plus the release receipt [O]. Linux arm64 [O receipt, R run]. | A green `ci.yml` run at the release SHA: `offline` on Node 22 and 24, and `docker` on amd64 and arm64, with job URLs recorded. | Release engineer |
| **B2** | CI and release pins stale | **CLOSED** [O, §3.2] | — | — |
| **B3** | Structural release-tooling mismatches | **CLOSED** [O, `e965ff5`] | — | — |
| **B4** | Public docs and release notes claim more than the evidence (§3.1) | OPEN | Correct README, README.es, SECURITY, the CHANGELOG 1.1.0 entry, `docs/tools.md` (generator: drop the email action, qualify the DR-W-12/PCAP/GET-search flags), `docs/security.md`, `docs/troubleshooting.md`, `docs/architecture.md`, `docs/docker.md` and the `docs/es/` mirrors. Add the §4 residuals to the release notes. The `--help` text in `src/index.ts` also changes `src/`, so any such edit reopens B1 and B2. | Docs owner |
| **B5** | `setup`, `.mcpb` and `server.json` offer `all`, but the generated configuration cannot start | OPEN | Either (a) have the wizard ask an explicit yes and then emit `DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE=true` (DR-W §4(1)), and add a matching `.mcpb` `user_config` field; or (b) remove `all` from the presets and descriptions. Add a CLI test. Option (a) changes `src/`, which reopens B1 and B2. | Installer owner |
| **B6** | Review records contradict the code (§3.1, second list) | OPEN, docs only | Corrected `adversarial-results-writes.md` and CHANGES-core §4. No re-test needed. | Test and core owners |
| **B7** | Docker image for 1.1.0 not fully verified | OPEN | amd64 `docker` job green at the release SHA, with both image IDs recorded. A dated owner statement that the first-stable scanner applicability decision covers the 1.1.0 runtime inputs, or a new scan of the published digests. Make `publish-ghcr` depend on the Docker gates, or record the CI run URL for the tagged SHA before tagging. | Release engineer + owner |
| **B8** | No dated owner decisions on the residuals the threat model requires | OPEN | Dated owner acceptance of: the TM-24 union without taint control; `host` delegation (critical, and the default for ordinary writes); multi-process budgets and audit identity (TM-35); and provider egress (TM-17). | Owner |
| **B9** | Publication procedure not executable as documented | OPEN | Configure the npm trusted publisher, or use the one-time `NPM_TOKEN` fallback and then remove it. Build `darktrace-mcp-1.1.0.mcpb` and upload it with `SHA256SUMS` to the v1.1.0 GitHub Release; `release.yml` does neither. Make the ghcr package public. Publish `server.json` once npm is live. Replace the private-repository reporting route in `SECURITY.md`. Optionally pin the `npm@^11` install in `publish-npm`. | Owner |

Order of work:

1. B4, B5 and B6 (any `src/` edits first).
2. Freeze the commit.
3. B1 and B7 on that exact SHA; recompute pins if `src/` changed.
4. B8.
5. Tag.
6. B9.

## 6. What I did, and what I did not do

**Did:**

- Read the records and code listed in §1.2.
- Merged `feat/full-api-easy-install` as instructed (fast-forward to `2a90453`).
- Ran `npm ci --ignore-scripts`, `npm run typecheck`, `npm test` and `npm run test:security` (§1.3).
- Hashed the files and fixtures in §1.1 and §3.2, and verified the four newest receipts.
- Reviewed the V-W-01 diff and the release-pins diff.
- Reviewed the content of the full-API fixture (E11, §1.5).

**Did not:**

- I edited no production, test, workflow, script or other documentation file, and recomputed no pins.
- I did not run `release:prepare` or `verify-release`, and built no `.mcpb`, Docker image or npm tarball. Those results are [R], from `release-pins-1.1.0.md`.
- I contacted no appliance, used no credentials, and ran no lab or Docker session.
- I made no npm, ghcr or GitHub query. I did not push, tag or publish.
- I left two receipts untracked and uncommitted, because my brief allows changes only to this report:
  - my green receipt `2026-10-06T13-12-38-653Z.json` (SHA-256 `98a82c05…a95e`);
  - the failed `2026-10-06T11-57-27-297Z.json` from before the dependency install. Delete it.

## 7. Verdict table

| Capability | Verdict | Open blockers |
|---|---|---|
| Reads | ACCEPT WITH DISCLOSED RESIDUALS | B1 (remote CI) |
| Sensitive reads | ACCEPT WITH DISCLOSED RESIDUALS | B4 |
| Reversible writes | ACCEPT WITH DISCLOSED RESIDUALS | — |
| Tags / subnets / intel (critical) | ACCEPT WITH DISCLOSED RESIDUALS | B4 |
| Antigena / RESPOND | ACCEPT WITH DISCLOSED RESIDUALS | B4, B8 |
| Email reads | ACCEPT WITH DISCLOSED RESIDUALS | B4 |
| Email action | EXCLUDED (exclusion accepted) | B4 |
| `all` union + acknowledgement | Server ACCEPT WITH RESIDUALS; installer, `.mcpb` and registry NOT READY | B5, B8 |
| Approval: elicitation | ACCEPT WITH DISCLOSED RESIDUALS | — |
| Approval: input_required | ACCEPT WITH DISCLOSED RESIDUALS | — |
| Approval: host | ACCEPT WITH DISCLOSED RESIDUALS | B8 |
| npx / npm / ghcr / `.mcpb` distribution | NOT READY | B5, B9 |
| Docker runtime | NOT READY | B1, B7 |
