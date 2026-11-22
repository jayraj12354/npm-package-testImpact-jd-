import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { TestSelector } from '../../src/core/impact/test-selector.js';
import { TestPrioritizer } from '../../src/core/impact/test-prioritizer.js';
import { GraphManager } from '../../src/core/graph/dependency-graph.js';
import { ASTParser } from '../../src/core/parser/parser.js';
import { ModuleResolver } from '../../src/core/parser/module-resolver.js';
import type { TestFile, GitChange } from '../../src/types/index.js';

describe('TestImpact Engine Integration', () => {
  const projectDir = path.resolve(process.cwd(), 'tests/fixtures/impact-fixture');

  beforeAll(() => {
    fs.mkdirSync(path.join(projectDir, 'src/services'), { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'src/auth'), { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'src/middleware'), { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'src/utils'), { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'tests'), { recursive: true });

    // userService.ts
    fs.writeFileSync(
      path.join(projectDir, 'src/services/userService.ts'),
      'export function getUser() { return { id: 1 }; }'
    );

    // login.ts -> imports userService
    fs.writeFileSync(
      path.join(projectDir, 'src/auth/login.ts'),
      "import { getUser } from '../services/userService';\nexport function login() { return getUser(); }"
    );

    // authMiddleware.ts -> imports login
    fs.writeFileSync(
      path.join(projectDir, 'src/middleware/authMiddleware.ts'),
      "import { login } from '../auth/login';\nexport function middleware() { return login(); }"
    );

    // calculator.ts -> independent
    fs.writeFileSync(
      path.join(projectDir, 'src/utils/calculator.ts'),
      'export function add(a: number, b: number) { return a + b; }'
    );

    // user.test.ts -> imports userService
    fs.writeFileSync(
      path.join(projectDir, 'tests/user.test.ts'),
      "import { getUser } from '../src/services/userService';"
    );

    // login.test.ts -> imports login
    fs.writeFileSync(
      path.join(projectDir, 'tests/login.test.ts'),
      "import { login } from '../src/auth/login';"
    );

    // middleware.test.ts -> imports authMiddleware
    fs.writeFileSync(
      path.join(projectDir, 'tests/middleware.test.ts'),
      "import { middleware } from '../src/middleware/authMiddleware';"
    );

    // calculator.test.ts -> imports calculator
    fs.writeFileSync(
      path.join(projectDir, 'tests/calculator.test.ts'),
      "import { add } from '../src/utils/calculator';"
    );
  });

  afterAll(() => {
    if (fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  });

  function buildGraphAndTests() {
    const parser = new ASTParser(projectDir);
    const resolver = new ModuleResolver({ rootDir: projectDir });
    const graphManager = new GraphManager();

    const srcFiles = [
      'src/services/userService.ts',
      'src/auth/login.ts',
      'src/middleware/authMiddleware.ts',
      'src/utils/calculator.ts',
    ];

    for (const file of srcFiles) {
      const parsed = parser.parseFile(file);
      for (const imp of parsed.imports) {
        imp.resolvedPath = resolver.resolve(imp.rawSpecifier, file).resolvedPath;
      }
      graphManager.addModule(parsed);
    }

    const testFiles: TestFile[] = [
      {
        path: 'tests/user.test.ts',
        directImports: ['../src/services/userService'],
        resolvedImports: ['src/services/userService.ts'],
      },
      {
        path: 'tests/login.test.ts',
        directImports: ['../src/auth/login'],
        resolvedImports: ['src/auth/login.ts'],
      },
      {
        path: 'tests/middleware.test.ts',
        directImports: ['../src/middleware/authMiddleware'],
        resolvedImports: ['src/middleware/authMiddleware.ts'],
      },
      {
        path: 'tests/calculator.test.ts',
        directImports: ['../src/utils/calculator'],
        resolvedImports: ['src/utils/calculator.ts'],
      },
    ];

    return { graph: graphManager.rawGraph, testFiles };
  }

  it('selects all affected tests when a deeply depended module changes', () => {
    const { graph, testFiles } = buildGraphAndTests();
    const changes: GitChange[] = [{ path: 'src/services/userService.ts', type: 'modified' }];

    const selection = TestSelector.selectTests(changes, testFiles, graph);
    const selected = TestPrioritizer.prioritize(selection.selectedTests);
    const selectedPaths = selected.map((t) => t.testPath);

    // userService changed:
    // - user.test.ts directly imports it
    // - login.test.ts imports login.ts which imports userService.ts
    // - middleware.test.ts imports authMiddleware.ts which imports login.ts
    // - calculator.test.ts MUST NOT be selected!
    expect(selectedPaths).toContain('tests/user.test.ts');
    expect(selectedPaths).toContain('tests/login.test.ts');
    expect(selectedPaths).toContain('tests/middleware.test.ts');
    expect(selectedPaths).not.toContain('tests/calculator.test.ts');

    // Verify selection reasons
    const userTest = selected.find((t) => t.testPath === 'tests/user.test.ts');
    expect(userTest?.reason.type).toBe('direct-import');

    const loginTest = selected.find((t) => t.testPath === 'tests/login.test.ts');
    expect(loginTest?.reason.type).toBe('transitive-import');
  });

  it('selects only the relevant test when an isolated utility changes', () => {
    const { graph, testFiles } = buildGraphAndTests();
    const changes: GitChange[] = [{ path: 'src/utils/calculator.ts', type: 'modified' }];

    const selection = TestSelector.selectTests(changes, testFiles, graph);
    const selected = TestPrioritizer.prioritize(selection.selectedTests);
    const selectedPaths = selected.map((t) => t.testPath);

    expect(selectedPaths).toEqual(['tests/calculator.test.ts']);
  });

  it('gives direct test changes the highest priority score (100)', () => {
    const { graph, testFiles } = buildGraphAndTests();
    const changes: GitChange[] = [
      { path: 'tests/login.test.ts', type: 'modified' },
      { path: 'src/utils/calculator.ts', type: 'modified' },
    ];

    const selection = TestSelector.selectTests(changes, testFiles, graph);
    const prioritized = TestPrioritizer.prioritize(selection.selectedTests);

    expect(prioritized[0].testPath).toBe('tests/login.test.ts');
    expect(prioritized[0].priorityScore).toBe(100);
    expect(prioritized[0].reason.type).toBe('direct-test-change');
  });
});
