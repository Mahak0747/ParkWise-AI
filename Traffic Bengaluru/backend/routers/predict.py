"""POST /api/predict — real model inference via app_utils."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from backend.ml.inference import run_predict
from backend.models.schemas import PredictRequest, PredictResponse, RecommendationResponse

router = APIRouter(prefix="/api", tags=["predict"])


@router.post("/predict", response_model=PredictResponse)
def predict(body: PredictRequest) -> PredictResponse:
    try:
        result = run_predict(body.model_dump(exclude_none=True))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}") from exc

    rec = result["recommendation"]
    return PredictResponse(
        severity=result["severity_level"],
        confidence=result["confidence_score"],
        pci_score=result["pci_score"],
        pci_category=result["pci_category"],
        recommendation=RecommendationResponse(**rec),
        all_probabilities=result.get("all_probabilities"),
    )
