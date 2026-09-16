# ◈ Haolio

**Offline Infinite Canvas & Mind Mapping**

*Think. Map. Create.*

Haolio is a lightweight, fully offline desktop application for mind mapping, visual
brainstorming, project planning and reference boards. No account, no cloud, no
backend — every project lives on your PC.

---

## Features

- **Infinite canvas** — pan (drag / space+drag / middle mouse), zoom (mouse wheel),
  grid with optional snap-to-grid, minimap, viewport controls
- **Mind mapping** — create a root idea and grow it with `TAB` (add child) and
  `ENTER` (add sibling); collapse/expand branches with `SPACE`
- **Automatic layouts** — horizontal, vertical and radial, with manual free
  positioning afterwards (layout is never forced)
- **Objects** — text, sticky notes, shapes (rectangle, rounded, circle, diamond,
  triangle, hexagon), frames and images (drag & drop; stored locally as data URLs)
- **Connectors** — straight, curved and elbow lines with none/arrow/double-arrow
  heads; connected lines follow objects automatically
- **Undo / redo** — every operation is transactional (a whole drag = one step)
- **Copy / paste / duplicate / grouping** — `CTRL+C/V/D`, `CTRL+G` / `CTRL+SHIFT+G`
- **Multiple boards per project** — create, rename, duplicate, reorder, delete
- **Autosave** — debounced local persistence with `Saving… / Saved` status
- **Portable `.haolio` files** — versioned JSON project format; open/save snapshots
- **Export** — PNG / SVG (board, selection or viewport) and JSON
- **Local search** — board names, sticky notes, mind map nodes and text objects
- **Dark / light / system theme**, persisted locally
- **100% offline** — no accounts, no cloud services, no network access

## Tech stack

| Layer      | Choice                                        |
| ---------- | --------------------------------------------- |
| Desktop    | [Tauri 2](https://tauri.app) (`Haolio.exe`)   |
| Frontend   | React 18 + TypeScript + Vite                  |
| Styling    | Tailwind CSS + shadcn/ui-style components     |
| State      | Zustand (selector-driven, copy-on-write docs) |
| Canvas     | Purpose-built transform/DOM/SVG renderer      |
| Storage    | IndexedDB (local) + portable `.haolio` JSON   |

The canvas engine is implemented in-repo rather than pulled from a node/edge
library — mind map trees, frames, grouping, elbow routing and viewport culling
need direct control over the object model.

## Project format

A `.haolio` file is a versioned JSON document:

```json
{
  "format": "haolio",
  "version": 1,
  "project": { "id": "…", "name": "My Project", "createdAt": "…", "modifiedAt": "…" },
  "boards": [
    {
      "id": "…",
      "title": "Main Board",
      "objects": { "…": { "type": "sticky_note", "x": 0, "y": 0, "data": {}, "style": {} } },
      "edges": { "…": { "from": "…", "to": "…" } },
      "roots": ["…"]
    }
  ],
  "settings": { "grid": { "style": "dots", "size": 20, "snap": false } }
}
```

`version` enables future migrations; the loader repairs partial files and rejects
files from newer formats with a clear message.

## Keyboard shortcuts

| Keys                        | Action                          |
| --------------------------- | ------------------------------- |
| `V` `H`                     | Select / Hand                   |
| `T` `N` `S`                 | Text / Sticky note / Shape      |
| `C` `M` `F`                 | Connector / Mind map / Frame    |
| `TAB` / `ENTER`             | Mind map: add child / sibling   |
| `SPACE`                     | Collapse branch · hold to pan   |
| `DELETE`                    | Delete selection                |
| `CTRL+Z` / `CTRL+SHIFT+Z`   | Undo / Redo                     |
| `CTRL+C` `CTRL+V` `CTRL+D`  | Copy / Paste / Duplicate        |
| `CTRL+G` / `CTRL+SHIFT+G`   | Group / Ungroup                 |
| `CTRL+F`                    | Search                          |
| `CTRL+S`                    | Save `.haolio` snapshot         |
| `CTRL+0` / `CTRL+1`         | Zoom 100% / Fit board           |

## Development

```bash
npm install

# Web/preview dev server (http://localhost:1420)
npm run dev

# Desktop app (requires Rust + platform prerequisites for Tauri 2)
npm run tauri dev

# Production desktop bundle (NSIS/MSI on Windows)
npm run tauri build

# Quality gates
npm run typecheck   # tsc --noEmit
npm test            # vitest (format, geometry, layout, store ops, persistence, UI)
npm run build       # typecheck + production bundle
```

### Repository layout

```text
src/
├── lib/            # domain model, format, geometry, layout engine, persistence
├── stores/         # zustand stores (editor document, library, canvas, toasts)
├── components/
│   ├── ui/         # shadcn-style primitives
│   ├── canvas/     # canvas renderer, gestures, object views, minimap
│   ├── editor/     # toolbar, topbar, boards sidebar, properties, search, settings
│   └── dashboard/  # local project dashboard
└── test/           # test setup + integration tests
src-tauri/          # desktop shell (window config, native file I/O commands)
branding/           # app icon source
```

## Privacy

Haolio works completely offline. Projects are stored in a local database on your
machine, and `.haolio` snapshots are plain files you control. Nothing is uploaded,
tracked, or sent anywhere — ever.
