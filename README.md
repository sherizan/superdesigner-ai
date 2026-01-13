# Superdesigner

Superdesigner is a product reasoning workflow that runs inside Cursor, connecting PRDs, research, designs, and analytics to surface design gaps and blind spots before review, handoff, or launch.

## 🎥 Watch the demo

[![Watch the video](https://img.youtube.com/vi/gDiNZKH5a5A/0.jpg)](https://youtu.be/gDiNZKH5a5A)

---

## Setup Guide

### Step 1: Check prerequisites

You'll need:
- **Node.js 18+** — [Download here](https://nodejs.org) if you don't have it
- **Cursor** — [Download here](https://cursor.com) (free)

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

### Step 4: Install Cursor CLI (optional)

To use `--agent` mode (automated reviews), install and authenticate the Cursor CLI:

```bash
curl https://cursor.com/install -fsS | bash
agent login
```

Or from Cursor: `Cmd+Shift+P` → "Install 'agent' command", then run `agent login` in terminal.

Skip this if you prefer running prompts manually in Cursor.

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

# 3. Generate your design review
superdesigner review checkout-flow --agent
```

The `--agent` flag runs Cursor automatically to generate your review.

**Without Cursor CLI?** Run without `--agent`, then open the generated prompt in Cursor manually.

---

## How It Works

```
You write                    Superdesigner generates
─────────────────────────    ─────────────────────────
context/prd.md          →    insights/design-review.md
context/research.md     →    insights/design-comments.preview.md
context/figma.md
```

**Context** = what you know (requirements, research, Figma links)  
**Insights** = what Superdesigner finds (missing states, edge cases, questions)

---

## Commands

| Command | What it does |
|---------|--------------|
| `superdesigner init "Name"` | Create a new project |
| `superdesigner review <project>` | Generate design review |
| `superdesigner review <project> --agent` | Generate and run with Cursor Agent |
| `superdesigner comment <project>` | Post comments to Figma |
| `superdesigner doctor` | Check if everything is set up |

---

## What Goes in Context?

| File | What to put |
|------|-------------|
| `prd.md` | Your product requirements — goals, user stories, acceptance criteria |
| `research.md` | User research, interviews, insights (optional) |
| `figma.md` | Link to your Figma file |
| `analytics.md` | What you want to track (optional) |

---

## What You Get Back

**design-review.md** — A structured review covering:
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
- [Cursor](https://cursor.com) (for running the generated prompts)
- [Cursor CLI](https://cursor.com/docs/cli/headless) (optional, for `--agent` mode)
- Figma account (optional, for posting comments)

---

Created by [Sherizan Sheikh](https://github.com/sherizan)

MIT License
