# Restored access and final-source native lab checkpoint

Coordinator execution, 2026-10-05. This is a partial acceptance record, not stable release approval.

After the user changed this session to full access, the Docker daemon API and lab DNS succeeded. The exact previously registered ephemeral volume returned `no such volume`; an independent Docker volume inventory confirmed its absence. The stale external marker was removed. This establishes present absence, not when or by whom that volume was deleted.

The coordinator created `/private/tmp/darktrace-final-lab-78oqea4d` from the reviewed current checkout, installed locked dependencies with `npm ci --ignore-scripts --offline` and the reviewed cache, and built successfully. The documented schema-2 source/runtime/full SDK dependency manifest was then generated outside the checkout with protected permissions. Its SHA-256 is `963cbf0c36456f89d368e62c52a74262448f14873fa1165649c32789c5b97db0`. The source remains the reviewed consultation candidate; no write profile was enabled.

Every result below came through an initialized production stdio MCP client using the protected operator configuration, verified TLS, sequential bounded GET requests and the reviewed campaign recipes. Status was first in every separately selected batch. A blocker stopped that batch immediately. Credentials, remote telemetry, resource handles and raw errors were neither printed nor persisted.

## Successful selectors

Minimal profile: `get_status`, `get_devices`, `get_subnets`, `get_aianalyst_stats`, `get_intelfeed`, `get_modelbreaches`, `get_devicesearch`, `get_similardevices`, `get_aianalyst_groups`, `get_aianalyst_incidentevents`, `get_aianalyst_investigations`, `get_mbcomments`, `get_details`, `get_tags_entities`, `get_tags_tid`, `get_tags_tid_entities`.

Inventory profile: `get_endpointdetails`, using only the IP discovered in an explicitly selected earlier device search. Status and device search also passed in that profile. Status exposed only the numeric model-engine version `7.1.0`.

Each successful selector had the expected projected data type and envelope, no truncation, no safe projection fallback and `compatibilityShapeValidated:true`. This does not establish resource coverage for empty collections, full upstream schema compatibility or other request variants.

## Blockers actually observed

| Selector | Outcome | Limit of conclusion |
|---|---|---|
| `get_deviceinfo` | `OUTPUT_SHAPE_MISMATCH`, safe projection fallback | Observed in minimal and separately selected reviewed inventory profiles; requires response-contract investigation. |
| `get_summarystatistics` | `TOOL_ERROR`, safe code `bad_request` | Reviewed inventory `loginput`, one hour recipe refused; no alternate guessed query attempted. |
| `get_antigena` | `OUTPUT_SHAPE_MISMATCH`, safe projection fallback | Listing only; no autonomous-response action executed. |
| `get_cves` | `TOOL_ERROR`, safe code `server` | Appliance-side error class, not proof of a client defect or successful compatibility. |
| `get_metrics` | `TOOL_ERROR`, safe code `too_large` | Fixed 1 MiB inventory upstream ceiling correctly refused; dependent metric requests were not made. |
| `get_modelbreaches_pbid` | `BLOCKED_MISSING_IDENTIFIER` | No suitable handle obtained in the reviewed five-minute discovery window; no dependent request made. |

The later selectors in these failed batches were not called. No request limit, output guard, signing mode, TLS verification or resource-selection rule was weakened to force acceptance. Further compatibility work, final Docker validation, full security receipts, package audit, final revision CI and publication remain pending.

## Docker campaign and package preflight addendum

On the current-source image `sha256:dc9b8f14c2c5f5b1041d0c47dbb9fc113c797a10731788f254878530e7dd3e3c`, the same reviewed harness verified the runtime inventory before mounting credentials. A newly provisioned local named volume held exactly the protected Docker config and two token files, each 0600 and owned by UID 1000. The actual initialized stdio MCP campaign passed `get_status`, `get_devices` and `get_subnets`, with verified TLS, the reviewed hardened flags, no fallback and no truncation. Harness exit was 0, including exact-name container cleanup. Root then removed only its registered campaign volume, received exit 0 and independently confirmed absence from the Docker inventory before removing the marker. No temporary host token copies were created.

This functional Docker success does **not** close image security acceptance: the bundled OpenSSL issue identified in the fresh Docker review remains a publication blocker.

The accepted `release:prepare` helper also passed on a fresh external snapshot, still versioned `0.1.0-alpha.0`, in `/private/tmp/darktrace-restored-release-review-20261005`. Functional tests passed 118/118. Its complete security receipt has runner exit 0: 325 cases, 322 PASS, no failures and three platform special-bit SKIP. Receipt SHA-256: `58b451d929b77b5885a1085ca3538aa67268dbf36157f59238eca2a61336bed0`. Two isolated builds produced the identical archive SHA-256 `31c0512dcd89f735720b0ac0c92710c28fd74d958374ad3c2054dbbda8d2734a`. All artifact allowlist, README.es byte binding, locked dependency/SRI, installation, CLI and write-profile refusal checks passed. This was a preparation check, not a replacement alpha release or stable publication; final version and changed inputs require fresh evidence.

## Bounded structure-only diagnostic

An independent worker reviewed the external diagnostic helper and its coordinator wiring: wiring SHA-256 `337eaba8b3de1432c4b6d490226345ece1b69061f30c5de901c28634c3259049`, structure-only helper `6f44729adbb99b338cf6587d8379a7464fc1b0fe3ab195a5eed6fdbb0c84cb3a`. The coordinator rehashed the complete frozen source/runtime inventories and all fourteen SDK package trees and confirmed equality with the previously approved schema-2 manifest before one execution.

The production HTTP client and `callTool` path completed status and device discovery, but `deviceinfo` then produced the fixed `BOUNDED_REQUEST_REFUSED` sentinel. The diagnostic stopped immediately with process exit 1. No structure findings, telemetry, handles, raw errors or credentials were emitted, and no subsequent Antigena/summary diagnostic requests were made. This diagnostic was not an initialized-MCP compatibility test and establishes neither a new response shape nor the cause of refusal. It does not justify the proposed deviceinfo literal override or guessed summary parameters.

The subsequent assigned R1/R2 projection corrections change the source from this frozen `d4d3f78c` checkpoint. All receipts in this document remain bound to that checkpoint and do not validate those newer bytes.
