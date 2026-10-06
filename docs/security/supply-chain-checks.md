# Supply-chain checks

[Security overview](../security.md) · [Releases](../releases.md)

Four automated controls run on the repository in addition to the offline test and security suites. None of them changes what the server does at runtime, and none of them gates a release on its own: `release.yml` and `release:prepare` remain the release gate.

| Control | Where | Runs on | Output |
|---|---|---|---|
| CodeQL | [`.github/workflows/codeql.yml`](../../.github/workflows/codeql.yml) | push to `main`, pull requests to `main`, weekly (Monday), manual | Code scanning alerts, category `/language:javascript-typescript` |
| ESLint | [`eslint.config.mjs`](../../eslint.config.mjs), `npm run lint`, CI job `lint` in [`ci.yml`](../../.github/workflows/ci.yml) | every push and pull request | Job log; any finding fails the job |
| Dependabot | [`.github/dependabot.yml`](../../.github/dependabot.yml) | weekly (Monday) | Pull requests for npm packages and GitHub Actions |
| OpenSSF Scorecard | [`.github/workflows/scorecard.yml`](../../.github/workflows/scorecard.yml) | push to `main`, branch-protection changes, weekly (Monday), manual | Code scanning alerts (tool `Scorecard`), public result on scorecard.dev |

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

## OpenSSF Scorecard

Scorecard checks repository practices (pinned dependencies, token permissions, branch protection, code review, SAST, signed releases, dependency update tool, security policy and others) and scores each from 0 to 10. With `publish_results: true` the result is published to the OpenSSF API, which the badge and the [viewer](https://scorecard.dev/viewer/?uri=github.com/nuoframework/darktrace-mcp) read; the workflow also uploads the SARIF to code scanning.

Reading results: **Security → Code scanning**, filter by tool `Scorecard`. Each alert is one check below 10 with the remediation text from Scorecard. Some checks depend on repository settings rather than files (branch protection, required reviews); those are fixed in the GitHub settings, not in code. The SARIF file is also kept as the `scorecard-sarif` workflow artifact for five days.

`publish_results` restricts the workflow: top-level permissions stay `read-all`, and the job may only contain the checkout, Scorecard, upload-artifact and upload-sarif steps. Do not add other steps to it.

## Badges

Commented-out Scorecard and Best Practices badges sit at the end of the README badge row in [`README.md`](../../README.md) and [`README.es.md`](../../README.es.md). They are external badge-service images, an exception to the local-only badge rule in [visual identity](../visual-identity.md#badges). Enable them only when the result they show exists: the Scorecard badge after the first published run on `main`, the Best Practices badge after registration (see [releases](../releases.md#openssf-best-practices-registration-owner-one-time)) with `<BESTPRACTICES_ID>` replaced by the numeric project id. Both READMEs ship in the npm package, so enabling them changes the release source pins.
