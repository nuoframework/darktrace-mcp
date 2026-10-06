# Lab signing evidence — Darktrace 7.1.0 appliance

Independent, live evidence of which request-signing shapes a Darktrace Threat Visualizer
7.1.0 appliance accepts, gathered so the implementing team can adopt verified vectors for
the forms this project historically blocked (S1, S4, S5, S6, S7, S9 and the PCAP
content-type). This document records only HTTP status, JSON-parseability, response size,
elapsed time, content-type and a description of the canonical-string **format**. It never
contains token values, signatures, canonical strings or response bodies.

- **Appliance:** a Darktrace lab appliance (hostname withheld) (version claimed 7.1.0).
- **Authorisation:** owner-authorised, non-production lab.
- **Date of run:** 2026-10-06.
- **Probe:** `scripts/lab-signing-probe.mjs` (Node, no dependencies, read-only on the repo
  except the JSON evidence file). Tokens are read from
  `~/.config/darktrace-mcp-lab/{public,private}-token` inside the script only.
- **Machine-readable results:** `docs/security/evidence/lab-signing-evidence-2026-10-06T09-17-38-944Z.json`.
- **Scheme under test (from `src/client/signer.ts`):** canonical string
  `"<path?query[appended-body]>\n<publicToken>\n<DTAPI-Date>"`, HMAC-SHA1 keyed by the
  private token, hex digest, carried in `DTAPI-Token` / `DTAPI-Date` / `DTAPI-Signature`.

## How to read the status codes

A dedicated control request settles the meaning of the status codes before anything else is
interpreted. The probe sent a valid request to `GET /tags` but signed the canonical for a
**different** path, so only the signature was wrong.

| Control | Result | Meaning |
|---|---|---|
| `GET /tags` with a deliberately mismatched signature | **HTTP 400** | This appliance rejects a bad signature with **400**, not the 401 the portal spec documents. |

Therefore, throughout this document **400 means the signature (or date) was rejected**, and
**200 / 403 mean the signature was accepted** (403 then being an authorisation denial). A
separate quirk: every **DELETE** returns **HTTP 502** at the gateway even though the backend
performs the operation, so DELETE conclusions rest on verified side effects, not the status.

## Results

| Shape | Variant (canonical format) | Method / endpoint | HTTP | JSON | Bytes | ms | Verdict |
|---|---|---|---|---|---|---|---|
| base/S8 | path only, compact date | GET `/tags` | 200 | yes | 55797 | — | scheme authenticates |
| S7 | path only, **spaced** date | GET `/tags` | 200 | yes | 55797 | — | spaced date accepted |
| S7 | compact date **+31 min** | GET `/tags` | 400 | — | 30 | — | out-of-window date rejected |
| S1 | query signed **percent-encoded** | GET `/devices` | 200 | — | 8 | — | accepted |
| S1 | query signed **unencoded** | GET `/devices` | 200 | — | 8 | — | accepted |
| S6 | standard base64, signed **raw** (wire %-encoded) | GET `/advancedsearch/api/search/{b64}` | 400 | — | 45 | — | rejected (canonical ≠ wire) |
| S6 | standard base64, signed **percent-encoded** | GET `/advancedsearch/api/search/{b64}` | 200 | yes | 11278 | — | accepted |
| S6 | **url-safe** base64 (no padding) | GET `/advancedsearch/api/search/{b64url}` | 200 | yes | 10186 | — | accepted |
| S9 | path only, same HMAC scheme | GET `/agemail/.../dash/dash_stats` | 403 | — | 21 | — | scheme accepted, authz denied |
| S9 | path only, same HMAC scheme | GET `/agemail/.../resources/filters` | 403 | — | 21 | — | scheme accepted, authz denied |
| PCAP | path only | GET `/pcaps` (list) | 200 | yes | 4582 | — | accepted; list empty of fetchable files |
| PCAP | path only | GET `/pcaps/{filename}` | — | — | — | — | **skipped**: no pcap present; probe never creates one |
| S4 | `path?query&{json}` (SDK append style) | POST `/tags?responsedata=name` | 400 | — | — | — | **rejected** |
| S4 | `path?{json}` (body only; query unsigned) | POST `/tags?responsedata=name` | 200 | yes | — | — | **accepted** |
| S4 | `path?query` (query only; body unsigned) | POST `/tags?responsedata=name` | 400 | — | — | — | rejected |
| S5 | create probe tag `path?{json}` | POST `/tags` | 200 | yes | — | — | tag created (tid 292) |
| S5 | assign tag to device (form body) | POST `/tags/entities` | 200 | yes | — | — | assignment created |
| S5 | DELETE signed as `path?query` (GET-style) | DELETE `/tags/entities?did=&tag=` | 502 | — | 11 | — | **accepted**: assignment removed (verified) |
| cleanup | delete created tags, verify | DELETE `/tags/{tid}` | 502→ok | — | — | — | probe tags remaining = **0** |

(Byte and millisecond figures are in the JSON evidence file; POST/DELETE rows whose body is
not measured show "—".)

## Conclusions per shape

- **S1 — query encoding in the signature.** The appliance accepts the query signed **either
  percent-encoded or unencoded** (both returned 200 with a recognised, signed parameter whose
  value contained a space). Because the control proves a wrong signature yields 400, both
  forms produced valid signatures. This appliance canonicalises leniently, so **neither
  `querySignatureEncoding` startup mode breaks**. The project's default (`unencoded`) is
  safe; `encoded` is equally accepted here.
- **S4 — POST with both query params and a JSON body.** Only **`path?{json}`** is accepted
  (sign the path plus the exact JSON body, with the URL query **excluded** from the
  signature). The SDK's `path?query&{json}` and a query-only `path?query` are both
  **rejected (400)**. On the accepted vector the `responsedata` query parameter still rode
  along on the wire and the request succeeded, i.e. the appliance does not include the POST
  URL query in its signature canonical.
- **S5 — DELETE with query params.** Signing the DELETE as **`path?query` (the GET rule)**
  is accepted: the tag-to-device assignment created by the probe was removed, verified by a
  follow-up read, and the tag itself was then deleted with `0` probe tags remaining. The
  gateway returns 502 on DELETE regardless, so acceptance is established by the side effect.
- **S6 — Advanced Search base64 in the GET path.** The appliance verifies the signature over
  the path **exactly as transmitted**. Standard base64 signed in its raw form while
  transmitted percent-encoded is **rejected (400)**; the same base64 signed in its
  percent-encoded (as-sent) form is **accepted (200)**, and **url-safe base64** (no `+ / =`,
  nothing to encode) is **accepted (200)**. Recommended vector: **url-safe base64**, which is
  unambiguous; otherwise the signed canonical must match the wire percent-encoding byte for
  byte.
- **S7 — date format.** Both the compact `YYYYMMDDTHHMMSS` and the spaced
  `YYYY-MM-DD HH:MM:SS` UTC formats are accepted. A date **+31 minutes** out is rejected
  (400), consistent with a roughly ±30-minute skew window.
- **S9 — `/agemail` email endpoints.** They use the **same HMAC scheme**: both endpoints
  returned **403** (authorisation denied for this token), not 400, so the signature was
  accepted. The scheme is shared; this lab token simply lacks the email permission or
  license. This confirms the scheme question but does not by itself lift the project's S9
  block, which also depends on a pinned instance spec and a design review.
- **S8 — algorithm.** HMAC-SHA1 with the documented header triplet authenticates against the
  live appliance (baseline 200). No negotiation exists; nothing to change.
- **PCAP content-type.** `GET /pcaps` returns a JSON list (200). The appliance had **no
  existing PCAP file**, and the probe deliberately does not create one, so the content-type
  of `GET /pcaps/{filename}` could not be observed in this run.

## What the darktrace-sdk does, for each shape

Drawn from `openapi/DIFF-sdk-vs-docs.md` (read, not executed):

- **S1:** the SDK signs GET query values **unencoded** and lets `requests` send them encoded.
  This matches one of the two forms the appliance accepts.
- **S4:** the SDK signs **`path?a=1&{json}`** for POST-with-query-and-body. This exact shape
  is **rejected by the 7.1.0 appliance (400)**; the implementing team should sign
  `path?{json}` instead and leave query params unsigned on the wire.
- **S5:** the SDK builds the signature uniformly from path and query for every verb, i.e. it
  signs DELETE as `path?query`. The appliance **accepts** that.
- **S6:** the SDK uses **standard** (not url-safe) base64 and places it in the path; standard
  base64 can contain `/ + =`. Whether that is accepted depends entirely on whether the signed
  form matches the transmitted form — the appliance rejects any mismatch. Url-safe base64
  sidesteps the problem and is the safer adoption.
- **S9:** the portal spec lists only the `/agemail` paths; the SDK implements their
  parameters by hand. The scheme is the same as the main API (confirmed here).
- **PCAP:** the SDK adds a `responsedata` parameter to `GET /pcaps/{filename}` that the
  portal spec does not list; the content-type remains unverified here.

## Limitations

1. **Single appliance, single token.** Results are from one 7.1.0 lab instance with one
   token. The token lacks the Darktrace/EMAIL permission (S9 returned 403) and had no PCAP
   files available, so those two shapes are only partially evidenced.
2. **DELETE gateway 502.** The lab's gateway returns 502 on every DELETE while the backend
   still applies the change. S5 acceptance is therefore proven by verified side effects, not
   by the HTTP status.
3. **Rejection code is 400, not 401.** This appliance returns 400 for a rejected signature or
   date, which differs from the portal spec's documented 401. Error-class handling in the
   client should not assume 401 means "auth".
4. **S6 base64 payload.** The constructed query's standard base64 differed from its wire form
   only in the `=` padding (`%3D`); the `+` / `/` cases are inferred to follow the same
   "canonical must equal the as-sent path" rule rather than being exercised with those exact
   characters. The SDK's literal-base64-in-path style (reserved characters sent unencoded)
   was not directly reproduced.
5. **S1 leniency.** "Both encodings accepted" was shown with one recognised parameter
   (`responsedata`) carrying a space. It is consistent with lenient server canonicalisation
   but was not swept across every parameter type.
6. **Scope.** The probe performs only the writes needed for S4/S5 (create tag, assign, delete)
   and never creates PCAPs, never deletes anything it did not create, and issues harmless
   bounded reads elsewhere.

## Cleanup verification

- Probe tags created this run: tids **292** and **293** (names `mcp-probe-*-<timestamp>`).
- Both were deleted via `DELETE /tags/{tid}` (gateway 502, backend applied).
- The S5 device assignment was removed and confirmed gone by a follow-up read before the tag
  was deleted.
- Final `GET /tags` sweep: **probe tags remaining = 0**.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
