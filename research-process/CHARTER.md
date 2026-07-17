# Charter — research-process

The ethos of this repo. If a tool, template, or habit ever contradicts a
line here, **the charter wins** and the tool is wrong. Keep it short — a
charter you have to scroll isn't guiding.

> A **charter** conveys the ethos of a repo or directory. The ethos of an
> **LLM** operating inside it lives in a **contract** —
> see [`contracts/`](contracts/README.md). This file is the repo's ethos;
> the contract is the agent's.

---

## 1. Mechanism before metric
Reverse-engineer *how it works* before optimizing *what it scores*. A better
number is not a finding — a mechanism is. Exploration first; optimization is a
later phase.
*Prevents:* score-chasing that never explains anything.

## 2. Freeze the prediction before the run
Pre-registration is the receipts discipline applied to epistemics: the
falsifiable prediction — about an **artifact you can read** — is written to
disk *before* the effectful call. Name the observation that would refute it,
up front.
*Prevents:* the auto-reflector that "confirmed determinism" by narrating
whatever the state machine fed it (it had compared a control to itself).

## 3. Reproduce before you believe; reproduce before you build
≥3× on unchanged input establishes the noise floor. An effect smaller than
the replicate spread is not real. Additive science builds only on **locked,
reproduced** conclusions — never on an inconclusive one.
*Prevents:* reading a trend off one noisy run; towers built on sand.

## 4. Hoard the recipe, not the output
Reproducibility over retention. Commit the tiny recipe — generator + seed +
params + receipt — and the conclusion. Shed the bulk (gitignored,
deterministically regenerable). Getting back to a nuked spot is a *command*,
not an archive dig. **Nothing research-specific goes into personal memory.**
*Prevents:* clutter, brain pollution, and the fear that shedding loses work.

## 5. The researcher lives in the ledger
Context tiering — **hot** (the one artifact this question needs, then dropped)
· **warm** (the ledger + latest synthesist digest, always loaded, tiny) ·
**cold** (all raw, addressable, never auto-loaded). Reading cold is
**delegated to a worker that returns a conclusion, never bytes.**
*Prevents:* context bog once there are hundreds of results.

## 6. Interpretation is a role, not a re-read
The synthesist (idle-cron, local worker, reads only conclusions) holds the
whole investigation compressed: the unifying mechanism, the contradictions,
the fragile load-bearing nodes, the next best experiment. It proposes; it
never concludes.
*Prevents:* drowning in results; missing a contradiction buried 300 rows back.

## 7. Templates are single-source-of-truth, validated, fill-forward
Every value lives in exactly one place (an experiment's front-matter); ledger
and graph are **projections**, never restatements. Anything aggregated is a
**controlled vocabulary** (enum), not free text. Required fields are
**machine-checked** — an unfilled placeholder is a hard error that blocks
state advance. The frozen prediction block is **append-only**.
*Prevents:* the template error-points of old loops — placeholder survival,
value drift across files, un-aggregatable free text.

## 8. Form hypotheses through a lens
Adopt a persona's questions, not your own. Design under the Reductionist,
explain under the Mechanist/Ethnographer, verify under the
Falsifier/Statistician, extend under the Cartographer.
See [`lenses/`](lenses/README.md).

## 9. Offload first (the agent's default)
The consultant's default move is to **delegate execution to the local
worker**; it locks in and does the work itself only after the worker
repeatedly fails. Sonnet-time is judgment, not typing. The full ethos —
and the create-mode drift it guards against — is the
[science-consultant contract](contracts/science-consultant.md).

## 10. Structure now, graph later
Invest in ledger richness — relations (`builds_on` / `contradicts` /
`refines`), tags, lens, verdict, effect-vs-noise as first-class fields — *now*,
so the graph is later just a projection, not a rebuild. Deferring the graph
is only game-changing if the ledger earns it.
