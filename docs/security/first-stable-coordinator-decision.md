# First stable: coordinator decisions

Date: 2026-10-06. Scope: 15 read-only MCP tools, 19 validated GET selectors; writes deferred.

## Vulnerability applicability

Accepted the independent review's image-bound evidence for CVE-2026-85091: the zlib library version remains affected, but the vulnerable `gz*` code is not in this application's execution path. The full signed ELF closure has no `gz*` imports, the pinned Node source does not call those functions, and there are no native addons or application FFI paths. This clears the applicable-vulnerability gate for the reviewed application images; it is neither a library fix nor a scanner suppression. Preserve the raw Grype High and the product-collision finding for CVE-2024-9410. Rebuild and review when Alpine publishes the upstream zlib fix, or when application/native dependencies change.

## Lab completion

The user confirmed that the lab has terminated. Preserve the successful 19-selector campaign and its exact image binding in [the lab checkpoint](patched-runtime-lab-checkpoint.md). No further live appliance campaign is required for this release. The independent review established that the hardened image respins preserve all application, dependency and ELF bytes, with only installer-file removals and license-mode normalization. A stable version literal change must be separately reviewed and tested; it does not expand the validated API surface. Final rebuilt images must pass synthetic TLS, SDK and native suites. Do not claim that rebuilt images were tested against the closed lab.

## Publication condition

Publish the private v1.0.0 release only after final native amd64/arm64 CI, final artifact and version-diff review, checksums and documentation are complete. Preserve earlier alpha tags and receipts. No public registry or npm publication is authorized or claimed.
