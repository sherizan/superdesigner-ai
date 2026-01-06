#!/usr/bin/env node

/**
 * Generate design review for a project.
 * Usage: npm run review -- <project-slug>
 *        npm run review -- all
 */

import { join } from 'path';
import { readFile, writeFile, listProjectDirs, getProjectPath, projectExists } from '../lib/files.mjs';
import { generateReview, generateComments } from '../lib/generator.mjs';

// Get project slug from command line args
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('❌ Error: Please provide a project slug or "all".');
  console.error('');
  console.error('Usage: npm run review -- <project-slug>');
  console.error('       npm run review -- all');
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

const target = args[0];

/**
 * Run review for a single project.
 * @param {string} slug - Project slug
 */
function reviewProject(slug) {
  if (!projectExists(slug)) {
    console.error(`❌ Error: Project "${slug}" not found.`);
    console.error('');
    console.error('Available projects:');
    listProjectDirs().forEach(p => console.error(`   - ${p}`));
    return false;
  }

  const projectPath = getProjectPath(slug);
  
  // Read all artifacts (gracefully handle missing files)
  const artifacts = {
    prd: readFile(join(projectPath, 'prd.md')),
    research: readFile(join(projectPath, 'research.md')),
    figma: readFile(join(projectPath, 'figma.md')),
    analytics: readFile(join(projectPath, 'analytics.md'))
  };

  // Extract project name from PRD header or use slug
  const projectNameMatch = artifacts.prd.match(/^Project:\s*(.+)$/m);
  const projectName = projectNameMatch ? projectNameMatch[1].trim() : slug;

  // Generate review content
  const reviewContent = generateReview(artifacts, projectName);
  const commentsContent = generateComments(artifacts, projectName);

  // Write output files
  const reviewPath = join(projectPath, 'design-review.md');
  const commentsPath = join(projectPath, 'design-comments.preview.md');
  
  writeFile(reviewPath, reviewContent);
  writeFile(commentsPath, commentsContent);

  console.log(`✅ ${slug}`);
  console.log(`   → design-review.md`);
  console.log(`   → design-comments.preview.md`);
  
  return true;
}

// Main execution
console.log('');
console.log('🔍 Superdesigner Review');
console.log('');

if (target === 'all') {
  const projects = listProjectDirs();
  
  if (projects.length === 0) {
    console.error('❌ No projects found.');
    console.error('   Create one with: npm run new -- "Project Name"');
    process.exit(1);
  }
  
  console.log(`Reviewing ${projects.length} project(s)...`);
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

console.log('');
console.log('📝 Next steps:');
console.log('   1. Review design-review.md for gaps');
console.log('   2. Check design-comments.preview.md for suggested Figma comments');
console.log('   3. Run: npm run comment -- <slug> --dry-run');
console.log('');
