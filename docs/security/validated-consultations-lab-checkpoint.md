# Validated consultation lab checkpoint

Date: 2026-10-05 UTC. Darktrace lab: 7.1.0. Outcome: all **19 distinct permitted GET selectors** passed through an initialized native MCP client and through the hardened Docker MCP image. These are bounded recipe and response-shape checks, not a claim that every parameter combination or nonempty resource variant was exercised. No writes or Antigena actions were performed.

## Binding

- Production source tree: `9e7c7070298ef592a1a10cdcb7ca481420a377e25e4a93c863ca33c31921d7f2`.
- Docker image: `sha256:eb3a7681da69f6468df0a7600af9d72560cfd8d5c4747dfa8ee57e45f09abeaf`. All 26 transport runtime files match the native build.
- Initial runtime manifest: `00adff89c7f0eedaa1022f480751ae3f1243e12600a5182cbc95fa2c1fbf1307`.
- Reviewed endpoint runtime manifest: `e0875c41547f623f25a522baba3cd1d251c0086a07055a7a11415d437e6e2aca`.
- Final validation policy: `3060d0a25c9d156501ade8d053183cc04a70946171926bdda0de1f17508c6996`. The reviewed inventory discovery recipe uses count 10 and offset 0 with its existing default 28-day window; minimal discovery remains count 1 with seensince 300.

## Results and limits

Native first batch passed status, devices, subnets, AI Analyst statistics, intelligence feed, model breaches, device search and similar devices; its sanitized output is retained in the coordinator tool transcript, not a standalone JSONL receipt. Remaining native and all Docker receipts are listed below. Earlier missing-identifier refusals remain preserved: connection details needed a device-search-provided identifier; endpoint details needed a valid IP from the separately reviewed bounded inventory recipe. Neither refusal called its target endpoint, guessed identifiers, nor changed response projection.

All successful envelopes reported the expected data type, no truncation, no safe projection fallback and compatibility validation. TLS verification remained enabled. Requests were sequential, bounded, without retries or extra pages. Identifiers and lab telemetry were kept in memory and omitted from receipts.

| Receipt | SHA-256 | Passed selectors | Refusals |
| --- | --- | --- | --- |
| lab-docker-batch1.jsonl | `73658e0a6fbac80f2e2ae1c58685857c888033c40073328bb7604693f970d44d` | `get_status`, `get_devices`, `get_subnets`, `get_aianalyst_stats`, `get_intelfeed`, `get_modelbreaches`, `get_devicesearch`, `get_similardevices` | None |
| lab-docker-batch2.jsonl | `af97daa2bdf551ab9389b12ab25fa102c27fa3cfac360690c1f0826466853a76` | `get_status`, `get_devicesearch`, `get_aianalyst_groups`, `get_aianalyst_incidentevents`, `get_aianalyst_investigations`, `get_mbcomments`, `get_details` | None |
| lab-docker-batch3.jsonl | `9e1ffcd7864d1ae1e7825ff7122690343a920df411546b9bf2b72fce69c7347c` | `get_status`, `get_devicesearch`, `get_tags_entities`, `get_tags_tid`, `get_tags_tid_entities`, `get_antigena`, `get_antigena_summary` | None |
| lab-docker-endpoint-reviewed.jsonl | `892ad5f6b53f81abd5aa63bb86ac20aed208399385dc3ed5ff6c4d85ec93c90f` | `get_status`, `get_devicesearch`, `get_endpointdetails` | None |
| lab-native-batch2.jsonl | `f159ffa076809bed5495a204af25cd10e95c684a8f789876b2f2146dbc6bf1b0` | `get_status`, `get_devices`, `get_aianalyst_groups`, `get_aianalyst_incidentevents`, `get_aianalyst_investigations`, `get_mbcomments` | `get_details: BLOCKED_MISSING_IDENTIFIER` |
| lab-native-batch3.jsonl | `830e2b7cb683e4dba2e323fbc9ceefdc4c39708ed458e33b6fbb1b2a32260832` | `get_status`, `get_devicesearch`, `get_details`, `get_tags_entities`, `get_tags_tid`, `get_tags_tid_entities`, `get_antigena`, `get_antigena_summary` | None |
| lab-native-batch4-inventory.jsonl | `e4d1af50719888c1f92a25b410ea765f7bf6cc512af7ea1677e6851238c31d28` | `get_status`, `get_devicesearch` | `get_endpointdetails: BLOCKED_MISSING_IDENTIFIER` |
| lab-native-endpoint-reviewed.jsonl | `934e5552440edec786fffb1334e97349054bbcf660dabf1a784533077e6264d2` | `get_status`, `get_devicesearch`, `get_endpointdetails` | None |

Receipts are protected outside the repository under `/private/tmp/darktrace-validated19-lab-584px9mb/`. Root removed the exact campaign-owned secret volume, independently verified its absence from Docker volume inventory, then removed its protected marker. Credentials remain outside the repository.

## Release decision

Functional lab validation passed for the selected scope. Final migrated test suites and independent migration review are separate gates. This checkpoint does **not** clear the OpenSSL 3.5.8 / CVE-2026-35189 stable-release hold or certify a vulnerability-free image. See the Docker checkpoint and security review for runtime component findings.

Official runtime availability was rechecked at 2026-10-05 22:36 UTC: the latest Node 22.23.3, 24.21.0 and 26.10.0 entries still list OpenSSL 3.5.8 in the [official distribution index](https://nodejs.org/dist/index.json). The [OpenSSL advisory listing](https://openssl-library.org/news/vulnerabilities-3.5/) identifies CVE-2026-35189 as affected before 3.5.9. No patched official runtime was found in those supported release lines at this checkpoint.

## Supplemental native receipt completion

At 2026-10-05 22:52 UTC, a separate bounded native confirmation run recorded the five selectors whose first PASS had only coordinator-transcript evidence, together with status and device-search prerequisites. All seven passed using the reviewed final manifest and minimal policy, unchanged runtime, verified TLS, no retry/page, no fallback and no truncation. `lab-native-receipt-completion.jsonl` SHA-256: `850b680ed68a33cf1afdbb4f77cb98d2519cd29e15c46d3329eca78949e4fbbd`. Combined native JSONL receipts now cover all 19 permitted selectors; the original transcript-only first batch remains historically disclosed above. No production or shipped package input changed. The preceding checkpoint bytes are preserved externally at `lab-checkpoint-before-receipt-completion.md.txt`, SHA-256 `46d4d30c062714353249f7abdb2b0cee2c6029abdd113bbaf16f62c95340e870`.
