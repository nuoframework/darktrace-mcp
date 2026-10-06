# README demo recordings

These are recordings of the built server with synthetic fixtures, not real appliance evidence. No production credentials, private keys or real appliance results are committed. The recordings use English; both READMEs share the GIFs. Product names identify compatible clients, not authors or endorsements.

| Recording | What actually runs | Result |
|---|---|---|
| [setup.cast](setup.cast) | `node dist/src/index.js setup`, driven through a PTY | HTTPS/token probe succeeds; `read` selected; OpenCode entry written under a temporary `XDG_CONFIG_HOME`; token files checked as `0600` |
| [analyst.cast](analyst.cast) | Authenticated Claude Code headless session, strict isolated MCP config | Calls `darktrace_get_devices` and `darktrace_list_model_breaches`; answers from their synthetic results |
| [approval.cast](approval.cast) | Small MCP host using the real server's form elicitation | `dryRun:true` → `previewId` → `confirm:true` → exact server dialog → decline → `approval_denied` |

The approval UI is a **demo host**, not a Claude Code screenshot. Its driver can only decline, and the recorder sends Enter after displaying the dialog. This demonstrates protocol handling, not independent proof that a human answered. The analyst presentation formats live `stream-json` tool events and answer text; it has no canned answer. Waiting time is capped during GIF rendering. The analyst cast height was increased from 32 to 36 rows for legibility; output is unchanged. The `.cast` files preserve the captured timing and output; input capture is disabled, so hidden token entry is absent.

## Prerequisites

Node.js 22+, Python 3, OpenSSL, an authenticated `claude` executable for the analyst recording, and:

```sh
brew install asciinema agg
npm ci --ignore-scripts
npm run build
```

Recorded with asciinema 3.2.1 and agg 1.9.0. No production code is modified or loaded through a test override. Scripts use temporary token files containing only `mock-public-token` / `mock-private-token`; Node receives the private CA through `NODE_EXTRA_CA_CERTS`. Temporary client config and token files are removed on successful completion. A forcibly killed run may leave `darktrace-demo-*` / `darktrace-setup-*` directories in the OS temporary directory; inspect and remove only those demo directories.

## Start the synthetic appliance

The supplied scratchpad mock binds to `127.0.0.1:8443` and has a certificate for `localhost` and `127.0.0.1`. The production destination policy rejects loopback **even with that valid certificate**. These recordings therefore use a copy of its server and unchanged fixtures, bound to the recording machine's private IPv4 address on port 8444, with a fresh matching certificate. TLS and destination checks stay enabled. Nothing calls a real Darktrace appliance.

Use a trusted test network: the mock will be reachable on the chosen private interface and its dummy credentials are public. It validates signatures but does not emulate state changes, permission scopes, filtering, pagination or every parameter-dependent response. Stop it after recording.

Choose an RFC1918 address assigned to this machine (the example below must be replaced if it is not yours). Keep certificates, keys and request logs outside the repository:

```sh
export DEMO_BIND=192.168.0.111
export DEMO_URL="https://${DEMO_BIND}:8444"
DEMO_WORK=$(mktemp -d /tmp/darktrace-readme-mock.XXXXXX)
cp scripts/demo/mock/{server.mjs,routes.json,gen-certs.sh} "$DEMO_WORK/"
export DEMO_CA="$DEMO_WORK/ca.pem"
sh "$DEMO_WORK/gen-certs.sh"
PORT=8444 node "$DEMO_WORK/server.mjs"
```

Keep this terminal running. In another terminal at the repo root, export the same `DEMO_URL` and **absolute** `DEMO_CA`. The server defaults to loopback when `DEMO_BIND` is absent; do not weaken the production address policy to make that default work. The checked-in mock adds only the configurable bind address and certificate SAN to the supplied scratchpad harness.

## Record and render

Run recordings **sequentially**, so no two processes write the same cast. `setup.py` selects only OpenCode under its temporary `XDG_CONFIG_HOME`; it does not change installed client configs. The analyst uses `--strict-mcp-config`, disables built-in tools, skips user/project settings and enables only the two read tools. Its answer can vary, and the authenticated client sends synthetic tool results to its provider.

```sh
python3 scripts/demo/record.py setup
python3 scripts/demo/record.py analyst
python3 scripts/demo/record.py approval
```

```sh
agg --theme github-dark --font-size 16 --fps-cap 10 --idle-time-limit 2 --last-frame-duration 5 scripts/demo/setup.cast docs/assets/demo/setup.gif
agg --theme github-dark --font-size 16 --fps-cap 10 --idle-time-limit 2 --last-frame-duration 7 scripts/demo/analyst.cast docs/assets/demo/analyst.gif
agg --theme github-dark --font-size 16 --fps-cap 10 --idle-time-limit 2 --last-frame-duration 6 scripts/demo/approval.cast docs/assets/demo/approval.gif
```

Check each GIF is below **3,000,000 bytes**, inspect its readable frames and verify the mock's `requests.log` contains the successful GETs. `writes.log` must not grow during the approval recording. A declined action must yield `approval_denied`, not success. Never commit generated `.pem` files, mock logs, client configs or token files. Use `asciinema play scripts/demo/setup.cast` (or the other casts) for a pauseable text alternative.

## README table and badge maintenance

The area table aggregates the current [tool reference](../../docs/tools.md): count unique tool names and operation rows per `##` area; list their profiles; count `yes`, `partial:` and `not lab-validated` in the Lab column. Totals are 50 tools / 77 operations and 45 full / 11 partial / 21 unvalidated operation rows. Do not interpret an area marker as complete validation of every argument or final write control.

[Badge choices and pending OpenSSF status](../../docs/releases.md#openssf-badge-placeholders) document the verified Simple Icons slugs. npm's badge may fail before publication; both OpenSSF badges are explicit placeholders.
