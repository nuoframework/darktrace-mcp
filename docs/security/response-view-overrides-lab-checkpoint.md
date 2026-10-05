# R1/R2 live consultation checkpoint

Coordinator execution, 2026-10-05. Functional evidence only; stable publication remains blocked.

The independently reviewed R1/R2 source tree is `aa08c260847c0fc206253f2de3cb1a872f89d2f9d85f5618b88ffd0f5c681e8e`. The full advertised tool contract remains `ea31d70a484c0d0353cb8651edc4b6a4ab13798c096056e8cdcf68e78324707f`. See [independent acceptance](response-view-overrides-independent-review.md) and [repair evidence](read-compatibility-repair-plan.md).

Root created `/private/tmp/darktrace-r1r2-lab-0n8g040t` from the reviewed checkout, installed the locked dependencies with `npm ci --ignore-scripts --offline` using the reviewed SRI cache, and built cleanly. Root independently hashed its production tree and confirmed equality with the reviewed `aa08c260` source. The documented protected schema-2 manifest binds its complete source/runtime inventories and all fourteen host SDK dependency package trees. Manifest SHA-256: `d3fc39dc17a0a84e63bcb06c3019ce0c4d040b714927fc5922e82316dd2f4d34`.

One initialized production stdio MCP session executed the same reviewed minimal recipes, sequentially, with status first, verified TLS, protected operator token files, 32 KiB upstream / 8,192 output-character limits, five-minute event windows and zero retries/pages. It passed:

| Operation | Result |
|---|---|
| `get_status` | Expected envelope/type, no fallback or truncation; numeric model-engine version `7.1.0` |
| `get_antigena` | `compatibilityShapeValidated:true`, `safeProjectionFallback:false`, `notTruncated:true` |
| `get_antigena_summary` | `compatibilityShapeValidated:true`, `safeProjectionFallback:false`, `notTruncated:true` |

Harness exit was 0, including client cleanup. These were only GET consultations of existing actions and aggregates; no Antigena action or write operation was executed. No remote telemetry, raw errors, IDs, URLs or token values were printed or persisted.

This closes the observed Antigena fallback defect for these particular recipes on this lab. It does not establish full resource coverage for empty responses, other query variants, deviceinfo or summary-event compatibility, latest-source full security/package/CI, image security acceptance or provider-processing approval. Earlier `d4d3f78c` successes remain evidence for that earlier checkpoint.
