import fs from 'node:fs';
import path from 'node:path';
import { isBuiltin } from 'node:module';
import { normalizePath } from '../../utils/paths.js';

export interface ModuleResolverOptions {
  rootDir: string;
  tsConfigPath?: string;
}

export interface TsConfigPaths {
  baseUrl?: string;
  paths?: Record<string, string[]>;
}

const EXTENSIONS = [
  '.ts',
  '.tsx',
  '.d.ts',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.mts',
  '.cts',
  '.json',
];

export class ModuleResolver {
  private readonly rootDir: string;
  private tsConfigPaths?: TsConfigPaths;

  constructor(options: ModuleResolverOptions) {
    this.rootDir = options.rootDir;
    this.tsConfigPaths = this.loadTsConfigPaths(options.tsConfigPath);
  }

  private loadTsConfigPaths(tsConfigPath?: string): TsConfigPaths | undefined {
    const targetPath = tsConfigPath || path.resolve(this.rootDir, 'tsconfig.json');
    if (!fs.existsSync(targetPath)) return undefined;

    try {
      const raw = fs.readFileSync(targetPath, 'utf-8');
      // Strip comments for basic json parsing
      const stripped = raw.replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, '$1');
      const parsed = JSON.parse(stripped);
      const compilerOptions = parsed.compilerOptions || {};
      return {
        baseUrl: compilerOptions.baseUrl,
        paths: compilerOptions.paths,
      };
    } catch {
      return undefined;
    }
  }

  /**
   * Resolves a module specifier from a referencing file to a disk file path.
   * Returns normalized relative path if resolved, or undefined if external / unresolvable.
   */
  resolve(specifier: string, fromFile: string): { resolvedPath?: string; isExternal: boolean } {
    if (isBuiltin(specifier) || specifier.startsWith('node:')) {
      return { isExternal: true };
    }

    const fromDir = path.dirname(path.resolve(this.rootDir, fromFile));

    // 1. Relative imports: ./ or ../
    if (specifier.startsWith('./') || specifier.startsWith('../') || specifier === '.' || specifier === '..') {
      const candidatePath = path.resolve(fromDir, specifier);
      const resolved = this.probeFile(candidatePath);
      if (resolved) {
        return {
          resolvedPath: normalizePath(resolved, this.rootDir),
          isExternal: false,
        };
      }
      return { isExternal: false };
    }

    // 2. TypeScript path aliases (e.g. @/* or components/*)
    if (this.tsConfigPaths?.paths) {
      const baseDir = this.tsConfigPaths.baseUrl
        ? path.resolve(this.rootDir, this.tsConfigPaths.baseUrl)
        : this.rootDir;

      for (const [pattern, targets] of Object.entries(this.tsConfigPaths.paths)) {
        const starIdx = pattern.indexOf('*');
        if (starIdx !== -1) {
          const prefix = pattern.substring(0, starIdx);
          const suffix = pattern.substring(starIdx + 1);

          if (specifier.startsWith(prefix) && specifier.endsWith(suffix)) {
            const wildcardContent = specifier.slice(prefix.length, specifier.length - suffix.length);

            for (const target of targets) {
              const targetReplaced = target.replace('*', wildcardContent);
              const candidate = path.resolve(baseDir, targetReplaced);
              const resolved = this.probeFile(candidate);
              if (resolved) {
                return {
                  resolvedPath: normalizePath(resolved, this.rootDir),
                  isExternal: false,
                };
              }
            }
          }
        } else if (specifier === pattern) {
          for (const target of targets) {
            const candidate = path.resolve(baseDir, target);
            const resolved = this.probeFile(candidate);
            if (resolved) {
              return {
                resolvedPath: normalizePath(resolved, this.rootDir),
                isExternal: false,
              };
            }
          }
        }
      }
    }

    // 3. baseUrl resolution without paths
    if (this.tsConfigPaths?.baseUrl) {
      const candidate = path.resolve(this.rootDir, this.tsConfigPaths.baseUrl, specifier);
      const resolved = this.probeFile(candidate);
      if (resolved) {
        return {
          resolvedPath: normalizePath(resolved, this.rootDir),
          isExternal: false,
        };
      }
    }

    // Specifier is an external npm package (e.g. 'react', 'lodash')
    return { isExternal: true };
  }

  /**
   * Probes candidate file paths checking extensions and /index files.
   */
  private probeFile(basePath: string): string | undefined {
    // Exact file check
    if (fs.existsSync(basePath) && fs.statSync(basePath).isFile()) {
      return basePath;
    }

    // TypeScript NodeNext / ESM support: probe .ts/.tsx when import has .js/.jsx extension
    if (basePath.endsWith('.js')) {
      const tsCandidate = basePath.slice(0, -3) + '.ts';
      if (fs.existsSync(tsCandidate) && fs.statSync(tsCandidate).isFile()) {
        return tsCandidate;
      }
      const tsxCandidate = basePath.slice(0, -3) + '.tsx';
      if (fs.existsSync(tsxCandidate) && fs.statSync(tsxCandidate).isFile()) {
        return tsxCandidate;
      }
    }
    if (basePath.endsWith('.jsx')) {
      const tsxCandidate = basePath.slice(0, -4) + '.tsx';
      if (fs.existsSync(tsxCandidate) && fs.statSync(tsxCandidate).isFile()) {
        return tsxCandidate;
      }
    }
    if (basePath.endsWith('.mjs')) {
      const mtsCandidate = basePath.slice(0, -4) + '.mts';
      if (fs.existsSync(mtsCandidate) && fs.statSync(mtsCandidate).isFile()) {
        return mtsCandidate;
      }
    }
    if (basePath.endsWith('.cjs')) {
      const ctsCandidate = basePath.slice(0, -4) + '.cts';
      if (fs.existsSync(ctsCandidate) && fs.statSync(ctsCandidate).isFile()) {
        return ctsCandidate;
      }
    }

    // Check with extensions (.ts, .tsx, .js, etc.)
    for (const ext of EXTENSIONS) {
      const withExt = basePath + ext;
      if (fs.existsSync(withExt) && fs.statSync(withExt).isFile()) {
        return withExt;
      }
    }

    // Check directory index (basePath/index.ts, etc.)
    if (fs.existsSync(basePath) && fs.statSync(basePath).isDirectory()) {
      for (const ext of EXTENSIONS) {
        const indexFile = path.join(basePath, 'index' + ext);
        if (fs.existsSync(indexFile) && fs.statSync(indexFile).isFile()) {
          return indexFile;
        }
      }
    }

    return undefined;
  }
}
