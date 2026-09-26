# superdesigner.ai — network hub

Superdesigner is the parent brand for Sherizan's projects. This domain serves a single static
page linking to each one:

- [designagent.dev](https://designagent.dev/) — Claude Code plugins, built for designers.
- [prototo.app](https://prototo.app/) — Prototypes that run on real iPhones.
- [designaistack.com](https://designaistack.com/) — The full-stack playbook for designers using AI.

`index.html` is self-contained (no build, no JS). To add a project, copy one `<li>` in the
`.network` list and set its `--hue` to the project's brand color.

## Deploy on Cloudflare Pages

Build output directory `site`, no build command, `superdesigner.ai` custom domain.

```bash
npx wrangler pages deploy site --project-name superdesigner
```
