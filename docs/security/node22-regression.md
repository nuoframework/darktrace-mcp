# Node 22 streaming-test regression

## Reproduction

The release preflight log at `/private/tmp/darktrace-release-preflight22-network/test.log` recorded 97 passed, 0 failed, and 5 cancelled tests out of 102. In the isolated preflight checkout, this command reproduced the failure under Node 22.23.3:

```sh
/private/tmp/node-v22.23.3-darwin-arm64/bin/node --test dist/test/unit/client-http.test.js
```

It returned 18 passed, 0 failed, and 5 cancelled; the first cancellation was `ERR_TEST_FAILURE: Promise resolution is still pending but the event loop has already resolved`. The directly reported subtest was `deadline and caller cancellation remain active while response body is streaming`. The fixture yielded one response chunk and then waited for an abort event without owning a socket or another active event-loop handle. Production intentionally unreferences its deadline timer, so Node 22 could resolve the test event loop before the deadline fired. A second pending-fetch fixture in `deadline starts at admission across queue wait and client close aborts active calls` had the same missing-live-socket assumption.

## Fixture correction

Both pending-stream fixtures now model a live local socket with a referenced, per-fixture two-second watchdog. Each watchdog is cleared and its abort listener removed during fixture cleanup; the caller cancellation timer and clients are also cleaned up in `finally`. The fixtures account for already-aborted signals, and the queue/close test asserts that all modeled socket handles are closed. The watchdog fails promptly if abort is broken, while the existing 30 ms deadline, caller cancellation, queue deadline, client-close cancellation, and expected error-kind assertions remain intact. No production source changed, and no global event-loop handle is retained.

## Verification

The final Node 22 and Node 24 runs used isolated copies of the same workspace snapshot. Each copy used the workspace `node_modules` through a symlink; no dependencies were installed, and each build output stayed inside its copy.

| Runtime | Isolated copy | `npm run typecheck` | `npm test` |
|---|---|---|---|
| Node 22.23.3 | `/private/tmp/darktrace-node22-fixed-final.I3EzZK` | passed | 102 passed, 0 failed, 0 cancelled, 0 skipped |
| Node 24.14.1 | `/private/tmp/darktrace-node24-fixed-final.3gwmr9` | passed | 102 passed, 0 failed, 0 cancelled, 0 skipped |

Commands run for Node 22.23.3:

```sh
PATH="/private/tmp/node-v22.23.3-darwin-arm64/bin:$PATH" /private/tmp/node-v22.23.3-darwin-arm64/bin/npm run typecheck
PATH="/private/tmp/node-v22.23.3-darwin-arm64/bin:$PATH" /private/tmp/node-v22.23.3-darwin-arm64/bin/npm test
```

Commands run for Node 24.14.1:

```sh
PATH="/Users/nuofrwk/.nvm/versions/node/v24.14.1/bin:$PATH" /Users/nuofrwk/.nvm/versions/node/v24.14.1/bin/npm run typecheck
PATH="/Users/nuofrwk/.nvm/versions/node/v24.14.1/bin:$PATH" /Users/nuofrwk/.nvm/versions/node/v24.14.1/bin/npm test
```

SHA-256 values from the final workspace and both passing isolated copies:

| File | SHA-256 |
|---|---|
| `test/unit/client-http.test.ts` | `d9cb2e8addd8b910adc412b85b64c07760b8901d74dc9d02c2aeeb18a11244cd` |
| `src/client/httpClient.ts` | `98bf8a8db1814fae2d33af470d4651c6665e75c4c51f97bc1ea502e5d7697f70` |
| `src/client/httpsConnector.ts` | `cc48293791dec4a615e145dadf1aeba56ef0d805c9a276739ae307c457ae9e8c` |

Both passing copies have the listed test and production-source hashes, confirming they tested the same final source. The regression document itself is updated after the runs and is not part of either build.
