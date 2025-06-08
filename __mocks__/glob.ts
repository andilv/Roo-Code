// __mocks__/glob.ts
import { jest } from '@jest/globals';

// This is the function that will be mocked (equivalent to glob.glob)
const globFn = jest.fn(
  (
    pattern: string,
    optionsOrCallback: any, // Can be options object or callback
    callback?: (err: Error | null, matches: string[]) => void
  ) => {
    const cb = typeof optionsOrCallback === 'function' ? optionsOrCallback : callback;
    // Default behavior: success with a generic match, or specific based on pattern
    if (pattern === 'error_pattern') {
      if (cb) cb(new Error('mock glob error'), []);
    } else if (pattern === 'no_matches_pattern') {
      if (cb) cb(null, []);
    } else {
      if (cb) cb(null, [`mock_match_for_${pattern}`]);
    }
  }
);

// To match `import * as glob from 'glob';` and then `glob.glob(...)`
// the mock should export an object with a 'glob' property.
// The default export can also be this object for flexibility.
const mockGlobNamespace = {
  glob: globFn,
  // Add other exports from 'glob' if used by the main code, e.g., sync, hasMagic etc.
  // For now, only 'glob' function is used by searchUtils.ts via promisify(glob.glob)
  sync: jest.fn(),
  hasMagic: jest.fn(),
};

export const glob = globFn; // Allows `import { glob } from 'glob'`
export default mockGlobNamespace; // Allows `import globNs from 'glob'; globNs.glob(...)`
                               // Also helps with `import * as glob from 'glob'; glob.glob(...)`
                               // as `glob.glob` would point to `mockGlobNamespace.glob` if default is treated as namespace.
                               // However, for `import * as glob from 'glob'`, Jest often makes each named export
                               // a property on the namespace. So `export const glob = globFn` is key.
                               // To be absolutely safe for `import * as glob`, one might structure it as:
                               // export const glob = globFn;
                               // export const sync = jest.fn();
                               // export default { glob: globFn, sync: jest.fn() }; // etc.
                               // The current setup with `export const glob = globFn` should work for `glob.glob`.
