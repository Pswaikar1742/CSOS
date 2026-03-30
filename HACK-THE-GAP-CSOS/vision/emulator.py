from __future__ import annotations

import json
import time
from collections import defaultdict
from pathlib import Path
from typing import Any

import cv2
import requests


VIDEO_FILE_PATH = Path("streams/garbage_ps3.mp4")
MOCK_DETECTIONS_PATH = Path("mock_detections/mock_detections.json")
BACKEND_INGEST_URL = "http://localhost:8000/api/ingest"

CAMERA_ID = "CAM_01"
SLEEP_SECONDS = 0.1
REQUEST_TIMEOUT_SECONDS = 2.5


def load_detections(detections_path: Path) -> dict[int, list[dict[str, Any]]]:
	with detections_path.open("r", encoding="utf-8") as file:
		raw_items = json.load(file)

	detections_by_frame: dict[int, list[dict[str, Any]]] = defaultdict(list)
	for item in raw_items:
		frame_number = int(item["frame_number"])
		detections_by_frame[frame_number].append(item)

	return detections_by_frame


def post_detection(detection: dict[str, Any], frame_number: int) -> None:
	payload = {
		"camera_id": CAMERA_ID,
		"frame_number": frame_number,
		"class": detection["class"],
		"confidence": float(detection["confidence"]),
		"bbox": detection["bbox"],
	}

	try:
		response = requests.post(BACKEND_INGEST_URL, json=payload, timeout=REQUEST_TIMEOUT_SECONDS)
		print(
			f"[INGEST] frame={frame_number} class={payload['class']} "
			f"status={response.status_code}"
		)
	except requests.RequestException as error:
		print(f"[INGEST-ERROR] frame={frame_number} error={error}")


def draw_detection(frame: Any, detection: dict[str, Any]) -> None:
	bbox = detection["bbox"]
	x1, y1, x2, y2 = (int(bbox[0]), int(bbox[1]), int(bbox[2]), int(bbox[3]))

	label = f"{detection['class']} {float(detection['confidence']):.2f}"
	cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
	cv2.putText(
		frame,
		label,
		(x1, max(24, y1 - 10)),
		cv2.FONT_HERSHEY_SIMPLEX,
		0.6,
		(0, 255, 0),
		2,
		cv2.LINE_AA,
	)


def run_emulator() -> None:
	if not VIDEO_FILE_PATH.exists():
		raise FileNotFoundError(f"Video file not found: {VIDEO_FILE_PATH}")
	if not MOCK_DETECTIONS_PATH.exists():
		raise FileNotFoundError(f"Mock detections file not found: {MOCK_DETECTIONS_PATH}")

	detections_by_frame = load_detections(MOCK_DETECTIONS_PATH)

	capture = cv2.VideoCapture(str(VIDEO_FILE_PATH))
	if not capture.isOpened():
		raise RuntimeError(f"Unable to open video: {VIDEO_FILE_PATH}")

	frame_number = 0
	print("[VISION] Emulator started. Press 'q' to exit.")

	try:
		while True:
			success, frame = capture.read()
			if not success:
				print("[VISION] End of stream reached.")
				break

			frame_detections = detections_by_frame.get(frame_number, [])
			for detection in frame_detections:
				draw_detection(frame, detection)
				post_detection(detection, frame_number)

			cv2.putText(
				frame,
				f"Frame: {frame_number}",
				(10, 30),
				cv2.FONT_HERSHEY_SIMPLEX,
				0.8,
				(255, 255, 255),
				2,
				cv2.LINE_AA,
			)
			cv2.imshow("CSOS Vision Emulator", frame)

			if cv2.waitKey(1) & 0xFF == ord("q"):
				print("[VISION] Stopped by user.")
				break

			frame_number += 1
			time.sleep(SLEEP_SECONDS)
	finally:
		capture.release()
		cv2.destroyAllWindows()


if __name__ == "__main__":
	run_emulator()
