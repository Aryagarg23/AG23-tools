#!/bin/bash
# Reliable runner for alternative vLLM profiles. Run INSIDE WSL.
#
# Uses systemd-run (a transient unit that systemd keeps alive) instead of nohup,
# which WSL reaps when the launching shell exits. A 24 GB card can't hold two
# model instances, so `run` stops the main `vllm` service and `stop` restores it.
# The main service's files are never modified — this only starts/stops it.
#
#   ./lab.sh run profiles/cuda-graphs.json      # test a profile on port 8000
#   ./lab.sh stop                               # stop the test, restore main
#   ./lab.sh status                             # transient unit status/logs
set -e

LABDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WSL_LAB="/home/arya/vllm-service/lab"
VENV_PY="/home/arya/vllm-service/.venv/bin/python"
UNIT="vllm-lab"

case "$1" in
  run)
    PROFILE="${2:?usage: lab.sh run <profile.json> [port]}"
    PORT="${3:-8000}"
    # Stage launcher + profile onto native ext4 (avoid the /mnt/c 9p layer).
    mkdir -p "$WSL_LAB"
    cp "$LABDIR/serve-profile.py" "$WSL_LAB/serve-profile.py"
    cp "$PROFILE" "$WSL_LAB/$(basename "$PROFILE")"
    echo "[*] Stopping main vllm service (frees VRAM)..."
    sudo systemctl stop vllm || true
    sudo systemctl reset-failed "$UNIT" 2>/dev/null || true
    echo "[*] Launching '$(basename "$PROFILE")' on port $PORT as transient unit '$UNIT'..."
    sudo systemd-run --unit="$UNIT" --collect \
      --property=User=arya \
      --property=WorkingDirectory=/home/arya/vllm-service \
      --setenv=VLLM_USE_FLASHINFER_SAMPLER=0 \
      --setenv=VLLM_WORKER_MULTIPROC_METHOD=spawn \
      --setenv=PYTHONUNBUFFERED=1 \
      "$VENV_PY" "$WSL_LAB/serve-profile.py" "$WSL_LAB/$(basename "$PROFILE")" --port "$PORT"
    echo "[*] Started. Follow logs:  journalctl -u $UNIT -f"
    echo "[*] Benchmark:             python lab/bench.py --url http://127.0.0.1:$PORT/v1/chat/completions"
    echo "[*] When done:             ./lab.sh stop"
    ;;
  stop)
    echo "[*] Stopping transient unit '$UNIT'..."
    sudo systemctl stop "$UNIT" 2>/dev/null || true
    sudo systemctl reset-failed "$UNIT" 2>/dev/null || true
    echo "[*] Restarting main vllm service..."
    sudo systemctl start vllm
    echo "[+] Main service restored."
    ;;
  status)
    systemctl status "$UNIT" --no-pager || true
    ;;
  *)
    echo "usage: ./lab.sh {run <profile.json> [port] | stop | status}"
    exit 1
    ;;
esac
