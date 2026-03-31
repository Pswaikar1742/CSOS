from __future__ import annotations

import time
from pathlib import Path
from typing import Any

import cv2
import requests
from ultralytics import YOLO


MODEL_NAME = "yolov8n.pt"
STREAMS_DIR = Path("streams")
CAMERA_ID = "EDGE_CAM_01"
CONF_THRESHOLD = 0.35
REQUEST_TIMEOUT_SECONDS = 2.5

BACKEND_ENDPOINTS = [
    "http://localhost:8000/threat",
    "http://localhost:8000/api/ingest",
]

# Edge-side class sieve
GARBAGE_PROXY_CLASSES = {"suitcase", "backpack", "handbag"}
WEAPON_PROXY_CLASSES = {"baseball bat", "knife", "scissors"}
TARGET_CLASSES = GARBAGE_PROXY_CLASSES | WEAPON_PROXY_CLASSES


def iter_videos(streams_dir: Path) -> list[Path]:
    return sorted([path for path in streams_dir.glob("*.mp4") if path.is_file()])


def map_detection_to_threat(detected_class: str) -> str:
    if detected_class in GARBAGE_PROXY_CLASSES:
        return "garbage"
    if detected_class in WEAPON_PROXY_CLASSES:
        return "weapon"
    return detected_class


def post_threat(payload: dict[str, Any]) -> None:
    last_error: str | None = None
    for endpoint in BACKEND_ENDPOINTS:
        try:
            response = requests.post(endpoint, json=payload, timeout=REQUEST_TIMEOUT_SECONDS)
            if response.ok:
                print(
                    f"[PUSH] endpoint={endpoint} class={payload['class']} "
                    f"conf={payload['confidence']:.2f} status={response.status_code}"
                )
                return
            last_error = f"HTTP {response.status_code}"
        except requests.RequestException as error:
            last_error = str(error)

    print(f"[PUSH-ERROR] class={payload['class']} error={last_error}")


def process_stream(video_path: Path, model: YOLO) -> None:
    capture = cv2.VideoCapture(str(video_path))
    if not capture.isOpened():
        print(f"[STREAM-ERROR] Unable to open {video_path}")
        return

    print(f"[STREAM] Processing {video_path.name}")
    frame_number = 0

    try:
        while True:
            success, frame = capture.read()
            if not success:
                break

            results = model(frame, verbose=False)[0]
            for box in results.boxes:
                class_name = model.names[int(box.cls[0])]
                confidence = float(box.conf[0])
                if class_name not in TARGET_CLASSES or confidence < CONF_THRESHOLD:
                    continue

                x1, y1, x2, y2 = [int(value) for value in box.xyxy[0].tolist()]
                threat_class = map_detection_to_threat(class_name)

                payload = {
                    "camera_id": CAMERA_ID,
                    "frame_number": frame_number,
                    "class": threat_class,
                    "confidence": confidence,
                    "bbox": [x1, y1, x2, y2],
                    "source_file": video_path.name,
                    "detected_label": class_name,
                }
                post_threat(payload)

                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                cv2.putText(
                    frame,
                    f"{threat_class} {confidence:.2f}",
                    (x1, max(20, y1 - 10)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.6,
                    (0, 255, 0),
                    2,
                    cv2.LINE_AA,
                )

            cv2.putText(
                frame,
                f"{video_path.name} | frame={frame_number}",
                (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (255, 255, 255),
                2,
                cv2.LINE_AA,
            )
            cv2.imshow("CSOS Edge Detector", frame)

            if cv2.waitKey(1) & 0xFF == ord("q"):
                print("[VISION] Stopped by user.")
                return

            frame_number += 1
            time.sleep(0.03)
    finally:
        capture.release()


def run_detector() -> None:
    video_files = iter_videos(STREAMS_DIR)
    if not video_files:
        raise FileNotFoundError(f"No .mp4 files found in {STREAMS_DIR.resolve()}")

    model = YOLO(MODEL_NAME)
    for video_file in video_files:
        process_stream(video_file, model)

    cv2.destroyAllWindows()


if __name__ == "__main__":
    run_detector()
