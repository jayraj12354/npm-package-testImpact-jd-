import { VitestAdapter } from './vitest-adapter.js';
import { JestAdapter } from './jest-adapter.js';
import type { TestRunner } from './runner-interface.js';
import type { TestRunnerType } from '../../types/index.js';
import { RunnerError } from '../../utils/errors.js';

export async function resolveTestRunner(
  configuredRunner: TestRunnerType,
  cwd: string = process.cwd()
): Promise<TestRunner> {
  const vitest = new VitestAdapter();
  const jest = new JestAdapter();

  if (configuredRunner === 'vitest') {
    return vitest;
  }

  if (configuredRunner === 'jest') {
    return jest;
  }

  // Auto-detection
  if (await vitest.detect(cwd)) {
    return vitest;
  }

  if (await jest.detect(cwd)) {
    return jest;
  }

  // Fallback default: if neither explicitly installed, try vitest first
  return vitest;
}
