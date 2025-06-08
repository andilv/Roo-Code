// __mocks__/diff.ts

const applyPatch = jest.fn((source: string, patch: string | UniDiff | UniDiff[]) => {
  // Simulate successful patch application
  if (typeof patch === 'string' && patch.includes('INVALID_PATCH')) {
    return false; // Simulate patch failure
  }
  if (typeof patch === 'string' && patch.includes('THROW_ERROR')) {
    throw new Error('Simulated error during applyPatch');
  }
  // For a simple successful mock, let's append patch content to source or a fixed string.
  // A real test might need more sophisticated mock behavior.
  return `${source}\n[PATCHED_WITH:${patch.replace(/\n/g, '_')}]`;
});

// If other functions from 'diff' are used, mock them here as well.
// e.g., createPatch, parsePatch, etc.

export { applyPatch };

// Define UniDiff if necessary for type checking in tests, though the mock itself is loose.
export interface UniDiff {
  oldFileName?: string;
  newFileName?: string;
  oldHeader?: string;
  newHeader?: string;
  hunks: Hunk[];
}
export interface Hunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: string[];
  linedelimiters?: string[];
}
