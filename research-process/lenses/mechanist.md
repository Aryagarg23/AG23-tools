# The Mechanist

> **Stance:** The score is a shadow — ask what cast it.

**Use when** you're describing outputs and metrics instead of the internal
process that produced them; when you're in an exploration phase, not an
optimization one.

## Core questions

- What did the system actually **do** to the input? Read the artifact it
  emitted (the export, the enhanced field, the trace) — not the metric it
  reported.
- Is this number a property of **my input**, or of the **system's own
  behavior**? (A converged "after" score may just be the quality of the
  system's own regeneration, independent of what I sent.)
- Where does the behavior **change regime**? (The competence horizon: where
  it flips from verifying to pattern-matching, semantic to stylistic.)
- What does it treat as **signal vs noise**, and is that definition stable
  across inputs?
- What single mechanism explains **all** observations at once — the
  convergence, the outliers, and the leaks?

## Method

1. **Separate report from artifact.** Always find and read the thing the
   system produced, not just its summary metric.
2. **Attribute variance.** For every varying number, hold one side fixed and
   see whose behavior actually moves it — yours or the system's.
3. **Hunt the regime boundary.** Build inputs that straddle a suspected
   horizon (trivial vs subtle, in- vs out-of-distribution).
4. **Predict the artifact's content**, per case — then falsify against it.
5. **One mechanism to rule them all.** Prefer the single generative model
   that reproduces every observation over a pile of local explanations.

## Disciplines

- A better score is not a finding; a mechanism is. Don't optimize mid-exploration.
- Don't trust self-reports — a reflector narrates whatever the state machine
  feeds it.
- Verify labels by execution, not by any generator's claim.
- Macro signal before niche noise.

## Hypothesis form

A falsifiable statement about **what an artifact you can read will contain**.
Not "score will rise" — "the enhanced_completion for family X will still
contain the bug, while family Y's will be corrected."

## Signature move

Read the artifact, ignore the grade.

## Worked example — Adaption

The score table said "the pipeline improves your data." Reading the exports
said otherwise: input `"The answer is **90**."` came back as a full
worked-reasoning trace — the pipeline **regenerates the completion from the
prompt and largely ignores the completion you gave**. So `score_after` is the
quality of *its* regeneration, not of your data; the ceiling is its output,
not your improvement. Then the mechanism: **a competence horizon** — where
correctness is trivially checkable from the prompt (13+13) it recomputes and
fixes (all 50 wrong answers in accuracy-50 were corrected); where correctness
needs edge reasoning it falls back to the modal/idiomatic form and preserves
confident errors. One mechanism reproduces convergence, the accuracy outlier,
and the judge-leak's fluent-but-unverified answer.

## Pairs well with

[[cartographer]] to map the horizon · [[falsifier]] to kill the mechanism ·
[[statistician]] to confirm the boundary is real.
