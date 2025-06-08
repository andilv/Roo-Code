// src/execUtils.test.ts
// Mock child_process first
jest.mock('child_process');
import { exec as originalExecFromChildProcess } from 'child_process'; // Get ref to child_process.exec AFTER jest.mock

// Create a controllable mock for what execAsync will become
const mockExecAsync = jest.fn();

// Mock util.promisify
jest.mock('util', () => {
  const originalUtil = jest.requireActual('util'); // Get original util
  return {
    ...originalUtil, // Spread original util to keep other functions like 'format'
    promisify: jest.fn((fnToPromisify: any) => {
      // If promisify is called with the (mocked) child_process.exec, return our mockExecAsync
      if (fnToPromisify === originalExecFromChildProcess) {
        return mockExecAsync;
      }
      // Otherwise, call the original promisify for other functions
      return originalUtil.promisify(fnToPromisify);
    }),
  };
});

// Now, import the module under test. It will use the mocked promisify.
import { executeCommand } from './execUtils';

describe('execUtils', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Clear all mocks before each test
    mockExecAsync.mockClear();
    // Spy on console.error and provide a mock implementation
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original console.error
    consoleErrorSpy.mockRestore();
  });

  describe('executeCommand', () => {
    it('should execute a command and return its stdout', async () => {
      const command = 'echo "hello world"';
      const expectedStdout = 'Mocked stdout for: echo "hello world"';
      // Configure mockExecAsync for this test case
      mockExecAsync.mockResolvedValue({ stdout: expectedStdout, stderr: '' });

      const output = await executeCommand(command);

      expect(output).toBe(expectedStdout);
      expect(mockExecAsync).toHaveBeenCalledWith(command);
    });

    it('should trim stdout', async () => {
      mockExecAsync.mockResolvedValue({ stdout: "  padded output  \n", stderr: '' });
      const output = await executeCommand('any_command_for_trim_test');
      expect(output).toBe("padded output");
    });

    it('should throw an error if execAsync rejects (e.g. command execution fails with error object)', async () => {
      const command = 'error_command';
      const execError = new Error('Command failed');
      (execError as any).code = 1; // Simulate an error code
      mockExecAsync.mockRejectedValue(execError);

      await expect(executeCommand(command)).rejects.toThrow(execError);
      expect(mockExecAsync).toHaveBeenCalledWith(command);
      expect(consoleErrorSpy).toHaveBeenCalledWith(`Failed to execute command "${command}":`, execError);
    });

    it('should throw an error if stderr is not empty', async () => {
      const command = 'stderr_command';
      const stderrMessage = 'Stderr message';
      mockExecAsync.mockResolvedValue({ stdout: '', stderr: stderrMessage });

      await expect(executeCommand(command)).rejects.toThrow(stderrMessage);
      expect(mockExecAsync).toHaveBeenCalledWith(command);
      // consoleErrorSpy is called once in the catch block of executeCommand
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `Failed to execute command "${command}":`,
        expect.objectContaining({ message: stderrMessage })
      );
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle commands that produce both stdout and stderr (throws due to stderr)', async () => {
        const command = 'success_with_stderr_command';
        const stderrMessage = 'Some stderr warning';
        mockExecAsync.mockResolvedValue({ stdout: 'OK', stderr: stderrMessage });

        await expect(executeCommand(command)).rejects.toThrow(stderrMessage);
        expect(mockExecAsync).toHaveBeenCalledWith(command);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            `Failed to execute command "${command}":`,
            expect.objectContaining({ message: stderrMessage })
        );
        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle command not found (ENOENT from execAsync rejection)', async () => {
      const command = 'unknown_command_enoent';
      const enoentError: any = new Error('spawn unknown_command_enoent ENOENT');
      enoentError.code = 'ENOENT'; // Important for specific error handling in source if any
      mockExecAsync.mockRejectedValue(enoentError);

      await expect(executeCommand(command)).rejects.toThrow(enoentError);
      expect(consoleErrorSpy).toHaveBeenCalledWith(`Failed to execute command "${command}":`, enoentError);
    });

    it('should correctly handle Buffer output from stdout and stderr (via execAsync resolving)', async () => {
      const command = 'buffer_output_command';
      const stdoutBufferContent = 'stdout buffer content';
      const stderrBufferContent = 'stderr buffer content';

      // Test stderr case (mock execAsync to resolve with objects simulating Buffer.toString())
      mockExecAsync.mockResolvedValue({
        stdout: { toString: () => stdoutBufferContent },
        stderr: { toString: () => stderrBufferContent }
      });
      await expect(executeCommand(command)).rejects.toThrow(stderrBufferContent);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `Failed to execute command "${command}":`,
        expect.objectContaining({ message: stderrBufferContent })
      );
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);


      // Test stdout only case
      consoleErrorSpy.mockClear();
      mockExecAsync.mockResolvedValue({
        stdout: { toString: () => stdoutBufferContent },
        stderr: { toString: () => '' } // Empty stderr
      });
      const output = await executeCommand(command);
      expect(output).toBe(stdoutBufferContent);
    });

    it('should throw original error if stderr is empty but execAsync rejects', async () => {
      const command = 'fail_no_stderr';
      const execError: any = new Error('Command exited with code 1');
      execError.code = 1;
      // execAsync itself rejects
      mockExecAsync.mockRejectedValue(execError);

      await expect(executeCommand(command)).rejects.toThrow(execError);
      expect(consoleErrorSpy).toHaveBeenCalledWith(`Failed to execute command "${command}":`, execError);
    });
  });
});
