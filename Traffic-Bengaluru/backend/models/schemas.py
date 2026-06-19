"""Pydantic request/response schemas."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class PredictRequest(BaseModel):
    location_type: str = Field(..., examples=["Junction"])
    illegal_vehicle_count: float = Field(..., ge=1, le=20)
    traffic_volume: float = Field(..., ge=100, le=2000)
    average_speed: float = Field(..., ge=5, le=60)
    parking_occupancy: float = Field(..., ge=0, le=100)
    road_width: float = Field(..., ge=4, le=24)
    historical_violation_count: float = Field(..., ge=1)
    nearby_event: int = Field(..., ge=0, le=1)
    day_of_week: int = Field(..., ge=0, le=6, description="0=Monday")
    time_of_day: str = Field(..., examples=["Evening"])
    violation_score: float | None = None
    vehicle_weight: float | None = None
    delay_score: float | None = None
    is_weekend: int | None = None
    hour: int | None = None


class RecommendationResponse(BaseModel):
    action: str
    message: str
    icon: str
    priority: int
    notification: bool
    challan: bool
    towing: bool
    officer: bool


class PredictResponse(BaseModel):
    severity: str
    confidence: float
    pci_score: float
    pci_category: str
    recommendation: RecommendationResponse
    all_probabilities: dict[str, float] | None = None


class HotspotItem(BaseModel):
    hotspot_id: str
    latitude: float
    longitude: float
    location_label: str
    police_station: str
    severity: str
    confidence: float
    pci_score: float
    violation_count: int
    recommendation: RecommendationResponse
    priority_score: float


class HotspotsResponse(BaseModel):
    hotspots: list[HotspotItem]
    total_clusters: int
    returned: int


class OverviewResponse(BaseModel):
    active_violations: int
    critical_hotspots: int
    officers_deployed: int
    average_pci: float
    estimated_congestion_reduction_pct: float


class FeatureImportanceItem(BaseModel):
    feature: str
    importance: float


class AnalyticsResponse(BaseModel):
    violations_by_station: list[dict[str, Any]]
    violations_by_hour: list[dict[str, Any]]
    violations_by_day: list[dict[str, Any]]
    severity_distribution: dict[str, int]
    feature_importance: list[FeatureImportanceItem]
    total_violations: int
