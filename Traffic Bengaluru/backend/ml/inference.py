"""Model inference wrappers — delegates to app_utils.py."""

from __future__ import annotations

from typing import Any

import pandas as pd

from app_utils import (
    batch_predict,
    compute_pci_single,
    load_model,
    predict_severity,
    recommend_action,
)

from backend.core.config import MODEL_PKL_PATH


class ModelRegistry:
    """Singleton holder for the loaded model bundle."""

    _bundle: dict[str, Any] | None = None

    @classmethod
    def get_bundle(cls) -> dict[str, Any]:
        if cls._bundle is None:
            raise RuntimeError("Model not loaded. Application startup has not completed.")
        return cls._bundle

    @classmethod
    def load(cls, pkl_path: str | None = None) -> dict[str, Any]:
        path = str(pkl_path or MODEL_PKL_PATH)
        cls._bundle = load_model(path)
        return cls._bundle

    @classmethod
    def is_loaded(cls) -> bool:
        return cls._bundle is not None


def verify_model_metadata(bundle: dict[str, Any]) -> None:
    """Validate bundle structure and feature columns at startup."""
    from backend.core.config import EXPECTED_BUNDLE_KEYS

    missing = EXPECTED_BUNDLE_KEYS - set(bundle.keys())
    if missing:
        raise ValueError(f"model.pkl missing keys: {sorted(missing)}")

    feature_cols = bundle["feature_cols"]
    if not feature_cols or len(feature_cols) != 16:
        raise ValueError(f"Expected 16 feature columns, got {len(feature_cols)}")

    label_order = bundle["label_order"]
    if list(label_order) != ["Low", "Medium", "High", "Critical"]:
        raise ValueError(f"Unexpected label_order: {label_order}")

    if not hasattr(bundle["model"], "predict"):
        raise ValueError("Bundle 'model' is not a valid sklearn estimator")


def run_predict(input_data: dict[str, Any]) -> dict[str, Any]:
    return predict_severity(input_data, ModelRegistry.get_bundle())


def run_batch_predict(df: pd.DataFrame) -> pd.DataFrame:
    return batch_predict(df, ModelRegistry.get_bundle())


def get_feature_importance() -> list[dict[str, float]]:
    bundle = ModelRegistry.get_bundle()
    model = bundle["model"]
    cols = bundle["feature_cols"]
    if not hasattr(model, "feature_importances_"):
        return []
    return [
        {"feature": name, "importance": round(float(score), 6)}
        for name, score in sorted(
            zip(cols, model.feature_importances_),
            key=lambda x: x[1],
            reverse=True,
        )
    ]


__all__ = [
    "ModelRegistry",
    "compute_pci_single",
    "get_feature_importance",
    "load_model",
    "predict_severity",
    "recommend_action",
    "run_batch_predict",
    "run_predict",
    "verify_model_metadata",
]
