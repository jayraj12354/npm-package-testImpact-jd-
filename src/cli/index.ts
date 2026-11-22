import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { statusCommand } from './commands/status.js';
import { reportCommand } from './commands/report.js';
import { clearCacheCommand } from './commands/cache.js';
import { runCommand } from './commands/run.js';
import { analyzeCommand } from './commands/analyze.js';

const program = new Command();

program
  .name('testimpact')
  .description('TestImpact-JD: Intelligent Test Selection Engine — Test Smarter. Ship Faster.')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize TestImpact-JD configuration in the current project')
  .option('-f, --force', 'Overwrite existing configuration file')
  .action(async (options) => {
    await initCommand(options);
  });

program
  .command('run')
  .description('Analyze code changes and execute affected tests')
  .option('-a, --all', 'Execute the complete test suite regardless of changes')
  .option('-s, --staged', 'Analyze only staged Git changes')
  .option('-b, --base <base>', 'Base Git branch or commit to compare against')
  .option('-t, --target <target>', 'Target Git commit (defaults to HEAD)')
  .option('--bail', 'Stop running tests on the first test failure')
  .option('-v, --verbose', 'Enable verbose debug logging')
  .option('-q, --quiet', 'Suppress non-essential output')
  .option('--json', 'Output results as JSON')
  .action(async (options) => {
    await runCommand(options);
  });

program
  .command('analyze')
  .description('Analyze impacted tests without executing them')
  .option('-a, --all', 'Select all tests')
  .option('-s, --staged', 'Analyze only staged Git changes')
  .option('-b, --base <base>', 'Base Git branch or commit to compare against')
  .option('-t, --target <target>', 'Target Git commit (defaults to HEAD)')
  .option('-v, --verbose', 'Enable verbose debug logging')
  .option('-q, --quiet', 'Suppress non-essential output')
  .option('--json', 'Output impact analysis as JSON')
  .action(async (options) => {
    await analyzeCommand(options);
  });

program
  .command('report')
  .description('Display the latest test impact execution report')
  .option('--json', 'Display raw JSON report')
  .action(async (options) => {
    await reportCommand(options);
  });

program
  .command('status')
  .description('Display project configuration, detected runner, and cache status')
  .action(async () => {
    await statusCommand();
  });

const cacheCmd = program.command('cache').description('Manage TestImpact cache');

cacheCmd
  .command('clear')
  .description('Clear the dependency and analysis cache')
  .action(async () => {
    await clearCacheCommand();
  });

program.parseAsync(process.argv).catch((error) => {
  console.error(error);
  process.exit(1);
});
