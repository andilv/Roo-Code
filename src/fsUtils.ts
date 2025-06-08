import * as fs from 'fs/promises';
import * as Diff from 'diff';

export async function readFile(filePath: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    throw error;
  }
}

export async function listFiles(dirPath: string): Promise<string[]> {
  try {
    const files = await fs.readdir(dirPath);
    return files;
  } catch (error) {
    console.error(`Error listing files in directory ${dirPath}:`, error);
    throw error;
  }
}

export async function applyDiff(filePath: string, diffContent: string): Promise<void> {
  try {
    const originalContent = await readFile(filePath);
    const patchedContent = Diff.applyPatch(originalContent, diffContent);
    if (patchedContent === false) {
      throw new Error('Failed to apply patch. Diff may not be applicable.');
    }
    await writeFile(filePath, patchedContent);
    console.log(`Diff applied to file ${filePath} successfully.`);
  } catch (error) {
    console.error(`Error applying diff to file ${filePath}:`, error);
    throw error;
  }
}

export async function writeFile(filePath: string, content: string): Promise<void> {
  try {
    await fs.writeFile(filePath, content, 'utf-8');
    console.log(`File ${filePath} written successfully.`);
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
    throw error;
  }
}
