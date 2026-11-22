import type { ImpactedTest } from '../../types/index.js';

export class TestPrioritizer {
  /**
   * Prioritizes tests based on relationship proximity and priority score.
   * Direct test changes first, then direct imports, then transitive.
   * Deterministic sorting guarantees reproducible test runs.
   */
  static prioritize(tests: ImpactedTest[]): ImpactedTest[] {
    return [...tests].sort((a, b) => {
      // 1. Higher priority score first
      if (b.priorityScore !== a.priorityScore) {
        return b.priorityScore - a.priorityScore;
      }
      // 2. Alphabetical path for deterministic ordering
      return a.testPath.localeCompare(b.testPath);
    });
  }
}
