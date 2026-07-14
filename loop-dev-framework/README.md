# Loop-Driven Development Testing Framework (`loop-dev-framework/`)

A verification and testing harness built to test autonomous AI agent development loops and validate the performance gains of injecting historic Root Cause Analysis (RCA) outcomes as context memory.

It integrates natively with the `agent-trace-outcomes` git attribution library to log iteration traces, verify code correctness, and query historical failure logs.

## Features
*   **Git-Committed Agent Loops**: Auto-commits changes at each loop iteration, binding the check outcomes directly to their exact git commit SHAs.
*   **Extensibility & Diff Capture**: Extracts code diff changes (`git diff HEAD~1`) and commits them directly inside the outcome record's `metadata` namespace block.
*   **Zero-Dependency Local Vector DB**: Features a portable, zero-dependency TF-IDF + Cosine Similarity local vector store (`src/vector-db.js`) to index and search markdown docs.
*   **Flexible Model API Support**: Seamlessly supports OpenAI, Google Gemini, local Ollama endpoints, or an offline simulator.

---

## Structure
*   `src/`: Engine components (core `agent-loop.js`, client wrapper `llm-client.js`, `orchestrator.js`, and `vector-db.js`).
*   `scripts/`: Executables for building the documentation database (`build-docs-db.js`) and running the tests (`run-experiment.js`).
*   `tasks/`: Sandbox briefs for testing concurrency rate limiting and leap year edge cases.
*   `docs/`: Detailed LDD research articles, architectures review, and spec gap analysis.

---

## Setup & Run

1. Navigate to the directory:
   ```bash
   cd loop-dev-framework
   npm install
   ```

2. Configure model credentials by creating a `.env` file:
   ```env
   # Google Gemini API
   GEMINI_API_KEY=your_gemini_api_key

   # OR OpenAI API
   # OPENAI_API_KEY=your_openai_api_key

   # OR Local Ollama API (e.g. Qwen, Llama)
   # OLLAMA_MODEL=qwen2.5-coder
   ```
   *If no keys are defined, the system automatically falls back to offline simulation mode.*

3. Run the experiment suite:
   ```bash
   # Rebuild the local documentation database index
   npm run build-db

   # Run the Baseline vs. RCA comparison experiment
   npm run test-experiment
   ```
