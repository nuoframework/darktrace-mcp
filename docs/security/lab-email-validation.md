# Darktrace/EMAIL lab validation (lab C, 2026-10-06)

**Verdict: PERMISSION.** The 13 Darktrace/EMAIL read operations stay "not lab-validated". Signing and
routes are correct. The Email service checks our signature and accepts it, and then refuses the API token
for every `/agemail/api/ep/api/v1.0/...` path, including a route that does not exist. The live part of this
validation (running the 13 reads through MCP) was stopped here, as the plan required. The operator steps that
would unblock it are listed [below](#what-the-operator-must-enable).

## Scope and method

- Appliance: owner-authorised non-production lab C, Darktrace `7.1.0 (9fdfb759)`. The owner reports that
  the Email module is enabled. `darktrace-mcp test` passes (`GET /status` 200).
- Probe: [`scripts/lab-email-probe.mjs`](../../scripts/lab-email-probe.mjs). This is a standalone script that
  copies the HMAC-SHA1 scheme of `src/client/signer.ts`. Each probe changes one facet: route, query, date
  format, query encoding in the signed text, signed path prefix, `Accept`, a deliberately wrong signature,
  or no credentials.
- The probe reads token values from the `0600` files and keeps them inside the process. It never prints or
  writes them, and it never records signatures or canonical strings. A non-2xx JSON error body is kept only
  as its first 200 characters, scrubbed of token values. A 2xx body is reduced to its top-level key names.
- Requests sent: GET reads, plus one read-via-POST (`emails/search` with body `{"limit":1}`). The email
  action was **not** called.
- Raw evidence: [`evidence/lab-email-probe-2026-10-06T17-48-14-791Z.json`](evidence/lab-email-probe-2026-10-06T17-48-14-791Z.json).

What the repository says about the Email API, and what was tested:

| Question | Source | Probed as |
|---|---|---|
| Base path | SDK `dt_email.py` and `openapi/darktrace-sdk.yaml`: `/agemail/api/ep/api/v1.0/...`. The catalogue uses the same path. | catalogue paths verbatim |
| Signed path | SDK signs the full request path **including** `/agemail` (shared `_get` / `_post_json`, `auth.py:47-69`) | as SDK, and once signed without the `/agemail` prefix |
| Token / headers | Same `DTAPI-Token` / `DTAPI-Date` / `DTAPI-Signature`. The SDK has no separate Email token or header. | same headers as the control |
| Query | All optional: `days`, `limit` (dash), `limit`/`offset`/`eventType` (audit), `include_headers` (detail). `link` is required for `decode_link`. | without a query; with `days=7&limit=10` |
| Query encoding in signature | SDK signs unencoded values. The project setting decides. | both: encoded and unencoded |
| Date format | Compact (project default) and spaced (SDK) | both |
| `Accept` / content type | SDK sends `Content-Type: application/json` and no specific `Accept` | `application/json` and `*/*` |
| Parameter schema | `openapi/DIFF-sdk-vs-docs.md` §4: parameters live in each instance's `/agemail/api/api-docs` | `GET /agemail/api/api-docs` signed |

## Results

`verdict`: 2xx OK; 400/401 SIGNING; 403 PERMISSION; 404/302 ROUTE.

### (a) Controls: same signing, Threat Visualizer routes

| Request | Variant | Status | Body (scrubbed) | Verdict |
|---|---|---|---|---|
| `GET /status` | compact date | 200 (11,227 B) | JSON object | OK |
| `GET /status` | spaced date | 200 (11,227 B) | JSON object | OK |
| `GET /tags` | compact date | 200 (61,191 B) | array(248) | OK |
| `GET /modelbreaches?count=1` | query, unencoded signature | 200 (6,951 B) | array(1) | OK |
| `GET /status` | wrong signature | 400 (37 B) | `{"status": "API SIGNATURE ERROR"}` | SIGNING |
| `GET /status` | no credentials | 302 to the login redirect | — | ROUTE (auth) |

### (b) The 13 reads, built as the catalogue builds them

| # | Operation | Request | Status | Body | Verdict |
|---|---|---|---|---|---|
| 1 | `get_agemail_api_ep_api_v1_0_admin_decode_link` | `GET .../admin/decode_link?link=…` | 403 (30 B) | `{"error": "403 Forbidden"}` | PERMISSION |
| 2 | `get_agemail_api_ep_api_v1_0_dash_action_summary` | `GET .../dash/action_summary` | 403 | same | PERMISSION |
| 3 | `get_agemail_api_ep_api_v1_0_dash_dash_stats` | `GET .../dash/dash_stats` | 403 | same | PERMISSION |
| 4 | `get_agemail_api_ep_api_v1_0_dash_data_loss` | `GET .../dash/data_loss` | 403 | same | PERMISSION |
| 5 | `get_agemail_api_ep_api_v1_0_dash_user_anomaly` | `GET .../dash/user_anomaly` | 403 | same | PERMISSION |
| 6 | `get_agemail_api_ep_api_v1_0_emails_uuid` | `GET .../emails/<placeholder uuid>` | 403 | same | PERMISSION |
| 7 | `get_agemail_api_ep_api_v1_0_emails_uuid_download` | `GET .../emails/<placeholder uuid>/download` | 403 | same | PERMISSION |
| 8 | `post_agemail_api_ep_api_v1_0_emails_search` | `POST .../emails/search` `{"limit":1}` | 403 | same | PERMISSION |
| 9 | `get_agemail_api_ep_api_v1_0_resources_tags` | `GET .../resources/tags` | 403 | same | PERMISSION |
| 10 | `get_agemail_api_ep_api_v1_0_resources_actions` | `GET .../resources/actions` | 403 | same | PERMISSION |
| 11 | `get_agemail_api_ep_api_v1_0_resources_filters` | `GET .../resources/filters` | 403 | same | PERMISSION |
| 12 | `get_agemail_api_ep_api_v1_0_system_audit_eventTypes` | `GET .../system/audit/eventTypes` | 403 | same | PERMISSION |
| 13 | `get_agemail_api_ep_api_v1_0_system_audit_events` | `GET .../system/audit/events?limit=5` | 403 | same | PERMISSION |

Rows 6 and 7 use an all-zero placeholder UUID because no message UUID can be listed. A permitted token
would be expected to answer 404 there, not 403.

### (c) Variants

| Request | Variant | Status | Body | Verdict |
|---|---|---|---|---|
| `GET .../dash/dash_stats?days=7&limit=10` | unencoded signature (SDK form) | 403 | `{"error": "403 Forbidden"}` | PERMISSION |
| same | encoded signature | 403 | same | PERMISSION |
| same | spaced date | 403 | same | PERMISSION |
| `GET .../dash/dash_stats` | spaced date, no query | 403 | same | PERMISSION |
| `GET .../dash/dash_stats` | `Accept: */*` | 403 | same | PERMISSION |
| `GET .../admin/decode_link?link=<value with a space>` | encoded signature | 403 | same | PERMISSION |
| same | unencoded signature | 403 | same | PERMISSION |
| `GET .../dash/dash_stats` | **signed without the `/agemail` prefix** | **400** (38 B) | `{"agemail": "API SIGNATURE ERROR"}` | SIGNING |
| `GET .../dash/dash_stats` | **wrong signature** | **400** | `{"agemail": "API SIGNATURE ERROR"}` | SIGNING |
| `GET .../resources/filters` | wrong signature | 400 | `{"agemail": "API SIGNATURE ERROR"}` | SIGNING |
| `GET .../dash/dash_stats` | no credentials | 302 to the login redirect | — | ROUTE (auth) |
| `GET .../dash/does_not_exist` | unknown route under the Email prefix | **403** | `{"error": "403 Forbidden"}` | PERMISSION |
| `GET /agemail/api/api-docs` | instance Email OpenAPI, signed | 302 | `{"error":"Please login again"}` | ROUTE (session only) |
| `GET /agemail/` | Email console root, signed | 302 | `{"error":"Please login again"}` | ROUTE (session only) |

## Diagnosis

1. **Signing is correct.** A wrong signature on an Email route gets a 400 whose key is `agemail`
   (`{"agemail": "API SIGNATURE ERROR"}`). That body is different from the Threat Visualizer's
   `{"status": ...}` error. So the Email service checks the HMAC itself, and the correct signature gets past
   that check. The signed path must include `/agemail`: dropping the prefix gives the same 400. The
   catalogue and the SDK both sign the full path. Date format, query encoding and `Accept` make no
   difference.
2. **It is not a route problem.** All 13 routes answer 403. A route that does not exist under the same prefix
   also answers 403, not 404. The refusal is a blanket check on the authenticated token, made before
   routing. Parameters and request shape are never looked at.
3. **It is a permission problem on the API token.** The token is valid (Threat Visualizer reads return 200)
   but has no Darktrace/EMAIL access. Darktrace scopes per-user API tokens to what the owning user can open in
   the UI. The lab's `/status` has licence fields for network, SaaS/Office365, cloud, PREVENT and HEAL,
   but no field that names an Email licence. So the operator also needs to confirm that the Email console is
   provisioned and linked to this instance. The probe cannot tell those two causes apart.
4. The instance's own Email OpenAPI (`/agemail/api/api-docs`) needs a logged-in UI session. It redirects an
   API-token request to log in, so it cannot be fetched with the API token.

## What the operator must enable

Do these in the lab C UI. Then re-run `node scripts/lab-email-probe.mjs`.

1. **Confirm that Email is reachable for a human.** Log in to the lab C Threat Visualizer as the user that
   owns the API token. Open the Darktrace/EMAIL console (main menu, or `/agemail/`). If it does not open,
   or the user has no Email entry, Email is not provisioned or linked for this instance. Ask Darktrace
   (lab provider) to link the Email deployment. No API permission change can fix that.
2. **Grant the token's user Darktrace/EMAIL access.** Go to *Admin > Permissions Admin > Created Accounts >
   (the API user) > edit*. Give the user access to the Darktrace/EMAIL console: the Email permission
   group/flag in the user's permission template, or membership of a group that has it. For the 13 reads,
   *view* access to the Email dashboard, message log/search and Email audit log is enough. **Do not grant
   Email action / hold-release rights**, because the email action stays excluded. Keep the **API Access**
   flag on.
3. **Refresh and reissue the token.** Log out and log in again as that user so the new permissions take
   effect. Then go to *Account Settings > API Access* and create a **new** token pair (per-user tokens take
   the user's permissions). If the current lab C tokens are the legacy system-wide pair from *System Config*,
   replace them with a per-user pair from a local (non-SSO) user that has Email access. Write the new values
   to `~/.config/darktrace-mcp-lab-c/{public,private}-token` (mode `0600`). Never paste them into chat or
   commit them.
4. **Success check.** `GET .../resources/actions` and `GET .../dash/dash_stats` should answer 200. A
   placeholder-UUID detail read should then answer 404 instead of 403.

## Not done (blocked by the 403)

- The 13 reads were not run through the MCP stdio path, and the code-owned views in `src/api/email-views.ts`
  were not checked against real field names. Those field names stay unconfirmed. The views drop anything
  unknown, so a wrong guess hides data but never leaks it.
- `darktrace_download_email` was not exercised. Its contract (`{file:{mediaType,sizeBytes,sha256,contentOmitted:true}}`,
  no bytes) is still covered only by unit and security tests.
- No change to `scripts/generate-catalogue.ts` (`LAB_VALIDATED_71`), the generated catalogue,
  `docs/tools.md`, README counts or the contract fixture. `src/` is unchanged, so release pins do not need
  to be recomputed.

## Email action (`post_agemail_api_ep_api_v1_0_emails_uuid_action`): assessment, not executed

- **What the SDK defines.** `DarktraceEmail.email_action(uuid, data)` posts `data` as a pass-through JSON
  body to `/agemail/api/ep/api/v1.0/emails/{uuid}/action`. The schema in `openapi/darktrace-sdk.yaml` is
  `type: object, properties: {}, additionalProperties: true`. The SDK source (v0.10.1) gives no action
  names, no body field names, no enum and no example. So **the SDK schema does not tell us which actions
  exist or which can be undone**. The only sources are the instance itself:
  `GET .../resources/actions` (one of the 13 reads, 403 here) and the instance OpenAPI at
  `/agemail/api/api-docs` (needs a UI session).
- **Reversibility (unconfirmed).** Darktrace/EMAIL product material describes actions such as holding a
  message, releasing it, and moving it to junk or removing it from the mailbox. These are carried out through
  the mail provider's API (for example Microsoft Graph). A *hold* / *release* pair looks reversible on paper.
  Actions carried out at the mail provider (move, delete, link/attachment rewriting already delivered) may
  not undo cleanly. None of this is confirmed for this API. It must not go into a schema until the instance
  says so.
- **Evidence needed before a later release could enable it:**
  1. The 403 above is resolved, and `GET .../resources/actions` returns the action list (names and any
     parameters), recorded as shape evidence.
  2. The instance's `/agemail/api/api-docs` is fetched through an authorised session and the
     `emails/{uuid}/action` request schema (body fields, action enum) is pinned offline and reviewed. It is
     committed like the SDK pins (`schemaSha256`) and is never generated at runtime (api-contract S9).
  3. A lab test message the owner sends to a lab mailbox, with a known UUID found through `emails/search`.
  4. A live pair on that message, for example *hold → release* (or the instance's equivalent reversible
     pair). After each step, `get_email` reads back the action/verdict state, and the second step must
     return it to the original state. Each step goes through the critical approval path (preview,
     `confirm:true` + `previewId`, dialog).
  5. An action allowlist limited to the actions proven reversible in step 4, a body schema with no
     pass-through, a threat-model update (TM-18) and a new design review. Until then the operation stays
     `blocked` (`BLOCKED` in `scripts/generate-catalogue.ts`).
