import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const CONFIG_DIR_NAME = '.roo-cli';
const CONFIG_FILE_NAME = 'config.json';

// Use functions to delay os.homedir() call until actually needed and after mocks can be set up
function getConfigDirPath(): string {
  return path.join(os.homedir(), CONFIG_DIR_NAME);
}
function getConfigFilePath(): string {
  return path.join(getConfigDirPath(), CONFIG_FILE_NAME);
}

export interface AIProviderDetails {
  apiKey: string;
  endpoint?: string;
  defaultModel?: string;
  [key: string]: any; // For other provider-specific options
}

export interface ConfigData {
  providers: {
    [providerName: string]: AIProviderDetails;
  };
  // We can add other global configurations here later
}

async function ensureConfigDirExists(): Promise<void> {
  try {
    await fs.mkdir(getConfigDirPath(), { recursive: true });
  } catch (error: any) {
    if (error.code !== 'EEXIST') {
      console.error(`Error creating config directory ${getConfigDirPath()}:`, error);
      throw error;
    }
  }
}

export async function loadConfig(): Promise<ConfigData> {
  await ensureConfigDirExists();
  try {
    const fileContent = await fs.readFile(getConfigFilePath(), 'utf-8');
    return JSON.parse(fileContent) as ConfigData;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // Config file doesn't exist, return default empty config
      return { providers: {} };
    }
    console.error(`Error reading config file ${getConfigFilePath()}:`, error);
    throw error;
  }
}

export async function saveConfig(config: ConfigData): Promise<void> {
  await ensureConfigDirExists();
  try {
    const fileContent = JSON.stringify(config, null, 2);
    await fs.writeFile(getConfigFilePath(), fileContent, 'utf-8');
    console.log(`Configuration saved to ${getConfigFilePath()}`);
  } catch (error) {
    console.error(`Error writing config file ${getConfigFilePath()}:`, error);
    throw error;
  }
}

// --- Provider specific config functions ---

export async function addProviderConfig(
  providerName: string,
  details: AIProviderDetails
): Promise<void> {
  const config = await loadConfig();
  if (config.providers[providerName]) {
    console.warn(`Provider "${providerName}" already exists. It will be overwritten.`);
  }
  config.providers[providerName] = details;
  await saveConfig(config);
}

export async function removeProviderConfig(providerName: string): Promise<void> {
  const config = await loadConfig();
  if (!config.providers[providerName]) {
    console.warn(`Provider "${providerName}" not found in configuration.`);
    return;
  }
  delete config.providers[providerName];
  await saveConfig(config);
}

export async function getProviderConfig(providerName: string): Promise<AIProviderDetails | undefined> {
  const config = await loadConfig();
  return config.providers[providerName];
}

export async function getAllProviderConfigs(): Promise<{ [providerName: string]: AIProviderDetails }> {
  const config = await loadConfig();
  return config.providers;
}
