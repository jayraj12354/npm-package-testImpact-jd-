import { describe, it, expect } from 'vitest';
import { validateConfig } from '../../src/config/config-validator.js';
import { DEFAULT_CONFIG } from '../../src/config/defaults.js';
import { ConfigError } from '../../src/utils/errors.js';

describe('Configuration System', () => {
  it('validates correct default configuration', () => {
    expect(() => validateConfig(DEFAULT_CONFIG)).not.toThrow();
  });

  it('rejects invalid test runner', () => {
    expect(() =>
      validateConfig({
        testRunner: 'mocha-unknown' as any,
      })
    ).toThrow(ConfigError);
  });

  it('rejects non-array source include', () => {
    expect(() =>
      validateConfig({
        source: {
          include: 'src/**/*' as any,
        },
      })
    ).toThrow(ConfigError);
  });

  it('rejects invalid output format', () => {
    expect(() =>
      validateConfig({
        output: {
          format: 'xml' as any,
        },
      })
    ).toThrow(ConfigError);
  });
});
