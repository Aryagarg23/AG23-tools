import assert from 'assert';
import { isLeapYear } from './lib/leap.js';

async function runTests() {
  console.log('[Test Runner] Running Leap Year tests...');

  // Test 1: Standard leap years
  assert.strictEqual(isLeapYear(2024), true, '2024 should be a leap year (divisible by 4)');
  assert.strictEqual(isLeapYear(2020), true, '2020 should be a leap year (divisible by 4)');

  // Test 2: Standard non-leap years
  assert.strictEqual(isLeapYear(2023), false, '2023 should NOT be a leap year');
  assert.strictEqual(isLeapYear(1999), false, '1999 should NOT be a leap year');

  // Test 3: Century boundary rule (Divisible by 100 but not 400)
  console.log('[Test Runner] Testing century boundary (1900, 2100)...');
  assert.strictEqual(isLeapYear(1900), false, '1900 should NOT be a leap year (divisible by 100 but not 400)');
  assert.strictEqual(isLeapYear(2100), false, '2100 should NOT be a leap year (divisible by 100 but not 400)');

  // Test 4: Exception boundary rule (Divisible by 400)
  console.log('[Test Runner] Testing 400-year exception boundary (2000)...');
  assert.strictEqual(isLeapYear(2000), true, '2000 should be a leap year (divisible by 400)');
  assert.strictEqual(isLeapYear(2400), true, '2400 should be a leap year (divisible by 400)');
}

runTests().then(() => {
  console.log('[Test Runner] ALL LEAP YEAR TESTS PASSED!');
  process.exit(0);
}).catch(err => {
  console.error('[Test Runner] Test suite failed:', err.message);
  process.exit(1);
});
