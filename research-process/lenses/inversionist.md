# The Inversionist

> **Stance:** To find what's really measured, maximize badness while keeping the score.

**Use when** the true objective is unclear, or you suspect the metric
measures something other than what it claims.

## Core questions

- What's the **worst** input that still scores well? Its shared features
  **are** the real metric.
- If I **invert** the stated goal, does the score follow the goal or the
  surface?
- What would a lazy or malicious optimizer do here, and what does that reveal
  about the target?

## Method

1. Construct the deliberately-bad-but-**plausible** input (the doc-trap, the
   floor).
2. If it scores well, the metric isn't measuring what it claims.
3. **Triangulate**: bad-but-compliant vs good-but-non-compliant isolates
   which axis the score truly tracks.

## Disciplines

- Inversion is a **diagnostic**, not a strategy — until you've confirmed the
  metric, don't ship the inverted input.
- Keep the bad input **plausible**. Obvious garbage tests nothing; the point
  is a defensible-looking wrong.

## Hypothesis form

"Maximally-bad-on-dimension-X input still scores S — therefore the metric does
not measure X; it measures Y, the feature the bad input retained."

## Signature move

Build the best-scoring worst input you can.

## Worked example — Adaption

p12's pure populations are inversion in action: **B** (rule-compliant but
incorrect) vs **C** (correct but non-compliant). Whichever pure set scores
higher reveals whether the judge tracks idiom or correctness — the score
follows the feature the "bad" set kept. p11 sharpens it further: it embeds a
*correct* docstring example that the code deliberately contradicts, forcing
the system to reveal which of the two it honors when they can't both be true.

## Pairs well with

[[adversary]] · [[ethnographer]] (confirm the sign of a reward) ·
[[reductionist]] (each inverted probe still isolates one axis).
