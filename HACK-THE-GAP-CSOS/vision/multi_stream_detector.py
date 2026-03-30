from __future__ import annotations

import multiprocessing
import time
from pathlib import Path
from typing import Any

import cv2
import requests
from ultralytics import YOLO


MODEL_PATH = "yolov8n.pt"
BACKEND_URL = "http://localhost:8000/api/ingest"
CONF_THRESHOLD = 0.4
INFERENCE_EVERY_N_FRAMES = 5
REQUEST_TIMEOUT_SECONDS = 0.5

VISION_ROOT = Path(__file__).resolve().parent


CAMERA_NODES: list[dict[str, Any]] = [
    {
        "id": "CAM_01_KRANTI",
        "video": "streams/traffic.mp4",
        "lat": 19.8732,
        "lng": 75.3262,
        "ward": "Zone 1",
        "description": "Real Traffic Clip",
    },
    {
        "id": "CAM_02_CIDCO",
        "video": "streams/residential.mp4",
        "lat": 19.8890,
        "lng": 75.3620,
        "ward": "Zone 4",
        "description": "Synthetic Twin Simulation for Edge Case Training (GTA 5 India Mod)",
    },
    {
        "id": "CAM_03_MARKET",
        "video": "streams/market.mp4",
        "lat": 19.8824,
        "lng": 75.3245,
        "ward": "Zone 2",
        "description": "Filmed on phone in the hallway",
    },
    {
        "id": "CAM_04_BEED_BYPASS",
        "video": "streams/highway.mp4",
        "lat": 19.8550,
        "lng": 75.3500,
        "ward": "Zone 6",
        "description": "Inter-City Highway",
    },
]


def _resolve_paths(node: dict[str, Any]) -> tuple[Path, Path]:
    model_path = VISION_ROOT / MODEL_PATH
    video_path = VISION_ROOT / str(node["video"])
    return model_path, video_path


def _map_to_threat_class(label: str) -> str | None:
    if label in {"suitcase", "backpack", "handbag"}:
        return "garbage"
    if label in {"baseball bat", "knife", "scissors", "cell phone"}:
        return "weapon"
    if label == "car":
        return "anpr"
    return None


def run_vision_engine(node: dict[str, Any]) -> None:
    camera_id = str(node["id"])
    model_path, video_path = _resolve_paths(node)

    print(f"[NODE START] Initializing {camera_id} at {node['ward']}...")

    if not video_path.exists():
        print(f"[NODE ERROR] Missing video for {camera_id}: {video_path}")
        return

    model = YOLO(str(model_path) if model_path.exists() else MODEL_PATH)
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        print(f"[NODE ERROR] Failed to open stream: {video_path}")
        return

    frame_count = 0
    session = requests.Session()

    while cap.isOpened():
        success, frame = cap.read()
        if not success:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            continue

        if frame_count % INFERENCE_EVERY_N_FRAMES == 0:
            results = model(frame, verbose=False, conf=CONF_THRESHOLD)[0]

            for box in results.boxes:
                cls_id = int(box.cls[0])
                label = str(model.names[cls_id])
                confidence = float(box.conf[0])
                threat_class = _map_to_threat_class(label)

                if threat_class is None:
                    continue

                x1, y1, x2, y2 = [int(value) for value in box.xyxy[0].tolist()]
                payload: dict[str, Any] = {
                    "camera_id": camera_id,
                    "class": threat_class,
                    "confidence": confidence,
                    "bbox": [x1, y1, x2, y2],
                    "lat": node["lat"],
                    "lng": node["lng"],
                    "ward": node["ward"],
                    "description": node["description"],
                    "source_file": video_path.name,
                    "detected_label": label,
                }

                if threat_class == "anpr":
                    payload["license_plate"] = "MH20-EE-4521"

                try:
                    response = session.post(BACKEND_URL, json=payload, timeout=REQUEST_TIMEOUT_SECONDS)
                    if response.status_code >= 400:
                        print(f"[NODE WARN] {camera_id} backend status={response.status_code}")
                except requests.RequestException:
                    pass

        frame_count += 1
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()


def main() -> None:
    processes: list[multiprocessing.Process] = []

    for node in CAMERA_NODES:
        process = multiprocessing.Process(target=run_vision_engine, args=(node,), daemon=False)
        process.start()
        processes.append(process)
        time.sleep(1)

    for process in processes:
        process.join()


if __name__ == "__main__":
    main()