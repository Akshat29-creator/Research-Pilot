# ResearchPilot AI — Design System & Engineering Specification

## 1. Product Personality & Design Philosophy

ResearchPilot AI is a **precise, calm, trustworthy research workstation** built for power users, research scientists, software engineers, and intelligence analysts.

It is **NOT** a generic consumer "AI chatbot". There are no whimsical greeting cards, no bouncing speech bubbles, no purple-blue "AI novelty gradients", no neon glows, no glassmorphism, and no emoji iconography.

### Influences & Aesthetic Standards (Feel Only)
- **Linear**: Relentless keyboard ergonomics, crisp borders (`1px`), dense information density, subtle surface elevations, instant feedback.
- **Vercel**: Strict monochrome foundation with high-contrast type, purposeful semantic accents, tabular data clarity.
- **Perplexity**: Methodical citation attribution, transparent provenance, verifiable snippets over ungrounded generative prose.
- **Raycast**: Monospace timings, execution traces, crisp action commands (`Cmd+K`).
- **Arc**: Intentional workspace panel hierarchy, clean collapsible sidebars, focused reading canvases.

---

## 2. Color System & Contrast Tokens (WCAG AA Compliant)

All color tokens are exposed as semantic CSS custom variables supporting **both Dark (default) and Light modes**. Contrast ratios meet or exceed WCAG AA requirements (minimum 4.5:1 for normal text, 3:1 for large text and UI components).

### 2.1 CSS Variables Definition

```css
/* Dark Theme (Default) */
:root, [data-theme="dark"] {
  /* Canvas & Surfaces */
  --bg-app: #09090b;             /* Deepest canvas */
  --bg-surface: #121215;         /* Base cards, panels */
  --bg-surface-raised: #18181b;  /* Elevated cards, dropdowns, dialogs */
  --bg-surface-hover: #222226;   /* Interactive item hover state */
  --bg-surface-active: #27272a;  /* Pressed / selected state */

  /* Borders & Dividers */
  --border-subtle: #27272a;      /* Dividers, card borders (contrast 3.2:1) */
  --border-strong: #3f3f46;      /* Active inputs, focused elements (contrast 4.8:1) */
  --border-focus: #10b981;       /* Focus ring accent */

  /* Text & Typography */
  --text-primary: #f4f4f5;       /* Primary headlines and body (15.8:1 contrast) */
  --text-secondary: #a1a1aa;     /* Supporting body, labels (7.2:1 contrast) */
  --text-muted: #71717a;         /* Timings, minor metadata, placeholders (4.6:1 contrast) */
  --text-inverse: #09090b;       /* Text on solid accent buttons */

  /* Brand Accent: Restrained Emerald */
  --accent: #10b981;             /* Primary action, verified badges */
  --accent-hover: #059669;       /* Hover state */
  --accent-subtle: rgba(16, 185, 129, 0.12); /* Badge background */
  --accent-border: rgba(16, 185, 129, 0.28); /* Badge border */

  /* Semantic State Tokens */
  --success: #10b981;
  --success-subtle: rgba(16, 185, 129, 0.12);
  --success-border: rgba(16, 185, 129, 0.28);

  --warning: #f59e0b;
  --warning-subtle: rgba(245, 158, 11, 0.12);
  --warning-border: rgba(245, 158, 11, 0.28);

  --danger: #ef4444;
  --danger-subtle: rgba(239, 68, 68, 0.12);
  --danger-border: rgba(239, 68, 68, 0.28);

  --info: #0ea5e9;
  --info-subtle: rgba(14, 165, 233, 0.12);
  --info-border: rgba(14, 165, 233, 0.28);
}

/* Light Theme */
[data-theme="light"] {
  /* Canvas & Surfaces */
  --bg-app: #fafafa;             /* Clean paper canvas */
  --bg-surface: #ffffff;         /* Cards, sheets */
  --bg-surface-raised: #f4f4f5;  /* Secondary panels, code blocks */
  --bg-surface-hover: #e4e4e7;   /* Hover state */
  --bg-surface-active: #d4d4d8;  /* Active state */

  /* Borders & Dividers */
  --border-subtle: #e4e4e7;      /* Clean subtle border (3.1:1 contrast) */
  --border-strong: #a1a1aa;      /* Focused card border (4.9:1 contrast) */
  --border-focus: #059669;       /* Focus ring */

  /* Text & Typography */
  --text-primary: #09090b;       /* Primary headlines (18.1:1 contrast) */
  --text-secondary: #52525b;     /* Supporting body (7.4:1 contrast) */
  --text-muted: #71717a;         /* Timings, minor metadata (4.6:1 contrast) */
  --text-inverse: #ffffff;       /* Text on solid accent */

  /* Brand Accent: Restrained Emerald */
  --accent: #059669;             /* Slightly deeper for light mode contrast */
  --accent-hover: #047857;
  --accent-subtle: rgba(5, 150, 105, 0.10);
  --accent-border: rgba(5, 150, 105, 0.25);

  /* Semantic State Tokens */
  --success: #059669;
  --success-subtle: rgba(5, 150, 105, 0.10);
  --success-border: rgba(5, 150, 105, 0.25);

  --warning: #d97706;
  --warning-subtle: rgba(217, 119, 6, 0.10);
  --warning-border: rgba(217, 119, 6, 0.25);

  --danger: #dc2626;
  --danger-subtle: rgba(220, 38, 38, 0.10);
  --danger-border: rgba(220, 38, 38, 0.25);

  --info: #0284c7;
  --info-subtle: rgba(2, 132, 199, 0.10);
  --info-border: rgba(2, 132, 199, 0.25);
}
```

---

## 3. Typography System

The interface pairs **Geist Sans** (or Inter) for human-readable prose with **Geist Mono** (or JetBrains Mono) for IDs, execution timings, citations, code blocks, and metrics.

### 3.1 Font Stack
- **Sans-serif (UI/Body)**: `var(--font-geist-sans), Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- **Monospace (Code/Telemetry/Citations)**: `var(--font-geist-mono), "JetBrains Mono", "SF Mono", Consolas, monospace`

### 3.2 Type Hierarchy Scale

| Token | Size | Line Height | Tracking | Weight | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `text-display` | 36px (2.25rem) | 40px (1.1) | `-0.025em` | Bold (700) | Landing Hero Headline |
| `text-h1` | 24px (1.5rem) | 32px (1.33) | `-0.02em` | SemiBold (600) | Main Page Titles, Report Titles |
| `text-h2` | 18px (1.125rem) | 24px (1.33) | `-0.015em` | SemiBold (600) | Section Headers, Workspace Panels |
| `text-h3` | 14px (0.875rem) | 20px (1.42) | `-0.01em` | Medium (500) | Card Titles, Modal Headers |
| `text-body` | 14px (0.875rem) | 22px (1.57) | `0` | Regular (400) | Primary narrative, Report body |
| `text-caption` | 12px (0.75rem) | 16px (1.33) | `0` | Regular (400) / Medium | Form labels, descriptions, badges |
| `text-mono` | 12px (0.75rem) | 16px (1.33) | `0` | Regular (400) | UUIDs, Git hashes, timings, offsets |
| `text-tabular`| 13px (0.8125rem)| 16px (1.23) | `0` | Medium (500) | Metrics, latency, memory counters |

### 3.3 Strict Numerical & Monospace Rules
- All numeric telemetry and table statistics **MUST** specify `font-feature-settings: "tnum" 1` (`tabular-nums` in Tailwind) to prevent jitter during streaming updates.
- All session IDs, execution IDs, and commit hashes use `font-mono text-xs uppercase tracking-wider`.
- All citation superscripts use `font-mono font-medium text-xs text-accent hover:underline`.

---

## 4. Spacing, Radius & Elevation System

### 4.1 4px Spacing Grid
All paddings, margins, gaps, and dimensions align strictly to multiples of 4px:
- `space-1` = 4px
- `space-2` = 8px
- `space-3` = 12px
- `space-4` = 16px
- `space-6` = 24px
- `space-8` = 32px
- `space-12` = 48px
- `space-16` = 64px

### 4.2 Corner Radius Scale
- `rounded-xs`: 4px (Chips, citation tags, keyboard shortcut hints)
- `rounded-sm`: 6px (Buttons, text inputs, status badges)
- `rounded-md`: 8px (Cards, popovers, dropdown menus)
- `rounded-lg`: 12px (Panels, modal sheets)
- `rounded-xl`: 16px (App workspace frames, dialogs)
- `rounded-full`: 9999px (Pills, avatar placeholders)

### 4.3 Elevation & Borders (No Glassmorphism)
- **Base Level (Level 0)**: Flat background `--bg-surface` with `1px solid var(--border-subtle)`.
- **Raised Level (Level 1)**: `--bg-surface-raised` with `1px solid var(--border-subtle)` + subtle shadow: `box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.3)`.
- **Overlay Level (Level 2)**: Dialogs, Command Palettes, Toasts: `1px solid var(--border-strong)` + `box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5)`.
- **Zero Glassmorphism**: No backdrop filters with high blur and semi-transparent milky overlays. Translucency is restricted only to sticky topbars (`backdrop-blur-sm bg-app/80`).

---

## 5. Motion & Micro-interaction Rules

- **Duration**: Standard transitions run at **150ms to 200ms**. Complex drawer expansions run at **250ms**.
- **Timing Function**: Smooth ease-out (`cubic-bezier(0.16, 1, 0.3, 1)` or `ease-out`).
- **Purposeful Motion Only**: Motion is applied only to convey functional state changes (e.g. agent node active pulsing, collapsible drawer slides, toast entry, command palette scale-in). No ambient floating shapes.
- **Accessibility**: All animations **MUST** wrap in `@media (prefers-reduced-motion: reduce)` to disable transitions and animations for users sensitive to motion.

---

## 6. Tiered LLM Provider Architecture: Cloud-First with Local RTX 5060 Fallback

Per user specification, ResearchPilot AI implements a **tiered dual-mode inference architecture**:

```
+--------------------------------------------------------------------------+
|                        RESEARCH WORKSPACE QUERY                          |
+--------------------------------------------------------------------------+
                                     |
                                     v
                  +--------------------------------------+
                  |   TIER 1: HIGH-SPEED CLOUD OLLAMA    |
                  |   - Low-cost, high-throughput cloud  |
                  |     compatible models                |
                  |   - Latency: < 400ms TTFT            |
                  |   - Zero local VRAM burden           |
                  +--------------------------------------+
                                     |
                   Quota Exceeded / Network Drop / Offline?
                                     |
                                     v [Automatic Seamless Fallback]
                  +--------------------------------------+
                  |   TIER 2: LOCAL NVIDIA RTX 5060      |
                  |   - Model: Qwen3:8B (Q4_K_M, 5.2GB)  |
                  |   - Embeddings: nomic-embed-text     |
                  |   - Concurrency Semaphore = 1        |
                  |   - 100% Offline, Zero Cloud Cost    |
                  +--------------------------------------+
```

### UX Implementation:
1. **Model Switcher & Quota Indicator**: In the top navigation and research workspace, a persistent micro-pill shows:
   - `CLOUD (FAST)` with active quota indicator and ping latency.
   - `LOCAL (RTX 5060)` when running in local-only or fallback mode.
2. **Auto-Fallback Banner**: If cloud credits expire or the API rate-limits mid-session, the workspace seamlessly routes remaining agent iterations to local Ollama with a non-intrusive toast: *"Cloud quota reached. Seamlessly switched to local Qwen3:8B on RTX 5060."*
3. **Settings Controls**: User can configure:
   - Inference Preference: `Cloud First (Fastest)`, `Local Only (Air-Gapped)`, `Cloud Only`.
   - Max Cloud Spend Threshold ($/month or token ceiling).

---

## 7. Component Visual Specifications (3 Key Components)

### Component 1: Agent Graph Execution Node (Live LangGraph Node)

```
+------------------------------------------------------------------+
|  [O] RESEARCH AGENT                                   1.42s  [v] |
|  Status: Ingesting web sources (4/5)                             |
|  ............................................................... |
|  Tool: SearXNG metasearch | Query: "pgvector hnsw m=16 ef=64"    |
|  Memory: 412 tokens       | Model: Cloud Qwen2.5-Coder (Fast)    |
+------------------------------------------------------------------+
```
- **Structure**: 1px subtle zinc border, dark surface background (`#121215`), emerald left status indicator (or pulsing dot while running).
- **Header**: Monospace agent name, elapsed wall-clock execution time (`1.42s` in tabular numbers), status badge (`RUNNING`, `DONE`, `REVISION 2/3`).
- **Subtext**: Currently executing tool call and query in `font-mono text-xs text-muted`.

### Component 2: Verified Source Card & Inline Citation Chip

```
Report Body:
"Hierarchical Navigable Small World (HNSW) graphs construct multi-layered
proximity graphs that offer sub-linear search time at the expense of higher
memory footprint during index building [1]."
                                       ^^^ (Hover: Popover Card)

+------------------------------------------------------------------+
|  SOURCE [1]  arxiv.org/abs/1603.09320               89% Verified |
|  Efficient and robust approximate nearest neighbor search...     |
|  --------------------------------------------------------------- |
|  "HNSW provides logarithmic scaling of query latency while       |
|   retaining 98%+ recall compared to flat scan methods..."        |
|  Page 4, Paragraph 2 | Sha256: e3b0c442... | [Open Source Drawer]|
+------------------------------------------------------------------+
```
- **Inline Citation Chip**: `[1]` rendered as a compact pill button (`bg-surface-raised border border-subtle text-accent text-xs font-mono px-1.5 py-0.5 rounded`).
- **Popover & Drawer Card**: Displays the exact verbatim excerpt verified by the Reviewer Agent, page offset, source hash, and domain favicon.

### Component 3: Model Selector & Tiered Fallback Configuration Card

```
+------------------------------------------------------------------+
|  INFERENCE ENGINE & MODEL ROUTING                                |
+------------------------------------------------------------------+
|  (o) Tier 1: Ollama Cloud (Fast & Low Cost)                      |
|      Default for rapid agent drafting and literature search.     |
|      Active Model: qwen2.5:7b-fast      Status: Connected (32ms) |
|                                                                  |
|  [x] Auto-Fallback to Local RTX 5060 when cloud quota expires    |
|      Local Model: qwen3:8b (Q4_K_M)     VRAM: 5.2GB / 8.1GB      |
|      Embeddings: nomic-embed-text (Local, 274MB)                 |
+------------------------------------------------------------------+
```
- **Structure**: Radio / switch group with clear tier distinctions, real-time VRAM meter from backend `/ready` endpoint, and cloud latency badge.

---

## 8. Screen Architecture & Information Layouts

1. **App Shell**: 240px collapsible sidebar (Linear-style icons + labels, workspace switcher, system status dot), 48px slim topbar with breadcrumb trail, global `Cmd+K` command palette, theme switcher.
2. **Landing Page**: Non-centered, left-anchored hero with functional query input, interactive architecture SVG diagram showing the 5-node agent pipeline, and real example queries.
3. **Workspace (Signature 3-Panel)**:
   - **Left Panel (280px)**: Research questions, dynamic plan steps, execution progress.
   - **Center Panel (Flex 1)**: Interactive React Flow agent graph with animated execution edges + streaming markdown feed below.
   - **Right Panel (360px)**: Collapsible Source Drawer with extraction status, credibility scoring, and verification badges.
4. **Report Viewer**: 2-column layout with scroll-spy Table of Contents, interactive citations with hover cards, export controls (PDF, Markdown), and reviewer verification verdict panel.
