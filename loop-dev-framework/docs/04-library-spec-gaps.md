# Specification Analysis & Identified Gaps in agent-trace-outcomes

This document reviews the `agent-trace-outcomes` specification (`SPEC.md`) and identifies gaps, limitations, and future feature proposals discovered during the implementation of our loop-driven development testing framework.

---

## 1. Identified Gaps & Shortcomings

### Gap A: Lacks Verdict-Based Filtering in Query API
*   **Current State**: The `queryLessons({ paths, tags })` and `queryLog({ path })` APIs only filter by file path and lesson tags.
*   **The Issue**: AI agents running in development loops specifically need to separate **successful outcomes** (to replicate patterns that worked) from **failed outcomes** (to avoid repeating errors). Loading the entire history and manually filtering is inefficient and wastes agent tokens.
*   **Proposal**: Add `verdict` and `status` filters to the query API:
    ```ts
    queryLessons({ paths: ["src/"], verdict: "failed" })
    ```

### Gap B: No Standardized Git Diff / Code Hunk Storage
*   **Current State**: The specification includes `vcs: { type: "git", revision: "sha" }` but has no field for capturing the exact code diff that was tested.
*   **The Issue**: A commit SHA alone is not sufficient if the agent is inspecting historic checks on a branch without checking out the code. In multi-agent systems, seeing the exact diff alongside the failure reason allows the agent to analyze *why* it failed without performing git operations.
*   **Proposal**: Introduce an optional `diff` or `hunks` array in the standard schema:
    ```json
    "vcs": {
      "type": "git",
      "revision": "c9d8e7f...",
      "diff": "--- a/lib/rate-limiter.js\n++ b/lib/rate-limiter.js..."
    }
    ```
    *Note: Currently, we must use the custom `metadata` namespace extension as a workaround.*

### Gap C: The "Uncommitted / Dirty Workspace" Friction
*   **Current State**: The library requires `vcs.revision` to be a valid commit SHA, defaulting to `HEAD`.
*   **The Issue**: In loop-driven development, agents run tests on uncommitted (dirty) code to check if an approach works. Recording this check's outcome against `HEAD` is misleading because `HEAD` represents the *previous* commit. This forces frameworks to make temporary/dummy git commits for every test run, bloating the git log.
*   **Proposal**: Add native support for a `"dirty"` revision status or an optional `workspace_state: "dirty"` flag, allowing checks to be recorded against the current uncommitted state.

---

## 2. Framework Workarounds (The Tech Demo)

To showcase the extensibility of `agent-trace-outcomes` and overcome these gaps, our advanced loop framework implements:
1.  **Aider-Style Git commits**: The loop engine automatically runs `git commit` at every iteration before running tests. This assigns each test outcome to a unique, real commit SHA.
2.  **Metadata Diff Capturing**: We capture `git diff HEAD~1` post-commit and write it into the outcome using the vendor metadata extension block:
    ```json
    "metadata": {
      "org.loop-dev.demo": {
        "diff": "...",
        "iteration": 2
      }
    }
    ```
3.  **Local Indexing**: We run our `SimpleVectorDB` on top of these JSON outcomes and docs for semantic retrieval, bypassing the library's path-only glob matching.
