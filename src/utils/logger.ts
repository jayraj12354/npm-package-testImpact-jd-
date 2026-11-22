import pc from 'picocolors';

export interface LoggerOptions {
  verbose?: boolean;
  quiet?: boolean;
}

export class Logger {
  private verbose: boolean;
  private quiet: boolean;

  constructor(options: LoggerOptions = {}) {
    this.verbose = Boolean(options.verbose);
    this.quiet = Boolean(options.quiet);
  }

  setVerbose(verbose: boolean): void {
    this.verbose = verbose;
  }

  setQuiet(quiet: boolean): void {
    this.quiet = quiet;
  }

  banner(): void {
    if (this.quiet) return;
    const line = pc.cyan('═'.repeat(44));
    console.log(pc.cyan('╔' + '═'.repeat(44) + '╗'));
    console.log(pc.cyan('║') + pc.bold(pc.white('               TESTIMPACT-JD                ')) + pc.cyan('║'));
    console.log(pc.cyan('║') + pc.dim('        Test Smarter. Ship Faster.          ') + pc.cyan('║'));
    console.log(pc.cyan('╚' + '═'.repeat(44) + '╝'));
    console.log();
  }

  step(current: number, total: number, title: string): void {
    if (this.quiet) return;
    console.log(pc.bold(pc.blue(`[${current}/${total}] `)) + pc.bold(title.toUpperCase()));
  }

  info(message: string): void {
    if (this.quiet) return;
    console.log(`  ${pc.cyan('ℹ')} ${message}`);
  }

  success(message: string): void {
    if (this.quiet) return;
    console.log(`  ${pc.green('✔')} ${message}`);
  }

  warn(message: string): void {
    console.warn(`  ${pc.yellow('⚠')} ${pc.yellow(message)}`);
  }

  error(message: string): void {
    console.error(`  ${pc.red('✖')} ${pc.red(pc.bold(message))}`);
  }

  debug(message: string): void {
    if (this.verbose && !this.quiet) {
      console.log(`  ${pc.dim('🔍 [debug]')} ${pc.dim(message)}`);
    }
  }

  stat(label: string, value: string | number): void {
    if (this.quiet) return;
    const padded = (label + ':').padEnd(24, ' ');
    console.log(`  ${pc.dim(padded)} ${pc.bold(pc.white(String(value)))}`);
  }

  box(text: string, title?: string): void {
    if (this.quiet) return;
    const lines = text.split('\n');
    const width = Math.max(...lines.map((l) => l.length), title ? title.length + 4 : 0, 40);
    const top = title
      ? pc.yellow(`┌─ ${pc.bold(title)} ${'─'.repeat(Math.max(0, width - title.length - 4))}┐`)
      : pc.yellow(`┌${'─'.repeat(width + 2)}┐`);
    console.log(top);
    for (const line of lines) {
      console.log(pc.yellow('│ ') + line.padEnd(width) + pc.yellow(' │'));
    }
    console.log(pc.yellow(`└${'─'.repeat(width + 2)}┘`));
  }

  divider(): void {
    if (this.quiet) return;
    console.log(pc.dim('─'.repeat(50)));
  }

  newline(): void {
    if (this.quiet) return;
    console.log();
  }
}

export const logger = new Logger();
