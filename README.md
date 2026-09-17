# Design Token Scanner

A Figma plugin that scans your design file and extracts raw token values — font families, font sizes, spacing, colors, and text styles — so you can see exactly what's defined (or missing) in your design system.

---

## Requirements

- **Figma Desktop** — does not run in the browser editor
- **Figma Professional or Organization plan** — required to read Variable bindings. Raw token values work on all plans.

---

## Installation

> No build step or Node.js required.

1. Clone or download this repository to a **stable folder** on your machine.
   Figma stores the absolute path to `manifest.json`, so avoid moving the folder later.
2. Open **Figma Desktop**.
3. Go to **Plugins → Development → Import plugin from manifest…**
4. Select `manifest.json` from the project folder.
5. The plugin is now available under **Plugins → Development → Design Token Scanner**.

**To update** — after editing `code.js` or `ui.html`, simply close and reopen the plugin. No re-import needed.

---

## Usage

Open the plugin via **Plugins → Development → Design Token Scanner**. It scans the current page automatically.

### Tabs

| Tab | What it shows |
|---|---|
| 🔤 **Font** | Font families and weights used across all text nodes |
| 📏 **Sizes** | Font sizes used across all text nodes |
| 📐 **Spacing** | Gap and padding values from auto-layout frames |
| 🎨 **Color** | Fill and stroke colors from all nodes |
| 📝 **Typography** | Local Text Styles matching heading / body patterns (h1–h6, Big Heading, Body Text) |
| 📄 **Editor** | All other Text Styles (labels, CTAs, captions, etc.) |

### Token status

Each token row shows how it's currently tracked:

- ✓ **Green** — bound to a Figma Variable
- ◈ **Purple** — covered by a Text or Color Style
- ⚠ **Amber** — untracked, with a suggested variable name

### Actions

| Action | How |
|---|---|
| Select matching nodes on canvas | Click the token value or the 🔍 icon |
| Create a variable with the suggested name | Click **+ "suggested-name"** |
| Customise the name before creating | Click **✎** |
| Hide a token (excludes it from export) | Click **×** |

> Font tab only: variables can't be created for font family/weight — use Figma Text Styles for those.

### Filtering

- **Search** by value, variable name, style name, or page name
- **All / ✓ / ⚠** toggle to show all, defined-only, or untracked-only tokens

---

## Export JSON

Click **Export JSON** to download `scan-design-token.json`.

```json
{
  "_meta": {
    "tool": "Design Token Scanner",
    "date": "2026-09-02",
    "pages": 1,
    "nodes": 2372,
    "hidden": 0,
    "summary": { "font": 3, "fontSize": 9, "spacing": 6, "color": 14, "typography": 10, "editor": 4 }
  },
  "font": [
    { "family": "Inter", "weight": [300, 400, 700] }
  ],
  "fontSize": [14, 16, 18, 20, 24, 28, 40, 48, 52],
  "spacing":  [4, 8, 12, 16, 24, 32],
  "color": {
    "white": "#ffffff",
    "black": "#000000",
    "black-40": "rgba(0,0,0,0.4)"
  },
  "typography": {
    "h1": { "size": "56", "weight": "300", "font": "'Plus Jakarta Sans', sans-serif", "line-height": "1.2", "letter-spacing": "0.05em" }
  },
  "editor": {
    "label": { "size": "12", "weight": "600", "font": "'Inter', sans-serif", "line-height": "1.4" }
  }
}
```

- `hidden` — number of tokens removed with × and excluded from the export
- `color` values — lowercase hex for full opacity, `rgba()` for partial opacity
- `line-height` — unitless ratio (e.g. `"1.2"` = 120%)
- `letter-spacing` — em value; omitted when 0

---

## Known Limitations

- Only scans the **current page** — nodes on other pages are not included.
- **External shared libraries** are not scanned. Only local styles and variables in the current file are detected.
- **Component variants** in a separate library file are not scanned — only the instance visible on the current page.
- Decimal spacing values (e.g. `17.376px`) are real Figma values. Use × to hide noise before exporting.

---

## File Structure

```
figma-token-scanner/
├── manifest.json   — Figma plugin configuration
├── code.js         — Plugin logic (runs in Figma sandbox)
└── ui.html         — Plugin UI (self-contained HTML + CSS + JS)
```

---

## License

MIT
