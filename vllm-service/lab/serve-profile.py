#!/usr/bin/env python3
"""Launch vLLM from a lab profile JSON. Run this INSIDE WSL via the service venv.

Same config->CLI mapping as ../launch.py, with two extras:
  - an optional --port override (so a profile can run on 8001 next to the main
    service's 8000 when VRAM allows),
  - nested dict/list values (e.g. "compilation_config") are JSON-encoded into a
    single CLI argument instead of str()'d, so CUDA-graph knobs pass correctly.

It sets the same env vars the systemd unit uses (FlashInfer sampler off, spawn),
so a profile behaves the same whether launched here or by the installed service.

  .venv/bin/python serve-profile.py profiles/cuda-graphs.json --port 8000
"""
import argparse
import json
import os
import sys


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("profile", help="path to a profile JSON (config.json schema)")
    ap.add_argument("--port", type=int, default=None, help="override the port in the profile")
    args = ap.parse_args()

    with open(args.profile, "r", encoding="utf-8-sig") as f:
        config = json.load(f)
    if args.port is not None:
        config["port"] = args.port

    model = config.get("model")
    if not model:
        print("Error: 'model' key is required in the profile", file=sys.stderr)
        sys.exit(1)

    cmd = ["vllm", "serve", model]
    for key, val in config.items():
        if key == "model":
            continue
        flag = "--" + key.replace("_", "-")
        if isinstance(val, bool):
            if val:
                cmd.append(flag)
        elif isinstance(val, (dict, list)):
            cmd.extend([flag, json.dumps(val)])  # e.g. --compilation-config '{...}'
        elif val is not None:
            cmd.extend([flag, str(val)])

    # Match the installed service's environment (FlashInfer is uninstalled; the
    # sampler probe must be short-circuited, and CUDA multiproc uses spawn).
    os.environ.setdefault("VLLM_USE_FLASHINFER_SAMPLER", "0")
    os.environ.setdefault("VLLM_WORKER_MULTIPROC_METHOD", "spawn")
    os.environ.setdefault("PYTHONUNBUFFERED", "1")

    print("Launching:", " ".join(cmd))
    sys.stdout.flush()

    venv_bin = os.path.dirname(sys.executable)
    vllm_path = os.path.join(venv_bin, "vllm")
    if os.path.exists(vllm_path):
        cmd[0] = vllm_path
    os.execv(cmd[0], cmd)


if __name__ == "__main__":
    main()
