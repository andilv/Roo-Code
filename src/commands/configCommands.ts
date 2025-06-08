import { Command } from 'commander';
import {
  addProviderConfig,
  removeProviderConfig,
  getAllProviderConfigs,
  AIProviderDetails,
} from '../config';

export function registerConfigCommands(program: Command) {
  const configCommand = program.command('config').description('Manage AI provider configurations');

  configCommand
    .command('list-providers')
    .alias('lp')
    .description('Lists all configured AI providers and their details.')
    .action(async () => {
      try {
        const providers = await getAllProviderConfigs();
        if (Object.keys(providers).length === 0) {
          console.log('No AI providers configured yet.');
          console.log('\nUse `roo-cli config add-provider <name> <apiKey> [endpoint] [defaultModel]` to add one.');
          return;
        }
        console.log('Configured AI Providers:');
        for (const [name, details] of Object.entries(providers)) {
          console.log(`\nProvider: ${name}`);
          console.log(`  API Key: ${details.apiKey ? '********' + details.apiKey.slice(-4) : 'Not set'}`); // Mask API key
          console.log(`  Endpoint: ${details.endpoint || 'Default'}`);
          console.log(`  Default Model: ${details.defaultModel || 'Default'}`);
          // List other custom details if any
          Object.keys(details).forEach(key => {
            if (!['apiKey', 'endpoint', 'defaultModel'].includes(key)) {
              console.log(`  ${key}: ${details[key]}`);
            }
          });
        }
      } catch (error) {
        console.error('Error listing providers:', error);
        process.exit(1);
      }
    });

  configCommand
    .command('add-provider <name> <apiKey>')
    .alias('ap')
    .description('Adds or updates an AI provider configuration. API key is required.')
    .option('-e, --endpoint <url>', 'Specify the API endpoint for the provider.')
    .option('-m, --model <modelName>', 'Specify the default model for the provider.')
    // Allow arbitrary key-value pairs for provider-specific options
    .option('--custom <keyValuePair...>', 'Add custom key-value pairs (e.g., "temperature=0.7" "region=us-east-1")')
    .action(async (name: string, apiKey: string, options: { endpoint?: string; model?: string; custom?: string[] }) => {
      try {
        const providerDetails: AIProviderDetails = { apiKey };
        if (options.endpoint) {
          providerDetails.endpoint = options.endpoint;
        }
        if (options.model) {
          providerDetails.defaultModel = options.model;
        }
        if (options.custom) {
            options.custom.forEach(pair => {
                const [key, value] = pair.split('=');
                if (key && value) {
                    // Basic type inference for numbers and booleans, otherwise string
                    if (!isNaN(parseFloat(value)) && isFinite(Number(value))) {
                        providerDetails[key.trim()] = parseFloat(value);
                    } else if (value.toLowerCase() === 'true') {
                        providerDetails[key.trim()] = true;
                    } else if (value.toLowerCase() === 'false') {
                        providerDetails[key.trim()] = false;
                    } else {
                        providerDetails[key.trim()] = value;
                    }
                } else {
                    console.warn(`Skipping invalid custom key-value pair: ${pair}`);
                }
            });
        }
        await addProviderConfig(name, providerDetails);
        console.log(`Provider "${name}" ${await getProviderConfig(name) ? 'updated' : 'added'} successfully.`);
      } catch (error) {
        console.error(`Error adding/updating provider "${name}":`, error);
        process.exit(1);
      }
    });

  configCommand
    .command('remove-provider <name>')
    .alias('rp')
    .description('Removes an AI provider from the configuration.')
    .action(async (name: string) => {
      try {
        await removeProviderConfig(name);
        // console.log(`Provider "${name}" removed successfully.`); // Already logged by removeProviderConfig or prints warning
      } catch (error) {
        console.error(`Error removing provider "${name}":`, error);
        process.exit(1);
      }
    });
}
