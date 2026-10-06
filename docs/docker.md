# Docker use

[README](../README.md) · [Clients: Docker](clients.md#docker) · [Configuration](configuration.md) · [Troubleshooting](troubleshooting.md)

The image runs the MCP server over stdio and opens no network port. Since v1.1.0 the release workflow publishes it as `ghcr.io/nuoframework/darktrace-mcp:<version>` for linux/amd64 and linux/arm64; always pin the digest.

The image exposes the same tools as a native install. Profiles work the same way: set `DARKTRACE_PROFILES` with `-e` (default `read`). See [profiles](configuration.md#profiles).

> **Release archives.** The v1.0.0 image archives contain the earlier read-only build (15 tools). For the full API surface, build the image from the current checkout ([Build](#build)) or use a later release.

## Quick steps

1. Pull, load or build the image ([Install options](#install-options)).
2. Run `--check-config` inside the container with your token mounts ([below](#mcp-client-configuration)).
3. Add the client snippet from [Clients: Docker](clients.md#docker), with the image ID.

## Current candidate at a glance

This table records the reviewed v1.0.0 image (read-only build).

| Item | Status (2026-10-06) |
|---|---|
| Runtime | Alpine 3.24.2, Alpine-maintained Node.js **24.18.1** with shared OpenSSL **3.5.9**, ICU 78.1 (English data) |
| Images | Pre-version reviewed images (history, before the 1.0.0 metadata change): arm64 `sha256:64d16616…5be842`, amd64 `sha256:65985236…68dad6` ([independent review](security/patched-runtime-independent-review.md)). The lab ran on the earlier arm64 `sha256:8cd85604…` with a byte-identical application. v1.0.0 archive image IDs are published in the release notes |
| Application payload | 49 compiled files bound to v1.0.0 source `582a121…`, aggregate `054a25fa…`; 15-tool contract hash `cd4ee422…` in both profiles on both architectures |
| Tests | [CI run 37423665585](https://github.com/nuoframework/darktrace-mcp/actions/runs/37423665585) on commit `2adb84b`: Node 22/24 offline jobs plus native Docker on amd64 and arm64, full 130 functional + 325 security tests, 0 skipped, all PASS |
| Scans of the exact images | Trivy 0 matches. Grype: **High CVE-2026-85091 (zlib 1.3.2)** and Medium CVE-2024-9410 (matched to `ada`). Raw matches are retained and nothing is suppressed. An independent review of both architectures found that the zlib library is affected but its vulnerable `gz*` code is not in the application's execution path (no relevant imports, Node bindings, add-ons, FFI, `dlopen` or subprocesses), and that the `ada` match is a product-name collision. zlib is **not fixed**: Alpine 3.24 has no fixed package as of 2026-10-06 |
| Lab, Darktrace 7.1.0 | arm64 image `sha256:8cd85604…`, 2026-10-06: **19/19 real queries PASS**, no writes. The lab is closed. 1.0.0 images differ only in the version literal and were not retested live; response shapes, caps, TLS and cleanup passed ([lab checkpoint](security/patched-runtime-lab-checkpoint.md)) |
| TLS trust | Node uses the system CA store by default (`/etc/ssl/cert.pem` → `ca-certificates.crt`, 121 roots; Node's bundled store has 120). The lab used system trust; custom-CA (`NODE_EXTRA_CA_CERTS`) tests passed separately |
| Release | Version `1.0.0`; private GitHub Release asset hashes and image IDs are listed in the release notes |

This is not a zero-CVE claim, and it is not stable-release approval.

## Install options

1. **Public image on GitHub Container Registry (easiest; v1.1.0 and later).** Built by `.github/workflows/release.yml` on the reviewed tag, natively on amd64 and arm64 runners, and combined into one tag. The manifest digest is recorded in the workflow summary and in the release notes.

```sh
docker pull ghcr.io/nuoframework/darktrace-mcp:1.1.0
docker image inspect --format '{{index .RepoDigests 0}}' ghcr.io/nuoframework/darktrace-mcp:1.1.0
npx -y @nuoframework/darktrace-mcp@1.1.0 setup --runtime docker --image ghcr.io/nuoframework/darktrace-mcp@sha256:<digest>
```

   Compare the digest with the release notes before using it. The wizard writes the hardened `docker run` entry with `--pull=never` and the `name@sha256:…` reference, so clients only ever start the inspected bytes; a tag is mutable, a digest is not. For a manual snippet use the local image ID (`docker image inspect --format '{{.Id}}'`) as shown under [MCP client configuration](#mcp-client-configuration).
2. **GitHub Release image archive (v1.0.0, previous release).** Assets: `darktrace-mcp-1.0.0-linux-amd64.tar.gz`, `darktrace-mcp-1.0.0-linux-arm64.tar.gz`, `darktrace-mcp-1.0.0.tgz` (npm package) and `SHA256SUMS`.

```sh
gh release download v1.0.0 --repo nuoframework/darktrace-mcp \
  --pattern 'darktrace-mcp-1.0.0-linux-arm64.tar.gz' --pattern SHA256SUMS
shasum -a 256 --ignore-missing -c SHA256SUMS
docker load --input darktrace-mcp-1.0.0-linux-arm64.tar.gz
docker image inspect --format '{{.Id}}' darktrace-mcp:1.0.0-arm64
```

   On x86-64 hosts, use the `amd64` archive and the `darktrace-mcp:1.0.0-amd64` tag. Check that the loaded image ID matches the release notes, then use that `sha256:…` ID with `--pull=never`.
3. **Build from the reviewed checkout** (below).

## Build

```sh
# 1. Fetch and verify the pinned Alpine runtime packages (public HTTPS + Docker).
#    Use an absolute directory outside the checkout; choose amd64 or arm64.
node scripts/prepare-docker-runtime.mjs /absolute/private/darktrace-runtime arm64
# 2. Build for the same architecture from that verified archive.
docker buildx build --platform linux/arm64 \
  --build-context runtime-apks=/absolute/private/darktrace-runtime/arm64 \
  --load --tag darktrace-mcp:local .
docker image inspect --format '{{.Id}}' darktrace-mcp:local
```

`scripts/prepare-docker-runtime.mjs` needs Docker and public HTTPS to `dl-cdn.alpinelinux.org`, `distfiles.alpinelinux.org` and `raw.githubusercontent.com` (one hash-pinned SPDX license text). It uses the pinned Alpine image's keys to authenticate the signed `main` package index and packages. It checks the SHA-256 of all 22 packages, the SHA-512 of their upstream source archives and the hashes of the extracted license files. It writes `<arch>/apks`, `<arch>/licenses` and `vendor-sources` under the directory you give it. Keep that directory outside the checkout, and keep it with any approved release, because mirrors eventually drop old package revisions. The `--platform` value and the `runtime-apks` directory must name the same architecture. The Dockerfile verifies the pins again and fails on any mismatch.

| Stage | What it pins and checks |
|---|---|
| Builder / production dependencies | Official `node:22-bookworm-slim@sha256:43ac6c60…b772c`; `npm ci --ignore-scripts` from committed lock metadata. npm and this builder's bundled OpenSSL 3.5.8 exist only at build time and are **not** in the final image. |
| Vendor runtime | `alpine@sha256:294b683c…c77e6` (Alpine 3.24.2). 22 signed Alpine `main` packages per architecture, pinned by SHA-256 and checked with `apk verify`, including `nodejs-24.18.1-r0`, `libssl3`/`libcrypto3` `3.5.9-r0`, `musl-1.2.6-r2` and `ca-certificates-bundle-20260909-r0`. Installed offline. |
| Build-time assertions | Node reports `node_shared_openssl=true` and OpenSSL ≥ 3.5.9; the 3.5.9 packages own `libssl.so.3`/`libcrypto.so.3`. The curated root filesystem is executed in a chroot to repeat those checks and to confirm that there is no `/bin/sh`, npm, apk or `update-ca-certificates`. |
| Final image | `FROM scratch`, `PATH=/nodejs/bin`, UID/GID `1000:1000`, no ports or volumes. `/nodejs/bin/node` links to the package-owned `/usr/bin/node`. Contains compiled `dist/src`, production `node_modules`, runtime `package.json`, the project `LICENSE`, `/licenses/<package-origin>/` and the CA bundle `/etc/ssl/certs/ca-certificates.crt` (121 certificates). |

The build context is allowlisted by `.dockerignore`. It excludes local environment files and secrets. It includes tests, examples, scripts, selected docs and the EN/ES README/SECURITY files so CI can run a vendor-checks build target, but none of those reach the final image. Do not add tokens, registry or proxy credentials, or appliance data to build arguments, build contexts or image layers. Use the immutable image ID with `--pull=never` in clients; `darktrace-mcp:local` is only a local tag.

## Runtime support

The Node.js binary is Alpine's musl build, maintained by the Alpine distribution. It is not an upstream Node.js Tier 1 binary. The Node.js 24 [platform list](https://github.com/nodejs/node/blob/v24.x/BUILDING.md#platform-list) classifies x64 musl as Experimental and does not list arm64 musl; Node.js `main`, for future releases, lists x64 musl as Tier 2. Security fixes for this runtime therefore depend on Alpine updating `nodejs`, `openssl`, `zlib` and the other pinned packages. Each update changes the pinned hashes deliberately and repeats every gate.

**Native installs.** Official upstream Node.js releases examined on 2026-10-05 bundle OpenSSL 3.5.8 (affected by CVE-2026-35189). Using Node 22 or 24 is not enough. Use a maintained runtime whose OpenSSL you have independently verified as 3.5.9 or later, or use Docker.

## MCP client configuration

Mount separate public and private token files read-only. Each must be a regular, non-symlink file, at most 4 KiB, owned by the container's effective non-root UID, and mode `0600` or stricter (`0400` is also accepted). Each file may have one final LF; do not use CRLF or put tokens in environment files. On Docker Desktop, ownership mapping can differ from the host; check it with the image's `--check-config` diagnostic before adding the server to an MCP host. Do not weaken the server's ownership or mode checks to compensate.

Example client configuration (replace the executable and private paths, and set the real approved HTTPS origin locally):

```json
{
  "mcpServers": {
    "darktrace": {
      "command": "/absolute/path/to/docker",
      "args": [
        "run", "--rm", "-i", "--init", "--pull=never", "--log-driver=none",
        "--read-only", "--cap-drop=ALL", "--security-opt=no-new-privileges",
        "--pids-limit=64", "--memory=256m", "--user", "1000:1000",
        "--mount", "type=bind,src=/absolute/private/darktrace/public-token,dst=/run/secrets/public-token,readonly",
        "--mount", "type=bind,src=/absolute/private/darktrace/private-token,dst=/run/secrets/private-token,readonly",
        "--env", "DARKTRACE_URL=https://darktrace.example.invalid",
        "--env", "DARKTRACE_PUBLIC_TOKEN_FILE=/run/secrets/public-token",
        "--env", "DARKTRACE_PRIVATE_TOKEN_FILE=/run/secrets/private-token",
        "--env", "DARKTRACE_PROFILES=read",
        "--env", "DARKTRACE_SENSITIVE_READ=false",
        "REPLACE_WITH_IMAGE_ID_FROM_DOCKER_INSPECT"
      ]
    }
  }
}
```

Replace the image ID placeholder with the exact `sha256:...` value returned by `docker image inspect --format '{{.Id}}' darktrace-mcp:local`. The example uses the image's default UID `1000`; provision the mounted files with that owner as seen inside the container. Alternatively, a manual `docker run` can set a nonzero `--user` matching the mounted-file owner. In both cases verify the result with `--check-config`. The URL above is a placeholder, not a real appliance address.

For a manual command on a host whose protected files are owned by the current non-root user, use `--user "$(id -u):$(id -g)"` instead of `--user 1000:1000`. This shell substitution belongs in a shell command, not in the JSON MCP configuration. The executable and application files in the image remain root-owned and readable by the selected non-root UID.

The stdio host must keep stdin open (`-i`) and must not allocate a TTY (`-t`). `--pull=never` and the image ID pin make startup use only the inspected local artifact. `--log-driver=none` prevents Docker's daemon from persisting container stdout/stderr; it does not prevent the MCP host from forwarding tool results to its provider. Do not use `docker logs` or another sink to capture raw MCP stdio. For setup, use the safe fixed diagnostics: `--help` and `--version` need no credentials; `--check-config` checks local settings and token-file permissions without a network probe. Run diagnostics with `--network=none` and the logging driver disabled. They do not validate token access at the appliance, endpoint compatibility, deployment eligibility or network reachability.

Use a dedicated MCP host profile or OS account for this server when available. Review the commands, environment and mounts of other configured MCP servers before sharing a host process; each server is code that runs with the host's privileges. Do not put the production server behind MCP Inspector or an unreviewed proxy. Keep diagnostic and development tools separate from the operator profile.

For an approved appliance connection, apply deployment network policy that permits outbound HTTPS only to the configured appliance and its approved private CA path. Do not use host networking, expose ports, add ambient proxies, set `NODE_TLS_REJECT_UNAUTHORIZED=0`, or otherwise bypass TLS verification. The daemon logging setting is not a network or provider-egress control. A reviewed private CA may be mounted read-only and selected with `NODE_EXTRA_CA_CERTS`; this extends Node's trust roots and does not disable certificate or hostname verification. Node applies `NODE_OPTIONS` and `NODE_EXTRA_CA_CERTS` before application startup; preloads can execute code, and TLS trust settings are host configuration that must be reviewed and protected.

The runtime defaults to non-root UID `1000`. Keep its filesystem read-only, drop all capabilities, and prevent privilege escalation as shown above. The server defaults to the read profile and sensitive reads off. Provider eligibility and retention review still apply to appliance results delivered to the MCP host/model.

The final image retains the project `LICENSE`, production-dependency licenses and the runtime package and upstream source licenses under `/licenses/<package-origin>/`. To create a private transfer artifact after reviewing and testing a local image, record the archive digest separately and verify it before loading:

```sh
image_id="$(docker image inspect --format '{{.Id}}' darktrace-mcp:local)"
docker save --output darktrace-mcp-local.tar "$image_id"
shasum -a 256 darktrace-mcp-local.tar > darktrace-mcp-local.tar.sha256
# On the receiving machine, verify the separately transferred checksum first.
shasum -a 256 -c darktrace-mcp-local.tar.sha256
docker load --input darktrace-mcp-local.tar
docker image inspect --format '{{.Id}}' darktrace-mcp:local
```

Transfer the archive and checksum only through an approved private channel. This recipe does not authorize a registry push or publication. The archive hash protects transfer integrity only when its expected value is communicated separately over a trusted channel.

## Hardening controls

These controls apply to the current recipe and the documented client configuration. They do not establish host or daemon security.

| Control | Status |
|---|---|
| Provenance | Builder, dependency and Alpine stages pinned by digest; 22 signed Alpine packages pinned by SHA-256 per architecture; `npm ci` with lifecycle scripts disabled. No derived-image attestation or signature is produced. |
| Build/runtime separation | Only compiled `dist/src`, production `node_modules`, runtime metadata, curated vendor libraries, CA bundle and licenses reach the `scratch` image. No shell, busybox, apk, npm or CA-update tools. |
| Identity/filesystem | Default UID/GID `1000:1000`; application and runtime files are root-owned. Run with `--read-only`. |
| Privileges/resources | `--cap-drop=ALL`, `--security-opt=no-new-privileges`, `--pids-limit=64`, `--memory=256m`; Docker's default seccomp stays enabled. AppArmor/SELinux and rootless Docker were not tested. |
| Network/ports | No exposed or published port. Diagnostics run with `--network=none`; production egress needs deployment policy limited to the approved appliance. |
| Secrets | Token files only, mounted read-only, owned by the runtime UID, mode `0600` or stricter. No token values in environment, arguments or image layers. |
| Host boundary | No Docker socket is mounted. Docker Desktop/daemon, host integration and other MCP servers remain trusted host components and were not audited. |

## Predecessor base-image review (history)

This section describes the earlier Distroless Debian 13 + official Node 22.23.3 recipe and is kept as history.

The public upstream [Distroless project](https://github.com/GoogleContainerTools/distroless) currently publishes Debian 13 `cc` images, including `nonroot`; the [`cc` image documentation](https://github.com/GoogleContainerTools/distroless/blob/main/cc/README.md) describes its glibc runtime. This image uses the pinned multi-architecture Debian 13 `cc` root filesystem as an intermediate stage and starts the final stage from `scratch`, so it does not inherit base-image environment variables. The builder supplies Node 22.23.3 from the pinned official Node image; its upstream [`LICENSE`](https://github.com/nodejs/node/blob/v22.23.3/LICENSE) is retained at `/licenses/node/LICENSE`, and the copied Distroless root filesystem retains its system license files. A direct Distroless Node 22 runtime candidate had Node 22.22.0 and defined `SSL_CERT_FILE`, which did not meet this project's pinned Node version and environment checks. The official Node Trixie slim base was also evaluated; its base-only Trivy scan recorded 211 vulnerability entries, including 43 high affected and one high deferred. The historical selected-image scan is scanner-specific: Trivy recorded zero HIGH/CRITICAL, while Grype rated 11 of the same 31 matches HIGH. Do not summarize this as a clean scan or zero-CVE result. On 2026-10-05, `docker manifest inspect dhi.io/node:22-debian13` returned `unauthorized` using existing Docker auth. No login or new credentials were attempted. No upstream attestation or signature for a derived image has been produced; pinning the upstream digests does not attest this application image.

## Predecessor image and lab checkpoint — 2026-10-06 (history)

> Predecessor image `sha256:eb3a7681…` with bundled OpenSSL 3.5.8. Its OpenSSL hold applied to that image; the current candidate is summarized [above](#current-candidate-at-a-glance).

That candidate enforced **19 GET selectors in 15 MCP tools** in both read profiles. `sensitiveRead` cannot expand the ceiling. All excluded operations, including 20 formerly eligible reads and all writes, are denied before preview, audit or network access. Write and critical settings still fail closed at startup.

Source SHA-256: `9e7c7070298ef592a1a10cdcb7ca481420a377e25e4a93c863ca33c31921d7f2`; independent source review: [ACCEPT](security/validated-consultations-independent-review.md). Active full fixture: `6ddda2054c9c708d0516a90b7811eb0aba565016403953dace89d47bc89d213c`; both ordered complete profile hashes: `cd4ee42249a9110182046794c39fc00f5995700b7d751bccc6628e86afbddfe3`. The exact predecessor is archived, never an active fallback.

Native and hardened Docker initialized MCP each passed **all 19 distinct permitted selectors** on lab 7.1.0. Verified TLS, expected response shapes, no truncation or safe-projection fallback, sequential bounded recipes and no retries/extra pages; this does not establish every parameter combination or nonempty resource variant. Earlier missing-identifier refusals remain preserved. The exact campaign secret volume was removed and absence independently verified. [Bound lab receipts and manifest hashes](security/validated-consultations-lab-checkpoint.md).

Docker image `sha256:eb3a7681da69f6468df0a7600af9d72560cfd8d5c4747dfa8ee57e45f09abeaf` binds this source and the native transport runtime. Its full 49-file runtime hash is `e7cbb509d54909fa10276ffeaec11cab22bb201f1f81635fa8c988abcb3653fb`; both offline SDK profiles match the full 15-tool contract. [Image and dependency binding](security/validated-consultations-docker-checkpoint.md).

**Not ready for stable publication.** OpenSSL **3.5.8 / CVE-2026-35189** remains applicable to TLS certificate/CRLDP processing (official severity Low; fixed in 3.5.9). Container restrictions and response caps do not patch it. The final image has component equality to previously scanned OS/Node/dependency bytes, not a fresh scan database result. Historical Trivy 0.74.0 reports 23 MEDIUM and 8 LOW; Grype 0.118.0 reports **11 High**, 10 Medium, 3 Low and 7 Negligible for the same 31 Debian matches, with no fixed versions indicated. No zero-CVE or universal zero-High claim. [Primary advisory](https://openssl-library.org/news/secadv/20260929.txt).

Independent helper acceptance is scoped; the [migration review](security/validated-consultations-migration-review.md) still separates final test migration/provenance follow-up. **Final candidate suite completion is not yet claimed.** Root must freeze final documentation, run full applicable suites and two reproducible package builds/install/SRI/source-runtime-security-receipt checks, obtain final independent review, and verify remote CI and deployment/provider eligibility. Versions remain alpha; no commit, tag, release or publication is authorized by this checkpoint.

## Historical local build and scan record — predecessor only

The following immutable identities and results describe the predecessor image only. Its access-denial statements are historical; access was restored and the accepted image above was rebuilt and tested. Rebuild and inspect any different checkout before using or transferring it.

| Check | Result |
|---|---|
| Build | `docker build --progress=plain --pull --tag darktrace-mcp:local .` — passed on Docker Desktop 29.8.1 (linux/arm64), with pinned Node and Distroless Debian 13 digests. Both `npm ci --ignore-scripts` stages completed in the clean source build; the builder output reported 0 npm audit vulnerabilities. This npm audit is not an OS-image scan. |
| Final image | `darktrace-mcp@sha256:cb0330ddb93c5611b34efeff01e43c64252b99681567eb30835fd2ba5be281cf`; source tree hash `eadfe11732bd6c9bfa89cbfbbb2dc530d86e6984ad285576aab49b4dfc01d917`; platform `linux/arm64`; Debian 13.7 rootfs; Node `v22.23.3`; image user `1000:1000`; entrypoint `/nodejs/bin/node /app/dist/src/index.js`; no exposed ports and only a fixed `PATH` environment variable. |
| Runtime | Passed offline `--help`, `--version`, UID and root-owned `/app` inventory checks, TLS trust bundle and Node license checks, `--check-config` with synthetic 0600 read-only token mounts, and MCP stdio initialize/tools/list (27 tools). Container runs used `--pull=never --log-driver=none --network=none --read-only --cap-drop=ALL --security-opt=no-new-privileges --pids-limit=64 --memory=256m`; the stdio test also used `--init -i`. |
| Inventory/SBOM and vulnerability scan | Historical scan for the exact image digest above and source hash `eadfe11732bd6c9bfa89cbfbbb2dc530d86e6984ad285576aab49b4dfc01d917`: Trivy 0.74.0 (DB `UpdatedAt=2026-10-05T13:07:51.292695513Z`) recorded 31 Debian package matches: 23 MEDIUM and 8 LOW, zero fixable. Grype 0.118.0 matched the same 31 packages and rated 11 HIGH, 10 MEDIUM, 3 LOW and 7 NEGLIGIBLE, zero fixable. These are scanner-specific severities, not a universal zero-CVE claim. The CycloneDX 1.7 scan SBOM has 18 components (17 library, 1 operating system) and 25 vulnerability entries; the scanners/SBOM do not inventory `/nodejs/bin/node` 22.23.3 or its bundled OpenSSL 3.5.8, zlib, c-ares 1.34.8 and ICU 78.3. Trivy JSON and SBOM files were local artifacts and are not included in the image or repository. |
| Limitations | The recorded image and scan predate the current write-denial source and do not validate it. Historical bounded Docker results (three GET selectors) and the earlier 27-tool MCP smoke are not final-source validation. The predecessor's Docker socket permission denial was not bypassed; later restored access and final image checks are recorded above. The historical Docker Desktop host did not exercise rootless Docker, AppArmor/SELinux variation, authenticated DHI pull, a private appliance, real tokens, a production host/profile or provider forwarding. No image was pushed or published. |

The earlier root-run `npm ci` network failure was not available in this worker's logs and could not be reproduced in the approved Docker Desktop build. The successful build establishes that the current local path works; it does not identify the earlier network failure's exact cause.

These controls follow the applicable recommendations in the [OWASP Docker Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html) and the [OWASP Docker-Security project](https://github.com/OWASP/Docker-Security): run non-root, drop capabilities, prevent privilege escalation, preserve default seccomp, constrain network connectivity, set resource limits, use a read-only filesystem, protect secrets, and review image integrity/scanning. The [official Node image documentation](https://github.com/nodejs/docker-node) describes its Debian variants and recommends multi-stage builds when omitting package managers. The [Distroless support policy](https://github.com/GoogleContainerTools/distroless/blob/main/SUPPORT_POLICY.md) describes supported image tags; those upstream policies and artifacts do not attest this derived image.
