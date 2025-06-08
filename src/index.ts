import { Command } from 'commander';

import { registerFileCommands } from './commands/fileCommands';
import { registerExecCommands } from './commands/execCommands';
import { registerSearchCommands } from './commands/searchCommands';
import { registerAiCommands } from './commands/aiCommands';
import { registerConfigCommands } from './commands/configCommands';
import { registerModeCommands } from './commands/modeCommands';

const program = new Command();

// Global options
program
  .version('1.0.0')
  .description('A simple CLI tool')
  .option('-v, --verbose', 'Enable verbose output (currently just logs that it\'s on)')
  .hook('preAction', (thisCommand, actionCommand) => {
    const opts = thisCommand.opts();
    if (opts.verbose) {
      console.log('[Verbose mode enabled]');
    }
  });

// Register commands
registerFileCommands(program);
registerExecCommands(program);
registerSearchCommands(program);
registerAiCommands(program);
registerConfigCommands(program);
registerModeCommands(program);

program
  .command('hello')
  .action(() => {
    console.log('Hello, world!');
  });

program.parse(process.argv);
