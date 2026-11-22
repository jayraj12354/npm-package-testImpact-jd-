import type { DependencyGraph } from '../../types/index.js';
import { GraphTraversal, type TraversalResult } from './graph-traversal.js';

export class ReverseGraphAnalyzer {
  private readonly graph: DependencyGraph;

  constructor(graph: DependencyGraph) {
    this.graph = graph;
  }

  /**
   * Identifies all modules affected by a set of changed files.
   */
  getAffectedModules(changedFiles: string[]): TraversalResult {
    return GraphTraversal.findReverseDependents(this.graph, changedFiles);
  }

  /**
   * Retrieves direct dependents for a file.
   */
  getDirectDependents(file: string): string[] {
    const deps = this.graph.reverse.get(file);
    return deps ? Array.from(deps) : [];
  }
}
