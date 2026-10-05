# Client audit corrections CA-01–CA-07, FR-01 and AD-01–AD-03

**Status:** CA-01–CA-07, FR-01/FR-02 and AD-01–AD-03 corrections pass the isolated unit suite and the coordinator's frozen 238-case campaign. Opus independently reviewed the final source and ARCH/TM wording and reported zero open code defects. User-guide FR-02b, live Darktrace validation, provider eligibility, real private-network pinning and ST-15 artifacts remain outside this correction scope; no appliance or lab credentials were used.

## Findings and evidence

| Finding | Correction | Regression evidence |
|---|---|---|
| CA-01 — TLS errors could enter GET retry path | Network retry now requires an exact code from the pre-response transient allowlist: `ECONNRESET`, `ECONNREFUSED`, `ETIMEDOUT`, `EPIPE`, `ECONNABORTED`, `ENETUNREACH`, or `EHOSTUNREACH`. TLS verification and unknown errors do not retry. | `test/unit/client-http.test.ts`: `GET retries only an explicit allowlist of pre-response network codes, never TLS or unknown errors`; ECONNRESET retries, while OpenSSL issuer/CA and other TLS errors make one attempt and one signature. |
| CA-02 — caller abort during initial DNS was terminal but undocumented | Kept the conservative terminal behavior. ARCH §5.3 and TM's private-network section state that an abort of the first caller cancels shared resolution, denies concurrent waiters and remains terminal until process restart; ST-04 now specifies this case. | `test/unit/client-network.test.ts`: `aborting initial DNS cancels the resolver and prevents signing or fallback attempts` exercises a concurrent waiter and subsequent call; one resolver call and zero signer calls. |
| CA-03 — recursive redaction normalized strings and mishandled `__proto__` | Nested string values are redacted literally without interpreting them as JSON. JSON log strings retain parsed value types; recursive object copies use null prototypes, retaining an own `__proto__` key without prototype mutation. | `test/unit/client-http.test.ts`: literal redaction checks preserve `1.0`, `[1, 2]`, and `true ` exactly; JSON log parsing retains string/number/boolean types; an own `__proto__` survives and no property is inherited. |
| AD-01 — encoded private token appeared in upstream output | Redaction covers the literal and known one-step UTF-8 representations: standard/base64url (padded or unpadded), URI percent encoding (including hex case), and lowercase/uppercase hexadecimal. Arbitrary or repeated encodings are not claimed. | `test/unit/client-http.test.ts`: `known token encodings are removed from structured, text and JSON log sinks` checks synthetic canaries across content, structured content, recursive objects and JSON logs, plus exact preservation of a clean user string. |
| AD-03 — unknown telemetry fields reached model-visible output | Response projection uses code-owned schema-backed views; unknown properties are omitted, unknown/unmodeled shapes become a fixed summary, `@message` is excluded and `@fields` retains only its fixed summary with dynamic values omitted. | Final coordinator receipt passed `ST-09.MINIMIZATION unknown sensitive telemetry excluded from read and sensitive search views`, including both status and Advanced Search branches. |
| FR-02 — security wording overstated minimization/redaction | ARCH §5.7 and TM's disclosure section now describe code-owned views, fixed summaries for unmodeled data, excluded `@message`, summary-only `@fields`, and the bounded one-step token redaction forms. They expressly disclaim arbitrary, repeated/double and prefixed encodings. | Opus independent review accepted FR-02 in `docs/security/final-code-review.md`; SHA-256 `369f2692eb8b0e02103912180c0295fc78a0bc688ceb42ad2a1231d1e7f415ab`. |
| AD-02 — deadline/cancellation stopped at response headers | The node:https connector keeps the abort listener while the response body is active, destroys both the response stream and request socket on abort, and removes listeners on body end/error/close/cancel. | `test/unit/client-http.test.ts`: `deadline and caller cancellation remain active while response body is streaming` checks both total-deadline and caller-cancellation paths. The coordinator's real TLS campaign also passed `ST-11.TLS real slow body admission deadline` and `ST-11.TLS real slow body caller cancellation`. |
| CA-04 / FR-01 — transition and translation prefixes could reach forbidden IPv4 destinations | Fail closed on entire `::/96` IPv4-compatible, `::ffff:0:0/96` IPv4-translated, `64:ff9b::/96` NAT64 WKP, `64:ff9b:1::/48` local-use NAT64 NSP, `2002::/16` 6to4 and `2001::/32` Teredo prefixes. IPv4-mapped IPv6 is canonicalized and checked as IPv4; blocked prefixes cannot be authorized by an allowlist. Arbitrary operator-selected NAT64 prefixes cannot be identified; use an exact-IP allowlist for additional control. RFC1918, ULA, and configured public global-unicast addresses otherwise remain allowed. | `test/unit/client-network.test.ts`: `IPv4-in-IPv6 transition and metadata destinations are denied before signing or opening a socket` asserts zero signer/socket calls with and without matching allowlists for forbidden examples, including public-looking addresses in transition prefixes; it allows RFC1918, ULA, mapped RFC1918 and public `8.8.8.8`. |
| CA-05 — relative config paths were accepted | `DARKTRACE_CONFIG_FILE` and the diagnostic override must be absolute before any file open. | `test/unit/config.test.ts`: `DARKTRACE_CONFIG_FILE and diagnostic overrides reject relative paths before opening files`. |
| CA-06 — legacy preview echoed caller field names and ran before blocked-shape checks | S4 query+JSON, S5 DELETE+query and S6 GET/base64 checks now run before preview. Preview keys must be code-owned descriptor names (plus fixed path parameter names); unlisted caller keys reject without preview output. | `test/unit/client-http.test.ts`: `preview rejects blocked shapes and caller-owned field names before returning metadata` asserts invalid_request with zero signer/network calls; the ordinary preview checks the exact safe shape. |
| CA-07 — empty JSON allowlist guidance contradicted startup behavior | `docs/configuration.md` now states that empty JSON and environment allowlists are startup configuration errors. | Documentation checked against `parseConfig`'s existing empty-list rejection (`instance.destinationAllowlist must not be empty`). |

The related D1 note is now also repeated in `.env.example` and `docs/troubleshooting.md`: Node loads `NODE_OPTIONS` preloads and `NODE_EXTRA_CA_CERTS` before server validation; operators must review them in the trusted launcher and protect any `--env-file` as executable trust configuration.

## Verification

The final worker typecheck and unit suite ran from the clean isolated copy `/private/tmp/darktrace-fr01.n4t5Pc`; its build output stayed outside the shared checkout. The snapshot was checked to contain no misplaced `client-http.test.ts` under `src/shape`:

```text
npm run typecheck
> tsc -p tsconfig.json --noEmit
PASS (exit 0)

npm test
> npm run build && node --test dist/test/**/*.test.js
PASS: 102 tests, 102 passed, 0 failed, 0 skipped
```

An earlier coordinator run used the same isolated runner and test arguments but predates FR-01 whole-prefix rejection; its 218-case receipt is retained below as prior evidence only. The final coordinator rerun invoked `node test/security/run-isolated.mjs`; build and test exited 0. The receipt records the exact test arguments: `node --import ./test/security/assertion-counter.mjs --test --test-concurrency=1 test/security/config.test.mjs test/security/limits-retries.test.mjs test/security/network.test.mjs test/security/policy-sinks.test.mjs test/security/signer-client.test.mjs test/security/stdio.test.mjs`. Result: 238 tests, 235 passed, 0 failed, 3 skipped because macOS discarded the requested setgid 2600 permission bits; only those three OS-dependent fixtures were blocked. It records 4,434 assertion invocations, all 20 FR-01 cases, AD-01/02/03, and the real TLS slow-body checks as passing.

Prior coordinator receipt: `test/security/evidence/2026-10-05T12-59-46-877Z.json`, SHA-256 `861372a92c7a98b493c976c958652acde386ddea4ecb64aff17529a45049f5a2`, sourceTree `c8585b8f90ee50103197c788569aaad29eb1c3cd0d22a698539ce8dcf92d0419` (before FR-01). Final receipt: `test/security/evidence/2026-10-05T13-13-32-846Z.json`, SHA-256 `85cb6c2dc7558c5c2b7aaf307605a64453795821726584730372b902db6e633f`, sourceTree `f7bfeac17dfae00c0152df0e93a15d88b1882c5fd84d4a4dd5e24b7b5bd80bed`. The worker sandbox's inability to bind a TLS fixture was resolved by the coordinator's isolated root run. Darktrace 7.1 lab validation remains outside this correction run.

Opus review: `docs/security/final-code-review.md`, SHA-256 `369f2692eb8b0e02103912180c0295fc78a0bc688ceb42ad2a1231d1e7f415ab`; it accepts FR-02 in ARCH/TM and reports zero known open code defects. It leaves FR-02b user guides for the publishing phase, along with lab 7.1, provider eligibility, production private-network pinning, and ST-15 package/image evidence outside this review.

## Source and regression snapshot

SHA-256 values below identify the final source/tests and the related operator/security documentation:

| File | SHA-256 |
|---|---|
| `src/client/httpClient.ts` | `98bf8a8db1814fae2d33af470d4651c6665e75c4c51f97bc1ea502e5d7697f70` |
| `src/client/httpsConnector.ts` | `cc48293791dec4a615e145dadf1aeba56ef0d805c9a276739ae307c457ae9e8c` |
| `src/config/address.ts` | `095e032867be614dd44dffd49de774a87effe4b9d8ac305cd62de4e1319da61e` |
| `src/config/load.ts` | `e12438d21878c95fd1749011903300ba2a3cb589c3947a03e0388c960e8f6d10` |
| `src/shape/redact.ts` | `8c79e7f45fe3d51f174d8473b2d49583681d0704c3a460b78abec27dea0716dc` |
| `test/unit/client-http.test.ts` | `234f635a4db06eb9fe0f7063aa34c9f67bf0c2a342d50b35a22bf1cd1c7f6f94` |
| `test/unit/client-network.test.ts` | `65dd6d716b5715f3da87f5b816a5b5045e147a5f67ec749bb29fb6fb866d6c1a` |
| `test/unit/config.test.ts` | `fbee92db96c775227dae99e7a34fdd5337efac063425d31a33a44f9ad73b1be9` |
| `docs/architecture.md` | `302482254f3106f08cf34e148010b5b05c6b9095ae421059fc19914a49f57583` |
| `docs/security/threat-model.md` | `4993ab331d0c437085827fbabef95fcd1db5724b05dd74c8085f46f9088468f5` |
| `docs/security/security-test-plan.md` | `9b33ba6bee2e7187f491a1ff2adb6d128599fc43dae40b5f1cd79b36d6aaf256` |
| `docs/configuration.md` | `16767c7bc501ddf9846188dba633c07acb324b10de43edc7fc361a918af70ee2` |
| `docs/troubleshooting.md` | `6e1d8a6df5867f639adf39f5443ce596871ea7fd8bc88cc25c0d2cf62977c54b` |
| `.env.example` | `1d9e56c7273243ea6932a2da2c74e4b5d03679836b6d17dfd404e1bd14a59e11` |
