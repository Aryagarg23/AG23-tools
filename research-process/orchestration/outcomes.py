"""Record each concluded experiment as an agent-trace-outcome (charter: build
only on locked conclusions; reuse infra, don't reinvent). Gives the running
loop a "what's been tried nearby, and did it work?" memory that survives
context resets — exactly agent-trace-outcomes' stated agent use.

    python outcomes.py --repo <dir> [--atrace <path-to-agent-trace-outcomes>]

Maps each concluded EXP → one outcome record:
  intent  = the experiment's question
  check   = reproduce : pass/fail  (pass unless verdict inconclusive)
  verdict = verified (confirmed|refuted are both DECISIVE) / unverified (inconclusive)
  lesson  = the locked conclusion, applies_to = tags
agent-trace-outcomes stores facts, never scores — a conclusion is a fact, so
this respects its non-goals (no rating, no transcripts).
"""
import argparse
import json
import subprocess
from pathlib import Path

import rp_common as rp

DEFAULT_ATRACE = "/home/arya/projects/agent-trace-outcomes/dist/cli.js"


def _git_root(start):
    p = Path(start).resolve()
    for d in [p, *p.parents]:
        if (d / ".git").exists():
            return d
    return p


def _existing_keys(into):
    """Idempotency: a concluded experiment already recorded is identified by
    (intent, lesson). loop.py ingest runs this every cycle, so without this the
    same conclusions would pile up as fresh records forever. A changed
    conclusion is a genuinely new fact and re-records — which is correct."""
    keys = set()
    d = Path(into) / ".agent-trace" / "outcomes"
    for f in (d.glob("*.json") if d.exists() else []):
        try:
            r = json.loads(f.read_text())
            keys.add(((r.get("intent") or {}).get("summary", ""),
                      (r.get("lesson") or {}).get("summary", "")))
        except Exception:
            pass
    return keys


def record_all(repo, atrace, apply):
    cli = Path(atrace)
    into = _git_root(repo)   # records land in the repo's .agent-trace, not the clean folder
    existing = _existing_keys(into)
    exps = [e for e in rp.load_investigation(repo) if e["status"] == "concluded"]
    cmds, skipped = [], 0
    for e in exps:
        intent = e["question"] or e["title"]
        lesson = e["conclusion"] or "(no conclusion)"
        if (intent, lesson) in existing:
            skipped += 1
            continue
        decisive = e["verdict"] in ("confirmed", "refuted")
        check = f"reproduce:test:{'pass' if decisive else 'fail'}"
        cmd = ["node", str(cli), "record", "--intent", intent,
               "--check", check, "--lesson", lesson]
        for t in e["tags"]:
            cmd += ["--applies-to", f"tag:{t}"]
        cmds.append((e["id"], cmd))

    if not apply:
        print(f"[dry-run] {len(cmds)} new outcome records ({skipped} already "
              f"recorded, skipped) → {into}/.agent-trace. atrace CLI: {cli}")
        for eid, c in cmds:
            print(f"  {eid}: {c[5]} … [{c[7]}]")
        return
    if not cmds:
        print(f"  up to date — {skipped} already recorded, nothing new.")
        return
    for eid, c in cmds:
        r = subprocess.run(c, cwd=into, capture_output=True, text=True)
        print(f"  {eid}: {'ok' if r.returncode == 0 else 'FAIL ' + r.stderr.strip()[:120]}")
    if skipped:
        print(f"  ({skipped} already recorded, skipped)")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", required=True)
    ap.add_argument("--atrace", default=DEFAULT_ATRACE)
    ap.add_argument("--apply", action="store_true")
    a = ap.parse_args()
    record_all(a.repo, a.atrace, a.apply)
