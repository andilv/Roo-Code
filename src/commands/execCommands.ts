import { Command } from 'commander';
import { executeCommand } from '../execUtils';

export function registerExecCommands(program: Command) {
  program
    .command('exec <command>')
    .description('Executes a terminal command and prints its output')
    .action(async (command: string) => {
      try {
        const output = await executeCommand(command);
        console.log(output);
      } catch (error) {
        // Error is already logged by executeCommand
        process.exit(1);
      }
    });
}
