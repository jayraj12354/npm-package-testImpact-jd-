import { describe, it, expect } from 'vitest';
import { ASTParser } from '../../src/core/parser/parser.js';

describe('ASTParser', () => {
  const parser = new ASTParser();

  it('parses ES module imports correctly', () => {
    const code = `
      import defaultExport from './service';
      import { namedA, namedB as aliasB } from './utils';
      import * as allThings from './helpers';
      import type { UserType } from './types';
    `;
    const result = parser.parseFile('test.ts', code);

    expect(result.syntaxErrors).toHaveLength(0);
    expect(result.hasUnresolvableDynamicImport).toBe(false);
    expect(result.imports).toHaveLength(4);

    const defaultImp = result.imports.find((i) => i.rawSpecifier === './service');
    expect(defaultImp?.kind).toBe('es-default');
    expect(defaultImp?.isTypeOnly).toBe(false);

    const namedImp = result.imports.find((i) => i.rawSpecifier === './utils');
    expect(namedImp?.kind).toBe('es-named');

    const nsImp = result.imports.find((i) => i.rawSpecifier === './helpers');
    expect(nsImp?.kind).toBe('es-namespace');

    const typeImp = result.imports.find((i) => i.rawSpecifier === './types');
    expect(typeImp?.isTypeOnly).toBe(true);
  });

  it('parses re-exports and named exports', () => {
    const code = `
      export * from './all';
      export { one, two } from './specific';
      export const myVar = 42;
      export function myFunc() {}
    `;
    const result = parser.parseFile('index.ts', code);

    expect(result.imports).toHaveLength(2);
    expect(result.imports[0].kind).toBe('es-reexport');
    expect(result.exports).toContain('one');
    expect(result.exports).toContain('two');
    expect(result.exports).toContain('myVar');
    expect(result.exports).toContain('myFunc');
  });

  it('parses CommonJS require() calls', () => {
    const code = `
      const fs = require('node:fs');
      const math = require('./math');
    `;
    const result = parser.parseFile('app.cjs', code);

    expect(result.imports).toHaveLength(2);
    expect(result.imports[0].kind).toBe('cjs-require');
    expect(result.imports[1].rawSpecifier).toBe('./math');
  });

  it('parses static dynamic imports and flags dynamic expressions', () => {
    const staticCode = `
      async function load() {
        const mod = await import('./lazy-module');
      }
    `;
    const staticResult = parser.parseFile('loader.ts', staticCode);
    expect(staticResult.imports).toHaveLength(1);
    expect(staticResult.imports[0].kind).toBe('dynamic-import');
    expect(staticResult.imports[0].rawSpecifier).toBe('./lazy-module');
    expect(staticResult.hasUnresolvableDynamicImport).toBe(false);

    const dynamicExprCode = `
      async function load(name: string) {
        const mod = await import('./plugins/' + name);
      }
    `;
    const dynamicResult = parser.parseFile('plugin-loader.ts', dynamicExprCode);
    expect(dynamicResult.hasUnresolvableDynamicImport).toBe(true);
  });

  it('computes deterministic SHA-256 content hashes', () => {
    const contentA = 'const x = 1;';
    const contentB = 'const x = 2;';
    const hashA1 = parser.computeHash(contentA);
    const hashA2 = parser.computeHash(contentA);
    const hashB = parser.computeHash(contentB);

    expect(hashA1).toBe(hashA2);
    expect(hashA1).not.toBe(hashB);
  });
});
