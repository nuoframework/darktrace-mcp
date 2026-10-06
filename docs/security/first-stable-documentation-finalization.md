# First-stable documentation finalization

**Status: final for `1.0.0`.** Publication is by the owner after independent review. Date 2026-10-06. Final task `task_55433bc975f6`, dispatch `ctx_1bb28c6473c1` (following the earlier documentation checkpoint). This report records the EN/ES user-documentation cleanup for the private validated-consultation release candidate. It is not stable-release approval, and no version, tag or publication is claimed.

**Unofficial MCP. Developed by an independent third party, unaffiliated with Darktrace and without authorization from Darktrace.** Claims contact: [contacto@pabloarrabal.com](mailto:contacto@pabloarrabal.com).

## What changed

- **README / README.es.** A short current-status table replaces the long mixed current/history cells. Docker comes first as the recommended route (planned private image archives, plus the source helper and buildx option). The complete 15-tool → 19-selector mapping and an honest note on Alpine/musl runtime support are added. The obsolete current "OpenSSL 3.5.8 hold" and migration-pending wording is gone.
- **docs/docker.md.** Sections: current candidate at a glance, install options, build, runtime support, client configuration and hardening controls. Predecessor sections are labeled history, and their record text is unchanged.
- **getting-started EN/ES, releases, release-preparation, release-preparation-docker-mcp, architecture.** Current status and links are aligned, and predecessor evidence is labeled. A pre-existing broken anchor in `releases.md` is fixed.
- **Not edited:** earlier checkpoints and reports, source, scripts, tests, fixtures, package metadata, workflows and Git.

## Claims bound to evidence

| Claim | Source |
|---|---|
| 15 tools / 19 GET selectors, identical in both profiles | `docs/architecture.md` §1.1; contract hash `cd4ee422…` in [implementation report](patched-runtime-implementation.md) |
| Node.js 24.18.1, shared OpenSSL 3.5.9, both architectures | [Implementation report](patched-runtime-implementation.md) |
| Native amd64 and arm64: 130 functional + 325 security PASS, 0 skipped | Root dispatch brief, 2026-10-06 |
| Trivy 0; Grype zlib High CVE-2026-85091 and `ada` Medium CVE-2024-9410 retained | Implementation report; root brief |
| zlib affected but vulnerable `gz*` code not in the application path (both architectures); `ada` is a product collision | Independent review `ctx_ca8518283203`, relayed by root |
| No fixed Alpine 3.24 zlib as of 2026-10-06 | `/private/tmp/darktrace-zlib-vendor-remediation-research.md` |
| arm64 lab 19/19 PASS, cleanup verified | [patched-runtime-lab-checkpoint.md](patched-runtime-lab-checkpoint.md), SHA-256 `e13cf132a7b73270cef25c55a3446c9899670c6addc33d72e60fd4fc1f8398e0` (verified) |
| System CA store 121 roots; Node bundled 120; lab used system trust | Root relay of the independent review |
| Node 24 rates x64 musl Experimental and does not list arm64 musl | [v24.x BUILDING.md](https://github.com/nodejs/node/blob/v24.x/BUILDING.md#platform-list), read 2026-10-06 |

## Validation

Local links and anchors were checked across all owned files. `node scripts/validate-examples.mjs` passed (5 JSON + 1 TOML examples, no commands executed). EN/ES README section parity: same section order and tables.

## Release values

- **CI:** [run 37423665585](https://github.com/nuoframework/darktrace-mcp/actions/runs/37423665585) on commit `2adb84b` passed every job: Node 22/24 offline, plus native Docker on amd64 and arm64 with 130 + 325 tests and 0 skipped.
- **Package:** `darktrace-mcp-1.0.0.tgz`, SHA-256 `3abf8b7a5be5a0d56b23529c62a883fbf49a28cb08a6e606d6ac3fcb9916b37b`.
- **arm64 image:** archive `8c0d7c8d…cfe5e`, image ID `sha256:bc0a29b4…03f92`, tag `darktrace-mcp:1.0.0-arm64`.
- **amd64 image:** archive `3594f105…86cad`, image ID `sha256:59a490c7…4c0a3`, tag `darktrace-mcp:1.0.0-amd64`.
- **Shipped docs** (frozen in commit `2adb84b`): `README.md` `d7e3c796…1215`, `README.es.md` `c3d51961…2a52`, `SECURITY.md` `60115ab0…c633`. They contain no artifact hashes, which avoids a circular binding.
- **Release body (EN/ES):** `/private/tmp/darktrace-mcp-v1.0.0-release-notes.md`, external.

Lab evidence is unchanged: 19/19 real queries on arm64 `sha256:8cd85604…` on 2026-10-06. 1.0.0 differs only in the production version literal and was not retested live.

## Hashes

| Path | SHA-256 |
|---|---|
| `README.md` | `d7e3c7962ace382baafeac9d0635b365937be54816aefa5babd50245175c1215` |
| `README.es.md` | `c3d51961e9f3dd42cc8cc4918202ce3a50743c7ad6f667eaee084a1ed6fa2a52` |
| `SECURITY.md` | `60115ab08ed1a1cd405ab0d96b133a834a72f773325dd194417b4bcd1afec633` |
| `docs/docker.md` | `f5d2ba148b4c6ba2e626976a6cf45221afa8d83487e98251df9b9b6001d80916` |
| `docs/getting-started.md` | `9257d031af6ac8511ccad22f0c55f6b6aa52c9265b092a213fa5365d78d8b163` |
| `docs/es/getting-started.md` | `85493c0d37774e19a9df1fddeee2a17770e27976ce0b59ba666b51d05cc3caaa` |
| `docs/releases.md` | `2b234897b8ea3c124fe6cd9b52928393a6becb26310980401b7f77b0604a8150` |
| `docs/release-preparation.md` | `423dd825eefb6d3e2d21b38426c5f94cace8ab159226b3af2dbfba24ee03bd58` |
| `docs/release-preparation-docker-mcp.md` | `36452137c4f33ca4596c76095d2bde3e0f531fa6cab2624bc13e25c1d12f7f0e` |
| `docs/architecture.md` | `50b6d6a0751f0ae42782adc4916e3c61cb2d9dbd6b454d8e278300248b109eea` |
| `docs/stable-readiness.md` | `d5ea9d1ecf47ee330743f57f7ed726b66a49c76f02200459ee3351848b2962ee` |
| `/private/tmp/darktrace-mcp-v1.0.0-release-notes.md` | `604599ce5834c289f0a5fa08fcf8bab4a9e16a6dff25571ea7feefad32bc9a10` |
