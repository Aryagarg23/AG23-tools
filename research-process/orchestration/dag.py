"""Validate the additive DAG (charter #3): you may only build on a LOCKED,
non-inconclusive conclusion. Building on sand is a hard error, not a warning.

    python dag.py --repo <investigation-dir>

Exit 0 if the DAG is sound, 1 if any edge is invalid or cyclic.
"""
import argparse
import sys

import rp_common as rp


def validate(repo):
    exps = {e["id"]: e for e in rp.load_investigation(repo)}
    errors = []
    for e in exps.values():
        for rel in ("builds_on", "refines", "contradicts"):
            for dep in e[rel]:
                d = exps.get(dep)
                if d is None:
                    errors.append(f"{e['id']} {rel} -> {dep}: no such experiment")
                elif rel == "builds_on":
                    if d["status"] != "concluded":
                        errors.append(f"{e['id']} builds_on {dep}: dependency not concluded "
                                      f"(status={d['status']}) — building on sand")
                    elif d["verdict"] == "inconclusive":
                        errors.append(f"{e['id']} builds_on {dep}: dependency is inconclusive")

    # cycle check over builds_on
    color = {}
    def dfs(n):
        color[n] = 1
        for dep in exps.get(n, {"builds_on": []})["builds_on"]:
            if color.get(dep) == 1:
                errors.append(f"cycle through {n} -> {dep}")
            elif color.get(dep, 0) == 0 and dep in exps:
                dfs(dep)
        color[n] = 2
    for n in exps:
        if color.get(n, 0) == 0:
            dfs(n)
    return errors


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", required=True)
    a = ap.parse_args()
    errs = validate(a.repo)
    if errs:
        print("DAG INVALID:")
        for x in errs:
            print("  -", x)
        sys.exit(1)
    print("DAG sound: all builds_on edges point at locked, non-inconclusive conclusions.")
