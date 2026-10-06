# Darktrace/EMAIL API: shapes observed from a console capture (schema only)

Status: analysis, not yet lab-validated through the MCP. Nothing in `src/` or `test/` changes with this
document; it records what a real Darktrace/EMAIL console exchanged so that the 13 email reads and the
blocked email action can be corrected and then validated on a lab.

## 1. Inputs and privacy handling

| Input | What it is | How it was used |
| --- | --- | --- |
| Saved console page | The in-product Swagger UI of the email API (`/agemail/api/api-docs/#/v1.0`), OAS3, `info.version` 1.0.0 | Operation list (method + path + one-line summary) and the names of the 38 schema components. Models were collapsed in the saved page, so no field-level schema was available from it. The supporting files saved next to the page are a 2.7 KB application shell, not the Swagger assets or the spec JSON. |
| Browser HAR | 86 requests: one redirect on the Threat Visualizer host, 85 on the Darktrace/EMAIL console host (a different lab hostname) | Summarised with `scripts/analysis/har-email-summary.mjs`, which prints only method, templated path, query parameter names, header names, body/response key paths and value types. |

Both inputs are confidential and stay outside the repository. Nothing below contains values from them:
no hostnames, cookies, tokens, user or account names, addresses, subjects, bodies, identifiers or
timestamps. Enumerations quoted here (action names, statuses, directions) are product vocabulary.

Reproduce (output goes to the terminal; keep it out of the repository):

```sh
node scripts/analysis/har-email-summary.mjs <capture.har>            # email routes, human-readable
node scripts/analysis/har-email-summary.mjs <capture.har> --json     # same, as JSON
node scripts/analysis/har-email-summary.mjs <capture.har> --all --max-keys=100000   # every route, no map collapsing
```

## 2. Authentication: why API tokens got 403

### 2.1 What the console does

- The console is served from **its own hostname**, not from the Threat Visualizer host. The only request
  to the Visualizer host was a `/redirect` hop; all 85 email calls went to the email host.
- Every console call to `/agemail/...` carried the same set of auth-relevant request headers:
  `x-xsrf-token` (one constant 36-character value for the whole session, i.e. a per-session anti-forgery
  token), `x-requested-with: XMLHttpRequest`, `origin`/`referer` of the email host, and the browser's
  session cookie. The HAR export had cookies stripped (0 `Cookie` headers, 0 response cookies recorded),
  which is the browser's default sanitised export; the session is cookie-based, the anti-forgery header
  is the double-submit companion of that cookie.
- **No** `DTAPI-Token`, `DTAPI-Date`, `DTAPI-Signature` and **no** `Authorization` header appears on any
  request. The console never uses the HMAC API-token scheme.
- The console does **not** call the public API prefix. It calls an internal UI API
  (`/agemail/log/*`, `/agemail/groups*`, `/agemail/lists`, `/agemail/accounts`, `/agemail/audit/types`,
  `/agemail/api/v1.0/campaigns/list`, ...). Those routes are session + anti-forgery only and are not a
  supported integration surface.

### 2.2 What the instance documentation says

The Swagger UI intro on the instance states (paraphrased): the Darktrace/EMAIL **public** API is
accessible at `/agemail/api/ep/api/v1.0/*`; **all endpoints require the "Email Logs" permission** plus any
other permission an endpoint specifies; supported locales are `en_US`, `ja_JP`, `es`, passed as a `locale`
field in the query or the body; the authentication guide is on the Customer Portal. The Swagger server
entry is `/agemail/api/` with paths `/v1.0/...`; the public prefix adds `ep/api/`.

### 2.3 Conclusion for the MCP

The earlier lab probe (`docs/security/lab-signing-evidence.md`, S9) got **403, not 400/401**, for
`/agemail/api/ep/api/v1.0/...` signed with the DTAPI HMAC triplet against the **Threat Visualizer host**.
Signature parsing was accepted; authorisation was denied. The capture is consistent with two causes,
which the lab must separate:

1. **Permission**: the API token's account lacks the Darktrace/EMAIL "Email Logs" permission (and, for the
   action, the response/actioning permission). This is the cause the instance documentation names.
2. **Host**: in this deployment Darktrace/EMAIL lives on a separate hostname. A token issued on the
   Visualizer may not be authorised (or may not be routed) for the email instance.

What the MCP needs, in order:

- A separately configurable email base URL (default: the Visualizer URL, so single-host deployments keep
  working) and, if the lab shows it is required, a separate email token pair. Same HMAC signing scheme.
- A token whose account has the "Email Logs" permission; the blocked action additionally needs the email
  actioning permission. This is an operator prerequisite to document, not something the server can fix.
- Only the public `/agemail/api/ep/api/v1.0/*` prefix. The MCP must never replay console cookies or the
  anti-forgery header, and must never call the internal `/agemail/log/*` UI routes.
- Optional `locale` stays unset (defaults to English) unless an operator asks for it.

Lab validation recipe (read-only): with a token that has "Email Logs", call
`GET /agemail/api/ep/api/v1.0/resources/filters` (a) on the Visualizer host and (b) on the email host.
200/200 means permission was the only cause; 403/200 means a separate email URL is required.

## 3. Endpoints: instance inventory vs the catalogue

The instance Swagger lists 39 operations under `/v1.0` (one under `/v1.1`). All 14 catalogue email
operations (13 reads + the blocked action) are present with **identical paths**; none is renamed.
Response shapes for the public routes were **not** observed (the console does not call them); section 4
gives the shapes of the internal routes that back the same screens, as the best available evidence.

### 3.1 Catalogue operations (present on the instance)

| Catalogue operation | Method + public path (`/agemail/api/ep/api/v1.0`) | Instance | Closest console route observed |
| --- | --- | --- | --- |
| `..._admin_decode_link` | GET `/admin/decode_link` | present (model `UnlockedLink`) | none |
| `..._dash_action_summary` | GET `/dash/action_summary` | present | none (dashboard not opened) |
| `..._dash_dash_stats` | GET `/dash/dash_stats` | present | none |
| `..._dash_data_loss` | GET `/dash/data_loss` | present | none |
| `..._dash_user_anomaly` | GET `/dash/user_anomaly` | present | none |
| `..._emails_uuid` | GET `/emails/{uuid}` | present (models `EmailDetails`, `EmailDetailsRecipient`, `EmailDetailsRecipientWithSummary`) | POST `/agemail/log/entries_levels`, GET `/agemail/log/message` |
| `..._emails_uuid_download` | GET `/emails/{uuid}/download` | present | GET `/agemail/log/message` (stored-object index) |
| `post_..._emails_search` | POST `/emails/search` | present (models `SearchRequest`, `FilterLogic`) | POST `/agemail/log/entries`, POST `/agemail/log/entries/binned` |
| `..._resources_actions` | GET `/resources/actions` | present (model `Action`) | GET `/agemail/log/action_tree` |
| `..._resources_filters` | GET `/resources/filters` | present (model `ApiFilter1.0`); a **v1.1** variant also exists | GET `/agemail/log/display` (field dictionary) |
| `..._resources_tags` | GET `/resources/tags` | present (model `Tag`) | GET `/agemail/log/tags/{n}`, GET `/agemail/log/tag_categories` |
| `..._system_audit_events` | GET `/system/audit/events` | present (model `AuditEvent`) | GET `/agemail/log/audit_events` |
| `..._system_audit_eventTypes` | GET `/system/audit/eventTypes` | present (model `AuditEventType`) | GET `/agemail/audit/types` |
| `post_..._emails_uuid_action` (blocked) | POST `/emails/{uuid}/action` | present (models `ActionRequest`, `Action`) | none (no manual action was taken in the capture) |

### 3.2 On the instance but not in the catalogue (25)

- Dashboard reads (12): `GET /dash/action_breakdown`, `/dash/action_data`, `/dash/active_identities`,
  `/dash/campaign_data`, `/dash/data_loss_breakdown`, `/dash/data_loss_data`, `/dash/domains`,
  `/dash/non_productive`, `/dash/non_productive_breakdown`, `/dash/threat_breakdown`, `/dash/threat_data`,
  `/dash/user_interactions`.
- Search: `GET /emails/search` (a GET form next to the POST one).
- Configuration reads: `GET /config/active_mailboxes`, `GET /flags` (models `Flag`, `EmailFlag`),
  `GET /groups`, `GET /groups/{group_id}/config`.
- Link analysis: `GET /nlink/analyse` (models `NLinkAnalyseResponse(s)`).
- Add-in reporting (POST used as a query, read-only by summary): `/addin_config/context_binned`,
  `/addin_config/context_grouped`, `/addin_config/context_records`, `/addin_config/on_send_binned`,
  `/addin_config/on_send_grouped`, `/addin_config/on_send_records`.
- `GET /v1.1/resources/filters` (model `ApiFilter1.1`).

Other schema components named by the instance: `CountStartEnd`, `NBins`, `StartEndBins`,
`DecisionCode`, `DecisionCodesArray`, `StatusCode`, `ErrorMessage`, `Context*`/`OnSend*` request and row
models. The time-window models suggest dashboard and add-in reads accept `start`/`end` (and `n_bins`)
windows, not only the SDK's `days`.

### 3.3 Console-only routes seen (internal, not for the MCP)

`/agemail/accounts`, `/agemail/actionflows/{n}`, `/agemail/api/v1.0/campaigns/list`,
`/agemail/api/v1.0/supported_languages`, `/agemail/audit/types`, `/agemail/config/digest_report_job`,
`/agemail/darktrace/config`, `/agemail/groups` (+ `/{n}`, `/{n}/members`, `/action_status/{n}`,
`/config/{n}`, `/exclude_from_dash`, `/model_references`), `/agemail/lists`, `/agemail/log/*`
(`action_tree`, `audit_events`, `display`, `email_comments`, `email_preview/{uuid}`, `entries`,
`entries/binned`, `entries_levels`, `event_history`, `link_event_history`, `message`, `rarity`,
`tag_categories`, `tags/{n}`, `tags/entries`), `/agemail/messages` (+ `/types`), `/agemail/web/country_codes`,
`/darktrace-email-respond/modules` and `/darktrace-email-respond/module/<integration>/v1.0/action/{uuid}`.
Note `POST /agemail/log/tags/entries` (`tag_id`, `uuid`, `dtime`) is a **write** (tags a message) issued by
the UI.

## 4. Observed shapes (key paths and types only)

Notation: `a.b[]` is an array element; `<key>` is a map key collapsed by the summariser (identifiers,
addresses, field names in a dictionary). All values were dropped.

### 4.1 Envelope and errors

Internal routes wrap results as `{ result: number, reply: ... }`. A failure can come back as **HTTP 200**
with `{ result: number, error: string }` (seen on `email_preview`). If the public API shares the envelope,
the client must treat a body with `error` (or a non-success `result`) as a failure even on 200, and views
must unwrap `reply`.

### 4.2 Identifiers and time

- A message id is `<uuid>.<n>` (a UUID plus a dot and an integer instance suffix) everywhere it appears in
  paths, query (`uuid`) and bodies. The catalogue's `{uuid}` path parameter must accept that suffix.
- Times appear in three forms: epoch **milliseconds** (`start`, `end`, `dtime` in query and in search
  bodies), epoch seconds with a fraction (`dtime` in the tag write), and `YYYY-MM-DD HH:MM:SS.ffffff`
  strings (`dtime`, `start`, `end` in the detail lookup). Records carry both `dtime` (string) and
  `dtime_unix` (number).

### 4.3 Search (analogue of POST `/emails/search`): POST `/agemail/log/entries`

Request body keys: `start: number`, `end: number`, `page_query: boolean`, `full: boolean`,
`context: string` (seen value `rcpts`), `tags: array`, `page_token: string`, `locale: string`,
`advanced_logic: object` which is either a leaf `{ field: string, operator: string, value: string[] }`
or a node `{ left: <logic>, operator: string, right: <logic> }`. Observed operators: `=` for leaves,
`AND` for nodes. Filter field names are table-prefixed (e.g. `trans_...`, `trans_q_...`).
The binned variant adds `scheme: string` (`log-2`), `height: number`, `n_bins: number`, `direction: string`.

Response: `reply.transactions` (map keyed by message id, or array), `reply.next_token: string`,
`reply.restricted_view: boolean`, `reply.grouped: array`, `reply.rcpts: array`, `reply.links: array`.
Per transaction:

- metadata: `uuid: string`, `dtime: string`, `dtime_unix: number`, `direction: string`,
  `message_type: string`, `transaction_status: string`, `in_progress: boolean`, `has_chain: boolean`,
  `max_model_score: number`, `n_links: number`, `n_attachments: number`, `num_comments: number`,
  `is_user_report: boolean`, `actions: string[]`, `actions_modified: boolean`, `tags: array`,
  `provider: null`, `airt_email: null`, `post_status: null`
- sensitive: `hfrom: string`, `header_from_email: string`, `header_subject: string`
- `rcpt_m[]`: `rcpt_to: string` (sensitive), `alias`, `rcpt_status: string`, `context_status: string`,
  `actioned_status: string|null`, `invalid`, `expired`, `is_read: string`, `read_unix_ms: number`,
  `quarantined`, `quarantined_and_delivered`, `quarantine_release`, `quarantine_released_dtime`,
  `requested`, `released`, `rejected`, `rcpt_actions_taken: string[]`, `rcpt_action_array: string[]`,
  `actions_modified`, `retrospective`, `restricted`, `is_forwarded`, `was_forwarded`, `forwarded_from`,
  `forwarded_to`, `original_uuid`, `forwarded_uuid`, `delivery_warning`, `actionable_rcpt`,
  `action_status: boolean`, `is_group`, `is_user_reported`, `tagIntent: string[]`, `destination`,
  `send_original: string`

Observed enumerations: `direction` in {`inbound`, `outbound`, `internal`}; `transaction_status`
`delivered`; `rcpt_status`/`context_status` in {`delivered`, `invalid`}; `message_type` `email`.

### 4.4 Message detail (analogue of GET `/emails/{uuid}`): POST `/agemail/log/entries_levels`

Request: `uuid`, `rcpt_to` (sensitive), `start`, `end`, `raw_narrative: boolean`, `advanced_logic`,
`locale`. Response: `reply.transactions[]` (about 580 top-level fields per message), `reply.grouped[]`,
`reply.rcpts[]`, `reply.summary.<key>[]` (`type`, `value`, `values[]{type, value, action, action_target,
advanced_filter, tooltip, style}`, `category_id`, `category`, `display`, `level`), `reply.saas_events`,
`reply.submatches`, `reply.entries_levels`.

Field families in a detail record (names only):

- Safe for analysts: `uuid`, `dtime`, `dtime_unix`, `direction`, `message_type`, `transaction_status`,
  `max_model_score`, `max_context_score`, `model_collision_score`, `campaign_id`, `campaign_id_visible`,
  `campaign_status`, `campaign_severity`, `inducement_phishing|spam|solicitation|extortion|general`,
  `inducement_derived_topic`, `prompt_injection_score`, `n_links`, `n_uniq_links`, `n_attachments`,
  `has_links`, `has_attachments`, `is_signed`, `spf`, `dkim`, `dmarc_result` (in authentication rows),
  `header_from_domain`, `envelope_domain`, `rcpt_to_domain` (recipient rows), `header_freemail`,
  `env_freemail`, `bulk_sender`, `detected_language`, `sensitivity_label`, `actions_taken`,
  `original_actions`, `gateway_miss`, `tags`, the `*_on_watchlist` flags, spoof scores
  (`spoof_*_score`), rarity scores (`*_rarity`), `asn_reputation_score`, `geo_asn`, `country`.
- Sensitive (never in a view): `header_subject`, `subject_skeleton*`, `subject_with_identity_removed`,
  `header_from`, `header_from_email`, `header_from_user`, `header_from_personal*`, `header_to`,
  `header_to_addresses`, `header_cc_addresses`, `envelope_sender`, `envelope_address`, `rcpt_to`,
  `rcpts[]`, `headers_raw`, `headers_json`, `header_m[]` (`headerkey`/`headerval`), `link_m[]`,
  `link_replace_m[]`, `attachment_all_m[]` (file names), `emails_in_body_m[]`, `phone_numbers_in_body_m[]`,
  `financial_details_in_body_m[]`, `images_m[]`, `job_title`, `department`, `derived_name`, `personal`,
  `spoof_external_name_addresses`, `spoof_similar_internal_name_addr`, `subject_spoof_internal_addresses`,
  `user_report_email`, `header_resent_from_email`, `unsub_email`, `unsub_link`, `hs_sender_email`,
  `hs_reply_to_email`, `message_id`, `remote_ip`, `external_received_ips`, `greeting`, `last_response`,
  `deny_reply`, `helo_host`.
- Per-action ledger: `policy_actions_m.<action>[]` with `uuid`, `pbid`, `dtime`, `policy_id`,
  `proactive`, `automatic_actions`, `action`, `enacted`, `enum`, `blocked_by_false_positive`,
  `blocked_by_counter`, `blocked_by_severity`, `blocked_by_action_flow`, `severity_user`,
  `severity_group_id`, `rid`, `original_action`, `linkhash`, `pnum`, `headerkey`.

### 4.5 Stored objects (analogue of GET `/emails/{uuid}/download`): GET `/agemail/log/message`

Query `uuid`, `locale`. Response `reply.data.<key>` with `uuid`, `dtime`, `type`, `flag: number`,
`size: number`, `size_f: number`, `path: string`, `location: string`, `rcpt_to: string|null`, `pnum`,
`expires: string`, `attachment_name`; plus `reply.restricted_view: boolean`. The raw message is held as
a stored object with an expiry; the public download returns bytes, which the tool layer already reduces
to size and SHA-256.

### 4.6 Audit (analogues of GET `/system/audit/events` and `/eventTypes`)

- `GET /agemail/log/audit_events` (query `uuid`, `dtime`, `hide_system`, `locale`):
  `reply[]` with `ms_ts: number`, `event: string`, `fstring: string`, `arguments: string`,
  `account_id: number`, `provider: string`, `tid: number`. `fstring`/`arguments` are a format string and
  its arguments and can embed user names and addresses: sensitive.
- `GET /agemail/audit/types`: `reply[]` with `type_id: number`, `label: string`,
  `email_uuid_index: number|null`, `email_filter: boolean`, `email_event: boolean`.

### 4.7 Tags (analogue of GET `/resources/tags`)

`GET /agemail/log/tags/{n}`: `reply[]` with `tag_id`, `name`, `owner`, `owner_name` (sensitive),
`created`, `ispublic`/`is_public`, `is_reserved`, `flagger_account_id`, `tagged_dtime`, `n_tagged`,
`min_date`, `max_date`. `GET /agemail/log/tag_categories`: `reply[]` with `category`, `catid`, `order`.

### 4.8 Filters dictionary (analogue of GET `/resources/filters`)

`GET /agemail/log/display`: `reply.fields.<table>.<column>.actions[]` with `type`, `source`,
`readable`, `parameter`, about 28 tables (`transactions_m`, `rcpt_m`, `link_m`, `attachment_all_m`,
`authentication_headers_m`, `chain_m`, ...). Action `type` values: `filter`, `group`, `spoofs`, `view_profile`. These
are UI pivots, not email actions.

### 4.9 Other shapes worth keeping

- Campaigns (internal `GET /agemail/api/v1.0/campaigns/list`, query `start`, `end`, `limit`, `offset`,
  `sort`, `sort_asc`, `risk_score_min`, `risk_score_max`, `inc_single_rcpt`): `campaigns[]` with
  `campaign_id`, `campaign_id_visible`, `dtime_start_unix`, `dtime_end_unix`, `campaign_status`,
  `campaign_severity`, `campaign_risk_score`, `detection_type`, `threat_types[]`,
  `retrospective_actioning_triggered`, `unique_rcpts_in_campaign_count`, `first|middle|last_anomaly_score`,
  `finished`, `trigger_dtime`, `campaign_response`, `has_list_additions`, `unique_rcpts[]` (sensitive),
  `max_time_to_retrospective_rcpt_to` (sensitive); `next_offset: number`. The public equivalent is
  `GET /dash/campaign_data`.
- Event history (`POST /agemail/log/event_history`, body `uuid`, `dtime`, `rcpt`, `locale`):
  `reply.code`, `reply.read`, `reply.received`, `reply.deleted`, `reply.events[]`.

## 5. The action endpoint (POST `/emails/{uuid}/action`, blocked)

Request schema: the instance names it `ActionRequest` (with `Action` as the item model) but the saved page
did not expand it, and the capture contains no manual action, so **field names are not confirmed**. Keep
the body blocked until the live spec (section 7) gives `ActionRequest`.

Action vocabulary observed (`GET /agemail/log/action_tree`, grouped per area from no action to strongest):

| Area | Tier 0 | Tier 1 | Tier 2 |
| --- | --- | --- | --- |
| delivery | `deliver` | `moveToFolder`, `moveToJunk` | `hold`, `setMdoVerdict` |
| link | `noAction` | `hashAllLinks`, `hashLink` | `replaceAllLinks`, `doubleLockAllLinks`, `doubleLockLink`, `replaceLink` |
| attachment | `noAction` | `convertAllAttachments`, `convertAttachment` | `stripAllAttachments`, `stripAttachment` |
| header | `noAction` | `addHeader`, `removeHeaderWithKey`, `regexpReplaceInHeader`, `regexpReplaceInAllHeaders`, `prependSubjectLine`, `appendSubjectLine`, `replaceHeader`, `changeFrom` | |
| add-in delivery | `deliver` | `addInWarn` | |

Also recorded on messages (`actions`, `rcpt_actions_taken`, `rcpt_action_array`): `notify`, `tagIntent`,
`incrementCounter`, `incrementRcptCounter`, plus `moveToJunk`, `hold`, `hashLink`, `hashAllLinks`,
`doubleLockLink`. Recipient state fields (`quarantined`, `quarantine_release`, `released`, `requested`,
`rejected`, and the detail counters `manual_hold_*_count`, `manual_release_*_count`) show that manual
**hold** and **release** exist; `release` itself was not seen as an action string.

Reversibility (for the MCP's tiering):

| Action | Reversible? | Reasoning |
| --- | --- | --- |
| `hold` | Yes, while held | Undone by release within retention; nothing reaches the user. Still critical (blocks business mail). |
| release (manual) | **No** | Delivers the message; the user can read or click it. Irreversible exposure. |
| `moveToJunk`, `moveToFolder` | Partly | The user or an admin can move it back; the exposure state changed. |
| `deliver` | No | Delivery cannot be withdrawn by this API. |
| `hashLink`, `replaceLink`, `doubleLock*`, `*Attachment*`, header changes | No | Rewrites the delivered copy. |
| `setMdoVerdict` | Unknown | Pushes a verdict to Microsoft Defender for Office 365; reversal depends on that system. |
| `notify` | No | Sends a notification. |
| `addInWarn`, `tagIntent`, counters | Metadata | No mailbox effect. |

Recommendation: if the action is ever unblocked, allowlist only `hold` and release, keep both in the
critical tier, treat release as irreversible, and require the reviewed `ActionRequest` schema first.

## 6. Recommendations

### 6.1 `src/api/email-views.ts` (not changed here; candidate edits for a later, lab-validated PR)

- Every view: accept the internal envelope as a variant (`{ result: number, reply: <view> }`) until the lab
  shows the public shape, and fail closed on a body that carries `error`.
- `MESSAGE_META` (search + detail): keep `uuid`, `dtime`, `direction`, `actions`, `tags`; add
  `dtime_unix: number`, `message_type: string`, `transaction_status: string`, `in_progress: boolean`,
  `max_model_score: number`, `n_links: number`, `n_attachments: number`, `actions_modified: boolean`,
  `is_user_report: boolean`, `has_chain: boolean`, `campaign_id_visible: string`,
  `header_from_domain: string`, `envelope_domain: string`; add a recipient-status list
  `rcpt_m[]` restricted to `rcpt_status`, `actioned_status`, `quarantined`, `released`,
  `rcpt_actions_taken: string[]` (no `rcpt_to`). Drop the never-seen guesses `sender_domain`,
  `from_domain`, `recipient_domain(s)`, `to_domains`, `verdict`, `model_score`, `score`, `time`,
  `timestamp`, `id` once the lab confirms the public names.
- Message detail: keep `subject` out by default. The capture shows the subject as `header_subject`; if the
  detail view keeps a subject, it must be `header_subject` and remain sensitive-only.
- Search listing wrapper keys: add `transactions` and `next_token`; the internal map-keyed form
  (`transactions.<uuid>`) needs an object-of-items variant.
- `AUDIT_EVENT`: add `ms_ts: number`, `event: string`, `tid: number`, `provider: string`; keep `fstring`
  and `arguments` out (they embed names and addresses).
- Event types: add `type_id: number`, `label: string`, `email_event: boolean`, `email_filter: boolean`.
- Tags: add `tag_id: number`, `n_tagged: number`, `is_reserved: boolean`, `is_public: boolean`; keep
  `owner_name` out.
- Actions reference: add `type`, `source`, `readable` only if `/resources/actions` uses them; the action
  names above are the expected values.

### 6.2 Catalogue generator (`scripts/generate-catalogue.ts`, `openapi/darktrace-sdk.yaml`)

- `{uuid}` path parameter: pattern `^[0-9a-fA-F-]{36}(\.[0-9]+)?$` (UUID with optional instance suffix).
- `locale`: optional enum `en_US | ja_JP | es` on every email operation (query, or body for POSTs); the
  MCP may omit it.
- Dashboard reads: `days`/`limit` come from the SDK and are unverified; the instance models
  (`CountStartEnd`, `StartEndBins`, `NBins`) indicate `start`/`end` epoch-millisecond windows. Add them as
  candidates, validate on the lab, then pin.
- Search body: replace the free-form object with a typed `SearchRequest` once the live spec is pinned.
  Expected keys from the console: `start`/`end` (epoch ms), a filter tree (`field`, `operator`, `value[]`
  or `left`/`operator`/`right`), `tags`, a page token. Free-form `advanced_logic` must stay off until the
  allowed `field` names are pinned (they reach every column, including subjects and addresses).
- Audit events: SDK `eventType`/`limit`/`offset` are unverified; keep them, add nothing until lab-checked.
- Inventory: add the 25 missing instance operations to the catalogue as `excluded` (with reason "not
  reviewed") so coverage is explicit; candidates for later reads are the dashboard breakdowns,
  `GET /groups`, `GET /flags` and `GET /v1.1/resources/filters`.

### 6.3 Pinned per-version email schema digest

The SDK pins nothing about responses, so the email `schemaSha256` today only fingerprints the SDK's
request-side description. Replace it with a digest of the **instance's own OpenAPI document** (the JSON
behind `/agemail/api/api-docs`), fetched on the lab with an authorised token, and compute it as:

1. Take `info.version` (observed `1.0.0`) and the Darktrace/EMAIL product version as `schemaVersion`.
2. For each catalogue operation: the path item under `/v1.0` (and `/v1.1` where used), keeping only
   `method`, path template, `parameters[]` (`name`, `in`, `required`, `schema`), `requestBody` schema and
   the `200` response schema; drop `summary`, `description`, `example(s)`, `tags`, `operationId`.
3. Add every `components.schemas` entry reachable from those (at least `EmailDetails`,
   `EmailDetailsRecipient`, `EmailDetailsRecipientWithSummary`, `SearchRequest`, `FilterLogic`,
   `ActionRequest`, `Action`, `ApiFilter1.0`, `ApiFilter1.1`, `AuditEvent`, `AuditEventType`, `Tag`,
   `UnlockedLink`, `StatusCode`, `ErrorMessage`, `CountStartEnd`), with the same stripping.
4. Canonical JSON (sorted keys, no whitespace), SHA-256 per operation plus one digest over the whole set.

A digest mismatch at startup should keep the email tools in their current fail-closed state. Store the
pinned spec subset in `openapi/` only after confirming it contains no instance data (examples are
stripped in step 2-3 for that reason).

## 7. Open items for the lab

1. Section 2.3 host/permission test with an "Email Logs" token.
2. Fetch the instance OpenAPI JSON, pin it (section 6.3), and read `ActionRequest`, `SearchRequest`,
   `EmailDetails` field lists.
3. One call per catalogue read to confirm the envelope (`reply` or bare) and the field names in 6.1.
4. Confirm `{uuid}` accepts the `.n` suffix on the public routes.
