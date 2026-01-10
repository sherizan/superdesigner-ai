#!/usr/bin/env node

/**
 * Generate design review prompts for Cursor Agent.
 * Usage: superdesigner review [project-slug]
 *        superdesigner review all
 */

import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { readFile, writeFile, listProjectDirs, getProjectPath, getContextPath, getInsightsPath, projectExists } from '../lib/files.mjs';
import { selectProject } from '../lib/prompt.mjs';

/**
 * Extract project name from PRD frontmatter.
 * @param {string} prdContent - Content of prd.md
 * @returns {string|null} - Project name or null
 */
function extractProjectName(prdContent) {
  const match = prdContent.match(/^Project:\s*(.+)$/m);
  return match ? match[1].trim() : null;
}

/**
 * Generate minimal review prompt that references the rules file.
 * @param {string} projectName - Name of the project
 * @param {string} slug - Project slug
 * @returns {string} - Prompt content
 */
function generatePrompt(projectName, slug) {
  return `# Review: ${projectName}

Read the context files and generate design review insights.

## Context (read these files)

- projects/${slug}/context/prd.md
- projects/${slug}/context/research.md
- projects/${slug}/context/figma.md
- projects/${slug}/context/analytics.md

## Figma Analysis (REQUIRED)

**You MUST use Figma MCP tools to analyze the design:**

1. Read \`projects/${slug}/context/figma.md\` to get Figma URLs and node IDs
2. For each Figma URL, use \`mcp_Figma_get_metadata\` to get the nested frame structure
3. Use \`mcp_Figma_get_design_context\` on key screens to understand the design
4. Extract specific nodeIds for nested screens (not just parent frames)
5. Use these specific nodeIds when generating design comments

This ensures comments are pinned to the correct screens, not just parent frames.

## Output (write to these files)

1. **projects/${slug}/insights/design-review.md** — Follow format in:
   \`.superdesigner/templates/design-review.template.md\`

2. **projects/${slug}/insights/design-comments.preview.md** — Follow the EXACT format in:
   \`.superdesigner/templates/design-comments.template.md\`
   
   Limit to 10 comments. Each MUST have: page, frame, nodeId, Type, Message, Why.
   Use nodeIds from nested screens, not parent frames.

## Rules

Read \`.cursor/rules/superdesigner.mdc\` for full guidelines.

Key requirements:
1. Review intent, not pixels
2. Write only to the insights folder
3. Check: states, edge cases, analytics assumptions, PRD/design alignment
4. Tone: direct, question-based, concise
5. Use Figma MCP to get accurate screen-level nodeIds
`;
}

/**
 * Generate context summary from artifacts.
 * @param {object} artifacts - { prd, research, figma, analytics }
 * @param {string} projectName - Project name
 * @param {string} slug - Project slug
 * @returns {string} - Context file content
 */
function generateContext(artifacts, projectName, slug) {
  const { prd, research, figma, analytics } = artifacts;
  const date = new Date().toISOString();

  return `# Review Context: ${projectName}

Generated: ${date}
Slug: ${slug}

---

## PRD Summary

${prd ? prd.slice(0, 3000) : '*No prd.md found*'}

---

## Research Summary

${research ? research.slice(0, 2000) : '*No research.md found*'}

---

## Figma

${figma || '*No figma.md found*'}

---

## Analytics

${analytics ? analytics.slice(0, 1000) : '*No analytics.md found*'}
`;
}

/**
 * Run review for a single project.
 * @param {string} slug - Project slug
 * @returns {boolean} - Success status
 */
function reviewProject(slug) {
  if (!projectExists(slug)) {
    console.error(`❌ Error: Project "${slug}" not found.`);
    console.error('');
    console.error('Available projects:');
    listProjectDirs().forEach(p => console.error(`   - ${p}`));
    return false;
  }

  const contextPath = getContextPath(slug);
  const insightsPath = getInsightsPath(slug);
  const promptsPath = join(insightsPath, 'prompts');

  // Ensure insights/prompts folder exists
  if (!existsSync(promptsPath)) {
    mkdirSync(promptsPath, { recursive: true });
  }

  // Read all artifacts from context/
  const artifacts = {
    prd: readFile(join(contextPath, 'prd.md')),
    research: readFile(join(contextPath, 'research.md')),
    figma: readFile(join(contextPath, 'figma.md')),
    analytics: readFile(join(contextPath, 'analytics.md'))
  };

  // Extract project name from PRD header or use slug
  const projectName = extractProjectName(artifacts.prd) || slug;

  // Generate prompt and context files
  const promptContent = generatePrompt(projectName, slug);
  const contextContent = generateContext(artifacts, projectName, slug);

  // Write to insights/prompts/
  const promptPath = join(promptsPath, '_review_prompt.md');
  const contextFilePath = join(promptsPath, '_review_context.md');

  writeFile(promptPath, promptContent);
  writeFile(contextFilePath, contextContent);

  console.log(`✅ ${slug}`);
  console.log(`   → insights/prompts/_review_prompt.md`);
  console.log(`   → insights/prompts/_review_context.md`);

  return true;
}

/**
 * Get project slug from args or interactive selection.
 * @param {string[]} args - Command line arguments
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

// Main execution
const args = process.argv.slice(2);

console.log('');
console.log('🔍 Superdesigner Review');

const target = await getTargetSlug(args);

if (!target) {
  process.exit(1);
}

console.log('');

if (target === 'all') {
  const projects = listProjectDirs();

  if (projects.length === 0) {
    console.error('❌ No projects found.');
    console.error('   Create one with: superdesigner init "Project Name"');
    process.exit(1);
  }

  console.log(`Preparing ${projects.length} project(s)...`);
  console.log('');

  let successCount = 0;
  for (const slug of projects) {
    if (reviewProject(slug)) {
      successCount++;
    }
  }

  console.log('');
  console.log(`✅ Completed: ${successCount}/${projects.length} projects`);
} else {
  const success = reviewProject(target);
  if (!success) {
    process.exit(1);
  }
}

// Note: Next steps are shown by the CLI command after agent runs
console.log('');
