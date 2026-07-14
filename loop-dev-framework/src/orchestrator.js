import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { runBaselineEnvironment } from './env-baseline.js';
import { runRcaEnvironment } from './env-rca.js';

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

function cleanDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function initGitRepo(dir) {
  try {
    execSync('git init', { cwd: dir, stdio: 'ignore' });
    execSync('git config user.name "arya"', { cwd: dir, stdio: 'ignore' });
    execSync('git config user.email "garg.arya@gmail.com"', { cwd: dir, stdio: 'ignore' });
    execSync('git add .', { cwd: dir, stdio: 'ignore' });
    execSync('git commit -m "initial commit"', { cwd: dir, stdio: 'ignore' });
    console.log(`[Git] Initialized local git repo & committed files in ${dir}`);
  } catch (err) {
    console.error(`[Git] Failed to initialize repo in ${dir}:`, err.message);
  }
}

export async function runExperiment() {
  console.log('====================================================');
  console.log('   STARTING LOOP-DRIVEN HYPOTHESIS COMPARISON TEST  ');
  console.log('====================================================');

  const tasks = [
    {
      id: 'task-limiter',
      name: 'Rate Limiter Concurrency',
      description: 'Implement a rate limiter module in lib/rate-limiter.js. It must support high-concurrency requests and limit them correctly.',
      source: './tasks/task-limiter',
      paths: ['lib/rate-limiter.js']
    },
    {
      id: 'task-leap',
      name: 'Leap Year Century Bounds',
      description: 'Implement isLeapYear in lib/leap.js. It must handle leap years correctly, including the century exclusion rule and the 400-year exception rule.',
      source: './tasks/task-leap',
      paths: ['lib/leap.js']
    }
  ];

  const results = {};

  for (const task of tasks) {
    console.log(`\n====================================================`);
    console.log(`         RUNNING TASK: ${task.name}                  `);
    console.log(`====================================================`);

    const baselineWorkspace = `./workspace-baseline-${task.id}`;
    const rcaWorkspace = `./workspace-rca-${task.id}`;

    // Clean previous workspaces
    cleanDir(baselineWorkspace);
    cleanDir(rcaWorkspace);

    // Prepare Baseline
    console.log(`[Orchestrator] Preparing Baseline Workspace in ${baselineWorkspace}...`);
    copyRecursiveSync(task.source, baselineWorkspace);
    initGitRepo(baselineWorkspace);

    // Run Environment A
    const baselineResult = await runBaselineEnvironment({
      taskName: `${task.name} (Baseline)`,
      taskDescription: task.description,
      workspaceDir: baselineWorkspace,
      testCommand: 'node test.js'
    });

    // Prepare RCA
    console.log(`[Orchestrator] Preparing RCA Workspace in ${rcaWorkspace}...`);
    copyRecursiveSync(task.source, rcaWorkspace);
    initGitRepo(rcaWorkspace);

    // Copy .agent-trace
    const baselineTraceDir = path.join(baselineWorkspace, '.agent-trace');
    const rcaTraceDir = path.join(rcaWorkspace, '.agent-trace');
    if (fs.existsSync(baselineTraceDir)) {
      console.log(`[Orchestrator] Copying recorded outcomes for ${task.name}...`);
      copyRecursiveSync(baselineTraceDir, rcaTraceDir);
    }

    // Run Environment B
    const rcaResult = await runRcaEnvironment({
      taskName: `${task.name} (RCA-Augmented)`,
      taskDescription: task.description,
      workspaceDir: rcaWorkspace,
      testCommand: 'node test.js',
      targetPaths: task.paths
    });

    results[task.id] = {
      name: task.name,
      baseline: baselineResult,
      rca: rcaResult,
      proved: rcaResult.iterations < baselineResult.iterations
    };
  }

  // 6. Compile Aggregated Comparison Report
  console.log('\n====================================================');
  console.log('            AGGREGATED EXPERIMENT REPORT            ');
  console.log('====================================================');
  console.log(`Metric                  | Env A (Baseline)  | Env B (RCA-Augmented)`);
  
  for (const taskId in results) {
    const r = results[taskId];
    console.log(`----------------------------------------------------`);
    console.log(`[Task: ${r.name}]`);
    console.log(`  Outcome Status        | ${r.baseline.isSuccessful ? 'SUCCESS' : 'FAILED'}           | ${r.rca.isSuccessful ? 'SUCCESS' : 'FAILED'}`);
    console.log(`  Iterations Required   | ${r.baseline.iterations}                 | ${r.rca.iterations}`);
    console.log(`  Hypothesis Verdict    | ${r.proved ? 'PROVED ✓' : 'FAILED ✗'} (Reduced by ${r.baseline.iterations - r.rca.iterations} steps)`);
  }
  console.log('====================================================\n');

  // Check if we also want to display metadata details to show that we tracked git diffs
  console.log('====================================================');
  console.log('        EXTENSIBILITY DEMO: METADATA & GIT DIFFS    ');
  console.log('====================================================');
  for (const taskId in results) {
    const r = results[taskId];
    const rec = r.rca.recordedRecord;
    if (rec && rec.metadata && rec.metadata['org.loop-dev.demo']) {
      const demoMeta = rec.metadata['org.loop-dev.demo'];
      console.log(`[Task: ${r.name}]`);
      console.log(`- Last Successful Commit SHA: ${rec.vcs.revision.substring(0, 7)}`);
      console.log(`- Custom Meta - Iteration: ${demoMeta.iteration}`);
      console.log(`- Custom Meta - Captured Thought: "${demoMeta.thought}"`);
      console.log(`- Custom Meta - Git Diff Snippet:`);
      const lines = demoMeta.diff.split('\n').filter(l => l.startsWith('+') || l.startsWith('-'));
      console.log(`  ${lines.slice(0, 6).join('\n  ')}\n  ...`);
      console.log(`----------------------------------------------------`);
    }
  }

  const allProved = Object.values(results).every(r => r.proved);
  return {
    results,
    proved: allProved
  };
}
