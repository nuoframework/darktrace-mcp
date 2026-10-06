# README review, round 2

Follow-up to [round 1](readme-review-round-1.md) and the author's [response](readme-review-round-1-response.md), reviewed at commit `49a3736` ("Address README round-one review and select the network hero").

| | |
|---|---|
| Date | 2026-10-06 |
| Files reviewed | `README.md`, `README.es.md`, `docs/assets/banner-variants/b/*.svg` (rendered with `rsvg-convert` at 1280 px desktop, 343 px and 600 px mobile, EN and ES), `docs/assets/banner-variants/README.md`, `docs/visual-identity.md`, `docs/releases.md` |
| Checks run | `python3 scripts/demo/verify.py`: three GIFs within limits, 150 local links and anchors pass. Anchors introduced this round resolved by hand: `#fallback-build-from-source`, `#alternativa-compilar-desde-el-código-fuente`, `#update-after-the-installer-date-format-probe-2026-10-06-later`, `docs/es/clients.md#docker`. The `--pull=never` claim matches `src/cli/entry.ts:127` and `docs/clients.md:307`. The ghcr index digest in the README matches `docker buildx imagetools inspect`. |

## Verdict: AGREE

Both [must] items are resolved, every [should] is resolved or resolved with a defensible change, and the three declines are correctly reasoned. Nothing in the new text exceeds the evidence. Details per item:

| Round-1 item | Author's decision | Reviewer check |
|---|---|---|
| 1 Publication wording | applied | Verified. Both stale comments gone; lines 35 and 155 (EN) and 35 and 155 (ES) state the live state. |
| 2 First command | applied with changes | Verified. Fenced `npx` command is the first thing after the prerequisites. The author's two narrowings are correct: owner-only files are a macOS/Linux fact, and "backs up existing client configs" is more precise than my "with a backup". |
| 3 Docker digest | applied with changes | Verified, and the change is an improvement. Generated launchers run with `--pull=never`, so `setup --runtime docker` alone would write a config that cannot start without a prior pull. Adding the `docker pull` line fixes a gap in my proposal. |
| 4 Lab legend | applied with changes | Verified. "not lab-validated, including blocked or failed checks" is more accurate than my "not run against a real appliance", because `get_cves` (500), `get_filtertypes` (302) and the email reads (403) were attempted. Accepted. |
| 5 Section order | applied | Verified. Install now sits directly under the nav; the recordings follow. |
| 6 GIF captions | applied with changes | Verified. "no write reaches the appliance" is tighter than my "nothing reaches the appliance", since the preview call itself is network traffic. "Scripted keypress" is present. Accepted. |
| 7 Spanish links | applied | Verified. All nine client badges point at `docs/es/clients.md`; the nav, the security footer and the documentation line carry `(EN)` consistently; the Node and MCP badges now use Spanish guides. |
| 8 Hero badges | applied with changes | Verified. Both placeholders removed, release badge added. Linking the badge to the release listing rather than the tag is reasonable: the badge value will move with future releases and the destination should not go stale. |
| 9 Flowchart caption | applied | Verified, EN and ES. |
| 10 Spanish wording | applied | Verified. |
| 11 GIF title banners | declined | Agreed. I recommended deferral to the next re-record. |
| 12 Docker gates link | applied with changes | Verified. Direct link to run 37497433186, commit `f95e798` named, installer pins linked separately. |
| Outside: `docs/releases.md` | applied | Verified. New "Published 1.1.0" section, evidence table, badge policy updated; runtime-scan caveat retained. |
| Outside: `CHANGELOG.md`, `SECURITY.md` | declined | Agreed for this PR's scope. See residual 5. |
| Outside: wizard preset text | declined | Agreed. A `src/` edit; belongs to the next release. |

### Hero integration (variant B, owner's choice)

Reviewed only for integration, as instructed.

- **Alt text** is unchanged and still true of the new composition: the official wordmark sits in the dark right-hand footer, directly under the independence caption, exactly as the alt text describes. The SVG `<desc>` additionally names the decorative graph; the README alt does not, which is acceptable because the graph carries no information.
- **Mobile source**: the `<picture>` breakpoint (`max-width: 600px`) and the 640 × 900 mobile SVG are consistent with the previous hero, so nothing in the markup changed except the paths. Rendered at 343 px the title, tagline, both caption lines and the wordmark are all readable; the caption wraps to four lines as designed.
- **Legibility**: at desktop width the light title panel and the dark graph panel split cleanly, the "Unofficial MCP." label is the first thing read, and the independence caption is set in a monospace that reads well at 1280 px and at the ~896 px GitHub column. The font stack falls back to Arial/Helvetica where Manrope is absent; I rendered with that fallback and the hierarchy holds.
- **Self-contained**: the only `url()` reference is the internal `#network-glow` gradient; no fonts, images or scripts are fetched. Each SVG is about 34 KB.

## Residual suggestions (non-blocking)

1. **Duplicate guide link in Install.** EN line 31 ends with "[Full guide](../getting-started.md)" and line 33 ends with "[Full installation guide](../getting-started.md)". Same in ES ("[Guía completa]" twice, lines 31 and 33). Drop the second one.
2. **"Other ways" layout.** The bold label "**Other ways.**" stands alone, then two bullets, then the Docker code block sits outside the list. Either indent the fence under the Docker bullet or turn the two options into `### Claude Desktop` / `### Docker` mini-headings. Pure scannability.
3. **Alt text mention of the motif (optional).** If you want screen-reader parity with the SVG `<desc>`, insert "with a decorative network graph" after "Darktrace MCP —" in both languages. Not required.
4. **GIF first frames** (carried from round 1, item 11): add the title banner to the setup and approval recordings at the next re-record so all three open on a titled frame rather than an empty prompt.
5. **Root files still say "not yet published".** `CHANGELOG.md` line 3 and the `SECURITY.md` version table. Out of this PR's path scope, as the author says, but the README links the changelog twice, so a reader hits the contradiction within the two minutes. Worth a one-line follow-up PR.
6. **Wizard preset wording** ("email content" in `src/cli/entry.ts:9,16`) remains tracked for the next release; the README and `docs/tools.md` are correct today.

## What the README now does well

A security engineer landing on this page gets, in order: an unambiguous statement that the project is unofficial, a one-sentence value proposition that leads with read-only posture, six live badges with no placeholders, and a single fenced command with its three prerequisites in plain words. The three recordings are labelled as synthetic, their captions say exactly what was scripted and what was real, and the approval demo shows the human-decline path rather than a happy path. The area table is traceable row by row to the generated tool reference, the legend now sits where the eye lands, and the lab-evidence caveats are three short bullets instead of a paragraph. The safety section states every control together with its limit, the egress notice is impossible to miss, and the validation section links dated evidence while refusing to call it a certification or a clean scan. The Spanish README is a true peer: same structure, same numbers, Spanish guides wherever they exist and an honest `(EN)` marker wherever they do not. The new hero carries the same unofficial-status message in the image, the alt text and the first line of body copy, so the legal position survives any one of them being skipped.
