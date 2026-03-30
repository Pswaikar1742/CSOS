from __future__ import annotations

from pathlib import Path
from typing import Any

import pandas as pd


ANPR_COLUMNS = [
    "license_plate",
    "owner_name",
    "owner_address",
    "is_blacklisted",
    "blacklist_reason",
    "blacklist_priority",
    "blacklist_jurisdiction",
]


def _normalize_license_plate(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip().upper()


def _build_base_anpr_dataframe(project_root: Path) -> pd.DataFrame:
    preferred_path = project_root / "data" / "anpr_rto_db.csv"
    fallback_path = project_root / "data" / "anpr_db.csv"

    source_path = preferred_path if preferred_path.exists() else fallback_path
    if source_path.exists() and source_path.stat().st_size > 0:
        dataframe = pd.read_csv(source_path)
    else:
        dataframe = pd.DataFrame(columns=["license_plate", "owner_name", "owner_address"])

    dataframe = dataframe.rename(
        columns={
            "plate": "license_plate",
            "vehicle_number": "license_plate",
            "owner": "owner_name",
            "address": "owner_address",
        }
    )

    for column in ("license_plate", "owner_name", "owner_address"):
        if column not in dataframe.columns:
            dataframe[column] = None

    dataframe["license_plate"] = dataframe["license_plate"].apply(_normalize_license_plate)
    return dataframe[["license_plate", "owner_name", "owner_address"]]


def _build_blacklist_dataframe(project_root: Path) -> pd.DataFrame:
    blacklist_paths = [
        project_root / "backend" / "anpr_blacklist.csv",
        project_root / "backend" / "anpr_blacklist_15.csv",
        project_root / "data" / "anpr_blacklist.csv",
        project_root / "data" / "anpr_blacklist_15.csv",
    ]

    blacklist_df = pd.DataFrame(
        columns=[
            "license_plate",
            "blacklist_reason",
            "blacklist_priority",
            "blacklist_jurisdiction",
            "is_blacklisted",
        ]
    )

    for path in blacklist_paths:
        if not path.exists() or path.stat().st_size == 0:
            continue

        loaded = pd.read_csv(path)
        loaded = loaded.rename(
            columns={
                "LicensePlate": "license_plate",
                "ReasonCategory": "blacklist_reason",
                "Priority": "blacklist_priority",
                "Jurisdiction": "blacklist_jurisdiction",
            }
        )

        for column in ("license_plate", "blacklist_reason", "blacklist_priority", "blacklist_jurisdiction"):
            if column not in loaded.columns:
                loaded[column] = None

        loaded = loaded[["license_plate", "blacklist_reason", "blacklist_priority", "blacklist_jurisdiction"]]
        loaded["license_plate"] = loaded["license_plate"].apply(_normalize_license_plate)
        loaded["is_blacklisted"] = True
        blacklist_df = pd.concat([blacklist_df, loaded], ignore_index=True)

    blacklist_df = blacklist_df.drop_duplicates(subset=["license_plate"], keep="first")
    return blacklist_df


def load_anpr_index(project_root: Path | None = None) -> pd.DataFrame:
    if project_root is None:
        project_root = Path(__file__).resolve().parents[3]

    base_df = _build_base_anpr_dataframe(project_root)
    blacklist_df = _build_blacklist_dataframe(project_root)

    merged = base_df.merge(blacklist_df, on="license_plate", how="outer")
    merged["is_blacklisted"] = merged["is_blacklisted"].fillna(False).astype(bool)

    for column in ANPR_COLUMNS:
        if column not in merged.columns:
            merged[column] = None

    merged["license_plate"] = merged["license_plate"].apply(_normalize_license_plate)
    return merged[ANPR_COLUMNS]


def enrich_payload_from_anpr_index(payload: dict[str, Any], anpr_index: pd.DataFrame) -> dict[str, Any]:
    enriched_payload = dict(payload)

    license_plate = _normalize_license_plate(payload.get("license_plate"))
    if not license_plate:
        return enriched_payload

    if anpr_index.empty or "license_plate" not in anpr_index.columns:
        return enriched_payload

    matches = anpr_index[anpr_index["license_plate"] == license_plate]
    if matches.empty:
        return enriched_payload

    record = matches.iloc[0]

    owner_name = record.get("owner_name")
    owner_address = record.get("owner_address")
    enriched_payload["owner_name"] = None if pd.isna(owner_name) else str(owner_name)
    enriched_payload["owner_address"] = None if pd.isna(owner_address) else str(owner_address)

    is_blacklisted = bool(record.get("is_blacklisted", False))
    enriched_payload["anpr_blacklisted"] = is_blacklisted

    if is_blacklisted:
        reason = record.get("blacklist_reason")
        priority = record.get("blacklist_priority")
        jurisdiction = record.get("blacklist_jurisdiction")

        enriched_payload["blacklist_reason"] = None if pd.isna(reason) else str(reason)
        enriched_payload["blacklist_priority"] = None if pd.isna(priority) else str(priority)
        enriched_payload["blacklist_jurisdiction"] = None if pd.isna(jurisdiction) else str(jurisdiction)

        priority_to_level = {"LOW": 1, "MEDIUM": 2, "HIGH": 2, "CRITICAL": 3}
        normalized_priority = str(enriched_payload.get("blacklist_priority") or "").upper()
        enriched_payload["threat_level"] = priority_to_level.get(normalized_priority, 2)

    return enriched_payload
