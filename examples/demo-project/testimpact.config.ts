import { defineConfig } from 'testimpact-jd';

export default defineConfig({
  testRunner: 'vitest',

  source: {
    include: ['src/**/*'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/build/**'],
  },

  tests: {
    include: [
      '**/*.test.ts',
      '**/*.spec.ts',
      '**/*.test.tsx',
      '**/*.spec.tsx',
      '**/*.test.js',
      '**/*.spec.js',
    ],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },

  git: {
    baseBranch: 'auto',
  },

  analysis: {
    transitiveDependencies: true,
    conservativeMode: true,
  },

  fallback: {
    runAllOnAnalysisError: true,
  },

  cache: {
    enabled: true,
  },

  output: {
    format: 'pretty',
  },
});
