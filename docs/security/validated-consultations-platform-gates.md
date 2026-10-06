# Validated Consultations Platform Gates

Date: 2026-10-06. The frozen Linux gates pass on Node 22 and Node 24. Results remain provisional while the independent review is ongoing; stable publication remains blocked by OpenSSL 3.5.8.

## Frozen input binding

- Production source tree SHA-256: `9e7c7070298ef592a1a10cdcb7ca481420a377e25e4a93c863ca33c31921d7f2`.
- Test tree: 69 files, SHA-256 `59fe734b7f2d21b5482a6977f189115c50477d9efd3d9122f2697b9dc5dc2c09`.
- Active test file SHA-256 values:
  - `test/contract/read-summary-compatibility.test.ts`: `c6c422e97b835961841e56d2797ea09c586b86dfdec212cecd9305bf403b86af`
  - `test/contract/response-view.test.ts`: `3a56b037180c44edab7291463569afdcfd00494f7f155723131e464872cf348a`
  - `test/security/mcp-defense.test.mjs`: `f5f6068ae7195f0e97343ce0949a46fc0fa386be3741cb713661a89d8d1e1513`
  - `test/security/policy-sinks.test.mjs`: `13a7471cd58fa5fbbe10711db74f0710ba6ab333518ea0f49a61c914b8238f55`
- Root-approved first-stable fixture SHA-256: `6ddda2054c9c708d0516a90b7811eb0aba565016403953dace89d47bc89d213c`. The `read` and `read+sensitive` ordered profile canonical hashes are both `cd4ee42249a9110182046794c39fc00f5995700b7d751bccc6628e86afbddfe3`; the alpha fixture remains `37b5af95de1786ecce1b8762e12d2d63e577f171511a9db4964518b13a917f72`.
- Immutable external source archive: `/private/tmp/darktrace-validated19-platform-gates.UC5K3S/source.tar`, SHA-256 `bd01fe7df80e36e79db28866697b430b6af57dc25fbffb5c454a479ef87e3a5e`. Its input binding is `/private/tmp/darktrace-validated19-platform-gates.UC5K3S/input-binding.json`, SHA-256 `cd7a2421a629135e7f7733bab6dbdb7d800dccc116aba6dcf893ab328558b63d`.
- Before correcting the prior migration report, its original bytes were archived at `/private/tmp/darktrace-validated19-platform-gates.UC5K3S/archive/validated-consultations-test-migration.pre-correction.md.txt`, SHA-256 `ddf7346d83c772d61614c766c88b0623adaa9db03b6b85a70d06b8fcba4dd654`; the archived bytes matched the report before editing.

## Runner and results

The snapshot was unpacked into a private container tmpfs as UID 1000. Containers used `--network none`, a read-only root filesystem, all capabilities dropped, `no-new-privileges`, and tmpfs for `/work`, `/tmp`, and `/npm-cache`. The only input mounts were the immutable source archive stream and the host npm content cache at `/cache-content` (read-only); a narrow external results directory received logs and the generated security receipt. Installation used the lockfile SRI cache offline with lifecycle scripts and audit disabled.

The exact unpack and gate commands were run separately; each gate's individual exit code was captured:

```sh
tar --warning=no-unknown-keyword --exclude="._*" --mode=u+rwX -xf - -C /work
ln -s /cache-content /npm-cache/_cacache
npm ci --offline --ignore-scripts --no-audit --no-fund --cache=/npm-cache --logs-dir=/tmp/npm-logs
npm run typecheck
npm test
npm run test:security
```

| Platform | Pinned image reference and image ID | Runtime | npm ci | typecheck | functional | security | Container exit |
| --- | --- | --- | ---: | ---: | --- | --- | ---: |
| Linux arm64, Node 22 | `node:22-bookworm-slim@sha256:43ac6c60b8f89723f746e8a92ce91abd5017e627ce1ddfe4238355d3a30b772c`; image ID `sha256:43ac6c60b8f89723f746e8a92ce91abd5017e627ce1ddfe4238355d3a30b772c` | Node `v22.23.3`, npm `10.9.9`, OpenSSL `3.5.8` | 0 | 0 | PASS, 130 passed / 0 failed / 0 skipped | PASS, 325 passed / 0 failed / 0 skipped | 0 |
| Linux arm64, Node 24 | `node:24-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6`; image ID `sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6` | Node `v24.21.0`, npm `11.19.0`, OpenSSL `3.5.8` | 0 | 0 | PASS, 130 passed / 0 failed / 0 skipped | PASS, 325 passed / 0 failed / 0 skipped | 0 |

The security suite passed the special-permission rejection cases for modes `1600`, `2600`, and `4600` on both public and private token files on each Linux runner. Both security runs had zero skips.

The generated receipts are complete and source-bound to tree hash `9e7c7070298ef592a1a10cdcb7ca481420a377e25e4a93c863ca33c31921d7f2`; each records the approved first-stable fixture hash above. Receipt SHA-256 values:

- Node 22: `/private/tmp/darktrace-validated19-platform-gates.UC5K3S/results/node22/security-evidence/2026-10-05T23-02-13-232Z.json`, `48e0345fddf05619cad339329cf8c32238cf8ce17c1a27a94d4df541a0c92dbf`.
- Node 24: `/private/tmp/darktrace-validated19-platform-gates.UC5K3S/results/node24/security-evidence/2026-10-05T23-03-42-013Z.json`, `2d36dea47cb6becb465b1a2146e51adc61a56df4f05e773ddda8f61e2dfa8997`.

Per-command combined logs, exit files, npm debug logs, and security receipts are preserved under `/private/tmp/darktrace-validated19-platform-gates.UC5K3S/results/node22/` and `/private/tmp/darktrace-validated19-platform-gates.UC5K3S/results/node24/`. The two final containers were removed after copying evidence; the private workspace, temporary npm cache link, and install tree were tmpfs and disappeared at container exit. A final `docker ps -a` name filter found no `darktrace-validated19-final` containers.

## Non-final runner attempts

The first Node 22 extraction exited `97` because read-only source directory modes prevented the non-root tmpfs extraction; no gates ran. A separate earlier stopped tmpfs attempt reported npm ci, typecheck and functional exits 0 and security exit 1, but its logs and receipt disappeared before `docker cp`; that attempt remains unverified and its cause is not inferred from the later preserved AppleDouble diagnostic. The coordinator observed and retained those status and copy-failure records in the orchestration transcript. A retry exposed macOS libarchive `._*` AppleDouble metadata entries generated from xattrs in the tar stream: the contaminated security run reported 332 tests, 324 passed, 8 failed, and 0 skipped (seven metadata pseudo-test files plus a distribution-scanner parse failure). That diagnostic receipt (`2026-10-05T22-59-11-251Z.json`, SHA-256 `3fdd59c603f46d77701caba5164d5fe1c25ecaa9de8d33c42a48d209680ddace`) and logs are preserved under `/private/tmp/darktrace-validated19-platform-gates.UC5K3S/results/diagnostic/node22-appledouble-attempt/`. Final runs excluded only those generated `._*` entries at unpack, without changing source file bytes; both generated receipts then reported the pinned source tree hash and full passing totals above.

This dispatched worker modified only the two report files in the workspace. The gate runs made no production source, test, helper, fixture, package/version, shared `dist`, or Git edits. Stable publication remains blocked by the OpenSSL 3.5.8 finding; the gate results are provisional pending the independent review.
