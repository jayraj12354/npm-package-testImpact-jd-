import { describe, it, expect } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { ModuleResolver } from '../../src/core/parser/module-resolver.js';

describe('ModuleResolver', () => {
  const fixtureDir = path.resolve(process.cwd(), 'tests/fixtures/resolver-fixture');

  // Setup temporary fixture files for resolution tests
  beforeAll(() => {
    fs.mkdirSync(path.join(fixtureDir, 'src/utils'), { recursive: true });
    fs.mkdirSync(path.join(fixtureDir, 'src/components/button'), { recursive: true });

    fs.writeFileSync(path.join(fixtureDir, 'src/utils/math.ts'), 'export const add = 1;');
    fs.writeFileSync(path.join(fixtureDir, 'src/utils/string.js'), 'export const str = "";');
    fs.writeFileSync(path.join(fixtureDir, 'src/components/button/index.tsx'), 'export const Btn = 1;');
    fs.writeFileSync(path.join(fixtureDir, 'src/service.ts'), 'export const s = 1;');

    const tsConfig = {
      compilerOptions: {
        baseUrl: '.',
        paths: {
          '@/*': ['src/*'],
          '@components/*': ['src/components/*'],
        },
      },
    };
    fs.writeFileSync(path.join(fixtureDir, 'tsconfig.json'), JSON.stringify(tsConfig));
  });

  afterAll(() => {
    if (fs.existsSync(fixtureDir)) {
      fs.rmSync(fixtureDir, { recursive: true, force: true });
    }
  });

  it('resolves relative file paths with automatic extension probing', () => {
    const resolver = new ModuleResolver({ rootDir: fixtureDir });

    const res1 = resolver.resolve('./utils/math', 'src/app.ts');
    expect(res1.isExternal).toBe(false);
    expect(res1.resolvedPath).toBe('src/utils/math.ts');

    const res2 = resolver.resolve('./utils/string', 'src/app.ts');
    expect(res2.isExternal).toBe(false);
    expect(res2.resolvedPath).toBe('src/utils/string.js');
  });

  it('resolves directory index files', () => {
    const resolver = new ModuleResolver({ rootDir: fixtureDir });

    const res = resolver.resolve('./components/button', 'src/app.ts');
    expect(res.isExternal).toBe(false);
    expect(res.resolvedPath).toBe('src/components/button/index.tsx');
  });

  it('resolves TypeScript path aliases (@/* and @components/*)', () => {
    const resolver = new ModuleResolver({ rootDir: fixtureDir });

    const res1 = resolver.resolve('@/utils/math', 'src/any.ts');
    expect(res1.isExternal).toBe(false);
    expect(res1.resolvedPath).toBe('src/utils/math.ts');

    const res2 = resolver.resolve('@components/button', 'src/any.ts');
    expect(res2.isExternal).toBe(false);
    expect(res2.resolvedPath).toBe('src/components/button/index.tsx');
  });

  it('identifies external npm packages and node built-ins', () => {
    const resolver = new ModuleResolver({ rootDir: fixtureDir });

    const ext1 = resolver.resolve('react', 'src/app.ts');
    expect(ext1.isExternal).toBe(true);
    expect(ext1.resolvedPath).toBeUndefined();

    const ext2 = resolver.resolve('node:path', 'src/app.ts');
    expect(ext2.isExternal).toBe(true);

    const ext3 = resolver.resolve('fs', 'src/app.ts');
    expect(ext3.isExternal).toBe(true);
  });
});
