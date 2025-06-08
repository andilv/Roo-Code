import axios, { AxiosInstance, AxiosError } from 'axios';
import { BaseProvider } from './baseProvider'; // AIProviderConfig is not needed here anymore

const DEFAULT_OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_OPENAI_MODEL = 'gpt-3.5-turbo';

export class OpenAIProvider extends BaseProvider {
  readonly providerName = 'openai';
  private httpClient: AxiosInstance;

  constructor() {
    super(); // BaseProvider constructor doesn't take config directly now
    this.httpClient = axios.create();
    // Configuration (API key, endpoint, defaultModel) will be loaded via this.configure()
  }

  // configure is inherited from BaseProvider and will load this.config

  async chat(
    prompt: string,
    options?: { model?: string; max_tokens?: number; systemPrompt?: string }
  ): Promise<string> {
    // Ensure configuration has been loaded
    if (!this.config || !this.config.apiKey) {
      // Try to configure if not already done.
      // This might happen if configure() wasn't explicitly called before chat()
      // This provides a fallback but explicit configuration is better.
      console.warn(`OpenAIProvider not explicitly configured before chat. Attempting to load config for '${this.providerName}'.`);
      await this.configure(this.providerName);
      if (!this.config || !this.config.apiKey) {
        throw new Error('OpenAI API key is not configured. Call configure() or set up config file.');
      }
    }

    const apiUrl = this.config.endpoint || DEFAULT_OPENAI_API_URL;
    const model = options?.model || this.config.defaultModel || DEFAULT_OPENAI_MODEL;
    const max_tokens = options?.max_tokens || 150; // Default max tokens, could also be in config

    try {
      const response = await this.httpClient.post(
        apiUrl,
        {
          model: model,
          messages: options?.systemPrompt
            ? [
                { role: 'system', content: options.systemPrompt },
                { role: 'user', content: prompt }
              ]
            : [{ role: 'user', content: prompt }],
          max_tokens: max_tokens,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`, // apiKey is now definitely set if configure() succeeded
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data && response.data.choices && response.data.choices.length > 0 && response.data.choices[0].message) {
        return response.data.choices[0].message.content.trim();
      } else {
        console.warn('Unexpected OpenAI response structure:', response.data);
        throw new Error('No valid response choices found from OpenAI.');
      }
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        console.error(`Error response from OpenAI (url: ${apiUrl}):`, axiosError.response.status, JSON.stringify(axiosError.response.data, null, 2));
        throw new Error(`OpenAI API request failed: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`);
      } else if (axiosError.request) {
        console.error(`Error sending request to OpenAI (url: ${apiUrl}):`, axiosError.request);
        throw new Error('No response received from OpenAI.');
      } else {
        console.error(`Error setting up OpenAI request (url: ${apiUrl}):`, axiosError.message);
        throw new Error(`Failed to make OpenAI request: ${axiosError.message}`);
      }
    }
  }
}
