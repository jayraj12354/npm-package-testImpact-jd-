import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import type { TestRunner } from './runner-interface.js';
import type { RunnerOptions, TestRunResult } from '../../types/index.js';

export class JestAdapter implements TestRunner {
  readonly name = 'jest';

  async detect(cwd: string = process.cwd()): Promise<boolean> {
    const pkgPath = path.resolve(cwd, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        if ('jest' in deps) return true;
      } catch {
        // ignore
      }
    }
    const localBin = path.resolve(cwd, 'node_modules/.bin/jest');
    return fs.existsSync(localBin);
  }

  async run(testFiles: string[], options: RunnerOptions = {}): Promise<TestRunResult> {
    const cwd = options.cwd || process.cwd();
    const startTime = performance.now();

    if (testFiles.length === 0) {
      return {
        runnerName: this.name,
        success: true,
        exitCode: 0,
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        durationMs: 0,
        fileResults: [],
        stdout: 'No tests selected for execution.',
        stderr: '',
      };
    }

    const localBin = path.resolve(cwd, 'node_modules/.bin/jest');
    const bin = fs.existsSync(localBin) ? localBin : 'npx';
    const baseArgs = fs.existsSync(localBin) ? ['--runTestsByPath'] : ['jest', '--runTestsByPath'];

    if (options.bail) {
      baseArgs.push('--bail');
    }
    if (options.updateSnapshot) {
      baseArgs.push('-u');
    }
    if (options.extraArgs) {
      baseArgs.push(...options.extraArgs);
    }

    const fullArgs = [...baseArgs, ...testFiles];

    let stdout = '';
    let stderr = '';

    const exitCode = await new Promise<number>((resolve) => {
      const child = spawn(bin, fullArgs, {
        cwd,
        env: { ...process.env, CI: 'true', FORCE_COLOR: '1' },
        stdio: ['inherit', 'pipe', 'pipe'],
      });

      child.stdout?.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        if (options.onStdout) options.onStdout(text);
        else process.stdout.write(text);
      });

      child.stderr?.on('data', (data) => {
        const text = data.toString();
        stderr += text;
        if (options.onStderr) options.onStderr(text);
        else process.stderr.write(text);
      });

      child.on('error', (err) => {
        stderr += `\nFailed to start jest process: ${err.message}\n`;
        resolve(1);
      });

      child.on('close', (code) => {
        resolve(code ?? 0);
      });
    });

    const durationMs = Math.round(performance.now() - startTime);

    const passMatch = stderr.match(/Tests:\s+.*?(?:(\d+)\s+passed)/i) || stdout.match(/Tests:\s+.*?(?:(\d+)\s+passed)/i);
    const failMatch = stderr.match(/Tests:\s+.*?(?:(\d+)\s+failed)/i) || stdout.match(/Tests:\s+.*?(?:(\d+)\s+failed)/i);

    const passedTests = passMatch ? Number.parseInt(passMatch[1], 10) : (exitCode === 0 ? testFiles.length : 0);
    const failedTests = failMatch ? Number.parseInt(failMatch[1], 10) : (exitCode !== 0 ? 1 : 0);
    const totalTests = passedTests + failedTests;

    return {
      runnerName: this.name,
      success: exitCode === 0,
      exitCode,
      totalTests: Math.max(totalTests, testFiles.length),
      passedTests,
      failedTests,
      durationMs,
      fileResults: testFiles.map((p) => ({
        path: p,
        passed: exitCode === 0,
      })),
      stdout,
      stderr,
    };
  }
}
