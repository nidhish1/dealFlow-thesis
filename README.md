# Thesis

A glass-style workspace for VCs to define investment theses across verticals.

## Run locally

From this directory:

```sh
python3 -m http.server 8765 --directory dist --bind 127.0.0.1
```

Open http://127.0.0.1:8765.

## Included

- Six illustrative theses across AI, fintech, climate, healthcare, developer tools, and consumer.
- Create, edit, and delete theses; set stages, check sizes, geography, conviction, and status.
- Capture the core thesis, why now, investment criteria, and disconfirming evidence.
- Search, filter by vertical or status, and switch between grid and list views.
- Customize the workspace name and profile; export saved theses as Markdown.
- Responsive layouts, native modal dialogs, labeled inputs, and keyboard search shortcut.

This is a frontend prototype. Changes persist in localStorage in the current browser and origin. It has no shared database, team accounts, or cross-device synchronization. Export provides a portable copy. Starter theses are illustrative content, not investment recommendations. The UI uses Google Fonts with system font fallbacks.

## Source

- `dist/index.html`: page and forms
- `dist/styles.css`: visual system and responsive layout
- `dist/app.js`: state, interactions, persistence, and Markdown export
