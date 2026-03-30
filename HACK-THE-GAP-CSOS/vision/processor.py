import cv2
from ultralytics import YOLO
import json


# MISSION: Run this once to generate detections
def process_video_to_json(video_path, output_json, target_class):
    model = YOLO('yolov8n.pt')
    cap = cv2.VideoCapture(video_path)
    detections = []
    frame_count = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        results = model(frame, verbose=False)[0]
        for box in results.boxes:
            if model.names[int(box.cls[0])] == target_class:
                detections.append({
                    "frame_number": frame_count,
                    "class": target_class,
                    "confidence": float(box.conf[0]),
                    "bbox": [int(x) for x in box.xyxy[0].tolist()]
                })
        frame_count += 1

    with open(output_json, 'w') as f:
        json.dump(detections, f)
    cap.release()


# Example usage (uncomment when videos are ready):
# process_video_to_json('streams/garbage.mp4', 'mock_detections/garbage.json', 'suitcase')