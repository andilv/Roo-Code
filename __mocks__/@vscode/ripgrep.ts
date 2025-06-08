// __mocks__/@vscode/ripgrep.ts

// Provide a fake path for rgPath. It doesn't need to exist.
// The actual execution will be mocked via child_process.execFile.
export const rgPath = 'mocked/path/to/ripgrep/binary/rg';

// If other exports from @vscode/ripgrep are used by your code, mock them here.
// For example, if there's a search function directly exported by it:
// export const search = jest.fn().mockResolvedValue("mocked search results");

// You can also add helpers here if needed, e.g., to control what rgPath returns
// or to help configure the child_process mock for this specific rgPath.
let mockRgPath: string | null = rgPath;

export const __setMockRgPath = (newPath: string | null) => {
    // This is tricky because rgPath is a const.
    // To make rgPath dynamic for testing, the module itself would need to export it differently,
    // or we'd have to mock it more deeply using jest.doMock.
    // For now, we assume rgPath is consistently 'mocked/path/to/ripgrep/binary/rg'
    // and tests will rely on mocking child_process.execFile for this path.
    // If rgPath itself needs to be null or different for a test, that test
    // would need to use jest.doMock to change the module's exports for that specific test.
    console.warn("__setMockRgPath is a conceptual helper; rgPath is a const. Use jest.doMock for dynamic rgPath values.");
    if (newPath === null) {
        // To simulate rgPath being null (e.g., ripgrep not found)
        // module.exports.rgPath = null; // This won't work for ES6 module const
        // This requires a more advanced mocking setup like jest.spyOn(module, 'rgPath', 'get').mockReturnValue(null)
        // or using jest.resetModules() and jest.doMock() before import.
    }
    mockRgPath = newPath; // This won't actually change the exported const
};

// This is just to have a value that the mock can "change", though the export is const.
export const getMockRgPath = () => mockRgPath;
