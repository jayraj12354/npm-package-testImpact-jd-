import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { logger } from '../../utils/logger.js';
import { loadConfig } from '../../config/config-loader.js';
import type { ExecutionReport } from '../../types/index.js';

export async function reportCommand(options: { json?: boolean } = {}): Promise<void> {
  const rootDir = process.cwd();
  const { config } = await loadConfig(rootDir);
  const reportPath = path.resolve(rootDir, '.testimpact/reports/latest.json');

  if (!fs.existsSync(reportPath)) {
    logger.warn('No execution report found. Run `testimpact run` or `testimpact analyze` first.');
    return;
  }

  try {
    const raw = fs.readFileSync(reportPath, 'utf-8');
    const report: ExecutionReport = JSON.parse(raw);

    if (options.json || config.output.format === 'json') {
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    logger.banner();
    console.log(pc.bold(pc.cyan('LATEST EXECUTION REPORT')));
    logger.stat('Timestamp', report.timestamp);
    logger.stat('Duration', `${(report.durationMs / 1000).toFixed(2)}s`);
    logger.newline();

    logger.stat('Changed Files', report.impactResult.changedFiles.length);
    logger.stat('Affected Modules', report.impactResult.affectedModules.length);
    logger.stat('Discovered Tests', report.impactResult.discoveredTests.length);
    logger.stat('Selected Tests', pc.bold(pc.green(report.impactResult.selectedTests.length)));

    if (report.impactResult.fallback.triggered) {
      logger.newline();
      logger.warn(`Conservative Fallback was triggered: ${report.impactResult.fallback.reason}`);
    }

    if (report.impactResult.selectedTests.length > 0) {
      logger.newline();
      console.log(pc.bold('Selected Tests and Reasons:'));
      for (const t of report.impactResult.selectedTests) {
        console.log(`  • ${pc.green(t.testPath)}`);
        console.log(`    ${pc.dim('Reason:')} ${t.reason.description}`);
        if (t.reason.dependencyChain && t.reason.dependencyChain.length > 0) {
          console.log(`    ${pc.dim('Chain:')} ${t.reason.dependencyChain.join(' ➔ ')}`);
        }
      }
    }

    if (report.testRunResult) {
      logger.newline();
      logger.stat('Runner', report.testRunResult.runnerName);
      logger.stat('Tests Passed', pc.green(report.testRunResult.passedTests));
      logger.stat('Tests Failed', report.testRunResult.failedTests > 0 ? pc.red(report.testRunResult.failedTests) : pc.green(0));
      logger.stat('Exit Code', report.testRunResult.exitCode);
    }

    logger.newline();
  } catch (error) {
    logger.error(`Failed to read report: ${(error as Error).message}`);
  }
}
