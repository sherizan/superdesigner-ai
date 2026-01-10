/**
 * Review command - generates design review prompts.
 * Delegates to scripts/review.mjs via spawn.
 * Optionally runs Cursor Agent with --agent flag.
 */

import { spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { findWorkspaceRoot } from '../../../lib/files.mjs';
import { track, getCommonProps } from '../../../lib/telemetry.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = join(__dirname, '../../../scripts/review.mjs');
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
 * Parse review command arguments.
 * @param {string[]} args - Raw command arguments
 * @returns {{slug: string|null, useAgent: boolean, agentTimeout: number, scriptArgs: string[]}}
 */
function parseArgs(args) {
  let useAgent = false;
  let agentTimeout = 10;
  const scriptArgs = [];
  let slug = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--agent') {
      useAgent = true;
    } else if (arg === '--agent-timeout') {
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('-')) {
        agentTimeout = parseInt(nextArg, 10) || 10;
        i++; // Skip next arg
      }
    } else if (arg === '--no-telemetry') {
      // Skip this flag - don't pass to script, but preserve for telemetry check
      continue;
    } else if (!arg.startsWith('--agent')) {
      scriptArgs.push(arg);
      // First non-flag arg is the slug
      if (!slug && !arg.startsWith('-')) {
        slug = arg;
      }
    }
  }

  return { slug, useAgent, agentTimeout, scriptArgs };
}

/**
 * Run the review script.
 * @param {string[]} args - Arguments to pass to review script
 * @returns {Promise<number>} - Exit code
 */
function runReviewScript(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [SCRIPT_PATH, ...args], {
      stdio: 'inherit',
      cwd: process.cwd()
    });

    child.on('error', reject);
    child.on('close', resolve);
  });
}

/**
 * Run the review command.
 * @param {string[]} args - Command arguments
 * @returns {Promise<void>}
 */
export async function run(args) {
  const { slug, useAgent, agentTimeout, scriptArgs } = parseArgs(args);

  // Track command execution (best-effort, non-blocking)
  const version = getVersion();
  const commonProps = getCommonProps(version);
  
  if (useAgent) {
    // Track agent mode
    track('cmd_review_agent', { ...commonProps, agent: true }, { args });
  } else {
    // Track regular review
    track('cmd_review', { ...commonProps, agent: false }, { args });
  }

  // Always run the review script first
  const exitCode = await runReviewScript(scriptArgs);

  if (exitCode !== 0) {
    process.exit(exitCode);
  }

  // If --agent flag is not passed, show manual next steps
  if (!useAgent) {
    console.log('📝 Next step:');
    if (slug && slug !== 'all') {
      console.log(`   Run: superdesigner review ${slug} --agent`);
    } else {
      console.log('   Run: superdesigner review <project> --agent');
    }
    console.log('');
    console.log('   Or manually: open _review_prompt.md in Cursor → Cmd+I → Agent mode');
    console.log('');
    return;
  }

  // Agent mode requires a single project slug (not "all")
  if (!slug || slug === 'all') {
    console.log('');
    console.log('⚠️  --agent requires a single project slug, not "all".');
    console.log('   Example: superdesigner review my-project --agent');
    console.log('');
    process.exit(1);
  }

  // Locate the generated prompt file in insights/
  const workspaceRoot = findWorkspaceRoot();
  const projectPath = join(workspaceRoot, 'projects', slug);
  const insightsPath = join(projectPath, 'insights');
  const promptPath = join(insightsPath, 'prompts', '_review_prompt.md');
  const designReviewPath = join(insightsPath, 'design-review.md');

  if (!existsSync(promptPath)) {
    console.error('');
    console.error(`❌ Prompt file not found: ${promptPath}`);
    console.error('   The review script may have failed.');
    console.error('');
    process.exit(1);
  }

  // Import and run the cursor-agent integration
  const { runCursorAgent, isCursorAgentAvailable, printMissingAgentInstructions, printAuthInstructions } = 
    await import('../../integrations/cursor-agent.mjs');

  // Check if cursor-agent is available
  const available = await isCursorAgentAvailable();
  if (!available) {
    printMissingAgentInstructions();
    console.log(`📄 Prompt file ready at:`);
    console.log(`   ${promptPath}`);
    console.log('');
    return;
  }

  // Run the agent
  const result = await runCursorAgent({
    promptPath,
    workingDir: projectPath,
    timeoutMinutes: agentTimeout
  });

  if (!result.success) {
    // Check if it's an auth error
    if (result.error && result.error.includes('code 1')) {
      printAuthInstructions();
      console.log('📄 Prompt file ready at:');
      console.log(`   ${promptPath}`);
      console.log('');
      console.log('After logging in, run again:');
      console.log(`   superdesigner review ${slug} --agent`);
      console.log('');
    } else {
      console.error('');
      console.error(`❌ Agent failed: ${result.error}`);
      console.error('');
    }
    process.exit(1);
  }

  // Verify design-review.md was created in insights/
  console.log('');
  if (existsSync(designReviewPath)) {
    console.log('✅ Review complete!');
    console.log('');
    console.log('📝 Next steps:');
    console.log(`   1. View the design review in projects/${slug}/insights/`);
    console.log(`   2. Run: superdesigner comment ${slug} --dry-run`);
    console.log('');
  } else {
    console.log('⚠️  Agent completed but design-review.md was not found.');
    console.log('   Try running again or check the prompt file manually.');
  }
  console.log('');
}
