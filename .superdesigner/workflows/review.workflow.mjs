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
 * It returns { reviewHtml, commentsBody, manifest, screens, counts }. The caller writes the files
 * (workflow scripts have no filesystem access): design-review.html (a self-contained branded
 * report), design-comments.preview.md (markdown — parses through `superdesigner comment`), and
 * run-manifest.json.
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

// --- build the branded, self-contained HTML report (the caller writes it verbatim) ---
const bySev = (s) => deduped.filter(f => f.severity === s)
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const fRow = (f) => `      <div class="finding"><span class="sev ${f.severity.toLowerCase()}">${f.severity}</span><div>` +
  `<p class="q">${esc(f.title)}</p>` +
  `<p class="src">↳ ${esc(f.evidence)}${f.screen ? ` · <b>${esc(f.screen)}${f.nodeId ? ` (${esc(f.nodeId)})` : ''}</b>` : ''}</p></div></div>`
const sevBlock = (s, label) => { const fs = bySev(s); return `      <h3>${label}</h3>\n${fs.length ? fs.map(fRow).join('\n') : '      <p class="src">None.</p>'}` }
const dimBlock = (d) => { const fs = all.filter(f => f.dimension === d); if (!fs.length) return ''; return `  <section><span class="k">${d}</span><h2>${d}</h2>\n${fs.map(fRow).join('\n')}\n  </section>` }
const figmaNote = figma && figma.figmaMcpConnected ? 'Live Figma inspection was used.' : 'Live Figma inspection was skipped (MCP not connected) — screen inventory taken from figma.md.'

// --- Figma Make prompts: top P0/P1 findings → actionable redesign prompts (the in-browser script turns each into a deep link) ---
const makeFigmaPrompt = (f) => {
  const where = f.screen ? ` on the "${f.screen}" screen` : ''
  const fix = f.suggestion ? ` Design the fix: ${f.suggestion}` : ' Design the fix.'
  return `For ${projectName} (${intent} review): ${f.title}${where}.${fix} Grounded in: ${f.evidence}.`
}
const makePrompts = deduped.filter(f => f.severity === 'P0' || f.severity === 'P1').slice(0, 5)
const promptCards = makePrompts.map(f =>
  `    <div class="prompt-card"><div class="label">${esc(f.severity)} · ${esc(f.screen || f.dimension)}</div><p>${esc(makeFigmaPrompt(f))}</p></div>`
).join('\n')
const makeSection = promptCards
  ? `  <section>\n    <span class="k">Figma Make prompts</span>\n    <h2>To take back into the canvas</h2>\n${promptCards}\n  </section>`
  : ''

const reviewHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Design Review — ${esc(projectName)}</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%2317130F'/%3E%3Crect x='6' y='19' width='20' height='6' rx='2' fill='%23E4FB52'/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..800;1,9..144,400..600&family=IBM+Plex+Mono&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root{--paper:#F4EFE3;--ink:#17130F;--ink-2:#5b5246;--ink-3:#8a7f6f;--acid:#E4FB52;--redline:#E0503A;--p2:#1e8e3e;--line:#dcd2bd;--card:#FBF8F0;--serif:'Fraunces',Georgia,serif;--sans:'IBM Plex Sans',system-ui,sans-serif;--mono:'IBM Plex Mono',monospace}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--paper);color:var(--ink);font-family:var(--sans);font-size:16px;line-height:1.6;-webkit-font-smoothing:antialiased}
.wrap{max-width:860px;margin:0 auto;padding:0 28px}
.mono{font-family:var(--mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase}
header.mast{padding:56px 0 28px;border-bottom:2px solid var(--ink)}
.brand{font-family:var(--serif);font-weight:600;font-size:18px}
header.mast h1{font-family:var(--serif);font-weight:560;font-size:clamp(30px,5vw,50px);line-height:1.05;letter-spacing:-.02em;margin:20px 0 14px}
.meta{display:flex;flex-wrap:wrap;gap:8px 10px}
.tag{font-family:var(--mono);font-size:11px;color:var(--ink-2);border:1px solid var(--line);background:var(--card);padding:5px 11px;border-radius:999px}
.tag b{color:var(--ink)}
section{padding:32px 0;border-bottom:1px solid var(--line)}
section:last-of-type{border-bottom:0}
.k{font-family:var(--mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3)}
h2{font-family:var(--serif);font-weight:560;font-size:clamp(22px,3vw,30px);letter-spacing:-.015em;margin:8px 0 16px}
h3{font-family:var(--serif);font-weight:560;font-size:18px;margin:20px 0 8px}
p.lead{font-size:18px;color:#2b2620}
.finding{display:flex;gap:14px;padding:14px 0;border-bottom:1px dashed var(--line)}
.finding:last-child{border-bottom:0}
.sev{flex:none;height:fit-content;font-family:var(--mono);font-size:11px;padding:4px 8px;border-radius:6px}
.sev.p0{background:var(--redline);color:#fff}.sev.p1{background:var(--acid);color:var(--ink)}.sev.p2{background:var(--p2);color:#fff}
.q{font-family:var(--serif);font-size:18px;line-height:1.3;margin-bottom:6px}
.src{font-family:var(--mono);font-size:11px;color:var(--ink-2);line-height:1.5}.src b{color:var(--ink)}
.prompt-card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px 18px;margin:10px 0}
.prompt-card .label{font-family:var(--mono);font-size:10px;color:var(--ink-3);letter-spacing:.1em}
.prompt-card p{font-size:14.5px;margin-top:6px}
.fm-actions{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}
.fm-open,.fm-copy{font-family:var(--mono);font-size:11px;letter-spacing:.04em;padding:7px 12px;border-radius:8px;cursor:pointer;text-decoration:none;line-height:1;display:inline-flex;align-items:center;border:1px solid var(--line)}
.fm-open{background:var(--acid);color:var(--ink);border-color:var(--ink)}
.fm-open:hover{filter:brightness(.97)}
.fm-copy{background:transparent;color:var(--ink)}
.fm-copy:hover{border-color:var(--ink)}
footer{padding:28px 0 60px;color:var(--ink-3)}
</style>
</head>
<body>
<div class="wrap">
  <header class="mast">
    <span class="brand">✲ Superdesigner</span>
    <h1>Design Review — ${esc(projectName)}</h1>
    <div class="meta"><span class="tag">intent · <b>${esc(intent)}</b></span><span class="tag">mode · <b>review</b></span><span class="tag">orchestrator · <b>dynamic workflow</b></span><span class="tag">reviews intent, not pixels</span></div>
  </header>

  <section>
    <span class="k">Executive summary</span>
    <h2>The short version</h2>
    <p class="lead">${deduped.length} findings across PRD, Figma, UX, Content, and Analytics after dedup — ${bySev('P0').length} are P0 (launch-blocking). ${figmaNote}</p>
  </section>

  <section>
    <span class="k">Recommendations · by priority</span>
    <h2>What to fix, in order</h2>
${sevBlock('P0', 'P0 — blocking')}
${sevBlock('P1', 'P1 — high impact')}
${sevBlock('P2', 'P2 — nice to have')}
  </section>

${['PRD', 'Figma', 'UX', 'Content', 'Analytics'].map(dimBlock).filter(Boolean).join('\n')}
${makeSection}

  <footer><span class="mono">Generated by Superdesigner · made with Claude Code dynamic workflows</span></footer>
</div>
<!-- Figma Make deep-link — keep BYTE-IDENTICAL with the snippet in .superdesigner/templates/design-review.template.html (no backslashes, so it is safe inside this JS template literal). -->
<script>
(function(){
  var LZString=(function(){var f=String.fromCharCode;var keyStrUriSafe="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$";var baseReverseDic={};function getBaseValue(alphabet,character){if(!baseReverseDic[alphabet]){baseReverseDic[alphabet]={};for(var i=0;i<alphabet.length;i++)baseReverseDic[alphabet][alphabet.charAt(i)]=i;}return baseReverseDic[alphabet][character];}
  function _compress(uncompressed,bitsPerChar,getCharFromInt){if(uncompressed==null)return"";var i,value,context_dictionary={},context_dictionaryToCreate={},context_c="",context_wc="",context_w="",context_enlargeIn=2,context_dictSize=3,context_numBits=2,context_data=[],context_data_val=0,context_data_position=0,ii;for(ii=0;ii<uncompressed.length;ii+=1){context_c=uncompressed.charAt(ii);if(!Object.prototype.hasOwnProperty.call(context_dictionary,context_c)){context_dictionary[context_c]=context_dictSize++;context_dictionaryToCreate[context_c]=true;}context_wc=context_w+context_c;if(Object.prototype.hasOwnProperty.call(context_dictionary,context_wc)){context_w=context_wc;}else{if(Object.prototype.hasOwnProperty.call(context_dictionaryToCreate,context_w)){if(context_w.charCodeAt(0)<256){for(i=0;i<context_numBits;i++){context_data_val=(context_data_val<<1);if(context_data_position==bitsPerChar-1){context_data_position=0;context_data.push(getCharFromInt(context_data_val));context_data_val=0;}else{context_data_position++;}}value=context_w.charCodeAt(0);for(i=0;i<8;i++){context_data_val=(context_data_val<<1)|(value&1);if(context_data_position==bitsPerChar-1){context_data_position=0;context_data.push(getCharFromInt(context_data_val));context_data_val=0;}else{context_data_position++;}value=value>>1;}}else{value=1;for(i=0;i<context_numBits;i++){context_data_val=(context_data_val<<1)|value;if(context_data_position==bitsPerChar-1){context_data_position=0;context_data.push(getCharFromInt(context_data_val));context_data_val=0;}else{context_data_position++;}value=0;}value=context_w.charCodeAt(0);for(i=0;i<16;i++){context_data_val=(context_data_val<<1)|(value&1);if(context_data_position==bitsPerChar-1){context_data_position=0;context_data.push(getCharFromInt(context_data_val));context_data_val=0;}else{context_data_position++;}value=value>>1;}}context_enlargeIn--;if(context_enlargeIn==0){context_enlargeIn=Math.pow(2,context_numBits);context_numBits++;}delete context_dictionaryToCreate[context_w];}else{value=context_dictionary[context_w];for(i=0;i<context_numBits;i++){context_data_val=(context_data_val<<1)|(value&1);if(context_data_position==bitsPerChar-1){context_data_position=0;context_data.push(getCharFromInt(context_data_val));context_data_val=0;}else{context_data_position++;}value=value>>1;}}context_enlargeIn--;if(context_enlargeIn==0){context_enlargeIn=Math.pow(2,context_numBits);context_numBits++;}context_dictionary[context_wc]=context_dictSize++;context_w=String(context_c);}}if(context_w!==""){if(Object.prototype.hasOwnProperty.call(context_dictionaryToCreate,context_w)){if(context_w.charCodeAt(0)<256){for(i=0;i<context_numBits;i++){context_data_val=(context_data_val<<1);if(context_data_position==bitsPerChar-1){context_data_position=0;context_data.push(getCharFromInt(context_data_val));context_data_val=0;}else{context_data_position++;}}value=context_w.charCodeAt(0);for(i=0;i<8;i++){context_data_val=(context_data_val<<1)|(value&1);if(context_data_position==bitsPerChar-1){context_data_position=0;context_data.push(getCharFromInt(context_data_val));context_data_val=0;}else{context_data_position++;}value=value>>1;}}else{value=1;for(i=0;i<context_numBits;i++){context_data_val=(context_data_val<<1)|value;if(context_data_position==bitsPerChar-1){context_data_position=0;context_data.push(getCharFromInt(context_data_val));context_data_val=0;}else{context_data_position++;}value=0;}value=context_w.charCodeAt(0);for(i=0;i<16;i++){context_data_val=(context_data_val<<1)|(value&1);if(context_data_position==bitsPerChar-1){context_data_position=0;context_data.push(getCharFromInt(context_data_val));context_data_val=0;}else{context_data_position++;}value=value>>1;}}context_enlargeIn--;if(context_enlargeIn==0){context_enlargeIn=Math.pow(2,context_numBits);context_numBits++;}delete context_dictionaryToCreate[context_w];}else{value=context_dictionary[context_w];for(i=0;i<context_numBits;i++){context_data_val=(context_data_val<<1)|(value&1);if(context_data_position==bitsPerChar-1){context_data_position=0;context_data.push(getCharFromInt(context_data_val));context_data_val=0;}else{context_data_position++;}value=value>>1;}}context_enlargeIn--;if(context_enlargeIn==0){context_enlargeIn=Math.pow(2,context_numBits);context_numBits++;}}value=2;for(i=0;i<context_numBits;i++){context_data_val=(context_data_val<<1)|(value&1);if(context_data_position==bitsPerChar-1){context_data_position=0;context_data.push(getCharFromInt(context_data_val));context_data_val=0;}else{context_data_position++;}value=value>>1;}while(true){context_data_val=(context_data_val<<1);if(context_data_position==bitsPerChar-1){context_data.push(getCharFromInt(context_data_val));break;}else context_data_position++;}return context_data.join('');}
  function _decompress(length,resetValue,getNextValue){var dictionary=[],enlargeIn=4,dictSize=4,numBits=3,entry="",result=[],i,w,bits,resb,maxpower,power,c,data={val:getNextValue(0),position:resetValue,index:1};for(i=0;i<3;i+=1)dictionary[i]=i;bits=0;maxpower=Math.pow(2,2);power=1;while(power!=maxpower){resb=data.val&data.position;data.position>>=1;if(data.position==0){data.position=resetValue;data.val=getNextValue(data.index++);}bits|=(resb>0?1:0)*power;power<<=1;}switch(bits){case 0:bits=0;maxpower=Math.pow(2,8);power=1;while(power!=maxpower){resb=data.val&data.position;data.position>>=1;if(data.position==0){data.position=resetValue;data.val=getNextValue(data.index++);}bits|=(resb>0?1:0)*power;power<<=1;}c=f(bits);break;case 1:bits=0;maxpower=Math.pow(2,16);power=1;while(power!=maxpower){resb=data.val&data.position;data.position>>=1;if(data.position==0){data.position=resetValue;data.val=getNextValue(data.index++);}bits|=(resb>0?1:0)*power;power<<=1;}c=f(bits);break;case 2:return"";}dictionary[3]=c;w=c;result.push(c);while(true){if(data.index>length)return"";bits=0;maxpower=Math.pow(2,numBits);power=1;while(power!=maxpower){resb=data.val&data.position;data.position>>=1;if(data.position==0){data.position=resetValue;data.val=getNextValue(data.index++);}bits|=(resb>0?1:0)*power;power<<=1;}switch(c=bits){case 0:bits=0;maxpower=Math.pow(2,8);power=1;while(power!=maxpower){resb=data.val&data.position;data.position>>=1;if(data.position==0){data.position=resetValue;data.val=getNextValue(data.index++);}bits|=(resb>0?1:0)*power;power<<=1;}dictionary[dictSize++]=f(bits);c=dictSize-1;enlargeIn--;break;case 1:bits=0;maxpower=Math.pow(2,16);power=1;while(power!=maxpower){resb=data.val&data.position;data.position>>=1;if(data.position==0){data.position=resetValue;data.val=getNextValue(data.index++);}bits|=(resb>0?1:0)*power;power<<=1;}dictionary[dictSize++]=f(bits);c=dictSize-1;enlargeIn--;break;case 2:return result.join('');}if(enlargeIn==0){enlargeIn=Math.pow(2,numBits);numBits++;}if(dictionary[c]){entry=dictionary[c];}else{if(c===dictSize){entry=w+w.charAt(0);}else{return null;}}result.push(entry);dictionary[dictSize++]=w+entry.charAt(0);enlargeIn--;w=entry;if(enlargeIn==0){enlargeIn=Math.pow(2,numBits);numBits++;}}}
  return {compressToEncodedURIComponent:function(input){if(input==null)return"";return _compress(input,6,function(a){return keyStrUriSafe.charAt(a);});},decompressFromEncodedURIComponent:function(input){if(input==null)return"";if(input=="")return null;input=input.replace(/ /g,"+");return _decompress(input.length,32,function(index){return getBaseValue(keyStrUriSafe,input.charAt(index));});}};
  })();
  window.LZString=LZString;
  function fmUrl(prompt){return "https://www.figma.com/make/new#prompt="+LZString.compressToEncodedURIComponent(prompt);}
  document.addEventListener('DOMContentLoaded',function(){
    var cards=document.querySelectorAll('.prompt-card');
    for(var n=0;n<cards.length;n++){(function(card){
      var p=card.querySelector('p');if(!p)return;
      var prompt=p.textContent.trim();
      if(!prompt||prompt.indexOf('{')!==-1)return; // skip unfilled template tokens
      if(card.querySelector('.fm-actions'))return;
      var row=document.createElement('div');row.className='fm-actions';
      var a=document.createElement('a');a.className='fm-open';a.target='_blank';a.rel='noopener';a.href=fmUrl(prompt);a.textContent='Open in Figma Make ↗';
      var b=document.createElement('button');b.className='fm-copy';b.type='button';b.textContent='Copy prompt';
      b.addEventListener('click',function(){
        function done(){b.textContent='Copied ✓';setTimeout(function(){b.textContent='Copy prompt';},1500);}
        function fallback(){var ta=document.createElement('textarea');ta.value=prompt;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.focus();ta.select();try{document.execCommand('copy');}catch(e){}document.body.removeChild(ta);done();}
        if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(prompt).then(done,fallback);}else{fallback();}
      });
      row.appendChild(a);row.appendChild(b);card.appendChild(row);
    })(cards[n]);}
  });
})();
</script>
</body>
</html>`

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

return { reviewHtml, commentsBody, manifest, screens, counts: { raw: all.length, deduped: deduped.length, comments: comments.length } }
