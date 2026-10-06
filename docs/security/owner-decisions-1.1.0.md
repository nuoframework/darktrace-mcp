# Owner decisions for 1.1.0 (2026-10-06)

Recorded by the release orchestrator from the repository owner's answers on 2026-10-06, to close
blocker B8 of `final-gate-review-1.1.0.md`. Each item is an accepted residual risk, disclosed in
the release notes; acceptance does not make the risk disappear and is revisited at the next release.

| ID | Residual | Decision | Conditions that keep it acceptable |
|---|---|---|---|
| TM-24 | Sensitive reads and writes in one process (`all`, or any `sensitive`+`write` union) without a session taint control: data read from Advanced Search, email or PCAPs can be copied by the model into comments, tags, intel feed entries or investigations when the user asks for it. | **Accepted.** | Startup requires `DARKTRACE_ACKNOWLEDGE_SENSITIVE_WRITE=true`; the wizard asks an explicit yes; tool descriptions warn that results are untrusted and free-text writes are exfiltration channels; free-text fields are bounded. |
| TM-30 | `DARKTRACE_CRITICAL_APPROVAL=host` delegates critical approval to the host's own tool-permission prompt, and ordinary writes rely on the host prompt by default. | **Accepted.** | `DARKTRACE_ACKNOWLEDGE_HOST_APPROVAL=true` required; `approvalMode:"host"` written to every audit record; host-mode tool descriptions say there is no server dialog; default for critical stays `elicitation`. |
| TM-35 | Write rate limit, circuit breaker, preview store and audit chain are per process; several processes against one appliance multiply the budgets and start separate chains. | **Accepted.** | Documented in `configuration.md` and the release notes; one process per client is the supported deployment; appliance-side least-privilege tokens recommended. |
| TM-17 | Appliance results, including Base64 PCAP content under `sensitive`, enter the model provider's context; organisational eligibility, retention and residency are the deploying organisation's assessment. | **Accepted.** | README and SECURITY keep the egress notice; `sensitive` is opt-in; PCAP returns size and digest only when over budget. |

Publication (B9): the owner configures the npm trusted publisher for `@nuoframework/darktrace-mcp`
(repository `nuoframework/darktrace-mcp`, workflow `release.yml`) before the first tag; no long-lived
npm token is stored in the repository.
