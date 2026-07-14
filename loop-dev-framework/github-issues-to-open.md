# GitHub Issues to Open - agent-trace-outcomes

Below are the templates for the issues to open on the repository: https://github.com/Aryagarg23/agent-trace-outcomes/issues

---

## Issue 1: API: Add verdict and status filtering to queryLessons and queryLog

**Title**: `API: Add verdict and status filtering to queryLessons and queryLog`

**Body**:
```markdown
Currently, the `queryLessons` and `queryLog` APIs only filter by file path and tags. When building loop-driven agent environments, agents specifically need to query "failed" outcomes to retrieve failure lessons/RCA logs, or "verified" outcomes to retrieve successful implementation patterns. Loading the entire log and filtering in-memory is inefficient and wastes agent tokens.

We propose adding an optional `verdict` or `status` parameter to the query APIs:
```ts
await queryLessons({ paths: ["src/"], verdict: "failed" });
```
```

---

## Issue 2: Support checking uncommitted / dirty worktrees without dummy commits

**Title**: `Support checking uncommitted / dirty worktrees without dummy commits`

**Body**:
```markdown
The specification requires a full commit SHA in `vcs.revision`, defaulting to `HEAD`. During loop-driven execution, coding agents run tests on dirty, uncommitted code. Recording these check outcomes against `HEAD` is misleading since `HEAD` represents the previous commit. This forces agent loops to create temporary/dummy commits for every check pass.

We propose adding support for a "dirty" revision status or an optional `workspace_state: "dirty"` flag to the VCS schema.
```

---

## Issue 3: Standardize code diff / hunk association in VCS schema

**Title**: `Standardize code diff / hunk association in VCS schema`

**Body**:
```markdown
There is no standard field to record the code diff or hunks that were tested in the outcome record itself. While the library allows this via vendor metadata, tracking the exact diff of a test run is a first-class requirement for diagnostics and post-mortem analysis.

We propose adding an optional `diff` or `hunks` array within the standard `vcs` schema definition.
```
