# superdesigner — Claude Code plugin

AI design review inside Claude Code. Reviews **intent, not pixels** — connecting
your PRD, research, Figma, analytics, and content to surface the gaps that slip
through to handoff or launch. When there's a PRD but no design yet, it scaffolds
a starting point.

## Install

Via the [designagent](https://designagent.dev) marketplace:

```
/plugin marketplace add sherizan/designagent
/plugin install superdesigner@designagent
```

## Use

```
/review <project-slug>
```

The command orchestrates a panel of agents (PRD, UX, Figma, content, analytics,
screen-planner, prototype, figma-build) and writes a self-contained HTML review
plus Figma-ready markdown comments. The full review rules live in the bundled
`design-review` skill.

## What's bundled

```
claude-plugin/
├── .claude-plugin/plugin.json
├── commands/review.md              the /review orchestrator
├── agents/*.md                     8 specialist review agents
└── skills/design-review/SKILL.md   the review rubric (intent, states, guardrails)
```

## Project layout

`/review` expects the Superdesigner project convention — `projects/<slug>/context/*`
(prd, research, figma, analytics, content) and a root `DESIGN.md`. Scaffold it with
the [`superdesigner` CLI](https://github.com/sherizan/superdesigner-ai)
(`superdesigner init`). The optional Figma Dev Mode MCP enriches reviews; without
it, the review runs against the `figma.md` text and says so.

## License

MIT.
