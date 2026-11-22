import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import type { ParsedImport, ParsedModule, ImportKind } from '../../types/index.js';
import { normalizePath } from '../../utils/paths.js';

export class ASTParser {
  private readonly rootDir: string;

  constructor(rootDir: string = process.cwd()) {
    this.rootDir = rootDir;
  }

  /**
   * Computes SHA-256 hash of file content.
   */
  computeHash(content: string): string {
    return crypto.createHash('sha256').update(content, 'utf-8').digest('hex');
  }

  /**
   * Determines ScriptKind from file path.
   */
  private getScriptKind(filePath: string): ts.ScriptKind {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.ts':
      case '.mts':
      case '.cts':
        return ts.ScriptKind.TS;
      case '.tsx':
        return ts.ScriptKind.TSX;
      case '.js':
      case '.mjs':
      case '.cjs':
        return ts.ScriptKind.JS;
      case '.jsx':
        return ts.ScriptKind.JSX;
      case '.json':
        return ts.ScriptKind.JSON;
      default:
        return ts.ScriptKind.Unknown;
    }
  }

  /**
   * Parses a source file into a ParsedModule structure.
   */
  parseFile(filePath: string, content?: string): ParsedModule {
    const normalized = normalizePath(filePath, this.rootDir);
    const absPath = path.isAbsolute(filePath) ? filePath : path.resolve(this.rootDir, filePath);

    if (content === undefined) {
      if (!fs.existsSync(absPath)) {
        return {
          filePath: normalized,
          contentHash: '',
          imports: [],
          exports: [],
          hasUnresolvableDynamicImport: false,
          syntaxErrors: ['File does not exist on disk'],
        };
      }
      content = fs.readFileSync(absPath, 'utf-8');
    }

    const contentHash = this.computeHash(content);
    const scriptKind = this.getScriptKind(filePath);

    if (scriptKind === ts.ScriptKind.JSON) {
      return {
        filePath: normalized,
        contentHash,
        imports: [],
        exports: [],
        hasUnresolvableDynamicImport: false,
        syntaxErrors: [],
      };
    }

    let sourceFile: ts.SourceFile;
    try {
      sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true,
        scriptKind
      );
    } catch (err) {
      return {
        filePath: normalized,
        contentHash,
        imports: [],
        exports: [],
        hasUnresolvableDynamicImport: false,
        syntaxErrors: [(err as Error).message],
      };
    }

    const imports: ParsedImport[] = [];
    const exports: string[] = [];
    let hasUnresolvableDynamicImport = false;
    const syntaxErrors: string[] = [];

    // Traverse AST nodes
    const visit = (node: ts.Node) => {
      // 1. ES Import Declaration: import ... from 'specifier'
      if (ts.isImportDeclaration(node)) {
        const isTypeOnly = Boolean(node.importClause?.isTypeOnly);
        if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
          const rawSpecifier = node.moduleSpecifier.text;
          let kind: ImportKind = 'es-import';

          if (node.importClause) {
            if (node.importClause.name) {
              kind = 'es-default';
            } else if (
              node.importClause.namedBindings &&
              ts.isNamespaceImport(node.importClause.namedBindings)
            ) {
              kind = 'es-namespace';
            } else if (
              node.importClause.namedBindings &&
              ts.isNamedImports(node.importClause.namedBindings)
            ) {
              kind = 'es-named';
            }
          }

          imports.push({
            rawSpecifier,
            kind: isTypeOnly ? 'type-import' : kind,
            isDynamic: false,
            isExternal: false,
            isTypeOnly,
          });
        }
      }

      // 2. ES Export Declaration: export ... from 'specifier'
      else if (ts.isExportDeclaration(node)) {
        if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
          const rawSpecifier = node.moduleSpecifier.text;
          const isTypeOnly = Boolean(node.isTypeOnly);
          imports.push({
            rawSpecifier,
            kind: 'es-reexport',
            isDynamic: false,
            isExternal: false,
            isTypeOnly,
          });
        }
        if (node.exportClause && ts.isNamedExports(node.exportClause)) {
          for (const el of node.exportClause.elements) {
            exports.push(el.name.text);
          }
        }
      }

      // 3. Named exports without specifier (e.g. export const foo = ...)
      else if (ts.isFunctionDeclaration(node) && node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
        if (node.name) exports.push(node.name.text);
      } else if (ts.isVariableStatement(node) && node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
        for (const decl of node.declarationList.declarations) {
          if (ts.isIdentifier(decl.name)) {
            exports.push(decl.name.text);
          }
        }
      }

      // 4. CommonJS require('specifier') and dynamic import('specifier')
      else if (ts.isCallExpression(node)) {
        // require('...')
        if (
          ts.isIdentifier(node.expression) &&
          node.expression.text === 'require' &&
          node.arguments.length === 1
        ) {
          const arg = node.arguments[0];
          if (ts.isStringLiteral(arg)) {
            imports.push({
              rawSpecifier: arg.text,
              kind: 'cjs-require',
              isDynamic: false,
              isExternal: false,
              isTypeOnly: false,
            });
          } else {
            hasUnresolvableDynamicImport = true;
          }
        }

        // dynamic import(...)
        else if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
          if (node.arguments.length >= 1) {
            const arg = node.arguments[0];
            if (ts.isStringLiteral(arg)) {
              imports.push({
                rawSpecifier: arg.text,
                kind: 'dynamic-import',
                isDynamic: true,
                isExternal: false,
                isTypeOnly: false,
              });
            } else {
              // Non-string dynamic import: import(variable) -> cannot be statically analyzed!
              hasUnresolvableDynamicImport = true;
            }
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    return {
      filePath: normalized,
      contentHash,
      imports,
      exports,
      hasUnresolvableDynamicImport,
      syntaxErrors,
    };
  }
}
