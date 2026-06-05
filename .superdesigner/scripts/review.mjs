#!/usr/bin/env node

/**
 * Generate design review prompts for the review agent (Claude Code; Cursor optional).
 * Usage: superdesigner review [project-slug]
 *        superdesigner review all
 */

import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { readFile, writeFile, listProjectDirs, getProjectPath, getContextPath, getInsightsPath, getMemoryPath, projectExists, findWorkspaceRoot } from '../lib/files.mjs';
import { selectProject } from '../lib/prompt.mjs';
import { hasFigmaTarget } from '../lib/figma.mjs';

/**
 * Extract project name from PRD frontmatter.
 * @param {string} prdContent - Content of prd.md
 * @returns {string|null} - Project name or null
 */
function extractProjectName(prdContent) {
  const match = prdContent.match(/^Project:\s*(.+)$/m);
  return match ? match[1].trim() : null;
}

const VALID_INTENTS = ['pre-handoff', 'pre-launch', 'gap-audit'];
const VALID_SCAFFOLD_PATHS = ['figma', 'code'];

/**
 * Build the Intent block for the prompt. A known intent states the routing/weighting;
 * an absent intent tells the orchestrator to infer it from the context.
 * @param {string|null} intent - One of VALID_INTENTS, or null
 * @returns {string} - Markdown for the "## Intent" section
 */
function intentGuidance(intent) {
  const guidance = {
    'pre-handoff':
      'Review type: **pre-handoff**. This is before engineering handoff. Weight flow clarity, ' +
      'completeness of the five states, and PRD coverage. Focus on what is missing or ambiguous, ' +
      'not launch-readiness.',
    'pre-launch':
      'Review type: **pre-launch**. This is a final gate. Weight analytics instrumentation, ' +
      'error/recovery states, edge cases, and trust signals. Surface launch-blocking gaps as P0.',
    'gap-audit':
      'Review type: **gap audit**. Weight PRD-to-design coverage and missing states/edge cases. ' +
      'Systematically list every PRD requirement with no corresponding screen or state.'
  };

  if (intent && guidance[intent]) {
    return guidance[intent];
  }

  return (
    'Review type: **not specified — infer it from the context.** Signals: a sparse or early PRD ' +
    'with early Figma → pre-handoff; a complete PRD with analytics defined → pre-launch; a ' +
    '"what are we missing" framing → gap audit. State the intent you inferred at the top of the ' +
    'review and weight findings accordingly.'
  );
}

/**
 * Generate minimal review prompt that references the rules file.
 * @param {string} projectName - Name of the project
 * @param {string} slug - Project slug
 * @param {string|null} [intent] - Review intent (pre-handoff | pre-launch | gap-audit) or null
 * @returns {string} - Prompt content
 */
function generatePrompt(projectName, slug, intent = null) {
  return `# Review: ${projectName}

You are the **review orchestrator**. Plan and run a multi-agent design review, then synthesize the
results into the two output files. Follow \`.cursor/rules/superdesigner.mdc\` exactly. Do the
agents' work by dispatching them — do not review every dimension yourself.

## Intent

${intentGuidance(intent)}

## Context (read these first)

- projects/${slug}/context/prd.md
- projects/${slug}/context/research.md
- projects/${slug}/context/figma.md
- projects/${slug}/context/analytics.md
- projects/${slug}/context/content.md
- DESIGN.md (design reference; prefer projects/${slug}/context/DESIGN.md if present)
- projects/${slug}/memory/ — what carried over from prior reviews (user-preferences.md, project.md, session.md)

## Memory

Read \`projects/${slug}/memory/\` before you start. Honor \`user-preferences.md\` (recurring
preferences and prior overrides — e.g. don't re-raise findings the designer has consistently
dismissed) and \`project.md\` (durable facts). After you finish writing the review, update memory:
overwrite \`session.md\` with a short summary of this run (intent, agents run/skipped, top findings)
and append any durable new facts to \`project.md\`. Do not edit \`user-preferences.md\` — the
designer owns it.

## Agents (dispatch with the Task tool)

Each agent has one job, its own sources, and only the tools it needs. Dispatch each as a subagent
(\`subagent_type\` in the table), give it the project slug and file paths it needs, and collect its
findings. Only the Figma agent may touch Figma; only you (the orchestrator) write files.

| subagent_type | Job | Sources |
|---|---|---|
| prd-agent | Every PRD requirement has a screen; user stories have states; acceptance criteria covered | prd.md, figma.md |
| figma-agent | Extract screen structure, components, hierarchy, and screen-level nodeIds (ONLY agent that touches Figma) | figma.md + Figma MCP |
| ux-agent | Missing states (empty/loading/error/recovery/offline/permission-denied), cognitive load, flow clarity, trust signals | figma-agent output, prd.md, research.md, DESIGN.md |
| content-agent | Copy vs the content brief + DESIGN.md voice; ambiguous labels, non-plain-English legal copy, missing error microcopy | content.md, DESIGN.md, prd.md |
| analytics-agent | Are analytics requirements measurable given the design; instrumentation gaps (events needed but won't fire) | analytics.md, prd.md |

## Orchestration order (dependencies)

1. **In parallel:** dispatch prd-agent, figma-agent, content-agent, and analytics-agent.
2. **After figma-agent returns:** dispatch ux-agent, passing the figma-agent's screen inventory
   (screen → nodeId) in its prompt — the UX agent needs the screen structure to check states.
3. If the Figma MCP is not connected, figma-agent returns a text-only inventory from \`figma.md\`
   and notes that live inspection was skipped. Continue — do not stop.

## Synthesis

Merge every agent's findings. Deduplicate overlaps (when two agents raise the same issue, combine
them and cite both sources). Attach evidence to each finding. Rank by impact, weighted by the
intent above. Then write the two output files.

## Output (write exactly these two files)

1. **projects/${slug}/insights/design-review.md** — Follow format in:
   \`.superdesigner/templates/design-review.template.md\`

2. **projects/${slug}/insights/design-comments.preview.md** — Follow the EXACT format in:
   \`.superdesigner/templates/design-comments.template.md\`

   Limit to the 10 highest-impact comments. Each MUST have: page, frame, nodeId, Type, Message,
   Why. Use nodeIds from the figma-agent (nested screens, not parent frames). Leave \`Status:\`
   blank — the designer fills it in.

## Observability

Also write **projects/${slug}/insights/run-manifest.json** recording what happened, so the run is
auditable. Use this shape:

\`\`\`json
{
  "intent": "pre-handoff | pre-launch | gap-audit (the one you used)",
  "figmaMcpConnected": true,
  "agents": [
    { "name": "figma-agent", "ran": true, "skipped": false, "note": "", "findings": 0 }
  ],
  "findingsTotal": 0,
  "commentsSelected": 0,
  "commentCapRationale": "why these made the cut over others"
}
\`\`\`

List every agent (prd, figma, ux, content, analytics) with whether it ran or was skipped and why
(e.g. figma-agent skipped because the MCP wasn't connected).

## Rules

Read \`.cursor/rules/superdesigner.mdc\` for full guidelines.

Key requirements:
1. Review intent, not pixels
2. Write only to the insights folder
3. Cover via the agents: PRD alignment, states, edge cases, content/copy, analytics
4. Guardrails: flag missing context instead of guessing; every finding cites its source or it does
   not ship; frame findings as questions, not verdicts
5. Tone: direct, question-based, concise
`;
}

/**
 * Build the path-selection block for the scaffold prompt.
 * @param {string|null} path - 'figma' | 'code' | null (decide/ask)
 * @returns {string}
 */
function scaffoldPathGuidance(path) {
  if (path === 'figma') {
    return 'Build path: **figma** — dispatch the figma-build-agent to create starter frames in the ' +
      'currently-open Figma file.';
  }
  if (path === 'code') {
    return 'Build path: **code** — dispatch the prototype-agent to write a single-file HTML prototype.';
  }
  return (
    'Build path: **not specified.** If you are running interactively, ask the designer which they ' +
    'want — Figma canvas frames or an HTML prototype. If you are non-interactive, infer: use the ' +
    'figma path only if the figma-console MCP is connected (check ' +
    '`mcp__figma-console__figma_get_status`); otherwise use the code path. State which you chose ' +
    'and why in the run manifest.'
  );
}

/**
 * Generate the scaffold prompt — used when a project has a PRD but no Figma file. The orchestrator
 * proposes screens from the PRD, then builds a starting point via the chosen path. Still
 * intent-first: it proposes screens that satisfy the PRD, it does not pixel-push.
 * @param {string} projectName - Name of the project
 * @param {string} slug - Project slug
 * @param {string|null} [scaffoldPath] - 'figma' | 'code' | null
 * @returns {string} - Prompt content
 */
function generateScaffoldPrompt(projectName, slug, scaffoldPath = null) {
  return `# Scaffold: ${projectName}

You are the **scaffold orchestrator**. This project has a PRD but **no Figma file yet** — there is
nothing to review, so give the designer a starting point from the PRD. Stay intent-first: propose
screens that satisfy the PRD; do not pixel-push. Follow \`.cursor/rules/superdesigner.mdc\` exactly.
Dispatch the agents — don't do their work yourself.

## Path

${scaffoldPathGuidance(scaffoldPath)}

## Context (read these first)

- projects/${slug}/context/prd.md
- projects/${slug}/context/research.md
- projects/${slug}/context/content.md
- DESIGN.md (design reference; prefer projects/${slug}/context/DESIGN.md if present)
- projects/${slug}/memory/ — what carried over from prior runs

## Memory

Read \`projects/${slug}/memory/\` first. Honor \`user-preferences.md\` and \`project.md\`. After you
finish, overwrite \`session.md\` with a short summary of this run and append durable new facts to
\`project.md\`. Do not edit \`user-preferences.md\` — the designer owns it.

## Agents (dispatch with the Task tool)

| subagent_type | Job |
|---|---|
| screen-planner-agent | Propose the screens from the PRD (purpose, key elements, the five states, key copy), each cited to a PRD step |
| figma-build-agent | Build starter frames in the open Figma file via figma-console (figma path only) |
| prototype-agent | Write a single-file HTML prototype per flow in projects/${slug}/prototype/ (code path only) |

## Order

1. Dispatch **screen-planner-agent** first; it writes \`projects/${slug}/insights/screen-plan.md\`.
   This is the spec and the safe deliverable.
2. Then resolve the build path (see Path above) and dispatch **exactly one** builder, passing it the
   screen plan.
3. **Degrade gracefully:** if the figma path was chosen but figma-console is not connected, do not
   stop — fall back to the code path and note the skip in the manifest.

## Output

1. **projects/${slug}/insights/screen-plan.md** — the proposed screens (always).
2. The build output for the chosen path:
   - **figma** — starter frames in the open Figma file (record the created node IDs in the manifest).
   - **code** — \`projects/${slug}/prototype/\` with one self-contained \`index.html\` per flow
     (Tailwind via CDN, no build step) plus an \`index.html\` hub linking them.
3. **projects/${slug}/insights/run-manifest.json** recording the run:

\`\`\`json
{
  "mode": "scaffold",
  "path": "figma | code (the one you used)",
  "figmaConsoleConnected": true,
  "screens": ["screen names from the plan"],
  "createdNodeIds": ["figma path: node IDs you created"],
  "createdFiles": ["code path: prototype files you wrote"],
  "skipped": "anything skipped and why (e.g. figma-console not connected → used code path)"
}
\`\`\`

## Rules

Read \`.cursor/rules/superdesigner.mdc\` for full guidelines.

Key requirements:
1. Intent-first: every proposed screen traces to a PRD step.
2. Write only to the insights, prototype, and memory (session/project) folders.
3. Cover the five states (happy, empty, loading, error, recovery) for each screen.
4. Use the content brief + DESIGN.md voice for any copy you write.
5. Tone: concise, practical — this is a first draft to react to, not a finished design.
`;
}

/**
 * Generate the workflow prompt — the deterministic dynamic-workflow path for a review. Instead of
 * dispatching the agents itself, the headless agent runs the committed workflow script (which
 * guarantees the parallel fan-out, Figma→UX dependency, schema-validated findings, and code-side
 * dedup/rank/10-cap) and then writes the artifacts from the structured object it returns.
 * @param {string} projectName - Name of the project
 * @param {string} slug - Project slug
 * @param {string|null} intent - Review intent or null to infer
 * @param {string} workflowPath - Absolute path to review.workflow.mjs
 * @returns {string} - Prompt content
 */
function generateWorkflowPrompt(projectName, slug, intent, workflowPath) {
  const intentArg = VALID_INTENTS.includes(intent) ? intent : 'pre-launch';
  return `# Review (dynamic workflow): ${projectName}

Run the Superdesigner review as a **deterministic dynamic workflow**. Do **not** review the design
yourself and do **not** dispatch the agents manually — the workflow script does that, guaranteeing
the parallel fan-out, the Figma→UX dependency, schema-validated findings, and the dedup/rank/10-cap.

**You are explicitly authorized and required to run this workflow.** The user invoked
\`superdesigner review --workflow\`, which is an explicit opt-in to multi-agent orchestration. Do not
ask for confirmation and do not fall back to reviewing manually — call the Workflow tool directly.

## Step 1 — run the workflow

Call the **Workflow** tool with:

- \`scriptPath\`: \`${workflowPath}\`
- \`args\`: \`{ "slug": "${slug}", "projectName": "${projectName}", "intent": "${intentArg}" }\`

It runs in the background; wait for it to complete. It returns an object:
\`{ reviewMd, commentsBody, manifest, screens, counts }\`.

## Step 2 — write the artifacts from the returned object

Using the returned values, write exactly these files (these are the only files you write):

1. **projects/${slug}/insights/design-review.md** — the returned \`reviewMd\` verbatim (you may add a
   \`**Date:**\` line under the title).
2. **projects/${slug}/insights/design-comments.preview.md** — a header then the returned
   \`commentsBody\` then a footer, in this shape:
   \`\`\`
   # Design Comments Preview
   Project: ${projectName}
   Generated: <today's date>

   ---

   <commentsBody>

   *Total: <counts.comments> comments*
   *Run \`superdesigner comment ${slug}\` to post to Figma.*
   \`\`\`
3. **projects/${slug}/insights/run-manifest.json** — \`JSON.stringify(manifest, null, 2)\`.

## Step 3 — memory

Update \`projects/${slug}/memory/session.md\` with a one-paragraph summary (intent, agents run,
finding/comment counts) and append any durable new facts to \`projects/${slug}/memory/project.md\`.
Do not edit \`user-preferences.md\`.

Do not add findings of your own — ship exactly what the workflow produced. The
\`design-comments.preview.md\` must stay in the canonical format so \`superdesigner comment\` can parse it.
`;
}

/**
 * Generate context summary from artifacts.
 * @param {object} artifacts - { prd, research, figma, analytics, content, design }
 * @param {object} memory - { session, project, userPreferences }
 * @param {string} projectName - Project name
 * @param {string} slug - Project slug
 * @returns {string} - Context file content
 */
function generateContext(artifacts, memory, projectName, slug) {
  const { prd, research, figma, analytics, content, design } = artifacts;
  const { session, project, userPreferences } = memory;
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

---

## Content / Copy Brief

${content ? content.slice(0, 2000) : '*No content.md found*'}

---

## DESIGN.md (reference)

${design ? design.slice(0, 3000) : '*No DESIGN.md found — UX and content findings cannot cite a design rule.*'}

---

## Memory (carried from prior reviews)

### User preferences
${userPreferences ? userPreferences.slice(0, 1500) : '*None recorded.*'}

### Project memory
${project ? project.slice(0, 1500) : '*None recorded.*'}

### Last session
${session ? session.slice(0, 1500) : '*No prior session.*'}
`;
}

/**
 * Run review (or scaffold) for a single project.
 * @param {string} slug - Project slug
 * @param {string|null} [intent] - Review intent or null to infer
 * @param {string|null} [scaffoldPath] - Forced scaffold path ('figma'|'code') or null
 * @param {boolean} [useWorkflow] - Route a review through the deterministic dynamic workflow
 * @returns {boolean} - Success status
 */
function reviewProject(slug, intent = null, scaffoldPath = null, useWorkflow = false) {
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
    analytics: readFile(join(contextPath, 'analytics.md')),
    content: readFile(join(contextPath, 'content.md')),
    // DESIGN.md reference: prefer the per-project override, fall back to the workspace-root file.
    design: readFile(join(contextPath, 'DESIGN.md')) || readFile(join(findWorkspaceRoot(), 'DESIGN.md'))
  };

  // Memory: what carried over from prior reviews of this project.
  const memoryPath = getMemoryPath(slug);
  const memory = {
    session: readFile(join(memoryPath, 'session.md')),
    project: readFile(join(memoryPath, 'project.md')),
    userPreferences: readFile(join(memoryPath, 'user-preferences.md'))
  };

  // Extract project name from PRD header or use slug
  const projectName = extractProjectName(artifacts.prd) || slug;

  // No Figma target + a PRD to work from → scaffold a starting point instead of reviewing.
  const mode = (!hasFigmaTarget(artifacts.figma) && artifacts.prd) ? 'scaffold' : 'review';

  // --workflow only applies to a review (the workflow is the review orchestrator).
  const workflowReview = mode === 'review' && useWorkflow;

  // Generate prompt and context files
  let promptContent;
  if (mode === 'scaffold') {
    promptContent = generateScaffoldPrompt(projectName, slug, scaffoldPath);
  } else if (workflowReview) {
    const workflowPath = join(findWorkspaceRoot(), '.superdesigner', 'workflows', 'review.workflow.mjs');
    promptContent = generateWorkflowPrompt(projectName, slug, intent, workflowPath);
  } else {
    promptContent = generatePrompt(projectName, slug, intent);
  }
  const contextContent = generateContext(artifacts, memory, projectName, slug);

  // Write to insights/prompts/
  const promptPath = join(promptsPath, '_review_prompt.md');
  const contextFilePath = join(promptsPath, '_review_context.md');

  writeFile(promptPath, promptContent);
  writeFile(contextFilePath, contextContent);

  const modeLabel = workflowReview ? 'review mode · dynamic workflow' : `${mode} mode`;
  console.log(`✅ ${slug} (${modeLabel})`);
  console.log(`   → insights/prompts/_review_prompt.md`);
  console.log(`   → insights/prompts/_review_context.md`);
  if (mode === 'scaffold') {
    console.log(`   ℹ️  No Figma file detected — will scaffold screens from the PRD.`);
  } else if (useWorkflow) {
    console.log(`   ⚙️  Dynamic-workflow orchestrator (deterministic fan-out + schema'd findings).`);
  }

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

/**
 * Parse the script argv into a review intent, scaffold path, workflow flag, and positional args.
 * @param {string[]} argv - process.argv.slice(2)
 * @returns {{intent: string|null, scaffoldPath: string|null, useWorkflow: boolean, positionals: string[]}}
 */
function parseScriptArgs(argv) {
  let intent = null;
  let scaffoldPath = null;
  let useWorkflow = false;
  const positionals = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--intent') {
      const value = argv[i + 1];
      if (value && !value.startsWith('-')) {
        intent = value;
        i++; // Skip the value
      }
    } else if (argv[i] === '--scaffold') {
      const value = argv[i + 1];
      if (value && !value.startsWith('-')) {
        scaffoldPath = value;
        i++; // Skip the value
      }
    } else if (argv[i] === '--workflow') {
      useWorkflow = true;
    } else if (!argv[i].startsWith('-')) {
      positionals.push(argv[i]);
    }
  }

  if (intent && !VALID_INTENTS.includes(intent)) {
    console.log(`⚠️  Unknown --intent "${intent}". Valid: ${VALID_INTENTS.join(', ')}. Inferring instead.`);
    intent = null;
  }

  if (scaffoldPath && !VALID_SCAFFOLD_PATHS.includes(scaffoldPath)) {
    console.log(`⚠️  Unknown --scaffold "${scaffoldPath}". Valid: ${VALID_SCAFFOLD_PATHS.join(', ')}. Letting the agent decide.`);
    scaffoldPath = null;
  }

  return { intent, scaffoldPath, useWorkflow, positionals };
}

// Main execution
const { intent, scaffoldPath, useWorkflow, positionals } = parseScriptArgs(process.argv.slice(2));

console.log('');
console.log('🔍 Superdesigner Review');

const target = await getTargetSlug(positionals);

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
    if (reviewProject(slug, intent, scaffoldPath, useWorkflow)) {
      successCount++;
    }
  }

  console.log('');
  console.log(`✅ Completed: ${successCount}/${projects.length} projects`);
} else {
  const success = reviewProject(target, intent, scaffoldPath, useWorkflow);
  if (!success) {
    process.exit(1);
  }
}

// Note: Next steps are shown by the CLI command after agent runs
console.log('');
