/**
 * Figma context helpers, shared across the review and scaffold flows.
 *
 * A project's `context/figma.md` may hold a real Figma link/node, or it may still be the empty
 * template (placeholder text only). These helpers extract the target and let callers decide
 * whether to review an existing design or scaffold a new one from the PRD.
 */

import { extractNodeId } from './generator.mjs';

export { extractNodeId };

/**
 * Extract a Figma file key from figma.md content.
 * Supports URL formats (figma.com/file/<KEY> or figma.com/design/<KEY>) and explicit FileKey: lines.
 * Placeholder template text ("(paste your Figma URL here)", "(optional)") yields no match.
 * @param {string} content - Content of figma.md
 * @returns {string|null} - File key or null if not found
 */
export function extractFileKey(content) {
  if (!content) return null;

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
 * Whether figma.md points at a real Figma design (a file key or a node ID).
 * False means the file is empty/placeholder — the cue to scaffold instead of review.
 * @param {string} content - Content of figma.md
 * @returns {boolean}
 */
export function hasFigmaTarget(content) {
  return Boolean(extractFileKey(content) || extractNodeId(content));
}
