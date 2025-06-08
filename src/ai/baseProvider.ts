import { AIProviderDetails, getProviderConfig } from '../config';

export interface AIProvider {
  readonly providerName: string;
  configure(providerName: string): Promise<void>; // Now takes providerName to load from config
  chat(prompt: string, options?: any): Promise<string>;
  // Potentially other methods like embedding, etc.
}

export abstract class BaseProvider implements AIProvider {
  abstract readonly providerName: string; // This will be set by the concrete class (e.g., 'openai')
  protected config: AIProviderDetails = { apiKey: '' }; // Initialize with empty apiKey

  // Constructor might not need to take config directly anymore if loaded async
  constructor() {}

  async configure(providerNameFromUser?: string): Promise<void> {
    // Use the providerName from the class OR what the user specified (if they are different, it's an issue)
    const effectiveProviderName = providerNameFromUser || this.providerName;
    if (providerNameFromUser && providerNameFromUser !== this.providerName) {
        console.warn(`Configuring provider '${this.providerName}' with settings for '${providerNameFromUser}'. This might be unintended.`);
    }

    const providerDetails = await getProviderConfig(effectiveProviderName);
    if (!providerDetails) {
      // Fallback to environment variable if no config file entry found
      const envApiKey = process.env[`${effectiveProviderName.toUpperCase()}_API_KEY`];
      if (envApiKey) {
        console.warn(`No configuration found for provider "${effectiveProviderName}". Using API key from environment variable ${effectiveProviderName.toUpperCase()}_API_KEY.`);
        this.config = { apiKey: envApiKey };
      } else {
        throw new Error(
          `Configuration not found for provider "${effectiveProviderName}", and no corresponding environment variable (${effectiveProviderName.toUpperCase()}_API_KEY) is set.`
        );
      }
    } else {
      this.config = providerDetails;
    }

    if (!this.config.apiKey) {
      throw new Error(`API key for provider "${effectiveProviderName}" is missing in the configuration and environment variables.`);
    }
  }

  abstract chat(prompt: string, options?: any): Promise<string>;
}
