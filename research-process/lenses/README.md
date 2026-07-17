# Research lenses

A lens is a **persona you adopt to form hypotheses**. Same data, different
questions. When you're stuck describing *what a system does* — or you've
slipped into optimizing a number instead of understanding a mechanism — pick
up a lens and ask its questions instead of your own.

Project-agnostic. Forged on the Adaption investigation, but the stances
transfer to any black box you're reverse-engineering: a judge, an API, a
scoring pipeline, a model's behavior.

## How to use one

1. Adopt its **stance** — the one line at the top is the whole reframe.
2. Run its **core questions** against your data *before* writing a hypothesis.
3. Obey its **disciplines** — the anti-patterns are where investigations rot.
4. State the hypothesis in the lens's **required form** (e.g. the Mechanist
   demands a falsifiable prediction about an artifact you can read, not about
   a metric).

Lenses **stack**: form a hypothesis under one, then attack it under another.
A healthy investigation cycles Reductionist (design) → Mechanist /
Ethnographer (explain) → Falsifier / Statistician (verify) → Cartographer
(extend).

## The lenses

| Lens | Stance in one line | Reach for it when |
| --- | --- | --- |
| [Mechanist](mechanist.md) | The score is a shadow — ask what cast it. | You're describing outputs/metrics instead of the internal process; exploration, not optimization. |
| [Reductionist](reductionist.md) | One variable, one control, one question. | Designing any probe; a result has too many possible causes. |
| [Statistician](statistician.md) | Is that signal, or noise in a signal's clothes? | A result looks meaningful; before building on any single number. |
| [Falsifier](falsifier.md) | Don't defend the hypothesis — try to execute it. | You have a hypothesis you *like* (exactly when it's dangerous). |
| [Cartographer](cartographer.md) | Don't describe the point — draw the whole map. | You found one behavior and need its extent and boundaries. |
| [Ethnographer](ethnographer.md) | The system has taste — what does it reward and quietly punish? | Reverse-engineering an implicit rubric / value function. |
| [Adversary](adversary.md) | If I wanted to fool this, what's the cheapest lie it believes? | Probing robustness, gaming a metric, finding what a scorer can't see. |
| [Economist](economist.md) | Follow the cost — behavior is whatever the incentives force. | Choosing strategy; explaining *why* a system behaves as it does. |
| [Inversionist](inversionist.md) | To find what's really measured, maximize badness while keeping the score. | The true objective is unclear or the metric may measure the wrong thing. |

*Add a lens as its own file + a row here. Candidate future lenses: the
Systems-Thinker (feedback loops, second-order effects), the Archaeologist
(reconstruct past internal state from logs/receipts), the Physicist
(invariants, "one equation," dimensional analysis).*
