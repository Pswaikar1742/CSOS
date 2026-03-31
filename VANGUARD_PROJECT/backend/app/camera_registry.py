from __future__ import annotations

import csv
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any


CSV_FILENAME = "Area name and coordinates - give me area name and some assumed camera positio....csv"
CSV_PATH = Path(__file__).resolve().parent.parent / CSV_FILENAME

_STOPWORDS = {
    "cam",
    "camera",
    "csn",
    "node",
    "id",
    "area",
    "landmark",
    "road",
    "junction",
    "chowk",
}

_KNOWN_CAMERA_ALIAS: tuple[tuple[str, str], ...] = (
    ("kranti", "CAM_KRANTI_CHOWK"),
    ("cidco", "CAM_CIDCO_N6"),
    ("connaught", "CAM_CIDCO_N6"),
    ("beed", "CAM_BEED_BYPASS"),
    ("devlai", "CAM_BEED_BYPASS"),
    ("railway", "CAM_RAILWAY_STATION_ROAD"),
    ("station", "CAM_RAILWAY_STATION_ROAD"),
    ("aurangpura", "CAM_AURANGPURA"),
)


@dataclass(frozen=True)
class AreaCoordinate:
    node_id: str
    area_name: str
    latitude: float
    longitude: float
    area_tokens: set[str]


def _normalize(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", str(value).lower()).strip()


def _tokenize(value: str) -> set[str]:
    tokens = set(_normalize(value).split())
    return {token for token in tokens if token and token not in _STOPWORDS}


def _safe_float(value: Any) -> float | None:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    if result != result:  # NaN guard
        return None
    return result


def _extract_csv_value(row: dict[str, str], needle: str) -> str:
    needle_norm = _normalize(needle)
    for key, value in row.items():
        if needle_norm in _normalize(key):
            return str(value or "").strip()
    return ""


@lru_cache(maxsize=1)
def load_area_coordinates() -> tuple[AreaCoordinate, ...]:
    if not CSV_PATH.exists():
        return tuple()

    rows: list[AreaCoordinate] = []
    with CSV_PATH.open("r", encoding="utf-8-sig", newline="") as file_handle:
        reader = csv.DictReader(file_handle)
        for row in reader:
            node_id = _extract_csv_value(row, "Node ID")
            area_name = _extract_csv_value(row, "Area / Landmark Name")
            lat = _safe_float(_extract_csv_value(row, "Latitude"))
            lng = _safe_float(_extract_csv_value(row, "Longitude"))

            if not node_id or not area_name or lat is None or lng is None:
                continue

            rows.append(
                AreaCoordinate(
                    node_id=node_id,
                    area_name=area_name,
                    latitude=lat,
                    longitude=lng,
                    area_tokens=_tokenize(area_name),
                )
            )

    return tuple(rows)


def _node_id_from_camera_id(camera_id: str) -> str | None:
    match = re.search(r"csn[-_]?0*(\d{1,3})", camera_id, flags=re.IGNORECASE)
    if not match:
        return None
    return f"CSN-{int(match.group(1)):03d}"


def derive_backend_camera_id(node_id: str, area_name: str) -> str:
    normalized = _normalize(area_name)
    for token, camera_id in _KNOWN_CAMERA_ALIAS:
        if token in normalized:
            return camera_id
    return f"CAM_{node_id.replace('-', '_')}"


def get_camera_nodes() -> list[dict[str, Any]]:
    nodes: list[dict[str, Any]] = []
    for entry in load_area_coordinates():
        nodes.append(
            {
                "node_id": entry.node_id,
                "camera_id": derive_backend_camera_id(entry.node_id, entry.area_name),
                "area_name": entry.area_name,
                "latitude": entry.latitude,
                "longitude": entry.longitude,
            }
        )
    return nodes


def resolve_camera_context(
    camera_id: str | None,
    area_hint: str | None = None,
    lat: float | None = None,
    lng: float | None = None,
) -> dict[str, Any]:
    entries = load_area_coordinates()
    camera_value = str(camera_id or "").strip()
    area_hint_value = str(area_hint or "").strip()

    if not entries:
        return {
            "camera_id": camera_value,
            "node_id": None,
            "area_name": area_hint_value or camera_value or "Unknown Area",
            "latitude": lat,
            "longitude": lng,
            "source": "raw",
        }

    explicit_node = _node_id_from_camera_id(camera_value)
    if explicit_node:
        for entry in entries:
            if entry.node_id.upper() == explicit_node.upper():
                return {
                    "camera_id": camera_value,
                    "node_id": entry.node_id,
                    "area_name": entry.area_name,
                    "latitude": entry.latitude,
                    "longitude": entry.longitude,
                    "source": "csv-node-id",
                }

    camera_tokens = _tokenize(camera_value)
    hint_tokens = _tokenize(area_hint_value)

    best: AreaCoordinate | None = None
    best_score = 0.0

    for entry in entries:
        score = 0.0
        if hint_tokens:
            overlap = len(entry.area_tokens & hint_tokens)
            if overlap:
                score += 8.0 * (overlap / max(len(hint_tokens), 1))
        if camera_tokens:
            overlap = len(entry.area_tokens & camera_tokens)
            if overlap:
                score += 6.0 * (overlap / max(len(camera_tokens), 1))

        if score > best_score:
            best_score = score
            best = entry

    if best is not None and best_score >= 2.0:
        return {
            "camera_id": camera_value,
            "node_id": best.node_id,
            "area_name": best.area_name,
            "latitude": best.latitude,
            "longitude": best.longitude,
            "source": "csv-token-match",
        }

    return {
        "camera_id": camera_value,
        "node_id": None,
        "area_name": area_hint_value or camera_value or "Unknown Area",
        "latitude": lat,
        "longitude": lng,
        "source": "raw",
    }
