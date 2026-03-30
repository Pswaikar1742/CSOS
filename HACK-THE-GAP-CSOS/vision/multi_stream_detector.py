from __future__ import annotations

import multiprocessing
import time
from pathlib import Path
from typing import Any

import cv2
import requests
try:
    from ultralytics import YOLO
except Exception:
    YOLO = None


MODEL_PATH = "yolov8n.pt"
POTHOLE_MODEL_PATH = "pothole_yolov8n.pt"
BACKEND_URL = "http://localhost:8000/api/ingest"
CONF_THRESHOLD = 0.4
INFERENCE_EVERY_N_FRAMES = 5
POTHOLE_INFERENCE_EVERY_N_FRAMES = 8
REQUEST_TIMEOUT_SECONDS = 0.5

VISION_ROOT = Path(__file__).resolve().parent


CAMERA_NODES =[
    {
        "id": "CAM_CIDCO_N6",
        "video": "streams/cidco_garbage.mp4",
        "lat": 19.8890, "lng": 75.3620,
        "ward": "CIDCO N-6",
        "description": "Residential Sector"
    },
    {
        "id": "CAM_KRANTI_CHOWK",
        "video": "streams/kranti_night_crash.mp4",
        "lat": 19.8732, "lng": 75.3262,
        "ward": "Kranti Chowk",
        "description": "Main Junction Hub"
    },
    {
        "id": "CAM_AURANGPURA",
        "video": "streams/aurangpura_altercation.mp4",
        "lat": 19.8824, "lng": 75.3245,
        "ward": "Aurangpura",
        "description": "Commercial Market"
    },
    {
        "id": "CAM_BEED_BYPASS",
        "video": "streams/highway_tractor_crash.mp4",
        "lat": 19.8550, "lng": 75.3500,
        "ward": "Beed Bypass",
        "description": "Inter-City Highway"
    },
    {
        "id": "CAM_RAILWAY_STATION_ROAD",
        "video": "streams/pothole.mp4",
        "lat": 19.8766, "lng": 75.3434,
        "ward": "Railway Station Road",
        "description": "Road Surface Monitoring",
        "class_hint": "pothole"
    }
]

HOTKEY_EVENTS: dict[int, dict[str, Any]] = {
    ord("w"): {
        "camera_id": "CAM_AURANGPURA",
        "class": "weapon",
        "label": "WEAPON",
        "description": "Public altercation near Aurangpura Market",
        "lat": 19.8824,
        "lng": 75.3245,
        "ward": "Aurangpura",
        "license_plate": None,
    },
    ord("g"): {
        "camera_id": "CAM_CIDCO_N6",
        "class": "garbage",
        "label": "GARBAGE",
        "description": "Illegal garbage dumping near CIDCO N-6",
        "lat": 19.8890,
        "lng": 75.3620,
        "ward": "CIDCO N-6",
        "license_plate": None,
    },
    ord("a"): {
        "camera_id": "CAM_BEED_BYPASS",
        "class": "anpr",
        "label": "ANPR",
        "description": "ANPR enforcement trigger at Beed Bypass",
        "lat": 19.8550,
        "lng": 75.3500,
        "ward": "Beed Bypass",
        "license_plate": "MH20-EE-4521",
    },
    ord("h"): {
        "camera_id": "CAM_BEED_BYPASS",
        "class": "hazard",
        "label": "HAZARD",
        "description": "Highway collision risk near Beed Bypass",
        "lat": 19.8550,
        "lng": 75.3500,
        "ward": "Beed Bypass",
        "license_plate": None,
    },
}


def _resolve_paths(node: dict[str, Any]) -> tuple[Path, Path]:
    model_path = VISION_ROOT / MODEL_PATH
    video_path = VISION_ROOT / str(node["video"])
    return model_path, video_path


def _map_to_threat_class(label: str) -> str | None:
    normalized = label.strip().lower()
    if "pothole" in normalized or "road damage" in normalized:
        return "pothole"
    if label in {"suitcase", "backpack", "handbag"}:
        return "garbage"
    if label in {"baseball bat", "knife", "scissors", "cell phone"}:
        return "weapon"
    if label == "car":
        return "anpr"
    return None


def _post_payload(session: requests.Session, payload: dict[str, Any]) -> None:
    try:
        response = session.post(BACKEND_URL, json=payload, timeout=REQUEST_TIMEOUT_SECONDS)
        if response.status_code >= 400:
            print(f"[NODE WARN] {payload.get('camera_id')} backend status={response.status_code}")
    except requests.RequestException:
        pass


def _build_hotkey_payload(key_code: int) -> dict[str, Any] | None:
    event = HOTKEY_EVENTS.get(key_code)
    if event is None:
        return None

    payload: dict[str, Any] = {
        "camera_id": event["camera_id"],
        "class": event["class"],
        "confidence": 0.97,
        "bbox": [120, 80, 420, 360],
        "lat": event["lat"],
        "lng": event["lng"],
        "ward": event["ward"],
        "description": event["description"],
        "source_file": "hotkey_injected",
        "detected_label": event["label"],
    }
    license_plate = event.get("license_plate")
    if license_plate:
        payload["license_plate"] = license_plate
    return payload


def _load_optional_pothole_model() -> Any | None:
    if YOLO is None:
        return None
    model_path = VISION_ROOT / POTHOLE_MODEL_PATH
    if not model_path.exists():
        return None
    try:
        return YOLO(str(model_path))
    except Exception as error:
        print(f"[POTHOLE_MODEL] Failed to load {model_path.name}: {error}")
        return None


def _detect_pothole_bbox_cv(frame: Any) -> tuple[int, int, int, int] | None:
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    height, width = gray.shape[:2]

    roi_start = int(height * 0.55)
    roi = gray[roi_start:, :]
    blurred = cv2.GaussianBlur(roi, (7, 7), 0)
    _, dark_regions = cv2.threshold(blurred, 65, 255, cv2.THRESH_BINARY_INV)

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
    cleaned = cv2.morphologyEx(dark_regions, cv2.MORPH_OPEN, kernel)
    cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_CLOSE, kernel)

    contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None

    contour = max(contours, key=cv2.contourArea)
    area = cv2.contourArea(contour)
    if area < 1200:
        return None

    x, y, w, h = cv2.boundingRect(contour)
    if w < 30 or h < 20:
        return None

    return (x, y + roi_start, x + w, y + roi_start + h)


def _detect_pothole_bbox(frame: Any, pothole_model: Any | None) -> tuple[int, int, int, int, float] | None:
    if pothole_model is not None:
        try:
            result = pothole_model(frame, verbose=False, conf=0.35)[0]
            for box in result.boxes:
                cls_id = int(box.cls[0])
                label = str(pothole_model.names[cls_id]).lower()
                if "pothole" not in label and "road" not in label:
                    continue
                x1, y1, x2, y2 = [int(value) for value in box.xyxy[0].tolist()]
                confidence = float(box.conf[0])
                return (x1, y1, x2, y2, confidence)
        except Exception as error:
            print(f"[POTHOLE_MODEL] Inference error, falling back to CV detector: {error}")

    bbox = _detect_pothole_bbox_cv(frame)
    if bbox is None:
        return None

    x1, y1, x2, y2 = bbox
    return (x1, y1, x2, y2, 0.72)


def run_vision_engine(node: dict[str, Any]) -> None:
    camera_id = str(node["id"])
    model_path, video_path = _resolve_paths(node)

    print(f"[NODE START] Initializing {camera_id} at {node['ward']}...")

    if not video_path.exists():
        print(f"[NODE ERROR] Missing video for {camera_id}: {video_path}")
        return

    model = YOLO(str(model_path) if YOLO is not None and model_path.exists() else MODEL_PATH) if YOLO is not None else None
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        print(f"[NODE ERROR] Failed to open stream: {video_path}")
        return

    frame_count = 0
    session = requests.Session()
    pothole_model = _load_optional_pothole_model() if str(node.get("class_hint", "")).lower() == "pothole" else None
    window_name = f"CSOS {camera_id} | {node['ward']}"

    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
    cv2.resizeWindow(window_name, 960, 540)

    while cap.isOpened():
        success, frame = cap.read()
        if not success:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            continue

        node_hint = str(node.get("class_hint", "")).lower()

        if node_hint == "pothole" and frame_count % POTHOLE_INFERENCE_EVERY_N_FRAMES == 0:
            pothole_detection = _detect_pothole_bbox(frame, pothole_model)
            if pothole_detection is not None:
                x1, y1, x2, y2, confidence = pothole_detection
                payload: dict[str, Any] = {
                    "camera_id": camera_id,
                    "class": "pothole",
                    "confidence": confidence,
                    "bbox": [x1, y1, x2, y2],
                    "lat": node["lat"],
                    "lng": node["lng"],
                    "latitude": node["lat"],
                    "longitude": node["lng"],
                    "ward": node["ward"],
                    "description": "Railway Station Road - pothole severity alert",
                    "source_file": video_path.name,
                    "detected_label": "pothole",
                }
                _post_payload(session, payload)

                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 200, 255), 2)
                cv2.putText(
                    frame,
                    f"POTHOLE {confidence:.2f}",
                    (x1, max(20, y1 - 8)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.6,
                    (0, 200, 255),
                    2,
                    cv2.LINE_AA,
                )

        if model is not None and frame_count % INFERENCE_EVERY_N_FRAMES == 0:
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
                    "latitude": node["lat"],
                    "longitude": node["lng"],
                    "ward": node["ward"],
                    "description": node["description"],
                    "source_file": video_path.name,
                    "detected_label": label,
                }

                if threat_class == "anpr":
                    payload["license_plate"] = "MH20-EE-4521"

                _post_payload(session, payload)

        if model is None and frame_count % (INFERENCE_EVERY_N_FRAMES * 2) == 0:
            print(f"[NODE INFO] {camera_id}: ultralytics unavailable, running fallback mode (hotkeys + pothole CV detector).")

        overlay = "Hotkeys: [W] Weapon  [G] Garbage  [A] ANPR  [H] Hazard  [Q] Quit"
        cv2.rectangle(frame, (0, 0), (frame.shape[1], 30), (0, 0, 0), -1)
        cv2.putText(frame, overlay, (10, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 255), 1, cv2.LINE_AA)
        cv2.imshow(window_name, frame)

        frame_count += 1
        key = cv2.waitKey(1) & 0xFF
        if key in HOTKEY_EVENTS:
            injected_payload = _build_hotkey_payload(key)
            if injected_payload is not None:
                _post_payload(session, injected_payload)
                print(
                    f"[HOTKEY] {chr(key).upper()} injected {injected_payload['class']} "
                    f"at {injected_payload['ward']}"
                )
        if key == ord("q"):
            break

    cap.release()
    cv2.destroyWindow(window_name)


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