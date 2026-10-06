# Lab gap campaign — evidence for 1.1.1 (2026-10-06)

Live checks against the owner-authorised Darktrace 7.1.0 lab (`7.1.0 (4ff13d8c)`), run on
2026-10-06 between 17:07 and 17:23 UTC to close the "partial" and "not lab-validated" entries of the
[tool reference](../tools.md). The owner authorised reversible writes and critical actions with an
immediate revert on lab devices.

**Method.** Every call went through the built server (`dist/src/index.js`) over MCP stdio, as a client
would, using [`scripts/lab-gap-campaign.mjs`](../../scripts/lab-gap-campaign.mjs): profile `all`,
`DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE=true`, date format `compact` (`darktrace-mcp test` passed with
it and reported no fallback), default write approval (`host`) and default critical approval
(`dryRun:true` preview, then `confirm:true` with its `previewId`, then the server confirmation dialog
answered `approved:true`). Each critical action ran in its own server process because of the
one-dialog-per-session limit. HTTP status codes were recorded with the lab-only preload
[`scripts/lab-status-tap.mjs`](../../scripts/lab-status-tap.mjs) (method, route prefix and status only).
Tokens were read by the server from `0600` files; no token value, appliance hostname or response
content beyond shape is recorded here. Test objects carry the `[mcp-gap]` / `mcp-gap-` prefix.

## Results

| # | Operation | Arguments (shape) | HTTP / tool outcome | Verification read | Revert | Result |
|---|---|---|---|---|---|---|
| 1 | `post_devices` | `{did, label}` on a client device (did 77) | 200, `SUCCESS` | `get_devices did=77` and `get_devicesearch` show the test label | label set back to the exact prior value; read-back matches | PASS |
| 2 | `post_aianalyst_investigations` | `{did, investigateTime}` (epoch seconds, 30 min earlier) on did 442 | 200, `investigationId` returned | `get_aianalyst_investigations` lists it (`status: processing`, same `did` and time) | none: the catalogue has no delete for investigations | PASS |
| 3a | `post_tags` | `{name: "mcp-gap-<ts>", data:{description, color, visibility}}` | 200, `tid` 289 | `get_tags tag=<name>` | tag deleted in 3e | PASS (already validated) |
| 3b | `post_tags_entities` | `{did: 442, tag}` (form), three times | 200 each | `get_tags_tid_entities` shows one assignment each time | removed in 3c / 3d | PASS (already validated) |
| 3c | `delete_tags_tid_entities_teid` | `path {tid, teid}`, twice | **502**, `write_outcome_unknown` | `get_tags_tid_entities` empty; `get_tags_entities did=442` no longer lists the tag | — | PARTIAL: applied, appliance answers 502 |
| 3d | `delete_tags_entities` | `query {did, tag}` after re-assigning | **502**, `write_outcome_unknown` | `get_tags_tid_entities` empty | — | PARTIAL: applied, appliance answers 502 |
| 3e | `delete_tags_tid` (critical) | `path {tid}`; preview, confirm, dialog accepted | **502**, `write_outcome_unknown` | `get_tags_tid` and `get_tags tag=<name>` answer 404 | — | PARTIAL: applied, appliance answers 502 |
| 4a | `post_pcaps` | `{ip1, ip2, start, end}`, 10-second window 10 minutes earlier | 200, `state: pending`, tmqid 8 | `get_pcaps` polled every 10 s: `processing` → `finished` after about 20 s | none: there is no PCAP delete API | PASS |
| 4b | `get_pcaps_filename` (small) | the new 24-byte capture | 200; whole file as Base64 with `byteLength` | — | — | PASS (whole-file branch) |
| 4c | `get_pcaps_filename` (large) | an existing 222,529-byte capture | 200 upstream; tool refuses with `output_limit_exceeded`, `sizeBytes` and `sha256` | — | — | PASS (refusal branch) |
| 5 | `get_advancedsearch_api_search_query`, `..._analyze_field_analysis_query` (`terms` on a port field), `..._graph_graphmode_interval_query` (`count`, 60 000 ms) | standard Base64 of a 1-hour JSON query document whose encoding contains `+`, `/` and `=` | 200 each, hits / aggregation buckets returned | — | — | PASS (current CR-02 encoding) |
| 6a | `post_antigena` `activate` | `{codeid, activate:true, duration:60, reason}` on a pending model action of the sacrificial client (did 79) | 200 | `get_antigena`: `active:true`, expiry about 60 s ahead | cleared in 6c | PASS |
| 6b | `post_antigena` extend | `{codeid, duration:120, reason}` | 200 | expiry moved later (about +70 s) | cleared in 6c | PASS |
| 6c | `post_antigena` `clear` | `{codeid, clear:true, reason}` | 200 | `active:false, cleared:true` | — | PASS |
| 6d | `post_antigena` reactivate | `{codeid, activate:true, duration:60, reason}` on the cleared action, then `clear` again | 200, 200 | `active:true, cleared:false`, then `active:false, cleared:true` | cleared | PASS |
| 6e | `post_antigena_manual` `connection` | `{did:79, action:"connection", duration:60, reason, connections:[{src, dst: 203.0.113.250 (TEST-NET-3), port: 9}]}` | 200; new manual action | `get_antigena`: `manual:true, active:true`, 60 s expiry | `post_antigena clear` → `active:false, cleared:true` | PASS |
| 6f | `post_antigena_manual` `pol`, `gpol`, `quarantineOutgoing` | `{did:79, action, duration:60, reason}` | **400** each, `upstream_error` (`outcome: failed`, nothing created) | `get_antigena` shows no new action | — | FAIL on this device (client sensor); `quarantine` and `quarantineIncoming` not run |
| 7 | `post_subnets` (critical) | `{sid: 12, uniqueHostnames: true}`, then `false` | 200, 200 | `get_subnets sid=12`: `true`, then `false` | restored to the exact prior value | PASS for this field |
| 8a | `post_intelfeed` `addlist` (critical) | `{addlist: two test domains, source: "mcp-gap-<ts>", description}` | 200, `SUCCESS` | `get_intelfeed source=<source>` lists both | removed in 8d | PASS |
| 8b | `post_intelfeed` `expiry` | `{addentry, expiry: ISO time 3 min ahead (UTC), source, description}` | 200, `SUCCESS` | listed; after the expiry time it is gone without a remove call | expired by itself | PASS |
| 8c | `post_intelfeed` `hostname` | `{addentry, hostname:true, source, description}` | 200, `SUCCESS` | listed by name; the hostname flag itself is not readable (the `fulldetails` rows have no reviewed output view) | removed in 8d | PARTIAL: accepted, flag not read back |
| 8d | `post_intelfeed` `removeentry` ×3 | `{removeentry, source}` | 200 each | list shrinks to empty | — | PASS |
| 8e | `get_models`, `get_components`, `get_enums` with `responsedata` | `name`, `cid`, `country` / `protocol` | 200, filtered data | — | — | PASS |
| 8f | same without `responsedata` | — | tool refuses with `response_limit_exceeded` | — | — | Re-confirms the documented partial behaviour |

### Not possible on this lab

| Operation | Result |
|---|---|
| Darktrace/Email reads | 403: the lab token has no Email module (unchanged). |
| `get_cves` | 500 again (Darktrace/OT only). |
| `get_filtertypes` | 302 again; redirects are never followed. |

## Observations

- **DELETE and the breaker.** All three DELETE routes still get HTTP 502 from the lab gateway after
  the change is applied. The server correctly reports `write_outcome_unknown` and never retries a
  write; reads confirmed the effect each time. Three such outcomes in a row in one process would open
  the write breaker, so the campaign kept at most two per process.
- **Unreviewed write responses.** `post_devices`, `post_tags_entities`, `post_antigena`,
  `post_antigena_manual` and `post_subnets` responses carry no reviewed output view; the tool returns
  only "Response received; fields omitted". The effect is visible only through the verification read.
- **`get_intelfeed fulldetails=true`.** Rows are returned without a reviewed output view, so expiry,
  hostname and description attributes cannot be read back through the tool.
- **Size refusals.** Full model, component and enum lists now surface as `response_limit_exceeded`
  (the earlier notes said `too_large`, the internal error kind behind the same code).

## Evidence changes

- `scripts/generate-catalogue.ts`: `post_devices`, `post_aianalyst_investigations` and `post_pcaps`
  added to the 7.1 lab set (clean 2xx with a verified effect). 59 operations now carry
  `validatedOn: ["7.1"]` (was 56).
- `scripts/generate-tools-doc.mjs`: partial notes removed for `post_antigena`, `get_pcaps_filename`
  and the three GET Advanced Search forms; narrowed for `post_antigena_manual`, `post_subnets`,
  `post_intelfeed`; size code corrected for models, components and enums. The three tag DELETE
  operations stay *not lab-validated* (no clean 2xx), now with the note "applied live, lab gateway
  answers HTTP 502"; `get_cves` and `get_filtertypes` carry their lab error.

Because three tool descriptions lost their "Not lab-validated." sentence, the reviewed full-API
tool-contract fixture was re-captured (`node test/security/mcp-contracts.mjs --capture`); the only
change is that sentence. Offline gates after the change, on macOS arm64 with Node 24.14.1: `npm run lint`,
`npm run typecheck`, `npm test` (230/230) and `npm run test:security` (1,150 subcases, 1,147 pass,
3 platform skips), source tree `74323991…d348`.

## Residue on the lab appliance

| Object | State |
|---|---|
| PCAP tmqid 8, `DCIP_20261006170035_20261006170045_192_168_1_5_192_168_1_2_uuLkTl_m.pcap` | finished, 24 bytes; no delete API |
| AI Analyst investigation `38bbd062-…` on did 442 (and its system "AI Analyst Investigation" model alert) | no delete operation in the catalogue |
| Intel feed source `mcp-gap-1791306937` | all entries removed or expired; the empty source name is still listed by `get_intelfeed sources=true` |
| Antigena action codeid 18 (model action, did 79) | was pending; now `cleared` after the activate/extend/reactivate tests |
| Antigena manual action codeid 37 (did 79) | `cleared` |
| Device label (did 77), subnet 12 `uniqueHostnames` | restored to prior values |
| Tag `mcp-gap-1791306519` (tid 289) and its assignments | deleted |

Nothing created by this campaign is active at the end (`get_antigena includecleared=true`).
