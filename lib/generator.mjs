/**
 * Design review generator - deterministic logic (no AI).
 * Parses PRD and other artifacts to produce design review content.
 */

/**
 * Extract all H2 and H3 headings from markdown.
 * @param {string} markdown - Markdown content
 * @returns {string[]} - Array of heading texts
 */
export function extractHeadings(markdown) {
  const headingRegex = /^#{2,3}\s+(.+)$/gm;
  const headings = [];
  let match;
  
  while ((match = headingRegex.exec(markdown)) !== null) {
    headings.push(match[1].trim());
  }
  
  return headings;
}

/**
 * Extract list items (bullets or numbered) under a specific section heading.
 * @param {string} markdown - Markdown content
 * @param {string} sectionName - The heading to find (case-insensitive)
 * @returns {string[]} - Array of list item texts
 */
export function extractBullets(markdown, sectionName) {
  const lines = markdown.split('\n');
  const bullets = [];
  let inSection = false;
  
  for (const line of lines) {
    // Check if this is a heading
    const headingMatch = line.match(/^#{1,3}\s+(.+)$/);
    
    if (headingMatch) {
      const heading = headingMatch[1].toLowerCase();
      inSection = heading.includes(sectionName.toLowerCase());
      continue;
    }
    
    // If we're in the section, collect list items (bullets or numbered)
    if (inSection) {
      // Match bullet points (- or *)
      const bulletMatch = line.match(/^\s*[-*]\s+(.+)$/);
      if (bulletMatch) {
        bullets.push(bulletMatch[1].trim());
        continue;
      }
      
      // Match numbered lists (1. 2. etc)
      const numberedMatch = line.match(/^\s*\d+\.\s+(.+)$/);
      if (numberedMatch) {
        bullets.push(numberedMatch[1].trim());
      }
    }
  }
  
  return bullets;
}

/**
 * Extract a section's content (paragraph after heading, before next heading).
 * @param {string} markdown - Markdown content
 * @param {string} sectionName - The heading to find (case-insensitive)
 * @returns {string} - Section content or empty string
 */
export function extractSection(markdown, sectionName) {
  const lines = markdown.split('\n');
  const content = [];
  let inSection = false;
  
  for (const line of lines) {
    const headingMatch = line.match(/^#{1,3}\s+(.+)$/);
    
    if (headingMatch) {
      if (inSection) break; // Hit next heading, stop
      const heading = headingMatch[1].toLowerCase();
      inSection = heading.includes(sectionName.toLowerCase());
      continue;
    }
    
    if (inSection && line.trim()) {
      content.push(line.trim());
    }
  }
  
  return content.join(' ').slice(0, 500); // Limit to 500 chars
}

/**
 * Infer expected screens from PRD headings or provide defaults.
 * @param {string[]} headings - Extracted headings from PRD
 * @returns {string[]} - List of expected screen names
 */
function inferScreens(headings) {
  // Look for screen-like nouns in headings
  const screenKeywords = ['screen', 'page', 'view', 'modal', 'dialog', 'flow', 'step'];
  const inferredScreens = [];
  
  for (const heading of headings) {
    const lowerHeading = heading.toLowerCase();
    const hasScreenKeyword = screenKeywords.some(kw => lowerHeading.includes(kw));
    
    if (hasScreenKeyword) {
      inferredScreens.push(heading);
    }
  }
  
  // If we found screen-related headings, use them
  if (inferredScreens.length > 0) {
    return inferredScreens;
  }
  
  // Otherwise, return sensible defaults
  return ['Entry', 'Core Action', 'Confirmation', 'Error/Recovery'];
}

/**
 * Generate the design-review.md content.
 * @param {object} artifacts - { prd, research, figma, analytics }
 * @param {string} projectName - Name of the project
 * @returns {string} - Generated markdown content
 */
export function generateReview(artifacts, projectName) {
  const { prd, research, figma } = artifacts;
  
  const headings = extractHeadings(prd);
  const happyPathSteps = extractBullets(prd, 'happy path');
  const edgeCases = extractBullets(prd, 'edge case');
  const screens = inferScreens(headings);
  
  // Extract context sections for Figma Make prompt
  const overview = extractSection(prd, 'overview');
  const problemStatement = extractSection(prd, 'problem');
  const goals = extractBullets(prd, 'goals');
  
  // Build the review document
  let review = `# Design Review: ${projectName}

*Generated on ${new Date().toISOString().split('T')[0]}*

---

## 1. Intended Flow (from PRD)

`;

  if (happyPathSteps.length > 0) {
    happyPathSteps.forEach((step, i) => {
      review += `${i + 1}. ${step}\n`;
    });
  } else {
    review += `*No explicit "Happy path" section found in PRD. Please document the main user journey.*\n`;
  }

  review += `
## 2. Expected Screens (inferred)

`;

  screens.forEach((screen) => {
    review += `- [ ] ${screen}\n`;
  });

  review += `
## 3. States Checklist

Every screen should account for these states:

- [ ] **Happy path** — The ideal user journey
- [ ] **Empty** — No data, first-time user, or cleared state
- [ ] **Loading** — Waiting for data or action completion
- [ ] **Error** — Something went wrong (network, validation, permissions)
- [ ] **Recovery** — How the user gets back on track

## 4. Gaps & Risks

`;

  if (edgeCases.length > 0) {
    review += `### Edge cases identified in PRD:\n\n`;
    edgeCases.forEach((edge) => {
      review += `- ⚠️ ${edge}\n`;
    });
    review += '\n';
  } else {
    review += `*No explicit "Edge cases" section found in PRD.*\n\n`;
  }

  review += `### Common gaps to check:

- [ ] Offline behavior
- [ ] Permission denied states
- [ ] Session timeout handling
- [ ] Rate limiting / throttling
- [ ] Accessibility considerations

## 5. Suggestions

Based on the PRD analysis:

`;

  if (happyPathSteps.length === 0) {
    review += `1. **Document the happy path** — Add a "Happy path" section to your PRD with numbered steps.\n`;
  }
  if (edgeCases.length === 0) {
    review += `1. **Identify edge cases** — Add an "Edge cases" section to your PRD.\n`;
  }
  if (happyPathSteps.length > 0 && edgeCases.length > 0) {
    review += `1. Review each edge case against your Figma screens.\n`;
    review += `2. Ensure all states in the checklist are designed.\n`;
    review += `3. Consider adding loading skeletons for better perceived performance.\n`;
  }

  // Generate Figma Make prompt with project context
  review += `
## 6. Figma Make Prompt

Use this prompt with Figma's AI features to scaffold your prototype:

\`\`\`
Create a prototype skeleton for "${projectName}".

`;

  // Add project context
  if (overview) {
    review += `## Context\n${overview}\n\n`;
  }
  
  if (problemStatement) {
    review += `## Problem\n${problemStatement}\n\n`;
  }
  
  if (goals.length > 0) {
    review += `## Goals\n`;
    goals.slice(0, 5).forEach((goal) => {
      review += `- ${goal}\n`;
    });
    review += '\n';
  }

  // Add flow
  if (happyPathSteps.length > 0) {
    review += `## User Flow\n`;
    happyPathSteps.forEach((step, i) => {
      review += `${i + 1}. ${step}\n`;
    });
  } else {
    review += `## Screens Needed\n${screens.join(', ')}\n`;
  }

  review += `
## Required Frames
- ${screens.join('\n- ')}

## States (for each screen)
- Default (happy path)
- Empty state
- Loading state
- Error state

Focus on flow and structure, not visual polish.
\`\`\`

---

*Review generated by Superdesigner v0.1*
`;

  return review;
}

/**
 * Comment types for categorization.
 */
const COMMENT_TYPES = {
  MISSING_STATE: 'Missing State',
  FLOW_MISMATCH: 'Flow Mismatch',
  CLARIFYING_QUESTION: 'Clarifying Question',
  EDGE_CASE: 'Edge Case',
  VALIDATION: 'Validation'
};

/**
 * Extract Figma node ID from figma.md content.
 * Looks for node-id parameter in URLs or explicit NodeId: lines.
 * @param {string} figmaContent - Content of figma.md
 * @returns {string|null} - Node ID (e.g., "12629:33522") or null
 */
export function extractNodeId(figmaContent) {
  if (!figmaContent) return null;
  
  // Try URL pattern: node-id=123-456 or node-id=123:456
  const urlMatch = figmaContent.match(/node-id=(\d+[-:]\d+)/);
  if (urlMatch) {
    // Normalize to colon format (Figma API uses colons)
    return urlMatch[1].replace('-', ':');
  }
  
  // Try explicit NodeId: line
  const nodeIdMatch = figmaContent.match(/^NodeId:\s*(\d+[:-]\d+)/m);
  if (nodeIdMatch) {
    return nodeIdMatch[1].replace('-', ':');
  }
  
  return null;
}

/**
 * Generate the design-comments.preview.md content in canonical format.
 * @param {object} artifacts - { prd, research, figma, analytics }
 * @param {string} projectName - Name of the project
 * @returns {string} - Generated markdown content
 */
export function generateComments(artifacts, projectName) {
  const { prd, figma } = artifacts;
  
  const happyPathSteps = extractBullets(prd, 'happy path');
  const edgeCases = extractBullets(prd, 'edge case');
  const headings = extractHeadings(prd);
  const screens = inferScreens(headings);
  
  // Extract node ID from figma.md for pinning comments
  const defaultNodeId = extractNodeId(figma);
  
  const date = new Date().toISOString().split('T')[0];
  
  let output = `# Design Comments Preview
Project: ${projectName}
Generated: ${date}

---

`;

  const suggestedComments = [];
  
  // Always check for empty/loading/error states on entry screen
  suggestedComments.push({
    page: screens[0] || 'Main Flow',
    frame: null,
    nodeId: defaultNodeId,
    type: COMMENT_TYPES.MISSING_STATE,
    message: `Does this screen handle Empty, Loading, and Error states?\nConsider adding visual representations for each state to ensure the design covers all scenarios.`,
    why: 'States checklist — every screen should account for empty, loading, and error conditions'
  });
  
  // If no happy path documented, flag it
  if (happyPathSteps.length === 0) {
    suggestedComments.push({
      page: 'Flow Overview',
      frame: null,
      nodeId: defaultNodeId,
      type: COMMENT_TYPES.FLOW_MISMATCH,
      message: `The PRD does not have a documented "Happy path" section.\nWithout a clear happy path, it's difficult to verify the design covers the intended user journey.`,
      why: 'PRD → "Happy path" section missing'
    });
  }
  
  // Add comments for each edge case from PRD
  edgeCases.forEach((edge) => {
    suggestedComments.push({
      page: 'Relevant Screen',
      frame: null,
      nodeId: defaultNodeId,
      type: COMMENT_TYPES.EDGE_CASE,
      message: `The PRD mentions this edge case: "${edge}"\nIs this scenario handled in the design? Consider adding a state or recovery flow.`,
      why: `PRD → "Edge cases" → "${edge}"`
    });
  });
  
  // Validation comment for forms
  suggestedComments.push({
    page: 'Form / Input Screen',
    frame: null,
    nodeId: defaultNodeId,
    type: COMMENT_TYPES.VALIDATION,
    message: `What happens when the user enters invalid input?\nConsider showing inline error states with clear messaging on how to fix the issue.`,
    why: 'Common UX pattern — validation feedback improves form completion rates'
  });
  
  // Clarifying question about confirmation flow
  if (happyPathSteps.length > 0) {
    const lastStep = happyPathSteps[happyPathSteps.length - 1];
    suggestedComments.push({
      page: 'Confirmation',
      frame: null,
      nodeId: defaultNodeId,
      type: COMMENT_TYPES.CLARIFYING_QUESTION,
      message: `After the user completes the main action ("${lastStep}"), is there a clear confirmation state?\nConsider whether the user needs explicit feedback before being redirected.`,
      why: `PRD → "Happy path" → final step`
    });
  }
  
  // Recovery/undo comment
  suggestedComments.push({
    page: 'Success Screen',
    frame: null,
    nodeId: defaultNodeId,
    type: COMMENT_TYPES.CLARIFYING_QUESTION,
    message: `How does the user undo or go back if they made a mistake?\nConsider adding a recovery path or edit option.`,
    why: 'Error recovery — users should be able to correct mistakes'
  });
  
  // Limit to 7 comments max
  const finalComments = suggestedComments.slice(0, 7);
  
  finalComments.forEach((item, i) => {
    // Build nodeId line only if we have one
    const nodeIdLine = item.nodeId ? `\n  nodeId: ${item.nodeId}` : '';
    
    output += `## Comment ${i + 1}
Target:
  page: ${item.page}
  frame: ${item.frame || '(optional)'}${nodeIdLine}

Type:
  ${item.type}

Message:
${item.message}

Why:
${item.why}

---

`;
  });

  output += `*Total: ${finalComments.length} comments*
*Run \`npm run comment -- ${projectName.toLowerCase().replace(/\s+/g, '-')}\` to post to Figma.*
`;

  return output;
}
