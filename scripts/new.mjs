#!/usr/bin/env node

/**
 * Create a new Superdesigner project.
 * Usage: npm run new -- "Project Name"
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { slugify } from '../lib/slugify.mjs';
import { copyTemplate, getProjectPath } from '../lib/files.mjs';

// Get project name from command line args
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('❌ Error: Please provide a project name.');
  console.error('');
  console.error('Usage: npm run new -- "Project Name"');
  console.error('Example: npm run new -- "Botim Quest"');
  process.exit(1);
}

const projectName = args.join(' ');
const slug = slugify(projectName);

if (!slug) {
  console.error('❌ Error: Invalid project name. Please use letters and numbers.');
  process.exit(1);
}

const projectPath = getProjectPath(slug);

// Check if project already exists
if (existsSync(projectPath)) {
  console.error(`❌ Error: Project "${slug}" already exists.`);
  console.error(`   Path: ${projectPath}`);
  process.exit(1);
}

// Create project directory
mkdirSync(projectPath, { recursive: true });

// Meta values for template headers
const meta = {
  projectName: projectName,
  createdDate: new Date().toISOString()
};

// Templates to copy (template filename -> output filename)
const templates = [
  ['prd.template.md', 'prd.md'],
  ['research.template.md', 'research.md'],
  ['figma.template.md', 'figma.md'],
  ['analytics.template.md', 'analytics.md']
];

// Copy each template
for (const [templateName, outputName] of templates) {
  const destPath = join(projectPath, outputName);
  copyTemplate(templateName, destPath, meta);
}

// Create raw/ folder for source artifacts
const rawPath = join(projectPath, 'raw');
mkdirSync(rawPath, { recursive: true });

// Create prompts/ folder for generated prompts
const promptsPath = join(projectPath, 'prompts');
mkdirSync(promptsPath, { recursive: true });

// Create README in raw folder
const rawReadmeContent = `# Raw Artifacts

Drop your source files here:
- PDFs (product specs, research reports)
- PPTX (slide decks, presentations)
- TXT/MD (notes, transcripts)

Then run:
\`\`\`
npm run convert -- ${slug}
\`\`\`

This extracts text and prepares prompts for Cursor Agent.
`;
writeFileSync(join(rawPath, 'README.md'), rawReadmeContent, 'utf-8');

// Success output
console.log('');
console.log(`✅ Created project: ${projectName}`);
console.log(`   Folder: projects/${slug}/`);
console.log('');
console.log('📁 Files created:');
console.log('   - prd.md         (Product requirements)');
console.log('   - research.md    (Research notes)');
console.log('   - figma.md       (Figma link)');
console.log('   - analytics.md   (Analytics requirements)');
console.log('   - raw/           (Drop source files here)');
console.log('   - prompts/       (Generated prompts go here)');
console.log('');
console.log('📝 Next steps:');
console.log('');
console.log('   Option A: Write from scratch');
console.log('   1. Fill out prd.md with your requirements');
console.log('   2. Add your Figma link in figma.md');
console.log(`   3. Run: npm run review -- ${slug}`);
console.log('   4. Open prompts/_review_prompt.md in Cursor Agent');
console.log('');
console.log('   Option B: Convert from raw files');
console.log(`   1. Drop PDF/PPTX/TXT files into projects/${slug}/raw/`);
console.log(`   2. Run: npm run convert -- ${slug}`);
console.log('   3. Open prompts/_convert_prompt.md in Cursor Agent');
console.log('');
