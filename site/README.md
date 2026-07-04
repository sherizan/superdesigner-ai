# superdesigner.ai — moved notice

DesignReview is now a Claude Code plugin in the **DesignAgent** marketplace. This domain serves a
single static page saying it's moved, with a link to [designagent.dev](https://designagent.dev/).

- `index.html` — the notice page ("superdesigner.ai is now part of designagent.dev" + link). No
  auto-redirect, so visitors see the message and click through. `<link rel="canonical">` points at
  designagent.dev for search.

To turn it back into a hard 301 redirect instead, add a `_redirects` file
(`/*  https://designagent.dev/  301`).

## Deploy on Cloudflare Pages

Build output directory `site`, no build command, `superdesigner.ai` custom domain.

```bash
npx wrangler pages deploy site --project-name superdesigner
```
