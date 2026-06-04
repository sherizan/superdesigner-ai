# Superdesigner (Claude Code)

Superdesigner reviews intent, not pixels. It connects a PRD, research, a Figma file, and
analytics, then surfaces the gaps before review, handoff, or launch.

This project runs on **Claude Code**. Cursor stays the editor and filesystem; Claude Code is
the agent that does the review. The two pair: edit in Cursor, review with Claude Code.

## Review rules (single source of truth)

@.cursor/rules/superdesigner.mdc

The rules above govern every review: review intent not pixels, the five states per screen, the
edge cases, the file contract (read context, write only to `insights/`), the ten-comment cap, and
the rule that every finding cites its source or it does not ship. Follow them exactly.

## Figma MCP (required)

Reviews use the official **Figma Dev Mode MCP**, configured in `.mcp.json` (server name `figma`).
Tools: `mcp__figma__get_metadata` and `mcp__figma__get_design_context`. Start the Figma desktop
app with Dev Mode MCP enabled before running a review, or the screen-level node IDs will be missing.

## Run a review

- **Interactive:** open this repo in Claude Code and run `/review <project-slug>`.
- **Headless:** `superdesigner review <project-slug> --agent` (shells out to `claude -p`).

Outputs are written to `projects/<slug>/insights/`: `design-review.md` and
`design-comments.preview.md`. Then `superdesigner comment <slug>` posts the comments to Figma.
