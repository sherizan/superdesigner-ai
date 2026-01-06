#!/usr/bin/env node

/**
 * Post comments to Figma using REST API.
 * Usage: npm run comment -- <project-slug> [--dry-run]
 */

import { join } from 'path';
import { readFile, projectExists, getProjectPath } from '../lib/files.mjs';

const FIGMA_API_BASE = 'https://api.figma.com/v1';
const MAX_COMMENTS = 7;

/**
 * Extract Figma file key from figma.md content.
 * Supports URL formats and explicit FileKey: lines.
 * @param {string} content - Content of figma.md
 * @returns {string|null} - File key or null if not found
 */
function extractFileKey(content) {
  // Try URL patterns: figma.com/file/<KEY>/ or figma.com/design/<KEY>/
  const urlMatch = content.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);
  if (urlMatch) {
    return urlMatch[1];
  }
  
  // Try explicit FileKey: line
  const keyMatch = content.match(/^FileKey:\s*([a-zA-Z0-9]+)/m);
  if (keyMatch) {
    return keyMatch[1];
  }
  
  return null;
}

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
    const nodeIdMatch = block.match(/^\s*nodeId:\s*(.+)$/m);
    if (nodeIdMatch) {
      comment.nodeId = nodeIdMatch[1].trim();
    }
    
    // Extract Type
    const typeMatch = block.match(/^Type:\s*\n\s*(.+)$/m);
    if (typeMatch) {
      comment.type = typeMatch[1].trim();
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
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function postComment(fileKey, message, token, nodeId = null) {
  try {
    const body = { message };
    
    // If nodeId provided, pin comment to that specific node
    if (nodeId) {
      body.client_meta = {
        node_id: nodeId,
        node_offset: { x: 0, y: 0 }
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
      return { 
        success: false, 
        error: errorData.message || `HTTP ${response.status}` 
      };
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
  console.log('   npm run comment -- <project-slug>');
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

// Parse command line args
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const slug = args.find(arg => !arg.startsWith('--'));

if (!slug) {
  console.error('❌ Error: Please provide a project slug.');
  console.error('');
  console.error('Usage: npm run comment -- <project-slug> [--dry-run]');
  console.error('');
  console.error('Options:');
  console.error('  --dry-run    Preview comments without posting');
  process.exit(1);
}

if (!projectExists(slug)) {
  console.error(`❌ Error: Project "${slug}" not found.`);
  process.exit(1);
}

const projectPath = getProjectPath(slug);
const commentsPath = join(projectPath, 'design-comments.preview.md');
const figmaPath = join(projectPath, 'figma.md');

// Read comments file
const commentsContent = readFile(commentsPath);
if (!commentsContent) {
  console.error('❌ No design-comments.preview.md found.');
  console.error('');
  console.error('Run: npm run review -- ' + slug);
  process.exit(1);
}

// Read figma.md and extract file key
const figmaContent = readFile(figmaPath);
const fileKey = extractFileKey(figmaContent);

if (!fileKey) {
  console.error('❌ Could not find Figma file key.');
  console.error('');
  console.error('Add a Figma URL to projects/' + slug + '/figma.md:');
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
console.log('💬 Superdesigner Comment');
console.log('');
console.log(`Project: ${slug}`);
console.log(`File key: ${fileKey}`);
console.log(`Comments: ${comments.length}`);
console.log('');

// Dry run mode
if (dryRun) {
  console.log('🔍 DRY RUN - Comments that would be posted:');
  console.log('');
  comments.forEach((comment, i) => {
    const target = comment.frame 
      ? `${comment.page} → ${comment.frame}` 
      : comment.page;
    const nodeInfo = comment.nodeId ? ` (node: ${comment.nodeId})` : ' (file level)';
    console.log(`  ${i + 1}. [${comment.type}] @ ${target}${nodeInfo}`);
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

for (const comment of comments) {
  const formatted = formatCommentForFigma(comment);
  const result = await postComment(fileKey, formatted, token, comment.nodeId);
  
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
  console.log(`⚠️  Posted ${successCount}/${comments.length} comments (${failCount} failed)`);
}
console.log('');
console.log('View comments in Figma:');
console.log(`  https://www.figma.com/file/${fileKey}`);
console.log('');
