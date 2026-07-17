#!/usr/bin/env bash
# Stitch the research-process engine into any research repo: create the
# preconfigured, restricted output folder (user: "a submodule for any research
# based directories with a preconfigured output folder restricted from other
# agent work").
#
#   research-process/init_investigation.sh <target-repo> <investigation-name>
#
# Idempotent. Creates <target-repo>/investigation/ with the restricted
# AGENTS.md marker, the shed-bulk .gitignore, the config, and the skeleton the
# tools expect. Does NOT overwrite existing experiments.
set -euo pipefail
ENGINE="$(cd "$(dirname "$0")" && pwd)"
TARGET="${1:?usage: init_investigation.sh <target-repo> <name>}"
NAME="${2:?usage: init_investigation.sh <target-repo> <name>}"
INV="$TARGET/investigation"

mkdir -p "$INV/experiments" "$INV/digests" "$INV/graph" "$INV/.nudges"

# shed-bulk gitignore (charter #4)
cat > "$INV/.gitignore" <<'EOF'
experiments/**/dataset*.jsonl
experiments/**/*.export.jsonl
experiments/**/output*.jsonl
experiments/**/replicates/
EOF

# config marker
cat > "$INV/.research-process.json" <<EOF
{
  "engine": "$ENGINE",
  "investigation": "$NAME",
  "output_folder": ".",
  "restricted": true,
  "graph_source_only": true
}
EOF

# restricted marker (only copy if absent — don't clobber a customized one)
[ -f "$INV/AGENTS.md" ] || cp "$ENGINE/templates/AGENTS.restricted.md" "$INV/AGENTS.md" 2>/dev/null || \
  echo "# ⛔ RESTRICTED — research-process output folder. Only the research loop writes here." > "$INV/AGENTS.md"

echo "stitched: $INV"
echo "  register an experiment:  python3 $ENGINE/orchestration/register.py --repo $INV --title '...' --lens mechanist"
echo "  next move / conclude:    python3 $ENGINE/orchestration/loop.py next|ingest --repo $INV"
echo "Point the synapse '$NAME' domain's sources at $INV so ONLY the clean folder feeds the graph."
