import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import pc from 'picocolors';
import { logger } from '../../utils/logger.js';
import type { TestRunnerType } from '../../types/index.js';

interface ProjectDetection {
  isTypeScript: boolean;
  runner: TestRunnerType;
  hasSrcDir: boolean;
  testFileCount: number;
}

export async function detectProjectEnvironment(rootDir: string = process.cwd()): Promise<ProjectDetection> {
  const pkgPath = path.resolve(rootDir, 'package.json');
  let pkgDeps: Record<string, string> = {};

  if (fs.existsSync(pkgPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      pkgDeps = { ...raw.dependencies, ...raw.devDependencies };
    } catch {
      // ignore JSON parse error
    }
  }

  const hasTsConfig = fs.existsSync(path.resolve(rootDir, 'tsconfig.json'));
  const isTypeScript = hasTsConfig || 'typescript' in pkgDeps;

  let runner: TestRunnerType = 'auto';
  if ('vitest' in pkgDeps) {
    runner = 'vitest';
  } else if ('jest' in pkgDeps) {
    runner = 'jest';
  }

  const hasSrcDir = fs.existsSync(path.resolve(rootDir, 'src'));

  // Discover sample test files
  const testFiles = await fg(
    ['**/*.{test,spec}.{js,jsx,ts,tsx,mjs,cjs}', '**/__tests__/**/*.{js,jsx,ts,tsx,mjs,cjs}'],
    {
      cwd: rootDir,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
      onlyFiles: true,
    }
  );

  return {
    isTypeScript,
    runner,
    hasSrcDir,
    testFileCount: testFiles.length,
  };
}

export async function initCommand(options: { force?: boolean } = {}): Promise<void> {
  logger.banner();
  const rootDir = process.cwd();

  const env = await detectProjectEnvironment(rootDir);

  logger.info('Analyzing project environment...');
  logger.stat('Language', env.isTypeScript ? pc.cyan('TypeScript') : pc.yellow('JavaScript'));
  logger.stat('Detected Test Runner', env.runner !== 'auto' ? pc.green(env.runner) : pc.dim('auto-detect'));
  logger.stat('Source Directory', env.hasSrcDir ? 'src/' : 'root (.)');
  logger.stat('Discovered Tests', `${env.testFileCount} test files`);
  logger.newline();

  const configFileName = env.isTypeScript ? 'testimpact.config.ts' : 'testimpact.config.js';
  const targetPath = path.resolve(rootDir, configFileName);

  if (fs.existsSync(targetPath) && !options.force) {
    logger.warn(`Configuration file already exists at ${pc.bold(configFileName)}.`);
    logger.info('Use --force to overwrite.');
    return;
  }

  const configContent = env.isTypeScript
    ? `import { defineConfig } from 'testimpact-jd';

export default defineConfig({
  testRunner: '${env.runner}',

  source: {
    include: ['${env.hasSrcDir ? 'src/**/*' : '**/*'}'],
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
`
    : `/** @type {import('testimpact-jd').TestImpactConfig} */
module.exports = {
  testRunner: '${env.runner}',

  source: {
    include: ['${env.hasSrcDir ? 'src/**/*' : '**/*'}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/build/**'],
  },

  tests: {
    include: [
      '**/*.test.js',
      '**/*.spec.js',
      '**/*.test.jsx',
      '**/*.spec.jsx',
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
};
`;

  fs.writeFileSync(targetPath, configContent, 'utf-8');
  logger.success(`Created configuration file: ${pc.bold(configFileName)}`);

  // Suggest gitignore entry for .testimpact cache
  const gitignorePath = path.resolve(rootDir, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
    if (!gitignoreContent.includes('.testimpact')) {
      fs.appendFileSync(gitignorePath, '\n# TestImpact cache\n.testimpact/\n');
      logger.info('Added .testimpact/ to .gitignore');
    }
  }

  logger.newline();
  logger.success(pc.bold('TestImpact-JD initialization complete!'));
  logger.info(`Run ${pc.cyan('npx testimpact run')} to analyze code changes and execute tests.`);
}
