import * as glob from 'glob';
import { promisify } from 'util';
import { rgPath } from '@vscode/ripgrep';
import { execFile } from 'child_process';

// Ensure we are promisifying the actual glob function not the namespace
// and provide explicit typing for the promisified function.
const globAsync: (pattern: string, options?: object) => Promise<string[]> = promisify(glob.glob);
const execFileAsync = promisify(execFile);

export async function searchFiles(query: string): Promise<string[]> {
  try {
    // The options object needs to be compatible with the glob function's expectations
    const files: string[] = await globAsync(query, { nodir: true });
    return files;
  } catch (error) {
    console.error(`Error searching for files with query "${query}":`, error);
    throw error;
  }
}

export async function searchCodebase(query: string, searchPath: string = '.'): Promise<string[]> {
  try {
    // Ensure rgPath is available
    if (!rgPath) {
      throw new Error('ripgrep path (rgPath) not found. Is @vscode/ripgrep installed correctly?');
    }

    // Construct the arguments for ripgrep
    // -N: no line numbers
    // -l: list files containing matches (instead of the matches themselves)
    // --json: output in JSON format for easier parsing (optional, could also parse text output)
    // We will parse text output for simplicity here, listing files.
    const args = [query, searchPath, '--files-with-matches', '--no-messages'];

    const { stdout, stderr } = await execFileAsync(rgPath, args, { encoding: 'utf-8' });

    if (stderr) {
      // ripgrep often outputs to stderr for things like "file not found" which might not be fatal errors.
      // We'll log it but not necessarily throw an error unless stdout is also empty.
      console.warn(`ripgrep stderr for query "${query}" in path "${searchPath}":`, stderr);
    }

    if (!stdout) {
      return []; // No matches found
    }

    // stdout will be a list of files, each on a new line
    return stdout.trim().split('\n').filter(line => line.length > 0);
  } catch (error: any) {
    // Handle common error cases from ripgrep
    if (error && error.code === 'ENOENT') {
      console.error(`ripgrep command not found at path: ${rgPath}. Ensure it's correctly installed and path is set.`);
    } else if (error && error.signal === 'SIGTERM') {
      console.error(`ripgrep command was terminated for query "${query}" in path "${searchPath}".`);
    } else {
      console.error(`Error searching codebase for query "${query}" in path "${searchPath}":`, error);
    }
    throw error;
  }
}
