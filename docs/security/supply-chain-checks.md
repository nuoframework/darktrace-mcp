# Supply-chain checks

[Security overview](../security.md) · [Releases](../releases.md)

Five automated controls run on the repository in addition to the offline test and security suites. None of them changes what the server does at runtime. The first four do not gate a release on their own: `release.yml` and `release:prepare` remain the release gate. Release signing runs inside that gate, so a signing or attestation failure stops the GitHub Release from being created.

| Control | Where | Runs on | Output |
|---|---|---|---|
| CodeQL | [`.github/workflows/codeql.yml`](../../.github/workflows/codeql.yml) | push to `main`, pull requests to `main`, weekly (Monday), manual | Code scanning alerts, category `/language:javascript-typescript` |
| ESLint | [`eslint.config.mjs`](../../eslint.config.mjs), `npm run lint`, CI job `lint` in [`ci.yml`](../../.github/workflows/ci.yml) | every push and pull request | Job log; any finding fails the job |
| Dependabot | [`.github/dependabot.yml`](../../.github/dependabot.yml) | weekly (Monday) | Pull requests for npm packages and GitHub Actions |
| OpenSSF Scorecard | [`.github/workflows/scorecard.yml`](../../.github/workflows/scorecard.yml) | push to `main`, branch-protection changes, weekly (Monday), manual | Code scanning alerts (tool `Scorecard`), public result on scorecard.dev |
| Release signing and provenance | [`release.yml`](../../.github/workflows/release.yml) job `github-release`; [`sign-release.yml`](../../.github/workflows/sign-release.yml) for releases published before it | every `v*` release; `sign-release.yml` manually, once per earlier tag | `<asset>.sigstore.json` bundles, `darktrace-mcp-<version>.intoto.jsonl` provenance, a GitHub attestation |

All workflow actions are pinned to a full commit SHA with the release tag in a trailing comment, checkouts use `persist-credentials: false`, and each job requests only the permissions it needs.

## CodeQL

Analyses `src/` and `scripts/` as JavaScript/TypeScript without a build (`build-mode: none`) using the `security-extended` query suite, which adds lower-precision security queries to the default set.

Reading results: repository **Security → Code scanning**, filter by tool `CodeQL`. Each alert names the query, the source-to-sink path and the commit where it first appeared. Triage each one as a fix, or dismiss it with a reason ("false positive" or "used in tests") and a short comment so the decision is visible to the next reviewer. A pull request that introduces an alert shows it as a check annotation.

## ESLint

`npm run lint` lints `src/**/*.ts` and `scripts/**/*.mjs` with:

- `@eslint/js` recommended (correctness rules);
- `typescript-eslint` recommended (non type-checked) for `src/`;
- `eslint-plugin-security`: `detect-unsafe-regex`, `detect-non-literal-regexp`, `detect-non-literal-require`, `detect-eval-with-expression`, `detect-child-process`, `detect-possible-timing-attacks`, `detect-pseudoRandomBytes`, `detect-buffer-noassert`, `detect-new-buffer`, `detect-bidi-characters`, `detect-invisible-characters`, `detect-disable-mustache-escape`, `detect-no-csrf-before-method-override`.

Every retained rule is an error, so there is no warning tier to ignore. Stylistic rules are off (`no-regex-spaces`, `no-useless-escape`, `@typescript-eslint/no-explicit-any`). Two security rules are not enabled because they flag almost every line of normal code: `detect-object-injection` (computed property access) and `detect-non-literal-fs-filename` (the installer writes to computed paths by design, behind the checks in `src/cli/fsutil.ts`). `no-control-regex` is off because the output and header sanitizers match control characters on purpose.

Reviewed false positives are switched off per file, not globally, so the rule still covers every other file. The configuration file lists each exemption with its reason. Two exemptions cover genuine low-severity findings in files this control did not change; each is removed together with its fix:

- `src/tools/index.ts`: unused import `safeErrorMessage`.
- `scripts/prepare-release.mjs`: unused import `resolve`.

A third reviewed item is kept as a known low-severity issue: the TOML table-header pattern in `src/cli/toml.ts` backtracks quadratically on a long run of spaces inside a single unterminated `[` line. It only reads the operator's own Codex configuration file.

## Dependabot

- **npm**: weekly; minor and patch updates are grouped into one pull request. Major updates of the runtime dependencies (`@modelcontextprotocol/server`, `zod`) are ignored because they are release-pinned (see [release pins](release-pins-1.1.0.md) and `scripts/verify-release.mjs`) and need a planned migration. Development dependencies receive major updates as separate pull requests.
- **GitHub Actions**: weekly, all action updates in one grouped pull request. Dependabot keeps the SHA pin and updates the version comment.

Before merging an npm update: the repository keeps `package-lock.json` and `npm-shrinkwrap.json` byte-identical. Check that the Dependabot branch left them identical (`cmp package-lock.json npm-shrinkwrap.json`); if not, copy the updated one over the other, run `npm ci --ignore-scripts && npm run release:prepare -- <scratch dir>`, and commit both. Any change to either lockfile, or to `package.json`, changes the release source pins.

## Release signing and provenance

The `github-release` job of `release.yml` signs and attests the assets after `SHA256SUMS` is final and before `gh release create` uploads them. Nothing here changes the bytes of an asset; the signatures and the provenance are additional assets.

- **Signatures.** `cosign sign-blob --yes --bundle <asset>.sigstore.json <asset>` for every asset, `SHA256SUMS` included. Signing is keyless: the job's OIDC token (`id-token: write`) obtains a short-lived Fulcio certificate whose identity is `https://github.com/nuoframework/darktrace-mcp/.github/workflows/release.yml@refs/tags/v<version>`, and the signature is recorded in the Rekor transparency log. The bundle holds the certificate, the signature and the log entry; there is no long-lived signing key to protect or rotate. The job verifies each bundle with `cosign verify-blob` against that identity before uploading.
- **Provenance.** `actions/attest` (SHA-pinned) produces one SLSA v1 build provenance statement whose subjects are every asset plus `SHA256SUMS`, signed the same way and stored in the GitHub attestations API (`attestations: write`). The job uploads it twice: `darktrace-mcp-<version>.provenance.sigstore.json` is the Sigstore bundle exactly as the action wrote it (what `gh attestation verify --bundle` reads), and `darktrace-mcp-<version>.intoto.jsonl` is its DSSE envelope as an in-toto attestation bundle, one JSON line. The job checks that the decoded statement has the SLSA v1 predicate type and lists the first asset and `SHA256SUMS` as subjects.
- **Releases published before this change.** `sign-release.yml` (`workflow_dispatch`, input `tag`) downloads the assets of an existing release, checks them against the release's `SHA256SUMS`, signs every asset that has no bundle yet with the identity `sign-release.yml@refs/heads/main`, verifies the bundles and uploads only the new `<asset>.sigstore.json` files. It never replaces an asset and is safe to re-run. It does not create provenance, because provenance states which build produced the bytes and that workflow did not build them.
- **Not covered.** npm has its own provenance (`npm publish --provenance`, visible on the package page). The ghcr images are published by digest but are not signed; signing them with `cosign sign` is a later step.

Verification commands for consumers are in [releases](../releases.md#verifying-release-signatures-and-provenance). Scorecard's Signed-Releases check only looks for the file names (`.sigstore.json`, `.intoto.jsonl` and others) in the last five releases; it does not verify them.

## OpenSSF Scorecard

Scorecard checks repository practices (pinned dependencies, token permissions, branch protection, code review, SAST, signed releases, dependency update tool, security policy and others) and scores each from 0 to 10. With `publish_results: true` the result is published to the OpenSSF API, which the badge and the [viewer](https://scorecard.dev/viewer/?uri=github.com/nuoframework/darktrace-mcp) read; the workflow also uploads the SARIF to code scanning.

Reading results: **Security → Code scanning**, filter by tool `Scorecard`. Each alert is one check below 10 with the remediation text from Scorecard. Some checks depend on repository settings rather than files (branch protection, required reviews); those are fixed in the GitHub settings, not in code. The SARIF file is also kept as the `scorecard-sarif` workflow artifact for five days.

`publish_results` restricts the workflow: top-level permissions stay `read-all`, and the job may only contain the checkout, Scorecard, upload-artifact and upload-sarif steps. Do not add other steps to it.

### Branch-Protection and `SCORECARD_TOKEN` (owner, optional)

The workflow token cannot read branch protection rules, so the Branch-Protection check reports an internal error (`-1`) and is left out of the aggregate score. `scorecard.yml` passes `repo_token: ${{ secrets.SCORECARD_TOKEN || github.token }}`: with no secret the expression resolves to the workflow token and nothing changes. To enable the check:

1. Create a [fine-grained personal access token](https://github.com/ossf/scorecard-action/blob/main/docs/authentication/fine-grained-auth-token.md) restricted to `nuoframework/darktrace-mcp` with repository permission **Administration: read-only** (Metadata: read-only is added automatically). Scorecard uses it only to read branch protection and webhooks.
2. Store it as the repository secret `SCORECARD_TOKEN` and run the workflow (`workflow_dispatch`) or wait for the Monday run.

`main` already requires the CI status checks, conversation resolution and applies the rules to administrators. Scorecard also awards points for at least one required approving review (and more for two), which a single-maintainer repository cannot satisfy without blocking its own merges: that part of the check is a known gap, recommended but not applied. Rotate or delete the token when a second maintainer with admin access exists, or when the check is no longer wanted.

### Status and accepted gaps (score 6.7 at `0e4d64f`, 2026-10-06)

Scores are 0 to 10; the aggregate weights Critical 10, High 7.5, Medium 5, Low 2.5, and skips checks that report `-1`. Expected changes: 7.3 when this branch is on `main` (Fuzzing and Pinned-Dependencies), 7.9 after `sign-release.yml` has run for the four existing releases (Signed-Releases 8), 8.1 once the last five releases all carry provenance (Signed-Releases 10), and more once Maintained scores after the repository's first 90 days.

| Check | Weight | Score | Status | Reason |
|---|---|---|---|---|
| Signed-Releases | High | 0 | fixed for new releases; owner step for existing ones | `github-release` signs and attests every asset. The check averages the last five releases that have assets: a signed release scores 8, one with `.intoto.jsonl` provenance 10. Run `sign-release.yml` for `v0.1.0-alpha.0`, `v1.0.0`, `v1.1.0` and `v1.1.1` to reach 8; 10 needs five consecutive releases with provenance. |
| Pinned-Dependencies | Medium | 9 | fixed | The only unpinned item was the `npm install -g npm@^11` fallback in `publish-npm`; it now runs a sha512-verified npm tarball in place. Scorecard still notes that it cannot parse the `RUN node <<'NODE'` heredocs in the Dockerfile; that is informational, not a deduction, and the Dockerfile stays unchanged because any change moves the image pins. |
| Fuzzing | Medium | 0 | fixed | Scorecard accepts property-based testing with fast-check for TypeScript and JavaScript (it looks for `from 'fast-check'` in `.ts` and `.js` files of the repository's main languages). `test/unit/*-properties.test.ts` import it and run in `npm test`. |
| Branch-Protection | High | -1 | optional owner step | Needs `SCORECARD_TOKEN` (above). A partial score is expected afterwards; the required-reviewer tiers stay unmet. |
| Code-Review | High | 0 | accepted | Every change goes through a pull request with the CI checks required, but the single maintainer cannot approve their own pull requests and Scorecard counts approvals (or several authors) on the last 30 commits. It needs a second maintainer, not a code change. |
| Maintained | High | 0 | scheduled (time) | Scorecard scores 0 for any repository created in the last 90 days. Afterwards it counts commits and issue activity over 90 days; the current cadence would score well. |
| Contributors | Low | 0 | accepted | Scores the number of distinct organisations among contributors with at least five commits. One maintainer, no organisation. |
| CII-Best-Practices | Low | 5 | scheduled | Passing badge (project 15261) scores 5; silver 7, gold 10. Remaining silver criteria below. |
| Token-Permissions | High | 10 | met | Top-level `contents: read` everywhere; `github-release` adds job-level `id-token: write` and `attestations: write` for signing, which the check allows (it only penalises top-level write permissions). |
| Dangerous-Workflow, Dependency-Update-Tool, Security-Policy, Binary-Artifacts, Vulnerabilities, License, Packaging, SAST, CI-Tests | Critical to Low | 10 | met | Unchanged by this branch. |

### OpenSSF Best Practices: silver criteria

The project holds the passing badge (project [15261](https://www.bestpractices.dev/projects/15261)). Silver has 55 criteria; as of 2026-10-06, 7 are entered as met (`achieve_passing`, `contribution_requirements`, `report_tracker`, `tests_documented_added`, `warnings_strict`, `crypto_weaknesses`, `static_analysis_common_vulnerabilities`), `dynamic_analysis_unsafe` is N/A, and 47 are unanswered. Filling the form is a later owner task; this is the working assessment of where each unanswered criterion stands.

- **Already satisfied by the repository (enter with the linked evidence):** `documentation_architecture` ([architecture](../architecture.md)), `documentation_security` ([security](../security.md), [threat model](threat-model.md)), `documentation_quick_start` ([getting started](../getting-started.md)), `documentation_current`, `vulnerability_response_process` ([SECURITY.md](../../SECURITY.md): acknowledgement within 14 days, fix within 60), `coding_standards` and `coding_standards_enforced` (ESLint in CI, [above](#eslint)), `build_repeatable` (two builds compared byte for byte in `release:prepare`), `installation_common` (npm, Docker, `.mcpb`), `installation_development_quick` (`npm ci && npm test`), `external_dependencies` (`npm-shrinkwrap.json`, runtime SBOM), `dependency_monitoring` (Dependabot), `updateable_reused_components`, `automated_integration_testing` (`ci.yml`), `test_policy_mandated` ([CONTRIBUTING](../../CONTRIBUTING.md)), `signed_releases` (this document), `input_validation` ([validation rules](../api-contract.md)), `crypto_certificate_verification`, `crypto_tls12` and `crypto_used_network` (HTTPS only, certificate verification cannot be disabled), `implement_secure_design` and `assurance_case` (threat model, design reviews, security test plans in this directory), `hardening` (distroless image, read-only, no capabilities, non-root).
- **Not applicable (state why):** `sites_password_security`, `accessibility_best_practices`, `internationalization`, `build_standard_variables`, `build_preserve_debug`, `build_non_recursive`, `installation_standard_variables` (Node/npm project without a compiled build or system install), `crypto_algorithm_agility` and `crypto_credential_agility` (the HMAC-SHA1 request signature and the token pair are dictated by the appliance API).
- **Open:** `code_of_conduct` (no `CODE_OF_CONDUCT.md`), `governance` and `roles_responsibilities` (single maintainer; document the model), `access_continuity` and `bus_factor` (need a second person with administrative access), `dco` (no sign-off requirement), `documentation_roadmap` and `documentation_achievements`, `maintenance_or_update` (state which versions receive fixes), `vulnerability_report_credit` (SECURITY.md does not yet say that reporters are credited), `interfaces_current`, `regression_tests_added50` (needs a record per fixed bug), `test_statement_coverage80` (coverage is not measured; add `node --test --experimental-test-coverage` or c8 and publish the figure), `crypto_verification_private`, `version_tags_signed` (suggested only: signed git tags).

## Badges

Commented-out Scorecard and Best Practices badges sit at the end of the README badge row in [`README.md`](../../README.md) and [`README.es.md`](../../README.es.md). They are external badge-service images, an exception to the local-only badge rule in [visual identity](../visual-identity.md#badges). Enable them only when the result they show exists: the Scorecard badge after the first published run on `main`, the Best Practices badge after registration (see [releases](../releases.md#openssf-best-practices-registration-owner-one-time)) with `<BESTPRACTICES_ID>` replaced by the numeric project id. Both READMEs ship in the npm package, so enabling them changes the release source pins.
