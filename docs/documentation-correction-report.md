# R5-01 documentation correction report

**Scope:** operator guidance only; no source, manifests, security-review histories, commits or lab calls.

Read [round-five review R5-01](security/design-review-round5.md) and reviewed all env-file, file-permission and size-limit references in README, configuration, English/Spanish quickstarts, troubleshooting, client guides, examples and `.env.example`.

## Correction

[Configuration](configuration.md) now states that Node reads `--env-file` before server startup. The server receives trusted host environment values and cannot verify the env file's owner, permissions, type, symlinks or size; the server's JSON/token controls and 64 KiB/4 KiB ceilings do not cover it. The operator must protect and verify any such file externally, with operator ownership, mode 0600 and a trusted non-symlink location, and include only non-secret settings/token-file paths, never token values. Protected JSON and separate token files remain the preferred server-validated file inputs.

English/Spanish quickstarts, troubleshooting and `.env.example` repeat this boundary. Container guidance also clarifies that Docker reads its env file outside the server and no server file-metadata/size validation applies. `--check-config` validates resulting settings and referenced server-read files, not the env file. The English quickstart now says local checks do not establish **appliance token ACLs**, avoiding confusion with local file-mode validation.

README, client examples and client guide already use token-file paths and contain no env-file launch recommendation; they needed no edits. Direct trusted host secret injection remains a separate documented configuration mechanism; this correction does not claim the server can establish environment-file provenance.

## Evidence

Executed searches:

```sh
rg -n -i 'env-file|dotenv|env file|archivo.*env|permission|0600|4,096|65,536|4096|65536|nofollow|no-follow' README.md docs/configuration.md docs/getting-started.md docs/es/getting-started.md docs/troubleshooting.md docs/clients.md examples .env.example docs/security/design-review-round5.md
rg -n -i 'env-file|dotenv|64 KiB|4 KiB|0600' README.md docs/configuration.md docs/getting-started.md docs/es/getting-started.md docs/troubleshooting.md docs/clients.md examples .env.example
```

Static verification parsed all four JSON examples and the Codex TOML example, checked that client environments contain token-file paths without direct token values, checked the operator JSON uses separate token-file fields, and checked `.env.example` assigns no direct token values. Local documentation links and fragments, balanced code fences and trailing whitespace were checked. No runtime tests or global build were needed for this prose correction; no shared dist output was touched and no secrets or lab credentials were accessed.

The limits/permissions statements for protected JSON/token files remain scoped to files read by the server; env-file protection is explicitly an operator responsibility, not a server guarantee. Independent source/security validation and final artifact verification remain separate pending work.

Verification result: **52 local links/anchors**, **4 JSON + 1 TOML examples**, no direct token values in examples/env reference, balanced fences and no trailing whitespace.
