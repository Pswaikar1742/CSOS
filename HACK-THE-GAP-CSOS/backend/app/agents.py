from __future__ import annotations

from pathlib import Path
from typing import Any

import pandas as pd


def load_rto_db() -> pd.DataFrame:
	project_root = Path(__file__).resolve().parents[2]
	preferred_path = project_root / "data" / "anpr_rto_db.csv"
	fallback_path = project_root / "data" / "anpr_db.csv"

	source_path = preferred_path if preferred_path.exists() else fallback_path
	if not source_path.exists() or source_path.stat().st_size == 0:
		return pd.DataFrame(columns=["license_plate", "owner_name", "owner_address"])

	dataframe = pd.read_csv(source_path)
	rename_map = {
		"plate": "license_plate",
		"vehicle_number": "license_plate",
		"owner": "owner_name",
		"address": "owner_address",
	}
	dataframe = dataframe.rename(columns=rename_map)

	for column in ("license_plate", "owner_name", "owner_address"):
		if column not in dataframe.columns:
			dataframe[column] = None

	dataframe["license_plate"] = dataframe["license_plate"].astype(str).str.strip().str.upper()
	return dataframe[["license_plate", "owner_name", "owner_address"]]


async def enrich_anpr_alert(payload: dict[str, Any], rto_db: pd.DataFrame) -> dict[str, Any]:
	enriched_payload = dict(payload)
	license_plate_raw = payload.get("license_plate")
	if not isinstance(license_plate_raw, str) or not license_plate_raw.strip():
		return enriched_payload

	license_plate = license_plate_raw.strip().upper()
	if rto_db.empty:
		return enriched_payload

	matches = rto_db[rto_db["license_plate"] == license_plate]
	if matches.empty:
		return enriched_payload

	record = matches.iloc[0]
	enriched_payload["owner_name"] = None if pd.isna(record["owner_name"]) else str(record["owner_name"])
	enriched_payload["owner_address"] = (
		None if pd.isna(record["owner_address"]) else str(record["owner_address"])
	)
	return enriched_payload
