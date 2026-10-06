# Contributing

Work in the public repository. Changes must preserve the fixed operation inventory, strict HTTPS/stdio boundaries and default previews; expanding a blocked operation requires a separate reviewed design and evidence. Never commit secrets, appliance responses or lab tokens. Never publish packages or images by hand: publication happens only from `.github/workflows/release.yml` on a reviewed tag (see `docs/releases.md`).

```sh
npm ci --ignore-scripts
npm run typecheck
npm test
npm run build
npm pack --dry-run --ignore-scripts
```

Tests use TypeScript compilation and Node's built-in test runner, not a live appliance. Catalogue generation reads the pinned local OpenAPI, operation inventory and architecture mapping; runtime never generates schemas from an appliance. Review generated diffs and retain 79 unique operations with explicit blocked/excluded accounting. Documentation distinguishes API 6.1 evidence from unvalidated 7.1 behavior.

When dependency updates are explicitly authorized, review upstream changes and exact pins, regenerate both locks consistently, and compare the packed artifact's installed production tree and integrity with its shrinkwrap. Keep build tooling portable and explicit; no install lifecycle hooks. CI uses immutable action commits and contents-read permission only. Do not infer a security pass from green CI.

For a change request, describe the concrete trigger and resulting behavior, policy boundaries, tests run and unresolved compatibility risks. Request authorized lab scope before any live request; write tests require operation-specific approval. Use synthetic secrets in temporary directories outside the repository.

Report vulnerabilities via [SECURITY.md](SECURITY.md). The full [Apache-2.0 license](LICENSE) applies to contributions; submit only work you are authorized to contribute.

## How changes are accepted

- Open a **pull request** against `main` from a branch or fork; direct pushes to `main` are blocked by branch protection.
- Every pull request must pass the required checks (`lint`, `offline (22)`, `offline (24)`, `docker (amd64)`, `docker (arm64)`) and CodeQL, and all review conversations must be resolved before it can be merged.
- Acceptable contributions follow the existing style: TypeScript in strict mode, `npm run lint` (ESLint with security rules) and `npm run typecheck` clean, tests added with the change (`npm test`, and `npm run test:security` for anything touching policy, signing, limits or output handling), no new runtime dependencies without discussion, and documentation claims limited to recorded evidence.
- Security-relevant changes (profiles, approval flow, signing, limits, redaction) also need an updated threat-model or test-plan entry under `docs/security/`.
- Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md), not in public issues.
