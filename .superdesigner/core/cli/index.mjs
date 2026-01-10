/**
 * Superdesigner CLI router.
 * Routes commands to their respective handlers.
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(__dirname, '../../..'); // workspace root where package.json lives

const COMMANDS = ['init', 'new', 'review', 'comment', 'doctor'];

/**
 * Calculate Levenshtein distance between two strings.
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} - Edit distance
 */
function levenshtein(a, b) {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Find the closest matching command.
 * @param {string} input - User input
 * @returns {{command: string, similarity: number}|null} - Best match or null
 */
function findClosestCommand(input) {
  let bestMatch = null;
  let bestDistance = Infinity;

  for (const cmd of COMMANDS) {
    const distance = levenshtein(input.toLowerCase(), cmd);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = cmd;
    }
  }

  // Calculate similarity as percentage (1 - distance/maxLength)
  const maxLen = Math.max(input.length, bestMatch?.length || 0);
  const similarity = maxLen > 0 ? (1 - bestDistance / maxLen) * 100 : 0;

  if (similarity >= 50 && bestMatch) {
    return { command: bestMatch, similarity };
  }

  return null;
}

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
 * Print CLI usage information.
 */
function printUsage() {
  console.log(`
superdesigner - A lean design review workflow for Cursor

Usage:
  superdesigner <command> [options]

Commands:
  init      Create a new project (alias for 'new')
  review    Generate design review prompts
  comment   Post comments to Figma
  doctor    Check system requirements and configuration

Options:
  -h, --help     Show this help message
  -v, --version  Show version number

Review Options:
  --agent                  Run Cursor Agent after generating prompts
  --agent-timeout <min>    Agent timeout in minutes (default: 10)

Examples:
  superdesigner init "My Project"
  superdesigner review my-project
  superdesigner review my-project --agent
  superdesigner review my-project --agent --agent-timeout 15
  superdesigner comment my-project --dry-run
  superdesigner doctor
`);
}

/**
 * Print unknown command error with suggestions.
 * @param {string} command - The unknown command
 */
function printUnknownCommand(command) {
  console.error(`Unknown command: ${command}`);
  console.error('');

  const suggestion = findClosestCommand(command);
  if (suggestion) {
    console.error(`Did you mean "${suggestion.command}"?`);
    console.error('');
  }

  console.error('Available commands: init, review, comment, doctor');
  console.error('Run "superdesigner --help" for usage information.');
}

/**
 * Run the CLI with the given arguments.
 * @param {string[]} args - Command line arguments (without node and script path)
 */
export async function run(args) {
  const firstArg = args[0];

  // Handle global flags
  if (!firstArg || firstArg === '-h' || firstArg === '--help') {
    printUsage();
    process.exit(0);
  }

  if (firstArg === '-v' || firstArg === '--version') {
    console.log(getVersion());
    process.exit(0);
  }

  // Route to command handlers
  const command = firstArg;
  const commandArgs = args.slice(1);

  try {
    switch (command) {
      case 'init':
      case 'new': {
        const { run: runInit } = await import('./commands/init.mjs');
        await runInit(commandArgs);
        break;
      }
      case 'review': {
        const { run: runReview } = await import('./commands/review.mjs');
        await runReview(commandArgs);
        break;
      }
      case 'comment': {
        const { run: runComment } = await import('./commands/comment.mjs');
        await runComment(commandArgs);
        break;
      }
      case 'doctor': {
        const { run: runDoctor } = await import('./commands/doctor.mjs');
        await runDoctor(commandArgs);
        break;
      }
      default:
        printUnknownCommand(command);
        process.exit(1);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
