from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any


def _to_radians(value: float) -> float:
    from math import pi

    return (value * pi) / 180


def _distance_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    from math import atan2, cos, sin, sqrt

    earth_radius_km = 6371.0
    dlat = _to_radians(lat2 - lat1)
    dlng = _to_radians(lng2 - lng1)
    a = sin(dlat / 2) ** 2 + cos(_to_radians(lat1)) * cos(_to_radians(lat2)) * sin(dlng / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return earth_radius_km * c


@lru_cache(maxsize=1)
def load_asset_registry() -> dict[str, Any]:
    project_root = Path(__file__).resolve().parents[2]
    registry_path = project_root / "backend" / "data" / "asset_registry.json"
    with registry_path.open("r", encoding="utf-8") as registry_file:
        return json.load(registry_file)


def _eta_minutes_for_distance(distance_km: float) -> int:
    if distance_km <= 1.0:
        return 4
    if distance_km <= 2.0:
        return 5
    if distance_km <= 4.0:
        return 8
    return 12


def _display_unit_name(unit_id: str) -> str:
    if unit_id.startswith("CSN-P"):
        return f"Beat Marshal {unit_id.split('-')[-1]}"
    if unit_id.startswith("BEAT-MARSHAL"):
        return f"Beat Marshal {unit_id.split('-')[-1]}"
    if unit_id.startswith("CSMC"):
        return f"GHANTA GAADI {unit_id}"
    return unit_id


def resolve_nearest_unit(dept: str, latitude: float, longitude: float) -> dict[str, Any] | None:
    registry = load_asset_registry()
    assets = registry.get("assets", [])
    candidates = [asset for asset in assets if str(asset.get("dept", "")).lower() == dept.lower()]
    if not candidates:
        return None

    nearest_asset: dict[str, Any] | None = None
    nearest_distance = float("inf")

    for asset in candidates:
        distance = _distance_km(
            latitude,
            longitude,
            float(asset.get("lat", latitude)),
            float(asset.get("lng", longitude)),
        )
        if distance < nearest_distance:
            nearest_distance = distance
            nearest_asset = asset

    if nearest_asset is None:
        return None

    eta_minutes = _eta_minutes_for_distance(nearest_distance)
    unit_id = str(nearest_asset.get("unit_id", "UNIT-UNKNOWN"))

    return {
        "unit_assigned": unit_id,
        "unit_type": nearest_asset.get("unit_type"),
        "zone": nearest_asset.get("zone"),
        "ward": nearest_asset.get("ward"),
        "eta": f"{eta_minutes} mins",
        "eta_minutes": eta_minutes,
        "dispatch_message": f"Dispatch Order sent to {_display_unit_name(unit_id)}. ETA {eta_minutes} minutes.",
    }
