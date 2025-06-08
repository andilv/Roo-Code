// src/fsUtils.test.ts
import * as fsUtils from './fsUtils';
import type * as fsTypes from 'fs';
import * as diffMockModule from 'diff';

jest.mock('fs/promises');
jest.mock('diff');

// Import specific functions and helpers from the mocked 'fs/promises'
import {
  readFile as mockedReadFile,
  writeFile as mockedWriteFile,
  readdir as mockedReaddir,
  // mkdir, // Not used by fsUtils
  __setMockFiles,
  __clearMockFiles,
  __setMockError,
  __getMockFiles,
  __setMockDirentObjects
} from 'fs/promises';

const mockedDiff = diffMockModule as jest.Mocked<typeof diffMockModule>;

describe('fsUtils', () => {
  beforeEach(() => {
    __clearMockFiles(); // This helper now also calls .mockReset() on fs functions
    __setMockError(null);

    // Default mock implementations for this test suite
    mockedReadFile.mockImplementation(async (filePath: fsTypes.PathLike) => {
        const files = __getMockFiles();
        const pathStr = filePath.toString();
        if (Object.prototype.hasOwnProperty.call(files, pathStr)) return files[pathStr];
        const e: any = new Error(`ENOENT: no such file or directory, open '${pathStr}'`);
        e.code = 'ENOENT';
        throw e;
    });
    mockedWriteFile.mockResolvedValue(undefined);
    mockedReaddir.mockImplementation(async (dirPath: fsTypes.PathLike, options?: any) => {
        // This mock now directly uses the __internalMockDirentObjects from the mock setup via __setMockDirentObjects
        const direntsFromMockState: fsTypes.Dirent[] = (__getMockFiles() as any).__INTERNAL_MOCK_DIRENTS || []; // Accessing a hypothetical internal state
        // A better way for the mock readdir in __mocks__/fs/promises.ts to use __internalMockDirentObjects
        // For this test file, if we directly mock readdir impl, we should use what __setMockDirentObjects sets.
        // The actual __mocks__/fs/promises.ts readdir uses its own __internalMockDirentObjects.
        // So, tests calling fsUtils.listFiles() will rely on __setMockDirentObjects setting that internal state.
        const currentMockDirents = (globalThis as any).__INTERNAL_FS_PROMISES_MOCK_DIRENTS || [];


        if (options?.withFileTypes) {
            return currentMockDirents; // Return Dirent objects
        }
        return currentMockDirents.map((d: fsTypes.Dirent) => d.name); // Return names
    });

    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  });

  describe('readFile', () => {
    it('should read and return file content', async () => {
      __setMockFiles({ 'test.txt': 'hello world' });
      const content = await fsUtils.readFile('test.txt');
      expect(content).toBe('hello world');
      expect(mockedReadFile).toHaveBeenCalledWith('test.txt', 'utf-8');
    });

    it('should throw an error if file does not exist', async () => {
      await expect(fsUtils.readFile('nonexistent.txt')).rejects.toThrow(
        /ENOENT: no such file or directory/
      );
    });

    it('should log and rethrow other errors', async () => {
      const mockError = new Error('Disk read error');
      mockedReadFile.mockRejectedValueOnce(mockError);

      await expect(fsUtils.readFile('anyfile.txt')).rejects.toThrow('Disk read error');
      expect(console.error).toHaveBeenCalledWith('Error reading file anyfile.txt:', mockError);
    });

    it('should read an empty file successfully', async () => {
      __setMockFiles({ 'empty.txt': '' });
      const content = await fsUtils.readFile('empty.txt');
      expect(content).toBe('');
      expect(mockedReadFile).toHaveBeenCalledWith('empty.txt', 'utf-8');
    });
  });

  describe('writeFile', () => {
    it('should write content to a file and verify mock content', async () => {
      await fsUtils.writeFile('output.txt', 'new content');
      expect(mockedWriteFile).toHaveBeenCalledWith('output.txt', 'new content', 'utf-8');
      expect(__getMockFiles()['output.txt']).toBe('new content');
    });

    it('should write an empty string to a file', async () => {
        await fsUtils.writeFile('empty_output.txt', '');
        expect(mockedWriteFile).toHaveBeenCalledWith('empty_output.txt', '', 'utf-8');
        expect(__getMockFiles()['empty_output.txt']).toBe('');
    });

    it('should log success message', async () => {
        await fsUtils.writeFile('output.txt', 'new content');
        expect(console.log).toHaveBeenCalledWith('File output.txt written successfully.');
    });

    it('should log and rethrow errors during write', async () => {
        const mockWriteError = new Error('Disk write error');
        mockedWriteFile.mockRejectedValueOnce(mockWriteError);

        await expect(fsUtils.writeFile('error.txt', 'data')).rejects.toThrow('Disk write error');
        expect(console.error).toHaveBeenCalledWith('Error writing file error.txt:', mockWriteError);
    });

    it('should fail to write if parent directory does not exist (relies on fs.writeFile behavior)', async () => {
        const pathError: any = new Error("ENOENT: no such file or directory, open 'nonexistentdir/file.txt'");
        pathError.code = 'ENOENT';
        mockedWriteFile.mockRejectedValueOnce(pathError);

        await expect(fsUtils.writeFile('nonexistentdir/file.txt', 'content')).rejects.toThrow(pathError);
    });

    it('should overwrite an existing file', async () => {
      __setMockFiles({ 'existing.txt': 'old content' });
      await fsUtils.writeFile('existing.txt', 'new content');
      expect(mockedWriteFile).toHaveBeenCalledWith('existing.txt', 'new content', 'utf-8');
      expect(__getMockFiles()['existing.txt']).toBe('new content');
    });
  });

  describe('listFiles', () => {
    it('should list files in a directory', async () => {
      const expectedFileNames = ['file1.txt', 'file2.js', '.hiddenfile'];
      const mockDirents = expectedFileNames.map(name => ({
        name,
        isFile: () => true,
        isDirectory: () => false,
        isBlockDevice: () => false,
        isCharacterDevice: () => false,
        isSymbolicLink: () => false,
        isFIFO: () => false,
        isSocket: () => false,
       } as fsTypes.Dirent));
      __setMockDirentObjects(mockDirents); // This helper is from the mock

      const files = await fsUtils.listFiles('mydir');
      expect(files).toEqual(expectedFileNames);
      expect(mockedReaddir).toHaveBeenCalledWith('mydir');
    });

    it('should return an empty array for an empty directory', async () => {
      __setMockDirentObjects([]); // Use helper to set state for mock's readdir
      const files = await fsUtils.listFiles('emptydir');
      expect(files).toEqual([]);
      expect(mockedReaddir).toHaveBeenCalledWith('emptydir');
    });

    it('should throw an error if directory does not exist', async () => {
      const enoentError: any = new Error('ENOENT: no such file or directory');
      enoentError.code = 'ENOENT';
      // Let the default readdir mock (which uses __internalMockDirentObjects, empty by default after clear)
      // be overridden by a specific error for this path, or have the mock readdir throw if path not found in a conceptual store.
      // The current default readdir mock in __mocks__/fs/promises.ts will return empty [] if __internalMockDirentObjects is empty.
      // To test ENOENT for readdir, we need to make the mocked readdir itself throw.
      mockedReaddir.mockImplementation(async (dirPath: fsTypes.PathLike) => {
        if (dirPath.toString() === 'nonexistentdir') {
          throw enoentError;
        }
        return [];
      });

      await expect(fsUtils.listFiles('nonexistentdir')).rejects.toThrow(
        /ENOENT: no such file or directory/
      );
    });

    it('should log and rethrow other errors during listFiles', async () => {
        const mockListError = new Error('Directory listing permission error');
        mockedReaddir.mockRejectedValueOnce(mockListError);

        await expect(fsUtils.listFiles('anydir')).rejects.toThrow('Directory listing permission error');
        expect(console.error).toHaveBeenCalledWith('Error listing files in directory anydir:', mockListError);
    });
  });

  describe('applyDiff', () => {
    beforeEach(() => {
      mockedDiff.applyPatch.mockClear();
      // readFile and writeFile will use the default implementations set in the outer beforeEach,
      // which use the __getMockFiles and __setMockFiles helpers.
    });

    it('should read the original file, apply patch, and write the new content', async () => {
      __setMockFiles({ 'target.txt': 'original content' });
      const diffPatch = '@@ -1,1 +1,1 @@\n-original\n+new';
      const expectedPatchedContent = 'new content';
      mockedDiff.applyPatch.mockReturnValue(expectedPatchedContent);

      await fsUtils.applyDiff('target.txt', diffPatch);

      expect(mockedReadFile).toHaveBeenCalledWith('target.txt');
      expect(mockedDiff.applyPatch).toHaveBeenCalledWith('original content', diffPatch);
      expect(mockedWriteFile).toHaveBeenCalledWith('target.txt', expectedPatchedContent, 'utf-8');
      expect(console.log).toHaveBeenCalledWith('Diff applied to file target.txt successfully.');
    });

    it('should throw an error if applyPatch returns false (patch failed)', async () => {
      __setMockFiles({ 'target.txt': 'original content' });
      const diffPatch = 'INVALID_PATCH_CONTENT';
      mockedDiff.applyPatch.mockReturnValue(false);

      await expect(fsUtils.applyDiff('target.txt', diffPatch)).rejects.toThrow(
        'Failed to apply patch. Diff may not be applicable.'
      );
      expect(mockedDiff.applyPatch).toHaveBeenCalledWith('original content', diffPatch);
      expect(console.error).toHaveBeenCalledWith('Error applying diff to file target.txt:', expect.any(Error));
    });

    it('should handle errors from the diff library (e.g., malformed patch string)', async () => {
        __setMockFiles({ 'target.txt': 'original content' });
        const malformedDiffPatch = 'this is not a diff';
        const patchError = new Error('Patch format error');
        mockedDiff.applyPatch.mockImplementation(() => {
            throw patchError;
        });

        await expect(fsUtils.applyDiff('target.txt', malformedDiffPatch)).rejects.toThrow(patchError);
        expect(console.error).toHaveBeenCalledWith('Error applying diff to file target.txt:', patchError);
    });

    it('should handle readFile errors during applyDiff', async () => {
        mockedReadFile.mockRejectedValueOnce(new Error('Read failed'));
        await expect(fsUtils.applyDiff('target.txt', 'patch data')).rejects.toThrow('Read failed');
        expect(console.error).toHaveBeenCalledWith('Error applying diff to file target.txt:', expect.any(Error));
    });

    it('should correctly apply to an empty file if patch is valid for empty source', async () => {
        __setMockFiles({ 'empty_target.txt': '' });
        const diffPatchForEmpty = '@@ -0,0 +1,1 @@\n+new line';
        const expectedPatchedContent = 'new line';
        mockedDiff.applyPatch.mockReturnValue(expectedPatchedContent);

        await fsUtils.applyDiff('empty_target.txt', diffPatchForEmpty);
        expect(mockedDiff.applyPatch).toHaveBeenCalledWith('', diffPatchForEmpty);
        expect(mockedWriteFile).toHaveBeenCalledWith('empty_target.txt', expectedPatchedContent, 'utf-8');
    });

    it('should handle writeFile errors during applyDiff', async () => {
      __setMockFiles({ 'target.txt': 'original content' });
      const diffPatch = '@@ -1,1 +1,1 @@\n-original\n+new';
      const expectedPatchedContent = 'new content';
      mockedDiff.applyPatch.mockReturnValue(expectedPatchedContent);

      const writeError = new Error('Failed to write patched file');
      mockedWriteFile.mockRejectedValueOnce(writeError);

      await expect(fsUtils.applyDiff('target.txt', diffPatch)).rejects.toThrow(writeError);
      expect(mockedReadFile).toHaveBeenCalledWith('target.txt');
      expect(mockedDiff.applyPatch).toHaveBeenCalledWith('original content', diffPatch);
      expect(mockedWriteFile).toHaveBeenCalledWith('target.txt', expectedPatchedContent, 'utf-8');
      expect(console.error).toHaveBeenCalledWith('Error applying diff to file target.txt:', writeError);
    });
  });
});
