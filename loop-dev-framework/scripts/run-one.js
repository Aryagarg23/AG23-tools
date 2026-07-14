// Single-loop grounding runner: drive ONE cheap agent (local vLLM) on ONE task and watch it
// iterate. No injected memory (baseline arm). Captures wall-clock so the journal has a speed
// number from the very first run. Usage: node scripts/run-one.js [task-leap|task-limiter]
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { runAgentLoop } from '../src/agent-loop.js';

const TASKS = {
  'task-leap': {
    name: 'Leap Year Century Bounds',
    description: 'Implement isLeapYear in lib/leap.js. It must handle leap years correctly, including the century exclusion rule and the 400-year exception rule.',
    source: './tasks/task-leap',
  },
  'task-limiter': {
    name: 'Rate Limiter Concurrency',
    description: 'Implement a rate limiter module in lib/rate-limiter.js. It must support high-concurrency requests and limit them correctly.',
    source: './tasks/task-limiter',
  },
};

const taskId = process.argv[2] || 'task-leap';
const task = TASKS[taskId];
if (!task) { console.error(`Unknown task: ${taskId}`); process.exit(2); }

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const c of fs.readdirSync(src)) copyRecursive(path.join(src, c), path.join(dest, c));
  } else {
    fs.copyFileSync(src, dest);
  }
}

const ws = `./workspace-oneshot-${taskId}`;
if (fs.existsSync(ws)) fs.rmSync(ws, { recursive: true, force: true });
copyRecursive(task.source, ws);
execSync('git init -q && git config user.name arya && git config user.email garg.arya@gmail.com && git add . && git commit -qm "initial"', { cwd: ws, shell: '/bin/bash' });

console.log(`\n>>> ONE-SHOT loop on ${taskId} (baseline, no memory)\n`);
const t0 = Date.now();
const res = await runAgentLoop({
  taskName: task.name,
  taskDescription: task.description,
  workspaceDir: ws,
  lessons: [],
  maxIterations: 5,
  testCommand: 'node test.js',
});
const secs = ((Date.now() - t0) / 1000).toFixed(1);

console.log(`\n>>> RESULT: success=${res.isSuccessful} iterations=${res.iterations} wall=${secs}s`);
console.log(`>>> final lesson recorded: ${JSON.stringify(res.recordedRecord?.lesson ?? null)}`);
