// __mocks__/os.ts
import * as osOriginal from 'os'; // Import the original 'os' module

const homedir = jest.fn(() => '/mocked/home/dir'); // Default mock home directory

// You can add other 'os' functions here if your code uses them
const platform = jest.fn(() => osOriginal.platform()); // Example: delegate to original
const arch = jest.fn(() => osOriginal.arch());
// ... etc.

const __setMockHomeDir = (path: string) => {
    homedir.mockReturnValue(path);
};

const __clearMockHomeDir = () => {
    homedir.mockReturnValue('/mocked/home/dir'); // Reset to default
}

export {
    homedir,
    platform,
    arch,
    // export other mocked functions
    __setMockHomeDir,
    __clearMockHomeDir,
};

// If you need to mock constants like os.EOL, you can do it this way:
// export const EOL = '\n'; // Or osOriginal.EOL if you want the real one often
// However, constants are harder to mock dynamically per test.
// It's often better if the code under test gets such values from functions if they need to be tested with variance.
// For now, assuming only homedir() needs specific control for config.ts tests.
