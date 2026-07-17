# Research orchestration

The machinery that enforces the [method](../method/README.md) instead of
leaving it to willpower. All of it is **built and dogfooded** on the Adaption
investigation (`adaption-findings/investigation/`). Reuses the control plane's
patterns (receipts, gitflow) and existing infra (`agent-trace-outcomes`, the
synapse graph) rather than reinventing them.

Everything is `--repo <investigation dir>` — the engine is generic; the output
lives in the consuming repo's restricted `investigation/` folder.

## The tools (all working)

| Tool | Does |
| --- | --- |
| `rp_common.py` | Single-source parser for EXP front-matter + sections. Every tool reads through it (charter #7). |
| `register.py` | Scaffold a new `EXP-NNN` from the template; `--lint` refuses to let a placeholder survive past `registered`. |
| `ledger.py` | Project EXP front-matter → `LEDGER.md` + `ledger.jsonl` (the warm tier, charter #5). |
| `dag.py` | Validate the additive DAG (charter #3): no `builds_on` edge to a non-concluded/inconclusive node; no cycles. |
| `graph_feed.py` | Emit `graph/graph.json` in the synapse schema from **only** the clean folder (charter #10). `--out` to write elsewhere. |
| `outcomes.py` | Record each concluded experiment as an `agent-trace-outcome` (facts, not scores) → a "what's been tried" memory. |
| `synthesist.py` | Idle-cron interpretation role (charter #6): reads only conclusions, emits `digests/state-of-investigation.md`. Idle-guarded. |
| `nudge.py` | Queue a gentle hint for the running researcher (`.nudges/inbox.md`). |
| `loop.py` | The never-ending spine: `next` (assemble the researcher's move + drain nudges) · `ingest` (conclude housekeeping = ledger+dag+graph+outcomes+synthesist). |

## The experiment lifecycle (state machine)

Mirrors the probe watcher's states, but tracks **epistemic** state; ground
truth is the files, never a mutable field:

```
registered  EXP file exists WITH a frozen prediction   (register.py; lint enforces)
   ↓
running     receipt written; effectful call in flight
   ↓
observed    raw artifact collected
   ↓
reproduced  ≥3 replicates; effect vs noise floor recorded
   ↓
concluded   verdict scored vs the FROZEN prediction; conclusion locked
```

`ingest` runs on each conclude and keeps the ledger, DAG, graph, outcomes, and
digest current. The synthesist then names the next move — and the loop turns
again.

## The three tiers

Sonnet judges → Haiku codes → vLLM executes. See
[../contracts](../contracts/README.md) and
[researcher-loop.md](researcher-loop.md) for how to launch the standing loop
and how to nudge it mid-flight.

## Reused, not reinvented
- **agent-trace-outcomes** — the "did it work / what's been tried nearby"
  memory (`outcomes.py`). Records are facts, matching its non-goals.
- **synapse research graph** — `graph_feed.py` emits its native schema; only
  the clean folder is a source, so the graph stays tight.
- **gitflow** — commits via `projects_automated/orchestrator/gitflow.py`.
- **local vLLM** — every generative step; the synthesist's prose read too.
