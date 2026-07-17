"""Feed ONLY the clean investigation folder into the synapse research graph
(charter #10; user: "only the clean folder contents populate that graph").

    python graph_feed.py --repo <investigation-dir>

Emits <repo>/graph/graph.json in the synapse research-graph schema
({profile, model, nodes, edges, skipped}) so the existing visualizer renders
it natively. This is deliberately TIGHT: every node is a pre-registered,
concluded experiment; every edge is a typed relation from front-matter. No
raw datasets, no scratch, no wasteland — the graph is the locked knowledge.

Node schema (matches adaption-findings/graph/graph.json):
  id, label, type='experiment', tags (lens + tags), reliability (verdict),
  summary (conclusion), source (path), size hint via `weight` (fan-in).
Edge schema: {source, target, relation} for builds_on / refines / contradicts.
"""
import argparse
import json
from pathlib import Path

import rp_common as rp

VERDICT_RELIABILITY = {
    "confirmed": "CONFIRMED", "refuted": "REFUTED",
    "inconclusive": "INCONCLUSIVE", "": "OPEN",
}


def build(repo, out=None):
    exps = rp.load_investigation(repo)
    ids = {e["id"] for e in exps}
    fan_in = {i: 0 for i in ids}
    edges, skipped = [], []

    for e in exps:
        for rel in ("builds_on", "refines", "contradicts"):
            for dep in e[rel]:
                if dep in ids:
                    edges.append({"source": e["id"], "target": dep, "relation": rel})
                    if rel == "builds_on":
                        fan_in[dep] = fan_in.get(dep, 0) + 1
                else:
                    skipped.append(f"{e['id']} {rel} -> {dep} (unknown)")

    nodes = []
    for e in exps:
        title = e["title"].split("—", 1)[-1].strip() if "—" in e["title"] else e["title"]
        nodes.append({
            "id": e["id"],
            "label": f"{e['id']}: {title}"[:70],
            "type": "experiment",
            "tags": [e["lens"]] + e["tags"],
            "reliability": VERDICT_RELIABILITY.get(e["verdict"], "OPEN"),
            "status": e["status"],
            "weight": 1 + fan_in.get(e["id"], 0),   # load-bearing → bigger node
            "summary": e["conclusion"][:400],
            "source": str(Path(e["path"]).relative_to(repo)),
        })

    graph = {
        "profile": "research-process/investigation",
        "model": "deterministic (ledger projection; no LLM in the backbone)",
        "nodes": nodes, "edges": edges, "skipped": skipped,
    }
    out = Path(out) if out else Path(repo) / "graph" / "graph.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(graph, indent=2))
    return len(nodes), len(edges), out


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", required=True)
    ap.add_argument("--out", default=None, help="graph.json path (default <repo>/graph/graph.json)")
    a = ap.parse_args()
    n, e, out = build(a.repo, a.out)
    print(f"graph: {n} nodes, {e} edges → {out} (clean folder only)")
