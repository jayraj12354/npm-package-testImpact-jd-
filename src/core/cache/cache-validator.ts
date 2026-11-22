import crypto from 'node:crypto';
import type { CacheMetadata, TestImpactConfig } from '../../types/index.js';

export const CURRENT_CACHE_VERSION = '1.0.0';

export class CacheValidator {
  /**
   * Generates a stable fingerprint of configuration options that affect dependency analysis.
   */
  static generateConfigFingerprint(config: TestImpactConfig): string {
    const relevant = {
      source: config.source,
      tests: config.tests,
      analysis: config.analysis,
      git: config.git,
    };
    return crypto.createHash('sha256').update(JSON.stringify(relevant)).digest('hex').substring(0, 16);
  }

  /**
   * Validates whether a cached metadata record is compatible with the current environment.
   */
  static isCacheValid(metadata: CacheMetadata, config: TestImpactConfig): boolean {
    if (metadata.version !== CURRENT_CACHE_VERSION) {
      return false;
    }
    const currentFingerprint = this.generateConfigFingerprint(config);
    if (metadata.configFingerprint !== currentFingerprint) {
      return false;
    }
    return true;
  }
}
