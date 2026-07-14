# AG23-tools: Shit which bothers us, and scripts to fix the annoyance

This repository is a collection of annoying setup issues, environment quirks, and OS bugs we've encountered during development, along with the custom scripts we built to solve them.

---

## 1. WSL 2 vLLM Background Serving (Directory: `vllm-service/`)

### The Annoyances:
*   **The NTFS Sluggishness**: Running vLLM, its virtual environment, or model cache from Windows mounts (`/mnt/c/...`) inside WSL is incredibly slow due to the 9p translation layer, but running vLLM natively in WSL makes it hard to manage and edit configurations from Windows.
*   **The Port Sharing Headaches**: WSL NAT mode makes exposing ports to the LAN from Windows a nightmare of dynamic IP updates and port forwarding.
*   **Systemd Servicing**: Keeping a model serving in the background all the time, starting it headlessly on boot, and managing it without keeping terminal sessions open.
*   **PowerShell Array Gotcha**: Using standard `Get-Content` in PowerShell filters arrays on regex checks, causing `.wslconfig` lines to duplicate infinitely.

### The Fix:
A split-config launcher that keeps all execution files, cache, and virtual environments natively inside the WSL ext4 partition (`/home/arya/vllm-service/`) for maximum speed, but allows you to edit settings and control systemd service states directly from Windows using a single PowerShell CLI wrapper.

#### Quick Start:
Navigate to the tool directory:
```powershell
cd C:\Users\arya\source\repos\AG23-tools\vllm-service
```
*   **Install** (Sets up native WSL environment, configures mirrored networking, creates firewall exceptions):
    ```powershell
    .\manage-vllm.ps1 install
    ```
*   **Register Boot Task** (Registers task scheduler to boot WSL/vLLM on logon):
    ```powershell
    .\manage-vllm.ps1 register-autostart
    ```
*   **Start / Stop**:
    ```powershell
    .\manage-vllm.ps1 start
    .\manage-vllm.ps1 stop
    ```
*   **Diagnostics** (Enumerate LAN IPs, check firewall status, check active VRAM & load, test API):
    ```powershell
    .\manage-vllm.ps1 test
    ```
*   **Logs**:
    ```powershell
    .\manage-vllm.ps1 status
    ```

---

## Future Additions
Any future tools added to `AG23-tools/` should follow the same pattern:
1. Identify the environment annoyance.
2. Put the script to fix it in its own subdirectory.
3. Keep the core scripts protected from AI agent modifications by documenting them in the [.agents/AGENTS.md](file:///C:/Users/arya/source/repos/AG23-tools/.agents/AGENTS.md) guidelines.
