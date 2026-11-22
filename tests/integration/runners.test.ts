import { describe, it, expect } from 'vitest';
import { VitestAdapter } from '../../src/core/runners/vitest-adapter.js';
import { JestAdapter } from '../../src/core/runners/jest-adapter.js';
import { resolveTestRunner } from '../../src/core/runners/runner-detector.js';

describe('Test Runner Integration', () => {
  it('detects Vitest in current project', async () => {
    const vitest = new VitestAdapter();
    const isDetected = await vitest.detect();
    expect(isDetected).toBe(true);
  });

  it('resolves correct runner for auto mode', async () => {
    const runner = await resolveTestRunner('auto');
    expect(runner.name).toBe('vitest');
  });

  it('resolves explicit jest runner when configured', async () => {
    const runner = await resolveTestRunner('jest');
    expect(runner.name).toBe('jest');
  });

  it('returns successful empty result when 0 tests are selected', async () => {
    const vitest = new VitestAdapter();
    const result = await vitest.run([]);

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.totalTests).toBe(0);
  });
});
