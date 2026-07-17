"""Shared parsing for the research-process orchestration tools. Single source
of truth (charter #7): every tool reads experiments through THIS, so the
ledger, DAG, graph, and synthesist can never disagree about a field.

An investigation lives in a consuming repo under `investigation/`:
    investigation/experiments/EXP-NNN-*/EXP-NNN.md   (the records)
    investigation/LEDGER.md  ledger.jsonl            (projections)
    investigation/graph/graph.json                   (projection)
    investigation/digests/                            (synthesist output)
"""
import json
import re
from pathlib import Path

STATUSES = ["registered", "running", "observed", "reproduced", "concluded"]
VERDICTS = ["", "confirmed", "refuted", "inconclusive"]
LENSES = ["mechanist", "reductionist", "statistician", "falsifier",
          "cartographer", "ethnographer", "adversary", "economist", "inversionist"]


def _scalar(v):
    v = v.strip()
    if v.startswith("[") and v.endswith("]"):
        inner = v[1:-1].strip()
        return [x.strip().strip("\"'") for x in inner.split(",") if x.strip()] if inner else []
    return v.strip().strip("\"'")


def parse_front_matter(text):
    m = re.search(r"^---\n(.*?)\n---\n", text, re.S)
    if not m:
        return {}
    fm, cur = {}, None
    for line in m.group(1).splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        top = re.match(r"^(\w[\w-]*):\s*(.*)$", line)
        sub = re.match(r"^\s+(\w[\w-]*):\s*(.*)$", line)
        if top:
            key, val = top.group(1), top.group(2)
            if val == "":
                fm[key] = {}
                cur = key
            else:
                fm[key] = _scalar(val)
                cur = None
        elif sub and cur and isinstance(fm.get(cur), dict):
            fm[cur][sub.group(1)] = _scalar(sub.group(2))
    return fm


def _section(text, header):
    m = re.search(rf"^##\s+{re.escape(header)}.*?\n(.*?)(?=^##\s|\Z)", text, re.S | re.M)
    return m.group(1).strip() if m else ""


def parse_experiment(path):
    path = Path(path)
    text = path.read_text()
    fm = parse_front_matter(text)
    concl = _section(text, "Conclusion")
    return {
        "id": fm.get("id", path.stem),
        "path": str(path),
        "lens": fm.get("lens", ""),
        "status": fm.get("status", "registered"),
        "verdict": fm.get("verdict", "") or "",
        "tags": fm.get("tags", []) if isinstance(fm.get("tags"), list) else [],
        "builds_on": fm.get("builds_on", []) if isinstance(fm.get("builds_on"), list) else [],
        "refines": fm.get("refines", []) if isinstance(fm.get("refines"), list) else [],
        "contradicts": fm.get("contradicts", []) if isinstance(fm.get("contradicts"), list) else [],
        "effect_vs_noise": fm.get("effect_vs_noise", ""),
        "cost_estimate": fm.get("cost_estimate", ""),
        "title": _title(text),
        "question": _oneline(_section(text, "Question")),
        "conclusion": _oneline(concl),
        "reconstruct": fm.get("reconstruct", {}),
        "_fm": fm,
        "_text": text,
    }


def _title(text):
    m = re.search(r"^#\s+(EXP-\S+\s*[—-]\s*.+)$", text, re.M)
    return m.group(1).strip() if m else ""


def _oneline(s):
    s = re.sub(r"\s+", " ", s).strip()
    return s


def load_investigation(repo):
    exp_dir = Path(repo) / "experiments"
    out = []
    for p in sorted(exp_dir.glob("EXP-*/EXP-*.md")):
        out.append(parse_experiment(p))
    return out


def engine_root():
    return Path(__file__).resolve().parents[1]
