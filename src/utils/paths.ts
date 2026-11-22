import path from 'node:path';

/**
 * Normalizes a file path to POSIX format (forward slashes) relative to a base directory.
 * Ensures consistent graph keys across Windows, macOS, and Linux.
 */
export function normalizePath(filePath: string, rootDir: string = process.cwd()): string {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(rootDir, filePath);
  const relative = path.relative(rootDir, absolutePath);
  // Convert Windows backslashes to forward slashes
  const posixPath = relative.split(path.sep).join('/');
  return posixPath.length === 0 ? '.' : posixPath;
}

/**
 * Converts a POSIX normalized path back to an absolute system path.
 */
export function toAbsolutePath(relativePath: string, rootDir: string = process.cwd()): string {
  if (path.isAbsolute(relativePath)) {
    return relativePath;
  }
  return path.resolve(rootDir, relativePath);
}

/**
 * Checks if a path is inside another directory
 */
export function isPathInside(childPath: string, parentPath: string): boolean {
  const rel = path.relative(parentPath, childPath);
  return !rel.startsWith('..') && !path.isAbsolute(rel);
}
