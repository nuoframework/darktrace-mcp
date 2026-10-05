# Independent R1/R2 response-view review

**Decision: ACCEPT R1/R2 for root rebuild, full-suite and same-recipe lab retest. Stable publication remains blocked.** No required implementation fix was found. This is offline compatibility acceptance, not live validation or release approval; the existing external Docker/OpenSSL CVE blocker remains open.

Reviewed 2026-10-05 by dispatched worker `task_20c7896ff7ab`, dispatch `ctx_afa82b46d409`, against repair-plan §7. Only this repository document was edited. No production, fixture, manifest, Git, credential, API, Docker, publication or delegation action was performed.

## Observed scope and evidence

I independently compiled all 79 operations from local OpenAPI and `response-fields.json`, recursively compared the generated views, and asserted the complete semantic difference is exactly:

| Operation | Path | Before → after |
|---|---|---|
| `get_antigena_summary` | `pendingActionDevices[]` | `summary` → finite `number` |
| `get_antigena_summary` | `activeActionDevices[]` | `summary` → finite `number` |
| `get_antigena` | `[].triggerer` | reviewed `username`/`reason` object → union of that same object and `null` |

All operation keys are identical, and compile plus the three overrides equals the generated views. R3/deviceinfo, R4/summarystatistics and literal kinds are absent from this change. The generator applies the overrides once before writing views/catalogue; an evidence/path failure throws before those writes.

The evidence check is a verbatim substring check against the **specific property description in parsed local YAML**, not a global text search or inferred upstream key:

- `AntigenaSummary.pendingActionDevices` at YAML line 7888: `An array of did values - unique device identifiers - for devices with pending actions.`
- `AntigenaSummary.activeActionDevices` at YAML line 7892: `An array of did values - unique device identifiers - for devices with active actions.`
- `AntigenaFulldevicedetailsFalse.triggerer` in the schema starting at line 7275: `If triggered manually, an object describing the user who triggered the action. If triggered by Darktrace automatically, "null".` YAML folds the physical line break; the override quote `If triggered by Darktrace automatically, "null".` exists verbatim in the parsed description.

Missing schema/property/quote/operation/path, incompatible original kind, an already-corrected item and double application fail closed. The test mutations exercise these refusals. The override table's outer array is frozen; its nested entries are trusted build-time code, not caller-configurable policy. No runtime YAML parsing or upstream-driven widening was introduced.

## Fail-closed behavior and preserved boundaries

The six override tests include 2,000 seeded iterations and extract the actual harness `viewShape` function via VM. Finite numeric device entries, documented object triggerers and null triggerers pass without fallback; numeric strings, other scalar/object/array types, NaN/Infinity and null in other fields retain the fixed fallback without canary reflection. Unknown keys are dropped and mark omission; unknown-only objects fall back. Missing/empty objects retain existing projector behavior, while the harness rejects an empty triggerer object: parity here means unchanged conservative acceptance, not that every projector output is automatically a lab pass.

I added external independent assertions for own `__proto__`, `constructor` and `prototype` keys at the corrected triggerer path and for an inherited `reason` canary. None survives projection or pollutes prototypes; projected objects have null prototypes. The policy-sinks regression also verifies prototype attacks and output bounds through tool handling.

The 1,000-item cap is exercised by the override tests. An independent assertion exercises the 16,384-character triggerer username cap and truncation flag; the depth limit remains 8. Existing transport, aggregate output and harness limits and redirect refusal are untouched. These local checks do not replace root's full security/transport suite or source-bound receipt.

Against `/private/tmp/darktrace-restored-release-review-20261005/security-receipt.json`, the **entire** production file-hash map differs only in `api/response-view.ts`, `api/response-views.generated.json` and `coverage/report.generated.json`. Thus all immutable write-capability, configuration, authorization, descriptor and client guards are byte-identical to that accepted pre-fix source. Read-only release tests additionally deny all 22 nonread operations under forged configuration, before preview/audit/network, and check the frozen capability/descriptor ceilings and production startup refusals.

## Isolated execution and exact contract

Snapshot: `/var/folders/tl/x0ps4dwd14x4qhyyh6x0lmgw0000gn/T/darktrace-r1r2-independent-hauufx6v`; Node v24.14.1, macOS arm64. Inputs were copied and existing dependencies linked read-only in practice; all build writes stayed in the snapshot. Reviewed checkout inputs were checked byte-identical to the tested snapshot after execution.

- `npm run build` and `npm run typecheck`: exit 0.
- Targeted overrides, response-view, union, summary compatibility, coverage-final, catalogue and read-only-release tests: **34/34**, no failures/skips.
- `node --test test/security/policy-sinks.test.mjs`: **30/30**, no failures/skips.
- Harness `node --check` and `--help`: exit 0, no lab execution.
- `captureReviewedContracts(snapshot)`: passes the complete pinned fixture comparison, historical archive and forbidden-profile startup checks.
- Independent SDK connections to the **production stdio child**, with `diagnostic-guard.mjs` and synthetic credentials, compare exact tool order, names, descriptions, input schemas and annotations to the pinned full fixture. Both supported profiles match; no network/signing guard violation occurs.

Full reviewed fixture remains `ea31d70a484c0d0353cb8651edc4b6a4ab13798c096056e8cdcf68e78324707f`. Production child read profile: 27 tools, `6ce22e568592b27281d14b1fd7361f80da1e0daf7bb2888c892458cc9f532e68`; read+sensitive: 28 tools, `def9a8db53e2fc4d000257d865a2da5c2453c30285e6fb61244ce02c57434a6b`. No fixture was recaptured or edited.

Logs and external assertions are retained in the snapshot as `targeted.log`, `policy-sinks.log`, `independent-check.mjs` and `independent-check.log`. They are review diagnostics, not a release manifest/security receipt.

## Current SHA-256 identity

Production `src/` tree, using `prepare-release.mjs` sorted recursive file-hash map and SHA-256 of its JSON: **`aa08c260847c0fc206253f2de3cb1a872f89d2f9d85f5618b88ffd0f5c681e8e`**.

| Input | SHA-256 |
|---|---|
| `src/api/response-view.ts` | `f3c92e69d0e159a4f5e1fdd214a999f4745c7e5a181e8640d01db500af593747` |
| `src/api/response-views.generated.json` | `d554398d4cbe299121acb9c858941c8074097896f0457c8a53572aff96cdd4c1` |
| `src/coverage/report.generated.json` | `d5a71444de62b08ed5b6248f7773dc0600d4c1f70484abc4f79f24447eae785e` |
| `scripts/generate-catalogue.ts` | `2a4a27cac649d67baf4998ba611f27d5b9dfa26a1ea24ac677a6889486368185` |
| `scripts/lab-read-smoke.mjs` | `789c0a114260606d3f26499e78ebb8d8fed5d32b05476dd10b9e969134a182f8` |
| `scripts/prepare-release.mjs` | `3a7d3fdd1ebfa89eabc508e5eb582ecf3b3d40c3e798ef00dc9410ad112d91eb` |
| `scripts/verify-release.mjs` | `e4a293cebf731495534a69e75aec69fd2f7b8455a49b5e89d3a33f77ae5e7082` |
| `test/security/mcp-contracts.mjs` | `c2f57ddc73ade69f875bb87f577fa9fa5d46c126b252b905cff6c446c7823e56` |
| `test/contract/response-view-overrides.test.ts` | `b82b71f5defc622fe24720dc584ad6f218a0350b499ec7e8cefb2884db1bea4f` |
| local OpenAPI YAML | `baa778909e62ed709644a2ad846a23b96510bd5ed2aea5769847116c395bb4f3` |
| `src/policy/release-capability.ts` | `39cb390e1ba5fdd3a0cda3232dbdbbf4a9ed619373bd7f7f804d80137e7317af` |
| `src/policy/guard.ts` | `3fe3a853c0b41712769f02202e54048f120b09c52debc30b1e486cd0bdce2cdf` |
| `src/config/schema.ts` | `c39d867404895f3d0307c6ade0ce62daee7b3e008fa6ef315c2cf507dcaa8528` |
| `src/config/load.ts` | `ad23445b7712a28ce1856c1f774dee147414add9dd374abe265ed2adbd575cb4` |

## Finite root gate

1. Freeze the reviewed source/helper identity above; rebuild in an isolated snapshot, run full functional and security suites and bind fresh source/runtime receipts. Reconfirm full `ea31…` contract and unchanged write ceiling. Historical pre-fix receipts cannot certify this source.
2. Complete package preflight/reproducibility and create a fresh protected manifest binding source, runtime, contract and harness. Image rebuild/scan evidence also needs refreshing; the external Docker/OpenSSL CVE issue still prevents stable publication.
3. Using that bound manifest and the reviewed harness, retest **exactly the existing reviewed `get_antigena` and `get_antigena_summary` recipes**, with no guessed parameter combinations. Each must report `compatibilityShapeValidated:true`, `safeProjectionFallback:false` and `notTruncated:true`; status PASS alone is insufficient. Other undocumented nulls/variants remain blocked and require the reviewed structure diagnostic rather than broader overrides.

R3/deviceinfo and R4/summarystatistics retain their separate diagnostic/narrowing gates. This review authorizes proceeding through validation of R1/R2; it closes neither those compatibility gaps nor any remaining stable-release blocker.
