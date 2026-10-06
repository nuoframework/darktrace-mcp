**English** · [Español](es/troubleshooting.md)

# Troubleshooting

[README](../README.md) · [Getting started](getting-started.md) · [Configuration](configuration.md) · [Clients](clients.md)

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
| Critical action returns only a preview | `confirm:true` missing | [Writes and critical actions](#writes-and-critical-actions) |
| "response too large" | Result exceeds the size limit | [Large results](#large-results) |

## Server does not start

1. Run the exact `command` and `args` from your client config in a terminal, adding `--check-config`.
2. Use absolute paths. Desktop apps do not see your shell `PATH`, so `node` alone may fail. Get the full path with `node -p 'process.execPath'`.
3. Make sure you built the project: `dist/src/index.js` must exist (`npm run build`).
4. Check the JSON or TOML syntax. On Windows, backslashes in JSON must be doubled.
5. Look at the client's MCP log. Server messages go to stderr.

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

**Docker Desktop.** Bind-mounted files can show a different owner inside the container. Run `--check-config` in the container (see [Docker guide](docker.md)). Fix ownership with `--user`, never by loosening the mode.

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
| Antigena actions, intel feed, subnet changes, email actions, delete tag | `critical` |

The deprecated `GET /aianalyst/incidents` is never available. Use `darktrace_list_ai_analyst_incidents`.

## Writes and critical actions

- **Preview first.** Add `dryRun:true` to any write to see what would happen.
- **Critical actions** return a preview unless the call has `confirm:true`. Read the preview, then confirm.
- **Timeout or disconnect during a write.** The result is unknown. Check in Darktrace whether it happened before trying again. Writes are never retried automatically.
- **Darktrace returns 403 on a write.** Your token lacks that permission. Profiles cannot override token permissions.

## Large results

Responses over 2 MiB and tool output over 60,000 characters are refused. Narrow the request: shorter time range, a specific device, fewer fields.

## Still stuck

Collect the output of `darktrace-mcp --check-config` and `darktrace-mcp --version`, remove any internal hostnames, and open an issue in the private repository. Never share tokens or raw appliance data. Security problems: see [SECURITY.md](../SECURITY.md).
