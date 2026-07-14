# Root Cause Analysis and Failure Feedback in LDD

A major challenge in autonomous agentic loops is **repetitive failure cycles**. When an agent encounters an edge case that causes a test suite to fail, it may try the same approach (or a minor variation of it) multiple times, burning through API tokens and time.

To resolve this, modern LDD systems are beginning to incorporate **RCA (Root Cause Analysis) Feedback loops**.

## 1. The RCA Feedback Architecture
An RCA feedback system modifies the standard agent loop by persisting verified outcomes of previous attempts:
1. **Detection**: The agent fails to pass the verification suite.
2. **Analysis**: The agent (or a separate auditor) analyzes the failure logs, performs root cause analysis, and documents the *lesson learned* (e.g., "The cache key lacks tenant segregation, causing cross-tenant pollution").
3. **Storage**: The lesson is saved locally in the repository (e.g., using `.agent-trace/outcomes/` or Git Notes).
4. **Context Injection**: On subsequent runs, before the agent starts editing that component, the framework queries the store for past failure records matching the modified file paths and injects them as active context.

```
                  ┌──────────────────────┐
                  │   Developer / Agent  │
                  └──────────┬───────────┘
                             │ edits src/auth/
                             ▼
                  ┌──────────────────────┐
                  │    queryLessons()    │
                  └──────────┬───────────┘
                             │ matches path glob
                             ▼
          ┌──────────────────────────────────────┐
          │ Loaded Lessons:                      │
          │ "Do not use MD5 for token hashes     │
          │  because collision tests fail."     │
          └──────────────────┬───────────────────┘
                             │ injected into prompt
                             ▼
                  ┌──────────────────────┐
                  │   Agent Avoids MD5   │
                  └──────────────────────┘
```

## 2. Hypothesis: Does RCA Feedback Help?
This framework is built to test the following hypothesis:
* **Null Hypothesis ($H_0$)**: Providing past failure reasons and lessons learned does not significantly improve the agent's completion rate or efficiency.
* **Alternative Hypothesis ($H_1$)**: Providing past failure reasons and lessons learned significantly reduces the number of loop iterations required to solve a task and prevents repeating known failure modes.

We will use the `agent-trace-outcomes` library to test this. The library's `recordOutcome` function allows us to log verification checks and lessons, and `queryLessons` retrieves them at context-assembly time based on file path globs.
