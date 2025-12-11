import * as fs from 'fs/promises';

/**
 * Reads content from the specified file path.
 * @param filePath The path to the content file.
 * @returns The content as a string.
 */
export async function loadPostContent(filePath: string): Promise<string> {
    try {
        const content = await fs.readFile(filePath, { encoding: 'utf-8' });
        return content.trim();
    } catch (error) {
        console.error(`❌ Error reading content file at ${filePath}:`, error);
        throw new Error('Failed to load post content from the specified file path.');
    }
}
