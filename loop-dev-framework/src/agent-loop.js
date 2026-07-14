import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { recordOutcome } from 'agent-trace-outcomes';
import { LLMClient } from './llm-client.js';

export async function runAgentLoop({
  taskName,
  taskDescription,
  workspaceDir,
  lessons = [],
  maxIterations = 5,
  testCommand = 'node test.js'
}) {
  console.log(`\n=== Starting Agent Loop for: ${taskName} ===`);
  if (lessons.length > 0) {
    console.log(`[RCA Context] Injecting ${lessons.length} past failure lessons.`);
  } else {
    console.log('[RCA Context] No past failure lessons injected.');
  }

  const llm = new LLMClient();
  const history = [];
  let isSuccessful = false;
  let iterations = 0;
  let recordedRecord = null;

  // Prepare workspace directory if it doesn't exist
  if (!fs.existsSync(workspaceDir)) {
    fs.mkdirSync(workspaceDir, { recursive: true });
  }

  // System instructions for the agent
  const systemPrompt = `
You are an autonomous AI coding agent operating in a Loop-Driven Development environment.
Your goal is to solve the task described by the user.

Available Actions:
- "write_file": Write content to a file. Requires "path" and "content" fields.
- "exit": Stop execution.

Format your response strictly as a JSON object:
{
  "thought": "Your reasoning about what to do next",
  "action": "write_file" | "exit",
  "path": "relative/path/to/file",
  "content": "Full contents of the file to write"
}

${lessons.length > 0 ? `
=== PAST FAILURES / LESSONS LEARNED ===
The following lessons were recorded from previous failed attempts on this repository:
${lessons.map((l, idx) => `Lesson #${idx + 1}: ${l.summary} (Applies to: ${l.applies_to.join(', ')})`).join('\n')}
Do not repeat these failures.
======================================
` : ''}
`;

  while (iterations < maxIterations) {
    iterations++;
    console.log(`\n--- Iteration ${iterations}/${maxIterations} ---`);

    // Read current workspace state to show in the prompt
    let filesState = '';
    const readDirRecursive = (dir) => {
      const list = fs.readdirSync(dir);
      list.forEach(file => {
        const fullPath = path.join(dir, file);
        const relPath = path.relative(workspaceDir, fullPath);
        if (relPath.startsWith('node_modules') || relPath.startsWith('.git') || relPath.startsWith('.agent-trace')) {
          return;
        }
        if (fs.statSync(fullPath).isDirectory()) {
          readDirRecursive(fullPath);
        } else {
          const content = fs.readFileSync(fullPath, 'utf8');
          filesState += `\nFile: ${relPath}\n\`\`\`\n${content}\n\`\`\`\n`;
        }
      });
    };

    if (fs.existsSync(workspaceDir)) {
      readDirRecursive(workspaceDir);
    }

    // Assemble user prompt
    const userPrompt = `
Task Description:
${taskDescription}

Workspace Files:
${filesState || '(Workspace is empty)'}

Execution History:
${history.map((h, i) => `[Step ${i + 1}]
Thought: ${h.thought}
Action: ${h.action}
Result: ${h.result}`).join('\n\n')}

What is your next action?
`;

    // Query LLM/Simulator
    let llmResponseText;
    try {
      llmResponseText = await llm.complete(systemPrompt, userPrompt);
    } catch (err) {
      console.error(`LLM Query failed: ${err.message}`);
      break;
    }

    // Parse LLM Response
    let response;
    try {
      let cleanedText = llmResponseText.trim();
      if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```(json)?\n/i, '');
        cleanedText = cleanedText.replace(/\n```$/, '');
        cleanedText = cleanedText.trim();
      }
      response = JSON.parse(cleanedText);
    } catch (err) {
      console.log(`[Warning] LLM output was not valid JSON. RAW: \n${llmResponseText}`);
      response = { thought: 'Failed to parse JSON', action: 'exit' };
    }

    console.log(`Agent Thought: ${response.thought}`);
    console.log(`Agent Action: ${response.action} ${response.path || ''}`);

    if (response.action === 'exit') {
      history.push({
        thought: response.thought,
        action: 'exit',
        result: 'Exited loop manually.'
      });
      break;
    }

    if (response.action === 'write_file') {
      const filePath = path.join(workspaceDir, response.path);
      const fileDir = path.dirname(filePath);
      
      // Ensure target folder exists
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }

      fs.writeFileSync(filePath, response.content, 'utf8');
      console.log(`[Workspace] Wrote ${response.path}`);

      // Commit changes to Git to associate the check with a specific SHA
      let commitSha = '';
      let iterationDiff = '';
      try {
        execSync('git add .', { cwd: workspaceDir, stdio: 'ignore' });
        const safeThought = response.thought.replace(/[\\"\n\r]/g, ' ').substring(0, 60);
        execSync(`git commit -m "agent: iteration ${iterations} - ${safeThought}"`, { cwd: workspaceDir, stdio: 'ignore' });
        commitSha = execSync('git rev-parse HEAD', { cwd: workspaceDir }).toString().trim();
        iterationDiff = execSync('git diff HEAD~1', { cwd: workspaceDir }).toString();
        console.log(`[Workspace] Committed iteration changes. SHA: ${commitSha.substring(0, 7)}`);
      } catch (err) {
        console.error('[Workspace] Git commit failed:', err.message);
      }

      // Run tests to observe outcome
      let testOutput = '';
      let testPassed = false;
      try {
        console.log(`[Workspace] Running verification command: ${testCommand}`);
        testOutput = execSync(testCommand, { cwd: workspaceDir, stdio: 'pipe' }).toString();
        testPassed = true;
        console.log('✓ Verification tests passed!');
      } catch (err) {
        testOutput = err.stdout ? err.stdout.toString() : err.message;
        console.log('✗ Verification tests failed.');
      }

      // Record outcome for this specific commit
      try {
        const isLeap = taskName.includes('Leap') || taskName.includes('leap');
        const appliesToPath = isLeap ? 'lib/leap.js' : 'lib/rate-limiter.js';
        const lessonText = isLeap
          ? (testPassed ? 'Leap year exception handling works correctly.' : 'Leap years must be divisible by 4, not 100, unless 400.')
          : (testPassed ? 'Lock-based serialized loops resolve async rate-limiting race conditions.' : 'Standard counter increments suffer from concurrency race conditions.');

        const iterationRecord = await recordOutcome({
          intent: `Solve task: ${taskName} (Iter ${iterations})`,
          checks: [
            {
              name: 'verification-suite',
              kind: 'test',
              status: testPassed ? 'pass' : 'fail',
              summary: testPassed ? 'Tests passed.' : 'Tests failed.'
            }
          ],
          lesson: {
            summary: lessonText,
            applies_to: [appliesToPath]
          },
          metadata: {
            'org.loop-dev.demo': {
              diff: iterationDiff,
              iteration: iterations,
              thought: response.thought
            }
          },
          revision: commitSha,
          repoPath: workspaceDir
        });
        console.log(`[agent-trace-outcomes] Iteration ${iterations} recorded against SHA ${commitSha.substring(0, 7)}. Verdict: ${iterationRecord.verdict}`);
        if (!recordedRecord || testPassed) {
          recordedRecord = iterationRecord;
        }
      } catch (err) {
        console.error('[agent-trace-outcomes] Failed to record iteration outcome:', err.message);
      }

      history.push({
        thought: response.thought,
        action: `write_file (${response.path})`,
        result: testPassed ? 'Success: tests passed.' : `Failure:\n${testOutput}`
      });

      if (testPassed) {
        isSuccessful = true;
        break;
      }
    }
  }

  return {
    isSuccessful,
    iterations,
    history,
    recordedRecord
  };
}
