/**
 * Doctor command - checks system requirements and configuration.
 */

import { existsSync, mkdirSync } from 'fs';
import { spawn } from 'child_process';
import { findWorkspaceRoot, getPackageRoot, getTemplatesRoot, ensureProjectsFolder } from '../../../lib/files.mjs';

const MIN_NODE_VERSION = 18;

/**
 * Check if Node.js version meets minimum requirement.
 * @returns {{ok: boolean, message: string, fix?: string}}
 */
function checkNodeVersion() {
  const major = parseInt(process.versions.node.split('.')[0], 10);
  const ok = major >= MIN_NODE_VERSION;
  return {
    ok,
    message: ok
      ? `Node.js v${process.versions.node}`
      : `Node.js v${process.versions.node} (requires >= ${MIN_NODE_VERSION})`,
    fix: ok ? null : `Install Node.js ${MIN_NODE_VERSION}+ from https://nodejs.org`
  };
}

/**
 * Check if workspace root was detected.
 * @returns {{ok: boolean, message: string, fix?: string}}
 */
function checkWorkspaceRoot() {
  const root = findWorkspaceRoot();
  const cwd = process.cwd();
  const isCurrentDir = root === cwd;
  
  return {
    ok: true,
    message: `Workspace: ${root}${isCurrentDir ? ' (current directory)' : ''}`
  };
}

/**
 * Check if projects folder exists.
 * @returns {{ok: boolean, message: string, fix?: string, action?: () => void}}
 */
function checkProjectsFolder() {
  const root = findWorkspaceRoot();
  const projectsPath = `${root}/projects`;
  const exists = existsSync(projectsPath);
  
  return {
    ok: exists,
    message: exists
      ? 'projects/ folder exists'
      : 'projects/ folder not found',
    fix: exists ? null : 'Run: mkdir projects',
    action: exists ? null : () => {
      ensureProjectsFolder();
      console.log('     → Created projects/ folder');
    }
  };
}

/**
 * Check if templates are accessible from package.
 * @returns {{ok: boolean, message: string, fix?: string}}
 */
function checkTemplates() {
  const templatesPath = getTemplatesRoot();
  const exists = existsSync(templatesPath);
  const prdExists = exists && existsSync(`${templatesPath}/prd.template.md`);
  
  return {
    ok: prdExists,
    message: prdExists
      ? 'Templates accessible'
      : 'Templates not found',
    fix: prdExists ? null : 'Reinstall superdesigner: npm install superdesigner'
  };
}

/**
 * Check if Cursor Agent CLI is available.
 * The command is "agent" (installed via Cursor > Command Palette > Install 'agent' command)
 * @returns {Promise<{ok: boolean, message: string, fix?: string}>}
 */
async function checkCursorAgent() {
  return new Promise((resolve) => {
    const child = spawn('which', ['agent'], {
      stdio: ['ignore', 'pipe', 'ignore']
    });

    child.on('close', (code) => {
      const available = code === 0;
      resolve({
        ok: true, // Informational, not a failure
        message: available
          ? 'Cursor Agent CLI available (agent)'
          : 'Cursor Agent CLI not found (optional)',
        fix: available ? null : 'Run: curl https://cursor.com/install -fsS | bash'
      });
    });

    child.on('error', () => {
      resolve({
        ok: true,
        message: 'Cursor Agent CLI not found (optional)',
        fix: 'Run: curl https://cursor.com/install -fsS | bash'
      });
    });
  });
}

/**
 * Run the doctor command.
 * @param {string[]} args - Command arguments
 * @returns {Promise<void>}
 */
export async function run(args) {
  const autoFix = args.includes('--fix');
  
  console.log('');
  console.log('🩺 Superdesigner Doctor');
  console.log('');

  const syncChecks = [
    { name: 'Node.js version', check: checkNodeVersion },
    { name: 'Workspace root', check: checkWorkspaceRoot },
    { name: 'Projects folder', check: checkProjectsFolder },
    { name: 'Templates', check: checkTemplates }
  ];

  let allOk = true;
  const fixableIssues = [];

  // Run sync checks
  for (const { name, check } of syncChecks) {
    const result = check();
    const icon = result.ok ? '✅' : '❌';
    console.log(`  ${icon} ${name}: ${result.message}`);
    
    if (!result.ok) {
      allOk = false;
      if (result.fix) {
        console.log(`     💡 ${result.fix}`);
      }
      if (result.action) {
        fixableIssues.push({ name, action: result.action });
      }
    }
  }

  // Run async checks
  const cursorAgentResult = await checkCursorAgent();
  const agentIcon = cursorAgentResult.message.includes('available') ? '✅' : 'ℹ️';
  console.log(`  ${agentIcon} Cursor Agent: ${cursorAgentResult.message}`);

  console.log('');

  // Auto-fix if requested
  if (autoFix && fixableIssues.length > 0) {
    console.log('🔧 Auto-fixing issues...');
    for (const { name, action } of fixableIssues) {
      console.log(`   Fixing: ${name}`);
      action();
    }
    console.log('');
  }

  if (allOk) {
    console.log('All checks passed! Superdesigner is ready to use.');
    console.log('');
    console.log('Quick start:');
    console.log('  superdesigner init "My Project"');
    console.log('  superdesigner review my-project --agent');
  } else {
    console.log('Some checks failed. Fix the issues above and run again.');
    if (fixableIssues.length > 0 && !autoFix) {
      console.log('');
      console.log('Run with --fix to auto-fix some issues:');
      console.log('  superdesigner doctor --fix');
    }
    process.exit(1);
  }

  console.log('');
}
