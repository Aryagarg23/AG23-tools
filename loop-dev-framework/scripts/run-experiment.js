import { runExperiment } from '../src/orchestrator.js';

async function main() {
  try {
    const report = await runExperiment();
    process.exit(report.proved ? 0 : 1);
  } catch (err) {
    console.error('Experiment failed with error:', err);
    process.exit(1);
  }
}

main();
