import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { CacheManager } from '../../src/core/cache/cache-manager.js';
import { CacheValidator } from '../../src/core/cache/cache-validator.js';
import { DEFAULT_CONFIG } from '../../src/config/defaults.js';

describe('CacheManager & CacheValidator', () => {
  const testDir = path.resolve(process.cwd(), 'tests/fixtures/cache-test');

  beforeEach(() => {
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('saves and loads cache entries correctly', () => {
    const config = {
      ...DEFAULT_CONFIG,
      cache: { enabled: true, directory: path.join(testDir, '.testimpact/cache') },
    };

    const manager = new CacheManager(config, testDir);

    manager.saveCache({
      files: {
        'src/app.ts': {
          contentHash: 'hash123',
          resolvedImports: ['src/utils.ts'],
          hasUnresolvableDynamicImport: false,
        },
      },
      testFiles: {
        'tests/app.test.ts': ['src/app.ts'],
      },
    });

    const loaded = manager.loadCache();
    expect(loaded).not.toBeNull();
    expect(loaded?.files['src/app.ts'].contentHash).toBe('hash123');
    expect(loaded?.testFiles['tests/app.test.ts']).toEqual(['src/app.ts']);
  });

  it('invalidates cache when configuration fingerprint changes', () => {
    const configA = {
      ...DEFAULT_CONFIG,
      cache: { enabled: true, directory: path.join(testDir, '.testimpact/cache') },
    };

    const managerA = new CacheManager(configA, testDir);
    managerA.saveCache({
      files: {},
      testFiles: {},
    });

    // Modified config (different source globs)
    const configB = {
      ...configA,
      source: {
        include: ['lib/**/*'],
        exclude: [],
      },
    };

    const managerB = new CacheManager(configB, testDir);
    const loaded = managerB.loadCache();
    expect(loaded).toBeNull();
  });

  it('clears cache successfully with clear()', () => {
    const config = {
      ...DEFAULT_CONFIG,
      cache: { enabled: true, directory: path.join(testDir, '.testimpact/cache') },
    };

    const manager = new CacheManager(config, testDir);
    manager.saveCache({ files: {}, testFiles: {} });
    expect(fs.existsSync(config.cache.directory)).toBe(true);

    manager.clear();
    expect(fs.existsSync(config.cache.directory)).toBe(false);
  });
});
