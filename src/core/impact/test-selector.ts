import type {
  TestFile,
  ImpactedTest,
  GitChange,
  DependencyGraph,
} from '../../types/index.js';
import { GraphTraversal } from '../graph/graph-traversal.js';

export class TestSelector {
  /**
   * Selects impacted tests based on changed files and dependency graph.
   */
  static selectTests(
    changedFiles: GitChange[],
    discoveredTests: TestFile[],
    graph: DependencyGraph
  ): {
    selectedTests: ImpactedTest[];
    affectedModules: string[];
  } {
    const changedPaths = changedFiles.map((c) => c.path);
    const discoveredTestPaths = new Set(discoveredTests.map((t) => t.path));

    // Run reverse traversal from changed files
    const traversal = GraphTraversal.findReverseDependents(graph, changedPaths);
    const affectedModules = Array.from(traversal.affectedModules);

    const selectedMap = new Map<string, ImpactedTest>();

    // 1. Directly modified test files
    for (const change of changedFiles) {
      if (discoveredTestPaths.has(change.path)) {
        selectedMap.set(change.path, {
          testPath: change.path,
          priorityScore: 100,
          reason: {
            type: 'direct-test-change',
            description: `Directly modified test file (${change.type})`,
            dependencyChain: [change.path],
          },
        });
      }
    }

    // 2. Tests directly importing changed source files or transitively affected modules
    for (const test of discoveredTests) {
      // Skip if already selected as directly changed test
      if (selectedMap.has(test.path)) continue;

      // Check direct imports of changed files
      for (const imported of test.resolvedImports) {
        if (changedPaths.includes(imported)) {
          selectedMap.set(test.path, {
            testPath: test.path,
            priorityScore: 80,
            reason: {
              type: 'direct-import',
              description: `Directly imports changed module "${imported}"`,
              dependencyChain: [imported, test.path],
            },
          });
          break;
        }
      }

      if (selectedMap.has(test.path)) continue;

      // Check if test imports an affected module (transitive dependency)
      for (const imported of test.resolvedImports) {
        if (traversal.affectedModules.has(imported)) {
          const chain = traversal.dependencyChains.get(imported) || [imported];
          const fullChain = [...chain, test.path];
          const distance = traversal.distances.get(imported) ?? 1;

          selectedMap.set(test.path, {
            testPath: test.path,
            priorityScore: Math.max(20, 60 - distance * 5),
            reason: {
              type: 'transitive-import',
              description: `Imports "${imported}", which depends on changed module`,
              dependencyChain: fullChain,
            },
          });
          break;
        }
      }
    }

    // 3. Tests whose path appears in reverse graph of affected modules
    for (const affected of traversal.affectedModules) {
      if (discoveredTestPaths.has(affected) && !selectedMap.has(affected)) {
        const chain = traversal.dependencyChains.get(affected) || [affected];
        const distance = traversal.distances.get(affected) ?? 1;

        selectedMap.set(affected, {
          testPath: affected,
          priorityScore: Math.max(20, 60 - distance * 5),
          reason: {
            type: 'transitive-import',
            description: `Test depends on changed module through dependency graph`,
            dependencyChain: chain,
          },
        });
      }
    }

    return {
      selectedTests: Array.from(selectedMap.values()),
      affectedModules,
    };
  }
}
