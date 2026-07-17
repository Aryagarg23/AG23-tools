# The Cartographer

> **Stance:** Don't describe the point — draw the whole map. Where does the behavior change?

**Use when** you've found *one* behavior and need to know its extent and its
boundaries.

## Core questions

- Over what input range does this behavior hold? Where does it **flip**?
- What are the **regimes** (phases), and what's the boundary condition
  between them?
- Which axes actually move the behavior, and which don't?
- What's **off the edge** of the map I've drawn — an untested modality, an
  unseen input class?

## Method

1. Take a known behavior; sweep one axis until it breaks.
2. **Bracket the boundary**: find the closest pair of inputs that land on
   opposite sides (holds / doesn't).
3. Sweep the next axis; build the grid.
4. Name the regimes and the transition rule.

## Disciplines

- Log what you did **not** cover. A map with unmarked edges lies — silent
  truncation reads as "covered everything."
- The boundary is the finding, not the interior.
- Cheap coverage first (free/estimate calls, local generation) before paid
  depth.

## Hypothesis form

"Behavior B holds for inputs in region R and flips to B′ across the boundary
∂R, defined by condition K."

## Signature move

Find the two nearest inputs that land on opposite sides of the line.

## Worked example — Adaption

The Mechanist proposed a **competence horizon** (semantic denoising on
checkable tasks, stylistic on edge-case ones). The Cartographer turns that one
idea into a survey: the 9 rules of p11/p12 are a first grid, with a concrete
prediction of which side each lands on — `round_money` (banker's-rounding, too
subtle to verify) on the stylistic side where the bug survives; `inclusive_range`
(recomputable from the prompt) on the semantic side where it gets fixed. The
boundary between them, once bracketed, *is* the map of where the product's
value silently fails.

## Pairs well with

[[mechanist]] (what mechanism the boundary implies) · [[statistician]] (is the
boundary real or noise) · [[reductionist]] (each grid cell is one clean probe).
