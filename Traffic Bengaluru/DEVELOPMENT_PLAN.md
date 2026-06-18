# ParkWise AI — Development Plan

**Project:** ParkWise AI — AI-Powered Parking Enforcement Command Center  
**Location:** Bengaluru Traffic Police Operations  
**Phase:** 1 — Repository Analysis & Architecture (No Code Yet)  
**Date:** 2026-06-18

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Repository State](#2-current-repository-state)
3. [ML Pipeline Analysis](#3-ml-pipeline-analysis)
4. [Dataset Profile](#4-dataset-profile)
5. [Model Artifacts](#5-model-artifacts)
6. [Critical Gaps & Design Decisions](#6-critical-gaps--design-decisions)
7. [Target Architecture](#7-target-architecture)
8. [Backend Design](#8-backend-design)
9. [API Specification](#9-api-specification)
10. [Frontend Design](#10-frontend-design)
11. [Operational Systems](#11-operational-systems)
12. [Performance Strategy](#12-performance-strategy)
13. [Implementation Phases](#13-implementation-phases)
14. [Project Structure](#14-project-structure)
15. [Dependencies & Environment](#15-dependencies--environment)
16. [Risks & Mitigations](#16-risks--mitigations)
17. [Acceptance Criteria](#17-acceptance-criteria)

---

## 1. Executive Summary

ParkWise AI transforms an existing **Smart Parking ML pipeline** (trained on **298,450 real Bengaluru parking violation records**) into a **production-quality operational command center** — not an ML dashboard.

### What Exists Today

| Asset | Purpose |
|---|---|
| `jan to may police violation_anonymized791b166.csv` | 298,450 anonymized violation records (Nov 2023 – May 2024) |
| `train_model.py` | Full feature engineering + training pipeline |
| `app_utils.py` | Inference utilities (`load_model`, `predict_severity`, etc.) |
| `model.pkl` | Pickled bundle — **GradientBoostingClassifier** (best model) |
| `model_metrics.csv` | Model comparison metrics |
| `SmartParking_ML_Pipeline.ipynb` | Exploratory notebook mirroring the pipeline |

### What Does Not Exist Yet

- FastAPI backend
- React/TypeScript frontend
- API layer, incident workflow, officer system, notification center
- Precomputed hotspot cache
- Deployment configuration

### Guiding Principles

1. **Real model inference only** — every severity/confidence/PCI value comes from `model.pkl` via `app_utils.py`
2. **Real Bengaluru data only** — police stations, junctions, coordinates from the dataset
3. **Reuse existing feature engineering** — import logic from `train_model.py`; do not invent new formulas
4. **Operational UX first** — command center for enforcement, not a model evaluation dashboard
5. **Performance by design** — never render 298k map markers; serve aggregated hotspot clusters

---

## 2. Current Repository State

```
Traffic Bengaluru/
├── app_utils.py                          # Inference + recommendation engine
├── train_model.py                        # Training + feature engineering pipeline
├── model.pkl                             # 1.7 MB — trained model bundle
├── model_metrics.csv                     # 3-model comparison metrics
├── jan to may police violation_anonymized791b166.csv   # 109 MB raw data
├── SmartParking_ML_Pipeline.ipynb        # Notebook prototype
└── DEVELOPMENT_PLAN.md                   # This document
```

**Repository maturity:** ML pipeline complete; application layer is greenfield.

---

## 3. ML Pipeline Analysis

### 3.1 End-to-End Pipeline Flow

```
Raw CSV (298,450 rows)
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│  FEATURE ENGINEERING  (train_model.py)                  │
│  ─────────────────────────────────────────────────────  │
│  1. add_time_features()         → hour, day_of_week,    │
│                                   is_weekend, time_of_day│
│  2. compute_hotspot_features() → lat/lon grid (~250m),  │
│                                   historical_violation_count│
│  3. location_type_from_junction() → Junction, Street,   │
│                                   Transit Hub, etc.     │
│  4. synthesize_simulation_features() → traffic_volume,│
│                                   average_speed,         │
│                                   parking_occupancy,     │
│                                   road_width, nearby_event│
│                                   illegal_vehicle_count  │
│  5. derive_delay_score()                               │
│  6. assign_severity()         → rule-based target label  │
│  7. compute_pci()             → PCI score + category     │
└─────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│  PREPROCESSING                                          │
│  Label-encode: location_type, time_of_day               │
│  16 feature columns → model input vector                │
└─────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│  MODEL TRAINING (3 candidates)                          │
│  RandomForest | GradientBoosting | ExtraTrees           │
│  Best by F1 → GradientBoosting → saved as model.pkl     │
└─────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│  INFERENCE (app_utils.py)                               │
│  load_model() → predict_severity() → recommend_action() │
│  compute_pci_single() | batch_predict()                 │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Raw Dataset Columns (24 fields)

| Column | Used In Pipeline | Notes |
|---|---|---|
| `id` | Incident ID | Primary key for workflow |
| `latitude`, `longitude` | Hotspot clustering, map | Real Bengaluru coordinates |
| `location` | Display | Full address string |
| `vehicle_number` | Repeat offender engine | Anonymized (FKN00GLxxxx) |
| `vehicle_type` | `vehicle_weight` feature | CAR, SCOOTER, MOTOR CYCLE, etc. |
| `violation_type` | `violation_score` feature | JSON array of violation codes |
| `created_datetime` | Temporal features | UTC timestamps |
| `police_station` | Station stats, officer assignment | 55 real stations |
| `junction_name` | `location_type`, map markers | 170 junctions |
| `offence_code`, `description`, etc. | Metadata | Available for display |

### 3.3 Features NOT in Raw Data (Synthesized at Training Time)

These are **deterministically generated** in `synthesize_simulation_features()` using `SEED=42`:

| Feature | Derivation Logic |
|---|---|
| `traffic_volume` | Base 200–800 × peak multiplier (8–10, 17–20 hrs) + historical count |
| `average_speed` | `60 - traffic_volume/50 + noise` |
| `parking_occupancy` | `40 + violation_score×5 + weekend×8 + noise` |
| `road_width` | Mapped from `location_type` + noise |
| `nearby_event` | Binomial(weekend=0.3, weekday=0.1) |
| `illegal_vehicle_count` | `vehicle_weight + violation_score + random(0–5) + event×2` |
| `delay_score` | `(60 - avg_speed)/60 × (traffic_volume/2000) × 100` |
| `historical_violation_count` | Grid cell aggregation (lat/lon ÷ 0.002) |
| `violation_score` | Sum of violation-type severity weights |
| `vehicle_weight` | Mapped from vehicle type (1–4) |
| `pci_score` | Weighted normalized composite (0.4/0.3/0.2/0.1) |

> **Implementation note:** At runtime, the backend must run the **same** `build_features()` pipeline from `train_model.py` on raw rows before calling `predict_severity()`. The simplified defaults in `app_utils._derive_extra_features()` are for single-observation API calls where callers supply partial data — they must **not** replace the full pipeline for dataset-driven endpoints.

### 3.4 Model Feature Vector (16 columns)

```python
FEATURE_COLS = [
    "location_type", "illegal_vehicle_count", "traffic_volume",
    "average_speed", "parking_occupancy", "road_width",
    "historical_violation_count", "nearby_event",
    "day_of_week", "time_of_day",
    "violation_score", "vehicle_weight", "delay_score",
    "is_weekend", "hour", "pci_score",
]
```

**Categorical encodings:** `location_type`, `time_of_day`  
**Target:** `severity_level` → Low | Medium | High | Critical

### 3.5 PCI Formula

```
PCI = 0.4 × norm(illegal_vehicle_count)
    + 0.3 × norm(traffic_volume)
    + 0.2 × norm(delay_score)
    + 0.1 × norm(parking_occupancy)

Categories: Low (≤25) | Moderate (≤50) | High (≤75) | Critical (>75)
```

### 3.6 Recommendation Engine (`app_utils.recommend_action`)

| Severity | Action | Notification | Challan | Towing | Officer |
|---|---|---|---|---|---|
| Low | Warning Only | No | No | No | No |
| Medium | Send Warning Notification | Yes | No | No | No |
| High | Issue e-Challan | Yes | Yes | No | No |
| Critical | Tow Vehicle + Deploy Officer | Yes | Yes | Yes | Yes |

### 3.7 `app_utils.py` Public API (Must Reuse)

| Function | Purpose | Usage in Backend |
|---|---|---|
| `load_model(pkl_path)` | Singleton-cached bundle loader | Startup event |
| `predict_severity(input_data, bundle)` | Single inference | `/api/predict`, incident creation |
| `recommend_action(severity)` | Rule-based enforcement action | All prediction responses |
| `compute_pci_single(...)` | PCI for one observation | Simulation, impact estimator |
| `batch_predict(df, bundle)` | DataFrame-level inference | Hotspot aggregation, analytics |

---

## 4. Dataset Profile

### 4.1 Scale

| Metric | Value |
|---|---|
| Total records | **298,450** |
| Date range | 2023-11-17 → 2024-05-31 |
| Police stations | **55** |
| Junctions | **170** |
| Unique grid cells (~250 m) | ~15,000–20,000 (estimated) |
| File size | 109 MB |

### 4.2 Top Police Stations (Real Bengaluru)

| Station | Violation Count |
|---|---|
| Upparpet | 34,468 |
| Shivajinagar | 28,044 |
| Malleshwaram | 22,200 |
| HAL Old Airport | 20,819 |
| City Market | 17,646 |
| Vijayanagara | 14,652 |
| Rajajinagar | 10,998 |
| Kodigehalli | 10,916 |

### 4.3 Top Junctions

| Junction | Count |
|---|---|
| No Junction | 147,880 |
| BTP051 - Safina Plaza Junction | 15,449 |
| BTP082 - KR Market Junction | 11,538 |
| BTP040 - Elite Junction | 10,718 |
| BTP044 - Sagar Theatre Junction | 10,549 |

### 4.4 Geographic Bounds (Bengaluru)

- **Latitude:** ~12.75 – 13.15
- **Longitude:** ~77.45 – 77.85
- All map views must be centered on Bengaluru with these bounds

### 4.5 Vehicle Types (Top)

CAR, SCOOTER, MOTOR CYCLE, PASSENGER AUTO, JEEP, VAN, LGV, BUS

### 4.6 Violation Types

WRONG PARKING, NO PARKING, PARKING IN A MAIN ROAD, PARKING ON FOOTPATH, DOUBLE PARKING, PARKING NEAR BUSTOP/SCHOOL/HOSPITAL ETC, and others (JSON-encoded arrays)

---

## 5. Model Artifacts

### 5.1 `model.pkl` Bundle Structure

```python
{
    "model":         GradientBoostingClassifier,  # Best model
    "model_name":    "GradientBoosting",
    "label_encoder": LabelEncoder,                # Low/Medium/High/Critical
    "cat_encoders":  {"location_type": LE, "time_of_day": LE},
    "pci_scaler":    MinMaxScaler,                # Fitted on training PCI inputs
    "feature_cols":  FEATURE_COLS,                # 16 features
    "label_order":   ["Low", "Medium", "High", "Critical"],
    "trained_at":    ISO timestamp,
}
```

### 5.2 `model_metrics.csv`

| Model | Accuracy | Precision | Recall | F1 Score |
|---|---|---|---|---|
| RandomForest | 0.9852 | 0.9869 | 0.9852 | 0.9857 |
| **GradientBoosting** | **0.9922** | **0.9912** | **0.9922** | **0.9911** |
| ExtraTrees | 0.9779 | 0.9817 | 0.9779 | 0.9789 |

**Selected model:** GradientBoosting (highest F1 = 0.9911)

### 5.3 Expected Feature Importance (GradientBoosting)

Based on pipeline design, top contributors are expected to be:

1. `pci_score`
2. `illegal_vehicle_count`
3. `traffic_volume`
4. `violation_score`
5. `delay_score`
6. `parking_occupancy`
7. `historical_violation_count`
8. `average_speed`

> Feature importance will be extracted at runtime via `model.feature_importances_` zipped with `feature_cols` for the Analytics and Model Insights pages.

---

## 6. Critical Gaps & Design Decisions

### 6.1 Gap: `app_utils` vs `train_model` Feature Parity

`app_utils._derive_extra_features()` uses **simplified defaults** when fields are missing:

- `violation_score` ← derived from `illegal_vehicle_count // 3` (not from `violation_type`)
- `vehicle_weight` ← defaults to `2`
- `historical_violation_count` ← defaults to `50`

**Decision:** Create `backend/ml/feature_engineering.py` by **extracting** (not rewriting) functions from `train_model.py`:

```
train_model.py functions → backend/ml/feature_engineering.py
                              ↓
                    build_features_from_raw(row | df)
                              ↓
                    app_utils.predict_severity() / batch_predict()
```

The root-level `train_model.py` and `app_utils.py` remain untouched; backend imports from them or from the extracted shared module.

### 6.2 Gap: Stochastic Features at Inference Time

`synthesize_simulation_features()` uses `np.random.default_rng(SEED)` row-by-row. Re-running on the same row out of order produces different synthetic values.

**Decision:** **Precompute features once at backend startup** and persist to `backend/data/processed_violations.parquet`:

1. Load raw CSV
2. Run `build_features()` (exact train_model logic)
3. Run `batch_predict()` via `app_utils`
4. Cache result (~298k rows, ~50–80 MB parquet)
5. All API endpoints read from cache

This guarantees:
- Predictions match training-time feature values
- Sub-second API responses
- Deterministic hotspot aggregation

### 6.3 Gap: No Officers / Incidents / Workflow in Dataset

**Decision:** Generate operational layer from real violation data:

| Entity | Source | Mock? |
|---|---|---|
| Violations | Real CSV + model predictions | No |
| Hotspots | Aggregated from real grid cells | No |
| Police stations | Real from CSV | No |
| Junctions | Real from CSV | No |
| Officers | Generated, assigned to real stations | Yes (20–25) |
| Incidents | Derived from recent violations | Hybrid |
| Notifications | Event-driven from workflow transitions | Generated |
| SMS previews | Template from vehicle + location | Generated |

### 6.4 Gap: sklearn Version Compatibility

`model.pkl` requires compatible scikit-learn (uses `GradientBoostingClassifier` with `log_loss`). Pin version in `requirements.txt` (recommend `scikit-learn>=1.3,<1.6` and verify on first run).

### 6.5 Decision: In-Memory State vs Database

For hackathon prototype:

| Store | Technology | Contents |
|---|---|---|
| Violation cache | Parquet file + in-memory DataFrame | Precomputed features + predictions |
| Hotspot cache | In-memory dict | Top N grid clusters |
| Officers | JSON seed file + in-memory | 20–25 mock officers |
| Incidents | In-memory list + SQLite (optional) | Workflow state |
| Repeat offenders | In-memory dict keyed by vehicle_number | Offense history |
| Notifications | In-memory ring buffer (last 100) | Event log |

SQLite is optional for persistence across restarts; in-memory is sufficient for demo.

---

## 7. Target Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + TS)                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Command  │ │ Hotspot  │ │ Incident │ │ Priority │ │ Officer  │  │
│  │ Center   │ │ Map      │ │ Queue    │ │ Engine   │ │ Deploy   │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│  React Query (server state) + Zustand (UI/workflow state)           │
│  Leaflet (maps) + Plotly (charts) + Tailwind (dark glassmorphism)   │
└───────────────────────────────┬──────────────────────────────────────┘
                                │ HTTP /api/*
┌───────────────────────────────▼──────────────────────────────────────┐
│                     BACKEND (FastAPI)                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────────┐  │
│  │   Routers   │  │   Services   │  │   ML Layer                  │  │
│  │ predict     │  │ hotspot      │  │ app_utils.py (inference)    │  │
│  │ hotspots    │  │ incident     │  │ feature_engineering.py      │  │
│  │ simulate    │  │ officer      │  │ model.pkl (singleton)       │  │
│  │ analytics   │  │ offender     │  │ processed_violations.parquet│  │
│  │ officers    │  │ notification │  │                             │  │
│  │ incidents   │  │ simulation   │  │                             │  │
│  └─────────────┘  └──────────────┘  └─────────────────────────────┘  │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────────┐
│                     DATA SOURCES                                      │
│  jan to may police violation_anonymized791b166.csv (298,450 rows)    │
│  model.pkl + model_metrics.csv                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### 7.1 Startup Sequence

```
1. load_model("model.pkl")                    → singleton bundle
2. Load or build processed_violations.parquet → features + predictions
3. Build hotspot index (grid aggregation)     → top clusters
4. Seed officers.json → 22 officers           → distributed by station
5. Initialize incident queue from recent violations (last 500)
6. Build repeat offender index from full dataset
7. FastAPI ready → serve /api/*
```

---

## 8. Backend Design

### 8.1 Directory Structure

```
backend/
├── main.py                          # FastAPI app, CORS, startup
├── requirements.txt
├── core/
│   ├── config.py                    # Paths, constants, env vars
│   └── startup.py                   # Model load, cache warm-up
├── ml/
│   ├── feature_engineering.py       # Extracted from train_model.py
│   └── inference.py                 # Wrapper around app_utils
├── services/
│   ├── hotspot_service.py           # Grid clustering + ranking
│   ├── incident_service.py          # Workflow state machine
│   ├── officer_service.py           # Mock officer CRUD + assignment
│   ├── offender_service.py          # Repeat offender tracking
│   ├── simulation_service.py        # Before/after impact estimation
│   ├── analytics_service.py         # Trends, distributions, stats
│   └── notification_service.py      # Event bus for notifications
├── routers/
│   ├── predict.py
│   ├── hotspots.py
│   ├── simulate.py
│   ├── analytics.py
│   ├── officers.py
│   └── incidents.py
├── models/
│   ├── schemas.py                   # Pydantic request/response models
│   └── enums.py                     # Severity, Status, Workflow enums
├── data/
│   ├── officers_seed.json           # 22 mock officers
│   └── processed_violations.parquet # Generated at first startup
└── tests/
    └── test_predict.py
```

### 8.2 Service Responsibilities

#### HotspotService

- Aggregate violations by `(lat_grid, lon_grid)` using 0.002° grid from `train_model.py`
- For each cluster compute:
  - Centroid lat/lon
  - Dominant junction name, police station
  - Violation count
  - Mean/max severity (from model predictions)
  - Mean confidence, mean PCI
  - Model recommendation (from highest-severity record or ensemble mode)
- Return **top 50–100 hotspots** sorted by priority score
- Never return raw 298k rows

#### IncidentService

- Workflow state machine:

```
Violation Detected → Warning Sent → Officer Assigned →
Challan Issued → Tow Requested → Resolved
```

- Seed incidents from recent real violations (with model predictions attached)
- PATCH `/api/incidents/status` advances workflow
- Each transition emits a notification

#### OfficerService

- 22 mock officers with realistic Kannada/Indian names
- Distributed across top stations: Upparpet, Shivajinagar, Malleshwaram, HAL Old Airport, City Market, etc.
- Fields: name, badge_id, station, availability (Available/Busy/Off-Duty), active_cases
- Assignment logic: match officer station to incident police_station, prefer Available with lowest workload

#### OffenderService

- Index all violations by `vehicle_number`
- Rules:
  - 1st offense → Warning
  - 2nd offense → Challan
  - 3rd offense → Tow Recommendation
  - 4th+ → High-Risk Offender
- Return full history per vehicle

#### SimulationService

- Input: hotspot cluster ID or feature dict
- Output (derived from real PCI/traffic features, not random):

```
Before Enforcement:
  pci_score, delay_score, traffic_volume, severity

After Enforcement:
  pci_score × (1 - reduction_factor)
  delay_score × (1 - reduction_factor × 0.8)
  severity → downgraded one level (if Critical → High)

Expected Congestion Reduction: based on PCI delta
Expected Delay Reduction: based on delay_score delta
Vehicles Benefited: traffic_volume × reduction_factor
Enforcement Effectiveness: confidence_score × reduction_factor
```

Reduction factors keyed to recommendation action (Tow = 0.35, Challan = 0.20, Warning = 0.08).

#### AnalyticsService

- Violations by hour/day/month (from real timestamps)
- Violations by police station (real)
- Hotspot trend (weekly aggregation)
- Feature importance (from model bundle)
- Prediction distribution (severity counts from cache)
- Officer performance (mock metrics tied to resolved incidents)

---

## 9. API Specification

### 9.1 `POST /api/predict`

**Request:**
```json
{
  "location_type": "Junction",
  "illegal_vehicle_count": 8,
  "traffic_volume": 900,
  "average_speed": 18.5,
  "parking_occupancy": 72.0,
  "road_width": 12.0,
  "historical_violation_count": 120,
  "nearby_event": 1,
  "day_of_week": 5,
  "time_of_day": "Evening"
}
```

**Response:**
```json
{
  "severity": "High",
  "confidence": 0.9234,
  "pci_score": 67.5,
  "pci_category": "High",
  "recommendation": {
    "action": "Issue e-Challan",
    "message": "Generate e-challan and notify owner through VAHAN portal.",
    "priority": 3,
    "notification": true,
    "challan": true,
    "towing": false,
    "officer": false
  },
  "all_probabilities": {
    "Low": 0.01, "Medium": 0.05, "High": 0.92, "Critical": 0.02
  }
}
```

**Implementation:** Direct call to `app_utils.predict_severity()`.

---

### 9.2 `GET /api/hotspots`

**Query params:** `limit=50`, `min_severity=Medium`, `station=Upparpet`

**Response:**
```json
{
  "hotspots": [
    {
      "hotspot_id": "grid_6465_38890",
      "latitude": 12.930,
      "longitude": 77.778,
      "location_label": "BTP051 - Safina Plaza Junction",
      "police_station": "Shivajinagar",
      "severity": "Critical",
      "confidence": 0.89,
      "pci_score": 78.2,
      "violation_count": 342,
      "recommendation": { "action": "Tow Vehicle + Deploy Officer", ... },
      "priority_score": 94.5
    }
  ],
  "total_clusters": 18432,
  "returned": 50
}
```

---

### 9.3 `POST /api/simulate`

**Request:**
```json
{
  "hotspot_id": "grid_6465_38890"
}
```

**Response:**
```json
{
  "before": {
    "severity": "Critical",
    "pci_score": 78.2,
    "delay_score": 45.0,
    "traffic_volume": 1200,
    "congestion_level": "Critical"
  },
  "after": {
    "severity": "High",
    "pci_score": 50.8,
    "delay_score": 29.3,
    "traffic_volume": 1200,
    "congestion_level": "High"
  },
  "expected_congestion_reduction_pct": 35.0,
  "expected_delay_reduction_pct": 28.0,
  "vehicles_benefited": 420,
  "enforcement_effectiveness": 0.89
}
```

---

### 9.4 `GET /api/analytics`

**Response:**
```json
{
  "violation_trends": {
    "by_hour": [{"hour": 8, "count": 12400}, ...],
    "by_day": [{"day": "Mon", "count": 42000}, ...],
    "by_month": [{"month": "2024-01", "count": 58000}, ...]
  },
  "hotspot_trends": {
    "weekly": [{"week": "2024-W01", "critical_count": 45}, ...]
  },
  "station_statistics": [
    {"station": "Upparpet", "count": 34468, "avg_severity_score": 2.8, "critical_pct": 12.5}
  ],
  "feature_importance": [
    {"feature": "pci_score", "importance": 0.28}, ...
  ],
  "prediction_distribution": {
    "Low": 74862, "Medium": 89670, "High": 82118, "Critical": 51800
  }
}
```

---

### 9.5 `GET /api/officers`

**Response:** List of 22 officers with station, availability, workload.

### 9.6 `POST /api/officers/assign`

**Request:**
```json
{
  "incident_id": "FKID000128",
  "officer_id": "OFF-0016"
}
```

### 9.7 `GET /api/incidents`

**Query params:** `status=Active`, `limit=100`, `severity=Critical`

### 9.8 `PATCH /api/incidents/status`

**Request:**
```json
{
  "incident_id": "FKID000128",
  "status": "Officer Assigned"
}
```

### 9.9 Additional Endpoints (Frontend Support)

| Endpoint | Purpose |
|---|---|
| `GET /api/overview` | Command center KPIs |
| `GET /api/stations` | Police station list with coordinates (centroid) |
| `GET /api/junctions` | Junction list with coordinates |
| `GET /api/offenders` | Repeat offender list |
| `GET /api/offenders/{vehicle_number}` | Full vehicle history |
| `GET /api/notifications` | Notification center feed |
| `GET /api/resolutions` | Resolution history |
| `GET /api/model/insights` | Model metadata + metrics |
| `GET /api/priority` | Top priority incidents + hotspots |
| `POST /api/warnings/preview` | SMS warning preview |

---

## 10. Frontend Design

### 10.1 Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS (dark theme, glassmorphism) |
| Maps | Leaflet + react-leaflet |
| Charts | Plotly.js + react-plotly.js |
| Server State | TanStack React Query |
| Client State | Zustand |
| Icons | Lucide React |
| Routing | React Router v6 |
| HTTP | Axios or fetch wrapper |

### 10.2 Design System

**Theme:** Dark command center — deep navy/charcoal base (`#0a0e17`, `#111827`)

**Accent colors:**
- Critical: `#ef4444` (red)
- High: `#f97316` (orange)
- Medium: `#eab308` (yellow)
- Low: `#22c55e` (green)
- Primary action: `#3b82f6` (blue)
- Glass panels: `bg-white/5 backdrop-blur-xl border border-white/10`

**Typography:**
- Headings: `"Inter"` or `"DM Sans"` — semibold, tracking-tight
- Data/metrics: `"JetBrains Mono"` or `"IBM Plex Mono"` for numeric KPIs
- Body: `"Inter"` regular

**Components:**
- `GlassPanel` — reusable glassmorphism container
- `SeverityBadge` — color-coded severity pill
- `KpiCard` — animated counter with trend arrow
- `HotspotMarker` — Leaflet divIcon with severity color
- `WorkflowStepper` — incident status progression
- `NotificationToast` — slide-in alerts
- `DataTable` — sortable incident/officer tables
- `SmsPreview` — monospace warning message card

### 10.3 Page Map

| Route | Page | Key Data Sources |
|---|---|---|
| `/` | Command Center Overview | `/api/overview` |
| `/map` | Interactive Hotspot Map | `/api/hotspots`, `/api/stations`, `/api/junctions` |
| `/incidents` | Live Incident Queue | `/api/incidents` |
| `/priority` | Enforcement Priority Engine | `/api/priority` |
| `/officers` | Officer Deployment Center | `/api/officers` |
| `/offenders` | Repeat Offender Tracking | `/api/offenders` |
| `/analytics` | Analytics Dashboard | `/api/analytics` |
| `/model` | Model Insights | `/api/model/insights` |
| `/operations` | Active Operations (live feel) | `/api/hotspots`, `/api/incidents`, `/api/officers` |
| `/history` | Resolution History | `/api/resolutions` |

**Global:** Notification Center (slide-out drawer) ← `/api/notifications`

### 10.4 Hotspot Map Requirements

- **Center:** Bengaluru (12.97, 77.59), zoom 12
- **Layers:** Hotspot markers (top 50–100), police station pins, junction markers
- **Color coding:** Green/Yellow/Orange/Red by severity
- **Cluster:** Leaflet marker clustering for junctions if > 100
- **Detail panel (slide-out):** Location, station, severity, confidence, count, PCI, recommendation, 7-day trend sparkline
- **Performance:** Max ~200 markers total on map at any time

### 10.5 Layout

```
┌─────────────────────────────────────────────────────────────┐
│  🅿 ParkWise AI          [Live] Bengaluru Command Center   │
│  ────────────────────────────────────────────────────────── │
│  Nav: Overview | Map | Incidents | Priority | Officers | …  │
├──────────┬──────────────────────────────────────────────────┤
│          │                                                  │
│ Sidebar  │              Main Content Area                   │
│ (nav +   │                                                  │
│  KPI     │                                                  │
│  mini)   │                                                  │
│          │                                                  │
├──────────┴──────────────────────────────────────────────────┤
│  Status Bar: 298,450 violations indexed | Model: GBM 99.2%  │
└─────────────────────────────────────────────────────────────┘
```

---

## 11. Operational Systems

### 11.1 Priority Score Formula

```
priority_score = (
    severity_weight     × 0.35    # Critical=4, High=3, Medium=2, Low=1
  + pci_normalized      × 0.25    # pci_score / 100
  + repeat_offender_wt  × 0.20    # 0–1 based on offense count
  + congestion_impact   × 0.20    # delay_score / 100
) × 100
```

All inputs from real model output + offender history — no random values.

### 11.2 Repeat Offender Engine

```python
offense_count = len(violations_for_vehicle)

if offense_count == 1:  risk = "Warning"
elif offense_count == 2: risk = "Challan"
elif offense_count == 3: risk = "Tow Recommendation"
else:                    risk = "High-Risk Offender"
```

Override model recommendation when repeat offender rules escalate action.

### 11.3 Mock Officer Seed (22 officers across real stations)

| Badge | Name | Station | Availability |
|---|---|---|---|
| OFF-0001 | Ravi Kumar | Upparpet | Available |
| OFF-0002 | Priya Sharma | Upparpet | Busy |
| OFF-0003 | Suresh Reddy | Shivajinagar | Available |
| OFF-0004 | Anitha Gowda | Shivajinagar | Available |
| OFF-0005 | Mohan Das | Malleshwaram | Available |
| OFF-0006 | Lakshmi Devi | Malleshwaram | Busy |
| OFF-0007 | Karthik Nair | HAL Old Airport | Available |
| OFF-0008 | Deepa Rao | HAL Old Airport | Off-Duty |
| ... | ... | ... | ... |

Full seed list to be generated in Phase 2 covering all top-15 stations.

### 11.4 SMS Warning Preview Template

```
⚠️ PARKWISE AI — TRAFFIC VIOLATION WARNING

Vehicle: {vehicle_number}
Location: {location}
Station: {police_station}
Violation: {violation_type}

Your vehicle is parked in a restricted zone.
Please move within 15 minutes to avoid penalties.

— Bengaluru Traffic Police
```

### 11.5 Notification Events

| Event | Trigger |
|---|---|
| Critical hotspot detected | Hotspot severity = Critical on refresh |
| Warning sent | Incident → Warning Sent |
| Officer assigned | Incident → Officer Assigned |
| Challan issued | Incident → Challan Issued |
| Tow requested | Incident → Tow Requested |
| Incident resolved | Incident → Resolved |

---

## 12. Performance Strategy

### 12.1 Problem: 298,450 Records

| Operation | Strategy |
|---|---|
| Map markers | Top 50–100 hotspot clusters only |
| Incident queue | Paginate, default last 100 active |
| Analytics | Pre-aggregate at startup into dict |
| Model inference | Precompute all 298k at startup → parquet |
| Repeat offenders | Build dict at startup |
| API response time | Target < 200ms for all GET endpoints |

### 12.2 Hotspot Clustering Algorithm

```python
# Reuse train_model grid:
df["lat_grid"] = (df["latitude"] / 0.002).round(0)
df["lon_grid"] = (df["longitude"] / 0.002).round(0)

clusters = df.groupby(["lat_grid", "lon_grid"]).agg({
    "latitude": "mean",
    "longitude": "mean",
    "severity_level": lambda x: mode_or_max(x),
    "confidence_score": "mean",
    "pci_score": "mean",
    "id": "count",
    "police_station": lambda x: x.mode()[0],
    "junction_name": lambda x: x.mode()[0],
})
# Sort by priority_score, return top N
```

Grid cell size ≈ 250 m → ~15,000–20,000 clusters → filter to top 50–100.

### 12.3 Caching Layers

```
Startup:
  raw CSV → build_features() → batch_predict() → parquet cache (one-time ~2-3 min)
  parquet → hotspot index, analytics aggregates, offender index

Runtime:
  API reads from in-memory caches
  Incident/officer mutations update in-memory state
  Optional: watch parquet mtime for dev reload
```

---

## 13. Implementation Phases

### Phase 1 — Analysis & Architecture ✅ (This Document)

**Deliverables:**
- [x] Repository analysis
- [x] ML pipeline documentation
- [x] Dataset profiling
- [x] Architecture design
- [x] API specification
- [x] Frontend page map
- [x] `DEVELOPMENT_PLAN.md`

**Exit criteria:** Stakeholder review of this plan before coding begins.

---

### Phase 2 — Backend

**Goal:** FastAPI server with all API endpoints, real model inference, precomputed cache.

**Tasks:**

1. **Project scaffold**
   - `backend/` directory structure
   - `requirements.txt` (fastapi, uvicorn, pandas, scikit-learn, pyarrow)
   - `core/config.py` with paths to CSV, model.pkl, app_utils.py

2. **ML integration**
   - Extract `feature_engineering.py` from `train_model.py` (import, don't duplicate)
   - `inference.py` wrapping `app_utils.load_model`, `predict_severity`, `batch_predict`
   - Startup: build or load `processed_violations.parquet`

3. **Services** (one file per domain)
   - HotspotService, IncidentService, OfficerService, OffenderService
   - SimulationService, AnalyticsService, NotificationService

4. **Routers** (all endpoints from Section 9)
   - Pydantic schemas for request/response validation
   - CORS middleware for frontend dev server

5. **Seed data**
   - `officers_seed.json` — 22 officers across real stations
   - Incident queue seeded from 500 most recent violations

6. **Tests**
   - Verify `POST /api/predict` returns real model output
   - Verify hotspots return ≤ 100 clusters with real coordinates
   - Verify no endpoint returns hardcoded severity

**Exit criteria:**
- All API endpoints return 200 with real data
- `predict_severity` used for every severity value
- Hotspot endpoint returns ≤ 100 clusters
- Startup completes in < 5 minutes (first run with cache build)

---

### Phase 3 — Frontend Scaffold

**Goal:** React app with routing, design system, layout shell.

**Tasks:**

1. **Vite + React + TypeScript project** in `frontend/`
2. **Tailwind** dark theme configuration with glassmorphism utilities
3. **Layout shell** — sidebar nav, top bar, notification drawer slot
4. **React Router** — all 10 routes defined with placeholder pages
5. **Zustand stores** — UI state, selected hotspot, notification queue
6. **React Query setup** — API client, query hooks skeleton
7. **Shared components** — GlassPanel, SeverityBadge, KpiCard, DataTable

**Exit criteria:**
- App runs on `localhost:5173`
- All pages navigable with dark themed layout
- Design system components render correctly

---

### Phase 4 — Model Integration (Backend ↔ ML)

**Goal:** End-to-end verified model pipeline.

**Tasks:**

1. Run full cache build: 298k rows → features → `batch_predict()` → parquet
2. Validate sample predictions against `app_utils` self-test
3. Extract and expose feature importance from model bundle
4. Wire `/api/model/insights` with real metrics from `model_metrics.csv`
5. Verify PCI scores match between `compute_pci_single` and batch values
6. Document any sklearn version requirements

**Exit criteria:**
- 298,450 rows processed with predictions
- Model insights page data available via API
- Feature importance array returned from real model

---

### Phase 5 — Frontend ↔ API Integration

**Goal:** All pages connected to live backend data.

**Tasks (by page):**

| Page | Integration Work |
|---|---|
| Command Center | KPI cards from `/api/overview`, live refresh 30s |
| Hotspot Map | Leaflet + `/api/hotspots`, detail panel on click |
| Incident Queue | Table from `/api/incidents`, status PATCH |
| Priority Engine | `/api/priority`, sorted tables |
| Officer Deployment | `/api/officers`, assign button → POST |
| Repeat Offenders | `/api/offenders`, expandable history |
| Analytics | Plotly charts from `/api/analytics` |
| Model Insights | Metrics + feature importance chart |
| Active Operations | Combined live dashboard, auto-refresh |
| Resolution History | `/api/resolutions` |
| Notifications | Polling `/api/notifications`, toast on new |
| SMS Preview | Modal on "Send Warning" action |

**Exit criteria:**
- No hardcoded data in frontend components
- Map shows real Bengaluru hotspots
- Incident workflow transitions work end-to-end
- Charts render real aggregated data

---

### Phase 6 — Deployment & Documentation

**Goal:** Runnable demo with setup instructions.

**Tasks:**

1. `README.md` — project overview, setup, run instructions
2. `docker-compose.yml` (optional) — backend + frontend
3. Backend: `uvicorn main:app --reload --port 8000`
4. Frontend: `npm run dev` with proxy to backend
5. Environment variables documented
6. Production build: `npm run build` + serve static
7. Demo script for hackathon presentation

**Exit criteria:**
- Fresh clone → running app in < 10 minutes (after cache build)
- README covers all setup steps
- Demo walkthrough documented

---

## 14. Project Structure (Final)

```
Traffic Bengaluru/
├── DEVELOPMENT_PLAN.md
├── README.md                           # Phase 6
├── app_utils.py                        # Existing — inference utilities
├── train_model.py                      # Existing — training pipeline
├── model.pkl                           # Existing — trained model
├── model_metrics.csv                   # Existing — model comparison
├── jan to may police violation_anonymized791b166.csv
├── SmartParking_ML_Pipeline.ipynb
│
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── core/
│   ├── ml/
│   ├── services/
│   ├── routers/
│   ├── models/
│   ├── data/
│   └── tests/
│
└── frontend/
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx
    │   ├── api/                        # React Query hooks
    │   ├── stores/                     # Zustand
    │   ├── components/                 # Shared UI
    │   ├── pages/                      # 10 route pages
    │   ├── hooks/
    │   └── types/
    └── public/
```

---

## 15. Dependencies & Environment

### Backend (`requirements.txt`)

```
fastapi>=0.110
uvicorn[standard]>=0.27
pandas>=2.0
numpy>=1.24
scikit-learn>=1.3,<1.6
pyarrow>=14.0
pydantic>=2.0
python-multipart
```

### Frontend (`package.json` key deps)

```
react, react-dom, react-router-dom
typescript, vite, @vitejs/plugin-react
tailwindcss, postcss, autoprefixer
@tanstack/react-query
zustand
leaflet, react-leaflet, @types/leaflet
plotly.js, react-plotly.js
lucide-react
axios
```

### Python Path Setup

Backend must add project root to `sys.path` to import `app_utils.py`:

```python
# backend/core/config.py
PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))
```

---

## 16. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| sklearn version mismatch loading model.pkl | Backend won't start | Pin scikit-learn version; test on setup |
| 298k row cache build slow (~2-3 min) | Slow first startup | Pre-build parquet; ship cached file optionally |
| `app_utils` simplified defaults vs full pipeline | Wrong predictions for raw rows | Always use `train_model.build_features()` first |
| Stochastic features differ on re-run | Inconsistent predictions | Precompute once; serve from cache |
| 109 MB CSV in repo | Large clone size | Acceptable for hackathon; document |
| Map performance with many markers | UI lag | Cap at 100 hotspots; use marker clustering |
| No real officer data | Can't assign real officers | Mock 22 officers on real stations |
| Anonymized vehicle numbers | Repeat offender demo less realistic | Still functional; use FKN00GLxxxx as-is |

---

## 17. Acceptance Criteria

### Global

- [ ] Every severity/confidence/PCI value originates from `model.pkl` via `app_utils.py`
- [ ] All locations, stations, junctions are real Bengaluru data from the CSV
- [ ] No random severity generation anywhere in the stack
- [ ] Map renders ≤ 200 markers and remains responsive
- [ ] Dark glassmorphism UI — not a generic admin template

### Backend

- [ ] Model loaded once at startup (singleton)
- [ ] All 8+ API endpoint groups functional
- [ ] Hotspot endpoint returns clustered data, not raw rows
- [ ] Incident workflow state machine works through all 6 stages
- [ ] Repeat offender rules enforced correctly
- [ ] 22 mock officers distributed across real stations

### Frontend

- [ ] 10 pages + notification center implemented
- [ ] Leaflet map with severity color coding
- [ ] Plotly charts on Analytics and Model Insights pages
- [ ] React Query for server state, Zustand for UI state
- [ ] SMS preview generated from real incident data
- [ ] Active Operations page auto-refreshes with live feel

### ML Integrity

- [ ] `load_model()`, `predict_severity()`, `recommend_action()`, `compute_pci_single()`, `batch_predict()` all used
- [ ] Feature engineering matches `train_model.py` exactly
- [ ] Model Insights shows GradientBoosting, 99.22% accuracy, real feature importance

---

## Next Step

**Phase 1 is complete.** Review this plan, then proceed to **Phase 2: Backend Generation** on your approval.

Recommended first action in Phase 2:
1. Create `backend/` scaffold
2. Extract feature engineering from `train_model.py`
3. Build startup cache pipeline
4. Implement `POST /api/predict` and `GET /api/hotspots` as proof-of-concept endpoints
