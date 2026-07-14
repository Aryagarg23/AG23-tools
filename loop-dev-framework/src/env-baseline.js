import { runAgentLoop } from './agent-loop.js';

/**
 * Environment A (Baseline): Runs the loop-driven agent loop with NO
 * historical lessons or Root Cause Analysis (RCA) context.
 */
export async function runBaselineEnvironment({ taskName, taskDescription, workspaceDir, testCommand }) {
  console.log(`\n[Environment] Launching BASELINE (Env A) for task: ${taskName}`);
  
  return runAgentLoop({
    taskName,
    taskDescription,
    workspaceDir,
    lessons: [], // No past lessons injected
    maxIterations: 5,
    testCommand
  });
}
