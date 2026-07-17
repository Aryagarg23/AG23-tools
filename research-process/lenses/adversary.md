# The Adversary

> **Stance:** If I wanted to fool this, what's the cheapest lie it would believe?

**Use when** probing robustness, gaming a metric, or finding what a scorer
structurally cannot see. (For authorized characterization and defensive
disclosure — not exploitation. The output is a report, not a weapon.)

## Core questions

- What can this system **not observe**? (No execution? No ground truth? No
  memory across calls? No access to the referenced image/chart?) Exploit the
  blind spot, not the strength.
- What's the **minimal** input that maximizes the score while minimizing real
  quality?
- Where does it **trust the input's claim** instead of verifying it?
- What surface feature is it pattern-matching, and can I **forge** that
  feature cheaply?

## Method

1. Enumerate the blind spots — everything it structurally cannot check.
2. Craft the cheapest forgery of the feature it rewards.
3. Measure the gap between **scored-quality** and **real-quality**. That gap
   is the vulnerability.
4. Escalate: one forgery → a systematic recipe → the exploit class → the fix.

## Disciplines

- Cheapest-first: an exploit that costs more than honest work isn't an exploit.
- Never conflate "fooled the scorer" with "actually good."
- Stay in authorized scope; characterize the hole, then hand it to the
  defender. Stop at confirmation, don't build a harvester.

## Hypothesis form

"Input X — cheap to produce, low real-quality — will score ≥ the honest
baseline, because the system cannot observe Y."

## Signature move

Attack the blind spot, not the strength.

## Worked example — Adaption

The judge doesn't execute code, so idiomatic-but-wrong (the doc-trap) can
score like correct code — surface compliance forges the "accuracy" feature.
The judge-leak's fertility answer shows the fuse picking the fluent consensus
over a fact it never verified against the chart. And the perverse incentive:
if the contest ranks on `improvement_percent`, the cheapest high-scoring
submission is deliberately **bad-but-repairable** data — you're rewarded for
starting low, not for being good.

## Pairs well with

[[economist]] (is the exploit worth its cost) · [[mechanist]] (why the blind
spot exists) · [[inversionist]].
