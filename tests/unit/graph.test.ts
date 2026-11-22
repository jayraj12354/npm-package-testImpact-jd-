import { describe, it, expect } from 'vitest';
import { GraphManager } from '../../src/core/graph/dependency-graph.js';
import { GraphTraversal } from '../../src/core/graph/graph-traversal.js';
import type { ParsedModule } from '../../src/types/index.js';

describe('GraphManager & GraphTraversal', () => {
  function makeMockModule(filePath: string, resolvedImports: string[]): ParsedModule {
    return {
      filePath,
      contentHash: 'hash',
      imports: resolvedImports.map((imp) => ({
        rawSpecifier: imp,
        resolvedPath: imp,
        kind: 'es-import',
        isDynamic: false,
        isExternal: false,
        isTypeOnly: false,
      })),
      exports: [],
      hasUnresolvableDynamicImport: false,
      syntaxErrors: [],
    };
  }

  it('constructs forward and reverse graph accurately', () => {
    const manager = new GraphManager();

    // userService.ts <- login.ts <- middleware.ts
    // (login imports userService; middleware imports login)
    manager.addModule(makeMockModule('src/userService.ts', []));
    manager.addModule(makeMockModule('src/login.ts', ['src/userService.ts']));
    manager.addModule(makeMockModule('src/middleware.ts', ['src/login.ts']));

    // Forward checks
    expect(Array.from(manager.getDirectDependencies('src/middleware.ts'))).toEqual(['src/login.ts']);
    expect(Array.from(manager.getDirectDependencies('src/login.ts'))).toEqual(['src/userService.ts']);
    expect(Array.from(manager.getDirectDependencies('src/userService.ts'))).toEqual([]);

    // Reverse checks
    expect(Array.from(manager.getDirectDependents('src/userService.ts'))).toEqual(['src/login.ts']);
    expect(Array.from(manager.getDirectDependents('src/login.ts'))).toEqual(['src/middleware.ts']);
    expect(Array.from(manager.getDirectDependents('src/middleware.ts'))).toEqual([]);
  });

  it('traverses reverse dependents transitively with shortest chains', () => {
    const manager = new GraphManager();

    manager.addModule(makeMockModule('src/db.ts', []));
    manager.addModule(makeMockModule('src/repo.ts', ['src/db.ts']));
    manager.addModule(makeMockModule('src/service.ts', ['src/repo.ts']));
    manager.addModule(makeMockModule('src/controller.ts', ['src/service.ts']));

    const traversal = GraphTraversal.findReverseDependents(manager.rawGraph, ['src/db.ts']);

    expect(Array.from(traversal.affectedModules).sort()).toEqual([
      'src/controller.ts',
      'src/db.ts',
      'src/repo.ts',
      'src/service.ts',
    ].sort());

    expect(traversal.dependencyChains.get('src/controller.ts')).toEqual([
      'src/db.ts',
      'src/repo.ts',
      'src/service.ts',
      'src/controller.ts',
    ]);
    expect(traversal.distances.get('src/controller.ts')).toBe(3);
  });

  it('handles circular dependencies safely without infinite loops', () => {
    const manager = new GraphManager();

    // Cycle: A -> B -> C -> A
    manager.addModule(makeMockModule('src/a.ts', ['src/b.ts']));
    manager.addModule(makeMockModule('src/b.ts', ['src/c.ts']));
    manager.addModule(makeMockModule('src/c.ts', ['src/a.ts']));

    const traversal = GraphTraversal.findReverseDependents(manager.rawGraph, ['src/a.ts']);

    expect(traversal.affectedModules.size).toBe(3);
    expect(traversal.affectedModules.has('src/a.ts')).toBe(true);
    expect(traversal.affectedModules.has('src/b.ts')).toBe(true);
    expect(traversal.affectedModules.has('src/c.ts')).toBe(true);
  });

  it('handles removing modules when files are deleted', () => {
    const manager = new GraphManager();

    manager.addModule(makeMockModule('src/a.ts', ['src/b.ts']));
    manager.addModule(makeMockModule('src/b.ts', []));

    expect(manager.getDirectDependents('src/b.ts').has('src/a.ts')).toBe(true);

    manager.removeModule('src/a.ts');
    expect(manager.hasModule('src/a.ts')).toBe(false);
    expect(manager.getDirectDependents('src/b.ts').has('src/a.ts')).toBe(false);
  });
});
