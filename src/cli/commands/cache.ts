import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { logger } from '../../utils/logger.js';
import { loadConfig } from '../../config/config-loader.js';

export async function clearCacheCommand(): Promise<void> {
  const { config } = await loadConfig();
  const cacheDir = path.resolve(process.cwd(), config.cache.directory ?? '.testimpact/cache');

  if (fs.existsSync(cacheDir)) {
    fs.rmSync(cacheDir, { recursive: true, force: true });
    logger.success(`Cleared TestImpact cache at ${pc.dim(cacheDir)}`);
  } else {
    logger.info(`Cache directory does not exist: ${pc.dim(cacheDir)}`);
  }
}
