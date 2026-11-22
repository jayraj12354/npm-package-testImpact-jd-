import type { TestImpactConfig } from '../types/index.js';

export const DEFAULT_CONFIG: TestImpactConfig = {
  testRunner: 'auto',
  source: {
    include: ['src/**/*.{js,jsx,ts,tsx,mjs,cjs}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.git/**',
      '**/.testimpact/**',
    ],
  },
  tests: {
    include: [
      '**/*.test.{js,jsx,ts,tsx,mjs,cjs}',
      '**/*.spec.{js,jsx,ts,tsx,mjs,cjs}',
      '**/__tests__/**/*.{js,jsx,ts,tsx,mjs,cjs}',
      '**/test/**/*.{js,jsx,ts,tsx,mjs,cjs}',
      '**/tests/**/*.{js,jsx,ts,tsx,mjs,cjs}',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.git/**',
      '**/.testimpact/**',
    ],
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
    format: 'pretty',
    verbose: false,
    quiet: false,
  },
};
