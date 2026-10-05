# Phase 2 security design review: round 4 (final closure check)

**Status:** independent final verification of the design documents only. Date: 2026-10-05. Reviewer: dispatched review worker (task `task_e876599adbf1`).

**Verdict:** all **4** round-3 fixes (R3-01 to R3-04) are correctly made in the baseline documents. All **33** earlier findings (B1–B8, F1–F15, R2-01 to R2-10) **remain closed**, so **37 of 37 are closed**.

This round found **1 new Medium** design finding (**R4-01**): the rules for securing the configuration file are referred to but never defined. **Open design findings: 1. The modelling phase should not be declared closed until R4-01 is fixed.** The fix is one documentary correction and needs no new coordinator decision (§4).

**What "closed" means here:** the documents state one consistent, testable requirement for the issue. It does not mean the source implements it, any security test passed, the appliance accepts the requests, a release artifact exists or any risk is accepted (§6).

## 1. Scope and method

| Input | State |
|---|---|
| ARCH (`docs/architecture.md`) | Working tree, 391 lines |
| API (`docs/api-contract.md`) | Working tree, 195 lines |
| TM (`docs/security/threat-model.md`) | Working tree, 123 lines |
| STP (`docs/security/security-test-plan.md`) | Working tree, 54 lines |
| DD (`docs/security/design-decisions.md`) | Working tree, 105 lines |
| Review round 1 | Unchanged. `2008a5ca…209c274`, matches DD:5 |
| Review round 2 | Unchanged. `f17f1027…cc5c`, matches DD:5 |
| Review round 3 | Unchanged. `567d3f1a…37c9`, matches DD:5 |

**How I checked:** I read the actual corrected passages and used DD's matrix only as an index.

**Scope limits:**
- `docs/configuration.md` is owned by another worker. I read it only to check R3-03 and R3-04, and for the evidence in R4-01. I did not review it for unrelated features.
- I did not audit, test or change any source.

## 2. Round-3 closure verdicts

| R3 | Accepted decision | Evidence (exact lines) | Verdict |
|---|---|---|---|
| **R3-01** failed DNS initialisation | Only a fully validated snapshot is frozen as success. A failure is cached as **terminal until process restart**: the first call, concurrent calls and all later calls are denied before signing or opening a socket. There is no further DNS lookup, no partial snapshot and no request carrying credentials. Automatic safe-GET retries never retry an initialisation failure. A restart, or a new client instance in isolated tests, starts a fresh lookup under the same rules. | ARCH:106, 167; TM:65, 83; API:175; STP:20 (ST-04: resolver changed to valid answers, then no new lookup; restart case; both rejection and mixed-answer failures), 28 (ST-12) | **Closed** |
| **R3-02** auditing previews and denials | Previews and denials are audited **optionally, best effort**. If a record is written, it uses `preview` for a preview and `error` for a denial, never `ok` or `start`. There is no `denied` outcome. Only a code-owned operation ID or a fixed "unknown operation" marker is stored. A failed optional record cannot block a preview or turn a denial into an execution. The pre-audit for executing writes stays **mandatory, awaited and fail-closed**. | ARCH:140, 143, 146, 157; TM:73; API:174; STP:29 (ST-13 includes disabled, written and failing optional records) | **Closed** |
| **R3-03** proxy variables | All 8 spellings are refused: `HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY` and `NO_PROXY`, upper and lower case, even when set to an empty value. `NODE_USE_ENV_PROXY` and `--use-env-proxy` are refused in argv and `NODE_OPTIONS`. Errors give the variable name only. The fix is to unset them for the server's own launch only. | ARCH:88; TM:65; STP:20; `docs/configuration.md:68–73` lists the same 8 spellings plus `NODE_USE_ENV_PROXY` | **Closed.** The baseline and the user docs now agree. |
| **R3-04** `--check-config` and `doctor` | Run the **same** config, token and environment validation as startup, make **zero** DNS, network, socket or signing calls, print only fixed sanitized messages (a variable name at most), and exit without starting a protocol session. Success means local validation only. | ARCH:169; TM:89; STP:18 (ST-02), 30 (ST-14) | **Closed.** But the "identical secure-file rules for config/token sources" phrase in ARCH:169 points at rules that do not exist for config files; see R4-01. |

## 3. Regression check of the prior 33 closures

I re-read the passages changed in this round: ARCH §5.1, §5.3, §5.6 and §5.8, TM network, audit and lifecycle, and ST-02, -04, -12, -13 and -14. I also searched all five documents for stale wording: enabled HTTP, email, export or critical execution; signed previews; `confirm`; fallback signing; a 60 s deadline or 30 s `Retry-After` wait; shortening `Retry-After`; a CIDR allowlist; startup-time DNS or status probing; a `denied` audit outcome; `vitest`; mismatched Zod versions. **No regressions.**

| Group | Result |
|---|---|
| B1–B8 | Still closed. Critical actions have no execution path; previews are unsigned with four fields; DNS and TLS pinning (now lazy, terminal on failure, exact-IP allowlist only); refusal of environment bypasses; runtime rechecks; fail-closed audit; email blocked; HTTP rejected. |
| F1–F15 | Still closed. Export future gate; byte budget owned by the operation descriptor; identity encoding; 30 s total deadline and `Retry-After` handling; provider notice; `sensitiveRead` off by default; quirks that only restrict; no `assumeVersion`; origin validation; shrinkwrap; Docker secret mounts; token-file rules; pins; `node:test`; status wording. |
| R2-01–R2-10 | Still closed. R3-01, R3-02 and R3-04 refine R2-10, R2-06 and R2-08 without contradicting them. In particular, "server may remain available" (TM:89) is consistent with denying every later call after a terminal DNS failure. |

## 4. New finding

| ID | Sev | Finding | Evidence | Remediation | Owner |
|---|---|---|---|---|---|
| **R4-01** | **Medium** | **The configuration file has no secure-file rules in the baseline, but it can carry the private token and controls security policy.** ARCH:53 says only "operator-owned file/environment". ARCH:86 allows "file or token sources", and the operator doc says JSON `auth.privateToken` is supported inline (`docs/configuration.md:24`). The config file also sets profiles, `writeCritical`, `sensitiveRead` and the destination allowlist. ARCH:169 (from R3-04) requires the diagnostics to apply "identical secure-file rules for config/token sources", but no baseline document (ARCH, TM, STP) defines those rules for `DARKTRACE_CONFIG_FILE`. Only the separately owned user doc says "runtime-user-owned `0600`" (`docs/configuration.md:64`). As written, a private token stored inline in a group-readable or symlinked config file meets the baseline, which weakens the F12 token-file hygiene. ST-02 has no config-file stimulus. | ARCH:53, 86, 169; TM:85; STP:18; `docs/configuration.md:24, 64` | Add one normative sentence to ARCH §5.1 and TM credentials: the config file is opened no-follow and checked on the open handle (regular file, owned by the current UID, mode 0600 or stricter), with a fixed size bound and sanitized errors, using the same mechanism as token files. An inline `auth.privateToken`/`publicToken` is accepted only from a config file that passes these checks; never accept inline tokens from an unchecked source. Add config-file cases (symlink, other UID, group- or world-readable, oversize, inline token) to ST-02, run through startup, `--check-config` and `doctor`. **Alternative:** forbid inline tokens in the config file and require the `*_TOKEN_FILE` variables. Either option closes the gap; adding the checks matches the current user doc. | Architecture + config + STP owner |

No other security-relevant contradictions were found within the baseline or between it and the R3-related user-doc passages.

## 5. Mechanical checks

| Check | Result |
|---|---|
| Local links and anchors in the 5 baseline documents | 156 links, **0 broken** (matches DD's record) |
| Inventory | **79** = 57 read + 9 medium + 7 high + 6 critical; **2** read-via-POST, **11** high-sensitivity, **14** email |
| API inventory rows / TM rows / ST rows | **79 / 17 / 16** |
| DD closure rows | All **37** IDs (23 B/F + 10 R2 + 4 R3) appear exactly once |
| Historical review checksums | All three unchanged and matching DD:5 |

## 6. Gates still pending (not resolved by any document)

| Gate | Status |
|---|---|
| Offline security tests ST-01–16 for the exact commit | **NOT RUN.** No pass is claimed. |
| Implementation of the documented contract (terminal DNS cache, optional/mandatory audit split, proxy refusal, offline diagnostics, input-wrapper lowering, per-parameter coverage report, R4-01 once specified) | **Implementation pending.** Source and client tests are still being written. |
| S1 signing default and Darktrace 7.1 behaviour; S4/S5/S6/S9 | **External lab validation pending.** The shapes stay blocked. |
| Model-provider eligibility | Operator or organisational decision pending. The README notice is not release evidence. |
| Release artifacts (shrinkwrap installed tree, SHA-256, SBOM, attestation, image digest and mounts) | **Pending.** Private, unpublished. |
| Medium/high write activation | Procedural ST-07/12/13 review plus lab authorisation. Not enforced at runtime. |
| Export, email, HTTP, trusted critical approval | Outside the baseline. Each needs its own review. |
| Residual risks | **None accepted.** This report recommends no risk acceptance. |

## 7. Final scope verdict

- **Known design findings:** 38 in total (37 earlier + R4-01). **37 are closed, 1 is open (R4-01, Medium).**
- **Design blockers:** none of a disruptive or critical class. R4-01 nonetheless keeps the modelling phase from closing, under the rule that the phase closes only when every known finding is addressed.
- **After R4-01 is fixed** with the one-sentence rule and the ST-02 cases above, and those edits are checked, no known design findings would remain. Only the external implementation, ST, lab, provider and artifact gates in §6 would be left.

**Limits:** this review covers documents only. It did not run tests, make real API calls, change source, make commits or spawn agents. The user docs were read only where the R3 closures and R4-01 depend on them.
