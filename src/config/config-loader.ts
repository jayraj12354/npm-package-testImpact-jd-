import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DEFAULT_CONFIG } from './defaults.js';
import { validateConfig } from './config-validator.js';
import type { TestImpactConfig, UserConfig } from '../types/index.js';
import { logger } from '../utils/logger.js';

const CONFIG_FILENAMES = [
  'testimpact.config.ts',
  'testimpact.config.js',
  'testimpact.config.mjs',
  'testimpact.config.cjs',
];

/**
 * Deep merges user config with default configuration.
 */
function mergeConfig(defaults: TestImpactConfig, userConfig: UserConfig): TestImpactConfig {
  return {
    testRunner: userConfig.testRunner ?? defaults.testRunner,
    source: {
      include: userConfig.source?.include ?? defaults.source.include,
      exclude: userConfig.source?.exclude ?? defaults.source.exclude,
    },
    tests: {
      include: userConfig.tests?.include ?? defaults.tests.include,
      exclude: userConfig.tests?.exclude ?? defaults.tests.exclude,
    },
    git: {
      baseBranch: userConfig.git?.baseBranch ?? defaults.git.baseBranch,
      targetBranch: userConfig.git?.targetBranch ?? defaults.git.targetBranch,
      untracked: userConfig.git?.untracked ?? defaults.git.untracked,
    },
    analysis: {
      transitiveDependencies:
        userConfig.analysis?.transitiveDependencies ?? defaults.analysis.transitiveDependencies,
      conservativeMode:
        userConfig.analysis?.conservativeMode ?? defaults.analysis.conservativeMode,
    },
    fallback: {
      runAllOnAnalysisError:
        userConfig.fallback?.runAllOnAnalysisError ?? defaults.fallback.runAllOnAnalysisError,
      runAllOnDynamicImports:
        userConfig.fallback?.runAllOnDynamicImports ?? defaults.fallback.runAllOnDynamicImports,
      runAllOnConfigChange:
        userConfig.fallback?.runAllOnConfigChange ?? defaults.fallback.runAllOnConfigChange,
    },
    cache: {
      enabled: userConfig.cache?.enabled ?? defaults.cache.enabled,
      directory: userConfig.cache?.directory ?? defaults.cache.directory,
    },
    output: {
      format: userConfig.output?.format ?? defaults.output.format,
      verbose: userConfig.output?.verbose ?? defaults.output.verbose,
      quiet: userConfig.output?.quiet ?? defaults.output.quiet,
    },
  };
}

/**
 * Finds and loads the project's testimpact configuration file.
 */
export async function loadConfig(rootDir: string = process.cwd()): Promise<{
  config: TestImpactConfig;
  configPath?: string;
}> {
  let foundFile: string | undefined;

  for (const filename of CONFIG_FILENAMES) {
    const candidate = path.resolve(rootDir, filename);
    if (fs.existsSync(candidate)) {
      foundFile = candidate;
      break;
    }
  }

  if (!foundFile) {
    logger.debug('No testimpact config file found, using defaults.');
    return { config: DEFAULT_CONFIG };
  }

  logger.debug(`Loading config from ${foundFile}`);

  try {
    let rawConfig: unknown;

    if (foundFile.endsWith('.ts')) {
      // For TypeScript config, we can read dynamically or transpile using ts API if needed
      // If executing under Node with tsx/loader or pre-transpiled, dynamic import works.
      // Let's transpile in-memory using TypeScript compiler API for reliable zero-dependency loading.
      const tsContent = fs.readFileSync(foundFile, 'utf-8');
      const ts = await import('typescript');
      const transpiled = ts.default.transpileModule(tsContent, {
        compilerOptions: {
          module: ts.default.ModuleKind.ESNext,
          target: ts.default.ScriptTarget.ES2022,
        },
      });

      // Write temporary mjs file or use data uri
      const base64 = Buffer.from(transpiled.outputText).toString('base64');
      const dataUri = `data:text/javascript;base64,${base64}`;
      const mod = await import(dataUri);
      rawConfig = mod.default ?? mod;
    } else {
      const fileUrl = pathToFileURL(foundFile).href;
      const mod = await import(fileUrl);
      rawConfig = mod.default ?? mod;
    }

    validateConfig(rawConfig);
    const merged = mergeConfig(DEFAULT_CONFIG, rawConfig as UserConfig);
    return { config: merged, configPath: foundFile };
  } catch (error) {
    logger.warn(`Failed to parse config file ${foundFile}: ${(error as Error).message}. Falling back to default configuration.`);
    return { config: DEFAULT_CONFIG, configPath: foundFile };
  }
}
