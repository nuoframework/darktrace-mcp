# Getting started

[README](../README.md) · [Clients](clients.md) · [Español](es/getting-started.md)

## 1. Review deployment eligibility

For every deployment, decide whether appliance data may be processed by the selected host/model provider, including its retention, residency and onward forwarding. Read-only access still transmits potentially sensitive data. Advanced Search needs additional approval before operator opt-in. Use appliance API credentials with the least privilege needed; never reuse lab credentials without explicit authorization.

## 2. Install a reviewed version or build the private source

For versioned delivery, follow [private GitHub Releases](releases.md): authenticated `gh release download`, checksum verification and `npm install --ignore-scripts --omit=dev`. Substitute the installed entrypoint `node_modules/darktrace-mcp/dist/src/index.js` in the checks below. Source installation remains available:

Prerequisites: Node.js 22+, npm, authenticated `gh` and access to `nuoframework/darktrace-mcp`.

```sh
gh auth status
gh repo clone nuoframework/darktrace-mcp
cd darktrace-mcp
npm ci --ignore-scripts
npm run build
node dist/src/index.js --help
node dist/src/index.js --version
```

No npm package or image has been published. `npm ci --ignore-scripts` suppresses dependency lifecycle hooks; the explicit build compiles the generator, refreshes the committed catalogue and compiles the runtime. Exact dependency pins remain in the manifest and locks. Native Windows token/config-file checks currently fail closed; run Node in an approved Linux/WSL environment with absolute runtime-environment paths and files owned by its Linux runtime UID on a filesystem enforcing the required permissions. Do not disable or weaken the file checks.

## 3. Provision credentials privately

Have your approved secret manager provision separate public/private API token files **outside the repository**, owned by the OS user launching Node. Each must be a regular non-symlink file, no more than 4,096 bytes, with mode `0600` or stricter. One token per file, optionally followed by one final LF. A single `tokens.json` is not a supported substitute. Do not copy real tokens into examples or commands. Do not set a direct token variable alongside its corresponding file setting.

```sh
export DARKTRACE_URL='https://darktrace.example.internal'
export DARKTRACE_PUBLIC_TOKEN_FILE='/absolute/private/darktrace/public-token'
export DARKTRACE_PRIVATE_TOKEN_FILE='/absolute/private/darktrace/private-token'
export DARKTRACE_PROFILES='read'
export DARKTRACE_SENSITIVE_READ='false'
node dist/src/index.js --check-config
```

This check is offline. A successful result does not prove appliance token ACLs, DNS/TLS reachability, appliance compatibility or provider eligibility. `doctor` is an equivalent local configuration check. The source contract is API 6.1; the 7.1 lab target is **NOT VALIDATED**.

For a private JSON configuration, copy [operator.config.json](../examples/operator.config.json) outside the checkout, edit the origin/token-file paths, and make it runtime-user-owned before loading:

```sh
chmod 600 /absolute/private/darktrace/operator.json
export DARKTRACE_CONFIG_FILE='/absolute/private/darktrace/operator.json'
node dist/src/index.js --check-config
```

The JSON file must be a regular non-symlink file, owned by the runtime UID with mode `0600` or stricter, and at most **65,536 bytes (64 KiB)**. Each separate token file remains bounded to **4,096 bytes (4 KiB)**. Inline JSON tokens are supported only in this protected private file; prefer separate token files. Environment settings override JSON fields. These file checks apply to server-read JSON/token files. Node-loaded `--env-file` files are not validated by the server; if used, the operator must protect them externally and include only non-secret settings/token-file paths, never token values.

Node also applies `NODE_OPTIONS` (including code preloads) and `NODE_EXTRA_CA_CERTS` (additional TLS trust) from that file before the server starts. Set them there only after explicit review; treat env-file integrity like executable code, with no server sandbox guarantee. See [configuration](configuration.md) for that boundary.

If you use a private CA, configure `NODE_EXTRA_CA_CERTS=/absolute/private/ca.pem` before Node starts. No insecure-TLS switch is supported.

## 4. Connect a host

Find the actual executable paths:

```sh
node -p 'process.execPath'
node -p 'require("node:path").resolve("dist/src/index.js")'
```

Use those absolute paths in [client configuration](clients.md). The host launches the compiled server and owns its lifecycle. Credentials flow from private files through the process environment configuration; token values never belong in argv. Keep stdout exclusively for MCP. Server diagnostics use stderr.

## Optional verified local artifact

This is an operator-built private artifact, not a downloaded release. Build first; place outputs in a private directory outside the checkout:

```sh
npm run build
npm pack --ignore-scripts --pack-destination /absolute/private/artifacts
shasum -a 256 /absolute/private/artifacts/darktrace-mcp-0.1.0-alpha.0.tgz
tar -tzf /absolute/private/artifacts/darktrace-mcp-0.1.0-alpha.0.tgz
```

Inspect contents before transfer. Expect only `dist/src/**`, `package.json`, `npm-shrinkwrap.json`, `README.md`, `LICENSE`, and `SECURITY.md`. Reject `.env`, credentials, `docs-src`, TypeScript source, tests, scripts or unexpected files. The bin entry `dist/src/index.js` must be executable. Verify SHA-256 against your own trusted build record through your approved private channel; a checksum copied alongside an untrusted tarball is insufficient.

In a new empty installation directory:

```sh
npm init -y
npm install --ignore-scripts --omit=dev /absolute/private/artifacts/darktrace-mcp-0.1.0-alpha.0.tgz
npm ls --omit=dev --all
node node_modules/darktrace-mcp/dist/src/index.js --version
```

Compare actual installed runtime package paths, versions and resolved integrity values against the tarball's shrinkwrap, rather than only checking top-level pins. The install retrieves pinned dependencies from the configured npm registry; **the private project itself is never published there**. Source `npm ci` remains the canonical reproducible checkout install. A tarball-installed directory uses its generated lock for subsequent `npm ci --ignore-scripts --omit=dev`.

## Optional local container

A local Dockerfile is provided only as a private build recipe; no image is published. See [configuration](configuration.md#container-secret-mounts). Docker build/run verification must be performed on an approved host before use; the documentation does not assert that this image has been built or validated.

## Output and destination boundaries

Runtime output uses code-owned conservative views, with up to eight selected principal fields. `minimized:true` and `unmodeledFieldsOmitted:true` describe projection, not proof that all arbitrary nested sensitive data was removed. Unknown objects and maps are summarized. Advanced Search omits `@message` and `@fields` content. Known secret values and supported one-step encodings are redacted; arbitrary transformed encodings are outside that guarantee. The MCP host/model provider can still receive sensitive information in retained fields.

The HTTPS connector pins an approved startup DNS snapshot. The standard NAT64 ranges (`64:ff9b::/96`, `64:ff9b:1::/48`), 6to4 (`2002::/16`) and Teredo (`2001::/32`) addresses are always blocked, including translations that appear to target public IPv4. A prohibited DNS answer causes a terminal connector failure until the server process restarts; fixing DNS does not reopen that running connector. Operator-specific NAT64 prefixes cannot be detected generically; exact destination allowlists and deployment network review remain necessary. This fail-closed behavior may require changing the deployment's DNS/network design. Actual private-network pinning and appliance behavior remain unvalidated.
