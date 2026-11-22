import type { DependencyGraph } from '../../types/index.js';

export interface TraversalResult {
  affectedModules: Set<string>;
  dependencyChains: Map<string, string[]>;
  distances: Map<string, number>;
}

export class GraphTraversal {
  /**
   * Finds all modules that directly or transitively depend on the changed files
   * using breadth-first search (BFS).
   * Safely handles cycles using a visited set.
   */
  static findReverseDependents(
    graph: DependencyGraph,
    changedFiles: string[],
    options: { maxDepth?: number } = {}
  ): TraversalResult {
    const affectedModules = new Set<string>();
    const dependencyChains = new Map<string, string[]>();
    const distances = new Map<string, number>();

    // Queue entries: [currentFile, currentChain, distance]
    const queue: Array<{ file: string; chain: string[]; distance: number }> = [];

    // Initialize queue with changed files
    for (const changedFile of changedFiles) {
      affectedModules.add(changedFile);
      dependencyChains.set(changedFile, [changedFile]);
      distances.set(changedFile, 0);

      queue.push({
        file: changedFile,
        chain: [changedFile],
        distance: 0,
      });
    }

    const maxDepth = options.maxDepth ?? Number.POSITIVE_INFINITY;

    while (queue.length > 0) {
      const item = queue.shift()!;
      const { file, chain, distance } = item;

      if (distance >= maxDepth) {
        continue;
      }

      // Who imports `file`? (reverse graph)
      const dependents = graph.reverse.get(file);
      if (!dependents) continue;

      for (const dep of dependents) {
        const nextDistance = distance + 1;
        const nextChain = [...chain, dep];

        if (!affectedModules.has(dep)) {
          affectedModules.add(dep);
          dependencyChains.set(dep, nextChain);
          distances.set(dep, nextDistance);

          queue.push({
            file: dep,
            chain: nextChain,
            distance: nextDistance,
          });
        } else {
          // If already affected, keep shortest chain
          const existingDist = distances.get(dep) ?? Number.POSITIVE_INFINITY;
          if (nextDistance < existingDist) {
            distances.set(dep, nextDistance);
            dependencyChains.set(dep, nextChain);
          }
        }
      }
    }

    return {
      affectedModules,
      dependencyChains,
      distances,
    };
  }
}
