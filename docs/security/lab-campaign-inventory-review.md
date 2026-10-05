# Inventory validation campaign contract review — 2026-10-05

**Readiness only; independent review and root execution required.** This worker reviewed local API 6.1 OpenAPI/catalogue and compiled validation/projection, without lab calls or real configuration/token/screenshot access. Production source remains the accepted `eadfe11732bd6c9bfa89cbfbbb2dc530d86e6984ad285576aab49b4dfc01d917`. Historical harness `c9d2dbb6ed623ff4e1a5673ffedd93c389c74a658b650db05adc23a46bf0bb4b` / protected manifest `b9aabc2681019d1e64184fc077899a816e8529be94f451803a6962ca002a99fb` remain unchanged evidence for 11 root-reported native selectors; this new harness needs a new clean snapshot/manifest and independent acceptance.

## Fixed policy and scope

The CLI adds only `--validation-profile minimal|inventory`. Default minimal retains previous recipes and budgets; unknown values, duplicate flags and numeric-limit/identifier/query flags fail closed. Inventory is explicit, never chosen after an error. Its child caps apply **globally to the selected session**, not per operation:

| Fixed setting | minimal | inventory |
|---|---:|---:|
| Upstream response bytes | 32,768 | 1,048,576 |
| Tool output characters | 8,192 | 60,000 |
| Device/search discovery | count=1, recent=300 seconds | count=1, no recent/free-text filter |
| Parent shape parser depth | 12 | 12 |
| Parent shape parser elements / string bytes | 6,000 / 16,384 | 20,000 / 240,000 |

The upper inventory limits stay below/equal production defaults (`src/config/schema.ts:80`, `:84`: 2,097,152 / 60,000). Operator configuration may further lower effective limits. The policy is not the recommended per-operation table from [independent acceptance §4](mcp-corrections-acceptance.md#4-siguiente-gate-en-vivo-límites-del-harness-recomendación-no-implementado): one production child has global configuration, so this implementation does not pretend to enforce different caps on individual selected operations. Parent parsing remains fixed and bounded; its larger string allowance accommodates text plus structured MCP representations, not unbounded output.

Both profiles keep the exact previously reviewed 37 GET selectors, status first, at most eight unique selectors, one GET per selector, concurrency one, queue zero, rate eight/minute, timeout 30 seconds, one page, zero retries and five-minute event windows. No POST/DELETE, PCAP, AdvancedSearch, export/email, active scan, mutable state, arbitrary argument or hidden discovery was added. TLS/DNS pinning, HMAC, redirect refusal and production output projection are unchanged. Original model/tag collection smoke may explicitly use inventory; campaign models still require a discovered UUID and never fall back to full collection.

Schema-2 source/runtime and 14 complete host dependency trees are checked before SDK import. Native/Docker share the policy and the same guard; Docker preflight/immutable-image restrictions, init/PID/memory flags, protected mounts and exact-name cleanup remain intact. Selected-operation method/tier/sensitivity/local schema checks now occur before importing the MCP SDK or starting Docker preflight. Every outcome includes fixed profile name and policy SHA-256, never arguments or discovered values.

Policy digest: `d501a0591b1a78ea1dd5363118c233cd78c59aca2400ffd3eadfddc474c15212`, computed from UTF-8 `JSON.stringify(validationPolicy)` with its fixed profiles, 37 recipes, inventory metric override/name pattern, smoke definitions and common limits. It is reproducible code-owned policy metadata, not a signature/attestation.

## Discovery and semantic blockers

| Selector | Local contract and decision | Current state |
|---|---|---|
| get_devices / get_devicesearch | OpenAPI count supports one device; recent activity is optional. Inventory removes only seensince, preserves count=1 (search offset=0), no free text or hostname/IP/MAC query. Positive typed did is retained only in memory. | Implemented in inventory; missing IDs still block dependent calls. No live proof yet. |
| get_metricdata | OpenAPI `Metrics.name` is the metric's system-format name (`openapi/darktrace-threat-visualizer.yaml:11479`); /metricdata points to /metrics for metric names, paired times and interval in seconds (`:2973`, `:3039`). Interval grouping returns maxima. | Root explicitly approved and implemented **only inventory**. |
| get_endpointdetails | `/endpointdetails` (`:2550`) requires a meaningful IP/hostname endpoint identity; expansion flags additionalinfo/devices/score can be false. Existing handles are numeric IDs/UUID/event IDs, and the current get_details projection retains no endpoint IP/hostname. A device ID cannot be substituted for an endpoint identity. | Still `BLOCKED_ENDPOINT_IDENTITY`; no invented hostname/IP or extra discovery. |
| get_summarystatistics | `/summarystatistics` (`:4613`) documents one-hour eventtype aggregates and `hours`; `SummarystatisticsEventtypeLoginput` (`:19211`) explicitly identifies eventtype=loginput, returning `events:boolean` and numeric counts in `data[{timems,time,events}]`. | Still blocked: time exception requires explicit approval, and source validation/projection currently cannot support the proposed anchored variant. |
| get_filtertypes | Local `/filtertypes` (`:2676`) promises HTTP200 JSON filter metadata, with optional responsedata; it does not define a 302 alternate API/redirect destination. Root historically observed HTTP302. | Redirect stays refused. Compatibility gap needs contract/version/routing/ACL investigation without following or recording Location; no new worker request. |

### Approved metric recipe

Root's explicit Orca reply approved this concrete recipe. Required selections in one run: status, count-one device discovery, get_metrics and metricdata. The metric name is extracted only from a projected get_metrics array row's **name**, not label, UUID, free text or fixture default. It is preserved byte-for-byte and accepted only by `[A-Za-z][A-Za-z0-9_.-]{0,127}`. Minimal does not retain this additional name. The metric call requires positive safe-integer did plus that discovered name; missing/invalid handles block before requesting it.

Fixed query: that did and metric, millisecond start/end five minutes apart anchored once per run, interval=300 seconds, breachtimes=false, fulldevicedetails=false. No metricN, invented metric, hidden discovery, broadened timeframe or retry. Grouping maxima are aggregated statistics, not raw events; interval=300 does not guarantee exactly one returned bin across unknown appliance alignment. The unchanged byte/output caps bound results. Local input validation accepts the synthetic contract fixture and the current typed array view projects metric/data without fallback. Live compatibility and actual metric availability remain unproved.

### Summary proposal requiring a separate source decision

A possible explicit aggregate exception is eventtype=loginput, hours=1 and anchored endtime, with no csensor/mitreTactics switches. This is one hour of aggregated numeric event counts, **not five-minute event retrieval**. Root allowed proposing it, but did not approve implementing it. No default 28-day NOC response is silently used instead.

Two concrete source issues prevent closure:

1. `src/api/validation.ts:160` always pairs starttime/endtime. This endpoint exposes endtime but no starttime. The proposed eventtype/loginput + hours1 + endtime fixture fails `validateOperation` with the fixed pairing error. Supplying a nonexistent starttime is forbidden; omitting endtime would use current time and requires its own explicit reviewed decision.
2. `src/api/response-views.generated.json` currently models only the no-parameter NOC variant for this selector; it has no events/data fields. A synthetic documented loginput response projects to the safe fallback, with `unmodeled:true` and `compatibilityShapeValidated:false`. A schema-accepted query alone would not fix this. Supporting the variant needs a separately owned source/output-view change, reviewed fixtures/MR-04 contract effects where applicable and a new source/build/manifest; this worker did not modify source or widen its oracle.

Endpointdetails could only be proposed after root reviews an explicit, schema-supported endpoint identity discovery path and its typed output projection, with identity kept in-memory and no additional unselected request. Existing device IDs cannot close it. This task does not accept a new identity CLI or broaden output fields.

## Exact offline verification

Node v24.14.1, macOS arm64; no npm suite or appliance/real Docker operation was run in this task:

```sh
node --check scripts/lab-read-smoke.mjs
node scripts/lab-read-smoke.mjs --help
node /private/tmp/darktrace-lab-inventory-offline-check.mjs
```

All exited 0. The external fixture (separate from historical oracles) verifies:

- Default minimal: 37 allowlist entries, 34 schema-accepted synthetic recipes, three blockers, 16 existing missing-handle branches; exact recent=300 and unchanged non-discovery queries/budgets.
- Inventory: 35 schema-accepted synthetic recipes, two semantic blockers; count-one queries without recent/free text, five-minute millisecond windows, interval300 metric grouping and unchanged call/page/retry/rate/concurrency/queue caps. These are recipe counts, not returned data or live pass counts.
- Unknown/duplicate CLI/profile, arbitrary numeric limit, forbidden selectors, mutated POST/DELETE/tier/sensitivity/status/execution definitions rejected. Unknown prototype profile names are rejected.
- Ten missing/invalid metric handle/name cases: absent did/name, zero/negative/fractional did, digit-initial/space/non-ASCII/oversized/control-character name. Metric values/labels and existing ID handles never enter outcome JSON; default minimal retains no metric name.
- Metric typed projection succeeds on synthetic data; summary standalone endtime fails the actual validator and the documented hourly response produces fallback rather than compatibility. No source or output-view bypass is used.
- Complete schema-2 dependency/source/runtime binding, changed package bytes/manifests, missing/extra/prototype-named files and symlinks, directory/file/byte/deadline budgets, fixed Docker builder flags, image mismatch before mounts and exact-name stop/kill fallback continue to pass.
- Four actual CLI failure subprocesses with instrumentation recorded **SDK imports=0, child spawns=0, DNS=0, sockets=0, HMAC=0**. Unknown/duplicate profile and missing manifest fail sanitized, stderr empty. Instrumentation used synthetic external markers only, never real protected inputs or raw telemetry.

An initial summary probe stopped at the actual pairing rejection before projection; the fixture was split into independent validation/projection checks and both genuine blockers were retained. No failed result was reclassified as success and no oracle was weakened.

## Handoff and gates

Root alone prepares/reviews a new clean manifest, obtains Opus acceptance and chooses bounded native/Docker batches. Historical 11-selector native successes remain historical; root reports devicesummary blocked after recent discovery and cves uncalled. Inventory does not guarantee IDs, metric availability, resource-variant compatibility or closure of all 37 selectors. Known size/shape refusals and filtertypes redirect remain explicit.

Project source/security/artifact/CI/Docker/live-MCP advertised-scope gates remain distinct from each operator's host/provider processing, credentials and ACL prerequisites. No universal provider approval, stable version decision or publication occurs in this task. The final release pipeline waits for production/Docker/design/version inputs to freeze; release helpers, README, Docker files, historical audits/tests and package versions were not changed.

## Frozen handoff identifiers

- New harness SHA-256: `6b00b0ce2452e33f77a01652cd5ea20e5874d76500af2254878bb855e526cb50`.
- Lab guide SHA-256: `b64a1e4546c4f56ca25c2bf2b24191faf712109c13e17d734b7a21ff3b676613`.
- Production source digest recalculated locally: `eadfe11732bd6c9bfa89cbfbbb2dc530d86e6984ad285576aab49b4dfc01d917`, unchanged.
- Policy SHA-256: `d501a0591b1a78ea1dd5363118c233cd78c59aca2400ffd3eadfddc474c15212`.

The external fixture also asserts exact emitted policy/profile metadata on guarded failures, rejection of prototype-valued environment profiles, and continued missing-device/model blocking in inventory. Freeze applies to this handoff only; any source/harness change requires a new reviewed manifest. No new live manifest was generated or read by the worker.
