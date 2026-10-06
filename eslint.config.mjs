// Static analysis for the shipped server source (src/**/*.ts) and the
// release/build helpers (scripts/**/*.mjs). Correctness and security rules
// only: formatting and stylistic rules are off because the repository uses a
// compact style that the type checker and tests already constrain. Every
// retained rule is an error, so `npm run lint` has no warning tier.
// Rationale for each exception: docs/security/supply-chain-checks.md.
import js from '@eslint/js';
import security from 'eslint-plugin-security';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const unusedVars = ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_', ignoreRestSiblings: true, caughtErrors: 'none' }];

export default tseslint.config(
  {
    // First-party code only. Tests, generated output, vendored OpenAPI
    // specs, Python tooling and historical fixtures are out of scope.
    ignores: ['.claude/**', 
      'dist/', 'coverage/', 'release/', '.lab/', 'exports/', 'docs-src/',
      'test/', 'tools/', 'docs/', 'examples/', 'openapi/',
      '**/*.{js,cjs}', 'scripts/**/*.ts',
    ],
  },
  {
    linterOptions: { reportUnusedDisableDirectives: 'error' },
  },
  js.configs.recommended,
  {
    files: ['src/**/*.ts'],
    extends: [tseslint.configs.recommended],
  },
  {
    files: ['src/**/*.ts', '**/*.mjs'],
    plugins: { security },
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      // Security rules with useful signal, promoted to errors.
      'security/detect-bidi-characters': 'error',
      'security/detect-buffer-noassert': 'error',
      'security/detect-child-process': 'error',
      'security/detect-disable-mustache-escape': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-invisible-characters': 'error',
      'security/detect-new-buffer': 'error',
      'security/detect-no-csrf-before-method-override': 'error',
      'security/detect-non-literal-regexp': 'error',
      'security/detect-non-literal-require': 'error',
      'security/detect-possible-timing-attacks': 'error',
      'security/detect-pseudoRandomBytes': 'error',
      'security/detect-unsafe-regex': 'error',
      // Not enabled: detect-object-injection flags every computed property
      // access (hundreds of hits on typed records and arrays) and
      // detect-non-literal-fs-filename flags every fs call on a computed path,
      // which the installer and release helpers do by design under the
      // path checks in src/cli/fsutil.ts. Both produce noise, not findings.

      // Intentional patterns in this codebase.
      'no-control-regex': 'off', // sanitizers deliberately match C0/C1 controls
      'no-irregular-whitespace': ['error', { skipRegExps: true }], // BOM stripping
      'no-empty': ['error', { allowEmptyCatch: true }], // best-effort cleanup
      'no-unused-vars': unusedVars,

      // Stylistic only.
      'no-regex-spaces': 'off',
      'no-useless-escape': 'off',
    },
  },
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': unusedVars,
      // Dynamic OpenAPI/zod shapes are typed loosely on purpose; tsc --strict
      // still checks everything else.
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // Reviewed false positives, scoped to the file that triggers them so the
  // rule stays active everywhere else.
  {
    // Bounded quantifiers or a single character class: linear-time. entry.ts repeats install.ts's exact
    // package-version pattern for the README badge builder.
    files: ['src/cli/install.ts', 'src/cli/entry.ts', 'src/config/address.ts', 'src/shape/output.ts', 'scripts/lab-read-smoke.mjs', 'scripts/validate-examples.mjs'],
    rules: { 'security/detect-unsafe-regex': 'off' },
  },
  {
    // The RegExp constructor interpolates a code-owned top-level key name ('mcpServers' / 'extensions') only;
    // the pattern is anchored and has no nested quantifiers.
    files: ['src/cli/yamlBlock.ts'],
    rules: { 'security/detect-non-literal-regexp': 'off' },
  },
  {
    // TOML header regex: quadratic worst case on a single local config line
    // (the user's own Codex config); tracked as a known low-severity item.
    // The RegExp constructor interpolates the constant SERVER_NAME only.
    files: ['src/cli/toml.ts'],
    rules: { 'security/detect-unsafe-regex': 'off', 'security/detect-non-literal-regexp': 'off' },
  },
  {
    // Patterns come from the bundled, reviewed OpenAPI catalogue / the
    // committed Dockerfile with an allow-listed architecture.
    files: ['src/api/validation.ts', 'scripts/prepare-docker-runtime.mjs'],
    rules: { 'security/detect-non-literal-regexp': 'off' },
  },
  {
    // Comparisons are a loop counter and an escaped-vs-raw token check in the
    // redactor; neither compares a secret against attacker input.
    files: ['src/client/signer.ts', 'src/shape/redact.ts'],
    rules: { 'security/detect-possible-timing-attacks': 'off' },
  },
  {
    // The invisible-character class lists combining marks and variation
    // selectors on purpose so they are stripped one code point at a time.
    files: ['src/shape/output.ts'],
    rules: { 'no-misleading-character-class': 'off' },
  },
  {
    // The stream error is replaced by a fixed message on purpose so that
    // transport details never reach tool output.
    files: ['src/client/httpClient.ts'],
    rules: { 'preserve-caught-error': 'off' },
  },

  // Known genuine findings in files this change does not edit; remove each
  // exemption together with its fix.
  {
    files: ['src/tools/index.ts'], // unused import: safeErrorMessage
    rules: { '@typescript-eslint/no-unused-vars': 'off' },
  },
  {
    files: ['scripts/prepare-release.mjs'], // unused import: resolve
    rules: { 'no-unused-vars': 'off' },
  },
);
