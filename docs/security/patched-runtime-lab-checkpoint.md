# Patched runtime lab checkpoint

2026-10-06 Europe/Madrid. All **19 permitted GET selectors across 15 MCP tools** passed bounded initialized-MCP checks against the authorized Darktrace **7.1.0** lab using the new hardened Alpine runtime. This validates these recipes and response shapes, including empty results; it does not establish every parameter or resource variant. No writes or Antigena actions were performed.

## Exact binding

- Image (Linux arm64): `sha256:8cd856049fe44dea8692333dded5022e9e7826e8dbb2e40814c056edd0219ca2`.
- Actual pre-campaign runtime guard: Node `24.18.1`, shared OpenSSL `3.5.9`, nonroot UID `1000`; verification enabled.
- Production source: `9e7c7070298ef592a1a10cdcb7ca481420a377e25e4a93c863ca33c31921d7f2`.
- All 49 production runtime files match the frozen accepted build, aggregate `e7cbb509d54909fa10276ffeaec11cab22bb201f1f81635fa8c988abcb3653fb`; exact three npm dependency trees unchanged. Root independently checked both architecture rootfs archives, all runtime and dependency files, CA bundle bytes and root ownership. External byte-binding receipt SHA-256: `67eaceee05a41073c37bccc8b703358c92fdef4f134dd84384e55fdb2738c5f9`.
- Reviewed external runtime manifest: `e0875c41547f623f25a522baba3cd1d251c0086a07055a7a11415d437e6e2aca` (43 source/helper inputs, 26 transport runtime files, 14 host SDK dependency trees). The frozen lab snapshot excludes the new build-only helper; its complete existing input set is unchanged.
- Harness: `5d2a9fefa682bd41852e7fc1e2333180384cc2f76e0e23becb5827315b802e23`; policy: `3060d0a25c9d156501ade8d053183cc04a70946171926bdda0de1f17508c6996`.
- Full tools/list oracle: `6ddda2054c9c708d0516a90b7811eb0aba565016403953dace89d47bc89d213c`; both profile contracts: `cd4ee42249a9110182046794c39fc00f5995700b7d751bccc6628e86afbddfe3`.

## Sanitized receipts

Each envelope reports success, expected data type, no truncation, no projection fallback and compatibility-shape validation. Real resource identifiers/IPs and telemetry remained in memory. Protected credentials stayed outside the repository; the helper provisioning container was never started.

| Receipt | Profile | Selectors | SHA-256 |
| --- | --- | --- | --- |
| `lab-docker-batch1.jsonl` | minimal | `get_status`, `get_devices`, `get_subnets`, `get_aianalyst_stats`, `get_intelfeed`, `get_modelbreaches`, `get_devicesearch`, `get_similardevices` | `26713abae32a0a7648b54f9769538e1b633ad88f48cf1ec7097cb57cdb793738` |
| `lab-docker-batch2.jsonl` | minimal | `get_status`, `get_devicesearch`, `get_aianalyst_groups`, `get_aianalyst_incidentevents`, `get_aianalyst_investigations`, `get_mbcomments`, `get_details` | `bd9fbd90f7100e9e1d8ae485f0be3b078b5d176e1d57b55bb0e590a4e8f83724` |
| `lab-docker-batch3.jsonl` | minimal | `get_status`, `get_devicesearch`, `get_tags_entities`, `get_tags_tid`, `get_tags_tid_entities`, `get_antigena`, `get_antigena_summary` | `67cc550a09c820da876b9dd3bbb097c9bfaf20f0b02ed45ec6657b6bd3f01b82` |
| `lab-docker-endpoint.jsonl` | inventory | `get_status`, `get_devicesearch`, `get_endpointdetails` | `b526eb768787fd3e5be7f5f0c69dde56583e7ac6ccb24c315144c49c79883a97` |

Receipts are protected outside the repository under `/private/tmp/darktrace-patched-runtime-lab-tj91457i/`. The complete campaign-summary SHA-256 is `56222a67ceda76f01804b4aacfaf215bf8f56ae381032e24920031d924c8ca26`.

## Bounds and cleanup

25 total successful requests across four sessions, covering 19 distinct selectors. Status first, at most eight selected requests per session, concurrency one, queue zero, 30-second request deadline, no retries or pagination. Minimal sessions used 32 KiB upstream / 8192 output characters; endpoint inventory used 1 MiB / 60000 with count 10, offset zero and the reviewed default 28-day discovery window. The endpoint IP was discovered from that same first-page device search; no identifier or address was guessed. TLS verification remained enabled throughout.

The root coordinator removed the exact campaign-owned secret volume, independently checked Docker volume inventory for absence, and removed the protected marker. No campaign container remains attached. These are cleanup facts, not a security waiver.

## Release decision

The new-image bounded lab gate **passes** for this source/image binding. Native amd64 security CI, independent image/build/TLS review and scan applicability remain separate gates. Fresh scans include the unresolved zlib HIGH finding; no fixed-zlib, vulnerability-free-image, stable-tag or publication claim is made here. The earlier [consultation lab checkpoint](validated-consultations-lab-checkpoint.md) remains unchanged as predecessor evidence.
