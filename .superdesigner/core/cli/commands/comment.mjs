/**
 * Comment command - posts comments to Figma.
 * Delegates to scripts/comment.mjs via spawn.
 */

import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = join(__dirname, '../../../scripts/comment.mjs');

/**
 * Run the comment command.
 * @param {string[]} args - Command arguments to pass through
 * @returns {Promise<void>}
 */
export function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [SCRIPT_PATH, ...args], {
      stdio: 'inherit',
      cwd: process.cwd()
    });

    child.on('error', reject);

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        process.exit(code);
      }
    });
  });
}
