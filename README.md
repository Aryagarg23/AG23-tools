Stuff which bothers me 

---

## 1. WSL 2 vLLM Background Server (`vllm-service/`)

Runs vLLM in WSL with simple service controls.
See details: [`vllm-service/README.md`](./vllm-service/README.md)

---

## Adding more tools
1. Put the scripts in their own folder.
2. Keep agent guidelines updated in `.agents/AGENTS.md`.

## Removed

- `loop-dev-framework/` (removed 2026-07-21) — a loop-driven-development testing prototype
  started 2026-07-14 and abandoned the same day when development forked into
  `loop_test_journal/loop-dev-framework`, which has continued to evolve (deep-eval,
  entropy-race, issue-scout benches) and is the live copy. This one was a stale duplicate.
