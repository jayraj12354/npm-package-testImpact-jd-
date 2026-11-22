import { ConfigError } from '../utils/errors.js';
import type { UserConfig } from '../types/index.js';

export function validateConfig(config: unknown): asserts config is UserConfig {
  if (typeof config !== 'object' || config === null) {
    throw new ConfigError('Configuration must be an object.');
  }

  const c = config as Record<string, unknown>;

  if (c.testRunner !== undefined) {
    const validRunners = ['auto', 'vitest', 'jest'];
    if (typeof c.testRunner !== 'string' || !validRunners.includes(c.testRunner)) {
      throw new ConfigError(
        `Invalid testRunner "${String(c.testRunner)}". Expected one of: ${validRunners.join(', ')}`
      );
    }
  }

  if (c.source !== undefined) {
    if (typeof c.source !== 'object' || c.source === null) {
      throw new ConfigError('config.source must be an object.');
    }
    const src = c.source as Record<string, unknown>;
    if (src.include !== undefined && !Array.isArray(src.include)) {
      throw new ConfigError('config.source.include must be an array of glob strings.');
    }
    if (src.exclude !== undefined && !Array.isArray(src.exclude)) {
      throw new ConfigError('config.source.exclude must be an array of glob strings.');
    }
  }

  if (c.tests !== undefined) {
    if (typeof c.tests !== 'object' || c.tests === null) {
      throw new ConfigError('config.tests must be an object.');
    }
    const t = c.tests as Record<string, unknown>;
    if (t.include !== undefined && !Array.isArray(t.include)) {
      throw new ConfigError('config.tests.include must be an array of glob strings.');
    }
    if (t.exclude !== undefined && !Array.isArray(t.exclude)) {
      throw new ConfigError('config.tests.exclude must be an array of glob strings.');
    }
  }

  if (c.output !== undefined) {
    if (typeof c.output !== 'object' || c.output === null) {
      throw new ConfigError('config.output must be an object.');
    }
    const out = c.output as Record<string, unknown>;
    if (out.format !== undefined && out.format !== 'pretty' && out.format !== 'json') {
      throw new ConfigError('config.output.format must be either "pretty" or "json".');
    }
  }
}
