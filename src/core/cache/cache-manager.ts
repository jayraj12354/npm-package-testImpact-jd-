import fs from 'node:fs';
import path from 'node:path';
import { CacheValidator, CURRENT_CACHE_VERSION } from './cache-validator.js';
import type { CacheData, TestImpactConfig } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

export class CacheManager {
  private readonly cacheDir: string;
  private readonly config: TestImpactConfig;

  constructor(config: TestImpactConfig, rootDir: string = process.cwd()) {
    this.config = config;
    this.cacheDir = path.resolve(rootDir, config.cache.directory || '.testimpact/cache');
  }

  /**
   * Loads cache from disk if caching is enabled and cache is valid.
   */
  loadCache(): CacheData | null {
    if (!this.config.cache.enabled) {
      return null;
    }

    const metadataPath = path.join(this.cacheDir, 'metadata.json');
    const depsPath = path.join(this.cacheDir, 'dependencies.json');
    const testsPath = path.join(this.cacheDir, 'tests.json');

    if (!fs.existsSync(metadataPath) || !fs.existsSync(depsPath)) {
      return null;
    }

    try {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      if (!CacheValidator.isCacheValid(metadata, this.config)) {
        logger.debug('Cache invalid or configuration changed; rebuilding cache.');
        return null;
      }

      const files = JSON.parse(fs.readFileSync(depsPath, 'utf-8'));
      const testFiles = fs.existsSync(testsPath)
        ? JSON.parse(fs.readFileSync(testsPath, 'utf-8'))
        : {};

      return {
        metadata,
        files,
        testFiles,
      };
    } catch (err) {
      logger.warn(`Failed to read cache: ${(err as Error).message}. Rebuilding cache.`);
      return null;
    }
  }

  /**
   * Saves cache to disk atomically.
   */
  saveCache(data: Omit<CacheData, 'metadata'>): void {
    if (!this.config.cache.enabled) {
      return;
    }

    try {
      fs.mkdirSync(this.cacheDir, { recursive: true });

      const metadata = {
        version: CURRENT_CACHE_VERSION,
        updatedAt: Date.now(),
        configFingerprint: CacheValidator.generateConfigFingerprint(this.config),
        nodeVersion: process.version,
      };

      fs.writeFileSync(path.join(this.cacheDir, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf-8');
      fs.writeFileSync(path.join(this.cacheDir, 'dependencies.json'), JSON.stringify(data.files, null, 2), 'utf-8');
      fs.writeFileSync(path.join(this.cacheDir, 'tests.json'), JSON.stringify(data.testFiles, null, 2), 'utf-8');
    } catch (err) {
      logger.warn(`Failed to write cache: ${(err as Error).message}`);
    }
  }

  /**
   * Clears the cache directory.
   */
  clear(): void {
    if (fs.existsSync(this.cacheDir)) {
      fs.rmSync(this.cacheDir, { recursive: true, force: true });
    }
  }
}
