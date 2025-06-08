import { Command } from 'commander';
import { BaseProvider } from '../ai/baseProvider';
import { OpenAIProvider } from '../ai/openaiProvider';
import { getAllProviderConfigs, getProviderConfig } from '../config'; // Import config functions

// Shared helper for AI command actions
async function handleAiAction(
  prompt: string,
  options: { provider?: string, model?: string, maxTokens?: string, systemPrompt?: string },
  defaultSystemPrompt?: string,
  actionName: string = 'AI operation'
) {
  let providerName = options.provider;
  if (!providerName) {
    const allConfigsData = await getAllProviderConfigs();
    const availableProviderNames = Object.keys(allConfigsData);
    if (availableProviderNames.length > 0) {
      providerName = availableProviderNames[0]; // Default to the first configured provider
      console.log(`No provider specified for ${actionName}, defaulting to "${providerName}".`);
    } else {
      console.error(`No AI providers configured for ${actionName}. Use \`roo-cli config add-provider\` to add one, or specify a provider with --provider.`);
      process.exit(1);
    }
  }

  const provider = await getProvider(providerName); // Uses the getProvider factory
  if (!provider) { process.exit(1); }

  const providerConfig = await getProviderConfig(providerName);
  const modelToUse = options.model || providerConfig?.defaultModel;

  console.log(`Sending prompt to ${providerName} for ${actionName} (model: ${modelToUse || 'provider default/API default'})...`);

  const chatOptions: any = {
    systemPrompt: options.systemPrompt || defaultSystemPrompt, // Use provided or default system prompt
  };
  if (modelToUse) chatOptions.model = modelToUse;
  if (options.maxTokens) {
    const mt = parseInt(options.maxTokens, 10);
    if (!isNaN(mt) && mt > 0) chatOptions.max_tokens = mt;
    else console.warn(`Invalid max-tokens for ${actionName}: "${options.maxTokens}". Using default.`);
  }

  try {
    const response = await provider.chat(prompt, chatOptions);
    console.log(`\nResponse from ${providerName} for ${actionName}:\n`);
    console.log(response);
  } catch (error) {
    // Error messages are usually logged by the provider or getProvider
    process.exit(1);
  }
}

// Factory to get provider instances
async function getProvider(providerName: string): Promise<BaseProvider | null> {
  // Provider details will be loaded from config within the provider's configure method
  let providerInstance: BaseProvider | null = null;

  switch (providerName.toLowerCase()) {
    case 'openai':
      providerInstance = new OpenAIProvider();
      break;
    // Add other providers here in the future
    // case 'anthropic':
    //   return new AnthropicProvider();
    default:
      console.error(`Unsupported or unknown AI provider: ${providerName}`);
      return null;
  }

  if (providerInstance) {
    try {
      // The configure method in BaseProvider now handles loading from config file
      // or falling back to environment variables.
      await providerInstance.configure(providerName); // Pass the name for config lookup
    } catch (error) {
      console.error(`Error configuring provider "${providerName}":`, error instanceof Error ? error.message : error);
      return null;
    }
  }
  return providerInstance;
}

export function registerAiCommands(program: Command) {
  const chatCommand = program
    .command('chat [provider] [prompt]') // Provider and prompt are now optional
    .description('Sends a prompt to an AI provider. Lists providers if none specified.')
    .option('-m, --model <modelName>', 'Specify the model to use (overrides provider default)')
    .option('-mt, --max-tokens <maxTokens>', 'Specify maximum tokens for the response')
    .action(async (providerNameArg: string | undefined, promptArg: string | undefined, options: { model?: string, maxTokens?: string }) => {
      if (!providerNameArg) {
        const allConfigsData = await getAllProviderConfigs();
        const availableProviderNames = Object.keys(allConfigsData);
        if (availableProviderNames.length === 0) {
          console.log('No AI providers configured. Use `config add-provider` to add one.');
        } else {
          console.log('Available AI providers (from config):');
          availableProviderNames.forEach(name => console.log(`- ${name}`));
        }
        console.log('\nUsage: roo-cli chat <providerName> <prompt>');
        process.exit(0);
      }

      if (!promptArg) {
        console.error('Prompt is required when a provider is specified.');
        console.log(`\nUsage: roo-cli chat ${providerNameArg} <prompt>`);
        process.exit(1);
      }
      // For the 'chat' command, we don't pass a default system prompt from here.
      // If a mode is used, the mode's system prompt will be handled by the mode command itself.
      // If OpenAIProvider is used directly, it defaults to no system prompt unless one is passed in options (which we aren't doing here for plain chat).
      await handleAiAction(promptArg, { provider: providerNameArg, ...options }, undefined, `chat with ${providerNameArg}`);
    });

  const generateCommand = program
    .command('generate <prompt>')
    .description('Sends a prompt to an AI provider to generate code.')
    .option('-p, --provider <providerName>', 'Specify the AI provider (defaults to first configured).')
    .option('-m, --model <modelName>', 'Specify the model to use.')
    .option('-mt, --max-tokens <maxTokens>', 'Specify maximum tokens for the response.')
    .option('-sp, --system-prompt <systemPrompt>', 'Custom system prompt for this generation.')
    .action(async (prompt: string, options: { provider?: string, model?: string, maxTokens?: string, systemPrompt?:string }) => {
      const defaultSystemPrompt = "You are a helpful code generation assistant. Please generate code based on the following request. Only output the code, with no additional explanation or conversation, unless specifically asked for it.";
      await handleAiAction(prompt, options, options.systemPrompt || defaultSystemPrompt, 'code generation');
    });

  const debugCommand = program
    .command('debug <prompt>')
    .description('Sends code or a description to an AI provider for debugging help.')
    .option('-p, --provider <providerName>', 'Specify the AI provider (defaults to first configured).')
    .option('-m, --model <modelName>', 'Specify the model to use.')
    .option('-mt, --max-tokens <maxTokens>', 'Specify maximum tokens for the response.')
    .option('-sp, --system-prompt <systemPrompt>', 'Custom system prompt for debugging.')
    .action(async (prompt: string, options: { provider?: string, model?: string, maxTokens?: string, systemPrompt?: string }) => {
      const defaultSystemPrompt = "You are a helpful debugging assistant. Analyze the following code or problem description and provide insights, suggestions, or a corrected version. Explain the issues and your reasoning clearly.";
      await handleAiAction(prompt, options, options.systemPrompt || defaultSystemPrompt, 'debugging assistance');
    });
}
