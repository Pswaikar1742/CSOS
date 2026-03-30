## Vision module setup (local)

From project root:

```bash
cd /home/psw/Projects/CSOS/HACK-THE-GAP-CSOS
python3 -m venv .venv
source .venv/bin/activate
pip install -r vision/requirements.txt
```

Run detector:

```bash
cd /home/psw/Projects/CSOS/HACK-THE-GAP-CSOS/vision
python multi_stream_detector.py
```

Notes:
- Use package name `opencv-python` (not `cv2` and not `opencv`).
- If `ultralytics` is not installed, detector still runs in fallback mode.
