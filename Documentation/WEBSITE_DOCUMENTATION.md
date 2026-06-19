# ParkWise AI — Website Documentation

**Project:** ParkWise AI — AI-Powered Illegal Parking Enforcement Command Center
**Organisation:** Bengaluru Traffic Police
**Hackathon Phase:** Phase 3 (Frontend) — complete
**Dataset:** 298,450 real Bengaluru parking violation records (Nov 2023 – May 2024)

---

## Project Overview

ParkWise AI transforms a trained machine learning pipeline into an operational
**Smart City Command Center** for Bengaluru Traffic Police. It ingests 298,450
real violation records, runs them through a GradientBoostingClassifier (F1 =
99.11 %), and surfaces actionable enforcement intelligence — not model metrics.

The platform answers three operational questions:

1. **Where** are the worst illegal parking hotspots right now?
2. **What** enforcement action should officers take at each location?
3. **Which** repeat offenders should be prioritised?

---

## Features

| Feature | Description |
|---|---|
| Live KPI Dashboard | 5 animated command-center KPIs from real cached predictions |
| Interactive Hotspot Map | Leaflet map with up to 100 severity-coded cluster markers across Bengaluru |
| Enforcement Recommendations | Per-hotspot action: Warning → Notification → e-Challan → Tow + Officer |
| Analytics Dashboard | 5 Recharts charts — violations by hour, day, station, severity, and feature importance |
| Model Insights | GradientBoosting performance, 3-model comparison, live feature importance from model.pkl |
| Vehicle Search | Risk-category lookup with real business escalation rules |
| System Settings | Real-time backend health, cache status, model status, API reference |
| Dark Command Center UI | Glassmorphism, Framer Motion animations, IST live clock, severity colour coding |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FRONTEND  (React + TypeScript)                    │
│  React Router v6  ·  Axios  ·  Recharts  ·  React-Leaflet          │
│  Framer Motion  ·  Lucide React  ·  TailwindCSS                     │
│                                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │Dashboard │ │HotspotMap│ │Analytics │ │  Model   │ │Settings  │  │
│  │/         │ │/map      │ │/analytics│ │/model    │ │/settings │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTP  (Vite proxy → localhost:8000)
                               │ GET /health
                               │ GET /api/overview
                               │ GET /api/hotspots
                               │ GET /api/analytics
                               │ POST /api/predict
┌──────────────────────────────▼──────────────────────────────────────┐
│                     BACKEND  (FastAPI)                               │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Routers: /health · /api/overview · /api/hotspots           │    │
│  │           /api/analytics · /api/predict                     │    │
│  └───────────────────────────┬─────────────────────────────────┘    │
│                              │                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Services: HotspotService · OverviewService · AnalyticsService│   │
│  └───────────────────────────┬─────────────────────────────────┘    │
│                              │                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  ML Layer: ModelRegistry (GradientBoostingClassifier)       │    │
│  │            app_utils.predict_severity / batch_predict       │    │
│  └───────────────────────────┬─────────────────────────────────┘    │
│                              │                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Data: processed_violations.parquet (298,450 rows, ~16 MB)  │    │
│  │        model.pkl (GradientBoosting, 16 features)            │    │
│  └─────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Backend → Frontend Data Flow

### Dashboard KPIs

```
processed_violations.parquet
    └── severity_level IN ('High','Critical') → active_violations
    └── grid clusters WHERE severity = 'Critical' → critical_hotspots
    └── mean(pci_score) → average_pci
    └── officers_seed.json (Available + Busy) → officers_deployed
    └── critical PCI × 0.35 → estimated_congestion_reduction_pct
```

### Hotspot Map

```
processed_violations.parquet
    └── GROUP BY (lat_grid, lon_grid)  [~18,000 clusters]
    └── SORT BY priority_score DESC
    └── LIMIT 75–100
    └── → lat/lon/severity/confidence/pci_score/violation_count/recommendation
    └── → React-Leaflet markers, colour-coded by severity
```

### Analytics Charts

```
processed_violations.parquet
    └── GROUP BY hour → violations_by_hour (line chart)
    └── GROUP BY day_of_week → violations_by_day (bar chart)
    └── GROUP BY police_station → violations_by_station (horizontal bar)
    └── COUNT severity_level → severity_distribution (pie chart)
model.pkl → model.feature_importances_ → feature_importance (bar list)
```

### Model Insights

```
model_metrics.csv (static, 3 rows) → comparison cards + radar chart
GET /api/analytics → feature_importance → live from model.pkl
```

---

## Technology Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | React 18 + TypeScript | Type safety, component model |
| Build | Vite 5 | Fast HMR, easy proxy config |
| Styling | TailwindCSS 3 | Utility-first, dark mode, custom tokens |
| Routing | React Router v6 | File-based-style routing without Next.js |
| HTTP | Axios | Interceptor support, timeout config |
| Maps | React-Leaflet 4 + Leaflet 1.9 | Best React map library, custom markers |
| Charts | Recharts 2 | Composable, dark-theme-friendly |
| Animation | Framer Motion 11 | Production-quality motion primitives |
| Icons | Lucide React | Consistent stroke-based icon set |

---

## Page Descriptions

### Dashboard (`/`)

The command center landing page. Five animated KPI cards pull live data from
`/api/overview`. A secondary panel lists the five most critical hotspots
(from `/api/hotspots?min_severity=Critical`). A system intelligence panel
shows model and cache status. All numbers auto-refresh every 60 seconds.

### Hotspot Map (`/map`)

A full-screen Leaflet map centered on Bengaluru (12.97°N, 77.59°E). Markers are
sized and colour-coded by severity. A filter bar lets operators narrow to a
single severity tier. Clicking any marker triggers a slide-up detail card with
violation count, PCI score, confidence, coordinates, and the recommended
enforcement action. A side panel lists the top 10 hotspots by priority score.

### Analytics (`/analytics`)

Four Recharts visualisations built from `/api/analytics` aggregations:
- **Line chart** — violation frequency across the 24-hour day cycle
- **Donut pie** — Low/Medium/High/Critical distribution
- **Horizontal bar** — top 10 police stations by total violation count
- **Vertical bar** — violations by day of week
- **Feature importance bars** — live from `model.feature_importances_`

### Model Insights (`/model`)

Transparent model accountability page. Shows side-by-side comparison of
RandomForest, GradientBoosting, and ExtraTrees (from `model_metrics.csv`).
Highlights GradientBoosting as the selected model with a performance radar chart.
Explains the four severity levels and their enforcement mappings. Displays the
six-step inference workflow pipeline.

### Vehicle Search (`/vehicles`)

Repeat-offender lookup with a searchable mock dataset. Displays violation
history, risk category, last station, and recommended action following the
real escalation rules (Warning → Challan → Tow → High-Risk). A clearly
marked notice explains no backend endpoint exists yet for this feature.

### Settings (`/settings`)

Live system health panel. Calls `/health`, `/api/overview`, and `/api/analytics`
to show real backend status, model load state, cache row count, and cluster
statistics. Includes a reference table of all API endpoints with HTTP methods.

---

## Future Scope

| Feature | Phase |
|---|---|
| `/api/offenders` endpoint — real vehicle repeat-offender lookup | Phase 3+ |
| Officer deployment workflow — assign officers to incidents via UI | Phase 3+ |
| Live incident queue — create, track, and resolve parking incidents | Phase 3+ |
| SMS/notification preview — generate warning SMS from violation data | Phase 3+ |
| Simulation endpoint — before/after congestion impact estimator | Phase 3+ |
| WebSocket live feed — real-time violation event stream | Phase 4 |
| Mobile app (React Native) for field officers | Phase 5 |
| Multi-city expansion beyond Bengaluru | Phase 6 |

---

## Running the Full Stack

```bash
# 1. Start backend (from project root — Traffic Bengaluru/)
pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --reload --port 8000

# 2. Start frontend (in a second terminal)
cd frontend
npm install
npm run dev

# 3. Open browser
open http://localhost:5173
```

**Note:** Backend first startup may take ~17 minutes to build the parquet cache.
Subsequent startups load in ~25 seconds. The frontend shows a loading state
during this window.

---

## Hackathon Submission Notes

- All severity, confidence, and PCI values originate from `model.pkl` via
  `app_utils.predict_severity()` — zero hardcoded predictions.
- All map coordinates, police station names, and junction names are real
  Bengaluru data from the original violation dataset.
- The frontend never invents API routes — it only calls the four endpoints
  actually implemented in Phase 2.
- Vehicle Search is the only page using mock data, and it is clearly labelled.
