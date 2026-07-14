#!/bin/bash
set -e

ACTION=$1
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Helper to read env-config.json values via Python
read_env_config() {
    python3 -c "import json; print(json.load(open('$DIR/env-config.json'))['$1'])"
}

VENV_PATH=$(read_env_config wsl_venv_path)
SERVICE_FILE="/etc/systemd/system/vllm.service"

show_help() {
    echo "Usage: $0 {install|start|stop|status|uninstall}"
    exit 1
}

if [ -z "$ACTION" ]; then
    show_help
fi

case "$ACTION" in
    install)
        echo "========================================="
        echo "   Installing vLLM Service Natively      "
        echo "========================================="
        
        # 1. Create Python virtual environment
        echo "[1/4] Creating Python virtual environment..."
        python3 -m venv "$VENV_PATH"
        
        # 2. Install vLLM
        echo "[2/4] Installing vLLM (this will use cache if available)..."
        "$VENV_PATH/bin/pip" install --upgrade pip
        "$VENV_PATH/bin/pip" install vllm

        # vLLM pulls in FlashInfer, which JIT-compiles CUDA kernels at runtime and needs
        # a full CUDA toolkit (nvcc) that WSL does not provide. Remove it so vLLM falls
        # back to the prebuilt FlashAttention/Triton backends. See RCA.md.
        echo "[*] Removing FlashInfer (needs a CUDA toolkit that is not present in WSL)..."
        "$VENV_PATH/bin/pip" uninstall -y flashinfer-python flashinfer-cubin
        
        # 3. Create systemd service
        echo "[3/4] Creating systemd service..."
        sudo bash -c "cat << 'EOF' > $SERVICE_FILE
[Unit]
Description=vLLM Serving Service
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$DIR
ExecStart=$VENV_PATH/bin/python $DIR/launch.py
Restart=always
RestartSec=10
Environment=PYTHONUNBUFFERED=1 VLLM_USE_FLASHINFER_SAMPLER=0 VLLM_WORKER_MULTIPROC_METHOD=spawn

[Install]
WantedBy=multi-user.target
EOF"
        
        # 4. Enable service
        echo "[4/4] Enabling systemd service..."
        sudo systemctl daemon-reload
        sudo systemctl enable vllm
        
        echo ""
        echo "[+] Setup completed successfully!"
        echo "You can start the service using: $0 start"
        ;;
        
    start)
        echo "[*] Starting vLLM Service..."
        sudo systemctl start vllm
        sleep 2
        echo "[+] Service started."
        echo "[*] Use '$0 status' to check logs."
        ;;
        
    stop)
        echo "[*] Stopping vLLM Service..."
        sudo systemctl stop vllm
        echo "[+] Service stopped."
        ;;
        
    status)
        echo "========================================="
        echo "            Service Status               "
        echo "========================================="
        sudo systemctl status vllm || true
        
        echo ""
        echo "========================================="
        echo "             Recent Logs                 "
        echo "========================================="
        sudo journalctl -u vllm -n 30 --no-pager
        ;;
        
    uninstall)
        echo "========================================="
        echo "       Uninstalling vLLM Service         "
        echo "========================================="
        echo "[1/2] Stopping and removing systemd service..."
        sudo systemctl stop vllm || true
        sudo systemctl disable vllm || true
        sudo rm -f "$SERVICE_FILE"
        sudo systemctl daemon-reload
        
        echo "[2/2] Removing virtual environment..."
        rm -rf "$VENV_PATH"
        
        echo ""
        echo "[+] Uninstallation completed successfully!"
        ;;
        
    *)
        show_help
        ;;
esac
