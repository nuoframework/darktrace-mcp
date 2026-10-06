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

```sh
chmod 600 ~/.config/darktrace-mcp/public-token ~/.config/darktrace-mcp/private-token
```

`DARKTRACE_PUBLIC_TOKEN` and `DARKTRACE_PRIVATE_TOKEN` (token values in the environment) also work, for secret managers that inject them. Prefer files. Never set a value and a file for the same token.

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
| `critical` | Antigena/RESPOND actions, intel feed, subnets, email actions, deleting a tag | Runs only when the call includes `confirm:true`. Otherwise it returns a preview |
| `all` | All of the above | Same rules per operation |

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
- Every write and critical call writes an audit line (JSON with `"audit":true`) to the server's stderr log.
- If a write times out, its result is unknown. Check the appliance before you try again. Writes are never retried automatically.

### Older variables

These still work and map onto profiles:

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
