<!--
  EXP template. Refined against the template error-points we hit in old loops:
  - Required fields are MACHINE-CHECKED; an unfilled <...> placeholder blocks
    state advance (register.py refuses to progress). Placeholders never survive.
  - Controlled vocabularies (enums) for everything the synthesist aggregates —
    lens, status, verdict. Free text nowhere that gets rolled up.
  - Single source of truth: this front-matter is THE data. The ledger and the
    (later) graph are PROJECTIONS of these fields — never restate a value elsewhere.
  - Fill-forward only: the Prediction block is frozen at registration. Results go
    in the RESULT section below the line. You never edit above the line.
  ENUMS:
    lens   : mechanist | reductionist | statistician | falsifier | cartographer
             | ethnographer | adversary | economist | inversionist
    status : registered | running | observed | reproduced | concluded
    verdict: confirmed | refuted | inconclusive
-->
---
id: EXP-000                      # required · unique · monotonic
date_registered: YYYY-MM-DD      # required · the day the PREDICTION was frozen (before the run)
lens: mechanist                  # required · enum (see header)
status: registered               # required · enum · advanced by tools, not by hand
verdict:                         # empty until concluded · enum
tags: []                         # required · controlled vocab for synthesist rollup (e.g. [ceiling, competence-horizon])
builds_on: []                    # ids of LOCKED, non-inconclusive prior conclusions (additive-DAG edges)
effect_vs_noise:                 # fill after reproduce · e.g. "+80% vs ±10% floor → real"
cost_estimate: "~1 credit / ~11 min"   # required · from the FREE estimate gate, before spending
reconstruct:                     # required · how to rebuild after shedding (guide light #4)
  generator: <path/to/build.py>  #   committed
  seed: <int>                    #   committed
  params: <dict or pointer>      #   committed
  receipt: <path/to/receipt.json>#   committed (lets you re-fetch/re-run paid results)
  sheddable: [<generated dataset>, <exports/>, <replicates/>]   # gitignored, regenerable
---

# EXP-000 — <one-line title>

## Question
<The gap in the MECHANISM model. Not "what score?" — "how does it decide X?">

## Hypothesis (mechanism)
<A claim about internal operation. State the *because*, not just the *what*.>

## Prediction — FROZEN AT REGISTRATION (do not edit after the run)
<Falsifiable, about an ARTIFACT you can read (an export field, a trace, a
reproduced number vs a noise floor). Specific enough that a stranger scores it
confirmed/refuted without your help.>

- **Confirmed only if:** <observation>
- **REFUTED if:** <the killer observation — named now, before you know the answer>

## Probe design (Reductionist)
- **Control:** <the exact known-behavior input>
- **Variable:** <the single thing changed>
- **Held constant:** <recipe, row count, phrasing — enumerate; unlisted = confound>
- **Data generation:** <local vLLM only; labels verified by EXECUTION, not by claim>
- **Verify-before-paid:** <mock/estimate gate passed? y/n>

## Reproduction plan
- Replicates: <≥3 on unchanged input>

====================  everything below is filled AFTER the run  ====================

## Result
- Raw artifacts: <paths — cold tier; not pasted into anyone's context>
- Observed: <what the artifact actually contained>
- Reproduced: <replicate spread; effect above the noise floor? → mirror into effect_vs_noise>
- **Verdict vs the frozen prediction:** confirmed / refuted / inconclusive → mirror into `verdict`
- Not covered: <the unmarked edges of the map>

## Conclusion  (the node other experiments may `builds_on`)
<One or two sentences, stated as a locked fact. This single sentence is what
the ledger carries and the synthesist reads — write it to stand alone. If
inconclusive, say so plainly: an un-reproduced result must never become a
dependency.>
