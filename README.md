# Design Token Scanner

A Figma plugin that audits your design file and extracts all **font families**, **font sizes**, **spacing**, and **colors** — showing which values are backed by Figma Variables or Styles, and which are raw, untracked values.

Built by [Viivue](https://viivue.com).

---

## Features

- **4 token categories** — Font (family + weight), Sizes (font-size), Spacing (gap/padding), Color
- **Variable & Style detection** — each token shows whether it is bound to a Figma Variable, covered by a Text/Color Style, or completely untracked (⚠)
- **Multi-page scanning** — scan the current page, all pages, or a custom selection of pages
- **Suggested names** — untracked tokens automatically receive a suggested variable name following a consistent naming convention
- **One-click variable creation** — create a Figma Variable directly from the plugin without leaving the UI; use "Custom" to rename before creating
- **Find in canvas** — click any token or the search icon to select all matching nodes on the canvas
- **Hide tokens** — dismiss irrelevant tokens (e.g. rounding artifacts); hidden tokens are excluded from the JSON export
- **JSON export** — export a structured token file ready to be consumed by a build pipeline or style-dictionary workflow

---

## Requirements

| Requirement | Notes |
|-------------|-------|
| **Figma Desktop** | The plugin cannot run in the browser-based Figma editor |
| **Figma plan** | Reading Variable bindings requires a Professional or Organization plan. Raw token values (sizes, colors, spacing) are available on all plans |

---

## Installation

> No build step or Node.js required — the plugin runs directly from source files.

1. Download or clone this repository and keep the folder in a stable location (Figma stores the absolute path to `manifest.json`).
2. Open **Figma Desktop**.
3. Go to **Plugins → Development → Import plugin from manifest…**
4. Select `manifest.json` from the plugin folder.
5. The plugin will appear under **Plugins → Development → Design Token Scanner**.

> **Note:** Do not move or rename the folder after importing. Figma remembers the path to `manifest.json`. If you need to relocate it, re-import the manifest from the new location.

### Updating the plugin

After editing `code.js` or `ui.html`, simply close and reopen the plugin inside Figma — there is no re-import step needed.

### Sharing with your team

Each team member must import the manifest on their own machine. For wider distribution, publish the plugin to the Figma Community (public or private to your organization).

---

## Usage

### 1. Open the plugin

**Plugins → Development → Design Token Scanner**

The plugin opens and automatically scans the current page.

---

### 2. Choose a scan scope

Use the **Scan** controls at the top to choose what to scan:

| Option | Behaviour |
|--------|-----------|
| 📄 **This page** | Scans only the currently active Figma page (default, fastest) |
| 📋 **All pages** | Scans every page in the file; the canvas will briefly switch between pages |
| ⊞ **Select pages** | Opens a checklist — pick exactly which pages to include |

Click **Re-scan** after changing the scope.

---

### 3. Read the results

Results are split into four tabs:

| Tab | What is scanned | "Defined" means |
|-----|-----------------|-----------------|
| 🔤 **Font** | Font family + weight from all TEXT nodes | Node has a Text Style applied (`◈`) |
| 📏 **Sizes** | Font size from all TEXT nodes | Node has a font-size Variable **or** a Text Style |
| 📐 **Spacing** | `gap` and `padding` from auto-layout frames | Value has a spacing Variable bound |
| 🎨 **Color** | Solid fills and strokes from all nodes | Value has a Color Variable **or** a Color Style (`◈`) |

Each token row shows:
- A **preview** (color swatch, font preview, or numeric value)
- **Usage count** and the number of pages it appears on
- A **status badge**:
  - ✓ Green — bound to a Variable (shows the variable name)
  - ◈ Purple — covered by a Style (shows the style name)
  - ⚠ Amber — untracked, shows a suggested variable name

---

### 4. Filter and search

- **Text filter** — type to filter by value, variable name, style name, or page name
- **All / ✓ / ⚠** — toggle to show all tokens, only defined ones, or only untracked ones

---

### 5. Actions on each token

| Button | Action |
|--------|--------|
| Click on the value | Selects all matching nodes on the current canvas page |
| 🔍 (search icon) | Same as clicking the value |
| **+ "suggested-name"** | Creates a Figma Variable immediately using the suggested name |
| **✎** | Opens a dialog to set a custom name and collection before creating |
| **×** | Hides the token from the list and excludes it from the JSON export |

> **Font tab:** Variables cannot be created for font family/weight — these are managed through Figma Text Styles. The suggested name is shown for reference when creating styles manually.

---

### 6. Export JSON

Click **Export JSON** to download a structured token file.

#### Output format

```json
{
  "_meta": {
    "tool": "Viivue - Design Token Scanner",
    "date": "2026-08-30",
    "pages": 5,
    "nodes": 2372,
    "hidden": 2,
    "summary": {
      "font": 3,
      "fontSize": 12,
      "spacing": 8,
      "color": 17
    }
  },
  "font": [
    { "family": "Inter",        "weight": [300, 400, 700] },
    { "family": "Crimson Text", "weight": [400, 600] }
  ],
  "fontSize": [14, 16, 18, 20, 24, 28, 40, 48, 52],
  "spacing":  [4, 8, 12, 16, 24, 32, 40, 48],
  "color": {
    "warmm":         "#8b6f5e",
    "warm-gray-8":   "#3d3430",
    "white":         "#ffffff",
    "000000":        "#000000",
    "000000-40":     "rgba(0,0,0,0.4)"
  }
}
```

#### Field reference

| Field | Description |
|-------|-------------|
| `_meta.hidden` | Number of tokens hidden via the × button and excluded from this export |
| `font[].weight` | Numeric CSS font-weight values (100–900). Italic variants map to their base weight (e.g. `Bold Italic` → `700`) |
| `fontSize` | Sorted array of unique pixel values (integers and decimals) |
| `spacing` | Sorted array of unique pixel values from auto-layout gap and padding |
| `color` key | Variable name, Color Style name, or hex fallback — all lowercased, spaces and slashes replaced with `-` |
| `color` value | Hex string for 100% opacity; `rgba()` for partial opacity |

#### Font weight mapping

| Figma style name | Exported weight |
|-----------------|-----------------|
| Thin | 100 |
| Extra Light | 200 |
| Light | 300 |
| Regular / Normal / Italic | 400 |
| Medium | 500 |
| Semi Bold | 600 |
| Bold / Bold Italic | 700 |
| Extra Bold | 800 |
| Black | 900 |

---

## File structure

```
figma-token-scanner/
├── manifest.json   — Figma plugin configuration
├── code.js         — Plugin main thread (runs in the Figma sandbox)
├── ui.html         — Plugin UI (self-contained HTML + CSS + JS)
└── README.md
```

`code.js` and `ui.html` communicate through Figma's `postMessage` bridge:
- `code.js` → `ui.html`: scan results, progress updates, highlighted node counts
- `ui.html` → `code.js`: scan requests with page selection, variable creation, highlight triggers

---

## Known limitations

- **Highlight** only selects nodes on the **currently visible page**. Nodes on other pages are counted in usage stats but cannot be selected without switching pages first.
- **Decimal spacing values** (e.g. `17.375566px`) are real values Figma returns from auto-layout — they are not a plugin bug. Use the × button to hide values you consider noise.
- **Variables API** is gated behind Figma Professional / Organization. On free plans the plugin still finds and counts all raw values, but cannot read which ones are already bound to a variable.
- The plugin scans the **current file only**. Shared libraries from external files are not traversed.

---

## Contributing

Pull requests are welcome. Please open an issue first to discuss significant changes.

Import `manifest.json` into Figma Desktop, edit `code.js` or `ui.html`, and reopen the plugin to test changes — no build step needed.

---

## License

MIT © [Viivue](https://viivue.com)