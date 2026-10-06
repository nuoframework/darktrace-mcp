Diagnose configuration, authentication, clock, TLS and permission problems.

[README](../../README.en.md) · [Getting started](getting-started.md) · [Configuration](configuration.md) · [Clients](clients.md)

[Español](../troubleshooting.md) · **English**

# Troubleshooting

Start with these two commands. Use the same environment your client uses.

```sh
darktrace-mcp --check-config
darktrace-mcp test
```

`--check-config` finds local problems (URL, token files, profiles). `test` calls `GET /status` and finds network, TLS, clock and token problems. Error messages never include token values.

## Quick table

| Symptom | Likely cause | Go to |
|---|---|---|
| Client shows the server as failed or "disconnected" | Wrong Node or entrypoint path, or a config error | [Server does not start](#server-does-not-start) |
| `401`, `403`, "authentication failed" | Wrong token, token lacks permission, or clock skew | [Authentication errors](#authentication-errors) |
| Works for a while, then `401` | Clock drift | [Clock skew](#clock-skew) |
| "unable to verify the first certificate", "self-signed certificate" | Private CA not trusted | [TLS and private CA](#tls-and-private-ca) |
| "token file must be owned by…", "mode 0600" | Token file permissions | [Token file permissions](#token-file-permissions) |
| "proxy environment is not supported" | Proxy variables in your environment | [Proxy variables are rejected](#proxy-variables-are-rejected) |
| A tool you expect is missing | Its profile is not enabled | [A tool is missing](#a-tool-is-missing) |
| Critical action refused with `confirmation_required` or `preview_required` | `confirm:true` or the `previewId` from a `dryRun:true` preview is missing | [Writes and critical actions](#writes-and-critical-actions) |
| Startup error naming `DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE` or `DARKTRACE_ACKNOWLEDGE_HOST_APPROVAL` | `all` (or `sensitive` + `write`), or `DARKTRACE_CRITICAL_APPROVAL=host`, without its acknowledgement | [Server does not start](#server-does-not-start) |
| "response too large" | Result exceeds the size limit | [Large results](#large-results) |
| `FAIL bad_request` (HTTP 400) on `GET /status` from `test`, or `setup` stops with HTTP 400 | The appliance accepts only the other signature date format | Rerun `darktrace-mcp setup` (it probes both), or set `DARKTRACE_DATE_FORMAT=spaced` (or `compact`); see [signature date format](configuration.md#signature-date-format) |

## Server does not start

1. Run the exact `command` and `args` from your client config in a terminal, adding `--check-config`.
2. Use absolute paths. Desktop apps do not see your shell `PATH`, so `node` alone may fail. Get the full path with `node -p 'process.execPath'`.
3. Make sure you built the project: `dist/src/index.js` must exist (`npm run build`).
4. Check the JSON or TOML syntax. On Windows, backslashes in JSON must be doubled.
5. Profile `all`, or any list with both `sensitive` and `write`, starts only with `DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE=true`. `DARKTRACE_CRITICAL_APPROVAL=host` with `critical` starts only with `DARKTRACE_ACKNOWLEDGE_HOST_APPROVAL=true`. Add the variable to the client's `env` only after reading what it accepts ([profiles](configuration.md#profiles), [human approval](configuration.md#human-approval)).
6. Look at the client's MCP log. Server messages go to stderr. A configuration problem prints one line such as `{"event":"startup_error","reason":"could not read private token file"}`; `reason` names the setting, never its value. Other startup failures print only the event.

A server that seems "idle" is normal: it waits for the client.

## Authentication errors

Darktrace signs each request with your private token and the current time.

| Check | How |
|---|---|
| Public and private tokens are not swapped | Open each file. The public token goes in `..._PUBLIC_TOKEN_FILE` |
| No extra spaces or Windows line endings in the files | `od -c public-token \| tail -3` should end with the token, optionally `\n`, not `\r\n` |
| Token has API permission for what you ask | Check the token in Darktrace System Config |
| Clock is correct | See [clock skew](#clock-skew) |
| Signing format | If `test` still fails, try `DARKTRACE_DATE_FORMAT=spaced` or `DARKTRACE_QUERY_SIGNATURE_ENCODING=encoded`, one at a time |

## Clock skew

Darktrace rejects signatures when your clock differs from the appliance by more than a few minutes.

```sh
date -u
```

Compare with the appliance time. Turn on automatic time sync (NTP) on the machine that runs the server. In Docker, the container uses the host clock.

## TLS and private CA

TLS verification is always on and cannot be turned off. If your appliance uses a certificate from a private CA:

```sh
export NODE_EXTRA_CA_CERTS=/absolute/path/to/company-ca.pem
darktrace-mcp test
```

In a client config, add `NODE_EXTRA_CA_CERTS` to the `env` block. In Docker, mount the PEM file read-only and point `NODE_EXTRA_CA_CERTS` at the path inside the container.

Also check that the URL hostname matches the certificate, and that the certificate has not expired.

## Token file permissions

The server refuses token files that others could read.

```sh
ls -l /absolute/private/darktrace/
chmod 600 /absolute/private/darktrace/public-token /absolute/private/darktrace/private-token
```

| Message mentions | Fix |
|---|---|
| mode | `chmod 600 <file>` |
| owner | The file must belong to the user that runs the server. In Docker, to UID 1000 or the `--user` you set |
| symlink | Point the variable at the real file, not a link |
| size | One token per file, under 4 KiB |
| relative path | Use an absolute path |

**Windows.** Native Windows file permissions cannot be checked the same way, so the server may refuse the files. Run the server inside WSL and use Linux paths there.

**Docker Desktop.** On macOS and Windows, bind-mounted files show as owned by root inside the container, so `could not read ... token file` appears even with correct host permissions. Add `-e DARKTRACE_TOKEN_FILE_OWNER=root-or-current` to the `docker run` arguments (see [Docker guide](docker.md)) and run `--check-config` in the container. Never loosen the mode.

## Proxy variables are rejected

The server talks directly to the appliance and stops if it sees proxy settings: `HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY`, `NO_PROXY` (any case) or `NODE_USE_ENV_PROXY`. Remove them for this server only:

```sh
env -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u NO_PROXY \
  -u http_proxy -u https_proxy -u all_proxy -u no_proxy \
  -u NODE_USE_ENV_PROXY \
  darktrace-mcp --check-config
```

If your network only allows traffic through a proxy, ask your network team for a direct route to the appliance. Do not change your system-wide proxy policy.

## A tool is missing

Tools appear only when their profile is on. Check `DARKTRACE_PROFILES` in the client config, then restart the client.

| Missing tools | Add profile |
|---|---|
| Advanced Search, email content, PCAP download, email audit | `sensitive` |
| Acknowledge, comment, pin, tags, PCAP request, investigations | `write` |
| Antigena actions, intel feed, subnet changes, delete tag | `critical` |

The Darktrace/Email action (`darktrace_email_action`) is excluded from this release and never appears. The deprecated `GET /aianalyst/incidents` is never available. Use `darktrace_list_ai_analyst_incidents`.

## Writes and critical actions

- **Preview first.** Add `dryRun:true` to any write to see what would happen. Without it, an ordinary write runs (by default after your client's own permission prompt).
- **Critical actions** need three steps: a `dryRun:true` preview that returns a `previewId` (valid 5 minutes, once); the same call repeated with `confirm:true` and that `previewId`; and, by default, your acceptance in the server's dialog. A call without `confirm:true` is refused with `confirmation_required`, and one without a `previewId` with `preview_required` (an expired, used or mismatched one gives `preview_expired`, `preview_used` or `preview_invalid`).
- **All writes refused after failures.** Three failed or unknown writes in a row stop all writes until the server restarts. Reads keep working. On some appliances DELETE answers 502 after applying the change, which counts as unknown.
- **Timeout or disconnect during a write.** The result is unknown. Check in Darktrace whether it happened before trying again. Writes are never retried automatically.
- **Darktrace returns 403 on a write.** Your token lacks that permission. Profiles cannot override token permissions.

## Large results

Responses over 2 MiB and tool output over 60,000 characters are refused. Narrow the request: shorter time range, a specific device, fewer fields.

## Still stuck

Collect the output of `darktrace-mcp --check-config` and `darktrace-mcp --version`, remove any internal hostnames, and open an issue in the repository. Never share tokens or raw appliance data. Security problems: see [SECURITY.md](../../SECURITY.md).
