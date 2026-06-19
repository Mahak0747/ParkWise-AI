"""GET /api/overview — command center KPIs."""

from __future__ import annotations

from fastapi import APIRouter

from backend.models.schemas import OverviewResponse
from backend.services.overview_service import get_overview

router = APIRouter(prefix="/api", tags=["overview"])


@router.get("/overview", response_model=OverviewResponse)
def overview() -> OverviewResponse:
    return get_overview()
