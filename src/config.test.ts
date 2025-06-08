// src/config.test.ts
import * as configManager from './config';
import * as osMockOrigin from 'os';
import * as path from 'path';
// fs/promises types are not directly used here, relying on jest.Mock inference for mocked functions

jest.mock('fs/promises');
jest.mock('os');

// Import specific functions and helpers directly from the mocked 'fs/promises'
import {
  readFile as mockedReadFile,
  writeFile as mockedWriteFile,
  mkdir as mockedMkdir,
  __setMockFiles,
  __clearMockFiles,
  __setMockError,
  __getMockFiles // Needed for some specific readFile mock implementations
} from 'fs/promises';

const mockedOs = osMockOrigin as jest.Mocked<typeof osMockOrigin>;

let MOCK_HOME_DIR: string;
let CONFIG_DIR_PATH: string;
let CONFIG_FILE_PATH: string;

describe('config.ts', () => {
  beforeAll(() => {
    MOCK_HOME_DIR = '/mocked/home/user';
    CONFIG_DIR_PATH = path.join(MOCK_HOME_DIR, '.roo-cli');
    CONFIG_FILE_PATH = path.join(CONFIG_DIR_PATH, 'config.json');
    (mockedOs.homedir as jest.Mock).mockReturnValue(MOCK_HOME_DIR);
  });

  beforeEach(() => {
    // jest.clearAllMocks(); // Not strictly needed if __clearMockFiles resets its functions
    __clearMockFiles(); // This helper now also calls .mockReset() on fs functions
    __setMockError(null);

    // Default readFile mock for this suite (can be overridden in specific tests)
    mockedReadFile.mockImplementation(async (filePathQuery: path.PlatformPath | number) => {
        const files = __getMockFiles(); // Use imported helper
        const pathStr = filePathQuery.toString();
        if (Object.prototype.hasOwnProperty.call(files, pathStr)) {
            return files[pathStr];
        }
        const e: any = new Error(`ENOENT: no such file or directory, open '${pathStr}'`);
        e.code = 'ENOENT';
        throw e;
    });
    mockedWriteFile.mockResolvedValue(undefined); // Default successful write
    mockedMkdir.mockResolvedValue(undefined); // Default successful mkdir

    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  });

  describe('loadConfig', () => {
    it('should create config directory if it does not exist', async () => {
      mockedReadFile.mockRejectedValueOnce({ code: 'ENOENT' } as any);
      await configManager.loadConfig();
      expect(mockedMkdir).toHaveBeenCalledWith(CONFIG_DIR_PATH, { recursive: true });
    });

    it('should return default empty config if config file does not exist', async () => {
      mockedReadFile.mockRejectedValueOnce({ code: 'ENOENT' } as any);
      const config = await configManager.loadConfig();
      expect(config).toEqual({ providers: {} });
    });

    it('should load and parse config file if it exists', async () => {
      const mockConfigData: configManager.ConfigData = {
        providers: { openai: { apiKey: 'sk-123', defaultModel: 'gpt-4' } },
      };
      __setMockFiles({ [CONFIG_FILE_PATH]: JSON.stringify(mockConfigData) });

      const config = await configManager.loadConfig();
      expect(config).toEqual(mockConfigData);
      expect(mockedReadFile).toHaveBeenCalledWith(CONFIG_FILE_PATH, 'utf-8');
    });

    it('should throw error if config file is malformed', async () => {
      __setMockFiles({ [CONFIG_FILE_PATH]: 'malformed json' });
      await expect(configManager.loadConfig()).rejects.toThrow(SyntaxError);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Error reading config file'), expect.any(SyntaxError));
    });

     it('should rethrow error from fs.mkdir if not EEXIST', async () => {
      const mkdirError = new Error('Disk full');
      (mkdirError as any).code = 'EDISKFULL';
      mockedMkdir.mockRejectedValueOnce(mkdirError);

      await expect(configManager.loadConfig()).rejects.toThrow('Disk full');
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Error creating config directory'), mkdirError);
    });
  });

  describe('saveConfig', () => {
    it('should correctly stringify and write the provided config data', async () => {
      const configData: configManager.ConfigData = {
        providers: {
          testProvider1: { apiKey: 'key-abc', defaultModel: 'model-1' },
          testProvider2: { apiKey: 'key-xyz', endpoint: 'custom-ep' }
        },
      };
      await configManager.saveConfig(configData);

      expect(mockedWriteFile).toHaveBeenCalledWith(
        CONFIG_FILE_PATH,
        JSON.stringify(configData, null, 2),
        'utf-8'
      );
      expect(console.log).toHaveBeenCalledWith(`Configuration saved to ${CONFIG_FILE_PATH}`);
    });

    it('should throw and log error if writeFile fails', async () => {
        const writeError = new Error('Permission denied');
        mockedWriteFile.mockRejectedValueOnce(writeError);
        const configData: configManager.ConfigData = { providers: {} };

        await expect(configManager.saveConfig(configData)).rejects.toThrow('Permission denied');
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Error writing config file'), writeError);
    });
  });

  describe('Provider Config Functions', () => {
    const providerName = 'myOpenAI';
    const providerDetails: configManager.AIProviderDetails = {
      apiKey: 'sk-xyz789',
      endpoint: 'https://api.example.com/v1',
      defaultModel: 'gpt-turbo-instruct',
    };

    // beforeEach specific to this describe block is not strictly needed anymore
    // as the global beforeEach sets up default readFile/writeFile mocks.

    it('addProviderConfig should add a new provider and save', async () => {
      mockedReadFile.mockRejectedValueOnce({ code: 'ENOENT' } as any);

      await configManager.addProviderConfig(providerName, providerDetails);

      const expectedConfig: configManager.ConfigData = {
        providers: { [providerName]: providerDetails },
      };
      expect(mockedWriteFile).toHaveBeenCalledWith(
        CONFIG_FILE_PATH,
        JSON.stringify(expectedConfig, null, 2),
        'utf-8'
      );
    });

    it('addProviderConfig should overwrite an existing provider and log specific warning', async () => {
        const initialDetails: configManager.AIProviderDetails = { apiKey: 'old-key' };
        const initialConfig: configManager.ConfigData = {
            providers: { [providerName]: initialDetails }
        };
        __setMockFiles({ [CONFIG_FILE_PATH]: JSON.stringify(initialConfig) });

        await configManager.addProviderConfig(providerName, providerDetails);

        expect(console.warn).toHaveBeenCalledWith(`Provider "${providerName}" already exists. It will be overwritten.`);
        const expectedConfig: configManager.ConfigData = {
            providers: { [providerName]: providerDetails },
        };
        expect(mockedWriteFile).toHaveBeenCalledWith(
            CONFIG_FILE_PATH,
            JSON.stringify(expectedConfig, null, 2),
            'utf-8'
        );
    });

    it('removeProviderConfig should remove an existing provider and save', async () => {
      const anotherProviderDetails = {apiKey: 'key-123'};
      const initialConfig: configManager.ConfigData = {
        providers: {
            [providerName]: providerDetails,
            'anotherProvider': anotherProviderDetails
        },
      };
      __setMockFiles({ [CONFIG_FILE_PATH]: JSON.stringify(initialConfig) });

      await configManager.removeProviderConfig(providerName);

      const expectedConfig: configManager.ConfigData = {
        providers: { 'anotherProvider': anotherProviderDetails },
      };
      expect(mockedWriteFile).toHaveBeenCalledWith(
        CONFIG_FILE_PATH,
        JSON.stringify(expectedConfig, null, 2),
        'utf-8'
      );
    });

    it('removeProviderConfig should warn if provider not found with specific message', async () => {
        mockedReadFile.mockRejectedValueOnce({ code: 'ENOENT' } as any);
        const targetProviderName = 'nonExistentProvider';
        await configManager.removeProviderConfig(targetProviderName);
        expect(console.warn).toHaveBeenCalledWith(`Provider "${targetProviderName}" not found in configuration.`);
        expect(mockedWriteFile).not.toHaveBeenCalled();
    });

    it('getProviderConfig should return provider details if found', async () => {
      const configData: configManager.ConfigData = { providers: { [providerName]: providerDetails } };
      __setMockFiles({ [CONFIG_FILE_PATH]: JSON.stringify(configData) });

      const details = await configManager.getProviderConfig(providerName);
      expect(details).toEqual(providerDetails);
    });

    it('getProviderConfig should return undefined if not found', async () => {
      mockedReadFile.mockRejectedValueOnce({ code: 'ENOENT' } as any);
      const details = await configManager.getProviderConfig('notFoundProvider');
      expect(details).toBeUndefined();
    });

    it('getAllProviderConfigs should return all providers', async () => {
      const configData: configManager.ConfigData = {
        providers: {
            p1: { apiKey: 'k1' },
            p2: { apiKey: 'k2', defaultModel: 'm2' }
        },
      };
      __setMockFiles({ [CONFIG_FILE_PATH]: JSON.stringify(configData) });

      const allProviders = await configManager.getAllProviderConfigs();
      expect(allProviders).toEqual(configData.providers);
    });

     it('getAllProviderConfigs should return empty object if config file is empty or not present', async () => {
        mockedReadFile.mockRejectedValueOnce({ code: 'ENOENT' } as any);
        const allProviders = await configManager.getAllProviderConfigs();
        expect(allProviders).toEqual({});
    });
  });
});
