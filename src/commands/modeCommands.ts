import { Command } from 'commander';
import { addMode, removeMode, getMode, getAllModes, CustomMode } from '../modes';
import { BaseProvider } from '../ai/baseProvider';
import { OpenAIProvider } from '../ai/openaiProvider';
import { getAllProviderConfigs } from '../config'; // To check if provider in mode exists

// This factory is similar to the one in aiCommands.ts but might need to be DRYed up later.
// For now, keeping it separate to avoid circular dependencies or premature abstraction.
async function getProviderForMode(providerName: string): Promise<BaseProvider | null> {
  let providerInstance: BaseProvider | null = null;
  switch (providerName.toLowerCase()) {
    case 'openai':
      providerInstance = new OpenAIProvider();
      break;
    // Add other providers here
    default:
      console.error(`Unsupported AI provider specified in mode: ${providerName}`);
      return null;
  }

  if (providerInstance) {
    try {
      await providerInstance.configure(providerName); // Load config for this provider
    } catch (error) {
      console.error(`Error configuring provider "${providerName}" for mode:`, error instanceof Error ? error.message : error);
      return null;
    }
  }
  return providerInstance;
}

export function registerModeCommands(program: Command) {
  const modeCommand = program.command('mode').description('Manage and use custom AI modes');

  modeCommand
    .command('list')
    .alias('ls')
    .description('Lists all available custom modes.')
    .action(async () => {
      try {
        const modes = await getAllModes();
        if (Object.keys(modes).length === 0) {
          console.log('No custom modes defined yet.');
          console.log('\nUse `roo-cli mode add <name> "<prompt>" <provider> [model]` to add one.');
          return;
        }
        console.log('Available Custom Modes:');
        for (const [name, modeDetails] of Object.entries(modes)) {
          console.log(`\nMode: ${name}`);
          console.log(`  Provider: ${modeDetails.provider}`);
          if (modeDetails.model) {
            console.log(`  Model: ${modeDetails.model}`);
          }
          console.log(`  System Prompt: "${modeDetails.prompt.substring(0, 100)}${modeDetails.prompt.length > 100 ? '...' : ''}"`);
        }
      } catch (error) {
        console.error('Error listing modes:', error);
        process.exit(1);
      }
    });

  modeCommand
    .command('add <name> <prompt> <provider>')
    .description('Adds a new custom mode. System prompt should be enclosed in quotes.')
    .option('-m, --model <modelName>', 'Specify the AI model for this mode.')
    .action(async (name: string, prompt: string, provider: string, options: { model?: string }) => {
      try {
        // Validate if the provider exists in the main config (optional, but good practice)
        const configuredProviders = await getAllProviderConfigs();
        if (!configuredProviders[provider.toLowerCase()]) {
            console.warn(`Warning: Provider "${provider}" is not found in the main CLI configuration. Ensure it's correctly set up (e.g. API key via environment variable if not in config).`);
        }

        const modeDetails: CustomMode = { name, prompt, provider };
        if (options.model) {
          modeDetails.model = options.model;
        }
        await addMode(modeDetails);
        console.log(`Mode "${name}" added successfully.`);
      } catch (error) {
        console.error(`Error adding mode "${name}":`, error);
        process.exit(1);
      }
    });

  modeCommand
    .command('remove <name>')
    .alias('rm')
    .description('Removes a custom mode.')
    .action(async (name: string) => {
      try {
        await removeMode(name);
        // Message is already printed by removeMode on success/failure
      } catch (error) {
        console.error(`Error removing mode "${name}":`, error);
        process.exit(1);
      }
    });

  modeCommand
    .command('use <name> <userPrompt>')
    .description('Activates a custom mode and sends the user\'s prompt to the AI.')
    .option('-mt, --max-tokens <maxTokens>', 'Specify maximum tokens for this specific interaction.')
    .action(async (name: string, userPrompt: string, options: {maxTokens?: string}) => {
      try {
        const mode = await getMode(name);
        if (!mode) {
          console.error(`Mode "${name}" not found.`);
          console.log('Use `roo-cli mode list` to see available modes.');
          process.exit(1);
        }

        const provider = await getProviderForMode(mode.provider);
        if (!provider) {
          // Error message already shown by getProviderForMode
          process.exit(1);
        }

        // Combine system prompt from mode with user's prompt.
        // How they are combined can be provider-specific. For OpenAI, we can use a system message.
        // For simplicity here, we'll prepend. A more robust solution might involve message arrays.
        // const combinedPrompt = `${mode.prompt}\n\nUser: ${userPrompt}`; // Simple prepend

        console.log(`Using mode "${name}" with provider "${mode.provider}" (model: ${mode.model || provider.config.defaultModel || 'API default'})...`);

        const chatOptions: any = {};
        if (mode.model) { // Model from mode definition takes precedence
          chatOptions.model = mode.model;
        }
        // Allow overriding max_tokens for this specific 'use' command
        if (options.maxTokens) {
          const mt = parseInt(options.maxTokens, 10);
          if (!isNaN(mt) && mt > 0) {
            chatOptions.max_tokens = mt;
          } else {
            console.warn(`Invalid max-tokens value: "${options.maxTokens}". Using provider/API default.`);
          }
        }


        // This is a simplified chat interaction for demonstration.
        // A more sophisticated approach would involve constructing a proper message history
        // if the provider supports it (e.g., [{role: 'system', content: mode.prompt}, {role: 'user', content: userPrompt}])
        // For now, we send the combined prompt as a single user message to the provider's chat method.
        // The provider's chat method might need to be aware of how to handle system prompts if passed.
        // The current OpenAIProvider just takes a string prompt.

        // If the provider's chat method can take a structured prompt (e.g., messages array):
        // const response = await provider.chat([{role: 'system', content: mode.prompt}, {role: 'user', content: userPrompt}], chatOptions);
        // For now, we assume the provider's chat method takes the prompt string as is.
        // And the OpenAI provider will wrap it as a user message.
        // To use the mode's system prompt effectively with OpenAI, OpenAIProvider.chat should be updated
        // to accept message arrays or a system prompt parameter.

        // Temporary workaround: pass system prompt via options if provider supports it.
        // This requires OpenAIProvider to be updated. For now, we'll just combine.
        if (provider.providerName === 'openai') {
            chatOptions.systemPrompt = mode.prompt; // A hypothetical option
        }

        let finalPrompt = userPrompt;
        if (provider.providerName === 'openai') {
            // Pass system prompt separately for OpenAI
            chatOptions.systemPrompt = mode.prompt;
        } else {
            // For other providers, prepend system prompt to user prompt (current naive approach)
            // This part might need to be customized based on how other providers handle system prompts
            finalPrompt = `${mode.prompt}\n\nUser: ${userPrompt}`;
        }

        const response = await provider.chat(finalPrompt, chatOptions);

        console.log(`\nResponse (mode: ${name}):\n`);
        console.log(response);

      } catch (error) {
        console.error(`Error using mode "${name}":`, error);
        process.exit(1);
      }
    });
}
