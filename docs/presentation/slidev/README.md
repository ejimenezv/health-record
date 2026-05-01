# MedRecord — presentation deck (Slidev)

Visual deck for the final project video and live presentation.
Source: [`slides.md`](./slides.md).

## Run locally

```bash
cd docs/presentation/slidev
pnpm install
pnpm dev          # opens http://localhost:3030
```

Edit [`slides.md`](./slides.md) — Slidev hot-reloads on save.

## Export

```bash
pnpm export:pptx  # → exports/medrecord-presentation.pptx
pnpm export:pdf   # → exports/medrecord-presentation.pdf
pnpm build        # static SPA in dist/  (deploy anywhere)
```

PPTX and PDF export require Chromium. The first export run downloads it
automatically via the bundled `playwright-chromium`.

## Notes

- Tech logos come from [Iconify](https://iconify.design) — no manual
  image downloads needed. Add more via the `<logos-…>`,
  `<simple-icons-…>` or `<carbon-…>` collections.
- The architecture diagram is inline Mermaid; edit it in `slides.md`
  and it re-renders.
- The deck is a sibling of [`../video-demo-script-es.md`](../video-demo-script-es.md);
  keep them in sync when content changes.
