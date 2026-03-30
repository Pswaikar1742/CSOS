from __future__ import annotations

import json
import importlib
import os
from functools import lru_cache
from pathlib import Path
from typing import Any

import pandas as pd
from pydantic import BaseModel, Field

from .core.anpr_engine import enrich_payload_from_anpr_index, load_anpr_index


def _load_langchain_modules() -> tuple[Any | None, Any | None]:
    try:
        chat_prompt_module = importlib.import_module("langchain_core.prompts")
        chat_openai_module = importlib.import_module("langchain_openai")
        return getattr(chat_prompt_module, "ChatPromptTemplate", None), getattr(chat_openai_module, "ChatOpenAI", None)
    except Exception:
        return None, None


class DispatchPlan(BaseModel):
    target_dept: str = Field(..., description='Target department, e.g. "police", "sanitation", "rto".')
    dispatch_vehicle: str = Field(
        ...,
        description=(
            "CSMC vehicle/fleet to dispatch. Prefer one of: "
            '"GHANTA GAADI", "Fire Engine", "Drainage Choke-up Van", '
            '"Water Tanker", "Ambulance", or "BEAT MARSHAL".'
        ),
    )
    sla_hours: int = Field(..., ge=1, le=72, description="Resolution SLA in hours.")
    action_summary: str = Field(..., min_length=8, description="Single-sentence instruction for Ward Officer.")
    proximity_alert: bool = Field(..., description="Whether to notify citizens within 100 meters.")
    unit_type: str = Field(
        default="N/A",
        description='For police incidents, MUST be one of "CSN-P08" or "CSN-P12".',
    )
    mandated_response_time_minutes: int = Field(
        default=0,
        ge=0,
        description="For police incidents, SLA in minutes as mandated by SOP threat level.",
    )


def _build_llm() -> Any:
    _, chat_open_ai = _load_langchain_modules()
    if chat_open_ai is None:
        raise RuntimeError("LangChain dependencies are not available.")

    api_key = os.getenv("FASTROUTER_API_KEY")
    if not api_key:
        raise RuntimeError("FASTROUTER_API_KEY is not configured.")

    return chat_open_ai(
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

    if threat in {"anpr", "pothole", "road_hazard", "road-damage", "rto"}:
        return (
            "Apply RTO road safety SOP: geo-tag pothole, issue route hazard advisory, "
            "and notify municipal road repair cell with priority SLA."
        )

    return (
        "Apply standard CSMC incident SOP with highest priority for life safety, "
        "citizen communication, and time-bound departmental response."
    )


def load_rto_db() -> pd.DataFrame:
    project_root = Path(__file__).resolve().parents[2]
    return load_anpr_index(project_root)


async def enrich_anpr_alert(payload: dict[str, Any], rto_db: pd.DataFrame) -> dict[str, Any]:
    return enrich_payload_from_anpr_index(payload, rto_db)


def _fallback_dispatch_plan(threat_payload: dict[str, Any]) -> dict[str, Any]:
    threat_type = str(threat_payload.get("class", "")).lower()
    threat_level = int(threat_payload.get("threat_level", 2)) if str(threat_payload.get("threat_level", "")).isdigit() else 2

    if threat_type in {"weapon", "hazard"}:
        response_map = {1: 10, 2: 5, 3: 2}
        assigned_unit = "CSN-P12" if threat_level == 3 else "CSN-P08"
        return DispatchPlan(
            target_dept="police",
            dispatch_vehicle="BEAT MARSHAL",
            sla_hours=1,
            action_summary=f"Dispatch Beat Marshal {assigned_unit.split('-')[-1]} for immediate perimeter control and escalation.",
            proximity_alert=True,
            unit_type=assigned_unit,
            mandated_response_time_minutes=response_map.get(threat_level, 5),
        ).model_dump()

    if threat_type == "garbage":
        return DispatchPlan(
            target_dept="sanitation",
            dispatch_vehicle="GHANTA GAADI",
            sla_hours=6,
            action_summary="Dispatch CSMC-SWM-405 GHANTA GAADI for cleanup and auto-initiate sanitation notice workflow.",
            proximity_alert=False,
            unit_type="CSMC-SWM-405",
            mandated_response_time_minutes=0,
        ).model_dump()

    if threat_type == "pothole":
        return DispatchPlan(
            target_dept="sanitation",
            dispatch_vehicle="GHANTA GAADI",
            sla_hours=2,
            action_summary="Geo-tag pothole and dispatch CSMC road sanitation/maintenance crew for immediate barricading and patchwork.",
            proximity_alert=True,
            unit_type="CSMC-SWM-405",
            mandated_response_time_minutes=30,
        ).model_dump()

    return DispatchPlan(
        target_dept="rto",
        dispatch_vehicle="Ambulance",
        sla_hours=4,
        action_summary="Escalate ANPR hit to RTO control and coordinate field verification with enforcement teams.",
        proximity_alert=False,
        unit_type="N/A",
        mandated_response_time_minutes=0,
    ).model_dump()


async def generate_dispatch_plan(threat_payload: dict[str, Any], sop_context: str) -> dict[str, Any]:
    chat_prompt_template, _ = _load_langchain_modules()
    if chat_prompt_template is None:
        return _fallback_dispatch_plan(threat_payload)

    prompt = chat_prompt_template.from_messages(
        [
            (
                "system",
                (
                    "You are the CSMC ICCC Dispatch Commander for Chhatrapati Sambhajinagar. "
                    "Generate a strict operational plan from threat input and SOP context. "
                    "Select practical municipal response with clear accountability and urgency. "
                    "Use only real CSN zones and unit list: Police Units CSN-P08 (Cidco Beat), CSN-P12 (Kranti Chowk Beat); "
                    "Sanitation Unit CSMC-SWM-405 (Zone 4 Truck GHANTA GAADI)."
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
                    "5) If target_dept is police, you MUST set unit_type to either CSN-P08 or CSN-P12.\n"
                    "6) If target_dept is sanitation, dispatch_vehicle MUST be GHANTA GAADI and unit_type MUST be CSMC-SWM-405.\n"
                    "7) If target_dept is police, you MUST set mandated_response_time_minutes from SOP levels: "
                    "Level 1 = 10, Level 2 = 5, Level 3 = 2.\n"
                ),
            ),
        ]
    )

    try:
        structured_llm = _build_llm().with_structured_output(DispatchPlan)
        chain = prompt | structured_llm

        plan: DispatchPlan = await chain.ainvoke(
            {
                "threat_payload": json.dumps(threat_payload, ensure_ascii=False),
                "sop_context": sop_context,
            }
        )
    except Exception:
        return _fallback_dispatch_plan(threat_payload)
    normalized_plan = plan.model_dump()
    normalized_plan["unit_type"] = str(normalized_plan.get("unit_type", "N/A")).strip() or "N/A"

    if str(normalized_plan.get("target_dept", "")).lower() == "police":
        inferred_level = int(threat_payload.get("threat_level", 2)) if str(threat_payload.get("threat_level", "")).isdigit() else 2
        level_to_response = {1: 10, 2: 5, 3: 2}

        if normalized_plan["unit_type"] not in {"CSN-P08", "CSN-P12"}:
            normalized_plan["unit_type"] = "CSN-P12" if inferred_level == 3 else "CSN-P08"

        mandated_minutes = int(normalized_plan.get("mandated_response_time_minutes", 0))
        if mandated_minutes <= 0:
            normalized_plan["mandated_response_time_minutes"] = level_to_response.get(inferred_level, 5)

    return normalized_plan
