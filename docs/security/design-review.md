# Phase 2 security design review

**Status:** independent design review of documents only. Date: 2026-10-05. Reviewer: dispatched review worker (task `task_ddb6ea62c288`).
**Verdict:** **CONDITIONAL GO** for implementing the read-only stdio baseline, once the 8 blockers in §3 are fixed in the design documents. **NO-GO** for turning on any write, critical, export, email or HTTP capability (§6).
**What this is not:** it is not a test result, a code audit, a lab result or an acceptance of risk. No test was run, no appliance was contacted and no residual risk is accepted here. Source under `src/` is still being written and was not reviewed; the few observations about it in §7 are marked as such.

**Contents:** [1 Scope](#1-scope-and-method) · [2 Decisions A1–A8](#2-baseline-decisions-resolving-a1a8) · [3 Blockers](#3-blockers-must-fix-before-the-baseline-is-final) · [4 Other findings](#4-other-findings) · [5 Test-oracle review](#5-test-oracle-review) · [6 Gate decision](#6-gate-decision-per-capability) · [7 Limits](#7-limits-of-this-review) · [8 Owners](#8-remediation-owners)

## 1. Scope and method

| Input | Version reviewed |
|---|---|
| [`docs/architecture.md`](../architecture.md) (cited as **ARCH**) | 718 lines, commit `f71bee0` |
| [`docs/security/threat-model.md`](threat-model.md) (**TM**) | 104 lines, commit `f71bee0` |
| [`docs/security/security-test-plan.md`](security-test-plan.md) (**STP**) | 52 lines, commit `f71bee0` |
| [`docs/api-contract.md`](../api-contract.md) (**API**) and [`docs/operation-inventory.json`](../operation-inventory.json) | commit `90550cb`. Inventory checked mechanically: 79 operations; risk tiers read 57, medium 9, high 7, critical 6; `read_via_post` set on exactly 2 (`post_advancedsearch_api_search`, `post_agemail_..._emails_search`). These numbers match ARCH §6.7 and API §1. |

Method: I read every line of the four documents. I compared every security-relevant statement in ARCH against the matching TM control and STP oracle, and checked each topic in the dispatch brief. Line references are `FILE:line` in the committed versions above. One external fact was checked: Node.js `fetch()` honours `NODE_USE_ENV_PROXY` from Node **24.0.0** (Node CHANGELOG_V24, via Context7, 2026-10-05).

Severity: **Blocker** means the baseline contains a contradiction or gap that would ship an unsafe default or make a mandatory test impossible to write. **High** means a control is missing for a Critical or High threat. **Medium** means a control is weak or underspecified. **Low** means consistency or hygiene.

## 2. Baseline decisions resolving A1–A8

The coordinator asked that every open assumption be closed with a decision and a gate. The decisions below are proposed as the Phase 2 baseline. Once accepted, ARCH, TM and STP must state them in the same words (see §8). Facts about real-world signing and Darktrace 7.1 behaviour are **external validation pending**. They are not open design questions.

| ID | Decision (baseline) | Gate that changes it |
|---|---|---|
| **A1** Deployment shape | One HTTPS origin, one credential pair and one process, over **stdio only**. `transport.kind` accepts only `stdio`. Setting `http` fails at config load. `transport.http.*` and `bearerTokens` are removed from the Phase 2 schema. | A separate HTTP threat model plus ST-16 extensions. That work is out of scope for this baseline. |
| **A2** Classification | `operation-inventory.json` is the single policy source, keyed by `operationId`. HTTP method never implies permission. Read-via-POST: only `post_advancedsearch_api_search` is eligible, and it is never retried. Email search stays blocked under A7. Unknown `operationId`s are denied. | An inventory change needs a design-review update and coverage gate rule 3 (ARCH:510). |
| **A3** Canonicalisation | One default canonical form per request shape: GET query values signed unencoded and sent percent-encoded (the `/devicesearch` rule); JSON serialised once and signed byte-for-byte. Shapes S4 (query + JSON), S5 (DELETE + query) and S6 (base64 in a GET path) are **disabled** in the baseline; Advanced Search uses the POST form. There is no fallback re-signing on 401. A different mode can only be selected by the operator at startup, never through a tool. | The authorised 7.1 lab result for S1, S4, S5 and S6 is **external validation pending**. |
| **A4** Export | Disabled, and `export` is rejected as a profile until there is ST-10 evidence. Writer design: operator-owned directory with mode `0700`; files created with `O_EXCL\|O_NOFOLLOW` and mode `0600` relative to an open directory handle; generated filenames; 200 MB per file; **1 GiB aggregate**; **100 files**; **1 concurrent export**. Partial files are deleted. Retention is operator-owned, with no automatic deletion and no network upload. | ST-09, ST-10 and ST-11 pass on the actual writer. |
| **A5** Critical approval | The 6 critical operations are **preview-only**. No code path signs or sends them, and the `confirm` field is removed. With `writeCritical` on, the tools register in preview mode only and are described as such. Without it, they are not registered. | A future, separately reviewed trusted-approval design (host-side, bound to the request, single-use). It is **not** part of this baseline. |
| **A6** Dry-run, TLS, CA | A dry-run returns exactly `{dryRun:true, operationId, method, parameterNames}`. Its policy decision happens **before** the request is built or signed. TLS verification cannot be disabled by config **or by the process environment** (B4). Private CAs are trusted only through `NODE_EXTRA_CA_CERTS`. | None. These are invariants. |
| **A7** Email | **Fully blocked.** `email` in `DARKTRACE_PROFILES` is a config **error**, not a warning. No email operation sits in the dispatchable allowlist. Schemas are never generated at runtime or taken from an instance. | Reviewed and committed schemas for a pinned instance spec, S9 resolved, and a design-review update. |
| **A8** Budgets | Proposed finite values, tunable only after lab data: 30 s per attempt, **60 s total deadline**; input **64 KiB**, depth 8 and 5,000 elements; **2 MB on the wire and 2 MB decompressed** (send `Accept-Encoding: identity`); 60,000 output characters; **4 requests in flight and a queue of 16**; at most **10 pages** per tool call; `Retry-After` capped at **30 s**; 120 requests per minute. | Lab measurement (external validation pending). Values may go down without review; any increase needs review. |

## 3. Blockers (must fix before the baseline is final)

| ID | Sev | Finding | Evidence (exact lines) | Remediation | Owner |
|---|---|---|---|---|---|
| **B1** | Blocker | **A model-supplied `confirm:true` executes critical RESPOND, intel-feed, subnet and tag-delete actions.** ARCH makes `confirm` the gate. TM says a model's `confirm` is not human approval and that execution stays disabled. | ARCH:19, 310 (step 3), 319–320, 434, 536, 665 **vs** TM:17 (A5), 71, 92 (TM-08); STP:24, 39 | Apply A5: remove `confirm` and the "E -- yes" branch from the guard diagram; rewrite §6.3, §8.2 and §13.3 as preview-only. | Architecture + policy |
| **B2** | Blocker | **Three dry-run definitions contradict each other.** API says a dry-run returns the *signed request*. ARCH puts `dryRun` inside `HttpClient.send`, which is downstream of the signer, and adds `pathTemplate`. TM requires a stop before signing, with only operationId, method and parameterNames. | API:165 **vs** ARCH:245–254, 320, 418 **vs** TM:18, 57; STP:18 | Apply A6. Decide dry-run in `policy/guard` before `build()` and `sign()`. Correct API:165. State that medium/high write tools default to `dryRun:true`, matching critical. Add a "zero signer calls" assertion to ARCH §11.4 and item 10 (ARCH:692). | Architecture + client/signer + API-contract owner |
| **B3** | Blocker | **There is no DNS pinning or destination allowlist in the architecture.** The client is plain `fetch`, and the config has no allowlist field, so ST-04 cannot be implemented as designed. | ARCH:145–150, 258, 523 **vs** TM:63–65, 88 (TM-04); STP:20 | Add `instance.destinationAllowlist` (IPs/CIDRs, optional) to `ConfigSchema`. Add a startup resolver that validates all A/AAAA records and freezes the snapshot, and an undici `Agent` whose `connect.lookup` returns only pinned addresses while keeping SNI and hostname checks. Inject the resolver and connector so tests can replace them. Document the bootstrap-DNS residual risk in ARCH §8.1. | Client/network |
| **B4** | Blocker | **The process environment can silently override "TLS always on" and "no proxy".** ARCH only rejects config keys. Node honours `NODE_TLS_REJECT_UNAUTHORIZED=0` and, from 24.0.0, `NODE_USE_ENV_PROXY=1`/`--use-env-proxy` with `HTTPS_PROXY` for `fetch()`. `NODE_OPTIONS` can preload code. | ARCH:148, 192, 523, 624 **vs** TM:65; STP:19–20 | Set `rejectUnauthorized: true` explicitly on the pinned dispatcher. Never use the global dispatcher. Refuse to start if `NODE_TLS_REJECT_UNAUTHORIZED=0` or `NODE_USE_ENV_PROXY` is set. Extend ST-03 and ST-04 with these environment cases. Record that `NODE_OPTIONS` belongs to the trusted operator (A1). | Client/network + config |
| **B5** | Blocker | **Profiles are enforced only at registration.** A hidden tool is "absent from `tools/list`", but nothing checks again at dispatch or inside `callOperation`. | ARCH:277, 310 (step 1), 315 **vs** TM:71, 91 (TM-07); STP:23 | Add a dispatch-time check in `guard` and an operation-level check in `callOperation(op, ctx)` against the enabled profiles and the code-owned allowlist. Unknown operations are denied with zero signer calls. Add this to ARCH §5.6 as guard step 0. | Policy |
| **B6** | Blocker | **Audit cannot fail closed.** `Audit.record()` returns `void` and writes to stderr. TM and STP require that an unavailable pre-action audit sink blocks the call. | ARCH:310 (step 4), 373–377 **vs** TM:97 (TM-13); STP:29 | Make it `record(): Promise<void>` that throws when the sink is unavailable. The guard awaits the pre-record before signing. A failed post-record reports the effect as "possible or completed" and is never retried. Unknown-outcome becomes an `outcome` value (`'unknown'`). | Policy + observability |
| **B7** | Blocker | **The email enablement condition depends on code being present, not on review,** and ARCH even considers regenerating schemas per deployment from the instance, which is untrusted (boundary B4). | ARCH:161, 465, 538, 666 (§13.4), 698 **vs** TM:19 (A7) | Apply A7. Rejecting `email` at config load replaces "accepted, warning logged". Delete the per-deployment generation option in §13.4. | Architecture + config |
| **B8** | Blocker | **HTTP transport is selectable in the Phase 2 config schema,** while TM puts HTTP out of scope and requires unsupported HTTP activation to fail closed. | ARCH:173–181, 561–576, 699 **vs** TM:3, 100 (TM-16); STP:32 | Apply A1. Remove the `transport.http` block from the baseline schema and mark §9.2 and item 17 as "future, separate review". | Architecture + config |

## 4. Other findings

| ID | Sev | Topic | Finding and evidence | Remediation | Owner |
|---|---|---|---|---|---|
| F1 | High | Export boundary | ARCH controls are "resolve and check that the path stays inside" (a TOCTOU race) with only a per-file cap. There are no permissions, no `O_NOFOLLOW`/`O_EXCL`, no aggregate quota, no concurrency limit and no cleanup. ARCH:447, 525, 169–172 **vs** TM:75, 94; STP:26 | Apply A4 in ARCH §8.1 and §6.4. | Exports |
| F2 | High | Export versus response cap | `ApiRequest.maxBytes` is a caller-set override (ARCH:228), but the export needs 200 MB and the global cap is 2 MB (ARCH:164, 171). Either downloads cannot work or any tool can raise the cap. | Make the byte budget a property of the operation descriptor (binary export only). Tool arguments must never set it. | Client + exports |
| F3 | High | Decompression | ARCH streams the body against `maxBytes` with no stated encoding, and `fetch` decompresses transparently. TM:77 and ST-11 require both a wire cap and a decompressed cap. | Send `Accept-Encoding: identity` and also count the decoded bytes (A8). | Client |
| F4 | High | Retry bounds | ARCH:258 honours `Retry-After` with no cap and no total deadline. TM:77 and ST-12 require both. | Apply the A8 budget: 60 s total, 30 s `Retry-After` cap, every attempt charged to the rate budget. | Client |
| F5 | High | Threat completeness: model-provider egress | Every read result goes to the host's model and possibly to a third-party LLM provider. The TM lists "host/model context" as an asset (TM:24), but no threat or control covers data leaving the organisation this way. | Add **TM-17** (I / High): deployment eligibility for sending appliance data to the model provider; minimised default views; operator notice in the README. Map it to ST-09. | Threat model |
| F6 | High | Default-on high-sensitivity read | `darktrace_advanced_search` (GET and POST, high sensitivity) is in the default read profile. TM:71 requires minimisation and a "separate eligibility review" for sensitive search. ARCH:413 **vs** TM:71 | Either move it behind an explicit `search` sub-flag or record the eligibility decision. Baseline proposal: default-on, with field-minimised output, the A8 caps, and an explicit sentence in the README. | Architecture + threat model |
| F7 | Medium | Appliance-driven quirks | Quirks with `effect: 'alter_request'` are chosen from the version that `/status` reports (ARCH:287–292). A compromised or spoofed appliance could select altered request shapes. This is not in the TM. | Quirks may only narrow requests or disable tools. They must never change signing mode, the policy tier or limits. Add this to the TM-07 controls. | Client + threat model |
| F8 | Medium | Test-only knobs in production config | `compat.assumeVersion` ("tests only", ARCH:183) is part of the production schema. TM:65 requires test bypasses to be impossible to select from production config. | Move it to a test-only factory argument, out of `ConfigSchema`. | Config |
| F9 | Medium | Base URL | `baseUrl: z.string().url()` (ARCH:147) accepts `http:`, userinfo, paths and queries. TM:63 rejects all of them. | Validate HTTPS-only with no userinfo, query, fragment or path other than `/`. Normalise the host and reject alternate numeric IP forms. | Config |
| F10 | Medium | Supply chain: `npx` | `npx -y pkg@x.y.z` pins only the top-level package. Transitive dependencies resolve fresh because a published `package-lock.json` is ignored. The interim release-asset URL has no integrity check. ARCH:589, 601–603 **vs** TM:99 (TM-15) | Publish `npm-shrinkwrap.json`, or bundle runtime dependencies into `dist/`. Publish a SHA-256 checksum and a GitHub artifact attestation for each tarball. Add the installed-tree check to ST-15. | Release |
| F11 | Medium | Docker secrets | The sample uses `--env-file` (ARCH:631), which puts the private token in plaintext env (`docker inspect`) and contradicts the token-file preference (ARCH:192). | Document `DARKTRACE_PRIVATE_TOKEN_FILE` with a read-only secret mount as the Docker default. | Release |
| F12 | Medium | Token-file hygiene | No check on the token file's permissions or ownership. Not in the TM. | Refuse or warn when the file is group- or world-readable or owned by another user. Add a case to ST-02. | Config |
| F13 | Low | Version pins inconsistent | zod `^4.2.0` "pin exact" (ARCH:15) **vs** `4.6.5` exact (ARCH:652). (In-progress `package.json` says `4.2.0`; observation only.) | Pick one exact version and state it once. | Release |
| F14 | Low | Test runner | ARCH §11 uses `vitest` (ARCH:640–647, 683). STP:7 uses `node:test` "as agreed with the coordinator". | Update ARCH §11 and §14 to `node:test`. | Architecture |
| F15 | Low | Stale status | ARCH:3 says "No implementation exists yet", but `src/` is being written. | Rephrase it as "design baseline; implementation in progress, not validated". | Architecture |

**Checked and found consistent (no finding):** verified TLS with no insecure flag in config (ARCH:148, 192; TM:18); refusal of every redirect (ARCH:258; TM:67); no retry of POST, DELETE or read-via-POST (ARCH:258; TM:77); tokens never accepted in argv (ARCH:192; TM-02); the 79-operation accounting and tier counts; output treated as untrusted data (ARCH:524; TM-06); stdout reserved for the protocol (ARCH:52; TM-14); Docker `npm ci --ignore-scripts`, non-root user, digest-pinned base (ARCH:612–623). For minimal installation: 2 runtime dependencies, a `files` whitelist, no `postinstall` and a `npm pack --dry-run` gate (ARCH:601). This is adequate apart from F10.

## 5. Test-oracle review

| Test | Assessment | Required change |
|---|---|---|
| ST-01 | Good. It separates checking the algorithm locally from appliance acceptance. | Add an assertion that the disabled S4, S5 and S6 shapes are rejected before signing (A3). |
| ST-02 | Good. | Add the token-file permission case (F12). |
| ST-03 | Covers `TLS_INSECURE` in config only. | Add `NODE_TLS_REJECT_UNAUTHORIZED=0` and an assertion that the dispatcher is explicit (B4). |
| ST-04 | Strong oracle, but it cannot be implemented against the ARCH client (B3). | Requires an injectable resolver and connector. Add `NODE_USE_ENV_PROXY`/`--use-env-proxy` (B4). |
| ST-07 | Good. It already requires direct dispatch of hidden tools. | No change; it depends on B5 being designed. |
| ST-08 | Its oracle "execution stays disabled" is right for this baseline. The "once implemented" clause invites scope drift. | Under A5, make the baseline oracle: every critical call returns a preview with zero signer, network and audit-"ok" events; no input field enables execution. Move the approval cases to a future gate. |
| ST-09 / ST-10 | Strong. | Add the descriptor-owned byte budget (F2) and the A4 numeric quotas as pass thresholds. |
| ST-11 | Says "define finite budgets before accepting", so it has no pass threshold today. | Use the A8 values as thresholds. |
| ST-13 | Cannot pass against ARCH's `void` audit (B6). | No change once B6 is fixed. |
| ARCH §11.4 | Weaker than STP: "dry-run makes no HTTP call" and "`confirm` is required". | Defer to STP IDs and remove the `confirm` assertion (B1, B2). |
| Missing | No oracle for model-provider egress (F5) or appliance-driven quirk effects (F7). | Add to ST-09 and ST-07 respectively. |

## 6. Gate decision per capability

| Capability | Decision | Blocking items |
|---|---|---|
| Phase 2 design baseline | **CONDITIONAL GO**: final once B1–B8 are applied to the documents and A1–A8 are adopted. | B1–B8 |
| Read-only stdio implementation | **GO to implement.** A release stays blocked until the read-only offline gate evidence (STP:38) exists for the exact commit. | B3, B4, B5, F3, F4, F8, F9; ST-01–07, ST-11–16 |
| Write (medium/high) | **NO-GO to enable.** Implementation behind a disabled-by-default flag is allowed. | B2, B5, B6, F4; full ST-07, ST-12, ST-13 |
| Critical (6 operations) | **Preview-only** in this baseline. Execution is out of scope. | A5; a new design review is required to change this. |
| Export | **NO-GO**, disabled. | F1, F2, F3; ST-09, ST-10, ST-11 evidence |
| Email | **NO-GO**, fully blocked. | A7 / B7; S9 external validation |
| HTTP transport | **Out of scope.** | B8; separate threat model |
| Release artifact | **NO-GO** until ST-15 is run on the actual tarball and image. | F10, F11, F13 |
| 7.1 compatibility claim | **External validation pending.** | Separately authorised lab campaign (STP:46–48) |

## 7. Limits of this review

- **Documents only.** I did not audit the source code. The in-progress files under `src/` (config loader, signer, HTTP client) were looked at only enough to avoid stale findings. For example, the draft config loader already rejects `DARKTRACE_TLS_INSECURE`, and the draft client clamps the per-request `maxBytes` to the global cap, which makes F2 a functional blocker for export. **None of this is a claim that a control works.**
- **No tests were run** and no lab or appliance was contacted. Every ST row remains NOT RUN.
- **No risk is accepted.** The residual risks in the TM (bootstrap DNS trust, remote replay window, the host model misreading injected text, publisher compromise) need explicit, dated operator acceptance, which is not recorded anywhere.
- Darktrace server behaviour (S1–S9, 7.1 regressions, ACLs on API tokens) and MCP host behaviour (annotation handling, prompt-injection resistance) are outside what a design review can establish.
- External facts were not re-verified except the Node proxy behaviour cited in §1. The SDK version claims in ARCH §2 were taken as stated.

## 8. Remediation owners

| Owner (role) | Items |
|---|---|
| Architecture owner (`docs/architecture.md`) | B1, B2, B7, B8, F6, F14, F15; adopt A1–A8 text in §5.1, §5.6, §6.3–6.5, §8, §9.2, §13 |
| Threat-model owner (`threat-model.md`, `security-test-plan.md`) | Replace A1–A8 with the §2 decisions; add TM-17 (F5) and the F7 control; apply the §5 oracle changes |
| API-contract owner (`api-contract.md`) | Correct API:165 (dry-run never signs) |
| Client/network owner (`src/client/*`) | B3, B4, F2, F3, F4, F7 |
| Config owner (`src/config/*`) | B4 (environment refusal), B7, B8, F8, F9, F12 |
| Policy + observability owner (`src/policy/*`, `src/observability/*`) | B2 (guard placement), B5, B6 |
| Exports owner | F1, F2 |
| Release owner | F10, F11, F13 |
