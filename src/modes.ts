import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const CONFIG_DIR_NAME = '.roo-cli'; // Same directory as main config
const MODES_FILE_NAME = 'modes.json';

function getModesDirPath(): string {
  return path.join(os.homedir(), CONFIG_DIR_NAME);
}
function getModesFilePath(): string {
  return path.join(getModesDirPath(), MODES_FILE_NAME);
}

export interface CustomMode {
  name: string;
  prompt: string; // System prompt or instructions
  provider: string; // AI provider name (e.g., 'openai')
  model?: string; // Optional specific model
  // We can add other mode-specific configurations here later
  [key: string]: any;
}

export interface ModesConfig {
  modes: {
    [modeName: string]: CustomMode;
  };
}

async function ensureModesConfigDirExists(): Promise<void> {
  try {
    await fs.mkdir(getModesDirPath(), { recursive: true });
  } catch (error: any) {
    if (error.code !== 'EEXIST') {
      console.error(`Error creating modes config directory ${getModesDirPath()}:`, error);
      throw error;
    }
  }
}

export async function loadModes(): Promise<ModesConfig> {
  await ensureModesConfigDirExists();
  try {
    const fileContent = await fs.readFile(getModesFilePath(), 'utf-8');
    const parsedContent = JSON.parse(fileContent) as ModesConfig;
    // Ensure modes property exists
    if (!parsedContent || !parsedContent.modes) { // Added check for parsedContent itself
        return { modes: {} };
    }
    return parsedContent;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // Modes file doesn't exist, return default empty config
      return { modes: {} };
    }
    console.error(`Error reading modes file ${getModesFilePath()}:`, error);
    throw error;
  }
}

export async function saveModes(modesConfig: ModesConfig): Promise<void> {
  await ensureModesConfigDirExists();
  try {
    // Ensure modes property exists before saving
    if (!modesConfig.modes) {
        modesConfig.modes = {};
    }
    const fileContent = JSON.stringify(modesConfig, null, 2);
    await fs.writeFile(getModesFilePath(), fileContent, 'utf-8');
    console.log(`Custom modes saved to ${getModesFilePath()}`);
  } catch (error) {
    console.error(`Error writing modes file ${getModesFilePath()}:`, error);
    throw error;
  }
}

// --- Mode specific functions ---

export async function addMode(mode: CustomMode): Promise<void> {
  const modesConfig = await loadModes();
  if (modesConfig.modes[mode.name]) {
    console.warn(`Mode "${mode.name}" already exists. It will be overwritten.`);
  }
  modesConfig.modes[mode.name] = mode;
  await saveModes(modesConfig);
}

export async function removeMode(modeName: string): Promise<void> {
  const modesConfig = await loadModes();
  if (!modesConfig.modes[modeName]) {
    console.warn(`Mode "${modeName}" not found.`);
    return;
  }
  delete modesConfig.modes[modeName];
  await saveModes(modesConfig);
  console.log(`Mode "${modeName}" removed successfully.`);
}

export async function getMode(modeName: string): Promise<CustomMode | undefined> {
  const modesConfig = await loadModes();
  return modesConfig.modes[modeName];
}

export async function getAllModes(): Promise<{ [modeName: string]: CustomMode }> {
  const modesConfig = await loadModes();
  return modesConfig.modes;
}
