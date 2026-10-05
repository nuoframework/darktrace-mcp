# Phase 2 security design review: round 2

**Status:** independent re-review of the **revised design documents only**. Date: 2026-10-05. Reviewer: dispatched review worker (task `task_3b72a8fcb55d`).
**Verdict:** all 23 round-1 findings (B1–B8, F1–F15) are **closed at the design level**. **No design blockers remain.** This round found **2 Medium and 8 Low** new defects (§4). They should be corrected before the matching ST oracles are implemented, but none reopens a blocker.
**What "closed" means here:** the documents now state one consistent, testable design for the issue. It does **not** mean the design is implemented, any test passed, the appliance accepts the requests, an artifact exists or any risk is accepted. All of those stay pending (§6).

**Contents:** [1 Scope](#1-scope-and-method) · [2 Coordinator decisions](#2-coordinator-decisions-checked) · [3 Per-finding closure](#3-per-finding-closure-verdicts) · [4 New findings](#4-new-findings) · [5 Cross-document consistency](#5-cross-document-consistency-checks) · [6 Pending gates](#6-gates-still-pending-not-resolved-by-documents) · [7 Limits](#7-limits)

## 1. Scope and method

| Input | State reviewed |
|---|---|
| `docs/architecture.md` (**ARCH**) | Revised in the working tree (353 lines) |
| `docs/api-contract.md` (**API**) | Revised in the working tree (195 lines) |
| `docs/security/threat-model.md` (**TM**) | Revised in the working tree (117 lines) |
| `docs/security/security-test-plan.md` (**STP**) | Revised in the working tree (54 lines) |
| `docs/security/design-decisions.md` (**DD**) | New (71 lines) |
| `docs/security/design-review.md` (round 1) | Unchanged. SHA-256 `2008a5ca…209c274`, recomputed and matching DD:5. |

I read every line of the revised documents. Each round-1 finding was traced to its replacement text, independently of DD's closure matrix. I then searched all five documents for leftover contradictory terms: `vitest`, `ajv`, `4.6.5`, "signed request", 60 s, 30 s `Retry-After`, `--env-file`, `npx`, undici/global `fetch`, `createMcpHandler`, bearer, `assumeVersion`, `alter_request` and "warning is logged". Every remaining hit is a negation or a historical note.

I also ran the following mechanical checks:

| Check | Result |
|---|---|
| Local Markdown links and `#anchors` in the 5 documents | **0 broken** |
| Inventory operations | **79**: read 57, medium 9, high 7, critical 6 |
| Read-via-POST operations | **2** |
| High-sensitivity operations | **11** |
| `/agemail` operations | **14** |
| Pins in ARCH:23 against `package.json` | Match: server 2.3.0, zod 4.2.0, yaml 2.9.1, engines `>=22` |
| Non-GET operations with query parameters | Only `DELETE /tags/entities` (`did`, `tag`), so the S5 block removes exactly one operation. None of the non-GET operations in the inventory takes query parameters plus a body, so the S4 block removes nothing that is documented. |

Citations use `FILE:line` in the current working-tree versions.

## 2. Coordinator decisions checked

| Accepted decision | Where stated | Consistent? |
|---|---|---|
| Dedicated pinned `node:https` connector; explicit `rejectUnauthorized:true`; no global agent or `fetch` | ARCH:17, 88–90; TM:59; STP:19–20; DD:16, 20 | Yes |
| 30 s **total** deadline; at most 2 safe-GET retries; `Retry-After` capped at 2 s | ARCH:94, 101–102; TM:81–83; API:175; STP:27–28; DD:18 | Yes. See **R2-01** for how the 2 s cap is applied. |
| 2 MiB wire **and** decoded; identity encoding | ARCH:96; TM:81; API:175; STP:27 | Yes |
| Input 64 KiB, depth 8, 5,000 elements | ARCH:95; TM:81; STP:27 | Yes. See **R2-02** for how it is enforced. |
| 4 concurrent, 16 queued, 120 attempts/min, 10 pages, 60k output characters | ARCH:97–100; TM:81; STP:27 | Yes |
| `sensitiveRead` explicit, default false | ARCH:14, 65, 177, 275; API:139; TM:75, 105; STP:23, 25 | Yes |
| Critical: 5 non-email operations preview-only, 1 email operation blocked, all 6 non-executing | ARCH:13, 117–119, 198; API:108–110; TM:17, 71, 104; STP:24, 40; DD:5, 15 | Yes |
| Email, export and HTTP blocked in config | ARCH:53, 276–277; TM:13, 16, 19; STP:32 | Yes |
| HMAC signing mode chosen at startup (`encoded`/`unencoded`), default `unencoded`, lab-unverified, no fallback | ARCH:16, 60, 82; API:125, 137; TM:15, 57; DD:13 | Yes |
| DNS allowlist optional, IPs/CIDRs | ARCH:58; TM:63; DD:30 | Yes. If the implementation narrows this to IP-only, ARCH:58, TM:63, ST-04 (STP:20) and DD:30 must change in the same edit. That is not a defect today. |

## 3. Per-finding closure verdicts

| Finding | Verdict | Evidence (exact lines) | Note |
|---|---|---|---|
| **B1** critical `confirm:true` executes | **Closed** | ARCH:13, 117, 119, 198, 274; API:108–110; TM:17, 71, 104; STP:24, 40 | The `confirm` field is removed and rejected as unknown (ARCH:117). There is no critical execution branch. |
| **B2** contradictory or signed dry-run | **Closed** | ARCH:33, 116–119; API:174 (old API:165 text replaced); TM:57; STP:18, 24 | The preview has exactly four fields and is resolved before build and sign. Medium/high writes default to `dryRun:true` (ARCH:118, 182). |
| **B3** no DNS pinning or allowlist | **Closed (design)** | ARCH:58, 88–90; TM:63–65, 100; STP:20 | All A/AAAA answers are checked and frozen. A custom lookup returns only the snapshot, with SNI and IP-SAN checks. Resolver and connector can be injected for tests only. The bootstrap-DNS residual risk is documented (ARCH:90, 283). |
| **B4** environment bypass of TLS or proxy | **Closed** | ARCH:17, 70, 90; TM:26, 59, 65; STP:19–20 | Startup is refused for `NODE_TLS_REJECT_UNAUTHORIZED=0`, `NODE_USE_ENV_PROXY`, `--use-env-proxy` and proxy variables. The risk that a trusted `NODE_OPTIONS` preloads code is stated honestly. See also R2-08. |
| **B5** profiles checked only at registration | **Closed** | ARCH:43, 108, 116; TM:71, 103; STP:23 | Checked at registration, dispatch and execution, with zero signer calls when a call is denied. |
| **B6** audit is `void` and fails open | **Closed** | ARCH:120–128, 141; TM:73, 109; STP:29 | `Promise<void>` is awaited before build and sign. A post-audit failure reports `completed` or `unknown` and is never retried. See R2-06 for a gap in the interface fields. |
| **B7** email enabled by code presence | **Closed** | ARCH:53, 229; API:164; TM:19, 103; STP:23 | Config error, all 14 operations denied, no runtime schema generation. |
| **B8** HTTP selectable | **Closed** | ARCH:11, 53, 277, 291–293; TM:13, 112; STP:32 | `transport.kind` accepts only `stdio`; `transport.http` and `bearerTokens` are rejected. |
| **F1** export races and quotas | **Closed (future gate)** | ARCH:264–266; TM:79, 106; STP:26 | Handle-relative `O_EXCL\|O_NOFOLLOW` creation, 0700/0600 permissions, atomic quotas. Export is rejected in the baseline. |
| **F2** caller-set byte-budget override | **Closed** | ARCH:79, 104, 215, 266; STP:25 | No `maxBytes` input exists. Only a future binary descriptor may own a larger budget. |
| **F3** decompression | **Closed** | ARCH:96; TM:81; API:175; STP:27 | Identity encoding; unexpected compression is rejected. |
| **F4** retries and deadline | **Closed** | ARCH:94, 101–104; TM:83, 108; STP:28 | A single deadline that starts at admission. See **R2-01** on how the cap is applied. |
| **F5** model-provider egress | **Closed (design); release gate pending** | ARCH:14, 281; TM:43, 49, 87–89, 113; STP:25, 42 | There is no README in the repository yet, so the notice the release requires does not exist. ST-09 is the gate. |
| **F6** sensitive search on by default | **Closed** | ARCH:65, 177, 275; API:139; TM:75 | Off by default, and only the operator can turn it on. The GET/base64 forms are blocked under S6. |
| **F7** version-selected policy | **Closed** | ARCH:112, 175; API:157; TM:71, 103; STP:23 | Quirks only restrict. There is no `alter_request` substitution. |
| **F8** production `assumeVersion` | **Closed** | ARCH:53, 112; TM:71, 103; STP:23 | Test-only injection; rejected in config. |
| **F9** weak origin validation | **Closed** | ARCH:57; TM:63; STP:20 | |
| **F10** `npx` pins only the top level | **Closed (design); artifact pending** | ARCH:299–303, 331; TM:111; STP:31 | Package is private with no publication. Distributed tarballs must include `npm-shrinkwrap.json`, and ST-15 checks the installed tree. |
| **F11** Docker secret in environment | **Closed** | ARCH:307–321; TM:85; STP:31 | See R2-04 for the public-token-file inconsistency. |
| **F12** token-file hygiene | **Closed** | ARCH:68; TM:85, 98; STP:18 | |
| **F13** conflicting pins | **Closed** | ARCH:23, 331 matches `package.json` | |
| **F14** test runner | **Closed** | ARCH:325; STP:7 | No `vitest` or `ajv` remains. |
| **F15** stale status | **Closed** | ARCH:3; API:5; TM:3; STP:3 | |

## 4. New findings

| ID | Sev | Finding | Evidence | Remediation | Owner |
|---|---|---|---|---|---|
| **R2-01** | Medium | **A `Retry-After` longer than 2 s is shortened, not respected.** The text says `Retry-After` is "capped at 2,000 ms". Read literally, a 429 with `Retry-After: 60` is retried after 2 s, which is earlier than the appliance asked and makes the overload worse. The same wording is in API:175 and ST-12 (STP:28). | ARCH:102; TM:83; API:175; STP:28 | Specify: if `Retry-After` (seconds or date) is longer than 2,000 ms **or** longer than the remaining deadline, **do not retry**. Return a sanitized `rate_limited` error carrying the server's value. The 2 s cap applies only to the client's own jitter and backoff. Add the `Retry-After: 60 → zero further attempts` case to ST-12. | Client/network + STP owner |
| **R2-02** | Medium | **The 64 KiB pre-parse input limit has no mechanism that fits the chosen transport.** ARCH says `serveStdio` "owns MCP transport state" (ARCH:25), but also that byte limits apply "before parsing" (ARCH:25, 137). If `serveStdio` reads stdin itself (round 1 recorded a 10 MB default buffer), the server cannot enforce 64 KiB before the SDK parses each frame. That would make the input-size part of ST-11 impossible to satisfy as designed. | ARCH:25, 95, 137; STP:27 | Name the mechanism. Either use a bounded stdin line splitter or transport wrapper that rejects or terminates on a frame over 64 KiB before JSON parsing, or use an SDK transport option, but only after showing the pinned 2.3.0 exposes one. State what happens on an oversize frame (sanitized error versus closing the session). | Server owner + architecture owner |
| R2-03 | Low | **The S5 block is not shown in the catalogue.** `delete_tags_entities` (the only DELETE that takes a query) is listed under `darktrace_manage_tags` with no mark that it is blocked, even though ARCH:15 and 84 block S5. | ARCH:193 vs ARCH:15, 84; API:129 | Mark `delete_tags_entities` as "blocked (S5)" in ARCH §6.2. Its coverage row must say `blocked`. | Architecture owner |
| R2-04 | Low | **The Docker example depends on a variable that is only "when supported".** The public-token file is optional ("when supported"), but the Docker example relies on `DARKTRACE_PUBLIC_TOKEN_FILE`. | ARCH:68 vs ARCH:314–315 | Either make `DARKTRACE_PUBLIC_TOKEN_FILE` a supported variable under the same file rules, or drop it from the example. | Config + architecture owner |
| R2-05 | Low | **`writeCritical` without `write` is undefined.** ARCH says it "requires write" but not whether `writeCritical=true` with `write=false` is an error or silently ignored. | ARCH:64, 274 | Make it a config error, which matches the fail-closed config stance (ARCH:53). Add the case to ST-08. | Config owner |
| R2-06 | Low | **The audit interface is missing fields that §5.9 requires.** `record(operationId, outcome, requestId?)` has no tier, event or bounded target metadata, but §5.9 says records carry timestamp, correlation ID, operation, tier, event and outcome. | ARCH:124–128 vs ARCH:141 | Define one `AuditRecord` type with the allowlisted fields and use it in the interface. | Observability owner |
| R2-07 | Low | **The write release gate is procedural only.** "Subject to release gate" or "after release gate" cannot be enforced at runtime: an operator can set `DARKTRACE_PROFILES=read,write` and run `dryRun:false` before the ST-07/12/13 evidence exists. | ARCH:63, 182, 273; STP:39 | State plainly that this is a procedural release gate. Optionally, build-time-disable the write execution path until the evidence is recorded. Do not imply a runtime guarantee. | Architecture + release owner |
| R2-08 | Low (operational) | **Refusing all proxy variables will break some deployments.** A blanket startup refusal on ambient `HTTP(S)_PROXY`/`ALL_PROXY` fails on corporate hosts where those variables are set globally, even though a dedicated agent without `proxyEnv` would not use them. This is secure, but operators will hit it. | ARCH:70; TM:65; STP:20 | Keep the refusal, which is the coordinator's decision. Document the operator remedy (unset the variables in the MCP server's environment entry) and make the startup error name the variable. | Config owner |
| R2-09 | Low | **Operations blocked for unbounded ranges or unknown units are not listed.** "Unknown units or unsafe unconstrained forms remain blocked" (ARCH:104; TM:81), but no document says which of the 42 read operations or which parameters this blocks (for example the time and `count` parameters noted in API §4.6 and §4.9). | ARCH:104; TM:81; API:148, 151 | Require the coverage report (ARCH §7) to list, per operation, each blocked or bounded parameter and its finite bound. | Policy/API owner |
| R2-10 | Low | **Startup behaviour on connectivity failure is ambiguous.** ARCH:137 says connectivity errors "fail closed", but ARCH:112 says an unavailable version "retains conservative gates", which implies the server keeps running. | ARCH:112 vs 137 | Specify: invalid config, credentials, DNS or TLS validation fails startup. A `/status` probe failure after a valid TLS connection starts in conservative mode with sanitized errors. | Architecture owner |

## 5. Cross-document consistency checks

**Consistent (checked, no finding):**
- **Counts.** 79/57/9/7/6, 2 read-via-POST, 11 high-sensitivity, 14 email operations. Same in API §1, ARCH §6.7 and §7, TM A2 and DD:5, and confirmed against `operation-inventory.json`.
- **Preview shape.** Exactly four fields, unsigned, in ARCH:119, API:174, TM:57, STP:18 and STP:24.
- **Audit.** Pre-audit fail-closed and post-audit `unknown` with no retry, in ARCH:120–121, TM:73 and STP:29.
- **Blocked request shapes.** S4/S5/S6 blocked before build, in ARCH:84, API:139, TM:57 and STP:17.
- **Email, export and HTTP.** Config errors in ARCH:53, TM:13–19, STP:25, STP:32 and API:164.
- **TM-17 and the notice.** ARCH:281, TM:89, TM:113, STP:25 and STP:42.
- **No-publication stance.** ARCH:299, TM:111 and STP:31.
- **Historical review.** It is not rewritten, and every place that supersedes it says so explicitly (DD:20; ARCH:337; STP:54).

**Minor wording only (no action required):** TM:57 still lists "DELETE queries and Advanced Search base64" among the cases to test. ST-01 makes clear these are rejection tests, so it is not a contradiction.

## 6. Gates still pending (not resolved by documents)

| Gate | Status |
|---|---|
| Offline security evidence ST-01–16 | **NOT RUN.** No ST result exists. Source is in progress and was not reviewed. |
| S1 signing default `unencoded` against 7.1 | **External validation pending.** Requires authorised lab work. |
| S4, S5, S6, S9, 7.1 regressions, ACLs, units | **External validation pending.** The shapes stay blocked regardless of results until reviewed code changes are made. |
| Model-provider eligibility and README notice | **Pending.** No README exists. Eligibility is an operator or organisational decision. |
| Release artifacts (shrinkwrap, installed tree, SHA-256, SBOM, attestation, image digest) | **Pending.** No artifact exists, and the package is private and unpublished. |
| Export writer and email contract | **Future, separate design reviews.** Both are disabled in the baseline. |
| Trusted critical approval and HTTP transport | **Out of baseline.** Each needs its own design and threat model. |
| Residual risks (bootstrap DNS, replay window, host injection, `NODE_OPTIONS` preload, multiple processes, supply chain) | **Not accepted.** No dated operator acceptance exists. |

**Gate decision:** the design baseline is **final, with no blockers**. Implementing the read-only stdio server may proceed; R2-01 and R2-02 should be fixed in the documents before the ST-11 and ST-12 oracles are written. Enabling write execution, export, email, HTTP or critical execution remains **NO-GO** on the evidence and gates above.

## 7. Limits

This review covers documents only. It did not run tests, contact any appliance, audit source code, make commits or spawn agents. It relies on `package.json` and `operation-inventory.json` only for the counts and pins listed in §1. SDK transport internals (R2-02) were not re-verified against the 2.3.0 source; that finding asks the owners to settle the mechanism. Round-1 text is cited only for historical context.
