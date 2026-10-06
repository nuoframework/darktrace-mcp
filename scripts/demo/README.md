# README terminal recordings

These are real terminal recordings of the built server against **synthetic HTTPS fixtures**, with dummy tokens and no production data. They demonstrate workflows, not appliance compatibility. Product names identify clients, not authors or endorsements. Both READMEs share the English recordings.

| Recording | Source and actual execution |
|---|---|
| Setup | [setup.tape](setup.tape) drives `node dist/src/index.js setup` with typed URL, hidden dummy tokens, preset 1 (`read`), and OpenCode only. [setup.cast](setup.cast) captures the terminal output. The wizard shows its banner, `Step n of 5` headers, a spinner during the signed probe and an aligned summary with file modes, then the `Next:` hint. The shipped GIF predates that look and must be re-recorded with this tape. |
| Analyst | [analyst.mjs](analyst.mjs) runs an authenticated `claude --mcp-config <tmp.json> --strict-mcp-config -p "…"` session. [analyst.cast](analyst.cast) captures the live tool events and streamed answer; [analyst.tape](analyst.tape) renders that cast with VHS. |
| Approval | [approval.tape](approval.tape) drives [approval-client.mjs](approval-client.mjs), a real interactive Claude Code session using the built MCP server. It previews `post_antigena`, confirms the same action, displays the native “MCP server darktrace requests your input” form, selects **Decline**, and shows the refusal. |

The analyst display formats actual `stream-json` events and partial text; there is no canned answer. Received words are paced for readability and idle gaps are capped at 1.2 seconds during playback. The displayed command abbreviates the temporary filename, prompt and rendering flags; the script contains the exact invocation. The answer can vary. The approval tape hides startup and network waits, then captures the actual client dialog and response. [render-approval.sh](render-approval.sh) crops the top 108 pixels to remove the native startup banner; the tool output, dialog, and response are not rewritten. Its scripted keystrokes decline: this is protocol/UI evidence, not proof of an independent human decision. No action executes; the mock write log must remain unchanged.

## Prerequisites

Node.js 22+, Python 3, OpenSSL, an authenticated `claude` executable, and:

```sh
brew install vhs asciinema agg
npm ci --ignore-scripts
npm run build
claude auth status
```

The shipped recordings use VHS 0.12.1, asciinema 3.2.1 and Claude Code 2.1.289. VHS uses Menlo 18 px, a dark theme, a roughly 100 × 30 terminal and a requested capture rate of 30 fps. Its GIF encoder can coalesce/resample frames; verify the actual output with `ffprobe`. VHS needs permission to launch its local terminal/browser renderer. The client also needs access to its existing login (a sandbox can prevent keychain access).

Only dummy Darktrace tokens are used: `mock-public-token` / `mock-private-token`, stored in temporary files with mode `0600`. Node trusts the mock CA using an **absolute** `NODE_EXTRA_CA_CERTS` path. The setup helper isolates `XDG_CONFIG_HOME` and checks the resulting token modes. The analyst isolates MCP configuration, disables built-in tools, skips user/project settings, and allows only the two read tools. The native approval client uses an isolated MCP config with `DARKTRACE_PROFILES=all` and `DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE=true`; server elicitation remains enabled. Synthetic tool results are sent to the authenticated client's provider.

Temporary token/config directories are removed on normal exit. A killed run may leave `darktrace-demo-*` / `darktrace-setup-*` directories in the OS temporary directory; inspect and remove only those demo directories. The native client may retain its normal local conversation history. Never commit client configs, token files, CA private keys, certificates, or mock request logs.

## Start the synthetic appliance

The supplied scratchpad mock binds to loopback and has a localhost certificate. The production destination policy rejects loopback even with a valid certificate. These recordings use the same fixture snapshot and server, with only a configurable private bind address and matching certificate SAN. TLS and destination checks stay enabled; no production server is contacted.

Use a trusted test network: this mock is reachable on the chosen private interface and its dummy credentials are public. It validates signatures but does not emulate state changes, permission scopes, filtering, pagination, or every parameter-dependent response. Stop it after recording.

Choose an RFC1918 address assigned to this machine. Replace the example address in these exports **and in setup.tape's URL typing line** when necessary. Keep keys and logs outside the repository:

```sh
export DEMO_BIND=192.168.0.111
export DEMO_URL="https://${DEMO_BIND}:8444"
DEMO_WORK=$(mktemp -d /tmp/darktrace-readme-mock.XXXXXX)
cp scripts/demo/mock/{server.mjs,routes.json,gen-certs.sh} "$DEMO_WORK/"
export DEMO_CA="$DEMO_WORK/ca.pem"
sh "$DEMO_WORK/gen-certs.sh"
PORT=8444 node "$DEMO_WORK/server.mjs"
```

Leave that terminal running. In a second terminal at the repository root, export the same `DEMO_URL` and absolute `DEMO_CA`. Do not weaken the server's address or certificate checks.

## Record and render

Run sequentially. The setup tape starts [terminal.sh](terminal.sh), creates an isolated configuration directory, records output only with asciinema, types through the real wizard and exits. Hidden token keystrokes are absent from the cast.

```sh
vhs scripts/demo/setup.tape
python3 scripts/demo/record.py analyst
vhs scripts/demo/analyst.tape
bash scripts/demo/render-approval.sh
```

The analyst tape plays the **fresh** cast at speed 1, with idle gaps shortened, and holds the finished answer for reading. If a new answer takes longer than the tape's playback window, increase its final `Sleep` and recheck the 25-second limit. Do not reuse an old cast and claim a fresh client call.

The approval tape waits for the temporary-directory trust prompt before selecting the directory we just created. It then submits the critical-action request and waits for the actual elicitation. It navigates from the unchecked `approved` field to the buttons, then right to **Decline**, and presses Enter. Never check `approved` or select Accept. Keep explicit pauses after the trust prompt: the client can paint before its keyboard handler is ready. Rehearse with `node scripts/demo/approval-client.mjs` if a client update changes the UI. Check the final GIF visually before changing the README captions.

## Verification

```sh
python3 scripts/demo/verify.py
node scripts/validate-examples.mjs
ffprobe -v error -count_frames -show_entries stream=nb_read_frames,duration -show_entries format=size -of json docs/assets/demo/setup.gif
```

[verify.py](verify.py) checks all three GIFs: **at least 100 frames**, **10–25 seconds**, **at most 3,000,000 bytes**, plus local links and heading anchors in both READMEs and this guide. Review early, intermediate and final frames for readable text, progressive typing/output, complete results, and no startup/account/model banner. Check external README links as well. Confirm the mock's `requests.log` contains successful `/status`, `/devices`, and `/modelbreaches` GETs from this run, and that `writes.log` did not grow during approval.

The casts are pauseable text alternatives:

```sh
asciinema play scripts/demo/setup.cast
asciinema play scripts/demo/analyst.cast
```

## Fallbacks

If VHS is unavailable, render the fresh casts with agg:

```sh
agg --speed 1 --fps-cap 30 --theme github-dark --font-size 18 --idle-time-limit 1.2 --last-frame-duration 5 scripts/demo/setup.cast docs/assets/demo/setup.gif
agg --speed 1 --fps-cap 30 --theme github-dark --font-size 18 --idle-time-limit 1.2 --last-frame-duration 5 scripts/demo/analyst.cast docs/assets/demo/analyst.gif
```

The retained [approval.mjs](approval.mjs) and [approval-host.cast](approval-host.cast) are the **legacy demo-host fallback**, not the source of the current approval GIF. `python3 scripts/demo/record.py approval` records that host to `approval-host.cast`. If it becomes necessary to ship that fallback, add progressive typing/output, render at up to 30 fps, pass the same checks, and change **both** README captions to explicitly say “demo MCP host, not a Claude Code screenshot.” Do not relabel a demo host as a native client.

## README table and badge maintenance

The area table aggregates the current [tool reference](../../docs/tools.md): count unique tool names and operation rows per `##` area; list their profiles; count `yes`, `partial:` and `not lab-validated` in the Lab column. Totals are 50 tools / 77 operations and 53 full / 6 partial / 18 unvalidated operation rows. Do not interpret an area marker as complete validation of every argument or final write control.

[Badge choices and pending OpenSSF status](../../docs/releases.md#openssf-badge-placeholders) document the verified Simple Icons slugs. npm's badge may fail before publication; both OpenSSF badges are explicit placeholders.
