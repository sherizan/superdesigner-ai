import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

/**
 * Read a file, returning empty string if it doesn't exist.
 * @param {string} filePath - Absolute or relative path to file
 * @returns {string} - File contents or empty string
 */
export function readFile(filePath) {
  try {
    return readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
}

/**
 * Write content to a file, creating directories as needed.
 * @param {string} filePath - Absolute path to file
 * @param {string} content - Content to write
 */
export function writeFile(filePath, content) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, 'utf-8');
}

/**
 * Copy a template file to destination with meta header injection.
 * @param {string} templateName - Template filename (e.g., "prd.template.md")
 * @param {string} destPath - Destination file path
 * @param {object} meta - Meta values to inject { projectName, createdDate }
 */
export function copyTemplate(templateName, destPath, meta) {
  const templatePath = join(ROOT, 'templates', templateName);
  const templateContent = readFile(templatePath);
  
  const header = `---
Project: ${meta.projectName}
Created: ${meta.createdDate}
---

`;

  const content = header + templateContent;
  writeFile(destPath, content);
}

/**
 * List all project directory slugs.
 * @returns {string[]} - Array of project folder names
 */
export function listProjectDirs() {
  const projectsDir = join(ROOT, 'projects');
  
  if (!existsSync(projectsDir)) {
    return [];
  }
  
  return readdirSync(projectsDir).filter((name) => {
    const fullPath = join(projectsDir, name);
    return statSync(fullPath).isDirectory();
  });
}

/**
 * Get the absolute path to a project folder.
 * @param {string} slug - Project slug
 * @returns {string} - Absolute path to project folder
 */
export function getProjectPath(slug) {
  return join(ROOT, 'projects', slug);
}

/**
 * Get the absolute path to the projects directory.
 * @returns {string} - Absolute path to projects folder
 */
export function getProjectsRoot() {
  return join(ROOT, 'projects');
}

/**
 * Get the absolute path to the templates directory.
 * @returns {string} - Absolute path to templates folder
 */
export function getTemplatesRoot() {
  return join(ROOT, 'templates');
}

/**
 * Check if a project exists.
 * @param {string} slug - Project slug
 * @returns {boolean}
 */
export function projectExists(slug) {
  const projectPath = getProjectPath(slug);
  return existsSync(projectPath) && statSync(projectPath).isDirectory();
}
