import pc from 'picocolors';
import { logger } from '../../utils/logger.js';
import type { ImpactAnalysisResult, TestRunResult } from '../../types/index.js';

export class TerminalReporter {
  static reportImpactAnalysis(result: ImpactAnalysisResult, totalSteps = 4): void {
    logger.banner();

    // [1/4] GIT ANALYSIS
    logger.step(1, totalSteps, 'GIT ANALYSIS');
    const addedCount = result.changedFiles.filter((c) => c.type === 'added' || c.type === 'untracked').length;
    const deletedCount = result.changedFiles.filter((c) => c.type === 'deleted').length;
    const modifiedCount = result.changedFiles.filter((c) => c.type === 'modified' || c.type === 'renamed').length;

    logger.stat('Changed files', result.changedFiles.length);
    logger.stat('Added / untracked', addedCount);
    logger.stat('Modified / renamed', modifiedCount);
    logger.stat('Deleted files', deletedCount);

    logger.newline();

    // [2/4] DEPENDENCY ANALYSIS
    logger.step(2, totalSteps, 'DEPENDENCY ANALYSIS');
    logger.stat('Affected modules', result.affectedModules.length);
    logger.stat('Discovered tests', result.discoveredTests.length);

    logger.newline();

    // [3/4] TEST SELECTION
    logger.step(3, totalSteps, 'TEST SELECTION');
    logger.stat('Selected', pc.bold(result.selectedTests.length > 0 ? pc.green(result.selectedTests.length) : pc.yellow(0)));
    logger.stat('Not selected', pc.dim(result.unselectedTests.length));

    if (result.fallback.triggered) {
      logger.newline();
      logger.box(
        `Mode: Conservative Fallback Active\nReason: ${result.fallback.reason}\nAction: Complete test suite selected.`,
        'SAFE FALLBACK WARNING'
      );
    }

    if (result.selectedTests.length > 0) {
      logger.newline();
      console.log(pc.bold('Selected Tests and Reasons:'));
      for (const t of result.selectedTests) {
        console.log(`  • ${pc.bold(pc.cyan(t.testPath))}`);
        console.log(`    ${pc.dim('Reason:')} ${t.reason.description}`);
        if (t.reason.dependencyChain && t.reason.dependencyChain.length > 1) {
          console.log(`    ${pc.dim('Chain:')}  ${pc.dim(t.reason.dependencyChain.join(' ➔ '))}`);
        }
      }
    } else {
      logger.newline();
      logger.info('No tests selected. Code changes did not affect any testable modules.');
    }

    logger.newline();
  }

  static reportExecution(
    runResult: TestRunResult,
    totalDurationMs: number,
    totalSteps = 4
  ): void {
    logger.step(4, totalSteps, 'TEST EXECUTION');
    logger.stat('Runner', pc.cyan(runResult.runnerName));
    logger.stat('Passed', pc.green(runResult.passedTests));
    logger.stat('Failed', runResult.failedTests > 0 ? pc.red(runResult.failedTests) : pc.green(0));
    logger.stat('Exit code', runResult.exitCode === 0 ? pc.green(0) : pc.red(runResult.exitCode));

    logger.newline();
    const durationSeconds = (totalDurationMs / 1000).toFixed(2);
    logger.stat('Total execution time', `${durationSeconds} seconds`);

    logger.newline();
    if (runResult.success) {
      console.log(pc.bold(pc.bgGreen(pc.black(' RESULT: PASSED '))));
    } else {
      console.log(pc.bold(pc.bgRed(pc.white(' RESULT: FAILED '))));
    }
    logger.newline();
  }
}
