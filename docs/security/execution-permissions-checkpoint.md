# Execution permissions checkpoint

2026-10-05. Coordinator observation, not a compatibility result.

The current managed execution profile permits workspace file changes, restricts network access, and does not permit approval escalation. Repository Git metadata is read-only. Publication and container checks require access that this profile does not currently provide.

Actual `docker volume inspect` and exact registered ephemeral `docker volume rm` attempts both returned exit 1 with `permission denied while trying to connect to the docker API` at the local Docker socket. No container or appliance call was made by these attempts. A successful `docker version` invocation alone did not establish volume API access.

The earlier `SECRET_VOLUME_NOT_REVIEWED` harness result remains a failed preflight, not proof of invalid secrets or an appliance error. Its cause has not been conclusively attributed; the later socket denial is independently confirmed.

The coordinator-created ephemeral lab secret volume has **not been confirmed deleted**. Its exact identifier remains registered in the protected external marker `/private/tmp/darktrace-mcp-active-lab-secret-volume`. Do not delete unrelated/operator volumes, print credentials, or remove that marker before exact-volume cleanup succeeds. Once Docker access is available, inspect and remove only that registered volume; if another campaign is required, provision fresh protected inputs through the reviewed procedure.

Independent synthetic source/contract review and documentation work can continue. A final image rebuild, scan, source/runtime binding, Docker-to-appliance campaign, remote CI and stable publication remain pending. Historical receipts do not certify the changed release source. No alternative runtime is authorized to bypass the managed restrictions.

## Reviewed consultation source and current checks

The corrected consultation source `d4d3f78c3a8e6668fcab76b483d6ec5d13a20e34b3f08853651f2039a985fb87` and complete first-stable contract `ea31d70a484c0d0353cb8651edc4b6a4ab13798c096056e8cdcf68e78324707f` were independently accepted in [the capability review](first-stable-capability-review.md#6-addendum-2026-10-05-corrected-checkpoint-d4d3f78c-and-closure-of-sc-01). The approved contract was subsequently pinned separately; the historical alpha fixture remains unchanged.

Actual checks in `/private/tmp/darktrace-stable-gates-olv6hjlc`: typecheck passed; the full functional suite passed 118/118 with no failures or skips. The [security receipt](../../test/security/evidence/2026-10-05T21-05-05-096Z.json), SHA-256 `567714c247b450493b012a696f295f4e709048b384244caddeae28b48e7f3c2d`, is complete and bound to that source. Its Node test runner returned **exit 1**: 325 cases, **313 passed, six failed and six skipped**. All six failures are actual TLS fixture attempts that returned `listen EPERM` on loopback; all six skips are existing special-permission-bit fixtures that the platform could not represent. The receipt classifies those twelve cases as blocked; that classification does not turn the failed runner into a passed release gate. Earlier stale write expectations were corrected without changing production authorization or bypassing the environment.

A separate bounded DNS lookup for the lab returned `ECONNREFUSED`, before any API request or credential use. This records resolver availability in this environment; it does not diagnose the lab, its ACLs or authentication. Native and Docker final-source lab campaigns remain pending. No alternate resolver or runtime was used to bypass the restriction.

The [release helpers](first-stable-release-helpers-review.md) were independently accepted, with 32 targeted manipulation checks rejected and the failed security receipt correctly preventing release verification. The coordinator subsequently checked that all four reviewed helper hashes still match, and that the current production file inventory exactly matches the source-bound receipt. The later stdio test change adds only the exact expected diagnostic-variable assertion and passes the fresh 118-test functional run. The README updates describe the blocked results and consultation scope; they do not grant a release approval. Current reviewed checkpoint hashes: stdio test `8d29d0e69964b03d26bbfdeffdacc233a486992cc7a563c4b6647ab96f14cddc`, English README `f8780516959e66f6bf645c08ca10d3d07351c0619f3f45aff6d1e1ab701977dc`, Spanish README `f036e890be3a40dacd04b21dca81b5dab5464332f5a5521f3e81138661fcf580`. A future package pipeline must use a fresh frozen snapshot containing these reviewed changes, after the remaining environment and validation gates are resolved.

Coordinator credential check: 228 regular workspace files enumerated with `rg --files --hidden`, excluding `.git`, `node_modules` and `dist`, contained zero matches for the current protected lab token pair. Values were compared in memory and not printed. This is a dated known-credential check, not a claim of an exhaustive secret audit or a final artifact scan.

## Restored access and fresh d4d3 offline gates — 2026-10-05 UTC

At 21:36 UTC the coordinator reported Docker info and lab DNS succeeding. The exact coordinator-registered ephemeral volume was absent in both an exact-name inspect and an independent volume inventory; the stale protected marker was removed. This supersedes the earlier present-tense socket/volume/DNS observations above without deleting them as historical evidence. This worker did not access lab credentials or call the appliance.

All gates below ran from the external isolated snapshot `/private/tmp/darktrace-final-gates.UrRIgF`, frozen before later shared-checkout production edits. Its production source inventory digest is `d4d3f78c3a8e6668fcab76b483d6ec5d13a20e34b3f08853651f2039a985fb87`; the complete first-stable contract fixture digest is `ea31d70a484c0d0353cb8651edc4b6a4ab13798c096056e8cdcf68e78324707f`. These results are explicitly for that consultation baseline, not the later `aa08c260…` candidate. No external config, token, appliance data, or network call was used; Linux test containers had network disabled while retaining loopback for TLS fixtures.

The coordinator authorized seven explicit callback type annotations in `test/mcp/corrections.test.ts`, `test/mcp/server.test.ts`, and `test/mcp/stdio.test.ts`; assertions and runtime behavior were unchanged. With coordinator approval, `test/security/mcp-defense.test.mjs` was also adjusted to accept only the exact Linux Node 24 `NODE_USE_SYSTEM_CA=1` OpenSSL warning prefix already covered for Node 22. The fixed startup JSON fields, nonzero exit, side-effect guards, and canary checks remain enforced; arbitrary or repeated warnings remain rejected.

| Gate | Runtime | Exact result |
|---|---|---|
| `npm run typecheck` | Linux arm64, Node 22.23.3 / OpenSSL 3.5.8 | Exit 0 |
| `npm test` | Linux arm64, Node 22.23.3 / OpenSSL 3.5.8 | Exit 0; 118 passed, 0 failed, 0 skipped |
| `npm run test:security` | Linux arm64, Node 22.23.3 / OpenSSL 3.5.8 | Exit 0; 325 passed, 0 failed, 0 skipped; complete receipt `2026-10-05T21-58-41-721Z.json`, SHA-256 `bced77f19912f2c782c175f346b37c596d29f1e35db315596ff4d97f07485654` |
| `npm run typecheck` | Linux arm64, Node 24.21.0 / OpenSSL 3.5.8 | Exit 0 |
| `npm test` | Linux arm64, Node 24.21.0 / OpenSSL 3.5.8 | Exit 0; 118 passed, 0 failed, 0 skipped |
| `npm run test:security` | Linux arm64, Node 24.21.0 / OpenSSL 3.5.8 | Exit 0; 325 passed, 0 failed, 0 skipped; complete receipt `2026-10-05T21-57-52-976Z.json`, SHA-256 `c1a66894f1fb06ef2010726663351c6e1e7110a2eb547deee29bb2040f91b2ef` |
| `npm run test:security` | macOS arm64, Node 24.14.1 | Exit 0; 322 passed, 0 failed, 3 skipped. All real TLS fixtures passed; the three skips are setgid mode fixtures the macOS filesystem discarded. Receipt `2026-10-05T21-40-23-825Z.json`, SHA-256 `d0ed5b57e54fe0a0bcef9a42b414f4d0d7308b3c245ac349d950dd8bdc19a52e` |

The initial Linux Node 22 security build exited 2 with seven TS7006 errors; the preserved incomplete receipt is `2026-10-05T21-41-30-671Z.json`. The first Linux Node 24 security run exited 1 with 322 passed and three failed `NODE_USE_SYSTEM_CA=1` metadata checks because its exact warning prefix was not yet allowed; receipt `2026-10-05T21-52-46-927Z.json`, SHA-256 `dc5c88f7886e05130f670f191f7b11c2e37f9218a52c8d0b9cb92b8b2430d4f8`, remains unchanged beside the passing rerun. An initial Linux Node 22 functional invocation also exited 1 because the dependency bind mount was placed at `/deps`, outside Node's package-resolution path; mounting it at `/work/node_modules` made the same `npm test` pass 118/118. The earlier historical failed security receipt `2026-10-05T21-05-05-096Z.json` remains unchanged.

Git metadata writability was checked reversibly: a uniquely named probe file was created in `.git`, written, fsynced, and removed. The SHA-256 fingerprint over `HEAD`, the index, packed refs, and loose refs was identical before and after (`77287345f9647e5f4647e32e8eebd7bd305c9b6571d5c50cae3b1e7aca359b9b`); no index or ref changed.

Both tested official Node images report OpenSSL 3.5.8. The coordinator separately reports an upstream OpenSSL hold while a patched official Node image is investigated; these source-bound passing test receipts do not clear that release blocker. Final-candidate Docker/MCP and appliance campaigns, remote CI, and publication remain pending.
