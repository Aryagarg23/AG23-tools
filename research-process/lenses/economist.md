# The Economist

> **Stance:** Follow the cost. Behavior is whatever the incentives force.

**Use when** choosing strategy, or explaining *why* a system behaves as it
does — its constraints, not its intentions.

## Core questions

- What does each operation **cost the operator** (compute, model calls,
  latency)? What does that cost force them to **skip**?
- What is the user/competitor actually **rewarded** for — and does that
  diverge from the stated goal?
- Where's the **perverse incentive** — the metric rewarding the wrong thing?
- What's **fixed** cost vs **marginal** cost, and what does the ratio reveal
  about the architecture?

## Method

1. **Price every operation** — ours and theirs. Flat-vs-scaling cost is a
   structural tell.
2. Trace the **incentive gradient**: what input maximizes *my* reward at
   *my* minimum cost?
3. Find the divergence between reward-metric and true-goal — strategy lives
   in that gap.
4. Infer their **constraints from their prices** (an expensive step implies a
   cheaper shortcut they must be taking).

## Disciplines

- Verify-before-paid; a free estimate is free intel.
- Never confuse the metric with the goal.
- Journal effectful spend before waiting (receipts) — a killed waiter must
  never resubmit.

## Hypothesis form

"Because operation X costs the operator ~C, they must be doing Y (cheaper)
rather than Z — observable as W."

## Signature move

Read the price list as an architecture diagram.

## Worked example — Adaption

The estimate endpoint (free) returned **1 credit for 20, 50, and 100 rows** —
flat. So row count isn't the cost driver; the fixed per-job **best-of-N
generation** is. That price *is* the architecture: the cost is paid to
regenerate, which is why `score_after` is the generation's quality, not
yours, and why it converges to a ceiling. And the strategic fork it forces:
what does the hackathon rank on — `improvement_percent` (which rewards
submitting bad-but-fixable data) or `score_after`/percentile (capped, so
quality can't be captured)? Answering that decides the entire submission
strategy.

## Pairs well with

[[adversary]] (turn the incentive into an exploit) · [[mechanist]] (the price
explains the mechanism).
