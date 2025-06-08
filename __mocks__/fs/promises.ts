// __mocks__/fs/promises.ts
import type * as fs from 'fs'; // For PathLike, Dirent types etc.
import { jest } from '@jest/globals';

// Internal state for the mock's helper functions
let __internalMockFiles: Record<string, string> = {};
let __internalMockError: Error | null = null;
let __internalMockDirentObjects: fs.Dirent[] = [];

// Helper functions
export const __setMockFiles = (newMockFiles: Record<string, string>, error?: Error | null) => {
  __internalMockFiles = { ...newMockFiles };
  __internalMockError = error || null;
};

export const __clearMockFiles = () => {
  __internalMockFiles = {};
  __internalMockError = null;
  __internalMockDirentObjects = [];
  // Reset Jest mocks themselves
  readFile.mockReset();
  writeFile.mockReset();
  mkdir.mockReset();
  readdir.mockReset();
  stat.mockReset();
};

export const __setMockError = (error: Error | null) => {
  __internalMockError = error;
};

export const __getMockFiles = (): Record<string, string> => {
  return __internalMockFiles;
};

export const __setMockDirentObjects = (dirents: fs.Dirent[]) => {
  __internalMockDirentObjects = dirents;
};

// Mocked fs functions as named exports
export const readFile = jest.fn(async (filePath: fs.PathLike | number, options?: any): Promise<string | Buffer> => {
  if (__internalMockError) throw __internalMockError;
  const pathStr = filePath.toString();
  if (Object.prototype.hasOwnProperty.call(__internalMockFiles, pathStr)) {
    const content = __internalMockFiles[pathStr];
    if (options && (typeof options === 'string' ? options === 'buffer' : options.encoding === 'buffer')) {
        return Buffer.from(content);
    }
    return content;
  }
  const error: any = new Error(`ENOENT: no such file or directory, open '${pathStr}'`);
  error.code = 'ENOENT';
  throw error;
});

export const writeFile = jest.fn(async (filePath: fs.PathLike | number, data: string | Buffer, options?: any): Promise<void> => {
  if (__internalMockError) throw __internalMockError;
  const pathStr = filePath.toString();
  __internalMockFiles[pathStr] = data.toString();
  return Promise.resolve();
});

export const mkdir = jest.fn(async (dirPath: fs.PathLike, options?: fs.MakeDirectoryOptions): Promise<string | undefined> => {
  if (__internalMockError) throw __internalMockError;
  return Promise.resolve(options?.recursive ? dirPath.toString() : undefined);
});

export const readdir = jest.fn(async (dirPath: fs.PathLike, options?: any): Promise<string[] | fs.Dirent[]> => {
  if (__internalMockError) throw __internalMockError;
  if (options?.withFileTypes) {
    return Promise.resolve([...__internalMockDirentObjects]);
  }
  return Promise.resolve(__internalMockDirentObjects.map(dirent => dirent.name));
});

export const stat = jest.fn(async (filePath: fs.PathLike, opts?: {bigint?: boolean}): Promise<fs.Stats | fs.BigIntStats> => {
    if (__internalMockError) throw __internalMockError;
    const pathStr = filePath.toString();
    if (Object.prototype.hasOwnProperty.call(__internalMockFiles, pathStr) || __internalMockDirentObjects.some(d => d.name === pathStr)) {
        const isDirectory = __internalMockDirentObjects.some(d => d.name === pathStr && d.isDirectory());
        const isFile = !isDirectory;
        return Promise.resolve({
            isFile: () => isFile, isDirectory: () => isDirectory,
            isBlockDevice: () => false, isCharacterDevice: () => false, isSymbolicLink: () => false,
            isFIFO: () => false, isSocket: () => false,
            dev: 0, ino: 0, mode: 0, nlink: 0, uid: 0, gid: 0, rdev: 0,
            size: Object.prototype.hasOwnProperty.call(__internalMockFiles, pathStr) ? __internalMockFiles[pathStr].length : 0,
            blksize: 4096, blocks: 1,
            atimeMs: Date.now(), mtimeMs: Date.now(), ctimeMs: Date.now(), birthtimeMs: Date.now(),
            atime: new Date(), mtime: new Date(), ctime: new Date(), birthtime: new Date(),
        } as fs.Stats);
    }
    const error: any = new Error(`ENOENT: no such file or directory, stat '${pathStr}'`);
    error.code = 'ENOENT';
    throw error;
});

// No default export needed if all are named and tests import them by name.
// However, if jest.mock() implicitly provides a default object when using `import fsPromisesMock from ...`
// then having a default export that mirrors the named ones might be necessary.
// For now, relying on named exports only for clarity in tests.
// If issues persist, a default export could be added back:
// export default { readFile, writeFile, mkdir, readdir, stat, __setMockFiles, ... };
