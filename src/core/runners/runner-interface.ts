import type { RunnerOptions, TestRunResult } from '../../types/index.js';

export interface TestRunner {
  readonly name: string;

  /**
   * Detects whether this runner is available in the project.
   */
  detect(cwd?: string): Promise<boolean>;

  /**
   * Executes the specified test files using this runner.
   */
  run(testFiles: string[], options?: RunnerOptions): Promise<TestRunResult>;
}
