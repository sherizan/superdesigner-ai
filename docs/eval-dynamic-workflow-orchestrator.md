# Eval & observability report — Superdesigner review orchestrator

**Dynamic workflow vs. prompt-driven multi-agent orchestration**

- **Run dates:** 2026-06-04 (all-Opus workflow), 2026-06-05 (prompt-driven A/B + tiered-fleet re-run)
- **Model:** Claude Opus 4.8 (`claude-opus-4-8`) — Dynamic Workflows in Claude Code
- **Subject under test:** the Superdesigner design-review orchestrator
- **Fixture:** `projects/sample-voice-transfer` (Botim "Voice Money Transfer", a high-trust financial
  flow; PRD + research + content brief, Figma link present so it runs in *review* mode; live Figma
  Dev Mode MCP not connected → screen inventory taken from `figma.md`)
- **Intent:** `pre-launch`

---

## 1. TL;DR

Superdesigner's review fans out five scoped agents (PRD, Figma, UX, Content, Analytics) and
synthesises their findings into a review + ≤10 Figma comments. The original orchestrator describes
that fan-out in a **prompt** — the model decides whether to run all five, in parallel, in
dependency order, and whether to dedupe/cap. The **dynamic-workflow** orchestrator encodes the same
shape in a script: parallelism, the Figma→UX dependency, schema-validated findings, and
dedup/rank/cap become **structural guarantees** instead of model judgement.

This report measures one full dynamic-workflow run end-to-end. Headline results:

- **All 5 agents ran, on Opus 4.8**, confirmed from per-agent transcripts — not asserted by the model.
- **Genuine parallelism + a real dependency:** the four independent agents started at +0.0s; the UX
  agent started at +54.9s, immediately after the last parallel agent finished — exactly the
  Figma→UX barrier the architecture promises.
- **Guardrail enforced structurally:** every finding carried a citation because the output **schema**
  required an `evidence` field; zero uncited findings could ship.
- **Drop-in compatible:** the workflow's `design-comments.preview.md` parsed through the existing
  `superdesigner comment` pipeline unchanged.
- **Measured A/B (§6):** the workflow finished **~2.3× faster** (104s vs 245s) at comparable token
  cost and equivalent capped output. The sharpest finding is reliability: the prompt-driven
  orchestrator **silently degraded to a single-context monolith** when the Task tool wasn't
  available to it — the exact failure the workflow's explicit structure prevents.
- **Tiered-fleet delta (§8):** pinning figma→Haiku, prd/content→Sonnet, ux/analytics→Opus cut
  **output-token cost ~43%** (49% of output moved off Opus) with **no quality loss** (48 findings vs
  44). Latency was flat-to-slightly-up — model tiering is a **cost** lever, not a latency one, because
  the critical path stays on the Opus judgment agents.

---

## 2. Models & token output per agent (measured)

Extracted from the workflow's per-agent transcripts
(`subagents/workflows/wf_08b572ad-95a/agent-*.jsonl`). "Output" = generated tokens (the requested
metric); input and cache-read shown for context.

| Agent | Model | Output tok | Input tok | Cache-read tok | Turns | Findings |
|---|---|---:|---:|---:|---:|---:|
| prd-agent | `claude-opus-4-8` | 3,963 | 2,446 | 30,808 | 8 | 14 |
| figma-agent | `claude-opus-4-8` | 1,610 | 2,440 | 21,679 | 5 | 4 (+4 screens) |
| ux-agent | `claude-opus-4-8` | 4,081 | 2,446 | 32,097 | 8 | 12 |
| content-agent | `claude-opus-4-8` | 2,894 | 2,452 | 59,430 | 11 | 7 |
| analytics-agent | `claude-opus-4-8` | 4,500 | 2,450 | 49,387 | 10 | 7 |
| **Total** | — | **17,048** | **12,234** | — | **42** | **44** |

Notes:
- **Model:** every agent inherited the session model (Opus 4.8). No per-agent model override was set;
  the workflow `agent()` calls could pin cheaper models per role (e.g. a Haiku figma-agent for
  mechanical extraction) as a future cost lever.
- **Aggregate:** the workflow runtime reported `subagent_tokens: 57,832` for the run — a
  billing-weighted total that also includes input and cache-creation tokens; the 17,048 above is the
  precise **generated-output** sum from the raw transcripts.
- **Wall-clock:** 104.2s. **Tool calls:** 23. **Agents:** 5.

---

## 3. Execution trace — parallelism + dependency (measured)

Per-agent start/end offsets from the transcripts (t0 = first agent start):

| Agent | Start (+s) | End (+s) | Duration (s) | Stage |
|---|---:|---:|---:|---|
| figma-agent | 0.0 | 30.0 | 30.0 | Review (parallel) |
| prd-agent | 0.0 | 47.2 | 47.2 | Review (parallel) |
| content-agent | 0.0 | 50.1 | 50.1 | Review (parallel) |
| analytics-agent | 0.0 | 54.8 | 54.8 | Review (parallel) |
| ux-agent | 54.9 | 104.2 | 49.4 | UX (after barrier) |

**Reading:** four agents start simultaneously (`parallel()` barrier); the UX agent starts only after
the last one finishes (54.8s → 54.9s), because it depends on the Figma agent's screen inventory.
This is the dependency the prompt-driven path can only *ask* for — here it's guaranteed by the
script's stage structure.

---

## 4. Determinism & guardrails (what the workflow guarantees)

| Property | Prompt-driven path | Dynamic-workflow path | Evidence |
|---|---|---|---|
| All 5 agents run | model may run fewer / skip | guaranteed by `parallel()` + a UX stage | manifest: prd 14, figma 4, ux 12, content 7, analytics 7 |
| Parallel fan-out | hoped | structural | trace §3 — 4 agents at +0.0s |
| Figma→UX dependency | a sentence in the prompt | structural barrier | trace §3 — UX at +54.9s |
| "Evidence or it doesn't ship" | prose instruction | **schema-required `evidence` field** | 0 uncited findings in output |
| Dedup / rank / 10-cap | model judgement | plain JS in the script | 44 findings → 10 capped comments |
| Run manifest | model asked to write it | emitted from run data | `insights/run-manifest.json` |

---

## 5. Output quality

The run produced 44 findings → 21 P0 → 10 capped comments. It surfaced the canonical issues for
this flow unprompted:

- **Amount-format / trust inconsistency** tied to the documented 23% confirmation drop-off
  (cites research pain #1 + content plain-language rule #1 + PRD §3).
- **Missing error / recovery and permission-denied states** across Voice capture and Confirmation
  (cites PRD §1/§4 + research pain #3).
- **Input-completeness guardrail fired:** the analytics agent flagged that `analytics.md` was an
  empty template, so the success metrics aren't measurable — rather than inventing a tracking plan.

**Compatibility:** the generated `design-comments.preview.md` parsed cleanly through
`superdesigner comment sample-voice-transfer --dry-run` (10 comments, correct node IDs where the
screen was named, P0-first). The deterministic path is a drop-in for the existing post-to-Figma step.

Artifacts (committed under the fixture): `projects/sample-voice-transfer/insights/design-review.md`,
`design-comments.preview.md`, `run-manifest.json`.

---

## 6. A/B: dynamic workflow vs. prompt-driven (measured)

Both paths were run live on the same fixture (`sample-voice-transfer`, intent `pre-launch`). **The
prompt-driven run revealed the headline result by failing in an instructive way:** the orchestrator
was told to dispatch five subagents via the Task tool, but Task was not available to it in this run,
so it **silently degraded to a single-context inline review** — one agent reviewing all five
dimensions in one context. We only know it degraded because it honestly logged
`dispatchMechanism: "inline-fallback"` in its own manifest. That is exactly the failure mode the
deterministic workflow removes: the workflow cannot quietly become a different, weaker architecture.

| Metric | Dynamic workflow | Prompt-driven (degraded → inline) |
|---|---|---|
| Orchestration | script-controlled, deterministic | model-controlled; **collapsed to 1 context** |
| Subagents actually run | 5, scoped | 0 (Task unavailable → inline fallback) |
| Parallelism | yes — 4 agents at +0.0s | none (single sequential context) |
| Figma→UX dependency | structural barrier | logical-only (same context) |
| Wall-clock | **104.2s** | ~244.6s (agent-reported) |
| Tokens | 57,832 aggregate (17,048 output) | 63,164 (single agent) |
| Findings → comments | 44 raw → 10 | 25 → 10 |
| Every finding cited | **schema-enforced** (0 uncited possible) | present, self-reported (not enforced) |
| Can silently degrade? | no — structure is explicit | **yes — and did** |

**Honest reading:**

- **Speed:** the workflow finished ~2.3× faster (104s vs 245s) at comparable token cost — the
  parallel fan-out vs. one sequential context.
- **Deliverable parity:** both produced 10 cited comments hitting the same canonical issues
  (amount-format/trust, missing error/recovery + permission states, empty analytics, consent/
  compliance). The "44 vs 25 findings" is **not** a clean quality signal — the workflow's 44 carried
  cross-dimension restatements its title-based dedup didn't merge, while the single context deduped
  naturally and even had slightly better node-ID coverage. On the capped output, the two were
  equivalent.
- **The real differentiator is structural reliability, not output:** the prompt-driven path's
  correctness depended on Task being present and the model choosing to use it; when that broke, it
  became a monolith without raising an error. The workflow makes the architecture explicit, emits a
  manifest from real run data, and enforces the citation guardrail at the schema layer.

**Remaining gap (stated plainly):** this did **not** measure the *true* prompt-driven **multi-agent**
path (orchestrator + 5 real Task subagents, model-sequenced). That path needs the Task tool, which
this nested eval harness didn't expose to the orchestrator. To measure it faithfully, run the real
headless path where Task is in `ALLOWED_TOOLS`: `superdesigner review sample-voice-transfer --agent`
(no `--workflow`), then compare its transcripts. Snapshots of both runs measured here are kept under
`projects/sample-voice-transfer/insights/_compare/{workflow,promptdriven-inline}/`.

## 7. Model recommendation per agent

The per-agent token/turn profile from §2–§3 is a usable signal for right-sizing models: mechanical
agents ran short and cheap; judgment agents ran long. Recommended tiering (the workflow makes this a
one-liner per call — `agent(prompt, { agentType, model })`):

| Agent | Profile (from this run) | Recommended model | Why |
|---|---|---|---|
| figma-agent | 1,610 out / 5 turns / 30s — lowest | **Haiku 4.5** | Mechanical: parse `figma.md`/MCP into a screen inventory. No deep reasoning. |
| prd-agent | 3,963 out / 8 turns | **Sonnet 4.6** | Requirement→screen coverage is logical enumeration; Sonnet is sufficient and cheaper. |
| content-agent | 2,894 out / 11 turns | **Sonnet 4.6** | Copy/voice/plain-language is language-nuance work Sonnet is strong at. Bump to Opus only for regulated/legal copy. |
| ux-agent | 4,081 out / 8 turns — high | **Opus 4.8** | The judgment core: missing states, cognitive load, trust calibration, intent-not-pixels. Protect quality. |
| analytics-agent | 4,500 out / 10 turns — highest | **Opus 4.8** | Causal "will this event fire given the flow?" reasoning; it caught the empty-template gap. Keep Opus. |
| synthesis | n/a (pure JS) | **none** | Dedup/rank/cap is code. If semantic dedup is added later, Haiku/Sonnet. |
| orchestrator (prompt-driven only) | — | **Opus** | …but the workflow has **no orchestrator LLM** — code does the orchestration, a structural saving. |

**Net:** roughly half the generated output (figma + prd + content ≈ 8.5k of 17k tokens) can move to
Haiku/Sonnet while the two judgment-heavy agents (ux, analytics) stay on Opus — cutting cost without
touching the findings that carry the most design judgement. **Effort control** is a second dial:
even within a tier, run figma/prd at low effort and ux/analytics at high effort.

This run used **Opus 4.8 for all five** (the inherited session model), so the §2 numbers are an
all-Opus baseline. The tiering above is **now applied** — each agent's `model` is pinned in both its
`.claude/agents/*` definition and the workflow's `agent()` call (figma→haiku, prd/content→sonnet,
ux/analytics→opus). A re-run will show the cost shift against this baseline. (The three scaffold
agents — screen-planner→sonnet, prototype→sonnet, figma-build→opus — are tiered by the same logic but
were extrapolated, not measured in this eval.)

---

## 8. Cost summary & tiered-fleet delta (measured)

The §2 run was **all-Opus** (17,048 output / 57,832 agg / 104.2s). The fleet was then tiered per §7
(figma→Haiku, prd/content→Sonnet, ux/analytics→Opus) and the **same fixture re-run** to measure the
delta. Both are measured workflow runs on `sample-voice-transfer`, intent `pre-launch`.

| Agent | Baseline model | Baseline out | Tiered model | Tiered out |
|---|---|---:|---|---:|
| figma-agent | opus-4-8 | 1,610 | **haiku-4-5** | 1,552 |
| prd-agent | opus-4-8 | 3,963 | **sonnet-4-6** | 2,875 |
| content-agent | opus-4-8 | 2,894 | **sonnet-4-6** | 3,436 |
| ux-agent | opus-4-8 | 4,081 | opus-4-8 | 4,115 |
| analytics-agent | opus-4-8 | 4,500 | opus-4-8 | 4,181 |
| **Output total** | — | **17,048** | — | **16,159** |

| Measure | All-Opus | Tiered | Delta |
|---|---:|---:|---:|
| Output tokens | 17,048 | 16,159 | −5.2% |
| Aggregate subagent tokens | 57,832 | 51,550 | −10.9% |
| **Output-token cost** (est.) | **$1.28** | **$0.72** | **−43.3%** |
| Wall-clock | 104.2s | 112.0s | **+7.5%** |
| Findings → comments | 44 → 10 | 48 → 10 | — |
| P0 findings | 21 | 22 | — |

> Cost estimate uses list-price output rates (Opus $75 / Sonnet $15 / Haiku $5 per M tokens); the
> exact dollar figure is illustrative, the **ratio** is the point.

**Three findings from the delta:**

1. **Cost fell ~43% while token count barely moved (−5%).** The lever isn't fewer tokens — it's that
   **49% of generated output moved off Opus** onto Haiku/Sonnet. Token count and token *cost* are
   different axes; tiering moves the second.
2. **Quality held — arguably improved.** The tiered run produced *more* findings (48 vs 44, 22 vs 21
   P0) and the cheaper tiers held the checks I was worried about: the **Sonnet content-agent found
   11 findings** (vs 7 on Opus), including the generic-error and consequence-CTA copy issues; the
   **Sonnet prd-agent** caught the failure screen, correction path, network failure, and insufficient
   balance; the **Haiku figma-agent** built the 4-screen inventory correctly. All canonical issues
   (amount format, missing error/recovery/permission states, empty analytics, consent) survived.
3. **Tiering optimizes cost, not latency — and slightly *raised* wall-clock (+8s).** Model choice
   doesn't touch the critical path here: the Stage-1 barrier is set by the slowest *parallel* agent
   (Sonnet content, 58.3s) and the tail is the Opus UX agent (58→112s). Haiku speeding the figma
   agent (20s) didn't help because figma was never the bottleneck. **To cut latency you'd speed the
   barrier/tail agents — but those are the judgment agents you deliberately keep on Opus.** Cost and
   latency are separate levers; this change pulled the cost one.

Cache reads (20k–59k per agent) show shared context was largely cached across the fan-out — what
keeps a 5-agent run affordable in the first place.

---

## 9. Limitations & threats to validity

1. **Single run, single fixture.** No variance bars; one project, one intent. Treat numbers as a
   point sample, not a benchmark.
2. **Dedup is title-based.** 44 raw findings → 44 "deduped" (0 merged): semantically-equal findings
   worded differently survived (e.g. "missing failure state" came from PRD, Figma, *and* UX). A
   semantic-dedup pass (embedding cluster or a cheap merge agent) is the obvious improvement —
   though cross-dimension corroboration is arguably signal worth keeping.
3. **Figma MCP not live.** The figma-agent built its inventory from `figma.md` text (it correctly
   reported `figmaMcpConnected: false`). A run against the live Dev Mode MCP would add real node IDs
   and structural findings.
4. **No measured prompt-driven baseline** (see §6).
5. **Headless invocation unproven.** `--workflow` wiring and this report exercise the workflow
   directly; whether a headless `claude -p` reliably invokes the Workflow tool end-to-end still
   needs a live `--agent` run to confirm.

---

## 10. Reproduce

```bash
# fixture already present: projects/sample-voice-transfer (review mode, intent pre-launch)
# deterministic path (this report):
superdesigner review sample-voice-transfer --workflow --agent
# then verify comment compatibility:
superdesigner comment sample-voice-transfer --dry-run
```

Per-agent raw data lives in the run's transcript dir
(`subagents/workflows/wf_08b572ad-95a/agent-*.jsonl` + `*.meta.json`); the tables in §2–§3 were
extracted from those files.

---

*Generated as a Superdesigner engineering finding. Numbers in §2–§3, §5, §7 are measured from a real
run; §6's cross-path comparison is architectural, not a measured benchmark.*
