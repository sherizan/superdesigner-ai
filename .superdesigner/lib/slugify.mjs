/**
 * Convert a project name to a URL/folder-safe slug.
 * @param {string} name - The project name (e.g., "Botim Quest")
 * @returns {string} - Slugified name (e.g., "botim-quest")
 */
export function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')  // Remove special characters
    .replace(/\s+/g, '-')          // Replace spaces with hyphens
    .replace(/-+/g, '-')           // Collapse multiple hyphens
    .replace(/^-|-$/g, '');        // Trim leading/trailing hyphens
}
