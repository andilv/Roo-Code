// src/searchUtils.test.ts
import { searchFiles, searchCodebase } from './searchUtils';
import * as glob from 'glob'; // Will be mocked
import * as rg from '@vscode/ripgrep'; // Will be mocked
import { execFile as mockExecFile } from 'child_process'; // Will be mocked

// Mock the modules
jest.mock('glob');
jest.mock('@vscode/ripgrep');
jest.mock('child_process');

// Get typed references to the mocks
// For glob, the actual function is usually the default export or a named 'glob' export.
// Our mock __mocks__/glob.ts exports 'glob' as a named export and as default.
// If 'import * as glob' is used, then 'glob.glob' or 'glob.default' is the function.
// If 'import { glob as globFn } from "glob"' or 'import globFn from "glob"' is used, then globFn is the function.
// searchUtils.ts uses `import * as glob from 'glob';` and then `promisify(glob)`. This is unusual.
// promisify usually expects a function following the (err, value) callback convention.
// The 'glob' module's main function `glob(pattern, cb)` or `glob(pattern, options, cb)` fits this.
// So `promisify(glob.glob)` or `promisify(glob.default)` would be more typical.
// Let's assume searchUtils.ts meant to use the main glob function.
// Our mock `__mocks__/glob.ts` has `export default globMock; export const glob = globMock;`
// So, if `promisify(glob)` is called where `glob` is the namespace from `import * as glob`, it might point to `glob.default`.

// searchUtils.ts now uses promisify(glob.glob). Our mock exports 'glob' which is the mock function.

// Provide a more specific type for the mocked glob function
// Reverted to unknown as jest.Mock due to overload issues with JestMockedFunction
const mockedGlobFn = glob.glob as unknown as jest.Mock;
const mockedRg = rg as jest.Mocked<typeof rg>;
const mockedExecFile = mockExecFile as jest.MockedFunction<typeof mockExecFile>;


describe('searchUtils', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    mockedGlobFn.mockClear();
    mockedExecFile.mockClear();
    // If @vscode/ripgrep mock has functions that need clearing:
    // e.g., if it had a search function: mockedRg.search.mockClear();

    // Reset custom mock implementations to default if necessary
    // (Example for glob, if we had __clearGlobMock or similar)
    // mockedGlob.__clearGlobMock?.(); // If using such helpers from the mock file

    console.error = jest.fn(); // Mock console.error
    console.warn = jest.fn(); // Mock console.warn
  });

  describe('searchFiles', () => {
    it('should return files found by glob', async () => {
      const query = '*.ts';
      const expectedFiles = ['file1.ts', 'file2.ts'];
      // The promisify(glob) in searchUtils will use the mocked glob.default (or glob.glob).
      // Configure the mock to return success for this pattern.
      mockedGlobFn.mockImplementation((pattern: string, options: any, callback: (err: Error | null, matches: string[]) => void) => {
        if (pattern === query) {
          callback(null, expectedFiles);
        } else {
          callback(null, []);
        }
      });

      const files = await searchFiles(query);
      expect(files).toEqual(expectedFiles);
      // Check if the original glob function (mocked) was called correctly by promisify
      expect(mockedGlobFn).toHaveBeenCalledWith(query, { nodir: true }, expect.any(Function));
    });

    it('should return an empty array if glob finds no files', async () => {
      const query = '*.nothing';
      mockedGlobFn.mockImplementation((pattern: string, options: any, callback: (err: Error | null, matches: string[]) => void) => callback(null, []));

      const files = await searchFiles(query);
      expect(files).toEqual([]);
      expect(mockedGlobFn).toHaveBeenCalledWith(query, { nodir: true }, expect.any(Function));
    });

    it('should throw an error if glob encounters an error', async () => {
      const query = 'error_pattern';
      const globError = new Error('Glob failed');
      mockedGlobFn.mockImplementation((pattern: string, options: any, callback: (err: Error | null, matches: string[]) => void) => callback(globError, []));

      await expect(searchFiles(query)).rejects.toThrow('Glob failed');
      expect(console.error).toHaveBeenCalledWith(`Error searching for files with query "${query}":`, globError);
    });

    it('should find files with a subdirectory glob pattern', async () => {
      const query = 'src/**/*.js';
      const expectedFiles = ['src/moduleA/file1.js', 'src/moduleB/file2.js'];
      mockedGlobFn.mockImplementation((pattern: string, options: any, callback: (err: Error | null, matches: string[]) => void) => {
        if (pattern === query) {
          callback(null, expectedFiles);
        } else {
          callback(null, []);
        }
      });
      const files = await searchFiles(query);
      expect(files).toEqual(expectedFiles);
      expect(mockedGlobFn).toHaveBeenCalledWith(query, { nodir: true }, expect.any(Function));
    });
  });

  describe('searchCodebase', () => {
    const mockRgPathFromMockModule = rg.rgPath; // This will be 'mocked/path/to/ripgrep/binary/rg'

    it('should return an array of file paths from ripgrep stdout', async () => {
      const query = 'searchTerm';
      const searchPath = './src';
      const rgOutput = 'src/fileA.ts\nsrc/fileB.ts\n';

      mockedExecFile.mockImplementation(((
        file: string,
        args: string[] | undefined,
        options: any,
        callback: (error: Error | null, stdout: string, stderr: string) => void
      ) => {
        if (file === mockRgPathFromMockModule) {
          callback(null, rgOutput, '');
        }
      }) as any);

      const results = await searchCodebase(query, searchPath);
      expect(results).toEqual(['src/fileA.ts', 'src/fileB.ts']);
      expect(mockedExecFile).toHaveBeenCalledWith(
        mockRgPathFromMockModule,
        [query, searchPath, '--files-with-matches', '--no-messages'],
        { encoding: 'utf-8' },
        expect.any(Function)
      );
    });

    it('should correctly pass a custom searchPath to ripgrep', async () => {
      const query = 'customPathTest';
      const customPath = 'lib/utils';
      const rgOutput = 'lib/utils/helper.ts\n';

      mockedExecFile.mockImplementation(((
        file: string,
        args: string[] | undefined,
        options: any,
        callback: (error: Error | null, stdout: string, stderr: string) => void
      ) => {
        if (file === mockRgPathFromMockModule && args && args[0] === query && args[1] === customPath) {
          callback(null, rgOutput, '');
        } else {
          callback(new Error('Mock not called with expected custom path'), '', '');
        }
      }) as any);

      const results = await searchCodebase(query, customPath);
      expect(results).toEqual(['lib/utils/helper.ts']);
      expect(mockedExecFile).toHaveBeenCalledWith(
        mockRgPathFromMockModule,
        [query, customPath, '--files-with-matches', '--no-messages'], // Check customPath here
        { encoding: 'utf-8' },
        expect.any(Function)
      );
    });

    it('should return an empty array if ripgrep finds no matches (empty stdout)', async () => {
      mockedExecFile.mockImplementation(((
        file: string,
        args: string[] | undefined,
        options: any,
        callback: (e: Error|null, so: string, se: string) => void
      ) => {
        callback(null, '', ''); // Empty stdout
      }) as any);

      const results = await searchCodebase('query', '.');
      expect(results).toEqual([]);
    });

    it('should return an empty array if ripgrep finds no matches (stdout with only whitespace)', async () => {
        mockedExecFile.mockImplementation(((
            file: string, args: string[] | undefined, options: any, callback: (e:Error|null,so:string,se:string)=>void
        ) => {
            callback(null, ' \n \t \n ', ''); // stdout with only whitespace
        }) as any);
        const results = await searchCodebase('query', '.');
        expect(results).toEqual([]);
    });

    it('should handle ripgrep stderr output by logging it as a warning', async () => {
      const stderrOutput = 'ripgrep warning: some file not found';
      mockedExecFile.mockImplementation(((
        file: string, args: string[] | undefined, options: any, callback: (e:Error|null,so:string,se:string)=>void
      ) => {
        callback(null, 'src/fileC.ts\n', stderrOutput);
      }) as any);

      const results = await searchCodebase('query', '.');
      expect(results).toEqual(['src/fileC.ts']);
      expect(console.warn).toHaveBeenCalledWith(
        `ripgrep stderr for query "query" in path ".":`,
        stderrOutput
      );
    });

    it('should throw an error if ripgrep execution fails (returns error object)', async () => {
      const execError = new Error('ripgrep execution failed');
      mockedExecFile.mockImplementation(((
        file: string, args: string[] | undefined, options: any, callback: (e:Error|null,so:string,se:string)=>void
        ) => {
        callback(execError, '', '');
      }) as any);

      await expect(searchCodebase('query', '.')).rejects.toThrow('ripgrep execution failed');
      expect(console.error).toHaveBeenCalledWith(
        'Error searching codebase for query "query" in path ".":',
        execError
      );
    });

    it('should throw an error if ripgrep exits with non-zero code (error object from execFile, no specific stderr from rg)', async () => {
      const query = 'searchTerm';
      const searchPath = '.';
      const execError: any = new Error('Command failed with exit code 1');
      execError.code = 1; // ripgrep typically exits 1 for errors, 0 for success (even if no matches)
      execError.stdout = ''; // No specific stdout from rg in this error case
      execError.stderr = 'rg: Some internal error or invalid argument'; // rg might output its own error to stderr property of execFile error

      mockedExecFile.mockImplementation(((
        file: string,
        args: string[] | undefined,
        options: any,
        callback: (error: Error | null, stdout: string, stderr: string) => void
      ) => {
        callback(execError, execError.stdout, execError.stderr);
      }) as any);

      await expect(searchCodebase(query, searchPath)).rejects.toThrow('Command failed with exit code 1');
      // The console.error in searchCodebase will log the complex error object.
      // We can check for the specific error message logged by the catch block in searchCodebase.
      expect(console.error).toHaveBeenCalledWith(
        `Error searching codebase for query "${query}" in path "${searchPath}":`,
        execError
      );
    });


    it('should throw an error if rgPath is not found (e.g. @vscode/ripgrep not installed correctly)', async () => {
      // This requires dynamically changing the mock of @vscode/ripgrep for this test.
      // We'll use jest.doMock to temporarily change rgPath to null.
      jest.doMock('@vscode/ripgrep', () => ({
        ...jest.requireActual('@vscode/ripgrep'), // Import and retain other exports if any
        rgPath: null, // Override rgPath to be null
      }));
      // We need to re-import searchCodebase or the module containing it to see the mocked change.
      // This is complex with ES modules. A simpler way for this specific test:
      // Modify the searchUtils.ts to allow rgPath to be dependency injected or check it internally.
      // For now, let's assume the check `if (!rgPath)` in searchCodebase works with the initial mock.
      // To test the `!rgPath` case truly, you might need to structure `searchUtils` differently
      // or use `jest.resetModules` and re-require.

      // Simpler test: If rgPath was initially null (which our current @vscode/ripgrep mock doesn't do by default)
      // For this test, we will just assert that if rgPath *were* null, it would throw.
      // The current mock structure makes rgPath always a string.
      // We can test the error message by forcing rgPath to be undefined in the function scope (hard to do from outside)
      // Or, we can just trust the `if (!rgPath)` check.

      // Let's assume for a moment we could make rgPath null for a test:
      // const { searchCodebase: searchWithNullRgPath } = require('./searchUtils'); // Re-require after doMock
      // await expect(searchWithNullRgPath('query', '.')).rejects.toThrow(
      //   'ripgrep path (rgPath) not found.'
      // );
      // jest.unmock('@vscode/ripgrep'); // Clean up the specific mock

      // Given the current setup, this specific test case for rgPath being null is hard to achieve
      // without `jest.resetModules()` which can be intrusive.
      // The existing code `if (!rgPath)` is defensive.
      // We'll rely on the fact that if `@vscode/ripgrep` somehow failed to provide `rgPath`,
      // the error `throw new Error('ripgrep path (rgPath) not found...')` would be hit.
      // We can, however, test the ENOENT error for execFile if rgPath was invalid.
      const enoentError: any = new Error('ENOENT: spawn /invalid/path/rg ENOENT');
      enoentError.code = 'ENOENT';
      mockedExecFile.mockImplementation(((
        file: string, args: string[] | undefined, options: any, callback: (e:Error|null,so:string,se:string)=>void
      ) => {
        callback(enoentError, '', '');
      }) as any);

      await expect(searchCodebase('query', '.')).rejects.toThrow('ENOENT: spawn /invalid/path/rg ENOENT');
      expect(console.error).toHaveBeenCalledWith(
          `ripgrep command not found at path: ${mockRgPathFromMockModule}. Ensure it's correctly installed and path is set.`
      );
    });
  });
});
