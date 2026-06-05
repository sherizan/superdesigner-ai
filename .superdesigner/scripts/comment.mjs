#!/usr/bin/env node

/**
 * Post comments to Figma using REST API.
 * Usage: superdesigner comment [project-slug] [--dry-run]
 */

import { join } from 'path';
import { readFile, writeFile, projectExists, getContextPath, getInsightsPath, getMemoryPath, listProjectDirs } from '../lib/files.mjs';
import { selectProject } from '../lib/prompt.mjs';
import { extractFileKey } from '../lib/figma.mjs';

const FIGMA_API_BASE = 'https://api.figma.com/v1';
const MAX_COMMENTS = 10;

/**
 * Parse comments from design-comments.preview.md (canonical format).
 * Extracts structured comment blocks with Target, Type, Message, and Why fields.
 * @param {string} content - Content of design-comments.preview.md
 * @returns {Array<{page: string, frame: string|null, nodeId: string|null, type: string, message: string, why: string}>}
 */
function parseComments(content) {
  const comments = [];
  
  // Split by comment headers (## Comment N)
  const commentBlocks = content.split(/^## Comment \d+$/m).slice(1);
  
  for (const block of commentBlocks) {
    const comment = {
      page: null,
      frame: null,
      nodeId: null,
      type: null,
      status: null,
      message: null,
      why: null
    };
    
    // Extract page from Target block
    const pageMatch = block.match(/^\s*page:\s*(.+)$/m);
    if (pageMatch) {
      comment.page = pageMatch[1].trim();
    }
    
    // Extract frame from Target block
    const frameMatch = block.match(/^\s*frame:\s*(.+)$/m);
    if (frameMatch) {
      const frame = frameMatch[1].trim();
      comment.frame = frame === '(optional)' ? null : frame;
    }
    
    // Extract nodeId from Target block (for pinning to specific Figma node)
    // Normalize to colon format (Figma API uses colons, e.g., "424:51708")
    const nodeIdMatch = block.match(/^\s*nodeId:\s*(.+)$/m);
    if (nodeIdMatch) {
      const rawId = nodeIdMatch[1].trim();
      // Convert hyphen to colon if needed
      comment.nodeId = rawId.replace('-', ':');
    }
    
    // Extract Type
    const typeMatch = block.match(/^Type:\s*\n\s*(.+)$/m);
    if (typeMatch) {
      comment.type = typeMatch[1].trim();
    }

    // Extract Status (feedback marker). Supports inline "Status: dismissed" or an indented value
    // on the next line. Blank or template placeholder ("{...}") is treated as accepted (null).
    const statusMatch = block.match(/^Status:\s*\n\s*(.+)$/m) || block.match(/^Status:\s*(.+)$/m);
    if (statusMatch) {
      const raw = statusMatch[1].trim().toLowerCase();
      if (['accepted', 'overridden', 'dismissed'].includes(raw)) {
        comment.status = raw;
      }
    }
    
    // Extract Message (multi-line: everything between "Message:" and "Why:")
    const messageMatch = block.match(/^Message:\s*\n([\s\S]*?)(?=\nWhy:)/m);
    if (messageMatch) {
      comment.message = messageMatch[1].trim();
    }
    
    // Extract Why
    const whyMatch = block.match(/^Why:\s*\n?(.*?)(?=\n---|\n\*|$)/ms);
    if (whyMatch) {
      comment.why = whyMatch[1].trim();
    }
    
    // Only add if we have a message
    if (comment.message) {
      comments.push(comment);
    }
  }
  
  return comments.slice(0, MAX_COMMENTS);
}

/**
 * Format a parsed comment for posting to Figma.
 * Combines structured fields into a readable comment string.
 * @param {object} comment - Parsed comment object
 * @returns {string} - Formatted comment text
 */
function formatCommentForFigma(comment) {
  const parts = [];
  
  // Add type as a prefix
  if (comment.type) {
    parts.push(`[${comment.type}]`);
  }
  
  // Add the main message
  parts.push(comment.message);
  
  // Add reference
  if (comment.why) {
    parts.push(`\n\n📎 ${comment.why}`);
  }
  
  return parts.join(' ');
}

/**
 * Post a comment to Figma file, optionally pinned to a specific node.
 * @param {string} fileKey - Figma file key
 * @param {string} message - Comment text
 * @param {string} token - Figma access token
 * @param {string|null} nodeId - Optional node ID to pin comment to (e.g., "12629:33522")
 * @param {number} index - Comment index for positioning offset (0-based)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function postComment(fileKey, message, token, nodeId = null, index = 0) {
  try {
    const body = { message };
    
    // If nodeId provided, pin comment to that specific node
    // Offset each comment by 60px vertically to avoid overlap
    if (nodeId) {
      body.client_meta = {
        node_id: nodeId,
        node_offset: { x: 0, y: index * 60 }
      };
    }
    
    const response = await fetch(`${FIGMA_API_BASE}/files/${fileKey}/comments`, {
      method: 'POST',
      headers: {
        'X-Figma-Token': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // Provide more context for common errors
      let errorMsg = errorData.message || `HTTP ${response.status}`;
      if (response.status === 404) {
        errorMsg = 'File or node not found. Check file key and node ID.';
      } else if (response.status === 403) {
        errorMsg = 'Permission denied. Check token has "Comments" permission.';
      } else if (response.status === 400) {
        errorMsg = `Bad request: ${errorData.message || 'Check node ID format (should be like 424:51708)'}`;
      }
      return { success: false, error: errorMsg };
    }
    
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Print setup instructions for Figma token.
 */
function printSetupInstructions() {
  console.log('');
  console.log('⚠️  FIGMA_ACCESS_TOKEN not found.');
  console.log('');
  console.log('To post comments to Figma, you need a personal access token:');
  console.log('');
  console.log('1. Go to Figma → Settings → Account → Personal access tokens');
  console.log('   https://www.figma.com/developers/api#access-tokens');
  console.log('');
  console.log('2. Create a new token with "File content" and "Comments" permissions');
  console.log('');
  console.log('3. Create a .env file in the project root:');
  console.log('   cp .env.example .env');
  console.log('');
  console.log('4. Add your token to .env:');
  console.log('   FIGMA_ACCESS_TOKEN=your_token_here');
  console.log('');
  console.log('5. Run the comment command again:');
  console.log('   superdesigner comment <project-slug>');
  console.log('');
}

/**
 * Load environment variables from .env file.
 */
function loadEnv() {
  const envPath = join(process.cwd(), '.env');
  const envContent = readFile(envPath);
  
  if (!envContent) return;
  
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex > 0) {
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

/**
 * Get project slug from args or interactive selection.
 * @param {string[]} args - Command line arguments (excluding flags)
 * @returns {Promise<string|null>} - Selected slug or null
 */
async function getTargetSlug(args) {
  // If slug provided, use it
  if (args.length > 0) {
    return args[0];
  }

  // Otherwise, auto-detect or prompt
  const projects = listProjectDirs();

  if (projects.length === 0) {
    console.error('❌ No projects found.');
    console.error('   Create one with: superdesigner init "Project Name"');
    return null;
  }

  if (projects.length === 1) {
    console.log(`📂 Auto-selected: ${projects[0]}`);
    return projects[0];
  }

  // Multiple projects - show selection menu
  return await selectProject(projects);
}

/**
 * Record the designer's accept/override/dismiss decisions for observability and the memory
 * feedback loop. Updates insights/run-manifest.json and appends a note to memory/session.md so
 * the next review can learn from dismissals.
 * @param {string} slug - Project slug
 * @param {Array} parsed - Parsed comments (each with optional .status)
 * @returns {{accepted: number, overridden: number, dismissed: number, total: number}}
 */
function recordFeedback(slug, parsed) {
  const tally = { accepted: 0, overridden: 0, dismissed: 0, total: parsed.length };
  const dismissed = [];
  for (const c of parsed) {
    const status = c.status || 'accepted';
    if (status === 'overridden') tally.overridden++;
    else if (status === 'dismissed') { tally.dismissed++; dismissed.push(c); }
    else tally.accepted++;
  }

  const stamp = new Date().toISOString();

  // Merge into the existing run manifest (or create a minimal one).
  const manifestPath = join(getInsightsPath(slug), 'run-manifest.json');
  let manifest = {};
  const existing = readFile(manifestPath);
  if (existing) {
    try { manifest = JSON.parse(existing); } catch { manifest = {}; }
  }
  manifest.feedback = {
    recordedAt: stamp,
    accepted: tally.accepted,
    overridden: tally.overridden,
    dismissed: tally.dismissed,
    total: tally.total,
    dismissedComments: dismissed.map(c => ({
      type: c.type,
      page: c.page,
      summary: (c.message || '').split('\n')[0]
    }))
  };
  writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

  // Append to session memory so the next review sees what was dismissed.
  const sessionPath = join(getMemoryPath(slug), 'session.md');
  const prior = readFile(sessionPath) || '# Session memory\n';
  let note = `\n## Feedback on posted comments (${stamp})\n\n` +
    `- Accepted: ${tally.accepted} · Overridden: ${tally.overridden} · Dismissed: ${tally.dismissed} (of ${tally.total})\n`;
  if (dismissed.length) {
    note += `- Dismissed (consider not re-raising next review):\n`;
    for (const c of dismissed) {
      note += `  - [${c.type || 'Comment'}] ${(c.message || '').split('\n')[0]}\n`;
    }
  }
  writeFile(sessionPath, prior + note);

  return tally;
}

// Parse command line args
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const positionalArgs = args.filter(arg => !arg.startsWith('--'));

console.log('');
console.log('💬 Superdesigner Comment');

const slug = await getTargetSlug(positionalArgs);

if (!slug) {
  process.exit(1);
}

if (!projectExists(slug)) {
  console.error(`❌ Error: Project "${slug}" not found.`);
  process.exit(1);
}

const contextPath = getContextPath(slug);
const insightsPath = getInsightsPath(slug);

// Read comments from insights/
const commentsPath = join(insightsPath, 'design-comments.preview.md');
const commentsContent = readFile(commentsPath);

if (!commentsContent) {
  console.error('');
  console.error('❌ No design-comments.preview.md found in insights/');
  console.error('');
  console.error(`Run: superdesigner review ${slug}`);
  process.exit(1);
}

// Read figma.md from context/ and extract file key
const figmaPath = join(contextPath, 'figma.md');
const figmaContent = readFile(figmaPath);
const fileKey = extractFileKey(figmaContent);

if (!fileKey) {
  console.error('');
  console.error('❌ Could not find Figma file key.');
  console.error('');
  console.error(`Add a Figma URL to projects/${slug}/context/figma.md:`);
  console.error('  https://www.figma.com/file/YOUR_FILE_KEY/...');
  console.error('');
  console.error('Or add an explicit FileKey line:');
  console.error('  FileKey: YOUR_FILE_KEY');
  process.exit(1);
}

// Parse comments
const comments = parseComments(commentsContent);

if (comments.length === 0) {
  console.log('');
  console.log('ℹ️  No comments to post.');
  console.log('');
  process.exit(0);
}

console.log('');
console.log(`Project: ${slug}`);
console.log(`File key: ${fileKey}`);
console.log(`Comments: ${comments.length}`);
console.log('');

// Comments marked dismissed are skipped when posting.
const postable = comments.filter(c => c.status !== 'dismissed');
const dismissedCount = comments.length - postable.length;
if (dismissedCount > 0) {
  console.log(`(${dismissedCount} marked dismissed — will be skipped)`);
  console.log('');
}

// Dry run mode
if (dryRun) {
  console.log('🔍 DRY RUN - Comments that would be posted:');
  console.log('');
  comments.forEach((comment, i) => {
    const target = comment.frame
      ? `${comment.page} → ${comment.frame}`
      : comment.page;
    const nodeInfo = comment.nodeId ? ` (node: ${comment.nodeId})` : ' (file level)';
    const skip = comment.status === 'dismissed' ? ' — SKIPPED (dismissed)' : '';
    const tag = comment.status === 'overridden' ? ' [overridden]' : '';
    console.log(`  ${i + 1}. [${comment.type}] @ ${target}${nodeInfo}${tag}${skip}`);
    console.log(`     ${comment.message.split('\n')[0]}`);
    if (comment.why) {
      console.log(`     📎 ${comment.why}`);
    }
    console.log('');
  });
  console.log('Run without --dry-run to post these comments.');
  console.log('');
  process.exit(0);
}

// Load .env file
loadEnv();

// Check for token
const token = process.env.FIGMA_ACCESS_TOKEN;
if (!token) {
  printSetupInstructions();
  process.exit(1);
}

// Post comments
console.log('📤 Posting comments to Figma...');
console.log('');

let successCount = 0;
let failCount = 0;

// Track offset per nodeId so comments on same node don't overlap
const nodeOffsets = new Map();

for (const comment of postable) {
  const formatted = formatCommentForFigma(comment);
  
  // Get current offset for this nodeId (or 0 if first comment on this node)
  const nodeKey = comment.nodeId || 'file-level';
  const currentOffset = nodeOffsets.get(nodeKey) || 0;
  nodeOffsets.set(nodeKey, currentOffset + 1);
  
  const result = await postComment(fileKey, formatted, token, comment.nodeId, currentOffset);
  
  const preview = comment.message.split('\n')[0];
  const displayText = `[${comment.type}] ${preview}`;
  const targetInfo = comment.nodeId ? ` → node ${comment.nodeId}` : ' → file level';
  
  if (result.success) {
    successCount++;
    console.log(`  ✅ Posted${targetInfo}: "${displayText.slice(0, 50)}${displayText.length > 50 ? '...' : ''}"`);
  } else {
    failCount++;
    console.log(`  ❌ Failed${targetInfo}: "${displayText.slice(0, 50)}${displayText.length > 50 ? '...' : ''}"`);
    console.log(`     Error: ${result.error}`);
  }
}

console.log('');
if (failCount === 0) {
  console.log(`✅ Posted ${successCount} comments to ${fileKey}`);
} else {
  console.log(`⚠️  Posted ${successCount}/${postable.length} comments (${failCount} failed)`);
}

// Record the designer's accept/override/dismiss decisions (observability + memory feedback loop).
const tally = recordFeedback(slug, comments);
console.log('');
console.log(`🧠 Feedback recorded: ${tally.accepted} accepted · ${tally.overridden} overridden · ${tally.dismissed} dismissed`);
console.log('   → insights/run-manifest.json, memory/session.md');

console.log('');
console.log('View comments in Figma:');
console.log(`  https://www.figma.com/file/${fileKey}`);
console.log('');
