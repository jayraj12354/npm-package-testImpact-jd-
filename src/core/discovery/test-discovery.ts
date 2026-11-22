import fg from 'fast-glob';
import { ImportAnalyzer } from '../parser/import-analyzer.js';
import type { TestsConfig, TestFile } from '../../types/index.js';
import { normalizePath } from '../../utils/paths.js';

export interface TestDiscoveryOptions {
  rootDir?: string;
  tsConfigPath?: string;
}

export class TestDiscovery {
  private readonly rootDir: string;
  private readonly analyzer: ImportAnalyzer;

  constructor(options: TestDiscoveryOptions = {}) {
    this.rootDir = options.rootDir || process.cwd();
    this.analyzer = new ImportAnalyzer({
      rootDir: this.rootDir,
      tsConfigPath: options.tsConfigPath,
    });
  }

  /**
   * Discovers all test files matching the configuration patterns.
   */
  async discoverTests(config: TestsConfig): Promise<TestFile[]> {
    const rawMatches = await fg(config.include, {
      cwd: this.rootDir,
      ignore: config.exclude,
      onlyFiles: true,
      dot: false,
    });

    const testFiles: TestFile[] = [];

    for (const match of rawMatches) {
      const normalized = normalizePath(match, this.rootDir);
      const parsed = this.analyzer.analyzeFile(normalized);

      const directImports = parsed.imports.map((i) => i.rawSpecifier);
      const resolvedImports = parsed.imports
        .map((i) => i.resolvedPath)
        .filter((p): p is string => Boolean(p));

      testFiles.push({
        path: normalized,
        directImports,
        resolvedImports,
      });
    }

    // Sort deterministically
    return testFiles.sort((a, b) => a.path.localeCompare(b.path));
  }
}
