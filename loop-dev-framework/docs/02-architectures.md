# Architectures of Loop-Driven Development Environments

Different loop-driven environments employ varying levels of agent autonomy, sandboxing, and interaction hooks. Below is a deep dive into the architectures of the most prominent systems.

## 1. Aider (Interactive Loop)
Aider is designed as a CLI-based coding assistant that integrates tightly with Git.
* **Orchestration**: Human-in-the-loop. The agent suggests code edits (using unified diffs or whole-file writes), and the human reviews or runs tests.
* **Test Loop**: Aider has a `--test` command argument. If provided, Aider runs the specified test command after its edit. If the command fails, Aider automatically reads the test output, prompts itself with the error, and tries to fix the code until the tests pass.
* **State Management**: Git history is the state repository. If the agent makes a mistake, it can rollback using standard Git commands.

## 2. SWE-agent (Agent-Computer Interface)
SWE-agent turns LLMs into software engineering agents that resolve issues in real GitHub repositories (specifically SWE-bench).
* **Orchestration**: Fully autonomous command-line agent.
* **Agent-Computer Interface (ACI)**: SWE-agent defines a specialized shell environment with custom commands designed for LLMs (e.g., search, view file, edit line, run tests). This prevents the LLM from getting lost in verbose standard terminal outputs.
* **Execution Loop**:
  ```
  [LLM receives ACI state] -> [LLM outputs custom command] -> [ACI parses & executes] -> [ACI returns condensed output] -> [LLM iterates]
  ```

## 3. Devin (Cognition)
Devin represents a highly complex, multi-agent loop system.
* **Orchestration**: Orchestrator-driven multi-agent team. An orchestrator coordinates subagents (e.g., researcher, planner, coder, debugger).
* **Sandboxed Environment**: Runs inside a secure, stateful container (Docker) with full terminal access, browser access, and package installation capabilities.
* **Double Loop**:
  * *Outer Loop*: High-level planning. Monitors overall progress against user goals.
  * *Inner Loop*: Action execution. Spawns code/test cycles, inspects browser DOM, debugs syntax issues.
