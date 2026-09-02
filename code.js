// ─── Design Token Scanner — code.js ──────────────────────────────────────────

figma.showUI(__html__, { width: 560, height: 700, title: 'Design Token Scanner' });

// ─── Caches ───────────────────────────────────────────────────────────────────
const _vc = new Map(); // variable cache: alias.id → { id, name, collection }
const _sc = new Map(); // style cache:    styleId  → { name }

async function resolveVar(alias) {
  if (!alias?.id) return null;
  if (_vc.has(alias.id)) return _vc.get(alias.id);
  try {
    const v = await figma.variables.getVariableByIdAsync(alias.id);
    if (!v) { _vc.set(alias.id, null); return null; }
    const col = await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId);
    const info = { id: v.id, name: v.name, collection: col?.name ?? '—' };
    _vc.set(alias.id, info);
    return info;
  } catch { _vc.set(alias.id, null); return null; }
}

async function resolveStyle(styleId) {
  if (!styleId || styleId === figma.mixed) return null;
  if (_sc.has(styleId)) return _sc.get(styleId);
  try {
    const s = await figma.getStyleByIdAsync(styleId);
    const info = s ? { name: s.name } : null;
    _sc.set(styleId, info);
    return info;
  } catch { _sc.set(styleId, null); return null; }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function rgb2hex(r, g, b) {
  return '#' + [r, g, b].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
}

// Insert or update a Map entry, then call fn to mutate it
function upsert(map, key, init, fn) {
  if (!map.has(key)) map.set(key, init());
  fn(map.get(key));
}

// Track which page/node an occurrence came from (capped at 5 examples)
function addOccurrence(entry, pageName, nodeName) {
  entry._pages.add(pageName);
  if (entry.nodes.length < 5) entry.nodes.push(`[${pageName}] ${nodeName || 'Unnamed'}`);
}

// Serialize a Map entry to a plain object, stripping the internal _pages Set
function ser(e, key) {
  const { _pages, ...rest } = e;
  return { ...rest, key, pageCount: _pages.size };
}

// ─── Typography & Editor extraction ──────────────────────────────────────────
// Shared weight map (Figma style name → CSS numeric weight)
const TYPO_WEIGHT = {
  'Thin':100,'ExtraLight':200,'Extra Light':200,'Extra-Light':200,
  'Light':300,'Regular':400,'Normal':400,'Italic':400,
  'Medium':500,'Medium Italic':500,
  'SemiBold':600,'Semi Bold':600,'Semi-Bold':600,
  'Bold':700,'Bold Italic':700,
  'ExtraBold':800,'Extra Bold':800,'Extra-Bold':800,'Black':900,
};

// Extract typography properties from a single Figma TextStyle node
function extractStyleProps({ fontSize, fontName, lineHeight, letterSpacing }) {
  const entry = {};
  if (fontSize != null)    entry.size   = String(Math.round(fontSize));
  if (fontName?.style)     entry.weight = String(TYPO_WEIGHT[fontName.style] ?? 400);
  if (fontName?.family) {
    const f = fontName.family;
    entry.font = f.includes(' ') ? `'${f}', sans-serif` : `${f}, sans-serif`;
  }
  // line-height → unitless ratio
  if (lineHeight?.unit === 'PERCENT' && lineHeight.value != null) {
    entry['line-height'] = String(+(lineHeight.value / 100).toFixed(2));
  } else if (lineHeight?.unit === 'PIXELS' && lineHeight.value && fontSize) {
    entry['line-height'] = String(+(lineHeight.value / fontSize).toFixed(2));
  }
  // letter-spacing in em units — omit if zero
  if (letterSpacing?.unit) {
    let em = 0;
    if (letterSpacing.unit === 'PERCENT')                 em = letterSpacing.value / 100;
    else if (letterSpacing.unit === 'PIXELS' && fontSize) em = letterSpacing.value / fontSize;
    if (em !== 0) entry['letter-spacing'] = `${+em.toFixed(4)}em`;
  }
  return entry;
}

// Match an array of role definitions against a list of Figma TextStyles
function matchRoles(roles, styles) {
  const result = {};
  for (const { key, patterns } of roles) {
    let matched = null;
    for (const pat of patterns) {
      matched = styles.find(s => {
        // Skip deprecated / versioned variants (e.g. "H1-Old", "H1-v2")
        if (/-(?:old|v\d|backup|deprecated|legacy)\b/i.test(s.name)) return false;
        const last = s.name.split('/').pop().trim(); // support path-style names like "Type/H1"
        return pat.test(last) || pat.test(s.name.trim());
      });
      if (matched) break;
    }
    if (matched) result[key] = extractStyleProps(matched);
  }
  return result;
}

// Heading + body roles → "typography" section
const TYPOGRAPHY_ROLES = [
  { key: 'h1',        patterns: [/^h1$/i, /^heading[\s-]?1$/i] },
  { key: 'h2',        patterns: [/^h2$/i, /^heading[\s-]?2$/i] },
  { key: 'h3',        patterns: [/^h3$/i, /^heading[\s-]?3$/i] },
  { key: 'h4',        patterns: [/^h4$/i, /^heading[\s-]?4$/i] },
  { key: 'h5',        patterns: [/^h5$/i, /^heading[\s-]?5$/i] },
  { key: 'h6',        patterns: [/^h6$/i, /^heading[\s-]?6$/i] },
  { key: 'body-text', patterns: [/^body[\s-]?text$/i, /^body$/i, /^paragraph$/i, /^body[\s-]?copy$/i] },
];

// UI component roles → "editor" section
const EDITOR_ROLES = [
  { key: 'label',    patterns: [/^label$/i, /^labels?$/i, /^tag$/i] },
  { key: 'subtitle', patterns: [/^sub[\s-]?title$/i, /^subtitle$/i, /^subheading$/i, /^sub[\s-]?heading$/i] },
  { key: 'cta',      patterns: [/^cta$/i, /^call[\s-]?to[\s-]?action$/i, /^button[\s-]?text$/i] },
  { key: 'caption',  patterns: [/^caption$/i, /^captions?$/i, /^footnote$/i] },
  { key: 'overline', patterns: [/^overline$/i, /^over[\s-]?line$/i, /^eyebrow$/i] },
  { key: 'small',    patterns: [/^small$/i, /^small[\s-]?text$/i, /^small[\s-]?body$/i, /^xs[\s-]?text$/i] },
];

// Fetch local Text Styles once, build both maps
async function buildAllTypography() {
  let styles;
  try { styles = await figma.getLocalTextStylesAsync(); } catch { styles = []; }
  if (!styles.length) return { typography: {}, editor: {} };
  return {
    typography: matchRoles(TYPOGRAPHY_ROLES, styles),
    editor:     matchRoles(EDITOR_ROLES,     styles),
  };
}

// ─── Scan ─────────────────────────────────────────────────────────────────────
// pageIds: string[] | null
//   null  → scan all pages in the file
//   [...] → scan only the pages whose IDs are in the array
async function scan(pageIds = null) {
  figma.ui.postMessage({ type: 'scanning' });
  _vc.clear();
  _sc.clear();

  const FONTS  = new Map(); // key: `${family}|||${weight}`
  const FSIZES = new Map(); // key: String(px)
  const COLORS = new Map(); // key: `${HEX}_${opPct}`
  const SPACES = new Map(); // key: String(px)

  const allPages  = figma.root.children;
  const pages     = pageIds ? allPages.filter(p => pageIds.includes(p.id)) : allPages;
  const startPage = figma.currentPage; // save to restore after scan
  let totalNodes  = 0;

  for (let pi = 0; pi < pages.length; pi++) {
    const page = pages[pi];

    figma.ui.postMessage({
      type: 'page-start', pageName: page.name,
      pageIdx: pi + 1, pageTotal: pages.length,
      pct: Math.round(pi / pages.length * 100),
    });

    // Navigate to the page so Figma loads its node data into memory
    if (page.id !== figma.currentPage.id) {
      try { await figma.setCurrentPageAsync(page); } catch { continue; }
    }
    await new Promise(r => setTimeout(r, 0));

    let nodes;
    try { nodes = page.findAll(); } catch { continue; }
    totalNodes += nodes.length;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];

      // Yield every 50 nodes to keep Figma responsive and update progress
      if (i % 50 === 0) {
        const pct = Math.round(((pi + i / Math.max(nodes.length, 1)) / pages.length) * 100);
        figma.ui.postMessage({ type: 'page-start', pageName: page.name, pageIdx: pi + 1, pageTotal: pages.length, pct });
        await new Promise(r => setTimeout(r, 0));
      }

      // ── TEXT: font family/weight + font size ──────────────────────────────
      if (node.type === 'TEXT') {
        try {
          // getStyledTextSegments handles mixed values within a single text node
          const segs = node.getStyledTextSegments(['fontName', 'fontSize', 'textStyleId', 'boundVariables']);
          for (const seg of segs) {
            const tsInfo = await resolveStyle(seg.textStyleId);

            // Font family + weight
            if (seg.fontName) {
              const { family, style: weight } = seg.fontName;
              upsert(FONTS, `${family}|||${weight}`,
                () => ({ family, weight, count: 0, style: null, nodes: [], _pages: new Set() }),
                e => { e.count++; if (!e.style && tsInfo) e.style = tsInfo; addOccurrence(e, page.name, node.name); }
              );
            }

            // Font size — check both variable binding AND text style (text style counts as "defined")
            if (typeof seg.fontSize === 'number') {
              const vi = await resolveVar(seg.boundVariables?.fontSize);
              upsert(FSIZES, String(seg.fontSize),
                () => ({ value: seg.fontSize, count: 0, variable: null, style: null, nodes: [], _pages: new Set() }),
                e => {
                  e.count++;
                  if (!e.variable && vi)  e.variable = vi;
                  if (!e.style && tsInfo) e.style = tsInfo; // a text style is sufficient to mark as "defined"
                  addOccurrence(e, page.name, node.name);
                }
              );
            }
          }
        } catch (_) {
          // Fallback for pages or nodes where getStyledTextSegments is unavailable
          if (node.fontName !== figma.mixed) {
            const { family, style: weight } = node.fontName;
            const tsInfo = await resolveStyle(node.textStyleId !== figma.mixed ? node.textStyleId : null);
            upsert(FONTS, `${family}|||${weight}`,
              () => ({ family, weight, count: 0, style: null, nodes: [], _pages: new Set() }),
              e => { e.count++; if (!e.style && tsInfo) e.style = tsInfo; addOccurrence(e, page.name, node.name); }
            );
          }
          if (node.fontSize !== figma.mixed) {
            const tsInfo = await resolveStyle(node.textStyleId !== figma.mixed ? node.textStyleId : null);
            const vi = await resolveVar(node.boundVariables?.fontSize);
            upsert(FSIZES, String(node.fontSize),
              () => ({ value: node.fontSize, count: 0, variable: null, style: null, nodes: [], _pages: new Set() }),
              e => { e.count++; if (!e.variable && vi) e.variable = vi; if (!e.style && tsInfo) e.style = tsInfo; addOccurrence(e, page.name, node.name); }
            );
          }
        }
      }

      // ── COLORS: solid fills and strokes ───────────────────────────────────
      const addFills = async (fills, boundArr, styleId) => {
        if (!Array.isArray(fills)) return;
        const paintStyle = await resolveStyle(styleId !== figma.mixed ? styleId : null);
        for (let fi = 0; fi < fills.length; fi++) {
          const fill = fills[fi];
          if (fill.type !== 'SOLID' || fill.visible === false) continue;
          const hex   = rgb2hex(fill.color.r, fill.color.g, fill.color.b);
          const opPct = Math.round((fill.opacity ?? 1) * 100);
          const key   = `${hex}_${opPct}`;
          const vi    = await resolveVar(Array.isArray(boundArr) ? boundArr[fi] : null);
          upsert(COLORS, key,
            () => ({ hex, opacity: opPct / 100, count: 0, variable: null, style: null, nodes: [], _pages: new Set() }),
            e => { e.count++; if (!e.variable && vi) e.variable = vi; if (!e.style && paintStyle) e.style = paintStyle; addOccurrence(e, page.name, node.name); }
          );
        }
      };
      if ('fills'   in node && node.fills   !== figma.mixed) await addFills(node.fills,   node.boundVariables?.fills,   node.fillStyleId);
      if ('strokes' in node && node.strokes !== figma.mixed) await addFills(node.strokes, node.boundVariables?.strokes, node.strokeStyleId);

      // ── SPACING: auto-layout frames only ──────────────────────────────────
      if ('layoutMode' in node && node.layoutMode !== 'NONE') {
        const PROPS = ['itemSpacing', 'counterAxisSpacing', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'];
        for (const prop of PROPS) {
          const val = node[prop];
          if (typeof val !== 'number' || val <= 0) continue;
          const vi = await resolveVar(node.boundVariables?.[prop]);
          upsert(SPACES, String(val),
            () => ({ value: val, count: 0, variable: null, types: new Set(), nodes: [], _pages: new Set() }),
            e => { e.count++; e.types.add(prop); if (!e.variable && vi) e.variable = vi; addOccurrence(e, page.name, node.name); }
          );
        }
      }
    }
  }

  // Restore the original page if we navigated away during the scan
  if (figma.currentPage.id !== startPage.id) {
    try { await figma.setCurrentPageAsync(startPage); } catch (_) {}
  }

  // Build typography maps from local Text Styles (file-level, single API call)
  const { typography, editor } = await buildAllTypography();

  figma.ui.postMessage({
    type: 'result',
    data: {
      fonts:     [...FONTS.entries()].map(([k,e]) => ser(e,k)).sort((a,b) => a.family.localeCompare(b.family) || a.weight.localeCompare(b.weight)),
      fontSizes: [...FSIZES.entries()].map(([k,e]) => ser(e,k)).sort((a,b) => a.value - b.value),
      spacings:  [...SPACES.entries()].map(([k,e]) => { const {_pages,types,...rest}=e; return {...rest,key:k,types:[...types],pageCount:_pages.size}; }).sort((a,b) => a.value - b.value),
      colors:    [...COLORS.entries()].map(([k,e]) => ser(e,k)).sort((a,b) => b.count - a.count),
      typography,
      editor,
      totalNodes, totalPages: pages.length,
    },
  });
}

// ─── Highlight nodes in canvas ────────────────────────────────────────────────
// Finds all nodes on the current page that match the given token and selects them
async function highlightNodes(payload) {
  const { tokenType, value, family, weight, hex, opacity } = payload;
  const matched = [];
  const nodes   = figma.currentPage.findAll();

  for (const node of nodes) {
    let hit = false;

    if (tokenType === 'font' && node.type === 'TEXT') {
      if (node.fontName !== figma.mixed) {
        hit = node.fontName.family === family && node.fontName.style === weight;
      }
    } else if (tokenType === 'size' && node.type === 'TEXT') {
      if (node.fontSize !== figma.mixed) {
        hit = node.fontSize === value;
      } else {
        try { hit = node.getStyledTextSegments(['fontSize']).some(s => s.fontSize === value); } catch {}
      }
    } else if (tokenType === 'color') {
      const opPct = Math.round(opacity * 100);
      const checkFills = fills => Array.isArray(fills) && fills.some(f =>
        f.type === 'SOLID' && f.visible !== false &&
        rgb2hex(f.color.r, f.color.g, f.color.b) === hex &&
        Math.round((f.opacity ?? 1) * 100) === opPct
      );
      if ('fills'   in node && node.fills   !== figma.mixed) hit = checkFills(node.fills);
      if (!hit && 'strokes' in node && node.strokes !== figma.mixed) hit = checkFills(node.strokes);
    } else if (tokenType === 'spacing') {
      if ('layoutMode' in node && node.layoutMode !== 'NONE') {
        hit = ['itemSpacing','counterAxisSpacing','paddingTop','paddingRight','paddingBottom','paddingLeft']
          .some(p => node[p] === value);
      }
    }

    if (hit) matched.push(node);
  }

  if (matched.length > 0) {
    figma.currentPage.selection = matched.slice(0, 300);
    figma.viewport.scrollAndZoomIntoView(figma.currentPage.selection);
  }
  figma.ui.postMessage({ type: 'highlighted', count: matched.length });
}

// ─── Create Variable ──────────────────────────────────────────────────────────
async function createVar({ collection, name, tokenType, value, hex, opacity }) {
  try {
    // Get or create the target collection
    const cols = await figma.variables.getLocalVariableCollectionsAsync();
    let col = cols.find(c => c.name === collection) ?? figma.variables.createVariableCollection(collection);

    const vType = tokenType === 'color' ? 'COLOR' : 'FLOAT';
    const v = figma.variables.createVariable(name, col.id, vType);

    if (tokenType === 'color') {
      const r = parseInt(hex.slice(1,3),16)/255, g = parseInt(hex.slice(3,5),16)/255, b = parseInt(hex.slice(5,7),16)/255;
      v.setValueForMode({ r, g, b, a: opacity ?? 1 }, col.defaultModeId);
    } else {
      v.setValueForMode(value, col.defaultModeId);
    }
    figma.ui.postMessage({ type: 'var-created', ok: true, name: v.name });
  } catch (err) {
    figma.ui.postMessage({ type: 'var-created', ok: false, err: err.message });
  }
}

// ─── Message handler ──────────────────────────────────────────────────────────
figma.ui.onmessage = async msg => {
  if (msg.type === 'scan')       await scan([figma.currentPage.id]);
  if (msg.type === 'highlight')  await highlightNodes(msg.payload);
  if (msg.type === 'create-var') await createVar(msg.payload);
  if (msg.type === 'close')      figma.closePlugin();
};


// Auto-scan the current page on launch
scan([figma.currentPage.id]);
