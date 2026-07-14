# AG23-tools Developer Toolkit

Welcome to **AG23-tools**, a unified repository for housing development scripts, utilities, and helper tools.

## Structure
- `.agents/`: Holds system rules and instructions for coding agents.
  - [AGENTS.md](file:///C:/Users/arya/source/repos/AG23-tools/.agents/AGENTS.md): Strict policy constraining agents from modifying core scripts.
- [README.md](file:///C:/Users/arya/source/repos/AG23-tools/README.md): This documentation.
- `vllm-service/`: A background LLM serving service running natively inside a WSL 2 ext4 environment.
  - [config.json](file:///C:/Users/arya/source/repos/AG23-tools/vllm-service/config.json): Model configuration.
  - [env-config.json](file:///C:/Users/arya/source/repos/AG23-tools/vllm-service/env-config.json): Environment and directory configuration.
  - [manage-vllm.ps1](file:///C:/Users/arya/source/repos/AG23-tools/vllm-service/manage-vllm.ps1): Windows management script.
  - [manage-vllm.sh](file:///C:/Users/arya/source/repos/AG23-tools/vllm-service/manage-vllm.sh): WSL bash management script.
  - [launch.py](file:///C:/Users/arya/source/repos/AG23-tools/vllm-service/launch.py): Python runtime launcher.

---

## Tool: vLLM Background Server (`vllm-service/`)
This tool allows you to serve large language models natively inside Linux WSL 2 for high performance while controlling them easily from Windows. It exposes the server to your local network (LAN) all the time on boot.

### Quick Start
To manage the service, navigate to the `vllm-service` directory in PowerShell:
```powershell
cd C:\Users\arya\source\repos\AG23-tools\vllm-service
```

1. **Install** (Creates virtual environment, downloads vLLM, sets up network & systemd):
   ```powershell
   .\manage-vllm.ps1 install
   ```
   *(Note: May print a warning if you are not running as Admin, providing the manual command to create a firewall rule).*

2. **Register Auto-Start on Boot** (Headlessly logs in WSL and boots the service on system startup):
   ```powershell
   .\manage-vllm.ps1 register-autostart
   ```

3. **Start / Stop**:
   ```powershell
   .\manage-vllm.ps1 start
   .\manage-vllm.ps1 stop
   ```

4. **Status & Logs** (Tails active systemd console output):
   ```powershell
   .\manage-vllm.ps1 status
   ```

5. **Full System Diagnostics** (Checks firewall, active LAN IPs, GPU load, and tests connection):
   ```powershell
   .\manage-vllm.ps1 test
   ```

---

## Customizing the Toolkit
You can add more subfolders (e.g. `other-tool-1/`, `other-tool-2/`) inside the `AG23-tools` directory to store other utilities or script files. 

Keep your human-facing documentation updated here, and any agent-facing constraints in the [.agents/AGENTS.md](file:///C:/Users/arya/source/repos/AG23-tools/.agents/AGENTS.md) file!
