import { describe, it, expect } from 'vitest';
import { GitAnalyzer } from '../../src/core/git/git-analyzer.js';

describe('GitAnalyzer', () => {
  const analyzer = new GitAnalyzer();

  it('correctly parses porcelain v1 status with various states', () => {
    const rawStatus = [
      'M  src/app.ts',
      'A  src/newModule.ts',
      'D  src/oldModule.ts',
      'R  src/prev.ts -> src/next.ts',
      '?? tests/new.test.ts',
    ].join('\n');

    const changes = analyzer.parsePorcelainV1(rawStatus);

    expect(changes).toHaveLength(5);

    expect(changes[0]).toEqual({ path: 'src/app.ts', type: 'modified' });
    expect(changes[1]).toEqual({ path: 'src/newModule.ts', type: 'added' });
    expect(changes[2]).toEqual({ path: 'src/oldModule.ts', type: 'deleted' });
    expect(changes[3]).toEqual({
      oldPath: 'src/prev.ts',
      path: 'src/next.ts',
      type: 'renamed',
    });
    expect(changes[4]).toEqual({ path: 'tests/new.test.ts', type: 'untracked' });
  });

  it('correctly parses git diff --name-status output', () => {
    const rawDiff = [
      'M\tsrc/service.ts',
      'A\tsrc/created.ts',
      'D\tsrc/removed.ts',
      'R100\tsrc/old.ts\tsrc/renamed.ts',
    ].join('\n');

    const changes = analyzer.parseNameStatus(rawDiff);

    expect(changes).toHaveLength(4);
    expect(changes[0]).toEqual({ path: 'src/service.ts', type: 'modified' });
    expect(changes[1]).toEqual({ path: 'src/created.ts', type: 'added' });
    expect(changes[2]).toEqual({ path: 'src/removed.ts', type: 'deleted' });
    expect(changes[3]).toEqual({
      path: 'src/renamed.ts',
      oldPath: 'src/old.ts',
      type: 'renamed',
    });
  });

  it('detects current git branch or HEAD', async () => {
    const branch = await analyzer.getCurrentBranch();
    expect(typeof branch).toBe('string');
    expect(branch.length).toBeGreaterThan(0);
  });
});
