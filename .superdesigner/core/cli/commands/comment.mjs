/**
 * Comment command - posts comments to Figma.
 * Delegates to scripts/comment.mjs via spawn.
 */

import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { track, getCommonProps } from '../../../lib/telemetry.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = join(__dirname, '../../../scripts/comment.mjs');
const PACKAGE_ROOT = join(__dirname, '../../../..');

/**
 * Get package version from package.json.
 */
function getVersion() {
  try {
    const pkgPath = join(PACKAGE_ROOT, 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/**
 * Run the comment command.
 * @param {string[]} args - Command arguments to pass through
 * @returns {Promise<void>}
 */
export async function run(args) {
  // Track command execution (best-effort, non-blocking)
  const version = getVersion();
  track('cmd_comment', getCommonProps(version), { args });

  return new Promise((resolve, reject) => {
    // Filter out --no-telemetry flag before passing to script
    const scriptArgs = args.filter(arg => arg !== '--no-telemetry');

    const child = spawn(process.execPath, [SCRIPT_PATH, ...scriptArgs], {
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
