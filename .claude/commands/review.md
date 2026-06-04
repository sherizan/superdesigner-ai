---
description: Run a Superdesigner design review on a project (reviews intent, not pixels)
argument-hint: <project-slug>
allowed-tools: Read, Write, Edit, Glob, Grep, mcp__figma__get_metadata, mcp__figma__get_design_context
---

# Review: $1

Read the context files for project `$1` and generate design review insights. Follow the rules in
`.cursor/rules/superdesigner.mdc` exactly.

## Context (read these files)

- projects/$1/context/prd.md
- projects/$1/context/research.md
- projects/$1/context/figma.md
- projects/$1/context/analytics.md

## Figma analysis (required)

You MUST use the Figma Dev Mode MCP to analyze the design:

1. Read `projects/$1/context/figma.md` to get the Figma URLs and node IDs.
2. For each Figma URL, use `mcp__figma__get_metadata` to get the nested frame structure.
3. Use `mcp__figma__get_design_context` on key screens to understand the design.
4. Extract specific node IDs for nested screens, not just parent frames.
5. Use those node IDs when generating design comments, so each comment pins to the right screen.

If the Figma MCP is unavailable, stop and tell me to start the Figma desktop app with Dev Mode
MCP enabled, rather than guessing node IDs.

## Output (write exactly these two files)

1. `projects/$1/insights/design-review.md` — follow the format in
   `.superdesigner/templates/design-review.template.md`.

2. `projects/$1/insights/design-comments.preview.md` — follow the EXACT format in
   `.superdesigner/templates/design-comments.template.md`. Limit to 10 comments. Each must have:
   page, frame, nodeId, Type, Message, Why. Use node IDs from nested screens, not parent frames.

## Rules (from .cursor/rules/superdesigner.mdc)

1. Review intent, not pixels.
2. Write only to the `insights/` folder. Never modify context, templates, or engine files.
3. Check every screen for the five states (happy, empty, loading, error, recovery) and the edge
   cases (offline, permissions, session, accessibility).
4. Map each finding back to a PRD step or a research line. Every finding cites its source, or it
   does not ship.
5. Tone: direct, question-based, concise, actionable.

When done, tell me the two files you wrote and suggest: `superdesigner comment $1 --dry-run`.
