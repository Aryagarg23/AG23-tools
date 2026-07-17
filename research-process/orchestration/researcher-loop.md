# The researcher loop — how to run it, how to nudge it

The researcher (Sonnet) **never stops** until you terminate it. It cycles:

```
  loop.py next   → reads the synthesist digest + open threads + YOUR NUDGES
        ↓
  Sonnet designs the next experiment  (register.py; freeze the prediction)
        ↓
  Haiku codes the probe + verifier + analysis, drives the vLLM worker
        ↓
  the experiment concludes  (verdict written into the EXP file)
        ↓
  loop.py ingest → ledger + DAG + graph + agent-trace-outcomes + synthesist
        ↓
  (repeat — the fresh digest already names the next best move)
```

Nothing in that loop needs you. It runs until terminated.

## Launching it

Point a standing Sonnet agent at one instruction: *"You are the science
consultant ([contract](../contracts/science-consultant.md)). Run the loop in
[researcher-loop.md] against `<investigation dir>` until terminated. Each
cycle: `loop.py next`, design + register the next experiment, brief the Haiku
coder to build and run it, conclude it, `loop.py ingest`. Offload all code to
Haiku and all bulk to the vLLM worker — write no code yourself."*

Drive it with the `/loop` skill (self-paced) or a standing background agent.
It halts only on your termination or a hard blocker it escalates.

## Nudging it — the gentle interrupt

While the researcher waits on Haiku/vLLM, you may have spotted something. Drop
it in without breaking anything:

```
python3 orchestration/nudge.py --repo <investigation dir> \
  "percentile never left 7 — is it a dead field, or does real data move it?"
```

The nudge lands in `<inv>/.nudges/inbox.md`. At the **top of its next cycle**,
`loop.py next` surfaces it — flagged first, ahead of the digest — and files it
into `.nudges/seen.md`. It is **advisory**: the researcher weighs it like any
open thread and may open an experiment for it, but it does **not** preempt the
frozen prediction of whatever is running right now (charter #2). So you get to
plant a hunch mid-flight without corrupting the experiment in progress.

## Terminating it
Stop the agent/loop. State is durable: the ledger, graph, digest, and every
frozen prediction are on disk. Re-launching resumes exactly where it left off —
and anything sheddable rebuilds from its committed generator + seed (charter #4).
