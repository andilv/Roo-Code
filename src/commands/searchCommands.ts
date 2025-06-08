import { Command } from 'commander';
import { searchFiles, searchCodebase } from '../searchUtils';

export function registerSearchCommands(program: Command) {
  program
    .command('search-files <query>')
    .description('Searches for files based on a glob pattern')
    .action(async (query: string) => {
      try {
        const files = await searchFiles(query);
        if (files.length > 0) {
          console.log(files.join('\n'));
        } else {
          console.log(`No files found matching query: ${query}`);
        }
      } catch (error) {
        // Error is already logged by searchFiles
        process.exit(1);
      }
    });

  program
    .command('search-code <query>')
    .description('Searches for a query within the content of files in the codebase')
    .option('-p, --path <searchPath>', 'Path to search in', '.')
    .action(async (query: string, options: { path: string }) => {
      try {
        const results = await searchCodebase(query, options.path);
        if (results.length > 0) {
          console.log(results.join('\n'));
        } else {
          console.log(`No results found for query "${query}" in path "${options.path}"`);
        }
      } catch (error) {
        // Error is already logged by searchCodebase
        process.exit(1);
      }
    });
}
