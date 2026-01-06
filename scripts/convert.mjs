#!/usr/bin/env node

/**
 * Convert raw artifacts (PDF/PPTX/TXT/MD) to Cursor Agent prompts.
 * Usage: npm run convert -- <project-slug>
 *        npm run convert -- all
 */

import { join, basename } from 'path';
import { existsSync, mkdirSync, readdirSync } from 'fs';
import { readFile, writeFile, listProjectDirs, getProjectPath, projectExists } from '../lib/files.mjs';
import { extractText, getFileMetadata, SUPPORTED_EXTENSIONS } from '../lib/extractor.mjs';

/**
 * PRD template - exact structure for Cursor Agent to follow.
 */
const PRD_TEMPLATE = `---
Project: <Project Name>
Created: <ISO>
---

# Product Requirements Document

## Overview

## Problem statement

## Goals

## User segments / cohorts

## Success metrics

## Entry points / surfaces

## Happy path (step-by-step)

## Key screens (expected)

## States checklist (per key screen)
- Happy path
- Empty
- Loading
- Error
- Recovery
- Expired (if time-bound)

## Rewards / incentives (if applicable)

## Edge cases & unhappy paths

## Out of scope

## Dependencies / integrations

## Open questions
`;

/**
 * Research template - exact structure for Cursor Agent to follow.
 */
const RESEARCH_TEMPLATE = `# Research Notes
Project: <Project Name>
Generated: <ISO>

## Study summary (who/when/how many)

## Key findings (bullets)

## Quotes (optional, max 5)

## Behavioral insights

## Pain points / frictions

## Terminology & comprehension risks

## Design implications

## Open questions
`;

/**
 * Generate the conversion prompt for Cursor Agent.
 * @param {string} projectSlug - Project folder name
 * @returns {string} - Prompt content
 */
function generatePrompt(projectSlug) {
  return `# Superdesigner Convert Prompt

Read \`_superdesigner_convert_context.md\` in this folder and convert the raw content into structured PRD and research documents.

## Rules (STRICT)

1. **Do NOT invent requirements** — only extract what is explicitly stated or clearly implied in the source material.
2. **Preserve intent** — maintain the original meaning, flows, states, metrics, and edge cases.
3. **Remove noise** — strip slide headers, footers, page numbers, and repetition.
4. **Handle uncertainty** — if something is unclear or ambiguous, add it to "Open questions".
5. **Be concise** — use bullets and short sentences. No fluff.

## Output (EXACTLY two files)

Create these files in this project folder:

### 1. \`prd.md\`

Use this EXACT template structure:

\`\`\`markdown
${PRD_TEMPLATE}
\`\`\`

### 2. \`research.md\`

Use this EXACT template structure:

\`\`\`markdown
${RESEARCH_TEMPLATE}
\`\`\`

## Instructions

1. Read the raw content from \`_superdesigner_convert_context.md\`
2. Identify PRD content (requirements, flows, features, metrics) → goes into \`prd.md\`
3. Identify research content (findings, quotes, insights, pain points) → goes into \`research.md\`
4. If content fits both, prioritize PRD for requirements and research for user insights
5. Leave empty sections as-is if no relevant content exists (don't remove them)
6. Replace \`<Project Name>\` with: ${projectSlug}
7. Replace \`<ISO>\` with the current date in ISO format

## After conversion

Run \`npm run review -- ${projectSlug}\` to generate the design review.
`;
}

/**
 * Generate the context file with extracted raw content.
 * @param {string} projectSlug - Project folder name
 * @param {Array<{filename: string, ext: string, bytes: number, text: string, isPlaceholder: boolean}>} files
 * @returns {string} - Context file content
 */
function generateContext(projectSlug, files) {
  const now = new Date().toISOString();
  
  let context = `# Superdesigner Convert Context
Project: ${projectSlug}
Generated: ${now}

## Raw Files Index
`;

  for (const file of files) {
    context += `- ${file.filename} (${file.ext}, ${file.bytes} bytes)${file.isPlaceholder ? ' [manual paste required]' : ''}\n`;
  }

  context += `\n## Raw Content\n`;

  for (const file of files) {
    context += `\n### FILE: ${file.filename}\n\n${file.text}\n`;
  }

  return context;
}

/**
 * Convert a single project's raw files.
 * @param {string} slug - Project slug
 * @returns {Promise<boolean>} - Success status
 */
async function convertProject(slug) {
  if (!projectExists(slug)) {
    console.error(`❌ Error: Project "${slug}" not found.`);
    return false;
  }

  const projectPath = getProjectPath(slug);
  const rawPath = join(projectPath, 'raw');

  // Ensure raw folder exists
  if (!existsSync(rawPath)) {
    mkdirSync(rawPath, { recursive: true });
    console.log(`   Created: raw/`);
  }

  // Scan for supported files
  const allFiles = existsSync(rawPath) ? readdirSync(rawPath) : [];
  const supportedFiles = allFiles.filter(f => {
    const ext = '.' + f.split('.').pop().toLowerCase();
    return SUPPORTED_EXTENSIONS.includes(ext);
  });

  if (supportedFiles.length === 0) {
    console.log(`ℹ️  No raw files found in projects/${slug}/raw/`);
    console.log('');
    console.log('   Supported formats: .pdf, .pptx, .txt, .md');
    console.log('   Drop your files there and run this command again.');
    return false;
  }

  console.log(`📂 Found ${supportedFiles.length} file(s) in raw/`);

  // Extract text from each file
  const extractedFiles = [];
  
  for (const filename of supportedFiles) {
    const filePath = join(rawPath, filename);
    console.log(`   Extracting: ${filename}`);
    
    const metadata = getFileMetadata(filePath);
    const { text, isPlaceholder } = await extractText(filePath);
    
    extractedFiles.push({
      filename,
      ext: metadata.ext,
      bytes: metadata.bytes,
      text,
      isPlaceholder
    });
  }

  // Generate context and prompt files
  const contextContent = generateContext(slug, extractedFiles);
  const promptContent = generatePrompt(slug);

  // Ensure prompts folder exists
  const promptsPath = join(projectPath, 'prompts');
  if (!existsSync(promptsPath)) {
    mkdirSync(promptsPath, { recursive: true });
  }

  const contextPath = join(promptsPath, '_convert_context.md');
  const promptPath = join(promptsPath, '_convert_prompt.md');

  writeFile(contextPath, contextContent);
  writeFile(promptPath, promptContent);

  const hasPlaceholders = extractedFiles.some(f => f.isPlaceholder);

  console.log('');
  console.log(`✅ ${slug}`);
  console.log(`   → prompts/_convert_context.md`);
  console.log(`   → prompts/_convert_prompt.md`);
  
  if (hasPlaceholders) {
    console.log('');
    console.log('   ⚠️  Some files need manual text paste (see context file)');
  }

  return true;
}

// Parse command line args
const args = process.argv.slice(2);
const target = args[0];

if (!target) {
  console.error('❌ Error: Please provide a project slug or "all".');
  console.error('');
  console.error('Usage: npm run convert -- <project-slug>');
  console.error('       npm run convert -- all');
  console.error('');
  console.error('Available projects:');
  const projects = listProjectDirs();
  if (projects.length === 0) {
    console.error('   (none - create one with: npm run new -- "Project Name")');
  } else {
    projects.forEach(p => console.error(`   - ${p}`));
  }
  process.exit(1);
}

console.log('');
console.log('🔄 Superdesigner Convert');
console.log('');

if (target === 'all') {
  const projects = listProjectDirs();
  
  if (projects.length === 0) {
    console.error('❌ No projects found.');
    console.error('   Create one with: npm run new -- "Project Name"');
    process.exit(1);
  }
  
  console.log(`Converting ${projects.length} project(s)...`);
  console.log('');
  
  let successCount = 0;
  for (const slug of projects) {
    console.log(`--- ${slug} ---`);
    if (await convertProject(slug)) {
      successCount++;
    }
    console.log('');
  }
  
  console.log(`✅ Completed: ${successCount}/${projects.length} projects`);
} else {
  const success = await convertProject(target);
  if (!success) {
    process.exit(1);
  }
}

console.log('');
console.log('📝 Next steps:');
console.log('   1. Open prompts/_convert_prompt.md in Cursor');
console.log('   2. Run with Cursor Agent (Cmd+I / Ctrl+I → Agent mode)');
console.log('   3. It will create prd.md and research.md');
console.log('   4. Then run: npm run review -- <slug>');
console.log('');
