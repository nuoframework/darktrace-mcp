# Configuration

[README](../README.md) · [Clients](clients.md) · [Troubleshooting](troubleshooting.md)

The independently accepted candidate enforces **19 validated GET selectors across 15 MCP tools**. Both `read` and `read` + `sensitiveRead` expose the same complete contract; sensitive read cannot expand this ceiling. Advanced Search and every other excluded selector, including writes, are refused before preview, audit or network access. Configuration can only narrow policy and resource ceilings; it cannot grant excluded operations. The JSON-file ceiling remains 65,536 bytes (64 KiB). [Current bounded lab evidence](security/validated-consultations-lab-checkpoint.md). Stable publication remains blocked by OpenSSL 3.5.8 / CVE-2026-35189; final candidate suites and packaging remain separate gates.

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
| `DARKTRACE_PROFILES=read` | `profiles.read=true`, `profiles.write=false` | Only accepted profile set; default read profile, which cannot be disabled |
| `DARKTRACE_PROFILES=read,write` | — | Rejected at startup; no write profile is accepted in this release |
| `profiles.write=true` | — | Rejected at startup; the release capability gate cannot be enabled through configuration |
| `DARKTRACE_SENSITIVE_READ=false` | `profiles.sensitiveRead=false` | Default; 15 tools / 19 GET selectors |
| `DARKTRACE_SENSITIVE_READ=true` | `profiles.sensitiveRead=true` | Same 15 tools / 19 GET selectors; cannot grant Advanced Search or any excluded selector |
| `DARKTRACE_WRITE_CRITICAL=true` or `profiles.writeCritical=true` | — | Rejected at startup; no critical preview or execution is exposed |

The current release has no medium/high write operations, critical operations or unsigned previews. The policy denies every non-read tier before tool registration and signing; write settings cannot change that gate. Writes are deferred to a later release and require a new reviewed authorization gate. Model/client approval is not authorization. Email (all 14 operations), PCAP export, HTTP and unvalidated signing shapes are blocked. `export`/`email` profile fields are rejected even when false; omit them. Export settings, HTTP fields and production version overrides are unsupported.

**For any deployment**, evaluate organizational eligibility and host/provider processing, retention, residency and forwarding of appliance data. Read-only use still enters model context. The sensitive-read flag cannot expand this release or certify provider eligibility.

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

Do not change your system-wide proxy policy or use this as a way to bypass organizational network rules. Startup rejects ambient proxy variables, `NODE_USE_ENV_PROXY`, `NODE_TLS_REJECT_UNAUTHORIZED=0`, `SSL_CERT_FILE`, `SSL_CERT_DIR`, `OPENSSL_CONF`, and known Node/OpenSSL proxy or TLS-bypass flags from `NODE_OPTIONS` or process arguments. Node applies `NODE_OPTIONS` and `NODE_EXTRA_CA_CERTS` before application startup; treat preloads and CA files as trusted executable/host configuration and protect their integrity. Only `NODE_EXTRA_CA_CERTS` is supported for an approved private CA; certificate and hostname verification stay enabled. No setting can raise limits or turn a 7.1 version report into policy authorization.

## Container secret mounts

The optional Dockerfile pins the official `library/node:22-bookworm-slim` multi-platform manifest digest verified from the [Docker Hub registry manifest](https://registry-1.docker.io/v2/library/node/manifests/sha256:43ac6c60b8f89723f746e8a92ce91abd5017e627ce1ddfe4238355d3a30b772c) on 2026-10-05, and pins the Distroless Debian 13 `cc` root filesystem digest listed in the [Docker guide](docker.md). The official Node image supplies Node 22.23.3 to the builder; the final scratch image copies that binary and the Distroless root filesystem without inheriting its environment. The final image omits npm and Corepack, retains Node and system license files, and defaults to nonroot UID/GID 1000. Build the private local image from this Dockerfile; no image has been published. Accepted source `9e7c7070…` produced image `sha256:eb3a7681…`, with both 15-tool profiles verified and native/Docker lab 19/19 bounded selector PASS. [Image/component binding](security/validated-consultations-docker-checkpoint.md) preserves the scanner-qualified findings: historical Trivy 23 MEDIUM / 8 LOW, Grype 11 High / 10 Medium / 3 Low / 7 Negligible. Component equality is not a fresh database scan; OpenSSL 3.5.8 / CVE-2026-35189 remains a stable-release blocker.

The scanner SBOM omits Node and its bundled components. Manual inventory found OpenSSL 3.5.8 affected by **CVE-2026-35189 (official severity Low)** during peer TLS certificate processing. OpenSSL 3.5.9 fixes it, but the examined official supported Node 22/24/26 releases do not supply that fix as of 2026-10-05. This is a stable-publication blocker: body limits, readonly mode and dropped capabilities do not patch TLS-handshake memory exhaustion. Keep certificate and hostname verification enabled; changing system libssl does not replace Node’s bundled static OpenSSL. [Primary advisory](https://openssl-library.org/news/secadv/20260929.txt).

```sh
docker build --pull -t darktrace-mcp:local .
image_id="$(docker image inspect --format '{{.Id}}' darktrace-mcp:local)"
```

The token files must be regular non-symlink files, owned by the container's effective UID, and mode `0600` or `0400` (no group/other or special bits). Use the image's default UID 1000 when the mounted files are owned by UID 1000 as seen inside the container. Otherwise, set `--user UID:GID` to a nonzero UID matching the mounted files' owner. Keep the files read-only in the container. On Docker Desktop, run the configuration check below to verify how bind-mount ownership and permissions appear inside the container; do not loosen the file modes or bypass the checks if ownership does not match.

Run this local, offline check with the same UID, mounts and non-secret environment settings intended for the MCP host:

```sh
docker run --rm -i --init --log-driver=none --read-only --cap-drop=ALL \
  --security-opt=no-new-privileges --pids-limit=64 --memory=256m \
  --user 1000:1000 --network=none --pull=never \
  --mount type=bind,src=/absolute/private/darktrace/public-token,dst=/run/secrets/public-token,readonly \
  --mount type=bind,src=/absolute/private/darktrace/private-token,dst=/run/secrets/private-token,readonly \
  -e DARKTRACE_URL=https://darktrace.example.internal \
  -e DARKTRACE_PUBLIC_TOKEN_FILE=/run/secrets/public-token \
  -e DARKTRACE_PRIVATE_TOKEN_FILE=/run/secrets/private-token \
  -e DARKTRACE_PROFILES=read -e DARKTRACE_SENSITIVE_READ=false \
  "$image_id" --check-config
```

For a stdio MCP client, use Docker as the command and pin the image to the exact ID from `docker image inspect --format '{{.Id}}' darktrace-mcp:local`; see the [Docker client example](../examples/docker.mcp.json). Use `--pull=never`, an absolute Docker executable path, `-i` without a TTY, `--log-driver=none`, and do not publish ports. Disabling the daemon log driver prevents Docker from persisting the container's stdio; it does not stop the MCP host from forwarding results to its provider. Use the safe local `--check-config` diagnostic for setup; do not inspect or persist raw MCP stdout through `docker logs` or another logging sink. Prefer user-scoped MCP configuration; only enable project-shared configuration after reviewing every command, argument, environment value and host preload it can launch. The bridge network in the client example is only a transport default: outbound appliance access must be constrained by deployment network policy. Do not use `--network host`. Do not use Docker `--env-file`, place token values in environment variables, embed secrets in build args/layers, or publish this local image. Before distributing a derived image, review the Apache-2.0 project license and production dependency license/notice obligations in the runtime image. An approved private CA can be mounted read-only with `NODE_EXTRA_CA_CERTS` pointing to it. Remove `--check-config` from the MCP host command after the preflight check. Provider eligibility applies equally to container deployments.

## Output and destination boundaries

Runtime output uses code-owned conservative views, with up to eight selected principal fields. `minimized:true` and `unmodeledFieldsOmitted:true` describe projection, not proof that all arbitrary nested sensitive data was removed. Unknown objects and maps are summarized. Known secret values and supported one-step encodings are redacted; arbitrary transformed encodings are outside that guarantee. The MCP host/model provider can still receive sensitive information in retained fields.

The HTTPS connector pins an approved startup DNS snapshot. The standard NAT64 ranges (`64:ff9b::/96`, `64:ff9b:1::/48`), 6to4 (`2002::/16`) and Teredo (`2001::/32`) addresses are always blocked, including translations that appear to target public IPv4. A prohibited DNS answer causes a terminal connector failure until the server process restarts; fixing DNS does not reopen that running connector. Operator-specific NAT64 prefixes cannot be detected generically; exact destination allowlists and deployment network review remain necessary. This fail-closed behavior may require changing the deployment's DNS/network design. The coordinator’s bounded native/Docker checks validate only their recorded selectors and snapshots; broader private-network and appliance behavior remain unvalidated.
