import type { TestFile } from '../../types/index.js';

export class TestMapper {
  private readonly sourceToTests = new Map<string, Set<string>>();
  private readonly testToSources = new Map<string, Set<string>>();

  constructor(testFiles: TestFile[]) {
    for (const test of testFiles) {
      const sources = new Set<string>();
      for (const resolved of test.resolvedImports) {
        sources.add(resolved);

        if (!this.sourceToTests.has(resolved)) {
          this.sourceToTests.set(resolved, new Set());
        }
        this.sourceToTests.get(resolved)!.add(test.path);
      }
      this.testToSources.set(test.path, sources);
    }
  }

  /**
   * Returns all test files that directly import the given source file.
   */
  getTestsForSource(sourceFile: string): Set<string> {
    return this.sourceToTests.get(sourceFile) || new Set();
  }

  /**
   * Returns all source files imported by a test file.
   */
  getSourcesForTest(testFile: string): Set<string> {
    return this.testToSources.get(testFile) || new Set();
  }
}
