"""
=============================================================================
Smart Parking Intelligence System — App Utilities
=============================================================================
Provides:
  • load_model()          – Load pickled model bundle
  • predict_severity()    – Inference pipeline for a single observation
  • recommend_action()    – Rule-based enforcement recommendation engine
  • compute_pci_single()  – PCI for a single row
  • batch_predict()       – DataFrame-level inference
=============================================================================
"""

import pickle
import numpy as np
import pandas as pd
from typing import Union

# ── Public label order ────────────────────────────────────────────────────────
LABEL_ORDER = ["Low", "Medium", "High", "Critical"]

# ── Recommendation engine ─────────────────────────────────────────────────────
RECOMMENDATION_MAP = {
    "Low":      {
        "action":       "Warning Only",
        "message":      "Issue a verbal warning to the vehicle owner.",
        "icon":         "⚠️",
        "priority":     1,
        "notification": False,
        "challan":      False,
        "towing":       False,
        "officer":      False,
    },
    "Medium":   {
        "action":       "Send Warning Notification",
        "message":      "Send SMS / app notification warning to registered owner.",
        "icon":         "📲",
        "priority":     2,
        "notification": True,
        "challan":      False,
        "towing":       False,
        "officer":      False,
    },
    "High":     {
        "action":       "Issue e-Challan",
        "message":      "Generate e-challan and notify owner through VAHAN portal.",
        "icon":         "📋",
        "priority":     3,
        "notification": True,
        "challan":      True,
        "towing":       False,
        "officer":      False,
    },
    "Critical": {
        "action":       "Tow Vehicle + Deploy Officer",
        "message":      "Immediate towing required. Deploy traffic officer on-site.",
        "icon":         "🚨",
        "priority":     4,
        "notification": True,
        "challan":      True,
        "towing":       True,
        "officer":      True,
    },
}


# ══════════════════════════════════════════════════════════════════════════════
# Model loader
# ══════════════════════════════════════════════════════════════════════════════

_BUNDLE_CACHE: dict = {}   # simple in-process cache

def load_model(pkl_path: str = "model.pkl") -> dict:
    """
    Load and cache the pickled model bundle.

    Returns a dict with keys:
        model, model_name, label_encoder, cat_encoders,
        pci_scaler, feature_cols, label_order, trained_at
    """
    global _BUNDLE_CACHE
    if pkl_path not in _BUNDLE_CACHE:
        with open(pkl_path, "rb") as f:
            _BUNDLE_CACHE[pkl_path] = pickle.load(f)
    return _BUNDLE_CACHE[pkl_path]


# ══════════════════════════════════════════════════════════════════════════════
# PCI helper
# ══════════════════════════════════════════════════════════════════════════════

def compute_pci_single(
    illegal_vehicle_count: float,
    traffic_volume: float,
    delay_score: float,
    parking_occupancy: float,
    pci_scaler,
) -> tuple[float, str]:
    """
    Parking Congestion Index for a single observation.
    Returns (pci_score 0-100, pci_category).
    """
    row = np.array([[illegal_vehicle_count, traffic_volume, delay_score, parking_occupancy]])
    normed = pci_scaler.transform(row)[0]
    weights = np.array([0.4, 0.3, 0.2, 0.1])
    pci = float((normed * weights).sum() * 100)
    pci = max(0.0, min(100.0, pci))

    if pci <= 25:   cat = "Low"
    elif pci <= 50: cat = "Moderate"
    elif pci <= 75: cat = "High"
    else:           cat = "Critical"

    return round(pci, 2), cat


# ══════════════════════════════════════════════════════════════════════════════
# Inference pipeline
# ══════════════════════════════════════════════════════════════════════════════

def _derive_extra_features(input_dict: dict) -> dict:
    """
    Derive engineered features not directly supplied by the caller.
    Mirrors the logic in train_model.py so the feature vector is consistent.
    """
    d = input_dict.copy()

    # violation_score: simple heuristic from illegal_vehicle_count
    d.setdefault("violation_score", min(4, max(1, int(d["illegal_vehicle_count"] // 3) + 1)))

    # vehicle_weight: default 2 if not supplied
    d.setdefault("vehicle_weight", 2)

    # delay_score
    avg_speed  = float(d.get("average_speed", 30))
    traffic_v  = float(d.get("traffic_volume", 500))
    d["delay_score"] = round(((60 - avg_speed) / 60) * (traffic_v / 2000) * 100, 2)
    d["delay_score"] = max(0.0, min(100.0, d["delay_score"]))

    # hour from time_of_day
    tod_hour = {
        "Night": 2, "Morning": 8, "Afternoon": 14,
        "Evening": 18,
    }
    d.setdefault("hour", tod_hour.get(str(d.get("time_of_day", "Morning")), 8))

    # is_weekend from day_of_week (0=Mon)
    dow = d.get("day_of_week", 0)
    if isinstance(dow, str):
        _dow_map = {"Monday":0,"Tuesday":1,"Wednesday":2,"Thursday":3,
                    "Friday":4,"Saturday":5,"Sunday":6}
        dow = _dow_map.get(dow.capitalize(), 0)
        d["day_of_week"] = dow
    d["is_weekend"] = int(dow >= 5)

    # historical_violation_count default
    d.setdefault("historical_violation_count", 50)

    return d


def predict_severity(
    input_data: dict,
    bundle: dict,
) -> dict:
    """
    Predict severity level for a single parking observation.

    Parameters
    ----------
    input_data : dict with keys —
        location_type, illegal_vehicle_count, traffic_volume,
        average_speed, parking_occupancy, road_width,
        historical_violation_count, nearby_event,
        day_of_week, time_of_day
    bundle : dict returned by load_model()

    Returns
    -------
    dict :
        severity_level     (str)
        confidence_score   (float 0-1)
        pci_score          (float 0-100)
        pci_category       (str)
        recommendation     (dict)
        feature_vector     (dict)
    """
    model        = bundle["model"]
    le_target    = bundle["label_encoder"]
    cat_encoders = bundle["cat_encoders"]
    pci_scaler   = bundle["pci_scaler"]
    feature_cols = bundle["feature_cols"]

    # ── Enrich with derived fields ────────────────────────────────────────────
    d = _derive_extra_features(input_data)

    # ── PCI ───────────────────────────────────────────────────────────────────
    pci_score, pci_cat = compute_pci_single(
        d["illegal_vehicle_count"],
        d["traffic_volume"],
        d["delay_score"],
        d["parking_occupancy"],
        pci_scaler,
    )
    d["pci_score"] = pci_score

    # ── Build feature row ─────────────────────────────────────────────────────
    row = []
    for col in feature_cols:
        val = d.get(col, 0)
        if col in cat_encoders:
            le = cat_encoders[col]
            val_str = str(val)
            if val_str in le.classes_:
                val = int(le.transform([val_str])[0])
            else:
                val = -1
        row.append(float(val) if val is not None else 0.0)

    X = np.array([row])

    # ── Inference ─────────────────────────────────────────────────────────────
    pred_idx   = int(model.predict(X)[0])
    proba      = model.predict_proba(X)[0]
    confidence = float(proba[pred_idx])
    severity   = le_target.inverse_transform([pred_idx])[0]

    # ── Recommendation ────────────────────────────────────────────────────────
    rec = recommend_action(severity)

    return {
        "severity_level":   severity,
        "confidence_score": round(confidence, 4),
        "pci_score":        pci_score,
        "pci_category":     pci_cat,
        "recommendation":   rec,
        "all_probabilities": {
            LABEL_ORDER[i]: round(float(p), 4)
            for i, p in enumerate(proba)
        },
        "feature_vector":   {k: d.get(k) for k in feature_cols},
    }


# ══════════════════════════════════════════════════════════════════════════════
# Recommendation engine
# ══════════════════════════════════════════════════════════════════════════════

def recommend_action(severity: str) -> dict:
    """
    Returns enforcement recommendation for a given severity level.

    Severity → Action:
      Low      → Warning Only
      Medium   → Send warning notification
      High     → Recommend e-challan
      Critical → Recommend towing + officer deployment
    """
    if severity not in RECOMMENDATION_MAP:
        raise ValueError(f"Unknown severity '{severity}'. Must be one of {LABEL_ORDER}")
    return RECOMMENDATION_MAP[severity]


# ══════════════════════════════════════════════════════════════════════════════
# Batch prediction helper
# ══════════════════════════════════════════════════════════════════════════════

def batch_predict(df: pd.DataFrame, bundle: dict) -> pd.DataFrame:
    """
    Apply predict_severity to every row in a DataFrame.
    Expects the same columns as predict_severity's input_data.

    Returns original DataFrame with appended columns:
        severity_level, confidence_score, pci_score,
        pci_category, recommended_action
    """
    results = df.to_dict(orient="records")
    preds = [predict_severity(r, bundle) for r in results]

    df = df.copy()
    df["severity_level"]     = [p["severity_level"]   for p in preds]
    df["confidence_score"]   = [p["confidence_score"] for p in preds]
    df["pci_score"]          = [p["pci_score"]        for p in preds]
    df["pci_category"]       = [p["pci_category"]     for p in preds]
    df["recommended_action"] = [p["recommendation"]["action"] for p in preds]
    return df


# ══════════════════════════════════════════════════════════════════════════════
# Quick self-test
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import json, sys

    pkl_path = sys.argv[1] if len(sys.argv) > 1 else "/mnt/user-data/outputs/model.pkl"
    bundle = load_model(pkl_path)
    print(f"Loaded model: {bundle['model_name']}  (trained {bundle['trained_at']})")

    # Example prediction
    sample = {
        "location_type":              "Junction",
        "illegal_vehicle_count":      8,
        "traffic_volume":             900,
        "average_speed":              18.5,
        "parking_occupancy":          72.0,
        "road_width":                 12.0,
        "historical_violation_count": 120,
        "nearby_event":               1,
        "day_of_week":                5,       # Saturday
        "time_of_day":                "Evening",
    }

    result = predict_severity(sample, bundle)
    print("\n── Sample Prediction ─────────────────────────────────")
    print(json.dumps(result, indent=2, default=str))
