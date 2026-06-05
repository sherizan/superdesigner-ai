/**
 * Superdesigner review orchestrator — dynamic-workflow version (Opus 4.8 Dynamic Workflows).
 *
 * This is the *deterministic* alternative to the prompt-driven orchestrator in
 * `.superdesigner/scripts/review.mjs` (`generatePrompt`). Instead of asking one agent to "dispatch
 * these five subagents in parallel, respect the Figma→UX dependency, dedupe, rank, and cap to 10",
 * this script guarantees all of that in code:
 *
 *   - parallel() fans out prd / figma / content / analytics (real `.claude/agents/*` via agentType)
 *   - ux-agent runs after figma-agent and receives its screen inventory (the dependency is structural)
 *   - every agent returns SCHEMA-VALIDATED findings (the "evidence or it doesn't ship" guardrail is
 *     enforced by the schema's required `evidence` field, not by prose the model might ignore)
 *   - synthesis (dedup → intent-weighted rank → 10-comment cap) is plain JS, not model judgement
 *
 * It returns { reviewMd, commentsBody, manifest, screens, counts }. The caller writes the files
 * (workflow scripts have no filesystem access): design-review.md, design-comments.preview.md
 * (canonical format — parses through `superdesigner comment`), and run-manifest.json.
 *
 * HOW TO RUN (today, opt-in): from a Claude Code session in this repo, invoke the Workflow tool with
 * this script's path and `args: { slug, projectName, intent }`. The returned strings get written to
 * `projects/<slug>/insights/`. A/B it against the prompt-driven path (`superdesigner review <slug>`).
 *
 * CLI WIRING (next step, not yet done): a `--workflow` flag on `superdesigner review` would route the
 * headless run through this script instead of `generatePrompt`. That requires the headless `claude -p`
 * invocation to opt into the Workflow mechanism; see the A/B notes in the repo before wiring it.
 */

export const meta = {
  name: 'superdesigner-review-workflow',
  description: 'Deterministic dynamic-workflow version of the Superdesigner review orchestrator: parallel scoped review agents with schema-validated findings, Figma→UX dependency, then code-side synthesis (dedup, intent-weighted rank, 10-comment cap).',
  phases: [
    { title: 'Review', detail: 'prd/figma/content/analytics in parallel' },
    { title: 'UX', detail: 'ux-agent after figma (needs screen inventory)' },
  ],
}

const slug = (args && args.slug) || 'sample-voice-transfer'
const projectName = (args && args.projectName) || slug
const intent = (args && args.intent) || 'pre-launch'
const ctx = `projects/${slug}/context`

// --- schemas ---
const FINDING = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string', description: 'the finding framed as a question' },
    severity: { type: 'string', enum: ['P0', 'P1', 'P2'] },
    type: { type: 'string', enum: ['Missing State', 'Flow Mismatch', 'Clarifying Question', 'Edge Case', 'Validation'] },
    evidence: { type: 'string', description: 'citation: a PRD step, research line, DESIGN.md rule, analytics number, or screen' },
    screen: { type: 'string' },
    nodeId: { type: 'string' },
    suggestion: { type: 'string' },
  },
  required: ['title', 'severity', 'type', 'evidence'],
}
const FINDINGS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    dimension: { type: 'string' },
    findings: { type: 'array', items: FINDING },
  },
  required: ['dimension', 'findings'],
}
const FIGMA_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    figmaMcpConnected: { type: 'boolean' },
    screens: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: { name: { type: 'string' }, nodeId: { type: 'string' }, note: { type: 'string' } },
        required: ['name', 'nodeId'],
      },
    },
    findings: { type: 'array', items: FINDING },
  },
  required: ['figmaMcpConnected', 'screens'],
}

const base = `Project slug: ${slug}. Review intent: ${intent} (final pre-launch gate — weight trust signals, error/recovery states, edge cases, and analytics higher). Read the context under ${ctx}/ (prd.md, research.md, figma.md, content.md). Do your one job. Every finding MUST cite a source in 'evidence' or it does not ship; frame findings as questions.`

// --- Stage 1: parallel scoped agents ---
phase('Review')
const [figma, prd, content, analytics] = await parallel([
  () => agent(`${base}\nYou are the Figma agent: the live Figma MCP is not connected here, so build the screen inventory from figma.md text and set figmaMcpConnected=false. Return the screens (name + nodeId) and any structural findings.`,
    { agentType: 'figma-agent', schema: FIGMA_SCHEMA, model: 'haiku', label: 'figma', phase: 'Review' }),
  () => agent(`${base}\nYou are the PRD agent: flag every PRD requirement/user-story with no corresponding screen or state.`,
    { agentType: 'prd-agent', schema: FINDINGS_SCHEMA, model: 'sonnet', label: 'prd', phase: 'Review' }),
  () => agent(`${base}\nYou are the Content agent: check copy vs content.md + DESIGN.md voice — consequence language on irreversible actions, error/empty microcopy + recovery, consistent amount formatting.`,
    { agentType: 'content-agent', schema: FINDINGS_SCHEMA, model: 'sonnet', label: 'content', phase: 'Review' }),
  () => agent(`${base}\nYou are the Analytics agent: is the confirmation drop-off and the failure/recovery path measurable given the flow? Flag instrumentation gaps.`,
    { agentType: 'analytics-agent', schema: FINDINGS_SCHEMA, model: 'opus', label: 'analytics', phase: 'Review' }),
])

// --- Stage 2: UX after Figma (needs the screen inventory) ---
phase('UX')
const inv = (figma && figma.screens || []).map(s => `${s.name} → ${s.nodeId}`).join('; ')
const ux = await agent(`${base}\nYou are the UX agent. Screen inventory from the Figma agent: ${inv || '(none)'}. Check each screen for the five states (empty/loading/error/recovery + offline/permission-denied), cognitive load, flow clarity, and trust signals. Use the screen names/nodeIds above on your findings.`,
  { agentType: 'ux-agent', schema: FINDINGS_SCHEMA, model: 'opus', label: 'ux', phase: 'UX' })

// --- Deterministic synthesis (pure JS — no model) ---
const screens = (figma && figma.screens) || []
const nodeFor = (name) => {
  if (!name) return null
  const hit = screens.find(s => name.toLowerCase().includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(name.toLowerCase()))
  return hit ? hit.nodeId : null
}
const tag = (res, dim) => ((res && res.findings) || []).map(f => ({ ...f, dimension: dim }))
let all = [
  ...tag(prd, 'PRD'),
  ...tag(figma, 'Figma'),
  ...tag(ux, 'UX'),
  ...tag(content, 'Content'),
  ...tag(analytics, 'Analytics'),
].filter(f => f && f.title && f.evidence) // guardrail: drop any finding with no citation

// dedup by normalized title; merge dimensions + keep highest severity
const sevRank = { P0: 0, P1: 1, P2: 2 }
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const byKey = new Map()
for (const f of all) {
  const k = norm(f.title)
  const prev = byKey.get(k)
  if (!prev) { byKey.set(k, { ...f, dimensions: [f.dimension] }); continue }
  prev.dimensions.push(f.dimension)
  if (sevRank[f.severity] < sevRank[prev.severity]) prev.severity = f.severity
  if (!prev.screen && f.screen) prev.screen = f.screen
  if (!prev.nodeId && f.nodeId) prev.nodeId = f.nodeId
  if (f.evidence && !prev.evidence.includes(f.evidence)) prev.evidence += ` · ${f.evidence}`
}
let deduped = [...byKey.values()]

// intent-weighted rank (pre-launch boosts trust/error/analytics/edge)
const weight = (f) => {
  let w = sevRank[f.severity]
  if (intent === 'pre-launch') {
    if (f.dimension === 'Analytics' || f.dimensions.includes('Analytics')) w -= 0.6
    if (f.type === 'Missing State' || f.type === 'Edge Case') w -= 0.4
    if (/trust|error|recover|consent|amount|undone/i.test(f.evidence + ' ' + f.title)) w -= 0.4
  }
  return w
}
deduped.sort((a, b) => weight(a) - weight(b))

// fill nodeIds from inventory where possible
for (const f of deduped) if (!f.nodeId) f.nodeId = nodeFor(f.screen) || nodeFor(f.title)

// 10-comment cap — prefer pinned/actionable findings, keep rank order
const comments = deduped.slice(0, 10).map((f, i) => ({
  n: i + 1,
  page: f.screen || projectName,
  frame: null,
  nodeId: f.nodeId || null,
  type: f.type,
  message: f.suggestion ? `${f.title}\n\nSuggested: ${f.suggestion}` : f.title,
  why: `[${f.severity}] ${f.evidence}`,
}))

// --- build the two markdown artifacts (date stamped by the caller) ---
const bySev = (s) => deduped.filter(f => f.severity === s)
const line = (f) => `- **${f.title}** _(${f.dimensions.join('+')})_ — ${f.evidence}${f.screen ? ` _(screen: ${f.screen}${f.nodeId ? `, ${f.nodeId}` : ''})_` : ''}`
const reviewMd = `# Design Review: ${projectName}

**Reviewer:** Superdesigner (dynamic-workflow orchestrator)
**Intent:** ${intent}
**Mode:** review

---

## Executive Summary

${deduped.length} findings across PRD, Figma, UX, Content, and Analytics after dedup. ${bySev('P0').length} are P0 (launch-blocking). Live Figma inspection was ${figma && figma.figmaMcpConnected ? 'used' : 'skipped (MCP not connected) — screen inventory taken from figma.md'}.

## Recommendations Priority

### P0 (Blocking Launch)
${bySev('P0').map(line).join('\n') || '_None._'}

### P1 (High Impact)
${bySev('P1').map(line).join('\n') || '_None._'}

### P2 (Nice to Have)
${bySev('P2').map(line).join('\n') || '_None._'}

## Findings by dimension

${['PRD', 'Figma', 'UX', 'Content', 'Analytics'].map(d => {
  const fs = all.filter(f => f.dimension === d)
  return `### ${d} (${fs.length})\n${fs.map(f => `- ${f.title} — ${f.evidence}`).join('\n') || '_No findings._'}`
}).join('\n\n')}

---
*Generated by Superdesigner (dynamic workflow)*
`

const commentsBody = comments.map(c => `## Comment ${c.n}
Target:
  page: ${c.page}
  frame: ${c.frame || '(optional)'}
  nodeId: ${c.nodeId || '(none)'}

Type:
  ${c.type}

Status:

Message:
${c.message}

Why:
${c.why}

---`).join('\n\n')

const manifest = {
  mode: 'review',
  orchestrator: 'dynamic-workflow',
  intent,
  figmaMcpConnected: !!(figma && figma.figmaMcpConnected),
  agents: [
    { name: 'prd-agent', ran: !!prd, findings: prd ? prd.findings.length : 0 },
    { name: 'figma-agent', ran: !!figma, findings: figma && figma.findings ? figma.findings.length : 0, screens: screens.length },
    { name: 'ux-agent', ran: !!ux, findings: ux ? ux.findings.length : 0 },
    { name: 'content-agent', ran: !!content, findings: content ? content.findings.length : 0 },
    { name: 'analytics-agent', ran: !!analytics, findings: analytics ? analytics.findings.length : 0 },
  ],
  findingsRaw: all.length,
  findingsDeduped: deduped.length,
  commentsSelected: comments.length,
  commentCapRationale: 'top 10 by intent-weighted severity (pre-launch boosts trust/error/analytics/edge), pinned to screen nodeIds where available',
}

return { reviewMd, commentsBody, manifest, screens, counts: { raw: all.length, deduped: deduped.length, comments: comments.length } }
