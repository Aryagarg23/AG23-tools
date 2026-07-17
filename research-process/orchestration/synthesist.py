"""The synthesist (charter #6): interpretation is a role, not a re-read. An
idle-cron pass that reads ONLY the ledger's conclusions — never raw artifacts
— and keeps the whole investigation compressed into one warm-tier digest.

    python synthesist.py --repo <dir> [--force]

Each run:
  1. Structural rollup (deterministic Python — no model needed):
     - contradictions: a tag carrying both a confirmed and a refuted verdict
     - load-bearing nodes: conclusions many others build on
     - open threads: still-registered/running experiments
  2. One local-vLLM call: current unifying mechanism + next best experiment.
  3. Emits <repo>/digests/state-of-investigation.md (overwrites; ledger keeps
     history). Idle-guard: exits fast if nothing changed since last run.
Output is stamped DRAFT/unreviewed — the synthesist proposes, never concludes.
"""
import argparse
import hashlib
import json
from pathlib import Path

import rp_common as rp

VLLM = "http://localhost:8000/v1/chat/completions"
MODEL = "QuantTrio/Qwen3-Coder-30B-A3B-Instruct-AWQ"


def rollup(exps):
    # Contradictions are EXPLICIT `contradicts:` edges only. A verdict is about
    # a prediction, not a stance — a refuted prediction can still yield a
    # conclusion that agrees with others (EXP-002), so tag+verdict is a false
    # signal. Semantic contradictions are left to the worker's prose read.
    contradictions = [(e["id"], dep) for e in exps for dep in e["contradicts"]]
    fan_in = {}
    for e in exps:
        for dep in e["builds_on"]:
            fan_in[dep] = fan_in.get(dep, 0) + 1
    load_bearing = sorted(fan_in.items(), key=lambda kv: -kv[1])
    open_threads = [e["id"] for e in exps if e["status"] != "concluded"]
    return contradictions, load_bearing, open_threads


def synth_prose(exps):
    concl = "\n".join(f"- {e['id']} [{e['verdict'] or e['status']}]: {e['conclusion']}"
                      for e in exps if e["conclusion"])
    prompt = ("You are the synthesist for a reverse-engineering investigation. "
              "Below are the LOCKED conclusions only. In <=120 words: (1) the single "
              "unifying mechanism that explains the most conclusions, (2) the highest "
              "information-per-credit next experiment. Be concrete, no preamble.\n\n"
              + concl)
    try:
        import requests
        r = requests.post(VLLM, json={"model": MODEL, "temperature": 0.4,
                                      "max_tokens": 320,
                                      "messages": [{"role": "user", "content": prompt}]},
                          timeout=90)
        return r.json()["choices"][0]["message"]["content"].strip()
    except Exception as ex:
        return f"(local worker unavailable: {ex}. Structural rollup still valid above.)"


def run(repo, force):
    exps = rp.load_investigation(repo)
    sig = hashlib.sha256(json.dumps(
        [(e["id"], e["status"], e["verdict"], e["conclusion"]) for e in exps]).encode()
    ).hexdigest()[:16]
    guard = Path(repo) / "digests" / ".synthesist-sig"
    if not force and guard.exists() and guard.read_text().strip() == sig:
        print("synthesist: nothing changed since last run — exiting idle.")
        return
    contradictions, load_bearing, open_threads = rollup(exps)
    prose = synth_prose(exps)

    lines = ["# State of the investigation — synthesist digest",
             "", "> DRAFT / unreviewed. The synthesist reads only locked conclusions "
             "and proposes; it never concludes. Regenerated each idle cycle.", "",
             "## Current read (local worker)", "", prose, "",
             "## Contradictions (explicit `contradicts:` edges)"]
    lines += [f"- {a} contradicts {b}" for a, b in contradictions] or ["- none flagged"]
    lines += ["", "## Load-bearing conclusions (fan-in)"]
    lines += [f"- {dep} ← {n} experiment(s) build on it" for dep, n in load_bearing] or ["- none yet"]
    lines += ["", "## Open threads"]
    lines += [f"- {i}" for i in open_threads] or ["- none — every experiment concluded"]
    (Path(repo) / "digests" / "state-of-investigation.md").write_text("\n".join(lines) + "\n")
    guard.write_text(sig)
    print(f"synthesist: digest refreshed ({len(exps)} exps, "
          f"{len(contradictions)} contradiction-tags, {len(open_threads)} open).")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", required=True)
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    run(a.repo, a.force)
