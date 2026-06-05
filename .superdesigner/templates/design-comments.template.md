# Design Comments Preview
Project: {project_name}
Generated: {date}

---

## Comment 1
Target:
  page: {page_name}
  frame: {frame_name or "(optional)"}
  nodeId: {figma_node_id - auto-extracted from figma.md URL}

Type:
  {Missing State | Flow Mismatch | Clarifying Question | Edge Case | Validation}

Status:
  {leave blank, or set to accepted | overridden | dismissed before posting}

Message:
{Multi-line prose describing the issue, question, or gap.
Include context about what's expected vs. what's observed.}

Why:
{Traceability reference — PRD section, edge case, or reasoning}

---

## Comment 2
...

---

*Total: {n} comments*
*Run `superdesigner comment {project-slug}` to post to Figma.*

---

## Node ID Behavior

- `nodeId` is auto-extracted from the `node-id=` parameter in your Figma URL (figma.md)
- Comments with `nodeId` are pinned to that specific frame/section in Figma
- Comments without `nodeId` are posted at file level
- You can manually override `nodeId` for individual comments if needed

## Status (feedback loop)

Before posting, mark each comment so Superdesigner learns from your decisions:

- **accepted** — you agree; it posts to Figma.
- **overridden** — you'll handle it differently; it posts, and the override is recorded.
- **dismissed** — not useful; it is skipped (not posted).
- *(blank)* — treated as accepted.

`superdesigner comment` tallies these and records them so future reviews can stop re-raising what
you consistently dismiss.
