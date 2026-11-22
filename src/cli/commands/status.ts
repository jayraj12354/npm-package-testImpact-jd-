import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { logger } from '../../utils/logger.js';
import { loadConfig } from '../../config/config-loader.js';
import { detectProjectEnvironment } from './init.js';

export async function statusCommand(): Promise<void> {
  logger.banner();
  const rootDir = process.cwd();
  const { config, configPath } = await loadConfig(rootDir);
  const env = await detectProjectEnvironment(rootDir);

  logger.step(1, 2, 'PROJECT ENVIRONMENT');
  logger.stat('Root Directory', rootDir);
  logger.stat('Configuration', configPath ? pc.green(path.basename(configPath)) : pc.yellow('defaults (no file)'));
  logger.stat('Language', env.isTypeScript ? pc.cyan('TypeScript') : pc.yellow('JavaScript'));
  logger.stat('Configured Runner', pc.bold(config.testRunner));
  logger.stat('Detected Runner', pc.green(env.runner));
  logger.stat('Discovered Tests', `${env.testFileCount} test files`);

  logger.newline();
  logger.step(2, 2, 'CACHE STATUS');
  const cacheDir = path.resolve(rootDir, config.cache.directory ?? '.testimpact/cache');
  const cacheExists = fs.existsSync(cacheDir);
  logger.stat('Cache Enabled', config.cache.enabled ? pc.green('yes') : pc.red('no'));
  logger.stat('Cache Path', pc.dim(cacheDir));
  logger.stat('Cache Present', cacheExists ? pc.green('yes') : pc.dim('no (cold)'));

  logger.newline();
}
