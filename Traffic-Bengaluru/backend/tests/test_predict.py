"""Backend API tests — verify real model inference."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


@pytest.fixture(scope="module")
def app_client():
    from fastapi.testclient import TestClient
    from backend.main import app

    with TestClient(app) as client:
        yield client


def test_health(app_client):
    resp = app_client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["model_loaded"] is True
    assert body["cache_loaded"] is True


def test_predict_returns_model_output(app_client):
    payload = {
        "location_type": "Junction",
        "illegal_vehicle_count": 8,
        "traffic_volume": 900,
        "average_speed": 18.5,
        "parking_occupancy": 72.0,
        "road_width": 12.0,
        "historical_violation_count": 120,
        "nearby_event": 1,
        "day_of_week": 5,
        "time_of_day": "Evening",
    }
    resp = app_client.post("/api/predict", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["severity"] in ("Low", "Medium", "High", "Critical")
    assert 0 < data["confidence"] <= 1
    assert 0 <= data["pci_score"] <= 100
    assert "action" in data["recommendation"]


def test_hotspots_limited(app_client):
    resp = app_client.get("/api/hotspots?limit=50")
    assert resp.status_code == 200
    data = resp.json()
    assert data["returned"] <= 50
    assert len(data["hotspots"]) <= 50
    if data["hotspots"]:
        h = data["hotspots"][0]
        assert "hotspot_id" in h
        assert h["severity"] in ("Low", "Medium", "High", "Critical")


def test_overview(app_client):
    resp = app_client.get("/api/overview")
    assert resp.status_code == 200
    data = resp.json()
    assert data["active_violations"] > 0
    assert data["average_pci"] > 0


def test_analytics(app_client):
    resp = app_client.get("/api/analytics")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_violations"] > 0
    assert len(data["feature_importance"]) > 0
    assert sum(data["severity_distribution"].values()) == data["total_violations"]
