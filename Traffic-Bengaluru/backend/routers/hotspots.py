"""GET /api/hotspots — top priority grid clusters."""

from __future__ import annotations

from fastapi import APIRouter, Query

from backend.models.schemas import HotspotsResponse
from backend.services.hotspot_service import get_hotspots

router = APIRouter(prefix="/api", tags=["hotspots"])


@router.get("/hotspots", response_model=HotspotsResponse)
def hotspots(
    limit: int = Query(75, ge=1, le=100),
    min_severity: str | None = Query(None, description="Low | Medium | High | Critical"),
    station: str | None = Query(None, description="Filter by police station name"),
) -> HotspotsResponse:
    return get_hotspots(limit=limit, min_severity=min_severity, station=station)
