# Superdesigner (Claude Code)

Superdesigner reasons about intent, not pixels. It connects a PRD, research, a Figma file, and
analytics, then surfaces the gaps before review, handoff, or launch. When there's a PRD but no
Figma file yet, it flips to **scaffold mode** — proposing screens from the PRD and building a
first-draft starting point (Figma frames or an HTML prototype) to solve the blank-canvas problem.

This project runs on **Claude Code**. Cursor stays the editor and filesystem; Claude Code is
the agent that does the review. The two pair: edit in Cursor, review with Claude Code.

## Review rules (single source of truth)

@.cursor/rules/superdesigner.mdc

The rules above govern every review: review intent not pixels, the five states per screen, the
edge cases, the file contract (read context, write only to `insights/`), the ten-comment cap, and
the rule that every finding cites its source or it does not ship. Follow them exactly.

## Figma MCP (optional, recommended)

Reviews use the official **Figma Dev Mode MCP**, configured in `.mcp.json` (server name `figma`).
Tools: `mcp__figma__get_metadata` and `mcp__figma__get_design_context`. Start the Figma desktop
app with Dev Mode MCP enabled before a review to pin comments to verified screen-level node IDs.
It is not required: if the MCP is not connected, the review still runs against `figma.md` and the
other context, takes comment node IDs from `figma.md`, and notes that live Figma inspection was
skipped.

## Run a review (or scaffold)

- **Interactive:** open this repo in Claude Code and run `/review <project-slug>`.
- **Headless:** `superdesigner review <project-slug> --agent` (shells out to `claude -p`).

The command picks the mode from `figma.md`:

- **Review** (a Figma link is present): outputs `projects/<slug>/insights/design-review.md` and
  `design-comments.preview.md`. Then `superdesigner comment <slug>` posts the comments to Figma.
- **Scaffold** (a PRD but no Figma link): outputs `insights/screen-plan.md` plus either starter
  frames in the open Figma file or an HTML prototype in `projects/<slug>/prototype/`. Force a path
  with `--scaffold figma|code` (omit to let the agent choose/ask).
