import { logger } from '../../utils/logger.js';
import { loadConfig } from '../../config/config-loader.js';
import { ImpactAnalyzer } from '../../core/impact/impact-analyzer.js';
import { TerminalReporter } from '../../core/reporting/terminal-reporter.js';
import { JsonReporter } from '../../core/reporting/json-reporter.js';

export interface AnalyzeOptions {
  all?: boolean;
  staged?: boolean;
  base?: string;
  target?: string;
  verbose?: boolean;
  quiet?: boolean;
  json?: boolean;
}

export async function analyzeCommand(options: AnalyzeOptions = {}): Promise<void> {
  const { config } = await loadConfig();

  if (options.verbose) logger.setVerbose(true);
  if (options.quiet || options.json || config.output.format === 'json') {
    logger.setQuiet(true);
  }

  const analyzer = new ImpactAnalyzer(config);
  const result = await analyzer.analyze({
    all: options.all,
    staged: options.staged,
    base: options.base,
    target: options.target,
  });

  const jsonReporter = new JsonReporter();
  const report = jsonReporter.saveReport(result);

  if (options.json || config.output.format === 'json') {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  TerminalReporter.reportImpactAnalysis(result, 3);
}
