import { GitAnalyzer } from './git-analyzer.js';
import type { GitConfig, GitStatusResult, GitChange } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

export interface DetectChangesOptions {
  cwd?: string;
  staged?: boolean;
  base?: string;
  target?: string;
  untracked?: boolean;
}

export class ChangeDetector {
  private readonly git: GitAnalyzer;

  constructor(cwd: string = process.cwd()) {
    this.git = new GitAnalyzer(cwd);
  }

  async detect(config: GitConfig = {}, options: DetectChangesOptions = {}): Promise<GitStatusResult> {
    const isRepo = await this.git.isGitRepo();
    if (!isRepo) {
      logger.debug('Not in a git repository.');
      return {
        isGitRepo: false,
        changes: [],
        hasUncommittedChanges: false,
      };
    }

    const currentBranch = await this.git.getCurrentBranch();

    let baseBranch = options.base || config.baseBranch;
    if (baseBranch === 'auto') {
      baseBranch = undefined;
    }

    const includeUntracked = options.untracked ?? config.untracked ?? true;

    try {
      const changes = await this.git.getChanges({
        staged: options.staged,
        base: baseBranch,
        target: options.target,
        includeUntracked,
      });

      return {
        isGitRepo: true,
        branch: currentBranch,
        baseCommit: baseBranch,
        targetCommit: options.target,
        changes,
        hasUncommittedChanges: changes.length > 0,
      };
    } catch (error) {
      logger.warn(`Git detection encountered an issue: ${(error as Error).message}`);
      return {
        isGitRepo: true,
        branch: currentBranch,
        changes: [],
        hasUncommittedChanges: false,
      };
    }
  }
}
