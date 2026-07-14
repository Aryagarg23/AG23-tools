# Agent Instructions and Policies

This workspace contains a collection of developer utility tools (AG23-tools).

## Repository Structure
- `.agents/AGENTS.md`: This configuration and policy file.
- `README.md`: General documentation for the toolkit.
- `vllm-service/`: A WSL 2 vLLM background serving service.
  - `vllm-service/config.json`: Model serving configuration. Edit this to swap models or configure context limits.
  - `vllm-service/env-config.json`: Environment and system configurations (WSL paths, distro name, firewall name).
  - `vllm-service/launch.py`: Python script run inside WSL to parse `config.json` and start vLLM.
  - `vllm-service/manage-vllm.ps1` / `vllm-service/manage-vllm.sh`: Service control scripts.

## Agent Behavior Guidelines

### 1. STRICT Policy: Restriction on Modifying Core Scripts
- > [!IMPORTANT]
  > **CRITICAL RESTRICTION**: You are strictly prohibited from modifying, editing, overwriting, or replacing `vllm-service/manage-vllm.ps1` or `vllm-service/manage-vllm.sh` unless explicitly authorized by the user.
- These scripts handle complex administrative tasks, Windows Task Scheduler tasks, firewall policies, base64 serialization, and environment variables. Modifying them can easily break permissions, cause syntax errors under PowerShell's encoder, or disrupt background services.
- If you need to make changes to ports, directories, distros, or model options, you must edit **`vllm-service/config.json`** or **`vllm-service/env-config.json`** instead.

### 2. Standard Service Commands
If you need to manage the service, use the following commands instead of writing custom code:
- Check Status: `.\vllm-service\manage-vllm.ps1 status`
- Start Service: `.\vllm-service\manage-vllm.ps1 start`
- Stop Service: `.\vllm-service\manage-vllm.ps1 stop`
- Run System Diagnostics: `.\vllm-service\manage-vllm.ps1 test`

### 3. Native WSL Execution Reminder
- The virtual environment is located natively inside the WSL Linux filesystem (`/home/arya/vllm-service/.venv`) for fast disk access. 
- Do NOT run pip installations or python commands using paths mounted under `/mnt/c` (Windows filesystem) inside WSL, as the 9p translation layer will cause major performance degradation. Always copy files to the native WSL path before executing.
