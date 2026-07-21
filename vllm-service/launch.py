import json
import os
import shutil
import subprocess
import sys

def main():
    # Resolve script directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    config_path = os.path.join(script_dir, "config.json")
    
    if not os.path.exists(config_path):
        print(f"Error: Configuration file not found at {config_path}", file=sys.stderr)
        sys.exit(1)
        
    try:
        with open(config_path, "r", encoding="utf-8-sig") as f:
            config = json.load(f)
    except Exception as e:
        print(f"Error: Failed to parse config.json: {e}", file=sys.stderr)
        sys.exit(1)
        
    # Get the vLLM model
    model = config.get("model")
    if not model:
        print("Error: 'model' key is required in config.json", file=sys.stderr)
        sys.exit(1)
        
    # Build arguments list
    # We will invoke `vllm serve <model>`
    cmd = ["vllm", "serve", model]
    
    # Define mapping of config keys to vllm CLI arguments
    for key, val in config.items():
        if key == "model":
            continue
            
        # Standardize key name to hyphenated CLI flag (e.g. gpu_memory_utilization -> --gpu-memory-utilization)
        cli_flag = "--" + key.replace("_", "-")
        
        if isinstance(val, bool):
            if val:
                cmd.append(cli_flag)
        elif isinstance(val, (dict, list)):
            # Nested values (e.g. compilation_config) must be passed as JSON,
            # not str() which would emit a Python-dict repr vLLM can't parse.
            cmd.extend([cli_flag, json.dumps(val)])
        elif val is not None:
            cmd.extend([cli_flag, str(val)])
            
    print(f"Starting vLLM with command: {' '.join(cmd)}")
    sys.stdout.flush()

    # Resolve the vllm executable: prefer the one next to the current
    # interpreter (virtual env Scripts/bin dir) since that's the env vllm
    # was installed into, falling back to whatever PATH provides.
    venv_bin_dir = os.path.dirname(sys.executable)
    vllm_path = shutil.which("vllm", path=venv_bin_dir) or shutil.which("vllm")

    if not vllm_path:
        print("Error: could not find 'vllm' executable on PATH or next to the current Python interpreter", file=sys.stderr)
        sys.exit(1)

    cmd[0] = vllm_path

    result = subprocess.run(cmd)
    sys.exit(result.returncode)

if __name__ == "__main__":
    main()
