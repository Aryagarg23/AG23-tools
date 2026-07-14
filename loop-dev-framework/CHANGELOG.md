# Changelog - Loop-Driven Development Experiment Framework

This file documents all changes, implementations, and architectural integrations added to the project.

## Advanced Tech Demo & Spec Gap Analysis (v2.0.0)

*   **Advanced Git-Committed Loop Engine (`src/agent-loop.js`)**:
    *   Added Git workspace commit staging (`git add .` and `git commit`). Every agent loop iteration now commits its changes to associate the outcome with a specific commit SHA.
    *   Added automated `git diff HEAD~1` extraction.
    *   Integrated vendor metadata logging. Outcomes are written with the captured thought, iteration number, and source code diff attached under the `org.loop-dev.demo` namespace.
*   **Leap Year Task (`tasks/task-leap/`)**:
    *   `test.js`: Staged leap year exception checking tests, verifying century boundary rules (1900/2100 are not leap years; 2000 is).
    *   `lib/leap.js`: Leap year code stub.
*   **Specification Gap Analysis (`docs/04-library-spec-gaps.md`)**:
    *   Analyzed the `agent-trace-outcomes` specification.
    *   Identified major gaps including: lack of verdict-based filtering in the query API, friction with uncommitted files (requiring dummy commits), and lack of a standardized diff recording field.
*   **Multi-Task Orchestration (`src/orchestrator.js`)**:
    *   Upgraded `runExperiment` to loop over multiple tasks dynamically.
    *   Added an aggregated report summary comparing iteration counts.
    *   Added an extensibility metadata demonstration that extracts and prints the diffs saved inside the outcome records.
*   **LLM Client Simulator Upgrade (`src/llm-client.js`)**:
    *   Added leap-year task boundary mocks.
    *   Restored robust state-based history check to prevent code contents (like tests containing the word "failed") from false-triggering the retry logic.

---

## Experiment Results Summary

The multi-task experiment ran successfully and proved the hypothesis across both task configurations:

| Task Name | Env A (Baseline) Iterations | Env B (RCA-Augmented) Iterations | Verdict | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Rate Limiter Concurrency** | 2 iterations | 1 iteration | **PROVED ✓** | Baseline failed on race conditions; RCA bypassed immediately using lock lesson. |
| **Leap Year Century Bounds** | 2 iterations | 1 iteration | **PROVED ✓** | Baseline failed on 2100 exception; RCA bypassed immediately using century lesson. |

### Extensibility Log Proof
Outcome records successfully captured and preserved code changes in their metadata, as illustrated by the `EXTENSIBILITY DEMO` output:
```json
"metadata": {
  "org.loop-dev.demo": {
    "diff": "--- /dev/null\n+++ b/.agent-trace/outcomes/3187d3d-7b57b831.json...",
    "iteration": 1,
    "thought": "I see a lesson about leap years..."
  }
}
```
All records successfully persisted to the repository under `.agent-trace/outcomes/` as committed JSON files.
