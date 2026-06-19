"""Command center overview KPIs derived from real cached predictions."""

from __future__ import annotations

import json

from backend.core.config import OFFICERS_SEED_PATH
from backend.models.schemas import OverviewResponse
from backend.services.cache_service import DataCache


def _count_officers_deployed() -> int:
    """Count officers marked Available or Busy in seed file."""
    if not OFFICERS_SEED_PATH.exists():
        return 0
    with open(OFFICERS_SEED_PATH, encoding="utf-8") as f:
        officers = json.load(f)
    return sum(1 for o in officers if o.get("availability") in ("Available", "Busy"))


def _estimate_congestion_reduction() -> float:
    """
    Estimate fleet-wide congestion reduction if critical hotspots are enforced.
    Based on PCI improvement potential for Critical-severity clusters.
    """
    index = DataCache.get_hotspot_index()
    critical = index[index["severity"] == "Critical"]
    if critical.empty:
        return 0.0

    # Tow-level enforcement on critical clusters: ~35% PCI reduction (from plan)
    reduction_factor = 0.35
    weighted_pci = (critical["avg_pci"] * critical["violation_count"]).sum()
    total_weight = critical["violation_count"].sum()
    if total_weight == 0:
        return 0.0
    avg_critical_pci = weighted_pci / total_weight
    return round(float(avg_critical_pci * reduction_factor / 100 * 100), 2)


def get_overview() -> OverviewResponse:
    df = DataCache.get_dataframe()
    index = DataCache.get_hotspot_index()

    critical_hotspots = int((index["severity"] == "Critical").sum())
    active_violations = int((df["severity_level"].isin(["High", "Critical"])).sum())
    average_pci = round(float(df["pci_score"].mean()), 2)

    return OverviewResponse(
        active_violations=active_violations,
        critical_hotspots=critical_hotspots,
        officers_deployed=_count_officers_deployed(),
        average_pci=average_pci,
        estimated_congestion_reduction_pct=_estimate_congestion_reduction(),
    )
