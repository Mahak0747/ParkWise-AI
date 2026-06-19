# ParkWise AI — Design Guide

**Theme:** Dark Command Center · Smart City Operations · Palantir × Tesla × Linear

---

## Design Philosophy

ParkWise AI is an operational tool for traffic enforcement officers, not a
consumer app. The design prioritises:

- **Information density over whitespace** — officers need to scan many
  data points at a glance.
- **Severity colour as a communication system** — colour is never decorative;
  every hue carries a specific enforcement meaning.
- **Monospace numerics** — all KPI values use JetBrains Mono to create a
  data-terminal aesthetic and improve scanability of changing numbers.
- **Glassmorphism for depth** — translucent panels with blur create a layered
  spatial hierarchy without heavyweight shadows.

---

## Colour Palette

### Base

| Name | Hex | Usage |
|---|---|---|
| `background` | `#0B1120` | Page / app background |
| `surface` | `#1E293B` | Card / panel background |
| `surface-2` | `#243044` | Elevated / hover state |
| `border` | `rgba(255,255,255,0.06)` | Default card border |
| `border-hover` | `rgba(255,255,255,0.12)` | Hover / focus border |

### Accent

| Name | Hex | Usage |
|---|---|---|
| `accent` | `#3B82F6` | Primary CTA, nav active, data bars |
| `accent-dark` | `#1D4ED8` | Gradient end, brand icon |

### Severity System

| Severity | Hex | Tailwind class | Usage |
|---|---|---|---|
| Critical | `#EF4444` | `text-critical / bg-critical` | Immediate tow + officer |
| High | `#F97316` | `text-high / bg-high` | Issue e-Challan |
| Medium | `#FACC15` | `text-medium / bg-medium` | Send notification |
| Low | `#22C55E` | `text-low / bg-low` | Warning only |

### Text

| Role | Value |
|---|---|
| Primary | `#E2E8F0` (slate-200) |
| Secondary | `#94A3B8` (slate-400) |
| Muted | `#64748B` (slate-500) |
| Disabled | `#374151` (gray-700) |

---

## Typography

### Typefaces

| Role | Family | Weights | Usage |
|---|---|---|---|
| Display / UI | Inter | 400, 500, 600, 700 | All labels, headings, body |
| Data / Metrics | JetBrains Mono | 400, 500, 600 | KPI values, coordinates, IDs |

Loaded from Google Fonts in `index.html`. No local font files required.

### Type Scale

| Element | Size | Weight | Line height |
|---|---|---|---|
| Page title | 20px / 1.25rem | 600 | 1.3 |
| Card heading | 13px / 0.8125rem | 600 | 1.4 |
| KPI value | 26px / 1.625rem | 700 (mono) | 1 |
| Body / label | 13px / 0.8125rem | 400–500 | 1.5 |
| Caption / sub | 11–12px | 400 | 1.4 |
| Nav item | 13px | 500 | — |

---

## Iconography

**Library:** Lucide React — consistent 16×16 stroke icons throughout.

| Page | Icon | Usage |
|---|---|---|
| Dashboard | `LayoutDashboard` | Nav item |
| Hotspot Map | `Map`, `MapPin`, `Target` | Nav + page header |
| Analytics | `BarChart3`, `TrendingUp`, `Building2`, `PieChart` | Charts headers |
| Model Insights | `Brain`, `Cpu`, `CheckCircle`, `Award` | Section headers |
| Vehicle Search | `Car`, `Search`, `AlertCircle` | Page + search |
| Settings | `Settings`, `Server`, `Database`, `RefreshCw` | Page + panels |
| KPI Cards | `AlertTriangle`, `Users`, `Activity`, `TrendingDown` | Card icons |
| Layout | `Shield`, `Bell`, `Search`, `User` | Sidebar brand + TopBar |

Icon size conventions:
- Page header: `size={18}`
- Card heading: `size={14–15}`
- Inline / labels: `size={12–13}`

---

## Components

### GlassCard

```
background: rgba(30, 41, 59, 0.7)
backdrop-filter: blur(12px)
border: 1px solid rgba(255, 255, 255, 0.06)
border-radius: 12px
padding: 20px
```

On hover (when `hover` prop is true):
```
border-color: rgba(255,255,255,0.12)
background: rgba(36,48,68,0.8)
```

### GlassStrong (map popup)

```
background: rgba(30, 41, 59, 0.9)
backdrop-filter: blur(20px)
border: 1px solid rgba(255, 255, 255, 0.08)
border-radius: 12px
```

### SeverityBadge

```
display: inline-flex
padding: 2px 8px (md) / 2px 6px (sm)
border-radius: 6px
font-size: 11px
font-weight: 700
border: 1px solid <severity>/30
background: <severity>/20
color: <severity>
```

### KpiCard

```
Structure:
  Icon row (40×40 rounded-xl, severity-tinted bg)
  Value (JetBrains Mono 26px, severity colour)
  Label (Inter 13px slate-300)
  Sub (Inter 11px slate-600)

Animation:
  Entrance: opacity 0→1, y 16→0, 500ms easeOut (staggered by 100ms)
  Value: useMotionValue(0) → animate to target, 1.5s easeOut
  Hover: y –2, 200ms
```

### NavItem (active)

```
background: rgba(59, 130, 246, 0.10)
color: #3B82F6
border: 1px solid rgba(59, 130, 246, 0.20)
border-radius: 8px
```

Active indicator: a `motion.div` with `layoutId="nav-indicator"` — a 6×6 blue
dot that animates between nav items via shared layout animation.

---

## Animations

All animations use Framer Motion. Hierarchy:

| Animation | Where | Config |
|---|---|---|
| Page fade-in | Every page root `<div>` | `opacity: 0→1, y: -8→0, 400ms` |
| KPI card entrance | Dashboard grid | `opacity: 0→1, y: 16→0, 500ms, stagger 100ms` |
| KPI counter | KpiCard value | `useMotionValue + animate, 1500ms easeOut` |
| Card hover | GlassCard (hover=true) | `y: 0→-2, 200ms` |
| Hotspot list items | Dashboard + side panel | `opacity: 0→1, x: -8→0, stagger 60ms` |
| Nav active dot | Sidebar | `layoutId shared layout, spring` |
| Slide-up popup | HotspotMap detail | `opacity: 0→1, y: 20→0, 300ms` |
| Model metric bars | ModelInsights | `width: 0→target%, delay + 60ms stagger` |
| Feature bars | Analytics | `width: 0→target%, 600ms` |

**Reduced motion:** All animations respect `prefers-reduced-motion` via Framer
Motion's built-in detection (no extra config needed).

---

## Layout

### Shell

```
┌─────────────────────────────────────────────────────────────────┐
│  Sidebar (240px, fixed, full height)                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  TopBar (full width, 56px, sticky)                       │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  Main content (overflow-y: auto, padding: 24px)         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Grid patterns

| Pattern | Used on |
|---|---|
| `grid-cols-5` | Dashboard KPI row |
| `grid-cols-2` | Dashboard bottom row, Settings panels |
| `grid-cols-3` | Model Insights model comparison, workflow |
| `grid-cols-4` | Model Insights severity pipeline |
| `grid-cols-3` (lg: `grid-cols-2`) | Analytics top row |
| Map + side panel: `1fr 288px` | Hotspot Map |

### Spacing

- Page padding: `24px` all sides
- Card padding: `20px`
- Card gap: `14–16px`
- Section gap: `24px`
- Inner component gap: `8–12px`

---

## Leaflet Map Styling

The OpenStreetMap tile layer is inverted to dark mode using CSS filters applied
to `.leaflet-tile-pane`:

```css
filter: brightness(0.7) saturate(0.4) invert(1) hue-rotate(180deg);
```

This converts the OSM light tiles to a dark navy palette that matches the
`#0B1120` background without requiring a paid dark tile provider.

Popups are overridden globally:

```css
.leaflet-popup-content-wrapper {
  background: #1E293B;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  color: #E2E8F0;
}
```

---

## Recharts Dark Theme

All charts use a shared `DARK_TOOLTIP` config:

```typescript
contentStyle: {
  background: '#1E293B',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '8px',
  fontSize: '12px',
}
```

Axes use `fill: '#64748B'` (slate-500) for tick labels with `axisLine={false}` and
`tickLine={false}` to eliminate axis chrome.

Grid lines: `stroke: 'rgba(255,255,255,0.05)'` with `strokeDasharray="3 3"`.

---

## Scrollbar

Custom 4px scrollbar matching the dark theme:

```css
::-webkit-scrollbar       { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: #0B1120; }
::-webkit-scrollbar-thumb { background: #334155; border-radius: 2px; }
```

---

## Responsive Behaviour

The layout is designed for wide desktop screens (≥ 1280px). Below that:

- KPI grid collapses: `grid-cols-2` on lg, `grid-cols-5` on xl
- Analytics charts reflow to single column below lg
- Hotspot Map side panel stays fixed at 288px; map flex-fills remaining width
- Sidebar does not collapse in Phase 3 (mobile sidebar planned for Phase 4)

---

## Accessibility

- All interactive elements have keyboard focus styles (browser default, not
  suppressed).
- Colour is never the only differentiator — severity badges also include the
  text label.
- `aria-label` attributes on icon-only buttons (TopBar bell, close buttons).
- Framer Motion respects `prefers-reduced-motion`.
