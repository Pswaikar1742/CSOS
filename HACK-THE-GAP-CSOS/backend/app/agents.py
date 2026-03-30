from __future__ import annotations

import json
import os
from functools import lru_cache
from pathlib import Path
from typing import Any

import pandas as pd
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

from .core.anpr_engine import enrich_payload_from_anpr_index, load_anpr_index


class DispatchPlan(BaseModel):
    target_dept: str = Field(..., description='Target department, e.g. "police", "sanitation", "rto".')
    dispatch_vehicle: str = Field(
        ...,
        description=(
            "CSMC vehicle/fleet to dispatch. Prefer one of: "
            '"Solid Waste Truck", "Fire Engine", "Drainage Choke-up Van", '
            '"Water Tanker", "Ambulance", or "Cheetah Police Unit".'
        ),
    )
    sla_hours: int = Field(..., ge=1, le=72, description="Resolution SLA in hours.")
    action_summary: str = Field(..., min_length=8, description="Single-sentence instruction for Ward Officer.")
    proximity_alert: bool = Field(..., description="Whether to notify citizens within 100 meters.")
    unit_type: str = Field(
        default="N/A",
        description='For police incidents, MUST be "Cheetah" or "PCR".',
    )
    mandated_response_time_minutes: int = Field(
        default=0,
        ge=0,
        description="For police incidents, SLA in minutes as mandated by SOP threat level.",
    )


def _build_llm() -> ChatOpenAI:
    api_key = os.getenv("FASTROUTER_API_KEY")
    if not api_key:
        raise RuntimeError("FASTROUTER_API_KEY is not configured.")

    return ChatOpenAI(
        model="claude-3-5-sonnet",
        api_key=api_key,
        base_url="https://fastrouter.io/api/v1",
        temperature=0,
    )


@lru_cache(maxsize=4)
def _read_text_file(path: Path) -> str:
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8").strip()


def load_sop_context(threat_class: str) -> str:
    project_root = Path(__file__).resolve().parents[2]
    sanitation_sop_path = project_root / "backend" / "csmc_sanitation_sop.txt"
    police_sop_path = project_root / "backend" / "police_weapon_sop.txt"

    threat = str(threat_class).strip().lower()
    if threat in {"weapon", "hazard", "police"}:
        police_sop = _read_text_file(police_sop_path)
        if police_sop:
            return police_sop

    if threat in {"garbage", "dumping", "waste", "sanitation"}:
        sanitation_sop = _read_text_file(sanitation_sop_path)
        if sanitation_sop:
            return sanitation_sop

    return (
        "Apply standard CSMC incident SOP with highest priority for life safety, "
        "citizen communication, and time-bound departmental response."
    )


def load_rto_db() -> pd.DataFrame:
    project_root = Path(__file__).resolve().parents[2]
    return load_anpr_index(project_root)


async def enrich_anpr_alert(payload: dict[str, Any], rto_db: pd.DataFrame) -> dict[str, Any]:
    return enrich_payload_from_anpr_index(payload, rto_db)


async def generate_dispatch_plan(threat_payload: dict[str, Any], sop_context: str) -> dict[str, Any]:
    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                (
                    "You are the CSMC ICCC Dispatch Commander for Chhatrapati Sambhajinagar. "
                    "Generate a strict operational plan from threat input and SOP context. "
                    "Select practical municipal response with clear accountability and urgency."
                ),
            ),
            (
                "human",
                (
                    "Threat payload (JSON):\n{threat_payload}\n\n"
                    "SOP context:\n{sop_context}\n\n"
                    "Rules:\n"
                    "1) Map threat to correct target_dept.\n"
                    "2) Pick exactly one best dispatch vehicle.\n"
                    "3) Keep action_summary to one sentence.\n"
                    "4) Set proximity_alert=true if citizen warning within 100m is needed.\n"
                    "5) If target_dept is police, you MUST set unit_type to either Cheetah or PCR.\n"
                    "6) If target_dept is police, you MUST set mandated_response_time_minutes from SOP levels: "
                    "Level 1 = 10, Level 2 = 5, Level 3 = 2.\n"
                ),
            ),
        ]
    )

    structured_llm = _build_llm().with_structured_output(DispatchPlan)
    chain = prompt | structured_llm

    plan: DispatchPlan = await chain.ainvoke(
        {
            "threat_payload": json.dumps(threat_payload, ensure_ascii=False),
            "sop_context": sop_context,
        }
    )
    normalized_plan = plan.model_dump()
    normalized_plan["unit_type"] = str(normalized_plan.get("unit_type", "N/A")).strip() or "N/A"

    if str(normalized_plan.get("target_dept", "")).lower() == "police":
        inferred_level = int(threat_payload.get("threat_level", 2)) if str(threat_payload.get("threat_level", "")).isdigit() else 2
        level_to_response = {1: 10, 2: 5, 3: 2}

        if normalized_plan["unit_type"].lower() not in {"cheetah", "pcr"}:
            normalized_plan["unit_type"] = "PCR" if inferred_level == 3 else "Cheetah"

        mandated_minutes = int(normalized_plan.get("mandated_response_time_minutes", 0))
        if mandated_minutes <= 0:
            normalized_plan["mandated_response_time_minutes"] = level_to_response.get(inferred_level, 5)

    return normalized_plan
