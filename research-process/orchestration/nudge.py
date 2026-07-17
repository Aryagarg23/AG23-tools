"""Gently nudge the running research agent (charter: the researcher never
stops). Drops a timestamped note into the investigation's nudge inbox; the
loop consumes it at the top of its next cycle, between delegations — so you
can hand the researcher a hunch WITHOUT interrupting the Haiku/vLLM work in
flight.

    python nudge.py --repo <dir> "percentile never moved off 7 — is it a dead field?"

Nudges are advisory: the researcher weighs one like any other open thread, it
does not preempt the frozen prediction of the experiment currently running.
"""
import argparse
import sys
from pathlib import Path

# time is passed in (Date.now is banned in the workflow env; here we accept an
# optional --at, else fall back to a plain marker so the tool is deterministic
# and never blocks).


def add(repo, text, at):
    inbox = Path(repo) / ".nudges" / "inbox.md"
    inbox.parent.mkdir(parents=True, exist_ok=True)
    stamp = at or "unstamped"
    with inbox.open("a") as f:
        f.write(f"- [ ] ({stamp}) {text.strip()}\n")
    return inbox


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", required=True)
    ap.add_argument("--at", default="", help="timestamp string (optional)")
    ap.add_argument("text", nargs="+")
    a = ap.parse_args()
    p = add(a.repo, " ".join(a.text), a.at)
    print(f"nudge queued → {p} (the researcher reads it at the top of its next cycle)")
