# superdesigner.ai — redirect

DesignReview is now a Claude Code plugin published in the **DesignAgent** marketplace, so this domain
just redirects to [designagent.dev](https://designagent.dev/).

- `_redirects` — Cloudflare Pages edge rule: `/* → https://designagent.dev/` (301).
- `index.html` — HTML fallback (meta-refresh + `location.replace` + a visible link) in case the edge
  rule isn't applied.

**Change the target** in both files if you want to point at a specific page (e.g.
`https://designagent.dev/plugins/designreview`).

## Deploy on Cloudflare Pages

Unchanged: build output directory `site`, no build command, `superdesigner.ai` custom domain. A
deploy with only `_redirects` + the fallback `index.html` is all it needs.

```bash
npx wrangler pages deploy site --project-name superdesigner
```
