/**
 * Claude Code CLI integration.
 * Runs Claude Code in headless mode for automated design reviews.
 *
 * Cursor stays the editor and filesystem; Claude Code is the agent.
 * Docs: https://code.claude.com/docs/en/headless
 */

import { spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const DEFAULT_TIMEOUT_MINUTES = 10;

// Tools the review agent needs: read context, write the two insight files,
// and the Figma Dev Mode MCP tools (server name `figma` in .mcp.json).
const ALLOWED_TOOLS = [
  'Read',
  'Write',
  'Edit',
  'Glob',
  'Grep',
  'mcp__figma__get_metadata',
  'mcp__figma__get_design_context'
].join(',');

/**
 * Check if the Claude Code CLI is available.
 * @returns {Promise<boolean>}
 */
export function isClaudeCodeAvailable() {
  return new Promise((resolve) => {
    const child = spawn('which', ['claude'], {
      stdio: ['ignore', 'pipe', 'ignore']
    });

    child.on('close', (code) => resolve(code === 0));
    child.on('error', () => resolve(false));
  });
}

/**
 * Print instructions for a missing Claude Code CLI.
 */
export function printMissingClaudeInstructions() {
  console.log('');
  console.log('⚠️  Claude Code CLI not found.');
  console.log('');
  console.log('To install:');
  console.log('');
  console.log('  npm install -g @anthropic-ai/claude-code');
  console.log('  claude   # run once to sign in');
  console.log('');
  console.log('Manual workflow (without the CLI):');
  console.log('  1. Open this repo in Claude Code');
  console.log('  2. Run: /review <project-slug>');
  console.log('');
  console.log('Docs: https://code.claude.com/docs/en/headless');
  console.log('');
}

/**
 * Print instructions for an authentication error.
 */
export function printAuthInstructions() {
  console.log('');
  console.log('⚠️  Claude Code needs to be signed in.');
  console.log('');
  console.log('Run this once to sign in:');
  console.log('');
  console.log('  claude');
  console.log('');
  console.log('Or set an API key for automation:');
  console.log('  export ANTHROPIC_API_KEY=your_api_key_here');
  console.log('');
  console.log('Docs: https://code.claude.com/docs/en/headless');
  console.log('');
}

/**
 * Run Claude Code in headless mode.
 * Uses: claude -p --permission-mode acceptEdits --output-format text "<prompt>"
 *   -p / --print            non-interactive, prints the response
 *   --permission-mode       acceptEdits auto-approves file writes (the `--force` equivalent)
 *   --mcp-config            load the project Figma MCP (.mcp.json)
 *   --allowedTools          pre-approve the read/write + Figma MCP tools (no prompts)
 *
 * @param {object} options
 * @param {string} options.promptPath - Path to the generated prompt file
 * @param {string} options.workingDir - Working directory (the workspace root, so
 *   `projects/<slug>/...`, `.cursor/rules/...` and `.superdesigner/templates/...` resolve)
 * @param {string} [options.mcpConfigPath] - Path to .mcp.json (defaults to workingDir/.mcp.json)
 * @param {string} [options.model] - Optional model override
 * @param {number} [options.timeoutMinutes] - Timeout in minutes (default: 10)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function runClaudeCode(options) {
  const {
    promptPath,
    workingDir,
    mcpConfigPath,
    model,
    timeoutMinutes = DEFAULT_TIMEOUT_MINUTES
  } = options;

  if (!existsSync(promptPath)) {
    return { success: false, error: `Prompt file not found: ${promptPath}` };
  }

  const available = await isClaudeCodeAvailable();
  if (!available) {
    printMissingClaudeInstructions();
    return { success: false, error: 'Claude Code CLI not available' };
  }

  const promptContent = readFileSync(promptPath, 'utf-8');
  const mcpConfig = mcpConfigPath || join(workingDir, '.mcp.json');

  console.log('');
  console.log('🤖 Running Claude Code...');
  console.log('');

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

    const progressInterval = setInterval(() => {
      if (messageIndex < progressMessages.length) {
        process.stdout.write(`\x1b[2K\r${progressMessages[messageIndex]}`);
        messageIndex++;
      }
    }, 3000);

    const args = ['-p', '--permission-mode', 'acceptEdits', '--output-format', 'text'];
    if (existsSync(mcpConfig)) {
      args.push('--mcp-config', mcpConfig);
    }
    args.push('--allowedTools', ALLOWED_TOOLS);
    if (model) {
      args.push('--model', model);
    }
    args.push(promptContent);

    const child = spawn('claude', args, {
      cwd: workingDir,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    // Suppress agent output (we show our own progress)
    child.stdout.on('data', () => {});
    child.stderr.on('data', () => {});

    const timer = setTimeout(() => {
      timedOut = true;
      clearInterval(progressInterval);
      child.kill('SIGTERM');
      console.log('');
      console.log('⏰ Claude Code timed out.');
    }, timeoutMs);

    child.on('error', (err) => {
      clearTimeout(timer);
      clearInterval(progressInterval);
      console.log('');
      resolve({ success: false, error: err.message });
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      clearInterval(progressInterval);
      console.log('');

      if (timedOut) {
        resolve({ success: false, error: 'Timed out' });
      } else if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({ success: false, error: `Claude Code exited with code ${code}` });
      }
    });
  });
}
