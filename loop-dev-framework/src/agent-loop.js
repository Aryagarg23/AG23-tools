import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { recordOutcome } from 'agent-trace-outcomes';
import { LLMClient } from './llm-client.js';

// --- Mechanical lesson derivation (issue #1) ---------------------------------
// The lesson is NOT authored by the agent or hardcoded by task. It is derived from
// observable facts: the failing test's assertion and the diff that fixed it.
// "The fix (and the failure) is most of the lesson."
function firstAssertion(output) {
  if (!output) return '';
  const lines = output.split('\n').map(l => l.trim()).filter(Boolean);
  const hit = lines.find(l => /assert|expected|should|AssertionError|Error:/i.test(l));
  return (hit || lines[0] || '')
    .replace(/^\[.*?\]\s*(Test failed:)?\s*/i, '') // strip runner prefixes like "[Test Runner] Test failed:"
    .replace(/\s+/g, ' ')
    .slice(0, 200);
}
function diffOneLiner(diff) {
  if (!diff) return '';
  const changed = diff.split('\n').filter(l =>
    (l.startsWith('+') || l.startsWith('-')) && !l.startsWith('+++') && !l.startsWith('---'));
  return changed.slice(0, 2).join(' ').replace(/\s+/g, ' ').slice(0, 160);
}
function deriveLesson({ testPassed, failingOutput, priorFailOutput, diff }) {
  if (!testPassed) {
    const a = firstAssertion(failingOutput);
    return a ? `Failed the hidden test: ${a}` : 'Attempt failed the hidden test.';
  }
  const a = firstAssertion(priorFailOutput);
  if (a) {
    const fix = diffOneLiner(diff);
    return `Constraint learned from a prior failure: ${a}${fix ? ` — fixed via: ${fix}` : ''}`;
  }
  return 'Verified on the first attempt (no prior failure to learn from).';
}

export async function runAgentLoop({
  taskName,
  taskDescription,
  workspaceDir,
  lessons = [],
  maxIterations = 5,
  testCommand = 'node test.js',
  hiddenPaths = ['test.js']
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
  let lastFailOutput = ''; // failing test output from the previous iteration (for lesson derivation)

  // Prepare workspace directory if it doesn't exist
  if (!fs.existsSync(workspaceDir)) {
    fs.mkdirSync(workspaceDir, { recursive: true });
  }

  // System instructions for the agent
  const systemPrompt = `
You are an autonomous AI coding agent operating in a Loop-Driven Development environment.
Your goal is to solve the task described by the user.

A hidden automated test suite grades your solution — you cannot see it, but its output
(including assertion failures) appears in the Execution History after each attempt. Those
failures reveal the exact requirements; read them carefully and adjust.

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
        // Hide the grader from the agent so tasks can genuinely fail first (issue #3).
        if (hiddenPaths.includes(path.basename(relPath))) {
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
      let sourceDiff = ''; // diff scoped to the agent's file (excludes committed .agent-trace records)
      try {
        execSync('git add .', { cwd: workspaceDir, stdio: 'ignore' });
        const safeThought = response.thought.replace(/[\\"\n\r]/g, ' ').substring(0, 60);
        execSync(`git commit -m "agent: iteration ${iterations} - ${safeThought}"`, { cwd: workspaceDir, stdio: 'ignore' });
        commitSha = execSync('git rev-parse HEAD', { cwd: workspaceDir }).toString().trim();
        iterationDiff = execSync('git diff HEAD~1', { cwd: workspaceDir }).toString();
        try {
          sourceDiff = execSync(`git diff HEAD~1 -- "${response.path}"`, { cwd: workspaceDir }).toString();
        } catch { sourceDiff = iterationDiff; }
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
        // Capture BOTH streams: assertion messages usually go to stderr, and an agent that
        // can't see WHY it failed cannot recover (observed: 5/5 failures with stdout only).
        const out = err.stdout ? err.stdout.toString() : '';
        const errOut = err.stderr ? err.stderr.toString() : '';
        testOutput = [out, errOut].filter(Boolean).join('\n').trim() || err.message;
        console.log('✗ Verification tests failed.');
      }

      // Record outcome for this specific commit.
      try {
        // Task-agnostic: the lesson applies to the file the agent actually wrote, and its text
        // is DERIVED from the observed failure + fix — never hardcoded (issue #1).
        const appliesToPath = response.path;
        const lessonText = deriveLesson({
          testPassed,
          failingOutput: testOutput,
          priorFailOutput: lastFailOutput,
          diff: sourceDiff
        });

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

      if (!testPassed) {
        lastFailOutput = testOutput; // remembered so the fixing iteration can derive its lesson
      }

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
