# Design Token Scanner

A Figma plugin for auditing design files and extracting raw design token values — **font families**, **font sizes**, **spacing**, **colors**, **typography scale**, and **UI text styles** — with full support for Figma Variables and Text Styles detection.

---

## Features

**Token scanning**
- Scans the current Figma page and extracts all raw design values
- Detects whether each value is backed by a Figma Variable, a Text Style, or is completely untracked
- Suggested variable names for every untracked token, following a consistent naming convention
- One-click variable creation directly from the plugin, or open a custom name dialog to edit before saving
- Click any token to select all matching nodes on the canvas
- Hide irrelevant tokens (e.g. rounding artifacts) — hidden tokens are excluded from the JSON export

**Typography detection**
- Reads local Text Styles and maps them to semantic roles automatically
- **Typography tab**: h1 → h6, body-text
- **Editor tab**: label, subtitle, cta, caption, overline, small
- Each role shows: font family, size, weight, line-height (unitless ratio), letter-spacing (in em)
- Letter-spacing is omitted from output when the value is 0
- Undetected roles are hidden — only matched styles are shown

**Export**
- One-click JSON export structured for build pipelines or style-dictionary workflows

---

## Requirements

| Requirement | Notes |
|---|---|
| **Figma Desktop** | Does not run in the browser-based Figma editor |
| **Figma plan** | Reading Variable bindings requires a Professional or Organization plan. Raw token values are available on all plans |

---

## Installation

> No build step or Node.js required — the plugin runs directly from source files.

1. Clone or download this repository to a **stable location** on your machine. Figma stores the absolute path to `manifest.json`, so moving the folder later will break the plugin.
2. Open **Figma Desktop**.
3. Go to **Plugins → Development → Import plugin from manifest…**
4. Select `manifest.json` from the project folder.
5. The plugin appears under **Plugins → Development → Design Token Scanner**.

**Updating** — after editing `code.js` or `ui.html`, close and reopen the plugin inside Figma. No re-import needed.

---

## Usage

### Opening the plugin

**Plugins → Development → Design Token Scanner**

The plugin opens and immediately scans the current page.

---

### Token tabs

| Tab | What is scanned | Counts as "defined" when… |
|---|---|---|
| 🔤 **Font** | Font family + weight from all TEXT nodes | A Text Style is applied (`◈`) |
| 📏 **Sizes** | Font size from all TEXT nodes | A font-size Variable **or** a Text Style is applied |
| 📐 **Spacing** | `gap` and `padding` from auto-layout frames | A spacing Variable is bound |
| 🎨 **Color** | Solid fills and strokes from all nodes | A Color Variable **or** a Color Style is applied |
| 📝 **Typography** | h1–h6 + body-text mapped from local Text Styles | — (display only) |
| 📄 **Editor** | label, subtitle, cta, caption, overline, small from local Text Styles | — (display only) |

Each token row shows:
- A preview (color swatch, font preview, or numeric value)
- Usage count
- ✓ **Green** — bound to a Figma Variable (shows variable name)
- ◈ **Purple** — covered by a Text or Color Style (shows style name)
- ⚠ **Amber** — untracked, shows a suggested variable name

---

### Filtering

- **Text search** — filter by value, variable name, style name, or page name
- **All / ✓ / ⚠** toggle — show all, defined-only, or untracked-only tokens

---

### Actions per token

| Control | Action |
|---|---|
| Click on the value | Selects all matching nodes on the canvas |
| 🔍 icon | Same as clicking the value |
| **+ "suggested-name"** | Creates a Figma Variable immediately with the suggested name |
| **✎** | Opens a dialog to customise the name and collection before creating |
| **×** | Hides the token from the list and excludes it from the JSON export |

> **Font tab**: Variables cannot be created for font family/weight — use Figma Text Styles instead. The ✎ button is not shown for font tokens.

---

### Export JSON

Click **Export JSON** to download `design-tokens-YYYY-MM-DD.json`.

#### Format

```json
{
  "_meta": {
    "tool": "Design Token Scanner",
    "date": "2026-08-30",
    "pages": 1,
    "nodes": 2372,
    "hidden": 2,
    "summary": {
      "font": 3,
      "fontSize": 9,
      "spacing": 6,
      "color": 14,
      "typography": 7,
      "editor": 3
    }
  },
  "font": [
    { "family": "Inter",        "weight": [300, 400, 700] },
    { "family": "Crimson Text", "weight": [400, 600] }
  ],
  "fontSize": [14, 16, 18, 20, 24, 28, 40, 48, 52],
  "spacing":  [4, 8, 12, 16, 24, 32, 40, 48],
  "color": {
    "warmm":       "#8b6f5e",
    "warm-gray-8": "#3d3430",
    "white":       "#ffffff",
    "000000":      "#000000",
    "000000-40":   "rgba(0,0,0,0.4)"
  },
  "typography": {
    "h1": { "size": "52", "weight": "700", "font": "'Inter', sans-serif", "line-height": "1.1" },
    "h2": { "size": "48", "weight": "700", "font": "'Inter', sans-serif", "line-height": "1.05" },
    "body-text": { "size": "16", "weight": "400", "font": "'Inter', sans-serif", "line-height": "1.5" }
  },
  "editor": {
    "label":    { "size": "24", "weight": "600", "font": "'Crimson Text', sans-serif", "line-height": "1.4" },
    "subtitle": { "size": "14", "weight": "600", "font": "'Inter', sans-serif", "line-height": "1.4", "letter-spacing": "0.1429em" },
    "cta":      { "size": "15", "weight": "600", "font": "'Inter', sans-serif", "line-height": "1.4" }
  }
}
```

#### Field reference

| Field | Description |
|---|---|
| `_meta.hidden` | Number of tokens removed with × and excluded from this export |
| `font[].weight` | Numeric CSS font-weight values (100–900). Italic variants map to their base weight |
| `fontSize` | Sorted array of unique px values |
| `spacing` | Sorted array of unique px values from auto-layout gap and padding |
| `color` key | Variable name → slugified, Color Style name → slugified, or hex fallback |
| `color` value | Lowercase hex for 100% opacity; `rgba()` for partial opacity |
| `typography` / `editor` | Only detected roles are included — unmatched roles are omitted |
| `line-height` | Unitless ratio (e.g. `"1.1"` from 110%) |
| `letter-spacing` | Em value (e.g. `"0.05em"`). Key is omitted when the value is 0 |

#### Font weight reference

| Figma style name | Exported weight |
|---|---|
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

### Typography & Editor detection

Both tabs read `figma.getLocalTextStylesAsync()` and match style names against known patterns. Styles containing `-old`, `-v2`, `-deprecated`, or `-legacy` in the name are skipped automatically.

**Typography roles:**

| Role | Matched style names |
|---|---|
| h1–h6 | `H1`–`H6`, `Heading 1`–`Heading 6`, path-style names like `Type/H1` |
| body-text | `Body text`, `Body`, `Paragraph`, `Body copy` |

**Editor roles:**

| Role | Matched style names |
|---|---|
| label | `Label`, `Labels`, `Tag` |
| subtitle | `Subtitle`, `Sub Title`, `Subheading` |
| cta | `CTA`, `Call to action`, `Button text` |
| caption | `Caption`, `Footnote` |
| overline | `Overline`, `Over Line`, `Eyebrow` |
| small | `Small`, `Small text`, `Small body` |

---

## File structure

```
figma-token-scanner/
├── manifest.json   — Figma plugin configuration
├── code.js         — Plugin main thread (Figma sandbox)
├── ui.html         — Plugin UI (self-contained HTML + CSS + JS)
└── README.md
```

---

## Known limitations

- **Canvas highlight** selects nodes on the current page only.
- **Decimal spacing values** (e.g. `17.376px`) are real values returned by Figma from auto-layout calculations. Use × to hide noise before exporting.
- **Variables API** requires Figma Professional or Organization plan. On free plans, raw values are still scanned — variable bindings just won't be read.
- **Shared libraries** from external files are not scanned. Only local styles and variables in the current file are detected.

---

## License

MIT
