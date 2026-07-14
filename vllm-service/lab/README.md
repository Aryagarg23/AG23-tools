# vLLM lab — living notes

Scratch space for testing alternative vLLM configs **without touching the working
service**. The installed service (`config.json` + `vllm.service`, port 8000) is the
known-good baseline and is never modified by anything in here. Profiles are run as a
separate transient unit; a 24 GB card can't hold two model instances, so testing a
profile stops the main service and restores it afterward.

This file is meant to be edited as work continues — it's the running log, not a
finished spec.

---

## Change map (what was touched, and why)

Session goal: get vLLM serving on the RTX 3090 Ti, then improve throughput/concurrency.

| File / thing | Change | State |
| --- | --- | --- |
| `config.json` | `kv_cache_dtype` fp8 → auto (fp8 needs SM89+; 3090 Ti is SM86) | committed |
| venv | FlashInfer uninstalled (needs a CUDA toolkit WSL lacks) | applied + scripted |
| `manage-vllm.ps1` / `.sh` | uninstall FlashInfer on install; env `VLLM_USE_FLASHINFER_SAMPLER=0`; drop 2 dead env vars; test hits 127.0.0.1 not localhost | committed |
| `launch.py` | read config as utf-8-sig (BOM tolerant) | committed (via earlier merge) |
| `RCA.md` | root-cause writeup of the crash-loop | committed |
| `TESTED.md` | known-good hardware/firmware/package snapshot | committed |
| git remote | `branch.main.remote` → the moved URL `AG23-tools.git` | applied (local config) |
| `lab/` | this folder: benchmark + profile runner + profiles | in progress |

The crash-loop root cause and the reasoning are in [../RCA.md](../RCA.md); the exact
machine it was verified on is in [../TESTED.md](../TESTED.md).

---

## Scripts

| Script | Where it runs | What it does |
| --- | --- | --- |
| `bench.py` | Windows or WSL | Read-only throughput/concurrency benchmark against any endpoint. Auto-detects the served model. Safe against the live service. |
| `serve-profile.py` | WSL (service venv) | Launches vLLM from a profile JSON. Same config→CLI mapping as `../launch.py`, plus `--port` and nested `compilation_config`. |
| `lab.sh` | WSL | `run <profile> [port]` stops main + launches the profile as a transient `vllm-lab` unit (survives, unlike nohup); `stop` restores main. |
| `profiles/*.json` | — | Alternative configs to test. Same schema as `config.json`. |

### Typical loop

```bash
# inside WSL, from the repo's vllm-service/lab directory
./lab.sh run profiles/cuda-graphs.json          # stops main, starts the profile on :8000
python bench.py                                  # measure it
./lab.sh stop                                    # restore the known-good service
```

---

## Profiles

- **`profiles/cuda-graphs.json`** — same 30B-A3B model, but CUDA graphs on
  (`enforce_eager` removed), capture bounded to `FULL_DECODE_ONLY` + sizes
  `[1,2,4,8,16]` to fit the tight VRAM, and `gpu_memory_utilization` 0.91. Goal:
  ~10–30% faster decode with no quality change.

---

## Experiment log

Baseline = the installed `config.json` (bf16 KV, `enforce_eager=true`), measured with
`bench.py --max-tokens 200`.

| Date | Profile | Single tok/s | 16-concurrent agg tok/s | KV cache | Fits VRAM? | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-07-14 | baseline (installed) | 35.3 | 525.0 (16/16 ok) | 2.16 GiB / 23.5k tok | yes | reference |
| 2026-07-14 | cuda-graphs | **156.1** | **1396.9** (16/16 ok) | 2.77 GiB / 30.2k tok | yes (graphs cost 0.07 GiB) | **big win — 4.4x single, 2.7x @16** |

Full sweeps (tok/s aggregate, all requests ok):
- baseline: 1→35.3, 4→131.6, 8→267.9, 16→525.0
- cuda-graphs: 1→156.1, 4→480.9, 8→884.1, 16→1396.9

**Headline finding: `enforce_eager: true` was crippling throughput.** It disables
*both* torch.compile (inductor) *and* CUDA graphs, so the installed service runs fully
un-compiled. Removing it (with capture bounded to `FULL_DECODE_ONLY` + `[1,2,4,8,16]`
so graph memory is only 0.07 GiB) gives ~4.4x single-stream and ~2.7x 16-concurrent
throughput, *and* more KV cache (util 0.91). Output verified correct: normal chat and
`qwen3_coder` tool-calls both still work. This profile is strictly better than baseline
on this GPU with no downside found — a candidate to promote to `config.json`.

---

## Findings

- **fp8 KV cache is a dead end on this GPU.** `fp8_e4m3` needs SM89+ tensor cores
  (3090 Ti is SM86); `fp8_e5m2` is gated off for quantized (AWQ) checkpoints; FlashInfer
  is the only backend that advertises fp8 on Ampere but it needs a CUDA toolkit to JIT
  and reportedly saves no VRAM on Ampere anyway. Not worth chasing here.
- **Concurrency is already good.** The bottleneck for *long-context* concurrency is KV
  memory (weights eat ~16 GB of 24 GB). Levers: lower `max_model_len`, raise
  `gpu_memory_utilization` (only ~1.5 GB physically free), or a smaller model.

Sources: [vLLM #26431](https://github.com/vllm-project/vllm/issues/26431) ·
[vLLM #21960 (FlashInfer needs nvcc)](https://github.com/vllm-project/vllm/issues/21960) ·
[vLLM CUDA graphs docs](https://docs.vllm.ai/en/stable/design/cuda_graphs/)

---

## Open questions / next

- [ ] Measure the `cuda-graphs` profile: does it fit the ~1.5 GB headroom, and how much
      throughput does it actually add?
- [ ] Try `max_model_len` 8192 as a profile — roughly doubles worst-case long-context
      concurrency.
- [ ] int8 KV quant (`kv_cache_dtype: int8_*`) — only if a supported backend accepts it
      on SM86; unverified, can be buggy on GQA models.
