Stuff which bothers me 

---

## 1. WSL 2 vLLM Background Server (`vllm-service/`)

Serves vLLM inside WSL while letting you edit model configs on the Windows side. Exposes the server to the LAN all the time.

### Files
*   `config.json`: Model parameters. Edit this to swap models or context lengths.
*   `env-config.json`: Distro names, paths, and ports.
*   `manage-vllm.ps1`: Windows controller. Run this.
*   `manage-vllm.sh`: Bash controller if you are running inside WSL.
*   `launch.py`: Launcher script that reads the json configs and starts the server inside WSL.
*   `RCA.md`: Why the service was crash-looping and what fixed it.
*   `TESTED.md`: The exact GPU, firmware, and package versions this was verified on, and what was checked.

### Notes
*   Runs on the prebuilt FlashAttention backend, so WSL does not need a CUDA toolkit. The
    installer removes FlashInfer for this reason.
*   fp8 KV cache is off. It needs an SM89+ GPU (RTX 40-series or newer); older cards fall
    back to bf16, which uses more memory. See `RCA.md`.

### How to use it:
Open PowerShell in the `vllm-service` directory:
```powershell
cd C:\Users\arya\source\repos\AG23-tools\vllm-service
```

*   **Setup / Install**:
    ```powershell
    .\manage-vllm.ps1 install
    ```
*   **Run at startup**:
    ```powershell
    .\manage-vllm.ps1 register-autostart
    ```
*   **Start / Stop**:
    ```powershell
    .\manage-vllm.ps1 start
    .\manage-vllm.ps1 stop
    ```
*   **Check logs**:
    ```powershell
    .\manage-vllm.ps1 status
    ```
*   **Check if it is working**:
    ```powershell
    .\manage-vllm.ps1 test
    ```
*   **System Tray GUI** (Low-resource background tray app to check status, edit config, and control service):
    ```powershell
    .\manage-vllm.ps1 tray
    ```

---

## 2. Loop-Driven Development Testing Framework (`loop-dev-framework/`)

A verification and testing harness built to test autonomous AI agent development loops and validate performance gains of injecting historic RCA outcomes as context memory.

### Files
*   `src/`: Engine components (`agent-loop.js`, client wrapper `llm-client.js`, `orchestrator.js`, and `vector-db.js`).
*   `scripts/`: Executables for building the documentation database and running experiments.
*   `tasks/`: Sandbox briefs for testing concurrency rate limiting and leap year exceptions.
*   `docs/`: Detailed LDD research articles, architectures review, and spec gap analysis.

### How to use it:
Open the `loop-dev-framework` directory, install packages, configure API keys in `.env`, and run tests:
```bash
cd loop-dev-framework
npm install
npm run build-db
npm run test-experiment
```

---

## Adding more tools
1. Put the scripts in their own folder.
2. Keep agent guidelines updated in `.agents/AGENTS.md`.
