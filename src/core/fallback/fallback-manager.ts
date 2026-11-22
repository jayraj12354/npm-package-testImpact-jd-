import type {
  FallbackInfo,
  GitChange,
  TestImpactConfig,
  ParsedModule,
} from '../../types/index.js';

export interface EvaluateFallbackOptions {
  all?: boolean;
  isGitRepo: boolean;
  changedFiles: GitChange[];
  parsedModules: Map<string, ParsedModule>;
  config: TestImpactConfig;
}

const GLOBAL_CONFIG_PATTERNS = [
  'package.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'tsconfig.json',
  'testimpact.config.ts',
  'testimpact.config.js',
  'testimpact.config.mjs',
  'testimpact.config.cjs',
  'vitest.config.ts',
  'vitest.config.js',
  'jest.config.ts',
  'jest.config.js',
];

export class FallbackManager {
  static evaluate(options: EvaluateFallbackOptions): FallbackInfo {
    const { all, isGitRepo, changedFiles, parsedModules, config } = options;

    // 1. Explicit --all flag
    if (all) {
      return {
        triggered: true,
        code: 'UNKNOWN',
        reason: 'Complete test suite requested via --all flag.',
      };
    }

    // 2. Not a git repository
    if (!isGitRepo) {
      return {
        triggered: true,
        code: 'UNKNOWN',
        reason: 'Directory is not a Git repository; running complete test suite for safety.',
      };
    }

    // 3. Global configuration file changes
    if (config.fallback.runAllOnConfigChange) {
      for (const change of changedFiles) {
        const basename = change.path.split('/').pop() || change.path;
        if (GLOBAL_CONFIG_PATTERNS.includes(basename)) {
          return {
            triggered: true,
            code: 'CONFIG_CHANGED',
            reason: `Global configuration file "${change.path}" was modified. Dependencies or build settings may have changed globally.`,
          };
        }
      }
    }

    // 4. Syntax errors or unresolvable dynamic imports in changed files
    for (const change of changedFiles) {
      const mod = parsedModules.get(change.path);
      if (!mod) continue;

      if (config.fallback.runAllOnAnalysisError && mod.syntaxErrors.length > 0) {
        return {
          triggered: true,
          code: 'SYNTAX_ERROR',
          reason: `Syntax error in changed file "${change.path}": ${mod.syntaxErrors[0]}`,
        };
      }

      if (config.fallback.runAllOnDynamicImports && mod.hasUnresolvableDynamicImport) {
        return {
          triggered: true,
          code: 'DYNAMIC_IMPORT',
          reason: `Unresolvable dynamic import in changed file "${change.path}". Dependencies cannot be safely proven via static analysis.`,
        };
      }
    }

    return {
      triggered: false,
    };
  }
}
