// __mocks__/child_process.ts

import { jest } from '@jest/globals'; // Import Jest types for jest.fn

// The core 'exec' function is what we need to mock primarily for execUtils.
// It will be a jest.fn() so tests can provide specific implementations.
const exec = jest.fn(
  (
    command: string,
    optionsOrCallback: any, // Can be options object or callback
    callback?: (error: Error | null, stdout: string, stderr: string) => void
  ) => {
    // A very basic default implementation.
    // Tests should override this with mockImplementation for specific scenarios.
    // If this default is hit, it means a test didn't correctly mock a scenario.
    const cb = typeof optionsOrCallback === 'function' ? optionsOrCallback : callback;
    if (cb) {
      cb(new Error(`child_process.exec: Unmocked command: ${command}`), '', '');
    }
  }
);

// Mock other functions from child_process if they are used by the CLI.
const execFile = jest.fn();
const spawn = jest.fn();
const fork = jest.fn();
const execSync = jest.fn(); // Example if execSync was used

export {
  exec,
  execFile,
  spawn,
  fork,
  execSync, // Export if defined
};
