#!/usr/bin/env python3
"""Throughput + concurrency benchmark for a vLLM OpenAI-compatible endpoint.

Read-only: it only sends chat-completion requests and reports tokens/sec for a
single stream and for several concurrency levels. Safe to run against a live
service. Runs on Windows or inside WSL (pure stdlib, no extra packages).

  python bench.py                        # localhost:8000, auto-detect model
  python bench.py --url http://127.0.0.1:8001/v1/chat/completions
  python bench.py --max-tokens 200 --levels 1,4,8,16,32
"""
import argparse
import concurrent.futures
import json
import time
import urllib.request


def detect_model(base):
    with urllib.request.urlopen(base + "/v1/models", timeout=10) as r:
        return json.load(r)["data"][0]["id"]


def gen(chat_url, model, prompt, max_tokens):
    body = json.dumps(
        {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": max_tokens,
            "temperature": 0,
            "ignore_eos": True,  # force full max_tokens so timings are comparable
        }
    ).encode()
    req = urllib.request.Request(
        chat_url, data=body, headers={"Content-Type": "application/json"}
    )
    t0 = time.time()
    with urllib.request.urlopen(req, timeout=600) as r:
        d = json.load(r)
    dt = time.time() - t0
    return d["usage"]["completion_tokens"], dt


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://127.0.0.1:8000/v1/chat/completions")
    ap.add_argument("--model", default=None, help="default: auto-detect from /v1/models")
    ap.add_argument("--max-tokens", type=int, default=200)
    ap.add_argument("--levels", default="1,4,8,16", help="comma-separated concurrency levels")
    args = ap.parse_args()

    base = args.url.rsplit("/v1/", 1)[0]
    model = args.model or detect_model(base)
    levels = [int(x) for x in args.levels.split(",") if x.strip()]
    print(f"endpoint: {args.url}")
    print(f"model:    {model}")
    print(f"max_tokens: {args.max_tokens}\n")

    gen(args.url, model, "hello", 16)  # warmup

    for n in levels:
        prompts = [f"Write a detailed technical essay number {i} about data structures." for i in range(n)]
        t0 = time.time()
        with concurrent.futures.ThreadPoolExecutor(max_workers=n) as ex:
            results = list(ex.map(lambda p: gen(args.url, model, p, args.max_tokens), prompts))
        wall = time.time() - t0
        total = sum(c for c, _ in results)
        ok = sum(1 for c, _ in results if c > 0)
        per = total / wall if wall else 0
        tag = "SINGLE   " if n == 1 else f"CONCURRENT N={n:<3d}"
        print(f"{tag}: {ok}/{n} ok, {total} tok in {wall:5.2f}s = {per:6.1f} tok/s aggregate")


if __name__ == "__main__":
    main()
