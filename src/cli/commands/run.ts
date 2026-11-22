import { performance } from 'node:perf_hooks';
import { logger } from '../../utils/logger.js';
import { loadConfig } from '../../config/config-loader.js';
import { ImpactAnalyzer } from '../../core/impact/impact-analyzer.js';
import { resolveTestRunner } from '../../core/runners/runner-detector.js';
import { TerminalReporter } from '../../core/reporting/terminal-reporter.js';
import { JsonReporter } from '../../core/reporting/json-reporter.js';
import type { TestRunResult } from '../../types/index.js';

export interface RunOptions {
  all?: boolean;
  staged?: boolean;
  base?: string;
  target?: string;
  bail?: boolean;
  verbose?: boolean;
  quiet?: boolean;
  json?: boolean;
}

export async function runCommand(options: RunOptions = {}): Promise<void> {
  const startOverall = performance.now();
  const { config } = await loadConfig();

  if (options.verbose) logger.setVerbose(true);
  if (options.quiet || options.json || config.output.format === 'json') {
    logger.setQuiet(true);
  }

  const analyzer = new ImpactAnalyzer(config);
  const impactResult = await analyzer.analyze({
    all: options.all,
    staged: options.staged,
    base: options.base,
    target: options.target,
  });

  if (!options.json && config.output.format !== 'json') {
    TerminalReporter.reportImpactAnalysis(impactResult, 4);
  }

  let testRunResult: TestRunResult;

  if (impactResult.selectedTests.length === 0) {
    testRunResult = {
      runnerName: config.testRunner,
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
  } else {
    const runner = await resolveTestRunner(config.testRunner);
    const testFilesToRun = impactResult.selectedTests.map((t) => t.testPath);

    testRunResult = await runner.run(testFilesToRun, {
      bail: options.bail,
    });
  }

  const totalDurationMs = Math.round(performance.now() - startOverall);

  const jsonReporter = new JsonReporter();
  const report = jsonReporter.saveReport(impactResult, testRunResult);

  if (options.json || config.output.format === 'json') {
    console.log(JSON.stringify(report, null, 2));
  } else if (impactResult.selectedTests.length > 0) {
    TerminalReporter.reportExecution(testRunResult, totalDurationMs, 4);
  }

  if (testRunResult.exitCode !== 0) {
    process.exit(testRunResult.exitCode);
  }
}
