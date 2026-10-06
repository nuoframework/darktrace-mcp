# Validated consultations test migration

Date: 2026-10-06 (Europe/Madrid)

The active test migration now reflects the validated-only 19-selector, 15-tool release scope. Positive output, projection, and Unicode normalization checks use approved `darktrace_get_status` or `darktrace_get_devices` calls; summary and Advanced Search selectors are exercised only as denied direct calls. The existing summary validation and response-view helper checks remain, alongside the exact denial checks for their excluded MCP routes.

## Changes

- `test/contract/read-summary-compatibility.test.ts` retains its input-range and projection coverage, uses the approved device read for a successful strict projection, and asserts that explicit `get_summarystatistics` denial has no preview, audit, or client request.
- `test/contract/response-view.test.ts` uses an approved device response to test unknown root and nested field omission, and asserts that explicit Advanced Search denial has no preview, audit, or client request.
- `test/security/mcp-defense.test.mjs` exercises control-character and variation-selector normalization through the approved device output shape.
- `test/security/policy-sinks.test.mjs` now checks all 60 excluded operation IDs across default, sensitive-read, and forged write profiles with `dryRun` absent/true/false. Every case asserts zero audit/client effects and no preview output; the sensitive-read checks compare successful status output across both profiles and deny Advanced Search despite caller/provider flags.
- `test/historical/validated-scope-predecessor/` preserves the four complete pre-migration test files byte-for-byte. `provenance.json` (SHA-256 `35d826f3b7f31547ae2080861359050693985dcb47e087e3c4d8581b44c4e675`) records matching original/archive digests; the helper owner was sent this path and digest for separate preservation verification.

No production source or contract fixture was edited for this migration. The active first-stable fixture present in the isolated snapshot already had SHA-256 `6ddda2054c9c708d0516a90b7811eb0aba565016403953dace89d47bc89d213c`, matching the supplied validated-19 candidate bytes. Its read and read+sensitive canonical contract hashes are both `cd4ee42249a9110182046794c39fc00f5995700b7d751bccc6628e86afbddfe3`; the alpha fixture remains `37b5af95de1786ecce1b8762e12d2d63e577f171511a9db4964518b13a917f72`.

## Isolated verification

The final test run used `/private/tmp/darktrace-validated19-test-migration.T1HAor`, copied from the shared source tree without `.git`, shared `dist`, or existing security evidence, and linked to the existing `node_modules`. The security receipt binds source tree SHA-256 `9e7c7070298ef592a1a10cdcb7ca481420a377e25e4a93c863ca33c31921d7f2`, Darwin arm64, and Node `v24.14.1`.

| Command | Exit | Result |
|---|---:|---|
| `npm run typecheck` | 0 | PASS |
| `npm test` | 0 | Build PASS; 130 PASS, 0 FAIL, 0 SKIP |
| `npm run test:security` | 0 | Build PASS; 322 PASS, 0 FAIL, 3 SKIP |
| `git diff --check` on owned files | 0 | PASS |

Security receipt: `/private/tmp/darktrace-validated19-test-migration.T1HAor/test/security/evidence/2026-10-05T22-41-09-512Z.json`, SHA-256 `aebac98fa4c6c74b6b450ff19e44c55b18fdbab1490cfe1e6082a2ad93a035ac`. The three skips are historical macOS chmod fixtures for mode `2600`; the OS removed the special bits before the tests could obtain an invalid fixture. The independent open-handle special-bit checks passed. Root has since explicitly approved and pinned the validated-19 fixture and both ordered profiles; fresh Linux Node 22/24 full-suite results, including zero special-permission skips, are recorded in [validated-consultations-platform-gates.md](validated-consultations-platform-gates.md).

## Final active test hashes

| File | SHA-256 |
|---|---|
| `test/contract/read-summary-compatibility.test.ts` | `c6c422e97b835961841e56d2797ea09c586b86dfdec212cecd9305bf403b86af` |
| `test/contract/response-view.test.ts` | `3a56b037180c44edab7291463569afdcfd00494f7f155723131e464872cf348a` |
| `test/security/mcp-defense.test.mjs` | `f5f6068ae7195f0e97343ce0949a46fc0fa386be3741cb713661a89d8d1e1513` |
| `test/security/policy-sinks.test.mjs` | `13a7471cd58fa5fbbe10711db74f0710ba6ab333518ea0f49a61c914b8238f55` |

Historical archive file digests equal their pre-migration originals:

| Original | SHA-256 |
|---|---|
| `test/contract/read-summary-compatibility.test.ts` | `9715e5aeacfd12801d15e895c1473cee026624b6433cda83a96c9f792c84122d` |
| `test/contract/response-view.test.ts` | `ca2b068777b1b8d1f7e0587e55f5e38aa44ddc618e873e9444cbfbb877c8ace9` |
| `test/security/mcp-defense.test.mjs` | `7a76844072b679c429ebcc5288355691fb844198c1b87d8e31803ce90e548725` |
| `test/security/policy-sinks.test.mjs` | `14ba5a0756fd3f886d1e15bf3d52b7c75e8d3a1b15460ce53105e2da0efc9420` |

Stable publication remains blocked by the OpenSSL 3.5.8 finding documented in the release plan. The validated-19 pins are approved; the new Linux gate results remain provisional while the independent review is ongoing.
