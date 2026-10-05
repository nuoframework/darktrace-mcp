# Phase 2 security design review: round 3

**Status:** independent re-review of the revised design documents. Date: 2026-10-05. Reviewer: dispatched review worker (task `task_eeaf073c0118`).

**Verdict:** **all 10 round-2 findings (R2-01 to R2-10) are closed**, and **all 23 round-1 findings (B1–B8, F1–F15) remain closed**. The final allowlist format (exact canonical IPv4/IPv6 addresses only, no CIDR ranges) is consistent across all documents. **Remaining design blockers: 0.** This round found **4 new Low findings** (§4). None is a blocker or reopens a closed finding.

**What "closed" means here:** the five baseline documents now give one consistent, testable requirement for each finding. It does **not** mean the source implements it, any security test passed, the 7.1 appliance accepts the requests, a release artifact exists, or any risk is accepted (§6).

**Contents:** [1 Scope](#1-scope-and-method) · [2 R2 closure](#2-round-2-closure-verdicts) · [3 Round-1 regression check](#3-round-1-regression-check-b1b8-f1f15) · [4 New findings](#4-new-findings) · [5 Mechanical checks](#5-mechanical-checks) · [6 Pending gates](#6-gates-still-pending) · [7 Limits](#7-limits)

## 1. Scope and method

| Input | State |
|---|---|
| `docs/architecture.md` (**ARCH**) | Working tree, 387 lines |
| `docs/api-contract.md` (**API**) | Working tree, 195 lines |
| `docs/security/threat-model.md` (**TM**) | Working tree, 123 lines |
| `docs/security/security-test-plan.md` (**STP**) | Working tree, 54 lines |
| `docs/security/design-decisions.md` (**DD**) | Working tree, 90 lines |
| `design-review.md` (round 1) | Unchanged. SHA-256 `2008a5ca…209c274`, matches DD:5 |
| `design-review-round2.md` (round 2) | Unchanged. SHA-256 `f17f1027…cc5c`, matches DD:5 |

**How I checked:** I read the corrected passages directly in ARCH, TM, STP and API. DD's closure matrix was used only as an index, not as evidence. Each verdict below cites the actual replacement text.

**Source:** I did not audit the source code. I read `src/server/input.ts` and `src/server/stdio.ts` only to confirm that the mechanism ARCH:167 names really exists: `process.stdin` is piped through `boundedInput`, which feeds `StdioServerTransport` with `maxBufferSize:65536`, which is passed to `serveStdio`. It does. Whether it behaves correctly is not assessed.

**User-facing docs:** `README.md` and `docs/{configuration,getting-started,clients,troubleshooting}.md` are owned by another worker who is still writing them. I scanned them only for contradictions with the baseline (R3-03, R3-04).

## 2. Round-2 closure verdicts

Each "accepted change" below is the coordinator decision being checked; the evidence column cites where the documents now say it.

| R2 | Accepted change | Evidence (exact lines) | Verdict |
|---|---|---|---|
| **R2-01** `Retry-After` | A valid `Retry-After` over 2,000 ms (or over a lower `maxRetryAfterMs`) **or** over the remaining deadline means no retry. An invalid header also means no retry. Without the header, only the client's own backoff applies, bounded by 2 s and the deadline. An accepted delay is waited in full. `Retry-After: 60` gives zero further attempts and a sanitized `rate_limited` error that does not echo the header. | ARCH:83, 120–122, 371; TM:20, 83; API:175; STP:28; DD:18, 20, 58 | **Closed** |
| **R2-02** pre-parse input limit | Raw frames pass through the `boundedInput` wrapper before any JSON parsing, by the wrapper itself or by the SDK. The SDK's `maxBufferSize` of 64 KiB is a second guard. The limit includes the newline. A lower configured limit must also lower the wrapper limit. An oversized frame closes the session with a fixed stderr event and no echo of input. Oracle cases: frames with no newline, several frames per chunk, exact boundary and +1, zero SDK parser entry. | ARCH:25, 113, 167–169; TM:87–91; STP:27; DD:59 | **Closed (design)**. A lowered limit is stated as still-required implementation work (ARCH:167), not as done. |
| **R2-03** S5 not visible in catalogue | `delete_tags_entities` is marked **blocked (S5)** and has its own required coverage row. | ARCH:225, 290; API:173; STP:23 | **Closed** |
| **R2-04** token-file variables | Both `DARKTRACE_PUBLIC_TOKEN_FILE` and `DARKTRACE_PRIVATE_TOKEN_FILE` are required, under identical secure-file rules, and the Docker example uses both. | ARCH:86, 346–349; TM:85; STP:18 | **Closed** |
| **R2-05** `writeCritical` without `write` | Startup configuration error. | ARCH:64, 308; TM:71; API:174; STP:24; DD:15 | **Closed** |
| **R2-06** audit interface | The stored `AuditRecord` contains exactly `audit:true`, `ts`, a mandatory `requestId`, `operationId` and `outcome`. The API is `record(operationId, outcome, requestId?)`; a missing ID is generated, and one shared ID is used for the pre and post records. Tier, event and target fields are explicitly excluded. | ARCH:140, 143–157, 173; TM:73; STP:29; DD:63 | **Closed.** See R3-02 for a clarity gap. |
| **R2-07** write release gate | Stated as a procedural gate only: the runtime does not read test evidence, and an operator can enable writes before validation. | ARCH:63, 214, 307, 367; TM:71; API:174; STP:39, 50; DD:64, 82 | **Closed** |
| **R2-08** proxy refusal | Fix by unsetting the variables in the MCP server's own launch environment only. Errors name only the variable, never its value, URL or credentials. | ARCH:88; TM:65; STP:20; DD:65 | **Closed.** See R3-03 for a mismatch in the user docs. |
| **R2-09** per-parameter bounds | Before release, coverage must list every operation and each accepted or blocked parameter with location, units, finite bounds, default behaviour, where the bound comes from and whether it is enforced. Incomplete rows block release. | ARCH:290; TM:81; API:173; STP:23; DD:66 | **Closed (design)**. The report itself is pending. |
| **R2-10** startup behaviour | No automatic status probe; the version starts unknown and policy stays conservative. Local config, credentials and environment checks fail startup. DNS is resolved lazily before the first eligible signer or socket use, and a failure denies that call with zero signer or socket attempts. A TLS failure sends no signed HTTP bytes. An explicit status-tool error is an ordinary sanitized tool error. | ARCH:106, 118, 132, 165, 183; TM:63–65, 89; STP:20, 30; DD:67 | **Closed.** See R3-01 on retrying after a failed lazy DNS initialisation. |
| **Finalized allowlist** | Exact canonical IPv4/IPv6 addresses only; CIDR entries rejected at config load. | ARCH:58, 106; TM:63, 106 (TM-04); STP:20; DD:20, 30, 67; `docs/configuration.md:17` | **Consistent.** A search for stale "startup snapshot" or "CIDR allowed" wording in the five documents found none. |

## 3. Round-1 regression check (B1–B8, F1–F15)

I re-read the current replacement text. **All 23 remain closed**; none was weakened by the round-2 edits.

| Finding | Current evidence | Status |
|---|---|---|
| B1 `confirm` execution | ARCH:137, 139, 230; API:110; TM:71; STP:24 | Closed |
| B2 dry-run | ARCH:33, 138–139; API:174; TM:57; STP:18 | Closed |
| B3 DNS pinning | ARCH:58, 106–108; TM:63–65; STP:20. Now lazy and IP-only. | Closed |
| B4 environment TLS/proxy bypass | ARCH:17, 88, 108; TM:59, 65; STP:19–20 | Closed |
| B5 runtime recheck | ARCH:43, 128, 136; TM:71; STP:23 | Closed |
| B6 audit fail-closed | ARCH:140–141, 157; TM:73; STP:29 | Closed |
| B7 email | ARCH:53, 261; API:164; TM:19 | Closed |
| B8 HTTP | ARCH:11, 53, 311, 327; TM:13; STP:32 | Closed |
| F1 export writer | ARCH:298–300; TM:79; STP:26 | Closed (future gate) |
| F2 byte budget | ARCH:97, 124, 247 | Closed |
| F3 decompression | ARCH:114; TM:81; API:175 | Closed |
| F4 retry/deadline | ARCH:112, 119–122; TM:83; STP:28. Tightened by R2-01. | Closed |
| F5 provider egress | ARCH:315; TM:93–95; STP:25, 42. The README now contains the notice (README:39), but that is not release evidence. | Closed (design); release gate pending |
| F6 sensitive search | ARCH:65, 209, 309; TM:75 | Closed |
| F7 restrictive quirks | ARCH:132, 207; API:157; TM:71 | Closed |
| F8 `assumeVersion` | ARCH:53, 132 | Closed |
| F9 origin validation | ARCH:57; TM:63 | Closed |
| F10 shrinkwrap | ARCH:333–337; STP:31 | Closed (design); artifact pending |
| F11 Docker secret | ARCH:341–355; TM:85 | Closed |
| F12 token-file hygiene | ARCH:86; TM:85; STP:18 | Closed |
| F13 pins | ARCH:23 matches `package.json` | Closed |
| F14 `node:test` | ARCH:359; STP:7 | Closed |
| F15 status wording | ARCH:3; API:5; TM:3; STP:3 | Closed |

## 4. New findings

All four are Low. None is a design blocker, and none needs a new coordinator decision.

| ID | Sev | Finding | Evidence | Remediation | Owner |
|---|---|---|---|---|---|
| R3-01 | Low | **It is undefined what happens after a failed lazy DNS initialisation.** "Initialize the pinned snapshot once per process" together with "failed resolution/validation must deny the call" does not say whether the **next** eligible call tries again, or whether every later call is denied until restart. | ARCH:106; TM:65; STP:20 | State that a failed initialisation is never cached as success or partial state. Proposed: the next eligible call may retry initialisation within its own deadline and rate budget, and only a fully validated result is frozen. Add both "fail then succeed" and "fail then deny" cases to ST-04. | Client/network + STP owner |
| R3-02 | Low | **Whether previews and denials are audited is unspecified.** The `AuditOutcome` type includes `preview`, but the ordering in ARCH:140 requires audit records only for executing writes. ST-13 uses dry-run fixtures without saying whether a `preview` record is required, optional or forbidden. | ARCH:140, 144, 157; STP:29 | State whether a `preview` record is required or optional. A clear option: "optional; if emitted, outcome `preview`, never `ok`". Align the ST-13 oracle with that choice. | Observability + STP owner |
| R3-03 | Low (user docs) | **`NO_PROXY` handling differs between the baseline and the user docs.** `docs/configuration.md:66–71` says the baseline also rejects `NO_PROXY`/`no_proxy` and unsets them. The baseline lists only `HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY` and `NODE_USE_ENV_PROXY`. Neither choice is unsafe, but the two must match because ST-04 is the oracle. | `docs/configuration.md:66`; ARCH:88; TM:65; STP:20 | Pick one list. Adding `NO_PROXY` to the baseline is the stricter and simpler option. Update ARCH:88, TM:65 and ST-04, or the user doc. | Docs worker + architecture owner |
| R3-04 | Low (user docs) | **The CLI diagnostics are not in the baseline.** User docs describe `--check-config` and `doctor` as supported, offline, config-only checks. ARCH §5.8 never mentions them, so nothing in the baseline requires them to make no network calls, apply the same token-file rules or print sanitized output. | `docs/clients.md:56`; `docs/troubleshooting.md:20`; `docs/getting-started.md:38`; ARCH:165 | Add one sentence to ARCH §5.8: the diagnostics make no network or DNS calls, use the same config, token and environment validation, and print sanitized results. Add them to the ST-02 and ST-14 stimulus lists. | Architecture + STP owner |

## 5. Mechanical checks

| Check | Result |
|---|---|
| Local links and anchors in the 5 baseline documents | 139 links, **0 broken**. This includes the links to `src/server/input.ts` and `src/server/stdio.ts`, which exist. |
| Inventory | **79** operations: read **57**, medium **9**, high **7**, critical **6** |
| Read-via-POST / high-sensitivity / `/agemail` | **2** / **11** / **14** |
| API inventory rows | 79 |
| TM / ST rows | 17 / 16 |
| DD closure rows | Each of B1–B8, F1–F15 and R2-01–R2-10 appears exactly once (33 rows) |
| Historical review checksums | Both unchanged and matching DD:5 |
| Stale-term search | No leftover enabled HTTP/email/export/critical execution, signed preview, fallback signing, 60 s deadline, truncation of `Retry-After`, CIDR allowlist or automatic status probe |

## 6. Gates still pending

None of these is resolved by the documents, and this report claims no security pass.

| Gate | Status |
|---|---|
| Offline security tests ST-01–16 for the exact commit | **NOT RUN** |
| Implementation of the documented contract: configurable lowering of the wrapper limit, recorder generating missing IDs, per-parameter coverage report, lazy DNS connector, `Retry-After` semantics | **Implementation pending.** The source is still being written. |
| Canonicalisation (S1 default `unencoded`) and 7.1 behaviour | **External lab validation pending.** Requires authorisation. |
| S4/S5/S6/S9 | Blocked. Separate research and reviewed code changes are required. |
| Model-provider eligibility | Operator or organisational decision pending. The README notice text exists but is not validated release evidence. |
| Release artifacts (shrinkwrap installed-tree check, SHA-256, SBOM, attestation, image digest and mounts) | **Pending.** Private repository with no publication. |
| Medium/high write activation | Procedural ST-07/12/13 review plus action-specific lab authorisation. The runtime does not enforce this gate. |
| Export, email, HTTP, trusted critical approval | Outside this baseline. Each needs its own design review. |
| Residual risks (bootstrap DNS, replay window, host injection, `NODE_OPTIONS`, multiple processes, supply chain) | **Not accepted.** This report recommends no risk acceptance. The required safe gates stay in place. |

## 7. Limits

This review covers documents only. It did not run tests, contact any appliance, change source, make commits or spawn agents. The read of `input.ts` and `stdio.ts` was limited to confirming that the cited mechanism exists, not that it is correct. User-facing docs are still being written by another worker and were scanned only for contradictions with the baseline.

**Remaining design count:** 0 blockers and 0 open R2 findings; 4 new Low findings (R3-01 to R3-04) are recommended but not required before implementation continues.
