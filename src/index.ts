import type { UserConfig } from './types/index.js';

/**
 * Type-safe configuration helper for testimpact.config.ts
 */
export function defineConfig(config: UserConfig): UserConfig {
  return config;
}

export * from './types/index.js';
export * from './utils/errors.js';
export * from './utils/paths.js';
export * from './utils/logger.js';
export * from './config/config-loader.js';
export * from './config/config-validator.js';
export * from './config/defaults.js';
export * from './core/git/git-analyzer.js';
export * from './core/git/change-detector.js';
export * from './core/parser/parser.js';
export * from './core/parser/module-resolver.js';
export * from './core/parser/import-analyzer.js';
export * from './core/graph/dependency-graph.js';
export * from './core/graph/graph-traversal.js';
export * from './core/graph/reverse-graph.js';
export * from './core/discovery/test-discovery.js';
export * from './core/impact/test-mapper.js';
export * from './core/impact/test-selector.js';
export * from './core/impact/test-prioritizer.js';
export * from './core/impact/impact-analyzer.js';
export * from './core/fallback/fallback-manager.js';
export * from './core/runners/runner-interface.js';
export * from './core/runners/vitest-adapter.js';
export * from './core/runners/jest-adapter.js';
export * from './core/runners/runner-detector.js';
export * from './core/cache/cache-manager.js';
export * from './core/cache/cache-validator.js';
export * from './core/reporting/terminal-reporter.js';
export * from './core/reporting/json-reporter.js';
