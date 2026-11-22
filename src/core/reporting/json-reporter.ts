import fs from 'node:fs';
import path from 'node:path';
import type {
  ExecutionReport,
  ImpactAnalysisResult,
  TestRunResult,
} from '../../types/index.js';
import { logger } from '../../utils/logger.js';

export class JsonReporter {
  private readonly reportsDir: string;

  constructor(rootDir: string = process.cwd()) {
    this.reportsDir = path.resolve(rootDir, '.testimpact/reports');
  }

  /**
   * Generates and saves execution report to .testimpact/reports/latest.json
   */
  saveReport(impactResult: ImpactAnalysisResult, testRunResult?: TestRunResult): ExecutionReport {
    const report: ExecutionReport = {
      timestamp: new Date().toISOString(),
      durationMs: impactResult.durationMs + (testRunResult?.durationMs || 0),
      impactResult,
      testRunResult,
    };

    try {
      fs.mkdirSync(this.reportsDir, { recursive: true });
      const latestPath = path.join(this.reportsDir, 'latest.json');
      fs.writeFileSync(latestPath, JSON.stringify(report, null, 2), 'utf-8');
    } catch (err) {
      logger.warn(`Failed to save report: ${(err as Error).message}`);
    }

    return report;
  }
}
