import { Command } from 'commander';
import { readFile, writeFile, listFiles, applyDiff } from '../fsUtils';

export function registerFileCommands(program: Command) {
  program
    .command('read <filePath>')
    .description('Reads a file and prints its content to the console')
    .action(async (filePath: string) => {
      try {
        const content = await readFile(filePath);
        console.log(content);
      } catch (error) {
        // Error is already logged by readFile, rethrow to exit with error
        process.exit(1);
      }
    });

  program
    .command('write <filePath> <content>')
    .description('Writes content to a file')
    .action(async (filePath: string, content: string) => {
      try {
        await writeFile(filePath, content);
      } catch (error) {
        // Error is already logged by writeFile, rethrow to exit with error
        process.exit(1);
      }
    });

  program
    .command('list <dirPath>')
    .description('Lists files in a directory')
    .action(async (dirPath: string) => {
      try {
        const files = await listFiles(dirPath);
        console.log(files.join('\n'));
      } catch (error) {
        process.exit(1);
      }
    });

  program
    .command('diff <filePath> <diffContent>')
    .description('Applies a diff to a file')
    .action(async (filePath: string, diffContent: string) => {
      try {
        await applyDiff(filePath, diffContent);
      } catch (error) {
        process.exit(1);
      }
    });
}
