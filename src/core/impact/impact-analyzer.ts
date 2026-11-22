import fg from 'fast-glob';
import { performance } from 'node:perf_hooks';
import { ChangeDetector, type DetectChangesOptions } from '../git/change-detector.js';
import { ImportAnalyzer } from '../parser/import-analyzer.js';
import { GraphManager } from '../graph/dependency-graph.js';
import { TestDiscovery } from '../discovery/test-discovery.js';
import { TestSelector } from './test-selector.js';
import { TestPrioritizer } from './test-prioritizer.js';
import { FallbackManager } from '../fallback/fallback-manager.js';
import { normalizePath } from '../../utils/paths.js';
import type {
  TestImpactConfig,
  ImpactAnalysisResult,
  ImpactedTest,
  ParsedModule,
} from '../../types/index.js';

export interface AnalyzeImpactOptions extends DetectChangesOptions {
  all?: boolean;
}

export class ImpactAnalyzer {
  private readonly rootDir: string;
  private readonly config: TestImpactConfig;
  private readonly changeDetector: ChangeDetector;
  private readonly importAnalyzer: ImportAnalyzer;
  private readonly testDiscovery: TestDiscovery;

  constructor(config: TestImpactConfig, rootDir: string = process.cwd()) {
    this.rootDir = rootDir;
    this.config = config;
    this.changeDetector = new ChangeDetector(rootDir);
    this.importAnalyzer = new ImportAnalyzer({ rootDir });
    this.testDiscovery = new TestDiscovery({ rootDir });
  }

  async analyze(options: AnalyzeImpactOptions = {}): Promise<ImpactAnalysisResult> {
    const startTime = performance.now();

    // 1. Detect Git changes
    const gitStatus = await this.changeDetector.detect(this.config.git, options);
    const changedFiles = gitStatus.changes;

    // 2. Discover test files
    const discoveredTestFiles = await this.testDiscovery.discoverTests(this.config.tests);
    const discoveredPaths = discoveredTestFiles.map((t) => t.path);

    // 3. Scan and parse source files to build graph
    const sourceFiles = await fg(this.config.source.include, {
      cwd: this.rootDir,
      ignore: this.config.source.exclude,
      onlyFiles: true,
      dot: false,
    });

    const graphManager = new GraphManager();
    const parsedModulesMap = new Map<string, ParsedModule>();

    // Parse all source files
    for (const file of sourceFiles) {
      const normalized = normalizePath(file, this.rootDir);
      const parsed = this.importAnalyzer.analyzeFile(normalized);
      parsedModulesMap.set(normalized, parsed);
      graphManager.addModule(parsed);
    }

    // Also add test files to graph (tests can import helpers or other modules)
    for (const test of discoveredTestFiles) {
      const parsed = this.importAnalyzer.analyzeFile(test.path);
      parsedModulesMap.set(test.path, parsed);
      graphManager.addModule(parsed);
    }

    // 4. Evaluate safe fallback
    const fallback = FallbackManager.evaluate({
      all: options.all,
      isGitRepo: gitStatus.isGitRepo,
      changedFiles,
      parsedModules: parsedModulesMap,
      config: this.config,
    });

    let selectedTests: ImpactedTest[] = [];
    let affectedModules: string[] = [];

    if (fallback.triggered) {
      // Conservative Fallback: select all discovered tests
      selectedTests = discoveredTestFiles.map((t) => ({
        testPath: t.path,
        priorityScore: 10,
        reason: {
          type: options.all ? 'all-flag' : 'fallback',
          description: fallback.reason || 'Conservative fallback triggered',
        },
      }));
      affectedModules = sourceFiles.map((f) => normalizePath(f, this.rootDir));
    } else if (changedFiles.length === 0) {
      // No changes detected -> 0 tests selected
      selectedTests = [];
      affectedModules = [];
    } else {
      // Normal selective impact analysis
      const selection = TestSelector.selectTests(
        changedFiles,
        discoveredTestFiles,
        graphManager.rawGraph
      );
      selectedTests = TestPrioritizer.prioritize(selection.selectedTests);
      affectedModules = selection.affectedModules;
    }

    const selectedPaths = new Set(selectedTests.map((t) => t.testPath));
    const unselectedTests = discoveredPaths.filter((p) => !selectedPaths.has(p));

    const durationMs = Math.round(performance.now() - startTime);

    return {
      changedFiles,
      affectedModules,
      discoveredTests: discoveredPaths,
      selectedTests,
      unselectedTests,
      fallback,
      durationMs,
    };
  }
}
