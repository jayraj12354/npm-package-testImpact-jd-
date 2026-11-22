import { describe, it, expect } from 'vitest';
import { FallbackManager } from '../../src/core/fallback/fallback-manager.js';
import { DEFAULT_CONFIG } from '../../src/config/defaults.js';
import type { ParsedModule, GitChange } from '../../src/types/index.js';

describe('FallbackManager', () => {
  const dummyModules = new Map<string, ParsedModule>();

  it('triggers fallback when --all flag is passed', () => {
    const res = FallbackManager.evaluate({
      all: true,
      isGitRepo: true,
      changedFiles: [],
      parsedModules: dummyModules,
      config: DEFAULT_CONFIG,
    });

    expect(res.triggered).toBe(true);
    expect(res.reason).toContain('--all');
  });

  it('triggers fallback when directory is not a Git repo', () => {
    const res = FallbackManager.evaluate({
      all: false,
      isGitRepo: false,
      changedFiles: [],
      parsedModules: dummyModules,
      config: DEFAULT_CONFIG,
    });

    expect(res.triggered).toBe(true);
    expect(res.reason).toContain('not a Git repository');
  });

  it('triggers fallback when package.json or tsconfig.json is modified', () => {
    const changes: GitChange[] = [{ path: 'package.json', type: 'modified' }];

    const res = FallbackManager.evaluate({
      all: false,
      isGitRepo: true,
      changedFiles: changes,
      parsedModules: dummyModules,
      config: DEFAULT_CONFIG,
    });

    expect(res.triggered).toBe(true);
    expect(res.code).toBe('CONFIG_CHANGED');
  });

  it('triggers fallback when an unresolvable dynamic import is detected in a changed file', () => {
    const dynamicMod: ParsedModule = {
      filePath: 'src/dynamic.ts',
      contentHash: 'hash',
      imports: [],
      exports: [],
      hasUnresolvableDynamicImport: true,
      syntaxErrors: [],
    };
    const map = new Map<string, ParsedModule>([['src/dynamic.ts', dynamicMod]]);
    const changes: GitChange[] = [{ path: 'src/dynamic.ts', type: 'modified' }];

    const res = FallbackManager.evaluate({
      all: false,
      isGitRepo: true,
      changedFiles: changes,
      parsedModules: map,
      config: DEFAULT_CONFIG,
    });

    expect(res.triggered).toBe(true);
    expect(res.code).toBe('DYNAMIC_IMPORT');
  });

  it('does NOT trigger fallback on safe, normal code changes', () => {
    const normalMod: ParsedModule = {
      filePath: 'src/user.ts',
      contentHash: 'hash',
      imports: [],
      exports: ['User'],
      hasUnresolvableDynamicImport: false,
      syntaxErrors: [],
    };
    const map = new Map<string, ParsedModule>([['src/user.ts', normalMod]]);
    const changes: GitChange[] = [{ path: 'src/user.ts', type: 'modified' }];

    const res = FallbackManager.evaluate({
      all: false,
      isGitRepo: true,
      changedFiles: changes,
      parsedModules: map,
      config: DEFAULT_CONFIG,
    });

    expect(res.triggered).toBe(false);
  });
});
