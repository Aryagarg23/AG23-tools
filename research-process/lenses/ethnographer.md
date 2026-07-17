# The Ethnographer

> **Stance:** The system has taste. What does it reward, and what does it quietly punish?

**Use when** reverse-engineering an implicit rubric, value function, or
preference — especially when the system *states* its values and you want to
know its *real* ones.

## Core questions

- What features does it consistently **reward** — even when they're
  irrelevant to the stated task?
- What does it **punish** that it "shouldn't"?
- What modal output does it pull everything **toward**? (A fuse/consensus step
  converges on the culture's notion of "normal.")
- Are its **stated** values (the named rubric axes) its **real** values (what
  actually moves the score)?

## Method

1. Hold the task fixed; vary one stylistic/values dimension at a time; watch
   the reward move.
2. Separate the **stated rubric** from the **revealed rubric** — the leaked
   axes vs the axes that actually bite.
3. Find the modal attractor: what does canonicalization converge to?
4. Catalog the **surprises** — rewards and punishments that contradict the
   stated rubric. Those are the real culture.

## Disciplines

- Infer values from behavior, never from the system's self-description.
- A preference that only shows on edge cases is still a preference.

## Hypothesis form

"The revealed value function rewards F and punishes G, diverging from the
stated rubric R in way D."

## Signature move

Find the thing it punishes that you expected it to reward.

## Worked example — Adaption

The judge-leak named three axes: content accuracy, language quality,
responsibility & safety. The Ethnographer checks which are *real*: accuracy
bites hard (wrong answers → `score_before` 3.0); bare, ungrammatical language
**doesn't move it** (→ 5.0); and safety bites **backward** — a gratuitous
"for educational purposes only" disclaimer *lowered* the score (→ 4.0). The
revealed rubric is not the stated one: it penalizes hedging it claims to
value, and shrugs at the language quality it claims to grade.

## Pairs well with

[[mechanist]] (why the values are what they are) · [[adversary]] (forge the
rewarded feature) · [[inversionist]] (maximize a punished feature to confirm
the sign).
