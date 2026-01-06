# Raw Artifacts

Drop your source files under /raw folder:
- PDFs (product specs, research reports)
- PPTX (slide decks, presentations)
- TXT/MD (notes, transcripts)

Then run:
```
npm run convert -- example
```

This extracts text and prepares prompts for Cursor Agent to generate `prd.md` and `research.md`.