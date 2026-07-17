"""The never-ending researcher spine (user: "the research agent just keeps
going, never really stops until I terminate"). This is the DETERMINISTIC glue
between agent turns — the judgment turns belong to the Sonnet researcher, the
code turns to the Haiku coder. loop.py holds no LLM; it assembles state and
does the conclude-time housekeeping.

    python loop.py next   --repo <dir>     # brief for the researcher's next move; drains nudges
    python loop.py ingest --repo <dir>     # after a probe concludes: ledger+dag+graph+outcomes+synthesist

The cycle the researcher agent runs until terminated:
    loop.py next  →  (Sonnet designs)  →  (Haiku codes, vLLM runs)  →  conclude the EXP  →  loop.py ingest  →  repeat
"""
import argparse
import subprocess
import sys
from pathlib import Path

import rp_common as rp

HERE = Path(__file__).resolve().parent


def _drain_nudges(repo):
    inbox = Path(repo) / ".nudges" / "inbox.md"
    if not inbox.exists():
        return []
    lines = inbox.read_text().splitlines()
    fresh = [l for l in lines if l.strip().startswith("- [ ]")]
    if fresh:
        seen = Path(repo) / ".nudges" / "seen.md"
        with seen.open("a") as f:
            for l in fresh:
                f.write(l.replace("- [ ]", "- [x]") + "\n")
        inbox.write_text("")  # cleared; history in seen.md
    return [l.split(")", 1)[-1].strip() if ")" in l else l for l in fresh]


def cmd_next(repo):
    nudges = _drain_nudges(repo)
    digest = Path(repo) / "digests" / "state-of-investigation.md"
    exps = rp.load_investigation(repo)
    open_ = [e for e in exps if e["status"] != "concluded"]

    print("=" * 72)
    print("RESEARCHER — next move")
    print("=" * 72)
    if nudges:
        print("\n>>> NUDGES FROM THE HUMAN (weigh these first, they do not preempt "
              "a frozen prediction):")
        for n in nudges:
            print(f"    • {n}")
    print("\n# Synthesist digest (warm tier — your whole picture):")
    print(digest.read_text() if digest.exists()
          else "  (none yet — run: loop.py ingest --repo <dir>)")
    if open_:
        print("\n# In-flight experiments (finish or reproduce before opening new):")
        for e in open_:
            print(f"    {e['id']} [{e['status']}] — {e['question']}")
    print("\n# Your move: pick the highest information-per-credit next experiment "
          "(the digest proposes one). Register it (register.py), freeze the "
          "prediction, brief the coder. Do NOT write the code yourself.")


def cmd_ingest(repo):
    steps = [
        ("ledger", ["ledger.py", "--repo", repo]),
        ("dag", ["dag.py", "--repo", repo]),
        ("graph", ["graph_feed.py", "--repo", repo]),
        ("outcomes", ["outcomes.py", "--repo", repo, "--apply"]),
        ("synthesist", ["synthesist.py", "--repo", repo]),
    ]
    for name, cmd in steps:
        r = subprocess.run([sys.executable, str(HERE / cmd[0]), *cmd[1:]],
                           capture_output=True, text=True)
        tag = "ok" if r.returncode == 0 else "WARN"
        print(f"[{tag}] {name}: {(r.stdout or r.stderr).strip().splitlines()[-1] if (r.stdout or r.stderr).strip() else ''}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["next", "ingest"])
    ap.add_argument("--repo", required=True)
    a = ap.parse_args()
    (cmd_next if a.cmd == "next" else cmd_ingest)(a.repo)
