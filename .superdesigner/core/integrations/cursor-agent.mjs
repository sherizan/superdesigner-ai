/**
 * Cursor Agent CLI integration.
 * Runs the Cursor Agent in headless mode for automated design reviews.
 * 
 * Docs: https://cursor.com/docs/cli/headless
 */

import { spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';

const DEFAULT_TIMEOUT_MINUTES = 10;

/**
 * Check if Cursor Agent CLI is available.
 * @returns {Promise<boolean>}
 */
export function isCursorAgentAvailable() {
  return new Promise((resolve) => {
    const child = spawn('which', ['agent'], {
      stdio: ['ignore', 'pipe', 'ignore']
    });

    child.on('close', (code) => {
      resolve(code === 0);
    });

    child.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Print instructions for missing Cursor Agent CLI.
 */
export function printMissingAgentInstructions() {
  console.log('');
  console.log('⚠️  Cursor Agent CLI not found.');
  console.log('');
  console.log('To install:');
  console.log('');
  console.log('  curl https://cursor.com/install -fsS | bash');
  console.log('  agent login');
  console.log('');
  console.log('Or from Cursor:');
  console.log('  Cmd+Shift+P → "Install \'agent\' command"');
  console.log('');
  console.log('Manual workflow (without CLI):');
  console.log('  1. Open _review_prompt.md in Cursor');
  console.log('  2. Select all (Cmd+A) → Cmd+I → Agent mode');
  console.log('');
  console.log('Docs: https://cursor.com/docs/cli/headless');
  console.log('');
}

/**
 * Print instructions for authentication error.
 */
export function printAuthInstructions() {
  console.log('');
  console.log('⚠️  Cursor Agent requires authentication.');
  console.log('');
  console.log('Run this once to log in:');
  console.log('');
  console.log('  agent login');
  console.log('');
  console.log('Or set CURSOR_API_KEY for automation:');
  console.log('  export CURSOR_API_KEY=your_api_key_here');
  console.log('');
  console.log('Docs: https://cursor.com/docs/cli/reference/authentication');
  console.log('');
}

/**
 * Run Cursor Agent in headless mode.
 * Uses: agent -p --force "prompt" 
 *   -p / --print: non-interactive mode
 *   --force: allows file modifications (required for writing review files)
 * 
 * @param {object} options
 * @param {string} options.promptPath - Path to the prompt file
 * @param {string} options.workingDir - Working directory for agent
 * @param {number} [options.timeoutMinutes] - Timeout in minutes (default: 10)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function runCursorAgent(options) {
  const {
    promptPath,
    workingDir,
    timeoutMinutes = DEFAULT_TIMEOUT_MINUTES
  } = options;

  // Validate prompt file exists
  if (!existsSync(promptPath)) {
    return {
      success: false,
      error: `Prompt file not found: ${promptPath}`
    };
  }

  // Check if agent CLI is available
  const available = await isCursorAgentAvailable();
  if (!available) {
    printMissingAgentInstructions();
    return {
      success: false,
      error: 'Cursor Agent CLI not available'
    };
  }

  // Read prompt content
  const promptContent = readFileSync(promptPath, 'utf-8');

  console.log('');
  console.log('🤖 Running Cursor Agent...');
  console.log('');

  // Progress messages to show while agent is working
  const progressMessages = [
    '   Understanding context...',
    '   Analyzing requirements...',
    '   Reviewing design patterns...',
    '   Checking edge cases...',
    '   Connecting the dots...',
    '   Preparing review...',
    '   Finalizing insights...'
  ];

  return new Promise((resolve) => {
    const timeoutMs = timeoutMinutes * 60 * 1000;
    let timedOut = false;
    let messageIndex = 0;

    // Show progress messages every 3 seconds
    const progressInterval = setInterval(() => {
      if (messageIndex < progressMessages.length) {
        // Clear line and write new message (\x1b[2K clears entire line, \r returns to start)
        process.stdout.write(`\x1b[2K\r${progressMessages[messageIndex]}`);
        messageIndex++;
      }
    }, 3000);

    // Run agent in headless mode:
    // -p / --print: non-interactive, prints response
    // --force: allows file modifications without confirmation
    // --output-format text: clean output
    const child = spawn('agent', [
      '-p',
      '--force',
      '--output-format', 'text',
      promptContent
    ], {
      cwd: workingDir,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    // Suppress agent output (we show our own progress)
    child.stdout.on('data', () => {});
    child.stderr.on('data', () => {});

    // Set timeout
    const timer = setTimeout(() => {
      timedOut = true;
      clearInterval(progressInterval);
      child.kill('SIGTERM');
      console.log('');
      console.log('⏰ Agent timed out.');
    }, timeoutMs);

    child.on('error', (err) => {
      clearTimeout(timer);
      clearInterval(progressInterval);
      console.log('');
      resolve({
        success: false,
        error: err.message
      });
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      clearInterval(progressInterval);
      console.log('');

      if (timedOut) {
        resolve({
          success: false,
          error: 'Timed out'
        });
      } else if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({
          success: false,
          error: `Agent exited with code ${code}`
        });
      }
    });
  });
}
