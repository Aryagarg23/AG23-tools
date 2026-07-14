# RCA: vLLM service crash-loop

## Symptom

`manage-vllm.ps1 start` reported the service as started, but it never served. systemd
kept it in a restart loop: each boot loaded the model, then the engine core exited with
`RuntimeError: Engine core initialization failed`, and `Restart=always` started it again.
`/v1/models` never returned.

## Environment

- GPU: NVIDIA GeForce RTX 3090 Ti (Ampere, compute capability 8.6 / SM86)
- WSL 2 Ubuntu, no CUDA toolkit installed (only the `libcuda.so` runtime is present in
  `/usr/lib/wsl/lib`; there is no `nvcc`)
- vLLM 0.25.0, model `QuantTrio/Qwen3-Coder-30B-A3B-Instruct-AWQ`

## Root causes

1. **FlashInfer needs a CUDA toolkit that WSL does not have.** vLLM installs FlashInfer as
   a dependency and prefers it. FlashInfer JIT-compiles CUDA kernels at runtime, which
   needs `nvcc`. There is no CUDA toolkit in WSL, so every attempt died with:

   ```
   RuntimeError: Could not find nvcc and default cuda_home='/usr/local/cuda' doesn't exist
   ```

   This was hit first in the sampler (`top_k_top_p_sampling_from_logits`) and, once the
   sampler was routed around, again in the attention backend (`prefill_wrapper.plan`).

2. **`kv_cache_dtype: fp8` is not supported on this GPU.** Native fp8 KV cache requires
   SM89+ (Ada/Hopper). The 3090 Ti is SM86. FlashInfer was the only backend that accepted
   the fp8 setting, which is why vLLM forced FlashInfer in the first place. The Triton
   backend rejects it outright:

   ```
   ValueError: FP8 KV cache is not supported by the Triton attention backend on
   NVIDIA GeForce RTX 3090 Ti (compute capability 8.6); native FP8 requires SM89+.
   ```

3. **The workaround env vars did nothing.** The service unit set
   `VLLM_DISABLE_FLASHINFER=1` and `VLLM_ATTENTION_BACKEND=TORCH_SDPA`. Neither variable
   exists in vLLM 0.25.0; both were logged as `Unknown vLLM environment variable detected`
   and ignored.

## Fix

1. `config.json`: `kv_cache_dtype` changed from `fp8` to `auto` (uses the model dtype,
   bf16). With fp8 gone, the prebuilt FlashAttention backend becomes eligible.
2. Uninstall FlashInfer (`flashinfer-python`, `flashinfer-cubin`) from the venv, and do the
   same in the installers. vLLM then selects `FLASH_ATTN`, which ships prebuilt and needs
   no compiler.
3. `VLLM_USE_FLASHINFER_SAMPLER=0` in the service unit. Required: vLLM 0.25.0's sampler
   probe imports the FlashInfer backend unconditionally unless this flag short-circuits it
   first. Without it, removing FlashInfer trades the `nvcc` crash for a
   `ModuleNotFoundError: No module named 'flashinfer'`.
4. Removed the two no-op env vars.

After this, the engine selects `FLASH_ATTN` for attention and the native sampler, boots
without restarting, and serves chat completions and tool calls.

## Cost of the fix

bf16 KV cache uses twice the memory of fp8. On this GPU (15.7 GiB of weights on a 24 GiB
card) that leaves ~2.2 GiB of KV cache, about 23.5k tokens, ~1.4x concurrency at the
16384-token context. `max_model_len` was already reduced to 16384 to fit. To get more
context or concurrency on this hardware, raise `gpu_memory_utilization`, lower
`max_model_len`, or use a smaller model.

## To go back to FlashInfer / fp8

You need both an SM89+ GPU (RTX 40-series or newer, or Hopper) and a CUDA toolkit
(`nvcc`) installed in WSL. Neither is present here, so it is not worth it.
