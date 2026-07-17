# research-process

The scientific method as an operating system for investigations.

This repo is **not** where findings live — findings are outputs, they belong
in their own investigation repo (e.g. `adaption-findings`). This is the
**process** that produces trustworthy findings: how you form a hypothesis
*before* you run, how you reproduce, and how you build additively so each
experiment stands on a locked prior conclusion instead of on sand.

## The one non-negotiable

**Pre-register the hypothesis and a falsifiable prediction before the run.**

This is the receipts discipline applied to epistemics. Just as an effectful
API call is journaled before you wait on it (so a killed waiter never
resubmits), a hypothesis is journaled *before* the experiment (so a
surprising result can never be quietly rationalized into a confirmation).
The failure this prevents is real and has already happened here: an
auto-reflector once "confirmed determinism" by comparing a control dataset
to itself — it narrated whatever the state machine fed it. You commit to the
prediction while you still don't know the answer, or the prediction is
worthless.

## The loop

```
   QUESTION            what don't we understand about the system?
      |
   LENS                pick a persona to think through  → lenses/
      |
   HYPOTHESIS          a mechanism, stated as a claim
      |
   PREDICTION          falsifiable, about an ARTIFACT you can read,
      |                 written down BEFORE the run  → method/hypothesis-template.md
   PROBE               one variable, one control       → Reductionist lens
      |
   RUN                 journal the effectful call (receipt) before waiting
      |
   REPRODUCE           ≥3× on unchanged input; establish the noise floor
      |                 an effect below the noise floor is not a finding
   CONCLUDE            confirmed / refuted / inconclusive — vs the pre-registered prediction
      |
   ADDITIVE NEXT       the next experiment builds on this LOCKED conclusion
```

Detail in [method/README.md](method/README.md). The cycle of lenses that
keeps it honest: **Reductionist** (design) → **Mechanist / Ethnographer**
(explain) → **Falsifier / Statistician** (verify) → **Cartographer**
(extend).

## Layout

- [`lenses/`](lenses/README.md) — hypothesis-forming personas. Same data,
  different questions. Pick one before writing a hypothesis.
- [`method/`](method/README.md) — the loop, plus the pre-registration and
  experiment templates.
- [`orchestration/`](orchestration/README.md) — research-specific
  orchestration: the experiment lifecycle state machine, the hypothesis
  registry, the reproduction runner, the additive-DAG rule. Reuses the
  control plane's patterns (receipts, gitflow, priority queue) rather than
  reinventing them.

## Governing principles (inherited, non-negotiable)

- **Reverse-engineer the evaluator before optimizing.** A better score is
  not a finding; a mechanism is. Exploration first, optimization later.
- **Local vLLM for all generative work.** Never a paid model to build the
  probes that will themselves cost paid credits.
- **Verify before paid.** Mock/estimate gates before anything metered.
  Free read-only observation is not a retry.
- **Macro signal before niche noise.** Find the dominant bias, then chase
  subtle noise once the big regime is mapped.
