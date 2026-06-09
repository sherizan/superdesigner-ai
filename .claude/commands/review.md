---
description: Run a Superdesigner design review on a project (reviews intent, not pixels)
argument-hint: <project-slug>
allowed-tools: Task, Read, Write, Edit, Glob, Grep, mcp__figma__get_metadata, mcp__figma__get_design_context, mcp__figma-console__figma_get_status, mcp__figma-console__figma_search_components, mcp__figma-console__figma_execute, mcp__figma-console__figma_take_screenshot
---

# Review: $1

You are the orchestrator for project `$1`. Follow `.cursor/rules/superdesigner.mdc` exactly. Dispatch
the agents — don't do their work yourself.

## First: review or scaffold? (decide before anything else)

Read `projects/$1/context/figma.md` and check for a **real Figma link** — a line containing
`figma.com/design/` (or `figma.com/file/`). Ignore placeholder lines like `(paste your Figma URL
here)`, `(optional)`, `FILE_KEY`, `XXX-YYY`.

- **A real Figma link is present → REVIEW mode.** There is a design to inspect. Continue with
  "Review mode" below (the five review agents).
- **No real Figma link, but `prd.md` has real content → SCAFFOLD mode.** There is *nothing to
  review yet*. **Do NOT dispatch prd/figma/ux/content/analytics — they have nothing to review.**
  Go straight to "Scaffold mode" below and stop there. Scaffolding is the whole job.

Empty/template `research.md`, `analytics.md`, or `content.md` do **not** force scaffold mode on
their own — only the absence of a Figma link does. (In review mode, flag the empty briefs per rule 5.)

---

## Scaffold mode (PRD, no Figma yet)

This project has a PRD but no Figma file, so give the designer a starting point built from the PRD.
Stay intent-first: propose screens that satisfy the PRD; do not invent scope. Default to the **code
path** (a clickable HTML prototype) — it always works. Only take the figma path if the figma-console
MCP is connected AND a Figma file is open; if you try it and it isn't connected, fall back to code
and note the skip.

**Order:**
1. Dispatch **screen-planner-agent** first (Task tool). Give it the slug `$1`. It writes
   `projects/$1/insights/screen-plan.md` and returns the screen/flow list. This is the spec and the
   safe deliverable.
2. Dispatch **exactly one** builder, passing it the screen plan:
   - **code path (default):** **prototype-agent** → writes `projects/$1/prototype/` (one
     self-contained `index.html` per flow, Tailwind via CDN, plus an `index.html` hub).
   - **figma path (only if figma-console is connected):** **figma-build-agent** → builds starter
     frames in the open Figma file and returns the created node IDs.

**Scaffold output (write exactly these):**
1. `projects/$1/insights/screen-plan.md` (the screen planner writes this).
2. The build output — `projects/$1/prototype/` (code) or starter frames (figma).
3. `projects/$1/insights/run-manifest.json`:
   ```json
   {
     "mode": "scaffold",
     "path": "code | figma",
     "figmaConsoleConnected": false,
     "screens": ["screen names from the plan"],
     "createdFiles": ["code path: prototype files written"],
     "createdNodeIds": ["figma path: node IDs created"],
     "skipped": "anything skipped and why"
   }
   ```

After scaffolding, overwrite `projects/$1/memory/session.md` with a short summary and append durable
facts to `projects/$1/memory/project.md` (don't touch `user-preferences.md`). Tell me the screen
plan and prototype files you wrote, and suggest opening `projects/$1/prototype/index.html`. **Then
stop — do not run the review below.**

---

## Review mode

*(Only when a real Figma link is present.)* Plan and run a multi-agent design review of project `$1`,
then synthesize the results into the two output files.

## Review intent

First decide the review type — it routes what you check and how you weight findings: **pre-handoff**
(flow clarity, the five states, PRD coverage), **pre-launch** (analytics, error/recovery states,
edge cases, trust signals — surface launch blockers as P0), or **gap-audit** (PRD-to-design
coverage, missing states). Infer it from the context (sparse/early PRD → pre-handoff; complete PRD
with analytics → pre-launch; "what are we missing" → gap-audit) and state it at the top of the review.

## Context (read these first)

- projects/$1/context/prd.md
- projects/$1/context/research.md
- projects/$1/context/figma.md
- projects/$1/context/analytics.md
- projects/$1/context/content.md
- DESIGN.md (design reference; prefer projects/$1/context/DESIGN.md if present)
- projects/$1/memory/ — what carried over from prior reviews

## Memory

Read `projects/$1/memory/` before you start. Honor `user-preferences.md` (don't re-raise findings
the designer has consistently dismissed) and `project.md` (durable facts). After writing the review,
overwrite `session.md` with a short summary of this run and append durable new facts to `project.md`.
Do not edit `user-preferences.md` — the designer owns it.

## Agents (dispatch with the Task tool)

Each agent has one job, its own sources, and only the tools it needs. Dispatch each as a subagent
(`subagent_type`), give it the slug and the paths/data it needs, and collect its findings. Only the
Figma agent touches Figma; only you write files.

| subagent_type | Job |
|---|---|
| prd-agent | Every PRD requirement has a screen; user stories have states; acceptance criteria covered |
| figma-agent | Extract screen structure + screen-level nodeIds (ONLY agent that touches Figma) |
| ux-agent | Missing states, cognitive load, flow clarity, trust signals (uses DESIGN.md + research) |
| content-agent | Copy vs the content brief + DESIGN.md voice |
| analytics-agent | Measurability + instrumentation gaps (no Figma, no comments) |

**Order:** dispatch prd-agent, figma-agent, content-agent, analytics-agent in parallel; then
dispatch ux-agent after figma-agent returns, passing it the screen inventory (screen → nodeId). If
the Figma MCP isn't connected, figma-agent returns a text-only inventory from `figma.md` and notes
the skip — continue, don't stop.

## Synthesis

Merge every agent's findings. Deduplicate overlaps (cite both sources). Attach evidence. Rank by
impact, weighted by the intent. Then write the two output files.

## Output (write exactly these two files)

1. `projects/$1/insights/design-review.html` — a self-contained, branded HTML report; follow
   `.superdesigner/templates/design-review.template.html` (keep the `<style>`, fill in the content).

2. `projects/$1/insights/design-comments.preview.md` — follow the EXACT format in
   `.superdesigner/templates/design-comments.template.md`. Limit to 10 comments. Each must have:
   page, frame, nodeId, Type, Message, Why. Leave `Status:` blank (the designer fills it in). Use
   node IDs from nested screens, not parent frames.

Also write `projects/$1/insights/run-manifest.json` recording the intent used, each agent
(ran/skipped + why), total findings, comments selected, and the cap rationale — so the run is
auditable.

## Rules (from .cursor/rules/superdesigner.mdc)

1. Review intent, not pixels.
2. Write only to the `insights/` folder and `memory/session.md` + `memory/project.md`. Never modify
   context, templates, engine files, or `memory/user-preferences.md`.
3. Check every screen for the five states (happy, empty, loading, error, recovery) and the edge
   cases (offline, permissions, session, accessibility).
4. Check copy against `content.md` and DESIGN.md: plain-language CTAs for irreversible actions,
   microcopy + recovery for every error/empty state.
5. **Input completeness** — if a context file is missing or still the empty template, flag it
   rather than inventing requirements.
6. **Evidence or it doesn't ship** — map each finding to its source (a PRD step, research line,
   DESIGN.md rule, analytics number, or Figma node). A finding with no citation does not ship.
7. **Questions, not verdicts** — frame findings as questions, not commands.
8. Tone: direct, question-based, concise, actionable.

When done, tell me the two files you wrote and suggest: `superdesigner comment $1 --dry-run`.
