"""Feed ONLY the clean investigation folder into the synapse research graph
(charter #10; user: "only the clean folder contents populate that graph").

    python graph_feed.py --repo <investigation-dir>

Emits <repo>/graph/graph.json in the UNIFIED graph schema (graph/v1,
unified-interface/contracts/graph-schema.md): envelope {profile, model,
nodes, edges, skipped}, every node with type/layer/level/label/summary/
tags/provenance (+repo/status/weight/reliability), every edge with
relation + provenance. Validated before writing. This is deliberately
TIGHT: every node is a pre-registered, concluded experiment; every edge
is a typed relation from front-matter. No raw datasets, no scratch, no
wasteland — the graph is the locked knowledge.
"""
import argparse
import json
import os
import sys
from pathlib import Path

import rp_common as rp

sys.path.insert(0, os.environ.get("UNIFIED_CONTRACTS_DIR",
    os.path.expanduser("~/projects/unified-interface/contracts")))
import graph_contract as gc  # noqa: E402

EXTRACTOR = "graph_feed.py"
MODEL = "deterministic (ledger projection; no LLM in the backbone)"
VERDICT_RELIABILITY = {
    "confirmed": "CONFIRMED", "refuted": "REFUTED",
    "inconclusive": "INCONCLUSIVE", "": "OPEN",
}


def build(repo, out=None):
    exps = rp.load_investigation(repo)
    repo_name = Path(repo).name
    ids = {e["id"] for e in exps}
    fan_in = {i: 0 for i in ids}
    edges, skipped = [], []

    for e in exps:
        src = str(Path(e["path"]).relative_to(repo))
        for rel in ("builds_on", "refines", "contradicts"):
            relation, coerced = gc.coerce_relation(rel)
            if coerced:
                skipped.append(f"coerced: edge relation {rel!r} -> {relation!r}")
            for dep in e[rel]:
                if dep in ids:
                    edges.append({"source": e["id"], "target": dep,
                                  "relation": relation,
                                  "provenance": gc.provenance(src, EXTRACTOR, "deterministic")})
                    if rel == "builds_on":
                        fan_in[dep] = fan_in.get(dep, 0) + 1
                else:
                    skipped.append(f"{e['id']} {rel} -> {dep} (unknown)")

    nodes = []
    for e in exps:
        title = e["title"].split("—", 1)[-1].strip() if "—" in e["title"] else e["title"]
        src = str(Path(e["path"]).relative_to(repo))
        reliability, coerced = gc.coerce_reliability(
            VERDICT_RELIABILITY.get(e["verdict"], "OPEN"))
        if coerced:
            skipped.append(f"coerced: {e['id']} reliability -> {reliability!r}")
        nodes.append({
            "id": e["id"],
            "type": "experiment",
            "layer": "knowledge",
            "level": gc.LEVEL_OF_TYPE["experiment"],
            "label": f"{e['id']}: {title}"[:70],
            "summary": e["conclusion"][:400],
            "tags": [e["lens"]] + e["tags"],
            "reliability": reliability,
            "status": e["status"],
            "weight": 1 + fan_in.get(e["id"], 0),   # load-bearing → bigger node
            "repo": repo_name,
            "provenance": gc.provenance(src, EXTRACTOR, "deterministic"),
        })
        date = gc.source_date(e["path"])
        if date:
            nodes[-1]["date"] = date

    graph = {
        "profile": "investigation",
        "model": MODEL,
        "nodes": nodes, "edges": edges, "skipped": skipped,
    }
    errs = gc.validate_graph(graph)
    if errs:
        raise SystemExit("graph contract violations:\n  " + "\n  ".join(errs[:20]))
    out = Path(out) if out else Path(repo) / "graph" / "graph.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = out.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(graph, indent=2))
    os.replace(tmp, out)
    return len(nodes), len(edges), out


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", required=True)
    ap.add_argument("--out", default=None, help="graph.json path (default <repo>/graph/graph.json)")
    a = ap.parse_args()
    n, e, out = build(a.repo, a.out)
    print(f"graph: {n} nodes, {e} edges → {out} (clean folder only)")
