// src/modes.test.ts
import * as modeManager from './modes';
import * as osMockOrigin from 'os';
import * as path from 'path';
import type { PathLike, MakeDirectoryOptions } from 'fs'; // Import specific types needed

jest.mock('fs/promises');
jest.mock('os');

// Import specific functions and helpers from the mocked 'fs/promises'
import {
  readFile as mockedReadFile,
  writeFile as mockedWriteFile,
  mkdir as mockedMkdir,
  __setMockFiles,
  __clearMockFiles,
  __getMockFiles
  // __setMockError, // Not used by modes.test.ts directly
  // __setMockDirentObjects // Not used by modes.test.ts directly
} from 'fs/promises';

const mockedOs = osMockOrigin as jest.Mocked<typeof osMockOrigin>;

let MOCK_HOME_DIR: string;
let MODES_DIR_PATH: string;
let MODES_FILE_PATH: string;

describe('modes.ts', () => {
  beforeAll(() => {
    MOCK_HOME_DIR = '/mocked/home/user';
    MODES_DIR_PATH = path.join(MOCK_HOME_DIR, '.roo-cli');
    MODES_FILE_PATH = path.join(MODES_DIR_PATH, 'modes.json');
    (mockedOs.homedir as jest.Mock).mockReturnValue(MOCK_HOME_DIR);
  });

  beforeEach(() => {
    jest.clearAllMocks(); // Important for spies and general mock state
    __clearMockFiles(); // Use directly imported helper
    // mockedReadFile.mockClear(); // Covered by __clearMockFiles
    // mockedWriteFile.mockClear();
    // mockedMkdir.mockClear();
    // __setMockError(null); // Also covered by __clearMockFiles

    // Default mock for readFile to use the mock store for modes tests
    mockedReadFile.mockImplementation(async (filePathQuery: PathLike | number) => {
        const files = __getMockFiles(); // Use imported helper
        const pathStr = filePathQuery.toString();
        if (Object.prototype.hasOwnProperty.call(files, pathStr)) return files[pathStr];
        const e: any = new Error(`ENOENT from mockRead (modes): ${pathStr}`); e.code = 'ENOENT'; throw e;
    });
    mockedWriteFile.mockResolvedValue(undefined); // Default successful write
    mockedMkdir.mockResolvedValue(undefined); // Default successful mkdir


    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  });

  describe('loadModes', () => {
    it('should create modes directory if it does not exist', async () => {
      mockedReadFile.mockRejectedValueOnce({ code: 'ENOENT' } as any);
      await modeManager.loadModes();
      expect(mockedMkdir).toHaveBeenCalledWith(MODES_DIR_PATH, { recursive: true });
    });

    it('should return default empty modes config if modes file does not exist', async () => {
      mockedReadFile.mockRejectedValueOnce({ code: 'ENOENT' } as any);
      const modesConfig = await modeManager.loadModes();
      expect(modesConfig).toEqual({ modes: {} });
    });

    it('should return default empty modes if modes file exists but modes property is missing', async () => {
        __setMockFiles({ [MODES_FILE_PATH]: JSON.stringify({}) });
        const modesConfig = await modeManager.loadModes();
        expect(modesConfig).toEqual({ modes: {} });
    });

    it('should load and parse modes file if it exists', async () => {
      const mockMode: modeManager.CustomMode = { name: 'testMode', prompt: 'Behave like a pirate.', provider: 'openai' };
      const mockModesConfig: modeManager.ModesConfig = {
        modes: { [mockMode.name]: mockMode },
      };
      __setMockFiles({ [MODES_FILE_PATH]: JSON.stringify(mockModesConfig) });

      const modesConfig = await modeManager.loadModes();
      expect(modesConfig).toEqual(mockModesConfig);
      expect(mockedReadFile).toHaveBeenCalledWith(MODES_FILE_PATH, 'utf-8');
    });

    it('should throw error if modes file is malformed', async () => {
      __setMockFiles({ [MODES_FILE_PATH]: '---malformed json---' });
      await expect(modeManager.loadModes()).rejects.toThrow(SyntaxError);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Error reading modes file'), expect.any(SyntaxError));
    });
  });

  describe('saveModes', () => {
    it('should write modes config to file and log success', async () => {
      const mockMode: modeManager.CustomMode = { name: 'testMode', prompt: 'Test prompt', provider: 'testProvider' };
      const modesConfig: modeManager.ModesConfig = {
        modes: { [mockMode.name]: mockMode },
      };
      await modeManager.saveModes(modesConfig);
      expect(mockedWriteFile).toHaveBeenCalledWith(
        MODES_FILE_PATH,
        JSON.stringify(modesConfig, null, 2),
        'utf-8'
      );
      expect(console.log).toHaveBeenCalledWith(`Custom modes saved to ${MODES_FILE_PATH}`);
    });

     it('should ensure modes property exists when saving if initially undefined', async () => {
      const modesConfig: any = {};
      await modeManager.saveModes(modesConfig);
      expect(mockedWriteFile).toHaveBeenCalledWith(
        MODES_FILE_PATH,
        JSON.stringify({ modes: {} }, null, 2),
        'utf-8'
      );
    });

    it('should throw and log error if writeFile fails', async () => {
        const writeError = new Error('Disk full');
        mockedWriteFile.mockRejectedValueOnce(writeError);
        const modesConfig: modeManager.ModesConfig = { modes: {} };

        await expect(modeManager.saveModes(modesConfig)).rejects.toThrow('Disk full');
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Error writing modes file'), writeError);
    });
  });

  describe('Mode Management Functions', () => {
    const sampleMode: modeManager.CustomMode = {
      name: 'coder',
      prompt: 'You are a coding assistant.',
      provider: 'openai',
      model: 'gpt-4-turbo',
    };

    it('addMode should add a new mode and save', async () => {
      mockedReadFile.mockRejectedValueOnce({ code: 'ENOENT' } as any);

      await modeManager.addMode(sampleMode);

      const expectedModesConfig: modeManager.ModesConfig = {
        modes: { [sampleMode.name]: sampleMode },
      };
      expect(mockedWriteFile).toHaveBeenCalledWith(
        MODES_FILE_PATH,
        JSON.stringify(expectedModesConfig, null, 2),
        'utf-8'
      );
    });

    it('addMode should overwrite an existing mode and warn', async () => {
        const oldPrompt = 'Old prompt';
        const initialMode: modeManager.CustomMode = { ...sampleMode, prompt: oldPrompt };
        const initialConfig: modeManager.ModesConfig = { modes: { [sampleMode.name]: initialMode }};
        __setMockFiles({ [MODES_FILE_PATH]: JSON.stringify(initialConfig) });

        await modeManager.addMode(sampleMode);

        expect(console.warn).toHaveBeenCalledWith(`Mode "${sampleMode.name}" already exists. It will be overwritten.`);
        const expectedConfig: modeManager.ModesConfig = { modes: { [sampleMode.name]: sampleMode }};
        expect(mockedWriteFile).toHaveBeenCalledWith(
            MODES_FILE_PATH,
            JSON.stringify(expectedConfig, null, 2),
            'utf-8'
        );
    });

    it('removeMode should remove an existing mode and save', async () => {
      const anotherMode: modeManager.CustomMode = { name: 'translator', prompt: 'Translate text', provider: 'google-gemini'};
      const initialConfig: modeManager.ModesConfig = {
        modes: {
            [sampleMode.name]: sampleMode,
            [anotherMode.name]: anotherMode,
        },
      };
      __setMockFiles({ [MODES_FILE_PATH]: JSON.stringify(initialConfig) });

      await modeManager.removeMode(sampleMode.name);

      const expectedConfig: modeManager.ModesConfig = { modes: { [anotherMode.name]: anotherMode } };
      expect(mockedWriteFile).toHaveBeenCalledWith(
        MODES_FILE_PATH,
        JSON.stringify(expectedConfig, null, 2),
        'utf-8'
      );
      expect(console.log).toHaveBeenCalledWith(`Mode "${sampleMode.name}" removed successfully.`);
    });

    it('removeMode should warn if mode not found and not save', async () => {
        mockedReadFile.mockRejectedValueOnce({ code: 'ENOENT' } as any);
        await modeManager.removeMode('nonExistentMode');
        expect(console.warn).toHaveBeenCalledWith('Mode "nonExistentMode" not found.');
        expect(mockedWriteFile).not.toHaveBeenCalled();
    });

    it('getMode should return mode details if found', async () => {
      const modesConfig: modeManager.ModesConfig = { modes: { [sampleMode.name]: sampleMode } };
      __setMockFiles({ [MODES_FILE_PATH]: JSON.stringify(modesConfig) });

      const details = await modeManager.getMode(sampleMode.name);
      expect(details).toEqual(sampleMode);
    });

    it('getMode should return undefined if not found', async () => {
      mockedReadFile.mockRejectedValueOnce({ code: 'ENOENT' } as any);
      const details = await modeManager.getMode('notFoundMode');
      expect(details).toBeUndefined();
    });

    it('getAllModes should return all modes', async () => {
      const modesConfig: modeManager.ModesConfig = {
        modes: {
            mode1: { name: 'm1', prompt: 'p1', provider: 'p1'},
            mode2: { name: 'm2', prompt: 'p2', provider: 'p2', model: 'modelX'}
        },
      };
      __setMockFiles({ [MODES_FILE_PATH]: JSON.stringify(modesConfig) });

      const allModes = await modeManager.getAllModes();
      expect(allModes).toEqual(modesConfig.modes);
    });

    it('getAllModes should return empty object if modes file is empty or not present', async () => {
        mockedReadFile.mockRejectedValueOnce({ code: 'ENOENT' } as any);
        const allModes = await modeManager.getAllModes();
        expect(allModes).toEqual({});
    });
  });
});
