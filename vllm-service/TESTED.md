# Known-good environment

The exact machine, firmware, and package versions this service was last verified on, and
what was checked. If something breaks, compare against this before assuming the code is at
fault.

Last verified: 2026-07-14

## Hardware / firmware

| Item | Value |
| --- | --- |
| GPU | NVIDIA GeForce RTX 3090 Ti |
| Compute capability | 8.6 (Ampere) |
| VRAM | 23028 MiB (24 GB) |
| Driver (KMD) version | 610.62 |
| NVIDIA-SMI | 610.43.02 |
| VBIOS version | 94.02.a0.00.11 |
| CUDA UMD version | 13.3 |

Note: compute capability 8.6 has no native fp8 support, so `kv_cache_dtype` must stay
`auto` (bf16). See `RCA.md`.

## Host / OS

| Item | Value |
| --- | --- |
| Windows | 10.0.26200.8737 |
| WSL | 2.7.10.0 |
| WSL kernel | 6.18.33.2-microsoft-standard-WSL2 |
| WSLg | 1.0.73.2 |
| Distro | Ubuntu 24.04.4 LTS (Noble Numbat) |
| WSL networking | mirrored |

No CUDA toolkit (`nvcc`) is installed in WSL, and none is needed — vLLM uses the prebuilt
FlashAttention backend.

## Python / packages (inside the venv)

| Package | Version |
| --- | --- |
| Python | 3.12.3 |
| vllm | 0.25.0 |
| torch | 2.11.0 |
| triton | 3.6.0 |
| transformers | 5.13.1 |
| tokenizers | 0.22.2 |
| safetensors | 0.8.0 |
| numpy | 2.3.5 |
| nvidia-cuda-runtime | 13.0.96 |
| flashinfer | removed (not installed) |

## Model config (`config.json`)

```json
{
  "model": "QuantTrio/Qwen3-Coder-30B-A3B-Instruct-AWQ",
  "host": "0.0.0.0",
  "port": 8000,
  "tensor_parallel_size": 1,
  "gpu_memory_utilization": 0.88,
  "max_model_len": 16384,
  "max_num_seqs": 32,
  "max_num_batched_tokens": 4096,
  "enable_chunked_prefill": true,
  "enable_prefix_caching": true,
  "kv_cache_dtype": "auto",
  "enable_auto_tool_choice": true,
  "tool_call_parser": "qwen3_coder",
  "enforce_eager": true
}
```

## Service environment (systemd unit)

```
Environment=PYTHONUNBUFFERED=1 VLLM_USE_FLASHINFER_SAMPLER=0 VLLM_WORKER_MULTIPROC_METHOD=spawn
```

## Runtime behaviour on this setup

- Attention backend selected: `FLASH_ATTN` (prebuilt, no runtime compile).
- Sampler: native (FlashInfer sampler disabled via env var).
- Model load: ~15.7 GiB weights, ~117 s from local cache.
- KV cache: ~2.2 GiB, ~23,584 tokens, ~1.4x concurrency at 16384-token context.

## What was tested

| Check | Result |
| --- | --- |
| Service boots without restart loop | pass (0 restarts) |
| `GET /v1/models` | pass |
| `POST /v1/chat/completions` (plain prompt) | pass |
| `POST /v1/chat/completions` with tools (`qwen3_coder` parser) | pass, returns a `tool_calls` response |
| `manage-vllm.ps1 test` | pass (local API reachable, ~15 ms) |

Not covered: the Windows Firewall rule for LAN access (needs an elevated
`manage-vllm.ps1 install`), sustained multi-client load, and models other than the one
above.
