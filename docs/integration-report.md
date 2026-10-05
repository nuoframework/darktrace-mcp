# Server integration and offline verification

On 2026-10-05 the final server integration passed TypeScript checking and the complete offline suite: **84 tests passed, zero failures, cancellations, skips or todos**. The dedicated integration and coverage suite passed **15 tests**. This report records implementation evidence against [architecture](architecture.md) and [design decisions](security/design-decisions.md); it does not declare an ST acceptance gate, security approval, appliance compatibility or release approval complete.

## Implemented behavior

`runStdio` now owns an idempotent shutdown shared by EOF, stdin close/error, stdout error, transport close, SIGINT, SIGTERM and explicit handle close. It calls `client.close():void` before waiting for SDK cleanup, detaches signal and stream listeners, unpipes/destroys input and catches client/SDK cleanup failures using fixed diagnostics. The client interface was confirmed with the client owner through Orca. Dedicated tests exercise closure during an active tool request; existing client tests independently exercise connector and request cancellation. No client, config or shape source files were changed by this integration.

The raw newline-delimited wrapper applies configured byte admission before its own `JSON.parse` or SDK decoding. The newline counts toward the budget; a partial frame reserves that byte. It retains at most one admitted partial frame and rejects oversized slices before concatenation. The same lowered byte limit configures SDK `maxBufferSize`. Tool argument depth, element count and bytes are checked in the raw wrapper and again before operation parsing. Internal ceilings are 65,536 bytes, depth 8 and 5,000 elements; internal limits clamp larger injected values and production config rejects values above ceilings. Overflow closes the session, with a fixed `protocol_error` and no partial input echo or invented JSON-RPC response.

The audit recorder always constructs exactly `audit`, `ts`, `requestId`, `operationId` and `outcome`. It generates a UUID when requestId is omitted, rejects invalid correlation IDs, validates operation IDs against the trusted catalogue or fixed `unknown_operation`, and awaits the sink. Executing writes share the same generated ID across pre/post records; failed pre-audit prevents dispatch and failed post-audit reports completed effect when the request completed. Preview/denial auditing remains disabled, which is permitted by the optional baseline contract.

Operation validation now uses documented milliseconds for `starttime/endtime`, including one-hour defaults, and explicit units for the seven-day range gate instead of guessing units from numeric magnitude. UTC date strings are validated for format and calendar validity. Coordinate, hue, list/count and documented text bounds are enforced. Unknown temporal formats/units are rejected through strict schemas rather than accepted by generic string/number handling.

## Effective coverage

[Generated coverage](../src/coverage/report.generated.json) is built by [the runtime coverage generator](../src/coverage/report.ts) from the same Zod schemas and policy descriptors used by execution. There are exactly **79 operation rows**: 59 catalogue `implemented`, 19 `blocked`, and one `excluded`. These status labels preserve catalogue accounting; they are not counts of executable or published tools. Critical remains preview-only and profiles still restrict publication/execution. The independent `delete_tags_entities` row remains blocked (S5).

Coverage contains **418 parameter records** (383 accepted, 35 blocked), including body containers, nested properties, media-type variants and decoded Advanced Search fields. Each record states location, units, effective schema bounds, required/omitted/default behavior, provenance and enforcement; non-schema refinements are stated separately. This is schema/policy traceability, not exhaustive per-field live compatibility evidence.

Implemented catalogue rows contain these rejected forms:

- `get_devices.iptime`, `post_aianalyst_investigations.investigateTime`, `post_intelfeed.expiry` in both media types, and `post_tags_entities.duration`: temporal units or format are undocumented.
- Decoded Advanced Search custom `starttime/endtime/from/to`: units/format are undocumented. The documented relative timeframe is bounded to 1..604800 seconds; only the documented neutral `user_interval:0` is admitted.
- `get_summarystatistics.endtime/to`: the standalone endpoint has no paired endpoint in that operation schema and the paired-range validator rejects it.

`post_aianalyst_investigations` retains its catalogue row and profile-dependent discovery, but its required `investigateTime` is rejected, so no input can execute that form. Enabling blocked forms requires a reviewed contract and source change. `validatedOn` remains empty throughout; no 7.1 validation is inferred.

The coordinator authorized the minimal changes to `scripts/build.mjs` and `scripts/generate-catalogue.ts`, plus the now-released existing fixtures. Build first generates the catalogue, compiles runtime validation, then writes effective coverage to both source and compiled output. The old catalogue-only coverage writer was removed. A second build produced byte-identical catalogue and coverage files.

## Commands and observed results

Runtime: **Node v24.14.1**, **npm 11.11.0**. Tests ran in `/private/tmp/darktrace-final-ctx_7dbe939b22a1`, copied from this workspace with `src`, `test`, `scripts`, `docs`, `openapi`, `package.json` and both tsconfig files; its `node_modules` is a symlink to the installed workspace dependencies. This isolates `dist` and build-time generated writes from other workers.

| Command | Location | Observed result |
|---|---|---|
| `npm run typecheck` | workspace | Exit 0; `tsc -p tsconfig.json --noEmit` reports no errors. |
| `npm test > /private/tmp/darktrace-final-test.log 2>&1` | isolated copy | Exit 0; build succeeds; 84/84 passed, 0 failed/cancelled/skipped/todo; test duration 1094.571875 ms. |
| `node --test dist/test/mcp/integration-final.test.js dist/test/contract/coverage-final.test.js > /private/tmp/darktrace-final-dedicated.log 2>&1` | isolated copy | Exit 0; 15/15 passed, 0 failed/cancelled/skipped/todo; test duration 501.261042 ms. |
| `npm run build > /private/tmp/darktrace-final-build.log 2>&1` | isolated copy, second build | Exit 0. |
| SHA-256 commands below | isolated copy | Exit 0; all three digests identical. |

The exact hash capture command before the second build was:

```sh
node --input-type=module -e 'import {readFileSync,writeFileSync} from "node:fs";import {createHash} from "node:crypto";const files=["src/api/catalogue.generated.json","src/coverage/report.generated.json","dist/src/coverage/report.generated.json"];writeFileSync("/private/tmp/darktrace-final-build-hashes.json",JSON.stringify(Object.fromEntries(files.map(f=>[f,createHash("sha256").update(readFileSync(f)).digest("hex")]))));'
```

The exact comparison command after the second build was:

```sh
node --input-type=module -e 'import assert from "node:assert/strict";import {readFileSync} from "node:fs";import {createHash} from "node:crypto";const expected=JSON.parse(readFileSync("/private/tmp/darktrace-final-build-hashes.json","utf8"));for(const [file,hash] of Object.entries(expected))assert.equal(createHash("sha256").update(readFileSync(file)).digest("hex"),hash,file);console.log("Rebuild hashes identical: catalogue, source coverage, compiled coverage");console.log(JSON.stringify(expected));'
```

`cp /private/tmp/darktrace-final-ctx_7dbe939b22a1/src/coverage/report.generated.json src/coverage/report.generated.json` then persisted the verified generated source report in the workspace (exit 0).

Final digests:

```text
src/api/catalogue.generated.json
592f9bc1863b23042b1a7c00bb61e113dd019f8d5e73746c6a728e7be87a0f6e
src/coverage/report.generated.json and dist/src/coverage/report.generated.json
025982296b06d8213d2e68c063f22214831bbd383594854e655c4bd8de53f71f
```

Dedicated oracles cover exact newline byte boundaries, split chunks, multiple frames, complete/partial overflow with zero `JSON.parse` entries and zero forwarded frames, UTF-8 bytes, lowered depth/elements, direct-call limits, audit record completeness and correlation, awaited sink failures, EOF/signals/errors/explicit shutdown, active calls during shutdown, cleanup exceptions, real CLI sanitized overflow, and real SIGINT/SIGTERM after initialization (exit code 0, no terminating signal). Coverage tests verify all operation/parameter/body rows, near-epoch millisecond boundaries, defaults, invalid calendar dates, unknown-unit rejection and representative effective bounds.

The first integrated suite exposed two outdated test fixtures. The existing stdio overflow test now captures expected `EPIPE` without accepting another error code; the policy range test now supplies a window exceeding seven days in documented milliseconds (`1..604800002`). These changes preserve the intended rejection oracles. The final successful commands above include both corrections.

## Remaining evidence boundaries

No live Darktrace/lab request, real appliance credential, commit, publication or deployment was performed. Offline fixture/loopback connector tests and local child-process checks do not establish appliance 7.1 behavior, token ACLs, host/model-provider eligibility, action approval, packed artifact integrity, Docker behavior or security-test-plan completion. Node 22 was not exercised here. Coverage describes effective local rejection/validation and identified blocked forms; it is not an exhaustive proof that every field's appliance semantics are correct. An operator can still enable medium/high execution before procedural release evidence is collected; runtime does not inspect that evidence.
