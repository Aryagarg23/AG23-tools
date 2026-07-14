import assert from 'assert';
import { rateLimit, reset } from './lib/rate-limiter.js';

async function runTests() {
  console.log('[Test Runner] Running tests...');

  // Test 1: Basic Limit
  reset();
  console.log('[Test Runner] Test 1: Testing basic rate limit...');
  for (let i = 0; i < 5; i++) {
    const ok = await rateLimit(5);
    assert.strictEqual(ok, true, `Request ${i + 1} should have been allowed`);
  }
  const blocked = await rateLimit(5);
  assert.strictEqual(blocked, false, '6th request should have been blocked');
  console.log('[Test Runner] Test 1 passed!');

  // Test 2: Concurrency Race Condition
  reset();
  console.log('[Test Runner] Test 2: Testing concurrency...');
  
  // Fire 20 requests in parallel
  const requests = Array.from({ length: 20 }, () => rateLimit(5));
  const results = await Promise.all(requests);
  
  const allowedCount = results.filter(Boolean).length;
  console.log(`[Test Runner] Allowed requests under concurrency: ${allowedCount} (Limit was 5)`);
  
  assert.strictEqual(allowedCount, 5, `Expected exactly 5 allowed requests, but got ${allowedCount}. Naive counter has race conditions!`);
  console.log('[Test Runner] Test 2 passed!');
}

runTests().then(() => {
  console.log('[Test Runner] ALL TESTS PASSED!');
  process.exit(0);
}).catch(err => {
  console.error('[Test Runner] Test suite failed:', err.message);
  process.exit(1);
});
