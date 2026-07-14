import assert from 'assert';
import { roundValue } from './lib/round.js';

function runTests() {
  console.log('[Test Runner] Running rounding tests...');

  // Ordinary rounding
  assert.strictEqual(roundValue(2.4), 2, 'roundValue(2.4) should be 2');
  assert.strictEqual(roundValue(2.6), 3, 'roundValue(2.6) should be 3');
  assert.strictEqual(roundValue(-1.2), -1, 'roundValue(-1.2) should be -1');

  // Exact .5 ties resolve to the nearest EVEN integer (banker's rounding).
  // This constraint is intentionally NOT in the task description — only this hidden test reveals it.
  assert.strictEqual(roundValue(2.5), 2, 'roundValue(2.5) should be 2: exact .5 ties round to the nearest even integer');
  assert.strictEqual(roundValue(3.5), 4, 'roundValue(3.5) should be 4: exact .5 ties round to the nearest even integer');
  assert.strictEqual(roundValue(0.5), 0, 'roundValue(0.5) should be 0: exact .5 ties round to the nearest even integer');
  assert.strictEqual(roundValue(4.5), 4, 'roundValue(4.5) should be 4: exact .5 ties round to the nearest even integer');
  assert.strictEqual(roundValue(-2.5), -2, 'roundValue(-2.5) should be -2: exact .5 ties round to the nearest even integer');
}

try {
  runTests();
  console.log('[Test Runner] ALL ROUNDING TESTS PASSED!');
  process.exit(0);
} catch (err) {
  console.error('[Test Runner] Test failed:', err.message);
  process.exit(1);
}
