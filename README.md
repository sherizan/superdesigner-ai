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

- PRDs live in docs  
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
- **Figma Access Token** [Generate token](https://help.figma.com/hc/en-us/articles/8085703771159-Manage-personal-access-tokens)

---

## 7-step start
1. Open your terminal

```bash
npx degit sherizan/superdesigner-ai my-superdesigner && echo "Done"
cd my-superdesigner
npm install
cursor .
```

2. Set up your .env file

Duplicate `.env.example` and rename it to `.env`:

Open `.env` and paste your token after the `=` sign:

```
FIGMA_ACCESS_TOKEN=figd_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

The `.env` file is gitignored, so your token stays private.

3. Open Cursor's built-in terminal

```bash
npm run new -- "My Project"
```

It will create the necessary files.

4. Fill in your project files:
   - `figma.md` — Paste your Figma artboard link (with `node-id`)
   - `prd.md` — Paste your PRD content
   - `research.md` — Paste research findings (optional)

> 💡 **Tip:** If your docs are in Google Docs/PDF, ask ChatGPT to convert them to markdown first.

---

5. Generate review prompts
```bash
npm run review -- my-project
```

6. Run the prompt in Cursor Agent

Right click `prompts/_review_prompt.md` and "Add File to Cursor Chat" with **Cursor Agent** hit enter (Agent mode + your preferred model).

The agent will:
- Fetch your Figma design via MCP
- Cross-reference against your PRD and research
- Create `design-review.md` and `design-comments.preview.md`

7. Review the generated files, then post comments to Figma
```bash
npm run comment -- my-project
```

Done! Design is reviewed.

---

## Philosophy

> **Review intent early.  
> Fix gaps before they become bugs.**

Superdesigner exists to reduce design regret.

---

## Roadmap

- Auto-convert docs to markdown (PDF, PPTX, DOCX)
- Analytics cross-checks
- Smarter gap detection
- Figma plugin
- Team workflows

---

## License

MIT
