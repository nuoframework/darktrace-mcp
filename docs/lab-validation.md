# Current validated-consultation lab procedure

Only an authorized operator may run lab commands; this documentation worker made no API calls or credential reads. Native and hardened Docker MCP passed all 19 distinct permitted selectors on accepted source `9e7c7070…`, as recorded with exact sanitized receipt hashes and cleanup in [the lab checkpoint](security/validated-consultations-lab-checkpoint.md). Earlier missing-identifier and permission failures remain historical. This is bounded recipe evidence, not full API compatibility or final suite completion; OpenSSL 3.5.8 / CVE-2026-35189 still blocks stable publication.

Both profiles have the same 15 tools / 19 GET ceiling. Do not select broader historical recipes below: excluded operations are denied before preview, audit or network. Root must create a protected source/runtime manifest for exact accepted bytes after every bound helper/harness change. No retry, pagination, invented identifier, hidden discovery or relaxed safety limit is permitted.

A supported endpoint subset uses status first and discovers a valid IP in memory from one explicitly reviewed inventory page, `count=10, offset=0`, with the recipe's existing default 28-day window. Minimal device search remains `count=1, seensince=300`. Missing identifiers fail closed without the target request. Paths below are fictitious; no command was executed against an appliance by this worker.

```sh
node scripts/lab-read-smoke.mjs --config /absolute/private/operator.json --runtime-manifest /absolute/private/reviewed-runtime.json --validation-profile inventory --operations get_status,get_devicesearch,get_endpointdetails
```

For a status-only smoke, use `--tools darktrace_get_status` instead of `--operations`; never combine flags. Docker uses the same protected runtime binding and an exact image ID; root owns secret-volume provisioning and verified cleanup. See [the complete current mapping](architecture.md#11-current-implementation-snapshot).

## Historical broader campaign procedures — superseded, not active instructions

The preserved procedure below includes formerly proposed selectors and predecessor source hashes. These are historical design/review context only; broader recipe tables and batches must not be used as current release examples. Sanitized receipts, failed attempts and reported limits retain their original outcomes. Current supported commands are above.

# Manual bounded read smoke — operator execution

**Readiness only.** The worker prepared and checked this harness offline without reading real credentials or lab configuration and without contacting an appliance. The coordinator has since reported limited initialized-MCP lab results; post-fix compatibility, remaining endpoints and stable gates are pending. See the coordinator-attributed evidence in stable-readiness.md. This document does not change the historical offline/audit evidence or establish Darktrace 7.1 compatibility.

## Preconditions and protected configuration

The coordinator/operator alone runs `scripts/lab-read-smoke.mjs`, using a reviewed checkout, its production compiled `dist/src/index.js`, a protected reviewed runtime manifest, Node.js 22+ and the existing `@modelcontextprotocol/client` development dependency. The script does not build or install anything. Use a reviewed Node invocation without unreviewed preloads; this harness is not isolation from hostile same-user host code.

Keep configuration and separate public/private token files outside the repository. Configuration must be an absolute-path regular non-symlink file owned by the runtime UID, mode `0600` or stricter, at most 65,536 bytes. Each token file must meet the production ownership/non-symlink checks, be at most 4,096 bytes and contain only its token with an optional final LF. Never put real values in commands, examples, reports or chat.

The parent harness never opens the config or token files. It passes `DARKTRACE_CONFIG_FILE` to the production stdio child, whose normal `loadConfig` checks these files. Use token-file references in protected JSON, or operator-provisioned `DARKTRACE_PUBLIC_TOKEN_FILE` and `DARKTRACE_PRIVATE_TOKEN_FILE` environment variables. The harness forwards those **path variables only**, not direct token variables, URLs or arbitrary `DARKTRACE_*` environment values. An approved `NODE_EXTRA_CA_CERTS` path may be forwarded; TLS verification remains mandatory. Config path and CA path are never emitted.

Illustrative protected JSON only — these are fictitious placeholders, not a lab target:

```json
{
  "instance": {"baseUrl": "https://appliance.example.invalid", "timeoutMs": 30000},
  "auth": {
    "publicTokenFile": "/absolute/private/public-token",
    "privateTokenFile": "/absolute/private/private-token",
    "dateFormat": "compact",
    "querySignatureEncoding": "unencoded"
  },
  "profiles": {"read": true, "write": false, "sensitiveRead": false, "writeCritical": false},
  "transport": {"kind": "stdio"}
}
```

The operator must choose the actual approved endpoint, destination allowlist, CA and documented signing mode privately. The harness does not try alternate signing modes or change network policy after an error. It forces the bounded read-only settings below via production environment overrides; these explicit smoke settings override corresponding JSON values.


## Reviewed source/runtime binding (LH-01 prerequisite)

Every non-help invocation now requires `--runtime-manifest`. Before importing the SDK or compiled code, or launching any child, the harness reads only this **non-secret** external manifest and hashes local source/build files and all installed files in the 14 exact host SDK dependency packages. It never opens the protected lab configuration or token files. Missing, stale, altered or incomplete bindings produce fixed `DIST_NOT_REVIEWED`, exit 1, with no child/network startup.

Manifest schema is exactly `{schemaVersion:2, sourceFiles:{relativePath:sha256}, runtimeFiles:{relativePath:sha256}, dependencyTrees:{packageName:sha256}}`. Schema 1 is rejected. `dependencyTrees` contains exactly `@modelcontextprotocol/core`, `@modelcontextprotocol/server`, `@modelcontextprotocol/client`, `zod`, `cross-spawn`, `which`, `isexe`, `path-key`, `shebang-command`, `shebang-regex`, `eventsource`, `eventsource-parser`, `pkce-challenge` and `jose`. This closed list covers the reviewed Node SDK index/stdio import closure and complete declared runtime dependency closure, including optional OAuth-only `jose` defensively; it must be independently reviewed again after SDK or lock changes. It does not claim to cover arbitrary optional SDK entrypoints or unreviewed Node preloads. Each digest hashes the UTF-8 compact JSON of the complete package-relative file-path → SHA-256 map, with keys sorted in JavaScript ordinal order; `package.json` and every regular file are included, including empty files. Missing/extra packages in the manifest or missing/extra/changed files invalidate the digest. Symlinks at `node_modules`, its SDK scope, package roots or within packages, and special files, are rejected. Both native and Docker modes check these host dependencies **before importing the SDK**. Dependency hashing has aggregate budgets of 4,096 files, 64 MiB, 8 MiB per file, 4,096 directories, depth 32 and a 20-second local deadline; excess fails closed. Both inventories must match completely: source `src/**/*.ts,json`, `scripts/**/*.mjs,ts`, plus `package.json`, `package-lock.json`, `npm-shrinkwrap.json`, `tsconfig.json`, `tsconfig.generate.json`, `openapi/darktrace-threat-visualizer.yaml`, `docs/operation-inventory.json`; runtime `dist/src/**/*.js,json`. Paths are fixed checkout-relative paths, not alternative entrypoints. Unexpected/omitted files, symlink path components, bad hashes and mismatches fail closed. Each hashed file is capped at 8 MiB.

The external JSON must be UTF-8, a single-link regular file owned by the current UID, mode `0600` or stricter without special setuid/setgid/sticky, executable/group/other permissions, at most 65,536 bytes. It is opened with `O_NOFOLLOW | O_NONBLOCK` and checked by descriptor before bounded reading. Keep its path outside the checkout; never place protected config/credentials inside it. The digest alone does not certify source-to-build correspondence: the operator must create and approve it **after** a clean build of the reviewed source and freeze those files throughout execution. Dependencies must first be installed with `npm ci --ignore-scripts` from the reviewed lock/shrinkwrap in a clean independently reviewed snapshot, with npm SRI checks enabled. Never generate a fresh manifest to bless an unexplained installed-tree change. The installed tree is now bound, but this does not authenticate package origin, replace lock/SRI and source review, or isolate hostile same-user code or a compromised Node executable.

The build must include the honest, code-owned fixed `User-Agent: darktrace-mcp`. An older build without that patch can fail status authorization; `TOOL_ERROR` still cannot diagnose HTTP 403, ACL or signing causes. Do not switch signature modes in response to a generic error.

Operator preparation, without lab secrets and after source review:

```sh
npm ci --ignore-scripts
npm run build
```

`build.mjs` removes previous generated `dist/` before compiling/generating. Run required offline gates separately, review the resulting source/generated files, then generate the manifest with this operator-only helper. The output path below is a fictitious protected path; use a new external file, not an existing manifest. No credential file is read by this helper.

```sh
python3 - /absolute/private/reviewed-runtime.json <<'PYMANIFEST'
import hashlib, json, os, pathlib, stat, sys, time
checkout = pathlib.Path.cwd()
source = []
for directory, suffixes in [('src', {'.ts', '.json'}), ('scripts', {'.mjs', '.ts'})]:
    for item in (checkout / directory).rglob('*'):
        if item.is_symlink():
            raise SystemExit('Unreviewed symlink')
        if item.is_file() and item.suffix in suffixes:
            source.append(item.relative_to(checkout).as_posix())
source += ['package.json', 'package-lock.json', 'npm-shrinkwrap.json',
           'tsconfig.json', 'tsconfig.generate.json',
           'openapi/darktrace-threat-visualizer.yaml', 'docs/operation-inventory.json']
runtime = []
for item in (checkout / 'dist/src').rglob('*'):
    if item.is_symlink():
        raise SystemExit('Unreviewed symlink')
    if item.is_file() and item.suffix in {'.js', '.json'}:
        runtime.append(item.relative_to(checkout).as_posix())
def hashes(names):
    return {name: hashlib.sha256((checkout / name).read_bytes()).hexdigest()
            for name in sorted(names)}
started = time.monotonic()
files_total = bytes_total = dirs_total = 0
def directory(path):
    if time.monotonic() - started > 20 or not stat.S_ISDIR(path.lstat().st_mode):
        raise SystemExit('Invalid dependency directory/budget')
directory(checkout / 'node_modules')
directory(checkout / 'node_modules/@modelcontextprotocol')
dependency_trees = {}
for name in ['@modelcontextprotocol/core', '@modelcontextprotocol/server',
             '@modelcontextprotocol/client', 'zod', 'cross-spawn', 'which', 'isexe',
             'path-key', 'shebang-command', 'shebang-regex', 'eventsource',
             'eventsource-parser', 'pkce-challenge', 'jose']:
    base = checkout / 'node_modules' / name
    files = {}
    def walk(folder, depth=0):
        global files_total, bytes_total, dirs_total
        directory(folder)
        dirs_total += 1
        if dirs_total > 4096 or depth > 32:
            raise SystemExit('Dependency directory budget')
        for item in folder.iterdir():
            mode = item.lstat().st_mode
            if stat.S_ISDIR(mode):
                walk(item, depth + 1)
            elif stat.S_ISREG(mode):
                files_total += 1
                fd = os.open(item, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
                with os.fdopen(fd, 'rb') as source_file:
                    metadata = os.fstat(source_file.fileno())
                    bytes_total += metadata.st_size
                    if not stat.S_ISREG(metadata.st_mode) or files_total > 4096 or metadata.st_size > 8388608 or bytes_total > 67108864:
                        raise SystemExit('Dependency file budget')
                    content = source_file.read(metadata.st_size + 1)
                    if len(content) != metadata.st_size:
                        raise SystemExit('Dependency changed during reading')
                files[item.relative_to(base).as_posix()] = hashlib.sha256(content).hexdigest()
            else:
                raise SystemExit('Dependency symlink/special file')
            if time.monotonic() - started > 20:
                raise SystemExit('Dependency deadline')
    walk(base)
    if 'package.json' not in files:
        raise SystemExit('Missing dependency package manifest')
    ordered = {key: files[key] for key in sorted(files, key=lambda x: x.encode('utf-16-be'))}
    canonical = json.dumps(ordered, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    dependency_trees[name] = hashlib.sha256(canonical).hexdigest()
value = {'schemaVersion': 2, 'sourceFiles': hashes(source), 'runtimeFiles': hashes(runtime),
         'dependencyTrees': dependency_trees}
encoded = (json.dumps(value, sort_keys=True, indent=2) + '\n').encode()
if len(encoded) > 65536 or not runtime:
    raise SystemExit('Invalid manifest size/inventory')
fd = os.open(sys.argv[1], os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
with os.fdopen(fd, 'wb') as output:
    output.write(encoded)
print(hashlib.sha256(encoded).hexdigest())
PYMANIFEST
```

If source, harness, generator input, dependency manifests, installed dependency bytes or compiled output changes, rebuild where needed and create/review a new manifest before any further run. Never repair a mismatch merely by blessing stale compiled bytes. Root independently reviews origin/build integrity; this helper does not replace that gate.

## Separate reviewed GET campaign

Use `--operations` instead of `--tools`, with explicit operation IDs; the two flags cannot be combined. Unknown operations, duplicates, more than eight selections or a first selection other than `get_status` are rejected. Each operation maps to its reviewed compiled tool alias, whose read/idempotent/non-destructive annotations must be advertised by the initialized production MCP server. Campaign entries are hard-coded, checked against compiled schemas and read tier, method GET, sensitivity low/medium, implemented status and enabled-by-profile execution. Changing the catalogue does not automatically add an operation to the allowlist.

Example **operator-only selection after independent review**, not a command run by the worker:

```sh
node scripts/lab-read-smoke.mjs --config /absolute/private/operator.json --runtime-manifest /absolute/private/reviewed-runtime.json --operations get_status,get_devices,get_devicesummary
```

The complete per-operation matrix and suggested batches are in [stable-readiness.md](stable-readiness.md). There are 54 executable catalogue operations: 38 GET, 15 POST and one DELETE. PCAP listing is excluded from this campaign despite its read classification, leaving 37 baseline GET operations. Of these, 34 have schema-accepted fixed recipes; `get_endpointdetails`, `get_metricdata` and `get_summarystatistics` deliberately report a `BLOCKED_*` category until safe semantics are reviewed. All POST/DELETE, sensitive AdvancedSearch, email, exports, PCAP and active/state-changing actions are excluded.

Time-paired operations use a five-minute millisecond window anchored once per run; the compiled parameter descriptions must explicitly confirm millisecond units. Collections with count use `count:1`; device search uses `offset:0`; device activity filters use `seensince:'300'` (five minutes, explicitly approved by root); subnet activity remains `seensince:'60'`. One selected application GET each, no follow-up pages, and the same byte/output limits apply. Endpoints lacking count/time filters cannot claim an upstream count/time ceiling: the table identifies metadata collections and single-resource reads bounded only by selection and bytes. In particular, `intervalhours` on deviceinfo is an aggregation size, not a time window, and is not used as a false bound.

Required resource handles come only from explicitly selected earlier discovery operations in the **same run**. Only the first positive safe integer `did/pid/tid/cid/mlid/pbid`, a canonical current model UUID, or a bounded incident event's own identifier is retained in memory. Campaign get_models requires the UUID from earlier modelbreaches.model.now.uuid; it never falls back to the full model collection. Numeric tid can also be discovered from the single devicesearch result's tags or filtered tag entities, without retaining a tag name. No IP/hostname/name is retained as an input handle. No arbitrary CLI IDs, invented fallback IDs or inference from an AI group ID are allowed. Schema validation runs again on each fully constructed request before calling MCP. Missing/omitted/empty-inventory handles yield `BLOCKED_MISSING_IDENTIFIER` without making that dependent request; unsupported inputs yield `BLOCKED_INPUT_SCHEMA`. They are not passes. The run stops on any blocker/failure; another reviewed subset may be run separately.

The four stats maps groupStats.mitreTactics.total/compliance/suspicious/critical may be empty, because the OpenAPI expressly omits tactic keys when no incidents match and requires none. Only these exact get_aianalyst_stats paths accept an empty object after checking that compiled contract; roots/other empty objects, unknown keys and type mismatches still fail. Campaign output validates the code-owned minimized response view conservatively (known keys/types, envelope, no truncation), not an entire upstream response. Empty collections may pass a basic shape check but provide no resource/dependent coverage. Shape mismatch or truncation is a compatibility/coverage blocker, never a reason to increase limits automatically. Tool text/content, full telemetry, handles, request arguments and remote errors are never emitted or written; no raw data is stored even temporarily. Aggregating multiple runs is an operator review step, not an automatic retry loop.

## Phase 1: explicit status only

First inspect help without any config/credentials:

```sh
node scripts/lab-read-smoke.mjs --help
```

Then the coordinator runs **only** status with its protected external configuration:

```sh
node scripts/lab-read-smoke.mjs --config /absolute/private/operator.json --runtime-manifest /absolute/private/reviewed-runtime.json --tools darktrace_get_status
```

The SDK client initializes a real MCP stdio session against the production entrypoint, performs one bounded tools listing, confirms the selected tools' read/idempotent annotations and local compiled operation schemas, and makes the selected tool call. Initializing/listing does not itself call the appliance. Status uses the fixed selector `get_status` and query `{fast:true, includechildren:false}`; no arbitrary tool arguments are accepted from CLI.

Require exit 0 and a successful expected-shape status outcome before proceeding. Stop on any failure, including generic tool errors, timeout, missing registration, schema mismatch, output truncation or an unexpected output shape. A successful status probe is limited evidence for that endpoint/configuration, not proof of all signing modes, token ACLs, 7.1 APIs, writes, provider eligibility or deployment readiness.

## Phase 2: separately reviewed deterministic candidates

The coordinator decides the exact optional subset **after reviewing the advertised schemas and a successful status run**. Do not automatically execute this example. The fixed candidate allowlist is:

| MCP tool | Explicit operation | Fixed inputs | Source contract / bound |
|---|---|---|---|
| `darktrace_get_status` | `get_status` | `query.fast:true`, `query.includechildren:false` | GET `/status`; low-sensitivity read; always first |
| `darktrace_list_models` | `get_models` | Operation selector only | GET `/models`; low-sensitivity read; one collection request |
| `darktrace_list_tags` | `get_tags` | Operation selector only | GET `/tags`; low-sensitivity read; one collection request |

After operator approval, a separate run may explicitly select a subset:

```sh
node scripts/lab-read-smoke.mjs --config /absolute/private/operator.json --runtime-manifest /absolute/private/reviewed-runtime.json --tools darktrace_get_status
```

Status is mandatory first in every run; subsequent calls stop immediately on its failure or on any later failure. Duplicates and unknown names are rejected. The tool list is not a general-purpose MCP client: it cannot request writes, POST, DELETE, Advanced Search, email, PCAP export, active scans, arbitrary identifiers or state changes. The original smoke still accepts these three unique calls, below the hard selection ceiling of eight. The separate operation campaign below requires its own review and explicit selection.

The `/models` and `/tags` source schemas expose no count/offset parameter. This harness therefore does **not** claim an upstream record-count limit: it issues only one GET, follows no cursor/pagination and applies a hard response-byte ceiling. A large collection can legitimately fail that ceiling or be marked truncated; do not silently enlarge limits. `get_devices` has a `count` filter but is medium sensitivity, so it is not in the original low-sensitivity smoke allowlist; the separate reviewed campaign permits its bounded recipe. A separate endpoint-ACL diagnostic when status fails requires a new explicit operator decision; this harness intentionally does not bypass its status gate.

## Fixed safety and output limits

- At most eight selected calls, one concurrent, no queue; at most three unique candidates in original smoke mode; campaign selection is also capped at eight, including status and all discoveries.
- Each initialization/listing/tool request has a 30-second outer deadline and SDK timeout/total timeout; progress cannot extend it. Production HTTP timeout is also 30 seconds.
- One application GET per selected tool; GET retries zero; configured `maxPages:1`; no cursor or automatic follow-up. No polling loop or fallback signing.
- Upstream response at most 32,768 bytes; production tool output at most 8,192 characters. SDK stdio buffer is capped at 1,048,576 bytes to accommodate local tool schemas; an oversized frame closes that transport.
- Additional parsed-object budgets: listing depth 16 / 20,000 elements; results depth 12 / 6,000 elements / 16,384 bytes per string. Budget failures stop the run.
- SIGINT/SIGTERM abort pending SDK requests; session cleanup closes stdio, which invokes production server cleanup and cancels active work. Cleanup has a five-second deadline; any failure is reported with a fixed code.
- Child stderr is discarded without reading it. Parent diagnostic stderr and third-party console output are suppressed. Exceptions are never serialized. No body/text/args, URL/IP/hostname, token, signature or source diagnostics enter the report.
- The script writes no files or raw telemetry, including temporary files. Result/schema data exists transiently in memory only for SDK parsing and boolean checks; never run it with a raw transport logger, debugger or telemetry capture.

## Sanitized evidence format

Stdout emits one JSON object per attempted tool call; startup/schema/cleanup failures may emit a fixed `session` record. Exit 0 means all selected outcomes met the limited checks; otherwise exit 1. Fields are restricted to:

- `operation` / `tool`: locally fixed identifiers, never names supplied by the appliance.
- `success` and `errorCode`: boolean and fixed local category or null. Production MCP intentionally hides upstream error details, so `TOOL_ERROR` cannot distinguish HTTP 401/403, signing, TLS or other endpoint failures. No raw exception/status/body is printed.
- `expectedShape`: booleans for structured envelope, conservative expected data type, absence of truncation, numeric version availability for status, and (in campaign mode) safeProjectionFallback plus compatibilityShapeValidated. Exit/success describe limited projected-output checks; compatibilityShapeValidated=false must never count as validated upstream functionality, even when success=true. A fixed safe projection summary in a typed scalar field still fails the expected type check; safety minimization does not prove upstream compatibility. These are projection checks, not full upstream response-schema validation. Empty model/tag collections are valid arrays and do not prove nonempty inventory visibility.
- `elapsedMs`: rounded elapsed milliseconds.
- Optional `version`: only the status `data.version` value if it consists of two or three dotted numeric components with bounded lengths, optionally followed by a space and a parenthesized 7–40-character hex revision as in the local OpenAPI example. Only the numeric prefix is emitted; revision/hash, unsupported suffixes, v-prefixes, four-component IPv4, URLs and arbitrary text are omitted. This field describes the Model Engine version in the source contract, not necessarily the Threat Visualizer bundle. A missing version does not alone fail a valid status shape.

Synthetic error-record example, **not a lab result**:

```json
{"operation":"get_status","tool":"darktrace_get_status","success":false,"errorCode":"TOOL_ERROR","expectedShape":{},"elapsedMs":100}
```

The coordinator may retain **only this sanitized output** outside the checkout through its approved evidence process. The optional `runtimeManifestSha256` field binds each post-verification record to the reviewed manifest bytes. It is a build-evidence digest, not appliance data. Record the reviewed source/build version, selected operation/tool identifiers and fixed limits separately without including protected configuration, paths to credentials, endpoint identity or tool arguments. Review sanitized output before any follow-up publication.

## Worker readiness checks and pending results

Completed offline: JavaScript syntax check; credential-free `--help`; production-child startup against a guaranteed nonexistent synthetic config with a clean parent environment; rejection of an unknown tool and a token flag containing synthetic canaries. Error records contained only fixed categories, did not echo canaries or config paths, and stderr was empty. No lab API call, real credential/config read, npm suite, commit, push or publication was performed by the worker.

The coordinator now reports limited production-MCP status/read results for a pre-fix snapshot, recorded explicitly in [stable-readiness.md](stable-readiness.md). Post-fix bound runtime, failed/blocked operations and complete stable gates remain pending. New offline checks for the manifest/campaign on Node v24.14.1 passed: `node --check scripts/lab-read-smoke.mjs`, `node scripts/lab-read-smoke.mjs --help`, and the temporary synthetic check `node /private/tmp/darktrace-lab-harness-offline-check.mjs`. The latter validated 34 argument recipes against compiled `validateOperation`, three deliberate blockers, 16 missing-dependency branches, source/runtime byte changes, manifest mode/symlink/omission rejection, CLI error sanitization and no SDK/child/network use. Its fixtures and canaries are synthetic; it is not a production session test. Initial temporary fixture issues (VM parsing, realm comparisons, external fixture paths and inventory counting) were corrected without weakening production checks; the final run exited 0. During that initial smoke-harness preparation, no npm suite or live API call was run by this worker. Release-pipeline offline suites are recorded separately in release-preparation-docker-mcp.md. Appliance compatibility, broader ACL/signing coverage, provider/host processing approval, real-network pinning and all mutation behavior remain outside this smoke result.

## Docker stdio/MCP mode — root execution only

This mode has been implemented and checked with **synthetic process fixtures only by the worker**. No worker Docker engine, secret mount or live Docker MCP call was used. Root separately reports a real DockerDesktop synthetic ownership probe: override `--user 501:20`, process UID/file UID 501, mode0600, readable=true, with network disabled and hardened filesystem/capabilities. That is an ownership prerequisite, not live Docker compatibility proof.

Root reviews/builds/freezes the final image and obtains its immutable **image ID**, then creates a matching reviewed source/runtime manifest after cleanbuild. Only `sha256:` followed by 64 lowercase hex characters is accepted; tags, arbitrary entrypoints/commands, root user/group, ports, TTY and privileged mode are not accepted. Docker is never asked to pull. Default image UID:GID is `1000:1000`; explicit `--user UID:GID` must have both IDs nonzero and at most 2,147,483,647. Root verifies mounted file ownership/modes with synthetic files in the actual engine first, especially DockerDesktop; do not change real token permissions to guess a fix.

The separate external protected Docker config uses exactly these token paths, not host paths (other production configuration fields are selected privately by root):

```json
{
  "instance": {"baseUrl": "https://appliance.example.invalid", "timeoutMs": 30000},
  "auth": {
    "publicTokenFile": "/run/secrets/public-token",
    "privateTokenFile": "/run/secrets/private-token",
    "dateFormat": "compact",
    "querySignatureEncoding": "unencoded"
  },
  "profiles": {"read": true, "write": false, "sensitiveRead": false, "writeCritical": false},
  "transport": {"kind": "stdio"}
}
```

Example operator command, **fictitious paths and synthetic image digest**; replace the digest only with the independently reviewed actual image ID. This command was not executed by the worker:

```sh
node scripts/lab-read-smoke.mjs \
  --config /absolute/private/container-operator.json \
  --runtime-manifest /absolute/private/reviewed-runtime.json \
  --docker-image sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa \
  --user 501:20 \
  --public-token-file /absolute/private/public-token \
  --private-token-file /absolute/private/private-token \
  --tools darktrace_get_status
```

An approved external `--ca-file /absolute/private/ca.pem` may be added; it is mounted read-only at `/run/secrets/ca.pem` and forwarded as NODE_EXTRA_CA_CERTS there. Verified TLS remains enabled. `--operations` may replace `--tools` after the same campaign review. Public/private flags accept **file paths only**, never token values. All mount sources must be absolute external paths without comma/equal/control characters. Parent never opens their contents or the protected config.

Before mounting any secrets, a fixed no-secret `docker run --network=none` hashes `/app/dist/src/**/*.js,json` inside that immutable image. Its complete bounded inventory must match reviewedRuntimeFiles exactly; mismatch gives fixed DOCKER_RUNTIME_NOT_REVIEWED before any secret mount or production entrypoint. The checker has no network, no secret mounts and a 30-second limit. Both the checker and actual MCP container use fixed `--init --pids-limit=64 --memory=256m` resource limits. This verifies runtime bytes, not upstream compatibility, dependency provenance or a fabricated attestation; final image/dependency audit remains root's independent gate.

The actual SDK stdio transport runs Docker with `--rm --init --pids-limit=64 --memory=256m --pull=never --log-driver=none --read-only --cap-drop=ALL --security-opt=no-new-privileges`, a cryptographically random harness-owned container name, stdin attached, and fixed entrypoint `node --no-warnings /app/dist/src/index.js`. Config/public/private and optional CA are individual **read-only file binds** at fixed /run/secrets paths, or one reviewed read-only named volume in the [secret volume alternative](#docker-secret-volume-alternative-root-only); no directories, Docker socket or host credential directories are requested as mounts. The protected production child loadConfig enforces regular-file/current-UID/non-symlink/mode/size checks after mounting. Corresponding canonical token-file environment paths match the separate config. Stderr is discarded and Docker logging is disabled, avoiding daemon stdout logs of MCP results even temporarily. Use a reviewed **local** Docker context/engine and no raw stdio logger, Docker debug/telemetry capture or remote daemon; this is not isolation from hostile same-user/daemon code.

The same status-first, eight-call, sequential, 30-second, one-page/zero-retry and response/output limits apply. SDK close/EOF happens first (five-second deadline). Root cleanup then queries only the exact random name created by this harness, requests stop with two-second grace, uses kill fallback if needed and confirms removal; no broad container deletion. Each metadata/cleanup command is bounded to five seconds; worst-case Docker cleanup adds up to 30 seconds. Cleanup uncertainty emits DOCKER_CLEANUP_FAILED and exit1, never a clean success. Local runtime inventory and container lifecycle metadata remain in memory; only sanitized operation records and manifest digest are emitted. No raw results are written by the harness or container log driver.

Offline synthetic checks passed Docker command building, no-secret/network-none preflight, wrong image runtime rejection **before mount**, nonroot UID/image/path validation, log-driver none, exact-name kill fallback and no unsafe flags. They did not start an engine or validate final Docker networking/MCP/secret mounts. Root's live image run and final security/artifact review remain pending.

Host trust boundary: Docker CLI is resolved from the operator's trusted **PATH**; the harness does not hash/verify the Docker binary. The native Node executable is process.execPath, likewise a reviewed host prerequisite, not a binary attestation. All protected input paths are absolute. The image ID must already be independently reviewed by root; preflight binds only runtime JS/JSON bytes, **not** node_modules, Node, OS layers, Dockerfile or the entire supply chain. Dependency/image/SBOM audit is a separate stable gate. The protected local schema-2 manifest also binds the 14 complete **host** SDK dependency package trees before either mode imports the SDK. Image node_modules, Node and OS layers remain bound by the independently reviewed immutable image ID and its separate provenance/SBOM audit, not by this host tree check. No full-image or binary integrity claim follows from runtime matching.

Final manifest-permission regression rejects special setuid/setgid/sticky bits using synthetic fstat metadata. The local filesystem did not retain a requested special chmod bit, so that unsuccessful fixture attempt is not claimed as a real special-mode filesystem test. Final synthetic metadata tests exercise all three rejected bits; ordinary unsafe mode, symlink, hash and inventory checks use real synthetic files. The manifest policy is mask0o7177, matching the protected-file requirement.

### Docker secret volume alternative (root only)

**Why.** Root observed, on DockerDesktop, a bind-mounted token whose `lstat` showed UID 501 while `fstat` on the descriptor opened with `O_NOFOLLOW` showed UID 0. This happened with the same 0700 directory and 0600 files: a first real run passed and later runs failed. Production correctly refuses that mismatch, and its ownership checks must not be weakened. A worker could not reproduce the mismatch with synthetic files: both values were 501. A named volume lives inside the Docker engine's own filesystem, so ownership no longer depends on host file-sharing metadata translation.

**CLI.** Docker mode only: replace `--public-token-file`, `--private-token-file` and `--ca-file` with `--secret-volume darktrace-mcp-lab-secrets-<32 lowercase hex>`.
- Combining it with any host token/CA flag, using it without `--docker-image`, a different name pattern, or repeating the flag gives `INVALID_DOCKER_SELECTION`/`INVALID_CLI` before any Docker command.
- `--config` stays a required absolute external path for operator reference. In volume mode it is **not mounted and not read**; the container uses `/run/secrets/config.json` from the volume.
- `--user` keeps its rules: nonzero UID:GID, default `1000:1000`.

**Required volume contents.**
- The volume uses driver `local`, scope `local` and **no driver options**, so bind-backed or tmpfs volumes are rejected.
- It holds exactly `config.json`, `public-token`, `private-token` and optionally `ca.pem`.
- Each file is a regular non-symlink, single-link `0600` file owned by the `--user` UID. Size limits: config ≤ 65,536 bytes, tokens ≤ 4,096, CA ≤ 1 MiB.
- The volume root must not be group- or world-writable.
- The config inside the volume must reference `/run/secrets/public-token` and `/run/secrets/private-token`, as in the Docker config above.

**Harness checks, before startup.** These run after the unchanged network-none runtime-byte preflight and before any production container:

1. `docker volume inspect` checks the exact name, the `local` driver and scope, and that there are no options.
2. `docker ps --all --filter volume=<name>` must be empty; otherwise `SECRET_VOLUME_IN_USE`.
3. A fixed `--network=none` metadata container (same hardened flags, same `--user` and image ID) mounts the volume `readonly,volume-nocopy` at `/run/secrets`. It checks names, `lstat`, and `fstat` of an `O_NOFOLLOW` descriptor: type, inode match, UID, mode mask `0o7177`, link count and size. It reads **no** secret contents and emits only `{"ca":true|false}`.

Any failure emits `SECRET_VOLUME_NOT_REVIEWED`. The production container then mounts the same volume `type=volume,…,target=/run/secrets,readonly,volume-nocopy` and sets `NODE_EXTRA_CA_CERTS=/run/secrets/ca.pem` only when the check found `ca.pem`. No bind mounts, Docker socket, ports, TTY, pulls or logs are added. Exact-name container cleanup is unchanged.

**The harness never creates, modifies or removes the operator's volume.**

**Root provisioning (synthetic-tested procedure).** Run this from a protected shell. It never starts a container, has no network, and does not print secrets:

```sh
VOLUME="darktrace-mcp-lab-secrets-$(openssl rand -hex 16)"
IMAGE="sha256:<reviewed image ID>"
docker volume create "$VOLUME"
HELPER="$(docker create --network=none --mount "type=volume,source=$VOLUME,target=/run/secrets" "$IMAGE")"
# /absolute/private/volume-source holds config.json, public-token, private-token (and optional ca.pem), each 0600.
tar -c --no-xattrs --no-mac-metadata --no-acls --no-fflags -f - -C /absolute/private/volume-source \
  config.json public-token private-token | docker cp -a - "$HELPER:/run/secrets"
docker rm "$HELPER"
```

`docker cp` into this image assigns the image's `USER`, **1000:1000**, regardless of the tar's UID, as observed on DockerDesktop. Use the default `--user 1000:1000` with this procedure; another UID needs a separately reviewed provisioning method. The macOS `tar` flags avoid extended attributes such as `com.apple.provenance`, which Docker rejects. Remove the helper container even on failure.

After the campaign, **root alone** destroys the volume with `docker volume rm "$VOLUME"` and confirms that `docker volume ls --filter name=$VOLUME` is empty. The harness must not do it.

**Synthetic evidence (worker, 2026-10-05).** Fake tokens, a synthetic test CA and base URL `https://127.0.0.1`, which the connector refuses before opening any socket. Image `sha256:cb0330dd…`, harness and manifest frozen as recorded in [docker-volume-review](security/docker-volume-review.md).
- **Rejections:** CLI negatives, missing volume, driver options, missing file, extra file, mode 0640, symlink, hard link, mismatched `--user` and volume in use were all rejected with the codes above.
- **Valid volume:** reached `initialize`/`tools/list` and failed only the refused tool call.
- **Network-none probe:** through the volume it initialized and listed 27 tools.
- **After every case:** no `darktrace-mcp-lab-*` container remained and the volume still existed.

None of this is live Docker or appliance evidence.

## IR-03 dependency binding regression (offline)

Schema 2 replaces schema 1; root must regenerate and independently approve a manifest after a clean reviewed install/build. On Node v24.14.1, the temporary synthetic harness check passed changed Zod source and `package.json`, missing/extra files, missing/extra manifest packages and symlinks at root/scope/package/file. Extra root files named `__proto__`, `constructor` and `prototype` were rejected; package maps use a null prototype. The documented Python schema-2 generator matched the harness on the same synthetic fixture. It also confirmed the fixed init/PID/memory flags on both fake Docker commands and mismatch rejection before secret mounts. Existing campaign recipes, source/runtime checks, sanitized CLI errors and exact-name cleanup checks passed. Commands: `node --check scripts/lab-read-smoke.mjs`, `node /private/tmp/darktrace-lab-harness-offline-check.mjs`. The check used VM helpers, synthetic files and fake child processes; no actual Docker engine, SDK session, protected config, token file or appliance request was used. The temporary test script is external review evidence, not a shipped test suite. Live post-fix native/Docker evidence remains an operator gate.

Independent IR-03 review superseded the initial four-package scope: the frozen implementation and generator now bind all 13 reviewed host index/stdio dependency packages (953 regular files, 19,242,936 bytes in the locally inspected locked tree, within the unchanged caps). Additional synthetic byte-tamper cases for cross-spawn, which and the other seven launch/transport dependencies passed. File-count, aggregate-byte, single-file and directory-depth overflow tests used real synthetic files; the 20-second deadline used an injected clock. Those tests reject before any SDK import, so no SDK/DNS/socket/HMAC or protected-path effects occur. The locked tree measurement is capacity evidence, not approval of arbitrary installed bytes. The earlier four-tree harness hash is withdrawn; use only the latest independently reviewed freeze.

Final IR-03 scope also includes `jose` by coordinator approval, even though the reviewed stdio flow does not invoke its dynamic OAuth imports. The exact 14-package list above is the complete declared runtime dependency closure of the host SDK packages; local declaration inspection found no further transitive package names. It measured 1,033 regular files and 19,453,596 bytes. Synthetic `jose/index.js` and `jose/package.json` changes also fail closed. Earlier four/13-package freezes are withdrawn. The documented generator matched the final synthetic 14-package harness manifest. This host development closure is separate from the unchanged three-library production npm package/SBOM.

## Explicit inventory validation profile — new review required

The historical accepted freeze `c9d2dbb6ed623ff4e1a5673ffedd93c389c74a658b650db05adc23a46bf0bb4b` and manifest `b9aabc2681019d1e64184fc077899a816e8529be94f451803a6962ca002a99fb` remain evidence for the prior 11-selector native pilot. They **do not bind this changed harness**. Root must clean-install/build the reviewed new snapshot, create a new protected schema-2 manifest with the unchanged complete 14-package closure, freeze it and obtain independent acceptance before another native or Docker run. Do not overwrite historical evidence or bless unexplained tree changes.

`--validation-profile` accepts only `minimal` or `inventory`, with no duplicate flags and no arbitrary numeric limit, identifier, metric or query flags. Default `minimal` retains the existing recipes, discovery `seensince=300`, upstream 32,768 bytes and output 8,192 characters. `inventory` explicitly selects **session-wide** upstream 1,048,576 bytes / output 60,000 characters, within the product defaults of 2 MiB / 60,000. These caps apply to every selected operation in that child session, including status; they are not per-operation limits. Operator configuration may further restrict effective limits. There is no automatic escalation or retry after a refusal; a different reviewed profile needs an explicit new operator run.

Both profiles retain status first, at most eight unique operation selectors per run, one GET per selector, concurrency one, queue zero, rate eight/minute, 30 seconds per call, one page, zero retries and five-minute event windows. The fixed SDK transport buffer remains 1 MiB. The inventory parent's shape parser retains depth 12, with fixed 20,000-element / 240,000-byte-string ceilings to accept the larger bounded MCP envelope (including duplicated text/structured fields); minimal retains 6,000 elements / 16,384-byte strings. Neither profile changes TLS/DNS pinning, HMAC, redirects, production source, response projection or write/sensitive-read permissions. GET count parameters do not guarantee small responses for endpoints without upstream count support.

Inventory device discovery uses only `get_devices` count=1 with includetags/cloudsecurity false, or `get_devicesearch` count=1/offset=0, **without seensince or free text**. This is device inventory, not a five-minute recent-activity query and not an active scan. Empty collections still block dependent operations; shape success does not prove an ID exists. IDs remain in-memory, never printed. The original three-tool smoke may explicitly use inventory for its model/tag collection requests. The campaign's model request still requires a previously discovered UUID; it never falls back to an unfiltered collection.

Operator examples (fictitious paths; worker has not executed these):

```sh
node scripts/lab-read-smoke.mjs --config /absolute/private/operator.json --runtime-manifest /absolute/private/new-reviewed-runtime.json --validation-profile inventory --operations get_status,get_devices,get_devicesummary,get_cves
node scripts/lab-read-smoke.mjs --config /absolute/private/operator.json --runtime-manifest /absolute/private/new-reviewed-runtime.json --validation-profile inventory --tools darktrace_get_status
```

Root separately approved `get_metricdata` **only in inventory**: explicitly select device discovery and `get_metrics` earlier in the same run. Its name comes only from a real projected `Metrics.name`, preserved without normalization and constrained to `[A-Za-z][A-Za-z0-9_.-]{0,127}`. The query uses that name, positive safe-integer did, paired five-minute millisecond start/end, interval=300 seconds, breachtimes=false and fulldevicedetails=false. There are no metricN parameters, CLI metric/ID inputs or hidden discoveries/fallbacks. Missing handles produce `BLOCKED_MISSING_IDENTIFIER`; invalid handle/name produces `BLOCKED_IDENTIFIER_CONTRACT` before the metric request. Minimal still emits `BLOCKED_METRIC_CONTRACT`. Metric names are collected only in inventory and remain solely in-memory.

```sh
node scripts/lab-read-smoke.mjs --config /absolute/private/operator.json --runtime-manifest /absolute/private/new-reviewed-runtime.json --validation-profile inventory --operations get_status,get_devices,get_metrics,get_metricdata
```

The allowlist remains exactly 37 GET selectors: minimal has 34 schema-accepted synthetic recipes and three semantic blockers. In the historical inventory freeze, inventory had 35 and two. Since the [summary and endpoint recipes below](#inventory-summary-aggregate-and-endpoint-details-source-4f6ef96), inventory has 37 recipes and no semantic blocker; minimal keeps all three. Those counts are offline recipe readiness, not live compatibility. See [inventory contract review](security/lab-campaign-inventory-review.md) for exact local evidence, summary source issues and redirect refusal.

Every JSONL outcome now includes fixed `validationProfile` and `validationPolicySha256`, including sanitized failures. The policy digest is SHA-256 of UTF-8 `JSON.stringify(validationPolicy)`, whose code-owned contents include the two fixed profiles, 37 recipes, inventory metric override/name pattern, three smoke definitions and common limits. Current digest: `d501a0591b1a78ea1dd5363118c233cd78c59aca2400ffd3eadfddc474c15212`. It contains no discovered values; it is policy evidence, not an attestation. Existing fixed operation/tool, booleans/error codes, elapsed time, optional numeric version and verified manifest digest remain the only outcome metadata. No counts of returned data, args/body/IDs/names/URLs or remote messages are emitted.

Offline checks on Node v24.14.1: syntax/help and `node /private/tmp/darktrace-lab-inventory-offline-check.mjs` passed. The external synthetic fixture preserves all earlier manifest/dependency budgets, symlink/prototype negatives, Docker preflight/cleanup builder tests and default recipes; adds both-profile schema/window/budget checks, unknown/duplicate CLI, tier/method/sensitivity exclusions, metric-name/handle negatives and typed metric/fallback summary fixtures. Four actual CLI error processes with SDK/child/DNS/socket/HMAC instrumentation recorded zero effects and sanitized stderr. No real SDK session, Docker engine, protected lab file or appliance request was used. No historical oracle/test or production source was changed.

### Inventory summary aggregate and endpoint details (source 4f6ef96)

These two recipes exist **only in `--validation-profile inventory`**. `minimal` keeps `BLOCKED_EVENTTYPE_CONTRACT`, `BLOCKED_ENDPOINT_IDENTITY` and `BLOCKED_METRIC_CONTRACT`. They require production source `4f6ef96c82b8c3bff7628fbad18aea6eb694819a2e001dc0e30086d1daefd834` or a later reviewed source, built and bound by a new clean manifest. Docker mode also needs an image rebuilt from that source: the historical image `sha256:cb0330dd…` is `eadfe117…` and correctly fails `DOCKER_RUNTIME_NOT_REVIEWED`.

- **Summary aggregate:** `get_summarystatistics` with exactly `eventtype=loginput`, `hours=1` and `endtime` set to this run's anchor, the current time floored to the whole second in milliseconds. There is no `starttime`, `to`, `csensor`, `mitreTactics`, other event type, wider window or retry. The result is one hour of aggregated numeric login-event counts, **not** event retrieval. Selection review requires exactly one query `endtime` documented in milliseconds and an `hours` parameter, otherwise `BLOCKED_TIME_UNITS`. The bound source validates the request; its exception admits only this event type and range.
- **Endpoint details:** `get_endpointdetails` with `ip` plus `devices=false`, `additionalinfo=false` and `score=false`. The IP comes only from an earlier **inventory** `get_devicesearch count=10, offset=0` first-page row with a positive `did` in the same run. It is accepted only if it is a string of at most 45 characters made of `[0-9A-Fa-f:.]` and `node:net isIP` recognizes it. Hostnames, zone IDs, prefixes and non-strings are rejected with `BLOCKED_IDENTIFIER_CONTRACT`, and a missing IP gives `BLOCKED_MISSING_IDENTIFIER`. The IP is kept in memory only and is never emitted. `get_devices` never supplies it. No hostname, invented address, DNS lookup or scanning is used, and the harness never connects to the endpoint IP; it is only an appliance query value.
- **Oracle:** the shape oracle now asks the bound compiled `dist/src/api/response-view.js` `selectResponseView(operation, validatedQuery, baseView)` which view applies. The choice depends on the validated request, never on upstream keys; the loginput query selects the documented hourly view. `inventory` fails `LOCAL_SCHEMA_MISMATCH` if that export is missing.
- **API diagnostics:** on a tool error, the outcome may carry `apiErrorCode` only when the result's own `structuredContent.errorCode` equals one entry of the harness's static 14-code list, which matches the production enum. Error text, status, request ID, URL, stack and any other value are never read into outputs. `errorCode` stays the fixed `TOOL_ERROR`.

Example (fictitious paths; not executed by the worker against any appliance):

```sh
node scripts/lab-read-smoke.mjs --config /absolute/private/operator.json --runtime-manifest /absolute/private/new-reviewed-runtime.json --validation-profile inventory --operations get_status,get_devicesearch,get_endpointdetails
```

Offline evidence is in [read-campaign-final-review](security/read-campaign-final-review.md). It covers the source-bound fixture (43/43), native end-to-end synthetic runs with a refused `127.0.0.1` origin (`apiErrorCode:"network"`, zero sockets) and the Docker volume regression. None of it is lab evidence.


## Validated19 bounded endpoint-IP discovery checkpoint

Root authorized the inventory-only `get_devicesearch` recipe `{count:10, offset:0}` after conditional independent review, to inspect one bounded first page for a projected safe IP needed by `get_endpointdetails`. This increases only that inventory selection from the previous count=1 recipe; it adds no pages, retries, hidden discovery calls or guessed IP. Inventory omits `seensince`; it must not add or retain that recent filter. Default minimal remains `{count:1, offset:0, seensince:'300'}`. All session byte/output/call/time/shape limits, same-run IP rules, readonly policy, fail-closed checks and endpoint flags remain unchanged.

The earlier missing-IP/refused endpoint receipts remain factual historical blockers; this recipe is readiness for a fresh bound coordinator run, not a new endpoint PASS. The worker made no lab request. Root must rebuild the protected schema-2 manifest after this helper change, obtain independent helper/policy acceptance and execute any new native/Docker subset itself. Production source `9e7c7070…`, active full contract `6ddda205…` and the final19 Docker runtime remain unchanged by this harness edit. The previous inventory policy hashes above retain their historical meaning; new exact policy SHA-256 is `3060d0a25c9d156501ade8d053183cc04a70946171926bdda0de1f17508c6996` (previous immediate policy `ed55eb308bb748c22494047367f114598614e399b7c6ffb115d969bb41412ac9`). Offline extraction of the actual policy/argumentsFor function confirms that only this inventory recipe changes and that the compiled request schema accepts both recipes; syntax/help checks PASS.
