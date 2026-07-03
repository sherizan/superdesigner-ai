# superdesigner-ai

This repo hosts the **[superdesigner.ai](https://superdesigner.ai) landing site** (`site/` — a single
self-contained HTML page, deploys on Cloudflare Pages) and the **sample DesignReview projects**
(`projects/`). `DESIGN.md` is the review rubric the samples cite.

## The plugin lives elsewhere

DesignReview's plugin — `/new`, `/review`, `/annotate`, the review agents, the `design-review` skill,
and the templates — now lives in the **`sherizan/designagent-figma`** repo under `designreview/`, and
is published as **`designreview`** in the DesignAgent marketplace. It reads and annotates Figma
through the DesignAgent bridge, so the two ship together.

To run reviews on the sample projects here, install both from that marketplace and open the file with
the DesignAgent Figma plugin (bridge enabled):

```
/plugin marketplace add sherizan/designagent
/plugin install designagent@designagent
/plugin install designreview@designagent
```

Then `/review <slug>` against a project in `projects/`.

## Scope of this repo

- `site/` — the landing page + a live sample report. Edit here for superdesigner.ai.
- `projects/` — sample projects (context, insights, prototypes) used to demo and dogfood the plugin.
- `DESIGN.md` — the review rubric ("what good means").

Do not add plugin/agent code here — it belongs in `designagent-figma/designreview/`.
