# DesignReview

**For design leaders who run the crits and the reviews.** DesignReview is the design review that
runs *before* the review: it connects your PRD, research, Figma, and analytics, then hands you the
missing states, broken flows, and unanswered questions — so you walk into every crit with the gaps
already mapped. It reviews **intent, not pixels**, and every finding cites its source.

This repo is the **[superdesigner.ai](https://superdesigner.ai) landing site** (in [`site/`](site/),
deploys on Cloudflare Pages) plus the **sample projects** in [`projects/`](projects/). The plugin
itself lives in the DesignAgent marketplace — see below.

## 🎥 Watch the demo

[![Watch the video](https://img.youtube.com/vi/gDiNZKH5a5A/0.jpg)](https://youtu.be/gDiNZKH5a5A)

## Install

DesignReview ships as a Claude Code plugin in the **DesignAgent marketplace**, alongside the
DesignAgent bridge it reads and annotates Figma through:

```
/plugin marketplace add sherizan/designagent
/plugin install designagent@designagent     # the Figma bridge (read + annotate)
/plugin install designreview@designagent     # this plugin
```

Then, in a project: `/new "Checkout Flow"` → fill in `context/` → `/review checkout-flow` →
`/annotate checkout-flow`. Open your Figma file with the DesignAgent Figma plugin (bridge enabled)
before a review.

## Where the plugin lives

The plugin source — `/new`, `/review`, `/annotate`, the review agents, the `design-review` skill,
and the templates — is published as **`designreview`** in the
[DesignAgent marketplace](https://github.com/sherizan/designagent-figma) (`designreview/`), next to
the `designagent` bridge. That's the single source of truth; this repo is the marketing site and the
sample material.

---

Created by [Sherizan Sheikh](https://github.com/sherizan)

MIT License
