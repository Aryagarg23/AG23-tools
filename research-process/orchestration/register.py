"""Scaffold a new experiment from the template, and lint that a placeholder
never survives into a run (charter #7).

    python register.py --repo <dir> --title "..." --lens mechanist
    python register.py --repo <dir> --lint            # check all EXP files

register refuses invalid lenses. lint refuses to let an experiment leave
`registered` while its Prediction block still contains a <...> placeholder or
an empty required field.
"""
import argparse
import re
import sys
from pathlib import Path

import rp_common as rp

REQUIRED_BEFORE_RUN = ["id", "date_registered", "lens", "cost_estimate"]


def next_id(repo):
    ids = [e["id"] for e in rp.load_investigation(repo)]
    nums = [int(m.group(1)) for i in ids if (m := re.search(r"EXP-(\d+)", i))]
    return f"EXP-{(max(nums) + 1 if nums else 1):03d}"


def slug(title):
    return re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:48]


def scaffold(repo, title, lens):
    if lens not in rp.LENSES:
        sys.exit(f"invalid lens '{lens}'; choose from {rp.LENSES}")
    eid = next_id(repo)
    tmpl = (rp.engine_root() / "method" / "hypothesis-template.md").read_text()
    body = tmpl.split("-->", 1)[1].lstrip() if "-->" in tmpl else tmpl
    body = body.replace("EXP-000", eid).replace("lens: mechanist", f"lens: {lens}")
    d = Path(repo) / "experiments" / f"{eid}-{slug(title)}"
    d.mkdir(parents=True, exist_ok=True)
    f = d / f"{eid}.md"
    if f.exists():
        sys.exit(f"{f} exists")
    f.write_text(body.replace("<one-line title>", title))
    print(f"registered {eid} → {f}\n  fill the Hypothesis + FROZEN Prediction before you run.")


def lint(repo):
    bad = []
    for e in rp.load_investigation(repo):
        if e["status"] == "registered":
            continue  # placeholders allowed only while still registered
        text = e["_text"]
        pred = rp._section(text, "Prediction — FROZEN AT REGISTRATION") or \
               rp._section(text, "Prediction")
        if "<" in pred and ">" in pred:
            bad.append(f"{e['id']}: status={e['status']} but Prediction still has a <placeholder>")
        for k in REQUIRED_BEFORE_RUN:
            if not e["_fm"].get(k):
                bad.append(f"{e['id']}: required field '{k}' empty but status={e['status']}")
        if e["status"] == "concluded" and not e["conclusion"]:
            bad.append(f"{e['id']}: concluded but no Conclusion written")
    return bad


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", required=True)
    ap.add_argument("--title")
    ap.add_argument("--lens", default="mechanist")
    ap.add_argument("--lint", action="store_true")
    a = ap.parse_args()
    if a.lint:
        bad = lint(a.repo)
        if bad:
            print("LINT FAILED:")
            for b in bad:
                print("  -", b)
            sys.exit(1)
        print("lint ok: no placeholder survived past registration.")
    else:
        if not a.title:
            sys.exit("--title required to register")
        scaffold(a.repo, a.title, a.lens)
