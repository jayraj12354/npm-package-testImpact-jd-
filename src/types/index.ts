export type TestRunnerType = 'auto' | 'vitest' | 'jest';

export type OutputFormat = 'pretty' | 'json';

export interface SourceConfig {
  include: string[];
  exclude: string[];
}

export interface TestsConfig {
  include: string[];
  exclude: string[];
}

export interface GitConfig {
  baseBranch?: string;
  targetBranch?: string;
  untracked?: boolean;
}

export interface AnalysisConfig {
  transitiveDependencies: boolean;
  conservativeMode: boolean;
}

export interface FallbackConfig {
  runAllOnAnalysisError: boolean;
  runAllOnDynamicImports: boolean;
  runAllOnConfigChange: boolean;
}

export interface CacheConfig {
  enabled: boolean;
  directory?: string;
}

export interface OutputConfig {
  format: OutputFormat;
  verbose?: boolean;
  quiet?: boolean;
}

export interface TestImpactConfig {
  testRunner: TestRunnerType;
  source: SourceConfig;
  tests: TestsConfig;
  git: GitConfig;
  analysis: AnalysisConfig;
  fallback: FallbackConfig;
  cache: CacheConfig;
  output: OutputConfig;
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? U[]
    : T[P] extends object
      ? DeepPartial<T[P]>
      : T[P];
};

export type UserConfig = DeepPartial<TestImpactConfig>;

export type FileChangeType = 'added' | 'modified' | 'deleted' | 'renamed' | 'untracked';

export interface GitChange {
  path: string;
  oldPath?: string;
  type: FileChangeType;
}

export interface GitStatusResult {
  isGitRepo: boolean;
  branch?: string;
  baseCommit?: string;
  targetCommit?: string;
  changes: GitChange[];
  hasUncommittedChanges: boolean;
}

export type ImportKind =
  | 'es-import'
  | 'es-named'
  | 'es-default'
  | 'es-namespace'
  | 'es-reexport'
  | 'cjs-require'
  | 'dynamic-import'
  | 'type-import';

export interface ParsedImport {
  rawSpecifier: string;
  resolvedPath?: string;
  kind: ImportKind;
  isDynamic: boolean;
  isExternal: boolean;
  isTypeOnly: boolean;
}

export interface ParsedModule {
  filePath: string;
  contentHash: string;
  imports: ParsedImport[];
  exports: string[];
  hasUnresolvableDynamicImport: boolean;
  syntaxErrors: string[];
}

export interface DependencyGraph {
  // filePath -> Set of filePaths that this module imports
  forward: Map<string, Set<string>>;
  // filePath -> Set of filePaths that import this module
  reverse: Map<string, Set<string>>;
  modules: Map<string, ParsedModule>;
}

export interface TestFile {
  path: string;
  directImports: string[];
  resolvedImports: string[];
}

export interface SelectionReason {
  type: 'direct-test-change' | 'direct-import' | 'transitive-import' | 'fallback' | 'all-flag';
  description: string;
  dependencyChain?: string[];
}

export interface ImpactedTest {
  testPath: string;
  reason: SelectionReason;
  priorityScore: number;
}

export interface FallbackInfo {
  triggered: boolean;
  reason?: string;
  code?: 'DYNAMIC_IMPORT' | 'SYNTAX_ERROR' | 'CONFIG_CHANGED' | 'CACHE_CORRUPT' | 'ANALYSIS_ERROR' | 'UNKNOWN';
}

export interface ImpactAnalysisResult {
  changedFiles: GitChange[];
  affectedModules: string[];
  discoveredTests: string[];
  selectedTests: ImpactedTest[];
  unselectedTests: string[];
  fallback: FallbackInfo;
  durationMs: number;
}

export interface RunnerOptions {
  cwd?: string;
  bail?: boolean;
  updateSnapshot?: boolean;
  extraArgs?: string[];
  onStdout?: (data: string) => void;
  onStderr?: (data: string) => void;
}

export interface TestFileExecutionResult {
  path: string;
  passed: boolean;
  durationMs?: number;
  failureMessage?: string;
}

export interface TestRunResult {
  runnerName: string;
  success: boolean;
  exitCode: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  durationMs: number;
  fileResults: TestFileExecutionResult[];
  stdout: string;
  stderr: string;
}

export interface CacheMetadata {
  version: string;
  updatedAt: number;
  configFingerprint: string;
  nodeVersion: string;
}

export interface CacheEntry {
  contentHash: string;
  resolvedImports: string[];
  hasUnresolvableDynamicImport: boolean;
}

export interface CacheData {
  metadata: CacheMetadata;
  files: Record<string, CacheEntry>;
  testFiles: Record<string, string[]>;
}

export interface ExecutionReport {
  timestamp: string;
  durationMs: number;
  impactResult: ImpactAnalysisResult;
  testRunResult?: TestRunResult;
}
