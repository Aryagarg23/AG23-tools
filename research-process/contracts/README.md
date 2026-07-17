# Contracts

A **contract** conveys the ethos of an **LLM in use** — how a given model is
expected to behave while it operates in this repo. (The ethos of the *repo
itself* is the [charter](../CHARTER.md).)

Three tiers run every investigation, each with a contract, each offloading to
the one below:

| Tier | Model | Contract | One line |
| --- | --- | --- | --- |
| **Science consultant** | Sonnet | [science-consultant.md](science-consultant.md) | Judgment: hypotheses, lens, probe design, interpretation — and delegation. Writes no code. |
| **Coder** | Haiku | [coder.md](coder.md) | Hands: writes+runs the probe/verifier/analysis code, drives the worker. Never concludes. |
| **Local worker** | Qwen3-Coder-30B (vLLM) | [local-worker.md](local-worker.md) | Muscle: generate, run, label, digest in bulk. Never decides. |

The relationship is the whole point: **Sonnet judges → Haiku codes → vLLM
executes.** Each tier's default move is to offload down, and to lock in itself
only after the tier below repeatedly fails. See the consultant contract for
the create-mode drift this exists to prevent.
