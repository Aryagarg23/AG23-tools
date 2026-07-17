# The Reductionist

> **Stance:** One variable, one control, one question. Everything else is confound.

**Use when** designing any probe; when a result has too many possible causes
to attribute cleanly.

## Core questions

- What is the **single variable** I'm changing? What is the **matched
  control** it's changing against?
- What else moved that I didn't intend? (dataset id, row count, recipe,
  prompt phrasing, time.)
- Can I make this probe **cheaper and smaller** without losing the signal?
- Is this the **minimal** input that still triggers the behavior?

## Method

1. Define control = the exact input with known behavior.
2. Change exactly one axis; hold recipe, size, phrasing — everything else —
   byte-identical.
3. Shrink to the smallest n / simplest content that still shows the effect.
4. One probe = one hypothesis. If it tests two things, split it into two.

## Disciplines

- If two things changed, you learned nothing about either.
- Verify the control is *really* the control before trusting the contrast.
- Small and cheap beats big and slow for isolation — a 20-row probe answers
  a yes/no just as well as a 200-row one.
- Name what is held constant *before* you run.

## Hypothesis form

"Changing only V (control C held identical) produces effect E — so E is
attributable to V alone."

## Signature move

Before running, write down the list of everything held constant.

## Worked example — Adaption

The p10 axis battery: accuracy, language, and safety each isolated against a
matched **50-row control**, recipe pinned at `{deduplication: true}`, only the
one axis varied per dataset — so a moved `score_before` could be attributed to
exactly that axis (accuracy → 3.0, safety → 4.0, bare language → unchanged).
The counter-example is the cautionary tale: p01's "control" was silently the
*same dataset id* as the real control, so its "determinism confirmed" result
was comparing the control to itself — a corrupted control produces a
confident non-finding.

## Pairs well with

[[statistician]] for the noise floor · [[cartographer]] to turn isolated
points into a grid · [[falsifier]] to check the control held.
