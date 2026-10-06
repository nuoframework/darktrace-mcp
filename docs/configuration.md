**English** · [Español](es/configuration.md)

# Configuration

[README](../README.md) · [Getting started](getting-started.md) · [Clients](clients.md) · [Troubleshooting](troubleshooting.md)

The setup wizard writes all of this for you. Read this page to change settings by hand.

The server reads settings from **environment variables** and, optionally, a **JSON config file**. Environment variables win over the file. Unknown `DARKTRACE_*` variables and unknown JSON fields stop startup, so typos are caught. The server does not read `.env` files.

## Connection and credentials

| Variable | JSON field | Default | Notes |
|---|---|---|---|
| `DARKTRACE_URL` | `instance.baseUrl` | — (required) | HTTPS origin only, for example `https://darktrace.example.internal`. No path, query or user info |
| `DARKTRACE_PUBLIC_TOKEN_FILE` | `auth.publicTokenFile` | — (required) | Absolute path to a file with the public token |
| `DARKTRACE_PRIVATE_TOKEN_FILE` | `auth.privateTokenFile` | — (required) | Absolute path to a file with the private token |
| `DARKTRACE_TOKEN_FILE_OWNER` | `auth.tokenFileOwner` | `current` | Who may own the token files. `root-or-current` also accepts root (uid 0); only for Docker Desktop, see below |
| `DARKTRACE_CONFIG_FILE` | — | none | Absolute path to the JSON config file |
| `DARKTRACE_DATE_FORMAT` | `auth.dateFormat` | `compact` | Signature date format. Alternative: `spaced` |
| `DARKTRACE_QUERY_SIGNATURE_ENCODING` | `auth.querySignatureEncoding` | `unencoded` | Alternative: `encoded`. No automatic fallback |
| `DARKTRACE_DESTINATION_ALLOWLIST` | `instance.destinationAllowlist` | none | Comma-separated IPs the URL may resolve to. Exact IPs, no CIDR |
| `NODE_EXTRA_CA_CERTS` | — | none | PEM file with your private CA. Read by Node at startup |

`DARKTRACE_BASE_URL` is an old name for `DARKTRACE_URL`. If both are set to different values, startup fails.

### Token files

Each token file must:

- be a regular file (not a symlink), at most 4 KiB;
- be owned by the user that runs the server;
- have mode `0600` or `0400`;
- contain only the token, optionally followed by one newline.

**Docker Desktop (macOS and Windows).** Bind-mounted files appear inside the container as owned by root (uid 0), whatever their owner on the host, so the default check refuses them. Set `DARKTRACE_TOKEN_FILE_OWNER=root-or-current` (or `"auth": {"tokenFileOwner": "root-or-current"}`) to also accept root-owned token files. Every other check still applies: regular file, no symlink, 4 KiB cap and an owner-only mode. The server writes `{"event":"token_file_owner_relaxed"}` to stderr at startup while this is on. It is an operator setting; the model cannot change it. Leave it at `current` on Linux, where bind mounts keep the host owner. `darktrace-mcp setup` adds it automatically only for the Docker runtime on macOS and Windows.

```sh
chmod 600 ~/.config/darktrace-mcp/public-token ~/.config/darktrace-mcp/private-token
```

`DARKTRACE_PUBLIC_TOKEN` and `DARKTRACE_PRIVATE_TOKEN` (token values in the environment) also work, for secret managers that inject them. Prefer files. Never set a value and a file for the same token.

### Signature date format

Every request is signed with an HMAC over the path, the public token and a `DTAPI-Date` header. Darktrace appliances accept that date in one of two formats, set with `DARKTRACE_DATE_FORMAT` (or `auth.dateFormat`):

| Value | `DTAPI-Date` looks like |
|---|---|
| `compact` (default) | `20261006T081500` (`YYYYMMDDTHHMMSS`) |
| `spaced` | `2026-10-06 08:15:00` (`YYYY-MM-DD HH:MM:SS`) |

Appliances on the same version can differ. On two Darktrace 7.1.0 appliances, one accepted both formats and the other rejected `compact` with HTTP 400 (`bad_request`) on `GET /status` and accepted `spaced`.

The server never switches format at runtime: it does not retry with the other format after a 400 or 401, so a signing problem can never turn into a silent mode change. The choice is made at install time:

- `darktrace-mcp setup` sends a signed `GET /status` with `compact` and, only if the appliance answers HTTP 400, once more with `spaced`. It writes the accepted format as `DARKTRACE_DATE_FORMAT` into every client entry and into `setup.json`. If neither works it stops before writing anything. `--date-format compact|spaced` skips this check; `--dry-run` and `--offline` skip it and use the saved format or `compact`.
- `darktrace-mcp test` (or `doctor --online`) does the same retry only when you did not set a format yourself, and then tells you which value to set. When the format is set (environment, config file or saved setup), it does not retry and suggests the other value instead.
- `darktrace-mcp config <client>` reuses the saved format.

## Profiles

Profiles decide which tools the model sees and can call. Set them with a comma-separated list:

| Variable | JSON field | Default |
|---|---|---|
| `DARKTRACE_PROFILES` | `profiles` object (see [older variables](#older-variables)) | `read` |

| Profile | Allows | Safety |
|---|---|---|
| `read` | Normal reads: devices, model breaches, AI Analyst, Antigena list, tags, models, metrics, status | — |
| `sensitive` | Reads that can return raw content: Advanced Search, email content and search, PCAP download, email audit events | — |
| `write` | Medium and high changes: acknowledge, comment, pin, tags, device labels, PCAP requests, AI Analyst investigations | Add `dryRun:true` to a call to preview it without changing anything |
| `critical` | Antigena/RESPOND actions, intel feed, subnets, deleting a tag | Runs only after a `dryRun:true` preview, repeated with `confirm:true` and its `previewId` (valid 5 minutes, once), and (by default) after you accept the server's confirmation dialog. See [human approval](#human-approval). The email action is listed but not available in this release |
| `all` | All of the above | Same rules per operation. Needs `DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE=true` (see below) |

Turning on `sensitive` and `write` together (including `all`) lets data read from the appliance flow into
free-text fields of writes (comments, tag descriptions, intel entries). Startup refuses this combination
unless you also set `DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE=true` (JSON `profiles.acknowledgeSensitiveWrite`).
The server then logs a `sensitive_write_acknowledged` notice and the affected tool descriptions warn the model.

Examples:

```sh
export DARKTRACE_PROFILES=read
export DARKTRACE_PROFILES=read,sensitive
export DARKTRACE_PROFILES=read,write
export DARKTRACE_PROFILES=all
```

Good practice:

- Start with `read`. Add more only when you need it.
- Only give `critical` to people who could take the same action in the Darktrace UI.
- `confirm:true` should come from you, the user, after reading the preview. Do not tell the model to always confirm.
- Every preview, refusal and write writes an audit line (JSON with `"audit":true`, including the arguments digest `argsHash` and the `approvalMode`) to the server's stderr log.
- If a write times out, its result is unknown. Check the appliance before you try again. Writes are never retried automatically.
- After three failed or unknown writes in a row the server stops all writes until it is restarted. Reads keep working.

### Protected targets

| Variable | JSON field | Default |
|---|---|---|
| `DARKTRACE_PROTECTED_TARGETS` | `policy.protectedTargets` (array) | none |

A comma-separated list of identifiers the server must never change: device ids (`did`), subnet ids or
networks, tag ids or names, entity values. Matching is exact. High-impact and critical writes that name a
protected identifier are refused before any preview (`target_denied`). Each write also has a fixed maximum
number of targets per call (for example 5 for Antigena actions, 20 intel feed entries, 1 subnet or device);
larger calls are refused (`blast_radius_exceeded`). The full table is in
[CHANGES-core](CHANGES-core.md#86-target-policy-and-blast-radius).

```sh
export DARKTRACE_PROTECTED_TARGETS=1,42,10.0.0.0/24,Domain Controllers
```

### Human approval

Who confirms a write before it reaches the appliance:

| Variable | JSON field | Values | Default |
|---|---|---|---|
| `DARKTRACE_CRITICAL_APPROVAL` | `profiles.criticalApproval` | `elicitation`, `host` | `elicitation` |
| `DARKTRACE_WRITE_APPROVAL` | `profiles.writeApproval` | `elicitation`, `host` | `host` |
| `DARKTRACE_ACKNOWLEDGE_HOST_APPROVAL` | `profiles.acknowledgeHostApproval` | `true`, `false` | `false` |

- `elicitation`: the server itself asks you in a confirmation dialog (MCP elicitation). The dialog shows the operation, a digest of the arguments and every value (escaped). You must tick `approved`; nothing is sent otherwise. Decline, cancel, a closed dialog or no answer within 30 seconds (or before the preview expires) all mean no. If the values do not fit the dialog, the call is refused instead of showing a shortened summary. Only one dialog per session (four per server process) can be open at a time.
- `host`: the server relies on your client's own tool-permission prompt. Critical actions still need `confirm:true` with a valid `previewId`. This mode is weaker: an "always allow" rule for the tool approves every later call without showing you the values. For critical actions it needs `DARKTRACE_ACKNOWLEDGE_HOST_APPROVAL=true` at startup, and audit lines record `"approvalMode":"host"`.

The server only treats a client as able to show the dialog when the client says so at the protocol level. Tool arguments written by the model never count. There are two ways to say it:

- **Protocol 2025 clients** declare the `elicitation` capability in `initialize`. The server sends an `elicitation/create` request.
- **Protocol 2026-07-28 clients** (Claude Code, for example) have no `initialize`. They declare `elicitation` in the `_meta` envelope of each request. That revision has no server-to-client requests, so the server answers the call with an `input_required` result that carries the dialog. The client asks you and repeats the identical call with your answer. The server accepts that answer once, for that exact call, within 2 minutes, and only together with the signed state it issued; the preview must still be valid.

If the client declares no form dialog (for example no `elicitation`, or URL-only), critical actions are refused with `"errorCode":"approval_unavailable"`. The hint says that the host cannot show the dialog and names `DARKTRACE_CRITICAL_APPROVAL=host`. Per-client advice: [client setup](clients.md#claude-code).

### Older variables

These still work and map onto profiles. When `DARKTRACE_PROFILES` is also set, they may only agree with it or narrow it: `DARKTRACE_SENSITIVE_READ=true` or `DARKTRACE_WRITE_CRITICAL=true` for a profile that is not in the list stops startup with `... conflicts with DARKTRACE_PROFILES`.

| Old setting | Same as |
|---|---|
| `DARKTRACE_SENSITIVE_READ=true` / `profiles.sensitiveRead: true` | adding `sensitive` |
| `DARKTRACE_WRITE_CRITICAL=true` / `profiles.writeCritical: true` | adding `critical` |
| `profiles.write: true` | adding `write` |

Which operation needs which profile: [tool reference](tools.md).

## Limits

You can only lower these. Values above the maximum stop startup.

| Variable | JSON field | Default and maximum |
|---|---|---:|
| `DARKTRACE_TIMEOUT_MS` | `instance.timeoutMs` | 30,000 ms per call |
| `DARKTRACE_MAX_RESPONSE_BYTES` | `limits.maxResponseBytes` | 2 MiB |
| `DARKTRACE_MAX_TOOL_INPUT_BYTES` | `limits.maxToolInputBytes` | 65,536 bytes |
| `DARKTRACE_MAX_TOOL_INPUT_DEPTH` | `limits.maxToolInputDepth` | 8 |
| `DARKTRACE_MAX_TOOL_INPUT_ELEMENTS` | `limits.maxToolInputElements` | 5,000 |
| `DARKTRACE_MAX_TOOL_OUTPUT_CHARS` | `limits.maxToolOutputChars` | 60,000 |
| `DARKTRACE_MAX_CONCURRENT_REQUESTS` | `limits.maxConcurrentRequests` | 4 |
| `DARKTRACE_MAX_QUEUED_REQUESTS` | `limits.maxQueuedRequests` | 16 |
| `DARKTRACE_MAX_PAGES` | `limits.maxPages` | 10 |
| `DARKTRACE_RATE_LIMIT_PER_MINUTE` | `limits.rateLimitPerMinute` | 120 |
| `DARKTRACE_MAX_GET_RETRIES` | `limits.maxGetRetries` | 2 (GET only) |
| `DARKTRACE_MAX_RETRY_AFTER_MS` | `limits.maxRetryAfterMs` | 2,000 ms |
| `DARKTRACE_MAX_WRITES_PER_MINUTE` | `limits.maxWritesPerMinute` | 10 writes per rolling minute (critical writes: 3) |

Queue, retries and retry delay accept `0`. All other limits start at 1.

## Config file

Instead of many environment variables, you can use one JSON file. Start from [operator.config.json](../examples/operator.config.json):

```json
{
  "instance": { "baseUrl": "https://darktrace.example.internal", "timeoutMs": 30000 },
  "auth": {
    "publicTokenFile": "/absolute/private/darktrace/public-token",
    "privateTokenFile": "/absolute/private/darktrace/private-token"
  },
  "profiles": { "read": true, "write": false, "sensitiveRead": false, "writeCritical": false },
  "transport": { "kind": "stdio" }
}
```

```sh
chmod 600 /absolute/private/darktrace/operator.json
export DARKTRACE_CONFIG_FILE=/absolute/private/darktrace/operator.json
darktrace-mcp --check-config
```

The file follows the same rules as token files (owned by you, `0600`, no symlink), with a 64 KiB size limit.

## Commands

| Command | What it does | Network |
|---|---|---|
| `darktrace-mcp` | Starts the MCP server on stdio. Your client runs this | Yes |
| `darktrace-mcp setup` | Interactive wizard: URL, tokens, profile, clients | No |
| `darktrace-mcp config <client>` | Prints the config snippet, or a one-click link for `vscode` and `cursor` | No |
| `darktrace-mcp remove` | Removes the server from configured clients | No |
| `darktrace-mcp test` | One `GET /status` call to check URL, tokens, clock and TLS | Yes |
| `darktrace-mcp --check-config` / `doctor` | Checks settings and token files | No |
| `darktrace-mcp --help` / `--version` | Help and version | No |

Credentials are never accepted as command-line arguments.

## Network and TLS

- TLS certificate checks are always on. There is no setting to turn them off.
- For a private CA, set `NODE_EXTRA_CA_CERTS=/absolute/path/ca.pem`.
- Proxy variables (`HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY`, `NO_PROXY`, lowercase forms, `NODE_USE_ENV_PROXY`) stop startup. The server talks directly to the appliance. See [troubleshooting](troubleshooting.md#proxy-variables-are-rejected).
- `NODE_TLS_REJECT_UNAUTHORIZED=0`, `SSL_CERT_FILE`, `SSL_CERT_DIR` and `OPENSSL_CONF` also stop startup.
- The server only connects to the configured URL. DNS is resolved once at startup. NAT64, 6to4 and Teredo addresses are refused.

## Not supported

HTTP transport (stdio only), export to disk, and more than one appliance per server process. Run one server entry per appliance if you have several.
