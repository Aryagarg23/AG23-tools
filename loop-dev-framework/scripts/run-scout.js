// Runs the scouting loop (test 2) from its orchestration manifest, so the test directory — not
// this script — owns the exact setup (question, system prompt, params). Writes transcript,
// metrics, and a findings note into the manifest's results_dir.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { runScoutLoop } from '../src/scout-loop.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../..'); // scripts -> loop-dev-framework -> AG23-tools -> project root
const MANIFEST = path.join(ROOT, 'journal/test-2-scouting-loop/orchestration.json');

const cfg = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const resultsDir = path.join(ROOT, cfg.results_dir);
fs.mkdirSync(resultsDir, { recursive: true });

console.log(`\n>>> SCOUT LOOP (test 2) — ${cfg.model.id}`);
console.log(`>>> Q: ${cfg.question}\n`);

const t0 = Date.now();
const { final, metrics, toolLog, messages } = await runScoutLoop({
  question: cfg.question,
  systemPrompt: cfg.system_prompt,
  maxSteps: cfg.params.max_steps,
  maxToolChars: cfg.params.max_tool_chars,
  onStep: (line) => console.log(line),
});
const secs = ((Date.now() - t0) / 1000).toFixed(1);
const stamped = { ...metrics, wall_seconds: Number(secs) };

fs.writeFileSync(path.join(resultsDir, 'transcript.json'), JSON.stringify({ question: cfg.question, messages, toolLog }, null, 2));
fs.writeFileSync(path.join(resultsDir, 'metrics.json'), JSON.stringify(stamped, null, 2));
fs.writeFileSync(path.join(resultsDir, 'findings.md'),
  `# Scout loop findings\n\n**Question:** ${cfg.question}\n\n**Metrics:** ${JSON.stringify(stamped)}\n\n---\n\n${final || '(no final synthesis — hit max_steps)'}\n`);

console.log(`\n>>> metrics: ${JSON.stringify(stamped)}`);
console.log(`\n>>> FINAL SYNTHESIS:\n${final || '(none — hit max_steps)'}\n`);
console.log(`>>> saved to ${cfg.results_dir}/`);
