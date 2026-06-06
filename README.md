# Superdesigner

**For design leaders who run the crits and the reviews.** Superdesigner is the design review that
runs *before* the review: it connects your PRD, research, Figma, and analytics, then hands you the
missing states, broken flows, and unanswered questions — so you walk into every crit with the gaps
already mapped. It reviews **intent, not pixels**, and every finding cites its source. Runs on Claude
Code; Cursor stays your editor and filesystem. The two pair.

🔗 **[superdesigner.ai](https://superdesigner.ai)** — landing page lives in [`site/`](site/) (single self-contained HTML, deploys on Cloudflare Pages).

## 🎥 Watch the demo

[![Watch the video](https://img.youtube.com/vi/gDiNZKH5a5A/0.jpg)](https://youtu.be/gDiNZKH5a5A)

---

## Setup Guide

### Step 1: Check prerequisites

You'll need:
- **Node.js 18+** — [Download here](https://nodejs.org) if you don't have it
- **Claude Code** — the review agent ([install guide](https://code.claude.com/docs/en/overview))
- **Cursor** — [Download here](https://cursor.com) (free), your editor and filesystem
- **Figma desktop app** with Dev Mode MCP enabled — optional, recommended (for pinning comments to verified screens)

To check your Node version:
```bash
node --version
# Should show v18.x.x or higher
```

### Step 2: Get Superdesigner

Clone or download this repo:
```bash
git clone https://github.com/sherizan/superdesigner-ai.git
cd superdesigner-ai
```

### Step 3: Install

```bash
npm install && npm link
```

This installs dependencies and lets you run `superdesigner` from anywhere.

### Step 4: Set up Claude Code

Reviews run on Claude Code, so install it and sign in:

```bash
npm install -g @anthropic-ai/claude-code
claude   # run once to sign in
```

The Figma MCP is already wired up in `.mcp.json` (the official Figma Dev Mode MCP). Open the
Figma desktop app with Dev Mode MCP enabled before a review to pin comments to verified screens.
It's optional — without it, the review still runs against your `figma.md` and the other context,
and notes that live Figma inspection was skipped.

**Prefer Cursor?** Install the Cursor CLI (`curl https://cursor.com/install -fsS | bash`, then
`agent login`) and add `--cursor` to the review command. Or skip both and run the prompt manually.

### Step 5: Verify it works

```bash
superdesigner doctor
```

You should see all green checkmarks. If something's wrong, the doctor will tell you how to fix it.

---

## Getting Started

```bash
# 1. Create a project
superdesigner init "Checkout Flow"

# 2. Fill in your context (requirements, research, Figma link)
# Edit: projects/checkout-flow/context/

# 3. Run your design review
superdesigner review checkout-flow
```

`review` runs the review automatically with Claude Code. (No `claude` CLI installed? It falls back to
preparing the prompt and shows you how to run it.) Add `--no-agent` if you only want the prompt.

**No Figma file yet?** If `figma.md` has no link, `review` flips to **scaffold mode**: it proposes
screens from your PRD and builds a starting point — starter frames in your open Figma file, or a
single-file HTML prototype in `projects/<slug>/prototype/`. Force a path with `--scaffold figma|code`
(omit to let the agent choose or ask). This solves the blank-canvas problem.

**Inside Claude Code?** Open this repo and run `/review checkout-flow` instead.
**Prefer Cursor?** Add `--cursor`, or run with `--no-agent` and open the prompt in Cursor manually.

---

## How It Works

```
You write                    Superdesigner generates
─────────────────────────    ─────────────────────────
context/prd.md          →    insights/design-review.html    (review mode)
context/research.md     →    insights/design-comments.preview.md
context/figma.md        →    insights/screen-plan.md        (scaffold mode, no Figma yet)
context/content.md           prototype/*.html  or  Figma frames
```

**Context** = what you know (requirements, research, Figma links, copy)  
**Insights** = what Superdesigner finds (missing states, edge cases, questions) — or, with no Figma
yet, the screens it proposes from your PRD

---

## Commands

| Command | What it does |
|---------|--------------|
| `superdesigner init "Name"` | Create a new project |
| `superdesigner review <project>` | Run the design review (Claude Code) |
| `superdesigner review <project> --no-agent` | Just prepare the prompt, don't run it |
| `superdesigner review <project> --cursor` | Run with the Cursor agent instead |
| `superdesigner review <project> --scaffold code` | No Figma yet → build a starting point from the PRD |
| `superdesigner review <project> --workflow` | Run the review via the deterministic dynamic-workflow orchestrator |
| `/review <project>` | Run the review inside Claude Code (interactive) |
| `superdesigner comment <project>` | Post comments to Figma |
| `superdesigner doctor` | Check if everything is set up |

### Review options

- `--intent pre-handoff\|pre-launch\|gap-audit` — route what's checked and how findings are weighted (omit to infer).
- `--scaffold figma\|code` — in scaffold mode (no Figma), build starter frames on the canvas or an HTML prototype.
- `--workflow` — run the review through the multi-agent workflow: five scoped agents (PRD, Figma, UX,
  Content, Analytics) fan out in parallel with schema-validated findings, then deterministic
  synthesis (dedupe, rank, 10-comment cap). See
  [`docs/eval-dynamic-workflow-orchestrator.md`](docs/eval-dynamic-workflow-orchestrator.md) for the
  observability/eval writeup.

---

## What Goes in Context?

| File | What to put |
|------|-------------|
| `prd.md` | Your product requirements — goals, user stories, acceptance criteria |
| `research.md` | User research, interviews, insights (optional) |
| `figma.md` | Link to your Figma file (leave empty to scaffold screens from the PRD instead) |
| `analytics.md` | What you want to track (optional) |
| `content.md` | Copy & content brief — voice, key labels, microcopy (optional) |

There's also a workspace-level `DESIGN.md` (UX principles + voice guidelines) the review cites as its
reference for what "good" means; a per-project `context/DESIGN.md` overrides it.

---

## What You Get Back

**design-review.html** — A self-contained, branded review (open it in a browser; share it or pull it up in a crit) covering:
- Missing states (empty, loading, error)
- Edge cases you might have missed
- Questions about unclear requirements
- Suggestions for improvement

**design-comments.preview.md** — Ready-to-post Figma comments (preview before posting)

---

## Tips

- **Start small.** Even a rough PRD generates useful feedback.
- **Be specific.** The more context you give, the better the review.
- **Iterate.** Update your context, re-run review, see what changes.

---

## Troubleshooting

```bash
superdesigner doctor
```

This checks your setup and tells you what to fix.

---

## Usage analytics

Superdesigner collects anonymous usage statistics to understand adoption and improve the tool.

**What we collect:**
- Command name (`init`, `review`)
- CLI version
- Operating system (e.g., `darwin`, `linux`, `win32`)
- Node.js version

**What we DON'T collect:**
- No PRD content, file paths, or project names
- No Figma links or design data
- No personal or identifying information

**Opt-out:**
```bash
# Via environment variable
export SUPERDESIGNER_TELEMETRY=0

# Or per-command
superdesigner review my-project --no-telemetry
```

---

## Requirements

- Node.js 18 or later
- [Claude Code](https://code.claude.com/docs/en/overview) (the review agent that runs `review` and `/review`)
- [Figma Dev Mode MCP](https://help.figma.com/hc/en-us/articles/32132100833559) (desktop app, for screen-level comments)
- [Cursor](https://cursor.com) (your editor; add `--cursor` to run its agent instead)
- Figma account (optional, for posting comments)

---

Created by [Sherizan Sheikh](https://github.com/sherizan)

MIT License
