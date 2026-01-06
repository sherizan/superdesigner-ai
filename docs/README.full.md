# Superdesigner AI

**Design review, before design review happens.**

Superdesigner turns fragmented design artifacts (PRDs, research, Figma files) into **clear, actionable design feedback** — *before* things ship.

Designers don't miss things because they're bad.
They miss things because artifacts are fragmented.

Superdesigner connects them.

---

## The Problem

Every design project has:
- PRDs in docs
- Research in decks
- Designs in Figma
- Feedback scattered in comments

Before launch, gaps slip through.
After launch, you pay for them.

Superdesigner is a safety net.

---

## What Superdesigner Is

- 🧠 A Cursor-native workspace for designers
- 📋 A deterministic design review system
- 🔍 An AI that reviews *intent*, not pixels

**What it is NOT:**
- ❌ UI generator
- ❌ Figma replacement
- ❌ Style critique tool

---

## Requirements

- Node.js 18+
- **Cursor** — [Download Cursor](https://www.cursor.com/)
- **Figma MCP** — [Add to Cursor](https://www.figma.com/mcp-catalog/)

Superdesigner is designed to work best with Cursor, as it relies on Cursor's AI Agent and Figma MCP to run the review prompts.

---

## 60-Second Setup

Open a terminal, then run:

```bash
npx degit sherizan/superdesigner-ai my-superdesigner
cd my-superdesigner
npm install
cursor .
```

---

## Quick Start

### 1. Create a new project

```bash
npm run new -- "Your Project Name"
```

This creates `projects/your-project-name/` with template files:
- `prd.md` — Product requirements
- `research.md` — User research notes
- `figma.md` — Figma file links
- `analytics.md` — Analytics requirements

### 2. Fill in your project files

- `figma.md` — Paste your Figma artboard link (with `node-id`)
- `prd.md` — Paste your PRD content
- `research.md` — Paste research findings (optional)

> 💡 **Tip:** If your docs are in Google Docs/PDF, ask ChatGPT to convert them to markdown first.

### 3. Generate review prompts

```bash
npm run review -- your-project-name
```

This generates prompts in the `prompts/` folder.

### 4. Run the prompt in Cursor Agent

1. Open `prompts/_review_prompt.md` in Cursor
2. Run with Agent mode (`Cmd+I` / `Ctrl+I` → select Agent)
3. The agent will:
   - Fetch your Figma design via MCP
   - Cross-reference against your PRD and research
   - Create `design-review.md` and `design-comments.preview.md`

### 5. Post comments to Figma (optional)

```bash
# Preview comments without posting
npm run comment -- your-project-name --dry-run

# Post comments to Figma
npm run comment -- your-project-name
```

This posts your suggested comments directly to your Figma file. See [Figma Commenting Setup](#figma-commenting-setup) below.

---

## Folder Structure

```
superdesigner/
├── projects/           # Your design projects live here
│   └── example/        # Sample project to explore
│       ├── prd.md
│       ├── research.md
│       ├── figma.md
│       ├── analytics.md
│       ├── prompts/                  # Generated prompts
│       ├── design-review.md          # Generated
│       └── design-comments.preview.md  # Generated
├── templates/          # Templates for new projects
├── scripts/            # CLI commands
└── lib/                # Shared utilities
```

---

## Artifacts Explained

| File | Purpose | Tips |
|------|---------|------|
| `prd.md` | Product requirements document | Include "Happy path" and "Edge cases" sections for best results |
| `research.md` | User research, competitor analysis | Document pain points and quotes |
| `figma.md` | Links to Figma files and prototypes | Include `node-id` in URL to pin comments to specific frames |
| `analytics.md` | Events, funnels, success metrics | Define what you'll measure |
| `design-review.md` | **Generated** — Review output | Don't edit; regenerate with `npm run review` |
| `design-comments.preview.md` | **Generated** — Suggested Figma comments | Review before posting to Figma |

---

## How It Works

Superdesigner reads your PRD and extracts:

1. **Happy path steps** — From your "Happy path" section
2. **Edge cases** — From your "Edge cases" section
3. **Expected screens** — Inferred from headings or defaults

It then generates a review that includes:

- **Intended Flow** — The user journey from your PRD
- **Expected Screens** — Checklist of screens to design
- **States Checklist** — Happy, Empty, Loading, Error, Recovery
- **Gaps & Risks** — Edge cases that need design attention
- **Suggestions** — Actionable next steps
- **Figma Make Prompt** — Ready-to-use prompt for prototyping

---

## Philosophy

> **Review intent early. Fix gaps before they become bugs.**

This tool doesn't generate UI. It doesn't critique your visual design. Instead, it ensures you've thought through the **completeness** of your design:

- Have you designed all the states?
- Have you addressed the edge cases in your PRD?
- Is there a clear flow from start to finish?

Design regret happens when engineers discover missing states mid-sprint. Superdesigner catches these gaps early.

---

## Figma Commenting Setup

Posting comments to Figma is **optional**. You can always copy comments manually from `design-comments.preview.md`.

### 1. Create a Figma Personal Access Token

1. Go to [Figma Settings → Account → Personal access tokens](https://www.figma.com/developers/api#access-tokens)
2. Click "Create new token"
3. Give it a name (e.g., "Superdesigner")
4. Copy the token (you won't see it again)

### 2. Set up your .env file

Duplicate `.env.example` and rename it to `.env`:

```bash
cp .env.example .env
```

Open `.env` in your editor and paste your token after the `=` sign:

```
FIGMA_ACCESS_TOKEN=figd_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

The `.env` file is gitignored, so your token stays private.

### 3. Add Figma URL to your project (with node-id)

Make sure your `projects/<slug>/figma.md` contains a Figma file URL **with `node-id`** to pin comments to a specific frame:

```
https://www.figma.com/design/abc123xyz/My-Design-File?node-id=123-456
```

**How to get the URL with node-id:**

1. Open your Figma file
2. Select the frame/section you want comments pinned to
3. Press `Cmd+L` (Mac) or `Ctrl+L` (Windows) to copy link
4. Paste the URL into your `figma.md`

The URL should contain `?node-id=XXX-YYY` — this is what tells Superdesigner where to pin comments.

> **Without node-id:** Comments post to file level (visible in sidebar, not on canvas)  
> **With node-id:** Comments pin directly to the selected frame

### 4. Post comments

```bash
# Preview first
npm run comment -- my-project --dry-run

# Then post
npm run comment -- my-project
```

---

## Commands Reference

| Command | Description |
|---------|-------------|
| `npm run new -- "Name"` | Create a new project |
| `npm run review -- slug` | Generate review prompts for one project |
| `npm run review -- all` | Generate review prompts for all projects |
| `npm run comment -- slug` | Post comments to Figma |
| `npm run comment -- slug --dry-run` | Preview comments without posting |

---

## Roadmap

- Auto-convert docs to markdown (PDF, PPTX, DOCX)
- Analytics cross-checks
- Smarter gap detection
- Figma plugin
- Team workflows

---

## Contributing

This is a Cursor-native workflow tool. Contributions welcome:

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Submit a PR

---

## License

MIT

---

Built for designers.
