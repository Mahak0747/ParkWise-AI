"""GET /api/analytics — violation trends and model feature importance."""

from __future__ import annotations

from fastapi import APIRouter

from backend.models.schemas import AnalyticsResponse
from backend.services.analytics_service import get_analytics

router = APIRouter(prefix="/api", tags=["analytics"])


@router.get("/analytics", response_model=AnalyticsResponse)
def analytics() -> AnalyticsResponse:
    return get_analytics()
