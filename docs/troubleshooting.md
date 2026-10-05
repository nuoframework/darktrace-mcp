# Troubleshooting

[README](../README.md) · [Configuration](configuration.md) · [Clients](clients.md)

| Symptom | Check/action |
|---|---|
| Host cannot launch Node | Use the actual absolute Node path and compiled entrypoint; build with `npm run build`. GUI hosts may not inherit your shell PATH. |
| Local startup fails | Run `--check-config` with the same environment as the host. Check HTTPS origin and separate token-file paths, permissions, owner, size and absence of symlinks. Errors deliberately omit secret details. |
| Node `--env-file` handling | Node reads the env file before startup; the server does not verify its owner/mode/type/symlinks/size. `NODE_OPTIONS` preloads execute before server checks, and `NODE_EXTRA_CA_CERTS` extends TLS trust. Review both in the trusted launcher before startup; protect the env file externally (operator-owned `0600`, trusted non-symlink location), use only non-secret settings/token-file paths and never token values. Prefer protected JSON plus separate token files. |
| JSON or TOML parsing error | Compare with `examples/`; preserve wrappers (`mcpServers`, VS Code `servers`, Codex `mcp_servers`) and quote absolute paths. Windows JSON backslashes need escaping. |
| TLS trust failure | Use an approved PEM via `NODE_EXTRA_CA_CERTS` before startup; check hostname/expiry and the runtime's file access. Never disable TLS verification. |
| Authentication denied | Check token ACLs, clock and the operator-selected date/signature mode. No signing fallback is attempted; 7.1 signing is unvalidated. |
| Advanced Search hidden | Default is `DARKTRACE_SENSITIVE_READ=false`; additional organizational/provider eligibility is required before opt-in. Blocked GET shapes remain blocked. |
| Write tools hidden | Read-only is default. Operator `write` profile exposes eligible medium/high operations, which still default to dry-run. |
| Critical call cannot execute | Expected. Five critical operations may preview with write + writeCritical; no confirm field or model approval enables execution. |
| Email/export/HTTP rejected | Expected baseline behavior. Do not use a flag or source presence as an activation mechanism. |
| Mutation times out/disconnects | Outcome may be unknown. Inspect appliance state and audit before deciding on a new authorized action; never automatically retry POST/DELETE. |
| Large response is rejected | Lower limits/output scope or narrow the request. Limits cannot be raised above the baseline ceilings. |
| Stdio seems idle | Normal: the server waits for the host's MCP handshake. Do not print debugging text to stdout. |

`--help`, `--version`, `--check-config` and `doctor` are the supported diagnostics. Configuration checks perform no network probe and do not certify token validity, deployment eligibility or compatibility. Share only redacted stderr and synthetic reproductions; host logs can contain appliance results even when server diagnostics are redacted.

## Output and destination boundaries

Runtime output uses code-owned conservative views, with up to eight selected principal fields. `minimized:true` and `unmodeledFieldsOmitted:true` describe projection, not proof that all arbitrary nested sensitive data was removed. Unknown objects and maps are summarized. Advanced Search omits `@message` and `@fields` content. Known secret values and supported one-step encodings are redacted; arbitrary transformed encodings are outside that guarantee. The MCP host/model provider can still receive sensitive information in retained fields.

The HTTPS connector pins an approved startup DNS snapshot. The standard NAT64 ranges (`64:ff9b::/96`, `64:ff9b:1::/48`), 6to4 (`2002::/16`) and Teredo (`2001::/32`) addresses are always blocked, including translations that appear to target public IPv4. A prohibited DNS answer causes a terminal connector failure until the server process restarts; fixing DNS does not reopen that running connector. Operator-specific NAT64 prefixes cannot be detected generically; exact destination allowlists and deployment network review remain necessary. This fail-closed behavior may require changing the deployment's DNS/network design. Actual private-network pinning and appliance behavior remain unvalidated.
