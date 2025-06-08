import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function executeCommand(command: string): Promise<string> {
  try {
    const { stdout, stderr } = await execAsync(command); // Call execAsync only once

    // exec's stdout/stderr can be String or Buffer. toString() handles both.
    const stderrString = stderr ? stderr.toString().trim() : "";
    const stdoutString = stdout ? stdout.toString().trim() : "";

    if (stderrString) {
      // If stderr has content, even for a successful exit code, treat it as an error condition.
      // Throw an error that will be caught and logged by the catch block.
      throw new Error(stderrString);
    }
    return stdoutString;
  } catch (error: any) {
    // This catch block handles:
    // 1. Errors thrown by our stderrString check above.
    // 2. Errors thrown by execAsync itself (e.g., non-zero exit code from command, command not found).
    //    The 'error' object from exec often includes properties like 'code', 'stdout', 'stderr'.

    // If the error message is the same as the stderr we just processed, we might not need to log it again fully,
    // but it's safer to log the full error object that execAsync provided or that we created.
    console.error(`Failed to execute command "${command}":`, error);
    throw error; // Rethrow the original error (or the one we created from stderr)
  }
}
