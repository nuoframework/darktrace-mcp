Dated record of user experience, errors and server stability in lab testing.

[README](../../README.en.md) · [Tools](tools.md) · [Configuration](configuration.md) · [Security](security.md)

[Español](../ux-stability-report.md) · **English**

# UX and stability report: the MCP as seen by an LLM agent

> **Dated record.** This run predates the exclusion of the Darktrace/Email action and the final write controls. Its "51 tools and 78 operations" and the email-action preview describe that build. The 1.1.0 candidate exposes 50 tools and 77 executable operations; see the [tool reference](tools.md).

Lab: Darktrace 7.1.0 (lab A, hostname withheld), 2026-10-06. Server under test: `dist/src/index.js`
over stdio, MCP protocol 2025-06-18. The question was whether an agent can work fluidly: few errors, errors it can
act on, sensible defaults, no silent truncation, consistent shapes. No response data is recorded here. The harness
logged only metadata: tool, operation, argument *shape*, ok/error, errorCode, latency, bytes, truncation flags,
item counts, and whether the fields an analyst needs were present.

## 1. Method

- **Harness**: a JSON-RPC stdio client, the same path a host uses. It ran the baseline build (`before`, commit
  `e4ad0b1`) and the fixed build (`after`, this change) against the same lab. Calls are chained the way an analyst
  works: listings come first, and their results supply `did` (positive, with an IP), `pbid`, AI Analyst `groupid` and
  incident id, `mlid`, `pid`, `cid`, `tid`, `sid`, `codeid` and the PCAP filename. Breach analysis also uses the
  device that triggered a 24 h breach.
- **Coverage**: all 51 tools and 78 operations. For each operation the harness tried plausible arguments, the no-args
  default, count and pagination variants, 1 h / 24 h / 7 d windows, `minimal` and `responsedata` variants, and
  deliberate negative probes. The negative probes were an 8-day window, no-args calls on operations that need a
  filter, a missing `operation`, synthetic email UUIDs and policy-denied tools.
- **Profiles**: `read`, `read,sensitive` and `all`, each run three times.
- **Writes**: one pass of reversible writes under `all`. The harness wrote a `[mcp-ux]` breach comment and an
  AI Analyst comment, acked and unacked one breach, unpinned and re-pinned one incident, created the tag
  `mcp-ux-<ts>`, tagged a device and removed the tag again. It also sent `dryRun` for every non-critical write that
  cannot be reversed: update device, request PCAP, create investigation, AI ack/unack, and both entity operations
  by `tid`.
- **Critical writes**: previews only for antigena, antigena manual, the intel feed, subnets and the email action.
  The elicitation path was tested end to end. `confirm:true` plus a `previewId` with the user answering **decline**
  (intel feed add) did not execute. On `delete_tags_tid` for our own test tag, decline left the tag present and
  accept deleted it. That was the only accepted critical action.
- **Load**: three rounds of 20 concurrent mixed reads per build, in both run orders. Then a 10-minute soak of mixed
  reads per build, paced at about 100 calls/min (below the client's 120/min budget). Before that, an unpaced
  10-minute soak was run to probe the limiter, plus a 3-minute unpaced soak on the fixed build.
- **Totals**: about 2,100 measured battery calls (1,046 before and 1,056 after), 360 concurrent calls, 1,938 paced
  soak calls, and about 504,000 unpaced limiter-probe calls.

## 2. Results

| Metric (main battery, reads ×3 per profile + writes) | Before | After |
|---|---:|---:|
| Calls | 1,046 | 1,056 |
| Success rate, all calls (including negative probes) | 76.4 % | 82.1 % |
| Success rate, plausible analyst calls | 82.6 % | 85.7 % |
| Plausible calls failing **client-side** | 12 | 0 |
| Errors with the generic "Request rejected… Check operator diagnostics" text | 245 / 247 | **0 / 189** |
| Errors carrying an `errorCode` | 172 / 247 | 189 / 189 |
| Errors carrying an actionable `hint` | 0 | 187 / 189 (the 2 without one are `outcome:"unknown"` writes, which carry their own instruction) |
| Array results with `returnedItems`/`totalItems` | 100 / 440 | 491 / 491 |
| Truncated results carrying counts | 130 / 150 | 180 / 200 (the rest are nested multi-field cuts reported in `truncatedFields`, or string caps) |
| Operations with at least one successful call | 61 / 78 | 62 / 78 |
| Latency of successful calls, p50 / p95 / max | 57 / 418 / 2,398 ms | 56 / 279 / 896 ms |
| Response size, p50 / p95 | 492 B / 27.6 KB | 1.1 KB / 27.8 KB |

Latency comes almost entirely from the appliance. Client-side rejections answer in 1–5 ms. The p95 dropped because
the 24 h and 7 d breach listings no longer fail with `too_large` and are no longer retried. The p50 size grew because
results now carry counts, applied defaults and hints, and because some previously empty or failed results now return
data.

**Concurrency** (3 rounds × 20 calls, per build, two orders): 60/60 OK in every set except the first set to hit a
cold appliance. In that set `list_models` and `deviceinfo` timed out after 30 s. This happened to `after` when it
ran first and not when it ran second, so it is appliance cache warm-up, not the build. Round wall time was
0.4–1.3 s, and per-call p50 was 300–560 ms under concurrency.

**Paced soak** (10 min, about 100/min): before 990/990 OK; after 947/948 OK (one transient appliance timeout on
`metrics/{mlid}`). p50 was 59 ms for both; p95 was 191 ms before and 234 ms after. No memory or protocol errors and
no stuck calls (the harness has a 60 s per-call watchdog and detects server exit).

**Unpaced loop** (limiter probe): the first `rate_limited` came at exactly call 121, and then 120 calls/min passed,
all OK (1,076 in 10 min before, 360 in 3 min after). The process exited cleanly. Fast-failing `rate_limited`
results return in about 1 ms. A tight agent loop therefore burns through tokens fast. The new hint tells the agent
to wait up to 60 s and to stop looping.

## 3. Error taxonomy (before → after, main battery)

| Class | Before | After | Root cause and handling |
|---|---:|---:|---|
| Client-side validation, plausible call | 12 | 0 | Four causes, all fixed. (a) PCAP listing returns `filename:"/pcaps/<name>"`, which the download path rejected (`/`). (b) An email search body `{from:…}` was treated as a time range. (c) `did`/`sid` values the API itself returns (`-11`, network ranges and client sensors) failed `min(1)`. (d) Message gave no field information. |
| Client-side validation, negative probe | 17 | 10 | An 8-day window is still rejected, now as `invalid_arguments` with the 7-day rule. The ack-without-body probe is no longer an error because the body defaults. Policy probes are now `policy_denied`. |
| Missing or invalid `operation` | 46 | 16 | Multi-listing tools now default to the analyst's first call (`get_aianalyst_groups`, `get_antigena`, `get_tags`). The tools still without a default (`get_reference_data`, `email_dashboard`) return `invalid_operation` with the valid ids. |
| `policy_denied` (profile probes) | (in validation) | 6 | Was the generic text. Now it names the operator profile needed and says not to retry. |
| `too_large` (appliance response > 2 MiB cap) | 50 | 30 | Breach 24 h/7 d without `minimal`: fixed with the `minimal:true` default (now partial data with counts). The remainder is full `models`, `components` and `enums`: the description and hint now give working `responsedata` examples (`"pid,name"`, `"cid,mlid"`, `"Protocol"`), verified on the lab. |
| Appliance `forbidden` (403) | 78 | 83 | Every Darktrace/EMAIL route: the lab token lacks the email permission or module. After: +5 because email search now reaches the appliance (it used to fail client-side). |
| Appliance `server` (500/502) | 22 | 22 | `GET /cves` returns 500 on this non-OT lab (20 calls). `DELETE /tags/entities` and `DELETE /tags/{tid}` apply but answer 502, which correctly gives `outcome:"unknown"` (2 calls). |
| Appliance `network` (302) | 10 | 10 | `GET /filtertypes` redirects for this token, and redirects are never followed. The hint now says so. |
| Appliance `bad_request` | 10 | 10 | `GET /details` with no `did`/`pbid` (negative probe). The description now says "Needs a did or pbid filter". |
| `timeout` / `not_found` | 1 / 1 | 1 / 1 | Transient timeout. `not_found` is the expected verify-after-delete check. |

### Operations that fail on this appliance and why

| Operation(s) | Result | Reason |
|---|---|---|
| 13 Darktrace/EMAIL operations (dash ×4, resources ×3, audit eventTypes and events, search, decode_link, emails/{uuid}, download) | HTTP 403 | Token or module lacks email permission. Not fixable in the MCP. |
| `get_cves` | HTTP 500 | Darktrace/OT-only endpoint on a non-OT lab. |
| `get_filtertypes` | HTTP 302 → `network` | The appliance redirects for this token. |
| `delete_tags_entities`, `delete_tags_tid` | HTTP 502 after applying | Appliance quirk. The MCP reports `outcome:"unknown"` and the read-back confirms the change was applied. |
| `get_models`, `get_components`, `get_enums` with no `responsedata` | `too_large` | Full lists are over 2 MiB. They work with `responsedata`. |
| `get_aianalyst_incidents` | not exposed | Deprecated (79th catalogue row). |

Everything else (62 operations) passed. That includes `get_pcaps_filename`, which now works when chained from the
listing.

## 4. Fixes made

All model-facing text is code-owned. No submitted value and no upstream text, status or request id is reflected.
Redaction, neutralization, allowlists and size caps are unchanged. `src/policy`, `src/config` and `src/server` were
not touched.

1. **Validation errors are actionable** (`src/tools/feedback.ts`, `src/tools/index.ts`).
   - Schema failures return `errorCode:"invalid_arguments"`, the `operation`, and the `requiredFields` of that
     operation. They also return up to 20 `issues` of the form `{path, problem, expected?, allowed?}`, derived
     from our own zod schema: `required`, `wrong_type`, `too_small`/`too_big` with the bound, `invalid_format`
     with our pattern, enum values, and `unknown_parameter` with the allowed parameter names.
   - Values are never echoed. Unknown key names are shown only if they match `[A-Za-z0-9_.-]{1,64}`; otherwise they
     are masked as `?`.
   - The code-owned validation messages (7-day window, unpaired times, bad search encoding, summary anchors, input
     budget, unsafe keys) map to specific guidance.
   - A decoded Advanced Search document is checked against `SearchSchema` and its issues are reported as
     `search.<field>`.
2. **Other errors carry codes and next steps.**
   - `policy_denied` names the profile needed, and only when a profile is the cause.
   - `invalid_operation` lists the valid operation ids.
   - `unknown_tool`, `invalid_preview` and `rate_limited` (write budget) each have their own code.
   - Appliance errors keep a code-owned message and get a per-code `hint` (`src/client/errors.ts`): `auth` (check
     tokens/URL), `forbidden` (token lacks permission), `rate_limited` (120/min budget, wait up to 60 s), `timeout`,
     `clock_skew_suspected` (sync NTP), `not_found`, `network` (redirects are not followed), `server`.
   - For `too_large`, and for truncation, the advice depends on the operation and names only parameters that
     operation has (narrow `starttime`/`endtime`, lower `count`, `minimal:true`, `responsedata`, a by-id route).
3. **Sensible defaults.**
   - `get_modelbreaches` defaults to `minimal:true`; `minimal:false` still works.
   - Read tools with several listings get a preferred default operation.
   - The breach ack/unack body defaults to its only valid value (`{acknowledge:true}` / `{unacknowledge:true}`).
   - Results report the defaults they applied (`appliedDefaults`: `count`, `starttime`/`endtime`, `minimal`).
   - An empty default-window result says that the window was the last hour.
4. **No silent truncation; consistent shapes.**
   - Every array result has `returnedItems`/`totalItems`. `totalItems` counts the upstream list before the
     1,000-item cap (for example `components` 1000/2752, `models` 516/1385).
   - Truncation hints say "partial data" and include the operation's own advice.
5. **Useful data where it was missing.**
   - `devicesummary` sections (device, similar devices, model breaches, device info, details) were all
     `"fields omitted"`. They are now projected through the reviewed views of `get_devices`, `get_similardevices`,
     `get_modelbreaches`, `get_deviceinfo` and `get_details`. The same allowlists apply, so for example
     `credentials` stays excluded.
   - Single-record answers from list endpoints (`tags?tag=<name>`) use the item view instead of collapsing.
6. **Analyst id shapes** (`src/api/operations.ts`, `src/api/validation.ts`).
   - A PCAP filename `"/pcaps/<name>"` as returned by the listing is accepted and reduced to `<name>`. The path
     segment checks still run, and whitespace is now rejected too: the lab answered `auth` to a spaced name, a
     misleading signature mismatch.
   - Negative `did`/`sid` filters (-99999..-1, not 0) are allowed on **read query parameters only**. Bodies, paths
     and write queries keep `min(1)`.
   - The Advanced Search graph `interval` is documented in milliseconds ("milisegundos" was misread as seconds).
     The lab confirmed ms (3,600 gave 3.6 s buckets, 600,000 gave 10 min). Its bound is now 604,800,000 ms; the
     metric-data `interval` stays at 604,800 s.
   - Free-form Darktrace/EMAIL bodies no longer go through the time-pair check: `from` there is a sender.
7. **Descriptions tell the agent the cheap, safe call** (`src/tools/descriptions.ts`, `toolDescription`).
   - Write operations list their required body fields, for example `post_tags = create tag (body: name, data)`
     and `post_antigena (body: codeid)`.
   - Time-window tools say `starttime/endtime epoch ms`.
   - Per-operation notes cover breach `minimal`, details needing `did`/`pbid`, `responsedata` examples for
     models, components, enums and metrics, and `cves` being OT-only.
   - Every description is still ≤ 600 characters and lists exactly its own operation ids.

Independent review: a code-review agent checked the diff. Nothing reached critical severity. Its two important
findings are fixed: negative ids had been accepted on the write query of `delete_tags_entities`, and the
`policy_denied` hint had blamed profiles for route or release refusals.

### Tests

- `npm run typecheck`: clean.
- `npm test`: **183/183** (was 174). Nine new tests are in `test/unit/ux-feedback.test.ts`; two existing ones were
  updated, one for the new default operation and one for the added `hint` key on API errors.
- `npm run test:security`: **330 tests, 327 pass, 0 fail, 3 skipped**, the same counts as the baseline. The
  MR-04 tool-contract snapshot `test/security/fixtures/mcp-tool-contracts-full-api.json` was regenerated for all
  five profiles, because descriptions and schemas changed by design. It needs independent review, as
  `CHANGES-core.md` already notes for this fixture.
- `src/coverage/report.generated.json` was regenerated by the build. Its only change is the graph `interval` unit
  and bound.
- The fixture hash and source pins in `scripts/verify-release.mjs` must be recomputed at release time. That script
  was not changed here.

### Lab state after the run

- Comments cannot be deleted through the API, so a few `[mcp-ux] stability probe <ts>` comments remain on breach
  1537456 and one AI Analyst incident.
- The test tags were deleted; the read-back returned `not_found`.
- Pin state and breach acknowledgement were restored. One extra acknowledge happened during the `after` run, when the
  ack-without-body probe became valid through the new default. It was reverted with an unacknowledge and verified:
  the breach is listed again in the default, unacknowledged listing. The probe now uses `dryRun`.

## 5. Remaining recommendations

1. **Parameter descriptions in the input schema.** `tools/list` carries types and bounds but no per-parameter text,
   so units and formats (`seensince`, `iptime`, `from`/`to`, `eventtype`) are invisible unless the tool description
   names them. Emitting short code-owned descriptions for about 30 high-traffic parameters would remove most
   guesswork. Doing it for all of them would add about 100 KB to `tools/list`, which is too much.
2. **Large reference lists.** The 2 MiB response cap is reached before any trimming can happen. Two options: a
   streaming/partial JSON reader in the client, so `too_large` lists degrade to partial data, or code-owned default
   `responsedata` values for `models`, `components` and `enums`.
3. **Budget-aware trimming.** `metrics` shows 6 of 322 metrics because each one carries hundreds of `filtertypes`.
   `fitToBudget` cuts the largest array, which is the outer list. Capping nested arrays inside items first would
   return far more records.
4. **Rate-limit visibility.** Expose the remaining per-minute budget, or a `retryAfterSeconds`, as a code-owned
   value from the client limiter (`src/client`/`src/config`). Agents could then pace themselves instead of
   fast-failing.
5. **Cold-cache timeouts.** Heavy endpoints (`models` with `responsedata`, `deviceinfo`) can take more than 30 s
   when 20 calls hit a cold appliance at once. A lower default client concurrency for heavy reads, or one automatic
   retry for idempotent GET timeouts, would hide this.
6. **Write ergonomics.** `post_tags` requires `data` even when it is empty, so `data:{}` could default. Negative
   `did` on writes (for example tagging a network range) stays blocked pending a deliberate decision.
7. **Email.** Lab-validate the Darktrace/EMAIL routes with a token that has the email permission. Free-form email
   bodies have no time-window bound, which is acceptable for search but should be revisited once the schema is
   known.
