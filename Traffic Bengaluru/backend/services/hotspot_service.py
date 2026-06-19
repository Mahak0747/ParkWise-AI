"""Hotspot cluster queries — top priority locations only."""

from __future__ import annotations

from backend.core.config import DEFAULT_HOTSPOT_LIMIT, MAX_HOTSPOT_LIMIT, SEVERITY_WEIGHT
from backend.ml.inference import recommend_action
from backend.models.schemas import HotspotItem, HotspotsResponse, RecommendationResponse
from backend.services.cache_service import DataCache


def get_hotspots(
    limit: int = DEFAULT_HOTSPOT_LIMIT,
    min_severity: str | None = None,
    station: str | None = None,
) -> HotspotsResponse:
    limit = min(max(1, limit), MAX_HOTSPOT_LIMIT)
    index = DataCache.get_hotspot_index().copy()

    if min_severity:
        min_rank = SEVERITY_WEIGHT.get(min_severity, 1)
        index = index[index["max_severity_rank"] >= min_rank]

    if station:
        index = index[index["police_station"].str.lower() == station.lower()]

    total_clusters = len(index)
    top = index.head(limit)

    hotspots: list[HotspotItem] = []
    for _, row in top.iterrows():
        rec = recommend_action(row["severity"])
        hotspots.append(
            HotspotItem(
                hotspot_id=row["hotspot_id"],
                latitude=round(float(row["latitude"]), 6),
                longitude=round(float(row["longitude"]), 6),
                location_label=str(row["junction_name"] or row["location"][:80]),
                police_station=str(row["police_station"]),
                severity=str(row["severity"]),
                confidence=round(float(row["avg_confidence"]), 4),
                pci_score=round(float(row["avg_pci"]), 2),
                violation_count=int(row["violation_count"]),
                recommendation=RecommendationResponse(**rec),
                priority_score=round(float(row["priority_score"]), 2),
            )
        )

    return HotspotsResponse(
        hotspots=hotspots,
        total_clusters=total_clusters,
        returned=len(hotspots),
    )
