# The method

The loop that keeps an investigation honest. Its whole purpose is to make it
impossible to fool yourself: you commit to a prediction while you still don't
know the answer, then let reality vote.

## The loop, in full

### 1. QUESTION
What don't we understand about the system? Phrase it as a gap in the *model
of the mechanism*, not as "what score will we get."

### 2. LENS
Pick a persona from [`../lenses`](../lenses/README.md). The lens supplies the
questions and the *required form* of the hypothesis. Design probes under the
Reductionist; explain results under the Mechanist/Ethnographer; verify under
the Falsifier/Statistician; extend under the Cartographer.

### 3. HYPOTHESIS
A claim about the **mechanism**. Not "X will score higher" — "X will score
higher *because the judge cannot execute code and pattern-matches idiom*."

### 4. PREDICTION  ← the pre-registration gate
A **falsifiable** prediction, about an **artifact you can read**, written to a
hypothesis file **before the run**. Name the observation that would refute it.
This is the receipts discipline for epistemics: once effectful spend or a
surprising result is in flight, the prediction is already frozen, so it can't
be quietly bent to fit. Template: [`hypothesis-template.md`](hypothesis-template.md).

### 5. PROBE
Design under the Reductionist: one variable, one matched control, everything
else held identical. Generate any synthetic data with **local vLLM only**.
Gate through the mock/estimate path (**verify before paid**).

### 6. RUN
Journal the effectful call (write the receipt) **before** waiting on it. A
killed waiter resumes; it never resubmits. Read-only observation is free and
is not a retry.

### 7. REPRODUCE
Run the unchanged input **≥3×** to establish the noise floor — the system may
be nondeterministic. An effect smaller than the replicate spread is **not a
finding**. (Adaption: identical data gave +0% and +10% across runs.)

### 8. CONCLUDE
Score the result against the **pre-registered** prediction: confirmed /
refuted / inconclusive. Record what you did *not* cover. A refuted prediction
is a success — it's the loop working.

### 9. ADDITIVE NEXT
The next experiment builds on this **locked, reproduced** conclusion — never
on an un-reproduced one. This is the additive DAG: results are nodes, and an
edge from A→B asserts "B assumes A's conclusion." You may not build on sand.

## Why pre-registration is the load-bearing wall

Every failure mode this repo exists to prevent is a failure to commit before
knowing:

- The auto-reflector that "confirmed determinism" by comparing a control to
  itself — no prediction was frozen, so it rationalized the artifact it was
  handed.
- Reading a trend off a single noisy run — no noise floor was established
  first.
- Optimizing a score before understanding the mechanism — no mechanistic
  hypothesis was committed to, so any number looked like progress.

Freeze the prediction first. Then the experiment can only teach you.
