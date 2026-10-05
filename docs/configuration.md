# Configuration

[README](../README.md) · [Clients](clients.md) · [Troubleshooting](troubleshooting.md)

This guide describes the private offline alpha baseline. Independent source review is complete; the enforced JSON-file ceiling is 65,536 bytes (64 KiB). Current Node 22/24 offline and packaging evidence is recorded in [release preparation](release-preparation.md). Appliance 7.1 compatibility, host/model-provider eligibility, real deployment-network validation and residual-risk decisions remain pending.

The server reads the operator environment and optional JSON via `DARKTRACE_CONFIG_FILE`. Environment settings override JSON fields; unknown JSON fields are rejected. It does not auto-load `.env`. Prefer protected JSON configuration and separate token files for server-validated file handling.

If an operator explicitly uses Node's `--env-file=/absolute/private/operator.env`, Node reads that file **before the server starts**. The server receives environment values and cannot validate the env file's owner, permissions, regular-file status, symlinks or size; the JSON/token file controls and their 64 KiB/4 KiB ceilings do not apply to it. The operator must protect and verify the env file externally, including operator ownership, mode `0600` and a trusted non-symlink location. It must contain **no token values**, only non-secret settings and `*_TOKEN_FILE` paths.

Node also applies Node-configuration variables from that file before server startup: `NODE_OPTIONS` can preload executable code, and `NODE_EXTRA_CA_CERTS` can extend TLS trust. Do not set either there unless explicitly reviewed; treat the file's integrity like executable code. This is trusted host configuration, not a server sandbox or a guarantee that startup checks can contain preloaded code. Policy settings in that file are trusted host environment, not server-validated file provenance. Do not evaluate it with shell `source`. `--check-config` validates the resulting settings and referenced JSON/token files, not the env file itself.

## Connection and credentials

| Environment variable | JSON field | Default / rule |
|---|---|---|
| `DARKTRACE_URL` | `instance.baseUrl` | Required HTTPS origin; no userinfo/path/query/fragment |
| `DARKTRACE_PUBLIC_TOKEN_FILE` | `auth.publicTokenFile` | Absolute private public-token file |
| `DARKTRACE_PRIVATE_TOKEN_FILE` | `auth.privateTokenFile` | Absolute private private-token file |
| `DARKTRACE_CONFIG_FILE` | — | Optional private JSON path; owner-only regular file, up to 65,536 bytes (64 KiB) |
| `DARKTRACE_DATE_FORMAT` | `auth.dateFormat` | `compact`; alternatively `spaced` |
| `DARKTRACE_QUERY_SIGNATURE_ENCODING` | `auth.querySignatureEncoding` | `unencoded`; alternatively `encoded`, selected explicitly, no fallback |
| `DARKTRACE_DESTINATION_ALLOWLIST` | `instance.destinationAllowlist` | Optional comma-separated unique canonical IPs; JSON array; CIDRs unsupported |
| `NODE_EXTRA_CA_CERTS` | — | Optional approved PEM path, read by Node at startup |

`DARKTRACE_BASE_URL` is a legacy alias for `DARKTRACE_URL`; if both are set to different values, startup rejects the conflict. Prefer the canonical name in new configurations.

Use two token files, each at most 4,096 bytes, owned by the process UID, mode `0600` or `0400` with no executable/special/group/other bits, regular and non-symlink. Secure no-follow opening is required; growing-file reads are bounded. Native Windows token/config-file checks currently fail closed: run Node in an approved Linux/WSL environment, using absolute Node/entrypoint/token/config paths from that environment and files owned by its runtime UID on a filesystem enforcing the required permissions. Do not disable or weaken these checks. Token contents must be valid UTF-8, nonempty and without surrounding whitespace or CR/LF, except one optional final LF. Errors omit token values.

Direct `DARKTRACE_PUBLIC_TOKEN` / `DARKTRACE_PRIVATE_TOKEN` and JSON `auth.publicToken` / `auth.privateToken` are supported for approved host secret injection, but file paths are preferred. Never combine a direct token and its corresponding file, and never put tokens in argv, checked-in client config, logs or chat. A secret manager may inject direct environment values if its handling and process exposure have been assessed. The public API token is still credential material.

The allowlist is operator-owned and only narrows allowed destinations. Empty JSON or environment allowlists are a startup configuration error. Private appliance networks are supported within destination validation rules. This setting does not certify DNS/TLS connectivity; inspect the implementation/audit evidence before deployment.

## Profiles and data eligibility

| Setting | JSON field | Behavior |
|---|---|---|
| `DARKTRACE_PROFILES=read` | `profiles.read=true`, `profiles.write=false` | Default read profile; read cannot be disabled |
| `DARKTRACE_PROFILES=read,write` | `profiles.write=true` | Eligible medium/high writes; each defaults to unsigned dry-run |
| `DARKTRACE_SENSITIVE_READ=false` | `profiles.sensitiveRead=false` | Default; eligible POST Advanced Search additionally requires explicit `true` |
| `DARKTRACE_WRITE_CRITICAL=false` | `profiles.writeCritical=false` | `true` requires write and exposes five critical previews only |

Model/client approval is not authorization. Medium/high execution requires the operator write profile and explicit tool `dryRun:false`, subject to appliance ACLs and audit gates. Critical execution remains permanently blocked; no `confirm` field exists. Email (all 14 operations), PCAP export, HTTP and unvalidated signing shapes are blocked. `export`/`email` profile fields are rejected even when false; omit them. Export settings, HTTP fields and production version overrides are unsupported.

**For any deployment**, evaluate organizational eligibility and host/provider processing, retention, residency and forwarding of appliance data. Read-only use still enters model context. Advanced Search needs additional sensitive-data assessment; opting in does not mean provider eligibility is accepted.

## Resource ceilings

Settings may only lower these ceilings. Integers normally start at 1; queue, retries and retry delay also permit 0.

| Environment variable | JSON field | Default / maximum |
|---|---|---:|
| `DARKTRACE_TIMEOUT_MS` | `instance.timeoutMs` | 30,000 ms total |
| `DARKTRACE_MAX_RESPONSE_BYTES` | `limits.maxResponseBytes` | 2,097,152 bytes (2 MiB), wire and decoded separately |
| `DARKTRACE_MAX_TOOL_INPUT_BYTES` | `limits.maxToolInputBytes` | 65,536 bytes |
| `DARKTRACE_MAX_TOOL_INPUT_DEPTH` | `limits.maxToolInputDepth` | 8 |
| `DARKTRACE_MAX_TOOL_INPUT_ELEMENTS` | `limits.maxToolInputElements` | 5,000 |
| `DARKTRACE_MAX_TOOL_OUTPUT_CHARS` | `limits.maxToolOutputChars` | 60,000 |
| `DARKTRACE_MAX_CONCURRENT_REQUESTS` | `limits.maxConcurrentRequests` | 4 |
| `DARKTRACE_MAX_QUEUED_REQUESTS` | `limits.maxQueuedRequests` | 16 |
| `DARKTRACE_MAX_PAGES` | `limits.maxPages` | 10 |
| `DARKTRACE_RATE_LIMIT_PER_MINUTE` | `limits.rateLimitPerMinute` | 120 attempts/minute |
| `DARKTRACE_MAX_GET_RETRIES` | `limits.maxGetRetries` | 2 retries for eligible safe GETs |
| `DARKTRACE_MAX_RETRY_AFTER_MS` | `limits.maxRetryAfterMs` | 2,000 ms |

A Retry-After above the configured ceiling prevents a retry; it is not shortened into an early retry. Queue/retry/page work shares the total deadline. POST/DELETE are never retried, including read-via-POST. After an uncertain mutation outcome, inspect appliance state/audit before a new authorized action. Per-process budgets do not provide aggregate limits across multiple processes.

## JSON example

Copy [operator.config.json](../examples/operator.config.json) to an absolute private path outside the checkout, adjust paths/origin and make it runtime-user-owned `0600`. Apply owner-only permissions before loading it:

```sh
chmod 600 /absolute/private/darktrace/operator.json
export DARKTRACE_CONFIG_FILE='/absolute/private/darktrace/operator.json'
node /absolute/path/to/darktrace-mcp/dist/src/index.js --check-config
```

The JSON file is bounded to 65,536 bytes (64 KiB), owned by the runtime UID, regular and opened without following symlinks; token files have a separate 4,096-byte (4 KiB) ceiling. File type, UID, mode and size must be checked on the opened descriptor, and reads remain bounded even if the file grows. Environment values still override JSON fields. The provided template contains no token values. Start with read-only and sensitiveRead false. `--check-config` and `doctor` validate this locally without a network probe. Supported CLI flags are `--help`, `--version`, `--check-config` and `doctor`; credential flags are rejected.

## TLS and ambient proxy environment

TLS verification is mandatory. Use `NODE_EXTRA_CA_CERTS`; there is no insecure mode. The baseline rejects ambient `HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY`, `NO_PROXY` and lowercase equivalents, even if empty, as well as `NODE_USE_ENV_PROXY` and bypass flags. If your host inherits them, use an operator-reviewed launcher that removes them **only for this server process**, for example on POSIX:

```sh
env -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u NO_PROXY \
  -u http_proxy -u https_proxy -u all_proxy -u no_proxy \
  -u NODE_USE_ENV_PROXY \
  /absolute/path/to/node /absolute/path/to/darktrace-mcp/dist/src/index.js --check-config
```

Do not change your system-wide proxy policy or use this as a way to bypass organizational network rules. Review ambient `NODE_OPTIONS`; the runtime operator is trusted and preloads can execute code. No setting can raise limits or turn a 7.1 version report into policy authorization.

## Container secret mounts

The optional Dockerfile pins the official `library/node:22-bookworm-slim` multi-platform manifest digest verified from the [Docker Hub registry manifest](https://registry-1.docker.io/v2/library/node/manifests/sha256:43ac6c60b8f89723f746e8a92ce91abd5017e627ce1ddfe4238355d3a30b772c) on 2026-10-05 (registry authentication may be required). Refresh it only after reviewed upstream validation. No image has been published and local Docker execution is unverified.

```sh
docker build -t darktrace-mcp:local .
docker run --rm -i --read-only --cap-drop=ALL \
  --security-opt=no-new-privileges --network=bridge \
  --user "$(id -u):$(id -g)" \
  --mount type=bind,src=/absolute/private/darktrace/public-token,dst=/run/secrets/public-token,readonly \
  --mount type=bind,src=/absolute/private/darktrace/private-token,dst=/run/secrets/private-token,readonly \
  -e DARKTRACE_URL=https://darktrace.example.internal \
  -e DARKTRACE_PUBLIC_TOKEN_FILE=/run/secrets/public-token \
  -e DARKTRACE_PRIVATE_TOKEN_FILE=/run/secrets/private-token \
  -e DARKTRACE_PROFILES=read -e DARKTRACE_SENSITIVE_READ=false \
  darktrace-mcp:local --check-config
```

Use a nonzero runtime UID; mounted files must be owned by that effective UID and retain owner-only permissions as seen inside the container. Docker Desktop ownership translations must be verified; never weaken file modes to work around them. The image defaults to nonroot UID 1000. Do not use Docker `--env-file` containing tokens, embed secrets in build args/layers, or publish this local image. Docker reads its env file outside the server; its owner, mode, symlinks and size are not server-validated either. An approved private CA can be mounted read-only with `NODE_EXTRA_CA_CERTS` pointing to it. Remove `--check-config` only when configuring an authorized host to own the stdio process; use `-i` without a TTY. Provider eligibility applies equally to container deployments.

## Output and destination boundaries

Runtime output uses code-owned conservative views, with up to eight selected principal fields. `minimized:true` and `unmodeledFieldsOmitted:true` describe projection, not proof that all arbitrary nested sensitive data was removed. Unknown objects and maps are summarized. Advanced Search omits `@message` and `@fields` content. Known secret values and supported one-step encodings are redacted; arbitrary transformed encodings are outside that guarantee. The MCP host/model provider can still receive sensitive information in retained fields.

The HTTPS connector pins an approved startup DNS snapshot. The standard NAT64 ranges (`64:ff9b::/96`, `64:ff9b:1::/48`), 6to4 (`2002::/16`) and Teredo (`2001::/32`) addresses are always blocked, including translations that appear to target public IPv4. A prohibited DNS answer causes a terminal connector failure until the server process restarts; fixing DNS does not reopen that running connector. Operator-specific NAT64 prefixes cannot be detected generically; exact destination allowlists and deployment network review remain necessary. This fail-closed behavior may require changing the deployment's DNS/network design. Actual private-network pinning and appliance behavior remain unvalidated.
