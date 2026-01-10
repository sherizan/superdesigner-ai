import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Package root - where the npm package is installed (templates, lib, etc.)
 * This is always relative to where this file is located.
 */
const PACKAGE_ROOT = join(__dirname, '..');

/**
 * Cache for workspace root to avoid repeated filesystem walks.
 */
let _workspaceRootCache = null;

/**
 * Find the workspace root by walking up from cwd.
 * Looks for:
 * 1. A projects/ folder, OR
 * 2. A package.json with superdesigner in dependencies
 * 
 * @returns {string} - Absolute path to workspace root
 */
export function findWorkspaceRoot() {
  if (_workspaceRootCache) {
    return _workspaceRootCache;
  }

  let dir = process.cwd();
  const root = dirname(dir.split('/').slice(0, 2).join('/') || '/');

  while (dir !== root && dir !== '/') {
    // Check for projects/ folder
    if (existsSync(join(dir, 'projects'))) {
      _workspaceRootCache = dir;
      return dir;
    }

    // Check for package.json with superdesigner dependency
    const pkgPath = join(dir, 'package.json');
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        if (pkg.dependencies?.superdesigner || pkg.devDependencies?.superdesigner) {
          _workspaceRootCache = dir;
          return dir;
        }
        // Also check if this IS the superdesigner package (for dev mode)
        if (pkg.name === 'superdesigner') {
          _workspaceRootCache = dir;
          return dir;
        }
      } catch {
        // Invalid JSON, continue
      }
    }

    dir = dirname(dir);
  }

  // Fallback to cwd
  _workspaceRootCache = process.cwd();
  return _workspaceRootCache;
}

/**
 * Clear the workspace root cache (useful for testing).
 */
export function clearWorkspaceCache() {
  _workspaceRootCache = null;
}

/**
 * Get the package root (where templates are located).
 * @returns {string} - Absolute path to package root
 */
export function getPackageRoot() {
  return PACKAGE_ROOT;
}

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
 * Templates are read from the PACKAGE root (npm installation).
 * @param {string} templateName - Template filename (e.g., "prd.template.md")
 * @param {string} destPath - Destination file path
 * @param {object} meta - Meta values to inject { projectName, createdDate }
 */
export function copyTemplate(templateName, destPath, meta) {
  const templatePath = join(PACKAGE_ROOT, 'templates', templateName);
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
 * Projects are read from the WORKSPACE root.
 * @returns {string[]} - Array of project folder names
 */
export function listProjectDirs() {
  const projectsDir = join(findWorkspaceRoot(), 'projects');
  
  if (!existsSync(projectsDir)) {
    return [];
  }
  
  return readdirSync(projectsDir).filter((name) => {
    // Skip hidden files and special files
    if (name.startsWith('.')) return false;
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
  return join(findWorkspaceRoot(), 'projects', slug);
}

/**
 * Get the absolute path to the projects directory.
 * @returns {string} - Absolute path to projects folder
 */
export function getProjectsRoot() {
  return join(findWorkspaceRoot(), 'projects');
}

/**
 * Ensure the projects folder exists in the workspace.
 * @returns {string} - Path to projects folder
 */
export function ensureProjectsFolder() {
  const projectsDir = getProjectsRoot();
  if (!existsSync(projectsDir)) {
    mkdirSync(projectsDir, { recursive: true });
  }
  return projectsDir;
}

/**
 * Get the absolute path to the templates directory.
 * Templates are in the PACKAGE root.
 * @returns {string} - Absolute path to templates folder
 */
export function getTemplatesRoot() {
  return join(PACKAGE_ROOT, 'templates');
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

/**
 * Get the absolute path to a project's context folder.
 * @param {string} slug - Project slug
 * @returns {string} - Absolute path to context folder
 */
export function getContextPath(slug) {
  return join(findWorkspaceRoot(), 'projects', slug, 'context');
}

/**
 * Get the absolute path to a project's insights folder.
 * @param {string} slug - Project slug
 * @returns {string} - Absolute path to insights folder
 */
export function getInsightsPath(slug) {
  return join(findWorkspaceRoot(), 'projects', slug, 'insights');
}
