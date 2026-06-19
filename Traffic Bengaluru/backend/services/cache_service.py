"""Processed violation cache — build once, load on subsequent startups."""

from __future__ import annotations

import logging
from typing import Any

import pandas as pd

from backend.core.config import (
    BATCH_PREDICT_CHUNK_SIZE,
    PARQUET_COLUMNS,
    PREDICT_INPUT_COLS,
    PROCESSED_PARQUET_PATH,
    RAW_CSV_PATH,
)
from backend.ml.feature_engineering import build_features, load_raw_data
from backend.ml.inference import ModelRegistry, run_batch_predict

logger = logging.getLogger(__name__)


def _mode_or_first(series: pd.Series) -> str:
    """Safe mode for groupby agg — handles empty/all-NaN groups."""
    if series.empty:
        return ""
    cleaned = series.dropna()
    if cleaned.empty:
        return ""
    modes = cleaned.mode()
    if len(modes) > 0:
        return str(modes.iloc[0])
    return str(cleaned.iloc[0])


class DataCache:
    """In-memory store for preprocessed violations and derived aggregates."""

    _df: pd.DataFrame | None = None
    _hotspot_index: pd.DataFrame | None = None
    _analytics: dict[str, Any] | None = None

    @classmethod
    def get_dataframe(cls) -> pd.DataFrame:
        if cls._df is None:
            raise RuntimeError("Data cache not initialized.")
        return cls._df

    @classmethod
    def get_hotspot_index(cls) -> pd.DataFrame:
        if cls._hotspot_index is None:
            raise RuntimeError("Hotspot index not initialized.")
        return cls._hotspot_index

    @classmethod
    def get_analytics(cls) -> dict[str, Any]:
        if cls._analytics is None:
            raise RuntimeError("Analytics cache not initialized.")
        return cls._analytics

    @classmethod
    def initialize(cls) -> pd.DataFrame:
        if PROCESSED_PARQUET_PATH.exists():
            logger.info("Loading processed cache from %s", PROCESSED_PARQUET_PATH)
            cls._df = pd.read_parquet(PROCESSED_PARQUET_PATH)
        else:
            logger.info("Processed cache not found — building from raw CSV (one-time)")
            cls._df = cls._build_and_save_cache()

        cls._hotspot_index = cls._build_hotspot_index(cls._df)
        cls._analytics = cls._build_analytics_cache(cls._df)
        logger.info(
            "Data cache ready: %s violations, %s hotspot clusters",
            f"{len(cls._df):,}",
            f"{len(cls._hotspot_index):,}",
        )
        return cls._df

    @classmethod
    def _build_and_save_cache(cls) -> pd.DataFrame:
        if not RAW_CSV_PATH.exists():
            raise FileNotFoundError(f"Raw CSV not found: {RAW_CSV_PATH}")

        bundle = ModelRegistry.get_bundle()
        if bundle is None:
            raise RuntimeError("Model must be loaded before building cache.")

        df_raw = load_raw_data(str(RAW_CSV_PATH))
        df_features, _pci_scaler = build_features(df_raw)

        predict_df = df_features[PREDICT_INPUT_COLS].copy()
        total = len(predict_df)
        chunks: list[pd.DataFrame] = []

        for start in range(0, total, BATCH_PREDICT_CHUNK_SIZE):
            end = min(start + BATCH_PREDICT_CHUNK_SIZE, total)
            chunk = predict_df.iloc[start:end]
            predicted = run_batch_predict(chunk)
            chunks.append(predicted)
            logger.info("Batch predict progress: %s / %s", end, total)

        predicted_all = pd.concat(chunks, ignore_index=True)

        # Attach predictions back to full feature frame
        for col in ["severity_level", "confidence_score", "pci_score", "pci_category", "recommended_action"]:
            df_features[col] = predicted_all[col].values

        # Select columns for persistence
        available = [c for c in PARQUET_COLUMNS if c in df_features.columns]
        result = df_features[available].copy()

        PROCESSED_PARQUET_PATH.parent.mkdir(parents=True, exist_ok=True)
        result.to_parquet(PROCESSED_PARQUET_PATH, index=False)
        logger.info("Saved processed cache → %s", PROCESSED_PARQUET_PATH)
        return result

    @staticmethod
    def _build_hotspot_index(df: pd.DataFrame) -> pd.DataFrame:
        """Aggregate violations by grid cell (~250 m) from train_model.py logic."""
        from backend.core.config import SEVERITY_WEIGHT

        severity_rank = df["severity_level"].map(SEVERITY_WEIGHT).fillna(1)

        grouped = df.assign(_severity_rank=severity_rank).groupby(
            ["lat_grid", "lon_grid"], as_index=False
        ).agg(
            latitude=("latitude", "mean"),
            longitude=("longitude", "mean"),
            violation_count=("id", "count"),
            avg_confidence=("confidence_score", "mean"),
            avg_pci=("pci_score", "mean"),
            avg_delay=("delay_score", "mean"),
            max_severity_rank=("_severity_rank", "max"),
            police_station=("police_station", _mode_or_first),
            junction_name=("junction_name", _mode_or_first),
            location=("location", _mode_or_first),
            dominant_action=("recommended_action", _mode_or_first),
        )

        rank_to_severity = {v: k for k, v in SEVERITY_WEIGHT.items()}
        grouped["severity"] = grouped["max_severity_rank"].map(rank_to_severity)

        grouped["priority_score"] = (
            grouped["max_severity_rank"] / 4 * 0.35
            + grouped["avg_pci"] / 100 * 0.25
            + grouped["avg_delay"] / 100 * 0.20
            + (grouped["violation_count"] / grouped["violation_count"].max()) * 0.20
        ) * 100

        grouped["hotspot_id"] = grouped.apply(
            lambda r: f"grid_{int(r['lat_grid'])}_{int(r['lon_grid'])}", axis=1
        )
        return grouped.sort_values("priority_score", ascending=False).reset_index(drop=True)

    @staticmethod
    def _build_analytics_cache(df: pd.DataFrame) -> dict[str, Any]:
        from backend.core.config import DAY_NAMES
        from backend.ml.inference import get_feature_importance

        df = df.copy()
        df["created_datetime"] = pd.to_datetime(df["created_datetime"], utc=True)

        by_hour = (
            df.groupby("hour", as_index=False)
            .size()
            .rename(columns={"size": "count"})
            .sort_values("hour")
        )
        by_day = (
            df.groupby("day_of_week", as_index=False)
            .size()
            .rename(columns={"size": "count"})
            .sort_values("day_of_week")
        )
        by_day["day"] = by_day["day_of_week"].map(lambda i: DAY_NAMES[int(i)])

        by_station = (
            df.groupby("police_station", as_index=False)
            .size()
            .rename(columns={"size": "count"})
            .sort_values("count", ascending=False)
        )

        severity_distribution = (
            df["severity_level"].value_counts().reindex(["Low", "Medium", "High", "Critical"]).fillna(0).astype(int)
        )

        return {
            "violations_by_hour": by_hour.to_dict(orient="records"),
            "violations_by_day": by_day[["day", "day_of_week", "count"]].to_dict(orient="records"),
            "violations_by_station": by_station.to_dict(orient="records"),
            "severity_distribution": severity_distribution.to_dict(),
            "feature_importance": get_feature_importance(),
            "total_violations": len(df),
        }
