import { ASTParser } from './parser.js';
import { ModuleResolver } from './module-resolver.js';
import type { ParsedModule } from '../../types/index.js';

export interface ImportAnalyzerOptions {
  rootDir?: string;
  tsConfigPath?: string;
}

export class ImportAnalyzer {
  private readonly parser: ASTParser;
  private readonly resolver: ModuleResolver;
  private readonly rootDir: string;

  constructor(options: ImportAnalyzerOptions = {}) {
    this.rootDir = options.rootDir || process.cwd();
    this.parser = new ASTParser(this.rootDir);
    this.resolver = new ModuleResolver({
      rootDir: this.rootDir,
      tsConfigPath: options.tsConfigPath,
    });
  }

  /**
   * Parses a file and resolves all of its import specifiers to project file paths.
   */
  analyzeFile(filePath: string, content?: string): ParsedModule {
    const parsed = this.parser.parseFile(filePath, content);

    for (const imp of parsed.imports) {
      const resolution = this.resolver.resolve(imp.rawSpecifier, parsed.filePath);
      imp.resolvedPath = resolution.resolvedPath;
      imp.isExternal = resolution.isExternal;
    }

    return parsed;
  }
}
