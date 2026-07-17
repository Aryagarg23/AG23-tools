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


def record_all(repo, atrace, apply):
    cli = Path(atrace)
    into = _git_root(repo)   # records land in the repo's .agent-trace, not the clean folder
    exps = [e for e in rp.load_investigation(repo) if e["status"] == "concluded"]
    cmds = []
    for e in exps:
        decisive = e["verdict"] in ("confirmed", "refuted")
        check = f"reproduce:test:{'pass' if decisive else 'fail'}"
        cmd = ["node", str(cli), "record",
               "--intent", e["question"] or e["title"],
               "--check", check,
               "--lesson", e["conclusion"] or "(no conclusion)"]
        for t in e["tags"]:
            cmd += ["--applies-to", f"tag:{t}"]
        cmds.append((e["id"], cmd))

    if not apply:
        print(f"[dry-run] {len(cmds)} outcome records would be written into "
              f"{into}/.agent-trace (pass --apply). atrace CLI: {cli}")
        for eid, c in cmds:
            print(f"  {eid}: {c[3]} … [{c[5]}]")
        return
    for eid, c in cmds:
        r = subprocess.run(c, cwd=into, capture_output=True, text=True)
        print(f"  {eid}: {'ok' if r.returncode == 0 else 'FAIL ' + r.stderr.strip()[:120]}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", required=True)
    ap.add_argument("--atrace", default=DEFAULT_ATRACE)
    ap.add_argument("--apply", action="store_true")
    a = ap.parse_args()
    record_all(a.repo, a.atrace, a.apply)
