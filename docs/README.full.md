# Superdesigner AI

Superdesigner turns messy design artifacts (PRDs, research, Figma files)
into actionable insights and feedback — before design review happens.

Designers don’t miss things because they’re bad.
They miss things because artifacts are fragmented.

Superdesigner connects them.

## The problem

Every design project has:
- PRDs in PDFs
- Research in decks
- Designs in Figma
- Feedback scattered in comments

Before launch, gaps slip through.
After launch, you pay for them.

Superdesigner is a safety net.

## What Superdesigner is

- A Cursor-native workspace for designers
- A deterministic design review system
- An AI that reviews *intent*, not pixels

It does NOT:
- Generate UI
- Replace Figma
- Judge visual style

## Requirements

- Node.js 18+
- **Cursor (recommended)**
- Minimal dependencies: `pizzip` and `xml2js` for PPTX extraction

Superdesigner is designed to work best with Cursor,
as it relies on Cursor’s AI Agent to run the review and conversion prompts.

## 60-Second Setup
Open a terminal, then run:

```bash
# Clone the template
npx degit sherizan/superdesigner-ai my-superdesigner
cd my-superdesigner
npm install
cursor .
```

## Quick Start

### Create a new project

```bash
npm run new -- "Your Project Name"
```

This creates `projects/your-project-name/` with template files:
- `prd.md` — Product requirements
- `research.md` — User research notes
- `figma.md` — Figma file links
- `analytics.md` — Analytics requirements

### Generate a design review

```bash
# Review a single project
npm run review -- your-project-name

# Review all projects
npm run review -- all
```

This generates:
- `design-review.md` — Structured review with flow analysis, states checklist, and gaps
- `design-comments.preview.md` — Suggested comments to add to your Figma file

### Post comments to Figma (optional)

```bash
# Preview comments without posting
npm run comment -- your-project-name --dry-run

# Post comments to Figma
npm run comment -- your-project-name
```

This posts your suggested comments directly to your Figma file. See [Figma Commenting Setup](#figma-commenting-setup) below.

## Convert Raw Files (PDF/PPTX)

Have existing documents? Drop them into the `raw/` folder and convert them to structured PRD and research documents.

### 1. Add raw files

```bash
# Drop files into the raw folder
cp ~/Downloads/product-spec.pptx projects/your-project-name/raw/
cp ~/Downloads/research-report.pdf projects/your-project-name/raw/
```

Supported formats: `.pdf`, `.pptx`, `.txt`, `.md`

### 2. Run convert

```bash
npm run convert -- botim-quest
```

This creates two files:
- `_superdesigner_convert_context.md` — Extracted text from your raw files
- `_superdesigner_convert_prompt.md` — Instructions for Cursor Agent

### 3. Use Cursor Agent

1. Open `_superdesigner_convert_prompt.md` in Cursor
2. Run with Agent mode (`Cmd+I` / `Ctrl+I` → select Agent)
3. It will generate `prd.md` and `research.md` deterministically

### 4. Continue with review

```bash
npm run review -- botim-quest
```

### Limitations (v0)

- **PDF**: Text extraction is placeholder-only. Open the PDF, copy text, and paste into `_superdesigner_convert_context.md` where indicated.
- **PPTX**: Full text extraction supported.
- **No OCR**: Images in documents won't be processed.

## Folder Structure

```
superdesigner/
├── projects/           # Your design projects live here
│   └── example/        # Sample project to explore
│       ├── prd.md
│       ├── research.md
│       ├── figma.md
│       ├── analytics.md
│       ├── raw/                    # Drop source files here
│       ├── design-review.md        # Generated
│       └── design-comments.preview.md  # Generated
├── templates/          # Templates for new projects
├── scripts/            # CLI commands
└── lib/                # Shared utilities
```

## Artifacts Explained

| File | Purpose | Tips |
|------|---------|------|
| `prd.md` | Product requirements document | Include "Happy path" and "Edge cases" sections for best results |
| `research.md` | User research, competitor analysis | Document pain points and quotes |
| `figma.md` | Links to Figma files and prototypes | Include `node-id` in URL to pin comments to specific frames |
| `analytics.md` | Events, funnels, success metrics | Define what you'll measure |
| `design-review.md` | **Generated** — Review output | Don't edit; regenerate with `npm run review` |
| `design-comments.preview.md` | **Generated** — Suggested Figma comments | Copy these to your Figma file |

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

## Philosophy

> "Superdesigner reviews intent, not pixels."

This tool doesn't generate UI. It doesn't critique your visual design. Instead, it ensures you've thought through the **completeness** of your design:

- Have you designed all the states?
- Have you addressed the edge cases in your PRD?
- Is there a clear flow from start to finish?

Design regret happens when engineers discover missing states mid-sprint. Superdesigner catches these gaps early.

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
2. Select the frame/section you want comments pinned to (e.g., "Happy Flows")
3. Right-click → **Copy link to selection** (or press `Cmd+L` / `Ctrl+L`)
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

**Tip:** If your Figma URL includes `node-id`, comments will be pinned to that specific frame. Otherwise, they'll post at file level.

## Commands Reference

| Command | Description |
|---------|-------------|
| `npm run new -- "Name"` | Create a new project |
| `npm run convert -- slug` | Convert raw files to context + prompt |
| `npm run convert -- all` | Convert raw files for all projects |
| `npm run review -- slug` | Generate review for one project |
| `npm run review -- all` | Generate reviews for all projects |
| `npm run comment -- slug` | Post comments to Figma |
| `npm run comment -- slug --dry-run` | Preview comments without posting |

## Roadmap

### v0.1 (Current)
- [x] Project scaffolding
- [x] Deterministic review generation
- [x] States checklist
- [x] Figma Make prompt generation
- [x] Suggested comments preview
- [x] Figma REST API commenting (file-level)
- [x] Node-specific comments (attach to frames via `node-id`)
- [x] Raw file conversion (PPTX + TXT/MD)

### v0.2 (Planned)
- [ ] PDF text extraction
- [ ] Analytics validation checks
- [ ] Custom review templates
- [ ] Multi-node targeting (different nodeIds per comment)

### v0.3 (Future)
- [ ] AI-powered gap detection
- [ ] Figma plugin for bidirectional sync
- [ ] Team collaboration features

## Contributing

This is a Cursor-native workflow tool. Contributions welcome:

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Submit a PR

## License

MIT

---

Built for designers.
