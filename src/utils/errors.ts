export class TestImpactError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'TestImpactError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class GitError extends TestImpactError {
  constructor(message: string, public readonly originalError?: unknown) {
    super(message, 'GIT_ERROR');
    this.name = 'GitError';
  }
}

export class ConfigError extends TestImpactError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR');
    this.name = 'ConfigError';
  }
}

export class RunnerError extends TestImpactError {
  constructor(message: string, public readonly exitCode: number = 1) {
    super(message, 'RUNNER_ERROR');
    this.name = 'RunnerError';
  }
}

export class ParserError extends TestImpactError {
  constructor(message: string, public readonly filePath?: string) {
    super(message, 'PARSER_ERROR');
    this.name = 'ParserError';
  }
}
