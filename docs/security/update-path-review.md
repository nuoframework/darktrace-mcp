# Independent update-path security review

**Reviewer:** independent update-path reviewer

**Base:** PR #23 merge `a57d38a` on `main`

**Reviewed tree:** `nuoframework/review-update` after the fixes below

**Release:** 1.1.3 is not tagged or published

## Decision

The reviewed `update` path had two high and three medium findings. All five are fixed in `src/cli/**` and covered by the fake-service tests. No medium-or-higher finding remains in the reviewed CLI path. Two low residuals remain: the Docker digest record is authenticated by the GitHub HTTPS release endpoint rather than a separate image signature, and failure snippets may show local token-file paths. Neither path prints token values.

The base code did not bind the package tarball to the initial registry integrity value, inherited npm configuration and TLS-bypass environment, accepted a provenance count without checking its repository identity, and allowed a missing provenance URL on newly trusted releases to bypass that check. Client writes had no cross-process lock or crash recovery. Docker updates could reuse a stale local tag and did not compare the pulled image digest with the release record. These are fixed below.

## Findings

| ID | Severity | Base evidence | Fix and verification |
|---|---|---|---|
| **UR-01** | High | At `a57d38a`, `src/cli/registry.ts:47-61,107-120` queried `dist.integrity` but did not compare it with the installed package; npm inherited caller configuration and TLS environment. The parent process also used global `fetch()` for GitHub release data, which could inherit `NODE_TLS_REJECT_UNAUTHORIZED=0`. | npm now runs with an allowlisted environment, empty user/global/project configs, a private temporary cache, explicit npmjs.org registry flags, and `--strict-ssl=true`. The packed tarball SHA-512 and installed lockfile integrity must both equal the `npm view` value before signatures or copy. GitHub release fetches fail closed when the Node TLS bypass variable is set. Fake cases set both `NPM_CONFIG_*` forms, `NODE_TLS_REJECT_UNAUTHORIZED=0`, `NODE_OPTIONS`, alternate scoped registries, a wrong tarball and a mismatched lockfile. |
| **UR-02** | High | At `a57d38a`, `verifySignatures` in `src/cli/registry.ts:140-148` accepted any positive attestation count for the whole tree. Provenance was optional whenever registry metadata omitted `dist.attestations.url`; no repository, workflow, subject digest or Rekor condition was pinned. | For node fixed-copy updates from 1.1.0 onward, missing provenance metadata is fatal. `gh attestation verify` now pins `--repo nuoframework/darktrace-mcp`, `.github/workflows/release.yml`, the exact `refs/tags/v<version>` certificate identity, GitHub Actions OIDC issuer and SLSA predicate. The SHA-256 subject must match the tarball; JSON output must contain a matching digest and a verified `Tlog` URI containing `rekor`. Older unprovenanced releases require explicit `--allow-downgrade`. Fake cases reject another identity, a mismatched subject digest, missing Rekor evidence and stripped provenance metadata. |
| **UR-03** | Medium | At `a57d38a`, `src/cli/update.ts:288-300,381-445` rewrote clients sequentially without an update lock or transaction record. A failed later writer could leave a mixed set, and concurrent runs could interleave. | Mutating update and rollback operations take an exclusive per-HOME lock. An atomic recovery journal records the old launch and state before the first client change; failures compensate immediately, and the next mutating run resumes recovery after interruption. The fake client test leaves a recovery record after a refused rewrite, then repairs the client and verifies the retry restores and completes the set. A concurrent update is rejected while the first holds the lock. |
| **UR-04** | Medium | At `a57d38a`, `src/cli/state.ts:61-65` accepted any regular `setup.json` without checking owner or write permissions. `src/cli/update.ts:402-408` accepted any absolute package-shaped `previousEntryPath` with a matching version. | Saved state now rejects symlinks, unexpected ownership and group/other write permission. Rollback accepts only the canonical path under the verified fixed-copy store and warns that older security issues may return. Tests cover writable state, a symlinked state file, a crafted path outside the fixed-copy store, missing previous copies and the rollback warning. |
| **UR-05** | Medium | At `a57d38a`, `src/cli/update.ts:325-340` inspected a local tag before pulling, so an old local image could be selected. A digest was optional and was not compared with the GitHub release record. | Docker update always pulls the release tag, requires a unique digest for the matching tag in the GitHub release body, and checks the pulled repository digest before changing clients. The launch entry keeps `--pull=never`; the old image remains recorded for rollback; uninstall still removes only recorded IDs. The fake Docker case starts with a stale local tag and rejects a release-digest mismatch without changing the client entry. |
| **UR-06** | Low | At `a57d38a`, `src/cli/registry.ts:164-168` stripped ANSI CSI and C0/C1 controls but left Unicode format and bidi controls; deprecation text was printed without sanitization. | Release text is byte-bounded to 512 KiB, then limited to 60 lines and 6000 characters; ANSI, C0/C1, Unicode format and bidi controls are stripped while LF is retained. Deprecation metadata is sanitized and bounded before display. A fake GitHub release response exercises terminal escape, bidi and output-cap cases. |
| **UR-07** | Low | At `a57d38a`, `src/cli/update.ts:477-485` printed client fallback snippets, and `src/cli/clients.ts:233-247` renders token-file paths into those snippets. | No token value is printed or sent in that output. A local path may appear in a fallback snippet after a client cannot be rewritten; this is retained so the operator can complete the repair. npm and GitHub child processes now receive only runtime, proxy and CA environment, not application tokens or unrelated shell secrets. No telemetry-like call was found. |

## Threat-model verdicts

| Item | Verdict | Reason |
|---|---|---|
| TM-U-01 | **ACCEPT WITH FIX** | Registry, SRI, npm signatures and repository/workflow provenance are now enforced for pinned node updates. Docker’s pulled digest must match the GitHub release record. The repository/release workflow and GitHub HTTPS service remain trust anchors; the Docker image does not have a separate Sigstore image signature in this path. |
| TM-U-02 | **ACCEPT WITH FIX** | Exact version echo, downgrade refusal, legacy provenance opt-in, deprecation warning and rollback warning are covered. A registry-controlled `latest` tag remains an input, but it cannot bypass the version and provenance gates. |
| TM-U-03 | **ACCEPT WITH FIX** | Lock and recovery journal serialize writes and recover an interrupted switch. A client provider that refuses both requested update and restoration still needs operator repair before the next mutating run. |
| TM-U-04 | **ACCEPT WITH FIX** | State ownership/write checks and canonical fixed-copy validation prevent a crafted absolute path from being run as rollback code. A same-user operator can still edit files they own. |
| TM-U-05 | **ACCEPT WITH FIX** | The mode remains opt-in and unverified. Setup states the trade-off; `update` reports no move, `update --check` reports that `@latest` is resolved at next start, and `test`/`doctor --online` do not show a false pinned update. |
| TM-U-06 | **ACCEPT WITH FIX** | Release output now removes terminal and bidirectional controls and is bounded. Compromised release prose can still mislead a reader. |
| TM-U-07 | **ACCEPT WITH FIX** | Static symlinks are rejected, fixed-copy rollback paths are canonical, and concurrent updates serialize. Same-user races on path ancestors/backups are not an isolation boundary because that principal already owns the client and token files. |
| TM-U-08 | **ACCEPT WITH FIX** | No telemetry call or token/appliance-address transmission to npm, GitHub or GHCR was found. Expected contacts are npm/Sigstore verification, GitHub release/attestation APIs, GHCR image pull, and one signed status request to the configured appliance during an update. |
| TM-U-09 | **ACCEPT WITH FIX** | Only a verified copy reaches offline `--check-config`; it receives the same configured environment used by `test`. The verified code can read configured token files, which remains an inherent update trust boundary. |

## Tests and experiments

The update tests use a scratch HOME plus a fake npm/registry executor, a fake GitHub release response, a fake `gh` attestation verifier, and a fake Docker daemon. No write operation was sent to the real npm registry, GitHub or GHCR.

Four top-level functional tests were added:

1. Release-note controls, output bounds and deprecated-version notice.
2. Writable/symlinked saved-state rejection and canonical rollback path validation.
3. Concurrent update lock exclusion.
4. GitHub release fetch refusal when Node TLS verification is disabled by the environment.

Existing update tests gained cases for hostile registry/TLS environment, exact version echo, oversized registry JSON, tarball and lockfile integrity mismatch, missing provenance, wrong provenance identity, subject digest mismatch, missing Rekor Tlog, interrupted rewrite recovery, stale Docker tag refresh, and Docker digest mismatch. The focused command `node --test dist/test/cli/update.test.js` passed 25/25.

Local checks on this tree: `npm run lint`, `npm run typecheck`, `npm test` (315/315), and `npm run test:security` (1150 cases; 1147 pass, 0 fail, 3 existing macOS setgid skips). The focused update suite passed 26/26. The full security receipt and byte pins are recorded in [release-pins-1.1.3.md](release-pins-1.1.3.md).

The 1.1.3 GitHub attestation itself could not be exercised against a published release because 1.1.3 is not tagged. The fake verifier asserts the exact command policy and exercises wrong-identity, wrong-digest and missing-Rekor results. GitHub documents `gh attestation verify` as checking artifact identity and predicate type and exposes the verified certificate, statement subjects and transparency timestamps in JSON ([GitHub CLI reference](https://cli.github.com/manual/gh_attestation_verify)); npm documents `npm audit signatures` for registry signatures and package provenance ([npm provenance verification](https://docs.npmjs.com/viewing-package-provenance/)).

## Documentation alignment

`docs/security/threat-model-updates.md` has been reconciled to these controls. `docs/update.md` remains untouched because PR #19 includes it in the Spanish-first rewrite. Its current provenance row still describes repository/workflow verification as a manual step, and its Docker section still describes the digest as a manual comparison. The PR #19 rewrite should reflect this review’s automatic node provenance and Docker digest checks before the 1.1.3 release.

## Information-flow observations

There is no telemetry call. npm operations are fixed to `registry.npmjs.org` with TLS verification forced; signature verification reaches npm’s registry/Sigstore services, and `gh attestation verify` reaches GitHub’s public attestation APIs. Docker updates pull from GHCR, and successful updates make one signed `GET /status` to the operator-configured appliance. The Darktrace token values, appliance URL and client names are not included in npm, GitHub or GHCR requests. A Docker pull may use the operator's configured GHCR authentication through Docker. Failure snippets can display local token-file paths, as noted in UR-07.

**Signed:** independent update-path reviewer
