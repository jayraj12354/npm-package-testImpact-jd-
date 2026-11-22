import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs';
import { GitError } from '../../utils/errors.js';
import { normalizePath } from '../../utils/paths.js';
import type { GitChange, FileChangeType } from '../../types/index.js';

const execFileAsync = promisify(execFile);

export interface RawGitDiffOptions {
  cwd?: string;
  staged?: boolean;
  base?: string;
  target?: string;
  includeUntracked?: boolean;
}

export class GitAnalyzer {
  private readonly cwd: string;

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
  }

  /**
   * Safely executes a git command via execFile (avoiding shell injection).
   */
  async execGit(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    try {
      const { stdout, stderr } = await execFileAsync('git', args, {
        cwd: this.cwd,
        maxBuffer: 10 * 1024 * 1024,
      });
      return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: 0 };
    } catch (err: unknown) {
      const error = err as { stdout?: string; stderr?: string; code?: number; message?: string };
      return {
        stdout: (error.stdout || '').trim(),
        stderr: (error.stderr || '').trim(),
        exitCode: error.code ?? 1,
      };
    }
  }

  /**
   * Checks if the directory is inside a valid Git repository.
   */
  async isGitRepo(): Promise<boolean> {
    const res = await this.execGit(['rev-parse', '--is-inside-work-tree']);
    return res.exitCode === 0 && res.stdout === 'true';
  }

  /**
   * Gets the current branch name, or HEAD commit if detached.
   */
  async getCurrentBranch(): Promise<string> {
    const res = await this.execGit(['rev-parse', '--abbrev-ref', 'HEAD']);
    if (res.exitCode === 0 && res.stdout.length > 0) {
      return res.stdout;
    }
    const headRes = await this.execGit(['rev-parse', '--short', 'HEAD']);
    return headRes.stdout || 'HEAD';
  }

  /**
   * Detects the repository's default branch (main, master, etc.).
   */
  async detectDefaultBranch(): Promise<string> {
    // Check if origin/HEAD exists
    const originHead = await this.execGit(['symbolic-ref', 'refs/remotes/origin/HEAD']);
    if (originHead.exitCode === 0 && originHead.stdout) {
      const match = originHead.stdout.match(/origin\/(.+)$/);
      if (match && match[1]) {
        return match[1];
      }
    }

    // Check common local branches
    for (const candidate of ['main', 'master']) {
      const check = await this.execGit(['rev-parse', '--verify', candidate]);
      if (check.exitCode === 0) {
        return candidate;
      }
    }

    // Check remote branches
    for (const candidate of ['origin/main', 'origin/master']) {
      const check = await this.execGit(['rev-parse', '--verify', candidate]);
      if (check.exitCode === 0) {
        return candidate;
      }
    }

    return 'main';
  }

  /**
   * Checks whether the repository has at least one commit.
   */
  async hasCommits(): Promise<boolean> {
    const res = await this.execGit(['rev-parse', 'HEAD']);
    return res.exitCode === 0;
  }

  /**
   * Gets the top-level root directory of the Git repository.
   */
  async getTopLevel(): Promise<string> {
    const res = await this.execGit(['rev-parse', '--show-toplevel']);
    return res.exitCode === 0 && res.stdout ? res.stdout : this.cwd;
  }

  /**
   * Detects changed files based on provided options.
   */
  async getChanges(options: RawGitDiffOptions = {}): Promise<GitChange[]> {
    const isRepo = await this.isGitRepo();
    if (!isRepo) {
      throw new GitError(`Directory "${this.cwd}" is not a Git repository.`);
    }

    const topLevel = await this.getTopLevel();
    const hasCommits = await this.hasCommits();
    const changesMap = new Map<string, GitChange>();

    const recordChange = (change: GitChange) => {
      const absPath = path.isAbsolute(change.path)
        ? change.path
        : path.resolve(topLevel, change.path);
      const normalized = normalizePath(absPath, this.cwd);

      changesMap.set(normalized, {
        ...change,
        path: normalized,
        oldPath: change.oldPath
          ? normalizePath(path.resolve(topLevel, change.oldPath), this.cwd)
          : undefined,
      });
    };

    // If repository has no commits yet, all non-ignored files are untracked / added
    if (!hasCommits) {
      const statusRes = await this.execGit(['status', '--porcelain=v1']);
      if (statusRes.exitCode === 0 && statusRes.stdout) {
        this.parsePorcelainV1(statusRes.stdout).forEach(recordChange);
      }
      return Array.from(changesMap.values());
    }

    // Branch comparison mode (e.g. --base main or PR comparison)
    if (options.base) {
      const target = options.target || 'HEAD';
      const diffArgs = ['diff', '--name-status', `${options.base}...${target}`];
      let diffRes = await this.execGit(diffArgs);

      // Fallback to two-dot diff if triple-dot fails (e.g. shallow clone or detached)
      if (diffRes.exitCode !== 0) {
        diffRes = await this.execGit(['diff', '--name-status', options.base, target]);
      }

      if (diffRes.exitCode === 0 && diffRes.stdout) {
        this.parseNameStatus(diffRes.stdout).forEach(recordChange);
      } else if (diffRes.exitCode !== 0) {
        throw new GitError(`Failed to diff against base "${options.base}": ${diffRes.stderr}`);
      }

      // Also include working-tree changes unless specifically comparing commits
      if (options.includeUntracked) {
        const untracked = await this.getUntrackedFiles();
        untracked.forEach(recordChange);
      }

      return Array.from(changesMap.values());
    }

    // Staged only mode
    if (options.staged) {
      const stagedRes = await this.execGit(['diff', '--name-status', '--cached']);
      if (stagedRes.exitCode === 0 && stagedRes.stdout) {
        this.parseNameStatus(stagedRes.stdout).forEach(recordChange);
      }
      return Array.from(changesMap.values());
    }

    // Normal working-tree mode: unstaged modified + staged + untracked
    const unstagedRes = await this.execGit(['diff', '--name-status']);
    if (unstagedRes.exitCode === 0 && unstagedRes.stdout) {
      this.parseNameStatus(unstagedRes.stdout).forEach(recordChange);
    }

    const cachedRes = await this.execGit(['diff', '--name-status', '--cached']);
    if (cachedRes.exitCode === 0 && cachedRes.stdout) {
      this.parseNameStatus(cachedRes.stdout).forEach(recordChange);
    }

    if (options.includeUntracked !== false) {
      const untracked = await this.getUntrackedFiles();
      untracked.forEach(recordChange);
    }

    return Array.from(changesMap.values());
  }

  /**
   * Retrieves untracked files using `git status --porcelain=v1`.
   */
  async getUntrackedFiles(): Promise<GitChange[]> {
    const res = await this.execGit(['status', '--porcelain=v1', '-uall']);
    if (res.exitCode !== 0 || !res.stdout) {
      return [];
    }

    const untracked: GitChange[] = [];
    const lines = res.stdout.split('\n');

    for (const line of lines) {
      if (line.startsWith('?? ')) {
        const rawPath = line.substring(3).trim();
        // Remove surrounding quotes if git added them
        const cleanPath = rawPath.replace(/^"|"$/g, '');
        untracked.push({
          path: cleanPath,
          type: 'untracked',
        });
      }
    }

    return untracked;
  }

  /**
   * Parses output from `git diff --name-status`.
   */
  parseNameStatus(output: string): GitChange[] {
    const changes: GitChange[] = [];
    const lines = output.split('\n').filter((l) => l.trim().length > 0);

    for (const line of lines) {
      const parts = line.split('\t');
      if (parts.length < 2) continue;

      const statusCode = parts[0].trim();
      const firstPath = parts[1].replace(/^"|"$/g, '');

      if (statusCode.startsWith('R') && parts.length >= 3) {
        // Rename: R100 oldPath newPath
        const newPath = parts[2].replace(/^"|"$/g, '');
        changes.push({
          path: newPath,
          oldPath: firstPath,
          type: 'renamed',
        });
      } else if (statusCode.startsWith('A')) {
        changes.push({ path: firstPath, type: 'added' });
      } else if (statusCode.startsWith('D')) {
        changes.push({ path: firstPath, type: 'deleted' });
      } else if (statusCode.startsWith('M')) {
        changes.push({ path: firstPath, type: 'modified' });
      } else {
        changes.push({ path: firstPath, type: 'modified' });
      }
    }

    return changes;
  }

  /**
   * Parses output from `git status --porcelain=v1`.
   */
  parsePorcelainV1(output: string): GitChange[] {
    const changes: GitChange[] = [];
    const lines = output.split('\n').filter((l) => l.trim().length > 0);

    for (const line of lines) {
      const status = line.substring(0, 2);
      const rest = line.substring(3).trim();

      if (status === '??') {
        changes.push({ path: rest.replace(/^"|"$/g, ''), type: 'untracked' });
        continue;
      }

      if (status.includes('R') && rest.includes(' -> ')) {
        const [oldP, newP] = rest.split(' -> ');
        changes.push({
          oldPath: oldP.replace(/^"|"$/g, ''),
          path: newP.replace(/^"|"$/g, ''),
          type: 'renamed',
        });
        continue;
      }

      const cleanPath = rest.replace(/^"|"$/g, '');
      if (status.includes('D')) {
        changes.push({ path: cleanPath, type: 'deleted' });
      } else if (status.includes('A')) {
        changes.push({ path: cleanPath, type: 'added' });
      } else {
        changes.push({ path: cleanPath, type: 'modified' });
      }
    }

    return changes;
  }
}
