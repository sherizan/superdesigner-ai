/**
 * Review command - generates design review prompts.
 * Delegates to scripts/review.mjs via spawn.
 * Optionally runs the agent with --agent (Claude Code by default; --cursor for Cursor).
 */

import { spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { findWorkspaceRoot, readFile } from '../../../lib/files.mjs';
import { hasFigmaTarget } from '../../../lib/figma.mjs';
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
 * @returns {{slug: string|null, useAgent: boolean, useCursor: boolean, agentTimeout: number, model: string|null, scriptArgs: string[]}}
 */
function parseArgs(args) {
  let useAgent = false;
  let useCursor = false;
  let agentTimeout = 10;
  let model = null;
  const scriptArgs = [];
  let slug = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--agent') {
      useAgent = true;
    } else if (arg === '--cursor') {
      // Opt back into the Cursor agent (the pairing); Claude Code is the default.
      useCursor = true;
    } else if (arg === '--agent-timeout') {
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('-')) {
        agentTimeout = parseInt(nextArg, 10) || 10;
        i++; // Skip next arg
      }
    } else if (arg === '--model') {
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('-')) {
        model = nextArg;
        i++; // Skip next arg
      }
    } else if (arg === '--intent') {
      // Forward the review intent to the review script (it builds the prompt).
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('-')) {
        scriptArgs.push('--intent', nextArg);
        i++; // Skip next arg
      }
    } else if (arg === '--scaffold') {
      // Forward the scaffold path (figma|code) to the review script.
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('-')) {
        scriptArgs.push('--scaffold', nextArg);
        i++; // Skip next arg
      }
    } else if (arg === '--workflow') {
      // Route a review through the deterministic dynamic workflow.
      scriptArgs.push('--workflow');
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

  return { slug, useAgent, useCursor, agentTimeout, model, scriptArgs };
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
  const { slug, useAgent, useCursor, agentTimeout, model, scriptArgs } = parseArgs(args);
  const agentName = useCursor ? 'Cursor' : 'Claude Code';

  // Track command execution (best-effort, non-blocking)
  const version = getVersion();
  const commonProps = getCommonProps(version);

  if (useAgent) {
    track('cmd_review_agent', { ...commonProps, agent: true, runner: useCursor ? 'cursor' : 'claude' }, { args });
  } else {
    track('cmd_review', { ...commonProps, agent: false }, { args });
  }

  // Always run the review script first
  const exitCode = await runReviewScript(scriptArgs);

  if (exitCode !== 0) {
    process.exit(exitCode);
  }

  // If --agent flag is not passed, show manual next steps
  if (!useAgent) {
    const target = slug && slug !== 'all' ? slug : '<project>';
    console.log('📝 Next step, pick one:');
    console.log(`   • In Claude Code (this repo):  /review ${target}`);
    console.log(`   • Headless:                    superdesigner review ${target} --agent`);
    console.log('   • In Cursor (manual):          open _review_prompt.md → Cmd+I → Agent mode');
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
  const screenPlanPath = join(insightsPath, 'screen-plan.md');
  const prototypePath = join(projectPath, 'prototype');

  // No Figma target + a PRD → the script generated a scaffold prompt, not a review.
  const figmaContent = readFile(join(projectPath, 'context', 'figma.md'));
  const prdContent = readFile(join(projectPath, 'context', 'prd.md'));
  const isScaffold = !hasFigmaTarget(figmaContent) && Boolean(prdContent);

  if (!existsSync(promptPath)) {
    console.error('');
    console.error(`❌ Prompt file not found: ${promptPath}`);
    console.error('   The review script may have failed.');
    console.error('');
    process.exit(1);
  }

  // Load the chosen integration: Claude Code by default, Cursor on --cursor.
  const integration = useCursor
    ? await import('../../integrations/cursor-agent.mjs')
    : await import('../../integrations/claude-code.mjs');

  const isAvailable = useCursor ? integration.isCursorAgentAvailable : integration.isClaudeCodeAvailable;
  const printMissing = useCursor ? integration.printMissingAgentInstructions : integration.printMissingClaudeInstructions;
  const printAuth = integration.printAuthInstructions;
  const runAgent = useCursor ? integration.runCursorAgent : integration.runClaudeCode;

  // Check availability
  const available = await isAvailable();
  if (!available) {
    printMissing();
    console.log('📄 Prompt file ready at:');
    console.log(`   ${promptPath}`);
    console.log('');
    return;
  }

  // Run the agent. Claude Code runs from the workspace root so that
  // projects/<slug>/..., .cursor/rules/... and .superdesigner/templates/... resolve.
  const result = await runAgent({
    promptPath,
    workingDir: useCursor ? projectPath : workspaceRoot,
    timeoutMinutes: agentTimeout,
    ...(useCursor ? {} : { model, mcpConfigPath: join(workspaceRoot, '.mcp.json') })
  });

  if (!result.success) {
    // Check if it's likely an auth error (exit code 1)
    if (result.error && result.error.includes('code 1')) {
      printAuth();
      console.log('📄 Prompt file ready at:');
      console.log(`   ${promptPath}`);
      console.log('');
      console.log('After signing in, run again:');
      console.log(`   superdesigner review ${slug} --agent${useCursor ? ' --cursor' : ''}`);
      console.log('');
    } else {
      console.error('');
      console.error(`❌ ${agentName} failed: ${result.error}`);
      console.error('');
    }
    process.exit(1);
  }

  // Verify the expected output and show mode-specific next steps.
  console.log('');
  if (isScaffold) {
    if (existsSync(screenPlanPath)) {
      console.log('✅ Scaffold complete!');
      console.log('');
      console.log('📝 Next steps:');
      console.log(`   1. Review the screen plan: projects/${slug}/insights/screen-plan.md`);
      if (existsSync(prototypePath)) {
        console.log(`   2. Open the prototype: projects/${slug}/prototype/index.html`);
      } else {
        console.log(`   2. Check the new starter frames in your open Figma file`);
      }
      console.log(`   3. Once you have a design, add its link to context/figma.md and run a review`);
      console.log('');
    } else {
      console.log(`⚠️  ${agentName} completed but screen-plan.md was not found.`);
      console.log('   Try running again or check the prompt file manually.');
    }
  } else if (existsSync(designReviewPath)) {
    console.log('✅ Review complete!');
    console.log('');
    console.log('📝 Next steps:');
    console.log(`   1. View the design review in projects/${slug}/insights/`);
    console.log(`   2. Run: superdesigner comment ${slug} --dry-run`);
    console.log('');
  } else {
    console.log(`⚠️  ${agentName} completed but design-review.md was not found.`);
    console.log('   Try running again or check the prompt file manually.');
  }
  console.log('');
}
