# TestImpact-JD

> **Test Smarter. Ship Faster.**

[![npm version](https://img.shields.io/npm/v/testimpact-jd.svg)](https://www.npmjs.com/package/testimpact-jd)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

An intelligent test selection engine for JavaScript and TypeScript projects. TestImpact-JD analyzes source-code dependencies and Git changes to identify and execute only the tests affected by your modifications—without sacrificing test reliability.

---

## Why TestImpact-JD?

Running an entire test suite on every single code change wastes valuable engineering time and slows down CI pipelines. However, manually guessing which tests to run risks missing broken functionality.

**TestImpact-JD solves this:**
- Operates alongside your existing test runner (Vitest, Jest).
- Uses the TypeScript Compiler API to construct an accurate, directed dependency graph.
- Traces reverse dependencies transitively from changed files to impacted tests.
- Provides a **Safe Fallback System**: when dynamic imports or global configurations change, it automatically runs the full test suite so you never ship undetected regressions.

---

## Quick Start

### 1. Install
```bash
npm install -D testimpact-jd
```

### 2. Initialize
```bash
npx testimpact init
```
This inspects your project, detects your test runner (Vitest or Jest) and TypeScript configuration, and generates `testimpact.config.ts`.

### 3. Run
```bash
npx testimpact run
```
TestImpact-JD detects your uncommitted Git changes, traces affected modules, and runs only the relevant tests.

---

## CLI Commands

| Command | Description |
| :--- | :--- |
| `testimpact run` | Analyze changes and execute affected tests |
| `testimpact run --all` | Run the complete test suite |
| `testimpact run --staged` | Analyze only staged Git changes |
| `testimpact run --base <branch>` | Compare against a base branch (e.g. `main` or `origin/main`) |
| `testimpact analyze` | Perform impact analysis without running tests |
| `testimpact report` | View latest impact and execution report |
| `testimpact status` | View project environment, runner, and cache status |
| `testimpact cache clear` | Clear dependency cache |

---

## Configuration (`testimpact.config.ts`)

```typescript
import { defineConfig } from 'testimpact-jd';

export default defineConfig({
  // 'auto' | 'vitest' | 'jest'
  testRunner: 'auto',

  source: {
    include: ['src/**/*'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },

  tests: {
    include: [
      '**/*.test.ts',
      '**/*.spec.ts',
      '**/*.test.js',
      '**/*.spec.js',
    ],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },

  git: {
    baseBranch: 'auto',
    untracked: true,
  },

  analysis: {
    transitiveDependencies: true,
    conservativeMode: true,
  },

  fallback: {
    runAllOnAnalysisError: true,
    runAllOnDynamicImports: true,
    runAllOnConfigChange: true,
  },

  cache: {
    enabled: true,
    directory: '.testimpact/cache',
  },

  output: {
    format: 'pretty', // 'pretty' | 'json'
  },
});
```

---

## How It Works

1. **Git Change Detection**: Discovers added, modified, renamed, and unstaged/staged files via safe subprocess Git commands.
2. **AST Dependency Extraction**: Parses imports (`import`, `require`, dynamic `import()`, re-exports, type imports) using TypeScript's AST parser.
3. **Directed Dependency Graph**: Builds forward (`file -> dependencies`) and reverse (`file -> dependents`) adjacency structures. Handles circular dependencies seamlessly.
4. **Impact Traversal**: Performs breadth-first traversal on the reverse dependency graph to identify all modules affected by modified code.
5. **Safe Fallback**: If an unresolvable dynamic expression (`import(pathVar)`) or global config file (`package.json`, `tsconfig.json`) changes, conservative fallback automatically activates.
6. **Execution & Reporting**: Runs selected test files through the configured runner and outputs human-readable explanations or JSON logs.

---

## CI/CD Integration (GitHub Actions)

Add this workflow to `.github/workflows/testimpact.yml`:

```yaml
name: TestImpact CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - name: Run Impacted Tests
        run: npx testimpact run --base origin/main
```

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on code style, tests, and pull requests.

## License

MIT © [Jayraj Rajesh Deshmukh](LICENSE)
