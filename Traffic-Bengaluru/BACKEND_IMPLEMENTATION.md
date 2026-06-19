# ParkWise AI — Backend Implementation (Phase 2)

**Status:** Complete  
**Date:** 2026-06-18

---

## Summary

Phase 2 delivers a working **FastAPI backend** that loads the real `model.pkl`, runs inference exclusively through `app_utils.py`, reuses feature engineering from `train_model.py`, and serves four priority API endpoints backed by a precomputed violation cache.

All severity, confidence, PCI, and recommendation values originate from **GradientBoostingClassifier** inference — no hardcoded predictions.

---

## Files Created

```
backend/
├── __init__.py
├── main.py                          # FastAPI app + lifespan startup
├── requirements.txt
├── core/
│   ├── __init__.py
│   ├── config.py                    # Paths, constants, feature columns
│   └── startup.py                   # Model load + cache initialization
├── ml/
│   ├── __init__.py
│   ├── feature_engineering.py       # Re-exports train_model.py pipeline
│   └── inference.py                 # ModelRegistry + app_utils wrappers
├── services/
│   ├── __init__.py
│   ├── cache_service.py             # Parquet cache + hotspot/analytics indexes
│   ├── hotspot_service.py           # Top-N grid cluster queries
│   ├── overview_service.py          # Command center KPIs
│   └── analytics_service.py         # Trends + feature importance
├── routers/
│   ├── __init__.py
│   ├── predict.py                   # POST /api/predict
│   ├── hotspots.py                  # GET /api/hotspots
│   ├── overview.py                  # GET /api/overview
│   └── analytics.py                 # GET /api/analytics
├── models/
│   ├── __init__.py
│   ├── schemas.py                   # Pydantic request/response models
│   └── enums.py                     # SeverityLevel enum
├── data/
│   ├── officers_seed.json           # 22 mock officers (overview KPI only)
│   └── processed_violations.parquet # Generated cache (298,450 rows, ~16 MB)
└── tests/
    ├── __init__.py
    └── test_predict.py              # 5 integration tests (all passing)
```

**Documentation:** `BACKEND_IMPLEMENTATION.md` (this file)

---

## Folder Structure

| Layer | Responsibility |
|---|---|
| `core/` | Configuration, paths, startup orchestration |
| `ml/` | Model loading singleton, feature engineering imports, inference wrappers |
| `services/` | Business logic — cache, hotspots, overview, analytics |
| `routers/` | HTTP endpoints, request validation |
| `models/` | Pydantic schemas and enums |
| `data/` | Parquet cache + officer seed JSON |

---

## Startup Sequence

```
1. FastAPI lifespan triggers run_startup()
2. ModelRegistry.load(model.pkl)
   ├── Uses app_utils.load_model() (singleton cache)
   └── verify_model_metadata() — checks bundle keys, 16 features, label order
3. DataCache.initialize()
   ├── IF processed_violations.parquet EXISTS → load parquet (~25s)
   └── ELSE (one-time build, ~17 min):
       ├── load_raw_data() from train_model.py
       ├── build_features() from train_model.py
       ├── batch_predict() from app_utils.py (5,000-row chunks)
       └── Save parquet → backend/data/processed_violations.parquet
4. Build hotspot index (grid aggregation, ~18k clusters)
5. Build analytics cache (hour/day/station aggregates + feature importance)
6. Server ready
```

**Important:** The parquet cache is **not rebuilt** on subsequent startups. Delete `backend/data/processed_violations.parquet` to force a rebuild.

---

## ML Pipeline Integration

### Model Loading (Singleton)

```python
# backend/ml/inference.py
ModelRegistry.load()  → app_utils.load_model("model.pkl")
```

Verified at startup:
- Model name: **GradientBoosting**
- Feature columns: **16** (matches training)
- Label order: Low, Medium, High, Critical

### Feature Engineering

```python
# backend/ml/feature_engineering.py
from train_model import build_features, load_raw_data, ...
```

No logic was rewritten. The backend imports the exact functions used during training.

### Inference

| Function | Source | Used By |
|---|---|---|
| `load_model()` | app_utils.py | Startup |
| `predict_severity()` | app_utils.py | POST /api/predict |
| `batch_predict()` | app_utils.py | Cache build (298k rows) |
| `recommend_action()` | app_utils.py | Hotspots, predict response |
| `compute_pci_single()` | app_utils.py | Inside predict_severity |

---

## API Endpoints

### `GET /health`

Health check — confirms model and cache are loaded.

```json
{"status": "ok", "model_loaded": true, "cache_loaded": true}
```

---

### `POST /api/predict`

Real-time inference for a single observation.

**Request body:** 10 required fields (+ optional derived fields)

**Response:**
```json
{
  "severity": "High",
  "confidence": 0.9234,
  "pci_score": 67.5,
  "pci_category": "High",
  "recommendation": {
    "action": "Issue e-Challan",
    "message": "...",
    "icon": "📋",
    "priority": 3,
    "notification": true,
    "challan": true,
    "towing": false,
    "officer": false
  },
  "all_probabilities": {"Low": 0.01, "Medium": 0.05, "High": 0.92, "Critical": 0.02}
}
```

---

### `GET /api/hotspots`

Returns **top 50–100 priority hotspot clusters** (never all 298k rows).

**Query params:**
| Param | Default | Description |
|---|---|---|
| `limit` | 75 | Max 100 |
| `min_severity` | — | Filter: Low / Medium / High / Critical |
| `station` | — | Filter by police station name |

**Clustering:** Grid cells at 0.002° (~250 m) from `train_model.compute_hotspot_features()`.

**Priority score:**
```
severity_rank/4 × 0.35 + avg_pci/100 × 0.25 + avg_delay/100 × 0.20 + violation_density × 0.20
```

**Response fields per hotspot:** hotspot_id, lat/lon, location_label, police_station, severity, confidence, pci_score, violation_count, recommendation, priority_score.

---

### `GET /api/overview`

Command center KPIs from real cached predictions.

| KPI | Source |
|---|---|
| `active_violations` | Count of High + Critical severity rows |
| `critical_hotspots` | Grid clusters with max severity = Critical |
| `officers_deployed` | Officers marked Available or Busy in seed file |
| `average_pci` | Mean PCI across all 298,450 violations |
| `estimated_congestion_reduction_pct` | PCI-weighted reduction potential for critical clusters |

---

### `GET /api/analytics`

Aggregated analytics from cached data + real model feature importance.

| Field | Description |
|---|---|
| `violations_by_station` | Count per police station (55 stations) |
| `violations_by_hour` | Count per hour (0–23) |
| `violations_by_day` | Count per day of week |
| `severity_distribution` | Low / Medium / High / Critical counts from model |
| `feature_importance` | From `model.feature_importances_` in model.pkl |
| `total_violations` | 298,450 |

---

## Cache Details

### `processed_violations.parquet`

| Property | Value |
|---|---|
| Rows | 298,450 |
| Size | ~16 MB |
| Build time | ~17 minutes (one-time) |
| Load time | ~25 seconds |

**Columns stored:** id, coordinates, location, police_station, junction_name, vehicle fields, all engineered features, severity_level, confidence_score, pci_score, pci_category, recommended_action, lat_grid, lon_grid.

### Hotspot Index

- **~18,000** unique grid clusters
- API returns top **75** by default (max 100)
- Sorted by priority_score descending

---

## Running the Backend

```bash
# From project root (Traffic Bengaluru/)
pip install -r backend/requirements.txt

# Start server
python -m uvicorn backend.main:app --reload --port 8000

# Run tests
python -m pytest backend/tests/test_predict.py -v
```

**API docs:** http://localhost:8000/docs

---

## Assumptions & Notes

1. **sklearn version:** `model.pkl` was trained with scikit-learn **1.8.0** but loads with **1.5.2** (InconsistentVersionWarning). Pinned to `scikit-learn==1.5.2` in requirements. Predictions work; consider re-exporting model with matching version for production.

2. **train_model.py imports:** Backend imports the full `train_model.py` module, which requires `matplotlib` and `seaborn` even though inference doesn't use plotting. These are listed in `requirements.txt`.

3. **Officer seed data:** `officers_seed.json` contains 22 mock officers across real Bengaluru stations. Used **only** for the `officers_deployed` KPI in overview — no officer API endpoints yet (Phase 3+).

4. **Stochastic features:** `synthesize_simulation_features()` uses `SEED=42` with row-order-dependent RNG. The parquet cache ensures deterministic predictions across restarts.

5. **PCI scaler:** `predict_severity()` recalculates PCI using the scaler from `model.pkl` (training scaler), not the scaler from `build_features()`. This matches the inference design in `app_utils.py`.

6. **Severity in cache:** All 298,450 severity values were produced by `batch_predict()` → `predict_severity()` → real model inference.

7. **First-run cache build:** If parquet is missing, startup takes ~17 minutes. Subsequent startups load parquet in ~25 seconds.

8. **Not implemented (deferred to later phases):** Frontend, notifications, incident workflow, officer assignment APIs, simulation endpoint, deployment config.

---

## Test Results

```
backend/tests/test_predict.py — 5 passed

✓ test_health
✓ test_predict_returns_model_output
✓ test_hotspots_limited
✓ test_overview
✓ test_analytics
```

---

## Next Phase

**Phase 3: Frontend Scaffold** — React + TypeScript + Tailwind dark command center UI with routing and design system. Awaiting approval before proceeding.
