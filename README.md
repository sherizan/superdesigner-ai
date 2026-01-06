# Superdesigner AI

**Design review, before design review happens.**

Superdesigner turns fragmented design artifacts  
(PRDs, research, Figma files) into **clear, actionable design feedback** — *before* things ship.

No UI generation.  
No visual critique.  
Just fewer missed states and late surprises.

---

## Why this exists

Every design project looks “done” until review.

- PRDs live in PDFs  
- Research lives in decks  
- Designs live in Figma  

That’s where gaps hide.

**Superdesigner connects intent across artifacts and surfaces what’s missing.**

---

## What it is

- 🧠 Cursor-native AI workflow for designers  
- 📋 Deterministic design review (flows, states, edge cases)  
- 🔍 Reviews **intent**, not pixels  

**What it is NOT**
- ❌ UI generator  
- ❌ Figma replacement  
- ❌ Style critique tool  

---

## Requirements

- Node.js 18+
- **Cursor** — [Download Cursor](https://www.cursor.com/)
- **Figma MCP** — [Add to Cursor](https://www.figma.com/mcp-catalog/)

---

## 60-second start
1. Open your terminal

```bash
npx degit sherizan/superdesigner-ai my-superdesigner && echo "Done"
cd my-superdesigner
npm install
cursor .
```

2. Open Cursor's built-in terminal

```bash
npm run new -- "My Project"
```

It will create the necessary files.

3. Add your Figma design to figma.md.

4. Add your documents (Optional)

Drop raw files into `/raw`:
- PRDs (DOCS / PDF)
- Research decks (PPTX / PDF)
- Notes (MD / TXT)

Run:
```bash
npm run convert -- my-project
```

Superdesigner converts them to Markdown files OR simply paste your PRD and Research findings in .md

---

5. Generate review prompts
```bash
npm run review -- my-project
```

This creates prompts in `prompts/` folder.

6. Run the prompt in Cursor Agent

Open `prompts/_review_prompt.md` and run it with **Cursor Agent** (Cmd+I → Agent mode).

The agent will:
- Fetch your Figma design via MCP (if URL provided)
- Cross-reference against your PRD
- Create `design-review.md` and `design-comments.preview.md`

7. Post comments to Figma

```bash
npm run comment -- my-project
```

Done!

---

## Philosophy

> **Review intent early.  
> Fix gaps before they become bugs.**

Superdesigner exists to reduce design regret.

---

## Roadmap

- Analytics cross-checks
- Smarter gap detection
- Figma plugin
- Team workflows

---

## License

MIT
