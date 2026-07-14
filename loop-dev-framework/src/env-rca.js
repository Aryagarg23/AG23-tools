import { queryLessons } from 'agent-trace-outcomes';
import { runAgentLoop } from './agent-loop.js';

/**
 * Environment B (RCA-Augmented): Queries agent-trace-outcomes for historical
 * failure reasons/lessons and injects them as active context before the loop runs.
 */
export async function runRcaEnvironment({ taskName, taskDescription, workspaceDir, testCommand, targetPaths = [] }) {
  console.log(`\n[Environment] Launching RCA-AUGMENTED (Env B) for task: ${taskName}`);
  
  // Retrieve past failure outcomes / lessons from the repo store
  let lessons = [];
  try {
    lessons = await queryLessons({
      paths: targetPaths,
      repoPath: workspaceDir,
      limit: 5
    });
    console.log(`[RCA Loader] Successfully retrieved ${lessons.length} lessons for paths: ${targetPaths.join(', ')}`);
  } catch (err) {
    console.error(`[RCA Loader] Failed to query lessons from store: ${err.message}. Proceeding with empty context.`);
  }

  return runAgentLoop({
    taskName,
    taskDescription,
    workspaceDir,
    lessons, // Inject retrieved lessons
    maxIterations: 5,
    testCommand
  });
}
