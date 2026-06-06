# Superdesigner landing page

A single self-contained `index.html` — the marketing page for [superdesigner.ai](https://superdesigner.ai),
positioned for **design leaders who run crits and design reviews**.

- No build step. One file. The only external dependency is Google Fonts (Fraunces + IBM Plex Sans/Mono).
- Aesthetic: "the marked-up crit briefing" — cream paper, deep ink, an acid-highlighter accent, a
  redline annotation motif. Type pairs Fraunces (display serif) with IBM Plex Sans/Mono.
- Accessible/robust: content is visible without JS (reveal animations are progressive enhancement);
  respects `prefers-reduced-motion`.

## Deploy on Cloudflare Pages

**Dashboard:** create a Pages project → connect this repo → set **build output directory** to `site`
(no build command). Point the `superdesigner.ai` custom domain at the project.

**Wrangler (direct upload):**

```bash
npx wrangler pages deploy site --project-name superdesigner
```

## Preview locally

```bash
cd site && python3 -m http.server 8137   # then open http://localhost:8137
```
