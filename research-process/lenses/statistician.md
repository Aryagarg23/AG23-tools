# The Statistician

> **Stance:** Is that a signal, or noise wearing a signal's clothes?

**Use when** a result looks meaningful; always before you build anything on a
single number.

## Core questions

- Is this **reproducible**? What's the run-to-run variance on an *unchanged*
  input?
- What's the **effect size** relative to that noise floor?
- Do I have a **control** that isolates the one variable I changed?
- How many observations back this — 1 or 20? Am I reading a trend off noise?

## Method

1. **Establish the noise floor first.** Run the same input ≥3×. The system
   may be nondeterministic — assume nothing.
2. Only trust effects that **exceed** the noise floor.
3. One variable vs a matched control; everything else held.
4. Report n, spread, and what was **not** replicated. No silent
   single-sample claims.

## Disciplines

- A difference smaller than the replicate spread is not a finding.
- Nondeterminism is data, not an annoyance — measure it, don't average it away.
- Beware the **dead field**: a number that's constant across everything may
  not be a law — it may just be a field that doesn't discriminate your inputs.

## Hypothesis form

"Effect E (size s) exceeds the noise floor (σ over n runs), attributable to
variable V because control C held."

## Signature move

Run it three times before you believe it once.

## Worked example — Adaption

p05 submitted the *same* generated dataset twice and got +0.0% vs +10.0% — so
the pipeline is **nondeterministic**, and any single-run "effect" under ~10%
is inside the noise. Separately, `percentile_after` read 6.9–7.5 across every
run ever made: not necessarily a stable law, but a prime **dead-field**
suspect — it may simply not discriminate tiny synthetic sets, which means
nothing so far tells us whether percentile is useful on real data.

## Pairs well with

[[falsifier]] · [[reductionist]] · [[cartographer]].
