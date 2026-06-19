"""Analytics aggregations from precomputed cache."""

from __future__ import annotations

from backend.models.schemas import AnalyticsResponse
from backend.services.cache_service import DataCache


def get_analytics() -> AnalyticsResponse:
    data = DataCache.get_analytics()
    return AnalyticsResponse(
        violations_by_station=data["violations_by_station"],
        violations_by_hour=data["violations_by_hour"],
        violations_by_day=data["violations_by_day"],
        severity_distribution=data["severity_distribution"],
        feature_importance=data["feature_importance"],
        total_violations=data["total_violations"],
    )
