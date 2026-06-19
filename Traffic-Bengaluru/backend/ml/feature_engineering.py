"""
Feature engineering — reuses the exact pipeline from train_model.py.

Do not duplicate logic; import and expose the training-time functions.
"""

from __future__ import annotations

# Re-export the full training pipeline (same module the model was trained with)
from train_model import (  # noqa: F401
    FEATURE_COLS,
    SEED,
    TARGET_COL,
    VEHICLE_WEIGHT,
    VIOLATION_SEVERITY,
    add_time_features,
    assign_severity,
    build_features,
    compute_hotspot_features,
    compute_pci,
    derive_delay_score,
    load_raw_data,
    location_type_from_junction,
    parse_violation_list,
    synthesize_simulation_features,
    violation_score,
)

__all__ = [
    "FEATURE_COLS",
    "SEED",
    "TARGET_COL",
    "VEHICLE_WEIGHT",
    "VIOLATION_SEVERITY",
    "add_time_features",
    "assign_severity",
    "build_features",
    "compute_hotspot_features",
    "compute_pci",
    "derive_delay_score",
    "load_raw_data",
    "location_type_from_junction",
    "parse_violation_list",
    "synthesize_simulation_features",
    "violation_score",
]
