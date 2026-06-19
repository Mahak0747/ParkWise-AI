"""Application configuration and path resolution."""

from __future__ import annotations

import sys
from pathlib import Path

# Project root: Traffic Bengaluru/ (parent of backend/)
BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_DIR.parent
DATA_DIR = BACKEND_DIR / "data"

# Ensure project root is importable for app_utils.py and train_model.py
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Asset paths
RAW_CSV_PATH = PROJECT_ROOT / "jan to may police violation_anonymized791b166.csv"
MODEL_PKL_PATH = PROJECT_ROOT / "model.pkl"
MODEL_METRICS_PATH = PROJECT_ROOT / "model_metrics.csv"
PROCESSED_PARQUET_PATH = DATA_DIR / "processed_violations.parquet"
OFFICERS_SEED_PATH = DATA_DIR / "officers_seed.json"

# Cache build settings
BATCH_PREDICT_CHUNK_SIZE = 5_000
DEFAULT_HOTSPOT_LIMIT = 75
MAX_HOTSPOT_LIMIT = 100

# Expected model bundle keys (verified at startup)
EXPECTED_BUNDLE_KEYS = {
    "model",
    "model_name",
    "label_encoder",
    "cat_encoders",
    "pci_scaler",
    "feature_cols",
    "label_order",
    "trained_at",
}

# Columns passed to app_utils.predict_severity / batch_predict
PREDICT_INPUT_COLS = [
    "location_type",
    "illegal_vehicle_count",
    "traffic_volume",
    "average_speed",
    "parking_occupancy",
    "road_width",
    "historical_violation_count",
    "nearby_event",
    "day_of_week",
    "time_of_day",
    "violation_score",
    "vehicle_weight",
    "delay_score",
    "is_weekend",
    "hour",
]

# Columns persisted in processed_violations.parquet
PARQUET_COLUMNS = [
    "id",
    "latitude",
    "longitude",
    "location",
    "police_station",
    "junction_name",
    "vehicle_number",
    "vehicle_type",
    "violation_type",
    "created_datetime",
    "lat_grid",
    "lon_grid",
    "location_type",
    "illegal_vehicle_count",
    "traffic_volume",
    "average_speed",
    "parking_occupancy",
    "road_width",
    "historical_violation_count",
    "nearby_event",
    "day_of_week",
    "time_of_day",
    "hour",
    "is_weekend",
    "violation_score",
    "vehicle_weight",
    "delay_score",
    "pci_score",
    "pci_category",
    "severity_level",
    "confidence_score",
    "recommended_action",
]

SEVERITY_WEIGHT = {"Low": 1, "Medium": 2, "High": 3, "Critical": 4}
DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
