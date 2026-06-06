# Superdesigner PRD

## Product Name
**Superdesigner**

## One-line Summary
Superdesigner is a product reasoning workflow that runs inside Cursor, connecting PRDs, research, designs, and analytics to surface design gaps and blind spots before review, handoff, or launch.

---

## 1. Problem Statement

Modern design work is fragmented.

- PRDs live in Confluence
- Research lives in Notion
- Designs live in Figma
- Analytics live in dashboards
- Feedback lives in comments and tickets

Designers are expected to mentally connect these sources during reviews. As complexity and speed increase, this leads to:

- Missing edge cases and states
- Misalignment between PRD intent and final designs
- Late-stage rework
- Reviews based on opinion instead of evidence

There is no single place where **design intent, execution, and evidence are reasoned about together**.

---

## 2. Product Vision

Superdesigner acts as a **design reasoning layer**, not a design tool.

It helps designers and design leaders:
- See what they missed
- Validate assumptions earlier
- Review designs with full context
- Catch risks before launch

**Superdesigner reasons about intent, structure, and completeness.**  
With a design, it reviews intent. With a PRD but no design yet, it scaffolds a first-draft starting
point from intent (proposed screens, and either Figma frames or an HTML prototype) — to solve the
blank-canvas problem. It is not a polished-UI generator; the scaffold is a draft to react to.

---

## 3. Target Users

### Primary
- Senior Product Designers
- Design Leads / Heads of Design
- Founding Designers

### Secondary
- Design Managers running reviews
- Designers who build with Cursor

---

## 4. Core Principles

1. **Source-of-truth first**  
   Superdesigner reads from real systems (PRD, Figma, analytics), not copies.

2. **Reasoning over pixels**  
   It reviews flows, states, intent, and assumptions — not visuals.

3. **No prompt engineering required**  
   Superdesigner generates structured prompts and passes them to Cursor AI agents.

4. **Artifacts over dashboards**  
   The output is a design-review.html report, not charts or scores.

---

## 5. What Superdesigner Is Not

- ❌ Not a polished-UI generator (scaffolding produces first-draft starting points, not final designs)
- ❌ Not a Figma replacement
- ❌ Not a design system manager
- ❌ Not a SaaS dashboard (for now)

---

## 6. High-Level Architecture

1. User adds project artifacts (PRD, research, Figma link/files)
2. Superdesigner connects to tools via MCP
3. A structured design-review prompt is generated
4. Cursor AI agent executes the review
5. Outputs are written as markdown artifacts and optional Figma comments

---

## 7. Sources of Truth (via MCP)

- **PRD**: Confluence / Notion
- **Research**: Notion / markdown
- **Designs**: Figma (via Figma MCP)
- **Analytics**: Amplitude (Phase 2)

Local markdown files are treated as **snapshots**, not the system of record.

---

## 8. MVP Scope (v0.1)

### Goal
Validate one habit:
> Designers run Superdesigner before a design review.

### Included
- CLI-based workflow inside Cursor
- Project-based folder structure
- Single command to run a review
- Output: `design-review.html` (self-contained, branded report)
- Optional posting of comments back to Figma
- Scaffold mode: when there's a PRD but no Figma file, propose screens and build a starting point
  (Figma frames or an HTML prototype)

### Excluded
- SaaS UI
- Mac app
- Polished/production UI generation (scaffold output is a first draft, not a finished design)
- Heavy dashboards

---

## 9. Core Commands

```bash
superdesigner init "Name"    # create a new project
superdesigner review <slug>  # review the design — or scaffold screens from the PRD if no Figma yet
superdesigner comment <slug> # post selected comments to Figma
superdesigner doctor         # check system requirements
