# ParkWise AI — Frontend Implementation

**Date:** 2026-06-18
**Connects to:** Backend Phase  (FastAPI on port 8000)

---

## Folder Structure

```
frontend/
├── index.html                        # Vite entry point — loads Google Fonts + Leaflet CSS
├── package.json                      # Dependencies (no Redux/Zustand/React Query)
├── vite.config.ts                    # Dev server on :5173; proxy /api and /health → :8000
├── tailwind.config.js                # Dark palette + custom tokens
├── postcss.config.js
├── tsconfig.json
├── tsconfig.node.json
├── public/
│   └── favicon.svg                   # Blue gradient P icon
└── src/
    ├── main.tsx                      # ReactDOM.createRoot entry
    ├── App.tsx                       # BrowserRouter + 6 routes
    ├── index.css                     # Tailwind base + glassmorphism utilities + Leaflet overrides
    │
    ├── types/
    │   └── index.ts                  # All TypeScript interfaces matching backend Pydantic schemas
    │
    ├── services/
    │   └── api.ts                    # Axios client — all backend fetch functions
    │
    ├── hooks/
    │   └── useApi.ts                 # useApi, useApiWithParams, useInterval, usePollingApi
    │
    ├── components/
    │   ├── layout/
    │   │   ├── Layout.tsx            # Shell: Sidebar + TopBar + <Outlet />
    │   │   ├── Sidebar.tsx           # NavLinks with framer-motion active indicator
    │   │   └── TopBar.tsx            # Live IST clock + search bar + user avatar
    │   ├── cards/
    │   │   ├── KpiCard.tsx           # Animated counter card (useMotionValue)
    │   │   └── SharedUI.tsx          # GlassCard, SeverityBadge, LoadingSpinner, ErrorState,
    │   │                             #   SectionHeader, StatRow
    │   ├── charts/
    │   │   └── Charts.tsx            # ViolationsLineChart, StationBarChart, DayBarChart,
    │   │                             #   SeverityPieChart, ModelRadarChart, FeatureImportanceBar
    │   └── map/
    │       └── MapComponents.tsx     # HotspotMarkerLayer, MapOverlayStats, fixLeafletIcon,
    │                                 #   BENGALURU_CENTER, BENGALURU_ZOOM
    │
    └── pages/
        ├── Dashboard.tsx             # /          — KPI cards + top hotspots + system intel
        ├── HotspotMap.tsx            # /map       — Leaflet map + side panel + detail popup
        ├── Analytics.tsx             # /analytics — 4 Recharts charts from /api/analytics
        ├── ModelInsights.tsx         # /model     — model comparison + radar + feature importance
        ├── VehicleSearch.tsx         # /vehicles  — mock data (no backend endpoint)
        └── Settings.tsx              # /settings  — real health/overview/analytics data
```

---

## Pages

### Dashboard (`/`)

**Data source:** `GET /api/overview` + `GET /api/hotspots?limit=5&min_severity=Critical`

**Refreshes every:** 60 seconds

**Components:**
- 5 × `KpiCard` — animated counter with framer-motion `useMotionValue`
- Top 5 critical hotspots list
- System intelligence panel (static facts + live model/cache status)
- Enforcement level legend

**KPIs displayed:**
| Card | Backend field |
|---|---|
| Active Violations | `active_violations` |
| Critical Hotspots | `critical_hotspots` |
| Officers Deployed | `officers_deployed` |
| Average PCI Score | `average_pci` |
| Congestion Reduction | `estimated_congestion_reduction_pct` |

---

### Hotspot Map (`/map`)

**Data source:** `GET /api/hotspots?limit=100`

**Components:**
- `react-leaflet` `MapContainer` centered on Bengaluru (12.9716, 77.5946) zoom 12
- Custom `L.divIcon` markers sized and colored by severity
- Severity filter buttons (All / Critical / High / Medium / Low)
- Side panel: top 10 hotspots by priority score
- Framer-motion slide-up detail popup on marker click

**Marker sizes:**
| Severity | Diameter |
|---|---|
| Critical | 20 px + glow |
| High | 16 px + glow |
| Medium | 13 px |
| Low | 10 px |

**Map tile:** OpenStreetMap with CSS `brightness(0.7) saturate(0.4) invert(1) hue-rotate(180deg)` dark filter

---

### Analytics (`/analytics`)

**Data source:** `GET /api/analytics`

**Charts:**
| Chart | Type | Data field |
|---|---|---|
| Violations by Hour | Line chart | `violations_by_hour` |
| Severity Distribution | Donut pie | `severity_distribution` |
| Top 10 Stations | Horizontal bar | `violations_by_station` |
| Violations by Day | Vertical bar | `violations_by_day` |
| Feature Importance | Custom progress bars | `feature_importance` |

---

### Model Insights (`/model`)

**Data source:**
- `GET /api/analytics` → `feature_importance` (live from `model.feature_importances_`)
- `model_metrics.csv` values hard-coded (no backend endpoint for raw CSV — values are immutable)

**Sections:**
- 3-model comparison cards (RandomForest, **GradientBoosting**, ExtraTrees) with metric bars
- `ModelRadarChart` — performance radar for selected model
- Feature importance bar list
- Severity → enforcement action matrix (4 severity cards)
- Model workflow pipeline (6-step arrow flow)
- Tabular stats: training data, feature count, sklearn version, etc.

---

### Vehicle Search (`/vehicles`)

**Note:** The Phase 2 backend has no `/api/offenders` endpoint. This page uses 5 realistic mock records derived from real Bengaluru dataset patterns (vehicle numbers, station names, violation types).

**Mock data fields:** vehicle_number, violation_count, risk_category, last_station, severity, violations[], recommendation

**Risk categories follow real business rules:**
- 1 offense → Warning
- 2 offenses → Challan
- 3 offenses → Tow Recommendation
- 4+ offenses → High-Risk Offender

---

### Settings (`/settings`)

**Data source:** `GET /health` + `GET /api/overview` + `GET /api/analytics`

**Sections:**
- Backend status (online/offline indicator from `/health`)
- ML model info (model_loaded, feature columns, F1 score)
- Cache status (cache_loaded, dataset rows, cluster count, dates)
- API endpoint reference table with HTTP methods

---

## Components

### `KpiCard`

Animated numeric counter using `framer-motion`'s `useMotionValue` and `useTransform`. Supports `number`, `decimal`, and `percent` format modes. Accepts delay prop for staggered entrance animation.

### `GlassCard`

Glassmorphism container: `background: rgba(30,41,59,0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.06)`. Wraps framer-motion `initial`/`animate` with configurable delay.

### `SeverityBadge`

Color-coded pill from `SEVERITY_BG` map. Supports `sm` and `md` sizes. Colors: Low=green, Medium=yellow, High=orange, Critical=red.

### `HotspotMarkerLayer` (map component)

Manages a Leaflet `LayerGroup` imperatively inside a `useMap()` hook. Cleans up on hotspot list change. Adds hover scale animation via DOM style manipulation (avoids re-render cost). Renders pulse ring for selected marker.

### Shared chart components

All charts in `Charts.tsx` share `DARK_TOOLTIP` style object for consistent dark-themed Recharts tooltips.

---

## API Integration

```typescript
// src/services/api.ts
import axios from 'axios'

const api = axios.create({ baseURL: '', timeout: 30000 })

fetchHealth()    → GET /health
fetchOverview()  → GET /api/overview
fetchHotspots()  → GET /api/hotspots  (params: limit, min_severity, station)
fetchAnalytics() → GET /api/analytics
postPredict()    → POST /api/predict
```

All requests proxy through Vite dev server to `http://localhost:8000` via `vite.config.ts`.

---

## Dependencies

```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-router-dom": "^6.26.1",
  "axios": "^1.7.7",
  "react-leaflet": "^4.2.1",
  "leaflet": "^1.9.4",
  "recharts": "^2.12.7",
  "lucide-react": "^0.441.0",
  "framer-motion": "^11.5.4"
}
```

**Not used (as required):** Redux, Zustand, React Query, Bootstrap, Material UI, Plotly, Next.js

---

## Setup Instructions

### Prerequisites

- Node.js ≥ 18
- Backend running on port 8000 (`python -m uvicorn backend.main:app --reload --port 8000`)

### Install & Run

```bash
# From project root
cd frontend
npm install
npm run dev
```

App opens at **http://localhost:5173**

### Build for Production

```bash
npm run build
# Output in frontend/dist/
npm run preview  # preview production build locally
```

### Environment

No `.env` required. Backend URL is proxied via `vite.config.ts`:

```typescript
proxy: {
  '/api': { target: 'http://localhost:8000', changeOrigin: true },
  '/health': { target: 'http://localhost:8000', changeOrigin: true },
}
```

For production, set `VITE_API_BASE` and update `api.ts` `baseURL` accordingly.

---

## Design Tokens

| Token | Value | Usage |
|---|---|---|
| `background` | `#0B1120` | Page background |
| `surface` | `#1E293B` | Card background |
| `accent` | `#3B82F6` | Primary actions, nav active |
| `critical` | `#EF4444` | Critical severity |
| `high` | `#F97316` | High severity |
| `medium` | `#FACC15` | Medium severity |
| `low` | `#22C55E` | Low severity / success |

---

## Known Limitations

1. **Vehicle Search** uses mock data — no `/api/offenders` endpoint in Phase 2 backend.
2. **Map tiles** require internet connection (OpenStreetMap CDN).
3. **First map render** may flash unstyled before CSS dark filter applies — cosmetic only.
4. **Backend startup** takes ~25s to load parquet cache; dashboard will show loading state during this window.
