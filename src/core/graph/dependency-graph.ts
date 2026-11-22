import type { ParsedModule, DependencyGraph } from '../../types/index.js';

export class GraphManager {
  private readonly graph: DependencyGraph;

  constructor() {
    this.graph = {
      forward: new Map<string, Set<string>>(),
      reverse: new Map<string, Set<string>>(),
      modules: new Map<string, ParsedModule>(),
    };
  }

  get rawGraph(): DependencyGraph {
    return this.graph;
  }

  /**
   * Adds or updates a parsed module in the forward and reverse graph.
   */
  addModule(parsed: ParsedModule): void {
    const file = parsed.filePath;

    // Clean up old forward edges if module was already in graph
    if (this.graph.forward.has(file)) {
      const oldDeps = this.graph.forward.get(file)!;
      for (const dep of oldDeps) {
        this.graph.reverse.get(dep)?.delete(file);
      }
    }

    this.graph.modules.set(file, parsed);

    const forwardDeps = new Set<string>();
    for (const imp of parsed.imports) {
      if (imp.resolvedPath && imp.resolvedPath !== file) {
        forwardDeps.add(imp.resolvedPath);

        // Add reverse edge
        if (!this.graph.reverse.has(imp.resolvedPath)) {
          this.graph.reverse.set(imp.resolvedPath, new Set());
        }
        this.graph.reverse.get(imp.resolvedPath)!.add(file);
      }
    }

    this.graph.forward.set(file, forwardDeps);

    // Ensure entry exists in reverse graph even if no one imports it yet
    if (!this.graph.reverse.has(file)) {
      this.graph.reverse.set(file, new Set());
    }
  }

  /**
   * Removes a file from the dependency graph (e.g. deleted file).
   */
  removeModule(file: string): void {
    if (this.graph.forward.has(file)) {
      const deps = this.graph.forward.get(file)!;
      for (const dep of deps) {
        this.graph.reverse.get(dep)?.delete(file);
      }
      this.graph.forward.delete(file);
    }

    if (this.graph.reverse.has(file)) {
      const revs = this.graph.reverse.get(file)!;
      for (const rev of revs) {
        this.graph.forward.get(rev)?.delete(file);
      }
      this.graph.reverse.delete(file);
    }

    this.graph.modules.delete(file);
  }

  getDirectDependencies(file: string): Set<string> {
    return this.graph.forward.get(file) || new Set();
  }

  getDirectDependents(file: string): Set<string> {
    return this.graph.reverse.get(file) || new Set();
  }

  getModule(file: string): ParsedModule | undefined {
    return this.graph.modules.get(file);
  }

  hasModule(file: string): boolean {
    return this.graph.modules.has(file);
  }

  getAllFiles(): string[] {
    return Array.from(this.graph.modules.keys());
  }
}
