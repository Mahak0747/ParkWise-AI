"""Application startup — model singleton + data cache."""

from __future__ import annotations

import logging

from backend.core.config import DATA_DIR, MODEL_PKL_PATH, PROJECT_ROOT
from backend.ml.inference import ModelRegistry, verify_model_metadata
from backend.services.cache_service import DataCache

logger = logging.getLogger(__name__)


def run_startup() -> None:
    """Load model once, then load or build processed violation cache."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    logger.info("ParkWise AI backend starting")
    logger.info("Project root: %s", PROJECT_ROOT)

    bundle = ModelRegistry.load(str(MODEL_PKL_PATH))
    verify_model_metadata(bundle)
    logger.info(
        "Model loaded: %s (trained %s) — %s features",
        bundle["model_name"],
        bundle["trained_at"],
        len(bundle["feature_cols"]),
    )
    logger.info("Feature columns: %s", bundle["feature_cols"])

    DataCache.initialize()
    logger.info("Startup complete")
