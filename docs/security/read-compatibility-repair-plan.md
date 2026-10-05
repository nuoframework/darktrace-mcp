# Read compatibility repair plan: deviceinfo, antigena and summarystatistics

**Status:** offline investigation and proposal only. Nothing here is a fix, a live result or a release approval.

- **Date:** 2026-10-05
- **Author:** dispatched worker, task `task_61bd7af218f6`, dispatch `ctx_55f0d40b930d`
- **What I did not do:** I made no production, schema, fixture or harness changes, no commits, no lab or API calls, and read no credentials or telemetry. I created only this file plus an **external** proposal directory, `/private/tmp/darktrace-structure-diagnostic-proposal/`.
- **Inputs:**
  - [restored-access lab checkpoint](restored-access-lab-checkpoint.md)
  - [final stable gate review](final-stable-gate-review.md) §6
  - local OpenAPI 6.1 (`openapi/darktrace-threat-visualizer.yaml`)
  - `src/api/response-view.ts`, `src/api/response-views.generated.json`, `src/api/response-fields.json`, `src/api/validation.ts`
  - `scripts/lab-read-smoke.mjs` (`shape` and `viewShape`)
- **Guardrails:** this plan does not raise caps, allow unknown keys, follow redirects, count fallback as compatibility, or try guessed parameter combinations.

## 1. Mechanism: why a fallback fails the gate

`projectResponse` replaces a node with the fixed `{summary:"Response received; fields omitted…"}` object in five cases:

- (a) the view node is `summary`, which is what any untyped schema such as `items: {}` compiles to;
- (b) the JSON type differs from the view, **including `null`**, because `typeof null` is `'object'` while the object branch rejects `null`;
- (c) an object contains only unmodelled keys;
- (d) an array view meets a non-array;
- (e) no union variant matches.

The harness (`lab-read-smoke.mjs` `shape`) then sets `safeProjectionFallback=true`. Its `viewShape` also fails, because the summary object carries a key the view does not know. The result is `OUTPUT_SHAPE_MISMATCH`.

Unknown keys **alone** never cause fallback: they are dropped, and `minimized` is set.

## 2. Root-cause candidates, from schema evidence and offline reproduction

I ran `reproduce-fallback.mjs`: synthetic data through the **current** `src/api/response-view.ts` projector and the current generated views.

| Case (synthetic) | Fallback |
|---|---|
| `get_antigena_summary`, `activeActionDevices:[5]` | **true** |
| `get_antigena_summary`, both arrays empty | false |
| `get_antigena`, automatic action with `triggerer:null` | **true** |
| `get_antigena`, manual action with `triggerer:{username}` | false |
| `get_deviceinfo`, `devicesAndPorts[].deviceAndPort:"others"` | **true** |
| `get_deviceinfo`, documented object shape | false |

### RC-1 `get_antigena_summary`: untyped `did` arrays (high confidence, deterministic)

- **Schema:** `AntigenaSummary.pendingActionDevices` and `activeActionDevices` are `type: array` with `items: {}`. They compile to `{kind:'array', items:{kind:'summary'}}`.
- **Effect:** **any non-empty** array falls back. The local OpenAPI text is authoritative about the item type: "An array of did values - unique device identifiers".
- **Fit with observations:** this explains the earlier reported "PASS with `safeProjectionFallback=true`". The windowed recipe always has empty `pending`; `active` is non-empty whenever an action exists.

### RC-2 `get_antigena`: documented `null` triggerer (high confidence)

- **Schema:** `AntigenaFulldevicedetailsFalse.triggerer` has `properties` but no `type`. It compiles to an object view.
- **Documented null:** the same schema says "If triggered by Darktrace automatically, 'null'". Every automatic action therefore falls back.
- **Secondary possibilities**, to be confirmed by the diagnostic and not assumed: a `null` `ip` or `detail`, or an object top level. The release recipe uses `fulldevicedetails=false`; the documented object-with-`actions` form applies to `fulldevicedetails=true`.

### RC-3 `get_deviceinfo`: undocumented "others" grouping (candidate; needs diagnostic)

- **Documented behaviour:** the official note in the local OpenAPI says "Only the top results … will be returned - results below a certain threshold will be grouped into an 'others' category".
- **Gap:** `DeviceinfoFulldevicedetailsFalse` models only numeric `did`, `port` and `device` and an object `deviceAndPort`. It has **no** representation of the "others" entry.
- **Fit with observations:** a busy device returns this grouping regardless of profile, which matches the identical failure in both the minimal and inventory profiles. The exact form, such as a string `deviceAndPort` or a string `port`/`did`, is **not** in the local schema, so no source change should be made until the diagnostic identifies the exact paths.
- **Alternative candidates:** `null` values, or numbers sent as strings. The same diagnostic distinguishes them.

### RC-4 `get_summarystatistics` `loginput`: HTTP 400 (unresolved; contract gap)

- **Recipe:** `eventtype=loginput&hours=1&endtime=<run anchor ms>`.
- **What the 6.1 description says:** it documents `hours` and `endtime`/`to` with `eventtype`. For `eventtype` values it refers to "the four categories of events and/or three types (see above)", but that list is **not** in the local spec.
- **Weak evidence:** `loginput` appears only as a response-schema title (`SummarystatisticsEventtypeLoginput`).
- **Candidates:**
  - (i) `loginput` is not an accepted `eventtype` on this 7.1 lab;
  - (ii) the standalone `endtime` + `hours` anchor form is unsupported or requires alignment;
  - (iii) other 7.x parameter semantics.
- **Rule:** none of these may be tested by trying alternatives.

## 3. Minimal safe diagnostic recipe, for root execution only

The proposal files are external and not part of the repository:

| File | SHA-256 |
|---|---|
| `structure-diagnostic.mjs` | `6f44729adbb99b338cf6587d8379a7464fc1b0fe3ab195a5eed6fdbb0c84cb3a` |
| `structure-diagnostic.test.mjs` | `38a9eca5ca3b6e6cf2a00294577439769bfcbfba5d8d637d412a7a438d23af7f` (8/8 pass offline on Node v24.14.1 with `VIEWS=<checkout>/src/api/response-views.generated.json`) |
| `reproduce-fallback.mjs` | Offline reproduction behind the §2 table (`SRC=<checkout>`) |

**`structureDiff(view, value)`** walks the code-owned view against the in-memory upstream JSON. It emits only:

- view-owned path names, with arrays shown as `[]` and no indices;
- expected kind and observed JSON type (`null`, `number`, `string`, `array`, `object`, `nonfinite`), plus a fixed `string:others-literal` class for exactly `"others"` where a non-string is expected;
- counts;
- the count of unmodelled keys, **without their names**;
- an `overflow` flag, with node, depth and finding caps.

Tests assert that values, unknown key names, IDs, IPs and hostnames never appear in the output.

**`errorShape(body)`**, used for the 400 only, emits:

- the body type and whether an `error` field is present;
- `response` as either `INPUT ERROR` (the documented value) or `other`/`absent`;
- which of the fixed names `eventtype`, `endtime`, `hours`, `to`, `loginput` occur in the text;
- the key count.

It never emits text.

**Procedure:**
1. Root reviews and hashes the helper.
2. In the reviewed production HTTP client path, root re-issues **exactly the same reviewed recipes** that already failed (`get_antigena` window, `get_antigena_summary` window, `get_deviceinfo` minimal with the discovered `did`, and the `summarystatistics` `loginput` recipe), each once. These are not new parameter combinations.
3. Root parses each response under the existing 32 KiB / 1 MiB caps, passes the parsed value in memory to `structureDiff`, or `errorShape` for the 400, prints only the JSON result, and discards the body.
4. If a response exceeds the cap, root reports `too_large` and runs no diagnostic.

Root's own diagnostic wiring needs independent review before execution. My helper does not perform I/O.

## 4. Recommended implementation, to be assigned separately

1. **New view kinds** in `ResponseView`:
   - `{kind:'null'}`;
   - `{kind:'literal', value:string}`, which matches exact equality only.

   These are usable only inside unions. Update in parity:
   - `projectResponse` union selection: `null` ↔ `input===null`, literal ↔ `input===value`;
   - harness `viewShape`;
   - `structureDiff`.

   `compileResponseView` does not emit these kinds automatically.
2. **Code-owned override table**, `RESPONSE_VIEW_OVERRIDES`, applied by `scripts/generate-catalogue.ts` after compile, before `response-views.generated.json` is written. Each entry has `{operationId, path, replacement, evidence:{schema, quote}}`. The generator **fails** if the path does not exist in the compiled view, or if the quote is not present verbatim in that schema's parsed (whitespace-folded) YAML description. Entries:
   - **R1** (from RC-1): set `get_antigena_summary` `pendingActionDevices.items` and `activeActionDevices.items` to `{kind:'number'}`. Evidence: `AntigenaSummary`, "An array of did values".
   - **R2** (from RC-2): set `get_antigena` `[].triggerer` to `union[{object username,reason}, {kind:'null'}]`. Evidence: `AntigenaFulldevicedetailsFalse`, "If triggered by Darktrace automatically, \"null\"".
   - **R3** (from RC-3): only for paths the diagnostic reports as `string:others-literal`, set each to `union[<original>, {kind:'literal', value:'others'}]`. Evidence: the `/deviceinfo` note "grouped into an 'others' category" plus the root diagnostic receipt. If the diagnostic shows `null`, plain `string` or other undocumented types, **do not** override. Treat `get_deviceinfo` as a first-stable narrowing candidate under gate-review §6 path (b).
   - **R4** (from RC-4): no view change. If `errorShape` names `eventtype` or `loginput`, the vocabulary is unsupported. If it names `endtime` or `hours`, the anchor contract is unsupported. In either case, make `validateOperation` reject the summary `eventtype` mode for first stable with a fixed sanitized error and a test, and keep the selector blocked. This changes accepted inputs and **may change the tool `inputSchema` and description**, so it needs a new contract candidate and independent review. If `errorShape` is inconclusive, apply the same narrowing; no retry with other values.
3. **Unchanged:** caps, unknown-key dropping, the redirect refusal, the treatment of `compatibilityShapeValidated`, and the recipes.
4. **Contract impact:**
   - Tools declare no `outputSchema` (`grep` finds none in `src`), so R1–R3 do **not** change contract `ea31d70a…`.
   - R1–R3 do change the production source hash, so a rebuild, a new manifest, the full functional and security suites, the package preflight and the image rebuild must be rerun (gate review B1/B2/B5).

## 5. Tests to add with the implementation

- **Projection tests** (`test/contract/response-view-overrides.test.ts`):
  - `null` `triggerer` projects to `null` with no fallback and no `unmodeled`;
  - a string or number `triggerer` still falls back;
  - `did` arrays of numbers pass;
  - a string, object or `null` element in a `did` array falls back;
  - a literal `"others"` passes only at override paths;
  - `"Others"`, `"other"` or `"others "` fall back;
  - unknown keys are still dropped with `minimized`;
  - truncation and caps are unchanged.
- **Generator tests:**
  - an override whose path is missing fails the build;
  - an evidence quote that is mutated or absent fails the build;
  - the regenerated views differ from the current ones only at override paths.
- **Harness parity:** `viewShape` gives the same verdict as `projectResponse` for every case above, and `safeProjectionFallback` stays false only for conforming data.
- **Security regression:** the `policy-sinks` and MCP-defense suites pass unchanged, the tool-contract hash is unchanged for R1–R3, and the source-bound security receipt is fresh.
- **Live acceptance, by root:** after rebuild and a new manifest, run the **same** recipes. PASS requires `compatibilityShapeValidated:true`, `safeProjectionFallback:false` and `notTruncated`. Anything else stays a blocker.

## 6. Summary for assignment

| Item | Confidence | Next action | Owner |
|---|---|---|---|
| RC-1 antigena_summary | High (schema text plus offline repro) | Implement R1 | Implementation worker |
| RC-2 antigena | High for `triggerer`; other nulls unknown | Implement R2, and run the diagnostic to confirm nothing else | Implementation worker / root |
| RC-3 deviceinfo | Candidate | Run the diagnostic first; then R3 or narrow | Root, then implementation |
| RC-4 summarystatistics | Unresolved contract gap | One `errorShape` on the existing recipe, then narrow (R4) | Root, then implementation, with contract review |

## 7. Addendum 2026-10-05: R1 and R2 implemented (task `task_2e77bff8ea52`)

**Scope:** R1 and R2 only. R3 (deviceinfo), R4 (summarystatistics) and any literal view kind are **not** implemented; they wait for the root's structure diagnostics.
**Constraints kept:** no credentials, API, Git, publication, version change or contract fixture edit.

### What changed

**`src/api/response-view.ts`:**
- Adds `'null'` to the `ResponseView` kinds.
- Adds a frozen `RESPONSE_VIEW_OVERRIDES` table with three entries.
- Adds `applyResponseViewOverrides(views, schemas)`, which **throws** in two cases:
  - **evidence changed:** the schema, the property or the verbatim parsed-YAML quote is missing;
  - **path missing:** the operation or path is absent, or the compiled node kind is not the expected pre-correction kind. That covers `summary` for R1 items, `object` for R2, an upstream schema that is already corrected, and a double application.
- The projector gains a `null` match in union selection, and a standalone `null` node that accepts only `null`, otherwise falling back to the fixed summary.
- Unchanged: unknown-key dropping, other type checks, the 1000-item and 16 KiB caps, and the fallback text.

**Override entries:**

| Entry | Path | Correction | Evidence |
|---|---|---|---|
| R1 | `get_antigena_summary` `pendingActionDevices[]` and `activeActionDevices[]` | `summary` → `number` | `AntigenaSummary`: "An array of did values" |
| R2 | `get_antigena` `[].triggerer` | `union[<compiled object username/reason>, null]` | `AntigenaFulldevicedetailsFalse`: `If triggered by Darktrace automatically, "null".` |

**`scripts/generate-catalogue.ts`:** applies the overrides once, after all views are compiled.

**`scripts/lab-read-smoke.mjs`:** `viewShape` gains `if(view.kind==='null')return data===null;`, which gives parity with the projector.

### Exact generated delta, verified programmatically

- **`src/api/response-views.generated.json`:** all 79 operations are present and the top-level keys are identical. **Only** `get_antigena` and `get_antigena_summary` differ, exactly at the paths above. Hash before `0b8870f9…`, after `d554398d4cbe299121acb9c858941c8074097896f0457c8a53572aff96cdd4c1`.
- **`src/coverage/report.generated.json`:** after `d5a71444de62b08ed5b6248f7773dc0600d4c1f70484abc4f79f24447eae785e`. Reverting only those two rows' `outputView.fields` reproduces the pre-build hash `0759f30f…` exactly, so it has no other delta.
- **`src/api/catalogue.generated.json`:** unchanged, `592f9bc1…`.

### Tests: `test/contract/response-view-overrides.test.ts` (6 tests)

1. Regenerated views equal compile plus overrides, and differ from the plain compile only in the two operations.
2. Fail-closed generator: 9 mutated cases plus double application. The mutations cover:
   - a changed or missing quote;
   - a missing schema or property;
   - a missing operation or field;
   - an already-typed array or items;
   - a `summary` triggerer.
3. Happy cases: `did` numbers, including `-6`; automatic `null` triggerer; manual object triggerer. No omitted, unmodelled or truncated flags, and the harness `viewShape` is true.
4. Unknown keys stay dropped with no leak, and the 1000-item array cap is unchanged.
5. Wrong types (string, numeric string, `null`, boolean, object, array, NaN, Infinity in `did` arrays; non-null scalars, arrays, `"null"` and unknown-only objects as `triggerer`) still fall back without echoing canaries. Nullability is **not** granted to any other antigena or summary field. A standalone `null` node rejects non-null input.
6. A seeded 2000-iteration fuzz: projection and the harness `viewShape` (extracted verbatim from the script via `vm`) agree with a reference oracle, and unknown key names and string `did` values never survive.

### Results (local, Node v24.14.1 macOS arm64)

- `npm run build`: exit 0.
- `npm run typecheck`: exit 0.
- Targeted contract files (overrides, response-view, union, summary compatibility, coverage-final, catalogue, read-only-release): **34/34**.
- Full functional `node --test dist/test/**/*.test.js`: **124/124**, 0 fail, 0 skip.
- `node --check` and `--help` of the harness: exit 0.
- **Tool contract unchanged:** `captureReviewedContracts` on this checkout, using the production child `tools/list` plus startup refusals, gives `ea31d70a484c0d0353cb8651edc4b6a4ab13798c096056e8cdcf68e78324707f`, read27 `6ce22e56…` and sensitive28 `def9a8db…`. The first-stable write ceiling is untouched.
- **Not run by me:** the security runner, the package pipeline, Docker and the lab.

### Hashes after the change

| File | SHA-256 |
|---|---|
| `src/api/response-view.ts` | `f3c92e69d0e159a4f5e1fdd214a999f4745c7e5a181e8640d01db500af593747` |
| `scripts/generate-catalogue.ts` | `2a4a27cac649d67baf4998ba611f27d5b9dfa26a1ea24ac677a6889486368185` |
| `scripts/lab-read-smoke.mjs` | `789c0a114260606d3f26499e78ebb8d8fed5d32b05476dd10b9e969134a182f8` |
| `test/contract/response-view-overrides.test.ts` | `b82b71f5defc622fe24720dc584ad6f218a0350b499ec7e8cefb2884db1bea4f` |
| `src/` production tree (prepare-release algorithm) | `aa08c260847c0fc206253f2de3cb1a872f89d2f9d85f5618b88ffd0f5c681e8e` |

### What this means for the gates

The source hash changed and the harness changed, so every earlier receipt is **historical** for this source. That includes the security receipt `58b451d9…`, the package artifact `31c0512d…`, image `dc9b8f14`, manifest `963cbf0c` and the earlier live results.

The root's next steps:
1. Independent review.
2. Full functional and security suites.
3. Package preflight.
4. Image rebuild and scan.
5. A new protected manifest.
6. A live retest of the **same** `get_antigena` and `get_antigena_summary` recipes. PASS requires `compatibilityShapeValidated:true` and `safeProjectionFallback:false`.

Other `null` or variant fields in live antigena data would still fail closed, and need the §3 diagnostic rather than widening.
